import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { AwakeLogo } from './components/AwakeLogo';
import { Button } from './components/ui/button';
import { OnboardingFlow, type UserData } from './components/OnboardingFlow';
import { Cockpit } from './components/Cockpit';
import { AuthModal } from './components/AuthModal';
import { ResetPasswordModal } from './components/ResetPasswordModal';
import { auth, userData as userDataService, isSupabaseConfigured, supabase } from './services/supabase';
import {
  clearAuthCallbackFromUrl,
  clearPasswordResetPending,
  getSessionWithTimeout,
  hasAuthCallbackInUrl,
  isPasswordResetPending,
  shouldOpenPasswordReset,
} from './utils/authRecovery';
import { clearLocalAwakeData } from './utils/clearLocalData';
import {
  isOnboardingComplete,
  readOnboardingProgress,
  shouldResumeOnboarding,
  clearOnboardingProgress,
} from './utils/onboardingProgress';
import { bootstrapUserSession } from './utils/sessionBootstrap';
import type { User } from '@supabase/supabase-js';

type ViewMode = 'landing' | 'onboarding' | 'dashboard';

/** After email confirmation — not used for ?code= (PKCE); auth events handle that. */
function consumeAuthCallbackNotice(): string | null {
  if (typeof window === 'undefined') return null;
  const { search, hash } = window.location;
  if (search.includes('code=')) return null;
  if (isPasswordResetPending()) return null;
  if (hash.includes('type=recovery') || search.includes('type=recovery')) return null;

  const isCallback =
    hash.includes('access_token=') ||
    hash.includes('type=signup') ||
    hash.includes('type=email');
  if (!isCallback) return null;
  clearAuthCallbackFromUrl();
  return 'You\'re signed in — your account is ready.';
}

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('landing');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth and load user data
  useEffect(() => {
    let authSubscription: { unsubscribe: () => void } | undefined;

    const routeGuest = () => {
      const progress = readOnboardingProgress();
      if (progress && isSupabaseConfigured()) {
        // Stale local setup progress — send to landing so they can sign in first
        setViewMode('landing');
        setAuthNotice('Sign in to restore your profile from awakeapp.space.');
        return;
      }

      const local = localStorage.getItem('awake_user_data');
      const data = local ? (JSON.parse(local) as UserData) : null;
      const resume = shouldResumeOnboarding(data);

      if (resume) {
        setViewMode('onboarding');
        if (resume.userData && Object.keys(resume.userData).length > 0) {
          setUserData(resume.userData);
        }
      } else if (data && isOnboardingComplete(data) && isSupabaseConfigured()) {
        setViewMode('landing');
        setAuthNotice('Sign in to continue your journey.');
      } else if (data && isOnboardingComplete(data)) {
        setUserData(data);
        setViewMode('dashboard');
      }
    };

    const routeSignedIn = async () => {
      const boot = await bootstrapUserSession();
      if (boot.data) setUserData(boot.data);
      setViewMode(boot.view === 'landing' ? 'onboarding' : boot.view);
    };

    const init = async () => {
      let initComplete = false;

      try {
        const callbackNotice = consumeAuthCallbackNotice();
        if (callbackNotice) {
          setAuthNotice(callbackNotice);
        }

        if (isSupabaseConfigured()) {
          const {
            data: { subscription },
          } = supabase.auth.onAuthStateChange((event, nextSession) => {
              setUser(nextSession?.user ?? null);

              if (event === 'SIGNED_OUT') {
                clearLocalAwakeData();
                clearOnboardingProgress();
                clearPasswordResetPending();
                setUserData(null);
                setViewMode('landing');
                setShowPasswordReset(false);
                return;
              }

              if (shouldOpenPasswordReset(event) && nextSession?.user) {
                setShowPasswordReset(true);
                clearAuthCallbackFromUrl();
                return;
              }

              if (isPasswordResetPending() && nextSession?.user) {
                setShowPasswordReset(true);
                return;
              }

              // Only route after cold-start init — avoids getSession deadlock during boot
              if (initComplete && event === 'SIGNED_IN' && nextSession?.user) {
                void routeSignedIn();
              }
            });
          authSubscription = subscription;

          let session;
          try {
            ({ data: { session } } = await getSessionWithTimeout(supabase));
          } catch (err) {
            console.warn('Auth session init failed:', err);
            clearAuthCallbackFromUrl();
            clearPasswordResetPending();
            routeGuest();
            setIsLoading(false);
            initComplete = true;
            return;
          }

          const currentUser = session?.user ?? null;
          setUser(currentUser);
          const hadCallback = hasAuthCallbackInUrl();

          if (hadCallback) {
            clearAuthCallbackFromUrl();
          }

          if (currentUser) {
            await routeSignedIn();
            if (isPasswordResetPending()) {
              setShowPasswordReset(true);
            } else if (hadCallback) {
              setAuthNotice('You\'re signed in — your account is ready.');
            }
          } else {
            routeGuest();
          }
        } else {
          routeGuest();
        }
      } catch (err) {
        console.error('Init error:', err);
        routeGuest();
      }

      setIsLoading(false);
      initComplete = true;
    };

    void init();

    return () => {
      authSubscription?.unsubscribe();
    };
  }, []);

  const handlePasswordResetComplete = async () => {
    clearPasswordResetPending();
    setShowPasswordReset(false);
    clearAuthCallbackFromUrl();
    setAuthNotice('Password updated — you\'re signed in.');
    const boot = await bootstrapUserSession();
    if (boot.data) setUserData(boot.data);
    setViewMode(boot.view === 'landing' ? 'onboarding' : boot.view);
  };

  // Handle onboarding completion — must save to cloud before dashboard
  const handleOnboardingComplete = async (data: UserData) => {
    setUserData(data);
    setViewMode('dashboard');
  };

  // Show onboarding flow
  if (viewMode === 'onboarding') {
    return (
      <>
        <OnboardingFlow onComplete={handleOnboardingComplete} />
        <ResetPasswordModal
          isOpen={showPasswordReset}
          onComplete={handlePasswordResetComplete}
        />
      </>
    );
  }

  // Sign out — sync profile to cloud first, then clear local session data
  const handleSignOut = async () => {
    if (userData) {
      await userDataService.save(userData);
    }

    try {
      await auth.signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }

    clearLocalAwakeData();
    localStorage.removeItem('awake_onboarding_progress');
    setUserData(null);
    setViewMode('landing');
    setUser(null);
  };

  // Loading state
  if (isLoading) {
    return (
      <>
        <div className="min-h-screen w-full bg-background flex items-center justify-center">
          <AwakeLogo size="medium" />
        </div>
        <ResetPasswordModal
          isOpen={showPasswordReset}
          onComplete={handlePasswordResetComplete}
        />
      </>
    );
  }

  // Handle partial user data updates (like archetype)
  const handleUpdateUserData = async (partialData: Partial<UserData>) => {
    const updated = { ...userData, ...partialData } as UserData;
    if (partialData.identity) {
      updated.identity = { ...(userData?.identity || {}), ...partialData.identity } as UserData['identity'];
    }
    if (partialData.cockpitSync !== undefined) {
      updated.cockpitSync = partialData.cockpitSync;
    }
    setUserData(updated);
    try {
      await userDataService.save(updated);
    } catch (err) {
      console.error('Error saving updated user data:', err);
    }
  };

  // Show cockpit (consciousness control panel)
  if (viewMode === 'dashboard' && userData) {
    return (
      <>
        <Cockpit 
          userData={userData} 
          onSignOut={handleSignOut}
          onUpdateUserData={handleUpdateUserData}
        />
        <ResetPasswordModal
          isOpen={showPasswordReset}
          onComplete={handlePasswordResetComplete}
        />
      </>
    );
  }

  // Landing page
  return (
    <div className="min-h-screen w-full bg-background overflow-x-hidden">
      {/* Hero Section */}
      <div className="relative min-h-screen flex flex-col items-center justify-center p-8 overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0" style={{
            background: "radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.15), transparent 50%)"
          }} />
          
          {/* Animated grid */}
          <motion.div
            className="absolute inset-0 opacity-20"
            animate={{
              backgroundPosition: ["0px 0px", "50px 50px"]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear"
            }}
            style={{
              backgroundImage: `
                linear-gradient(rgba(99, 102, 241, 0.3) 1px, transparent 1px),
                linear-gradient(90deg, rgba(99, 102, 241, 0.3) 1px, transparent 1px)
              `,
              backgroundSize: "50px 50px"
            }}
          />

          {/* Floating orbs */}
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              initial={{
                x: typeof window !== 'undefined' ? Math.random() * window.innerWidth : 0,
                y: typeof window !== 'undefined' ? Math.random() * window.innerHeight : 0,
              }}
              animate={{
                y: [null, typeof window !== 'undefined' ? Math.random() * window.innerHeight : 500],
                x: [null, typeof window !== 'undefined' ? Math.random() * window.innerWidth : 500],
                opacity: [0.1, 0.3, 0.1],
                scale: [1, 1.2, 1]
              }}
              transition={{
                duration: 10 + Math.random() * 10,
                repeat: Infinity,
                ease: "easeInOut",
                delay: Math.random() * 5
              }}
              style={{
                width: 150 + Math.random() * 200,
                height: 150 + Math.random() * 200,
                background: `radial-gradient(circle, ${
                  ["#6366f1", "#14b8a6", "#f59e0b", "#8b5cf6"][i % 4]
                }30, transparent)`,
                filter: "blur(60px)"
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10 text-center max-w-4xl mb-16">
          <AwakeLogo size="large" />
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 1 }}
            className="mt-8 text-base md:text-lg opacity-80 leading-relaxed px-4"
          >
            A consciousness-driven experience about human evolution, self-discovery, 
            and emotional intelligence. Your journey to becoming the conscious author 
            of your own life starts here.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="mt-8 flex gap-4 flex-wrap justify-center text-xs md:text-sm opacity-60"
          >
            {["Gamified Growth", "AI Companion", "Daily Quests", "Vision Builder", "Trait Leveling"].map((keyword, i) => (
              <span key={i} className="px-3 py-1 rounded-full" style={{
                border: "1px solid rgba(99, 102, 241, 0.3)"
              }}>
                {keyword}
              </span>
            ))}
          </motion.div>

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5 }}
            className="mt-12 flex gap-4 justify-center flex-wrap"
          >
            <Button
              onClick={async () => {
                if (user) {
                  const { view, data } = await bootstrapUserSession();
                  if (data) setUserData(data);
                  setViewMode(view === 'landing' ? 'onboarding' : view);
                } else {
                  setShowAuthModal(true);
                }
              }}
              className="px-8 py-6 rounded-full text-base cursor-pointer"
              style={{
                background: "linear-gradient(135deg, #6366f1, #14b8a6)",
                boxShadow: "0 0 30px rgba(99, 102, 241, 0.4)"
              }}
            >
              {user ? (userData?.identity?.name ? 'Go to Dashboard' : 'Continue Setup') : 'Begin Your Awakening'}
            </Button>
            
            {user && userData?.identity?.name && (
              <Button
                onClick={async () => {
                  const { view, data } = await bootstrapUserSession();
                  if (data) setUserData(data);
                  setViewMode(view === 'landing' ? 'dashboard' : view);
                }}
                variant="outline"
                className="px-8 py-6 rounded-full text-base cursor-pointer"
                style={{
                  borderColor: "rgba(99, 102, 241, 0.3)",
                  background: "rgba(99, 102, 241, 0.05)"
                }}
              >
                Welcome back, {userData.identity.name}
              </Button>
            )}

          </motion.div>

          {authNotice && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 text-sm text-teal-300"
            >
              {authNotice}
            </motion.p>
          )}

          {/* Auth status */}
          {user && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ delay: 1.8 }}
              className="mt-4 text-xs"
            >
              Signed in as {user.email}
              {' · '}
              <button
                type="button"
                onClick={handleSignOut}
                className="underline hover:opacity-100 opacity-80"
              >
                Sign out
              </button>
            </motion.p>
          )}
        </div>

        {/* Version indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 2 }}
          className="absolute bottom-8 text-xs"
        >
          Awake · Beta
        </motion.div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={async () => {
          setShowAuthModal(false);
          const { view, data } = await bootstrapUserSession();
          if (data) setUserData(data);
          setViewMode(view === 'landing' ? 'onboarding' : view);
        }}
      />
      <ResetPasswordModal
        isOpen={showPasswordReset}
        onComplete={handlePasswordResetComplete}
      />
    </div>
  );
}
