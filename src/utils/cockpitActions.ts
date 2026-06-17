import {
  hasShownUpToday,
  logShowUpToday,
  readDailyChallengeState,
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

  const challenge = readDailyChallengeState().challenge;
  if (!challenge) return { action: 'none' };

  if (/\bunlog\b|\bundid\b|\bundo\b/i.test(text) && /\bshow[\s-]?up\b/i.test(text)) {
    if (!hasShownUpToday()) return { action: 'none' };
    unlogShowUpToday();
    return { action: 'unlog', challengeTitle: challenge.title };
  }

  if (!SHOW_UP_PATTERNS.some((p) => p.test(text))) return { action: 'none' };
  if (hasShownUpToday()) return { action: 'none', challengeTitle: challenge.title };

  logShowUpToday();
  return { action: 'log', challengeTitle: challenge.title };
}

export function toggleShowUpToday(): boolean {
  const challenge = readDailyChallengeState().challenge;
  if (!challenge) return false;
  if (hasShownUpToday()) {
    unlogShowUpToday();
    return false;
  }
  logShowUpToday();
  return true;
}
