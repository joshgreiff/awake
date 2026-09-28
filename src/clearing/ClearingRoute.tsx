import { useCallback, useEffect, useRef, useState } from 'react';
import './clearing.css';
import { ClearingStill } from './ClearingStill';
import { ClearingAudio } from './engine/audio';
import { ClearingEngine, detectWebGL, type QualityMode, type WebGLSupport } from './engine/ClearingEngine';

type View = 'intro' | 'exploring' | 'still';
type StillReason = 'unsupported' | 'chosen' | 'error' | 'lost';

const QUALITY_LABELS: Record<QualityMode, string> = {
  auto: 'Auto',
  low: 'Light',
  high: 'Rich',
};

function mediaMatches(query: string): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.(query).matches === true;
}

export default function ClearingRoute() {
  const [support] = useState<WebGLSupport>(() => detectWebGL());
  const [touch] = useState(() => mediaMatches('(hover: none) and (pointer: coarse)'));
  const [reducedMotion] = useState(() => mediaMatches('(prefers-reduced-motion: reduce)'));
  const [view, setView] = useState<View>(() => (support === 'none' ? 'still' : 'intro'));
  const [stillReason, setStillReason] = useState<StillReason>(
    support === 'none' ? 'unsupported' : 'chosen',
  );
  const [forced3D, setForced3D] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [quality, setQuality] = useState<QualityMode>('auto');
  const [locked, setLocked] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [instructionsGone, setInstructionsGone] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ClearingEngine | null>(null);
  const audioRef = useRef<ClearingAudio | null>(null);
  const viewRef = useRef(view);
  viewRef.current = view;

  const wants3D = view !== 'still' && (support === 'ok' || forced3D);

  useEffect(() => {
    const previous = document.title;
    document.title = 'The Clearing · Awake';
    return () => {
      document.title = previous;
    };
  }, []);

  useEffect(() => {
    if (!wants3D || !containerRef.current) return;
    let engine: ClearingEngine;
    try {
      engine = new ClearingEngine(containerRef.current, {
        quality,
        touch,
        reducedMotion,
        onLockChange: setLocked,
        onFirstMove: () => setHasMoved(true),
        onContextLost: () => {
          setStillReason('lost');
          setView('still');
        },
      });
    } catch (err) {
      console.error('[clearing] failed to start 3D scene', err);
      setStillReason('error');
      setView('still');
      return;
    }
    engineRef.current = engine;
    if (audioRef.current?.isEnabled) engine.setAudio(audioRef.current);
    if (viewRef.current === 'exploring') engine.setExploring(true);
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
    // Quality is applied live below; recreating the scene for it would be wasteful.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wants3D, touch, reducedMotion]);

  useEffect(() => {
    engineRef.current?.setQuality(quality);
  }, [quality]);

  useEffect(() => {
    return () => {
      audioRef.current?.dispose();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!hasMoved) return;
    const t = window.setTimeout(() => setInstructionsGone(true), 5000);
    return () => window.clearTimeout(t);
  }, [hasMoved]);

  const toggleSound = useCallback(() => {
    if (!audioRef.current) audioRef.current = new ClearingAudio();
    const audio = audioRef.current;
    if (audio.isEnabled) {
      audio.disable();
      engineRef.current?.setAudio(null);
      setSoundOn(false);
    } else {
      void audio.enable().catch((err) => console.warn('[clearing] audio failed', err));
      engineRef.current?.setAudio(audio);
      setSoundOn(true);
    }
  }, []);

  const stepIn = useCallback(() => {
    setView('exploring');
    setShowHelp(false);
    engineRef.current?.setExploring(true);
  }, []);

  const openStill = useCallback(() => {
    engineRef.current?.setExploring(false);
    setStillReason('chosen');
    setView('still');
  }, []);

  const tryThreeD = useCallback(() => {
    setForced3D(true);
    setView('intro');
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      if (e.code === 'KeyM') toggleSound();
      else if (e.code === 'KeyH' || e.key === '?') setShowHelp((v) => !v);
      else if (e.code === 'Escape') setShowHelp(false);
      else if (e.code === 'Enter' && viewRef.current === 'intro' && (support === 'ok' || forced3D)) stepIn();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleSound, stepIn, support, forced3D]);

  const cycleQuality = () => {
    setQuality((q) => (q === 'auto' ? 'high' : q === 'high' ? 'low' : 'auto'));
  };

  const moveInstructions = touch ? (
    <>
      <span>Hold the left side to walk</span>
      <span aria-hidden>·</span>
      <span>Drag the right side to look</span>
    </>
  ) : (
    <>
      <span>
        <kbd className="clearing-kbd">W</kbd> <kbd className="clearing-kbd">A</kbd>{' '}
        <kbd className="clearing-kbd">S</kbd> <kbd className="clearing-kbd">D</kbd> walk
      </span>
      <span aria-hidden>·</span>
      <span>mouse to look</span>
      <span aria-hidden>·</span>
      <span>
        <kbd className="clearing-kbd">Shift</kbd> wander faster
      </span>
      <span aria-hidden>·</span>
      <span>
        <kbd className="clearing-kbd">Esc</kbd> free the cursor
      </span>
    </>
  );

  return (
    <div className="clearing-root">
      {view === 'still' ? (
        <ClearingStill />
      ) : (
        <div ref={containerRef} className="clearing-canvas" />
      )}
      <div className="clearing-vignette" />
      <div className="clearing-grain" />

      <div className="clearing-ui pointer-events-none absolute inset-0">
        <div className="pointer-events-auto absolute right-3 top-3 flex items-center gap-2 text-xs sm:right-5 sm:top-5 sm:text-sm">
          <button
            type="button"
            onClick={toggleSound}
            className="clearing-button flex items-center gap-2 rounded-full px-3 py-1.5"
            aria-pressed={soundOn}
            aria-label={soundOn ? 'Turn sound off' : 'Turn sound on'}
          >
            <SoundIcon on={soundOn} />
            <span>{soundOn ? 'Sound on' : 'Sound off'}</span>
          </button>
          {view !== 'still' && (
            <button
              type="button"
              onClick={cycleQuality}
              className="clearing-button rounded-full px-3 py-1.5"
              title="Visual quality"
            >
              {QUALITY_LABELS[quality]}
            </button>
          )}
          {view === 'exploring' && (
            <button
              type="button"
              onClick={() => setShowHelp((v) => !v)}
              className="clearing-button rounded-full px-3 py-1.5"
              aria-expanded={showHelp}
              aria-label="How to move"
            >
              ?
            </button>
          )}
        </div>

        <a
          href="/"
          className="clearing-button pointer-events-auto absolute left-3 top-3 rounded-full px-3 py-1.5 text-xs no-underline sm:left-5 sm:top-5 sm:text-sm"
        >
          ← Awake
        </a>

        {view === 'intro' && (
          <div className="clearing-intro-bg clearing-fade pointer-events-auto absolute inset-0 flex items-end justify-center px-6 pb-8 sm:pb-12">
            <div className="max-w-lg text-center">
              <p className="mb-2 text-[11px] uppercase tracking-[0.35em] text-[#f3eadb]/55">
                Awake · prototype
              </p>
              <h1
                className="mb-3 text-4xl font-normal text-[#fbf2e4] sm:text-5xl"
                style={{ fontFamily: "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif" }}
              >
                The Clearing
              </h1>
              <p
                className="mb-6 text-base leading-relaxed text-[#f3eadb]/80 sm:text-lg"
                style={{ fontFamily: "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif" }}
              >
                A small clearing at the edge of the forest. Someone left the fire going. There is
                nothing to do here. Stay as long as you like.
              </p>

              {support === 'slow' && !forced3D ? (
                <div className="mb-6 space-y-3">
                  <p className="text-sm text-[#f3eadb]/70">
                    This device may struggle with the 3D scene.
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <button type="button" onClick={tryThreeD} className="clearing-button clearing-button-primary rounded-full px-6 py-2.5">
                      Try it anyway
                    </button>
                    <button type="button" onClick={openStill} className="clearing-button rounded-full px-6 py-2.5">
                      Open the still view
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={stepIn}
                  autoFocus
                  className="clearing-button clearing-button-primary mb-6 rounded-full px-8 py-3 text-base"
                >
                  Step in
                </button>
              )}

              <div className="mb-6 flex flex-col items-center gap-2 text-sm text-[#f3eadb]/75">
                <button
                  type="button"
                  onClick={toggleSound}
                  className="clearing-button flex items-center gap-2 rounded-full px-4 py-2"
                  aria-pressed={soundOn}
                >
                  <SoundIcon on={soundOn} />
                  {soundOn ? 'Sound is on' : 'Turn on sound'}
                </button>
                <span className="text-xs text-[#f3eadb]/50">Best with headphones. Press M anytime.</span>
              </div>

              <div className="flex flex-wrap justify-center gap-x-2 gap-y-1 text-xs text-[#f3eadb]/60">
                {moveInstructions}
              </div>

              {(support === 'ok' || forced3D) && (
                <button
                  type="button"
                  onClick={openStill}
                  className="mt-6 text-xs text-[#f3eadb]/45 underline decoration-dotted underline-offset-4 hover:text-[#f3eadb]/70"
                >
                  Scene running slowly? Open a still view instead
                </button>
              )}
            </div>
          </div>
        )}

        {view === 'exploring' && !touch && !locked && !showHelp && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="clearing-hint rounded-full px-4 py-2 text-sm text-[#f3eadb]/85">
              Click to look around
            </div>
          </div>
        )}

        {view === 'exploring' && !instructionsGone && !showHelp && (
          <div
            className="absolute inset-x-0 bottom-6 flex justify-center px-4 transition-opacity duration-1000"
            style={{ opacity: hasMoved ? 0 : 1 }}
          >
            <div className="clearing-hint flex flex-wrap justify-center gap-x-2 gap-y-1 rounded-2xl px-4 py-2 text-xs text-[#f3eadb]/80 sm:text-sm">
              {moveInstructions}
            </div>
          </div>
        )}

        {view === 'exploring' && showHelp && (
          <div className="pointer-events-auto absolute inset-0 flex items-center justify-center px-6">
            <div className="clearing-hint max-w-sm rounded-2xl px-6 py-5 text-sm text-[#f3eadb]/85">
              <h2 className="mb-3 text-base font-medium text-[#fbf2e4]">Moving around</h2>
              {touch ? (
                <ul className="space-y-1.5">
                  <li>Hold and drag on the left half of the screen to walk.</li>
                  <li>Drag on the right half to look around.</li>
                </ul>
              ) : (
                <ul className="space-y-1.5">
                  <li><kbd className="clearing-kbd">W A S D</kbd> or arrow keys to walk</li>
                  <li>Mouse to look (click the scene first)</li>
                  <li><kbd className="clearing-kbd">Q</kbd> <kbd className="clearing-kbd">E</kbd> or ← → to turn without a mouse</li>
                  <li><kbd className="clearing-kbd">Shift</kbd> to wander faster</li>
                  <li><kbd className="clearing-kbd">Esc</kbd> to free the cursor</li>
                </ul>
              )}
              <ul className="mt-3 space-y-1.5 text-[#f3eadb]/65">
                <li><kbd className="clearing-kbd">M</kbd> sound on or off</li>
                <li><kbd className="clearing-kbd">H</kbd> show or hide this</li>
              </ul>
              <div className="mt-4 flex gap-3">
                <button type="button" onClick={() => setShowHelp(false)} className="clearing-button rounded-full px-4 py-1.5">
                  Back to the fire
                </button>
                <button type="button" onClick={openStill} className="clearing-button rounded-full px-4 py-1.5 text-[#f3eadb]/70">
                  Still view
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'still' && (
          <div className="clearing-fade pointer-events-auto absolute inset-x-0 top-16 flex justify-center px-6 sm:top-20">
            <div className="clearing-hint max-w-md rounded-2xl px-5 py-4 text-center text-sm text-[#f3eadb]/85">
              <p className="mb-3">
                {stillReason === 'unsupported' &&
                  'This browser can’t run the 3D clearing, so here is a quiet view of it. Sound still works.'}
                {stillReason === 'error' && 'The 3D scene couldn’t start on this device. Here is a quiet view instead.'}
                {stillReason === 'lost' && 'The graphics driver interrupted the scene. You can sit here, or try again.'}
                {stillReason === 'chosen' && 'A still view of the clearing. Sound still works.'}
              </p>
              {support !== 'none' && (
                <button type="button" onClick={tryThreeD} className="clearing-button rounded-full px-4 py-1.5">
                  Return to the 3D clearing
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SoundIcon({ on }: { on: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 9h4l5-4v14l-5-4H4z" strokeLinejoin="round" />
      {on ? (
        <>
          <path d="M16.5 8.5a5 5 0 0 1 0 7" strokeLinecap="round" />
          <path d="M19 6a8.5 8.5 0 0 1 0 12" strokeLinecap="round" />
        </>
      ) : (
        <path d="M17 9l5 6M22 9l-5 6" strokeLinecap="round" />
      )}
    </svg>
  );
}
