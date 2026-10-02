import { Tattva, type TattvaState, type Vec2 } from "../../core/Tattva.ts";
import { resolveColor } from "../../core/palette.ts";

interface SvgLayout {
  html: string;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

/** A polyline whose points are rebuilt from scene time, so seeking does not depend on earlier frames. */
export function TracedPath(pointAt: (time: number) => Vec2): TracedPathTattva {
  return new TracedPathTattva(pointAt);
}

export class TracedPathTattva extends Tattva {
  private gap = 0.01;
  private limit = 10000;
  private step = 1 / 60;
  private ink = "#f0ac5f";
  private strokeWidth = 0.06;

  constructor(private readonly pointAt: (time: number) => Vec2) {
    super();
    this.dynamicGeometry = true;
    this.revealKind = "none";
  }

  minDistance(value: number): this {
    this.gap = Math.max(0, value);
    return this;
  }

  maxPoints(value: number): this {
    this.limit = Math.max(2, Math.floor(value));
    return this;
  }

  sampleStep(value: number): this {
    this.step = Math.max(1e-4, value);
    return this;
  }

  color(value: string): this {
    this.ink = resolveColor(value);
    return this;
  }

  width(value: number): this {
    this.strokeWidth = Math.max(0, value);
    return this;
  }

  pointsAt(time: number): Vec2[] {
    if (time < 0) return [];
    const points: Vec2[] = [];
    const count = Math.floor(time / this.step);
    for (let index = 0; index <= count; index += 1) {
      this.pushPoint(points, this.pointAt(Math.min(time, index * this.step)));
    }
    this.pushPoint(points, this.pointAt(time), true);
    if (points.length > this.limit) points.splice(0, points.length - this.limit);
    return points;
  }

  override influenceState(time: number, state: TattvaState): void {
    const layout = polylineLayout(this.pointsAt(time), this.ink, this.strokeWidth);
    state.x += layout.offsetX;
    state.y += layout.offsetY;
    this.worldSize = { width: layout.width, height: layout.height };
  }

  override contentHTML(time = 0): string {
    return polylineLayout(this.pointsAt(time), this.ink, this.strokeWidth).html;
  }

  private pushPoint(points: Vec2[], point: Vec2, force = false): void {
    const last = points[points.length - 1];
    if (last && last[0] === point[0] && last[1] === point[1]) return;
    if (!force && last && Math.hypot(point[0] - last[0], point[1] - last[1]) < this.gap) return;
    points.push(point);
  }
}

export interface BeltParticle {
  center: Vec2;
  radius: number;
  color: string;
}

/** Seeded dots orbiting a ring. `phaseAt` is a function of scene time. */
export function ParticleBelt(radius: number): ParticleBeltTattva {
  return new ParticleBeltTattva(radius);
}

export class ParticleBeltTattva extends Tattva {
  private band = 0.5;
  private count = 160;
  private minRadius = 0.012;
  private maxRadius = 0.05;
  private swatches = ["#40e3fa", "#8f8afc", "#fa73c9", "#fccf57"];
  private speed = 0.8;
  private clockwise = 0.5;
  private breathAmplitude = 0.08;
  private breathRate = 1.2;
  private jitterAmplitude = 0.1;
  private jitterRate = 2.4;
  private beltSeed = 1;
  private phaseOf: (time: number) => number = () => 0;

  constructor(private readonly radius: number) {
    super();
    this.dynamicGeometry = true;
    this.revealKind = "none";
    this.worldSize = { width: this.extent() * 2, height: this.extent() * 2 };
  }

  bandWidth(value: number): this {
    this.band = Math.max(0, value);
    this.worldSize = { width: this.extent() * 2, height: this.extent() * 2 };
    return this;
  }

  particleCount(value: number): this {
    this.count = Math.max(1, Math.floor(value));
    return this;
  }

  sizeRange(min: number, max: number): this {
    this.minRadius = Math.max(0.001, min);
    this.maxRadius = Math.max(this.minRadius, max);
    this.worldSize = { width: this.extent() * 2, height: this.extent() * 2 };
    return this;
  }

  palette(colors: readonly string[]): this {
    if (colors.length > 0) this.swatches = colors.map((color) => resolveColor(color));
    return this;
  }

  orbitSpeed(value: number): this {
    this.speed = value;
    return this;
  }

  clockwiseRatio(value: number): this {
    this.clockwise = Math.max(0, Math.min(1, value));
    return this;
  }

  breathing(amplitude: number, rate: number): this {
    this.breathAmplitude = Math.max(0, amplitude);
    this.breathRate = rate;
    this.worldSize = { width: this.extent() * 2, height: this.extent() * 2 };
    return this;
  }

  jitter(amplitude: number, rate: number): this {
    this.jitterAmplitude = Math.max(0, amplitude);
    this.jitterRate = rate;
    this.worldSize = { width: this.extent() * 2, height: this.extent() * 2 };
    return this;
  }

  seed(value: number): this {
    this.beltSeed = value;
    return this;
  }

  phaseAt(value: (time: number) => number): this {
    this.phaseOf = value;
    return this;
  }

  particlesAt(phase: number): BeltParticle[] {
    const breathing = this.breathAmplitude * Math.sin(phase * this.breathRate);
    return Array.from({ length: this.count }, (_, index) => {
      const h0 = hash01(this.beltSeed + index * 17.371);
      const h1 = hash01(this.beltSeed + index * 41.927 + 0.37);
      const h2 = hash01(this.beltSeed + index * 91.117 + 1.77);
      const h3 = hash01(this.beltSeed + index * 13.731 + 2.41);
      const h4 = hash01(this.beltSeed + index * 63.337 + 3.13);
      const base = h0 * Math.PI * 2;
      const direction = h1 < this.clockwise ? -1 : 1;
      const rate = this.speed * (0.55 + 1.15 * h2);
      const angle = base + direction * phase * rate;
      const radial = this.jitterAmplitude * Math.sin(phase * (this.jitterRate * (0.7 + h4)) + h0 * Math.PI * 2);
      const orbit = Math.max(0.01, this.radius + (h3 - 0.5) * this.band + breathing + radial);
      return {
        center: [orbit * Math.cos(angle), orbit * Math.sin(angle)] as Vec2,
        radius: this.minRadius + (this.maxRadius - this.minRadius) * h1,
        color: paletteColor(this.swatches, h2, 0.55 + 0.45 * h4),
      };
    });
  }

  override contentHTML(time = 0): string {
    const extent = this.extent();
    const circles = this.particlesAt(this.phaseOf(time)).map((particle) =>
      `<circle cx="${particle.center[0]}" cy="${-particle.center[1]}" r="${particle.radius}" fill="${particle.color}" />`,
    ).join("");
    return `<svg width="100%" height="100%" viewBox="${-extent} ${-extent} ${extent * 2} ${extent * 2}" overflow="visible" xmlns="http://www.w3.org/2000/svg">${circles}</svg>`;
  }

  private extent(): number {
    return this.radius + this.band * 0.5 + this.breathAmplitude + this.jitterAmplitude + this.maxRadius;
  }
}

/** Flow lines integrated with a fixed step, clipped to the authored bounds. */
export function StreamLines(
  seeds: readonly Vec2[],
  field: (point: Vec2) => Vec2,
): StreamLinesTattva {
  return new StreamLinesTattva(seeds, field);
}

export function circleSeeds(center: Vec2, radius: number, count: number): Vec2[] {
  return Array.from({ length: Math.max(1, Math.floor(count)) }, (_, index) => {
    const angle = (index / Math.max(1, Math.floor(count))) * Math.PI * 2;
    return [center[0] + radius * Math.cos(angle), center[1] + radius * Math.sin(angle)] as Vec2;
  });
}

export class StreamLinesTattva extends Tattva {
  private ink = "#8fb4ff";
  private strokeWidth = 0.03;
  private step = 0.05;
  private stepCount: (time: number) => number = () => 1000;
  private alphaOf: (time: number) => number = () => 0.8;
  private box: readonly [Vec2, Vec2] | null = null;

  constructor(
    private readonly seeds: readonly Vec2[],
    private readonly field: (point: Vec2) => Vec2,
  ) {
    super();
    this.dynamicGeometry = true;
    this.revealKind = "none";
  }

  color(value: string): this {
    this.ink = resolveColor(value);
    return this;
  }

  thickness(value: number): this {
    this.strokeWidth = Math.max(0, value);
    return this;
  }

  stepSize(value: number): this {
    this.step = Math.max(1e-4, value);
    return this;
  }

  maxSteps(value: number | ((time: number) => number)): this {
    this.stepCount = typeof value === "function" ? value : () => Math.max(1, Math.floor(value));
    return this;
  }

  alpha(value: number | ((time: number) => number)): this {
    this.alphaOf = typeof value === "function" ? value : () => value;
    return this;
  }

  bounds(min: Vec2, max: Vec2): this {
    this.box = [min, max];
    const width = Math.max(0.001, max[0] - min[0]);
    const height = Math.max(0.001, max[1] - min[1]);
    this.worldSize = { width, height };
    return this;
  }

  tracesAt(steps: number): Vec2[][] {
    return this.seeds.map((seed) => this.integrate(seed, steps));
  }

  override influenceState(time: number, state: TattvaState): void {
    const layout = this.layout(time);
    state.x += layout.offsetX;
    state.y += layout.offsetY;
    this.worldSize = { width: layout.width, height: layout.height };
  }

  override contentHTML(time = 0): string {
    return this.layout(time).html;
  }

  private integrate(start: Vec2, steps: number): Vec2[] {
    const points = [start];
    let current = start;
    for (let index = 0; index < steps; index += 1) {
      const vector = this.field(current);
      const length = Math.hypot(vector[0], vector[1]);
      if (length < 1e-6) break;
      const next: Vec2 = [current[0] + (vector[0] / length) * this.step, current[1] + (vector[1] / length) * this.step];
      if (this.box && (next[0] < this.box[0][0] || next[0] > this.box[1][0] || next[1] < this.box[0][1] || next[1] > this.box[1][1])) break;
      points.push(next);
      current = next;
    }
    return points;
  }

  private layout(time: number): SvgLayout {
    const alpha = Math.max(0, Math.min(1, this.alphaOf(time)));
    const color = withAlpha(this.ink, alpha);
    const paths = this.tracesAt(Math.max(1, Math.round(this.stepCount(time))));
    return polylineLayout(paths.flat(), color, this.strokeWidth, paths);
  }
}

/** Arrows sampled on a fixed grid. The field may read scene time. */
export function VectorField(
  xRange: readonly [number, number],
  yRange: readonly [number, number],
  xSteps: number,
  ySteps: number,
  field: (point: Vec2, time: number) => Vec2,
): VectorFieldTattva {
  return new VectorFieldTattva(xRange, yRange, xSteps, ySteps, field);
}

export class VectorFieldTattva extends Tattva {
  private ink = "#9cdceb";
  private scaleLength = 0.5;
  private minLength = 0.01;
  private maxLength = 2;
  private shaft = 0.03;
  private tip = 0.1;
  private tipWidth = 0.08;

  constructor(
    private readonly xRange: readonly [number, number],
    private readonly yRange: readonly [number, number],
    private readonly xSteps: number,
    private readonly ySteps: number,
    private readonly field: (point: Vec2, time: number) => Vec2,
  ) {
    super();
    this.dynamicGeometry = true;
    this.revealKind = "none";
    this.worldSize = {
      width: Math.max(0.001, xRange[1] - xRange[0]),
      height: Math.max(0.001, yRange[1] - yRange[0]),
    };
  }

  color(value: string): this {
    this.ink = resolveColor(value);
    return this;
  }

  lengthScale(value: number): this {
    this.scaleLength = value;
    return this;
  }

  arrowStyle(shaft: number, tipLength: number, tipWidth: number): this {
    this.shaft = shaft;
    this.tip = tipLength;
    this.tipWidth = tipWidth;
    return this;
  }

  /** Shaft directions after scaling, one per grid point that is long enough to draw. */
  arrowsAt(time: number): Array<{ at: Vec2; vector: Vec2 }> {
    const dx = (this.xRange[1] - this.xRange[0]) / Math.max(1, this.xSteps - 1);
    const dy = (this.yRange[1] - this.yRange[0]) / Math.max(1, this.ySteps - 1);
    const arrows: Array<{ at: Vec2; vector: Vec2 }> = [];
    for (let i = 0; i < this.xSteps; i += 1) {
      for (let j = 0; j < this.ySteps; j += 1) {
        const at: Vec2 = [this.xRange[0] + i * dx, this.yRange[0] + j * dy];
        const vector = this.field(at, time);
        const magnitude = Math.hypot(vector[0], vector[1]);
        if (magnitude < this.minLength) continue;
        const length = Math.min(this.maxLength, magnitude * this.scaleLength);
        arrows.push({ at, vector: [vector[0] / magnitude * length, vector[1] / magnitude * length] });
      }
    }
    return arrows;
  }

  override contentHTML(time = 0): string {
    const color = this.ink;
    const paths = this.arrowsAt(time).flatMap(({ at, vector }) => arrowPaths(at, vector, this.tip, this.tipWidth));
    const width = this.worldSize?.width ?? 1;
    const height = this.worldSize?.height ?? 1;
    const minX = (this.xRange[0] + this.xRange[1]) / 2 - width / 2;
    const maxY = (this.yRange[0] + this.yRange[1]) / 2 + height / 2;
    const markup = paths.map((commands) =>
      `<path d="${commands}" fill="none" stroke="${color}" stroke-width="${this.shaft}" stroke-linecap="round" stroke-linejoin="round" />`,
    ).join("");
    return `<svg width="100%" height="100%" viewBox="${minX} ${-maxY} ${width} ${height}" overflow="visible" xmlns="http://www.w3.org/2000/svg">${markup}</svg>`;
  }
}

function arrowPaths(start: Vec2, vector: Vec2, tipLength: number, tipWidth: number): string[] {
  const length = Math.hypot(vector[0], vector[1]) || 1;
  const dir: Vec2 = [vector[0] / length, vector[1] / length];
  const end: Vec2 = [start[0] + vector[0], start[1] + vector[1]];
  const tip = Math.min(tipLength, length);
  const shaftEnd: Vec2 = [end[0] - dir[0] * tip, end[1] - dir[1] * tip];
  const perp: Vec2 = [-dir[1], dir[0]];
  const left: Vec2 = [shaftEnd[0] - perp[0] * tipWidth * 0.5, shaftEnd[1] - perp[1] * tipWidth * 0.5];
  const right: Vec2 = [shaftEnd[0] + perp[0] * tipWidth * 0.5, shaftEnd[1] + perp[1] * tipWidth * 0.5];
  return [
    lineCommand(start, shaftEnd),
    lineCommand(end, left),
    lineCommand(end, right),
    lineCommand(left, right),
  ];
}

function lineCommand(start: Vec2, end: Vec2): string {
  return `M ${start[0]} ${-start[1]} L ${end[0]} ${-end[1]}`;
}

function polylineLayout(points: readonly Vec2[], color: string, width: number, separate: readonly (readonly Vec2[])[] = []): SvgLayout {
  const lines = separate.length > 0 ? separate : [points];
  const drawn = lines.filter((line) => line.length >= 2);
  const all = drawn.flat();
  if (all.length === 0) return { html: "", offsetX: 0, offsetY: 0, width: 0.001, height: 0.001 };
  const xs = all.map((point) => point[0]);
  const ys = all.map((point) => point[1]);
  const pad = Math.max(width, 0.001);
  const minX = Math.min(...xs) - pad;
  const maxX = Math.max(...xs) + pad;
  const minY = Math.min(...ys) - pad;
  const maxY = Math.max(...ys) + pad;
  const boxWidth = Math.max(maxX - minX, 0.001);
  const boxHeight = Math.max(maxY - minY, 0.001);
  const markup = drawn.map((line) => {
    const commands = line.map((point, index) => `${index === 0 ? "M" : "L"} ${point[0]} ${-point[1]}`).join(" ");
    return `<path d="${commands}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" />`;
  }).join("");
  return {
    html: `<svg width="100%" height="100%" viewBox="${minX} ${-maxY} ${boxWidth} ${boxHeight}" overflow="visible" xmlns="http://www.w3.org/2000/svg">${markup}</svg>`,
    offsetX: (minX + maxX) / 2,
    offsetY: (minY + maxY) / 2,
    width: boxWidth,
    height: boxHeight,
  };
}

function hash01(x: number): number {
  const value = Math.sin(Math.fround(x)) * 43758.547;
  return Math.abs(value - Math.trunc(value));
}

function paletteColor(colors: readonly string[], t: number, alpha: number): string {
  const parsed = colors.map(channels);
  const wrapped = ((t % 1) + 1) % 1;
  const scaled = wrapped * parsed.length;
  const index = Math.floor(scaled) % parsed.length;
  const next = parsed[(index + 1) % parsed.length] ?? parsed[0] ?? [255, 255, 255];
  const current = parsed[index] ?? next;
  const fraction = scaled - Math.floor(scaled);
  const mixed = current.map((channel, offset) => Math.round(channel + ((next[offset] ?? channel) - channel) * fraction));
  return `rgba(${mixed.join(", ")}, ${alpha})`;
}

function channels(color: string): [number, number, number] {
  const hex = /^#([0-9a-f]{6})$/i.exec(color);
  if (!hex?.[1]) return [255, 255, 255];
  return [
    Number.parseInt(hex[1].slice(0, 2), 16),
    Number.parseInt(hex[1].slice(2, 4), 16),
    Number.parseInt(hex[1].slice(4, 6), 16),
  ];
}

function withAlpha(color: string, alpha: number): string {
  const [red, green, blue] = channels(color);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
