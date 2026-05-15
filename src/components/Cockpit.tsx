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

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, Brain, Eye, Heart, Flame, Target,
  MessageCircle, Settings, Trash2, Plus,
  Sparkles, Sun, Moon, Star, Hexagon,
  Calendar, CheckCircle2, Circle, Rocket, HelpCircle, LogOut, UserRound, X
} from 'lucide-react';
import aiService from '../services/aiService';
import { triggerSmallCelebration } from '../utils/confetti';
import { computeAwakeDayStreak, collectActiveDays } from '../utils/streak';
import {
  buildCockpitSyncSnapshot,
  COCKPIT_SYNC_EVENT,
  notifyCockpitLocalChanged,
} from '../utils/cockpitCloudSync';
import { LoaCompanion } from './LoaCompanion';
import { LoaChat } from './LoaChat';
import { AISettings } from './AISettings';
import { DomainMapping } from './DomainMapping';
import { DailyRitual } from './DailyRitual';
import { Button } from './ui/button';
import type { UserData } from './OnboardingFlow';
import { getArchetypeName, type Archetype } from '../types/archetype';
import { DOMAINS, type DomainId, calculateOverallAlignment } from '../types/domains';

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
  type: 'vision' | 'intention' | 'streak' | 'loa' | 'traits' | 'paths' | 'bin' | 'domains' | 'today' | 'playbook' | 'loa-today' | 'empty';
  position: number;
}

const DEFAULT_SLIDERS: StateSlider[] = [
  { id: 'energy', name: 'Energy', icon: Zap, value: 50, color: '#f59e0b', description: 'Physical & mental charge' },
  { id: 'focus', name: 'Focus', icon: Target, value: 50, color: '#6366f1', description: 'Clarity of direction' },
  { id: 'presence', name: 'Presence', icon: Eye, value: 50, color: '#14b8a6', description: 'Here and now' },
  { id: 'openness', name: 'Openness', icon: Heart, value: 50, color: '#ec4899', description: 'Receptivity to change' },
];

const WIDGET_TYPES = [
  { type: 'today', name: 'Today', icon: Calendar },
  { type: 'playbook', name: 'Playbook', icon: Rocket },
  { type: 'loa-today', name: "Loa's Advice", icon: HelpCircle },
  { type: 'vision', name: 'My Vision', icon: Star },
  { type: 'intention', name: 'Core Intention', icon: Flame },
  { type: 'streak', name: 'Streak', icon: Zap },
  { type: 'loa', name: 'Quick Chat', icon: MessageCircle },
  { type: 'traits', name: 'My Traits', icon: Brain },
  { type: 'paths', name: 'Active Paths', icon: Target },
  { type: 'domains', name: 'Life Domains', icon: Hexagon },
  { type: 'bin', name: 'Release Bin', icon: Trash2 },
] as const;

export function Cockpit({ userData, onReset, onUpdateUserData }: CockpitProps) {
  const [sliders, setSliders] = useState<StateSlider[]>(() => {
    const saved = localStorage.getItem('awake_cockpit_sliders');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge saved values with default icons (icons can't be serialized)
        return DEFAULT_SLIDERS.map(defaultSlider => {
          const savedSlider = parsed.find((s: any) => s.id === defaultSlider.id);
          return savedSlider 
            ? { ...defaultSlider, value: savedSlider.value }
            : defaultSlider;
        });
      } catch (e) {
        return DEFAULT_SLIDERS;
      }
    }
    return DEFAULT_SLIDERS;
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
  const [isDomainsOpen, setIsDomainsOpen] = useState(false);
  const [isRitualOpen, setIsRitualOpen] = useState(false);
  const [todayRitual, setTodayRitual] = useState<{ energy: number; desire: string; loaMessage: string } | null>(null);
  const [binItems, setBinItems] = useState<string[]>([]);
  const [newBinItem, setNewBinItem] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profilePronouns, setProfilePronouns] = useState('');

  const userName = userData.identity?.name || 'Traveler';
  const archetype = userData.archetype as Archetype | undefined;
  const archetypeName = archetype ? getArchetypeName(archetype) : null;

  /** Stable per mount — do not call Math.random() in render (causes layout jump on every re-render). */
  const [loaGreetingLine] = useState(() => {
    const hour = new Date().getHours();
    const greetings =
      hour < 12
        ? [
            `${userName}, you're already here. That's the first win.`,
            `New day, clean slate. What wants to happen today?`,
            `I'm glad you showed up. Let's make this count.`,
          ]
        : hour < 17
          ? [
              `Still here, still showing up. I see you.`,
              `How's the day unfolding? I'm here if you need me.`,
              `Checking in — you're doing better than you think.`,
            ]
          : [
              `Winding down? Take a breath. You made it through.`,
              `Evening check-in. What went well today?`,
              `The day's almost done. Be gentle with yourself.`,
            ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  });

  useEffect(() => {
    if (isProfileOpen) {
      setProfileName(userData.identity?.name || '');
      setProfilePronouns(userData.identity?.pronouns || '');
    }
  }, [isProfileOpen, userData.identity?.name, userData.identity?.pronouns]);

  // Check if ritual was done today
  useEffect(() => {
    const history = JSON.parse(localStorage.getItem('awake_ritual_history') || '[]');
    if (history.length > 0) {
      const latest = history[0];
      const today = new Date().toDateString();
      const ritualDate = new Date(latest.date).toDateString();
      if (ritualDate === today) {
        setTodayRitual({
          energy: latest.energy,
          desire: latest.desire,
          loaMessage: latest.loaMessage,
        });
      }
    }
  }, []);

  // Save sliders when they change (only save serializable data)
  useEffect(() => {
    const toSave = sliders.map(({ id, value }) => ({ id, value }));
    localStorage.setItem('awake_cockpit_sliders', JSON.stringify(toSave));
  }, [sliders]);

  // Save widgets when they change
  useEffect(() => {
    localStorage.setItem('awake_cockpit_widgets', JSON.stringify(widgets));
  }, [widgets]);

  /** Push cockpit localStorage snapshot into userData (Supabase) — debounced */
  const cockpitSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleCockpitCloudSync = useCallback(() => {
    if (!onUpdateUserData) return;
    if (cockpitSyncTimerRef.current) clearTimeout(cockpitSyncTimerRef.current);
    cockpitSyncTimerRef.current = setTimeout(() => {
      cockpitSyncTimerRef.current = null;
      onUpdateUserData({ cockpitSync: buildCockpitSyncSnapshot() });
    }, 2000);
  }, [onUpdateUserData]);

  useEffect(() => {
    const onLocal = () => scheduleCockpitCloudSync();
    window.addEventListener(COCKPIT_SYNC_EVENT, onLocal);
    return () => window.removeEventListener(COCKPIT_SYNC_EVENT, onLocal);
  }, [scheduleCockpitCloudSync]);

  useEffect(() => {
    scheduleCockpitCloudSync();
  }, [sliders, widgets, scheduleCockpitCloudSync]);

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
      <header className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs opacity-50 uppercase tracking-widest">Awake Console</p>
          <h1 className="text-xl font-medium">{getTimeGreeting()}, {userName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsProfileOpen(true)}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            title="Profile & display name"
          >
            <UserRound className="w-5 h-5 opacity-50" />
          </button>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5 opacity-50" />
          </button>
          <button 
            onClick={onReset}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            title="Log out"
          >
            <LogOut className="w-5 h-5 opacity-50" />
          </button>
        </div>
      </header>

      {/* Daily Ritual CTA */}
      {!todayRitual ? (
        <motion.button
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => setIsRitualOpen(true)}
          className="w-full mb-6 p-4 rounded-2xl flex items-center justify-center gap-3 hover:scale-[1.01] transition-transform"
          style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(20, 184, 166, 0.15))',
            border: '2px solid rgba(99, 102, 241, 0.3)',
          }}
        >
          <Sun className="w-5 h-5 text-amber-400" />
          <span className="font-medium">Start My Day</span>
          <span className="text-xs opacity-50">60 seconds</span>
        </motion.button>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 p-3 rounded-xl flex items-center justify-between"
          style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
          }}
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="text-sm font-medium">Day started</p>
              {todayRitual.desire && (
                <p className="text-xs opacity-60 truncate max-w-[200px]">"{todayRitual.desire}"</p>
              )}
            </div>
          </div>
          <button
            onClick={() => setIsRitualOpen(true)}
            className="text-xs opacity-50 hover:opacity-100 transition-opacity"
          >
            Do again
          </button>
        </motion.div>
      )}

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
                <span className="opacity-50">Rituals</span>
                <span>{JSON.parse(localStorage.getItem('awake_ritual_history') || '[]').length}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-50">Tasks Done</span>
                <span>{JSON.parse(localStorage.getItem('awake_today_tasks') || '[]').filter((t: any) => t.done).length}</span>
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

            {/* Loa Greeting */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-6 p-3 rounded-xl text-center max-w-xs mx-auto"
              style={{
                background: 'rgba(99, 102, 241, 0.05)',
                border: '1px solid rgba(99, 102, 241, 0.1)',
              }}
            >
              <p className="text-sm opacity-70 italic">
                {todayRitual
                  ? `"${todayRitual.loaMessage.slice(0, 80)}${todayRitual.loaMessage.length > 80 ? '...' : ''}"`
                  : loaGreetingLine}
              </p>
            </motion.div>

            {/* Talk to Loa button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsChatOpen(true)}
              className="mt-4 px-6 py-3 rounded-full flex items-center gap-2 mx-auto"
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
          <div className="grid grid-cols-2 auto-rows-[10.25rem] gap-3 [contain:layout] sm:auto-rows-[11.25rem] sm:gap-3">
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
                onOpenDomains={() => setIsDomainsOpen(true)}
                onUpdateUserData={onUpdateUserData}
              />
            ))}
            
            {/* Add Widget Button */}
            <button
              type="button"
              onClick={() => setIsWidgetPickerOpen(true)}
              className="flex h-full min-h-0 w-full flex-col items-center justify-center gap-2 rounded-2xl p-4 transition-colors hover:bg-white/[0.04]"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '2px dashed rgba(255,255,255,0.1)',
              }}
            >
              <Plus className="h-6 w-6 opacity-30" />
              <span className="text-xs opacity-30">Add Widget</span>
            </button>
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
      <LoaChat
        userData={userData}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        onOpenSettings={() => {
          setIsChatOpen(false);
          setIsSettingsOpen(true);
        }}
      />

      {/* AI Settings */}
      <AISettings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Domain Mapping */}
      {isDomainsOpen && (
        <DomainMapping
          onComplete={(domains) => {
            if (onUpdateUserData) {
              onUpdateUserData({ domains });
            }
            setIsDomainsOpen(false);
          }}
          onClose={() => setIsDomainsOpen(false)}
        />
      )}

      {/* Daily Ritual */}
      <DailyRitual
        userData={userData}
        isOpen={isRitualOpen}
        onClose={() => setIsRitualOpen(false)}
        onComplete={(energy, desire, loaMessage) => {
          setTodayRitual({ energy, desire, loaMessage });
          setIsRitualOpen(false);
        }}
      />

      {/* Profile — updates Supabase when signed in (console edits get overwritten on load) */}
      <AnimatePresence>
        {isProfileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
            onClick={() => setIsProfileOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 16 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm p-6 rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, #1a1a2e, #0a0a0f)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium">Profile</h2>
                <button
                  type="button"
                  onClick={() => setIsProfileOpen(false)}
                  className="p-1 rounded-lg opacity-50 hover:opacity-100"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                When you&apos;re signed in, this saves to your account so it syncs across devices.
              </p>
              <label className="block text-xs uppercase tracking-widest opacity-50 mb-1">Display name</label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-primary/50 mb-4"
                placeholder="Josh"
                autoComplete="name"
              />
              <label className="block text-xs uppercase tracking-widest opacity-50 mb-1">Pronouns (optional)</label>
              <input
                type="text"
                value={profilePronouns}
                onChange={(e) => setProfilePronouns(e.target.value)}
                className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-primary/50 mb-4"
                placeholder="he/him"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  type="button"
                  onClick={() => setIsProfileOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  type="button"
                  disabled={!profileName.trim() || !onUpdateUserData}
                  onClick={() => {
                    const name = profileName.trim();
                    if (!name || !onUpdateUserData) return;
                    onUpdateUserData({
                      identity: {
                        name,
                        pronouns: profilePronouns.trim() || userData.identity?.pronouns || 'they/them',
                      },
                    });
                    setIsProfileOpen(false);
                  }}
                >
                  Save
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
  onOpenChat,
  onOpenDomains,
  onUpdateUserData
}: { 
  widget: Widget;
  userData: UserData;
  binItems: string[];
  newBinItem: string;
  setNewBinItem: (v: string) => void;
  onRelease: () => void;
  onRemove: () => void;
  onOpenChat: () => void;
  onOpenDomains: () => void;
  onUpdateUserData?: (data: Partial<UserData>) => void;
}) {
  const [isEditingVision, setIsEditingVision] = useState(false);
  const [visionDraft, setVisionDraft] = useState(userData.vision || '');
  const renderContent = () => {
    switch (widget.type) {
      case 'today':
        return (
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <TodayWidget />
          </div>
        );

      case 'playbook':
        return (
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <PlaybookWidget />
          </div>
        );

      case 'loa-today':
        return (
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <LoaTodayWidget userData={userData} />
          </div>
        );

      case 'intention':
        return (
          <div className="flex h-full min-h-0 flex-col text-center">
            <Flame className="mx-auto mb-2 h-6 w-6 shrink-0 text-orange-400" />
            <p className="mb-1 shrink-0 text-xs opacity-50">Core Intention</p>
            {userData.intention ? (
              <p className="line-clamp-4 min-h-0 text-sm italic leading-snug">"{userData.intention}"</p>
            ) : (
              <p className="text-xs opacity-30">Not set</p>
            )}
          </div>
        );

      case 'vision':
        if (isEditingVision) {
          return (
            <div className="flex h-full min-h-0 flex-col overflow-hidden">
              <Star className="mb-1 h-5 w-5 shrink-0 text-amber-400" />
              <p className="mb-1 shrink-0 text-xs opacity-50">My Vision</p>
              <textarea
                value={visionDraft}
                onChange={(e) => setVisionDraft(e.target.value)}
                placeholder="What do you want your life to look like?"
                className="min-h-0 w-full flex-1 resize-none rounded-lg border border-white/10 bg-black/30 p-2 text-xs focus:border-amber-400/50 focus:outline-none"
                rows={3}
                autoFocus
              />
              <div className="mt-2 flex shrink-0 gap-2">
                <button
                  onClick={() => {
                    onUpdateUserData?.({ vision: visionDraft });
                    setIsEditingVision(false);
                  }}
                  className="flex-1 py-1 text-xs rounded-lg bg-amber-400/20 hover:bg-amber-400/30 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setVisionDraft(userData.vision || '');
                    setIsEditingVision(false);
                  }}
                  className="px-3 py-1 text-xs rounded-lg opacity-50 hover:opacity-100 transition-opacity"
                >
                  Cancel
                </button>
              </div>
            </div>
          );
        }
        return (
          <button type="button" onClick={() => setIsEditingVision(true)} className="flex h-full min-h-0 w-full flex-col overflow-hidden text-left">
            <Star className="mb-2 h-5 w-5 shrink-0 text-amber-400" />
            <p className="mb-1 shrink-0 text-xs opacity-50">My Vision</p>
            {userData.vision ? (
              <p className="line-clamp-4 min-h-0 text-xs leading-relaxed opacity-70">{userData.vision}</p>
            ) : (
              <p className="text-xs italic opacity-30">Tap to set your vision...</p>
            )}
          </button>
        );

      case 'loa':
        return (
          <button type="button" onClick={onOpenChat} className="flex h-full min-h-0 w-full flex-col overflow-hidden text-left">
            <LoaCompanion size={32} />
            <p className="mt-2 shrink-0 text-sm font-medium">Quick Chat</p>
            <p className="text-xs opacity-50">Talk to Loa</p>
          </button>
        );

      case 'streak': {
        const dayStreak = computeAwakeDayStreak();
        const totalActiveDays = collectActiveDays().size;
        return (
          <div className="flex h-full min-h-0 flex-col items-center justify-center overflow-hidden text-center">
            <Zap className="mb-2 h-6 w-6 shrink-0 text-yellow-400" />
            <p className="text-2xl font-bold leading-none">{dayStreak}</p>
            <p className="text-xs opacity-50">Day streak</p>
            {dayStreak === 0 && totalActiveDays > 0 && (
              <p className="mt-1 line-clamp-2 px-1 text-[9px] opacity-35">Ritual, reflection, or check-in today or yesterday to continue</p>
            )}
          </div>
        );
      }

      case 'traits': {
        const traitsArchetype = userData.archetype as Archetype | undefined;
        return (
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <Brain className="mb-2 h-5 w-5 shrink-0 text-indigo-400" />
            <p className="mb-1 shrink-0 text-xs opacity-50">Archetype</p>
            {traitsArchetype ? (
              <p className="line-clamp-3 text-sm leading-snug">{getArchetypeName(traitsArchetype)}</p>
            ) : (
              <p className="text-xs opacity-30">Discover yours</p>
            )}
          </div>
        );
      }

      case 'paths':
        return (
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <ActivePathsList compact />
          </div>
        );

      case 'bin':
        return (
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <Trash2 className="mb-2 h-5 w-5 shrink-0 text-rose-400" />
            <p className="mb-2 shrink-0 text-xs opacity-50">Release Bin</p>
            <input
              type="text"
              value={newBinItem}
              onChange={(e) => setNewBinItem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onRelease()}
              placeholder="Let go of..."
              className="w-full shrink-0 rounded-lg border border-white/10 bg-black/30 p-2 text-xs focus:border-rose-400/50 focus:outline-none"
            />
            <div className="relative mt-1 min-h-0 flex-1 overflow-hidden">
            <AnimatePresence>
              {binItems.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 1, y: 0 }}
                  animate={{ opacity: 0, y: 20, scale: 0.8 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.5 }}
                  className="truncate text-xs text-rose-400/50"
                >
                  Releasing: {item}
                </motion.div>
              ))}
            </AnimatePresence>
            </div>
          </div>
        );

      case 'domains': {
        const raw = userData.domains || {};
        let alignment: number | null = null;
        try {
          if (raw && typeof raw === 'object' && Object.keys(raw).length > 0) {
            alignment = calculateOverallAlignment(raw as never);
          }
        } catch {
          alignment = null;
        }
        const domainIds: DomainId[] = ['identity', 'relationships', 'wealth', 'body_energy', 'work', 'governance'];
        const domainColors: Record<DomainId, string> = {
          identity: '#8b5cf6',
          relationships: '#ec4899',
          wealth: '#f59e0b',
          body_energy: '#10b981',
          work: '#6366f1',
          governance: '#14b8a6',
        };
        return (
          <button
            type="button"
            onClick={onOpenDomains}
            title="Average alignment (0–100): how well what you do matches what you want, across domains. Colored digits: where you are today in each area on a 1–10 scale. Open the map to edit."
            className="flex h-full min-h-0 w-full flex-col items-start gap-1 overflow-hidden text-left"
          >
            <div className="flex shrink-0 items-center gap-1.5">
              <Hexagon className="h-4 w-4 shrink-0 text-indigo-400" />
              <span className="text-xs opacity-50">Life domains</span>
            </div>
            {alignment != null && !Number.isNaN(alignment) && (
              <div className="flex shrink-0 items-baseline gap-1">
                <span className="text-lg font-semibold tabular-nums leading-none">{alignment}</span>
                <span className="text-[10px] opacity-45">/100 avg.</span>
              </div>
            )}
            <p className="line-clamp-2 text-[9px] leading-snug opacity-40">
              Avg. how aligned your daily actions are with what you want. Each dot is that area today (1–10).
            </p>
            <div className="flex flex-wrap gap-1">
              {domainIds.map((id) => {
                const domain = raw[id];
                const score = domain?.currentBaseline ?? 0;
                return (
                  <div
                    key={id}
                    title={`${DOMAINS[id].name}: ${score > 0 ? `${score}/10 where you are now` : 'not set yet'}`}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-medium"
                    style={{
                      background: `${domainColors[id]}${score > 0 ? '55' : '22'}`,
                      border: `1px solid ${domainColors[id]}70`,
                    }}
                  >
                    {score > 0 ? score : '·'}
                  </div>
                );
              })}
            </div>
            <p className="text-[9px] opacity-35">Tap for full map →</p>
          </button>
        );
      }

      default:
        return (
          <div className="flex h-full min-h-0 items-center justify-center overflow-hidden">
            <p className="text-xs opacity-30">Empty widget</p>
          </div>
        );
    }
  };

  return (
    <motion.div
      className="group relative flex h-full min-h-0 max-h-full flex-col overflow-hidden rounded-2xl p-3 sm:p-4"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-2 top-2 z-10 opacity-0 transition-opacity group-hover:opacity-50 hover:opacity-100"
      >
        <Trash2 className="h-3 w-3" />
      </button>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden pt-0.5">{renderContent()}</div>
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
    notifyCockpitLocalChanged();
  };

  if (compact) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <Target className="mb-2 h-5 w-5 shrink-0 text-teal-400" />
        <p className="mb-1 shrink-0 text-xs opacity-50">Active Paths</p>
        {paths.length > 0 ? (
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
            {paths.slice(0, 4).map((p) => (
              <p key={p.id} className="truncate text-xs">
                • {p.title}
              </p>
            ))}
            {paths.length > 4 && <p className="shrink-0 text-xs opacity-50">+{paths.length - 4} more</p>}
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

// Today Widget - Quick task management
interface Task {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
}

function TodayWidget() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('awake_today_tasks');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Only load today's tasks
      const today = new Date().toDateString();
      const todayTasks = parsed.filter((t: Task) => 
        new Date(t.createdAt).toDateString() === today
      );
      setTasks(todayTasks);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('awake_today_tasks', JSON.stringify(tasks));
    notifyCockpitLocalChanged();
  }, [tasks]);

  const addTask = () => {
    if (!newTask.trim()) return;
    const task: Task = {
      id: `task-${Date.now()}`,
      text: newTask.trim(),
      done: false,
      createdAt: new Date().toISOString(),
    };
    setTasks([...tasks, task]);
    setNewTask('');
  };

  const toggleTask = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task && !task.done) {
      triggerSmallCelebration();
    }
    setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const completedCount = tasks.filter(t => t.done).length;
  
  // Sort: incomplete first, then completed
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.done === b.done) return 0;
    return a.done ? 1 : -1;
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-2 flex shrink-0 items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 shrink-0 text-blue-400" />
          <span className="text-xs opacity-50">Today</span>
        </div>
        {tasks.length > 0 && (
          <span className="text-[10px] opacity-40">
            {completedCount}/{tasks.length}
          </span>
        )}
      </div>

      <div className="mb-2 min-h-0 flex-1 space-y-1.5 overflow-y-auto">
        {sortedTasks.length === 0 ? (
          <p className="text-xs opacity-30">No tasks yet</p>
        ) : (
          sortedTasks.map(task => (
            <div
              key={task.id}
              className="flex items-center gap-2 w-full group"
            >
              <button
                onClick={() => toggleTask(task.id)}
                className="flex items-center gap-2 flex-1 text-left min-w-0"
              >
                {task.done ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 opacity-30 group-hover:opacity-60 shrink-0" />
                )}
                <span className={`text-xs truncate ${task.done ? 'line-through opacity-40' : ''}`}>
                  {task.text}
                </span>
              </button>
              <button
                onClick={() => deleteTask(task.id)}
                className="opacity-0 group-hover:opacity-40 hover:opacity-100 transition-opacity shrink-0"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="mt-auto flex shrink-0 gap-1">
        <input
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTask()}
          placeholder="Add task..."
          className="flex-1 p-1.5 text-[10px] rounded-lg bg-black/30 border border-white/10 focus:outline-none focus:border-blue-400/50"
        />
        <button 
          onClick={addTask}
          className="px-2 rounded-lg bg-blue-400/10 hover:bg-blue-400/20 transition-colors"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// Playbook Widget - Current project + daily levers
function PlaybookWidget() {
  const [playbook, setPlaybook] = useState<{
    project: string;
    levers: { id: string; text: string; done: boolean }[];
  } | null>(null);
  const [isSetup, setIsSetup] = useState(false);
  const [newProject, setNewProject] = useState('');
  const [newLever, setNewLever] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('awake_playbook');
    if (saved) setPlaybook(JSON.parse(saved));
  }, []);

  const savePlaybook = (updated: typeof playbook) => {
    setPlaybook(updated);
    localStorage.setItem('awake_playbook', JSON.stringify(updated));
    notifyCockpitLocalChanged();
  };

  const toggleLever = (id: string) => {
    if (!playbook) return;
    const lever = playbook.levers.find(l => l.id === id);
    if (lever && !lever.done) {
      triggerSmallCelebration();
    }
    const updated = {
      ...playbook,
      levers: playbook.levers.map(l => 
        l.id === id ? { ...l, done: !l.done } : l
      ),
    };
    savePlaybook(updated);
  };

  const startProject = () => {
    if (!newProject.trim()) return;
    savePlaybook({
      project: newProject.trim(),
      levers: [],
    });
    setNewProject('');
    setIsSetup(false);
  };

  const addLever = () => {
    if (!newLever.trim() || !playbook) return;
    const updated = {
      ...playbook,
      levers: [...playbook.levers, {
        id: `lever-${Date.now()}`,
        text: newLever.trim(),
        done: false,
      }],
    };
    savePlaybook(updated);
    setNewLever('');
  };

  const clearProject = () => {
    localStorage.removeItem('awake_playbook');
    setPlaybook(null);
    notifyCockpitLocalChanged();
  };

  // Setup mode
  if (isSetup || (!playbook?.project)) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="mb-2 flex shrink-0 items-center gap-2">
          <Rocket className="h-5 w-5 text-purple-400" />
          <span className="text-xs opacity-50">New Project</span>
        </div>
        <input
          type="text"
          value={newProject}
          onChange={(e) => setNewProject(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && startProject()}
          placeholder="What's your focus project?"
          className="mb-2 w-full shrink-0 rounded-lg border border-white/10 bg-black/30 p-2 text-xs focus:border-purple-400/50 focus:outline-none"
          autoFocus
        />
        <button
          onClick={startProject}
          disabled={!newProject.trim()}
          className="w-full shrink-0 rounded-lg py-2 text-xs font-medium transition-colors disabled:opacity-30"
          style={{
            background: newProject.trim() ? 'rgba(147, 51, 234, 0.2)' : 'transparent',
            border: '1px solid rgba(147, 51, 234, 0.3)',
          }}
        >
          Start Project
        </button>
        {playbook?.project && (
          <button
            onClick={() => setIsSetup(false)}
            className="w-full text-[10px] opacity-40 hover:opacity-60 mt-2"
          >
            Cancel
          </button>
        )}
      </div>
    );
  }

  const completedLevers = playbook.levers.filter(l => l.done).length;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Rocket className="h-5 w-5 shrink-0 text-purple-400" />
          <span className="truncate text-xs font-medium">{playbook.project}</span>
        </div>
        <button
          onClick={clearProject}
          className="opacity-30 hover:opacity-60 transition-opacity shrink-0"
          title="Clear project"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
      
      <div className="mb-2 min-h-0 max-h-[3.25rem] flex-1 space-y-1.5 overflow-y-auto">
        {playbook.levers.map(lever => (
          <button
            key={lever.id}
            onClick={() => toggleLever(lever.id)}
            className="flex items-center gap-2 w-full text-left group"
          >
            {lever.done ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
            ) : (
              <Circle className="w-3.5 h-3.5 opacity-30 group-hover:opacity-60 shrink-0" />
            )}
            <span className={`text-[10px] truncate ${lever.done ? 'line-through opacity-40' : ''}`}>
              {lever.text}
            </span>
          </button>
        ))}
      </div>

      {/* Add lever input */}
      <div className="mt-auto flex shrink-0 gap-1">
        <input
          type="text"
          value={newLever}
          onChange={(e) => setNewLever(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addLever()}
          placeholder="Add daily lever..."
          className="flex-1 p-1.5 text-[10px] rounded-lg bg-black/30 border border-white/10 focus:outline-none focus:border-purple-400/50"
        />
        <button 
          onClick={addLever}
          className="px-2 rounded-lg bg-purple-400/10 hover:bg-purple-400/20 transition-colors"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
      
      {playbook.levers.length > 0 && (
        <div className="mt-1 h-1 shrink-0 overflow-hidden rounded-full bg-white/10">
          <div 
            className="h-full bg-purple-400 transition-all"
            style={{ width: `${(completedLevers / playbook.levers.length) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}

// Loa Today Widget - Get daily guidance
function LoaTodayWidget({ userData }: { userData: UserData }) {
  const [advice, setAdvice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('awake_loa_today');
    if (saved) {
      const parsed = JSON.parse(saved);
      const today = new Date().toDateString();
      if (parsed.date === today) {
        setAdvice(parsed.advice);
      }
    }
  }, []);

  const askLoa = async () => {
    setIsLoading(true);
    try {
      // Gather context
      const tasks = JSON.parse(localStorage.getItem('awake_today_tasks') || '[]');
      const paths = JSON.parse(localStorage.getItem('awake_active_paths') || '[]');
      const playbook = JSON.parse(localStorage.getItem('awake_playbook') || 'null');
      const sliders = JSON.parse(localStorage.getItem('awake_cockpit_sliders') || '[]');
      
      const energySlider = sliders.find((s: any) => s.id === 'energy');
      const focusSlider = sliders.find((s: any) => s.id === 'focus');

      const prompt = `Based on where I am right now, what should I focus on today?

My current state:
- Energy: ${energySlider?.value || 50}/100
- Focus: ${focusSlider?.value || 50}/100
${userData.intention ? `- My intention: "${userData.intention}"` : ''}

My active paths: ${paths.map((p: any) => p.title).join(', ') || 'None set'}
${playbook?.project ? `Current project: ${playbook.project}` : ''}
Today's tasks: ${tasks.filter((t: any) => !t.done).map((t: any) => t.text).join(', ') || 'None yet'}

Give me ONE clear priority for today. Be specific and direct. 2-3 sentences max.`;

      const response = await aiService.chatWithContext(prompt, userData);
      setAdvice(response);
      
      const today = new Date().toDateString();
      localStorage.setItem('awake_loa_today', JSON.stringify({ date: today, advice: response }));
      notifyCockpitLocalChanged();
    } catch (err) {
      console.error('Failed to get Loa advice:', err);
      setAdvice("Focus on what feels most alive right now. Start there.");
    }
    setIsLoading(false);
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="mb-2 flex shrink-0 items-center gap-2">
        <LoaCompanion size={20} />
        <span className="text-xs opacity-50">Loa's Advice</span>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center py-2">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Sparkles className="h-5 w-5 text-primary" />
          </motion.div>
        </div>
      ) : advice ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <p className="line-clamp-5 min-h-0 flex-1 text-[11px] leading-relaxed opacity-80">{advice}</p>
          <button
            type="button"
            onClick={askLoa}
            className="mt-1 shrink-0 text-[10px] opacity-40 transition-opacity hover:opacity-60"
          >
            Ask again
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={askLoa}
          className="mt-auto w-full shrink-0 rounded-lg py-2 text-xs transition-colors hover:bg-white/5"
          style={{
            border: '1px dashed rgba(255,255,255,0.2)',
          }}
        >
          What should I focus on?
        </button>
      )}
    </div>
  );
}
