import type { SyncDeck } from './types';

export const deck20260617: SyncDeck = {
  id: '2026-06-17',
  date: 'June 17, 2026',
  title: 'Founder Sync',
  founders: ['Josh', 'Aurora'],
  liveUrl: 'https://www.awakeapp.space',
  slides: [
    {
      kind: 'title',
      title: 'Awake — Founder Sync',
      subtitle: 'June 17, 2026 · Josh × Aurora',
      footer: 'Goal: decisions + ownership — not catch-up',
    },
    {
      kind: 'bullets',
      title: 'Artifacts since last sync',
      bullets: [
        'Auth + profile persistence — signup, cloud save, cross-device sync ✅',
        'Signup flow fixes — confirm email, redirect, save verification ✅',
        'Dashboard rebuild — daily loop: check in → show up → move ✅',
        'Drag-and-drop widgets + Daily Challenge + Artifact Vault ✅',
        'This deck + one-pager sent before call ✅',
        'Google Sign-In — off for now (email beta only)',
        'Email list / origin post — not started',
        '5 beta users complete one session — not started',
      ],
    },
    {
      kind: 'two-column',
      title: 'Where we are',
      left: {
        title: 'Product',
        bullets: [
          'Live at awakeapp.space',
          'Bounded daily session — not a generic dashboard',
          'Loa = one entry point (mirror, not task list)',
          'Works offline in principle — app is sync layer',
        ],
      },
      right: {
        title: 'GTM / users',
        bullets: [
          'Elwyn feedback: got lost — we rebuilt around one loop',
          'Need 5–10 people who finish one session',
          'Bitcoin 100-day closed',
          'Gold target: 50 email signups',
        ],
      },
    },
    {
      kind: 'table',
      title: 'Auth status (beta)',
      headers: ['Flow', 'Status', 'Notes'],
      rows: [
        { cells: ['Email signup', '✅', 'Profile saves on Enter The Grid'] },
        { cells: ['Email sign-in', '✅', 'Skips onboarding if profile exists'] },
        { cells: ['Cross-device', '✅', 'Live ↔ localhost verified'] },
        { cells: ['Google', 'Off', 'Deferred — email only for now'] },
        { cells: ['Guest', '✅', 'Local until sign-in'] },
      ],
    },
    {
      kind: 'bullets',
      title: 'One product bet — next 14 days',
      subtitle: 'Master the controller before leveling up',
      bullets: [
        'Awake = bounded daily container with clear feedback',
        'Check in → show up → move → session complete → artifact (optional)',
        'Pick ONE metric together today:',
        '  · 5 beta users complete one session without getting lost',
        '  · OR 50 email signups (origin post + capture page)',
        '  · OR both — agree realistic split',
      ],
    },
    {
      kind: 'decisions',
      title: 'Decisions needed today',
      bullets: [
        '14-day metric — product vs GTM vs both?',
        'Discord now vs after 5 successful sessions?',
        'Content split — Josh: product/Substack · Aurora: TikTok · email: shared?',
        'Standing sync cadence + weekly artifact quota?',
        'Josh bandwidth — school + Awake: what is realistic?',
      ],
    },
    {
      kind: 'table',
      title: 'Ownership — next 14 days',
      headers: ['Artifact', 'Owner', 'Tier'],
      rows: [
        { cells: ['Beta invite list (5 names) + copy', 'Aurora', 'Bronze'] },
        { cells: ['Fresh-eyes UX audit on live app', 'Aurora', 'Bronze'] },
        { cells: ['2 TikTok problem-space videos', 'Aurora', 'Bronze'] },
        { cells: ['Origin story Substack draft/post', 'Josh', 'Silver'] },
        { cells: ['Email capture on landing', 'Josh', 'Silver'] },
        { cells: ['One-pager before each sync', 'Both', 'Bronze'] },
      ],
    },
    {
      kind: 'bullets',
      title: 'Demo script (~5 min)',
      bullets: [
        '1. Sign in at awakeapp.space',
        '2. Daily loop card — check in → show up → move',
        '3. Daily Challenge — set container, log show-up',
        '4. Artifact Vault — drop today\'s proof',
        '5. Talk to Loa — single entry at bottom',
        '6. Second device / incognito — profile restores',
      ],
    },
    {
      kind: 'two-column',
      title: 'Asks',
      left: {
        title: 'Josh',
        bullets: [
          'Controller before content — agree?',
          'What would Elwyn find clearer now?',
          'Realistic sprint given school?',
        ],
      },
      right: {
        title: 'Aurora',
        bullets: [
          '(fill in on the call)',
          '',
          '',
        ],
      },
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
