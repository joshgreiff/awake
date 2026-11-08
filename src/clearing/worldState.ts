/**
 * Persistent, local-only world state for The Clearing: what the player has come
 * across and how many times they have returned. Stored under its own key, outside
 * the cloud-synced `awake_` namespace, and separate from the journal.
 *
 * Testing: open `/clearing?reset-world` to clear this state (the journal is kept).
 * In dev builds `window.__clearing.resetWorld()` does the same.
 */
export const WORLD_KEY = 'clearing_world_v1';

/** Story beats. Kept generic here; their meaning lives in `engine/story.ts`. */
export type BeatId = 'arrival' | 'panel' | 'token' | 'voice' | 'signal';

export interface WorldState {
  version: 1;
  /** Random per save, drives placement variation. */
  seed: number;
  visits: number;
  firstVisitAt: string | null;
  lastVisitAt: string | null;
  /** ISO time each beat first happened. */
  beats: Partial<Record<BeatId, string>>;
  /** The visit number on which each beat happened. */
  beatVisit: Partial<Record<BeatId, number>>;
  /** How many machine log lines have been read so far. */
  panelLines: number;
  /** Visit on which the most recent log line was read. */
  panelVisit: number;
}

function fresh(): WorldState {
  return {
    version: 1,
    seed: Math.floor(Math.random() * 2 ** 31),
    visits: 0,
    firstVisitAt: null,
    lastVisitAt: null,
    beats: {},
    beatVisit: {},
    panelLines: 0,
    panelVisit: 0,
  };
}

export function loadWorld(): WorldState {
  try {
    const raw = window.localStorage.getItem(WORLD_KEY);
    if (!raw) return fresh();
    const p = JSON.parse(raw) as Partial<WorldState>;
    const base = fresh();
    return {
      version: 1,
      seed: typeof p.seed === 'number' ? p.seed : base.seed,
      visits: typeof p.visits === 'number' ? p.visits : 0,
      firstVisitAt: typeof p.firstVisitAt === 'string' ? p.firstVisitAt : null,
      lastVisitAt: typeof p.lastVisitAt === 'string' ? p.lastVisitAt : null,
      beats: p.beats && typeof p.beats === 'object' ? p.beats : {},
      beatVisit: p.beatVisit && typeof p.beatVisit === 'object' ? p.beatVisit : {},
      panelLines: typeof p.panelLines === 'number' ? p.panelLines : 0,
      panelVisit: typeof p.panelVisit === 'number' ? p.panelVisit : 0,
    };
  } catch {
    return fresh();
  }
}

export function saveWorld(state: WorldState): void {
  try {
    window.localStorage.setItem(WORLD_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable: the world simply won't remember this visit.
  }
}

export function resetWorld(): void {
  try {
    window.localStorage.removeItem(WORLD_KEY);
  } catch {
    // ignore
  }
}

/** Handles `?reset-world` on load. Returns true if state was cleared. */
export function consumeResetParam(): boolean {
  if (typeof window === 'undefined') return false;
  const url = new URL(window.location.href);
  if (!url.searchParams.has('reset-world')) return false;
  resetWorld();
  url.searchParams.delete('reset-world');
  window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  console.info('[clearing] world state reset');
  return true;
}

export function hasBeat(state: WorldState, id: BeatId): boolean {
  return typeof state.beats[id] === 'string';
}
