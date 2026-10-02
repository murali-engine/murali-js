import { interpolateValue } from "./color.ts";
import { clamp01 } from "./easing.ts";
import type { ScheduledAnimation, Timeline } from "./Timeline.ts";
import { Tattva, type Point, type StateValue, type TattvaState } from "./Tattva.ts";
import { interpolateCSSValue, type CSSStyles } from "./css.ts";
import { SceneCamera } from "./Camera3D.ts";
import { finiteNonNegative } from "./time.ts";
import { themes, type Theme } from "./theme.ts";
import type { FontFaceAsset } from "./font.ts";

export type FrameName = "landscape" | "portrait" | "square";

const frames: Record<FrameName, { width: number; height: number; viewWidth: number }> = {
  landscape: { width: 1920, height: 1080, viewWidth: 16 },
  portrait: { width: 1080, height: 1920, viewWidth: 9 },
  square: { width: 1080, height: 1080, viewWidth: 9 },
};

export interface SceneOptions {
  frame?: FrameName;
  width?: number;
  height?: number;
  viewWidth?: number;
  fps?: number;
  background?: string;
  theme?: Theme;
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

export type BrandingPosition = "topLeft" | "topRight" | "bottomLeft" | "bottomRight" | "top" | "bottom";

export interface BrandingOptions {
  readonly position?: BrandingPosition;
  readonly margin?: number;
  readonly at?: Point;
  readonly layer?: number;
}

export interface UpdaterOptions {
  /** First scene time at which the updater participates. Defaults to 0. */
  readonly from?: number;
  /** Last scene time at which the updater participates. Defaults to the end of time. */
  readonly until?: number;
}

export interface UpdaterHandle {
  readonly id: number;
}

export interface UpdaterContext<State extends TattvaState = TattvaState> {
  readonly time: number;
  readonly target: Tattva<State>;
  readonly state: State;
  readonly states: Map<Tattva<any>, TattvaState>;
  stateOf<OtherState extends TattvaState>(tattva: Tattva<OtherState>): OtherState | undefined;
}

interface RegisteredUpdater {
  readonly handle: UpdaterHandle;
  readonly target?: Tattva<any>;
  readonly from: number;
  readonly until: number;
  readonly update: (time: number, states: Map<Tattva<any>, TattvaState>) => void;
}

export interface ScreenshotCapture {
  readonly time: number;
  readonly name?: string;
}

export interface GifCapture {
  readonly name: string;
  readonly times: readonly number[];
  /** Playback rate. Omitted captures inherit the effective render FPS. */
  readonly fps?: number;
}

export interface GifCaptureRange {
  readonly from: number;
  readonly to: number;
  /** Sampling rate for this GIF. Defaults to the scene FPS. */
  readonly fps?: number;
}

export type Direction = "left" | "right" | "up" | "down";
export type Alignment = Direction | "centerX" | "centerY";

export abstract class Scene {
  readonly width: number;
  readonly height: number;
  readonly viewWidth: number;
  readonly fps: number;
  readonly background: string;
  readonly theme: Theme;
  readonly camera: SceneCamera;
  readonly tattvas: Tattva<any>[] = [];
  readonly fonts: FontFaceAsset[] = [];
  readonly screenshotCaptures: ScreenshotCapture[] = [];
  readonly gifCaptures: GifCapture[] = [];
  private readonly schedule: ScheduledAnimation<any>[] = [];
  private readonly updaters: RegisteredUpdater[] = [];
  private nextUpdaterId = 1;
  private cursor = 0;
  private prepared = false;

  constructor(options: SceneOptions = {}) {
    const frame = frames[options.frame ?? "landscape"];
    this.width = options.width ?? frame.width;
    this.height = options.height ?? frame.height;
    this.viewWidth = options.viewWidth ?? frame.viewWidth;
    this.fps = options.fps ?? 30;
    this.theme = options.theme ?? themes.dark;
    this.background = options.background ?? this.theme.colors.background;
    this.camera = new SceneCamera(this.viewHeight, this.width / this.height);
  }

  abstract construct(): void;

  prepare(): this {
    if (!this.prepared) {
      this.construct();
      this.tattvas.forEach((tattva) => tattva.resolveTheme(this.theme));
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
    const bounds = tattva.depthModeValue === "overlay"
      ? {
          min: [-this.viewWidth / 2, -this.viewHeight / 2] as const,
          max: [this.viewWidth / 2, this.viewHeight / 2] as const,
        }
      : this.camera.frameBoundsAtZ(tattva.initialState.z);
    if (!bounds) {
      throw new Error(`Cannot place ${tattva.id} at a camera edge on Z=${tattva.initialState.z}.`);
    }
    if (edge === "left") tattva.at([bounds.min[0] + margin + size.width / 2, tattva.initialState.y, tattva.initialState.z]);
    if (edge === "right") tattva.at([bounds.max[0] - margin - size.width / 2, tattva.initialState.y, tattva.initialState.z]);
    if (edge === "up") tattva.at([tattva.initialState.x, bounds.max[1] - margin - size.height / 2, tattva.initialState.z]);
    if (edge === "down") tattva.at([tattva.initialState.x, bounds.min[1] + margin + size.height / 2, tattva.initialState.z]);
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
    const z = tattva.initialState.z;
    if (direction === "left") tattva.at([x - target.width / 2 - gap - own.width / 2, y, z]);
    if (direction === "right") tattva.at([x + target.width / 2 + gap + own.width / 2, y, z]);
    if (direction === "up") tattva.at([x, y + target.height / 2 + gap + own.height / 2, z]);
    if (direction === "down") tattva.at([x, y - target.height / 2 - gap - own.height / 2, z]);
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

  /** Register a browser font face for this scene. Duplicate identical registrations are ignored. */
  registerFont(font: FontFaceAsset): this {
    const existing = this.fonts.find((candidate) =>
      candidate.family === font.family
      && candidate.weight === font.weight
      && candidate.style === font.style
    );
    if (existing && (existing.source !== font.source || existing.kind !== font.kind)) {
      throw new Error(`Font ${JSON.stringify(font.family)} already has a different source for weight ${font.weight} and style ${font.style}.`);
    }
    if (!existing) this.fonts.push(font);
    return this;
  }

  /** Add a camera-independent brand visual that stays present for the entire scene timeline. */
  addBranding<T extends Tattva>(tattva: T, options: BrandingOptions = {}): T {
    if (tattva.parent) throw new Error("Branding must be a root Tattva; pass its containing Group instead.");
    const margin = finiteNonNegative(options.margin ?? 0.35, "Branding margin");
    tattva.depthMode("overlay").layer(options.layer ?? 1_000_000);
    if (options.at) {
      tattva.at(options.at);
    } else {
      const size = tattva.getLayoutSize();
      const position = options.position ?? "bottomRight";
      const x = position.endsWith("Left")
        ? -this.viewWidth / 2 + margin + size.width / 2
        : position.endsWith("Right")
          ? this.viewWidth / 2 - margin - size.width / 2
          : 0;
      const y = position.startsWith("top")
        ? this.viewHeight / 2 - margin - size.height / 2
        : -this.viewHeight / 2 + margin + size.height / 2;
      tattva.at([x, y, tattva.initialState.z]);
    }
    this.add(tattva);
    return tattva;
  }

  play(timeline: Timeline): this {
    const animations = [...timeline.animations].sort((left, right) => left.start - right.start);
    for (const animation of animations) {
      if (animation.tattva === this.camera && "cameraProjection" in animation.to) {
        throw new Error(
          "Camera projection mode is configured immediately; animate numeric camera properties instead.",
        );
      }
      if (animation.tattva !== this.camera) this.add(animation.tattva);
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
    this.cursor += finiteNonNegative(duration, "Scene wait");
    return this;
  }

  /**
   * Run after the timeline when sampling `time`.
   * The function must derive state from `time` alone, never from a previous sample or the wall clock.
   */
  updater(update: (time: number, states: Map<Tattva<any>, TattvaState>) => void): this {
    this.registerUpdater(undefined, update, {});
    return this;
  }

  /**
   * Derive a target's sampled state, or related sampled states, at every active scene time.
   * Returns a stable authoring handle that can remove this updater before preview or export.
   */
  addUpdater<State extends TattvaState>(
    target: Tattva<State>,
    update: (context: UpdaterContext<State>) => void,
    options: UpdaterOptions = {},
  ): UpdaterHandle {
    this.add(target);
    return this.registerUpdater(target, (time, states) => {
      const state = states.get(target) as State | undefined;
      if (!state) return;
      update({
        time,
        target,
        state,
        states,
        stateOf: <OtherState extends TattvaState>(tattva: Tattva<OtherState>) =>
          states.get(tattva) as OtherState | undefined,
      });
    }, options);
  }

  /** Remove one updater by its authoring handle. Returns whether it existed. */
  removeUpdater(handle: UpdaterHandle): boolean {
    const index = this.updaters.findIndex((updater) => updater.handle.id === handle.id);
    if (index < 0) return false;
    this.updaters.splice(index, 1);
    return true;
  }

  /** Remove every targeted updater attached to a Tattva. */
  removeUpdatersFor(target: Tattva<any>): number {
    const before = this.updaters.length;
    for (let index = this.updaters.length - 1; index >= 0; index -= 1) {
      if (this.updaters[index]?.target === target) this.updaters.splice(index, 1);
    }
    return before - this.updaters.length;
  }

  /** Remove every global and targeted updater from this scene. */
  clearUpdaters(): number {
    const count = this.updaters.length;
    this.updaters.splice(0, count);
    return count;
  }

  /** Capture unnamed PNGs under `captures/` at the requested scene times. */
  captureScreenshots(times: Iterable<number>): this {
    return this.captureScreenshotsNamed(Array.from(times, (time) => [time, undefined] as const));
  }

  /** Capture PNGs at scene times. Relative names resolve from the render artifact directory. */
  captureScreenshotsNamed(entries: Iterable<readonly [number, string?]>): this {
    const captures = Array.from(entries, ([time, name]): ScreenshotCapture => ({
      time: finiteNonNegative(time, "Screenshot capture time"),
      ...(name === undefined ? {} : { name: captureName(name, "Screenshot capture name") }),
    }));
    captures.sort((left, right) => left.time - right.time);
    this.screenshotCaptures.push(...captures);
    return this;
  }

  /** Assemble the sampled scene times into a looping GIF under `gifs/`. */
  captureGif(name: string, times: Iterable<number>): this {
    const normalizedTimes = Array.from(times, (time) => finiteNonNegative(time, "GIF capture time"))
      .sort((left, right) => left - right);
    if (normalizedTimes.length === 0) throw new Error("GIF capture requires at least one scene time.");
    this.gifCaptures.push({ name: captureName(name, "GIF capture name"), times: normalizedTimes });
    return this;
  }

  /** Capture every frame in an inclusive scene-time range and assemble a looping GIF. */
  captureGifRange(name: string, range: GifCaptureRange): this {
    const from = finiteNonNegative(range.from, "GIF range start");
    const to = finiteNonNegative(range.to, "GIF range end");
    if (to < from) throw new Error(`GIF range end must be at or after its start; received ${from}..${to}.`);
    const fps = range.fps ?? this.fps;
    if (!Number.isFinite(fps) || fps <= 0) throw new Error(`GIF capture FPS must be positive and finite; received ${fps}.`);
    const frames = Math.max(1, Math.floor((to - from) * fps + 1e-9) + 1);
    const times = Array.from({ length: frames }, (_, index) => Math.min(to, from + index / fps));
    if (times[times.length - 1]! < to - 1e-9) times.push(to);
    this.gifCaptures.push({ name: captureName(name, "GIF capture name"), times, fps });
    return this;
  }

  sampleAt(time: number): Map<Tattva<any>, TattvaState> {
    finiteNonNegative(time, "Scene sample time");
    this.prepare();
    const states = new Map<Tattva<any>, TattvaState>([
      [this.camera, this.sampleTattvaAt(this.camera, time)],
      ...this.allTattvas.map((tattva) => [tattva, this.sampleTattvaAt(tattva, time)] as const),
    ]);
    for (const [tattva, state] of states) tattva.influenceState(time, state);
    for (const updater of this.updaters) {
      if (time >= updater.from && time <= updater.until) updater.update(time, states);
    }
    return states;
  }

  sampleStylesAt(time: number): Map<Tattva<any>, CSSStyles> {
    finiteNonNegative(time, "Scene style sample time");
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

  private registerUpdater(
    target: Tattva<any> | undefined,
    update: RegisteredUpdater["update"],
    options: UpdaterOptions,
  ): UpdaterHandle {
    const from = finiteNonNegative(options.from ?? 0, "Updater start time");
    const until = options.until === undefined
      ? Number.POSITIVE_INFINITY
      : finiteNonNegative(options.until, "Updater end time");
    if (until < from) {
      throw new Error(`Updater end time must be at or after its start; received ${from}..${until}.`);
    }
    const handle = Object.freeze({ id: this.nextUpdaterId++ });
    this.updaters.push({ handle, target, from, until, update });
    return handle;
  }
}

function captureName(value: string, label: string): string {
  if (value.trim().length === 0) throw new Error(`${label} must not be empty.`);
  return value;
}
