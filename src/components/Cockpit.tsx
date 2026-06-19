/**
 * Daily Cockpit — bounded session for becoming.
 *
 * One loop: check in → show up → move → (optional) talk to Loa.
 * Widgets are tools inside the container, not the product.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, Eye, Heart, Flame, Target,
  Settings, Trash2, Plus,
  Sun, Moon, Star, Hexagon,
  Calendar, CheckCircle2, Circle, Rocket, LogOut, UserRound, X,
  GripVertical, Trophy, ChevronDown, Gem, Pencil
} from 'lucide-react';
import { triggerSmallCelebration } from '../utils/confetti';
import {
  addArtifact,
  hasArtifactToday,
  readArtifacts,
  tierColor,
  type Artifact,
  type ArtifactTier,
} from '../utils/artifacts';
import { computeAwakeDayStreak, collectActiveDays } from '../utils/streak';
import {
  computeChallengeStreak,
  createChallenge,
  deleteChallenge,
  getChallenge,
  hasShownUpToday,
  hasShownUpToAllChallengesToday,
  logShowUpToday,
  readDailyChallenges,
  unlogShowUpToday,
  updateChallenge,
} from '../utils/dailyChallenge';
import { toggleShowUpToday } from '../utils/cockpitActions';
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
  onSignOut: () => void;
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

type WidgetType =
  | 'vision'
  | 'intention'
  | 'streak'
  | 'bin'
  | 'domains'
  | 'today'
  | 'playbook'
  | 'daily-challenge'
  | 'artifacts';

interface Widget {
  id: string;
  type: WidgetType;
  position: number;
  /** Links a daily-challenge widget to its own challenge record */
  challengeId?: string;
}

const DEPRECATED_WIDGET_TYPES = new Set([
  'loa', 'loa-today', 'paths', 'traits', 'empty',
]);

const DEFAULT_WIDGETS: Widget[] = [
  { id: 'w-challenge', type: 'daily-challenge', position: 0 },
  { id: 'w-today', type: 'today', position: 1 },
  { id: 'w-streak', type: 'streak', position: 2 },
];

const WIDGET_TYPES: { type: WidgetType; name: string; icon: React.ElementType }[] = [
  { type: 'daily-challenge', name: 'Daily Challenge', icon: Trophy },
  { type: 'artifacts', name: 'Artifact Vault', icon: Gem },
  { type: 'today', name: 'Today', icon: Calendar },
  { type: 'playbook', name: 'Boss Fight', icon: Rocket },
  { type: 'streak', name: 'Streak', icon: Zap },
  { type: 'intention', name: 'Intention', icon: Flame },
  { type: 'vision', name: 'Vision', icon: Star },
  { type: 'domains', name: 'Life Domains', icon: Hexagon },
  { type: 'bin', name: 'Release', icon: Trash2 },
];

const ALLOWED_WIDGET_TYPES = new Set(WIDGET_TYPES.map((w) => w.type));

function sanitizeWidgets(raw: unknown): Widget[] {
  if (!Array.isArray(raw)) return DEFAULT_WIDGETS;

  const filtered = raw
    .filter(
      (w): w is Widget =>
        typeof w === 'object' &&
        w !== null &&
        typeof (w as Widget).id === 'string' &&
        typeof (w as Widget).type === 'string' &&
        !DEPRECATED_WIDGET_TYPES.has((w as Widget).type) &&
        ALLOWED_WIDGET_TYPES.has((w as Widget).type as WidgetType)
    )
    .map((w, i) => ({
      ...w,
      position: i,
      challengeId: typeof w.challengeId === 'string' ? w.challengeId : undefined,
    }));

  return filtered.length > 0 ? filtered : DEFAULT_WIDGETS;
}

/** Attach unbound challenge widgets to orphan challenges after storage migration. */
function bindOrphanChallenges(widgets: Widget[]): Widget[] {
  const challenges = readDailyChallenges();
  const boundIds = new Set(
    widgets.map((w) => w.challengeId).filter((id): id is string => !!id)
  );
  const orphans = challenges.filter((c) => !boundIds.has(c.id));
  if (orphans.length === 0) return widgets;

  let orphanIdx = 0;
  return widgets.map((w) => {
    if (w.type !== 'daily-challenge' || w.challengeId || orphanIdx >= orphans.length) {
      return w;
    }
    const next = { ...w, challengeId: orphans[orphanIdx].id };
    orphanIdx += 1;
    return next;
  });
}

/** Each widget binds to at most one challenge; duplicates are cleared for re-setup. */
function dedupeChallengeBindings(widgets: Widget[]): Widget[] {
  const seen = new Set<string>();
  return widgets.map((w) => {
    if (w.type !== 'daily-challenge' || !w.challengeId) return w;
    if (seen.has(w.challengeId)) return { ...w, challengeId: undefined };
    seen.add(w.challengeId);
    return w;
  });
}

function prepareWidgets(raw: unknown): Widget[] {
  const base = raw ? sanitizeWidgets(raw) : DEFAULT_WIDGETS;
  return bindOrphanChallenges(dedupeChallengeBindings(base));
}

function hasMovedToday(): boolean {
  if (hasArtifactToday()) return true;
  try {
    const today = new Date().toDateString();
    const tasks = JSON.parse(localStorage.getItem('awake_today_tasks') || '[]') as {
      done?: boolean;
      createdAt?: string;
    }[];
    if (tasks.some((t) => t.done && new Date(t.createdAt || '').toDateString() === today)) {
      return true;
    }
    const playbook = JSON.parse(localStorage.getItem('awake_playbook') || 'null') as {
      levers?: { done?: boolean }[];
    } | null;
    return playbook?.levers?.some((l) => l.done) ?? false;
  } catch {
    return false;
  }
}

const DEFAULT_SLIDERS: StateSlider[] = [
  { id: 'energy', name: 'Energy', icon: Zap, value: 50, color: '#f59e0b', description: 'Physical & mental charge' },
  { id: 'focus', name: 'Focus', icon: Target, value: 50, color: '#6366f1', description: 'Clarity of direction' },
  { id: 'presence', name: 'Presence', icon: Eye, value: 50, color: '#14b8a6', description: 'Here and now' },
  { id: 'openness', name: 'Openness', icon: Heart, value: 50, color: '#ec4899', description: 'Receptivity to change' },
];

export function Cockpit({ userData, onSignOut, onUpdateUserData }: CockpitProps) {
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
    return saved
      ? prepareWidgets(JSON.parse(saved))
      : prepareWidgets(null);
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
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);
  const [dragOverWidgetId, setDragOverWidgetId] = useState<string | null>(null);

  const sortedWidgets = [...widgets].sort((a, b) => a.position - b.position);

  const userName = userData.identity?.name || 'Traveler';
  const archetype = userData.archetype as Archetype | undefined;
  const archetypeName = archetype ? getArchetypeName(archetype) : null;

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

  const handleBindChallenge = (widgetId: string, challengeId: string) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === widgetId ? { ...w, challengeId } : w))
    );
    notifyCockpitLocalChanged();
  };

  const handleUnbindChallenge = (widgetId: string) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === widgetId ? { ...w, challengeId: undefined } : w))
    );
    notifyCockpitLocalChanged();
  };

  const handleRemoveWidget = (id: string) => {
    const removed = widgets.find((w) => w.id === id);
    if (removed?.type === 'daily-challenge' && removed.challengeId) {
      deleteChallenge(removed.challengeId);
      notifyCockpitLocalChanged();
    }
    setWidgets(widgets.filter((w) => w.id !== id).map((w, i) => ({ ...w, position: i })));
  };

  const handleReorderWidgets = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    setWidgets((prev) => {
      const items = [...prev].sort((a, b) => a.position - b.position);
      const fromIdx = items.findIndex((w) => w.id === fromId);
      const toIdx = items.findIndex((w) => w.id === toId);
      if (fromIdx < 0 || toIdx < 0) return prev;
      const [moved] = items.splice(fromIdx, 1);
      items.splice(toIdx, 0, moved);
      return items.map((w, i) => ({ ...w, position: i }));
    });
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

  const [sessionTick, setSessionTick] = useState(0);
  useEffect(() => {
    const bump = () => setSessionTick((n) => n + 1);
    window.addEventListener(COCKPIT_SYNC_EVENT, bump);
    return () => window.removeEventListener(COCKPIT_SYNC_EVENT, bump);
  }, []);

  const sessionSteps = useMemo(() => {
    const challenges = readDailyChallenges();
    const hasChallenge = challenges.length > 0;
    const allShownUp = hasShownUpToAllChallengesToday();
    const singleChallenge = challenges.length === 1 ? challenges[0] : null;
    return [
      {
        id: 'checkin',
        label: 'Check in',
        hint: 'Morning ritual',
        done: !!todayRitual,
      },
      {
        id: 'showup',
        label: hasChallenge ? 'Show up' : 'Set challenge',
        hint: hasChallenge
          ? challenges.length > 1
            ? `Log each challenge (${challenges.filter((c) => hasShownUpToday(c.id)).length}/${challenges.length})`
            : 'Hit your minimum bar'
          : 'Name your commitment',
        done: hasChallenge && allShownUp,
        tappable: !!singleChallenge,
        challengeId: singleChallenge?.id,
      },
      {
        id: 'move',
        label: 'Move',
        hint: 'Log proof you crafted something',
        done: hasMovedToday(),
      },
    ];
  }, [todayRitual, sessionTick]);

  const handleSessionShowUp = (challengeId: string) => {
    const logged = toggleShowUpToday(challengeId);
    if (logged) triggerSmallCelebration();
    notifyCockpitLocalChanged();
    setSessionTick((n) => n + 1);
  };

  const sessionComplete = sessionSteps.every((s) => s.done);

  const sessionCelebratedRef = useRef(false);
  useEffect(() => {
    if (!sessionComplete) {
      sessionCelebratedRef.current = false;
      return;
    }
    if (sessionCelebratedRef.current) return;
    sessionCelebratedRef.current = true;
    triggerSmallCelebration();
  }, [sessionComplete]);

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
      <header className="mx-auto mb-6 flex max-w-xl items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-teal-400/70">Today&apos;s session</p>
          <h1 className="text-xl font-medium">{getTimeGreeting()}, {userName}</h1>
          {archetypeName && (
            <p className="mt-0.5 text-sm opacity-45">{archetypeName}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsProfileOpen(true)}
            className="rounded-lg p-2 transition-colors hover:bg-white/5"
            title="Profile"
          >
            <UserRound className="h-5 w-5 opacity-50" />
          </button>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="rounded-lg p-2 transition-colors hover:bg-white/5"
            title="Settings"
          >
            <Settings className="h-5 w-5 opacity-50" />
          </button>
          <button 
            onClick={onSignOut}
            className="rounded-lg p-2 transition-colors hover:bg-white/5"
            title="Sign out"
          >
            <LogOut className="h-5 w-5 opacity-50" />
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-xl space-y-5 pb-16">
        {/* 1 — Check in */}
        {!todayRitual ? (
          <motion.button
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setIsRitualOpen(true)}
            className="flex w-full items-center justify-center gap-3 rounded-2xl p-4 transition-transform hover:scale-[1.01]"
            style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(20, 184, 166, 0.15))',
              border: '2px solid rgba(99, 102, 241, 0.3)',
            }}
          >
            <Sun className="h-5 w-5 text-amber-400" />
            <span className="font-medium">Begin check-in</span>
            <span className="text-xs opacity-50">~60 sec</span>
          </motion.button>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl p-4"
            style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-emerald-300/90">Checked in</p>
                {todayRitual.desire && (
                  <p className="mt-1 text-sm italic opacity-70">&ldquo;{todayRitual.desire}&rdquo;</p>
                )}
                {todayRitual.loaMessage && (
                  <p className="mt-2 text-xs leading-relaxed opacity-50 line-clamp-2">
                    {todayRitual.loaMessage}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsRitualOpen(true)}
                className="shrink-0 text-xs opacity-40 hover:opacity-80"
              >
                Again
              </button>
            </div>
          </motion.div>
        )}

        {/* Session progress — the daily container */}
        <div
          className="rounded-2xl p-4"
          style={{
            background: sessionComplete
              ? 'rgba(16, 185, 129, 0.08)'
              : 'rgba(255,255,255,0.03)',
            border: sessionComplete
              ? '1px solid rgba(16, 185, 129, 0.25)'
              : '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-widest opacity-50">Daily loop</h2>
            {sessionComplete && (
              <span className="text-xs text-emerald-400/90">Session complete</span>
            )}
          </div>
          <div className="flex gap-2">
            {sessionSteps.map((step) => {
              const StepEl = step.tappable ? 'button' : 'div';
              return (
                <StepEl
                  key={step.id}
                  type={step.tappable ? 'button' : undefined}
                  onClick={
                    step.tappable && step.challengeId
                      ? () => handleSessionShowUp(step.challengeId!)
                      : undefined
                  }
                  title={
                    step.tappable
                      ? step.done
                        ? 'Undo show-up'
                        : 'Log show-up — hit your minimum bar on today\'s challenge'
                      : step.id === 'move'
                        ? 'Complete when you log an artifact, Today task, or Playbook lever'
                        : undefined
                  }
                  className={`flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-center transition-colors ${
                    step.done ? 'bg-emerald-500/10' : 'bg-white/[0.03]'
                  } ${step.tappable ? 'hover:bg-white/[0.06] cursor-pointer' : ''}`}
                >
                  {step.done ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Circle className="h-4 w-4 opacity-30" />
                  )}
                  <span className="text-[10px] font-medium leading-tight opacity-70">{step.label}</span>
                  <span className="text-[8px] leading-tight opacity-40">{step.hint}</span>
                </StepEl>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed opacity-35">
            {sessionComplete
              ? 'You showed up inside the container. Come back tomorrow for the next round.'
              : (
                <>
                  <span className="opacity-60">Check in</span> — where you are today.
                  {' '}
                  <span className="opacity-60">Show up</span> — enter each challenge (log show-up on each widget).
                  {' '}
                  <span className="opacity-60">Move</span> — leave a trace (artifact vault, Today task, or Playbook).
                </>
              )}
          </p>
          {sessionComplete && <SessionArtifactPrompt onLogged={() => setSessionTick((n) => n + 1)} />}
        </div>

        {/* Intention anchor */}
        {userData.intention && (
          <div
            className="rounded-2xl px-4 py-3"
            style={{
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.15)',
            }}
          >
            <p className="text-[10px] uppercase tracking-widest opacity-45">Intention</p>
            <p className="mt-1 text-sm italic leading-relaxed opacity-85">
              &ldquo;{userData.intention}&rdquo;
            </p>
          </div>
        )}

        {/* 2 & 3 — Tools (widgets) */}
        <div>
          <h2 className="mb-2 text-xs uppercase tracking-widest opacity-40">Your tools</h2>
          <div className="grid grid-cols-2 auto-rows-[10.25rem] gap-3 sm:auto-rows-[11.25rem]">
            {sortedWidgets.map((widget) => (
              <WidgetCard 
                key={widget.id} 
                widget={widget} 
                userData={userData}
                binItems={binItems}
                newBinItem={newBinItem}
                setNewBinItem={setNewBinItem}
                onRelease={handleReleaseToBin}
                onRemove={() => handleRemoveWidget(widget.id)}
                onBindChallenge={(challengeId) => handleBindChallenge(widget.id, challengeId)}
                onUnbindChallenge={() => handleUnbindChallenge(widget.id)}
                onOpenDomains={() => setIsDomainsOpen(true)}
                onUpdateUserData={onUpdateUserData}
                isDragging={draggedWidgetId === widget.id}
                isDragOver={dragOverWidgetId === widget.id && draggedWidgetId !== widget.id}
                onDragStart={() => setDraggedWidgetId(widget.id)}
                onDragEnd={() => {
                  setDraggedWidgetId(null);
                  setDragOverWidgetId(null);
                }}
                onDragOverCard={() => setDragOverWidgetId(widget.id)}
                onDragLeaveCard={() => {
                  setDragOverWidgetId((id) => (id === widget.id ? null : id));
                }}
                onDropOnCard={(fromId) => {
                  handleReorderWidgets(fromId, widget.id);
                  setDraggedWidgetId(null);
                  setDragOverWidgetId(null);
                }}
              />
            ))}
            <button
              type="button"
              onClick={() => setIsWidgetPickerOpen(true)}
              className="flex h-full min-h-0 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/10 p-4 transition-colors hover:bg-white/[0.04]"
            >
              <Plus className="h-5 w-5 opacity-30" />
              <span className="text-xs opacity-30">Add tool</span>
            </button>
          </div>
        </div>

        {/* Loa — one entry point */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => setIsChatOpen(true)}
          className="flex w-full items-center justify-center gap-3 rounded-2xl px-6 py-4"
          style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(20, 184, 166, 0.12))',
            border: '1px solid rgba(99, 102, 241, 0.25)',
          }}
        >
          <LoaCompanion size={28} />
          <div className="text-left">
            <p className="text-sm font-medium">Talk to Loa</p>
            <p className="text-xs opacity-45">When you need a mirror, not a task list</p>
          </div>
        </motion.button>

        {/* The framework — works offline, app is sync layer */}
        <FrameworkPanel />

        {/* North stars — vision / anti-vision */}
        {(userData.vision || userData.antiVision) && (
          <div className="space-y-3">
            {userData.vision && (
              <div
                className="rounded-2xl p-4"
                style={{
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.05), transparent)',
                  border: '1px solid rgba(245, 158, 11, 0.15)',
                }}
              >
                <div className="mb-2 flex items-center gap-2">
                  <Sun className="h-4 w-4 text-amber-400" />
                  <h2 className="text-xs uppercase tracking-widest opacity-50">Toward</h2>
                </div>
                <p className="text-sm leading-relaxed opacity-75">{userData.vision}</p>
              </div>
            )}
            {userData.antiVision && (
              <div
                className="rounded-2xl p-4"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div className="mb-2 flex items-center gap-2">
                  <Moon className="h-4 w-4 opacity-50" />
                  <h2 className="text-xs uppercase tracking-widest opacity-50">Away from</h2>
                </div>
                <p className="text-sm leading-relaxed opacity-55">{userData.antiVision}</p>
              </div>
            )}
          </div>
        )}

        {/* State — optional, collapsed */}
        <details className="group rounded-2xl" style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <summary className="flex cursor-pointer list-none items-center justify-between p-4 text-sm opacity-60 [&::-webkit-details-marker]:hidden">
            <span>How are you right now?</span>
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
          </summary>
          <div className="space-y-4 border-t border-white/5 px-4 pb-4 pt-2">
            {sliders.map((slider) => (
              <div key={slider.id}>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <slider.icon className="h-4 w-4" style={{ color: slider.color }} />
                    <span className="text-sm">{slider.name}</span>
                  </div>
                  <span className="text-xs opacity-50">{slider.value}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={slider.value}
                  onChange={(e) => handleSliderChange(slider.id, parseInt(e.target.value, 10))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full"
                  style={{
                    background: `linear-gradient(to right, ${slider.color} 0%, ${slider.color} ${slider.value}%, rgba(255,255,255,0.1) ${slider.value}%, rgba(255,255,255,0.1) 100%)`,
                  }}
                />
              </div>
            ))}
          </div>
        </details>
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
              <h2 className="text-lg font-medium mb-4">Add a tool</h2>
              <div className="grid grid-cols-2 gap-3">
                {WIDGET_TYPES.map((w) => (
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
  onBindChallenge,
  onUnbindChallenge,
  onOpenDomains,
  onUpdateUserData,
  isDragging,
  isDragOver,
  onDragStart,
  onDragEnd,
  onDragOverCard,
  onDragLeaveCard,
  onDropOnCard,
}: { 
  widget: Widget;
  userData: UserData;
  binItems: string[];
  newBinItem: string;
  setNewBinItem: (v: string) => void;
  onRelease: () => void;
  onRemove: () => void;
  onBindChallenge: (challengeId: string) => void;
  onUnbindChallenge: () => void;
  onOpenDomains: () => void;
  onUpdateUserData?: (data: Partial<UserData>) => void;
  isDragging?: boolean;
  isDragOver?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onDragOverCard?: () => void;
  onDragLeaveCard?: () => void;
  onDropOnCard?: (fromId: string) => void;
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

      case 'daily-challenge':
        return (
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <DailyChallengeWidget
              challengeId={widget.challengeId}
              onBindChallenge={onBindChallenge}
              onUnbindChallenge={onUnbindChallenge}
            />
          </div>
        );

      case 'artifacts':
        return (
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <ArtifactVaultWidget />
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
      className={`group relative flex h-full min-h-0 max-h-full flex-col overflow-hidden rounded-2xl p-3 sm:p-4 transition-shadow ${
        isDragOver ? 'ring-2 ring-indigo-400/60' : ''
      } ${isDragging ? 'opacity-50' : ''}`}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOverCard?.();
      }}
      onDragLeave={() => onDragLeaveCard?.()}
      onDrop={(e) => {
        e.preventDefault();
        const fromId = e.dataTransfer.getData('text/widget-id');
        if (fromId) onDropOnCard?.(fromId);
      }}
    >
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/widget-id', widget.id);
          e.dataTransfer.effectAllowed = 'move';
          onDragStart?.();
        }}
        onDragEnd={() => onDragEnd?.()}
        className="absolute left-2 top-2 z-10 flex h-6 w-6 cursor-grab items-center justify-center rounded-md opacity-0 transition-opacity active:cursor-grabbing group-hover:opacity-40 hover:opacity-70"
        title="Drag to reorder"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </div>
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

// Today Widget - Quick task management
interface Task {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
}

function readTodaysRitualDesire(): string | null {
  try {
    const history = JSON.parse(localStorage.getItem('awake_ritual_history') || '[]') as {
      date?: string;
      desire?: string;
    }[];
    const today = new Date().toDateString();
    for (const r of history) {
      if (!r?.date) continue;
      if (new Date(r.date).toDateString() !== today) continue;
      const d = String(r.desire ?? '').trim();
      if (d) return d;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function TodayWidget() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState('');
  const [ritualDesire, setRitualDesire] = useState<string | null>(() => readTodaysRitualDesire());

  useEffect(() => {
    const bump = () => setRitualDesire(readTodaysRitualDesire());
    bump();
    window.addEventListener(COCKPIT_SYNC_EVENT, bump);
    return () => window.removeEventListener(COCKPIT_SYNC_EVENT, bump);
  }, []);

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

      {ritualDesire ? (
        <p className="mb-2 line-clamp-2 shrink-0 text-[10px] leading-snug text-muted-foreground">
          <span className="opacity-50">From your ritual · </span>
          <span className="italic">&ldquo;{ritualDesire}&rdquo;</span>
        </p>
      ) : null}

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

// Daily Challenge — each widget owns one challenge
function DailyChallengeWidget({
  challengeId,
  onBindChallenge,
  onUnbindChallenge,
}: {
  challengeId?: string;
  onBindChallenge: (challengeId: string) => void;
  onUnbindChallenge: () => void;
}) {
  const [challenge, setChallenge] = useState(() =>
    challengeId ? getChallenge(challengeId) : null
  );
  const [titleDraft, setTitleDraft] = useState('');
  const [minimumDraft, setMinimumDraft] = useState('Just show up — that counts.');
  const [showedToday, setShowedToday] = useState(() =>
    challengeId ? hasShownUpToday(challengeId) : false
  );
  const [isEditing, setIsEditing] = useState(false);

  const refresh = useCallback(() => {
    const c = challengeId ? getChallenge(challengeId) : null;
    setChallenge(c);
    setShowedToday(challengeId ? hasShownUpToday(challengeId) : false);
  }, [challengeId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onSync = () => refresh();
    window.addEventListener(COCKPIT_SYNC_EVENT, onSync);
    return () => window.removeEventListener(COCKPIT_SYNC_EVENT, onSync);
  }, [refresh]);

  const streak = challengeId ? computeChallengeStreak(challengeId) : 0;

  const resetCreateDrafts = () => {
    setTitleDraft('');
    setMinimumDraft('Just show up — that counts.');
    setIsEditing(false);
  };

  const handleCreate = () => {
    if (!titleDraft.trim()) return;
    const created = createChallenge(titleDraft, minimumDraft);
    onBindChallenge(created.id);
    resetCreateDrafts();
    refresh();
    notifyCockpitLocalChanged();
  };

  const handleSaveEdit = () => {
    if (!titleDraft.trim() || !challengeId) return;
    updateChallenge(challengeId, titleDraft, minimumDraft);
    setIsEditing(false);
    refresh();
    notifyCockpitLocalChanged();
  };

  const startEditing = () => {
    if (!challenge) return;
    setTitleDraft(challenge.title);
    setMinimumDraft(challenge.minimumBar);
    setIsEditing(true);
  };

  const handleEndChallenge = () => {
    if (challengeId) deleteChallenge(challengeId);
    onUnbindChallenge();
    resetCreateDrafts();
    setChallenge(null);
    notifyCockpitLocalChanged();
  };

  const toggleShowUp = () => {
    if (!challengeId) return;
    if (showedToday) {
      unlogShowUpToday(challengeId);
    } else {
      logShowUpToday(challengeId);
      triggerSmallCelebration();
    }
    refresh();
    notifyCockpitLocalChanged();
  };

  if (!challenge || isEditing) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="mb-2 flex shrink-0 items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-400" />
          <span className="text-xs opacity-50">
            {isEditing ? 'Edit challenge' : 'Daily Challenge'}
          </span>
        </div>
        <input
          type="text"
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          placeholder="Gym, upload, meditate…"
          className="mb-1.5 w-full shrink-0 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-xs focus:border-amber-400/50 focus:outline-none"
        />
        <input
          type="text"
          value={minimumDraft}
          onChange={(e) => setMinimumDraft(e.target.value)}
          placeholder="Minimum bar"
          className="mb-2 w-full shrink-0 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-[10px] opacity-80 focus:border-amber-400/50 focus:outline-none"
        />
        <div className="mt-auto flex shrink-0 gap-2">
          {isEditing && (
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setTitleDraft('');
                setMinimumDraft('Just show up — that counts.');
              }}
              className="flex-1 rounded-lg bg-white/5 py-2 text-xs transition-colors hover:bg-white/10"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={isEditing ? handleSaveEdit : handleCreate}
            disabled={!titleDraft.trim()}
            className="flex-1 rounded-lg bg-amber-400/20 py-2 text-xs transition-colors hover:bg-amber-400/30 disabled:opacity-30"
          >
            {isEditing ? 'Save' : 'Start challenge'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="mb-1 flex shrink-0 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <Trophy className="h-4 w-4 shrink-0 text-amber-400" />
          <span className="truncate text-xs font-medium">{challenge.title}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {streak > 0 && (
            <span className="text-[10px] tabular-nums text-amber-300/90">{streak}d</span>
          )}
          <button
            type="button"
            onClick={startEditing}
            title="Edit challenge name"
            className="rounded p-0.5 opacity-40 transition-opacity hover:opacity-80"
          >
            <Pencil className="h-3 w-3" />
          </button>
        </div>
      </div>
      <p className="mb-2 line-clamp-2 shrink-0 text-[10px] leading-snug opacity-45">
        Min: {challenge.minimumBar}
      </p>
      <button
        type="button"
        onClick={toggleShowUp}
        className={`flex shrink-0 items-center gap-2 rounded-lg px-2 py-2 text-left text-xs transition-colors ${
          showedToday
            ? 'bg-emerald-500/15 text-emerald-300'
            : 'bg-white/5 hover:bg-white/10'
        }`}
      >
        {showedToday ? (
          <CheckCircle2 className="h-4 w-4 shrink-0" />
        ) : (
          <Circle className="h-4 w-4 shrink-0 opacity-50" />
        )}
        <span>{showedToday ? 'Showed up today' : 'Log show-up'}</span>
      </button>
      <button
        type="button"
        onClick={handleEndChallenge}
        className="mt-auto shrink-0 pt-2 text-[9px] opacity-30 hover:opacity-60"
      >
        End challenge & start new
      </button>
    </div>
  );
}

function SessionArtifactPrompt({ onLogged }: { onLogged: () => void }) {
  const [title, setTitle] = useState('');
  const [logged, setLogged] = useState(hasArtifactToday);

  if (logged) return null;

  const submit = () => {
    if (!title.trim()) return;
    addArtifact({ title: title.trim() });
    triggerSmallCelebration();
    setLogged(true);
    onLogged();
  };

  return (
    <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3">
      <p className="mb-2 text-[11px] font-medium text-amber-200/80">
        Log today&apos;s artifact — what did you actually craft?
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="e.g. Sent the one-pager, fixed auth bug..."
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-xs focus:border-amber-400/40 focus:outline-none"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!title.trim()}
          className="shrink-0 rounded-lg bg-amber-400/20 px-3 py-1.5 text-xs transition-colors hover:bg-amber-400/30 disabled:opacity-30"
        >
          Drop
        </button>
      </div>
    </div>
  );
}

function ArtifactVaultWidget() {
  const [artifacts, setArtifacts] = useState<Artifact[]>(readArtifacts);
  const [title, setTitle] = useState('');
  const [tier, setTier] = useState<ArtifactTier>('bronze');

  const refresh = () => setArtifacts(readArtifacts());

  useEffect(() => {
    refresh();
    const bump = () => refresh();
    window.addEventListener(COCKPIT_SYNC_EVENT, bump);
    return () => window.removeEventListener(COCKPIT_SYNC_EVENT, bump);
  }, []);

  const submit = () => {
    if (!title.trim()) return;
    addArtifact({ title: title.trim(), tier });
    triggerSmallCelebration();
    setTitle('');
    refresh();
  };

  const tiers: ArtifactTier[] = ['bronze', 'silver', 'gold'];

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="mb-2 flex shrink-0 items-center gap-2">
        <Gem className="h-5 w-5 shrink-0 text-amber-400" />
        <span className="text-xs opacity-50">Artifact Vault</span>
      </div>
      <p className="mb-2 line-clamp-2 shrink-0 text-[9px] leading-snug opacity-35">
        Proof crafted in the world — not thoughts in your head.
      </p>
      <div className="mb-2 flex shrink-0 gap-1">
        {tiers.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTier(t)}
            className={`rounded px-2 py-0.5 text-[9px] capitalize transition-colors ${
              tier === t ? 'bg-white/10' : 'opacity-40 hover:opacity-70'
            }`}
            style={tier === t ? { color: tierColor(t) } : undefined}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="mb-2 flex shrink-0 gap-1.5">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="What did you make?"
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-[11px] focus:border-amber-400/40 focus:outline-none"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!title.trim()}
          className="shrink-0 rounded-lg bg-amber-400/15 px-2 py-1.5 text-[10px] disabled:opacity-30"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
        {artifacts.length === 0 ? (
          <p className="text-xs opacity-30">No artifacts yet</p>
        ) : (
          artifacts.slice(0, 8).map((a) => (
            <div key={a.id} className="flex items-start gap-2 text-[10px]">
              <span
                className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: tierColor(a.tier) }}
              />
              <span className="line-clamp-2 leading-snug">{a.title}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function FrameworkPanel() {
  return (
    <details
      className="group rounded-2xl"
      style={{
        background: 'rgba(99, 102, 241, 0.04)',
        border: '1px solid rgba(99, 102, 241, 0.12)',
      }}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between p-4 text-sm [&::-webkit-details-marker]:hidden">
        <span className="opacity-70">The Awake framework</span>
        <ChevronDown className="h-4 w-4 opacity-40 transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-3 border-t border-white/5 px-4 pb-4 pt-3 text-xs leading-relaxed opacity-60">
        <p>
          Awake is a system for governing your life — not a dashboard. The app is the sync layer;
          the practice works anywhere.
        </p>
        <p className="font-medium opacity-80">Daily session (notebook or app)</p>
        <ol className="list-decimal space-y-1 pl-4">
          <li>
            <span className="opacity-80">Check in</span> — How am I? What matters today?
          </li>
          <li>
            <span className="opacity-80">Show up</span> — Hit the minimum bar on your challenge.
          </li>
          <li>
            <span className="opacity-80">Move</span> — One concrete action. An artifact, not a thought.
          </li>
        </ol>
        <p>
          Go offline for a week with a notebook. Same three steps. When you return, log what you
          did — your streak and artifacts pick up where you left off.
        </p>
      </div>
    </details>
  );
}
