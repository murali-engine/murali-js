import type { CanvasSample } from "./CanvasTattva.ts";
import { Tattva, type TattvaOptions, type TattvaState, type Vec2 } from "./Tattva.ts";
import type { Theme } from "./theme.ts";

export interface Canvas3DContext {
  /** The WebGL canvas owned by this Tattva. */
  readonly canvas: HTMLCanvasElement;
  readonly gl: WebGL2RenderingContext;
  /** Output pixels per Murali world unit. */
  readonly pixelsPerUnit: number;
  readonly theme: Theme;
}

export interface Canvas3DHooks<State extends TattvaState> {
  /** Create persistent shaders, programs, buffers, textures, and vertex arrays. */
  setup?: (context: Canvas3DContext) => void;
  /** Draw the complete WebGL picture for one independently sampled frame. */
  draw: (
    context: Canvas3DContext,
    state: Readonly<State>,
    sample: Readonly<CanvasSample>,
  ) => void;
}

export type Canvas3DTattvaOptions<State extends TattvaState> =
  & Omit<TattvaOptions<State>, "tag" | "html" | "text">
  & {
    size: Vec2;
    /** Attributes passed to `getContext("webgl2")`. Frame capture always preserves the drawing buffer. */
    contextAttributes?: WebGLContextAttributes;
  };

/** Raw WebGL2 content with the standard Tattva transform and animation grammar. */
export class Canvas3DTattva<State extends TattvaState = TattvaState> extends Tattva<State> {
  override readonly kind = "canvas3d" as const;
  readonly contextAttributes?: WebGLContextAttributes;

  constructor(
    readonly hooks: Canvas3DHooks<State>,
    options: Canvas3DTattvaOptions<State>,
  ) {
    const { size, contextAttributes, ...tattvaOptions } = options;
    super({ ...tattvaOptions, tag: "canvas" });
    const [width, height] = size;
    if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
      throw new Error(`Canvas 3D size must contain positive finite values; received [${width}, ${height}].`);
    }
    this.worldSize = { width, height };
    this.contextAttributes = contextAttributes;
  }
}
