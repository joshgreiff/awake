/**
 * User-defined daily commitments — each challenge is its own container.
 * "Gym" counts if you showed up, even if you only washed your hands.
 */

export interface DailyChallenge {
  id: string;
  title: string;
  /** The minimum bar — what still counts as showing up */
  minimumBar: string;
  startedAt: string;
  /** YYYY-MM-DD local → optional note */
  logs: Record<string, string>;
}

interface DailyChallengesState {
  challenges: DailyChallenge[];
}

/** @deprecated Legacy single-challenge shape — migrated on read */
interface LegacyDailyChallengeState {
  challenge: Omit<DailyChallenge, 'logs'> | null;
  logs?: Record<string, string | undefined>;
}

const STORAGE_KEY = 'awake_daily_challenge';

function localDateKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function normalizeLogs(raw: Record<string, string | undefined> | undefined): Record<string, string> {
  if (!raw || typeof raw !== 'object') return {};
  const logs: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(key)) logs[key] = value ?? '';
  }
  return logs;
}

function migrateState(parsed: unknown): DailyChallengesState {
  if (!parsed || typeof parsed !== 'object') return { challenges: [] };
  const data = parsed as LegacyDailyChallengeState & DailyChallengesState;

  if (Array.isArray(data.challenges)) {
    return {
      challenges: data.challenges
        .filter((c): c is DailyChallenge => !!c && typeof c.id === 'string')
        .map((c) => ({
          id: c.id,
          title: c.title ?? '',
          minimumBar: c.minimumBar || 'Just show up — that counts.',
          startedAt: c.startedAt ?? new Date().toISOString(),
          logs: normalizeLogs(c.logs),
        })),
    };
  }

  if (data.challenge && typeof data.challenge === 'object') {
    return {
      challenges: [
        {
          ...data.challenge,
          minimumBar: data.challenge.minimumBar || 'Just show up — that counts.',
          logs: normalizeLogs(data.logs),
        },
      ],
    };
  }

  return { challenges: [] };
}

function readState(): DailyChallengesState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { challenges: [] };
  try {
    return migrateState(JSON.parse(raw));
  } catch {
    return { challenges: [] };
  }
}

function writeState(state: DailyChallengesState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function readDailyChallenges(): DailyChallenge[] {
  return readState().challenges;
}

export function getChallenge(id: string): DailyChallenge | null {
  return readState().challenges.find((c) => c.id === id) ?? null;
}

export function createChallenge(title: string, minimumBar: string): DailyChallenge {
  const challenge: DailyChallenge = {
    id: `dc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: title.trim(),
    minimumBar: minimumBar.trim() || 'Just show up — that counts.',
    startedAt: new Date().toISOString(),
    logs: {},
  };
  const state = readState();
  writeState({ challenges: [...state.challenges, challenge] });
  return challenge;
}

export function updateChallenge(
  id: string,
  title: string,
  minimumBar: string,
): DailyChallenge | null {
  const state = readState();
  const idx = state.challenges.findIndex((c) => c.id === id);
  if (idx < 0) return null;
  const updated: DailyChallenge = {
    ...state.challenges[idx],
    title: title.trim(),
    minimumBar: minimumBar.trim() || 'Just show up — that counts.',
  };
  const challenges = [...state.challenges];
  challenges[idx] = updated;
  writeState({ challenges });
  return updated;
}

export function deleteChallenge(id: string): void {
  const state = readState();
  writeState({ challenges: state.challenges.filter((c) => c.id !== id) });
}

export function logShowUpToday(challengeId: string, note?: string): boolean {
  const state = readState();
  const idx = state.challenges.findIndex((c) => c.id === challengeId);
  if (idx < 0) return false;
  const today = localDateKey();
  const challenges = [...state.challenges];
  challenges[idx] = {
    ...challenges[idx],
    logs: { ...challenges[idx].logs, [today]: note?.trim() ?? '' },
  };
  writeState({ challenges });
  return true;
}

export function unlogShowUpToday(challengeId: string): void {
  const state = readState();
  const idx = state.challenges.findIndex((c) => c.id === challengeId);
  if (idx < 0) return;
  const today = localDateKey();
  const logs = { ...state.challenges[idx].logs };
  delete logs[today];
  const challenges = [...state.challenges];
  challenges[idx] = { ...challenges[idx], logs };
  writeState({ challenges });
}

export function hasShownUpToday(challengeId: string): boolean {
  const challenge = getChallenge(challengeId);
  if (!challenge) return false;
  return localDateKey() in challenge.logs;
}

export function computeChallengeStreak(challengeId: string): number {
  const challenge = getChallenge(challengeId);
  if (!challenge) return 0;
  const days = new Set(Object.keys(challenge.logs));
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

export function hasActiveChallenges(): boolean {
  return readDailyChallenges().length > 0;
}

/** Show-up step complete when every active challenge is logged today. */
export function hasShownUpToAllChallengesToday(): boolean {
  const challenges = readDailyChallenges();
  if (challenges.length === 0) return false;
  const today = localDateKey();
  return challenges.every((c) => today in c.logs);
}

/** For overall Awake streak — days user logged show-up on any challenge */
export function collectChallengeActiveDays(): Set<string> {
  const days = new Set<string>();
  for (const c of readDailyChallenges()) {
    for (const key of Object.keys(c.logs)) days.add(key);
  }
  return days;
}
