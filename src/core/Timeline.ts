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
import type { Point, Tattva, TattvaState } from "./Tattva.ts";
import type { CSSStyles } from "./css.ts";

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

export interface ScheduledAnimation {
  tattva: Tattva;
  start: number;
  duration: number;
  easing: Easing;
  to: Partial<TattvaState>;
  from?: Partial<TattvaState>;
  relative?: boolean;
  hideBeforeStart?: boolean;
  styleTo?: CSSStyles;
  styleFrom?: CSSStyles;
}

export class Timeline {
  readonly animations: ScheduledAnimation[] = [];

  animate(tattva: Tattva): AnimationBuilder {
    return new AnimationBuilder(this, tattva);
  }

  get duration(): number {
    return this.animations.reduce((end, animation) => Math.max(end, animation.start + animation.duration), 0);
  }

  schedule(animation: ScheduledAnimation): void {
    this.animations.push(animation);
  }
}

export class AnimationBuilder {
  private startTime = 0;
  private animationDuration = 1;
  private easing: Easing = easeInOutCubic;

  constructor(
    private readonly timeline: Timeline,
    private readonly tattva: Tattva,
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
    return this.commit({ x, y, z });
  }

  moveBy(delta: Point): Timeline {
    const [x, y, z = 0] = delta;
    return this.commit({ x, y, z }, undefined, false, true);
  }

  scaleTo(scale: number): Timeline {
    return this.commit({ scale });
  }

  rotateTo(rotation: number): Timeline {
    return this.commit({ rotation });
  }

  fadeTo(opacity: number): Timeline {
    return this.commit({ opacity });
  }

  setColor(color: string): Timeline {
    return this.commit({ [this.tattva.colorProperty]: color });
  }

  to(state: Partial<TattvaState>): Timeline {
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
    return this.commit({ opacity: 1 }, { opacity: 0 }, true);
  }

  disappear(): Timeline {
    return this.commit({ opacity: 0 });
  }

  draw(): Timeline {
    return this.appear();
  }

  typewrite(): Timeline {
    return this.appear();
  }

  private commit(
    to: Partial<TattvaState>,
    from?: Partial<TattvaState>,
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
}
