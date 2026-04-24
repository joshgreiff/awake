/**
 * Alignment Routing
 * 
 * For Josh's problem: multiple real paths, no reliable way to choose without guilt.
 * 
 * This doesn't pick a winner. It surfaces what is most coherent with the user's
 * current state today — without closing or abandoning anything else.
 * 
 * "Held, not abandoned."
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Plus, Check, Sparkles, X } from 'lucide-react';
import { Button } from './ui/button';
import { LoaCompanion } from './LoaCompanion';
import type { UserData } from './OnboardingFlow';
import type { SessionState } from './StateCheckIn';
import aiService from '../services/aiService';

interface AlignmentRoutingProps {
  userData: UserData;
  session: SessionState;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (selectedPath: string, action: string) => void;
}

interface ActivePath {
  id: string;
  title: string;
  description?: string;
}

const STORAGE_KEY = 'awake_active_paths';

export function AlignmentRouting({ userData, session, isOpen, onClose, onComplete }: AlignmentRoutingProps) {
  const [phase, setPhase] = useState<'paths' | 'intuition' | 'routing' | 'result'>('paths');
  const [paths, setPaths] = useState<ActivePath[]>([]);
  const [newPathTitle, setNewPathTitle] = useState('');
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [suggestedAction, setSuggestedAction] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const userName = userData.identity?.name || 'Traveler';

  // Load paths on open
  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setPaths(JSON.parse(saved));
      }
      setPhase('paths');
      setSelectedPath(null);
      setSuggestedAction('');
    }
  }, [isOpen]);

  const savePaths = (newPaths: ActivePath[]) => {
    setPaths(newPaths);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPaths));
  };

  const addPath = () => {
    if (!newPathTitle.trim()) return;
    const newPath: ActivePath = {
      id: `path-${Date.now()}`,
      title: newPathTitle.trim(),
    };
    savePaths([...paths, newPath]);
    setNewPathTitle('');
  };

  const removePath = (id: string) => {
    savePaths(paths.filter(p => p.id !== id));
  };

  const handleIntuitionSelect = async (pathId: string) => {
    setSelectedPath(pathId);
    setPhase('routing');
    setIsLoading(true);

    const path = paths.find(p => p.id === pathId);
    if (!path) return;

    try {
      const prompt = `The user just completed a state check-in.

STATE:
- Energy: ${session.energyLevel}/5
- Signal: ${session.signalType}
${session.backgroundTension ? `- Background tension: "${session.backgroundTension}"` : ''}

They have multiple active paths in their life. When asked "which feels like it has the most pull right now?", they chose:

"${path.title}"

Give them ONE clear, specific action they can take from their current state. Not the ideal action - the REAL one that's actually available from where they are right now.

Be direct. 2-3 sentences max. End with the specific action.`;

      const response = await aiService.chatWithContext(prompt, userData);
      setSuggestedAction(response);
      setPhase('result');
    } catch (err) {
      console.error('Failed to get routing:', err);
      setSuggestedAction(`Focus on ${path.title} today. Start with the smallest possible step that feels true.`);
      setPhase('result');
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    const path = paths.find(p => p.id === selectedPath);
    onComplete(path?.title || '', suggestedAction);
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
          {/* Phase 1: Set up paths (if empty) or show them */}
          {phase === 'paths' && (
            <motion.div
              key="paths"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="text-center mb-6">
                <LoaCompanion size={50} animated={true} />
                <h2 className="text-xl font-medium mt-4 mb-2">
                  {paths.length === 0 ? "What paths are alive for you?" : "Your Active Paths"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {paths.length === 0 
                    ? "Add the things that matter — projects, interests, responsibilities."
                    : "These are all valid. Nothing gets abandoned."
                  }
                </p>
              </div>

              {/* Path list */}
              <div className="space-y-2 mb-4">
                {paths.map((path) => (
                  <div
                    key={path.id}
                    className="flex items-center gap-3 p-3 rounded-xl group"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <div className="w-2 h-2 rounded-full bg-primary/50" />
                    <span className="flex-1 text-sm">{path.title}</span>
                    <button
                      onClick={() => removePath(path.id)}
                      className="opacity-0 group-hover:opacity-50 hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add path */}
              <div className="flex gap-2 mb-6">
                <input
                  type="text"
                  value={newPathTitle}
                  onChange={(e) => setNewPathTitle(e.target.value)}
                  placeholder="Add a path..."
                  className="flex-1 p-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-primary/50"
                  onKeyDown={(e) => e.key === 'Enter' && addPath()}
                />
                <Button onClick={addPath} disabled={!newPathTitle.trim()} size="icon">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <Button 
                onClick={() => setPhase('intuition')} 
                disabled={paths.length < 2}
                className="w-full gap-2"
              >
                Find Today's Path <ArrowRight className="w-4 h-4" />
              </Button>

              {paths.length < 2 && (
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Add at least 2 paths to continue
                </p>
              )}
            </motion.div>
          )}

          {/* Phase 2: Intuition tap */}
          {phase === 'intuition' && (
            <motion.div
              key="intuition"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <h2 className="text-xl font-medium mb-2">
                Which has the most pull right now?
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Don't think. Trust the first thing that lights up.
              </p>

              <div className="space-y-2 mb-6">
                {paths.map((path, i) => (
                  <motion.button
                    key={path.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => handleIntuitionSelect(path.id)}
                    className="w-full p-4 rounded-xl text-left transition-all hover:scale-[1.02]"
                    style={{
                      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(20, 184, 166, 0.05))',
                      border: '1px solid rgba(99, 102, 241, 0.2)',
                    }}
                  >
                    <span className="font-medium">{path.title}</span>
                  </motion.button>
                ))}
              </div>

              <button 
                onClick={() => setPhase('paths')}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Edit paths
              </button>
            </motion.div>
          )}

          {/* Phase 3: Loading */}
          {phase === 'routing' && isLoading && (
            <motion.div
              key="routing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12"
            >
              <LoaCompanion size={70} animated={true} />
              <p className="text-sm text-muted-foreground mt-4">
                Finding your aligned action...
              </p>
            </motion.div>
          )}

          {/* Phase 4: Result */}
          {phase === 'result' && selectedPath && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="text-center mb-6">
                <Sparkles className="w-10 h-10 mx-auto mb-3 text-primary" />
                <h2 className="text-xl font-medium">
                  {paths.find(p => p.id === selectedPath)?.title}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  is calling from this state
                </p>
              </div>

              {/* Suggested action */}
              <div className="p-5 rounded-2xl mb-4" style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(20, 184, 166, 0.1))',
                border: '1px solid rgba(99, 102, 241, 0.2)',
              }}>
                <p className="text-sm leading-relaxed">{suggestedAction}</p>
              </div>

              {/* Held paths */}
              <div className="p-4 rounded-xl mb-6" style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}>
                <p className="text-xs tracking-widest opacity-50 mb-2">HELD, NOT ABANDONED</p>
                <div className="flex flex-wrap gap-2">
                  {paths.filter(p => p.id !== selectedPath).map(p => (
                    <span 
                      key={p.id}
                      className="px-2 py-1 rounded-full text-xs"
                      style={{
                        background: 'rgba(99, 102, 241, 0.1)',
                        border: '1px solid rgba(99, 102, 241, 0.15)',
                      }}
                    >
                      {p.title}
                    </span>
                  ))}
                </div>
              </div>

              <Button onClick={handleComplete} className="w-full gap-2">
                <Check className="w-4 h-4" /> Got it
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
