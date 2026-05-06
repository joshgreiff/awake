/**
 * Daily Ritual
 * 
 * A quick 60-second flow when you open the app:
 * 1. How's your energy? (slider)
 * 2. What's one thing you want today? (text)
 * 3. Loa's take (AI response based on input)
 * 
 * Makes opening the app feel intentional and grounding.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Sparkles, ArrowRight, X, Sun, Heart } from 'lucide-react';
import { Button } from './ui/button';
import { LoaCompanion } from './LoaCompanion';
import type { UserData } from './OnboardingFlow';
import aiService from '../services/aiService';

interface DailyRitualProps {
  userData: UserData;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (energy: number, desire: string, loaMessage: string) => void;
}

type Phase = 'energy' | 'desire' | 'loa' | 'complete';

export function DailyRitual({ userData, isOpen, onClose, onComplete }: DailyRitualProps) {
  const [phase, setPhase] = useState<Phase>('energy');
  const [energy, setEnergy] = useState(5);
  const [desire, setDesire] = useState('');
  const [loaMessage, setLoaMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const userName = userData.identity?.name || 'friend';

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getEnergyLabel = (value: number) => {
    if (value <= 2) return 'Running low';
    if (value <= 4) return 'Getting by';
    if (value <= 6) return 'Steady';
    if (value <= 8) return 'Feeling good';
    return 'Fully charged';
  };

  const handleDesireSubmit = async () => {
    if (!desire.trim()) {
      setPhase('loa');
      generateLoaResponse('');
      return;
    }
    setPhase('loa');
    await generateLoaResponse(desire);
  };

  const generateLoaResponse = async (userDesire: string) => {
    setIsLoading(true);
    try {
      const prompt = userDesire 
        ? `${userName} just started their day. Their energy is ${energy}/10 (${getEnergyLabel(energy)}). When asked what they want today, they said: "${userDesire}"

Give them a brief, warm response (2-3 sentences). Acknowledge where they're at, validate what they want, and give them one grounding thought or small encouragement. Speak like you're their higher self checking in. End with something that makes them feel ready to start.`
        : `${userName} just started their day. Their energy is ${energy}/10 (${getEnergyLabel(energy)}). They didn't specify what they want today - maybe they're still figuring it out.

Give them a brief, warm response (2-3 sentences). Meet them where they are. If energy is low, be gentle. If high, match that energy. Remind them it's okay to not have everything figured out. Speak like you're their higher self. End with something grounding.`;

      const response = await aiService.chatWithContext(prompt, userData);
      setLoaMessage(response);
    } catch (err) {
      console.error('Failed to get Loa response:', err);
      setLoaMessage(energy <= 4 
        ? `I see you, ${userName}. Today doesn't need to be perfect. Just be here, take it one thing at a time. You've got this.`
        : `${userName}, you're already showing up — that's the first win. Trust what feels right today. Let's make it count.`
      );
    }
    setIsLoading(false);
    setPhase('complete');
  };

  const handleComplete = () => {
    onComplete(energy, desire, loaMessage);
    // Save today's ritual
    const ritual = {
      date: new Date().toISOString(),
      energy,
      desire,
      loaMessage,
    };
    const history = JSON.parse(localStorage.getItem('awake_ritual_history') || '[]');
    history.unshift(ritual);
    localStorage.setItem('awake_ritual_history', JSON.stringify(history.slice(0, 30)));
    
    // Update sliders
    const sliders = JSON.parse(localStorage.getItem('awake_cockpit_sliders') || '[]');
    const updatedSliders = sliders.map((s: any) => 
      s.id === 'energy' ? { ...s, value: energy * 10 } : s
    );
    localStorage.setItem('awake_cockpit_sliders', JSON.stringify(updatedSliders));
    
    // Reset for next time
    setTimeout(() => {
      setPhase('energy');
      setEnergy(5);
      setDesire('');
      setLoaMessage('');
    }, 300);
  };

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
        className="w-full max-w-md relative"
      >
        <button 
          onClick={onClose}
          className="absolute -top-12 right-0 opacity-50 hover:opacity-100 transition-opacity"
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
              <Sun className="w-10 h-10 mx-auto mb-4 text-amber-400" />
              <p className="text-sm text-muted-foreground mb-1">{getTimeGreeting()}, {userName}</p>
              <h2 className="text-xl font-medium mb-8">How's your energy?</h2>

              <div className="mb-4">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={energy}
                  onChange={(e) => setEnergy(parseInt(e.target.value))}
                  className="w-full h-3 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, 
                      ${energy <= 3 ? '#ef4444' : energy <= 6 ? '#f59e0b' : '#10b981'} 0%, 
                      ${energy <= 3 ? '#ef4444' : energy <= 6 ? '#f59e0b' : '#10b981'} ${energy * 10}%, 
                      rgba(255,255,255,0.1) ${energy * 10}%, 
                      rgba(255,255,255,0.1) 100%)`,
                  }}
                />
              </div>

              <div className="flex justify-between text-xs text-muted-foreground mb-2">
                <span>1</span>
                <span className="font-medium text-foreground">{energy}</span>
                <span>10</span>
              </div>

              <p className="text-sm mb-8" style={{ 
                color: energy <= 3 ? '#ef4444' : energy <= 6 ? '#f59e0b' : '#10b981' 
              }}>
                {getEnergyLabel(energy)}
              </p>

              <Button onClick={() => setPhase('desire')} className="gap-2">
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          )}

          {/* Phase 2: Desire */}
          {phase === 'desire' && (
            <motion.div
              key="desire"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <Heart className="w-10 h-10 mx-auto mb-4 text-rose-400" />
              <h2 className="text-xl font-medium mb-2">What do you want today?</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Not what you should do. What would feel good?
              </p>

              <textarea
                value={desire}
                onChange={(e) => setDesire(e.target.value)}
                placeholder="I want to feel..."
                className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-primary/50 resize-none mb-6"
                rows={3}
                autoFocus
              />

              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => handleDesireSubmit()}>
                  Skip
                </Button>
                <Button onClick={() => handleDesireSubmit()} className="gap-2">
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Phase 3: Loa Loading */}
          {phase === 'loa' && isLoading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12"
            >
              <LoaCompanion size={80} animated={true} />
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-sm text-muted-foreground mt-4"
              >
                Loa is tuning in...
              </motion.p>
            </motion.div>
          )}

          {/* Phase 4: Complete */}
          {phase === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="text-center mb-6">
                <LoaCompanion size={60} animated={true} />
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="p-5 rounded-2xl mb-6"
                style={{
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(20, 184, 166, 0.1))',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                }}
              >
                <p className="text-sm leading-relaxed">{loaMessage}</p>
              </motion.div>

              {desire && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-center mb-6"
                >
                  <p className="text-xs opacity-40 mb-1">Today's intention</p>
                  <p className="text-sm italic">"{desire}"</p>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="text-center"
              >
                <Button onClick={handleComplete} className="gap-2">
                  <Sparkles className="w-4 h-4" /> Let's go
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
