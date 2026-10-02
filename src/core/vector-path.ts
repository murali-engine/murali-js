import type { Vec2 } from "./Tattva.ts";

export interface CubicCurve {
  readonly p0: Vec2;
  readonly c1: Vec2;
  readonly c2: Vec2;
  readonly p3: Vec2;
}

export interface CubicContour {
  readonly curves: readonly CubicCurve[];
  readonly closed: boolean;
}

export type CubicContourPair = readonly [CubicContour, CubicContour];

/** Parse SVG path geometry into absolute cubic Bezier contours. */
export function parseSvgCubicPath(data: string): CubicContour[] {
  const tokens = data.match(/[A-Za-z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/gu) ?? [];
  const contours: CubicContour[] = [];
  let index = 0;
  let command = "";
  let current: Vec2 = [0, 0];
  let start: Vec2 = [0, 0];
  let curves: CubicCurve[] = [];
  let previousCubicControl: Vec2 | undefined;
  let previousQuadraticControl: Vec2 | undefined;

  const finish = (closed: boolean): void => {
    if (closed && curves.length > 0 && !samePoint(current, start)) curves.push(lineCurve(current, start));
    if (curves.length > 0) contours.push({ curves, closed });
    curves = [];
  };
  const number = (): number => {
    const value = Number(tokens[index++]);
    if (!Number.isFinite(value)) throw new Error(`Invalid SVG path number in ${data}`);
    return value;
  };
  const point = (relative: boolean): Vec2 => {
    const value: Vec2 = [number(), number()];
    return relative ? [current[0] + value[0], current[1] + value[1]] : value;
  };

  while (index < tokens.length) {
    if (/^[A-Za-z]$/u.test(tokens[index]!)) command = tokens[index++]!;
    if (!command) throw new Error(`SVG path data begins without a command: ${data}`);
    const relative = command === command.toLowerCase();
    const upper = command.toUpperCase();
    if (upper === "Z") {
      finish(true);
      current = start;
      previousCubicControl = undefined;
      previousQuadraticControl = undefined;
      command = "";
      continue;
    }
    if (upper === "M") {
      const next = point(relative);
      if (curves.length > 0) finish(false);
      current = next;
      start = next;
      command = relative ? "l" : "L";
      previousCubicControl = undefined;
      previousQuadraticControl = undefined;
      continue;
    }
    const from = current;
    if (upper === "L") {
      current = point(relative);
      curves.push(lineCurve(from, current));
    } else if (upper === "H") {
      const x = number();
      current = [relative ? current[0] + x : x, current[1]];
      curves.push(lineCurve(from, current));
    } else if (upper === "V") {
      const y = number();
      current = [current[0], relative ? current[1] + y : y];
      curves.push(lineCurve(from, current));
    } else if (upper === "C") {
      const c1 = point(relative);
      const c2 = point(relative);
      current = point(relative);
      curves.push({ p0: from, c1, c2, p3: current });
      previousCubicControl = c2;
      previousQuadraticControl = undefined;
      continue;
    } else if (upper === "S") {
      const c1 = previousCubicControl ? reflect(previousCubicControl, from) : from;
      const c2 = point(relative);
      current = point(relative);
      curves.push({ p0: from, c1, c2, p3: current });
      previousCubicControl = c2;
      previousQuadraticControl = undefined;
      continue;
    } else if (upper === "Q") {
      const control = point(relative);
      current = point(relative);
      curves.push(quadraticCurve(from, control, current));
      previousQuadraticControl = control;
      previousCubicControl = undefined;
      continue;
    } else if (upper === "T") {
      const control = previousQuadraticControl ? reflect(previousQuadraticControl, from) : from;
      current = point(relative);
      curves.push(quadraticCurve(from, control, current));
      previousQuadraticControl = control;
      previousCubicControl = undefined;
      continue;
    } else if (upper === "A") {
      const radiusX = Math.abs(number());
      const radiusY = Math.abs(number());
      const rotation = number();
      const largeArc = number() !== 0;
      const sweep = number() !== 0;
      current = point(relative);
      curves.push(...arcCurves(from, current, radiusX, radiusY, rotation, largeArc, sweep));
    } else {
      throw new Error(`Unsupported SVG path command ${command}.`);
    }
    previousCubicControl = undefined;
    previousQuadraticControl = undefined;
  }
  if (curves.length > 0) finish(false);
  return contours;
}

export function polylineCubicContour(points: readonly Vec2[], closed = true): CubicContour {
  if (points.length < (closed ? 3 : 2)) throw new Error("A vector contour does not contain enough points.");
  const limit = closed ? points.length : points.length - 1;
  return {
    closed,
    curves: Array.from({ length: limit }, (_, index) =>
      lineCurve(points[index]!, points[(index + 1) % points.length]!)
    ),
  };
}

export function mapCubicContours(
  contours: readonly CubicContour[],
  transform: (point: Vec2) => Vec2,
): CubicContour[] {
  return contours.map((contour) => ({
    closed: contour.closed,
    curves: contour.curves.map((curve) => ({
      p0: transform(curve.p0),
      c1: transform(curve.c1),
      c2: transform(curve.c2),
      p3: transform(curve.p3),
    })),
  }));
}

/** Pair compound contours and normalize their cubic segment counts and winding. */
export function normalizeCubicContours(
  source: readonly CubicContour[],
  target: readonly CubicContour[],
  minimumCurves = 0,
): CubicContourPair[] {
  if (source.length === 0 || target.length === 0) throw new Error("Vector morphs require at least one contour per keyframe.");
  const left = [...source].sort((a, b) => Math.abs(contourArea(b)) - Math.abs(contourArea(a)));
  const right = [...target].sort((a, b) => Math.abs(contourArea(b)) - Math.abs(contourArea(a)));
  const count = Math.max(left.length, right.length);
  const minimumPerContour = Math.ceil(minimumCurves / count);
  return Array.from({ length: count }, (_, index): CubicContourPair => {
    const sourceContour = left[index] ?? degenerateContour(contourCenter(right[index]!));
    const targetContour = right[index] ?? degenerateContour(contourCenter(left[index]!));
    const curveCount = Math.max(sourceContour.curves.length, targetContour.curves.length, minimumPerContour);
    const denseSource = densifyContour(sourceContour, curveCount);
    const denseTarget = densifyContour(targetContour, curveCount);
    return [alignCubicContour(denseSource, denseTarget), denseTarget];
  });
}

export function interpolateCubicContours(pairs: readonly CubicContourPair[], amount: number): CubicContour[] {
  return pairs.map(([source, target]) => ({
    closed: source.closed || target.closed,
    curves: source.curves.map((curve, index) => {
      const right = target.curves[index]!;
      return {
        p0: lerpPoint(curve.p0, right.p0, amount),
        c1: lerpPoint(curve.c1, right.c1, amount),
        c2: lerpPoint(curve.c2, right.c2, amount),
        p3: lerpPoint(curve.p3, right.p3, amount),
      };
    }),
  }));
}

export function cubicContoursPath(contours: readonly CubicContour[], digits = 5): string {
  const format = (value: number): string => Number(value.toFixed(digits)).toString();
  return contours.map((contour) => {
    const first = contour.curves[0];
    if (!first) return "";
    const curves = contour.curves.map((curve) =>
      `C ${format(curve.c1[0])} ${format(curve.c1[1])} ${format(curve.c2[0])} ${format(curve.c2[1])} ${format(curve.p3[0])} ${format(curve.p3[1])}`
    ).join(" ");
    return `M ${format(first.p0[0])} ${format(first.p0[1])} ${curves}${contour.closed ? " Z" : ""}`;
  }).join(" ");
}

function arcCurves(
  start: Vec2,
  end: Vec2,
  requestedRadiusX: number,
  requestedRadiusY: number,
  rotationDegrees: number,
  largeArc: boolean,
  sweep: boolean,
): CubicCurve[] {
  if (samePoint(start, end)) return [];
  if (requestedRadiusX === 0 || requestedRadiusY === 0) return [lineCurve(start, end)];
  const rotation = rotationDegrees * Math.PI / 180;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const dx = (start[0] - end[0]) / 2;
  const dy = (start[1] - end[1]) / 2;
  const xPrime = cos * dx + sin * dy;
  const yPrime = -sin * dx + cos * dy;
  let radiusX = requestedRadiusX;
  let radiusY = requestedRadiusY;
  const scale = xPrime * xPrime / (radiusX * radiusX) + yPrime * yPrime / (radiusY * radiusY);
  if (scale > 1) {
    const factor = Math.sqrt(scale);
    radiusX *= factor;
    radiusY *= factor;
  }
  const rx2 = radiusX * radiusX;
  const ry2 = radiusY * radiusY;
  const numerator = Math.max(0, rx2 * ry2 - rx2 * yPrime * yPrime - ry2 * xPrime * xPrime);
  const denominator = rx2 * yPrime * yPrime + ry2 * xPrime * xPrime;
  const sign = largeArc === sweep ? -1 : 1;
  const coefficient = denominator <= 1e-16 ? 0 : sign * Math.sqrt(numerator / denominator);
  const cxPrime = coefficient * radiusX * yPrime / radiusY;
  const cyPrime = coefficient * -radiusY * xPrime / radiusX;
  const center: Vec2 = [
    cos * cxPrime - sin * cyPrime + (start[0] + end[0]) / 2,
    sin * cxPrime + cos * cyPrime + (start[1] + end[1]) / 2,
  ];
  const vectorAngle = (ux: number, uy: number, vx: number, vy: number): number =>
    Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const ux = (xPrime - cxPrime) / radiusX;
  const uy = (yPrime - cyPrime) / radiusY;
  const vx = (-xPrime - cxPrime) / radiusX;
  const vy = (-yPrime - cyPrime) / radiusY;
  let delta = vectorAngle(ux, uy, vx, vy);
  if (!sweep && delta > 0) delta -= Math.PI * 2;
  if (sweep && delta < 0) delta += Math.PI * 2;
  const startAngle = Math.atan2(uy, ux);
  const segments = Math.max(1, Math.ceil(Math.abs(delta) / (Math.PI / 2)));
  const step = delta / segments;
  const transform = (x: number, y: number): Vec2 => [
    center[0] + cos * radiusX * x - sin * radiusY * y,
    center[1] + sin * radiusX * x + cos * radiusY * y,
  ];
  return Array.from({ length: segments }, (_, index): CubicCurve => {
    const a = startAngle + step * index;
    const b = a + step;
    const alpha = 4 / 3 * Math.tan((b - a) / 4);
    return {
      p0: transform(Math.cos(a), Math.sin(a)),
      c1: transform(Math.cos(a) - alpha * Math.sin(a), Math.sin(a) + alpha * Math.cos(a)),
      c2: transform(Math.cos(b) + alpha * Math.sin(b), Math.sin(b) - alpha * Math.cos(b)),
      p3: transform(Math.cos(b), Math.sin(b)),
    };
  });
}

function lineCurve(start: Vec2, end: Vec2): CubicCurve {
  return { p0: start, c1: lerpPoint(start, end, 1 / 3), c2: lerpPoint(start, end, 2 / 3), p3: end };
}

function quadraticCurve(start: Vec2, control: Vec2, end: Vec2): CubicCurve {
  return {
    p0: start,
    c1: [start[0] + (control[0] - start[0]) * 2 / 3, start[1] + (control[1] - start[1]) * 2 / 3],
    c2: [end[0] + (control[0] - end[0]) * 2 / 3, end[1] + (control[1] - end[1]) * 2 / 3],
    p3: end,
  };
}

function densifyContour(contour: CubicContour, count: number): CubicContour {
  const curves = [...contour.curves];
  while (curves.length < count) {
    let splitIndex = 0;
    let longest = -1;
    curves.forEach((curve, index) => {
      const length = distance(curve.p0, curve.c1) + distance(curve.c1, curve.c2) + distance(curve.c2, curve.p3);
      if (length > longest) {
        longest = length;
        splitIndex = index;
      }
    });
    const [left, right] = splitCubic(curves[splitIndex]!);
    curves.splice(splitIndex, 1, left, right);
  }
  return { curves, closed: contour.closed };
}

function splitCubic(curve: CubicCurve): readonly [CubicCurve, CubicCurve] {
  const a = lerpPoint(curve.p0, curve.c1, 0.5);
  const b = lerpPoint(curve.c1, curve.c2, 0.5);
  const c = lerpPoint(curve.c2, curve.p3, 0.5);
  const d = lerpPoint(a, b, 0.5);
  const e = lerpPoint(b, c, 0.5);
  const middle = lerpPoint(d, e, 0.5);
  return [{ p0: curve.p0, c1: a, c2: d, p3: middle }, { p0: middle, c1: e, c2: c, p3: curve.p3 }];
}

function alignCubicContour(source: CubicContour, target: CubicContour): CubicContour {
  if (!source.closed || !target.closed || source.curves.length !== target.curves.length) return source;
  const forward = bestCubicShift(source.curves, target.curves);
  const reversed = bestCubicShift(reverseCurves(source.curves), target.curves);
  return { curves: reversed.score < forward.score ? reversed.curves : forward.curves, closed: source.closed };
}

function bestCubicShift(source: readonly CubicCurve[], target: readonly CubicCurve[]): { curves: CubicCurve[]; score: number } {
  let bestShift = 0;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let shift = 0; shift < source.length; shift += 1) {
    let score = 0;
    for (let index = 0; index < source.length; index += 1) {
      score += squaredDistance(source[(index + shift) % source.length]!.p0, target[index]!.p0);
    }
    if (score < bestScore) {
      bestScore = score;
      bestShift = shift;
    }
  }
  return {
    curves: Array.from({ length: source.length }, (_, index) => source[(index + bestShift) % source.length]!),
    score: bestScore,
  };
}

function reverseCurves(curves: readonly CubicCurve[]): CubicCurve[] {
  return [...curves].reverse().map((curve) => ({ p0: curve.p3, c1: curve.c2, c2: curve.c1, p3: curve.p0 }));
}

function degenerateContour(center: Vec2): CubicContour {
  return { closed: true, curves: [{ p0: center, c1: center, c2: center, p3: center }] };
}

function contourCenter(contour: CubicContour): Vec2 {
  const points = contour.curves.map((curve) => curve.p0);
  return [
    points.reduce((sum, point) => sum + point[0], 0) / Math.max(1, points.length),
    points.reduce((sum, point) => sum + point[1], 0) / Math.max(1, points.length),
  ];
}

function contourArea(contour: CubicContour): number {
  const points = contour.curves.map((curve) => curve.p0);
  return points.reduce((area, point, index) => {
    const next = points[(index + 1) % points.length] ?? point;
    return area + point[0] * next[1] - next[0] * point[1];
  }, 0) / 2;
}

function reflect(point: Vec2, around: Vec2): Vec2 {
  return [around[0] * 2 - point[0], around[1] * 2 - point[1]];
}

function samePoint(left: Vec2, right: Vec2): boolean {
  return squaredDistance(left, right) <= 1e-16;
}

function distance(left: Vec2, right: Vec2): number {
  return Math.sqrt(squaredDistance(left, right));
}

function squaredDistance(left: Vec2, right: Vec2): number {
  const dx = left[0] - right[0];
  const dy = left[1] - right[1];
  return dx * dx + dy * dy;
}

function lerpPoint(left: Vec2, right: Vec2, amount: number): Vec2 {
  return [left[0] + (right[0] - left[0]) * amount, left[1] + (right[1] - left[1]) * amount];
}
