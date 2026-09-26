import type { Vec2 } from "../core/Tattva.ts";

export interface FourierTerm {
  frequency: number;
  real: number;
  imaginary: number;
}

/** A geometric π, centered and scaled to `height`. Not a Typst glyph. */
export function piOutline(count = 760, height = 2.65): Vec2[] {
  const strokes = [
    segment([-1.05, 0.85], [1.05, 0.85], 80),
    segment([-0.62, 0.85], [-0.78, -1], 140),
    segment([0.62, 0.85], [0.42, -1], 140),
  ].flat();
  const center = strokes.reduce((sum, point) => [sum[0] + point[0], sum[1] + point[1]] as Vec2, [0, 0] as Vec2);
  const shifted = strokes.map((point) => [point[0] - center[0] / strokes.length, point[1] - center[1] / strokes.length] as Vec2);
  const minY = Math.min(...shifted.map((point) => point[1]));
  const maxY = Math.max(...shifted.map((point) => point[1]));
  const scale = height / Math.max(0.001, maxY - minY);
  return resample(shifted.map((point) => [point[0] * scale, point[1] * scale] as Vec2), count);
}

export function fourierTerms(points: readonly Vec2[], harmonics: number): FourierTerm[] {
  const count = points.length;
  const terms: FourierTerm[] = [coefficient(points, 0)];
  for (let frequency = 1; frequency <= harmonics; frequency += 1) {
    terms.push(coefficient(points, frequency), coefficient(points, -frequency));
  }
  const dc = terms.findIndex((term) => term.frequency === 0);
  terms.sort((left, right) => magnitude(right) - magnitude(left));
  const dcIndex = terms.findIndex((term) => term.frequency === 0);
  if (dc >= 0 && dcIndex > 0) {
    const [first] = terms.splice(dcIndex, 1);
    if (first) terms.unshift(first);
  }
  return terms;
}

/** Tip of the epicycle chain at `phase` in `0..1`. */
export function epicycleTip(terms: readonly FourierTerm[], phase: number): Vec2 {
  return terms.reduce((sum, term) => {
    const rotated = rotate(term, Math.PI * 2 * term.frequency * phase);
    return [sum[0] + rotated.real, sum[1] + rotated.imaginary] as Vec2;
  }, [0, 0] as Vec2);
}

export function epicycleLinks(terms: readonly FourierTerm[], phase: number): Array<{ center: Vec2; next: Vec2; radius: number }> {
  const links: Array<{ center: Vec2; next: Vec2; radius: number }> = [];
  let origin: Vec2 = [0, 0];
  for (const term of terms) {
    const rotated = rotate(term, Math.PI * 2 * term.frequency * phase);
    const next: Vec2 = [origin[0] + rotated.real, origin[1] + rotated.imaginary];
    links.push({ center: origin, next, radius: Math.hypot(rotated.real, rotated.imaginary) });
    origin = next;
  }
  return links;
}

function coefficient(points: readonly Vec2[], frequency: number): FourierTerm {
  let real = 0;
  let imaginary = 0;
  points.forEach((point, index) => {
    const theta = -Math.PI * 2 * frequency * index / points.length;
    const turned = rotate({ frequency, real: point[0], imaginary: point[1] }, theta);
    real += turned.real;
    imaginary += turned.imaginary;
  });
  return { frequency, real: real / points.length, imaginary: imaginary / points.length };
}

function rotate(term: FourierTerm, angle: number): FourierTerm {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    frequency: term.frequency,
    real: term.real * cos - term.imaginary * sin,
    imaginary: term.real * sin + term.imaginary * cos,
  };
}

function magnitude(term: FourierTerm): number {
  return Math.hypot(term.real, term.imaginary);
}

function segment(start: Vec2, end: Vec2, count: number): Vec2[] {
  return Array.from({ length: count }, (_, index) => {
    const t = index / Math.max(1, count - 1);
    return [start[0] + (end[0] - start[0]) * t, start[1] + (end[1] - start[1]) * t] as Vec2;
  });
}

function resample(points: readonly Vec2[], count: number): Vec2[] {
  const lengths = [0];
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1] ?? points[0] ?? [0, 0];
    const point = points[index] ?? previous;
    lengths.push((lengths[index - 1] ?? 0) + Math.hypot(point[0] - previous[0], point[1] - previous[1]));
  }
  const total = lengths[lengths.length - 1] ?? 0;
  return Array.from({ length: count }, (_, index) => {
    const target = total * index / Math.max(1, count - 1);
    const upper = Math.max(1, lengths.findIndex((length) => length >= target));
    const lower = upper - 1;
    const span = Math.max(1e-8, (lengths[upper] ?? total) - (lengths[lower] ?? 0));
    const t = (target - (lengths[lower] ?? 0)) / span;
    const from = points[lower] ?? points[0] ?? [0, 0];
    const to = points[upper] ?? from;
    return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t] as Vec2;
  });
}
