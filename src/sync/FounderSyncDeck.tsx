import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { SyncDeck, SyncSlide } from './types';
import { listSyncDeckIds } from './registry';

interface FounderSyncDeckProps {
  deck: SyncDeck;
}

function SlideContent({ slide }: { slide: SyncSlide }) {
  switch (slide.kind) {
    case 'title':
      return (
        <div className="text-center">
          <p className="mb-3 text-sm uppercase tracking-[0.25em] text-teal-400/70">
            {slide.subtitle}
          </p>
          <h1 className="text-4xl font-medium md:text-5xl">{slide.title}</h1>
          {slide.footer && (
            <p className="mt-8 text-base opacity-50">{slide.footer}</p>
          )}
        </div>
      );

    case 'bullets':
      return (
        <div className="max-w-3xl">
          <h2 className="mb-2 text-3xl font-medium">{slide.title}</h2>
          {slide.subtitle && (
            <p className="mb-6 text-lg opacity-60">{slide.subtitle}</p>
          )}
          <ul className="space-y-3 text-lg leading-relaxed opacity-85">
            {slide.bullets?.map((b, i) => (
              <li key={i} className={b.startsWith('  ') ? 'ml-6 opacity-70' : ''}>
                {b.startsWith('  ') ? b.trimStart() : `• ${b}`}
              </li>
            ))}
          </ul>
        </div>
      );

    case 'table':
      return (
        <div className="w-full max-w-4xl">
          <h2 className="mb-6 text-3xl font-medium">{slide.title}</h2>
          <div className="overflow-hidden rounded-xl border border-white/10">
            <table className="w-full text-left text-sm md:text-base">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.04]">
                  {slide.headers?.map((h) => (
                    <th key={h} className="px-4 py-3 font-medium opacity-60">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slide.rows?.map((row, i) => (
                  <tr key={i} className="border-b border-white/5 last:border-0">
                    {row.cells.map((cell, j) => (
                      <td key={j} className="px-4 py-3 opacity-85">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );

    case 'decisions':
      return (
        <div className="max-w-3xl">
          <h2 className="mb-8 text-3xl font-medium">{slide.title}</h2>
          <ol className="space-y-4 text-xl">
            {slide.bullets?.map((b, i) => (
              <li key={i} className="flex gap-4">
                <span className="shrink-0 font-medium text-indigo-400">{i + 1}.</span>
                <span className="opacity-85">{b}</span>
              </li>
            ))}
          </ol>
        </div>
      );

    case 'two-column':
      return (
        <div className="w-full max-w-5xl">
          <h2 className="mb-8 text-3xl font-medium">{slide.title}</h2>
          <div className="grid gap-8 md:grid-cols-2">
            {[slide.left, slide.right].map(
              (col) =>
                col && (
                  <div
                    key={col.title}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
                  >
                    <h3 className="mb-4 text-lg font-medium text-teal-300/90">
                      {col.title}
                    </h3>
                    <ul className="space-y-2 text-base opacity-80">
                      {col.bullets.filter(Boolean).map((b, i) => (
                        <li key={i}>• {b}</li>
                      ))}
                    </ul>
                  </div>
                )
            )}
          </div>
        </div>
      );

    case 'close':
      return (
        <div className="max-w-2xl">
          <h2 className="mb-2 text-3xl font-medium">{slide.title}</h2>
          {slide.subtitle && (
            <p className="mb-8 opacity-50">{slide.subtitle}</p>
          )}
          <ul className="space-y-4 text-xl opacity-80">
            {slide.bullets?.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>
      );

    default:
      return null;
  }
}

export function FounderSyncDeck({ deck }: FounderSyncDeckProps) {
  const [index, setIndex] = useState(0);
  const total = deck.slides.length;
  const slide = deck.slides[index];

  const next = useCallback(() => {
    setIndex((i) => Math.min(i + 1, total - 1));
  }, [total]);

  const prev = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        next();
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prev();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev]);

  const allDecks = listSyncDeckIds();

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{
        background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)',
      }}
    >
      <header className="flex items-center justify-between px-6 py-4 text-xs opacity-40">
        <span>Awake founder sync · {deck.date}</span>
        <div className="flex items-center gap-3">
          {deck.liveUrl && (
            <a href={deck.liveUrl} className="hover:text-teal-300 hover:opacity-100">
              {deck.liveUrl.replace('https://', '')}
            </a>
          )}
          {allDecks.length > 1 && (
            <span>{deck.id}</span>
          )}
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-8 pb-24 pt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
            className="w-full flex justify-center"
          >
            <SlideContent slide={slide} />
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 flex items-center justify-between border-t border-white/5 bg-black/40 px-6 py-4 backdrop-blur-sm">
        <button
          type="button"
          onClick={prev}
          disabled={index === 0}
          className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm opacity-60 transition-opacity hover:opacity-100 disabled:opacity-20"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>

        <div className="flex items-center gap-2">
          {deck.slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? 'w-6 bg-teal-400' : 'w-1.5 bg-white/20'
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs tabular-nums opacity-40">
            {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </span>
          <button
            type="button"
            onClick={next}
            disabled={index === total - 1}
            className="flex items-center gap-1 rounded-lg bg-white/10 px-3 py-2 text-sm transition-colors hover:bg-white/15 disabled:opacity-20"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </footer>
    </div>
  );
}

export function SyncDeckIndex() {
  const ids = listSyncDeckIds();

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-6 p-8"
      style={{
        background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)',
      }}
    >
      <h1 className="text-2xl font-medium">Founder sync decks</h1>
      <p className="max-w-md text-center text-sm opacity-50">
        Localhost only — weekly meeting slideshows. Arrow keys or click to navigate.
      </p>
      <ul className="space-y-2">
        {ids.map((id) => (
          <li key={id}>
            <a
              href={`/sync/${id}`}
              className="block rounded-xl border border-white/10 px-6 py-3 text-center hover:bg-white/5"
            >
              {id}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
