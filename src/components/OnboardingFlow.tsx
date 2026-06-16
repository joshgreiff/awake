import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TheAwakening } from './onboarding/TheAwakening';
import { NamesOfBecoming } from './onboarding/NamesOfBecoming';
import { OnboardingArchetype } from './onboarding/OnboardingArchetype';
import { OnboardingDomains } from './onboarding/OnboardingDomains';
import { PromiseToSelf } from './onboarding/PromiseToSelf';
import { DashboardUnlock } from './onboarding/DashboardUnlock';
import type { CockpitSyncState } from '../types/cockpitSync';
import type { Archetype } from '../types/archetype';
import type { DomainId, DomainState } from '../types/domains';
import {
  clearOnboardingProgress,
  isOnboardingComplete,
  readOnboardingProgress,
  writeOnboardingProgress,
} from '../utils/onboardingProgress';
import { bootstrapUserSession } from '../utils/sessionBootstrap';
import { auth, isSupabaseConfigured, userData as userDataService } from '../services/supabase';
import { AuthModal } from './AuthModal';
import { AwakeLogo } from './AwakeLogo';
import type { User } from '@supabase/supabase-js';

interface OnboardingFlowProps {
  onComplete: (userData: UserData) => void | Promise<void>;
}

// User data structure
export interface UserData {
  identity?: {
    name: string;
    pronouns: string;
    alias?: string;
  };
  /** Optional profile image URL (e.g. avatar picker export) */
  avatar?: string;
  stats?: Record<string, number>;
  preferences?: {
    attractions: string[];
    resistances: string[];
  };
  growth?: {
    changes: string[];
    reflection?: string;
  };
  mathetics?: {
    enabled: boolean;
    birthData?: {
      date: string;
      time: string;
      place: string;
    };
  };
  intention?: string;
  vision?: string;
  antiVision?: string;
  /** Synced cockpit + habits when signed in (see utils/cockpitCloudSync) */
  cockpitSync?: CockpitSyncState;
  archetype?: Archetype;
  domains?: Partial<Record<DomainId, DomainState>>;
}

type Stage = 
  | 'awakening'
  | 'identity'
  | 'archetype'
  | 'domains'
  | 'intention'
  | 'unlock';

function getInitialOnboardingState(): { stage: Stage; userData: UserData } {
  const localRaw = localStorage.getItem('awake_user_data');
  const localData = localRaw ? (JSON.parse(localRaw) as UserData) : {};
  const saved = readOnboardingProgress();

  if (saved) {
    return {
      stage: saved.stage as Stage,
      userData: { ...localData, ...saved.userData },
    };
  }
  return { stage: 'awakening', userData: localData };
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const initial = getInitialOnboardingState();
  const [stage, setStage] = useState<Stage>(initial.stage);
  const [userData, setUserData] = useState<UserData>(initial.userData);
  const [checkingAccount, setCheckingAccount] = useState(true);
  const [accountUser, setAccountUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const userDataRef = useRef(userData);
  userDataRef.current = userData;

  const tryRestoreAccount = useCallback(async () => {
    setSyncStatus(null);
    const { view, data } = await bootstrapUserSession();
    if (view === 'dashboard' && data) {
      clearOnboardingProgress();
      onComplete(data);
      return true;
    }
    if (data && isOnboardingComplete(data)) {
      clearOnboardingProgress();
      onComplete(data);
      return true;
    }
    if (data && Object.keys(data).length > 0) {
      setUserData((prev) => ({ ...data, ...prev }));
    }
    setSyncStatus(
      accountUser
        ? 'No saved profile for this account yet — finish setup below (saves to cloud).'
        : null
    );
    return false;
  }, [accountUser, onComplete]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setCheckingAccount(false);
      return;
    }

    void auth.getUser().then(setAccountUser);
  }, []);

  // Signed-in users with a cloud profile skip setup
  useEffect(() => {
    let cancelled = false;

    void tryRestoreAccount().then((restored) => {
      if (!cancelled && !restored) {
        setCheckingAccount(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [tryRestoreAccount]);

  // Persist after every step (including awakening)
  useEffect(() => {
    writeOnboardingProgress({ stage, userData });
  }, [stage, userData]);

  const persistProgress = useCallback((next: UserData) => {
    if (!next.identity?.name?.trim()) return;
    void userDataService.save(next).catch((err) => {
      console.error('Failed to sync onboarding progress:', err);
    });
  }, []);

  const updateUserData = (key: keyof UserData, data: UserData[keyof UserData]) => {
    setUserData((prev) => {
      const next = { ...prev, [key]: data };
      persistProgress(next);
      return next;
    });
  };

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleComplete = useCallback(async () => {
    const finalData = userDataRef.current;
    setIsSaving(true);
    setSaveError(null);

    const result = await userDataService.save(finalData);
    localStorage.setItem('awake_user_data', JSON.stringify(finalData));

    if (!result.ok) {
      setSaveError(result.error);
      setIsSaving(false);
      return;
    }

    clearOnboardingProgress();
    await onComplete(finalData);
    setIsSaving(false);
  }, [onComplete]);

  const stages: { id: Stage; component: React.ReactNode }[] = [
    {
      id: 'awakening',
      component: (
        <TheAwakening onContinue={() => setStage('identity')} />
      )
    },
    {
      id: 'identity',
      component: (
        <NamesOfBecoming
          initialName={userData.identity?.name}
          initialPronouns={userData.identity?.pronouns}
          onContinue={(data) => {
            updateUserData('identity', {
              name: data.name,
              pronouns: data.pronouns,
              alias: data.generatedAlias,
            });
            setStage('archetype');
          }}
        />
      )
    },
    {
      id: 'archetype',
      component: (
        <OnboardingArchetype 
          onContinue={(archetype) => {
            updateUserData('archetype', archetype);
            setStage('domains');
          }} 
        />
      )
    },
    {
      id: 'domains',
      component: (
        <OnboardingDomains 
          userName={userData.identity?.name || 'Traveler'}
          onContinue={(domains) => {
            updateUserData('domains', domains);
            setStage('intention');
          }} 
        />
      )
    },
    {
      id: 'intention',
      component: (
        <PromiseToSelf 
          userData={userData}
          onContinue={(intention) => {
            updateUserData('intention', intention);
            setStage('unlock');
          }} 
        />
      )
    },
    {
      id: 'unlock',
      component: (
        <DashboardUnlock 
          userData={userData}
          onEnter={() => void handleComplete()}
          isSaving={isSaving}
          saveError={saveError}
        />
      )
    }
  ];

  const currentStageIndex = stages.findIndex(s => s.id === stage);
  const currentStage = stages[currentStageIndex];

  if (checkingAccount) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <AwakeLogo size="medium" />
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-screen overflow-hidden bg-background">
      {isSupabaseConfigured() && (
        <div className="fixed top-12 right-4 left-4 z-50 mx-auto max-w-md">
          {accountUser ? (
            <div
              className="rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-center text-xs backdrop-blur-sm"
            >
              <span className="opacity-60">Signed in as {accountUser.email}</span>
              {' · '}
              <button
                type="button"
                onClick={() => void tryRestoreAccount()}
                className="text-teal-300 hover:underline"
              >
                Sync account
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAuthModal(true)}
              className="w-full rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-4 py-2.5 text-xs text-indigo-200 backdrop-blur-sm transition-colors hover:bg-indigo-500/20"
            >
              Already set up on awakeapp.space? Sign in to restore your profile
            </button>
          )}
          {syncStatus && (
            <p className="mt-2 text-center text-[11px] text-amber-200/80">{syncStatus}</p>
          )}
        </div>
      )}

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={async () => {
          setShowAuthModal(false);
          const u = await auth.getUser();
          setAccountUser(u);
          clearOnboardingProgress();
          await tryRestoreAccount();
          setCheckingAccount(false);
        }}
      />

      {/* Progress indicator */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <div className="h-1 bg-muted">
          <motion.div
            className="h-full"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStageIndex + 1) / stages.length) * 100}%` }}
            transition={{ duration: 0.5 }}
            style={{
              background: 'linear-gradient(90deg, #6366f1, #14b8a6, #f59e0b)',
              boxShadow: '0 0 10px rgba(99, 102, 241, 0.5)'
            }}
          />
        </div>
      </div>

      {/* Stage counter */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        className="fixed top-6 left-6 z-40 text-xs tracking-widest"
      >
        <span style={{ color: '#6366f1' }}>
          {String(currentStageIndex + 1).padStart(2, '0')}
        </span>
        <span className="opacity-50"> / {String(stages.length).padStart(2, '0')}</span>
      </motion.div>

      {/* Stage content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={stage}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.5 }}
          className="w-full h-screen"
        >
          {currentStage.component}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
