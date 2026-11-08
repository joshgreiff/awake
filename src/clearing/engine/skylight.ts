import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Group,
  Mesh,
  PerspectiveCamera,
  ShaderMaterial,
} from 'three';
import { GLSL_NOISE } from './noise';

/**
 * Rare, faint curtains of light low in the north-east sky. Purely atmospheric:
 * `story.ts` decides when (if ever) they appear in a session; nothing records it.
 * Writes display-space values like the rest of the sky.
 */
export interface Skylight {
  group: Group;
  update(time: number, dt: number, camera: PerspectiveCamera): void;
  /** 0 = hidden, 1 = fully present. Eases toward the target slowly. */
  setTarget(level: number): void;
  readonly level: number;
}

const RADIUS = 380;

function curtainGeometry(a0: number, a1: number, e0: number, e1: number, segments: number): BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  const index: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const az = a0 + (a1 - a0) * t + Math.sin(t * 9.0) * 0.03;
    for (const [e, v] of [
      [e0, 0],
      [e1, 1],
    ]) {
      const ce = Math.cos(e);
      pos.push(Math.sin(az) * ce * RADIUS, Math.sin(e) * RADIUS, -Math.cos(az) * ce * RADIUS);
      uv.push(t, v);
    }
    if (i < segments) {
      const k = i * 2;
      index.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  geo.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2));
  geo.setIndex(index);
  return geo;
}

export function createSkylight(): Skylight {
  const group = new Group();
  group.name = 'skylight';
  group.visible = false;
  const level = { value: 0 };
  const time = { value: 0 };

  const layers = [
    { a0: 0.15, a1: 1.65, e0: 0.1, e1: 0.5, seed: 1.3, gain: 1.0 },
    { a0: -0.25, a1: 1.05, e0: 0.16, e1: 0.62, seed: 7.9, gain: 0.6 },
    { a0: 0.7, a1: 2.0, e0: 0.08, e1: 0.4, seed: 4.2, gain: 0.5 },
  ];
  for (const layer of layers) {
    const material = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
      fog: false,
      toneMapped: false,
      uniforms: { uTime: time, uLevel: level, uSeed: { value: layer.seed }, uGain: { value: layer.gain } },
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform float uSeed;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 p = position;
          float sway = sin(uTime * 0.05 + uv.x * 7.0 + uSeed) * 6.0;
          p.x += sway * uv.y;
          p.z += sway * 0.6 * uv.y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uLevel;
        uniform float uSeed;
        uniform float uGain;
        varying vec2 vUv;
        ${GLSL_NOISE}
        void main() {
          float x = vUv.x;
          float y = vUv.y;
          float rays = fbm2(vec2(x * 48.0 + uSeed, uTime * 0.04 + y * 0.6));
          float folds = smoothstep(0.25, 0.7, vnoise(vec2(x * 5.0 - uTime * 0.012 + uSeed * 3.0, uTime * 0.008)));
          rays = pow(rays, 1.6) * 1.6;
          float vert = smoothstep(0.0, 0.07, y) * pow(1.0 - y, 1.4);
          float hem = exp(-y * 7.0) * 0.8;
          float ends = smoothstep(0.0, 0.15, x) * smoothstep(1.0, 0.85, x);
          vec3 low = vec3(0.07, 0.42, 0.3);
          vec3 high = vec3(0.22, 0.1, 0.36);
          vec3 col = mix(low, high, smoothstep(0.3, 0.95, y));
          float a = (0.3 + 0.7 * rays) * (0.35 + 0.65 * folds) * (vert + hem * folds) * ends * uLevel * uGain;
          gl_FragColor = vec4(col * a * 0.95, 1.0);
        }
      `,
    });
    const mesh = new Mesh(curtainGeometry(layer.a0, layer.a1, layer.e0, layer.e1, 96), material);
    mesh.frustumCulled = false;
    mesh.renderOrder = -6;
    group.add(mesh);
  }

  let target = 0;
  return {
    group,
    get level() {
      return level.value;
    },
    update(t, dt, camera) {
      time.value = t;
      const rate = target > level.value ? 0.06 : 0.04;
      level.value += Math.sign(target - level.value) * Math.min(Math.abs(target - level.value), dt * rate);
      group.visible = level.value > 0.001;
      if (group.visible) group.position.copy(camera.position);
    },
    setTarget(v) {
      target = v;
    },
  };
}
