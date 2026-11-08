/**
 * The Clearing's journal lives only in this browser's localStorage.
 *
 * The key deliberately sits outside the `awake_` namespace: those keys are synced to
 * the cloud and wiped by `clearLocalAwakeData()` on sign-out. Nothing here is ever
 * sent anywhere.
 */
import { hasBeat, loadWorld, type BeatId } from './worldState';

export const JOURNAL_KEY = 'clearing_journal_v1';

export interface JournalEntry {
  id: string;
  createdAt: string;
  updatedAt: string;
  text: string;
  prompt?: string;
}

export interface JournalDraft {
  text: string;
  prompt?: string;
  updatedAt: string;
}

export interface JournalData {
  version: 1;
  entries: JournalEntry[];
  draft: JournalDraft | null;
}

export const JOURNAL_PROMPTS = [
  'What are you carrying tonight that you could set down?',
  'What did today ask of you?',
  'Name one small thing that went right.',
  'What would you like to remember about this moment?',
  'Who has been on your mind lately?',
  'What feels unfinished, and does it need to be finished?',
  'What are you grateful for that you rarely say out loud?',
  'If tomorrow went gently, what would it look like?',
  'What is the fire saying to you?',
  'What have you been avoiding feeling?',
  'Where did you feel most like yourself this week?',
  'What do you want to let burn away?',
];

/** Prompts that join the pool once the matching world beat has happened (see engine/story.ts). */
const BEAT_PROMPTS: Partial<Record<BeatId, string>> = {
  arrival: 'Where do you think you were going, before all this?',
  panel: 'What would you want to find written about yourself?',
  token: 'If you could choose your name again, what would it be?',
  voice: 'What do you want to remember the next time you wake?',
  signal: 'Who might be listening for you?',
};

export function availablePrompts(): string[] {
  const world = loadWorld();
  const extra = (Object.keys(BEAT_PROMPTS) as BeatId[])
    .filter((id) => hasBeat(world, id))
    .map((id) => BEAT_PROMPTS[id]!);
  return [...JOURNAL_PROMPTS, ...extra];
}

const EMPTY: JournalData = { version: 1, entries: [], draft: null };

function isEntry(v: unknown): v is JournalEntry {
  if (!v || typeof v !== 'object') return false;
  const e = v as Record<string, unknown>;
  return (
    typeof e.id === 'string' &&
    typeof e.createdAt === 'string' &&
    typeof e.updatedAt === 'string' &&
    typeof e.text === 'string' &&
    (e.prompt === undefined || typeof e.prompt === 'string')
  );
}

function isDraft(v: unknown): v is JournalDraft {
  if (!v || typeof v !== 'object') return false;
  const d = v as Record<string, unknown>;
  return (
    typeof d.text === 'string' &&
    typeof d.updatedAt === 'string' &&
    (d.prompt === undefined || typeof d.prompt === 'string')
  );
}

export function loadJournal(): JournalData {
  try {
    const raw = window.localStorage.getItem(JOURNAL_KEY);
    if (!raw) return { ...EMPTY, entries: [] };
    const parsed = JSON.parse(raw) as Partial<JournalData>;
    const entries = Array.isArray(parsed.entries) ? parsed.entries.filter(isEntry) : [];
    entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { version: 1, entries, draft: isDraft(parsed.draft) ? parsed.draft : null };
  } catch {
    return { ...EMPTY, entries: [] };
  }
}

/** Returns false when the browser refuses to store (private mode, quota, disabled storage). */
function persist(data: JournalData): boolean {
  try {
    window.localStorage.setItem(JOURNAL_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function saveDraft(data: JournalData, text: string, prompt?: string): { data: JournalData; ok: boolean } {
  const draft = text.trim() || prompt ? { text, prompt, updatedAt: new Date().toISOString() } : null;
  const next = { ...data, draft };
  return { data: next, ok: persist(next) };
}

export function addEntry(
  data: JournalData,
  text: string,
  prompt?: string,
): { data: JournalData; entry: JournalEntry; ok: boolean } {
  const now = new Date().toISOString();
  const entry: JournalEntry = { id: newId(), createdAt: now, updatedAt: now, text: text.trim(), prompt };
  const next: JournalData = { version: 1, entries: [entry, ...data.entries], draft: null };
  return { data: next, entry, ok: persist(next) };
}

export function deleteEntry(data: JournalData, id: string): { data: JournalData; ok: boolean } {
  const next = { ...data, entries: data.entries.filter((e) => e.id !== id) };
  return { data: next, ok: persist(next) };
}
