import { Tattva, type TattvaOptions, type TattvaState, type Vec2 } from "./Tattva.ts";
import type { Theme } from "./theme.ts";

export interface CanvasContext {
  /** The canvas owned by this Tattva. Its bitmap matches the rendered output resolution. */
  readonly canvas: HTMLCanvasElement;
  readonly context: CanvasRenderingContext2D;
  /** Output pixels per Murali world unit. */
  readonly pixelsPerUnit: number;
  readonly theme: Theme;
}

export interface CanvasSample {
  /** Authoritative virtual scene time in seconds. */
  readonly time: number;
  readonly fps: number;
  /** Frame nearest to `time` at the scene FPS. */
  readonly frame: number;
  readonly duration: number;
  /** Scene progress clamped to 0..1. */
  readonly progress: number;
}

export interface CanvasHooks<State extends TattvaState> {
  /** Allocate deterministic reusable resources such as Path2D objects. */
  setup?: (context: CanvasContext) => void;
  /** Draw the complete canvas for one independently sampled frame. */
  draw: (
    context: CanvasContext,
    state: Readonly<State>,
    sample: Readonly<CanvasSample>,
  ) => void;
}

export type CanvasTattvaOptions<State extends TattvaState> =
  & Omit<TattvaOptions<State>, "tag" | "html" | "text">
  & { size: Vec2 };

/** Deterministic Canvas 2D content with the standard Tattva transform and animation grammar. */
export class CanvasTattva<State extends TattvaState = TattvaState> extends Tattva<State> {
  override readonly kind = "canvas" as const;

  constructor(
    readonly hooks: CanvasHooks<State>,
    options: CanvasTattvaOptions<State>,
  ) {
    const { size, ...tattvaOptions } = options;
    super({ ...tattvaOptions, tag: "canvas" });
    const [width, height] = size;
    if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
      throw new Error(`Canvas size must contain positive finite values; received [${width}, ${height}].`);
    }
    this.worldSize = { width, height };
  }
}
