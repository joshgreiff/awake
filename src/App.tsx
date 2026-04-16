import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { AwakeLogo } from './components/AwakeLogo';
import { Button } from './components/ui/button';
import { OnboardingFlow, type UserData } from './components/OnboardingFlow';
import { Dashboard } from './components/Dashboard';
import { AuthModal } from './components/AuthModal';
import { auth, userData as userDataService, isSupabaseConfigured } from './services/supabase';
import type { User } from '@supabase/supabase-js';

type ViewMode = 'landing' | 'onboarding' | 'dashboard';

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('landing');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth and load user data
  useEffect(() => {
    const init = async () => {
      try {
        // Check for authenticated user (with timeout)
        if (isSupabaseConfigured()) {
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('timeout')), 5000)
          );
          
          try {
            const currentUser = await Promise.race([
              auth.getUser(),
              timeoutPromise
            ]) as any;
            setUser(currentUser);
          } catch (e) {
            console.log('Auth check timed out or failed, continuing without auth');
          }

          // Listen for auth changes
          auth.onAuthStateChange(async (event, session) => {
            setUser(session?.user ?? null);
            
            if (event === 'SIGNED_IN' && session?.user) {
              // Sync local data to cloud on first sign in
              await userDataService.syncLocalToCloud();
              // Reload user data from cloud
              const data = await userDataService.load();
              if (data) {
                setUserData(data);
                if (data.identity?.name) {
                  setViewMode('dashboard');
                }
              }
            }
          });
        }

        // Load user data (try Supabase first, fall back to localStorage)
        let data = null;
        try {
          data = await Promise.race([
            userDataService.load(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
          ]) as UserData | null;
        } catch (e) {
          // Fall back to localStorage directly
          const local = localStorage.getItem('awake_user_data');
          data = local ? JSON.parse(local) : null;
        }
        
        if (data) {
          setUserData(data);
          if (data.identity?.name) {
            setViewMode('dashboard');
          }
        }

        // Check for in-progress onboarding
        const onboardingProgress = localStorage.getItem('awake_onboarding_progress');
        if (onboardingProgress && !data) {
          setViewMode('onboarding');
        }
      } catch (err) {
        console.error('Init error:', err);
      }

      setIsLoading(false);
    };

    init();
  }, []);

  // Handle onboarding completion
  const handleOnboardingComplete = async (data: UserData) => {
    try {
      setUserData(data);
      // Save to Supabase (or localStorage if not logged in)
      await userDataService.save(data);
    } catch (err) {
      console.error('Error saving user data:', err);
      // Data is still saved to localStorage, continue anyway
    }
    setViewMode('dashboard');
  };

  // Show onboarding flow
  if (viewMode === 'onboarding') {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  // Reset user data and start fresh
  const handleReset = async () => {
    localStorage.removeItem('awake_user_data');
    localStorage.removeItem('awake_onboarding_progress');
    localStorage.removeItem('awake_chat_history');
    
    // Sign out if logged in
    if (user) {
      await auth.signOut();
      setUser(null);
    }
    
    setUserData(null);
    setViewMode('landing');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-background flex items-center justify-center">
        <AwakeLogo size="medium" />
      </div>
    );
  }

  // Show dashboard
  if (viewMode === 'dashboard' && userData) {
    return (
      <Dashboard 
        userData={userData} 
        onReset={handleReset}
      />
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
                // If already signed in, check for existing data
                if (user) {
                  // Try to load/sync data first
                  await userDataService.syncLocalToCloud();
                  const data = await userDataService.load();
                  
                  if (data?.identity?.name) {
                    setUserData(data);
                    setViewMode('dashboard');
                  } else {
                    setViewMode('onboarding');
                  }
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
            
            {userData?.identity?.name && (
              <Button
                onClick={() => setViewMode('dashboard')}
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

          {/* Auth status */}
          {user && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ delay: 1.8 }}
              className="mt-4 text-xs"
            >
              Signed in as {user.email}
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
          Awake v2.0 - Supabase Connected
        </motion.div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={async () => {
          setShowAuthModal(false);
          
          // Sync local data to cloud and reload
          await userDataService.syncLocalToCloud();
          const data = await userDataService.load();
          
          if (data?.identity?.name) {
            setUserData(data);
            setViewMode('dashboard');
          } else {
            setViewMode('onboarding');
          }
        }}
        onContinueAsGuest={() => {
          setShowAuthModal(false);
          setViewMode('onboarding');
        }}
      />
    </div>
  );
}
