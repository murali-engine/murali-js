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

export interface ClipPlacementOptions {
  at: number;
}

export interface ClipOverlapOptions {
  by?: number;
}

export type TimelineAuthor = (timeline: Timeline) => void;
export type ClipAuthor = (clip: Clip) => void;

export class Timeline {
  readonly animations: ScheduledAnimation<any>[] = [];
  private compositionCursor = 0;
  private compositionGroupStart = 0;

  animate<State extends TattvaState>(tattva: Tattva<State>): AnimationBuilder<State>;
  animate(tattvas: readonly Tattva<any>[]): MultiAnimationBuilder;
  animate<State extends TattvaState>(
    target: Tattva<State> | readonly Tattva<any>[],
  ): AnimationBuilder<State> | MultiAnimationBuilder {
    return Array.isArray(target)
      ? new MultiAnimationBuilder(this, target)
      : new AnimationBuilder(this, target as Tattva<State>);
  }

  animateCamera<State extends Camera3DState>(camera: Tattva<State>): CameraAnimationBuilder<State> {
    return new CameraAnimationBuilder(this, camera);
  }

  get duration(): number {
    return Math.max(
      this.compositionCursor,
      this.animations.reduce((end, animation) => Math.max(end, animation.start + animation.duration), 0),
    );
  }

  schedule<State extends TattvaState>(animation: ScheduledAnimation<State>): void {
    this.animations.push(animation);
  }

  /** Place a clip at an explicit absolute time without advancing the composition cursor. */
  add(source: Clip, options: ClipPlacementOptions): this {
    this.place(source, finiteTime(options.at, "Clip placement time"));
    return this;
  }

  /** Append a clip at the composition cursor and advance by its duration. */
  then(source: Clip): this {
    const start = this.compositionCursor;
    this.place(source, start);
    this.compositionGroupStart = start;
    this.compositionCursor = start + source.duration;
    return this;
  }

  /**
   * Place a clip concurrently with the latest sequential group. Passing `by`
   * instead overlaps the end of the composed timeline by that many seconds.
   */
  overlap(source: Clip, options: ClipOverlapOptions = {}): this {
    const start = options.by === undefined
      ? this.compositionGroupStart
      : Math.max(0, this.compositionCursor - finiteTime(options.by, "Clip overlap"));
    this.place(source, start);
    this.compositionCursor = Math.max(this.compositionCursor, start + source.duration);
    return this;
  }

  /** Advance the composition cursor without scheduling an animation. */
  wait(seconds: number): this {
    this.compositionCursor += finiteTime(seconds, "Timeline wait");
    return this;
  }

  private place(source: Clip, offset: number): void {
    if (source === this) throw new Error("A timeline cannot contain itself.");
    for (const animation of source.animations) {
      this.schedule({ ...animation, start: offset + animation.start });
    }
  }
}

/** A reusable animation section whose authored times are local to zero. */
export class Clip extends Timeline {}

export function timeline(author?: TimelineAuthor): Timeline {
  const result = new Timeline();
  author?.(result);
  return result;
}

export function clip(author?: ClipAuthor): Clip {
  const result = new Clip();
  author?.(result);
  return result;
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

  positionTo(point: Point): Timeline {
    return this.moveTo(point);
  }

  moveBy(delta: Point): Timeline {
    const [x, y, z = 0] = delta;
    return this.commit({ x, y, z } as Partial<State>, undefined, false, true);
  }

  scaleTo(scale: number): Timeline {
    return this.scale3DTo([scale, scale, scale]);
  }

  scale3DTo([scaleX, scaleY, scaleZ]: Vec3): Timeline {
    return this.commit({ scaleX, scaleY, scaleZ } as Partial<State>);
  }

  rotateTo(rotation: number): Timeline {
    return this.commit({ rotationZ: rotation } as Partial<State>);
  }

  rotate3DTo([rotationX, rotationY, rotationZ]: Vec3): Timeline {
    return this.commit({ rotationX, rotationY, rotationZ } as Partial<State>);
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

  hideText(): Timeline {
    this.requireRevealKind("text", "hideText");
    return this.commit(
      { revealProgress: 0 } as Partial<State>,
      { revealProgress: 1 } as Partial<State>,
    );
  }

  indicate(): Timeline {
    this.requireRevealKind("text", "indicate");
    return this.commit({ indicate: 1 } as Partial<State>, { indicate: 0 } as Partial<State>);
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

/** Applies one animation specification to an ordered collection of Tattvas. */
export class MultiAnimationBuilder {
  private startTime = 0;
  private animationDuration = 1;
  private easing: EaseName | Easing = easeInOutCubic;
  private staggerDelay = 0;

  constructor(
    private readonly timeline: Timeline,
    private readonly tattvas: readonly Tattva<any>[],
  ) {
    if (tattvas.length === 0) {
      throw new Error("animate([...]) requires at least one Tattva.");
    }
    if (new Set(tattvas).size !== tattvas.length) {
      throw new Error("animate([...]) cannot contain the same Tattva more than once.");
    }
  }

  at(seconds: number): this {
    this.startTime = finiteTime(seconds, "Animation start time");
    return this;
  }

  stagger(seconds: number): this {
    this.staggerDelay = finiteTime(seconds, "Animation stagger");
    return this;
  }

  duration(seconds: number): this {
    this.animationDuration = finiteTime(seconds, "Animation duration");
    return this;
  }

  ease(ease: EaseName | Easing): this {
    this.easing = ease;
    return this;
  }

  moveTo(point: Point): Timeline {
    return this.apply((animation) => animation.moveTo(point));
  }

  positionTo(point: Point): Timeline {
    return this.apply((animation) => animation.positionTo(point));
  }

  moveBy(delta: Point): Timeline {
    return this.apply((animation) => animation.moveBy(delta));
  }

  scaleTo(scale: number): Timeline {
    return this.apply((animation) => animation.scaleTo(scale));
  }

  scale3DTo(scale: Vec3): Timeline {
    return this.apply((animation) => animation.scale3DTo(scale));
  }

  rotateTo(rotation: number): Timeline {
    return this.apply((animation) => animation.rotateTo(rotation));
  }

  rotate3DTo(rotation: Vec3): Timeline {
    return this.apply((animation) => animation.rotate3DTo(rotation));
  }

  fadeTo(opacity: number): Timeline {
    return this.apply((animation) => animation.fadeTo(opacity));
  }

  setColor(color: string): Timeline {
    return this.apply((animation) => animation.setColor(color));
  }

  setStyle(styles: CSSStyles): Timeline {
    return this.apply((animation) => animation.setStyle(styles));
  }

  appear(): Timeline {
    return this.apply((animation) => animation.appear());
  }

  disappear(): Timeline {
    return this.apply((animation) => animation.disappear());
  }

  draw(): Timeline {
    this.requireRevealKind("path", "draw");
    return this.apply((animation) => animation.draw());
  }

  undraw(): Timeline {
    this.requireRevealKind("path", "undraw");
    return this.apply((animation) => animation.undraw());
  }

  typewrite(): Timeline {
    this.requireRevealKind("text", "typewrite");
    return this.apply((animation) => animation.typewrite());
  }

  untypewrite(): Timeline {
    this.requireRevealKind("text", "untypewrite");
    return this.apply((animation) => animation.untypewrite());
  }

  revealText(from = 0, to = 1): Timeline {
    this.requireRevealKind("text", "revealText");
    return this.apply((animation) => animation.revealText(from, to));
  }

  hideText(): Timeline {
    this.requireRevealKind("text", "hideText");
    return this.apply((animation) => animation.hideText());
  }

  indicate(): Timeline {
    this.requireRevealKind("text", "indicate");
    return this.apply((animation) => animation.indicate());
  }

  private apply(terminal: (animation: AnimationBuilder<any>) => Timeline): Timeline {
    this.tattvas.forEach((tattva, index) => {
      terminal(
        new AnimationBuilder(this.timeline, tattva)
          .at(this.startTime + index * this.staggerDelay)
          .duration(this.animationDuration)
          .ease(this.easing),
      );
    });
    return this.timeline;
  }

  private requireRevealKind(expected: "text" | "path", operation: string): void {
    const incompatible = this.tattvas.find((tattva) => tattva.revealKind !== expected);
    if (incompatible) {
      throw new Error(
        `${operation}() requires ${expected}-reveal Tattvas; received ${incompatible.constructor.name}.`,
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

function finiteTime(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a non-negative finite number; received ${value}.`);
  }
  return value;
}
