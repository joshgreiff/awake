import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  NormalBlending,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { MOON_DIR } from './layout';
import { fbm, GLSL_NOISE, mulberry32 } from './noise';

/**
 * Sky, stars, moon and hills write display-space values directly (no tone mapping,
 * no colour-space conversion) so they line up exactly with the scene fog colour.
 */
export const SKY = {
  zenith: new Vector3(0.01, 0.014, 0.036),
  horizon: new Vector3(0.07, 0.085, 0.14),
  fog: new Vector3(0.03, 0.04, 0.068),
  airglow: new Vector3(0.0, 0.028, 0.03),
  moonGlow: new Vector3(0.26, 0.26, 0.28),
};

const SKY_RADIUS = 450;
const STAR_RADIUS = 420;
const MOON_DISTANCE = 380;

export interface SkyBuild {
  group: Group;
  update(time: number, dt: number, camera: PerspectiveCamera): void;
  setPixelRatio(pr: number): void;
}

export function createSky(): SkyBuild {
  const group = new Group();
  group.name = 'sky';

  const dome = new Mesh(
    new SphereGeometry(SKY_RADIUS, 48, 24),
    new ShaderMaterial({
      side: BackSide,
      depthWrite: false,
      fog: false,
      toneMapped: false,
      uniforms: {
        uZenith: { value: SKY.zenith },
        uHorizon: { value: SKY.horizon },
        uFog: { value: SKY.fog },
        uAirglow: { value: SKY.airglow },
        uMoonDir: { value: MOON_DIR },
        uMoonGlow: { value: SKY.moonGlow },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = position;
          vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_Position = p.xyww;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uZenith;
        uniform vec3 uHorizon;
        uniform vec3 uFog;
        uniform vec3 uAirglow;
        uniform vec3 uMoonDir;
        uniform vec3 uMoonGlow;
        varying vec3 vDir;
        ${GLSL_NOISE}
        void main() {
          vec3 d = normalize(vDir);
          float h = d.y;
          vec3 col = mix(uHorizon, uZenith, pow(clamp(h, 0.0, 1.0), 0.42));
          col = mix(col, uFog, smoothstep(0.0, -0.08, h));
          float az = atan(d.x, d.z);
          float band = exp(-pow((h - 0.07) / 0.08, 2.0));
          col += uAirglow * band * (0.55 + 0.45 * sin(az * 2.0 + 1.3));
          float md = max(dot(d, uMoonDir), 0.0);
          col += uMoonGlow * (pow(md, 10.0) * 0.28 + pow(md, 90.0) * 0.45);
          col += uMoonGlow * 0.18 * exp(-pow((h - uMoonDir.y) * 7.0, 2.0)) * pow(md, 3.0);
          col += (hash12(gl_FragCoord.xy) - 0.5) / 255.0;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    }),
  );
  dome.renderOrder = -10;
  dome.frustumCulled = false;
  group.add(dome);

  const stars = createStars();
  group.add(stars.points);

  const moon = createMoon();
  group.add(moon);

  const meteor = createMeteor();
  group.add(meteor.mesh);

  const hills = createHills();

  const root = new Group();
  root.add(group, hills);

  return {
    group: root,
    update(time, dt, camera) {
      group.position.copy(camera.position);
      stars.points.rotation.y = time * 0.0009;
      (stars.points.material as ShaderMaterial).uniforms.uTime.value = time;
      moon.quaternion.copy(camera.quaternion);
      meteor.update(time, dt);
    },
    setPixelRatio(pr) {
      (stars.points.material as ShaderMaterial).uniforms.uPixelRatio.value = pr;
    },
  };
}

function createStars(): { points: Points } {
  const rng = mulberry32(777);
  const mwAxis = new Vector3(0.42, 0.55, 0.72).normalize();
  const tangentA = new Vector3().crossVectors(mwAxis, new Vector3(0, 1, 0)).normalize();
  const tangentB = new Vector3().crossVectors(mwAxis, tangentA).normalize();

  const brightCount = 3200;
  const bandCount = 7000;
  const total = brightCount + bandCount;
  const positions = new Float32Array(total * 3);
  const sizes = new Float32Array(total);
  const phases = new Float32Array(total);
  const colors = new Float32Array(total * 3);
  const bright = new Float32Array(total);
  const dir = new Vector3();

  const cool = new Color(0.78, 0.86, 1.0);
  const white = new Color(1.0, 0.98, 0.95);
  const warm = new Color(1.0, 0.86, 0.68);
  const c = new Color();

  let i = 0;
  while (i < total) {
    const isBand = i >= brightCount;
    if (!isBand) {
      const y = rng() * 2 - 1;
      const t = rng() * Math.PI * 2;
      const rr = Math.sqrt(1 - y * y);
      dir.set(Math.cos(t) * rr, y, Math.sin(t) * rr);
    } else {
      const t = rng() * Math.PI * 2;
      const spread = (rng() + rng() + rng() - 1.5) * 0.16;
      dir
        .copy(tangentA)
        .multiplyScalar(Math.cos(t))
        .addScaledVector(tangentB, Math.sin(t))
        .addScaledVector(mwAxis, spread)
        .normalize();
    }
    if (dir.y < -0.04) continue;

    positions[i * 3] = dir.x * STAR_RADIUS;
    positions[i * 3 + 1] = dir.y * STAR_RADIUS;
    positions[i * 3 + 2] = dir.z * STAR_RADIUS;
    phases[i] = rng();

    if (isBand) {
      const clump = fbm(dir.x * 6 + 3, dir.z * 6 + dir.y * 4, 3, 2);
      sizes[i] = 1.0 + rng() * 0.6;
      bright[i] = (0.08 + rng() * 0.2) * (0.4 + clump * 1.2);
      c.copy(white).lerp(cool, rng() * 0.6);
    } else {
      const mag = Math.pow(rng(), 7);
      sizes[i] = 1.1 + mag * 3.4;
      bright[i] = 0.3 + Math.pow(rng(), 2) * 0.5 + mag * 0.6;
      const temp = rng();
      if (temp < 0.35) c.copy(cool).lerp(white, rng());
      else if (temp < 0.8) c.copy(white);
      else c.copy(warm).lerp(white, rng() * 0.5);
    }
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
    i++;
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(positions, 3));
  geo.setAttribute('aSize', new BufferAttribute(sizes, 1));
  geo.setAttribute('aPhase', new BufferAttribute(phases, 1));
  geo.setAttribute('aColor', new BufferAttribute(colors, 3));
  geo.setAttribute('aBright', new BufferAttribute(bright, 1));

  const material = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    fog: false,
    toneMapped: false,
    uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 } },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uPixelRatio;
      attribute float aSize;
      attribute float aPhase;
      attribute vec3 aColor;
      attribute float aBright;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vec3 dir = normalize(world.xyz - cameraPosition);
        float horizon = smoothstep(-0.02, 0.22, dir.y);
        float tw = 0.7 + 0.3 * sin(uTime * (0.9 + aPhase * 2.6) + aPhase * 40.0);
        tw = mix(tw * tw * tw, tw, horizon);
        vAlpha = aBright * tw * mix(0.15, 1.0, horizon) * 1.5;
        vColor = aColor;
        vec4 mv = viewMatrix * world;
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uPixelRatio;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float core = smoothstep(1.0, 0.0, d);
        gl_FragColor = vec4(vColor * vAlpha * core * core, 1.0);
      }
    `,
  });

  const points = new Points(geo, material);
  points.renderOrder = -5;
  points.frustumCulled = false;
  return { points };
}

function createMoon(): Mesh {
  const discRadius = MOON_DISTANCE * Math.tan((2.3 * Math.PI) / 180);
  const planeSize = (discRadius / 0.2) * 2;
  const mesh = new Mesh(
    new PlaneGeometry(planeSize, planeSize),
    new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: NormalBlending,
      fog: false,
      toneMapped: false,
      uniforms: {
        uDisc: { value: new Vector3(1.0, 0.95, 0.84) },
        uHalo: { value: new Vector3(0.46, 0.49, 0.6) },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uDisc;
        uniform vec3 uHalo;
        varying vec2 vUv;
        ${GLSL_NOISE}
        void main() {
          vec2 p = (vUv - 0.5) * 2.0;
          const float R = 0.2;
          float d = length(p);
          float halo = exp(-max(d - R, 0.0) * 8.0) * 0.6 + exp(-d * 2.8) * 0.18;
          vec3 col = uHalo * halo;
          float alpha = clamp(halo * 1.4, 0.0, 1.0);
          if (d < R * 1.02) {
            vec2 q = p / R;
            float z = sqrt(max(1.0 - dot(q, q), 0.0));
            vec3 n = vec3(q, z);
            vec3 L = normalize(vec3(0.42, 0.18, 0.89));
            float lit = smoothstep(-0.05, 0.3, dot(n, L));
            float maria = fbm2(q * 1.7 + vec2(4.1, 2.3));
            float craters = vnoise(q * 9.0 + 3.0);
            float tone = mix(1.0, 0.74, smoothstep(0.44, 0.62, maria)) * (0.94 + craters * 0.08);
            float limb = mix(0.8, 1.0, pow(z, 0.45));
            vec3 disc = uDisc * tone * limb * mix(0.04, 1.0, lit);
            float edge = smoothstep(1.0, 0.975, length(q));
            col = mix(col, disc, edge);
            alpha = max(alpha, edge);
          }
          gl_FragColor = vec4(col, alpha);
        }
      `,
    }),
  );
  mesh.position.copy(MOON_DIR).multiplyScalar(MOON_DISTANCE);
  mesh.renderOrder = -4;
  mesh.frustumCulled = false;
  return mesh;
}

function createHills(): Group {
  const group = new Group();
  group.name = 'hills';
  const layers = [
    { radius: 235, base: -16, amp: 34, freq: 2.2, seed: 5, color: [0.042, 0.052, 0.086] },
    { radius: 170, base: -20, amp: 26, freq: 3.1, seed: 9, color: [0.026, 0.032, 0.055] },
  ];
  for (const layer of layers) {
    const n = 320;
    const verts = new Float32Array((n + 1) * 2 * 3);
    const index: number[] = [];
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const x = Math.sin(a) * layer.radius;
      const z = -Math.cos(a) * layer.radius;
      const ridge = fbm(Math.cos(a) * layer.freq + 10, Math.sin(a) * layer.freq + layer.seed, 5, layer.seed);
      const top = layer.base + Math.pow(ridge, 1.6) * layer.amp * 1.6;
      verts.set([x, top, z, x, layer.base - 70, z], i * 6);
      if (i < n) {
        const k = i * 2;
        index.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
      }
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(verts, 3));
    geo.setIndex(index);
    const color = new Color().setRGB(layer.color[0], layer.color[1], layer.color[2], SRGBColorSpace);
    const mesh = new Mesh(
      geo,
      new MeshBasicMaterial({ color, fog: false, toneMapped: false, side: DoubleSide }),
    );
    mesh.frustumCulled = false;
    group.add(mesh);
  }
  return group;
}

function createMeteor(): {
  mesh: Mesh;
  update(time: number, dt: number): void;
} {
  const rng = mulberry32(31337);
  const positions = new Float32Array(12);
  const uvs = new Float32Array([0, 0, 0, 1, 1, 0, 1, 1]);
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(positions, 3));
  geo.setAttribute('uv', new BufferAttribute(uvs, 2));
  geo.setIndex([0, 2, 1, 1, 2, 3]);
  const material = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    fog: false,
    toneMapped: false,
    side: DoubleSide,
    uniforms: { uFade: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uFade;
      varying vec2 vUv;
      void main() {
        float across = 1.0 - abs(vUv.y - 0.5) * 2.0;
        float along = pow(vUv.x, 2.2);
        float a = along * across * across * uFade;
        gl_FragColor = vec4(vec3(0.85, 0.92, 1.0) * a * 1.4, 1.0);
      }
    `,
  });
  const mesh = new Mesh(geo, material);
  mesh.frustumCulled = false;
  mesh.visible = false;
  mesh.renderOrder = -3;

  const start = new Vector3();
  const travel = new Vector3();
  const head = new Vector3();
  const tail = new Vector3();
  const toCam = new Vector3();
  const side = new Vector3();
  let next = 25 + rng() * 30;
  let age = -1;
  let life = 0.8;

  return {
    mesh,
    update(time, dt) {
      if (age < 0) {
        if (time < next) return;
        const az = rng() * Math.PI * 2;
        const el = 0.35 + rng() * 0.5;
        start.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
        travel
          .set(rng() - 0.5, -0.35 - rng() * 0.4, rng() - 0.5)
          .projectOnPlane(start)
          .normalize();
        life = 0.55 + rng() * 0.6;
        age = 0;
        mesh.visible = true;
      }
      age += dt;
      const t = age / life;
      if (t >= 1) {
        age = -1;
        mesh.visible = false;
        next = time + 20 + rng() * 45;
        return;
      }
      const r = STAR_RADIUS * 0.95;
      head.copy(start).addScaledVector(travel, t * 0.32).normalize().multiplyScalar(r);
      tail.copy(start).addScaledVector(travel, Math.max(t * 0.32 - 0.07, 0)).normalize().multiplyScalar(r);
      toCam.copy(head).negate().normalize();
      side.subVectors(head, tail).cross(toCam).normalize().multiplyScalar(0.55);
      positions.set(
        [
          tail.x - side.x, tail.y - side.y, tail.z - side.z,
          tail.x + side.x, tail.y + side.y, tail.z + side.z,
          head.x - side.x, head.y - side.y, head.z - side.z,
          head.x + side.x, head.y + side.y, head.z + side.z,
        ],
        0,
      );
      geo.attributes.position.needsUpdate = true;
      material.uniforms.uFade.value = Math.sin(Math.PI * t);
    },
  };
}
