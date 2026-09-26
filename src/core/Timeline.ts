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

  get duration(): number {
    return this.animations.reduce((end, animation) => Math.max(end, animation.start + animation.duration), 0);
  }

  schedule<State extends TattvaState>(animation: ScheduledAnimation<State>): void {
    this.animations.push(animation);
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
    return this.appear();
  }

  typewrite(): Timeline {
    return this.appear();
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
}
