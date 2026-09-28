import { Vector3 } from 'three';
import { fbm, smoothstep, valueNoise } from './noise';

export const FIRE_POS = new Vector3(0, 0, 0);

/** You arrive just inside the tree line, facing the fire and the moon beyond it. */
export const SPAWN = { x: 1.1, z: 11.4, yaw: 0.04, pitch: -0.03 };

/** Low over the gap in the trees, slightly left of the fire. */
export const MOON_DIR = new Vector3(-0.16, 0.16, -0.97).normalize();

export const CLEARING_RADIUS = 13.5;
export const WALK_RADIUS = 36;
export const EYE_HEIGHT = 1.62;
export const PLAYER_RADIUS = 0.35;

/** 1 toward the open side of the clearing (where the land falls away), 0 elsewhere. */
export function openingMask(x: number, z: number): number {
  const angle = Math.atan2(x, -z);
  return 1 - smoothstep(0.42, 0.95, Math.abs(angle));
}

/** A small pond in the meadow, placed so the moon's reflection lines up from the fire. */
export const POND = { x: -4.2, z: -21, r: 4.2 };

function baseHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const open = openingMask(x, z);
  const outer = smoothstep(8, 24, r);

  let h = (fbm(x * 0.03 + 11.3, z * 0.03 - 4.1, 4) - 0.5) * 6 * outer;
  h += smoothstep(14, 70, r) * 3.2 * (1 - open);
  h -= open * smoothstep(15, 75, r) * 11;
  return h;
}

const POND_LEVEL = baseHeight(POND.x, POND.z);
export const WATER_Y = POND_LEVEL - 0.12;

export function heightAt(x: number, z: number): number {
  const r = Math.hypot(x, z);
  let h = baseHeight(x, z);

  const pd = Math.hypot(x - POND.x, z - POND.z);
  if (pd < POND.r + 5) {
    h += (POND_LEVEL - h) * (1 - smoothstep(POND.r, POND.r + 5, pd));
    h -= 0.5 * (1 - smoothstep(POND.r * 0.7, POND.r * 1.05, pd));
  }

  h += (valueNoise(x * 0.5, z * 0.5, 7) - 0.5) * 0.12 * smoothstep(1.2, 3, r);
  h -= (1 - smoothstep(0, 1.1, r)) * 0.08;
  return h;
}

export interface Collider {
  x: number;
  z: number;
  r: number;
}

const CELL = 4;

export class ColliderGrid {
  private cells = new Map<number, Collider[]>();
  private scratch: Collider[] = [];

  private key(ix: number, iz: number): number {
    return (ix + 1000) * 4096 + (iz + 1000);
  }

  add(c: Collider): void {
    const minX = Math.floor((c.x - c.r) / CELL);
    const maxX = Math.floor((c.x + c.r) / CELL);
    const minZ = Math.floor((c.z - c.r) / CELL);
    const maxZ = Math.floor((c.z + c.r) / CELL);
    for (let ix = minX; ix <= maxX; ix++) {
      for (let iz = minZ; iz <= maxZ; iz++) {
        const k = this.key(ix, iz);
        let list = this.cells.get(k);
        if (!list) {
          list = [];
          this.cells.set(k, list);
        }
        list.push(c);
      }
    }
  }

  query(x: number, z: number): Collider[] {
    const out = this.scratch;
    out.length = 0;
    const ix = Math.floor(x / CELL);
    const iz = Math.floor(z / CELL);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const list = this.cells.get(this.key(ix + dx, iz + dz));
        if (list) for (const c of list) out.push(c);
      }
    }
    return out;
  }

  blocked(x: number, z: number, pad = 0): boolean {
    for (const c of this.query(x, z)) {
      const dx = x - c.x;
      const dz = z - c.z;
      const rr = c.r + pad;
      if (dx * dx + dz * dz < rr * rr) return true;
    }
    return false;
  }

  /** Push a circle out of any colliders it overlaps. Mutates `pos`. */
  resolve(pos: { x: number; z: number }, radius: number): void {
    for (let pass = 0; pass < 2; pass++) {
      for (const c of this.query(pos.x, pos.z)) {
        const dx = pos.x - c.x;
        const dz = pos.z - c.z;
        const min = c.r + radius;
        const d2 = dx * dx + dz * dz;
        if (d2 < min * min && d2 > 1e-8) {
          const d = Math.sqrt(d2);
          const push = (min - d) / d;
          pos.x += dx * push;
          pos.z += dz * push;
        }
      }
    }
  }
}
