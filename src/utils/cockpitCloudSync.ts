import type { CockpitSyncState } from '../types/cockpitSync';
import { parseLoaChatsStorage, trimLoaChatsForCloud } from './loaChatStorage';

export { COCKPIT_SYNC_EVENT, notifyCockpitLocalChanged } from './cockpitSyncEvents';

const KEYS = {
  ritualHistory: 'awake_ritual_history',
  todayTasks: 'awake_today_tasks',
  widgets: 'awake_cockpit_widgets',
  cockpitSliders: 'awake_cockpit_sliders',
  playbook: 'awake_playbook',
  activePaths: 'awake_active_paths',
  loaToday: 'awake_loa_today',
  reflections: 'awake_reflections',
  sessions: 'awake_sessions',
  reflectionStreak: 'awake_reflection_streak',
  chatHistory: 'awake_chat_history',
  artifacts: 'awake_artifacts',
} as const;

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const MAX_RITUALS = 30;
const MAX_REFLECTIONS = 80;
const MAX_SESSIONS = 100;
/** Build a cloud-sized snapshot from current localStorage */
export function buildCockpitSyncSnapshot(): CockpitSyncState {
  const ritualHistory = safeParse<unknown[]>(localStorage.getItem(KEYS.ritualHistory), []).slice(0, MAX_RITUALS);
  const todayTasks = safeParse<unknown[]>(localStorage.getItem(KEYS.todayTasks), []);
  const widgets = safeParse<unknown[]>(localStorage.getItem(KEYS.widgets), []);
  const cockpitSliders = safeParse<{ id: string; value: number }[]>(
    localStorage.getItem(KEYS.cockpitSliders),
    []
  );
  const playbookRaw = localStorage.getItem(KEYS.playbook);
  const playbook = playbookRaw ? safeParse<unknown | null>(playbookRaw, null) : null;
  const activePaths = safeParse<unknown[]>(localStorage.getItem(KEYS.activePaths), []);
  const loaTodayRaw = localStorage.getItem(KEYS.loaToday);
  const loaToday = loaTodayRaw ? safeParse<{ date: string; advice: string } | null>(loaTodayRaw, null) : null;
  const reflections = safeParse<unknown[]>(localStorage.getItem(KEYS.reflections), []).slice(0, MAX_REFLECTIONS);
  const sessions = safeParse<unknown[]>(localStorage.getItem(KEYS.sessions), []).slice(0, MAX_SESSIONS);
  const streakRaw = localStorage.getItem(KEYS.reflectionStreak);
  const reflectionStreak = streakRaw
    ? safeParse<{ count: number; lastDate: string } | null>(streakRaw, null)
    : null;
  const chatRaw = localStorage.getItem(KEYS.chatHistory);
  const chatParsed = parseLoaChatsStorage(chatRaw);
  const chatHistory = trimLoaChatsForCloud(chatParsed) as unknown;
  const artifacts = safeParse<unknown[]>(localStorage.getItem(KEYS.artifacts), []).slice(0, 100);

  return {
    ritualHistory,
    todayTasks,
    widgets,
    cockpitSliders,
    playbook,
    activePaths,
    loaToday,
    reflections,
    sessions,
    reflectionStreak,
    chatHistory,
    artifacts,
    updatedAt: new Date().toISOString(),
  };
}

/** Apply cloud snapshot to localStorage (call after load, before cockpit mounts) */
export function applyCockpitSyncToLocalStorage(data: Partial<CockpitSyncState> | null | undefined): void {
  if (!data) return;

  if (data.ritualHistory !== undefined && Array.isArray(data.ritualHistory)) {
    localStorage.setItem(KEYS.ritualHistory, JSON.stringify(data.ritualHistory));
  }
  if (data.todayTasks !== undefined && Array.isArray(data.todayTasks)) {
    localStorage.setItem(KEYS.todayTasks, JSON.stringify(data.todayTasks));
  }
  if (data.widgets !== undefined && Array.isArray(data.widgets)) {
    localStorage.setItem(KEYS.widgets, JSON.stringify(data.widgets));
  }
  if (data.cockpitSliders !== undefined && Array.isArray(data.cockpitSliders)) {
    localStorage.setItem(KEYS.cockpitSliders, JSON.stringify(data.cockpitSliders));
  }
  if (data.playbook !== undefined) {
    if (data.playbook === null) localStorage.removeItem(KEYS.playbook);
    else localStorage.setItem(KEYS.playbook, JSON.stringify(data.playbook));
  }
  if (data.activePaths !== undefined && Array.isArray(data.activePaths)) {
    localStorage.setItem(KEYS.activePaths, JSON.stringify(data.activePaths));
  }
  if (data.loaToday !== undefined) {
    if (data.loaToday === null) localStorage.removeItem(KEYS.loaToday);
    else localStorage.setItem(KEYS.loaToday, JSON.stringify(data.loaToday));
  }
  if (data.reflections !== undefined && Array.isArray(data.reflections)) {
    localStorage.setItem(KEYS.reflections, JSON.stringify(data.reflections));
  }
  if (data.sessions !== undefined && Array.isArray(data.sessions)) {
    localStorage.setItem(KEYS.sessions, JSON.stringify(data.sessions));
  }
  if (data.reflectionStreak !== undefined) {
    if (data.reflectionStreak === null) localStorage.removeItem(KEYS.reflectionStreak);
    else localStorage.setItem(KEYS.reflectionStreak, JSON.stringify(data.reflectionStreak));
  }
  if (data.chatHistory !== undefined) {
    if (Array.isArray(data.chatHistory)) {
      localStorage.setItem(KEYS.chatHistory, JSON.stringify(data.chatHistory));
    } else if (
      data.chatHistory &&
      typeof data.chatHistory === 'object' &&
      (data.chatHistory as { v?: number }).v === 1
    ) {
      localStorage.setItem(KEYS.chatHistory, JSON.stringify(data.chatHistory));
    }
  }
  if (data.artifacts !== undefined && Array.isArray(data.artifacts)) {
    localStorage.setItem(KEYS.artifacts, JSON.stringify(data.artifacts));
  }
}
