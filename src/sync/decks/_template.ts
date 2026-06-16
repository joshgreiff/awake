/**
 * Copy this file for each weekly sync.
 * 1. Save as YYYY-MM-DD.ts
 * 2. Fill slides to match private/sync/YYYY-MM-DD-founder-sync.md
 * 3. Register in src/sync/registry.ts
 */
import type { SyncDeck } from '../types';

export const deckYYYYMMDD: SyncDeck = {
  id: 'YYYY-MM-DD',
  date: 'Month D, YYYY',
  title: 'Founder Sync',
  founders: ['Josh', 'Aurora'],
  liveUrl: 'https://www.awakeapp.space',
  slides: [
    {
      kind: 'title',
      title: 'Awake — Founder Sync',
      subtitle: 'Month D, YYYY · Josh × Aurora',
      footer: 'Goal: decisions + ownership — not catch-up',
    },
    {
      kind: 'bullets',
      title: 'Artifacts since last sync',
      bullets: [
        '[Thing that exists] ✅',
        '[Or honestly: none yet — shipping before call: ___]',
      ],
    },
    {
      kind: 'two-column',
      title: 'Where we are',
      left: {
        title: 'Product',
        bullets: ['', '', ''],
      },
      right: {
        title: 'GTM / users',
        bullets: ['', '', ''],
      },
    },
    {
      kind: 'bullets',
      title: 'One product bet — next 14 days',
      subtitle: 'Success metric: ___',
      bullets: [''],
    },
    {
      kind: 'decisions',
      title: 'Decisions needed today',
      bullets: ['', ''],
    },
    {
      kind: 'table',
      title: 'Ownership — next 14 days',
      headers: ['Artifact', 'Owner', 'Tier'],
      rows: [{ cells: ['', '', 'Bronze'] }],
    },
    {
      kind: 'two-column',
      title: 'Asks',
      left: { title: 'Josh', bullets: [''] },
      right: { title: 'Aurora', bullets: ['(fill in on call)'] },
    },
    {
      kind: 'close',
      title: 'Close',
      subtitle: 'Last 2 minutes',
      bullets: [
        'Next sync date: ___________',
        'Josh ships: ___________',
        'Aurora ships: ___________',
        'One sentence we agreed on: ___________',
      ],
    },
  ],
};
