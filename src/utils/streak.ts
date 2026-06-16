/**
 * Calendar-day streak for Awake: counts consecutive local days
 * with at least one of: daily ritual, reflection, or state check-in session.
 */

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dayKeyFromISO(iso: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return localDateKey(d);
}

/** All calendar days (YYYY-MM-DD local) the user showed up */
export function collectActiveDays(): Set<string> {
  const days = new Set<string>();

  const addFrom = (raw: string | null, path: (obj: unknown) => string | null) => {
    if (!raw) return;
    try {
      const arr = JSON.parse(raw) as unknown[];
      if (!Array.isArray(arr)) return;
      for (const item of arr) {
        const key = path(item);
        if (key) days.add(key);
      }
    } catch {
      /* ignore */
    }
  };

  addFrom(localStorage.getItem('awake_ritual_history'), (item) =>
    dayKeyFromISO((item as { date?: string }).date || '')
  );

  addFrom(localStorage.getItem('awake_reflections'), (item) => {
    const r = item as { date?: string; createdAt?: string; timestamp?: string };
    return dayKeyFromISO(r.date || r.createdAt || r.timestamp || '');
  });

  addFrom(localStorage.getItem('awake_sessions'), (item) =>
    dayKeyFromISO((item as { timestamp?: string }).timestamp || '')
  );

  try {
    const challengeRaw = localStorage.getItem('awake_daily_challenge');
    if (challengeRaw) {
      const { logs } = JSON.parse(challengeRaw) as { logs?: Record<string, unknown> };
      if (logs && typeof logs === 'object') {
        for (const key of Object.keys(logs)) {
          if (/^\d{4}-\d{2}-\d{2}$/.test(key)) days.add(key);
        }
      }
    }
  } catch {
    /* ignore */
  }

  // Daily Reflection also writes lastDate as toDateString()
  try {
    const raw = localStorage.getItem('awake_reflection_streak');
    if (raw) {
      const { count, lastDate } = JSON.parse(raw) as { count?: number; lastDate?: string };
      if (count && count > 0 && lastDate) {
        const d = new Date(lastDate);
        if (!Number.isNaN(d.getTime())) days.add(localDateKey(d));
      }
    }
  } catch {
    /* ignore */
  }

  // "Loa's advice for today" counts as a check-in for that calendar day
  try {
    const raw = localStorage.getItem('awake_loa_today');
    if (raw) {
      const { date } = JSON.parse(raw) as { date?: string };
      if (date) {
        const d = new Date(date);
        if (!Number.isNaN(d.getTime())) days.add(localDateKey(d));
      }
    }
  } catch {
    /* ignore */
  }

  return days;
}

/**
 * Consecutive days ending today or yesterday (if today not logged yet).
 * Matches common "streak" UX (e.g. Duolingo).
 */
export function computeAwakeDayStreak(): number {
  const days = collectActiveDays();
  if (days.size === 0) return 0;

  const today = new Date();
  const todayKey = localDateKey(today);

  const yest = new Date(today);
  yest.setDate(yest.getDate() - 1);
  const yesterdayKey = localDateKey(yest);

  if (!days.has(todayKey) && !days.has(yesterdayKey)) {
    return 0;
  }

  let check = new Date(today);
  if (!days.has(todayKey)) {
    check = new Date(yest);
  }

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
