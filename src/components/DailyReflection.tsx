/**
 * Daily Reflection Flow
 * 
 * A structured check-in with Loa that:
 * - Prompts reflection based on user's archetype and domains
 * - Records insights
 * - Provides Loa's interpretation
 * - Tracks reflection streaks
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Sparkles, CheckCircle, Flame } from 'lucide-react';
import { Button } from './ui/button';
import { LoaCompanion } from './LoaCompanion';
import type { UserData } from './OnboardingFlow';
import aiService from '../services/aiService';
import { DOMAINS, type DomainId } from '../types/domains';
import { DEVELOPMENTAL_STATES } from '../types/archetype';

interface DailyReflectionProps {
  userData: UserData;
  isOpen: boolean;
  onClose: () => void;
  onSaveReflection: (reflection: ReflectionEntry) => void;
}

export interface ReflectionEntry {
  id: string;
  date: string;
  prompt: string;
  response: string;
  loaInsight: string;
  domainFocus?: DomainId;
  mood?: number;
}

type Phase = 'prompt' | 'writing' | 'insight' | 'complete';

const REFLECTION_PROMPTS = [
  "What's alive in you right now? Not what you think you should feel, but what's actually there.",
  "Where did you feel most aligned today? Where did you feel friction?",
  "What's one thing you're avoiding looking at? What might it be protecting you from?",
  "If today were a teacher, what lesson was it trying to give you?",
  "What would you do differently if you weren't worried about being productive?",
  "Where are you performing instead of being? What would authenticity look like there?",
  "What's something you believe that you haven't fully committed to?",
  "If you trusted yourself completely, what would you do next?",
];

function getDomainPrompt(domainId: DomainId): string {
  const prompts: Record<DomainId, string> = {
    identity: "Who were you today? Did you show up as the person you want to become?",
    relationships: "How did your connections feel today? Where did you feel seen? Where did you hide?",
    wealth: "What's your relationship with resources right now? Scarcity or abundance mindset?",
    body_energy: "How did your body feel today? What did it need that you gave it? What did it need that you didn't?",
    work: "Did your work feel like expression or extraction today? What would make tomorrow different?",
    governance: "How well did you manage yourself today? Where did your systems support you? Where did they fail?",
  };
  return prompts[domainId];
}

function getPersonalizedPrompt(userData: UserData): { prompt: string; domainFocus?: DomainId } {
  const domains = userData.domains;
  
  // Find lowest alignment domain
  if (domains) {
    let lowestDomain: { id: DomainId; score: number } | null = null;
    for (const [id, state] of Object.entries(domains)) {
      if (!lowestDomain || (state?.currentBaseline || 5) < lowestDomain.score) {
        lowestDomain = { id: id as DomainId, score: state?.currentBaseline || 5 };
      }
    }
    
    // 50% chance to focus on lowest domain
    if (lowestDomain && Math.random() < 0.5) {
      return {
        prompt: getDomainPrompt(lowestDomain.id),
        domainFocus: lowestDomain.id,
      };
    }
  }

  // Otherwise use a general prompt
  return {
    prompt: REFLECTION_PROMPTS[Math.floor(Math.random() * REFLECTION_PROMPTS.length)],
  };
}

export function DailyReflection({ userData, isOpen, onClose, onSaveReflection }: DailyReflectionProps) {
  const [phase, setPhase] = useState<Phase>('prompt');
  const [prompt, setPrompt] = useState('');
  const [domainFocus, setDomainFocus] = useState<DomainId | undefined>();
  const [response, setResponse] = useState('');
  const [loaInsight, setLoaInsight] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streak, setStreak] = useState(0);

  const userName = userData.identity?.name || 'Traveler';

  // Initialize prompt when opened
  useEffect(() => {
    if (isOpen && phase === 'prompt') {
      const { prompt: newPrompt, domainFocus: newFocus } = getPersonalizedPrompt(userData);
      setPrompt(newPrompt);
      setDomainFocus(newFocus);
      
      // Load streak from localStorage
      const streakData = localStorage.getItem('awake_reflection_streak');
      if (streakData) {
        const { count, lastDate } = JSON.parse(streakData);
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        
        if (lastDate === yesterday) {
          setStreak(count);
        } else if (lastDate !== today) {
          setStreak(0);
        } else {
          setStreak(count);
        }
      }
    }
  }, [isOpen, userData]);

  // Reset when closed
  useEffect(() => {
    if (!isOpen) {
      setPhase('prompt');
      setResponse('');
      setLoaInsight('');
    }
  }, [isOpen]);

  const handleSubmitReflection = async () => {
    if (!response.trim()) return;
    
    setPhase('insight');
    setIsLoading(true);

    try {
      const archetype = userData.archetype;
      const stateInfo = archetype?.developmentalState 
        ? DEVELOPMENTAL_STATES[archetype.developmentalState as keyof typeof DEVELOPMENTAL_STATES]
        : null;
      
      const contextPrompt = `The user just completed a daily reflection.

REFLECTION PROMPT: "${prompt}"
${domainFocus ? `DOMAIN FOCUS: ${DOMAINS[domainFocus].name}` : ''}

USER'S RESPONSE: "${response}"

${stateInfo ? `Their developmental state is "${stateInfo.name}" with growth edge: "${stateInfo.growthEdge}"` : ''}

Provide a brief, insightful response (2-3 sentences max). Name what you see - the pattern, the tension, or the insight that might not be obvious to them. Don't just validate - offer a perspective they might not have considered. End with something they can sit with, not a question.`;

      const insight = await aiService.chatWithContext(contextPrompt, userData);
      setLoaInsight(insight);
      setPhase('complete');
    } catch (err) {
      console.error('Failed to get Loa insight:', err);
      setLoaInsight("I see you. Sometimes the act of writing it down is the insight itself. Let this settle.");
      setPhase('complete');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    const entry: ReflectionEntry = {
      id: `reflection-${Date.now()}`,
      date: new Date().toISOString(),
      prompt,
      response,
      loaInsight,
      domainFocus,
    };

    // Update streak
    const newStreak = streak + 1;
    localStorage.setItem('awake_reflection_streak', JSON.stringify({
      count: newStreak,
      lastDate: new Date().toDateString(),
    }));

    onSaveReflection(entry);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(10, 5, 20, 0.95)' }}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(30, 21, 51, 0.9)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <LoaCompanion size={36} animated={isLoading} />
            <div>
              <h2 className="font-semibold">Daily Reflection</h2>
              {streak > 0 && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Flame className="w-3 h-3 text-orange-500" />
                  {streak} day streak
                </p>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {/* Prompt Phase */}
            {phase === 'prompt' && (
              <motion.div
                key="prompt"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center"
              >
                {domainFocus && (
                  <p className="text-xs tracking-widest opacity-50 mb-2">
                    {DOMAINS[domainFocus].name.toUpperCase()}
                  </p>
                )}
                <p className="text-lg mb-6">{prompt}</p>
                <Button onClick={() => setPhase('writing')} className="gap-2">
                  Reflect <Sparkles className="w-4 h-4" />
                </Button>
              </motion.div>
            )}

            {/* Writing Phase */}
            {phase === 'writing' && (
              <motion.div
                key="writing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <p className="text-sm opacity-70 mb-3">{prompt}</p>
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder={`Write freely, ${userName}...`}
                  className="w-full h-40 p-4 rounded-xl bg-white/5 border border-white/10 resize-none focus:outline-none focus:border-primary/50 text-sm"
                  autoFocus
                />
                <div className="flex justify-end mt-4">
                  <Button 
                    onClick={handleSubmitReflection} 
                    disabled={!response.trim()}
                    className="gap-2"
                  >
                    <Send className="w-4 h-4" /> Submit
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Insight Phase (Loading) */}
            {phase === 'insight' && isLoading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-8"
              >
                <LoaCompanion size={60} animated={true} />
                <p className="text-sm text-muted-foreground mt-4">Loa is reflecting...</p>
              </motion.div>
            )}

            {/* Complete Phase */}
            {phase === 'complete' && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="mb-4 p-3 rounded-lg" style={{ background: 'rgba(99, 102, 241, 0.1)' }}>
                  <p className="text-xs opacity-50 mb-1">YOUR REFLECTION</p>
                  <p className="text-sm opacity-80">{response}</p>
                </div>

                <div className="p-4 rounded-xl" style={{ 
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(20, 184, 166, 0.1))',
                  border: '1px solid rgba(99, 102, 241, 0.2)'
                }}>
                  <div className="flex items-start gap-3">
                    <LoaCompanion size={32} />
                    <div>
                      <p className="text-xs opacity-50 mb-1">LOA'S INSIGHT</p>
                      <p className="text-sm">{loaInsight}</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center mt-6">
                  <Button onClick={handleSave} className="gap-2">
                    <CheckCircle className="w-4 h-4" /> Complete Reflection
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
