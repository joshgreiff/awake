/**
 * User-defined daily commitment — the container matters more than the output.
 * "Gym" counts if you showed up, even if you only washed your hands.
 */

export interface DailyChallenge {
  id: string;
  title: string;
  /** The minimum bar — what still counts as showing up */
  minimumBar: string;
  startedAt: string;
}

export interface DailyChallengeState {
  challenge: DailyChallenge | null;
  /** YYYY-MM-DD local → optional note */
  logs: Record<string, string | undefined>;
}

const STORAGE_KEY = 'awake_daily_challenge';

function localDateKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function readDailyChallengeState(): DailyChallengeState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { challenge: null, logs: {} };
  try {
    const parsed = JSON.parse(raw) as DailyChallengeState;
    return {
      challenge: parsed.challenge ?? null,
      logs: parsed.logs ?? {},
    };
  } catch {
    return { challenge: null, logs: {} };
  }
}

function writeDailyChallengeState(state: DailyChallengeState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function setDailyChallenge(title: string, minimumBar: string): DailyChallenge {
  const challenge: DailyChallenge = {
    id: `dc-${Date.now()}`,
    title: title.trim(),
    minimumBar: minimumBar.trim() || 'Just show up — that counts.',
    startedAt: new Date().toISOString(),
  };
  writeDailyChallengeState({ challenge, logs: {} });
  return challenge;
}

export function clearDailyChallenge(): void {
  writeDailyChallengeState({ challenge: null, logs: {} });
}

export function logShowUpToday(note?: string): boolean {
  const state = readDailyChallengeState();
  if (!state.challenge) return false;
  const today = localDateKey();
  state.logs[today] = note?.trim() || undefined;
  writeDailyChallengeState(state);
  return true;
}

export function unlogShowUpToday(): void {
  const state = readDailyChallengeState();
  const today = localDateKey();
  delete state.logs[today];
  writeDailyChallengeState(state);
}

export function hasShownUpToday(): boolean {
  const state = readDailyChallengeState();
  return !!state.logs[localDateKey()];
}

export function computeChallengeStreak(): number {
  const { logs } = readDailyChallengeState();
  const days = new Set(Object.keys(logs));
  if (days.size === 0) return 0;

  const today = new Date();
  const todayKey = localDateKey(today);
  const yest = new Date(today);
  yest.setDate(yest.getDate() - 1);
  const yesterdayKey = localDateKey(yest);

  if (!days.has(todayKey) && !days.has(yesterdayKey)) return 0;

  let check = days.has(todayKey) ? new Date(today) : new Date(yest);
  let streak = 0;

  for (;;) {
    const key = localDateKey(check);
    if (days.has(key)) {
      streak++;
      check.setDate(check.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/** For overall Awake streak — days user logged show-up */
export function collectChallengeActiveDays(): Set<string> {
  const { logs } = readDailyChallengeState();
  return new Set(Object.keys(logs));
}
