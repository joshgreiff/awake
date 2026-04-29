/**
 * Consciousness Cockpit
 * 
 * The control panel for your inner operating system.
 * 
 * Philosophy:
 * - Using the interface IS the transformation
 * - Sliders don't just display - moving them is the work
 * - Your avatar/identity at the center
 * - Widgets you arrange YOUR way
 * - Visual actions = real actions
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, Brain, Eye, Heart, Flame, Target,
  MessageCircle, Settings, Trash2, Plus,
  Sparkles, Sun, Moon, Star
} from 'lucide-react';
import { LoaCompanion } from './LoaCompanion';
import { LoaChat } from './LoaChat';
import { AISettings } from './AISettings';
import type { UserData } from './OnboardingFlow';
import { getArchetypeName } from '../types/archetype';

interface CockpitProps {
  userData: UserData;
  onReset: () => void;
  onUpdateUserData?: (data: Partial<UserData>) => void;
}

interface StateSlider {
  id: string;
  name: string;
  icon: React.ElementType;
  value: number;
  color: string;
  description: string;
}

interface Widget {
  id: string;
  type: 'vision' | 'intention' | 'streak' | 'loa' | 'traits' | 'paths' | 'bin' | 'empty';
  position: number;
}

const DEFAULT_SLIDERS: StateSlider[] = [
  { id: 'energy', name: 'Energy', icon: Zap, value: 50, color: '#f59e0b', description: 'Physical & mental charge' },
  { id: 'focus', name: 'Focus', icon: Target, value: 50, color: '#6366f1', description: 'Clarity of direction' },
  { id: 'presence', name: 'Presence', icon: Eye, value: 50, color: '#14b8a6', description: 'Here and now' },
  { id: 'openness', name: 'Openness', icon: Heart, value: 50, color: '#ec4899', description: 'Receptivity to change' },
];

const WIDGET_TYPES = [
  { type: 'vision', name: 'My Vision', icon: Star },
  { type: 'intention', name: 'Core Intention', icon: Flame },
  { type: 'streak', name: 'Streak', icon: Zap },
  { type: 'loa', name: 'Quick Chat', icon: MessageCircle },
  { type: 'traits', name: 'My Traits', icon: Brain },
  { type: 'paths', name: 'Active Paths', icon: Target },
  { type: 'bin', name: 'Release Bin', icon: Trash2 },
] as const;

export function Cockpit({ userData, onReset, onUpdateUserData }: CockpitProps) {
  const [sliders, setSliders] = useState<StateSlider[]>(() => {
    const saved = localStorage.getItem('awake_cockpit_sliders');
    return saved ? JSON.parse(saved) : DEFAULT_SLIDERS;
  });
  
  const [widgets, setWidgets] = useState<Widget[]>(() => {
    const saved = localStorage.getItem('awake_cockpit_widgets');
    return saved ? JSON.parse(saved) : [
      { id: 'w1', type: 'intention', position: 0 },
      { id: 'w2', type: 'loa', position: 1 },
      { id: 'w3', type: 'paths', position: 2 },
      { id: 'w4', type: 'bin', position: 3 },
    ];
  });

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isWidgetPickerOpen, setIsWidgetPickerOpen] = useState(false);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [binItems, setBinItems] = useState<string[]>([]);
  const [newBinItem, setNewBinItem] = useState('');

  const userName = userData.identity?.name || 'Traveler';
  const archetype = userData.archetype;
  const archetypeName = archetype ? getArchetypeName(archetype) : null;

  // Save sliders when they change
  useEffect(() => {
    localStorage.setItem('awake_cockpit_sliders', JSON.stringify(sliders));
  }, [sliders]);

  // Save widgets when they change
  useEffect(() => {
    localStorage.setItem('awake_cockpit_widgets', JSON.stringify(widgets));
  }, [widgets]);

  const handleSliderChange = (id: string, value: number) => {
    setSliders(prev => prev.map(s => s.id === id ? { ...s, value } : s));
  };

  const handleAddWidget = (type: Widget['type']) => {
    const newWidget: Widget = {
      id: `w-${Date.now()}`,
      type,
      position: widgets.length,
    };
    setWidgets([...widgets, newWidget]);
    setIsWidgetPickerOpen(false);
  };

  const handleRemoveWidget = (id: string) => {
    setWidgets(widgets.filter(w => w.id !== id));
  };

  const handleReleaseToBin = () => {
    if (!newBinItem.trim()) return;
    setBinItems(prev => [...prev, newBinItem.trim()]);
    setNewBinItem('');
    // Visual feedback - the item is "released"
    setTimeout(() => {
      setBinItems(prev => prev.slice(0, -1));
    }, 2000);
  };

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ 
      background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)'
    }}>
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs opacity-50 uppercase tracking-widest">Awake Console</p>
          <h1 className="text-xl font-medium">{getTimeGreeting()}, {userName}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <Settings className="w-5 h-5 opacity-50" />
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Panel - State Sliders */}
        <div className="lg:col-span-3 space-y-4">
          <div className="p-4 rounded-2xl" style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <h2 className="text-xs uppercase tracking-widest opacity-50 mb-4">State Controls</h2>
            
            <div className="space-y-5">
              {sliders.map(slider => (
                <div key={slider.id}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <slider.icon className="w-4 h-4" style={{ color: slider.color }} />
                      <span className="text-sm font-medium">{slider.name}</span>
                    </div>
                    <span className="text-xs opacity-50">{slider.value}%</span>
                  </div>
                  
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={slider.value}
                    onChange={(e) => handleSliderChange(slider.id, parseInt(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, ${slider.color} 0%, ${slider.color} ${slider.value}%, rgba(255,255,255,0.1) ${slider.value}%, rgba(255,255,255,0.1) 100%)`,
                    }}
                  />
                  <p className="text-xs opacity-40 mt-1">{slider.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="p-4 rounded-2xl" style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <h2 className="text-xs uppercase tracking-widest opacity-50 mb-3">System Status</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="opacity-50">Sessions</span>
                <span>{JSON.parse(localStorage.getItem('awake_sessions') || '[]').length}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-50">Reflections</span>
                <span>{JSON.parse(localStorage.getItem('awake_reflections') || '[]').length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center - Identity Core */}
        <div className="lg:col-span-6">
          {/* Avatar & Identity */}
          <motion.div 
            className="relative p-6 rounded-3xl mb-6 text-center"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(99, 102, 241, 0.1) 0%, transparent 70%)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
            }}
          >
            {/* Animated rings */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <motion.div
                className="absolute w-32 h-32 rounded-full border border-primary/20"
                animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.1, 0.3] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              <motion.div
                className="absolute w-48 h-48 rounded-full border border-primary/10"
                animate={{ scale: [1, 1.05, 1], opacity: [0.2, 0.05, 0.2] }}
                transition={{ duration: 4, repeat: Infinity, delay: 0.5 }}
              />
            </div>

            {/* Avatar */}
            <div className="relative z-10">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden ring-2 ring-primary/30 ring-offset-2 ring-offset-transparent">
                {userData.avatar ? (
                  <img 
                    src={userData.avatar.replace('.glb', '.png')} 
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/30 to-teal-500/30 flex items-center justify-center">
                    <span className="text-3xl">{userName.charAt(0).toUpperCase()}</span>
                  </div>
                )}
              </div>

              <h2 className="text-2xl font-medium mb-1">{userName}</h2>
              
              {archetypeName && (
                <p className="text-sm opacity-60 mb-3">{archetypeName}</p>
              )}

              {userData.intention && (
                <div className="mt-4 p-3 rounded-xl max-w-sm mx-auto" style={{
                  background: 'rgba(99, 102, 241, 0.1)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                }}>
                  <p className="text-xs uppercase tracking-widest opacity-50 mb-1">Core Intention</p>
                  <p className="text-sm italic">"{userData.intention}"</p>
                </div>
              )}
            </div>

            {/* Talk to Loa button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsChatOpen(true)}
              className="mt-6 px-6 py-3 rounded-full flex items-center gap-2 mx-auto"
              style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(20, 184, 166, 0.2))',
                border: '1px solid rgba(99, 102, 241, 0.3)',
              }}
            >
              <LoaCompanion size={24} />
              <span className="text-sm font-medium">Talk to Loa</span>
            </motion.button>
          </motion.div>

          {/* Widget Grid */}
          <div className="grid grid-cols-2 gap-4">
            {widgets.map(widget => (
              <WidgetCard 
                key={widget.id} 
                widget={widget} 
                userData={userData}
                binItems={binItems}
                newBinItem={newBinItem}
                setNewBinItem={setNewBinItem}
                onRelease={handleReleaseToBin}
                onRemove={() => handleRemoveWidget(widget.id)}
                onOpenChat={() => setIsChatOpen(true)}
              />
            ))}
            
            {/* Add Widget Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              onClick={() => setIsWidgetPickerOpen(true)}
              className="p-6 rounded-2xl flex flex-col items-center justify-center gap-2 min-h-[120px]"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '2px dashed rgba(255,255,255,0.1)',
              }}
            >
              <Plus className="w-6 h-6 opacity-30" />
              <span className="text-xs opacity-30">Add Widget</span>
            </motion.button>
          </div>
        </div>

        {/* Right Panel - Vision & Paths */}
        <div className="lg:col-span-3 space-y-4">
          {/* Vision */}
          {userData.vision && (
            <div className="p-4 rounded-2xl" style={{
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.05), rgba(239, 68, 68, 0.05))',
              border: '1px solid rgba(245, 158, 11, 0.2)',
            }}>
              <div className="flex items-center gap-2 mb-3">
                <Sun className="w-4 h-4 text-amber-400" />
                <h2 className="text-xs uppercase tracking-widest opacity-50">My Vision</h2>
              </div>
              <p className="text-sm leading-relaxed opacity-80">{userData.vision}</p>
            </div>
          )}

          {/* Anti-Vision */}
          {userData.antiVision && (
            <div className="p-4 rounded-2xl" style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <div className="flex items-center gap-2 mb-3">
                <Moon className="w-4 h-4 opacity-50" />
                <h2 className="text-xs uppercase tracking-widest opacity-50">What I'm Moving Away From</h2>
              </div>
              <p className="text-sm leading-relaxed opacity-60">{userData.antiVision}</p>
            </div>
          )}

          {/* Active Paths */}
          <div className="p-4 rounded-2xl" style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <h2 className="text-xs uppercase tracking-widest opacity-50 mb-3">Active Paths</h2>
            <ActivePathsList />
          </div>
        </div>
      </div>

      {/* Widget Picker Modal */}
      <AnimatePresence>
        {isWidgetPickerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
            onClick={() => setIsWidgetPickerOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md p-6 rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, #1a1a2e, #0a0a0f)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <h2 className="text-lg font-medium mb-4">Pick a Widget</h2>
              <div className="grid grid-cols-2 gap-3">
                {WIDGET_TYPES.map(w => (
                  <button
                    key={w.type}
                    onClick={() => handleAddWidget(w.type)}
                    className="p-4 rounded-xl flex flex-col items-center gap-2 hover:bg-white/5 transition-colors"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <w.icon className="w-6 h-6 opacity-60" />
                    <span className="text-sm">{w.name}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loa Chat */}
      {isChatOpen && (
        <LoaChat
          userData={userData}
          onClose={() => setIsChatOpen(false)}
        />
      )}

      {/* AI Settings */}
      {isSettingsOpen && (
        <AISettings
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
}

// Widget Card Component
function WidgetCard({ 
  widget, 
  userData, 
  binItems,
  newBinItem,
  setNewBinItem,
  onRelease,
  onRemove,
  onOpenChat
}: { 
  widget: Widget;
  userData: UserData;
  binItems: string[];
  newBinItem: string;
  setNewBinItem: (v: string) => void;
  onRelease: () => void;
  onRemove: () => void;
  onOpenChat: () => void;
}) {
  const renderContent = () => {
    switch (widget.type) {
      case 'intention':
        return (
          <div className="text-center">
            <Flame className="w-6 h-6 mx-auto mb-2 text-orange-400" />
            <p className="text-xs opacity-50 mb-1">Core Intention</p>
            {userData.intention ? (
              <p className="text-sm italic">"{userData.intention}"</p>
            ) : (
              <p className="text-xs opacity-30">Not set</p>
            )}
          </div>
        );

      case 'vision':
        return (
          <div>
            <Star className="w-5 h-5 mb-2 text-amber-400" />
            <p className="text-xs opacity-50 mb-1">Vision</p>
            {userData.vision ? (
              <p className="text-xs opacity-70 line-clamp-3">{userData.vision}</p>
            ) : (
              <p className="text-xs opacity-30">Not set</p>
            )}
          </div>
        );

      case 'loa':
        return (
          <button onClick={onOpenChat} className="w-full text-left">
            <LoaCompanion size={32} />
            <p className="text-sm font-medium mt-2">Quick Chat</p>
            <p className="text-xs opacity-50">Talk to Loa</p>
          </button>
        );

      case 'streak':
        const sessions = JSON.parse(localStorage.getItem('awake_sessions') || '[]');
        return (
          <div className="text-center">
            <Zap className="w-6 h-6 mx-auto mb-2 text-yellow-400" />
            <p className="text-2xl font-bold">{sessions.length}</p>
            <p className="text-xs opacity-50">Sessions</p>
          </div>
        );

      case 'traits':
        const archetype = userData.archetype;
        return (
          <div>
            <Brain className="w-5 h-5 mb-2 text-indigo-400" />
            <p className="text-xs opacity-50 mb-1">Archetype</p>
            {archetype ? (
              <p className="text-sm">{getArchetypeName(archetype)}</p>
            ) : (
              <p className="text-xs opacity-30">Discover yours</p>
            )}
          </div>
        );

      case 'paths':
        return <ActivePathsList compact />;

      case 'bin':
        return (
          <div>
            <Trash2 className="w-5 h-5 mb-2 text-rose-400" />
            <p className="text-xs opacity-50 mb-2">Release Bin</p>
            <input
              type="text"
              value={newBinItem}
              onChange={(e) => setNewBinItem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onRelease()}
              placeholder="Let go of..."
              className="w-full p-2 text-xs rounded-lg bg-black/30 border border-white/10 focus:outline-none focus:border-rose-400/50"
            />
            <AnimatePresence>
              {binItems.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 1, y: 0 }}
                  animate={{ opacity: 0, y: 20, scale: 0.8 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.5 }}
                  className="text-xs mt-2 text-rose-400/50"
                >
                  Releasing: {item}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        );

      default:
        return <div className="text-xs opacity-30">Empty widget</div>;
    }
  };

  return (
    <motion.div
      layout
      className="relative p-4 rounded-2xl min-h-[120px] group"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <button
        onClick={onRemove}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-50 hover:opacity-100 transition-opacity"
      >
        <Trash2 className="w-3 h-3" />
      </button>
      {renderContent()}
    </motion.div>
  );
}

// Active Paths List Component
function ActivePathsList({ compact = false }: { compact?: boolean }) {
  const [paths, setPaths] = useState<{ id: string; title: string }[]>([]);
  const [newPath, setNewPath] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('awake_active_paths');
    if (saved) setPaths(JSON.parse(saved));
  }, []);

  const addPath = () => {
    if (!newPath.trim()) return;
    const updated = [...paths, { id: `p-${Date.now()}`, title: newPath.trim() }];
    setPaths(updated);
    localStorage.setItem('awake_active_paths', JSON.stringify(updated));
    setNewPath('');
  };

  if (compact) {
    return (
      <div>
        <Target className="w-5 h-5 mb-2 text-teal-400" />
        <p className="text-xs opacity-50 mb-1">Active Paths</p>
        {paths.length > 0 ? (
          <div className="space-y-1">
            {paths.slice(0, 3).map(p => (
              <p key={p.id} className="text-xs truncate">• {p.title}</p>
            ))}
            {paths.length > 3 && (
              <p className="text-xs opacity-50">+{paths.length - 3} more</p>
            )}
          </div>
        ) : (
          <p className="text-xs opacity-30">None yet</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {paths.map(p => (
        <div key={p.id} className="flex items-center gap-2 text-sm">
          <div className="w-2 h-2 rounded-full bg-teal-400/50" />
          <span>{p.title}</span>
        </div>
      ))}
      <div className="flex gap-2 mt-3">
        <input
          type="text"
          value={newPath}
          onChange={(e) => setNewPath(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addPath()}
          placeholder="Add path..."
          className="flex-1 p-2 text-xs rounded-lg bg-black/30 border border-white/10 focus:outline-none focus:border-teal-400/50"
        />
        <button 
          onClick={addPath}
          className="px-3 rounded-lg bg-teal-400/10 hover:bg-teal-400/20 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
