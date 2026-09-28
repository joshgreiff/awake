import { PerspectiveCamera, Vector2 } from 'three';
import {
  ColliderGrid,
  EYE_HEIGHT,
  PLAYER_RADIUS,
  SPAWN,
  WALK_RADIUS,
  heightAt,
} from './layout';

const WALK_SPEED = 2.2;
const RUN_SPEED = 4.2;
const MOUSE_SENSITIVITY = 0.0022;
const TOUCH_LOOK_SENSITIVITY = 0.0045;
const KEY_TURN_SPEED = 1.7;
const PITCH_LIMIT = 1.35;
const JOYSTICK_RADIUS = 56;

export interface ControllerOptions {
  touch: boolean;
  reducedMotion: boolean;
  onLockChange(locked: boolean): void;
  onFirstMove(): void;
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

  update(dt: number): void {
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
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
    this.keys.add(e.code);
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
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
    if (localX < rect.width * 0.45 && this.joyId < 0) {
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
