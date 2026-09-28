import {
  ACESFilmicToneMapping,
  Color,
  DirectionalLight,
  FogExp2,
  HemisphereLight,
  InstancedMesh,
  LinearSRGBColorSpace,
  PerspectiveCamera,
  Scene,
  Vector3,
  Timer,
  WebGLRenderer,
} from 'three';
import { createFireflies, createMist, type Fireflies, type Mist } from './atmosphere';
import type { ClearingAudio } from './audio';
import { FirstPersonController } from './controls';
import { createFire, type FireBuild } from './fire';
import { createForest } from './forest';
import { ColliderGrid, MOON_DIR } from './layout';
import { createSky, SKY, type SkyBuild } from './sky';
import { createGrass, createGround, type GrassUniforms } from './terrain';

export type QualityMode = 'auto' | 'low' | 'high';

interface QualityLevel {
  dprCap: number;
  grass: number;
  mist: boolean;
  smoke: boolean;
  antialias: boolean;
}

const LEVELS: QualityLevel[] = [
  { dprCap: 0.85, grass: 0.3, mist: false, smoke: false, antialias: false },
  { dprCap: 1.25, grass: 0.6, mist: true, smoke: true, antialias: true },
  { dprCap: 2, grass: 1, mist: true, smoke: true, antialias: true },
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
  private readonly grass: InstancedMesh;
  private readonly grassUniforms: GrassUniforms;
  private readonly container: HTMLElement;
  private readonly opts: EngineOptions;
  private readonly resizeObserver: ResizeObserver;

  private audio: ClearingAudio | null = null;
  private exploring = false;
  private time = 0;
  private mode: QualityMode;
  private level: number;
  private frameTimes: number[] = [];
  private warmup = 2.5;
  private disposed = false;
  private forward = new Vector3();

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
    this.renderer.setClearColor(new Color().setRGB(SKY.fog.x, SKY.fog.y, SKY.fog.z, LinearSRGBColorSpace));
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
      new Color().setRGB(SKY.fog.x, SKY.fog.y, SKY.fog.z, LinearSRGBColorSpace),
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

    const grassAmbient = new Color(0.1, 0.13, 0.22);
    const grassMoon = new Color(0.22, 0.26, 0.38);
    const grass = createGrass(colliders, MAX_GRASS, grassAmbient, grassMoon);
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
  }

  setExploring(on: boolean): void {
    this.exploring = on;
    this.controller.enabled = on;
    if (on) this.requestLock();
    else this.controller.releaseLock();
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

    this.fire.update(t, dt, this.camera);
    this.sky.update(t, dt, this.camera);
    this.fireflies.update(t);
    if (this.mist.group.visible) this.mist.update(t, this.camera);
    this.grassUniforms.uTime.value = t;
    this.grassUniforms.uFire.value = this.fire.intensity * 2.4;

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
