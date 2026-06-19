import {
  hasShownUpToday,
  hasShownUpToAllChallengesToday,
  logShowUpToday,
  readDailyChallenges,
  unlogShowUpToday,
} from './dailyChallenge';

const SHOW_UP_PATTERNS = [
  /\blog\s+show[\s-]?up\b/i,
  /\bshowed\s+up\b/i,
  /\bwent\s+to\s+(the\s+)?gym\b/i,
  /\bi\s+(did|hit)\s+(the\s+)?gym\b/i,
  /\blog\s+(my\s+)?challenge\b/i,
];

/** Natural-language shortcuts — e.g. telling Loa "log show up". */
export function tryParseShowUpLog(message: string): {
  action: 'log' | 'unlog' | 'none';
  challengeTitle?: string;
} {
  const text = message.trim();
  if (!text) return { action: 'none' };

  const challenges = readDailyChallenges();
  if (challenges.length === 0) return { action: 'none' };

  if (/\bunlog\b|\bundid\b|\bundo\b/i.test(text) && /\bshow[\s-]?up\b/i.test(text)) {
    const logged = challenges.filter((c) => hasShownUpToday(c.id));
    if (logged.length === 0) return { action: 'none' };
    const target = logged[logged.length - 1];
    unlogShowUpToday(target.id);
    return { action: 'unlog', challengeTitle: target.title };
  }

  if (!SHOW_UP_PATTERNS.some((p) => p.test(text))) return { action: 'none' };

  const pending = challenges.find((c) => !hasShownUpToday(c.id));
  if (!pending) {
    return { action: 'none', challengeTitle: challenges[0]?.title };
  }

  logShowUpToday(pending.id);
  return { action: 'log', challengeTitle: pending.title };
}

export function toggleShowUpToday(challengeId: string): boolean {
  const challenge = readDailyChallenges().find((c) => c.id === challengeId);
  if (!challenge) return false;
  if (hasShownUpToday(challengeId)) {
    unlogShowUpToday(challengeId);
    return false;
  }
  logShowUpToday(challengeId);
  return true;
}

export { hasShownUpToAllChallengesToday };
