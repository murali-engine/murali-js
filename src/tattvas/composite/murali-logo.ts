import type { ColorInput } from "../../core/theme.ts";
import { Timeline } from "../../core/Timeline.ts";
import { GroupTattva } from "../layout/Group.ts";
import { Ellipse, type EllipseTattva } from "../primitives/shapes.ts";

export type MuraliLogoColors = readonly [
  blue: ColorInput,
  violet: ColorInput,
  coral: ColorInput,
];

export const MURALI_LOGO_COLORS = Object.freeze([
  "#2563eb",
  "#7c3aed",
  "#ff6b5f",
]) satisfies MuraliLogoColors;

export const MURALI_LOGO_PALETTES = Object.freeze({
  primary: MURALI_LOGO_COLORS,
  candyPop: Object.freeze([
    "#54b8f3",
    "#fae561",
    "#e065b2",
  ]) satisfies MuraliLogoColors,
});

export interface MuraliLogoMarkOptions {
  /** Overall width in world units. */
  readonly width?: number;
  /** Flat fills for the left, middle, and right ovals. */
  readonly colors?: MuraliLogoColors;
}

export interface MuraliLogoSequenceOptions {
  /** Total length of one complete, seamless logo gesture. Defaults to 6.4 seconds. */
  readonly duration?: number;
}

const OVAL_RADIUS_X = 0.52;
const OVAL_RADIUS_Y = 0.82;

/** Murali's canonical three-touching-oval logo mark. */
export class MuraliLogoMarkTattva extends GroupTattva {
  readonly ovals: readonly [EllipseTattva, EllipseTattva, EllipseTattva];

  constructor(options: MuraliLogoMarkOptions = {}) {
    const colors = options.colors ?? MURALI_LOGO_COLORS;
    const ovals = colors.map((color) =>
      Ellipse().radii([OVAL_RADIUS_X, OVAL_RADIUS_Y]).fill(color),
    ) as unknown as [EllipseTattva, EllipseTattva, EllipseTattva];
    super(ovals);
    this.ovals = ovals;
    this.arrange("horizontal", 0);
    this.width(options.width ?? 4.8);
  }

  /** Resize while preserving the oval proportions and spacing. */
  width(value: number): this {
    const width = positive(value, "MuraliLogoMark width");
    this.recomputeBounds();
    return this.scale(width / (this.worldSize?.width ?? width));
  }
}

export function MuraliLogoMark(options: MuraliLogoMarkOptions = {}): MuraliLogoMarkTattva {
  return new MuraliLogoMarkTattva(options);
}

/**
 * A reusable one-oval → three-oval logo → one-oval animation.
 *
 * The side ovals begin hidden behind the middle oval. The sequence breathes,
 * splits, compresses on contact, separates, settles into the exact authored
 * logo spacing, and returns to its starting state so it can loop cleanly.
 */
export function MuraliLogoSequence(
  mark: MuraliLogoMarkTattva,
  options: MuraliLogoSequenceOptions = {},
): Timeline {
  const duration = positive(options.duration ?? 6.4, "MuraliLogoSequence duration");
  const at = (progress: number): number => progress * duration;
  const forDuration = (progress: number): number => progress * duration;
  const [left, middle, right] = mark.ovals;
  const leftRest = left.initialState.x;
  const rightRest = right.initialState.x;
  const sideRest = Math.max(Math.abs(leftRest), Math.abs(rightRest));
  const splitDistance = sideRest * 1.28;
  const squeezedDistance = sideRest * 0.72;
  const farDistance = sideRest * 1.38;

  // The colored sides always exist. Their smaller geometry sits completely
  // behind the middle oval until horizontal motion reveals it.
  left.at([0, 0, 0]).scale3D([0.72, 1, 1]).opacity(1).layer(1);
  middle.layer(2);
  right.at([0, 0, 0]).scale3D([0.72, 1, 1]).opacity(1).layer(1);

  const timeline = new Timeline();

  // A quiet first breath from the single middle oval.
  timeline.animate(middle).at(at(0)).duration(forDuration(0.07)).ease("outCubic")
    .scale3DTo([1.18, 1, 1]);
  timeline.animate(middle).at(at(0.07)).duration(forDuration(0.09)).ease("inOutCubic")
    .scale3DTo([1, 1, 1]);

  // The next pulse reveals two copies moving out from behind the first oval.
  timeline.animate(middle).at(at(0.20)).duration(forDuration(0.05)).ease("outCubic")
    .scale3DTo([1.14, 1, 1]);
  timeline.animate(middle).at(at(0.25)).duration(forDuration(0.07)).ease("inOutCubic")
    .scale3DTo([1, 1, 1]);
  timeline.animate(left).at(at(0.22)).duration(forDuration(0.12)).ease("outCubic")
    .to({ x: -splitDistance, scaleX: 1 });
  timeline.animate(right).at(at(0.22)).duration(forDuration(0.12)).ease("outCubic")
    .to({ x: splitDistance, scaleX: 1 });

  // One uninterrupted inward move passes through normal-width contact halfway
  // through. Width compression begins at that midpoint without resetting the
  // horizontal velocity, avoiding a visible pause at the touch point.
  timeline.animate(left).at(at(0.34)).duration(forDuration(0.13)).ease("inOutCubic")
    .to({ x: -squeezedDistance });
  timeline.animate(right).at(at(0.34)).duration(forDuration(0.13)).ease("inOutCubic")
    .to({ x: squeezedDistance });
  timeline.animate(left).at(at(0.405)).duration(forDuration(0.065)).ease("inCubic")
    .to({ scaleX: 0.72 });
  timeline.animate(middle).at(at(0.405)).duration(forDuration(0.065)).ease("inCubic")
    .scale3DTo([0.72, 1, 1]);
  timeline.animate(right).at(at(0.405)).duration(forDuration(0.065)).ease("inCubic")
    .to({ scaleX: 0.72 });

  // Release the compression, travel apart, then settle at the logo tangencies.
  timeline.animate(left).at(at(0.50)).duration(forDuration(0.09)).ease("outCubic")
    .to({ x: -farDistance, scaleX: 1.04 });
  timeline.animate(middle).at(at(0.50)).duration(forDuration(0.09)).ease("outCubic")
    .scale3DTo([1.04, 1, 1]);
  timeline.animate(right).at(at(0.50)).duration(forDuration(0.09)).ease("outCubic")
    .to({ x: farDistance, scaleX: 1.04 });
  timeline.animate(left).at(at(0.62)).duration(forDuration(0.11)).ease("inOutCubic")
    .to({ x: leftRest, scaleX: 1 });
  timeline.animate(middle).at(at(0.62)).duration(forDuration(0.11)).ease("inOutCubic")
    .scale3DTo([1, 1, 1]);
  timeline.animate(right).at(at(0.62)).duration(forDuration(0.11)).ease("inOutCubic")
    .to({ x: rightRest, scaleX: 1 });

  // A final outward pulse folds both side ovals back into the single origin.
  timeline.animate(left).at(at(0.81)).duration(forDuration(0.05)).ease("outCubic")
    .to({ x: leftRest * 1.18, scaleX: 0.92 });
  timeline.animate(middle).at(at(0.81)).duration(forDuration(0.05)).ease("outCubic")
    .scale3DTo([1.12, 1, 1]);
  timeline.animate(right).at(at(0.81)).duration(forDuration(0.05)).ease("outCubic")
    .to({ x: rightRest * 1.18, scaleX: 0.92 });
  timeline.animate(left).at(at(0.86)).duration(forDuration(0.09)).ease("inOutCubic")
    .to({ x: 0, scaleX: 0.72 });
  timeline.animate(middle).at(at(0.86)).duration(forDuration(0.09)).ease("inOutCubic")
    .scale3DTo([1.18, 1, 1]);
  timeline.animate(right).at(at(0.86)).duration(forDuration(0.09)).ease("inOutCubic")
    .to({ x: 0, scaleX: 0.72 });
  timeline.animate(middle).at(at(0.95)).duration(forDuration(0.05)).ease("inOutCubic")
    .scale3DTo([1, 1, 1]);

  return timeline;
}

function positive(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive finite number; received ${value}.`);
  }
  return value;
}
