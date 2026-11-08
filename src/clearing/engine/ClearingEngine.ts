import {
  ACESFilmicToneMapping,
  Color,
  DirectionalLight,
  FogExp2,
  HemisphereLight,
  InstancedMesh,
  PCFShadowMap,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
  Timer,
  WebGLRenderer,
} from 'three';
import { createFireflies, createMist, type Fireflies, type Mist } from './atmosphere';
import type { ClearingAudio } from './audio';
import { FirstPersonController, type SeatState } from './controls';
import { createFire, type FireBuild } from './fire';
import { createForest } from './forest';
import { createHollow, type HollowBuild } from './hollow';
import { ColliderGrid, MOON_DIR, nearestSeat, seatPose, type Seat } from './layout';
import { createSky, SKY, type SkyBuild } from './sky';
import { createSkylight, type Skylight } from './skylight';
import { Story, type Interaction, type Whisper } from './story';
import { createGrass, createGround, type GrassUniforms } from './terrain';
import { createPond, type Pond } from './water';

export type QualityMode = 'auto' | 'low' | 'high';

interface QualityLevel {
  dprCap: number;
  grass: number;
  mist: boolean;
  smoke: boolean;
  antialias: boolean;
  shadowMap: number;
}

const LEVELS: QualityLevel[] = [
  { dprCap: 0.85, grass: 0.3, mist: false, smoke: false, antialias: false, shadowMap: 0 },
  { dprCap: 1.25, grass: 0.6, mist: true, smoke: true, antialias: true, shadowMap: 512 },
  { dprCap: 2, grass: 1, mist: true, smoke: true, antialias: true, shadowMap: 1024 },
];

const MAX_GRASS = 26000;
const FOG_DENSITY = 0.028;

export interface EngineOptions {
  quality: QualityMode;
  touch: boolean;
  reducedMotion: boolean;
  onLockChange(locked: boolean): void;
  onFirstMove(): void;
  onContextLost(): void;
  /** Fires when the player walks into or out of reach of a seat. */
  onNearSeat(near: boolean): void;
  onSeatChange(state: SeatState): void;
  /** Label of something nearby the player can interact with, or null. */
  onNearInteraction(label: string | null): void;
  onWhisper(whispers: Whisper[]): void;
}

export class ClearingEngine {
  readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera: PerspectiveCamera;
  private readonly timer = new Timer();
  private readonly controller: FirstPersonController;
  private readonly sky: SkyBuild;
  private readonly fire: FireBuild;
  private readonly fireflies: Fireflies;
  private readonly mist: Mist;
  private readonly pond: Pond;
  private readonly hollow: HollowBuild;
  private readonly skylight: Skylight;
  private readonly story: Story;
  private interaction: Interaction | null = null;
  private readonly grass: InstancedMesh;
  private readonly grassUniforms: GrassUniforms;
  private readonly container: HTMLElement;
  private readonly opts: EngineOptions;
  private readonly resizeObserver: ResizeObserver;

  private audio: ClearingAudio | null = null;
  private exploring = false;
  private paused = false;
  private nearSeat: Seat | null = null;
  private time = 0;
  private mode: QualityMode;
  private level: number;
  private frameTimes: number[] = [];
  private warmup = 2.5;
  private disposed = false;
  private forward = new Vector3();
  private fireView = new Vector3();

  constructor(container: HTMLElement, opts: EngineOptions) {
    this.container = container;
    this.opts = opts;
    this.mode = opts.quality;
    this.level = this.initialLevel(opts.quality);

    this.renderer = new WebGLRenderer({
      antialias: LEVELS[this.level].antialias,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFShadowMap;
    this.renderer.setClearColor(new Color().setRGB(SKY.fog.x, SKY.fog.y, SKY.fog.z, SRGBColorSpace));
    const canvas = this.renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.touchAction = 'none';
    canvas.setAttribute('aria-label', 'A first-person view of a moonlit forest clearing with a campfire');
    canvas.setAttribute('role', 'img');
    canvas.addEventListener('webglcontextlost', this.onContextLost);
    container.appendChild(canvas);

    this.camera = new PerspectiveCamera(70, 1, 0.1, 1000);

    this.scene.fog = new FogExp2(
      new Color().setRGB(SKY.fog.x, SKY.fog.y, SKY.fog.z, SRGBColorSpace),
      FOG_DENSITY,
    );

    this.scene.add(new HemisphereLight(new Color('#34467a'), new Color('#110f0c'), 0.4));
    const moonLight = new DirectionalLight(new Color('#aebde8'), 1.7);
    moonLight.position.copy(MOON_DIR).multiplyScalar(100);
    this.scene.add(moonLight);

    const colliders = new ColliderGrid();

    this.sky = createSky();
    this.scene.add(this.sky.group);

    this.scene.add(createGround());

    this.fire = createFire(colliders);
    this.scene.add(this.fire.group);

    const forest = createForest(colliders);
    this.scene.add(forest.group);

    this.hollow = createHollow(colliders);
    this.scene.add(this.hollow.group);
    this.skylight = createSkylight();
    this.scene.add(this.skylight.group);
    this.story = new Story(this.hollow, this.skylight, opts.onWhisper);

    this.pond = createPond();
    this.scene.add(this.pond.mesh);

    const grass = createGrass(colliders, MAX_GRASS);
    this.grass = grass.mesh;
    this.grassUniforms = grass.uniforms;
    this.scene.add(this.grass);

    this.fireflies = createFireflies(opts.touch ? 55 : 85);
    this.scene.add(this.fireflies.points);

    this.mist = createMist();
    this.scene.add(this.mist.group);

    this.controller = new FirstPersonController(this.camera, canvas, colliders, {
      touch: opts.touch,
      reducedMotion: opts.reducedMotion,
      onLockChange: opts.onLockChange,
      onFirstMove: opts.onFirstMove,
      onSeatChange: this.onSeatChange,
    });
    this.controller.idle(0);

    this.applyLevel();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();

    this.renderer.compile(this.scene, this.camera);
    this.renderer.setAnimationLoop(this.frame);
  }

  setAudio(audio: ClearingAudio | null): void {
    this.audio = audio;
    audio?.setSeated(this.controller.state !== 'walking');
    this.story.setAudio(audio);
  }

  setExploring(on: boolean): void {
    this.exploring = on;
    this.controller.enabled = on && !this.paused;
    if (on) {
      this.story.beginVisit();
      this.requestLock();
    } else this.controller.releaseLock();
  }

  /** F / tap: interact with whatever is close, otherwise sit or stand. */
  primaryAction(): boolean {
    if (!this.exploring || this.paused) return false;
    if (this.interaction && this.controller.state === 'walking') {
      this.story.use(this.interaction.id);
      this.interaction = null;
      this.opts.onNearInteraction(null);
      return true;
    }
    return this.toggleSeat();
  }

  /** Dev/testing only: move the player. */
  debugTeleport(x: number, z: number, yaw: number, pitch = 0): void {
    this.controller.teleport(x, z, yaw, pitch);
  }

  /** Dev/testing only: bring a timed event forward. */
  debugTrigger(name: 'signal' | 'sky'): void {
    this.story.debugTrigger(name);
  }

  /** Re-read persisted world state (used after a testing reset). */
  reloadWorld(): void {
    this.story.reload();
  }

  /** Freeze movement and look input (e.g. while an overlay has focus) and free the cursor. */
  setPaused(paused: boolean): void {
    this.paused = paused;
    this.controller.enabled = this.exploring && !paused;
    this.controller.clearInput();
    if (paused) this.controller.releaseLock();
  }

  get seatState(): SeatState {
    return this.controller.state;
  }

  /** Sit on the nearby log, or stand if already seated. Returns false if nothing happened. */
  toggleSeat(): boolean {
    if (!this.exploring || this.paused) return false;
    const state = this.controller.state;
    if (state === 'seated' || state === 'sitting') {
      this.controller.stand();
      return true;
    }
    if (state === 'walking' && this.nearSeat) {
      this.controller.sit(seatPose(this.nearSeat, this.controller.position));
      return true;
    }
    return false;
  }

  stand(): void {
    this.controller.stand();
  }

  /** Embers lift from the fire, e.g. after a journal entry is kept. */
  releaseEmbers(): void {
    this.fire.releaseEmbers();
    this.audio?.crackleBurst(7);
  }

  requestLock(): void {
    this.controller.requestLock();
  }

  get isLocked(): boolean {
    return this.controller.isLocked;
  }

  setQuality(mode: QualityMode): void {
    this.mode = mode;
    this.level = this.initialLevel(mode);
    this.frameTimes = [];
    this.warmup = 2;
    this.applyLevel();
    this.resize();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    this.resizeObserver.disconnect();
    this.controller.dispose();
    this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLost);
    this.scene.traverse((obj) => {
      const mesh = obj as unknown as {
        geometry?: { dispose(): void };
        material?: { dispose(): void } | { dispose(): void }[];
      };
      mesh.geometry?.dispose();
      if (Array.isArray(mesh.material)) mesh.material.forEach((m) => m.dispose());
      else mesh.material?.dispose();
    });
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }

  private initialLevel(mode: QualityMode): number {
    if (mode === 'low') return 0;
    if (mode === 'high') return 2;
    return this.opts.touch ? 0 : 1;
  }

  private applyLevel(): void {
    const lvl = LEVELS[this.level];
    const placed = (this.grass.userData.placed as number) ?? MAX_GRASS;
    this.grass.count = Math.floor(placed * lvl.grass);
    this.mist.group.visible = lvl.mist;
    this.fire.setSmokeEnabled(lvl.smoke);
    const light = this.fire.light;
    light.castShadow = lvl.shadowMap > 0;
    if (lvl.shadowMap > 0 && light.shadow.mapSize.x !== lvl.shadowMap) {
      light.shadow.mapSize.set(lvl.shadowMap, lvl.shadowMap);
      light.shadow.map?.dispose();
      light.shadow.map = null;
    }
  }

  private resize(): void {
    const w = Math.max(this.container.clientWidth, 1);
    const h = Math.max(this.container.clientHeight, 1);
    const pr = Math.min(window.devicePixelRatio || 1, LEVELS[this.level].dprCap);
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 0.8 ? 80 : 70;
    this.camera.updateProjectionMatrix();
    const scale = (h * pr) / (2 * Math.tan((this.camera.fov * Math.PI) / 360));
    this.fire.setPointScale(scale);
    this.hollow.setPointScale(scale);
    this.sky.setPixelRatio(pr);
    this.fireflies.setPixelRatio(pr);
  }

  private adapt(dt: number): void {
    if (this.mode !== 'auto' || this.level === 0) return;
    if (this.warmup > 0) {
      this.warmup -= dt;
      return;
    }
    this.frameTimes.push(dt);
    if (this.frameTimes.length < 120) return;
    const sorted = [...this.frameTimes].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    this.frameTimes = [];
    if (median > 1 / 42) {
      this.level--;
      this.warmup = 1.5;
      this.applyLevel();
      this.resize();
    }
  }

  private frame = () => {
    this.timer.update();
    const dt = Math.min(this.timer.getDelta(), 0.05);
    this.time += dt;
    const t = this.time;

    if (this.exploring) this.controller.update(dt);
    else this.controller.idle(t);
    this.updateNearSeat();
    const state = this.controller.state;
    const pos = this.controller.position;
    this.story.update(dt, {
      x: pos.x,
      z: pos.z,
      exploring: this.exploring && !this.paused,
      seated: state === 'seated',
    });
    this.updateInteraction();

    this.fire.update(t, dt, this.camera);
    this.sky.update(t, dt, this.camera);
    this.skylight.update(t, dt, this.camera);
    this.hollow.update(t, dt, this.camera);
    this.fireflies.update(t);
    if (this.mist.group.visible) this.mist.update(t, this.camera);
    this.grassUniforms.uTime.value = t;
    this.camera.updateMatrixWorld();
    this.fireView
      .set(0, this.fire.group.position.y + 0.9, 0)
      .applyMatrix4(this.camera.matrixWorldInverse);
    this.grassUniforms.uFireView.value.copy(this.fireView);
    this.pond.update(t, this.fire.intensity);

    if (this.audio) {
      this.camera.getWorldDirection(this.forward);
      this.audio.setFireLevel(this.fire.intensity);
      this.audio.updateListener({
        x: this.camera.position.x,
        y: this.camera.position.y,
        z: this.camera.position.z,
        fx: this.forward.x,
        fy: this.forward.y,
        fz: this.forward.z,
      });
    }

    this.renderer.render(this.scene, this.camera);
    this.adapt(dt);
  };

  private updateInteraction(): void {
    const canAct = this.exploring && !this.paused && this.controller.state === 'walking';
    const pos = this.controller.position;
    const next = canAct ? this.story.nearest(pos.x, pos.z) : null;
    if (next?.id !== this.interaction?.id) this.opts.onNearInteraction(next?.label ?? null);
    this.interaction = next;
  }

  private updateNearSeat(): void {
    const canSit = this.exploring && this.controller.state === 'walking';
    const pos = this.controller.position;
    const seat = canSit ? nearestSeat(pos.x, pos.z) : null;
    if ((seat === null) !== (this.nearSeat === null)) this.opts.onNearSeat(seat !== null);
    this.nearSeat = seat;
  }

  private onSeatChange = (state: SeatState) => {
    if (state === 'sitting') {
      this.fire.flare(1);
      this.audio?.setSeated(true);
      this.audio?.crackleBurst(9);
    } else if (state === 'standing') {
      this.audio?.setSeated(false);
    }
    this.opts.onSeatChange(state);
  };

  private onContextLost = (e: Event) => {
    e.preventDefault();
    this.renderer.setAnimationLoop(null);
    this.opts.onContextLost();
  };
}

export type WebGLSupport = 'ok' | 'slow' | 'none';

/** 'slow' means WebGL works but only through a software / performance-caveat path. */
export function detectWebGL(): WebGLSupport {
  try {
    const canvas = document.createElement('canvas');
    const strict =
      canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true }) ??
      canvas.getContext('webgl', { failIfMajorPerformanceCaveat: true });
    if (strict) {
      (strict as WebGLRenderingContext).getExtension('WEBGL_lose_context')?.loseContext();
      return 'ok';
    }
    const loose = document.createElement('canvas').getContext('webgl2') ??
      document.createElement('canvas').getContext('webgl');
    if (loose) {
      (loose as WebGLRenderingContext).getExtension('WEBGL_lose_context')?.loseContext();
      return 'slow';
    }
    return 'none';
  } catch {
    return 'none';
  }
}
