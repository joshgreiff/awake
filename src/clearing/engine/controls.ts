import { PerspectiveCamera, Vector2 } from 'three';
import {
  ColliderGrid,
  EYE_HEIGHT,
  PLAYER_RADIUS,
  SPAWN,
  WALK_RADIUS,
  heightAt,
  type SeatPose,
} from './layout';

const WALK_SPEED = 2.2;
const RUN_SPEED = 4.2;
const MOUSE_SENSITIVITY = 0.0022;
const TOUCH_LOOK_SENSITIVITY = 0.0045;
const KEY_TURN_SPEED = 1.7;
const PITCH_LIMIT = 1.35;
const JOYSTICK_RADIUS = 56;

const SIT_DURATION = 0.8;
const STAND_DURATION = 0.6;
const SEAT_YAW_LIMIT = 1.22;
const SEAT_PITCH_MIN = -0.75;
const SEAT_PITCH_MAX = 0.5;
const BREATH_PERIOD = 4.6;

const MOVE_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown']);

export type SeatState = 'walking' | 'sitting' | 'seated' | 'standing';

export interface ControllerOptions {
  touch: boolean;
  reducedMotion: boolean;
  onLockChange(locked: boolean): void;
  onFirstMove(): void;
  onSeatChange(state: SeatState): void;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** True when a key event comes from somewhere the user is typing. */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

function wrapAngle(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

/**
 * First-person walking: pointer lock + WASD on desktop, twin-zone touch on mobile.
 * Falls back to click-drag look when pointer lock is unavailable (e.g. embedded frames).
 */
export class FirstPersonController {
  enabled = false;
  yaw = SPAWN.yaw;
  pitch = SPAWN.pitch;
  readonly position = { x: SPAWN.x, z: SPAWN.z };

  private velocity = new Vector2();
  private keys = new Set<string>();
  private groundY: number;
  private bobPhase = 0;
  private locked = false;
  private dragging = false;
  private pointerLockFailed = false;
  private movedOnce = false;
  private targetYaw = SPAWN.yaw;
  private targetPitch = SPAWN.pitch;

  private seatState: SeatState = 'walking';
  private transition = 0;
  private transFrom: SeatPose = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 };
  private transTo: SeatPose = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 };
  private seatYaw = 0;
  private standSpot = { x: 0, z: 0 };
  private clock = 0;

  private joyId = -1;
  private joyOrigin = new Vector2();
  private joyVec = new Vector2();
  private lookId = -1;
  private lookLast = new Vector2();
  private joyBase: HTMLDivElement | null = null;
  private joyKnob: HTMLDivElement | null = null;

  private readonly camera: PerspectiveCamera;
  private readonly dom: HTMLElement;
  private readonly colliders: ColliderGrid;
  private readonly opts: ControllerOptions;

  constructor(
    camera: PerspectiveCamera,
    dom: HTMLElement,
    colliders: ColliderGrid,
    opts: ControllerOptions,
  ) {
    this.camera = camera;
    this.dom = dom;
    this.colliders = colliders;
    this.opts = opts;
    this.groundY = heightAt(SPAWN.x, SPAWN.z);
    camera.rotation.order = 'YXZ';

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('pointerlockchange', this.onLockChange);
    document.addEventListener('pointerlockerror', this.onLockError);
    document.addEventListener('mousemove', this.onMouseMove);
    dom.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    dom.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);

    if (opts.touch) this.createJoystick();
  }

  get isLocked(): boolean {
    return this.locked;
  }

  requestLock(): void {
    if (this.opts.touch || this.pointerLockFailed) return;
    const el = this.dom as HTMLElement & {
      requestPointerLock(options?: { unadjustedMovement?: boolean }): Promise<void> | void;
    };
    try {
      const result = el.requestPointerLock();
      if (result && typeof (result as Promise<void>).catch === 'function') {
        (result as Promise<void>).catch(() => {
          this.pointerLockFailed = true;
        });
      }
    } catch {
      this.pointerLockFailed = true;
    }
  }

  releaseLock(): void {
    if (document.pointerLockElement === this.dom) document.exitPointerLock();
  }

  teleport(x: number, z: number, yaw: number, pitch: number): void {
    if (this.seatState !== 'walking') return;
    this.position.x = x;
    this.position.z = z;
    this.groundY = heightAt(x, z);
    this.yaw = this.targetYaw = yaw;
    this.pitch = this.targetPitch = pitch;
    this.velocity.set(0, 0);
  }

  get state(): SeatState {
    return this.seatState;
  }

  /** Drop any held keys and active touches, e.g. when an overlay takes focus. */
  clearInput(): void {
    this.keys.clear();
    this.dragging = false;
    this.lookId = -1;
    if (this.joyId >= 0) {
      this.joyId = -1;
      this.joyVec.set(0, 0);
      this.hideJoystick();
    }
  }

  sit(pose: SeatPose): void {
    if (this.seatState !== 'walking') return;
    this.transFrom = {
      x: this.camera.position.x,
      y: this.camera.position.y,
      z: this.camera.position.z,
      yaw: this.yaw,
      pitch: this.pitch,
    };
    this.transTo = { ...pose };
    this.seatYaw = pose.yaw;
    this.standSpot = { x: this.position.x, z: this.position.z };
    this.velocity.set(0, 0);
    this.clearInput();
    this.setSeatState('sitting');
  }

  stand(): void {
    if (this.seatState !== 'sitting' && this.seatState !== 'seated') return;
    this.transFrom = {
      x: this.camera.position.x,
      y: this.camera.position.y,
      z: this.camera.position.z,
      yaw: this.yaw,
      pitch: this.pitch,
    };
    this.transTo = {
      x: this.standSpot.x,
      y: heightAt(this.standSpot.x, this.standSpot.z) + EYE_HEIGHT,
      z: this.standSpot.z,
      yaw: this.yaw,
      pitch: Math.max(-0.3, Math.min(0.3, this.pitch)),
    };
    this.setSeatState('standing');
  }

  update(dt: number): void {
    this.clock += dt;
    if (this.seatState !== 'walking') {
      this.updateSeated(dt);
      return;
    }
    let ix = 0;
    let iz = 0;
    let turn = 0;
    if (this.enabled) {
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) iz += 1;
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) iz -= 1;
      if (this.keys.has('KeyD')) ix += 1;
      if (this.keys.has('KeyA')) ix -= 1;
      if (this.keys.has('ArrowLeft') || this.keys.has('KeyQ')) turn += 1;
      if (this.keys.has('ArrowRight') || this.keys.has('KeyE')) turn -= 1;
      if (this.joyId >= 0) {
        ix += this.joyVec.x;
        iz -= this.joyVec.y;
      }
    }
    const len = Math.hypot(ix, iz);
    if (len > 1) {
      ix /= len;
      iz /= len;
    }
    if (len > 0.05 && !this.movedOnce) {
      this.movedOnce = true;
      this.opts.onFirstMove();
    }

    this.targetYaw += turn * KEY_TURN_SPEED * dt;
    if (this.opts.touch) {
      const k = 1 - Math.exp(-dt * 18);
      this.yaw += (this.targetYaw - this.yaw) * k;
      this.pitch += (this.targetPitch - this.pitch) * k;
    } else {
      this.yaw = this.targetYaw;
      this.pitch = this.targetPitch;
    }

    const running = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    const speed = running ? RUN_SPEED : WALK_SPEED;
    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    const tx = (cos * ix - sin * iz) * speed;
    const tz = (-sin * ix - cos * iz) * speed;
    const accel = 1 - Math.exp(-dt * (len > 0.05 ? 6 : 4.5));
    this.velocity.x += (tx - this.velocity.x) * accel;
    this.velocity.y += (tz - this.velocity.y) * accel;

    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.y * dt;
    this.colliders.resolve(this.position, PLAYER_RADIUS);

    const r = Math.hypot(this.position.x, this.position.z);
    if (r > WALK_RADIUS) {
      const pull = WALK_RADIUS / r;
      this.position.x *= pull;
      this.position.z *= pull;
    }

    const ground = heightAt(this.position.x, this.position.z);
    this.groundY += (ground - this.groundY) * (1 - Math.exp(-dt * 12));

    const moving = this.velocity.length();
    let bob = 0;
    let sway = 0;
    if (!this.opts.reducedMotion) {
      this.bobPhase += moving * dt * 1.9;
      const amp = Math.min(moving / WALK_SPEED, 1.4);
      bob = Math.sin(this.bobPhase * Math.PI * 2) * 0.028 * amp;
      sway = Math.sin(this.bobPhase * Math.PI) * 0.004 * amp;
    }

    this.camera.position.set(this.position.x, this.groundY + EYE_HEIGHT + bob, this.position.z);
    this.camera.rotation.set(this.pitch, this.yaw, sway);
  }

  /** Slow idle drift used behind the intro screen. */
  idle(time: number): void {
    const ground = heightAt(this.position.x, this.position.z);
    this.camera.position.set(
      this.position.x,
      ground + EYE_HEIGHT + Math.sin(time * 0.5) * 0.015,
      this.position.z,
    );
    this.camera.rotation.set(
      this.pitch + Math.sin(time * 0.21) * 0.012,
      this.yaw + Math.sin(time * 0.13) * 0.04,
      0,
    );
  }

  private setSeatState(state: SeatState): void {
    this.seatState = state;
    this.transition = 0;
    this.opts.onSeatChange(state);
  }

  private updateSeated(dt: number): void {
    const moving = this.seatState === 'sitting' || this.seatState === 'standing';
    if (moving) {
      const duration = this.seatState === 'sitting' ? SIT_DURATION : STAND_DURATION;
      this.transition = Math.min(this.transition + dt / duration, 1);
      const e = easeInOut(this.transition);
      const from = this.transFrom;
      const to = this.transTo;
      this.yaw = from.yaw + wrapAngle(to.yaw - from.yaw) * e;
      this.pitch = from.pitch + (to.pitch - from.pitch) * e;
      this.targetYaw = this.yaw;
      this.targetPitch = this.pitch;
      this.camera.position.set(
        from.x + (to.x - from.x) * e,
        from.y + (to.y - from.y) * e,
        from.z + (to.z - from.z) * e,
      );
      this.camera.rotation.set(this.pitch, this.yaw, 0);
      if (this.transition >= 1) {
        if (this.seatState === 'sitting') {
          this.setSeatState('seated');
        } else {
          this.position.x = to.x;
          this.position.z = to.z;
          this.groundY = heightAt(to.x, to.z);
          this.setSeatState('walking');
        }
      }
      return;
    }

    let turn = 0;
    if (this.enabled) {
      if (this.keys.has('ArrowLeft') || this.keys.has('KeyQ')) turn += 1;
      if (this.keys.has('ArrowRight') || this.keys.has('KeyE')) turn -= 1;
    }
    this.targetYaw += turn * KEY_TURN_SPEED * 0.7 * dt;
    const rel = Math.max(-SEAT_YAW_LIMIT, Math.min(SEAT_YAW_LIMIT, wrapAngle(this.targetYaw - this.seatYaw)));
    this.targetYaw = this.seatYaw + rel;
    this.targetPitch = Math.max(SEAT_PITCH_MIN, Math.min(SEAT_PITCH_MAX, this.targetPitch));

    const k = 1 - Math.exp(-dt * (this.opts.touch ? 14 : 22));
    this.yaw += wrapAngle(this.targetYaw - this.yaw) * k;
    this.pitch += (this.targetPitch - this.pitch) * k;

    let breath = 0;
    if (!this.opts.reducedMotion) breath = Math.sin((this.clock / BREATH_PERIOD) * Math.PI * 2);
    const seat = this.transTo;
    this.camera.position.set(seat.x, seat.y + breath * 0.008, seat.z);
    this.camera.rotation.set(this.pitch + breath * 0.004, this.yaw, breath * 0.0015);
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('pointerlockchange', this.onLockChange);
    document.removeEventListener('pointerlockerror', this.onLockError);
    document.removeEventListener('mousemove', this.onMouseMove);
    this.dom.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    this.dom.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
    this.releaseLock();
    this.joyBase?.remove();
  }

  private applyLook(dx: number, dy: number, sensitivity: number): void {
    this.targetYaw -= dx * sensitivity;
    this.targetPitch = Math.max(
      -PITCH_LIMIT,
      Math.min(PITCH_LIMIT, this.targetPitch - dy * sensitivity),
    );
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (!this.enabled) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (isEditableTarget(e.target)) return;
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    if (this.seatState === 'seated' && MOVE_KEYS.has(e.code)) this.stand();
    if (this.seatState === 'sitting' || this.seatState === 'standing') return;
    this.keys.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onBlur = () => {
    this.keys.clear();
    this.dragging = false;
  };

  private onLockChange = () => {
    this.locked = document.pointerLockElement === this.dom;
    if (!this.locked) this.keys.clear();
    this.opts.onLockChange(this.locked);
  };

  private onLockError = () => {
    this.pointerLockFailed = true;
  };

  private onMouseDown = (e: MouseEvent) => {
    if (!this.enabled || this.opts.touch) return;
    if (!this.locked) {
      if (this.pointerLockFailed) this.dragging = true;
      else this.requestLock();
    }
    e.preventDefault();
  };

  private onMouseUp = () => {
    this.dragging = false;
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.enabled) return;
    if (!this.locked && !this.dragging) return;
    const dx = Math.max(-150, Math.min(150, e.movementX));
    const dy = Math.max(-150, Math.min(150, e.movementY));
    this.applyLook(dx, dy, MOUSE_SENSITIVITY);
  };

  private onPointerDown = (e: PointerEvent) => {
    if (!this.enabled || e.pointerType === 'mouse') return;
    const rect = this.dom.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const seated = this.seatState !== 'walking';
    if (!seated && localX < rect.width * 0.45 && this.joyId < 0) {
      this.joyId = e.pointerId;
      this.joyOrigin.set(e.clientX, e.clientY);
      this.joyVec.set(0, 0);
      this.showJoystick(e.clientX - rect.left, e.clientY - rect.top);
    } else if (this.lookId < 0) {
      this.lookId = e.pointerId;
      this.lookLast.set(e.clientX, e.clientY);
    }
    e.preventDefault();
  };

  private onPointerMove = (e: PointerEvent) => {
    if (e.pointerId === this.joyId) {
      const dx = e.clientX - this.joyOrigin.x;
      const dy = e.clientY - this.joyOrigin.y;
      const d = Math.hypot(dx, dy);
      const clamped = Math.min(d, JOYSTICK_RADIUS);
      const nx = d > 0 ? (dx / d) * clamped : 0;
      const ny = d > 0 ? (dy / d) * clamped : 0;
      this.joyVec.set(nx / JOYSTICK_RADIUS, ny / JOYSTICK_RADIUS);
      if (this.joyKnob) this.joyKnob.style.transform = `translate(${nx}px, ${ny}px)`;
    } else if (e.pointerId === this.lookId) {
      const dx = e.clientX - this.lookLast.x;
      const dy = e.clientY - this.lookLast.y;
      this.lookLast.set(e.clientX, e.clientY);
      this.applyLook(dx, dy, TOUCH_LOOK_SENSITIVITY);
    }
  };

  private onPointerUp = (e: PointerEvent) => {
    if (e.pointerId === this.joyId) {
      this.joyId = -1;
      this.joyVec.set(0, 0);
      this.hideJoystick();
    } else if (e.pointerId === this.lookId) {
      this.lookId = -1;
    }
  };

  private createJoystick(): void {
    const base = document.createElement('div');
    base.setAttribute('aria-hidden', 'true');
    Object.assign(base.style, {
      position: 'absolute',
      width: `${JOYSTICK_RADIUS * 2}px`,
      height: `${JOYSTICK_RADIUS * 2}px`,
      marginLeft: `${-JOYSTICK_RADIUS}px`,
      marginTop: `${-JOYSTICK_RADIUS}px`,
      borderRadius: '50%',
      border: '1px solid rgba(255,236,210,0.25)',
      background: 'rgba(255,236,210,0.05)',
      pointerEvents: 'none',
      opacity: '0',
      transition: 'opacity 160ms ease',
      zIndex: '5',
    } satisfies Partial<CSSStyleDeclaration>);
    const knob = document.createElement('div');
    Object.assign(knob.style, {
      position: 'absolute',
      left: `${JOYSTICK_RADIUS - 22}px`,
      top: `${JOYSTICK_RADIUS - 22}px`,
      width: '44px',
      height: '44px',
      borderRadius: '50%',
      background: 'rgba(255,236,210,0.22)',
    } satisfies Partial<CSSStyleDeclaration>);
    base.appendChild(knob);
    this.dom.parentElement?.appendChild(base);
    this.joyBase = base;
    this.joyKnob = knob;
  }

  private showJoystick(x: number, y: number): void {
    if (!this.joyBase) return;
    this.joyBase.style.left = `${x}px`;
    this.joyBase.style.top = `${y}px`;
    this.joyBase.style.opacity = '1';
    if (this.joyKnob) this.joyKnob.style.transform = 'translate(0px, 0px)';
  }

  private hideJoystick(): void {
    if (this.joyBase) this.joyBase.style.opacity = '0';
  }
}
