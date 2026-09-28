import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DodecahedronGeometry,
  Group,
  Mesh,
  MeshLambertMaterial,
  NormalBlending,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Points,
  ShaderMaterial,
} from 'three';
import { ColliderGrid, FIRE_POS, heightAt } from './layout';
import { mulberry32, valueNoise } from './noise';

export interface FireBuild {
  group: Group;
  light: PointLight;
  /** Current flicker multiplier, ~0.75–1.1. Shared with grass lighting and audio. */
  intensity: number;
  update(time: number, dt: number, camera: PerspectiveCamera): void;
  setPointScale(scale: number): void;
  setSmokeEnabled(on: boolean): void;
}

const FLAME_COUNT = 110;
const EMBER_COUNT = 60;
const SMOKE_COUNT = 22;
const LIGHT_BASE = 20;

export function createFire(colliders: ColliderGrid): FireBuild {
  const rng = mulberry32(1701);
  const group = new Group();
  group.name = 'fire';
  const baseY = heightAt(FIRE_POS.x, FIRE_POS.z);
  group.position.set(FIRE_POS.x, baseY, FIRE_POS.z);

  colliders.add({ x: FIRE_POS.x, z: FIRE_POS.z, r: 1.25 });

  const stoneGeo = new DodecahedronGeometry(0.2, 0);
  const stoneMat = new MeshLambertMaterial({ color: '#4a4a4e', flatShading: true });
  const stones = 12;
  for (let i = 0; i < stones; i++) {
    const a = (i / stones) * Math.PI * 2 + rng() * 0.2;
    const s = new Mesh(stoneGeo, stoneMat);
    const r = 0.95 + rng() * 0.08;
    s.position.set(Math.sin(a) * r, 0.06, Math.cos(a) * r);
    s.scale.set(0.9 + rng() * 0.6, 0.6 + rng() * 0.4, 0.9 + rng() * 0.5);
    s.rotation.set(rng() * 3, rng() * 3, rng() * 3);
    group.add(s);
  }

  const charMat = new MeshLambertMaterial({
    color: '#1c1511',
    emissive: new Color('#ff4d12'),
    emissiveIntensity: 0.3,
  });
  const logGeo = new CylinderGeometry(0.075, 0.095, 1.05, 7);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    const log = new Mesh(logGeo, charMat);
    log.position.set(Math.sin(a) * 0.26, 0.34, Math.cos(a) * 0.26);
    log.rotation.set(-Math.cos(a) * 0.62, 0, Math.sin(a) * 0.62);
    group.add(log);
  }

  const bedMat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
    uniforms: { uTime: { value: 0 }, uI: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uI;
      varying vec2 vUv;
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float d = length(p);
        float pulse = 0.8 + 0.2 * sin(uTime * 3.0 + p.x * 9.0) * sin(uTime * 2.3 + p.y * 7.0);
        float a = smoothstep(1.0, 0.1, d) * pulse * uI;
        gl_FragColor = vec4(vec3(1.0, 0.28, 0.05) * a * 0.9, 1.0);
      }
    `,
  });
  const bed = new Mesh(new CircleGeometry(0.62, 24), bedMat);
  bed.rotation.x = -Math.PI / 2;
  bed.position.y = 0.04;
  group.add(bed);

  // Flames: CPU-simulated additive points.
  const flamePos = new Float32Array(FLAME_COUNT * 3);
  const flameVel = new Float32Array(FLAME_COUNT * 3);
  const flameAge = new Float32Array(FLAME_COUNT);
  const flameLifeSpan = new Float32Array(FLAME_COUNT);
  const flameSize0 = new Float32Array(FLAME_COUNT);
  const flameSize = new Float32Array(FLAME_COUNT);
  const flameLife = new Float32Array(FLAME_COUNT);
  const flameSeed = new Float32Array(FLAME_COUNT);

  const spawnFlame = (i: number, initial: boolean) => {
    const a = rng() * Math.PI * 2;
    const r = Math.sqrt(rng()) * 0.3;
    flamePos[i * 3] = Math.sin(a) * r;
    flamePos[i * 3 + 1] = 0.12 + rng() * 0.12;
    flamePos[i * 3 + 2] = Math.cos(a) * r;
    flameVel[i * 3] = (rng() - 0.5) * 0.15;
    flameVel[i * 3 + 1] = 0.75 + rng() * 0.75;
    flameVel[i * 3 + 2] = (rng() - 0.5) * 0.15;
    flameLifeSpan[i] = 0.55 + rng() * 0.55;
    flameAge[i] = initial ? rng() * flameLifeSpan[i] : 0;
    flameSize0[i] = 0.34 + rng() * 0.3;
    flameSeed[i] = rng();
  };
  for (let i = 0; i < FLAME_COUNT; i++) spawnFlame(i, true);

  const flameGeo = new BufferGeometry();
  flameGeo.setAttribute('position', new BufferAttribute(flamePos, 3));
  flameGeo.setAttribute('aSize', new BufferAttribute(flameSize, 1));
  flameGeo.setAttribute('aLife', new BufferAttribute(flameLife, 1));
  flameGeo.setAttribute('aSeed', new BufferAttribute(flameSeed, 1));

  const pointScale = { value: 600 };
  const flameMat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
    uniforms: { uScale: pointScale, uI: { value: 1 } },
    vertexShader: /* glsl */ `
      uniform float uScale;
      attribute float aSize;
      attribute float aLife;
      attribute float aSeed;
      varying float vLife;
      varying float vSeed;
      void main() {
        vLife = aLife;
        vSeed = aSeed;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uScale / max(-mv.z, 0.1);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uI;
      varying float vLife;
      varying float vSeed;
      void main() {
        vec2 p = gl_PointCoord - 0.5;
        p.y *= 0.85;
        float d = length(p) * 2.0;
        float soft = smoothstep(1.0, 0.0, d);
        soft *= soft;
        vec3 hot = vec3(1.0, 0.82, 0.5);
        vec3 mid = vec3(1.0, 0.38, 0.07);
        vec3 cool = vec3(0.5, 0.07, 0.02);
        vec3 col = vLife < 0.3 ? mix(hot, mid, vLife / 0.3) : mix(mid, cool, (vLife - 0.3) / 0.7);
        float a = smoothstep(0.0, 0.1, vLife) * (1.0 - smoothstep(0.5, 1.0, vLife));
        gl_FragColor = vec4(col * soft * a * uI * (0.32 + vSeed * 0.14), 1.0);
      }
    `,
  });
  const flames = new Points(flameGeo, flameMat);
  flames.frustumCulled = false;
  flames.renderOrder = 2;
  group.add(flames);

  // Embers drifting up out of the fire.
  const emberPos = new Float32Array(EMBER_COUNT * 3);
  const emberVel = new Float32Array(EMBER_COUNT * 3);
  const emberAge = new Float32Array(EMBER_COUNT);
  const emberLifeSpan = new Float32Array(EMBER_COUNT);
  const emberLife = new Float32Array(EMBER_COUNT);
  const emberSeed = new Float32Array(EMBER_COUNT);
  const spawnEmber = (i: number, initial: boolean) => {
    emberPos[i * 3] = (rng() - 0.5) * 0.4;
    emberPos[i * 3 + 1] = 0.3 + rng() * 0.3;
    emberPos[i * 3 + 2] = (rng() - 0.5) * 0.4;
    emberVel[i * 3] = (rng() - 0.5) * 0.3;
    emberVel[i * 3 + 1] = 0.6 + rng() * 0.9;
    emberVel[i * 3 + 2] = (rng() - 0.5) * 0.3;
    emberLifeSpan[i] = 1.4 + rng() * 2.4;
    emberAge[i] = initial ? rng() * emberLifeSpan[i] : 0;
    emberSeed[i] = rng();
  };
  for (let i = 0; i < EMBER_COUNT; i++) spawnEmber(i, true);
  const emberGeo = new BufferGeometry();
  emberGeo.setAttribute('position', new BufferAttribute(emberPos, 3));
  emberGeo.setAttribute('aLife', new BufferAttribute(emberLife, 1));
  emberGeo.setAttribute('aSeed', new BufferAttribute(emberSeed, 1));
  const emberMat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
    uniforms: { uScale: pointScale, uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      uniform float uScale;
      uniform float uTime;
      attribute float aLife;
      attribute float aSeed;
      varying float vA;
      void main() {
        float flicker = 0.6 + 0.4 * sin(uTime * (14.0 + aSeed * 12.0) + aSeed * 50.0);
        vA = (1.0 - smoothstep(0.55, 1.0, aLife)) * smoothstep(0.0, 0.05, aLife) * flicker;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = max(0.03 * uScale / max(-mv.z, 0.1), 1.5);
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float core = smoothstep(1.0, 0.2, d);
        gl_FragColor = vec4(vec3(1.0, 0.5, 0.14) * core * vA * 1.4, 1.0);
      }
    `,
  });
  const embers = new Points(emberGeo, emberMat);
  embers.frustumCulled = false;
  embers.renderOrder = 3;
  group.add(embers);

  // Thin smoke column, lit warm from below.
  const smokePos = new Float32Array(SMOKE_COUNT * 3);
  const smokeAge = new Float32Array(SMOKE_COUNT);
  const smokeLifeSpan = new Float32Array(SMOKE_COUNT);
  const smokeLife = new Float32Array(SMOKE_COUNT);
  const smokeSize = new Float32Array(SMOKE_COUNT);
  const smokeDrift = new Float32Array(SMOKE_COUNT * 2);
  const spawnSmoke = (i: number, initial: boolean) => {
    smokePos[i * 3] = (rng() - 0.5) * 0.2;
    smokePos[i * 3 + 1] = 0.9;
    smokePos[i * 3 + 2] = (rng() - 0.5) * 0.2;
    smokeLifeSpan[i] = 4 + rng() * 3;
    smokeAge[i] = initial ? rng() * smokeLifeSpan[i] : 0;
    smokeDrift[i * 2] = 0.12 + rng() * 0.12;
    smokeDrift[i * 2 + 1] = (rng() - 0.5) * 0.12;
  };
  for (let i = 0; i < SMOKE_COUNT; i++) spawnSmoke(i, true);
  const smokeGeo = new BufferGeometry();
  smokeGeo.setAttribute('position', new BufferAttribute(smokePos, 3));
  smokeGeo.setAttribute('aLife', new BufferAttribute(smokeLife, 1));
  smokeGeo.setAttribute('aSize', new BufferAttribute(smokeSize, 1));
  const smokeMat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: NormalBlending,
    toneMapped: false,
    uniforms: { uScale: pointScale, uI: { value: 1 } },
    vertexShader: /* glsl */ `
      uniform float uScale;
      attribute float aLife;
      attribute float aSize;
      varying float vLife;
      void main() {
        vLife = aLife;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uScale / max(-mv.z, 0.1);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uI;
      varying float vLife;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float soft = smoothstep(1.0, 0.0, d);
        vec3 warm = vec3(0.32, 0.16, 0.08) * uI;
        vec3 cold = vec3(0.07, 0.08, 0.1);
        vec3 col = mix(warm, cold, smoothstep(0.0, 0.45, vLife));
        float a = soft * smoothstep(0.0, 0.15, vLife) * (1.0 - smoothstep(0.4, 1.0, vLife)) * 0.12;
        gl_FragColor = vec4(col, a);
      }
    `,
  });
  const smoke = new Points(smokeGeo, smokeMat);
  smoke.frustumCulled = false;
  smoke.renderOrder = 1;
  group.add(smoke);

  // Soft glow billboard around the flames.
  const glowMat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
    uniforms: { uI: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uI;
      varying vec2 vUv;
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        p.y *= 1.15;
        float d = length(p);
        float g = exp(-d * d * 5.0) * 0.28 + exp(-d * 2.6) * 0.07;
        g *= 1.0 - smoothstep(0.85, 1.0, d);
        gl_FragColor = vec4(vec3(1.0, 0.45, 0.14) * g * uI, 1.0);
      }
    `,
  });
  const glow = new Mesh(new PlaneGeometry(5.5, 5.5), glowMat);
  glow.position.y = 0.75;
  glow.renderOrder = 4;
  group.add(glow);

  const light = new PointLight(new Color('#ff8f45'), LIGHT_BASE, 28, 2);
  light.position.set(0, 1.0, 0);
  group.add(light);

  let smokeEnabled = true;

  const build: FireBuild = {
    group,
    light,
    intensity: 1,
    update(time, dt, camera) {
      const n = valueNoise(time * 6.5, 0.5, 3);
      const n2 = valueNoise(time * 1.3, 4.2, 8);
      const flicker = 0.78 + n * 0.22 + n2 * 0.12 + Math.sin(time * 9.7) * 0.025;
      build.intensity = flicker;
      light.intensity = LIGHT_BASE * flicker;
      light.position.set((n - 0.5) * 0.12, 0.95 + n2 * 0.2, (n2 - 0.5) * 0.12);
      charMat.emissiveIntensity = 0.22 + n * 0.25;
      bedMat.uniforms.uTime.value = time;
      bedMat.uniforms.uI.value = 0.7 + n2 * 0.4;
      flameMat.uniforms.uI.value = 0.85 + n * 0.3;
      glowMat.uniforms.uI.value = flicker;
      smokeMat.uniforms.uI.value = flicker;
      emberMat.uniforms.uTime.value = time;

      for (let i = 0; i < FLAME_COUNT; i++) {
        flameAge[i] += dt;
        if (flameAge[i] >= flameLifeSpan[i]) spawnFlame(i, false);
        const k = i * 3;
        const t = flameAge[i] / flameLifeSpan[i];
        const swirl = Math.sin(time * 5 + flameSeed[i] * 20 + flamePos[k + 1] * 6) * 0.35;
        flameVel[k] += (-flamePos[k] * 2.4 + swirl) * dt;
        flameVel[k + 2] += (-flamePos[k + 2] * 2.4 + Math.cos(time * 4.3 + flameSeed[i] * 13) * 0.3) * dt;
        flameVel[k + 1] += 0.4 * dt;
        flamePos[k] += flameVel[k] * dt;
        flamePos[k + 1] += flameVel[k + 1] * dt;
        flamePos[k + 2] += flameVel[k + 2] * dt;
        flameLife[i] = t;
        flameSize[i] = flameSize0[i] * (1 - t * 0.65);
      }
      flameGeo.attributes.position.needsUpdate = true;
      flameGeo.attributes.aLife.needsUpdate = true;
      flameGeo.attributes.aSize.needsUpdate = true;

      for (let i = 0; i < EMBER_COUNT; i++) {
        emberAge[i] += dt;
        if (emberAge[i] >= emberLifeSpan[i]) spawnEmber(i, false);
        const k = i * 3;
        emberVel[k] += Math.sin(time * 1.7 + emberSeed[i] * 30) * 0.4 * dt;
        emberVel[k + 2] += Math.cos(time * 1.3 + emberSeed[i] * 17) * 0.4 * dt;
        emberVel[k + 1] *= 1 - 0.25 * dt;
        emberPos[k] += emberVel[k] * dt;
        emberPos[k + 1] += emberVel[k + 1] * dt;
        emberPos[k + 2] += emberVel[k + 2] * dt;
        emberLife[i] = emberAge[i] / emberLifeSpan[i];
      }
      emberGeo.attributes.position.needsUpdate = true;
      emberGeo.attributes.aLife.needsUpdate = true;

      if (smokeEnabled) {
        for (let i = 0; i < SMOKE_COUNT; i++) {
          smokeAge[i] += dt;
          if (smokeAge[i] >= smokeLifeSpan[i]) spawnSmoke(i, false);
          const k = i * 3;
          const t = smokeAge[i] / smokeLifeSpan[i];
          smokePos[k] += (smokeDrift[i * 2] * t + Math.sin(time * 0.7 + i) * 0.05) * dt;
          smokePos[k + 1] += (0.75 - t * 0.25) * dt;
          smokePos[k + 2] += smokeDrift[i * 2 + 1] * dt;
          smokeLife[i] = t;
          smokeSize[i] = 0.5 + t * 2.6;
        }
        smokeGeo.attributes.position.needsUpdate = true;
        smokeGeo.attributes.aLife.needsUpdate = true;
        smokeGeo.attributes.aSize.needsUpdate = true;
      }

      glow.quaternion.copy(camera.quaternion);
    },
    setPointScale(scale) {
      pointScale.value = scale;
    },
    setSmokeEnabled(on) {
      smokeEnabled = on;
      smoke.visible = on;
    },
  };
  return build;
}
