import type { AnimationSpec } from "./Animation.ts";
import { interpolateValue } from "./color.ts";
import { clamp01 } from "./easing.ts";
import type { Mobject, MobjectState, StateValue } from "./Mobject.ts";

interface TimelineEntry {
  mobject: Mobject;
  start: number;
  duration: number;
  from: Partial<MobjectState>;
  to: Partial<MobjectState>;
  easing: (t: number) => number;
}

export interface SceneOptions {
  width?: number;
  height?: number;
  fps?: number;
  background?: string;
}

export abstract class Scene {
  readonly width: number;
  readonly height: number;
  readonly fps: number;
  readonly background: string;
  readonly mobjects: Mobject[] = [];
  private readonly timeline: TimelineEntry[] = [];
  private cursor = 0;
  private prepared = false;

  constructor(options: SceneOptions = {}) {
    this.width = options.width ?? 1920;
    this.height = options.height ?? 1080;
    this.fps = options.fps ?? 30;
    this.background = options.background ?? "#080b12";
  }

  abstract construct(): void;

  prepare(): this {
    if (!this.prepared) {
      this.construct();
      this.prepared = true;
    }
    return this;
  }

  get duration(): number {
    return this.cursor;
  }

  add<T extends Mobject>(mobject: T): T {
    if (!this.mobjects.includes(mobject)) this.mobjects.push(mobject);
    return mobject;
  }

  play(...animations: AnimationSpec[]): this {
    if (animations.length === 0) return this;
    const start = this.cursor;
    for (const animation of animations) {
      this.add(animation.mobject);
      const current = this.sampleMobjectAt(animation.mobject, start);
      const from = Object.fromEntries(Object.keys(animation.to).map((key) => [key, current[key]])) as Partial<MobjectState>;
      this.timeline.push({
        mobject: animation.mobject,
        start,
        duration: Math.max(0, animation.duration),
        from,
        to: animation.to,
        easing: animation.easing,
      });
    }
    this.cursor += Math.max(...animations.map((animation) => Math.max(0, animation.duration)));
    return this;
  }

  wait(duration = 1): this {
    this.cursor += Math.max(0, duration);
    return this;
  }

  sampleAt(time: number): Map<Mobject, MobjectState> {
    this.prepare();
    return new Map(this.mobjects.map((mobject) => [mobject, this.sampleMobjectAt(mobject, time)]));
  }

  private sampleMobjectAt(mobject: Mobject, time: number): MobjectState {
    const state: MobjectState = { ...mobject.initialState };
    for (const entry of this.timeline) {
      if (entry.mobject !== mobject || time < entry.start) continue;
      const raw = entry.duration === 0 ? 1 : (time - entry.start) / entry.duration;
      const progress = entry.easing(clamp01(raw));
      for (const key of Object.keys(entry.to)) {
        state[key] = interpolateValue(entry.from[key] as StateValue, entry.to[key] as StateValue, progress);
      }
    }
    return state;
  }
}
