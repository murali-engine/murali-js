import {
  AmbientLight,
  Color,
  DirectionalLight,
  Mesh,
  MeshStandardMaterial,
  type ColorRepresentation,
  type Texture,
} from "three";
import helvetikerBold from "three/examples/fonts/helvetiker_bold.typeface.json" with { type: "json" };
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import {
  FontLoader,
  type Font,
  type FontData,
} from "three/examples/jsm/loaders/FontLoader.js";
import { TTFLoader } from "three/examples/jsm/loaders/TTFLoader.js";
import { ThreeTattva } from "../../core/ThreeTattva.ts";
import {
  isThemeColorRef,
  resolveColorInput,
  themeColor,
  type Theme,
  type ThemeColorRef,
} from "../../core/theme.ts";

export type Text3DColorInput = ColorRepresentation | ThemeColorRef;

export interface Text3DBevelOptions {
  enabled?: boolean;
  thickness?: number;
  size?: number;
  offset?: number;
  segments?: number;
}

export interface Text3DGeometryOptions {
  font?: Font;
  height?: number;
  depth?: number;
  curveSegments?: number;
  bevel?: Text3DBevelOptions;
}

export interface Text3DMaterialOptions {
  faceColor?: Text3DColorInput;
  sideColor?: Text3DColorInput;
  roughness?: number;
  metalness?: number;
  faceTexture?: Texture;
}

export interface Text3DOptions extends Text3DGeometryOptions, Text3DMaterialOptions {}

interface ResolvedText3DOptions {
  font: Font;
  height: number;
  depth: number;
  curveSegments: number;
  bevel: Required<Text3DBevelOptions>;
  faceColor: ColorRepresentation;
  sideColor: ColorRepresentation;
  roughness: number;
  metalness: number;
  faceTexture?: Texture;
}

const fontLoader = new FontLoader();
const ttfLoader = new TTFLoader();

/** Bundled vector font used when a Text3D does not select another typeface. */
export const DEFAULT_TEXT_3D_FONT = fontLoader.parse(helvetikerBold as unknown as FontData);

const DEFAULT_OPTIONS: ResolvedText3DOptions = {
  font: DEFAULT_TEXT_3D_FONT,
  height: 1,
  depth: 0.3,
  curveSegments: 12,
  bevel: {
    enabled: false,
    thickness: 0.04,
    size: 0.025,
    offset: 0,
    segments: 3,
  },
  faceColor: "#fff9e8",
  sideColor: "#6b6357",
  roughness: 0.72,
  metalness: 0.04,
};

/** Parse Three.js typeface JSON for use with Text3D and Letter3D. */
export function parseText3DFont(data: FontData): Font {
  return fontLoader.parse(data);
}

/** Parse raw TrueType bytes into a vector font suitable for Text3D. */
export function parseText3DTTF(bytes: ArrayBuffer | ArrayBufferView): Font {
  const source = bytes instanceof ArrayBuffer
    ? new Uint8Array(bytes)
    : new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const owned = new Uint8Array(source.byteLength);
  owned.set(source);
  return fontLoader.parse(ttfLoader.parse(owned.buffer));
}

/**
 * Create centered, vector-extruded text geometry. Front, back, holes, and side
 * walls are produced by Three.js from the font outline rather than a bitmap.
 */
export function createText3DGeometry(
  text: string,
  options: Text3DGeometryOptions = {},
): TextGeometry {
  if (text.length === 0) throw new Error("Text3D content cannot be empty.");
  const resolved = resolveOptions(options);
  const geometry = new TextGeometry(text, {
    font: resolved.font,
    size: resolved.height,
    depth: resolved.depth,
    curveSegments: resolved.curveSegments,
    bevelEnabled: resolved.bevel.enabled,
    bevelThickness: resolved.bevel.thickness,
    bevelSize: resolved.bevel.size,
    bevelOffset: resolved.bevel.offset,
    bevelSegments: resolved.bevel.segments,
  });
  if (geometry.getAttribute("position").count === 0) {
    geometry.dispose();
    throw new Error(`Text3D font has no drawable outlines for ${JSON.stringify(text)}.`);
  }
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  if (!bounds) {
    geometry.dispose();
    throw new Error(`Text3D could not compute bounds for ${JSON.stringify(text)}.`);
  }
  geometry.translate(
    -(bounds.min.x + bounds.max.x) / 2,
    -(bounds.min.y + bounds.max.y) / 2,
    -(bounds.min.z + bounds.max.z) / 2,
  );
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.computeVertexNormals();
  return geometry;
}

/** A true vector-extruded text object with real front/back faces and side walls. */
export class Text3DTattva extends ThreeTattva {
  private readonly text3DOptions: ResolvedText3DOptions;
  private faceColorInput: Text3DColorInput;
  private sideColorInput: Text3DColorInput;

  constructor(readonly content: string, options: Text3DOptions = {}) {
    const faceColorInput = options.faceColor ?? themeColor("textPrimary");
    const sideColorInput = options.sideColor ?? themeColor("surfaceElevated");
    const resolved = resolveOptions({
      ...options,
      faceColor: resolveText3DColor(faceColorInput),
      sideColor: resolveText3DColor(sideColorInput),
    });
    super({
      setup({ scene }) {
        const geometry = createText3DGeometry(content, resolved);
        const face = new MeshStandardMaterial({
          color: new Color(resolved.faceColor),
          map: resolved.faceTexture,
          roughness: resolved.roughness,
          metalness: resolved.metalness,
        });
        const side = new MeshStandardMaterial({
          color: new Color(resolved.sideColor),
          roughness: resolved.roughness,
          metalness: resolved.metalness,
        });
        const key = new DirectionalLight(0xffffff, 2.4);
        key.position.set(-3, 5, 7);
        scene.add(new AmbientLight(0xffffff, 1.8), key, new Mesh(geometry, [face, side]));
      },
    });
    this.text3DOptions = resolved;
    this.faceColorInput = faceColorInput;
    this.sideColorInput = sideColorInput;
    this.refreshBounds();
  }

  height(value: number): this {
    this.text3DOptions.height = positive(value, "Text3D height");
    return this.refreshBounds();
  }

  depth(value: number): this {
    this.text3DOptions.depth = positive(value, "Text3D depth");
    return this.refreshBounds();
  }

  curveSegments(value: number): this {
    this.text3DOptions.curveSegments = positiveInteger(value, "Text3D curve segments");
    return this.refreshBounds();
  }

  font(value: Font): this {
    this.text3DOptions.font = value;
    return this.refreshBounds();
  }

  bevel(options: Text3DBevelOptions | boolean = true): this {
    if (typeof options === "boolean") {
      this.text3DOptions.bevel.enabled = options;
    } else {
      this.text3DOptions.bevel = resolveBevel({ ...this.text3DOptions.bevel, ...options });
    }
    return this.refreshBounds();
  }

  faceColor(value: Text3DColorInput): this {
    this.faceColorInput = value;
    this.text3DOptions.faceColor = resolveText3DColor(value, this.resolvedTheme);
    return this;
  }

  sideColor(value: Text3DColorInput): this {
    this.sideColorInput = value;
    this.text3DOptions.sideColor = resolveText3DColor(value, this.resolvedTheme);
    return this;
  }

  material(options: Text3DMaterialOptions): this {
    if (options.faceColor !== undefined) this.faceColor(options.faceColor);
    if (options.sideColor !== undefined) this.sideColor(options.sideColor);
    if (options.roughness !== undefined) {
      this.text3DOptions.roughness = unit(options.roughness, "Text3D roughness");
    }
    if (options.metalness !== undefined) {
      this.text3DOptions.metalness = unit(options.metalness, "Text3D metalness");
    }
    if (options.faceTexture !== undefined) this.text3DOptions.faceTexture = options.faceTexture;
    return this;
  }

  faceTexture(value: Texture): this {
    this.text3DOptions.faceTexture = value;
    return this;
  }

  protected override onThemeResolved(theme: Theme): void {
    this.text3DOptions.faceColor = resolveText3DColor(this.faceColorInput, theme);
    this.text3DOptions.sideColor = resolveText3DColor(this.sideColorInput, theme);
  }

  private refreshBounds(): this {
    const geometry = createText3DGeometry(this.content, this.text3DOptions);
    const bounds = geometry.boundingBox;
    if (!bounds) throw new Error("Text3D geometry bounds are unavailable.");
    this.worldSize = {
      width: bounds.max.x - bounds.min.x,
      height: bounds.max.y - bounds.min.y,
    };
    geometry.dispose();
    return this;
  }
}

function resolveText3DColor(value: Text3DColorInput, theme?: Theme): ColorRepresentation {
  return isThemeColorRef(value) ? resolveColorInput(value, theme) : value;
}

export function Text3D(content: string, options: Text3DOptions = {}): Text3DTattva {
  return new Text3DTattva(content, options);
}

export function Letter3D(character: string, options: Text3DOptions = {}): Text3DTattva {
  if ([...character].length !== 1) {
    throw new Error(`Letter3D requires exactly one character; received ${JSON.stringify(character)}.`);
  }
  return new Text3DTattva(character, options);
}

function resolveOptions(options: Text3DOptions): ResolvedText3DOptions {
  return {
    font: options.font ?? DEFAULT_OPTIONS.font,
    height: positive(options.height ?? DEFAULT_OPTIONS.height, "Text3D height"),
    depth: positive(options.depth ?? DEFAULT_OPTIONS.depth, "Text3D depth"),
    curveSegments: positiveInteger(
      options.curveSegments ?? DEFAULT_OPTIONS.curveSegments,
      "Text3D curve segments",
    ),
    bevel: resolveBevel(options.bevel),
    faceColor: resolveText3DColor(options.faceColor ?? DEFAULT_OPTIONS.faceColor),
    sideColor: resolveText3DColor(options.sideColor ?? DEFAULT_OPTIONS.sideColor),
    roughness: unit(options.roughness ?? DEFAULT_OPTIONS.roughness, "Text3D roughness"),
    metalness: unit(options.metalness ?? DEFAULT_OPTIONS.metalness, "Text3D metalness"),
    faceTexture: options.faceTexture,
  };
}

function resolveBevel(options: Text3DBevelOptions = {}): Required<Text3DBevelOptions> {
  return {
    enabled: options.enabled ?? DEFAULT_OPTIONS.bevel.enabled,
    thickness: nonnegative(
      options.thickness ?? DEFAULT_OPTIONS.bevel.thickness,
      "Text3D bevel thickness",
    ),
    size: nonnegative(options.size ?? DEFAULT_OPTIONS.bevel.size, "Text3D bevel size"),
    offset: finite(options.offset ?? DEFAULT_OPTIONS.bevel.offset, "Text3D bevel offset"),
    segments: positiveInteger(
      options.segments ?? DEFAULT_OPTIONS.bevel.segments,
      "Text3D bevel segments",
    ),
  };
}

function positive(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive finite number; received ${value}.`);
  }
  return value;
}

function nonnegative(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a non-negative finite number; received ${value}.`);
  }
  return value;
}

function finite(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite; received ${value}.`);
  return value;
}

function positiveInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer; received ${value}.`);
  }
  return value;
}

function unit(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${label} must be between 0 and 1; received ${value}.`);
  }
  return value;
}
