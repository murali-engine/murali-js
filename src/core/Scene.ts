import { interpolateValue } from "./color.ts";
import { clamp01 } from "./easing.ts";
import type { ScheduledAnimation, Timeline } from "./Timeline.ts";
import { Tattva, type Point, type StateValue, type TattvaState } from "./Tattva.ts";
import { interpolateCSSValue, type CSSStyles } from "./css.ts";

export type FrameName = "landscape" | "portrait" | "square";

const frames: Record<FrameName, { width: number; height: number; viewWidth: number }> = {
  landscape: { width: 1920, height: 1080, viewWidth: 16 },
  portrait: { width: 1080, height: 1920, viewWidth: 9 },
  square: { width: 1080, height: 1080, viewWidth: 16 },
};

export interface SceneOptions {
  frame?: FrameName;
  width?: number;
  height?: number;
  viewWidth?: number;
  fps?: number;
  background?: string;
}

export interface AddOptions {
  at?: Point;
}

export interface EdgeOptions {
  margin?: number;
}

export interface RelativeLayoutOptions {
  gap?: number;
}

export type Direction = "left" | "right" | "up" | "down";
export type Alignment = Direction | "centerX" | "centerY";

export abstract class Scene {
  readonly width: number;
  readonly height: number;
  readonly viewWidth: number;
  readonly fps: number;
  readonly background: string;
  readonly tattvas: Tattva<any>[] = [];
  private readonly schedule: ScheduledAnimation<any>[] = [];
  private cursor = 0;
  private prepared = false;

  constructor(options: SceneOptions = {}) {
    const frame = frames[options.frame ?? "landscape"];
    this.width = options.width ?? frame.width;
    this.height = options.height ?? frame.height;
    this.viewWidth = options.viewWidth ?? frame.viewWidth;
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

  get viewHeight(): number {
    return this.viewWidth * (this.height / this.width);
  }

  get allTattvas(): Tattva<any>[] {
    const result: Tattva<any>[] = [];
    const visit = (tattva: Tattva<any>) => {
      result.push(tattva);
      tattva.children.forEach(visit);
    };
    this.tattvas.forEach(visit);
    return result;
  }

  add<T extends Tattva<any>>(tattva: T, options?: AddOptions): T;
  add<const Items extends readonly Tattva<any>[]>(...tattvas: Items): Items;
  add(...args: [Tattva<any>, AddOptions?] | Tattva<any>[]): Tattva<any> | readonly Tattva<any>[] {
    const hasOptions = args.length === 2 && !(args[1] instanceof Tattva);
    const items = (hasOptions ? [args[0]] : args) as Tattva<any>[];
    const options = hasOptions ? (args[1] as AddOptions) : undefined;
    if (options?.at) items[0].at(options.at);
    for (const tattva of items) {
      let root: Tattva<any> = tattva;
      while (root.parent) root = root.parent;
      if (!this.tattvas.includes(root)) this.tattvas.push(root);
    }
    return hasOptions || items.length === 1 ? items[0] : items;
  }

  toEdge<T extends Tattva>(
    tattva: T,
    edge: Direction,
    options: EdgeOptions = {},
  ): T {
    const margin = options.margin ?? 0.5;
    const size = tattva.getLayoutSize();
    const x = this.viewWidth / 2 - margin - size.width / 2;
    const y = this.viewHeight / 2 - margin - size.height / 2;
    if (edge === "left") tattva.at([-x, tattva.initialState.y]);
    if (edge === "right") tattva.at([x, tattva.initialState.y]);
    if (edge === "up") tattva.at([tattva.initialState.x, y]);
    if (edge === "down") tattva.at([tattva.initialState.x, -y]);
    return tattva;
  }

  nextTo<T extends Tattva>(
    tattva: T,
    anchor: Tattva,
    direction: Direction,
    options: RelativeLayoutOptions = {},
  ): T {
    const gap = options.gap ?? 0.25;
    const own = tattva.getLayoutSize();
    const target = anchor.getLayoutSize();
    const x = anchor.initialState.x;
    const y = anchor.initialState.y;
    if (direction === "left") tattva.at([x - target.width / 2 - gap - own.width / 2, y]);
    if (direction === "right") tattva.at([x + target.width / 2 + gap + own.width / 2, y]);
    if (direction === "up") tattva.at([x, y + target.height / 2 + gap + own.height / 2]);
    if (direction === "down") tattva.at([x, y - target.height / 2 - gap - own.height / 2]);
    return tattva;
  }

  alignTo<T extends Tattva>(tattva: T, anchor: Tattva, alignment: Alignment): T {
    const own = tattva.getLayoutSize();
    const target = anchor.getLayoutSize();
    let { x, y, z } = tattva.initialState;
    if (alignment === "left") x = anchor.initialState.x - target.width / 2 + own.width / 2;
    if (alignment === "right") x = anchor.initialState.x + target.width / 2 - own.width / 2;
    if (alignment === "up") y = anchor.initialState.y + target.height / 2 - own.height / 2;
    if (alignment === "down") y = anchor.initialState.y - target.height / 2 + own.height / 2;
    if (alignment === "centerX") x = anchor.initialState.x;
    if (alignment === "centerY") y = anchor.initialState.y;
    return tattva.at([x, y, z]);
  }

  play(timeline: Timeline): this {
    const animations = [...timeline.animations].sort((left, right) => left.start - right.start);
    for (const animation of animations) {
      this.add(animation.tattva);
      const start = this.cursor + animation.start;
      const stateAtStart = this.sampleTattvaAt(animation.tattva, start);
      const from = animation.from ?? Object.fromEntries(
        Object.keys(animation.to).map((key) => [
          key,
          (stateAtStart as unknown as Record<string, StateValue>)[key],
        ]),
      ) as Partial<TattvaState>;
      const to = animation.relative
        ? Object.fromEntries(Object.entries(animation.to).map(([key, delta]) => [
            key,
            typeof delta === "number" && typeof from[key] === "number"
              ? from[key] + delta
              : delta,
          ])) as Partial<TattvaState>
        : animation.to;
      const styleAtStart = this.sampleTattvaStyleAt(animation.tattva, start);
      const styleFrom = animation.styleFrom ?? Object.fromEntries(
        Object.keys(animation.styleTo ?? {}).map((key) => [key, styleAtStart[key as keyof CSSStyleDeclaration] ?? null]),
      ) as CSSStyles;
      this.schedule.push({ ...animation, start, from, to, styleFrom, relative: false });
    }
    this.cursor += timeline.duration;
    return this;
  }

  wait(duration = 1): this {
    this.cursor += Math.max(0, duration);
    return this;
  }

  sampleAt(time: number): Map<Tattva<any>, TattvaState> {
    this.prepare();
    return new Map(this.allTattvas.map((tattva) => [tattva, this.sampleTattvaAt(tattva, time)]));
  }

  sampleStylesAt(time: number): Map<Tattva<any>, CSSStyles> {
    this.prepare();
    return new Map(this.allTattvas.map((tattva) => [tattva, this.sampleTattvaStyleAt(tattva, time)]));
  }

  private sampleTattvaAt(tattva: Tattva<any>, time: number): TattvaState {
    const state = { ...tattva.initialState } as TattvaState;
    for (const entry of this.schedule) {
      if (entry.tattva !== tattva) continue;
      if (time < entry.start) {
        if (entry.hideBeforeStart && entry.from) {
          for (const key of Object.keys(entry.from)) {
            (state as unknown as Record<string, StateValue>)[key] = entry.from[key] as StateValue;
          }
        }
        continue;
      }
      const from = entry.from ?? {};
      const raw = entry.duration === 0 ? 1 : (time - entry.start) / entry.duration;
      const progress = entry.easing(clamp01(raw));
      for (const key of Object.keys(entry.to)) {
        (state as unknown as Record<string, StateValue>)[key] = interpolateValue(
          from[key] as StateValue,
          entry.to[key] as StateValue,
          progress,
        );
      }
    }
    return state;
  }

  private sampleTattvaStyleAt(tattva: Tattva<any>, time: number): CSSStyles {
    const style: CSSStyles = { ...tattva.initialStyle };
    for (const entry of this.schedule) {
      if (entry.tattva !== tattva || time < entry.start || !entry.styleTo) continue;
      const raw = entry.duration === 0 ? 1 : (time - entry.start) / entry.duration;
      const progress = entry.easing(clamp01(raw));
      for (const key of Object.keys(entry.styleTo)) {
        const property = key as keyof CSSStyles;
        style[property] = interpolateCSSValue(
          entry.styleFrom?.[property] ?? null,
          entry.styleTo[property] ?? null,
          progress,
        );
      }
    }
    return style;
  }
}
