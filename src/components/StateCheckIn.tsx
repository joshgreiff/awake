/**
 * State Check-In
 * 
 * The entry point to every Awake session.
 * Based on Aurora's MVP spec:
 * 
 * 1. Energy (1-5)
 * 2. Signal (emotional state)
 * 3. Background Tension (optional)
 * 
 * Routes to: Flow Mode / Alignment Routing / Resonance Mode
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowRight, Sparkles, Compass, Heart } from 'lucide-react';
import { Button } from './ui/button';
import { LoaCompanion } from './LoaCompanion';
import type { UserData } from './OnboardingFlow';

interface StateCheckInProps {
  userData: UserData;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (session: SessionState, mode: SessionMode) => void;
}

export type SignalType = 
  | 'clear'
  | 'foggy' 
  | 'resistant'
  | 'activated'
  | 'fragmented'
  | 'grief'
  | 'anxious'
  | 'grounded';

export type SessionMode = 'flow' | 'alignment' | 'resonance';

export interface SessionState {
  id: string;
  timestamp: string;
  energyLevel: number;
  signalType: SignalType;
  backgroundTension: string | null;
  mode: SessionMode;
}

const SIGNALS: { id: SignalType; label: string; description: string; icon: string }[] = [
  { id: 'clear', label: 'Clear', description: 'Mind is sharp, direction feels obvious', icon: '◈' },
  { id: 'grounded', label: 'Grounded', description: 'Stable, centered, at peace', icon: '◉' },
  { id: 'activated', label: 'Activated', description: 'Creative energy, inspired, ready to move', icon: '◐' },
  { id: 'foggy', label: 'Foggy', description: 'Hard to think clearly, direction unclear', icon: '◌' },
  { id: 'resistant', label: 'Resistant', description: 'Something feels off, pushing back', icon: '◇' },
  { id: 'anxious', label: 'Anxious', description: 'Worried, racing thoughts, unsettled', icon: '◎' },
  { id: 'fragmented', label: 'Fragmented', description: 'Pulled in many directions, scattered', icon: '◊' },
  { id: 'grief', label: 'Grief', description: 'Heavy, processing loss or sadness', icon: '◯' },
];

function determineMode(energy: number, signal: SignalType): SessionMode {
  // High energy + clear/activated/grounded → Flow
  if (energy >= 4 && ['clear', 'activated', 'grounded'].includes(signal)) {
    return 'flow';
  }
  
  // Low energy + fragmented/grief/anxious → Resonance (need to find yourself first)
  if (energy <= 2 && ['fragmented', 'grief', 'anxious'].includes(signal)) {
    return 'resonance';
  }
  
  // Mid energy or foggy/resistant → Alignment Routing
  return 'alignment';
}

type Phase = 'energy' | 'signal' | 'tension' | 'result';

export function StateCheckIn({ userData, isOpen, onClose, onComplete }: StateCheckInProps) {
  const [phase, setPhase] = useState<Phase>('energy');
  const [energy, setEnergy] = useState<number>(3);
  const [signal, setSignal] = useState<SignalType | null>(null);
  const [tension, setTension] = useState('');

  const userName = userData.identity?.name || 'Traveler';

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setPhase('energy');
      setEnergy(3);
      setSignal(null);
      setTension('');
    }
  }, [isOpen]);

  const handleComplete = () => {
    if (!signal) return;
    
    const mode = determineMode(energy, signal);
    const session: SessionState = {
      id: `session-${Date.now()}`,
      timestamp: new Date().toISOString(),
      energyLevel: energy,
      signalType: signal,
      backgroundTension: tension || null,
      mode,
    };

    // Save to localStorage for pattern tracking
    const sessions = JSON.parse(localStorage.getItem('awake_sessions') || '[]');
    sessions.unshift(session);
    localStorage.setItem('awake_sessions', JSON.stringify(sessions.slice(0, 100)));

    onComplete(session, mode);
  };

  const mode = signal ? determineMode(energy, signal) : null;

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(10, 5, 20, 0.98)' }}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 opacity-50 hover:opacity-100 transition-opacity"
        >
          <X className="w-5 h-5" />
        </button>

        <AnimatePresence mode="wait">
          {/* Phase 1: Energy */}
          {phase === 'energy' && (
            <motion.div
              key="energy"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <LoaCompanion size={60} animated={true} />
              
              <p className="text-sm text-muted-foreground mt-4 mb-2">
                Hey {userName}. Before we begin...
              </p>
              
              <h2 className="text-xl font-medium mb-8">
                Where's your energy right now?
              </h2>

              <div className="flex justify-center gap-3 mb-8">
                {[1, 2, 3, 4, 5].map((level) => (
                  <button
                    key={level}
                    onClick={() => setEnergy(level)}
                    className="w-14 h-14 rounded-xl flex flex-col items-center justify-center transition-all"
                    style={{
                      background: energy === level 
                        ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(20, 184, 166, 0.3))'
                        : 'rgba(255,255,255,0.03)',
                      border: energy === level 
                        ? '2px solid rgba(99, 102, 241, 0.6)'
                        : '1px solid rgba(255,255,255,0.1)',
                      transform: energy === level ? 'scale(1.05)' : 'scale(1)',
                    }}
                  >
                    <span className="text-lg font-medium">{level}</span>
                  </button>
                ))}
              </div>

              <div className="flex justify-between text-xs text-muted-foreground px-2 mb-8">
                <span>Running on empty</span>
                <span>Fully charged</span>
              </div>

              <Button onClick={() => setPhase('signal')} className="gap-2">
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          )}

          {/* Phase 2: Signal */}
          {phase === 'signal' && (
            <motion.div
              key="signal"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <h2 className="text-xl font-medium mb-2">
                What's the dominant feeling underneath?
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Not what you think you should feel. What's actually there.
              </p>

              <div className="grid grid-cols-2 gap-2 mb-6">
                {SIGNALS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSignal(s.id)}
                    className="p-3 rounded-xl text-left transition-all"
                    style={{
                      background: signal === s.id 
                        ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(20, 184, 166, 0.2))'
                        : 'rgba(255,255,255,0.03)',
                      border: signal === s.id 
                        ? '2px solid rgba(99, 102, 241, 0.5)'
                        : '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg opacity-50">{s.icon}</span>
                      <span className="font-medium text-sm">{s.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{s.description}</p>
                  </button>
                ))}
              </div>

              <Button 
                onClick={() => setPhase('tension')} 
                disabled={!signal}
                className="gap-2"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          )}

          {/* Phase 3: Background Tension */}
          {phase === 'tension' && (
            <motion.div
              key="tension"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <h2 className="text-xl font-medium mb-2">
                Anything pulling at you?
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Something in the background that has nothing to do with your work right now.
                <br /><span className="opacity-50">(Optional — one sentence max)</span>
              </p>

              <input
                type="text"
                value={tension}
                onChange={(e) => setTension(e.target.value)}
                placeholder="What's on your mind..."
                className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-primary/50 mb-6"
                maxLength={100}
              />

              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => setPhase('result')}>
                  Skip
                </Button>
                <Button onClick={() => setPhase('result')} className="gap-2">
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Phase 4: Result / Mode Selection */}
          {phase === 'result' && signal && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <LoaCompanion size={60} animated={true} />
              
              <p className="text-sm text-muted-foreground mt-4 mb-2">
                I see where you are.
              </p>

              {/* Mode display */}
              <div className="my-6 p-5 rounded-2xl" style={{
                background: mode === 'flow' 
                  ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(20, 184, 166, 0.15))'
                  : mode === 'resonance'
                  ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(245, 158, 11, 0.1))'
                  : 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15))',
                border: `1px solid ${
                  mode === 'flow' ? 'rgba(16, 185, 129, 0.3)' :
                  mode === 'resonance' ? 'rgba(239, 68, 68, 0.2)' :
                  'rgba(99, 102, 241, 0.3)'
                }`,
              }}>
                {mode === 'flow' && (
                  <>
                    <Sparkles className="w-8 h-8 mx-auto mb-3 text-emerald-400" />
                    <h3 className="font-medium text-lg mb-1">Flow Mode</h3>
                    <p className="text-sm text-muted-foreground">
                      You're clear and energized. Let's route you to what matters most today.
                    </p>
                  </>
                )}
                
                {mode === 'alignment' && (
                  <>
                    <Compass className="w-8 h-8 mx-auto mb-3 text-indigo-400" />
                    <h3 className="font-medium text-lg mb-1">Alignment Routing</h3>
                    <p className="text-sm text-muted-foreground">
                      Multiple paths are calling. Let's find which one is most coherent with where you are today.
                    </p>
                  </>
                )}
                
                {mode === 'resonance' && (
                  <>
                    <Heart className="w-8 h-8 mx-auto mb-3 text-rose-400" />
                    <h3 className="font-medium text-lg mb-1">Resonance Mode</h3>
                    <p className="text-sm text-muted-foreground">
                      Let me remind you who you are. You're still you, even right now.
                    </p>
                  </>
                )}
              </div>

              {/* Summary */}
              <div className="flex justify-center gap-4 text-xs text-muted-foreground mb-6">
                <span>Energy: {energy}/5</span>
                <span>•</span>
                <span className="capitalize">{signal.replace('_', ' ')}</span>
                {tension && (
                  <>
                    <span>•</span>
                    <span className="max-w-[100px] truncate">{tension}</span>
                  </>
                )}
              </div>

              <Button onClick={handleComplete} className="gap-2">
                {mode === 'flow' && 'Enter Flow'}
                {mode === 'alignment' && 'Find My Path'}
                {mode === 'resonance' && 'Find Myself'}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
