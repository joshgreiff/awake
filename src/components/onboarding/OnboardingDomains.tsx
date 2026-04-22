/**
 * Onboarding Domain Mapping
 * Streamlined version for the onboarding flow
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, User, Users, Coins, Zap, Briefcase, Compass } from 'lucide-react';
import { Button } from '../ui/button';
import { DOMAINS, type DomainId, type DomainState } from '../../types/domains';

interface OnboardingDomainsProps {
  userName: string;
  onContinue: (domains: Record<DomainId, DomainState>) => void;
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
  { value: 1, label: 'Struggling' },
  { value: 2, label: 'Unstable' },
  { value: 3, label: 'Developing' },
  { value: 4, label: 'Stable' },
  { value: 5, label: 'Thriving' },
];

export function OnboardingDomains({ userName, onContinue }: OnboardingDomainsProps) {
  const [phase, setPhase] = useState<'intro' | 'assessment' | 'summary'>('intro');
  const [currentDomainIndex, setCurrentDomainIndex] = useState(0);
  const [domainStates, setDomainStates] = useState<Partial<Record<DomainId, DomainState>>>({});
  const [currentBaseline, setCurrentBaseline] = useState<number>(3);

  const domainIds = Object.keys(DOMAINS) as DomainId[];
  const currentDomainId = domainIds[currentDomainIndex];
  const currentDomain = DOMAINS[currentDomainId];
  const Icon = currentDomainId ? DOMAIN_ICONS[currentDomainId] : User;
  const color = currentDomainId ? DOMAIN_COLORS[currentDomainId] : '#6366f1';

  const handleNextDomain = () => {
    setDomainStates(prev => ({
      ...prev,
      [currentDomainId]: {
        currentBaseline,
        desiredState: 5,
        alignmentScore: currentBaseline * 20,
        frictionPoints: [],
        suggestedChanges: [],
      }
    }));

    if (currentDomainIndex < domainIds.length - 1) {
      setCurrentDomainIndex(currentDomainIndex + 1);
      setCurrentBaseline(3);
    } else {
      setPhase('summary');
    }
  };

  const handleComplete = () => {
    const finalStates = { ...domainStates };
    finalStates[currentDomainId] = {
      currentBaseline,
      desiredState: 5,
      alignmentScore: currentBaseline * 20,
      frictionPoints: [],
      suggestedChanges: [],
    };
    onContinue(finalStates as Record<DomainId, DomainState>);
  };

  const getOverallAlignment = () => {
    const states = Object.values(domainStates);
    if (states.length === 0) return 0;
    const sum = states.reduce((acc, s) => acc + (s?.alignmentScore || 0), 0);
    return Math.round(sum / states.length);
  };

  const getPriorityDomain = (): DomainId | null => {
    let lowest: { id: DomainId; score: number } | null = null;
    for (const [id, state] of Object.entries(domainStates)) {
      if (!lowest || (state?.currentBaseline || 5) < lowest.score) {
        lowest = { id: id as DomainId, score: state?.currentBaseline || 5 };
      }
    }
    return lowest?.id || null;
  };

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
              <h1 className="text-2xl md:text-3xl font-bold mb-3" style={{
                background: "linear-gradient(135deg, #8b5cf6, #14b8a6)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>
                Map Your Life Domains
              </h1>
              
              <p className="text-muted-foreground mb-6 text-sm">
                {userName}, let's see where you stand across the six core areas of life.
              </p>

              <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto mb-6">
                {domainIds.map((id) => {
                  const DIcon = DOMAIN_ICONS[id];
                  return (
                    <div
                      key={id}
                      className="p-2 rounded-lg text-center"
                      style={{
                        background: `${DOMAIN_COLORS[id]}10`,
                        border: `1px solid ${DOMAIN_COLORS[id]}20`,
                      }}
                    >
                      <DIcon className="w-4 h-4 mx-auto mb-1" style={{ color: DOMAIN_COLORS[id] }} />
                      <p className="text-[10px] opacity-70">{DOMAINS[id].name}</p>
                    </div>
                  );
                })}
              </div>

              <Button onClick={() => setPhase('assessment')} className="gap-2">
                Begin <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          )}

          {phase === 'assessment' && currentDomain && (
            <motion.div
              key={`domain-${currentDomainId}`}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
            >
              <div className="flex gap-1 justify-center mb-4">
                {domainIds.map((id, i) => (
                  <div
                    key={id}
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: i === currentDomainIndex 
                        ? DOMAIN_COLORS[id]
                        : i < currentDomainIndex 
                          ? `${DOMAIN_COLORS[id]}60`
                          : 'rgba(255,255,255,0.1)',
                    }}
                  />
                ))}
              </div>

              <div className="text-center mb-6">
                <div 
                  className="w-12 h-12 rounded-xl mx-auto flex items-center justify-center mb-3"
                  style={{ background: `${color}20`, border: `1px solid ${color}30` }}
                >
                  <Icon className="w-6 h-6" style={{ color }} />
                </div>
                <h2 className="text-xl font-bold" style={{ color }}>
                  {currentDomain.name}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {currentDomain.description}
                </p>
              </div>

              <p className="text-sm mb-3 opacity-70 text-center">Where are you now?</p>
              <div className="flex gap-2 mb-6">
                {STATE_LABELS.map((state) => (
                  <button
                    key={state.value}
                    onClick={() => setCurrentBaseline(state.value)}
                    className="flex-1 p-3 rounded-lg transition-all text-center"
                    style={{
                      background: currentBaseline === state.value 
                        ? `${color}25` 
                        : 'rgba(255,255,255,0.03)',
                      border: currentBaseline === state.value 
                        ? `2px solid ${color}` 
                        : '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    <p className="text-lg font-bold" style={{ color: currentBaseline === state.value ? color : undefined }}>
                      {state.value}
                    </p>
                    <p className="text-[10px] opacity-60">{state.label}</p>
                  </button>
                ))}
              </div>

              <div className="flex justify-end">
                <Button onClick={handleNextDomain} className="gap-2">
                  {currentDomainIndex < domainIds.length - 1 ? 'Next' : 'See Results'}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {phase === 'summary' && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <h1 className="text-xl font-bold mb-4" style={{
                background: "linear-gradient(135deg, #6366f1, #14b8a6)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>
                Your Domain Map
              </h1>

              <div className="grid grid-cols-3 gap-2 mb-6">
                {domainIds.map((id) => {
                  const state = domainStates[id];
                  const DIcon = DOMAIN_ICONS[id];
                  const dColor = DOMAIN_COLORS[id];
                  const isPriority = getPriorityDomain() === id;
                  
                  return (
                    <div
                      key={id}
                      className="p-3 rounded-lg relative"
                      style={{
                        background: `${dColor}10`,
                        border: isPriority ? `2px solid ${dColor}` : `1px solid ${dColor}20`,
                      }}
                    >
                      {isPriority && (
                        <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded text-[8px] font-medium"
                          style={{ background: dColor, color: 'white' }}
                        >
                          Focus
                        </span>
                      )}
                      <DIcon className="w-4 h-4 mx-auto mb-1" style={{ color: dColor }} />
                      <p className="text-xs font-medium">{DOMAINS[id].name}</p>
                      <p className="text-lg font-bold mt-1" style={{ color: dColor }}>
                        {state?.currentBaseline || 3}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 rounded-lg mb-6"
                style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)' }}
              >
                <p className="text-xs opacity-50">OVERALL</p>
                <p className="text-2xl font-bold" style={{ color: '#6366f1' }}>
                  {getOverallAlignment()}%
                </p>
              </div>

              <Button onClick={handleComplete} className="gap-2">
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
