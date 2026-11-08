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

/*
 * The hollow: a second, handcrafted area east of the clearing, reached by a faint
 * worn trail. A long furrow runs away from it to the east. Story content placed
 * here lives in `hollow.ts` and `story.ts`; this file only shapes the land.
 */
export const HOLLOW = { x: 25.5, z: 7.5, r: 7.5 };
/** Unit direction the furrow runs from the hollow (roughly east). */
export const FURROW_DIR = { x: 0.94, z: -0.34 };
const FURROW_LENGTH = 46;
export const HOLLOW_FLOOR = baseHeight(HOLLOW.x, HOLLOW.z) - 0.9;

/** Worn trail from the fireside to the hollow's west rim. */
export const TRAIL: readonly { x: number; z: number }[] = [
  { x: 3.4, z: 1.4 },
  { x: 6.4, z: 3.0 },
  { x: 9.4, z: 4.6 },
  { x: 12.8, z: 5.4 },
  { x: 16.2, z: 5.6 },
  { x: 19.4, z: 6.4 },
];

function segmentDistance(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax;
  const dz = bz - az;
  const len2 = dx * dx + dz * dz;
  const t = len2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / len2)) : 0;
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}

export function trailDistance(x: number, z: number): number {
  let d = Infinity;
  for (let i = 0; i < TRAIL.length - 1; i++) {
    const a = TRAIL[i];
    const b = TRAIL[i + 1];
    d = Math.min(d, segmentDistance(x, z, a.x, a.z, b.x, b.z));
  }
  return d;
}

/** Distance across the furrow, and how far along it (negative = behind the hollow centre). */
export function furrowCoords(x: number, z: number): { across: number; along: number } {
  const dx = x - HOLLOW.x;
  const dz = z - HOLLOW.z;
  const along = dx * FURROW_DIR.x + dz * FURROW_DIR.z;
  const across = Math.abs(dx * -FURROW_DIR.z + dz * FURROW_DIR.x);
  return { across, along };
}

/** 0–1 burn on the ground along the furrow and around where it ends. */
export function scorchAt(x: number, z: number): number {
  const { across, along } = furrowCoords(x, z);
  if (along < -3 || along > FURROW_LENGTH) return 0;
  const width = 1.6 + Math.min(Math.max(along, 0), 20) * 0.04;
  const edge = (valueNoise(x * 0.8, z * 0.8, 31) - 0.5) * 0.9;
  return (1 - smoothstep(width * 0.5, width + 0.8, across + edge)) * smoothstep(-3, 1, along);
}

/** True where the forest generator should leave a gap: the hollow, the furrow and the trail. */
export function treeExcluded(x: number, z: number): boolean {
  const hd = Math.hypot(x - HOLLOW.x, z - HOLLOW.z);
  if (hd < HOLLOW.r + (valueNoise(x * 0.4, z * 0.4, 41) - 0.5) * 2) return true;
  const { across, along } = furrowCoords(x, z);
  if (along > -1 && along < FURROW_LENGTH && across < 2.6) return true;
  return Math.hypot(x, z) > CLEARING_RADIUS - 1 && trailDistance(x, z) < 1.7;
}

/** Trees near the hollow and furrow lean away from it. Returns a horizontal tilt vector (radians). */
export function treeLean(x: number, z: number): { x: number; z: number } {
  const dx = x - HOLLOW.x;
  const dz = z - HOLLOW.z;
  const hd = Math.hypot(dx, dz) || 1;
  let lx = 0;
  let lz = 0;
  const k = 0.2 * (1 - smoothstep(HOLLOW.r, 17, hd));
  lx += (dx / hd) * k;
  lz += (dz / hd) * k;
  const { across, along } = furrowCoords(x, z);
  if (along > 0 && along < FURROW_LENGTH) {
    const side = Math.sign(dx * -FURROW_DIR.z + dz * FURROW_DIR.x) || 1;
    const f = 0.24 * (1 - smoothstep(2.6, 7, across));
    lx += -FURROW_DIR.z * side * f;
    lz += FURROW_DIR.x * side * f;
  }
  return { x: lx, z: lz };
}

export function heightAt(x: number, z: number): number {
  const r = Math.hypot(x, z);
  let h = baseHeight(x, z);

  const pd = Math.hypot(x - POND.x, z - POND.z);
  if (pd < POND.r + 5) {
    h += (POND_LEVEL - h) * (1 - smoothstep(POND.r, POND.r + 5, pd));
    h -= 0.5 * (1 - smoothstep(POND.r * 0.7, POND.r * 1.05, pd));
  }

  const hd = Math.hypot(x - HOLLOW.x, z - HOLLOW.z);
  if (hd < 14) h += (HOLLOW_FLOOR - h) * (1 - smoothstep(3, 11, hd));
  const scorch = scorchAt(x, z);
  if (scorch > 0) h -= scorch * 0.3;

  h += (valueNoise(x * 0.5, z * 0.5, 7) - 0.5) * 0.12 * smoothstep(1.2, 3, r);
  h -= (1 - smoothstep(0, 1.1, r)) * 0.08;
  return h;
}

export interface Seat {
  id: string;
  x: number;
  z: number;
  len: number;
}

/** Logs around the fire. Each lies tangent to the fire so a seated person faces it. */
export const SEATS: readonly Seat[] = [
  { id: 'west-log', x: -2.7, z: 1.1, len: 2.6 },
  { id: 'east-log', x: 2.5, z: -1.6, len: 2.2 },
];

export const LOG_RADIUS = 0.3;
export const LOG_CENTER_HEIGHT = 0.24;
export const SIT_RANGE = 1.5;
const SEATED_EYE_ABOVE_LOG = 0.72;

/** Yaw that rotates a log tangent to the fire; also the yaw that faces the fire from it. */
export function seatAngle(seat: Seat): number {
  return Math.atan2(seat.x, seat.z);
}

/** Unit vector along the log's length. */
export function seatAxis(seat: Seat): { x: number; z: number } {
  const angle = seatAngle(seat);
  return { x: Math.cos(angle), z: -Math.sin(angle) };
}

export interface SeatPose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
}

/** Camera pose for sitting on the log at the point nearest `from`, facing the fire. */
export function seatPose(seat: Seat, from: { x: number; z: number }): SeatPose {
  const axis = seatAxis(seat);
  const half = seat.len * 0.32;
  const along = Math.max(-half, Math.min(half, (from.x - seat.x) * axis.x + (from.z - seat.z) * axis.z));
  const r = Math.hypot(seat.x, seat.z) || 1;
  const x = seat.x + axis.x * along + (seat.x / r) * 0.08;
  const z = seat.z + axis.z * along + (seat.z / r) * 0.08;
  return {
    x,
    y: heightAt(seat.x, seat.z) + LOG_CENTER_HEIGHT + LOG_RADIUS + SEATED_EYE_ABOVE_LOG,
    z,
    yaw: Math.atan2(x, z),
    pitch: -0.16,
  };
}

/** Distance from a point to the log's centre line (capped to its length). */
export function distanceToSeat(seat: Seat, x: number, z: number): number {
  const axis = seatAxis(seat);
  const half = seat.len / 2;
  const dx = x - seat.x;
  const dz = z - seat.z;
  const along = Math.max(-half, Math.min(half, dx * axis.x + dz * axis.z));
  return Math.hypot(dx - axis.x * along, dz - axis.z * along);
}

export function nearestSeat(x: number, z: number, range = SIT_RANGE): Seat | null {
  let best: Seat | null = null;
  let bestD = range;
  for (const seat of SEATS) {
    const d = distanceToSeat(seat, x, z);
    if (d < bestD) {
      bestD = d;
      best = seat;
    }
  }
  return best;
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
