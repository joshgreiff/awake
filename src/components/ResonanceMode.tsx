/**
 * Resonance Mode
 * 
 * Built for Aurora's problem: the gap between who she is and who she can
 * access on a hard day.
 * 
 * This doesn't give pep talks. It holds the user's fully developed archetype
 * and mirrors it back — in the moments when they can't feel it themselves.
 * 
 * The goal is not motivation. It is recognition.
 * "You are still you, even right now."
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Heart, Sparkles, X } from 'lucide-react';
import { Button } from './ui/button';
import { LoaCompanion } from './LoaCompanion';
import type { UserData } from './OnboardingFlow';
import type { SessionState } from './StateCheckIn';
import { COGNITIVE_ORIENTATIONS, MOTIVATIONAL_DRIVERS, DEVELOPMENTAL_STATES } from '../types/archetype';
import aiService from '../services/aiService';

interface ResonanceModeProps {
  userData: UserData;
  session: SessionState;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

type Phase = 'opening' | 'anchors' | 'mirror' | 'action' | 'closing';

export function ResonanceMode({ userData, session, isOpen, onClose, onComplete }: ResonanceModeProps) {
  const [phase, setPhase] = useState<Phase>('opening');
  const [identityAnchors, setIdentityAnchors] = useState<string[]>([]);
  const [cognitiveMirror, setCognitiveMirror] = useState('');
  const [smallAction, setSmallAction] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const userName = userData.identity?.name || 'Traveler';
  const archetype = userData.archetype;

  // Generate content on open
  useEffect(() => {
    if (isOpen && phase === 'opening') {
      generateResonanceContent();
    }
  }, [isOpen]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setPhase('opening');
    }
  }, [isOpen]);

  const generateResonanceContent = async () => {
    setIsLoading(true);

    // Generate identity anchors based on archetype
    const anchors: string[] = [];
    
    if (archetype) {
      const cognitiveInfo = COGNITIVE_ORIENTATIONS[archetype.cognitiveOrientation as keyof typeof COGNITIVE_ORIENTATIONS];
      const driverInfo = MOTIVATIONAL_DRIVERS[archetype.primaryDriver as keyof typeof MOTIVATIONAL_DRIVERS];
      const stateInfo = DEVELOPMENTAL_STATES[archetype.developmentalState as keyof typeof DEVELOPMENTAL_STATES];

      if (cognitiveInfo) {
        anchors.push(`You are a ${cognitiveInfo.name.toLowerCase()}. ${cognitiveInfo.strengths[0]}.`);
      }
      if (driverInfo) {
        anchors.push(`At your core, you're driven by ${driverInfo.name.toLowerCase()}. This isn't weakness — it's your compass.`);
      }
      if (stateInfo) {
        anchors.push(`You're in a ${stateInfo.name.toLowerCase()} state. ${stateInfo.characteristics[0]}.`);
      }
      if (userData.intention) {
        anchors.push(`Your intention: "${userData.intention}". It's still true, even when you can't feel it.`);
      }
    } else {
      anchors.push(`You're someone who shows up, even on hard days.`);
      anchors.push(`The fact that you're here means something is still reaching for alignment.`);
      if (userData.intention) {
        anchors.push(`Your intention: "${userData.intention}". It's still true.`);
      }
    }

    setIdentityAnchors(anchors);

    // Generate cognitive mirror + small action from AI
    try {
      const prompt = `The user is in a disrupted state (${session.signalType}, energy ${session.energyLevel}/5).
${session.backgroundTension ? `They mentioned: "${session.backgroundTension}"` : ''}

They need Resonance Mode — not motivation, but recognition. Remind them who they are.

${archetype ? `Their archetype:
- Cognitive: ${archetype.cognitiveOrientation}
- Driver: ${archetype.primaryDriver}
- State: ${archetype.developmentalState}` : ''}

${userData.intention ? `Their core intention: "${userData.intention}"` : ''}

Write TWO things:

1. MIRROR (2-3 sentences): A reflection of who they are at their core. Not affirmations. Not pep talk. Just... seeing them. Write as if you've known them a long time and you're simply reminding them of something they already know about themselves.

2. ONE ACTION (1 sentence): The smallest possible aligned action available from THIS state. Not the ideal action. The real one they can actually do from here and mean it.

Format:
MIRROR: [your response]
ACTION: [your response]`;

      const response = await aiService.chatWithContext(prompt, userData);
      
      // Parse response
      const mirrorMatch = response.match(/MIRROR:\s*([\s\S]*?)(?=ACTION:|$)/i);
      const actionMatch = response.match(/ACTION:\s*([\s\S]*?)$/i);
      
      if (mirrorMatch) setCognitiveMirror(mirrorMatch[1].trim());
      if (actionMatch) setSmallAction(actionMatch[1].trim());
      
      if (!mirrorMatch) setCognitiveMirror(response.split('\n')[0]);
      if (!actionMatch) setSmallAction("Take one breath. Then decide if you want to do one small thing, or rest.");

    } catch (err) {
      console.error('Failed to generate resonance content:', err);
      setCognitiveMirror(`${userName}, you're still here. That counts for something. On hard days, showing up is the whole thing.`);
      setSmallAction("One breath. Then one small thing, or rest. Either is valid.");
    }

    setIsLoading(false);
    setPhase('anchors');
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
        className="w-full max-w-md"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 opacity-50 hover:opacity-100 transition-opacity"
        >
          <X className="w-5 h-5" />
        </button>

        <AnimatePresence mode="wait">
          {/* Opening / Loading */}
          {(phase === 'opening' || isLoading) && (
            <motion.div
              key="opening"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12"
            >
              <LoaCompanion size={80} animated={true} />
              <p className="text-lg mt-6 mb-2">I see you, {userName}.</p>
              <p className="text-sm text-muted-foreground">
                Let me remind you who you are.
              </p>
            </motion.div>
          )}

          {/* Identity Anchors */}
          {phase === 'anchors' && !isLoading && (
            <motion.div
              key="anchors"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="text-center mb-6">
                <Heart className="w-8 h-8 mx-auto mb-3 text-rose-400" />
                <p className="text-xs tracking-widest opacity-50">IDENTITY ANCHORS</p>
              </div>

              <div className="space-y-3 mb-8">
                {identityAnchors.map((anchor, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.3 }}
                    className="p-4 rounded-xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05), rgba(245, 158, 11, 0.05))',
                      border: '1px solid rgba(239, 68, 68, 0.15)',
                    }}
                  >
                    <p className="text-sm leading-relaxed">{anchor}</p>
                  </motion.div>
                ))}
              </div>

              <Button onClick={() => setPhase('mirror')} className="w-full gap-2">
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          )}

          {/* Cognitive Mirror */}
          {phase === 'mirror' && (
            <motion.div
              key="mirror"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="text-center mb-6">
                <Sparkles className="w-8 h-8 mx-auto mb-3 text-amber-400" />
                <p className="text-xs tracking-widest opacity-50">COGNITIVE MIRROR</p>
              </div>

              <div className="p-6 rounded-2xl mb-8" style={{
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(239, 68, 68, 0.05))',
                border: '1px solid rgba(245, 158, 11, 0.2)',
              }}>
                <p className="text-base leading-relaxed italic">
                  "{cognitiveMirror}"
                </p>
              </div>

              <Button onClick={() => setPhase('action')} className="w-full gap-2">
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          )}

          {/* One Action */}
          {phase === 'action' && (
            <motion.div
              key="action"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="text-center mb-6">
                <p className="text-xs tracking-widest opacity-50">ONE SMALL ACTION</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Not the ideal action. The real one.
                </p>
              </div>

              <div className="p-6 rounded-2xl mb-8" style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(20, 184, 166, 0.1))',
                border: '1px solid rgba(99, 102, 241, 0.2)',
              }}>
                <p className="text-base leading-relaxed">
                  {smallAction}
                </p>
              </div>

              <Button onClick={() => setPhase('closing')} className="w-full gap-2">
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          )}

          {/* Closing */}
          {phase === 'closing' && (
            <motion.div
              key="closing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <LoaCompanion size={70} animated={true} />
              
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-xl font-medium mt-6 mb-2"
                style={{
                  background: 'linear-gradient(135deg, #ef4444, #f59e0b)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                You are still you.
              </motion.p>
              
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-sm text-muted-foreground mb-8"
              >
                Even right now.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5 }}
              >
                <Button onClick={onComplete} className="gap-2">
                  <Heart className="w-4 h-4" /> I'm here
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
