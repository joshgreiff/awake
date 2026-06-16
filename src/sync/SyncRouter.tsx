import { FounderSyncDeck, SyncDeckIndex } from './FounderSyncDeck';
import { getLatestSyncDeck, getSyncDeck, parseSyncPath } from './registry';

export function SyncRouter() {
  const slug = parseSyncPath(window.location.pathname);

  if (!slug) return null;

  if (slug === 'latest') {
    const deck = getLatestSyncDeck();
    if (!deck) return <SyncDeckIndex />;
    return <FounderSyncDeck deck={deck} />;
  }

  const deck = getSyncDeck(slug);
  if (!deck) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-8 text-center">
        <div>
          <p className="text-lg">No sync deck for {slug}</p>
          <a href="/sync" className="mt-4 inline-block text-teal-400 hover:underline">
            View all decks
          </a>
        </div>
      </div>
    );
  }

  return <FounderSyncDeck deck={deck} />;
}

export function isSyncRoute(): boolean {
  return parseSyncPath(window.location.pathname) !== null;
}
