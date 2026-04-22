/**
 * Archetype Assessment
 * 
 * A guided conversation with Loa to discover:
 * - Cognitive Orientation (how you process reality)
 * - Motivational Driver (why you act)
 * - Developmental State (where you are in growth)
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ArrowLeft, Sparkles, Check } from 'lucide-react';
import { Button } from './ui/button';
import { LoaCompanion } from './LoaCompanion';
import { 
  type CognitiveOrientation, 
  type MotivationalDriver, 
  type DevelopmentalState,
  type Archetype,
  COGNITIVE_ORIENTATIONS,
  MOTIVATIONAL_DRIVERS,
  DEVELOPMENTAL_STATES,
  getArchetypeName,
  getArchetypeDescription,
} from '../types/archetype';

interface ArchetypeAssessmentProps {
  onComplete: (archetype: Archetype) => void;
  onClose: () => void;
}

type Phase = 'intro' | 'cognitive' | 'motivation' | 'development' | 'result';

// Scenarios for detecting cognitive orientation
const COGNITIVE_SCENARIOS = [
  {
    question: "When facing a complex problem, you naturally tend to:",
    options: [
      { id: 'systems_thinker', text: "Map out all the interconnected parts and how they affect each other" },
      { id: 'pattern_synthesizer', text: "Look for similar patterns from other domains that might apply" },
      { id: 'execution_focused', text: "Break it into actionable steps and start moving" },
      { id: 'intuitive_knower', text: "Trust your gut sense of what the real issue is" },
    ]
  },
  {
    question: "When learning something new, you prefer to:",
    options: [
      { id: 'abstract_explorer', text: "Explore the underlying concepts and philosophy first" },
      { id: 'sensory_empiricist', text: "Get hands-on experience and see real examples" },
      { id: 'analytical_dissector', text: "Break it down into components and understand each part" },
      { id: 'narrative_weaver', text: "Understand the context, history, and story behind it" },
    ]
  },
  {
    question: "In conversations, you're most engaged when:",
    options: [
      { id: 'relational_processor', text: "Exploring emotions and what people really feel" },
      { id: 'pattern_synthesizer', text: "Connecting seemingly unrelated ideas" },
      { id: 'pragmatic_adapter', text: "Figuring out what actually works in this specific situation" },
      { id: 'systems_thinker', text: "Understanding how different factors influence each other" },
    ]
  },
];

// Scenarios for detecting motivational driver
const MOTIVATION_SCENARIOS = [
  {
    question: "What frustrates you most deeply?",
    options: [
      { id: 'coherence', text: "Feeling fragmented - like different parts of your life don't fit together" },
      { id: 'sovereignty', text: "Feeling trapped or controlled - like you can't choose your own path" },
      { id: 'mastery', text: "Feeling stagnant - like you're not growing or getting better" },
      { id: 'impact', text: "Feeling useless - like your existence doesn't matter" },
    ]
  },
  {
    question: "What would make this year feel successful?",
    options: [
      { id: 'coherence', text: "Finally feeling like my actions match my values" },
      { id: 'sovereignty', text: "Having real freedom over my time and choices" },
      { id: 'discovery', text: "Understanding something deeply that I didn't before" },
      { id: 'connection', text: "Having deeper, more authentic relationships" },
    ]
  },
  {
    question: "When you imagine your ideal life, what's most central?",
    options: [
      { id: 'impact', text: "Making a meaningful difference in the world" },
      { id: 'mastery', text: "Being excellent at something that matters to you" },
      { id: 'connection', text: "Being surrounded by people who truly get you" },
      { id: 'coherence', text: "Living in complete alignment with who you really are" },
    ]
  },
];

// Questions for developmental state
const DEVELOPMENT_QUESTIONS = [
  {
    question: "How would you describe your current sense of self?",
    options: [
      { id: 'fragmented', text: "Scattered - I feel pulled in many directions without a center" },
      { id: 'emerging', text: "Awakening - I'm starting to see patterns but haven't integrated them" },
      { id: 'integrating', text: "Building - I'm actively working to unify different parts of myself" },
      { id: 'expanding', text: "Stable - I know who I am and I'm growing into new territory" },
      { id: 'mastered', text: "Grounded - I feel deeply coherent and naturally help others" },
    ]
  },
  {
    question: "When you gain a new insight about yourself, what typically happens?",
    options: [
      { id: 'fragmented', text: "It adds to the confusion - now there's one more thing to figure out" },
      { id: 'emerging', text: "It's exciting but I struggle to act on it consistently" },
      { id: 'integrating', text: "I actively work to embody it, with mixed success" },
      { id: 'expanding', text: "It fits into my existing understanding and I can apply it" },
      { id: 'mastered', text: "It deepens what I already know and I can teach it to others" },
    ]
  },
];

export function ArchetypeAssessment({ onComplete, onClose }: ArchetypeAssessmentProps) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [cognitiveAnswers, setCognitiveAnswers] = useState<string[]>([]);
  const [motivationAnswers, setMotivationAnswers] = useState<string[]>([]);
  const [developmentAnswers, setDevelopmentAnswers] = useState<string[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  // Calculate most common answer
  const getMostCommon = (answers: string[]): string => {
    const counts: Record<string, number> = {};
    answers.forEach(a => { counts[a] = (counts[a] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
  };

  // Handle answer selection
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
        setCurrentQuestion(0);
        setPhase('development');
      }
    } else if (phase === 'development') {
      const newAnswers = [...developmentAnswers, answerId];
      setDevelopmentAnswers(newAnswers);
      if (currentQuestion < DEVELOPMENT_QUESTIONS.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
      } else {
        setPhase('result');
      }
    }
  };

  // Calculate final archetype
  const getArchetype = (): Archetype => {
    return {
      cognitiveOrientation: getMostCommon(cognitiveAnswers) as CognitiveOrientation,
      primaryDriver: getMostCommon(motivationAnswers) as MotivationalDriver,
      developmentalState: getMostCommon(developmentAnswers) as DevelopmentalState,
    };
  };

  // Get current questions based on phase
  const getCurrentQuestions = () => {
    switch (phase) {
      case 'cognitive': return COGNITIVE_SCENARIOS;
      case 'motivation': return MOTIVATION_SCENARIOS;
      case 'development': return DEVELOPMENT_QUESTIONS;
      default: return [];
    }
  };

  const questions = getCurrentQuestions();
  const currentQ = questions[currentQuestion];
  const archetype = phase === 'result' ? getArchetype() : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background overflow-y-auto"
    >
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          
          {/* Intro Phase */}
          <AnimatePresence mode="wait">
            {phase === 'intro' && (
              <motion.div
                key="intro"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center"
              >
                <LoaCompanion size={100} animated={true} />
                
                <h1 className="text-3xl font-bold mt-8 mb-4" style={{
                  background: "linear-gradient(135deg, #6366f1, #14b8a6)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}>
                  Discover Your Archetype
                </h1>
                
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  I'm going to ask you some questions to understand how you think, 
                  what drives you, and where you are in your journey. This helps me 
                  guide you better.
                </p>

                <div className="space-y-3 text-left max-w-sm mx-auto mb-8 p-4 rounded-xl"
                  style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)' }}
                >
                  <p className="text-sm"><strong>We'll explore:</strong></p>
                  <p className="text-sm opacity-80">• How you process reality (cognitive orientation)</p>
                  <p className="text-sm opacity-80">• What fundamentally drives you (motivational core)</p>
                  <p className="text-sm opacity-80">• Where you are in your growth (developmental state)</p>
                </div>

                <div className="flex gap-4 justify-center">
                  <Button variant="outline" onClick={onClose}>
                    Maybe Later
                  </Button>
                  <Button onClick={() => setPhase('cognitive')} className="gap-2">
                    Let's Begin <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Question Phases */}
            {(phase === 'cognitive' || phase === 'motivation' || phase === 'development') && currentQ && (
              <motion.div
                key={`${phase}-${currentQuestion}`}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
              >
                {/* Phase indicator */}
                <div className="flex gap-2 justify-center mb-8">
                  {['cognitive', 'motivation', 'development'].map((p, i) => (
                    <div
                      key={p}
                      className={`w-3 h-3 rounded-full transition-colors ${
                        p === phase ? 'bg-primary' : 
                        ['cognitive', 'motivation', 'development'].indexOf(phase) > i ? 'bg-primary/50' : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>

                {/* Phase title */}
                <p className="text-center text-xs tracking-widest opacity-50 mb-2">
                  {phase === 'cognitive' && 'HOW YOU THINK'}
                  {phase === 'motivation' && 'WHAT DRIVES YOU'}
                  {phase === 'development' && 'WHERE YOU ARE'}
                </p>

                {/* Question */}
                <h2 className="text-xl md:text-2xl text-center mb-8">
                  {currentQ.question}
                </h2>

                {/* Options */}
                <div className="space-y-3">
                  {currentQ.options.map((option, i) => (
                    <motion.button
                      key={option.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      onClick={() => handleAnswer(option.id)}
                      className="w-full p-4 rounded-xl text-left transition-all hover:scale-[1.02]"
                      style={{
                        background: 'rgba(99, 102, 241, 0.05)',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                      }}
                    >
                      <p className="text-sm md:text-base">{option.text}</p>
                    </motion.button>
                  ))}
                </div>

                {/* Progress */}
                <p className="text-center text-xs opacity-50 mt-6">
                  Question {currentQuestion + 1} of {questions.length}
                </p>
              </motion.div>
            )}

            {/* Result Phase */}
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
                >
                  <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-6"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #14b8a6)' }}
                  >
                    <Sparkles className="w-10 h-10 text-white" />
                  </div>
                </motion.div>

                <h1 className="text-2xl md:text-3xl font-bold mb-2" style={{
                  background: "linear-gradient(135deg, #6366f1, #14b8a6)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}>
                  {getArchetypeName(archetype)}
                </h1>

                <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                  {getArchetypeDescription(archetype)}
                </p>

                {/* Breakdown */}
                <div className="grid md:grid-cols-3 gap-4 mb-8">
                  <div className="p-4 rounded-xl" style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                    <p className="text-xs opacity-50 mb-1">COGNITIVE</p>
                    <p className="font-medium">{COGNITIVE_ORIENTATIONS[archetype.cognitiveOrientation].name}</p>
                  </div>
                  <div className="p-4 rounded-xl" style={{ background: 'rgba(20, 184, 166, 0.1)', border: '1px solid rgba(20, 184, 166, 0.2)' }}>
                    <p className="text-xs opacity-50 mb-1">DRIVER</p>
                    <p className="font-medium">{MOTIVATIONAL_DRIVERS[archetype.primaryDriver].name}</p>
                  </div>
                  <div className="p-4 rounded-xl" style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                    <p className="text-xs opacity-50 mb-1">STATE</p>
                    <p className="font-medium">{DEVELOPMENTAL_STATES[archetype.developmentalState].name}</p>
                  </div>
                </div>

                {/* Growth Edge */}
                <div className="p-4 rounded-xl mb-8 text-left max-w-md mx-auto"
                  style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)' }}
                >
                  <p className="text-xs opacity-50 mb-1">YOUR GROWTH EDGE</p>
                  <p className="text-sm">{DEVELOPMENTAL_STATES[archetype.developmentalState].growthEdge}</p>
                </div>

                <Button onClick={() => onComplete(archetype)} className="gap-2">
                  <Check className="w-4 h-4" /> Save & Continue
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
