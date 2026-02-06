import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TheAwakening } from './onboarding/TheAwakening';
import { NamesOfBecoming } from './onboarding/NamesOfBecoming';
import { InnerConstellation } from './onboarding/InnerConstellation';
import { MagneticField } from './onboarding/MagneticField';
import { TurningPoint } from './onboarding/TurningPoint';
import { MatheticsActivation } from './onboarding/MatheticsActivation';
import { AlignmentPulse } from './onboarding/AlignmentPulse';
import { PromiseToSelf } from './onboarding/PromiseToSelf';
import { DashboardUnlock } from './onboarding/DashboardUnlock';

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
}

type Stage = 
  | 'awakening'
  | 'identity'
  | 'constellation'
  | 'magnetic'
  | 'turning'
  | 'mathetics'
  | 'alignment'
  | 'promise'
  | 'unlock';

const STORAGE_KEY = 'awake_onboarding_progress';

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [stage, setStage] = useState<Stage>('awakening');
  const [userData, setUserData] = useState<UserData>({});

  // Load progress from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const { stage: savedStage, userData: savedData } = JSON.parse(saved);
        if (savedStage && savedData) {
          setStage(savedStage);
          setUserData(savedData);
        }
      } catch (e) {
        console.error('Failed to restore onboarding progress:', e);
      }
    }
  }, []);

  // Save progress to localStorage
  useEffect(() => {
    if (stage !== 'awakening' || Object.keys(userData).length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ stage, userData }));
    }
  }, [stage, userData]);

  const updateUserData = (key: keyof UserData, data: UserData[keyof UserData]) => {
    setUserData((prev) => ({ ...prev, [key]: data }));
  };

  const handleComplete = () => {
    // Save final user data
    localStorage.setItem('awake_user_data', JSON.stringify(userData));
    // Clear onboarding progress
    localStorage.removeItem(STORAGE_KEY);
    // Notify parent
    onComplete(userData);
  };

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
            setStage('constellation');
          }} 
        />
      )
    },
    {
      id: 'constellation',
      component: (
        <InnerConstellation 
          onContinue={(stats) => {
            updateUserData('stats', stats);
            setStage('magnetic');
          }} 
        />
      )
    },
    {
      id: 'magnetic',
      component: (
        <MagneticField 
          onContinue={(data) => {
            updateUserData('preferences', data);
            setStage('turning');
          }} 
        />
      )
    },
    {
      id: 'turning',
      component: (
        <TurningPoint 
          onContinue={(data) => {
            updateUserData('growth', data);
            setStage('mathetics');
          }} 
        />
      )
    },
    {
      id: 'mathetics',
      component: (
        <MatheticsActivation 
          onContinue={(data) => {
            updateUserData('mathetics', data);
            setStage('alignment');
          }} 
        />
      )
    },
    {
      id: 'alignment',
      component: (
        <AlignmentPulse 
          userData={userData}
          onComplete={() => setStage('promise')} 
        />
      )
    },
    {
      id: 'promise',
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
