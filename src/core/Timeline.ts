import type { Easing } from "./easing.ts";
import {
  easeInCubic,
  easeInOutCubic,
  easeInOutQuad,
  easeInQuad,
  easeOutCubic,
  easeOutQuad,
  linear,
} from "./easing.ts";
import type { Point, Tattva, TattvaState, Vec3 } from "./Tattva.ts";
import type { CSSStyles } from "./css.ts";
import type { Camera3DState } from "./Camera3D.ts";
import type { ThreeTattva } from "./ThreeTattva.ts";

export type EaseName =
  | "linear"
  | "inQuad"
  | "outQuad"
  | "inOutQuad"
  | "inCubic"
  | "outCubic"
  | "inOutCubic";

const easings: Record<EaseName, Easing> = {
  linear,
  inQuad: easeInQuad,
  outQuad: easeOutQuad,
  inOutQuad: easeInOutQuad,
  inCubic: easeInCubic,
  outCubic: easeOutCubic,
  inOutCubic: easeInOutCubic,
};

export interface ScheduledAnimation<State extends TattvaState = TattvaState> {
  tattva: Tattva<State>;
  start: number;
  duration: number;
  easing: Easing;
  to: Partial<State>;
  from?: Partial<State>;
  relative?: boolean;
  hideBeforeStart?: boolean;
  styleTo?: CSSStyles;
  styleFrom?: CSSStyles;
}

export class Timeline {
  readonly animations: ScheduledAnimation<any>[] = [];

  animate<State extends TattvaState>(tattva: Tattva<State>): AnimationBuilder<State> {
    return new AnimationBuilder(this, tattva);
  }

  animateCamera<State extends Camera3DState>(tattva: ThreeTattva<State>): CameraAnimationBuilder<State> {
    return new CameraAnimationBuilder(this, tattva);
  }

  get duration(): number {
    return this.animations.reduce((end, animation) => Math.max(end, animation.start + animation.duration), 0);
  }

  schedule<State extends TattvaState>(animation: ScheduledAnimation<State>): void {
    this.animations.push(animation);
  }
}

export interface OrbitCameraOptions {
  azimuth: number;
  elevation: number;
  radius: number;
  target?: Vec3;
}

export class CameraAnimationBuilder<State extends Camera3DState> {
  private startTime = 0;
  private animationDuration = 1;
  private easing: EaseName | Easing = easeInOutCubic;

  constructor(
    private readonly timeline: Timeline,
    private readonly tattva: ThreeTattva<State>,
  ) {}

  at(seconds: number): this {
    this.startTime = Math.max(0, seconds);
    return this;
  }

  duration(seconds: number): this {
    this.animationDuration = Math.max(0, seconds);
    return this;
  }

  ease(ease: EaseName | Easing): this {
    this.easing = ease;
    return this;
  }

  frameTo(position: Vec3, target: Vec3): Timeline {
    const [cameraX, cameraY, cameraZ] = position;
    const [cameraTargetX, cameraTargetY, cameraTargetZ] = target;
    return this.commit({ cameraX, cameraY, cameraZ, cameraTargetX, cameraTargetY, cameraTargetZ });
  }

  moveTo([cameraX, cameraY, cameraZ]: Vec3): Timeline {
    return this.commit({ cameraX, cameraY, cameraZ });
  }

  lookAt([cameraTargetX, cameraTargetY, cameraTargetZ]: Vec3): Timeline {
    return this.commit({ cameraTargetX, cameraTargetY, cameraTargetZ });
  }

  zoomTo(cameraZoom: number): Timeline {
    return this.commit({ cameraZoom: positiveCameraValue(cameraZoom, "Camera zoom") });
  }

  fovTo(cameraFov: number): Timeline {
    if (!Number.isFinite(cameraFov) || cameraFov <= 0.1 || cameraFov >= 179) {
      throw new Error(`Camera field of view must be between 0.1 and 179 degrees; received ${cameraFov}.`);
    }
    return this.commit({ cameraFov });
  }

  viewHeightTo(cameraViewHeight: number): Timeline {
    return this.commit({
      cameraViewHeight: positiveCameraValue(cameraViewHeight, "Orthographic view height"),
    });
  }

  orbitTo(options: OrbitCameraOptions): Timeline {
    const radius = positiveCameraValue(options.radius, "Camera orbit radius");
    const target = options.target ?? [
      this.tattva.initialState.cameraTargetX,
      this.tattva.initialState.cameraTargetY,
      this.tattva.initialState.cameraTargetZ,
    ];
    const azimuth = options.azimuth * Math.PI / 180;
    const elevation = options.elevation * Math.PI / 180;
    const horizontal = Math.cos(elevation) * radius;
    return this.frameTo([
      target[0] + Math.sin(azimuth) * horizontal,
      target[1] + Math.sin(elevation) * radius,
      target[2] + Math.cos(azimuth) * horizontal,
    ], target);
  }

  private commit(cameraState: Partial<Camera3DState>): Timeline {
    const animation = this.timeline.animate(this.tattva)
      .at(this.startTime)
      .duration(this.animationDuration)
      .ease(this.easing);
    return animation.to(cameraState as Partial<State>);
  }
}

export class AnimationBuilder<State extends TattvaState> {
  private startTime = 0;
  private animationDuration = 1;
  private easing: Easing = easeInOutCubic;

  constructor(
    private readonly timeline: Timeline,
    private readonly tattva: Tattva<State>,
  ) {}

  at(seconds: number): this {
    this.startTime = Math.max(0, seconds);
    return this;
  }

  duration(seconds: number): this {
    this.animationDuration = Math.max(0, seconds);
    return this;
  }

  ease(ease: EaseName | Easing): this {
    this.easing = typeof ease === "function" ? ease : easings[ease];
    return this;
  }

  moveTo(point: Point): Timeline {
    const [x, y, z = 0] = point;
    return this.commit({ x, y, z } as Partial<State>);
  }

  moveBy(delta: Point): Timeline {
    const [x, y, z = 0] = delta;
    return this.commit({ x, y, z } as Partial<State>, undefined, false, true);
  }

  scaleTo(scale: number): Timeline {
    return this.commit({ scale } as Partial<State>);
  }

  rotateTo(rotation: number): Timeline {
    return this.commit({ rotation } as Partial<State>);
  }

  fadeTo(opacity: number): Timeline {
    return this.commit({ opacity } as Partial<State>);
  }

  setColor(color: string): Timeline {
    return this.commit({ [this.tattva.colorProperty]: color } as Partial<State>);
  }

  to(state: Partial<State>): Timeline {
    return this.commit(state);
  }

  setStyle(styles: CSSStyles): Timeline {
    this.timeline.schedule({
      tattva: this.tattva,
      start: this.startTime,
      duration: this.animationDuration,
      easing: this.easing,
      to: {},
      styleTo: { ...styles },
    });
    return this.timeline;
  }

  appear(): Timeline {
    return this.commit({ opacity: 1 } as Partial<State>, { opacity: 0 } as Partial<State>, true);
  }

  disappear(): Timeline {
    return this.commit({ opacity: 0 } as Partial<State>);
  }

  draw(): Timeline {
    this.requireRevealKind("path", "draw");
    return this.commit(
      { revealProgress: 1 } as Partial<State>,
      { revealProgress: 0 } as Partial<State>,
      true,
    );
  }

  undraw(): Timeline {
    this.requireRevealKind("path", "undraw");
    return this.commit({ revealProgress: 0 } as Partial<State>);
  }

  typewrite(): Timeline {
    this.requireRevealKind("text", "typewrite");
    return this.commit(
      { revealProgress: 1 } as Partial<State>,
      { revealProgress: 0 } as Partial<State>,
      true,
    );
  }

  untypewrite(): Timeline {
    this.requireRevealKind("text", "untypewrite");
    return this.commit({ revealProgress: 0 } as Partial<State>);
  }

  revealText(from = 0, to = 1): Timeline {
    this.requireRevealKind("text", "revealText");
    return this.commit(
      { revealProgress: Math.min(1, Math.max(0, to)) } as Partial<State>,
      { revealProgress: Math.min(1, Math.max(0, from)) } as Partial<State>,
      true,
    );
  }

  private commit(
    to: Partial<State>,
    from?: Partial<State>,
    hideBeforeStart = false,
    relative = false,
  ): Timeline {
    this.timeline.schedule({
      tattva: this.tattva,
      start: this.startTime,
      duration: this.animationDuration,
      easing: this.easing,
      to,
      from,
      hideBeforeStart,
      relative,
    });
    return this.timeline;
  }

  private requireRevealKind(expected: "text" | "path", operation: string): void {
    if (this.tattva.revealKind !== expected) {
      throw new Error(
        `${operation}() requires a ${expected}-reveal Tattva; received ${this.tattva.constructor.name}.`,
      );
    }
  }
}

function positiveCameraValue(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive finite number; received ${value}.`);
  }
  return value;
}
