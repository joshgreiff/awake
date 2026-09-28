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
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CLEARING_RADIUS, ColliderGrid, heightAt, openingMask } from './layout';
import { hash2, mulberry32, smoothstep } from './noise';

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

function coniferFoliage(): BufferGeometry {
  const tiers = [
    { r: 2.1, h: 3.8, y: 3.1 },
    { r: 1.65, h: 3.2, y: 4.9 },
    { r: 1.15, h: 2.8, y: 6.6 },
    { r: 0.6, h: 1.8, y: 7.9 },
  ];
  const parts = tiers.map((t, i) => {
    const cone = new ConeGeometry(t.r, t.h, 7, 1);
    cone.rotateY(i * 0.7);
    cone.translate(0, t.y, 0);
    return cone;
  });
  const merged = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  return jitterVertices(merged!, 0.32, 3);
}

function coniferTrunk(): BufferGeometry {
  const trunk = new CylinderGeometry(0.14, 0.26, 2.6, 6, 1, true);
  trunk.translate(0, 1.2, 0);
  return trunk;
}

export interface ForestBuild {
  group: Group;
  treeCount: number;
}

export function createForest(colliders: ColliderGrid): ForestBuild {
  const rng = mulberry32(4242);
  const group = new Group();
  group.name = 'forest';

  type Tree = { x: number; z: number; s: number; sy: number; rot: number };
  const trees: Tree[] = [];
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
      if (rng() > p) continue;
      const edge = 1 - smoothstep(CLEARING_RADIUS, CLEARING_RADIUS + 10, r);
      const s = 0.75 + rng() * 0.6 + edge * 0.15;
      trees.push({ x, z, s, sy: s * (0.85 + rng() * 0.4), rot: rng() * Math.PI * 2 });
    }
  }

  // A few lone trees that step into the clearing, so the tree line isn't a perfect circle.
  const lone = [
    { x: -9.6, z: 6.4, s: 1.25 },
    { x: 10.8, z: 3.2, s: 1.05 },
    { x: 8.1, z: -9.2, s: 0.95 },
    { x: -11.8, z: -4.6, s: 1.3 },
  ];
  for (const t of lone) trees.push({ ...t, sy: t.s * 1.1, rot: rng() * 6.28 });

  const foliageGeo = coniferFoliage();
  const trunkGeo = coniferTrunk();
  const foliageMat = new MeshLambertMaterial({ color: 0xffffff, flatShading: true });
  const trunkMat = new MeshLambertMaterial({ color: '#3a2c22' });

  const foliage = new InstancedMesh(foliageGeo, foliageMat, trees.length);
  const trunks = new InstancedMesh(trunkGeo, trunkMat, trees.length);
  const m = new Matrix4();
  const q = new Quaternion();
  const e = new Euler();
  const p = new Vector3();
  const s = new Vector3();
  const c = new Color();

  trees.forEach((t, i) => {
    const y = heightAt(t.x, t.z) - 0.25;
    e.set((rng() - 0.5) * 0.06, t.rot, (rng() - 0.5) * 0.06);
    q.setFromEuler(e);
    p.set(t.x, y, t.z);
    s.set(t.s, t.sy, t.s);
    m.compose(p, q, s);
    foliage.setMatrixAt(i, m);
    trunks.setMatrixAt(i, m);
    c.setHSL(0.33 + rng() * 0.09, 0.26 + rng() * 0.16, 0.075 + rng() * 0.045);
    foliage.setColorAt(i, c);
    colliders.add({ x: t.x, z: t.z, r: 0.28 * t.s + 0.15 });
  });
  foliage.computeBoundingSphere();
  trunks.computeBoundingSphere();
  group.add(foliage, trunks);

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
  group.add(shrubs);

  // Scattered boulders.
  const rockGeo = jitterVertices(new DodecahedronGeometry(0.6, 0), 0.18, 33);
  const rockCount = 26;
  const rocks = new InstancedMesh(
    rockGeo,
    new MeshLambertMaterial({ color: 0xffffff, flatShading: true }),
    rockCount,
  );
  let placedRocks = 0;
  for (let i = 0; i < rockCount * 6 && placedRocks < rockCount; i++) {
    const a = rng() * Math.PI * 2;
    const r = 6 + rng() * 24;
    const x = Math.sin(a) * r;
    const z = -Math.cos(a) * r;
    if (colliders.blocked(x, z, 0.8)) continue;
    const sc = 0.4 + Math.pow(rng(), 2) * 1.5;
    e.set(rng() * 6.28, rng() * 6.28, rng() * 6.28);
    q.setFromEuler(e);
    p.set(x, heightAt(x, z) + sc * 0.12, z);
    s.set(sc * (0.9 + rng() * 0.5), sc * (0.5 + rng() * 0.35), sc * (0.9 + rng() * 0.5));
    m.compose(p, q, s);
    rocks.setMatrixAt(placedRocks, m);
    const g = 0.12 + rng() * 0.06;
    c.setRGB(g, g * 0.97, g * 0.93);
    rocks.setColorAt(placedRocks, c);
    if (sc > 0.7) colliders.add({ x, z, r: sc * 0.6 });
    placedRocks++;
  }
  rocks.count = placedRocks;
  rocks.computeBoundingSphere();
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
    group.add(log);
    const dirX = Math.cos(angle);
    const dirZ = -Math.sin(angle);
    for (const t of [-0.38, 0, 0.38]) {
      colliders.add({ x: seat.x + dirX * t * seat.len, z: seat.z + dirZ * t * seat.len, r: 0.42 });
    }
  }

  return { group, treeCount: trees.length };
}
