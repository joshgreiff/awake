import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  NormalBlending,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Points,
  Quaternion,
  ShaderMaterial,
  TorusGeometry,
  Vector3,
  BackSide,
} from 'three';
import { jitterVertices } from './forest';
import {
  ColliderGrid,
  FURROW_DIR,
  HOLLOW,
  HOLLOW_FLOOR,
  LOG_CENTER_HEIGHT,
  LOG_RADIUS,
  POND,
  SEATS,
  TRAIL,
  heightAt,
  seatAxis,
} from './layout';
import { GLSL_NOISE, hash2, mulberry32 } from './noise';

/**
 * The hollow east of the clearing and the small story props scattered around the
 * world. Pure scenery and presentation; `story.ts` decides what is shown when.
 */

export interface Spot {
  x: number;
  y: number;
  z: number;
}

export type TokenPlace = 'field' | 'fire' | 'none';

export interface HollowBuild {
  group: Group;
  /** Where the player stands to look at the hull panel. */
  panelSpot: Spot;
  /** Candidate resting places for the small token, chosen per save. */
  tokenSpots: Spot[];
  cairnTop: Spot;
  update(time: number, dt: number, camera: PerspectiveCamera): void;
  setPointScale(scale: number): void;
  setPanelLit(on: boolean): void;
  setToken(place: TokenPlace, spot: number): void;
  setVoiceVisible(on: boolean): void;
  setCairnExtra(count: number): void;
  /** Begin a slow pulse sequence from the hull. */
  signal(): void;
  readonly signalling: boolean;
}

const CYAN = new Color(0.45, 0.85, 1.0);
const PERP = { x: -FURROW_DIR.z, z: FURROW_DIR.x };

function along(dist: number, side: number): { x: number; z: number } {
  return {
    x: HOLLOW.x + FURROW_DIR.x * dist + PERP.x * side,
    z: HOLLOW.z + FURROW_DIR.z * dist + PERP.z * side,
  };
}

export function createHollow(colliders: ColliderGrid): HollowBuild {
  const rng = mulberry32(5150);
  const group = new Group();
  group.name = 'hollow';

  // ---------------------------------------------------------------- hull
  const hullMat = new MeshLambertMaterial({ color: '#5a6069', flatShading: true });
  const scorchMat = new MeshLambertMaterial({ color: '#2a2827', flatShading: true });
  const darkMat = new MeshLambertMaterial({ color: '#0d1013', side: BackSide });
  const ribMat = new MeshLambertMaterial({ color: '#4c525b', flatShading: true });

  const hull = new Group();
  const yaw = Math.atan2(-FURROW_DIR.z, FURROW_DIR.x);
  const hullCenter = along(1.6, 0);
  hull.position.set(hullCenter.x, HOLLOW_FLOOR + 0.3, hullCenter.z);
  hull.rotation.set(0.22, yaw, 0.1, 'YXZ');
  group.add(hull);

  const body = new Mesh(
    jitterVertices(new CylinderGeometry(1.25, 1.4, 6.5, 14, 4, true).rotateZ(Math.PI / 2), 0.07, 301),
    hullMat,
  );
  hull.add(body);
  const inner = new Mesh(new CylinderGeometry(1.18, 1.32, 6.4, 14, 1, true).rotateZ(Math.PI / 2), darkMat);
  hull.add(inner);
  const nose = new Mesh(jitterVertices(new ConeGeometry(1.26, 2.6, 14, 3).rotateZ(Math.PI / 2), 0.22, 302), scorchMat);
  nose.position.x = -3.25 - 1.3;
  hull.add(nose);
  for (const x of [-2.1, 0.4, 2.7]) {
    const rib = new Mesh(new TorusGeometry(1.36 + x * -0.012, 0.075, 5, 18).rotateY(Math.PI / 2), ribMat);
    rib.position.x = x;
    hull.add(rib);
  }

  // Torn openings and burn scars on the skin.
  const breachMat = new MeshBasicMaterial({ color: '#030405' });
  for (const [x, ang, w, h] of [
    [-0.8, 2.2, 1.1, 0.5],
    [1.6, -1.9, 0.7, 0.9],
    [2.9, 0.5, 0.6, 0.4],
  ]) {
    const breach = new Mesh(jitterVertices(new PlaneGeometry(w, h, 3, 2), 0.08, 307 + x * 10), breachMat);
    breach.position.set(x, Math.sin(ang) * 1.33, Math.cos(ang) * 1.33);
    breach.quaternion.copy(new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), new Vector3(0, Math.sin(ang), Math.cos(ang))));
    hull.add(breach);
  }
  for (const x of [-2.6, -1.4]) {
    const scar = new Mesh(new CylinderGeometry(1.43, 1.43, 0.6, 14, 1, true, 3.6, 2.4).rotateZ(Math.PI / 2), scorchMat);
    scar.position.x = x;
    hull.add(scar);
  }

  const stripMat = new MeshBasicMaterial({ color: CYAN.clone(), toneMapped: false });
  const stripMatB = new MeshBasicMaterial({ color: CYAN.clone(), toneMapped: false });
  const strip = new Mesh(new BoxGeometry(5.0, 0.07, 0.09), stripMat);
  strip.position.set(0.1, 0.9, 0.95);
  strip.rotation.x = -0.75;
  hull.add(strip);
  const stripB = new Mesh(new BoxGeometry(2.1, 0.05, 0.07), stripMatB);
  stripB.position.set(-1.2, 0.9, -0.95);
  stripB.rotation.x = 0.75;
  hull.add(stripB);

  // Panel on the trail-facing flank.
  const panelMat = new ShaderMaterial({
    toneMapped: false,
    uniforms: { uTime: { value: 0 }, uLit: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uLit;
      varying vec2 vUv;
      ${GLSL_NOISE}
      void main() {
        vec2 p = vUv;
        float edge = smoothstep(0.0, 0.04, p.x) * smoothstep(1.0, 0.96, p.x) * smoothstep(0.0, 0.06, p.y) * smoothstep(1.0, 0.94, p.y);
        float idle = step(0.985, hash12(vec2(floor(uTime * 7.0), 3.0))) * 0.25 + 0.03;
        float row = floor(p.y * 10.0);
        float scroll = floor(uTime * 1.5);
        float cell = floor(p.x * 26.0);
        float glyph = step(0.42, hash12(vec2(cell, row + scroll))) * step(hash12(vec2(row + scroll, 9.0)) * 26.0, 26.0 - cell);
        float rowGap = step(0.25, fract(p.y * 10.0)) * step(fract(p.y * 10.0), 0.8);
        float scan = 0.85 + 0.15 * sin(p.y * 160.0 + uTime * 6.0);
        float lit = glyph * rowGap * scan * uLit;
        float wake = 0.5 + 0.5 * sin(uTime * 0.9);
        vec3 col = vec3(0.03, 0.09, 0.11) * (idle * 3.0 + wake * 0.6) + vec3(0.4, 0.85, 1.0) * lit * 0.9;
        col += vec3(0.05, 0.12, 0.15) * uLit;
        gl_FragColor = vec4(col * edge, 1.0);
      }
    `,
  });
  const panelFrame = new Mesh(new BoxGeometry(0.06, 0.62, 0.9), ribMat);
  const panel = new Object3D();
  panel.position.set(-1.7, 0.6, 1.24);
  panel.rotation.x = -0.45;
  hull.add(panel);
  panelFrame.rotation.y = Math.PI / 2;
  panelFrame.rotation.x = -0.2;
  panel.add(panelFrame);
  const screen = new Mesh(new PlaneGeometry(0.8, 0.52), panelMat);
  screen.position.z = 0.035;
  screen.rotation.x = -0.2;
  panel.add(screen);

  // Small light near the tail.
  const beacon = new Vector3(2.4, 1.45, 0);

  // Cold spill from the strips; no shadows, so it stays cheap.
  const coldLight = new PointLight(new Color('#7fd6ff'), 5, 11, 2);
  coldLight.position.set(-0.4, 1.9, 1.6);
  hull.add(coldLight);

  hull.updateMatrixWorld(true);
  const panelWorld = panel.getWorldPosition(new Vector3());
  const beaconWorld = hull.localToWorld(beacon.clone());
  const flank = new Vector3(0, 0, 1).applyQuaternion(hull.quaternion);
  flank.y = 0;
  flank.normalize();
  const panelSpot: Spot = {
    x: panelWorld.x + flank.x * 1.0,
    y: heightAt(panelWorld.x + flank.x, panelWorld.z + flank.z),
    z: panelWorld.z + flank.z * 1.0,
  };

  for (let t = -4.6; t <= 3.3; t += 1.1) {
    const c = along(1.6 + t, 0);
    colliders.add({ x: c.x, z: c.z, r: t < -3.5 ? 1.0 : 1.4 });
  }

  // ---------------------------------------------------------------- debris and fallen trees
  const plateGeo = new BoxGeometry(1, 0.04, 1);
  const plates = new InstancedMesh(plateGeo, hullMat, 14);
  const m = new Matrix4();
  const q = new Quaternion();
  const s = new Vector3();
  const p = new Vector3();
  const axis = new Vector3();
  for (let i = 0; i < 14; i++) {
    const d = 4 + rng() * 24;
    const c = along(d, (rng() - 0.5) * 4.4);
    p.set(c.x, heightAt(c.x, c.z) + 0.03, c.z);
    axis.set(rng() - 0.5, rng() * 0.3, rng() - 0.5).normalize();
    q.setFromAxisAngle(axis, 0.3 + rng() * 0.9);
    s.set(0.5 + rng() * 0.9, 1, 0.3 + rng() * 0.6);
    m.compose(p, q, s);
    plates.setMatrixAt(i, m);
  }
  group.add(plates);

  const fin = new Mesh(jitterVertices(new BoxGeometry(2.3, 1.3, 0.08, 4, 3, 1), 0.06, 303), hullMat);
  const finPos = along(6.2, 2.5);
  fin.position.set(finPos.x, heightAt(finPos.x, finPos.z) + 0.35, finPos.z);
  fin.rotation.set(0.25, yaw + 0.6, 1.1, 'YXZ');
  group.add(fin);
  colliders.add({ x: finPos.x, z: finPos.z, r: 0.8 });

  const barkMat = new MeshLambertMaterial({ color: '#2a221d' });
  const charMat = new MeshLambertMaterial({ color: '#141110', flatShading: true });
  const trunkGeo = jitterVertices(new CylinderGeometry(0.2, 0.27, 1, 7, 3), 0.04, 304);
  const stumpGeo = jitterVertices(new CylinderGeometry(0.2, 0.3, 1, 7, 2), 0.09, 305);
  const fallen = [
    { d: 3.5, side: 3.4, len: 7.0, turn: 0.55 },
    { d: 9.0, side: -3.1, len: 6.0, turn: -0.5 },
    { d: 13.5, side: 3.0, len: 7.5, turn: 0.7 },
    { d: 17.0, side: -3.6, len: 5.5, turn: -0.85 },
    { d: -1.5, side: -6.5, len: 6.5, turn: -1.4 },
    { d: 21.0, side: 2.9, len: 6.5, turn: 0.4 },
  ];
  for (const f of fallen) {
    const base = along(f.d, f.side);
    const by = heightAt(base.x, base.z);
    const stumpH = 0.5 + rng() * 0.7;
    const stump = new Mesh(stumpGeo, charMat);
    stump.scale.set(1, stumpH, 1);
    stump.position.set(base.x, by + stumpH / 2 - 0.05, base.z);
    group.add(stump);
    colliders.add({ x: base.x, z: base.z, r: 0.4 });

    // Fall direction: away from the furrow's axis, swept the way the furrow runs.
    const sideSign = Math.sign(f.side);
    const dir = new Vector3(
      PERP.x * sideSign * Math.cos(f.turn) + FURROW_DIR.x * Math.sin(Math.abs(f.turn)),
      0,
      PERP.z * sideSign * Math.cos(f.turn) + FURROW_DIR.z * Math.sin(Math.abs(f.turn)),
    ).normalize();
    const mid = { x: base.x + dir.x * (f.len / 2 + 0.3), z: base.z + dir.z * (f.len / 2 + 0.3) };
    const log = new Mesh(trunkGeo, barkMat);
    log.scale.set(1, f.len, 1);
    log.position.set(mid.x, heightAt(mid.x, mid.z) + 0.22, mid.z);
    log.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), dir);
    group.add(log);
    for (let t = -0.4; t <= 0.41; t += 0.2) {
      colliders.add({ x: mid.x + dir.x * t * f.len, z: mid.z + dir.z * t * f.len, r: 0.32 });
    }
  }

  // ---------------------------------------------------------------- ground glow, mist
  const glowMat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
    uniforms: { uI: { value: 0.5 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uI;
      varying vec2 vUv;
      void main() {
        float d = length((vUv - 0.5) * 2.0);
        float g = exp(-d * d * 3.5) * (1.0 - smoothstep(0.8, 1.0, d));
        gl_FragColor = vec4(vec3(0.05, 0.16, 0.2) * g * uI, 1.0);
      }
    `,
  });
  const glow = new Mesh(new CircleGeometry(5, 28), glowMat);
  glow.rotation.x = -Math.PI / 2;
  glow.position.set(hullCenter.x, HOLLOW_FLOOR + 0.06, hullCenter.z);
  group.add(glow);

  const mistMat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: NormalBlending,
    toneMapped: false,
    side: DoubleSide,
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorld;
      void main() {
        vUv = uv;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vWorld;
      ${GLSL_NOISE}
      void main() {
        float d = length((vUv - 0.5) * 2.0);
        float n = fbm2(vWorld.xz * 0.18 + vec2(uTime * 0.02, -uTime * 0.013));
        float a = smoothstep(0.35, 0.8, n) * (1.0 - smoothstep(0.45, 1.0, d)) * 0.32;
        float camFade = smoothstep(1.0, 3.0, length(cameraPosition - vWorld));
        gl_FragColor = vec4(vec3(0.085, 0.11, 0.145), a * camFade);
      }
    `,
  });
  for (const [h, sc] of [
    [0.35, 1],
    [0.85, 0.8],
  ]) {
    const mist = new Mesh(new PlaneGeometry(20, 20), mistMat);
    mist.rotation.x = -Math.PI / 2;
    mist.position.set(HOLLOW.x, HOLLOW_FLOOR + h, HOLLOW.z);
    mist.scale.setScalar(sc);
    mist.renderOrder = 1;
    group.add(mist);
  }

  // ---------------------------------------------------------------- motes
  const MOTES = 80;
  const moteSeed = new Float32Array(MOTES * 3);
  for (let i = 0; i < MOTES * 3; i++) moteSeed[i] = rng();
  const moteGeo = new BufferGeometry();
  moteGeo.setAttribute('position', new BufferAttribute(new Float32Array(MOTES * 3), 3));
  moteGeo.setAttribute('aSeed', new BufferAttribute(moteSeed, 3));
  const pointScale = { value: 600 };
  const moteMat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
    uniforms: {
      uTime: { value: 0 },
      uScale: pointScale,
      uCenter: { value: new Vector3(HOLLOW.x, HOLLOW_FLOOR, HOLLOW.z) },
      uBoost: { value: 0 },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uScale;
      uniform vec3 uCenter;
      uniform float uBoost;
      attribute vec3 aSeed;
      varying float vA;
      void main() {
        float h = mod(aSeed.y * 6.0 + uTime * (0.08 + aSeed.z * 0.08), 6.0);
        float ang = aSeed.x * 6.2831;
        float rad = sqrt(aSeed.z) * 7.0;
        vec3 p = uCenter + vec3(cos(ang) * rad, h, sin(ang) * rad);
        p.x += sin(uTime * 0.31 + aSeed.z * 20.0) * 0.35;
        p.z += cos(uTime * 0.27 + aSeed.x * 17.0) * 0.35;
        vec4 mv = viewMatrix * vec4(p, 1.0);
        float life = h / 6.0;
        float tw = 0.55 + 0.45 * sin(uTime * (1.2 + aSeed.y * 2.0) + aSeed.x * 40.0);
        vA = smoothstep(0.0, 0.12, life) * (1.0 - smoothstep(0.6, 1.0, life)) * tw * (1.0 + uBoost * 1.5);
        vA *= 1.0 - smoothstep(26.0, 40.0, -mv.z);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = max(0.05 * uScale / max(-mv.z, 0.1), 1.2);
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float core = smoothstep(1.0, 0.0, d);
        gl_FragColor = vec4(vec3(0.5, 0.85, 1.0) * core * core * vA * 0.9, 1.0);
      }
    `,
  });
  const motes = new Points(moteGeo, moteMat);
  motes.frustumCulled = false;
  motes.renderOrder = 3;
  group.add(motes);

  // ---------------------------------------------------------------- footprints toward the fire
  const prints: Matrix4[] = [];
  const up = new Vector3(0, 1, 0);
  for (let i = TRAIL.length - 1; i > 0; i--) {
    const a = TRAIL[i];
    const b = TRAIL[i - 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const dx = (b.x - a.x) / len;
    const dz = (b.z - a.z) / len;
    for (let t = 0; t < len; t += 0.72) {
      const n = prints.length;
      if (hash2(n, 7, 91) < 0.18) continue;
      const side = n % 2 === 0 ? 0.12 : -0.12;
      const x = a.x + dx * t - dz * side;
      const z = a.z + dz * t + dx * side;
      q.setFromAxisAngle(up, Math.atan2(dx, dz) + (hash2(n, 3, 92) - 0.5) * 0.25);
      p.set(x, heightAt(x, z) + 0.025, z);
      s.set(0.1, 1, 0.24);
      prints.push(new Matrix4().compose(p, q, s));
    }
  }
  const printGeo = new CircleGeometry(0.5, 10).rotateX(-Math.PI / 2);
  const printMat = new MeshBasicMaterial({
    color: '#0a0806',
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
  const footprints = new InstancedMesh(printGeo, printMat, prints.length);
  prints.forEach((mat, i) => footprints.setMatrixAt(i, mat));
  footprints.renderOrder = 1;
  group.add(footprints);

  // ---------------------------------------------------------------- small props
  const tokenSpots: Spot[] = [along(7.5, 1.1), { x: -11.9, z: -8.2 }, { x: POND.x - POND.r - 0.5, z: POND.z + 1.2 }].map(
    (c) => ({ x: c.x, y: heightAt(c.x, c.z), z: c.z }),
  );
  const metalMat = new MeshLambertMaterial({ color: '#9aa3ad', emissive: new Color('#141a20') });
  const token = new Mesh(new BoxGeometry(0.075, 0.008, 0.115), metalMat);
  token.visible = false;
  group.add(token);
  const seat = SEATS[0];
  const seatDir = seatAxis(seat);
  const fireSpot: Spot = {
    x: seat.x + seatDir.x * 0.75,
    y: heightAt(seat.x, seat.z) + LOG_CENTER_HEIGHT + LOG_RADIUS - 0.01,
    z: seat.z + seatDir.z * 0.75,
  };

  const cairnX = POND.x + POND.r + 1.3;
  const cairnZ = POND.z + 0.8;
  const cairnTop: Spot = { x: cairnX, y: heightAt(cairnX, cairnZ) - 0.05 + 1.11, z: cairnZ };
  const voice = new Mesh(new CylinderGeometry(0.035, 0.04, 0.13, 8), new MeshLambertMaterial({ color: '#1c2228' }));
  voice.rotation.z = Math.PI / 2;
  voice.position.set(cairnTop.x, cairnTop.y + 0.035, cairnTop.z);
  voice.visible = false;
  group.add(voice);

  const stoneGeo = jitterVertices(new DodecahedronGeometry(0.6, 0), 0.18, 306);
  const extraStones: Mesh[] = [];
  let sy = cairnTop.y;
  for (let i = 0; i < 4; i++) {
    const h = 0.12 - i * 0.015;
    const w = 0.17 - i * 0.02;
    const st = new Mesh(stoneGeo, new MeshLambertMaterial({ color: new Color(0.17, 0.165, 0.155) }));
    st.scale.set(w, h, w * 0.9);
    st.rotation.set((rng() - 0.5) * 0.3, rng() * 6.28, (rng() - 0.5) * 0.3);
    st.position.set(cairnX + (rng() - 0.5) * 0.04, sy + h * 0.5, cairnZ + (rng() - 0.5) * 0.04);
    sy += h * 0.95;
    st.visible = false;
    group.add(st);
    extraStones.push(st);
  }

  // Glints: token sparkle, voice LED, hull beacon.
  const glintPos = new Float32Array(9);
  const glintMode = new Float32Array([0, 1, 2]);
  const glintVis = new Float32Array([0, 0, 1]);
  glintPos.set([beaconWorld.x, beaconWorld.y, beaconWorld.z], 6);
  const glintGeo = new BufferGeometry();
  glintGeo.setAttribute('position', new BufferAttribute(glintPos, 3));
  glintGeo.setAttribute('aMode', new BufferAttribute(glintMode, 1));
  glintGeo.setAttribute('aVis', new BufferAttribute(glintVis, 1));
  const glintMat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
    uniforms: { uTime: { value: 0 }, uScale: pointScale, uSignal: { value: 0 } },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uScale;
      uniform float uSignal;
      attribute float aMode;
      attribute float aVis;
      varying float vA;
      varying vec3 vCol;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float dist = -mv.z;
        float a = 0.0;
        float size = 0.06;
        if (aMode < 0.5) {
          float ph = fract(uTime / 2.7);
          a = smoothstep(0.0, 0.03, ph) * (1.0 - smoothstep(0.03, 0.14, ph));
          a *= 1.0 - smoothstep(5.0, 10.0, dist);
          size = 0.22;
          vCol = vec3(1.0, 0.95, 0.85);
        } else if (aMode < 1.5) {
          a = 0.35 + 0.65 * smoothstep(0.6, 1.0, sin(uTime * 2.1) * 0.5 + 0.5);
          a *= 1.0 - smoothstep(8.0, 14.0, dist);
          size = 0.05;
          vCol = vec3(0.4, 0.75, 1.0);
        } else {
          float ph = fract(uTime / 3.4);
          a = (1.0 - smoothstep(0.0, 0.07, ph)) * 0.9 + uSignal * 1.5;
          size = 0.12 + uSignal * 0.5;
          vCol = vec3(0.55, 0.9, 1.0);
        }
        vA = a * aVis;
        gl_Position = projectionMatrix * mv;
        gl_PointSize = max(size * uScale / max(dist, 0.1), 2.0) * step(0.001, vA);
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vA;
      varying vec3 vCol;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c) * 2.0;
        float core = exp(-d * d * 7.0);
        float star = max(0.0, 1.0 - abs(c.x) * 18.0) * max(0.0, 1.0 - abs(c.y) * 2.2)
                   + max(0.0, 1.0 - abs(c.y) * 18.0) * max(0.0, 1.0 - abs(c.x) * 2.2);
        gl_FragColor = vec4(vCol * (core + star * 0.35) * vA, 1.0);
      }
    `,
  });
  const glints = new Points(glintGeo, glintMat);
  glints.frustumCulled = false;
  glints.renderOrder = 4;
  group.add(glints);

  // ---------------------------------------------------------------- beam
  const beamMat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
    side: DoubleSide,
    uniforms: { uLevel: { value: 0 }, uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying float vRim;
      void main() {
        vUv = uv;
        vec3 n = normalize(normalMatrix * normal);
        vRim = abs(n.z);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uLevel;
      uniform float uTime;
      varying vec2 vUv;
      varying float vRim;
      void main() {
        float fall = pow(1.0 - vUv.y, 2.6);
        float ripple = 0.75 + 0.25 * sin(vUv.y * 60.0 - uTime * 3.0);
        float a = uLevel * fall * pow(vRim, 1.5) * ripple;
        gl_FragColor = vec4(vec3(0.35, 0.75, 0.95) * a * 0.85, 1.0);
      }
    `,
  });
  const beam = new Mesh(new CylinderGeometry(0.4, 1.1, 80, 16, 1, true).translate(0, 40, 0), beamMat);
  beam.position.copy(beaconWorld);
  beam.visible = false;
  beam.frustumCulled = false;
  group.add(beam);

  // ---------------------------------------------------------------- state
  let panelTarget = 0;
  let panelLevel = 0;
  let signalT = -1;
  const SIGNAL_LENGTH = 14;

  const build: HollowBuild = {
    group,
    panelSpot,
    tokenSpots,
    cairnTop,
    get signalling() {
      return signalT >= 0;
    },
    update(time, dt) {
      panelLevel += (panelTarget - panelLevel) * (1 - Math.exp(-dt * 3));
      panelMat.uniforms.uTime.value = time;
      panelMat.uniforms.uLit.value = panelLevel;
      moteMat.uniforms.uTime.value = time;
      glintMat.uniforms.uTime.value = time;
      beamMat.uniforms.uTime.value = time;

      let sig = 0;
      if (signalT >= 0) {
        signalT += dt;
        // Three slow swells.
        const phase = signalT / SIGNAL_LENGTH;
        sig = Math.pow(Math.max(0, Math.sin(phase * Math.PI * 3)), 2) * Math.sin(Math.min(phase, 1) * Math.PI);
        if (signalT > SIGNAL_LENGTH) {
          signalT = -1;
          sig = 0;
        }
      }
      beam.visible = sig > 0.002;
      beamMat.uniforms.uLevel.value = sig;
      glintMat.uniforms.uSignal.value = sig;
      moteMat.uniforms.uBoost.value = sig;

      const flicker = 0.55 + 0.45 * Math.sin(time * 0.7) * Math.sin(time * 0.23 + 1.0);
      const stutter = hash2(Math.floor(time * 9), 1, 77) > 0.93 ? 0.25 : 1;
      const level = (0.4 + flicker * 0.25 + sig * 0.9 + panelLevel * 0.15) * stutter;
      stripMat.color.copy(CYAN).multiplyScalar(level);
      const brokenOn = hash2(Math.floor(time * 3.3), 2, 78) > 0.55 ? 1 : 0.08;
      stripMatB.color.copy(CYAN).multiplyScalar((0.35 + sig * 0.6) * brokenOn);
      coldLight.intensity = 3 + level * 4 + sig * 14;
      glowMat.uniforms.uI.value = 0.55 + flicker * 0.2 + sig * 2.2 + panelLevel * 0.3;
      mistMat.uniforms.uTime.value = time;
    },
    setPointScale(scale) {
      pointScale.value = scale;
    },
    setPanelLit(on) {
      panelTarget = on ? 1 : 0;
    },
    setToken(place, spot) {
      const at = place === 'fire' ? fireSpot : tokenSpots[spot % tokenSpots.length];
      token.visible = place !== 'none';
      token.position.set(at.x, at.y + 0.006, at.z);
      token.rotation.set(place === 'fire' ? 0 : 0.08, spot * 1.7 + 0.4, place === 'fire' ? 0 : -0.05);
      glintVis[0] = place === 'field' ? 1 : 0;
      glintPos.set([at.x, at.y + 0.03, at.z], 0);
      glintGeo.attributes.position.needsUpdate = true;
      glintGeo.attributes.aVis.needsUpdate = true;
    },
    setVoiceVisible(on) {
      voice.visible = on;
      glintVis[1] = on ? 1 : 0;
      glintPos.set([cairnTop.x + 0.05, cairnTop.y + 0.07, cairnTop.z], 3);
      glintGeo.attributes.position.needsUpdate = true;
      glintGeo.attributes.aVis.needsUpdate = true;
    },
    setCairnExtra(count) {
      extraStones.forEach((st, i) => (st.visible = i < count));
    },
    signal() {
      if (signalT < 0) signalT = 0;
    },
  };
  return build;
}
