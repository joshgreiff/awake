/**
 * Flow Mode
 * 
 * For when the user is clear and energized.
 * Routes them quickly to what matters most today.
 * 
 * No friction. Just clarity and action.
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Sparkles, ArrowRight, X, Zap } from 'lucide-react';
import { Button } from './ui/button';
import { LoaCompanion } from './LoaCompanion';
import type { UserData } from './OnboardingFlow';
import type { SessionState } from './StateCheckIn';
import aiService from '../services/aiService';

interface FlowModeProps {
  userData: UserData;
  session: SessionState;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (focus: string) => void;
}

export function FlowMode({ userData, session, isOpen, onClose, onComplete }: FlowModeProps) {
  const [focus, setFocus] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const userName = userData.identity?.name || 'Traveler';

  useEffect(() => {
    if (isOpen) {
      generateFlowFocus();
    }
  }, [isOpen]);

  const generateFlowFocus = async () => {
    setIsLoading(true);

    // Check if user has active paths
    const savedPaths = localStorage.getItem('awake_active_paths');
    const paths = savedPaths ? JSON.parse(savedPaths) : [];

    try {
      const prompt = `The user is in FLOW state — clear, energized, ready to go.

Energy: ${session.energyLevel}/5
Signal: ${session.signalType}
${userData.intention ? `Their core intention: "${userData.intention}"` : ''}
${paths.length > 0 ? `Their active paths: ${paths.map((p: any) => p.title).join(', ')}` : ''}

They don't need convincing or routing. They need ONE clear focus for this energy.

In 1-2 sentences, tell them what to channel this into today. Be specific and direct. Match their high energy.`;

      const response = await aiService.chatWithContext(prompt, userData);
      setFocus(response);
    } catch (err) {
      console.error('Failed to generate flow focus:', err);
      setFocus(`You're clear and charged, ${userName}. Pick the thing that's been waiting for this energy and give it everything you've got.`);
    }

    setIsLoading(false);
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
        className="w-full max-w-md text-center"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 opacity-50 hover:opacity-100 transition-opacity"
        >
          <X className="w-5 h-5" />
        </button>

        {isLoading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-12"
          >
            <LoaCompanion size={70} animated={true} />
            <p className="text-sm text-muted-foreground mt-4">
              Reading your flow state...
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.1 }}
              className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-6"
              style={{ background: 'linear-gradient(135deg, #10b981, #14b8a6)' }}
            >
              <Zap className="w-8 h-8 text-white" />
            </motion.div>

            <h2 className="text-xl font-medium mb-2">
              You're in flow, {userName}.
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Don't overthink it. Channel this.
            </p>

            <div className="p-6 rounded-2xl mb-8" style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(20, 184, 166, 0.15))',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}>
              <p className="text-base leading-relaxed">{focus}</p>
            </div>

            <Button onClick={() => onComplete(focus)} className="gap-2" style={{
              background: 'linear-gradient(135deg, #10b981, #14b8a6)',
            }}>
              <Sparkles className="w-4 h-4" /> Let's go
            </Button>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
