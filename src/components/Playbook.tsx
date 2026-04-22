/**
 * Playbook System
 * 
 * Based on Dan Koe's framework:
 * - Current Project (the "Boss Fight")
 * - Daily Levers (actions that move the needle)
 * - Progress tracking
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Plus, Target, Zap, Check, Trash2, 
  ChevronRight, Flame, Calendar
} from 'lucide-react';
import { Button } from './ui/button';
import type { UserData } from './OnboardingFlow';

interface PlaybookProps {
  userData: UserData;
  isOpen: boolean;
  onClose: () => void;
  onSave: (playbook: PlaybookData) => void;
}

export interface PlaybookData {
  currentProject: {
    title: string;
    description: string;
    targetDate?: string;
    domainFocus?: string;
  } | null;
  dailyLevers: DailyLever[];
  completedToday: string[];
  lastUpdated: string;
  streak: number;
}

interface DailyLever {
  id: string;
  title: string;
  description?: string;
  domain?: string;
}

const SUGGESTED_LEVERS = [
  { title: "Morning reflection (5 min)", domain: "governance" },
  { title: "Deep work block (2 hrs)", domain: "work" },
  { title: "Movement / Exercise", domain: "body_energy" },
  { title: "Read for 30 min", domain: "identity" },
  { title: "Connect with someone", domain: "relationships" },
  { title: "Review finances", domain: "wealth" },
];

const STORAGE_KEY = 'awake_playbook';

export function Playbook({ userData, isOpen, onClose, onSave }: PlaybookProps) {
  const [playbook, setPlaybook] = useState<PlaybookData>({
    currentProject: null,
    dailyLevers: [],
    completedToday: [],
    lastUpdated: new Date().toDateString(),
    streak: 0,
  });
  const [view, setView] = useState<'main' | 'project' | 'levers'>('main');
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newLeverTitle, setNewLeverTitle] = useState('');

  // Load playbook from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved) as PlaybookData;
        
        // Reset completedToday if it's a new day
        const today = new Date().toDateString();
        if (data.lastUpdated !== today) {
          // Check if yesterday - maintain streak
          const yesterday = new Date(Date.now() - 86400000).toDateString();
          const allCompleted = data.dailyLevers.length > 0 && 
            data.dailyLevers.every(l => data.completedToday.includes(l.id));
          
          data.completedToday = [];
          data.lastUpdated = today;
          
          if (data.lastUpdated === yesterday && allCompleted) {
            data.streak = (data.streak || 0) + 1;
          } else if (data.lastUpdated !== yesterday) {
            data.streak = 0;
          }
        }
        
        setPlaybook(data);
      } catch (e) {
        console.error('Failed to load playbook:', e);
      }
    }
  }, [isOpen]);

  // Save playbook
  const savePlaybook = (updated: PlaybookData) => {
    setPlaybook(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    onSave(updated);
  };

  const toggleLeverComplete = (leverId: string) => {
    const updated = { ...playbook };
    if (updated.completedToday.includes(leverId)) {
      updated.completedToday = updated.completedToday.filter(id => id !== leverId);
    } else {
      updated.completedToday = [...updated.completedToday, leverId];
    }
    updated.lastUpdated = new Date().toDateString();
    
    // Check if all complete - update streak
    const allComplete = updated.dailyLevers.every(l => updated.completedToday.includes(l.id));
    if (allComplete && updated.dailyLevers.length > 0) {
      // Streak will be incremented on next day load
    }
    
    savePlaybook(updated);
  };

  const addLever = (title: string, domain?: string) => {
    if (!title.trim()) return;
    const newLever: DailyLever = {
      id: `lever-${Date.now()}`,
      title: title.trim(),
      domain,
    };
    const updated = {
      ...playbook,
      dailyLevers: [...playbook.dailyLevers, newLever],
    };
    savePlaybook(updated);
    setNewLeverTitle('');
  };

  const removeLever = (leverId: string) => {
    const updated = {
      ...playbook,
      dailyLevers: playbook.dailyLevers.filter(l => l.id !== leverId),
      completedToday: playbook.completedToday.filter(id => id !== leverId),
    };
    savePlaybook(updated);
  };

  const setProject = () => {
    if (!newProjectTitle.trim()) return;
    const updated = {
      ...playbook,
      currentProject: {
        title: newProjectTitle.trim(),
        description: newProjectDesc.trim(),
      },
    };
    savePlaybook(updated);
    setNewProjectTitle('');
    setNewProjectDesc('');
    setView('main');
  };

  const clearProject = () => {
    const updated = { ...playbook, currentProject: null };
    savePlaybook(updated);
  };

  const completedCount = playbook.completedToday.length;
  const totalLevers = playbook.dailyLevers.length;
  const progress = totalLevers > 0 ? (completedCount / totalLevers) * 100 : 0;

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
        className="w-full max-w-lg max-h-[85vh] rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: 'rgba(30, 21, 51, 0.9)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #6366f1, #14b8a6)' }}
            >
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold">Playbook</h2>
              {playbook.streak > 0 && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Flame className="w-3 h-3 text-orange-500" />
                  {playbook.streak} day streak
                </p>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          <AnimatePresence mode="wait">
            {view === 'main' && (
              <motion.div
                key="main"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Current Project */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs tracking-widest opacity-50">CURRENT PROJECT</p>
                    {playbook.currentProject && (
                      <button onClick={clearProject} className="text-xs opacity-50 hover:opacity-100">
                        Clear
                      </button>
                    )}
                  </div>
                  
                  {playbook.currentProject ? (
                    <div className="p-4 rounded-xl" style={{
                      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(20, 184, 166, 0.15))',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                    }}>
                      <h3 className="font-medium">{playbook.currentProject.title}</h3>
                      {playbook.currentProject.description && (
                        <p className="text-sm opacity-70 mt-1">{playbook.currentProject.description}</p>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => setView('project')}
                      className="w-full p-4 rounded-xl border-2 border-dashed border-white/10 hover:border-primary/30 transition-colors text-center"
                    >
                      <Plus className="w-5 h-5 mx-auto mb-1 opacity-50" />
                      <p className="text-sm opacity-50">Set your focus project</p>
                    </button>
                  )}
                </div>

                {/* Daily Levers */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs tracking-widest opacity-50">DAILY LEVERS</p>
                    <p className="text-xs opacity-50">{completedCount}/{totalLevers}</p>
                  </div>

                  {/* Progress bar */}
                  {totalLevers > 0 && (
                    <div className="h-2 bg-white/5 rounded-full mb-4 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        style={{ background: progress === 100 
                          ? 'linear-gradient(90deg, #10b981, #14b8a6)' 
                          : 'linear-gradient(90deg, #6366f1, #14b8a6)' 
                        }}
                      />
                    </div>
                  )}

                  {/* Levers list */}
                  <div className="space-y-2 mb-4">
                    {playbook.dailyLevers.map((lever) => {
                      const isComplete = playbook.completedToday.includes(lever.id);
                      return (
                        <motion.div
                          key={lever.id}
                          layout
                          className="flex items-center gap-3 p-3 rounded-lg group"
                          style={{
                            background: isComplete ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.03)',
                            border: isComplete ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255,255,255,0.05)',
                          }}
                        >
                          <button
                            onClick={() => toggleLeverComplete(lever.id)}
                            className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                              isComplete 
                                ? 'bg-emerald-500 text-white' 
                                : 'border border-white/20 hover:border-primary/50'
                            }`}
                          >
                            {isComplete && <Check className="w-3 h-3" />}
                          </button>
                          <span className={`flex-1 text-sm ${isComplete ? 'line-through opacity-50' : ''}`}>
                            {lever.title}
                          </span>
                          <button
                            onClick={() => removeLever(lever.id)}
                            className="opacity-0 group-hover:opacity-50 hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Add lever */}
                  <button
                    onClick={() => setView('levers')}
                    className="w-full p-3 rounded-lg border border-dashed border-white/10 hover:border-primary/30 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4 opacity-50" />
                    <span className="text-sm opacity-50">Add lever</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Set Project View */}
            {view === 'project' && (
              <motion.div
                key="project"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <button
                  onClick={() => setView('main')}
                  className="flex items-center gap-1 text-sm opacity-50 hover:opacity-100 mb-4"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" /> Back
                </button>

                <h3 className="font-medium mb-4">Set Your Focus Project</h3>
                <p className="text-sm opacity-70 mb-4">
                  What's the one thing that, if completed, would make everything else easier?
                </p>

                <input
                  type="text"
                  value={newProjectTitle}
                  onChange={(e) => setNewProjectTitle(e.target.value)}
                  placeholder="Project title..."
                  className="w-full p-3 rounded-lg bg-white/5 border border-white/10 mb-3 text-sm focus:outline-none focus:border-primary/50"
                  autoFocus
                />
                <textarea
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="Why does this matter? (optional)"
                  className="w-full p-3 rounded-lg bg-white/5 border border-white/10 mb-4 text-sm resize-none h-20 focus:outline-none focus:border-primary/50"
                />

                <Button onClick={setProject} disabled={!newProjectTitle.trim()} className="w-full">
                  Set Project
                </Button>
              </motion.div>
            )}

            {/* Add Levers View */}
            {view === 'levers' && (
              <motion.div
                key="levers"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <button
                  onClick={() => setView('main')}
                  className="flex items-center gap-1 text-sm opacity-50 hover:opacity-100 mb-4"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" /> Back
                </button>

                <h3 className="font-medium mb-2">Add Daily Lever</h3>
                <p className="text-sm opacity-70 mb-4">
                  Small actions that compound. What moves the needle?
                </p>

                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newLeverTitle}
                    onChange={(e) => setNewLeverTitle(e.target.value)}
                    placeholder="Add a lever..."
                    className="flex-1 p-3 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-primary/50"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && addLever(newLeverTitle)}
                  />
                  <Button onClick={() => addLever(newLeverTitle)} disabled={!newLeverTitle.trim()}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                <p className="text-xs opacity-50 mb-2">SUGGESTIONS</p>
                <div className="space-y-2">
                  {SUGGESTED_LEVERS.filter(s => 
                    !playbook.dailyLevers.some(l => l.title === s.title)
                  ).map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => addLever(suggestion.title, suggestion.domain)}
                      className="w-full p-3 rounded-lg bg-white/5 border border-white/10 hover:border-primary/30 transition-colors text-left flex items-center gap-2"
                    >
                      <Zap className="w-4 h-4 opacity-50" />
                      <span className="text-sm">{suggestion.title}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
