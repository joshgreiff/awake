/**
 * Onboarding Archetype Discovery
 * Streamlined version for the onboarding flow
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { LoaCompanion } from '../LoaCompanion';
import { 
  type CognitiveOrientation, 
  type MotivationalDriver, 
  type DevelopmentalState,
  type Archetype,
  COGNITIVE_ORIENTATIONS,
  MOTIVATIONAL_DRIVERS,
  DEVELOPMENTAL_STATES,
  getArchetypeName,
} from '../../types/archetype';

interface OnboardingArchetypeProps {
  onContinue: (archetype: Archetype) => void;
}

type Phase = 'intro' | 'cognitive' | 'motivation' | 'development' | 'result';

const COGNITIVE_SCENARIOS = [
  {
    question: "When facing a complex problem, you naturally:",
    options: [
      { id: 'systems_thinker', text: "Map all the interconnected parts" },
      { id: 'pattern_synthesizer', text: "Look for patterns from other domains" },
      { id: 'execution_focused', text: "Break it into steps and start moving" },
      { id: 'intuitive_knower', text: "Trust your gut sense of the real issue" },
    ]
  },
  {
    question: "When learning something new:",
    options: [
      { id: 'abstract_explorer', text: "Explore the concepts and philosophy first" },
      { id: 'sensory_empiricist', text: "Get hands-on with real examples" },
      { id: 'analytical_dissector', text: "Break it into components" },
      { id: 'narrative_weaver', text: "Understand the story and context" },
    ]
  },
];

const MOTIVATION_SCENARIOS = [
  {
    question: "What frustrates you most deeply?",
    options: [
      { id: 'coherence', text: "Feeling fragmented - parts of life don't fit together" },
      { id: 'sovereignty', text: "Feeling trapped - can't choose your own path" },
      { id: 'mastery', text: "Feeling stagnant - not growing or getting better" },
      { id: 'impact', text: "Feeling useless - like your existence doesn't matter" },
    ]
  },
  {
    question: "What would make this year feel successful?",
    options: [
      { id: 'coherence', text: "My actions finally matching my values" },
      { id: 'sovereignty', text: "Real freedom over my time and choices" },
      { id: 'discovery', text: "Understanding something deeply I didn't before" },
      { id: 'connection', text: "Deeper, more authentic relationships" },
    ]
  },
];

const DEVELOPMENT_QUESTION = {
  question: "How would you describe your current sense of self?",
  options: [
    { id: 'fragmented', text: "Scattered - pulled in many directions without a center" },
    { id: 'emerging', text: "Awakening - seeing patterns but haven't integrated them" },
    { id: 'integrating', text: "Building - actively unifying different parts of myself" },
    { id: 'expanding', text: "Stable - I know who I am and I'm growing into new territory" },
    { id: 'mastered', text: "Grounded - deeply coherent and naturally help others" },
  ]
};

export function OnboardingArchetype({ onContinue }: OnboardingArchetypeProps) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [cognitiveAnswers, setCognitiveAnswers] = useState<string[]>([]);
  const [motivationAnswers, setMotivationAnswers] = useState<string[]>([]);
  const [developmentAnswer, setDevelopmentAnswer] = useState<string>('');
  const [currentQuestion, setCurrentQuestion] = useState(0);

  const getMostCommon = (answers: string[]): string => {
    const counts: Record<string, number> = {};
    answers.forEach(a => { counts[a] = (counts[a] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || answers[0] || 'systems_thinker';
  };

  const handleAnswer = (answerId: string) => {
    if (phase === 'cognitive') {
      const newAnswers = [...cognitiveAnswers, answerId];
      setCognitiveAnswers(newAnswers);
      if (currentQuestion < COGNITIVE_SCENARIOS.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
      } else {
        setCurrentQuestion(0);
        setPhase('motivation');
      }
    } else if (phase === 'motivation') {
      const newAnswers = [...motivationAnswers, answerId];
      setMotivationAnswers(newAnswers);
      if (currentQuestion < MOTIVATION_SCENARIOS.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
      } else {
        setPhase('development');
      }
    } else if (phase === 'development') {
      setDevelopmentAnswer(answerId);
      setPhase('result');
    }
  };

  const getArchetype = (): Archetype => ({
    cognitiveOrientation: getMostCommon(cognitiveAnswers) as CognitiveOrientation,
    primaryDriver: getMostCommon(motivationAnswers) as MotivationalDriver,
    developmentalState: (developmentAnswer || 'emerging') as DevelopmentalState,
  });

  const getCurrentQuestion = () => {
    if (phase === 'cognitive') return COGNITIVE_SCENARIOS[currentQuestion];
    if (phase === 'motivation') return MOTIVATION_SCENARIOS[currentQuestion];
    if (phase === 'development') return DEVELOPMENT_QUESTION;
    return null;
  };

  const currentQ = getCurrentQuestion();
  const archetype = phase === 'result' ? getArchetype() : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xl">
        <AnimatePresence mode="wait">
          {phase === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <LoaCompanion size={80} animated={true} />
              
              <h1 className="text-2xl md:text-3xl font-bold mt-6 mb-3" style={{
                background: "linear-gradient(135deg, #6366f1, #14b8a6)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>
                Discover Your Archetype
              </h1>
              
              <p className="text-muted-foreground mb-6 text-sm">
                A few questions to understand how you think, what drives you, 
                and where you are in your journey.
              </p>

              <Button onClick={() => setPhase('cognitive')} className="gap-2">
                Begin <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          )}

          {(phase === 'cognitive' || phase === 'motivation' || phase === 'development') && currentQ && (
            <motion.div
              key={`${phase}-${currentQuestion}`}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
            >
              <p className="text-center text-xs tracking-widest opacity-50 mb-2">
                {phase === 'cognitive' && 'HOW YOU THINK'}
                {phase === 'motivation' && 'WHAT DRIVES YOU'}
                {phase === 'development' && 'WHERE YOU ARE'}
              </p>

              <h2 className="text-lg md:text-xl text-center mb-6">
                {currentQ.question}
              </h2>

              <div className="space-y-2">
                {currentQ.options.map((option, i) => (
                  <motion.button
                    key={option.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => handleAnswer(option.id)}
                    className="w-full p-4 rounded-xl text-left transition-all hover:scale-[1.01]"
                    style={{
                      background: 'rgba(99, 102, 241, 0.05)',
                      border: '1px solid rgba(99, 102, 241, 0.2)',
                    }}
                  >
                    <p className="text-sm">{option.text}</p>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {phase === 'result' && archetype && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4"
                style={{ background: 'linear-gradient(135deg, #6366f1, #14b8a6)' }}
              >
                <Sparkles className="w-8 h-8 text-white" />
              </motion.div>

              <h1 className="text-xl md:text-2xl font-bold mb-2" style={{
                background: "linear-gradient(135deg, #6366f1, #14b8a6)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>
                {getArchetypeName(archetype)}
              </h1>

              <div className="flex gap-2 justify-center flex-wrap mb-6 mt-4">
                <span className="px-3 py-1 rounded-full text-xs" style={{ background: 'rgba(99, 102, 241, 0.2)' }}>
                  {COGNITIVE_ORIENTATIONS[archetype.cognitiveOrientation]?.name || archetype.cognitiveOrientation}
                </span>
                <span className="px-3 py-1 rounded-full text-xs" style={{ background: 'rgba(20, 184, 166, 0.2)' }}>
                  {MOTIVATIONAL_DRIVERS[archetype.primaryDriver]?.name || archetype.primaryDriver}
                </span>
                <span className="px-3 py-1 rounded-full text-xs" style={{ background: 'rgba(245, 158, 11, 0.2)' }}>
                  {DEVELOPMENTAL_STATES[archetype.developmentalState]?.name || archetype.developmentalState}
                </span>
              </div>

              <p className="text-sm text-muted-foreground mb-6">
                {DEVELOPMENTAL_STATES[archetype.developmentalState]?.growthEdge}
              </p>

              <Button onClick={() => onContinue(archetype)} className="gap-2">
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
