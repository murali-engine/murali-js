import { Tattva, type TattvaState, type Vec2 } from "../../core/Tattva.ts";

export interface BasisExplorer2DState extends TattvaState {
  ux: number;
  uy: number;
  vx: number;
  vy: number;
  uCoefficient: number;
  vCoefficient: number;
}

/** A basis grid whose basis and linear-combination coefficients are timeline state. */
export class BasisExplorer2DTattva extends Tattva<BasisExplorer2DState> {
  private fixed: Vec2 | undefined;
  private resultName = "x";

  constructor(u: Vec2, v: Vec2) {
    super({ state: {
      ux: u[0], uy: u[1], vx: v[0], vy: v[1],
      uCoefficient: 0, vCoefficient: 0,
    } });
    this.dynamicGeometry = true;
    this.revealKind = "none";
    this.worldSize = { width: 8.6, height: 5.3 };
  }

  coefficients(u: number, v: number): this {
    return this.setInitial({ uCoefficient: finite(u, "u coefficient"), vCoefficient: finite(v, "v coefficient") });
  }

  fixedVector(vector: Vec2, label = "x"): this {
    this.fixed = [...vector];
    this.resultName = label;
    return this;
  }

  basisState(u: Vec2, v: Vec2): Partial<BasisExplorer2DState> {
    return { ux: u[0], uy: u[1], vx: v[0], vy: v[1] };
  }

  coefficientState(u: number, v: number): Partial<BasisExplorer2DState> {
    return { uCoefficient: finite(u, "u coefficient"), vCoefficient: finite(v, "v coefficient") };
  }

  override contentHTML(_time = 0, state: Readonly<BasisExplorer2DState> = this.initialState): string {
    const u: Vec2 = [state.ux, state.uy];
    const v: Vec2 = [state.vx, state.vy];
    const coordinates = this.fixed ? coordinatesInBasis(u, v, this.fixed) : [state.uCoefficient, state.vCoefficient] as Vec2;
    const first = scale(u, coordinates[0]);
    const result = this.fixed ?? add(first, scale(v, coordinates[1]));
    const grid = basisGridMarkup(u, v, 4);
    const components = this.fixed ? "" : [
      arrow([0, 0], first, "#57c7f2", 0.045),
      arrow(first, result, "#fabd47", 0.045),
      line(scale(v, coordinates[1]), result, "rgba(226,235,247,.30)", 0.018, "0.09 0.07"),
    ].join("");
    const determinant = cross(u, v);
    const status = Math.abs(determinant) < 1e-5
      ? "basis collapses — coordinates are not unique"
      : this.fixed
        ? `${this.resultName} stays fixed   [${format(coordinates[0])}, ${format(coordinates[1])}] in this basis`
        : `${this.resultName} = ${format(coordinates[0])}u + ${format(coordinates[1])}v`;
    return svg(8.6, 5.3, [
      grid,
      arrow([0, 0], u, "#57c7f2", 0.052),
      arrow([0, 0], v, "#fabd47", 0.052),
      text(add(u, [0.16, 0.18]), "u", "#8bdbfa", 0.23),
      text(add(v, [0.16, 0.18]), "v", "#ffd778", 0.23),
      components,
      arrow([0, 0], result, "#70db85", 0.062),
      text(add(result, [0.18, 0.2]), this.resultName, "#b5f4c1", 0.25),
      text([-4, -2.34], status, Math.abs(determinant) < 1e-5 ? "#f45c57" : "#dce7f5", 0.19, "start"),
    ].join(""));
  }
}

export function BasisExplorer2D(u: Vec2, v: Vec2): BasisExplorer2DTattva {
  return new BasisExplorer2DTattva(u, v);
}

export interface ProjectionDiagram2DState extends TattvaState {
  ax: number;
  ay: number;
  bx: number;
  by: number;
}

/** Projection, residual, angle, and dot-product values derived from two animated vectors. */
export class ProjectionDiagram2DTattva extends Tattva<ProjectionDiagram2DState> {
  constructor(a: Vec2, b: Vec2) {
    super({ state: { ax: a[0], ay: a[1], bx: b[0], by: b[1] } });
    this.dynamicGeometry = true;
    this.revealKind = "none";
    this.worldSize = { width: 8.8, height: 5.3 };
  }

  vectorsState(a: Vec2, b: Vec2): Partial<ProjectionDiagram2DState> {
    return { ax: a[0], ay: a[1], bx: b[0], by: b[1] };
  }

  override contentHTML(_time = 0, state: Readonly<ProjectionDiagram2DState> = this.initialState): string {
    const a: Vec2 = [state.ax, state.ay];
    const b: Vec2 = [state.bx, state.by];
    const projection = project(a, b);
    const residual = subtract(a, projection);
    const dot = a[0] * b[0] + a[1] * b[1];
    const cosine = similarity(a, b);
    const angle = Math.acos(Math.max(-1, Math.min(1, cosine)));
    const arc = angleArcMarkup(b, a, 0.72);
    const meterWidth = 2.8;
    const fillWidth = meterWidth * Math.abs(cosine);
    const meterColor = cosine > 0.02 ? "#70db85" : cosine < -0.02 ? "#f45c57" : "#718095";
    const meterX = cosine >= 0 ? fillWidth / 2 : -fillWidth / 2;
    return svg(8.8, 5.3, [
      cartesianGridMarkup(4, 2.25, 1),
      line(a, projection, "rgba(220,232,247,.48)", 0.024, "0.10 0.08"),
      arrow([0, 0], projection, "#70db85", 0.05),
      arrow(projection, a, "#f45c57", 0.038),
      rightAngleMarkup(
        projection,
        dot > 1e-6 ? scale(b, -1) : b,
        residual,
        0.16,
      ),
      arrow([0, 0], a, "#57c7f2", 0.062),
      arrow([0, 0], b, "#fabd47", 0.062),
      text(add(a, [0.18, 0.18]), "a", "#9de8ff", 0.24),
      text(add(b, [0.18, -0.22]), "b", "#ffd778", 0.24),
      arc,
      text([0, -2.02], `a · b = ${format(dot)}   •   cos θ = ${format(cosine)}   •   θ = ${format(angle * 180 / Math.PI, 1)}°`, "#f5f7fb", 0.2),
      rect([-meterWidth / 2, -2.35], meterWidth, 0.16, "#2e3645"),
      fillWidth > 1e-5 ? rect([meterX - fillWidth / 2, -2.35], fillWidth, 0.12, meterColor) : "",
      line([0, -2.46], [0, -2.24], "#718095", 0.018),
    ].join(""));
  }
}

export function ProjectionDiagram2D(a: Vec2, b: Vec2): ProjectionDiagram2DTattva {
  return new ProjectionDiagram2DTattva(a, b);
}

export interface LinearMap2DState extends TattvaState {
  iX: number;
  iY: number;
  jX: number;
  jY: number;
}

/** A continuously deformable 2D linear map with optional vector and determinant overlays. */
export class LinearMap2DTattva extends Tattva<LinearMap2DState> {
  private showSource = true;
  private showBasis = true;
  private showSquare = false;
  private showMatrix = true;
  private showDecomposition = false;
  private input: Vec2 | undefined;
  private inputName = "x";

  constructor(i: Vec2 = [1, 0], j: Vec2 = [0, 1]) {
    super({ state: { iX: i[0], iY: i[1], jX: j[0], jY: j[1] } });
    this.dynamicGeometry = true;
    this.revealKind = "none";
    this.worldSize = { width: 9.2, height: 5.6 };
  }

  sourceGrid(show = true): this { this.showSource = show; return this; }
  basisVectors(show = true): this { this.showBasis = show; return this; }
  unitSquare(show = true): this { this.showSquare = show; return this; }
  matrixReadout(show = true): this { this.showMatrix = show; return this; }
  columnDecomposition(show = true): this { this.showDecomposition = show; return this; }
  vector(value: Vec2, label = "x"): this { this.input = [...value]; this.inputName = label; return this; }

  matrixState(i: Vec2, j: Vec2): Partial<LinearMap2DState> {
    return { iX: i[0], iY: i[1], jX: j[0], jY: j[1] };
  }

  override contentHTML(_time = 0, state: Readonly<LinearMap2DState> = this.initialState): string {
    const i: Vec2 = [state.iX, state.iY];
    const j: Vec2 = [state.jX, state.jY];
    const apply = (point: Vec2): Vec2 => [
      i[0] * point[0] + j[0] * point[1],
      i[1] * point[0] + j[1] * point[1],
    ];
    const determinant = cross(i, j);
    const sum = add(i, j);
    const square = this.showSquare
      ? polygon([[0, 0], i, sum, j], Math.abs(determinant) < 0.025 ? "rgba(244,92,87,.16)" : "rgba(112,219,133,.24)", Math.abs(determinant) < 0.025 ? "#f45c57" : "#70db85", 0.035)
      : "";
    const vector = this.input ? apply(this.input) : undefined;
    const firstComponent = this.input ? scale(i, this.input[0]) : undefined;
    const decomposition = this.showDecomposition && this.input && vector && firstComponent
      ? [
          arrow([0, 0], firstComponent, "rgba(87,199,242,.72)", 0.036),
          arrow(firstComponent, vector, "rgba(250,189,71,.80)", 0.036),
          text([-4.2, -2.48], `A${this.inputName} = ${format(this.input[0])}Ae₁ + ${format(this.input[1])}Ae₂`, "#dce7f5", 0.19, "start"),
        ].join("")
      : "";
    const matrix = this.showMatrix
      ? text([4.05, 2.22], `A = [ ${format(i[0])}  ${format(j[0])} ;  ${format(i[1])}  ${format(j[1])} ]`, "#dce7f5", 0.18, "end")
      : "";
    return svg(9.2, 5.6, [
      this.showSource ? cartesianGridMarkup(4.25, 2.45, 0.5, "rgba(126,142,164,.14)") : "",
      transformedGridMarkup(apply, 4.25, 2.45, 0.5),
      square,
      this.showBasis ? arrow([0, 0], i, "#57c7f2", 0.052) : "",
      this.showBasis ? arrow([0, 0], j, "#fabd47", 0.052) : "",
      this.showBasis ? text(add(i, [0.12, 0.18]), "Ae₁", "#9de8ff", 0.2) : "",
      this.showBasis ? text(add(j, [0.12, 0.18]), "Ae₂", "#ffd778", 0.2) : "",
      this.input ? arrow([0, 0], this.input, "rgba(220,231,245,.52)", 0.035) : "",
      decomposition,
      vector ? arrow([0, 0], vector, "#70db85", 0.062) : "",
      vector ? text(add(vector, [0.18, 0.2]), `A${this.inputName}`, "#b5f4c1", 0.23) : "",
      matrix,
      this.showSquare ? text([-4.2, -2.48], determinantCaption(determinant), Math.abs(determinant) < 0.025 ? "#ff918d" : "#dce7f5", 0.19, "start") : "",
    ].join(""));
  }
}

export function LinearMap2D(i: Vec2 = [1, 0], j: Vec2 = [0, 1]): LinearMap2DTattva {
  return new LinearMap2DTattva(i, j);
}

function basisGridMarkup(u: Vec2, v: Vec2, extent: number): string {
  const parts: string[] = [];
  for (let coordinate = -extent; coordinate <= extent; coordinate += 1) {
    parts.push(line(add(scale(u, coordinate), scale(v, -extent)), add(scale(u, coordinate), scale(v, extent)), coordinate === 0 ? "rgba(218,228,241,.42)" : "rgba(105,151,202,.22)", coordinate === 0 ? 0.027 : 0.014));
    parts.push(line(add(scale(v, coordinate), scale(u, -extent)), add(scale(v, coordinate), scale(u, extent)), coordinate === 0 ? "rgba(218,228,241,.42)" : "rgba(105,151,202,.22)", coordinate === 0 ? 0.027 : 0.014));
  }
  return parts.join("");
}

function transformedGridMarkup(apply: (point: Vec2) => Vec2, xExtent: number, yExtent: number, step: number): string {
  const parts: string[] = [];
  for (let x = -xExtent; x <= xExtent + 1e-8; x += step) {
    parts.push(line(apply([x, -yExtent]), apply([x, yExtent]), Math.abs(x) < 1e-6 ? "rgba(220,234,249,.72)" : "rgba(87,199,242,.32)", Math.abs(x) < 1e-6 ? 0.034 : 0.014));
  }
  for (let y = -yExtent; y <= yExtent + 1e-8; y += step) {
    parts.push(line(apply([-xExtent, y]), apply([xExtent, y]), Math.abs(y) < 1e-6 ? "rgba(220,234,249,.72)" : "rgba(87,199,242,.32)", Math.abs(y) < 1e-6 ? 0.034 : 0.014));
  }
  return parts.join("");
}

function cartesianGridMarkup(xExtent: number, yExtent: number, step: number, color = "rgba(126,142,164,.18)"): string {
  const parts: string[] = [];
  for (let x = -xExtent; x <= xExtent + 1e-8; x += step) parts.push(line([x, -yExtent], [x, yExtent], Math.abs(x) < 1e-6 ? "rgba(210,222,238,.42)" : color, Math.abs(x) < 1e-6 ? 0.028 : 0.012));
  for (let y = -yExtent; y <= yExtent + 1e-8; y += step) parts.push(line([-xExtent, y], [xExtent, y], Math.abs(y) < 1e-6 ? "rgba(210,222,238,.42)" : color, Math.abs(y) < 1e-6 ? 0.028 : 0.012));
  return parts.join("");
}

function determinantCaption(value: number): string {
  if (Math.abs(value) < 0.025) return `det(A) = ${format(value)} — area collapses`;
  if (value < 0) return `det(A) = ${format(value)} — orientation flips`;
  return `det(A) = ${format(value)} — area scales by ${format(Math.abs(value))}`;
}

function coordinatesInBasis(u: Vec2, v: Vec2, point: Vec2): Vec2 {
  const determinant = cross(u, v);
  if (Math.abs(determinant) < 1e-8) return [0, 0];
  return [(v[1] * point[0] - v[0] * point[1]) / determinant, (-u[1] * point[0] + u[0] * point[1]) / determinant];
}

function project(vector: Vec2, onto: Vec2): Vec2 {
  const denominator = onto[0] ** 2 + onto[1] ** 2;
  if (denominator < 1e-8) return [0, 0];
  return scale(onto, (vector[0] * onto[0] + vector[1] * onto[1]) / denominator);
}

function similarity(a: Vec2, b: Vec2): number {
  const denominator = Math.hypot(...a) * Math.hypot(...b);
  return denominator < 1e-8 ? 0 : (a[0] * b[0] + a[1] * b[1]) / denominator;
}

function angleArcMarkup(from: Vec2, to: Vec2, radius: number): string {
  const start = Math.atan2(from[1], from[0]);
  const sweep = Math.atan2(cross(from, to), from[0] * to[0] + from[1] * to[1]);
  const points = Array.from({ length: 33 }, (_, index) => [Math.cos(start + sweep * index / 32) * radius, Math.sin(start + sweep * index / 32) * radius] as Vec2);
  return polyline(points, "#f2d157", 0.03);
}

function rightAngleMarkup(vertex: Vec2, first: Vec2, second: Vec2, size: number): string {
  if (Math.hypot(...first) < 1e-6 || Math.hypot(...second) < 1e-6) return "";
  const a = unit(first);
  const b = unit(second);
  const p = add(vertex, scale(a, size));
  const q = add(p, scale(b, size));
  const r = add(vertex, scale(b, size));
  return polyline([vertex, p, q, r, vertex], "#f2d157", 0.027, 'data-murali-right-angle="true"');
}

function svg(width: number, height: number, body: string): string {
  return `<svg width="100%" height="100%" viewBox="${-width / 2} ${-height / 2} ${width} ${height}" overflow="hidden" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}

function line(from: Vec2, to: Vec2, color: string, width: number, dash = ""): string {
  return `<line x1="${from[0]}" y1="${-from[1]}" x2="${to[0]}" y2="${-to[1]}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`;
}

function arrow(from: Vec2, to: Vec2, color: string, width: number): string {
  const delta = subtract(to, from);
  const length = Math.hypot(...delta);
  if (length < 1e-7) return "";
  const direction = scale(delta, 1 / length);
  const normal: Vec2 = [-direction[1], direction[0]];
  const headLength = Math.min(0.22, Math.max(0.1, length * 0.14));
  const base = subtract(to, scale(direction, headLength));
  const left = add(base, scale(normal, headLength * 0.45));
  const right = subtract(base, scale(normal, headLength * 0.45));
  return `${line(from, base, color, width)}${polygon([to, left, right], color, color, 0)}`;
}

function polygon(points: readonly Vec2[], fill: string, stroke: string, width: number): string {
  return `<polygon points="${points.map((point) => `${point[0]},${-point[1]}`).join(" ")}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round"/>`;
}

function polyline(points: readonly Vec2[], color: string, width: number, attributes = ""): string {
  return `<polyline points="${points.map((point) => `${point[0]},${-point[1]}`).join(" ")}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"${attributes ? ` ${attributes}` : ""}/>`;
}

function rect(origin: Vec2, width: number, height: number, fill: string): string {
  return `<rect x="${origin[0]}" y="${-origin[1] - height / 2}" width="${width}" height="${height}" rx="${height / 2}" fill="${fill}"/>`;
}

function text(point: Vec2, value: string, color: string, height: number, anchor = "middle"): string {
  return `<text x="${point[0]}" y="${-point[1]}" fill="${color}" font-family="Satoshi, Inter, sans-serif" font-size="${height}" font-weight="650" text-anchor="${anchor}" dominant-baseline="middle">${escape(value)}</text>`;
}

function escape(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function finite(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite; received ${value}.`);
  return value;
}

function format(value: number, digits = 2): string {
  if (Math.abs(value) < 0.005) return "0";
  if (Math.abs(value - Math.round(value)) < 0.005) return String(Math.round(value));
  return value.toFixed(digits);
}

function add(a: Vec2, b: Vec2): Vec2 { return [a[0] + b[0], a[1] + b[1]]; }
function subtract(a: Vec2, b: Vec2): Vec2 { return [a[0] - b[0], a[1] - b[1]]; }
function scale(a: Vec2, amount: number): Vec2 { return [a[0] * amount, a[1] * amount]; }
function cross(a: Vec2, b: Vec2): number { return a[0] * b[1] - a[1] * b[0]; }
function unit(a: Vec2): Vec2 { const length = Math.hypot(...a); return length < 1e-8 ? [0, 0] : scale(a, 1 / length); }
