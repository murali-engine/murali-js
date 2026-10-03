import type { ColorInput } from "../../core/theme.ts";
import { Timeline } from "../../core/Timeline.ts";
import type { Tattva, TattvaState } from "../../core/Tattva.ts";
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

/** Canonical opaque backdrop shared with the Murali documentation hero. */
export const MURALI_LOGO_BACKGROUND = "radial-gradient(circle at 78% 18%, rgb(14 108 112 / 72%), transparent 30%), linear-gradient(125deg, #0b233f 0%, #123d59 58%, #0e6c70 100%)";

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

export interface MuraliLogoSwellOptions {
  /** Length of one rest, swell, and settle phrase. Defaults to 6 seconds. */
  readonly duration?: number;
}

/** A seek-safe updater. The pose is a function of scene time, not of earlier samples. */
export interface MuraliLogoSwellMotion {
  readonly duration: number;
  readonly update: (time: number, states: Map<Tattva<any>, TattvaState>) => void;
}

const OVAL_RADIUS_X = 0.48;
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

/**
 * Disturb the settled three-oval mark, then let it ease home.
 *
 * Left follows a low swell, the middle a smaller later nudge, and the right
 * an earlier swell. Height grows from the shared baseline. Width becomes
 * `1 / sqrt(height)` and the centers close so the ovals stay tangent instead
 * of turning into separated needles. Each height eases in and out, then
 * chases that curve with an underdamped spring, so the way down passes rest
 * before it settles. A shared lean of less than two degrees follows the
 * swell. Quiet time keeps a 2.5% breath at a different phase on each oval.
 * The phrase starts and ends on that breath, so a loop has no seam.
 */
export function MuraliLogoSwell(
  mark: MuraliLogoMarkTattva,
  options: MuraliLogoSwellOptions = {},
): MuraliLogoSwellMotion {
  const duration = positive(options.duration ?? SWELL_DURATION, "MuraliLogoSwell duration");
  const track = swellTrack();
  const halves = mark.ovals.map((oval) => ovalHalfExtents(oval)) as [
    OvalHalfExtents,
    OvalHalfExtents,
    OvalHalfExtents,
  ];
  const restLean = mark.initialState.rotationZ;

  return {
    duration,
    update(time, states) {
      const pose = poseAt(track, time, duration);
      const scaleX = pose.height.map((height, index) => halves[index].restScaleX / Math.sqrt(height)) as [
        number,
        number,
        number,
      ];
      const centers = tangentCenters(halves.map((half) => half.width) as [number, number, number], scaleX);

      mark.ovals.forEach((oval, index) => {
        const state = states.get(oval);
        if (!state) return;
        const height = pose.height[index];
        state.scaleY = halves[index].restScaleY * height;
        state.scaleX = scaleX[index];
        // Scale is about the oval center. Shift the center up by the growth
        // below it so the baseline stays pinned.
        state.y = halves[index].restY + halves[index].height * (state.scaleY - halves[index].restScaleY);
        state.x = centers[index];
      });

      const markState = states.get(mark);
      if (markState) markState.rotationZ = restLean + pose.lean;
    },
  };
}

/** Reference phrase length. Other durations play this same shape faster or slower. */
const SWELL_DURATION = 6;
const SWELL_STEP = 1 / 240;
/** Two breath periods, so the recorded cycle opens on the same state it closes on. */
const SWELL_LEAD = 6;
const BREATH_AMPLITUDE = 0.025;
const BREATH_PERIOD = 3;
const HEIGHT_OMEGA = 11;
const HEIGHT_ZETA = 0.42;
const LEAN_OMEGA = 7;
const LEAN_ZETA = 0.9;
const LEAN_DEGREES = 1.35;

interface BandPhrase {
  /** Reference time when the rise finishes and any hold begins. */
  readonly riseEnd: number;
  readonly attack: number;
  /** Time spent near full height before the release. Zero is a transient. */
  readonly hold: number;
  readonly release: number;
  /** Height added at full drive, before the spring. 1 is rest height. */
  readonly amplitude: number;
  readonly breathPhase: number;
}

/** Left is the low swell, middle the later nudge, right the earlier swell. */
const SWELL_BANDS = [
  { riseEnd: 2.2, attack: 0.85, hold: 0.4, release: 0.62, amplitude: 0.25, breathPhase: 0.4 },
  { riseEnd: 2.82, attack: 0.55, hold: 0.12, release: 0.48, amplitude: 0.115, breathPhase: 2.4 },
  { riseEnd: 1.7, attack: 0.62, hold: 0.05, release: 0.5, amplitude: 0.16, breathPhase: 4.5 },
] as const satisfies readonly BandPhrase[];

interface OvalHalfExtents {
  readonly width: number;
  readonly height: number;
  readonly restY: number;
  readonly restScaleX: number;
  readonly restScaleY: number;
}

interface SpringState {
  value: number;
  velocity: number;
}

interface SwellTrack {
  readonly step: number;
  readonly height: readonly [Float64Array, Float64Array, Float64Array];
  readonly lean: Float64Array;
}

interface SwellPose {
  readonly height: readonly [number, number, number];
  readonly lean: number;
}

function ovalHalfExtents(oval: EllipseTattva): OvalHalfExtents {
  return {
    width: (oval.worldSize?.width ?? 0) / 2,
    height: (oval.worldSize?.height ?? 0) / 2,
    restY: oval.initialState.y,
    restScaleX: oval.initialState.scaleX,
    restScaleY: oval.initialState.scaleY,
  };
}

let cachedSwellTrack: SwellTrack | undefined;

function swellTrack(): SwellTrack {
  if (cachedSwellTrack) return cachedSwellTrack;
  const count = Math.round(SWELL_DURATION / SWELL_STEP);
  const height = [0, 1, 2].map(() => new Float64Array(count + 1)) as [
    Float64Array,
    Float64Array,
    Float64Array,
  ];
  const lean = new Float64Array(count + 1);
  const bands = SWELL_BANDS.map((band) => ({
    value: bandTarget(band, -SWELL_LEAD),
    velocity: 0,
  }));
  let leanState: SpringState = { value: leanTarget(-SWELL_LEAD), velocity: 0 };
  const leadSteps = Math.round(SWELL_LEAD / SWELL_STEP);

  for (let step = 0; step < leadSteps; step += 1) {
    advancePhrase(bands, leanState, -SWELL_LEAD + step * SWELL_STEP);
  }

  for (let index = 0; index <= count; index += 1) {
    height.forEach((channel, band) => {
      channel[index] = bands[band].value;
    });
    lean[index] = leanState.value;
    if (index === count) break;
    advancePhrase(bands, leanState, index * SWELL_STEP);
  }

  cachedSwellTrack = { step: SWELL_STEP, height, lean };
  return cachedSwellTrack;
}

function advancePhrase(bands: readonly SpringState[], leanState: SpringState, time: number): void {
  bands.forEach((state, index) => {
    const band = SWELL_BANDS[index];
    if (!band) return;
    stepSpring(state, bandTarget(band, time), HEIGHT_OMEGA, HEIGHT_ZETA);
  });
  stepSpring(leanState, leanTarget(time), LEAN_OMEGA, LEAN_ZETA);
}

function poseAt(track: SwellTrack, time: number, duration: number): SwellPose {
  const referenceTime = (Math.min(duration, Math.max(0, time)) / duration) * SWELL_DURATION;
  return {
    height: track.height.map((channel) => sampleTrack(channel, referenceTime, track.step)) as [
      number,
      number,
      number,
    ],
    lean: sampleTrack(track.lean, referenceTime, track.step),
  };
}

function sampleTrack(channel: Float64Array, time: number, step: number): number {
  const last = channel.length - 1;
  const position = Math.min(last, Math.max(0, time / step));
  const index = Math.floor(position);
  const next = Math.min(last, index + 1);
  const mix = position - index;
  return channel[index] * (1 - mix) + channel[next] * mix;
}

function bandTarget(band: BandPhrase, time: number): number {
  return 1
    + breath(time, band.breathPhase)
    + band.amplitude * held(time, band.riseEnd, band.attack, band.hold, band.release);
}

function leanTarget(time: number): number {
  // Wider than the low swell, so the lean reads as one slow move rather than a twitch.
  return LEAN_DEGREES * held(time, 2.3, 1.1, 0.15, 1.05);
}

function breath(time: number, phase: number): number {
  return BREATH_AMPLITUDE * Math.sin((Math.PI * 2 * time) / BREATH_PERIOD + phase);
}

/**
 * Quintic smootherstep. Value, slope, and acceleration are zero at both ends,
 * so a hold can begin and end without a corner.
 */
function smootherstep(progress: number): number {
  const u = Math.min(1, Math.max(0, progress));
  return u * u * u * (u * (u * 6 - 15) + 10);
}

/** Rise, optional hold, then release. Every joint is smooth through acceleration. */
function held(time: number, riseEnd: number, attack: number, hold: number, release: number): number {
  const start = riseEnd - attack;
  const fallStart = riseEnd + hold;
  const end = fallStart + release;
  if (time <= start || time >= end) return 0;
  if (time < riseEnd) return smootherstep((time - start) / attack);
  if (time < fallStart) return 1;
  return 1 - smootherstep((time - fallStart) / release);
}

function stepSpring(state: SpringState, target: number, omega: number, zeta: number): void {
  const acceleration = -omega * omega * (state.value - target) - 2 * zeta * omega * state.velocity;
  state.velocity += acceleration * SWELL_STEP;
  state.value += state.velocity * SWELL_STEP;
}

/**
 * Centers of three ovals that stay tangent and centered as their widths change.
 * `halves` are the unscaled half-widths and `scaleX` is the current width scale.
 */
function tangentCenters(
  halves: readonly [number, number, number],
  scaleX: readonly [number, number, number],
): [number, number, number] {
  const extents = halves.map((half, index) => half * scaleX[index]) as [number, number, number];
  const total = (extents[0] + extents[1] + extents[2]) * 2;
  const left = -total / 2 + extents[0];
  const middle = left + extents[0] + extents[1];
  const right = middle + extents[1] + extents[2];
  return [left, middle, right];
}

function positive(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive finite number; received ${value}.`);
  }
  return value;
}
