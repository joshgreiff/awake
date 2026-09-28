import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Group,
  Mesh,
  NormalBlending,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  Vector3,
} from 'three';
import { CLEARING_RADIUS, heightAt, openingMask } from './layout';
import { mulberry32 } from './noise';

export interface Fireflies {
  points: Points;
  update(time: number): void;
  setPixelRatio(pr: number): void;
}

export function createFireflies(count = 80): Fireflies {
  const rng = mulberry32(606);
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 4);
  let i = 0;
  while (i < count) {
    const a = rng() * Math.PI * 2;
    const r = 4 + Math.sqrt(rng()) * 22;
    const x = Math.sin(a) * r;
    const z = -Math.cos(a) * r;
    const nearEdge = Math.abs(r - CLEARING_RADIUS) < 5 || openingMask(x, z) > 0.4;
    if (!nearEdge && rng() > 0.35) continue;
    positions.set([x, heightAt(x, z) + 0.35 + rng() * 2.2, z], i * 3);
    seeds.set([rng(), rng(), rng(), rng()], i * 4);
    i++;
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(positions, 3));
  geo.setAttribute('aSeed', new BufferAttribute(seeds, 4));

  const material = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
    uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 } },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uPixelRatio;
      attribute vec4 aSeed;
      varying float vGlow;
      void main() {
        float t = uTime * (0.25 + aSeed.x * 0.25);
        vec3 p = position + vec3(
          sin(t * 1.3 + aSeed.y * 30.0) * 1.4,
          sin(t * 0.9 + aSeed.z * 20.0) * 0.45,
          cos(t * 1.1 + aSeed.w * 25.0) * 1.4
        );
        float cycle = fract(uTime * (0.07 + aSeed.z * 0.06) + aSeed.w);
        float blink = smoothstep(0.0, 0.08, cycle) * (1.0 - smoothstep(0.1, 0.32, cycle));
        vGlow = blink;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float dist = max(-mv.z, 0.5);
        gl_PointSize = clamp(38.0 / dist, 2.0, 16.0) * uPixelRatio * (0.4 + blink * 0.6);
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vGlow;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float core = exp(-d * d * 9.0);
        float halo = exp(-d * 3.5) * 0.35;
        float a = (core + halo) * (1.0 - smoothstep(0.85, 1.0, d)) * vGlow;
        gl_FragColor = vec4(vec3(0.72, 1.0, 0.42) * a * 1.3, 1.0);
      }
    `,
  });
  const points = new Points(geo, material);
  points.frustumCulled = false;
  points.renderOrder = 5;
  return {
    points,
    update(time) {
      material.uniforms.uTime.value = time;
    },
    setPixelRatio(pr) {
      material.uniforms.uPixelRatio.value = pr;
    },
  };
}

export interface Mist {
  group: Group;
  update(time: number, camera: PerspectiveCamera): void;
}

/** Low drifting banks of mist that settle in the meadow and between the trees. */
export function createMist(count = 22): Mist {
  const rng = mulberry32(8080);
  const group = new Group();
  group.name = 'mist';

  const uniforms = UniformsUtils.merge([
    UniformsLib.fog,
    { uTime: { value: 0 }, uOpacity: { value: 0.07 } },
  ]);
  const material = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: NormalBlending,
    toneMapped: false,
    fog: true,
    uniforms,
    vertexShader: /* glsl */ `
      #include <common>
      #include <fog_pars_vertex>
      varying vec2 vUv;
      varying float vNear;
      void main() {
        vUv = uv;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vNear = smoothstep(2.5, 9.0, -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      #include <common>
      #include <fog_pars_fragment>
      uniform float uOpacity;
      uniform float uTime;
      varying vec2 vUv;
      varying float vNear;
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        p.y *= 1.8;
        float d = length(p);
        float a = exp(-d * d * 2.4) * (1.0 - smoothstep(0.8, 1.0, d));
        a *= 0.8 + 0.2 * sin(uTime * 0.2 + p.x * 3.0);
        gl_FragColor = vec4(vec3(0.16, 0.19, 0.26), a * uOpacity * vNear);
        #include <fog_fragment>
      }
    `,
  });

  const geo = new PlaneGeometry(1, 1);
  const banks: { mesh: Mesh; base: Vector3; speed: number; phase: number }[] = [];
  for (let i = 0; i < count; i++) {
    const inMeadow = i < count * 0.55;
    const a = inMeadow ? (rng() - 0.5) * 1.2 : rng() * Math.PI * 2;
    const r = inMeadow ? 16 + rng() * 26 : CLEARING_RADIUS + rng() * 10;
    const x = Math.sin(a) * r;
    const z = -Math.cos(a) * r;
    const mesh = new Mesh(geo, material);
    const w = 9 + rng() * 9;
    mesh.scale.set(w, w * 0.5, 1);
    const base = new Vector3(x, heightAt(x, z) + 0.6 + rng() * 0.8, z);
    mesh.position.copy(base);
    mesh.renderOrder = 6;
    group.add(mesh);
    banks.push({ mesh, base, speed: 0.04 + rng() * 0.05, phase: rng() * 10 });
  }

  const look = new Vector3();
  return {
    group,
    update(time, camera) {
      uniforms.uTime.value = time;
      for (const b of banks) {
        b.mesh.position.set(
          b.base.x + Math.sin(time * b.speed + b.phase) * 2.5,
          b.base.y,
          b.base.z + Math.cos(time * b.speed * 0.7 + b.phase) * 1.5,
        );
        look.set(camera.position.x, b.mesh.position.y, camera.position.z);
        b.mesh.lookAt(look);
      }
    },
  };
}
