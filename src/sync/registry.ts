import type { SyncDeck } from './types';
import { deck20260617 } from './decks/2026-06-17';

const DECKS: Record<string, SyncDeck> = {
  '2026-06-17': deck20260617,
};

export function listSyncDeckIds(): string[] {
  return Object.keys(DECKS).sort().reverse();
}

export function getSyncDeck(slug: string): SyncDeck | null {
  return DECKS[slug] ?? null;
}

export function getLatestSyncDeck(): SyncDeck | null {
  const ids = listSyncDeckIds();
  return ids.length > 0 ? DECKS[ids[0]] : null;
}

/** Parse /sync or /sync/2026-06-17 from pathname */
export function parseSyncPath(pathname: string): string | null {
  const match = pathname.match(/^\/sync(?:\/([\d]{4}-[\d]{2}-[\d]{2}))?\/?$/);
  if (!match) return null;
  return match[1] ?? 'latest';
}
