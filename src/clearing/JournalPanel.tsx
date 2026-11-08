import { useEffect, useMemo, useRef, useState } from 'react';
import {
  addEntry,
  availablePrompts,
  deleteEntry,
  loadJournal,
  saveDraft,
  type JournalData,
  type JournalEntry,
} from './journal';

type Tab = 'write' | 'past';
type Status = { kind: 'idle' | 'draft' | 'saved' | 'error'; text: string };

const DRAFT_DELAY = 600;

interface JournalPanelProps {
  onClose(): void;
  onSaved(entry: JournalEntry): void;
}

function pickPrompt(current?: string): string {
  const options = availablePrompts().filter((p) => p !== current);
  return options[Math.floor(Math.random() * options.length)];
}

function formatDay(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

function formatStamp(iso: string): string {
  const d = new Date(iso);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  const day = d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${day} · ${time}`;
}

export function JournalPanel({ onClose, onSaved }: JournalPanelProps) {
  const [journal, setJournal] = useState<JournalData>(() => loadJournal());
  const [tab, setTab] = useState<Tab>('write');
  const [text, setText] = useState(() => journal.draft?.text ?? '');
  const [prompt, setPrompt] = useState<string | undefined>(() => journal.draft?.prompt);
  const [status, setStatus] = useState<Status>(() =>
    journal.draft?.text ? { kind: 'draft', text: 'Picking up where you left off' } : { kind: 'idle', text: '' },
  );
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const journalRef = useRef(journal);
  journalRef.current = journal;
  const pending = useRef<{ text: string; prompt?: string } | null>(null);

  const today = useMemo(() => formatDay(new Date()), []);

  const flushDraft = () => {
    const p = pending.current;
    if (!p) return;
    pending.current = null;
    const result = saveDraft(journalRef.current, p.text, p.prompt);
    journalRef.current = result.data;
    setJournal(result.data);
    setStatus(
      result.ok
        ? { kind: 'draft', text: p.text.trim() ? 'Draft kept' : '' }
        : { kind: 'error', text: 'This browser isn’t letting the clearing keep drafts.' },
    );
  };

  useEffect(() => {
    if (!pending.current) return;
    const t = window.setTimeout(flushDraft, DRAFT_DELAY);
    return () => window.clearTimeout(t);
  });

  useEffect(() => () => flushDraft(), []);

  useEffect(() => {
    if (tab === 'write') textareaRef.current?.focus({ preventScroll: true });
  }, [tab]);

  const edit = (nextText: string, nextPrompt: string | undefined) => {
    setText(nextText);
    setPrompt(nextPrompt);
    pending.current = { text: nextText, prompt: nextPrompt };
    if (status.kind === 'saved' || status.kind === 'error') setStatus({ kind: 'idle', text: '' });
  };

  const canSave = text.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    pending.current = null;
    const result = addEntry(journalRef.current, text, prompt);
    if (!result.ok) {
      setStatus({ kind: 'error', text: 'Couldn’t save here. Your words are still on the page.' });
      return;
    }
    journalRef.current = result.data;
    setJournal(result.data);
    setText('');
    setPrompt(undefined);
    setStatus({ kind: 'saved', text: 'Kept by the fire' });
    onSaved(result.entry);
  };

  const remove = (id: string) => {
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      return;
    }
    const result = deleteEntry(journalRef.current, id);
    journalRef.current = result.data;
    setJournal(result.data);
    setConfirmDelete(null);
    setOpenId(null);
  };

  const count = journal.entries.length;

  return (
    <div className="clearing-journal-backdrop pointer-events-auto absolute inset-0 flex items-center justify-center p-3 sm:p-6">
      <section
        className="clearing-journal flex w-full max-w-[640px] flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="clearing-journal-title"
      >
        <header className="flex items-start justify-between gap-4 px-6 pt-5 sm:px-8 sm:pt-7">
          <div>
            <p className="clearing-journal-eyebrow">The Clearing · journal</p>
            <h2 id="clearing-journal-title" className="clearing-journal-title">
              {tab === 'write' ? today : 'Past entries'}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="clearing-journal-close" aria-label="Close journal">
            ×
          </button>
        </header>

        <nav className="clearing-journal-tabs mx-6 mt-3 flex gap-5 sm:mx-8" aria-label="Journal sections">
          <button type="button" onClick={() => setTab('write')} aria-current={tab === 'write'}>
            Write
          </button>
          <button type="button" onClick={() => setTab('past')} aria-current={tab === 'past'}>
            Past entries{count > 0 ? ` · ${count}` : ''}
          </button>
        </nav>

        {tab === 'write' ? (
          <>
            <div className="flex min-h-0 flex-1 flex-col px-6 pt-4 sm:px-8">
              {prompt ? (
                <div className="clearing-journal-prompt mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="flex-1 basis-64">{prompt}</p>
                  <span className="flex gap-3 text-[13px]">
                    <button type="button" onClick={() => edit(text, pickPrompt(prompt))}>
                      another
                    </button>
                    <button type="button" onClick={() => edit(text, undefined)}>
                      no prompt
                    </button>
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  className="clearing-journal-link mb-2 self-start"
                  onClick={() => edit(text, pickPrompt())}
                >
                  Offer me a prompt
                </button>
              )}
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => edit(e.target.value, prompt)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    save();
                  }
                }}
                className="clearing-journal-page min-h-[220px] flex-1"
                placeholder="Whatever comes…"
                aria-label="Journal entry"
                spellCheck
              />
            </div>
            <footer className="flex flex-wrap items-center justify-between gap-3 px-6 pb-5 pt-3 sm:px-8 sm:pb-6">
              <div className="min-w-0 flex-1 basis-48">
                <p className={`clearing-journal-status ${status.kind === 'error' ? 'is-error' : ''}`} aria-live="polite">
                  {status.text || '\u00a0'}
                </p>
                <p className="clearing-journal-note">Kept only on this device.</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={onClose} className="clearing-journal-ghost">
                  Close
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={!canSave}
                  className="clearing-journal-save"
                  title="Save entry (⌘/Ctrl + Enter)"
                >
                  Save entry
                </button>
              </div>
            </footer>
          </>
        ) : (
          <div className="clearing-journal-history min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-4 sm:px-8">
            {count === 0 ? (
              <p className="clearing-journal-empty">
                Nothing here yet. Whatever you write by the fire will wait for you here.
              </p>
            ) : (
              <ol className="space-y-1">
                {journal.entries.map((entry) => {
                  const open = openId === entry.id;
                  return (
                    <li key={entry.id} className={`clearing-journal-entry ${open ? 'is-open' : ''}`}>
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() => {
                          setOpenId(open ? null : entry.id);
                          setConfirmDelete(null);
                        }}
                        aria-expanded={open}
                      >
                        <span className="clearing-journal-stamp">{formatStamp(entry.createdAt)}</span>
                        {entry.prompt && <span className="clearing-journal-entry-prompt">{entry.prompt}</span>}
                        <span className={`clearing-journal-entry-text ${open ? '' : 'is-clamped'}`}>{entry.text}</span>
                      </button>
                      {open && (
                        <div className="mt-2 flex justify-end">
                          <button type="button" className="clearing-journal-link is-quiet" onClick={() => remove(entry.id)}>
                            {confirmDelete === entry.id ? 'Delete for good?' : 'Delete'}
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
