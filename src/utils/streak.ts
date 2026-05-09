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

  addFrom(localStorage.getItem('awake_reflections'), (item) =>
    dayKeyFromISO((item as { date?: string }).date || '')
  );

  addFrom(localStorage.getItem('awake_sessions'), (item) =>
    dayKeyFromISO((item as { timestamp?: string }).timestamp || '')
  );

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
