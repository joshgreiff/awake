/**
 * Domain Mapping
 * 
 * A visual assessment of the 6 life domains:
 * - Identity, Relationships, Wealth, Body & Energy, Work, Governance
 * 
 * Users rate their current state and desired state for each domain,
 * helping Loa understand where to focus.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Check, User, Users, Coins, Zap, Briefcase, Compass } from 'lucide-react';
import { Button } from './ui/button';
import { LoaCompanion } from './LoaCompanion';
import { DOMAINS, type DomainId, type DomainState } from '../types/domains';

interface DomainMappingProps {
  onComplete: (domains: Record<DomainId, DomainState>) => void;
  onClose?: () => void;
}

const DOMAIN_ICONS: Record<DomainId, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  identity: User,
  relationships: Users,
  wealth: Coins,
  body_energy: Zap,
  work: Briefcase,
  governance: Compass,
};

const DOMAIN_COLORS: Record<DomainId, string> = {
  identity: '#8b5cf6',
  relationships: '#ec4899',
  wealth: '#f59e0b',
  body_energy: '#10b981',
  work: '#6366f1',
  governance: '#14b8a6',
};

const STATE_LABELS = [
  { value: 1, label: 'Struggling', description: 'Needs urgent attention' },
  { value: 2, label: 'Unstable', description: 'Requires consistent work' },
  { value: 3, label: 'Developing', description: 'Making progress' },
  { value: 4, label: 'Stable', description: 'Functioning well' },
  { value: 5, label: 'Thriving', description: 'Flourishing' },
];

type Phase = 'intro' | 'assessment' | 'friction' | 'summary';

export function DomainMapping({ onComplete, onClose }: DomainMappingProps) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [currentDomainIndex, setCurrentDomainIndex] = useState(0);
  const [domainStates, setDomainStates] = useState<Partial<Record<DomainId, DomainState>>>({});
  const [currentBaseline, setCurrentBaseline] = useState<number>(3);
  const [desiredState, setDesiredState] = useState<number>(5);
  const [frictionPoint, setFrictionPoint] = useState<string>('');

  const domainIds = Object.keys(DOMAINS) as DomainId[];
  const currentDomainId = domainIds[currentDomainIndex];
  const currentDomain = DOMAINS[currentDomainId];
  const Icon = DOMAIN_ICONS[currentDomainId];
  const color = DOMAIN_COLORS[currentDomainId];

  const handleNextDomain = () => {
    // Save current domain state
    setDomainStates(prev => ({
      ...prev,
      [currentDomainId]: {
        currentBaseline,
        desiredState,
        alignmentScore: Math.round((currentBaseline / desiredState) * 100),
        frictionPoints: frictionPoint ? [frictionPoint] : [],
        suggestedChanges: [],
      }
    }));

    if (currentDomainIndex < domainIds.length - 1) {
      setCurrentDomainIndex(currentDomainIndex + 1);
      setCurrentBaseline(3);
      setDesiredState(5);
      setFrictionPoint('');
      setPhase('assessment');
    } else {
      setPhase('summary');
    }
  };

  const handleComplete = () => {
    // Build final domain states
    const finalStates = { ...domainStates };
    
    // Ensure current domain is saved
    finalStates[currentDomainId] = {
      currentBaseline,
      desiredState,
      alignmentScore: Math.round((currentBaseline / desiredState) * 100),
      frictionPoints: frictionPoint ? [frictionPoint] : [],
      suggestedChanges: [],
    };

    onComplete(finalStates as Record<DomainId, DomainState>);
  };

  // Calculate overall alignment for summary
  const getOverallAlignment = () => {
    const states = Object.values(domainStates);
    if (states.length === 0) return 0;
    const total = states.reduce((sum, s) => sum + (s?.alignmentScore || 0), 0);
    return Math.round(total / states.length);
  };

  // Find priority domain (lowest alignment)
  const getPriorityDomain = () => {
    let lowest: { id: DomainId; score: number } | null = null;
    for (const [id, state] of Object.entries(domainStates)) {
      if (!lowest || (state?.alignmentScore || 100) < lowest.score) {
        lowest = { id: id as DomainId, score: state?.alignmentScore || 100 };
      }
    }
    return lowest?.id;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background overflow-y-auto"
    >
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          
          <AnimatePresence mode="wait">
            {/* Intro Phase */}
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
                  Map Your Domains
                </h1>
                
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Your life operates across six interconnected domains. Let's see where 
                  you stand in each one - this helps me understand where to focus our work together.
                </p>

                {/* Domain preview */}
                <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto mb-8">
                  {domainIds.map((id) => {
                    const DIcon = DOMAIN_ICONS[id];
                    return (
                      <div
                        key={id}
                        className="p-3 rounded-xl text-center"
                        style={{
                          background: `${DOMAIN_COLORS[id]}15`,
                          border: `1px solid ${DOMAIN_COLORS[id]}30`,
                        }}
                      >
                        <DIcon className="w-5 h-5 mx-auto mb-1" style={{ color: DOMAIN_COLORS[id] }} />
                        <p className="text-xs opacity-80">{DOMAINS[id].name}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-4 justify-center">
                  {onClose && (
                    <Button variant="outline" onClick={onClose}>
                      Maybe Later
                    </Button>
                  )}
                  <Button onClick={() => setPhase('assessment')} className="gap-2">
                    Let's Map It <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Assessment Phase */}
            {phase === 'assessment' && (
              <motion.div
                key={`assessment-${currentDomainId}`}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
              >
                {/* Progress dots */}
                <div className="flex gap-2 justify-center mb-6">
                  {domainIds.map((id, i) => (
                    <div
                      key={id}
                      className="w-3 h-3 rounded-full transition-colors"
                      style={{
                        background: i === currentDomainIndex 
                          ? DOMAIN_COLORS[id]
                          : i < currentDomainIndex 
                            ? `${DOMAIN_COLORS[id]}80`
                            : 'rgba(255,255,255,0.1)',
                      }}
                    />
                  ))}
                </div>

                {/* Domain header */}
                <div className="text-center mb-8">
                  <div 
                    className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4"
                    style={{ background: `${color}20`, border: `1px solid ${color}40` }}
                  >
                    <Icon className="w-8 h-8" style={{ color }} />
                  </div>
                  <h2 className="text-2xl font-bold" style={{ color }}>
                    {currentDomain.name}
                  </h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    {currentDomain.description}
                  </p>
                  <p className="text-xs opacity-50 mt-2 italic">
                    "{currentDomain.keyQuestion}"
                  </p>
                </div>

                {/* Current State */}
                <div className="mb-8">
                  <p className="text-sm mb-3 opacity-70">Where are you now?</p>
                  <div className="flex gap-2">
                    {STATE_LABELS.map((state) => (
                      <button
                        key={state.value}
                        onClick={() => setCurrentBaseline(state.value)}
                        className="flex-1 p-3 rounded-xl transition-all text-center"
                        style={{
                          background: currentBaseline === state.value 
                            ? `${color}30` 
                            : 'rgba(255,255,255,0.05)',
                          border: currentBaseline === state.value 
                            ? `2px solid ${color}` 
                            : '1px solid rgba(255,255,255,0.1)',
                          transform: currentBaseline === state.value ? 'scale(1.02)' : 'scale(1)',
                        }}
                      >
                        <p className="text-lg font-bold" style={{ color: currentBaseline === state.value ? color : undefined }}>
                          {state.value}
                        </p>
                        <p className="text-xs opacity-70">{state.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Desired State */}
                <div className="mb-8">
                  <p className="text-sm mb-3 opacity-70">Where do you want to be?</p>
                  <div className="flex gap-2">
                    {STATE_LABELS.map((state) => (
                      <button
                        key={state.value}
                        onClick={() => setDesiredState(Math.max(state.value, currentBaseline))}
                        disabled={state.value < currentBaseline}
                        className="flex-1 p-3 rounded-xl transition-all text-center"
                        style={{
                          background: desiredState === state.value 
                            ? `${color}30` 
                            : 'rgba(255,255,255,0.05)',
                          border: desiredState === state.value 
                            ? `2px solid ${color}` 
                            : '1px solid rgba(255,255,255,0.1)',
                          opacity: state.value < currentBaseline ? 0.3 : 1,
                          transform: desiredState === state.value ? 'scale(1.02)' : 'scale(1)',
                        }}
                      >
                        <p className="text-lg font-bold" style={{ color: desiredState === state.value ? color : undefined }}>
                          {state.value}
                        </p>
                        <p className="text-xs opacity-70">{state.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Friction Point (optional) */}
                <div className="mb-8">
                  <p className="text-sm mb-3 opacity-70">
                    What's the biggest friction in this domain? <span className="opacity-50">(optional)</span>
                  </p>
                  <input
                    type="text"
                    value={frictionPoint}
                    onChange={(e) => setFrictionPoint(e.target.value)}
                    placeholder="e.g., Inconsistent energy, unclear direction..."
                    className="w-full p-4 rounded-xl bg-white/5 border border-white/10 focus:border-primary/50 outline-none text-sm"
                  />
                </div>

                {/* Navigation */}
                <div className="flex justify-between">
                  <div className="text-xs opacity-50">
                    {currentDomainIndex + 1} of {domainIds.length}
                  </div>
                  <Button onClick={handleNextDomain} className="gap-2">
                    {currentDomainIndex < domainIds.length - 1 ? (
                      <>Next Domain <ArrowRight className="w-4 h-4" /></>
                    ) : (
                      <>See Results <Check className="w-4 h-4" /></>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Summary Phase */}
            {phase === 'summary' && (
              <motion.div
                key="summary"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <h1 className="text-2xl font-bold mb-2" style={{
                  background: "linear-gradient(135deg, #6366f1, #14b8a6)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}>
                  Your Domain Map
                </h1>
                
                <p className="text-muted-foreground mb-8">
                  Here's how your life domains currently look
                </p>

                {/* Domain grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                  {domainIds.map((id) => {
                    const state = domainStates[id];
                    const DIcon = DOMAIN_ICONS[id];
                    const dColor = DOMAIN_COLORS[id];
                    const isPriority = getPriorityDomain() === id;
                    
                    return (
                      <div
                        key={id}
                        className="p-4 rounded-xl relative"
                        style={{
                          background: `${dColor}10`,
                          border: isPriority ? `2px solid ${dColor}` : `1px solid ${dColor}30`,
                        }}
                      >
                        {isPriority && (
                          <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[10px] font-medium"
                            style={{ background: dColor, color: 'white' }}
                          >
                            Priority
                          </span>
                        )}
                        <DIcon className="w-5 h-5 mx-auto mb-2" style={{ color: dColor }} />
                        <p className="text-sm font-medium">{DOMAINS[id].name}</p>
                        <div className="flex items-center justify-center gap-1 mt-2">
                          <span className="text-lg font-bold" style={{ color: dColor }}>
                            {state?.currentBaseline || 3}
                          </span>
                          <span className="text-xs opacity-50">→</span>
                          <span className="text-sm opacity-70">
                            {state?.desiredState || 5}
                          </span>
                        </div>
                        {state?.frictionPoints?.[0] && (
                          <p className="text-[10px] opacity-50 mt-1 truncate">
                            {state.frictionPoints[0]}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Overall alignment */}
                <div className="p-4 rounded-xl mb-8"
                  style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)' }}
                >
                  <p className="text-xs opacity-50 mb-1">OVERALL ALIGNMENT</p>
                  <p className="text-3xl font-bold" style={{ color: '#6366f1' }}>
                    {getOverallAlignment()}%
                  </p>
                  <p className="text-xs opacity-70 mt-1">
                    Gap between where you are and where you want to be
                  </p>
                </div>

                <Button onClick={handleComplete} className="gap-2">
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
