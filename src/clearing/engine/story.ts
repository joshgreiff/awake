import { hasBeat, loadWorld, saveWorld, type BeatId, type WorldState } from '../worldState';
import type { ClearingAudio } from './audio';
import type { HollowBuild } from './hollow';
import { HOLLOW } from './layout';
import type { Skylight } from './skylight';

/*
 * The mystery, in brief (developer notes — keep out of player-facing copy):
 *
 * The player has woken here before. A small craft came down in the hollow east of
 * the clearing; footprints lead from it to the fire. Beats:
 *
 *  arrival  Entering the hollow for the first time.
 *  panel    Reading the hull panel. One new log line per visit (sequence), then a
 *           wake-cycle counter that is always higher than the visits you remember.
 *  token    A worn tag lying in one of three places chosen per save (location).
 *           Once taken it rests by the fire on later visits (consequence).
 *  voice    A recorder that appears on the pond cairn only on a visit *after* the
 *           panel was read (sequence). Afterwards the cairn gains a stone each visit.
 *  signal   On visits after the hollow was found, the hull pulses once at a random
 *           time in the session (timing). Visible from the clearing.
 *
 * Unrecorded: the skylight may appear once in a long, still session. No text, no
 * state, no reward.
 */

export type WhisperKind = 'thought' | 'machine' | 'voice';

export interface Whisper {
  kind: WhisperKind;
  text: string;
  /** Seconds to wait before showing, relative to the previous whisper. */
  delay?: number;
}

export interface StoryContext {
  x: number;
  z: number;
  exploring: boolean;
  seated: boolean;
}

export interface Interaction {
  id: 'panel' | 'token' | 'voice';
  label: string;
  x: number;
  z: number;
}

const INTERACT_RANGE = 1.7;
const PANEL_LINES = [
  'VESSEL DORMANT · HULL INTEGRITY 41% · CREW AWAKE: 1',
  'NAV LOG DAMAGED · LAST ENTRY: “IF I FORGET AGAIN, FOLLOW THE FIRE.”',
  'MEMORY CORE: 3 OF 4 SECTORS UNREADABLE · 1 SECTOR TAGGED “HOME”',
];
const WAKE_OFFSET = 13;

let visitCountedThisPage = false;

export class Story {
  state: WorldState;
  private readonly hollow: HollowBuild;
  private readonly skylight: Skylight;
  private readonly onWhisper: (w: Whisper[]) => void;
  private audio: ClearingAudio | null = null;

  private sessionTime = 0;
  private begun = false;
  private signalAt: number | null = null;
  private signalDone = false;
  private wonderAt: number;
  private wonderEnd = -1;
  private wonderDone: boolean;
  private stillFor = 0;
  private lastX = 0;
  private lastZ = 0;
  private panelReadThisVisit = false;
  private tokenPlace: 'field' | 'fire' | 'none' = 'none';
  private voiceVisible = false;

  constructor(hollow: HollowBuild, skylight: Skylight, onWhisper: (w: Whisper[]) => void) {
    this.hollow = hollow;
    this.skylight = skylight;
    this.onWhisper = onWhisper;
    this.state = loadWorld();
    this.wonderAt = 150 + Math.random() * 270;
    this.wonderDone = Math.random() > 0.65;
    this.applyState();
  }

  setAudio(audio: ClearingAudio | null): void {
    this.audio = audio;
  }

  /** Called when the player steps in. Counts one visit per page load. */
  beginVisit(): void {
    if (this.begun) return;
    this.begun = true;
    if (!visitCountedThisPage) {
      visitCountedThisPage = true;
      const now = new Date().toISOString();
      this.state.visits += 1;
      this.state.firstVisitAt ??= now;
      this.state.lastVisitAt = now;
      saveWorld(this.state);
    }
    if (this.beatBefore('arrival')) this.signalAt = 70 + Math.random() * 150;
    this.applyState();
  }

  /** Re-read state from storage, e.g. after a reset. */
  reload(): void {
    this.state = loadWorld();
    this.applyState();
  }

  update(dt: number, ctx: StoryContext): void {
    if (!ctx.exploring) return;
    this.sessionTime += dt;

    const moved = Math.hypot(ctx.x - this.lastX, ctx.z - this.lastZ);
    this.lastX = ctx.x;
    this.lastZ = ctx.z;
    this.stillFor = moved < dt * 0.15 ? this.stillFor + dt : 0;

    const hd = Math.hypot(ctx.x - HOLLOW.x, ctx.z - HOLLOW.z);
    if (hd < HOLLOW.r + 0.5 && !hasBeat(this.state, 'arrival')) {
      this.mark('arrival');
      this.audio?.chime(0.5);
      this.onWhisper([{ kind: 'thought', text: 'The trees here lean away from something.', delay: 0.6 }]);
    }

    if (this.panelReadThisVisit && hd > 9) this.hollow.setPanelLit(false);

    if (!this.signalDone && this.signalAt !== null && this.sessionTime > this.signalAt) {
      this.signalDone = true;
      this.hollow.signal();
      this.audio?.signal();
      if (!hasBeat(this.state, 'signal')) {
        this.mark('signal');
        this.onWhisper([{ kind: 'thought', text: 'Far off, something answers.', delay: 2.5 }]);
      }
    }

    if (!this.wonderDone && this.sessionTime > this.wonderAt && (this.stillFor > 6 || (ctx.seated && this.stillFor > 3))) {
      this.wonderDone = true;
      this.wonderEnd = this.sessionTime + 55;
      this.skylight.setTarget(1);
    }
    if (this.wonderEnd > 0 && this.sessionTime > this.wonderEnd) {
      this.wonderEnd = -1;
      this.skylight.setTarget(0);
    }
  }

  /** Dev/testing only: bring a timed event forward. */
  debugTrigger(name: 'signal' | 'sky'): void {
    if (name === 'signal') {
      this.signalDone = false;
      this.signalAt = this.sessionTime;
    } else {
      this.wonderDone = false;
      this.wonderAt = 0;
      this.stillFor = 99;
    }
  }

  nearest(x: number, z: number): Interaction | null {
    const options: Interaction[] = [];
    const ps = this.hollow.panelSpot;
    options.push({ id: 'panel', label: 'Look closer', x: ps.x, z: ps.z });
    if (this.tokenPlace === 'field') {
      const t = this.hollow.tokenSpots[this.tokenSpot()];
      options.push({ id: 'token', label: 'Pick it up', x: t.x, z: t.z });
    }
    if (this.voiceVisible) {
      const c = this.hollow.cairnTop;
      options.push({ id: 'voice', label: 'Listen', x: c.x, z: c.z });
    }
    let best: Interaction | null = null;
    let bestD = INTERACT_RANGE;
    for (const o of options) {
      const d = Math.hypot(o.x - x, o.z - z);
      if (d < bestD) {
        bestD = d;
        best = o;
      }
    }
    return best;
  }

  use(id: Interaction['id']): void {
    if (id === 'panel') this.readPanel();
    else if (id === 'token') this.takeToken();
    else if (id === 'voice') this.listen();
  }

  private readPanel(): void {
    const s = this.state;
    this.hollow.setPanelLit(true);
    const first = !hasBeat(s, 'panel');
    if (first) this.mark('panel');
    let line: string;
    if (s.panelVisit !== s.visits && s.panelLines < PANEL_LINES.length) {
      line = PANEL_LINES[s.panelLines];
      s.panelLines += 1;
      s.panelVisit = s.visits;
      saveWorld(s);
    } else if (s.panelVisit === s.visits && s.panelLines > 0) {
      line = PANEL_LINES[s.panelLines - 1];
    } else {
      line = `WAKE CYCLES LOGGED: ${s.visits + WAKE_OFFSET} · NO NEW ENTRIES`;
    }
    this.panelReadThisVisit = true;
    this.audio?.chime(first ? 0.6 : 0.3);
    this.onWhisper([{ kind: 'machine', text: line, delay: 0.5 }]);
  }

  private takeToken(): void {
    this.mark('token');
    this.tokenPlace = 'none';
    this.hollow.setToken('none', 0);
    this.audio?.chime(0.7);
    this.onWhisper([
      { kind: 'thought', text: 'A thin metal tag. The name has been worn smooth by a thumb.', delay: 0.3 },
      { kind: 'thought', text: 'Maybe yours.', delay: 1.2 },
    ]);
  }

  private listen(): void {
    this.mark('voice');
    this.voiceVisible = false;
    this.hollow.setVoiceVisible(false);
    this.audio?.voice(this.hollow.cairnTop);
    this.onWhisper([
      { kind: 'machine', text: 'PLAYBACK · FRAGMENT 1 OF 1', delay: 0.2 },
      { kind: 'voice', text: '“…if you’re hearing this, you woke up again. That’s all right.”', delay: 1.4 },
      { kind: 'voice', text: '“Sit by the fire. Write it down this time.”', delay: 1.2 },
    ]);
  }

  private mark(id: BeatId): void {
    if (hasBeat(this.state, id)) return;
    this.state.beats[id] = new Date().toISOString();
    this.state.beatVisit[id] = this.state.visits;
    saveWorld(this.state);
  }

  /** True if the beat happened on an earlier visit than this one. */
  private beatBefore(id: BeatId): boolean {
    const v = this.state.beatVisit[id];
    return typeof v === 'number' && v < this.state.visits;
  }

  private tokenSpot(): number {
    return this.state.seed % this.hollow.tokenSpots.length;
  }

  private applyState(): void {
    const s = this.state;
    const tokenTaken = hasBeat(s, 'token');
    this.tokenPlace = !tokenTaken ? 'field' : this.beatBefore('token') ? 'fire' : 'none';
    this.hollow.setToken(this.tokenPlace, this.tokenSpot());

    this.voiceVisible = !hasBeat(s, 'voice') && this.beatBefore('panel');
    this.hollow.setVoiceVisible(this.voiceVisible);

    const voiceVisit = s.beatVisit.voice;
    this.hollow.setCairnExtra(typeof voiceVisit === 'number' ? Math.min(Math.max(s.visits - voiceVisit, 0), 4) : 0);
  }
}
