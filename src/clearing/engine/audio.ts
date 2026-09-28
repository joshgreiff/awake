import { mulberry32 } from './noise';

interface Pose {
  x: number;
  y: number;
  z: number;
  fx: number;
  fy: number;
  fz: number;
}

interface CricketVoice {
  panner: PannerNode;
  freq: number;
  next: number;
  chirpsLeft: number;
  interval: number;
}

const LOOKAHEAD = 0.3;
const MASTER_LEVEL = 0.85;

/**
 * Night ambience synthesised in Web Audio: wind, leaves, a spatialised fire with
 * crackles, crickets at the tree line and an occasional distant owl. No audio files.
 */
export class ClearingAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private reverbSend: GainNode | null = null;
  private fireBus: GainNode | null = null;
  private fireRoar: GainNode | null = null;
  private white: AudioBuffer | null = null;
  private timer: number | null = null;
  private enabled = false;
  private rng = mulberry32(2024);
  private crickets: CricketVoice[] = [];
  private nextCrackle = 0;
  private nextOwl = 0;
  private fireLevel = 1;
  private suspendTimer: number | null = null;

  get isEnabled(): boolean {
    return this.enabled;
  }

  /** Must be called from a user gesture the first time. */
  async enable(): Promise<void> {
    if (!this.ctx) this.build();
    const ctx = this.ctx!;
    this.enabled = true;
    if (this.suspendTimer !== null) {
      window.clearTimeout(this.suspendTimer);
      this.suspendTimer = null;
    }
    await ctx.resume();
    const now = ctx.currentTime;
    const g = this.master!.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(MASTER_LEVEL, now + 2.5);
    this.nextCrackle = now + 0.1;
    if (this.nextOwl < now) this.nextOwl = now + 18 + this.rng() * 25;
    for (const c of this.crickets) if (c.next < now) c.next = now + this.rng() * 2;
    if (this.timer === null) this.timer = window.setInterval(this.schedule, 80);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  disable(): void {
    this.enabled = false;
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    const g = this.master.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0, now + 0.6);
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.suspendTimer = window.setTimeout(() => {
      this.suspendTimer = null;
      if (!this.enabled) void this.ctx?.suspend();
    }, 700);
  }

  setFireLevel(level: number): void {
    this.fireLevel = level;
    if (this.fireRoar && this.ctx) {
      this.fireRoar.gain.setTargetAtTime(0.16 + level * 0.1, this.ctx.currentTime, 0.1);
    }
  }

  updateListener(pose: Pose): void {
    if (!this.ctx || !this.enabled) return;
    const l = this.ctx.listener;
    const t = this.ctx.currentTime;
    if (l.positionX) {
      l.positionX.setTargetAtTime(pose.x, t, 0.02);
      l.positionY.setTargetAtTime(pose.y, t, 0.02);
      l.positionZ.setTargetAtTime(pose.z, t, 0.02);
      l.forwardX.setTargetAtTime(pose.fx, t, 0.02);
      l.forwardY.setTargetAtTime(pose.fy, t, 0.02);
      l.forwardZ.setTargetAtTime(pose.fz, t, 0.02);
      l.upX.value = 0;
      l.upY.value = 1;
      l.upZ.value = 0;
    } else {
      l.setPosition(pose.x, pose.y, pose.z);
      l.setOrientation(pose.fx, pose.fy, pose.fz, 0, 1, 0);
    }
  }

  dispose(): void {
    this.enabled = false;
    if (this.timer !== null) window.clearInterval(this.timer);
    if (this.suspendTimer !== null) window.clearTimeout(this.suspendTimer);
    this.timer = null;
    document.removeEventListener('visibilitychange', this.onVisibility);
    void this.ctx?.close();
    this.ctx = null;
  }

  private onVisibility = () => {
    if (!this.ctx) return;
    if (document.hidden) void this.ctx.suspend();
    else if (this.enabled) void this.ctx.resume();
  };

  private build(): void {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctor({ latencyHint: 'playback' });
    this.ctx = ctx;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.ratio.value = 3;
    compressor.connect(ctx.destination);

    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(compressor);
    this.master = master;

    const reverb = ctx.createConvolver();
    reverb.buffer = this.impulse(3.2);
    const reverbOut = ctx.createGain();
    reverbOut.gain.value = 0.55;
    reverb.connect(reverbOut).connect(master);
    const reverbSend = ctx.createGain();
    reverbSend.gain.value = 1;
    reverbSend.connect(reverb);
    this.reverbSend = reverbSend;

    this.white = this.noiseBuffer(3, 'white');
    const brown = this.noiseBuffer(6, 'brown');

    // Wind: slow-breathing brown noise.
    const wind = this.loop(brown);
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 380;
    windFilter.Q.value = 0.6;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.26;
    wind.connect(windFilter).connect(windGain).connect(master);
    this.lfo(0.037, 220, windFilter.frequency);
    this.lfo(0.061, 0.12, windGain.gain);

    // Leaves: faint high rustle that swells with the wind.
    const leaves = this.loop(this.white, 1.3);
    const leafFilter = ctx.createBiquadFilter();
    leafFilter.type = 'bandpass';
    leafFilter.frequency.value = 3200;
    leafFilter.Q.value = 0.5;
    const leafGain = ctx.createGain();
    leafGain.gain.value = 0.012;
    leaves.connect(leafFilter).connect(leafGain).connect(master);
    leafGain.connect(reverbSend);
    this.lfo(0.043, 0.009, leafGain.gain);

    // Fire: spatialised low roar + hiss, crackles scheduled on top.
    const firePanner = this.panner(0, 0.5, 0, 1.6, 1.15, 'HRTF');
    firePanner.connect(master);
    const fireBus = ctx.createGain();
    fireBus.gain.value = 1;
    fireBus.connect(firePanner);
    const fireSend = ctx.createGain();
    fireSend.gain.value = 0.25;
    fireBus.connect(fireSend).connect(reverbSend);
    this.fireBus = fireBus;

    const roar = this.loop(brown, 0.8);
    const roarFilter = ctx.createBiquadFilter();
    roarFilter.type = 'lowpass';
    roarFilter.frequency.value = 520;
    const roarGain = ctx.createGain();
    roarGain.gain.value = 0.24;
    roar.connect(roarFilter).connect(roarGain).connect(fireBus);
    this.fireRoar = roarGain;
    this.lfo(0.27, 0.05, roarGain.gain);

    const hiss = this.loop(this.white, 0.7);
    const hissFilter = ctx.createBiquadFilter();
    hissFilter.type = 'highpass';
    hissFilter.frequency.value = 2600;
    const hissGain = ctx.createGain();
    hissGain.gain.value = 0.01;
    hiss.connect(hissFilter).connect(hissGain).connect(fireBus);

    // Crickets around the tree line, each with its own pitch and rhythm.
    const spots = [
      [-14, 0.3, 6],
      [13, 0.3, 9],
      [-8, 0.3, -15],
      [17, 0.3, -6],
      [2, 0.3, 17],
    ];
    this.crickets = spots.map(([x, y, z], i) => {
      const panner = this.panner(x, y, z, 5, 0.9, 'equalpower');
      panner.connect(master);
      const send = ctx.createGain();
      send.gain.value = 0.35;
      panner.connect(send).connect(reverbSend);
      return {
        panner,
        freq: 4300 + i * 140 + this.rng() * 90,
        next: 0,
        chirpsLeft: 0,
        interval: 0.42 + this.rng() * 0.3,
      };
    });
  }

  private schedule = () => {
    const ctx = this.ctx;
    if (!ctx || !this.enabled) return;
    const horizon = ctx.currentTime + LOOKAHEAD;

    while (this.nextCrackle < horizon) {
      this.crackle(this.nextCrackle);
      const burst = this.rng() < 0.18;
      const base = 0.14 / Math.max(this.fireLevel, 0.4);
      this.nextCrackle += burst ? 0.015 + this.rng() * 0.05 : base * (0.3 + this.rng() * 2.4);
    }

    for (const c of this.crickets) {
      while (c.next < horizon) {
        if (c.chirpsLeft <= 0) {
          c.chirpsLeft = 5 + Math.floor(this.rng() * 16);
          c.next += 1.5 + this.rng() * 6;
          continue;
        }
        this.chirp(c, c.next);
        c.chirpsLeft--;
        c.next += c.interval * (0.94 + this.rng() * 0.12);
      }
    }

    if (this.nextOwl < horizon) {
      this.owl(this.nextOwl);
      this.nextOwl += 35 + this.rng() * 50;
    }
  };

  private crackle(t: number): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.white;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    const pop = this.rng() < 0.12;
    filter.frequency.value = pop ? 500 + this.rng() * 900 : 1400 + this.rng() * 4200;
    filter.Q.value = pop ? 1.2 : 1.5 + this.rng() * 5;
    const gain = ctx.createGain();
    const amp = (pop ? 0.5 + this.rng() * 0.4 : 0.06 + Math.pow(this.rng(), 2) * 0.35) * this.fireLevel;
    const dur = pop ? 0.05 + this.rng() * 0.05 : 0.008 + this.rng() * 0.03;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(amp, t + 0.0015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(gain).connect(this.fireBus!);
    const offset = this.rng() * 2.5;
    src.start(t, offset, dur + 0.02);
  }

  private chirp(c: CricketVoice, t: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = c.freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    const pulses = 3;
    for (let i = 0; i < pulses; i++) {
      const p = t + i * 0.045;
      gain.gain.setValueAtTime(0, p);
      gain.gain.linearRampToValueAtTime(0.05, p + 0.006);
      gain.gain.linearRampToValueAtTime(0.032, p + 0.018);
      gain.gain.linearRampToValueAtTime(0, p + 0.026);
    }
    osc.connect(gain).connect(c.panner);
    osc.start(t);
    osc.stop(t + pulses * 0.045 + 0.05);
  }

  private owl(t: number): void {
    const ctx = this.ctx!;
    const a = this.rng() * Math.PI * 2;
    const panner = this.panner(Math.sin(a) * 55, 9, -Math.cos(a) * 55, 18, 1, 'equalpower');
    panner.connect(this.master!);
    const send = ctx.createGain();
    send.gain.value = 0.9;
    panner.connect(send).connect(this.reverbSend!);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1100;
    filter.connect(panner);

    const pattern = this.rng() < 0.5 ? [0, 0.62, 0.95] : [0, 0.75];
    const base = 360 + this.rng() * 40;
    for (const offset of pattern) {
      const start = t + offset;
      const len = offset === 0 ? 0.42 : 0.28;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(base * 1.06, start);
      osc.frequency.exponentialRampToValueAtTime(base * 0.94, start + len);
      const over = ctx.createOscillator();
      over.type = 'triangle';
      over.frequency.setValueAtTime(base * 2.12, start);
      over.frequency.exponentialRampToValueAtTime(base * 1.88, start + len);
      const overGain = ctx.createGain();
      overGain.gain.value = 0.12;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, start);
      env.gain.exponentialRampToValueAtTime(0.07, start + 0.07);
      env.gain.setValueAtTime(0.07, start + len - 0.1);
      env.gain.exponentialRampToValueAtTime(0.0001, start + len + 0.12);
      osc.connect(env);
      over.connect(overGain).connect(env);
      env.connect(filter);
      osc.start(start);
      over.start(start);
      osc.stop(start + len + 0.2);
      over.stop(start + len + 0.2);
    }
  }

  private panner(
    x: number,
    y: number,
    z: number,
    refDistance: number,
    rolloff: number,
    model: PanningModelType,
  ): PannerNode {
    const ctx = this.ctx!;
    const p = ctx.createPanner();
    p.panningModel = model;
    p.distanceModel = 'inverse';
    p.refDistance = refDistance;
    p.rolloffFactor = rolloff;
    p.maxDistance = 200;
    if (p.positionX) {
      p.positionX.value = x;
      p.positionY.value = y;
      p.positionZ.value = z;
    } else {
      p.setPosition(x, y, z);
    }
    return p;
  }

  private loop(buffer: AudioBuffer, rate = 1): AudioBufferSourceNode {
    const src = this.ctx!.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.playbackRate.value = rate;
    src.start(0, this.rng() * buffer.duration);
    return src;
  }

  private lfo(freq: number, depth: number, param: AudioParam): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.value = depth;
    osc.connect(gain).connect(param);
    osc.start(ctx.currentTime + this.rng() * 3);
  }

  private noiseBuffer(seconds: number, kind: 'white' | 'brown'): AudioBuffer {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const fade = Math.floor(ctx.sampleRate * 0.1);
    const raw = new Float32Array(len + fade);
    let last = 0;
    let peak = 0;
    for (let i = 0; i < raw.length; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'white') {
        raw[i] = w;
      } else {
        last = (last + 0.02 * w) / 1.02;
        raw[i] = last;
      }
      peak = Math.max(peak, Math.abs(raw[i]));
    }
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    const norm = kind === 'brown' && peak > 0 ? 0.9 / peak : 1;
    // Blend the overrun into the start so the loop point is seamless.
    for (let i = 0; i < len; i++) {
      const t = i < fade ? i / fade : 1;
      data[i] = (raw[i] * t + (i < fade ? raw[len + i] * (1 - t) : 0)) * norm;
    }
    return buffer;
  }

  private impulse(seconds: number): AudioBuffer {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / len;
        const w = Math.random() * 2 - 1;
        lp += (w - lp) * (0.55 - t * 0.45);
        data[i] = lp * Math.pow(1 - t, 3.2) * (i < 200 ? i / 200 : 1);
      }
    }
    return buffer;
  }
}
