import { interpolateValue } from "../../core/color.ts";
import { clamp01 } from "../../core/easing.ts";
import { isCssPaint, resolveColor } from "../../core/palette.ts";
import { Tattva, type TattvaState, type Vec2 } from "../../core/Tattva.ts";
import { fontFamily, type FontFaceAsset } from "../../core/font.ts";
import {
  cubicContoursPath,
  interpolateCubicContours,
  mapCubicContours,
  normalizeCubicContours,
  parseSvgCubicPath,
  polylineCubicContour,
  type CubicContour,
  type CubicContourPair,
} from "../../core/vector-path.ts";
import {
  resolveColorInput,
  themeColor,
  type ColorInput,
  type Theme,
} from "../../core/theme.ts";

export interface ShapeMorphSnapshot {
  readonly contours: readonly CubicContour[];
  readonly fill: string;
  readonly stroke: string;
  readonly strokeWidth: number;
}

export class ShapeTattva extends Tattva {
  override colorProperty = "background" as const;
  protected shapeFill = "#22d3ee";
  protected shapeStroke = "none";
  protected shapeStrokeWidth = 0;
  private fillInput: ColorInput = themeColor("accent");
  private strokeInput?: ColorInput;

  fill(color: ColorInput): this {
    this.fillInput = color;
    return this.applyFill(resolveColorInput(color, this.resolvedTheme));
  }

  protected defaultFill(color: ColorInput): this {
    this.fillInput = color;
    return this.applyFill(resolveColorInput(color, this.resolvedTheme));
  }

  private applyFill(resolved: string): this {
    this.shapeFill = resolved;
    this.setInitial({ background: resolved });
    if (isCssPaint(resolved)) {
      this.revealKind = "none";
      this.paintsOwnStroke = false;
      return this.setComputedStyle({ background: resolved });
    }
    this.revealKind = "path";
    this.paintsOwnStroke = true;
    return this.setComputedStyle({ background: resolved, borderStyle: "none" });
  }

  stroke(options: { color: ColorInput; width?: number }): this {
    this.strokeInput = options.color;
    this.shapeStroke = resolveColorInput(options.color, this.resolvedTheme);
    this.shapeStrokeWidth = options.width ?? 0.05;
    this.worldStrokeWidth = this.shapeStrokeWidth;
    return this.setComputedStyle({ borderColor: this.shapeStroke, borderStyle: "solid" });
  }

  protected override onThemeResolved(theme: Theme): void {
    if (this.hasExplicitStyle("background") && typeof this.initialStyle.background === "string") {
      this.shapeFill = this.initialStyle.background;
      this.setInitial({ background: this.initialStyle.background });
    } else {
      this.applyFill(resolveColorInput(this.fillInput, theme));
    }
    if (this.strokeInput !== undefined) {
      this.shapeStroke = resolveColorInput(this.strokeInput, theme);
      this.setComputedStyle({ borderColor: this.shapeStroke });
    }
  }

  protected shapePath(_width: number, _height: number): string {
    return "";
  }

  /** A centered, closed contour used by ShapeMorph. */
  morphContour(_samples: number): readonly Vec2[] {
    throw new Error(`${this.constructor.name} does not expose a morphable closed contour.`);
  }

  /** Centered cubic contours used by the vector morph engine. */
  morphContours(samples: number): readonly CubicContour[] {
    const width = this.worldSize?.width ?? 0;
    const height = this.worldSize?.height ?? 0;
    const path = this.shapePath(width, height);
    if (path) {
      return mapCubicContours(parseSvgCubicPath(path), ([x, y]) => [x - width / 2, y - height / 2]);
    }
    return [polylineCubicContour(this.morphContour(samples))];
  }

  morphSnapshot(samples: number): ShapeMorphSnapshot {
    if (isCssPaint(this.shapeFill)) {
      throw new Error("ShapeMorph currently supports solid fills, not CSS image/gradient paints.");
    }
    return {
      contours: this.morphContours(samples),
      fill: this.shapeFill,
      stroke: this.shapeStroke,
      strokeWidth: this.shapeStrokeWidth,
    };
  }

  override contentHTML(): string | undefined {
    const background = this.initialStyle.background;
    if (typeof background === "string" && isCssPaint(background)) {
      this.revealKind = "none";
      this.paintsOwnStroke = false;
      return undefined;
    }
    if (this.revealKind !== "path") return undefined;
    const width = this.worldSize?.width ?? 0;
    const height = this.worldSize?.height ?? 0;
    if (width <= 0 || height <= 0) return undefined;
    return `<svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" overflow="visible" xmlns="http://www.w3.org/2000/svg"><path data-murali-path data-murali-shape data-murali-reveal-fill d="${this.shapePath(width, height)}" fill="${escapeAttribute(this.shapeFill)}" stroke="${escapeAttribute(this.shapeStroke)}" stroke-width="${this.shapeStrokeWidth}" stroke-linejoin="round" stroke-linecap="round" /></svg>`;
  }
}

export class CircleTattva extends ShapeTattva {
  private radiusValue = 1;

  constructor() {
    super({ css: { borderRadius: "50%" } });
    this.defaultFill(themeColor("accent"));
    this.radius(1);
  }

  radius(value: number): this {
    this.radiusValue = value;
    this.worldSize = { width: value * 2, height: value * 2 };
    return this;
  }

  protected override shapePath(width: number, height: number): string {
    const radius = Math.min(width, height) / 2;
    return `M ${this.radiusValue} 0 A ${radius} ${radius} 0 1 1 ${this.radiusValue} ${height} A ${radius} ${radius} 0 1 1 ${this.radiusValue} 0 Z`;
  }

  override morphContour(samples: number): readonly Vec2[] {
    return sampleEllipse(this.radiusValue, this.radiusValue, samples);
  }
}

export class RectangleTattva extends ShapeTattva {
  private corner = 0;

  constructor() {
    super();
    this.defaultFill(themeColor("accentAlt"));
    this.size([2, 1]);
  }

  size([width, height]: readonly [number, number]): this {
    this.worldSize = { width, height };
    return this;
  }

  cornerRadius(value: number): this {
    this.corner = Math.max(0, value);
    return this;
  }

  protected override shapePath(width: number, height: number): string {
    const radius = Math.min(this.corner, width / 2, height / 2);
    if (radius <= 0) return `M 0 0 H ${width} V ${height} H 0 Z`;
    return `M ${radius} 0 H ${width - radius} A ${radius} ${radius} 0 0 1 ${width} ${radius} V ${height - radius} A ${radius} ${radius} 0 0 1 ${width - radius} ${height} H ${radius} A ${radius} ${radius} 0 0 1 0 ${height - radius} V ${radius} A ${radius} ${radius} 0 0 1 ${radius} 0 Z`;
  }

  override morphContour(samples: number): readonly Vec2[] {
    const width = this.worldSize?.width ?? 0;
    const height = this.worldSize?.height ?? 0;
    return resampleClosedContour(roundedRectangleContour(width, height, this.corner), samples);
  }
}

export class SquareTattva extends ShapeTattva {
  constructor() {
    super();
    this.defaultFill(themeColor("accentAlt"));
    this.size(1);
  }

  size(value: number): this {
    this.worldSize = { width: value, height: value };
    return this;
  }

  protected override shapePath(width: number, height: number): string {
    return `M 0 0 H ${width} V ${height} H 0 Z`;
  }

  override morphContour(samples: number): readonly Vec2[] {
    const half = (this.worldSize?.width ?? 0) / 2;
    return resampleClosedContour([
      [half, 0], [half, half], [0, half], [-half, half],
      [-half, 0], [-half, -half], [0, -half], [half, -half],
    ], samples);
  }
}

export class EllipseTattva extends ShapeTattva {
  private radiusX = 1.4;
  private radiusY = 0.8;

  constructor() {
    super({ css: { borderRadius: "50%" } });
    this.defaultFill(themeColor("accent"));
    this.radii([this.radiusX, this.radiusY]);
  }

  radii([radiusX, radiusY]: Vec2): this {
    this.radiusX = positive(radiusX, "Ellipse X radius");
    this.radiusY = positive(radiusY, "Ellipse Y radius");
    this.worldSize = { width: radiusX * 2, height: radiusY * 2 };
    return this;
  }

  protected override shapePath(width: number, height: number): string {
    return `M ${width} ${height / 2} A ${this.radiusX} ${this.radiusY} 0 1 1 0 ${height / 2} A ${this.radiusX} ${this.radiusY} 0 1 1 ${width} ${height / 2} Z`;
  }

  override morphContour(samples: number): readonly Vec2[] {
    return sampleEllipse(this.radiusX, this.radiusY, samples);
  }
}

export class PolygonTattva extends ShapeTattva {
  private sides: number;
  private radiusValue = 1;

  constructor(sides: number) {
    super();
    this.sides = Math.max(3, Math.floor(sides));
    this.defaultFill(themeColor("warning"));
    this.radius(1);
  }

  radius(value: number): this {
    this.radiusValue = value;
    this.worldSize = { width: value * 2, height: value * 2 };
    return this;
  }

  protected override shapePath(width: number, height: number): string {
    const points = Array.from({ length: this.sides }, (_, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / this.sides;
      const x = width / 2 + Math.cos(angle) * this.radiusValue;
      const y = height / 2 + Math.sin(angle) * this.radiusValue;
      return `${x} ${y}`;
    });
    return `M ${points.join(" L ")} Z`;
  }

  override morphContour(samples: number): readonly Vec2[] {
    const points = Array.from({ length: this.sides }, (_, index): Vec2 => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / this.sides;
      return [Math.cos(angle) * this.radiusValue, Math.sin(angle) * this.radiusValue];
    });
    return resampleClosedContour(points, samples);
  }
}

export interface VectorShapeOptions {
  /** SVG viewBox coordinates occupied by the path. */
  readonly viewBox?: Readonly<{ x: number; y: number; width: number; height: number }>;
}

/** A filled SVG path that can participate in ShapeMorph, including compound paths and holes. */
export class VectorShapeTattva extends ShapeTattva {
  private vectorPath: string;
  private vectorViewBox: { x: number; y: number; width: number; height: number };

  constructor(path: string, options: VectorShapeOptions = {}) {
    super();
    this.vectorPath = path;
    this.vectorViewBox = { ...(options.viewBox ?? { x: -1, y: -1, width: 2, height: 2 }) };
    this.defaultFill(themeColor("accent"));
    this.syncVectorBounds();
    this.validatePath();
  }

  path(value: string): this {
    this.vectorPath = value;
    this.validatePath();
    return this;
  }

  viewBox(value: Readonly<{ x: number; y: number; width: number; height: number }>): this {
    this.vectorViewBox = { ...value };
    this.syncVectorBounds();
    return this;
  }

  override morphContours(_samples: number): readonly CubicContour[] {
    const { x, y, width, height } = this.vectorViewBox;
    return mapCubicContours(parseSvgCubicPath(this.vectorPath), (point) => [
      point[0] - x - width / 2,
      point[1] - y - height / 2,
    ]);
  }

  override contentHTML(): string {
    const { x, y, width, height } = this.vectorViewBox;
    return `<svg width="100%" height="100%" viewBox="${x} ${y} ${width} ${height}" overflow="visible" xmlns="http://www.w3.org/2000/svg"><path data-murali-path data-murali-vector-shape data-murali-reveal-fill d="${escapeAttribute(this.vectorPath)}" fill="${escapeAttribute(this.shapeFill)}" fill-rule="evenodd" stroke="${escapeAttribute(this.shapeStroke)}" stroke-width="${this.shapeStrokeWidth}" stroke-linejoin="round" stroke-linecap="round" /></svg>`;
  }

  private validatePath(): void {
    const contours = parseSvgCubicPath(this.vectorPath);
    if (contours.length === 0 || contours.some((contour) => !contour.closed)) {
      throw new Error("VectorShape requires one or more closed SVG path contours.");
    }
  }

  private syncVectorBounds(): void {
    const { width, height } = this.vectorViewBox;
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      throw new Error(`VectorShape viewBox width and height must be positive finite numbers; received ${width}, ${height}.`);
    }
    this.worldSize = { width, height };
  }
}

export interface ShapeMorphState extends TattvaState {
  morphProgress: number;
}

export class ShapeMorphTattva extends Tattva<ShapeMorphState> {
  private sampleCount = 96;
  private snapshots: ShapeMorphSnapshot[] = [];
  private transitions: CubicContourPair[][] = [];

  constructor(readonly keyframes: readonly ShapeTattva[]) {
    super({ state: { morphProgress: 0 } });
    if (keyframes.length < 2) throw new Error("ShapeMorph requires at least two shape keyframes.");
    this.dynamicGeometry = true;
    this.morphStageCount = keyframes.length;
    this.syncGeometry();
  }

  samples(value: number): this {
    if (!Number.isInteger(value) || value < 12) {
      throw new Error(`ShapeMorph samples must be an integer of at least 12; received ${value}.`);
    }
    this.sampleCount = value;
    return this.syncGeometry();
  }

  stage(value: number): this {
    this.validateStage(value);
    return this.setInitial({ morphProgress: value });
  }

  override contentHTML(_time = 0, state: Readonly<ShapeMorphState> = this.initialState): string {
    const maximum = this.snapshots.length - 1;
    const progress = Math.max(0, Math.min(maximum, state.morphProgress));
    const leftIndex = Math.min(Math.floor(progress), maximum - 1);
    const localProgress = progress >= maximum ? 1 : clamp01(progress - leftIndex);
    const left = this.snapshots[leftIndex]!;
    const right = this.snapshots[leftIndex + 1]!;
    const contours = interpolateCubicContours(this.transitions[leftIndex]!, localProgress);
    const fill = interpolateValue(left.fill, right.fill, localProgress);
    const stroke = interpolateValue(left.stroke, right.stroke, localProgress);
    const strokeWidth = left.strokeWidth + (right.strokeWidth - left.strokeWidth) * localProgress;
    const width = this.worldSize?.width ?? 1;
    const height = this.worldSize?.height ?? 1;
    const path = cubicContoursPath(contours);
    return `<svg width="100%" height="100%" viewBox="${-width / 2} ${-height / 2} ${width} ${height}" overflow="visible" xmlns="http://www.w3.org/2000/svg"><path data-murali-morph-path d="${path}" fill="${escapeAttribute(fill)}" fill-rule="evenodd" stroke="${escapeAttribute(stroke)}" stroke-width="${strokeWidth}" stroke-linejoin="round" stroke-linecap="round" /></svg>`;
  }

  protected override onThemeResolved(theme: Theme): void {
    this.keyframes.forEach((keyframe) => keyframe.resolveTheme(theme));
    this.syncGeometry();
  }

  private syncGeometry(): this {
    this.snapshots = this.keyframes.map((keyframe) => keyframe.morphSnapshot(this.sampleCount));
    this.transitions = this.snapshots.slice(0, -1).map((snapshot, index) =>
      normalizeCubicContours(snapshot.contours, this.snapshots[index + 1]!.contours, this.sampleCount)
    );
    this.worldSize = {
      width: Math.max(...this.keyframes.map((keyframe) => keyframe.worldSize?.width ?? 0)),
      height: Math.max(...this.keyframes.map((keyframe) => keyframe.worldSize?.height ?? 0)),
    };
    this.worldStrokeWidth = Math.max(...this.snapshots.map((snapshot) => snapshot.strokeWidth));
    return this;
  }

  private validateStage(value: number): void {
    if (!Number.isInteger(value) || value < 0 || value >= this.keyframes.length) {
      throw new Error(`ShapeMorph stage must be an integer from 0 to ${this.keyframes.length - 1}; received ${value}.`);
    }
  }
}

export interface LabelState extends TattvaState {
  text: string;
}

export class LabelTattva extends Tattva<LabelState> {
  private labelColor: ColorInput = themeColor("textPrimary");

  constructor(content: string) {
    super({
      text: content,
      state: { text: content },
      css: {
        whiteSpace: "pre",
        textAlign: "center",
        lineHeight: "1",
      },
    });
    this.revealKind = "text";
    this.worldSize = { width: 0, height: 0.7 };
    this.height(0.7);
    this.onThemeResolved(this.resolvedTheme);
  }

  height(value: number): this {
    const lines = (this.text ?? "").split("\n");
    const longest = Math.max(1, ...lines.map((line) => line.length));
    this.worldFontSize = value;
    this.worldSize = {
      width: Math.max(value * 0.6, longest * value * 0.58),
      height: value * lines.length,
    };
    return this;
  }

  color(value: ColorInput): this {
    this.labelColor = value;
    const resolved = resolveColorInput(value, this.resolvedTheme);
    this.setInitial({ color: resolved });
    return this.setComputedStyle({ color: resolved });
  }

  /** Select a registered font asset or any browser CSS font-family value. */
  font(value: FontFaceAsset | string, ...fallbacks: readonly string[]): this {
    return this.css({ fontFamily: fontFamily(value, ...fallbacks) });
  }

  fontWeight(value: string | number): this {
    return this.css({ fontWeight: String(value) });
  }

  /** Reserve stable layout space for sampled text that may be wider than the initial content. */
  reserveText(sample: string): this {
    const height = this.worldFontSize ?? 0.7;
    const lines = sample.split("\n");
    const longest = Math.max(1, ...lines.map((line) => line.length));
    this.worldSize = {
      width: Math.max(this.worldSize?.width ?? 0, longest * height * 0.58),
      height: Math.max(this.worldSize?.height ?? 0, height * lines.length),
    };
    return this;
  }

  protected override onThemeResolved(theme: Theme): void {
    const color = this.hasExplicitStyle("color") && typeof this.initialStyle.color === "string"
      ? this.initialStyle.color
      : resolveColorInput(this.labelColor, theme);
    this.setInitial({ color });
    this.setComputedStyle({ color });
    if (!this.hasExplicitStyle("fontFamily")) {
      this.setComputedStyle({ fontFamily: theme.typography.headingFamily });
    }
    if (!this.hasExplicitStyle("fontWeight")) {
      this.setComputedStyle({ fontWeight: String(theme.typography.headingWeight) });
    }
    if (!this.hasExplicitStyle("letterSpacing")) {
      this.setComputedStyle({ letterSpacing: theme.typography.headingTracking });
    }
  }

  /** Grow from a stable left edge. Centered reveal is the default. */
  typewriter(enabled = true): this {
    this.textReveal = enabled ? "typewriter" : "centered";
    return this;
  }
}

export function Circle(): CircleTattva {
  return new CircleTattva();
}

export function Rectangle(): RectangleTattva {
  return new RectangleTattva();
}

export function Square(): SquareTattva {
  return new SquareTattva();
}

export function Ellipse(): EllipseTattva {
  return new EllipseTattva();
}

export const Polygon = {
  regular(sides: number): PolygonTattva {
    return new PolygonTattva(sides);
  },
};

export function VectorShape(path: string, options: VectorShapeOptions = {}): VectorShapeTattva {
  return new VectorShapeTattva(path, options);
}

/** Morph between two or more closed shape keyframes using normalized cubic Bezier contours. */
export function ShapeMorph(...keyframes: readonly ShapeTattva[]): ShapeMorphTattva {
  return new ShapeMorphTattva(keyframes);
}

export function Label(content: string): LabelTattva {
  return new LabelTattva(content);
}

function sampleEllipse(radiusX: number, radiusY: number, samples: number): Vec2[] {
  return Array.from({ length: samples }, (_, index): Vec2 => {
    const angle = index / samples * Math.PI * 2;
    return [Math.cos(angle) * radiusX, Math.sin(angle) * radiusY];
  });
}

function roundedRectangleContour(width: number, height: number, requestedRadius: number): Vec2[] {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const radius = Math.min(Math.max(0, requestedRadius), halfWidth, halfHeight);
  if (radius <= 0) {
    return [
      [halfWidth, 0], [halfWidth, halfHeight], [0, halfHeight], [-halfWidth, halfHeight],
      [-halfWidth, 0], [-halfWidth, -halfHeight], [0, -halfHeight], [halfWidth, -halfHeight],
    ];
  }
  const corners: readonly [Vec2, number, number][] = [
    [[halfWidth - radius, halfHeight - radius], 0, Math.PI / 2],
    [[-halfWidth + radius, halfHeight - radius], Math.PI / 2, Math.PI],
    [[-halfWidth + radius, -halfHeight + radius], Math.PI, Math.PI * 1.5],
    [[halfWidth - radius, -halfHeight + radius], Math.PI * 1.5, Math.PI * 2],
  ];
  const result: Vec2[] = [[halfWidth, 0], [halfWidth, halfHeight - radius]];
  for (const [[centerX, centerY], start, end] of corners) {
    for (let step = 1; step <= 8; step += 1) {
      const angle = start + (end - start) * step / 8;
      result.push([centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius]);
    }
  }
  return result;
}

export function resampleClosedContour(points: readonly Vec2[], samples: number): Vec2[] {
  if (!Number.isInteger(samples) || samples < 3) {
    throw new Error(`Closed contour samples must be an integer of at least 3; received ${samples}.`);
  }
  if (points.length < 3) throw new Error("A closed contour requires at least three points.");
  const lengths = points.map((point, index) => {
    const next = points[(index + 1) % points.length]!;
    return Math.hypot(next[0] - point[0], next[1] - point[1]);
  });
  const perimeter = lengths.reduce((sum, length) => sum + length, 0);
  if (perimeter <= 1e-9) throw new Error("A closed contour must have a non-zero perimeter.");
  const result: Vec2[] = [];
  let edge = 0;
  let edgeStart = 0;
  for (let sample = 0; sample < samples; sample += 1) {
    const distance = perimeter * sample / samples;
    while (edge < lengths.length - 1 && distance > edgeStart + lengths[edge]!) {
      edgeStart += lengths[edge]!;
      edge += 1;
    }
    const start = points[edge]!;
    const end = points[(edge + 1) % points.length]!;
    const progress = lengths[edge]! <= 1e-9 ? 0 : (distance - edgeStart) / lengths[edge]!;
    result.push([
      start[0] + (end[0] - start[0]) * progress,
      start[1] + (end[1] - start[1]) * progress,
    ]);
  }
  return result;
}

export function alignClosedContours(source: readonly Vec2[], target: readonly Vec2[]): Vec2[] {
  if (source.length !== target.length || source.length === 0) {
    throw new Error("ShapeMorph contours must contain the same non-zero number of points.");
  }
  const forward = bestCyclicAlignment(source, target);
  const reversed = bestCyclicAlignment([...source].reverse(), target);
  return reversed.score < forward.score ? reversed.points : forward.points;
}

function bestCyclicAlignment(source: readonly Vec2[], target: readonly Vec2[]): { points: Vec2[]; score: number } {
  let bestShift = 0;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let shift = 0; shift < source.length; shift += 1) {
    let score = 0;
    for (let index = 0; index < source.length; index += 1) {
      const left = source[(index + shift) % source.length]!;
      const right = target[index]!;
      const dx = left[0] - right[0];
      const dy = left[1] - right[1];
      score += dx * dx + dy * dy;
    }
    if (score < bestScore) {
      bestScore = score;
      bestShift = shift;
    }
  }
  return {
    points: Array.from({ length: source.length }, (_, index) => source[(index + bestShift) % source.length]!),
    score: bestScore,
  };
}

function positive(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive finite number; received ${value}.`);
  }
  return value;
}

function format(value: number): string {
  return Number(value.toFixed(5)).toString();
}

function escapeAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
