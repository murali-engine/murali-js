import { Tattva, type TattvaState, type Vec2 } from "../../core/Tattva.ts";
import {
  resolveColorInput,
  themeColor,
  type ColorInput,
  type Theme,
} from "../../core/theme.ts";

export interface FractalSegment {
  readonly from: Vec2;
  readonly to: Vec2;
}

export type FractalGenerator = (iteration: number) => readonly FractalSegment[];

export interface FractalPathOptions {
  /** Highest generated recursion stage. Stage zero is always included. */
  iterations: number;
  /** Initially displayed (possibly fractional) stage. Defaults to `iterations`. */
  initialIteration?: number;
  /** Extra world-space room around the generated geometry. */
  padding?: number;
}

export interface FractalPathState extends TattvaState {
  /** Continuous recursion stage. Fractional values cross-fade adjacent stages. */
  iteration: number;
}

export interface FractalStrokeOptions {
  color: ColorInput;
  width?: number;
}

/**
 * A reusable, batched line-fractal Tattva.
 *
 * Every recursion stage is generated once. At render time at most two SVG paths
 * are mounted, making large fractals substantially cheaper than one Tattva per
 * segment while keeping iteration depth animatable as normal timeline state.
 */
export class FractalPathTattva extends Tattva<FractalPathState> {
  override colorProperty = "color" as const;
  override revealKind = "path" as const;
  readonly maxIteration: number;

  private readonly stages: readonly (readonly FractalSegment[])[];
  private readonly stagePathData: readonly string[];
  private readonly viewBox: { x: number; y: number; width: number; height: number };
  private strokeInput: ColorInput = themeColor("stroke");
  private strokeWidth = 0.035;
  private dashLength = 0;
  private dashGap = 0;

  constructor(generator: FractalGenerator, options: FractalPathOptions) {
    const maxIteration = integerInRange(options.iterations, "iterations", 0, 12);
    const initialIteration = finite(options.initialIteration ?? maxIteration, "initial iteration");
    if (initialIteration < 0 || initialIteration > maxIteration) {
      throw new Error(`Initial iteration must be between 0 and ${maxIteration}; received ${initialIteration}.`);
    }
    super({ state: { iteration: initialIteration } });
    this.maxIteration = maxIteration;
    this.dynamicGeometry = true;
    this.stages = Array.from({ length: maxIteration + 1 }, (_, iteration) => {
      const segments = generator(iteration).map(validateSegment);
      if (segments.length === 0) throw new Error(`Fractal generator returned no segments for iteration ${iteration}.`);
      return segments;
    });
    this.stagePathData = this.stages.map(pathDataForSegments);
    this.viewBox = boundsForStages(this.stages, nonNegative(options.padding ?? 0.08, "padding"));
    this.worldSize = { width: this.viewBox.width, height: this.viewBox.height };
    this.applyStrokeColor();
  }

  /** Set the initially displayed recursion stage. Fractional stages are valid. */
  iteration(value: number): this {
    const iteration = finite(value, "iteration");
    if (iteration < 0 || iteration > this.maxIteration) {
      throw new Error(`Iteration must be between 0 and ${this.maxIteration}; received ${iteration}.`);
    }
    return this.setInitial({ iteration });
  }

  /** State fragment intended for `animate(fractal).to(fractal.iterationState(n))`. */
  iterationState(value: number): Partial<FractalPathState> {
    const iteration = finite(value, "iteration");
    if (iteration < 0 || iteration > this.maxIteration) {
      throw new Error(`Iteration must be between 0 and ${this.maxIteration}; received ${iteration}.`);
    }
    return { iteration };
  }

  stroke(options: FractalStrokeOptions): this {
    this.strokeInput = options.color;
    this.strokeWidth = positive(options.width ?? this.strokeWidth, "stroke width");
    this.worldStrokeWidth = this.strokeWidth;
    this.applyStrokeColor();
    return this;
  }

  color(value: ColorInput): this {
    this.strokeInput = value;
    this.applyStrokeColor();
    return this;
  }

  dash(dash: number, gap: number): this {
    this.dashLength = nonNegative(dash, "dash");
    this.dashGap = nonNegative(gap, "gap");
    return this;
  }

  protected override onThemeResolved(theme: Theme): void {
    this.applyStrokeColor(theme);
  }

  override contentHTML(_time = 0, state: Readonly<FractalPathState> = this.initialState): string {
    const iteration = Math.max(0, Math.min(this.maxIteration, state.iteration));
    const lower = Math.floor(iteration);
    const upper = Math.ceil(iteration);
    const fraction = iteration - lower;
    const paths = upper === lower
      ? stagePath(this.stagePathData[lower]!, 1, this.strokeWidth, this.dashLength, this.dashGap)
      : [
          stagePath(this.stagePathData[lower]!, 1 - fraction, this.strokeWidth, this.dashLength, this.dashGap),
          stagePath(this.stagePathData[upper]!, fraction, this.strokeWidth, this.dashLength, this.dashGap),
        ].join("");
    const { x, y, width, height } = this.viewBox;
    return `<svg width="100%" height="100%" viewBox="${number(x)} ${number(y)} ${number(width)} ${number(height)}" overflow="visible" xmlns="http://www.w3.org/2000/svg">${paths}</svg>`;
  }

  private applyStrokeColor(theme: Theme = this.resolvedTheme): void {
    const color = this.hasExplicitStyle("color") && typeof this.initialStyle.color === "string"
      ? this.initialStyle.color
      : resolveColorInput(this.strokeInput, theme);
    this.setInitial({ color });
    this.setComputedStyle({ color });
    this.worldStrokeWidth = this.strokeWidth;
  }
}

export function FractalPath(generator: FractalGenerator, options: FractalPathOptions): FractalPathTattva {
  return new FractalPathTattva(generator, options);
}

export interface KochSnowflakeOptions {
  iterations?: number;
  radius?: number;
}

export function KochSnowflake(options: KochSnowflakeOptions = {}): FractalPathTattva {
  const iterations = integerInRange(options.iterations ?? 5, "iterations", 0, 7);
  const radius = positive(options.radius ?? 2.2, "radius");
  return FractalPath((iteration) => kochSnowflakeSegments(iteration, radius), { iterations });
}

export function kochSnowflakeSegments(iteration: number, radius = 2.2): readonly FractalSegment[] {
  const depth = integerInRange(iteration, "iteration", 0, 7);
  positive(radius, "radius");
  const points: Vec2[] = [-90, 30, 150].map((degrees) => {
    const angle = degrees * Math.PI / 180;
    return [Math.cos(angle) * radius, Math.sin(angle) * radius] as Vec2;
  });
  let segments: FractalSegment[] = [
    { from: points[0]!, to: points[1]! },
    { from: points[1]!, to: points[2]! },
    { from: points[2]!, to: points[0]! },
  ];
  for (let level = 0; level < depth; level += 1) segments = segments.flatMap(kochSplit);
  return segments;
}

export interface SierpinskiTriangleOptions {
  iterations?: number;
  size?: number;
}

export function SierpinskiTriangle(options: SierpinskiTriangleOptions = {}): FractalPathTattva {
  const iterations = integerInRange(options.iterations ?? 6, "iterations", 0, 8);
  const size = positive(options.size ?? 4.4, "size");
  return FractalPath((iteration) => sierpinskiTriangleSegments(iteration, size), { iterations });
}

export function sierpinskiTriangleSegments(iteration: number, size = 4.4): readonly FractalSegment[] {
  const depth = integerInRange(iteration, "iteration", 0, 8);
  positive(size, "size");
  const height = size * Math.sqrt(3) / 2;
  let triangles: readonly [Vec2, Vec2, Vec2][] = [[
    [0, height * 2 / 3],
    [-size / 2, -height / 3],
    [size / 2, -height / 3],
  ]];
  for (let level = 0; level < depth; level += 1) {
    triangles = triangles.flatMap(([a, b, c]) => {
      const ab = midpoint(a, b);
      const bc = midpoint(b, c);
      const ca = midpoint(c, a);
      return [[a, ab, ca], [ab, b, bc], [ca, bc, c]] as const;
    });
  }
  return triangles.flatMap(([a, b, c]) => [
    { from: a, to: b },
    { from: b, to: c },
    { from: c, to: a },
  ]);
}

export interface FractalTreeOptions {
  iterations?: number;
  trunkLength?: number;
  angle?: number;
  branchScale?: number;
}

export function FractalTree(options: FractalTreeOptions = {}): FractalPathTattva {
  const iterations = integerInRange(options.iterations ?? 9, "iterations", 0, 12);
  const trunkLength = positive(options.trunkLength ?? 1.45, "trunk length");
  const angle = finite(options.angle ?? 27, "angle");
  const branchScale = finite(options.branchScale ?? 0.72, "branch scale");
  if (branchScale <= 0 || branchScale >= 1) {
    throw new Error(`Branch scale must be greater than 0 and less than 1; received ${branchScale}.`);
  }
  return FractalPath(
    (iteration) => fractalTreeSegments(iteration, { trunkLength, angle, branchScale }),
    { iterations },
  );
}

export function fractalTreeSegments(
  iteration: number,
  options: Omit<FractalTreeOptions, "iterations"> = {},
): readonly FractalSegment[] {
  const depth = integerInRange(iteration, "iteration", 0, 12);
  const trunkLength = positive(options.trunkLength ?? 1.45, "trunk length");
  const angle = finite(options.angle ?? 27, "angle") * Math.PI / 180;
  const branchScale = finite(options.branchScale ?? 0.72, "branch scale");
  if (branchScale <= 0 || branchScale >= 1) {
    throw new Error(`Branch scale must be greater than 0 and less than 1; received ${branchScale}.`);
  }
  const segments: FractalSegment[] = [];
  const grow = (from: Vec2, heading: number, length: number, remaining: number): void => {
    const to: Vec2 = [from[0] + Math.cos(heading) * length, from[1] + Math.sin(heading) * length];
    segments.push({ from, to });
    if (remaining === 0) return;
    grow(to, heading + angle, length * branchScale, remaining - 1);
    grow(to, heading - angle, length * branchScale, remaining - 1);
  };
  grow([0, -2.2], Math.PI / 2, trunkLength, depth);
  return segments;
}

function kochSplit({ from, to }: FractalSegment): FractalSegment[] {
  const dx = (to[0] - from[0]) / 3;
  const dy = (to[1] - from[1]) / 3;
  const first: Vec2 = [from[0] + dx, from[1] + dy];
  const second: Vec2 = [from[0] + dx * 2, from[1] + dy * 2];
  const cos = 0.5;
  const sin = -Math.sqrt(3) / 2;
  const peak: Vec2 = [first[0] + dx * cos - dy * sin, first[1] + dx * sin + dy * cos];
  return [
    { from, to: first },
    { from: first, to: peak },
    { from: peak, to: second },
    { from: second, to },
  ];
}

function stagePath(
  path: string,
  opacity: number,
  width: number,
  dash: number,
  gap: number,
): string {
  const dashAttribute = dash === 0 && gap === 0 ? "" : ` stroke-dasharray="${number(dash)} ${number(gap)}"`;
  return `<path data-murali-path d="${path}" fill="none" stroke="currentColor" stroke-width="${number(width)}" stroke-linecap="round" stroke-linejoin="round" opacity="${number(opacity)}"${dashAttribute} />`;
}

function pathDataForSegments(segments: readonly FractalSegment[]): string {
  return segments
    .map(({ from, to }) => `M ${number(from[0])} ${number(-from[1])} L ${number(to[0])} ${number(-to[1])}`)
    .join(" ");
}

function boundsForStages(
  stages: readonly (readonly FractalSegment[])[],
  padding: number,
): { x: number; y: number; width: number; height: number } {
  const points = stages.flatMap((segments) => segments.flatMap(({ from, to }) => [from, to]));
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => -y);
  const minX = Math.min(...xs) - padding;
  const maxX = Math.max(...xs) + padding;
  const minY = Math.min(...ys) - padding;
  const maxY = Math.max(...ys) + padding;
  return { x: minX, y: minY, width: Math.max(1e-6, maxX - minX), height: Math.max(1e-6, maxY - minY) };
}

function validateSegment(segment: FractalSegment, index: number): FractalSegment {
  if (!segment || segment.from.length !== 2 || segment.to.length !== 2) {
    throw new Error(`Invalid fractal segment at index ${index}.`);
  }
  return {
    from: [finite(segment.from[0], `segment ${index} start x`), finite(segment.from[1], `segment ${index} start y`)],
    to: [finite(segment.to[0], `segment ${index} end x`), finite(segment.to[1], `segment ${index} end y`)],
  };
}

function midpoint(a: Vec2, b: Vec2): Vec2 {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

function finite(value: number, name: string): number {
  if (!Number.isFinite(value)) throw new Error(`${name} must be finite; received ${value}.`);
  return value;
}

function positive(value: number, name: string): number {
  finite(value, name);
  if (value <= 0) throw new Error(`${name} must be positive; received ${value}.`);
  return value;
}

function nonNegative(value: number, name: string): number {
  finite(value, name);
  if (value < 0) throw new Error(`${name} must be non-negative; received ${value}.`);
  return value;
}

function integerInRange(value: number, name: string, min: number, max: number): number {
  finite(value, name);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}; received ${value}.`);
  }
  return value;
}

function number(value: number): string {
  return Number(value.toFixed(6)).toString();
}
