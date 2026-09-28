import {
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  Euler,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshLambertMaterial,
  Quaternion,
  Vector3,
  type Material,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CLEARING_RADIUS, ColliderGrid, POND, heightAt, openingMask } from './layout';
import { hash2, mulberry32, smoothstep } from './noise';

/** Trees closer than this to the fire cast firelight shadows. */
const SHADOW_RADIUS = 22;

function jitterVertices(geo: BufferGeometry, amount: number, seed: number): BufferGeometry {
  const pos = geo.attributes.position as BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const kx = Math.round(x * 1000);
    const ky = Math.round(y * 1000);
    const kz = Math.round(z * 1000);
    const h1 = hash2(kx + kz * 7, ky, seed) - 0.5;
    const h2 = hash2(kz - kx * 3, ky, seed + 5) - 0.5;
    const h3 = hash2(kx, kz + ky * 11, seed + 9) - 0.5;
    pos.setXYZ(i, x + h1 * amount, y + h3 * amount * 0.6, z + h2 * amount);
  }
  geo.computeVertexNormals();
  return geo;
}

function tieredCrown(tiers: { r: number; h: number; y: number }[], seed: number, jitter: number): BufferGeometry {
  const parts = tiers.map((t, i) => {
    const cone = new ConeGeometry(t.r, t.h, 7, 1);
    cone.rotateY(i * 0.7 + seed);
    cone.translate(0, t.y, 0);
    return cone;
  });
  const merged = mergeGeometries(parts)!;
  parts.forEach((p) => p.dispose());
  return jitterVertices(merged, jitter, seed);
}

function trunk(rTop: number, rBottom: number, height: number, sides = 6): BufferGeometry {
  const g = new CylinderGeometry(rTop, rBottom, height, sides, 1, true);
  g.translate(0, height / 2 - 0.1, 0);
  return g;
}

function birchCrown(): BufferGeometry {
  const blobs = [
    [0, 5.4, 0, 1.2],
    [1.05, 6.1, 0.35, 1.0],
    [-0.95, 6.0, -0.45, 1.05],
    [0.15, 7.3, 0.2, 0.85],
    [0.7, 4.8, -0.85, 0.8],
    [-0.55, 5.0, 0.9, 0.8],
    [-0.2, 6.6, -1.0, 0.75],
    [0.9, 7.0, -0.2, 0.7],
  ];
  const parts = blobs.map(([x, y, z, r]) => {
    const g = new IcosahedronGeometry(r * 0.85, 0);
    g.scale(1, 0.75, 1);
    g.translate(x * 0.7, 5.9 + (y - 5.9) * 0.8, z * 0.7);
    return g;
  });
  const merged = mergeGeometries(parts)!;
  parts.forEach((p) => p.dispose());
  return jitterVertices(merged, 0.3, 61);
}

function snagGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [trunk(0.05, 0.22, 9.2, 6)];
  const branches = [
    [4.2, 0.3, 2.0, 1.1],
    [5.4, 2.4, 1.6, 1.0],
    [6.3, 4.3, 1.8, 1.2],
    [7.2, 1.2, 1.3, 0.9],
    [3.4, 3.6, 1.2, 1.25],
  ];
  for (const [y, yaw, len, tilt] of branches) {
    const b = new CylinderGeometry(0.02, 0.06, len, 5, 1, true);
    b.translate(0, len / 2, 0);
    b.rotateZ(-tilt);
    b.rotateY(yaw);
    b.translate(0, y, 0);
    parts.push(b);
  }
  const merged = mergeGeometries(parts)!;
  parts.forEach((p) => p.dispose());
  return jitterVertices(merged, 0.05, 71);
}

type SpeciesId = 'pine' | 'spruce' | 'fir' | 'birch' | 'snag';

interface Species {
  crown: BufferGeometry | null;
  trunk: BufferGeometry;
  crownMat: Material | null;
  trunkMat: Material;
  trunkRadius: number;
  crownColor(c: Color, rng: () => number): void;
  trunkColor(c: Color, rng: () => number): void;
}

interface TreePlacement {
  species: SpeciesId;
  x: number;
  z: number;
  s: number;
  sy: number;
  rot: number;
}

function buildSpecies(): Record<SpeciesId, Species> {
  const crownMat = new MeshLambertMaterial({ color: 0xffffff, flatShading: true });
  const barkMat = new MeshLambertMaterial({ color: 0xffffff });
  const conifer = (c: Color, rng: () => number) =>
    c.setHSL(0.33 + rng() * 0.09, 0.26 + rng() * 0.16, 0.075 + rng() * 0.045);
  const bark = (c: Color, rng: () => number) => c.set('#3a2c22').multiplyScalar(0.85 + rng() * 0.3);

  return {
    pine: {
      crown: tieredCrown(
        [
          { r: 2.1, h: 3.8, y: 3.1 },
          { r: 1.65, h: 3.2, y: 4.9 },
          { r: 1.15, h: 2.8, y: 6.6 },
          { r: 0.6, h: 1.8, y: 7.9 },
        ],
        3,
        0.32,
      ),
      trunk: trunk(0.14, 0.26, 2.8),
      crownMat,
      trunkMat: barkMat,
      trunkRadius: 0.28,
      crownColor: conifer,
      trunkColor: bark,
    },
    spruce: {
      crown: tieredCrown(
        Array.from({ length: 6 }, (_, i) => ({ r: 1.5 - i * 0.21, h: 2.3, y: 2.3 + i * 1.35 })),
        7,
        0.22,
      ),
      trunk: trunk(0.12, 0.22, 2.8),
      crownMat,
      trunkMat: barkMat,
      trunkRadius: 0.24,
      crownColor: (c, rng) => c.setHSL(0.4 + rng() * 0.06, 0.22 + rng() * 0.12, 0.065 + rng() * 0.035),
      trunkColor: bark,
    },
    fir: {
      crown: tieredCrown(
        [
          { r: 2.7, h: 3.4, y: 2.5 },
          { r: 2.1, h: 3.0, y: 4.0 },
          { r: 1.4, h: 2.6, y: 5.4 },
        ],
        11,
        0.38,
      ),
      trunk: trunk(0.16, 0.3, 2.2),
      crownMat,
      trunkMat: barkMat,
      trunkRadius: 0.3,
      crownColor: (c, rng) => c.setHSL(0.3 + rng() * 0.08, 0.3 + rng() * 0.15, 0.08 + rng() * 0.04),
      trunkColor: bark,
    },
    birch: {
      crown: birchCrown(),
      trunk: jitterVertices(trunk(0.07, 0.14, 7.6, 6), 0.04, 81),
      crownMat,
      trunkMat: barkMat,
      trunkRadius: 0.14,
      crownColor: (c, rng) => c.setHSL(0.2 + rng() * 0.06, 0.36 + rng() * 0.12, 0.13 + rng() * 0.05),
      trunkColor: (c, rng) => {
        const v = 0.48 + rng() * 0.12;
        c.setRGB(v * 0.96, v * 0.96, v * 0.9);
      },
    },
    snag: {
      crown: null,
      trunk: snagGeometry(),
      crownMat: null,
      trunkMat: barkMat,
      trunkRadius: 0.22,
      crownColor: () => undefined,
      trunkColor: (c, rng) => {
        const v = 0.16 + rng() * 0.05;
        c.setRGB(v, v * 0.95, v * 0.88);
      },
    },
  };
}

function pickSpecies(r: number, open: number, rng: () => number): SpeciesId {
  const u = rng();
  if (open > 0.12 && open < 0.85 && u < 0.14) return 'snag';
  if (r < CLEARING_RADIUS + 9) {
    if (u < 0.38) return 'pine';
    if (u < 0.62) return 'fir';
    if (u < 0.86) return 'birch';
    return 'spruce';
  }
  if (u < 0.04) return 'snag';
  if (u < 0.42) return 'pine';
  if (u < 0.78) return 'spruce';
  if (u < 0.93) return 'fir';
  return 'birch';
}

export interface ForestBuild {
  group: Group;
  treeCount: number;
}

export function createForest(colliders: ColliderGrid): ForestBuild {
  const rng = mulberry32(4242);
  const group = new Group();
  group.name = 'forest';
  const species = buildSpecies();

  colliders.add({ x: POND.x, z: POND.z, r: POND.r * 0.82 });

  // Hand-placed trees: an old giant pine framing the moon, and a few that step into the clearing.
  const special: (TreePlacement & { clear: number })[] = [
    { species: 'pine', x: -13.4, z: -9.6, s: 2.05, sy: 2.3, rot: 0.4, clear: 5 },
    { species: 'birch', x: -9.6, z: 6.4, s: 1.15, sy: 1.1, rot: 1.2, clear: 2.4 },
    { species: 'birch', x: -8.4, z: 8.3, s: 0.9, sy: 0.95, rot: 2.6, clear: 2 },
    { species: 'pine', x: 10.8, z: 3.2, s: 1.05, sy: 1.15, rot: 2.2, clear: 2.6 },
    { species: 'fir', x: 8.6, z: -9.6, s: 0.95, sy: 1.0, rot: 0.9, clear: 3 },
    { species: 'birch', x: 12.6, z: -5.4, s: 1.0, sy: 1.1, rot: 4.0, clear: 2 },
    { species: 'snag', x: 11.2, z: -17.5, s: 1.1, sy: 1.15, rot: 1.7, clear: 1.5 },
  ];

  const trees: TreePlacement[] = special.map((t) => ({
    species: t.species,
    x: t.x,
    z: t.z,
    s: t.s,
    sy: t.sy,
    rot: t.rot,
  }));
  const cell = 2.7;
  const maxR = 88;
  for (let gx = -maxR; gx <= maxR; gx += cell) {
    for (let gz = -maxR; gz <= maxR; gz += cell) {
      const x = gx + (rng() - 0.5) * cell * 0.95;
      const z = gz + (rng() - 0.5) * cell * 0.95;
      const r = Math.hypot(x, z);
      if (r > maxR) continue;
      const open = openingMask(x, z);
      let p = smoothstep(CLEARING_RADIUS - 0.5, CLEARING_RADIUS + 4.5, r);
      p *= 1 - open * (1 - smoothstep(58, 80, r) * 0.35);
      p *= 0.72;
      const u = rng();
      const sp = pickSpecies(r, open, rng);
      if (u > p && !(sp === 'snag' && u < p + 0.05)) continue;
      if (special.some((t) => Math.hypot(t.x - x, t.z - z) < t.clear)) continue;
      if (Math.hypot(x - POND.x, z - POND.z) < POND.r + 3) continue;
      const edge = 1 - smoothstep(CLEARING_RADIUS, CLEARING_RADIUS + 10, r);
      const s = 0.75 + rng() * 0.6 + edge * 0.15;
      trees.push({ species: sp, x, z, s, sy: s * (0.85 + rng() * 0.4), rot: rng() * Math.PI * 2 });
    }
  }

  const m = new Matrix4();
  const q = new Quaternion();
  const e = new Euler();
  const p = new Vector3();
  const s = new Vector3();
  const c = new Color();

  for (const id of Object.keys(species) as SpeciesId[]) {
    const sp = species[id];
    const list = trees.filter((t) => t.species === id);
    for (const near of [true, false]) {
      const items = list.filter((t) => Math.hypot(t.x, t.z) < SHADOW_RADIUS === near);
      if (items.length === 0) continue;
      const trunks = new InstancedMesh(sp.trunk, sp.trunkMat, items.length);
      const crowns = sp.crown && sp.crownMat ? new InstancedMesh(sp.crown, sp.crownMat, items.length) : null;
      items.forEach((t, i) => {
        e.set((rng() - 0.5) * 0.06, t.rot, (rng() - 0.5) * 0.06);
        q.setFromEuler(e);
        p.set(t.x, heightAt(t.x, t.z) - 0.2, t.z);
        s.set(t.s, t.sy, t.s);
        m.compose(p, q, s);
        trunks.setMatrixAt(i, m);
        sp.trunkColor(c, rng);
        trunks.setColorAt(i, c);
        if (crowns) {
          crowns.setMatrixAt(i, m);
          sp.crownColor(c, rng);
          crowns.setColorAt(i, c);
        }
        colliders.add({ x: t.x, z: t.z, r: sp.trunkRadius * t.s + 0.15 });
      });
      for (const mesh of crowns ? [trunks, crowns] : [trunks]) {
        mesh.computeBoundingSphere();
        mesh.castShadow = near;
        mesh.receiveShadow = near;
        group.add(mesh);
      }
    }
  }

  const rockMat = new MeshLambertMaterial({ color: 0xffffff, flatShading: true });
  const rockGeo = jitterVertices(new DodecahedronGeometry(0.6, 0), 0.18, 33);

  // A small cairn by the pond: someone was here before you.
  const cairnX = POND.x + POND.r + 1.3;
  const cairnZ = POND.z + 0.8;
  let cy = heightAt(cairnX, cairnZ) - 0.05;
  const cairnStones = [
    [0.62, 0.3],
    [0.5, 0.26],
    [0.4, 0.22],
    [0.3, 0.2],
    [0.2, 0.16],
  ];
  cairnStones.forEach(([w, h], i) => {
    const stone = new Mesh(rockGeo, rockMat.clone());
    (stone.material as MeshLambertMaterial).color.setRGB(0.19 - i * 0.012, 0.185 - i * 0.012, 0.175 - i * 0.01);
    stone.scale.set(w, h, w * (0.85 + rng() * 0.3));
    stone.rotation.set((rng() - 0.5) * 0.25, rng() * 6.28, (rng() - 0.5) * 0.25);
    stone.position.set(cairnX + (rng() - 0.5) * 0.06, cy + h * 0.55, cairnZ + (rng() - 0.5) * 0.06);
    cy += h * 0.95;
    stone.castShadow = true;
    group.add(stone);
  });
  colliders.add({ x: cairnX, z: cairnZ, r: 0.5 });

  // Low shrubs along the edge and under the trees.
  const shrubGeo = jitterVertices(new IcosahedronGeometry(0.8, 0), 0.25, 21);
  const shrubCount = 130;
  const shrubs = new InstancedMesh(
    shrubGeo,
    new MeshLambertMaterial({ color: 0xffffff, flatShading: true }),
    shrubCount,
  );
  let placedShrubs = 0;
  for (let i = 0; i < shrubCount * 4 && placedShrubs < shrubCount; i++) {
    const a = rng() * Math.PI * 2;
    const r = CLEARING_RADIUS - 2.5 + rng() * 16;
    const x = Math.sin(a) * r;
    const z = -Math.cos(a) * r;
    if (openingMask(x, z) > 0.5 && r < 24) continue;
    if (colliders.blocked(x, z, 0.3)) continue;
    const sc = 0.35 + rng() * 0.5;
    e.set(0, rng() * 6.28, 0);
    q.setFromEuler(e);
    p.set(x, heightAt(x, z) + sc * 0.15, z);
    s.set(sc * (1 + rng() * 0.6), sc * (0.55 + rng() * 0.3), sc * (1 + rng() * 0.6));
    m.compose(p, q, s);
    shrubs.setMatrixAt(placedShrubs, m);
    c.setHSL(0.27 + rng() * 0.1, 0.3 + rng() * 0.15, 0.055 + rng() * 0.035);
    shrubs.setColorAt(placedShrubs, c);
    placedShrubs++;
  }
  shrubs.count = placedShrubs;
  shrubs.computeBoundingSphere();
  shrubs.castShadow = true;
  shrubs.receiveShadow = true;
  group.add(shrubs);

  // Scattered boulders, plus a few half-sunk stones around the pond rim.
  const rockCount = 32;
  const rocks = new InstancedMesh(rockGeo, rockMat, rockCount);
  let placedRocks = 0;
  const placeRock = (x: number, z: number, sc: number, sink: number) => {
    e.set(rng() * 6.28, rng() * 6.28, rng() * 6.28);
    q.setFromEuler(e);
    p.set(x, heightAt(x, z) + sc * sink, z);
    s.set(sc * (0.9 + rng() * 0.5), sc * (0.5 + rng() * 0.35), sc * (0.9 + rng() * 0.5));
    m.compose(p, q, s);
    rocks.setMatrixAt(placedRocks, m);
    const g = 0.12 + rng() * 0.06;
    c.setRGB(g, g * 0.97, g * 0.93);
    rocks.setColorAt(placedRocks, c);
    placedRocks++;
  };
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + rng() * 0.6;
    const rr = POND.r * (0.92 + rng() * 0.12);
    placeRock(POND.x + Math.sin(a) * rr, POND.z + Math.cos(a) * rr, 0.3 + rng() * 0.35, -0.05);
  }
  for (let i = 0; i < rockCount * 6 && placedRocks < rockCount; i++) {
    const a = rng() * Math.PI * 2;
    const r = 6 + rng() * 24;
    const x = Math.sin(a) * r;
    const z = -Math.cos(a) * r;
    if (colliders.blocked(x, z, 0.8)) continue;
    const sc = 0.4 + Math.pow(rng(), 2) * 1.5;
    placeRock(x, z, sc, 0.12);
    if (sc > 0.7) colliders.add({ x, z, r: sc * 0.6 });
  }
  rocks.count = placedRocks;
  rocks.computeBoundingSphere();
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  group.add(rocks);

  // Two logs to sit on, angled toward the fire.
  const logMat = new MeshLambertMaterial({ color: '#3a2d25' });
  const logGeo = jitterVertices(new CylinderGeometry(0.27, 0.3, 2.6, 9, 1), 0.03, 44);
  const seats = [
    { x: -2.7, z: 1.1, len: 2.6 },
    { x: 2.5, z: -1.6, len: 2.2 },
  ];
  for (const seat of seats) {
    const log = new Mesh(logGeo, logMat);
    const angle = Math.atan2(seat.x, seat.z);
    log.scale.set(1, seat.len / 2.6, 1);
    log.rotation.set(0, angle, Math.PI / 2, 'YXZ');
    log.position.set(seat.x, heightAt(seat.x, seat.z) + 0.24, seat.z);
    log.castShadow = true;
    log.receiveShadow = true;
    group.add(log);
    const dirX = Math.cos(angle);
    const dirZ = -Math.sin(angle);
    for (const t of [-0.38, 0, 0.38]) {
      colliders.add({ x: seat.x + dirX * t * seat.len, z: seat.z + dirZ * t * seat.len, r: 0.42 });
    }
  }

  return { group, treeCount: trees.length };
}
