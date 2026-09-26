import { resolveColor } from "../core/palette.ts";
import { Group, type GroupTattva } from "../core/Group.ts";
import type { Vec2 } from "../core/Tattva.ts";
import { sampleRange } from "./graph.ts";
import { Arrow, Line, worldPath } from "./paths.ts";
import { Label, Rectangle } from "./shapes.ts";

export type VectorAnchor = "tip" | "midpoint" | "side";
export type ReadoutMode = "tuple" | "row" | "column" | "features";

const HIGHLIGHT = "#f2d157";

/** An arrow from the origin to `tip`, with a name and optional coordinates. */
export function LabeledVector(name: string, tip: Vec2): LabeledVectorBuilder {
  return new LabeledVectorBuilder(name, [0, 0], tip);
}

export function CoordinateReadout(values: readonly number[]): CoordinateReadoutBuilder {
  return new CoordinateReadoutBuilder(values);
}

/** The original vector and its scalar multiple, drawn from the same local origin. */
export function ScalarMultiplication(vector: Vec2, scalar: number): ScalarMultiplicationBuilder {
  return new ScalarMultiplicationBuilder(vector, scalar);
}

export class LabeledVectorBuilder {
  private arrowColor = "#57c7f2";
  private nameColor = "#ffffff";
  private anchor: VectorAnchor = "tip";
  private offset: Vec2 = [0.16, 0.16];
  private showCoordinates = false;
  private shaftWidth = 0.045;
  private textHeight = 0.22;

  constructor(
    private readonly name: string,
    private readonly start: Vec2,
    private readonly tip: Vec2,
  ) {}

  color(value: string): this {
    this.arrowColor = resolveColor(value);
    return this;
  }

  labelColor(value: string): this {
    this.nameColor = resolveColor(value);
    return this;
  }

  anchorAt(anchor: VectorAnchor): this {
    this.anchor = anchor;
    return this;
  }

  coordinates(show = true): this {
    this.showCoordinates = show;
    return this;
  }

  labelOffset(value: Vec2): this {
    this.offset = value;
    return this;
  }

  thickness(value: number): this {
    this.shaftWidth = value;
    return this;
  }

  build(): GroupTattva {
    const arrow = Arrow().from(this.start).to(this.tip).stroke({
      color: this.arrowColor,
      width: this.shaftWidth,
    });
    const label = Label(this.caption()).height(this.textHeight).color(this.nameColor);
    label.at([...this.labelPosition(), 0]);
    return Group([arrow, label]);
  }

  private caption(): string {
    if (!this.showCoordinates) return this.name;
    const dx = this.tip[0] - this.start[0];
    const dy = this.tip[1] - this.start[1];
    return `${this.name} (${formatValue(dx)}, ${formatValue(dy)})`;
  }

  private labelPosition(): Vec2 {
    const [x0, y0] = this.start;
    const [x1, y1] = this.tip;
    const mid: Vec2 = [(x0 + x1) / 2, (y0 + y1) / 2];
    let base = mid;
    if (this.anchor === "tip") base = this.tip;
    if (this.anchor === "side") {
      const length = Math.hypot(x1 - x0, y1 - y0) || 1;
      const perp: Vec2 = [-(y1 - y0) / length, (x1 - x0) / length];
      base = [mid[0] + perp[0] * 0.22, mid[1] + perp[1] * 0.22];
    }
    return [base[0] + this.offset[0], base[1] + this.offset[1]];
  }
}

export class CoordinateReadoutBuilder {
  private labels: string[] = [];
  private readoutMode: ReadoutMode = "tuple";
  private highlights: number[] = [];
  private textHeight = 0.24;
  private ink = "#ffffff";

  constructor(private readonly values: readonly number[]) {}

  mode(mode: ReadoutMode): this {
    this.readoutMode = mode;
    return this;
  }

  names(labels: readonly string[]): this {
    this.labels = [...labels];
    return this;
  }

  highlight(indices: readonly number[]): this {
    this.highlights = [...indices];
    return this;
  }

  build(): GroupTattva {
    const lines = readoutLines(this.values, this.readoutMode, this.labels);
    const gap = this.textHeight * 1.35;
    const top = (lines.length - 1) * gap / 2;
    const labels = lines.map((line, index) => Label(line)
      .height(this.textHeight)
      .color(this.highlights.includes(index) ? HIGHLIGHT : this.ink)
      .at([0, top - index * gap, 0]));
    return Group(labels);
  }
}

export class ScalarMultiplicationBuilder {
  private baseName = "v";
  private scaledName = "cv";

  constructor(
    private readonly vector: Vec2,
    private readonly scalar: number,
  ) {}

  labels(base: string, scaled: string): this {
    this.baseName = base;
    this.scaledName = scaled;
    return this;
  }

  build(): GroupTattva {
    const scaled: Vec2 = [this.vector[0] * this.scalar, this.vector[1] * this.scalar];
    const base = new LabeledVectorBuilder(this.baseName, [0, 0], this.vector)
      .color("rgba(199, 209, 224, 0.5)")
      .anchorAt("side")
      .build();
    const grown = new LabeledVectorBuilder(this.scaledName, [0, 0], scaled)
      .color("rgb(87, 199, 242)")
      .anchorAt("tip")
      .coordinates(true)
      .build();
    return Group([...base.children, ...grown.children]);
  }
}

const BASIS_U = "#57c7f2";
const BASIS_V = "rgb(250, 189, 71)";
const RESULT = "rgb(112, 219, 133)";
const GUIDE = "rgba(199, 209, 224, 0.45)";

/** The two directions that generate a span. */
export function BasisVectors(u: Vec2, v: Vec2): BasisVectorsBuilder {
  return new BasisVectorsBuilder(u, v);
}

/** Faint lines filling the plane reached by scaling `u` and `v`. */
export function SpanRegion(u: Vec2, v?: Vec2): SpanRegionBuilder {
  return new SpanRegionBuilder(u, v);
}

/** `cu` and `dv` placed head to tail, plus their sum. */
export function LinearCombination(u: Vec2, v: Vec2, uScale: number, vScale: number): LinearCombinationBuilder {
  return new LinearCombinationBuilder(u, v, uScale, vScale);
}

/** Parallelogram addition of two vectors. */
export function VectorAddition(a: Vec2, b: Vec2): VectorAdditionBuilder {
  return new VectorAdditionBuilder(a, b);
}

export class BasisVectorsBuilder {
  private uLabel = "i";
  private vLabel = "j";
  private uOffset: Vec2 = [0.16, 0.16];
  private vOffset: Vec2 = [0.16, 0.16];
  private showCoordinates = false;

  constructor(
    private readonly u: Vec2,
    private readonly v: Vec2,
  ) {}

  labels(u: string, v: string): this {
    this.uLabel = u;
    this.vLabel = v;
    return this;
  }

  coordinates(show = true): this {
    this.showCoordinates = show;
    return this;
  }

  offsets(u: Vec2, v: Vec2): this {
    this.uOffset = u;
    this.vOffset = v;
    return this;
  }

  build(): GroupTattva {
    return flatten(
      new LabeledVectorBuilder(this.uLabel, [0, 0], this.u).color(BASIS_U).labelOffset(this.uOffset).coordinates(this.showCoordinates).build(),
      new LabeledVectorBuilder(this.vLabel, [0, 0], this.v).color(BASIS_V).labelOffset(this.vOffset).coordinates(this.showCoordinates).build(),
    );
  }
}

/** Lines of constant basis coordinate. `u = 0` and `v = 0` are the heavier axes. */
export function BasisGrid(u: Vec2, v: Vec2): BasisGridBuilder {
  return new BasisGridBuilder(u, v);
}

export function basisCoordinates(u: Vec2, v: Vec2, vector: Vec2): Vec2 {
  const determinant = u[0] * v[1] - u[1] * v[0];
  if (Math.abs(determinant) <= 1e-8) return [0, 0];
  return [
    (v[1] * vector[0] - v[0] * vector[1]) / determinant,
    (-u[1] * vector[0] + u[0] * vector[1]) / determinant,
  ];
}

export class BasisGridBuilder {
  private uRange: readonly [number, number] = [-4, 4];
  private vRange: readonly [number, number] = [-3, 3];
  private stepSize = 1;
  private lineColor = "rgba(148, 184, 250, 0.32)";
  private axisColor = "rgba(224, 230, 240, 0.68)";
  private lineThickness = 0.018;
  private axisThickness = 0.035;

  constructor(
    private readonly u: Vec2,
    private readonly v: Vec2,
  ) {}

  range(u: readonly [number, number], v: readonly [number, number]): this {
    this.uRange = u;
    this.vRange = v;
    return this;
  }

  step(size: number): this {
    this.stepSize = Math.max(0.1, Math.abs(size));
    return this;
  }

  color(value: string): this {
    this.lineColor = value;
    return this;
  }

  axisStyle(color: string, thickness: number): this {
    this.axisColor = color;
    this.axisThickness = thickness;
    return this;
  }

  thickness(value: number): this {
    this.lineThickness = value;
    return this;
  }

  build(): GroupTattva {
    const lines: ReturnType<typeof Line>[] = [];
    for (const u of sampleRange(this.uRange, this.stepSize)) {
      const axis = Math.abs(u) <= 1e-4;
      lines.push(Line()
        .from(combine(this.u, this.v, u, this.vRange[0]))
        .to(combine(this.u, this.v, u, this.vRange[1]))
        .stroke({ width: axis ? this.axisThickness : this.lineThickness, color: axis ? this.axisColor : this.lineColor }));
    }
    for (const v of sampleRange(this.vRange, this.stepSize)) {
      const axis = Math.abs(v) <= 1e-4;
      lines.push(Line()
        .from(combine(this.u, this.v, this.uRange[0], v))
        .to(combine(this.u, this.v, this.uRange[1], v))
        .stroke({ width: axis ? this.axisThickness : this.lineThickness, color: axis ? this.axisColor : this.lineColor }));
    }
    return Group(lines);
  }
}

/** A small rounded label such as `B: 2x2`. */
export function DimensionBadge(label: string, rows: number, columns: number): DimensionBadgeBuilder {
  return new DimensionBadgeBuilder(label, rows, columns);
}

export class DimensionBadgeBuilder {
  private ink = "#ffffff";

  constructor(
    private readonly label: string,
    private readonly rows: number,
    private readonly columns: number,
  ) {}

  textColor(value: string): this {
    this.ink = resolveColor(value);
    return this;
  }

  build(): GroupTattva {
    const text = `${this.label}: ${this.rows}x${this.columns}`;
    const badge = Label(text).height(0.16).color(this.ink);
    const width = Math.max(0.82, badge.getLayoutSize().width + 0.36);
    const plate = Rectangle()
      .size([width, 0.42])
      .fill("rgba(26, 31, 38, 0.58)")
      .stroke({ width: 0.018, color: "rgba(184, 214, 245, 0.78)" });
    return Group([plate, badge]);
  }
}

/** A short label such as `rank: 2`. Corners are square; Murali's plate is rounded. */
export function QuantityBadge(label: string, value: string): QuantityBadgeBuilder {
  return new QuantityBadgeBuilder(label, value);
}

export class QuantityBadgeBuilder {
  private ink = "rgba(255, 255, 255, 0.94)";

  constructor(
    private readonly label: string,
    private readonly value: string,
  ) {}

  textColor(value: string): this {
    this.ink = resolveColor(value);
    return this;
  }

  build(): GroupTattva {
    const text = this.label.length === 0 ? this.value : `${this.label}: ${this.value}`;
    const badge = Label(text).height(0.16).color(this.ink);
    const width = Math.max(0.82, badge.getLayoutSize().width + 0.36);
    const plate = Rectangle()
      .size([width, 0.34])
      .fill("rgba(26, 31, 38, 0.58)")
      .stroke({ width: 0.018, color: "rgba(184, 214, 245, 0.78)" });
    return Group([plate, badge]);
  }
}

function combine(u: Vec2, v: Vec2, uCoordinate: number, vCoordinate: number): Vec2 {
  return [u[0] * uCoordinate + v[0] * vCoordinate, u[1] * uCoordinate + v[1] * vCoordinate];
}

export class SpanRegionBuilder {
  private spanExtent = 4;
  private spanStep = 1;
  private spanColor = "rgba(87, 199, 242, 0.35)";

  constructor(
    private readonly u: Vec2,
    private readonly v?: Vec2,
  ) {}

  extent(value: number): this {
    this.spanExtent = Math.max(0.1, Math.abs(value));
    return this;
  }

  step(value: number): this {
    this.spanStep = Math.max(0.1, Math.abs(value));
    return this;
  }

  color(value: string): this {
    this.spanColor = value;
    return this;
  }

  build(): GroupTattva {
    const uDirection = unit(this.u);
    const lines: ReturnType<typeof Line>[] = [];
    const vDirection = this.v ? unit(this.v) : undefined;
    const plane = vDirection !== undefined && Math.abs(this.u[0] * this.v![1] - this.u[1] * this.v![0]) > 1e-6;
    const stroke = { color: this.spanColor, width: 0.025 };
    if (!plane || !vDirection) {
      const end = scale(uDirection, this.spanExtent);
      lines.push(Line().from(scale(end, -1)).to(end).stroke(stroke));
      return Group(lines);
    }
    const count = Math.ceil(this.spanExtent / this.spanStep);
    for (let index = -count; index <= count; index += 1) {
      const alongV = scale(vDirection, index * this.spanStep);
      const alongU = scale(uDirection, index * this.spanStep);
      lines.push(Line()
        .from(add(alongV, scale(uDirection, -this.spanExtent)))
        .to(add(alongV, scale(uDirection, this.spanExtent)))
        .stroke(stroke));
      lines.push(Line()
        .from(add(alongU, scale(vDirection, -this.spanExtent)))
        .to(add(alongU, scale(vDirection, this.spanExtent)))
        .stroke(stroke));
    }
    return Group(lines);
  }
}

export class LinearCombinationBuilder {
  private uLabel = "cu";
  private vLabel = "dv";
  private resultLabel = "cu + dv";

  constructor(
    private readonly u: Vec2,
    private readonly v: Vec2,
    private readonly uScale: number,
    private readonly vScale: number,
  ) {}

  labels(u: string, v: string, result: string): this {
    this.uLabel = u;
    this.vLabel = v;
    this.resultLabel = result;
    return this;
  }

  build(): GroupTattva {
    const uComponent = scale(this.u, this.uScale);
    const result = add(uComponent, scale(this.v, this.vScale));
    return flatten(
      new LabeledVectorBuilder(this.uLabel, [0, 0], uComponent).color(BASIS_U).anchorAt("side").build(),
      new LabeledVectorBuilder(this.vLabel, uComponent, result).color(BASIS_V).anchorAt("side").build(),
      new LabeledVectorBuilder(this.resultLabel, [0, 0], result).color(RESULT).thickness(0.046).coordinates(true).build(),
    );
  }
}

export class VectorAdditionBuilder {
  private aLabel = "a";
  private bLabel = "b";
  private sumLabel = "a + b";

  constructor(
    private readonly a: Vec2,
    private readonly b: Vec2,
  ) {}

  labels(a: string, b: string, sum: string): this {
    this.aLabel = a;
    this.bLabel = b;
    this.sumLabel = sum;
    return this;
  }

  build(): GroupTattva {
    const sum = add(this.a, this.b);
    const parts = flatten(
      new LabeledVectorBuilder(this.aLabel, [0, 0], this.a).color(BASIS_U).anchorAt("side").build(),
      new LabeledVectorBuilder(this.bLabel, this.a, sum).color(BASIS_V).anchorAt("side").build(),
      new LabeledVectorBuilder(this.sumLabel, [0, 0], sum).color(RESULT).thickness(0.046).build(),
    );
    return Group([
      ...parts.children,
      Line().from(this.b).to(sum).stroke({ color: GUIDE, width: 0.022 }),
      Line().from([0, 0]).to(this.b).stroke({ color: GUIDE, width: 0.018 }),
    ]);
  }
}

/** The shadow of `vector` on `onto`, the dashed drop, and the residual. */
export function ProjectionShadow(vector: Vec2, onto: Vec2): ProjectionShadowBuilder {
  return new ProjectionShadowBuilder(vector, onto);
}

/** The shorter sweep from `from` to `to`, with an optional degree label. */
export function AngleArc(from: Vec2, to: Vec2): AngleArcBuilder {
  return new AngleArcBuilder(from, to);
}

/** The square corner that marks a right angle at `vertex`. */
export function OrthogonalityMarker(first: Vec2, second: Vec2): OrthogonalityMarkerBuilder {
  return new OrthogonalityMarkerBuilder(first, second);
}

/** A signed bar for the dot product, the cosine, or both. */
export function DotProductMeter(a: Vec2, b: Vec2): DotProductMeterBuilder {
  return new DotProductMeterBuilder(a, b);
}

export class ProjectionShadowBuilder {
  private showOriginal = true;

  constructor(
    private readonly vector: Vec2,
    private readonly onto: Vec2,
  ) {}

  original(show: boolean): this {
    this.showOriginal = show;
    return this;
  }

  projection(): Vec2 {
    return projectOnto(this.vector, this.onto);
  }

  build(): GroupTattva {
    const projected = this.projection();
    const parts: GroupTattva["children"][number][] = [];
    if (this.showOriginal) {
      parts.push(Arrow().from([0, 0]).to(this.vector).stroke({ color: "#57c7f2", width: 0.035 }));
    }
    parts.push(Arrow().from([0, 0]).to(projected).stroke({ color: "rgb(107, 209, 122)", width: 0.035 }));
    parts.push(Line().from(this.vector).to(projected).stroke({ color: "rgba(199, 209, 224, 0.55)", width: 0.019 }).dash(0.12, 0.08));
    parts.push(Arrow().from(projected).to(this.vector).stroke({ color: "rgb(242, 92, 87)", width: 0.028 }));
    return Group(parts);
  }
}

export class AngleArcBuilder {
  private arcRadius = 0.7;
  private autoUnit: "degrees" | "radians" | undefined;

  constructor(
    private readonly from: Vec2,
    private readonly to: Vec2,
  ) {}

  radius(value: number): this {
    this.arcRadius = Math.max(0, value);
    return this;
  }

  autoLabel(unit: "degrees" | "radians"): this {
    this.autoUnit = unit;
    return this;
  }

  build(): GroupTattva {
    const start = Math.atan2(this.from[1], this.from[0]);
    const sweep = signedAngle(this.from, this.to);
    const steps = 32;
    const path = worldPath();
    for (let index = 0; index <= steps; index += 1) {
      const angle = start + sweep * (index / steps);
      const point: Vec2 = [Math.cos(angle) * this.arcRadius, Math.sin(angle) * this.arcRadius];
      if (index === 0) path.moveTo(point[0], point[1]);
      else path.lineTo(point[0], point[1]);
    }
    const arc = path.stroke({ color: HIGHLIGHT, width: 0.025 });
    if (!this.autoUnit) return Group([arc]);
    const degrees = Math.abs(sweep) * 180 / Math.PI;
    const text = this.autoUnit === "degrees" ? `${degrees.toFixed(0)} deg` : `${Math.abs(sweep).toFixed(2)} rad`;
    const mid = start + sweep / 2;
    const distance = this.arcRadius + 0.18 * 1.4;
    const label = Label(text).height(0.18).color(HIGHLIGHT).at([
      Math.cos(mid) * distance,
      Math.sin(mid) * distance,
      0,
    ]);
    return Group([arc, label]);
  }
}

export class OrthogonalityMarkerBuilder {
  private corner: Vec2 = [0, 0];
  private markSize = 0.28;

  constructor(
    private readonly first: Vec2,
    private readonly second: Vec2,
  ) {}

  vertex(point: Vec2): this {
    this.corner = point;
    return this;
  }

  size(value: number): this {
    this.markSize = Math.max(0, value);
    return this;
  }

  build(): GroupTattva {
    const first = unit(this.first);
    const second = unit(this.second);
    const firstPoint = add(this.corner, scale(first, this.markSize));
    const secondPoint = add(this.corner, scale(second, this.markSize));
    const bend = add(firstPoint, scale(second, this.markSize));
    const stroke = { color: HIGHLIGHT, width: 0.025 };
    return Group([
      Line().from(firstPoint).to(bend).stroke(stroke),
      Line().from(bend).to(secondPoint).stroke(stroke),
    ]);
  }
}

export class DotProductMeterBuilder {
  private meterMode: "both" | "dot" | "cosine" = "both";

  constructor(
    private readonly a: Vec2,
    private readonly b: Vec2,
  ) {}

  mode(mode: "both" | "dot" | "cosine"): this {
    this.meterMode = mode;
    return this;
  }

  build(): GroupTattva {
    const cosine = cosineSimilarity(this.a, this.b);
    const width = 2.5;
    const height = 0.18;
    const color = cosine > 0.02 ? "rgb(107, 209, 122)" : cosine < -0.02 ? "rgb(242, 92, 87)" : "rgb(112, 125, 140)";
    const fillWidth = width * Math.abs(cosine);
    const pieces = [
      Rectangle().size([width, height]).fill("rgb(46, 54, 69)"),
      Line().from([0, -height * 0.8]).to([0, height * 0.8]).stroke({ color: "rgb(112, 125, 140)", width: 0.018 }),
      Label(meterLabel(this.a, this.b, this.meterMode)).height(0.18).color("#ffffff").at([0, height * 1.7, 0]),
    ];
    if (fillWidth > 1e-4) {
      const centerX = cosine >= 0 ? fillWidth / 2 : -fillWidth / 2;
      pieces.splice(1, 0, Rectangle().size([fillWidth, height * 0.78]).fill(color).at([centerX, 0, 0]));
    }
    return Group(pieces);
  }
}

export function projectOnto(vector: Vec2, onto: Vec2): Vec2 {
  const denominator = onto[0] * onto[0] + onto[1] * onto[1];
  if (denominator <= 1e-8) return [0, 0];
  const scaleBy = (vector[0] * onto[0] + vector[1] * onto[1]) / denominator;
  return [onto[0] * scaleBy, onto[1] * scaleBy];
}

export function signedAngle(from: Vec2, to: Vec2): number {
  return Math.atan2(from[0] * to[1] - from[1] * to[0], from[0] * to[0] + from[1] * to[1]);
}

export function cosineSimilarity(a: Vec2, b: Vec2): number {
  const denominator = Math.hypot(a[0], a[1]) * Math.hypot(b[0], b[1]);
  if (denominator <= 1e-8) return 0;
  return Math.max(-1, Math.min(1, (a[0] * b[0] + a[1] * b[1]) / denominator));
}

function meterLabel(a: Vec2, b: Vec2, mode: "both" | "dot" | "cosine"): string {
  const dot = a[0] * b[0] + a[1] * b[1];
  const cosine = cosineSimilarity(a, b);
  if (mode === "dot") return `dot = ${dot.toFixed(2)}`;
  if (mode === "cosine") return `cos = ${cosine.toFixed(2)}`;
  return `dot = ${dot.toFixed(2)}   cos = ${cosine.toFixed(2)}`;
}

function flatten(...groups: GroupTattva[]): GroupTattva {
  return Group(groups.flatMap((group) => [...group.children]));
}

function unit(vector: Vec2): Vec2 {
  const length = Math.hypot(vector[0], vector[1]);
  return length <= 1e-8 ? [0, 0] : [vector[0] / length, vector[1] / length];
}

function scale(vector: Vec2, factor: number): Vec2 {
  return [vector[0] * factor, vector[1] * factor];
}

function add(left: Vec2, right: Vec2): Vec2 {
  return [left[0] + right[0], left[1] + right[1]];
}

export function formatValue(value: number): string {
  return Math.abs(value - Math.round(value)) < 0.005 ? value.toFixed(0) : value.toFixed(2);
}

function readoutLines(values: readonly number[], mode: ReadoutMode, labels: readonly string[]): string[] {
  const formatted = values.map(formatValue);
  if (mode === "tuple") return [`(${formatted.join(", ")})`];
  if (mode === "row") return [`[ ${formatted.join("  ")} ]`];
  if (mode === "column") return formatted.map((value) => `[ ${value} ]`);
  return values.map((value, index) => `${labels[index] ?? `x${index}`}: ${formatValue(value)}`);
}

const SOURCE_GRID = "rgba(140, 148, 163, 0.22)";
const TRANSFORMED_GRID = "rgba(87, 199, 242, 0.42)";
const TRANSFORMED_AXIS = "rgba(230, 235, 245, 0.82)";
const BASIS_I = "rgb(87, 199, 242)";
const BASIS_J = "rgb(250, 189, 71)";
const BRACKET = "rgb(224, 230, 240)";
const LABEL_LIFT = 0.82;

/** Matrix entry text. Near-zero values print as `0`, unlike `formatValue`. */
export function formatMatrixEntry(value: number): string {
  if (Math.abs(value) <= 1e-5) return "0";
  if (Math.abs(value - Math.round(value)) <= 1e-4) return value.toFixed(0);
  return value.toFixed(2);
}

/** A bracketed grid of text cells. Widths use the label estimate, not font metrics. */
export function MatrixDisplay(entries: readonly (readonly string[])[]): MatrixDisplayBuilder {
  return new MatrixDisplayBuilder(entries);
}

export class MatrixDisplayBuilder {
  private cellHeightValue = 0.26;
  private ink = "#ffffff";
  private columnHighlights = new Map<number, string>();

  constructor(private readonly entries: readonly (readonly string[])[]) {}

  cellHeight(value: number): this {
    this.cellHeightValue = Math.max(0.05, value);
    return this;
  }

  color(value: string): this {
    this.ink = resolveColor(value);
    return this;
  }

  /** Color one column's text and lay a translucent plate of that color behind it. */
  highlightColumn(column: number, color: string): this {
    this.columnHighlights.set(column, resolveColor(color));
    return this;
  }

  build(): GroupTattva {
    const rows = this.entries.length;
    const columns = this.entries.reduce((count, row) => Math.max(count, row.length), 0);
    if (rows === 0 || columns === 0) return Group([]);

    const height = this.cellHeightValue;
    const horizontalGap = height * 0.9;
    const verticalGap = height * 0.45;
    const widths = Array.from({ length: columns }, () => height * 0.7);
    for (const row of this.entries) {
      row.forEach((entry, column) => {
        widths[column] = Math.max(widths[column] ?? 0, Label(entry).height(height).getLayoutSize().width);
      });
    }

    const totalWidth = widths.reduce((sum, width) => sum + width, 0) + horizontalGap * Math.max(0, columns - 1);
    const totalHeight = rows * height + verticalGap * Math.max(0, rows - 1);
    let cursor = -totalWidth / 2;
    const centers = widths.map((width) => {
      const center = cursor + width / 2;
      cursor += width + horizontalGap;
      return center;
    });

    const plates: ReturnType<typeof Rectangle>[] = [];
    const cells = this.entries.flatMap((row, rowIndex) => {
      const y = totalHeight / 2 - height / 2 - rowIndex * (height + verticalGap);
      return row.map((entry, column) => {
        const x = centers[column] ?? 0;
        const highlight = this.columnHighlights.get(column);
        if (highlight) {
          plates.push(Rectangle()
            .size([(widths[column] ?? height) + height * 0.42, height + height * 0.28])
            .fill(fadeColor(highlight, 0.18))
            .at([x, y, 0]));
        }
        return Label(entry).height(height).color(highlight ?? this.ink).at([x, y, 0]);
      });
    });

    const pad = height * 0.45;
    const arm = height * 0.28;
    const top = totalHeight / 2 + height * 0.35;
    const bottom = -totalHeight / 2 - height * 0.35;
    const brackets = [-totalWidth / 2 - pad, totalWidth / 2 + pad].flatMap((x, index) => {
      const sign = index === 0 ? 1 : -1;
      return [
        Line().from([x, bottom]).to([x, top]).stroke({ color: BRACKET, width: 0.03 }),
        Line().from([x, top]).to([x + arm * sign, top]).stroke({ color: BRACKET, width: 0.03 }),
        Line().from([x, bottom]).to([x + arm * sign, bottom]).stroke({ color: BRACKET, width: 0.03 }),
      ];
    });
    return Group([...plates, ...cells, ...brackets]);
  }
}

/** The two columns of a 2×2 matrix, highlighted as the images of the standard basis. */
export function MatrixTransformPanel(iHat: Vec2, jHat: Vec2): MatrixTransformPanelBuilder {
  return new MatrixTransformPanelBuilder(iHat, jHat);
}

export class MatrixTransformPanelBuilder {
  private cellHeightValue = 0.32;
  private showHighlights = true;

  constructor(
    private readonly iHat: Vec2,
    private readonly jHat: Vec2,
  ) {}

  cellHeight(value: number): this {
    this.cellHeightValue = Math.max(0.05, value);
    return this;
  }

  columnHighlights(show = true): this {
    this.showHighlights = show;
    return this;
  }

  entries(): string[][] {
    return [
      [formatMatrixEntry(this.iHat[0]), formatMatrixEntry(this.jHat[0])],
      [formatMatrixEntry(this.iHat[1]), formatMatrixEntry(this.jHat[1])],
    ];
  }

  build(): GroupTattva {
    const display = MatrixDisplay(this.entries()).cellHeight(this.cellHeightValue);
    if (this.showHighlights) display.highlightColumn(0, BASIS_I).highlightColumn(1, BASIS_J);
    return display.build();
  }
}

const COLUMN_RESULT = "rgb(112, 219, 133)";
const COLUMN_TARGET = "rgb(242, 92, 87)";
const COLUMN_GUIDE = "rgba(199, 209, 224, 0.38)";

/**
 * `Ax` as a sum of scaled matrix columns, with an optional target and residual.
 * The columns are `first` and `second`; `coefficients` weights them.
 */
export function ColumnCombination(
  first: Vec2,
  second: Vec2,
  coefficients: Vec2,
): ColumnCombinationBuilder {
  return new ColumnCombinationBuilder(first, second, coefficients);
}

export class ColumnCombinationBuilder {
  private firstLabel = "a1";
  private secondLabel = "a2";
  private resultLabel = "Ax";
  private targetLabel = "b";
  private targetPoint: Vec2 | null = null;
  private showColumns = true;
  private showParts = true;

  constructor(
    private readonly first: Vec2,
    private readonly second: Vec2,
    private readonly coefficients: Vec2,
  ) {}

  labels(first: string, second: string, result: string): this {
    this.firstLabel = first;
    this.secondLabel = second;
    this.resultLabel = result;
    return this;
  }

  target(point: Vec2, label: string): this {
    this.targetPoint = point;
    this.targetLabel = label;
    return this;
  }

  basisColumns(show = true): this {
    this.showColumns = show;
    return this;
  }

  components(show = true): this {
    this.showParts = show;
    return this;
  }

  columns(): [Vec2, Vec2] {
    return [[...this.first], [...this.second]];
  }

  firstComponent(): Vec2 {
    return scaleF32(this.first, this.coefficients[0]);
  }

  secondComponent(): Vec2 {
    return scaleF32(this.second, this.coefficients[1]);
  }

  result(): Vec2 {
    return addF32(this.firstComponent(), this.secondComponent());
  }

  residual(): Vec2 | null {
    if (!this.targetPoint) return null;
    const sum = this.result();
    return [f32(f32(this.targetPoint[0]) - f32(sum[0])), f32(f32(this.targetPoint[1]) - f32(sum[1]))];
  }

  build(): GroupTattva {
    const firstPart = this.firstComponent();
    const secondPart = this.secondComponent();
    const sum = this.result();
    const pieces: GroupTattva["children"][number][] = [];
    if (this.showColumns) {
      pieces.push(
        new LabeledVectorBuilder(this.firstLabel, [0, 0], this.first)
          .color(fadeColor(BASIS_I, 0.42))
          .anchorAt("side")
          .build(),
        new LabeledVectorBuilder(this.secondLabel, [0, 0], this.second)
          .color(fadeColor(BASIS_J, 0.42))
          .anchorAt("side")
          .build(),
      );
    }
    if (this.showParts) {
      pieces.push(
        new LabeledVectorBuilder(`${formatMatrixEntry(this.coefficients[0])}${this.firstLabel}`, [0, 0], firstPart)
          .color(BASIS_I)
          .anchorAt("side")
          .thickness(0.04)
          .build(),
        new LabeledVectorBuilder(`${formatMatrixEntry(this.coefficients[1])}${this.secondLabel}`, firstPart, sum)
          .color(BASIS_J)
          .anchorAt("side")
          .thickness(0.04)
          .build(),
        Line().from([0, 0]).to(secondPart).stroke({ color: COLUMN_GUIDE, width: 0.018 }),
        Line().from(secondPart).to(sum).stroke({ color: COLUMN_GUIDE, width: 0.022 }),
      );
    }
    pieces.push(new LabeledVectorBuilder(this.resultLabel, [0, 0], sum)
      .color(COLUMN_RESULT)
      .anchorAt("tip")
      .coordinates(true)
      .build());
    if (this.targetPoint) {
      pieces.push(
        new LabeledVectorBuilder(this.targetLabel, [0, 0], this.targetPoint)
          .color(COLUMN_TARGET)
          .anchorAt("tip")
          .coordinates(true)
          .build(),
        Line().from(sum).to(this.targetPoint).stroke({ color: COLUMN_TARGET, width: 0.022 }),
      );
    }
    return Group(pieces);
  }
}

/**
 * The standard grid and its image under the matrix whose columns are `iHat` and `jHat`.
 * Basis arrows `Ae1` and `Ae2` are on unless `basisVectors(false)` is set.
 */
export function TransformableGrid(iHat: Vec2, jHat: Vec2): TransformableGridBuilder {
  return new TransformableGridBuilder(iHat, jHat);
}

export class TransformableGridBuilder {
  private xRange: readonly [number, number] = [-4, 4];
  private yRange: readonly [number, number] = [-3, 3];
  private stepSize = 1;
  private showSource = true;
  private showBasis = true;
  private transformedColor = TRANSFORMED_GRID;
  private transformedAxis = TRANSFORMED_AXIS;
  private gridThicknessValue = 0.012;
  private axisThicknessValue = 0.035;

  constructor(
    private readonly iHat: Vec2,
    private readonly jHat: Vec2,
  ) {}

  range(xRange: readonly [number, number], yRange: readonly [number, number]): this {
    this.xRange = xRange;
    this.yRange = yRange;
    return this;
  }

  step(value: number): this {
    this.stepSize = Math.max(0.1, Math.abs(value));
    return this;
  }

  sourceGrid(show = true): this {
    this.showSource = show;
    return this;
  }

  basisVectors(show = true): this {
    this.showBasis = show;
    return this;
  }

  color(value: string): this {
    this.transformedColor = resolveColor(value);
    return this;
  }

  thickness(value: number): this {
    this.gridThicknessValue = Math.max(0, value);
    return this;
  }

  axisStyle(color: string, thickness: number): this {
    this.transformedAxis = resolveColor(color);
    this.axisThicknessValue = Math.max(0, thickness);
    return this;
  }

  determinant(): number {
    return determinantOf(this.iHat, this.jHat);
  }

  transformVector(vector: Vec2): Vec2 {
    return this.image(vector[0], vector[1], false);
  }

  build(): GroupTattva {
    const lines = [
      ...(this.showSource ? this.lines(true) : []),
      ...this.lines(false),
    ];
    const basis = this.showBasis
      ? [
          LabeledVector("Ae1", this.iHat).color(BASIS_I).anchorAt("tip").build(),
          LabeledVector("Ae2", this.jHat).color(BASIS_J).anchorAt("tip").build(),
        ]
      : [];
    return Group([...lines, ...basis]);
  }

  private image(x: number, y: number, identity: boolean): Vec2 {
    if (identity) return [x, y];
    return [
      f32(f32(f32(this.iHat[0]) * f32(x)) + f32(f32(this.jHat[0]) * f32(y))),
      f32(f32(f32(this.iHat[1]) * f32(x)) + f32(f32(this.jHat[1]) * f32(y))),
    ];
  }

  private lines(identity: boolean): ReturnType<typeof Line>[] {
    const grid = identity ? SOURCE_GRID : this.transformedColor;
    const axis = identity ? SOURCE_GRID : this.transformedAxis;
    const vertical = sampleRange(this.xRange, this.stepSize).map((x) => {
      const onAxis = Math.abs(x) <= 1e-5;
      return Line()
        .from(this.image(x, this.yRange[0], identity))
        .to(this.image(x, this.yRange[1], identity))
        .stroke({ width: onAxis ? this.axisThicknessValue : this.gridThicknessValue, color: onAxis ? axis : grid });
    });
    const horizontal = sampleRange(this.yRange, this.stepSize).map((y) => {
      const onAxis = Math.abs(y) <= 1e-5;
      return Line()
        .from(this.image(this.xRange[0], y, identity))
        .to(this.image(this.xRange[1], y, identity))
        .stroke({ width: onAxis ? this.axisThicknessValue : this.gridThicknessValue, color: onAxis ? axis : grid });
    });
    return [...vertical, ...horizontal];
  }
}

const AREA_FILL = "rgba(112, 219, 133, 0.28)";
const AREA_STROKE = "rgba(112, 219, 133, 0.92)";
const AREA_COLLAPSED = "rgba(242, 92, 87, 0.92)";

/** The image of the unit square under the matrix with columns `iHat` and `jHat`. */
export function DeterminantArea(iHat: Vec2, jHat: Vec2): DeterminantAreaBuilder {
  return new DeterminantAreaBuilder(iHat, jHat);
}

export class DeterminantAreaBuilder {
  private showVectors = true;
  private showCaption = true;

  constructor(
    private readonly iHat: Vec2,
    private readonly jHat: Vec2,
  ) {}

  basisVectors(show = true): this {
    this.showVectors = show;
    return this;
  }

  caption(show = true): this {
    this.showCaption = show;
    return this;
  }

  determinant(): number {
    return determinantOf(this.iHat, this.jHat);
  }

  areaScale(): number {
    return Math.abs(this.determinant());
  }

  orientation(): number {
    return Math.sign(this.determinant());
  }

  collapsed(): boolean {
    return this.areaScale() <= 1e-5;
  }

  labelText(): string {
    const det = this.determinant();
    if (this.collapsed()) return "det(A) = 0, area collapses";
    if (det < 0) return `det(A) = ${formatMatrixEntry(det)}, area flips`;
    return `det(A) = ${formatMatrixEntry(det)}, area scales by ${formatMatrixEntry(Math.abs(det))}`;
  }

  /** Origin, image of `(1, 0)`, image of `(1, 1)`, image of `(0, 1)`. */
  square(): [Vec2, Vec2, Vec2, Vec2] {
    const sum = addF32(this.iHat, this.jHat);
    return [[0, 0], [...this.iHat], sum, [...this.jHat]];
  }

  build(): GroupTattva {
    const [origin, iImage, sum, jImage] = this.square();
    const pieces: GroupTattva["children"][number][] = [];
    if (this.collapsed()) {
      pieces.push(Line().from(origin).to(sum).stroke({ color: AREA_COLLAPSED, width: 0.056 }));
    } else {
      pieces.push(worldPath()
        .moveTo(origin[0], origin[1])
        .lineTo(iImage[0], iImage[1])
        .lineTo(sum[0], sum[1])
        .lineTo(jImage[0], jImage[1])
        .close()
        .stroke({ color: AREA_STROKE, width: 0.035, fill: AREA_FILL }));
    }
    if (this.showVectors) {
      pieces.push(
        LabeledVector("Ae1", this.iHat).color(BASIS_I).anchorAt("tip").build(),
        LabeledVector("Ae2", this.jHat).color(BASIS_J).anchorAt("tip").build(),
      );
    }
    if (this.showCaption) {
      const xs = [origin[0], iImage[0], sum[0], jImage[0]];
      const ys = [origin[1], iImage[1], sum[1], jImage[1]];
      pieces.push(Label(this.labelText()).height(0.2).color("#ffffff").at([
        (Math.min(...xs) + Math.max(...xs)) / 2,
        Math.max(...ys) + 0.8,
        0,
      ]));
    }
    return Group(pieces);
  }
}

/** Columns of `later * earlier`: apply `earlier`, then `later`. */
export function composeColumns(
  later: readonly [Vec2, Vec2],
  earlier: readonly [Vec2, Vec2],
): [Vec2, Vec2] {
  const apply = (vector: Vec2): Vec2 => [
    f32(f32(f32(later[0][0]) * f32(vector[0])) + f32(f32(later[1][0]) * f32(vector[1]))),
    f32(f32(f32(later[0][1]) * f32(vector[0])) + f32(f32(later[1][1]) * f32(vector[1]))),
  ];
  return [apply(earlier[0]), apply(earlier[1])];
}

/**
 * One matrix, the vector it multiplies, the product, and an optional row-by-row expansion.
 * The product is a 32-bit dot product, so the printed entries match Murali.
 */
export function MatrixVectorFlow(
  rows: readonly (readonly number[])[],
  input: readonly number[],
): MatrixVectorFlowBuilder {
  return new MatrixVectorFlowBuilder(rows, input);
}

export class MatrixVectorFlowBuilder {
  private readonly rows: number[][];
  private readonly input: number[];
  private matrixLabel = "A";
  private inputLabel = "x";
  private outputLabel = "Ax";
  private textHeightValue = 0.22;
  private cellHeightValue = 0.26;
  private showExpansion = true;
  private ink = "#ffffff";
  private matrixPosition: Vec2 = [-1.95, 0.2];
  private inputPosition: Vec2 = [-0.65, 0.2];
  private equalsPosition: Vec2 = [0.35, 0.2];
  private outputPosition: Vec2 = [1.3, 0.2];
  private expansionPosition: Vec2 = [-0.2, -0.78];

  constructor(rows: readonly (readonly number[])[], input: readonly number[]) {
    requireMatrixShape(rows, input);
    this.rows = rows.map((row) => [...row]);
    this.input = [...input];
  }

  labels(matrix: string, input: string, output: string): this {
    this.matrixLabel = matrix;
    this.inputLabel = input;
    this.outputLabel = output;
    return this;
  }

  positions(matrix: Vec2, input: Vec2, equals: Vec2, output: Vec2): this {
    this.matrixPosition = matrix;
    this.inputPosition = input;
    this.equalsPosition = equals;
    this.outputPosition = output;
    return this;
  }

  expansionAt(position: Vec2): this {
    this.expansionPosition = position;
    return this;
  }

  textHeight(value: number): this {
    this.textHeightValue = Math.max(0.01, value);
    return this;
  }

  cellHeight(value: number): this {
    this.cellHeightValue = Math.max(0.05, value);
    return this;
  }

  rowExpansion(show = true): this {
    this.showExpansion = show;
    return this;
  }

  color(value: string): this {
    this.ink = resolveColor(value);
    return this;
  }

  resultValues(): number[] {
    return this.rows.map((row) => f32Dot(row, this.input));
  }

  build(): GroupTattva {
    const matrix = MatrixDisplay(this.rows.map((row) => row.map(formatMatrixEntry)))
      .cellHeight(this.cellHeightValue)
      .color(this.ink)
      .build()
      .at([...this.matrixPosition, 0]);
    const input = MatrixDisplay(this.input.map((value) => [formatMatrixEntry(value)]))
      .cellHeight(this.cellHeightValue)
      .color(this.ink)
      .build()
      .at([...this.inputPosition, 0]);
    const output = MatrixDisplay(this.resultValues().map((value) => [formatMatrixEntry(value)]))
      .cellHeight(this.cellHeightValue)
      .color(this.ink)
      .build()
      .at([...this.outputPosition, 0]);
    const pieces: GroupTattva["children"][number][] = [
      matrix,
      input,
      output,
      Label("=").height(this.textHeightValue * 1.25).color(this.ink).at([...this.equalsPosition, 0]),
      Label(this.matrixLabel).height(this.textHeightValue).color(this.ink).at([this.matrixPosition[0], this.matrixPosition[1] + LABEL_LIFT, 0]),
      Label(this.inputLabel).height(this.textHeightValue).color(this.ink).at([this.inputPosition[0], this.inputPosition[1] + LABEL_LIFT, 0]),
      Label(this.outputLabel).height(this.textHeightValue).color(this.ink).at([this.outputPosition[0], this.outputPosition[1] + LABEL_LIFT, 0]),
    ];
    if (this.showExpansion) {
      const faded = fadeColor(this.ink, 0.72);
      this.expansionLines().forEach((line, index) => {
        pieces.push(Label(line)
          .height(this.textHeightValue * 0.82)
          .color(faded)
          .at([this.expansionPosition[0], this.expansionPosition[1] - index * this.textHeightValue * 1.45, 0]));
      });
    }
    return Group(pieces);
  }

  private expansionLines(): string[] {
    const results = this.resultValues();
    return this.rows.map((row, index) => {
      const terms = row
        .map((entry, column) => `${formatMatrixEntry(entry)}*${formatMatrixEntry(this.input[column] ?? 0)}`)
        .join(" + ");
      return `${terms} = ${formatMatrixEntry(results[index] ?? 0)}`;
    });
  }
}

function requireMatrixShape(rows: readonly (readonly number[])[], input: readonly number[]): void {
  if (rows.length === 0) throw new Error("matrix must have at least one row");
  const columns = rows[0]?.length ?? 0;
  if (columns === 0) throw new Error("matrix must have at least one column");
  if (rows.some((row) => row.length !== columns)) {
    throw new Error("matrix rows must all have the same length");
  }
  if (input.length !== columns) {
    throw new Error(`input length ${input.length} does not match matrix column count ${columns}`);
  }
}

/** Left-to-right dot product in 32-bit floats. Murali stores these entries as `f32`. */
function f32Dot(row: readonly number[], input: readonly number[]): number {
  let sum = 0;
  for (let index = 0; index < row.length; index += 1) {
    sum = f32(sum + f32(f32(row[index] ?? 0) * f32(input[index] ?? 0)));
  }
  return sum;
}

function f32(value: number): number {
  return Math.fround(value);
}

function determinantOf(iHat: Vec2, jHat: Vec2): number {
  return f32(f32(f32(iHat[0]) * f32(jHat[1])) - f32(f32(iHat[1]) * f32(jHat[0])));
}

function scaleF32(vector: Vec2, factor: number): Vec2 {
  return [f32(f32(vector[0]) * f32(factor)), f32(f32(vector[1]) * f32(factor))];
}

function addF32(left: Vec2, right: Vec2): Vec2 {
  return [f32(f32(left[0]) + f32(right[0])), f32(f32(left[1]) + f32(right[1]))];
}

function fadeColor(color: string, alpha: number): string {
  const hex = /^#([0-9a-f]{6})$/i.exec(color);
  const value = hex?.[1];
  if (value) {
    return `rgba(${parseInt(value.slice(0, 2), 16)}, ${parseInt(value.slice(2, 4), 16)}, ${parseInt(value.slice(4, 6), 16)}, ${alpha})`;
  }
  const rgb = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/.exec(color);
  if (rgb) return `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, ${alpha})`;
  return color;
}
