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
  readOnboardingProgress,
  writeOnboardingProgress,
} from '../utils/onboardingProgress';

interface OnboardingFlowProps {
  onComplete: (userData: UserData) => void;
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
  const saved = readOnboardingProgress();
  if (saved) {
    return { stage: saved.stage as Stage, userData: saved.userData };
  }
  return { stage: 'awakening', userData: {} };
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const initial = getInitialOnboardingState();
  const [stage, setStage] = useState<Stage>(initial.stage);
  const [userData, setUserData] = useState<UserData>(initial.userData);
  const userDataRef = useRef(userData);
  userDataRef.current = userData;

  // Persist after every step (including awakening)
  useEffect(() => {
    writeOnboardingProgress({ stage, userData });
  }, [stage, userData]);

  const updateUserData = (key: keyof UserData, data: UserData[keyof UserData]) => {
    setUserData((prev) => ({ ...prev, [key]: data }));
  };

  const handleComplete = useCallback(() => {
    const finalData = userDataRef.current;
    localStorage.setItem('awake_user_data', JSON.stringify(finalData));
    clearOnboardingProgress();
    onComplete(finalData);
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
          onContinue={(data) => {
            updateUserData('identity', data);
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
          onEnter={handleComplete} 
        />
      )
    }
  ];

  const currentStageIndex = stages.findIndex(s => s.id === stage);
  const currentStage = stages[currentStageIndex];

  return (
    <div className="relative w-full min-h-screen overflow-hidden bg-background">
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
