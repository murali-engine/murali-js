import { Tattva, type Vec2 } from "../../core/Tattva.ts";
import {
  resolveColorInput,
  themeColor,
  type ColorInput,
  type Theme,
} from "../../core/theme.ts";

export interface FireworkRocket {
  start: Vec2;
  end: Vec2;
  color: string;
  opacity: number;
}

export interface FireworkSpark {
  start: Vec2;
  end: Vec2;
  color: string;
  opacity: number;
  radius: number;
}

export interface FireworkFlash {
  center: Vec2;
  color: string;
  opacity: number;
  radius: number;
}

export interface FireworksFrame {
  rockets: FireworkRocket[];
  sparks: FireworkSpark[];
  flashes: FireworkFlash[];
}

export type FireworksLayout = "landscape" | "portrait" | "square";

export interface FireworksOptions {
  layout?: FireworksLayout;
  size?: readonly [number, number];
}

export interface FireworksViewport {
  readonly viewWidth: number;
  readonly viewHeight: number;
}

interface FireworksConfig {
  width: number;
  height: number;
  bursts: number;
  particles: number;
  cycleDuration: number;
  spread: number;
  gravity: number;
  trail: number;
  glow: number;
  speed: number;
  offset: number;
  seed: number;
  palette: string[];
}

const DEFAULT_PALETTE: readonly ColorInput[] = [
  themeColor("warning"),
  themeColor("negative"),
  themeColor("accent"),
  themeColor("accentAlt"),
  themeColor("positive"),
  themeColor("textPrimary"),
];

const DEFAULT_CONFIG: FireworksConfig = {
  width: 16,
  height: 9,
  bursts: 6,
  particles: 38,
  cycleDuration: 4.8,
  spread: 2.05,
  gravity: 1.45,
  trail: 0.13,
  glow: 0.85,
  speed: 1,
  offset: 0,
  seed: 1,
  palette: DEFAULT_PALETTE.map((color) => resolveColorInput(color)),
};

const DEFAULT_SIZE: Record<FireworksLayout, readonly [number, number]> = {
  landscape: [16, 9],
  portrait: [9, 16],
  square: [9, 9],
};

/** Deterministic looping fireworks for celebration overlays and world compositions. */
export class FireworksTattva extends Tattva {
  private readonly fireworksConfig: FireworksConfig = {
    ...DEFAULT_CONFIG,
    palette: [...DEFAULT_CONFIG.palette],
  };

  private customSize = false;
  private paletteInput: readonly ColorInput[] = [...DEFAULT_PALETTE];

  constructor(options: FireworksOptions = {}) {
    super();
    this.dynamicGeometry = true;
    this.revealKind = "none";
    this.depthMode("overlay");
    if (options.size) this.size(options.size);
    else this.applySize(DEFAULT_SIZE[options.layout ?? "landscape"]);
  }

  size([width, height]: readonly [number, number]): this {
    this.customSize = true;
    return this.applySize([width, height]);
  }

  /** Match any Scene, SceneView, or custom viewport without hard-coding its aspect ratio. */
  fit(viewport: FireworksViewport): this {
    return this.size([viewport.viewWidth, viewport.viewHeight]);
  }

  layout(value: FireworksLayout): this {
    if (!this.customSize) this.applySize(DEFAULT_SIZE[value]);
    return this;
  }

  landscape(): this {
    return this.layout("landscape");
  }

  portrait(): this {
    return this.layout("portrait");
  }

  square(): this {
    return this.layout("square");
  }

  private applySize([width, height]: readonly [number, number]): this {
    this.fireworksConfig.width = positive(width, "Fireworks width");
    this.fireworksConfig.height = positive(height, "Fireworks height");
    return this.refreshSize();
  }

  burstCount(value: number): this {
    this.fireworksConfig.bursts = integerAtLeast(value, 1, "Fireworks burst count");
    return this;
  }

  particlesPerBurst(value: number): this {
    this.fireworksConfig.particles = integerAtLeast(value, 3, "Fireworks particles per burst");
    return this;
  }

  cycleDuration(value: number): this {
    this.fireworksConfig.cycleDuration = positive(value, "Fireworks cycle duration");
    return this;
  }

  spread(value: number): this {
    this.fireworksConfig.spread = positive(value, "Fireworks spread");
    return this;
  }

  gravity(value: number): this {
    this.fireworksConfig.gravity = nonnegative(value, "Fireworks gravity");
    return this;
  }

  trail(value: number): this {
    this.fireworksConfig.trail = unit(value, "Fireworks trail");
    return this;
  }

  glow(value: number): this {
    this.fireworksConfig.glow = unit(value, "Fireworks glow");
    return this;
  }

  speed(value: number): this {
    this.fireworksConfig.speed = positive(value, "Fireworks speed");
    return this;
  }

  timeOffset(value: number): this {
    this.fireworksConfig.offset = finite(value, "Fireworks time offset");
    return this;
  }

  seed(value: number): this {
    this.fireworksConfig.seed = finite(value, "Fireworks seed");
    return this;
  }

  palette(colors: readonly ColorInput[]): this {
    if (colors.length === 0) throw new Error("Fireworks palette cannot be empty.");
    this.paletteInput = [...colors];
    this.fireworksConfig.palette = colors.map((color) => resolveColorInput(color, this.resolvedTheme));
    return this;
  }

  protected override onThemeResolved(theme: Theme): void {
    this.fireworksConfig.palette = this.paletteInput.map((color) => resolveColorInput(color, theme));
  }

  frameAt(time: number): FireworksFrame {
    return sampleFireworks(finite(time, "Fireworks sample time"), this.fireworksConfig);
  }

  override contentHTML(time = 0): string {
    const frame = this.frameAt(time);
    const { width, height, glow } = this.fireworksConfig;
    const filterId = `fireworks-glow-${this.id}`;
    const flashGradients = frame.flashes.map((flash, index) => {
      const gradientId = `${filterId}-flash-${index}`;
      return `<radialGradient id="${gradientId}"><stop offset="0%" stop-color="${flash.color}" stop-opacity="${flash.opacity * 0.9}"/><stop offset="22%" stop-color="${flash.color}" stop-opacity="${flash.opacity * 0.5}"/><stop offset="100%" stop-color="${flash.color}" stop-opacity="0"/></radialGradient>`;
    }).join("");
    const rockets = frame.rockets.map((rocket) =>
      `<line x1="${rocket.start[0]}" y1="${-rocket.start[1]}" x2="${rocket.end[0]}" y2="${-rocket.end[1]}" stroke="${rocket.color}" stroke-width="0.035" stroke-linecap="round" opacity="${rocket.opacity}" />`,
    ).join("");
    const sparks = frame.sparks.map((spark) => [
      `<line x1="${spark.start[0]}" y1="${-spark.start[1]}" x2="${spark.end[0]}" y2="${-spark.end[1]}" stroke="${spark.color}" stroke-width="${spark.radius * 1.25}" stroke-linecap="round" opacity="${spark.opacity * 0.72}" />`,
      `<circle cx="${spark.end[0]}" cy="${-spark.end[1]}" r="${spark.radius}" fill="${spark.color}" opacity="${spark.opacity}" />`,
    ].join("")).join("");
    const flashes = frame.flashes.map((flash, index) => [
      `<circle cx="${flash.center[0]}" cy="${-flash.center[1]}" r="${flash.radius * 4.25}" fill="url(#${filterId}-flash-${index})" />`,
      `<circle cx="${flash.center[0]}" cy="${-flash.center[1]}" r="${flash.radius * 0.55}" fill="${flash.color}" opacity="${flash.opacity * 0.78}" />`,
    ].join("")).join("");
    return [
      `<svg width="100%" height="100%" viewBox="${-width / 2} ${-height / 2} ${width} ${height}" overflow="hidden" xmlns="http://www.w3.org/2000/svg">`,
      "<defs>",
      `<filter id="${filterId}" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="${0.025 + glow * 0.045}" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`,
      flashGradients,
      "</defs>",
      `<g filter="url(#${filterId})">${rockets}${sparks}${flashes}</g>`,
      "</svg>",
    ].join("");
  }

  private refreshSize(): this {
    this.worldSize = {
      width: this.fireworksConfig.width,
      height: this.fireworksConfig.height,
    };
    return this;
  }
}

export function Fireworks(options: FireworksOptions = {}): FireworksTattva {
  return new FireworksTattva(options);
}

function sampleFireworks(time: number, config: FireworksConfig): FireworksFrame {
  const rockets: FireworkRocket[] = [];
  const sparks: FireworkSpark[] = [];
  const flashes: FireworkFlash[] = [];
  const cycleTime = (time * config.speed + config.offset) / config.cycleDuration;
  const launchEnd = 0.28;
  const ignitionOverlap = 0.075;
  const flashDuration = 0.045;
  for (let burst = 0; burst < config.bursts; burst += 1) {
    const raw = cycleTime - burst / config.bursts;
    const event = Math.floor(raw);
    const phase = raw - event;
    const key = config.seed + burst * 97.13 + event * 193.73;
    const centerX = (hash01(key + 1.3) - 0.5) * config.width * 0.78;
    const centerY = config.height * (0.02 + hash01(key + 2.7) * 0.31);
    const launchX = centerX + (hash01(key + 4.1) - 0.5) * config.width * 0.12;
    const color = config.palette[Math.floor(hash01(key + 5.9) * config.palette.length)] ?? "#ffffff";
    if (phase < launchEnd) {
      const progress = phase / launchEnd;
      const eased = 1 - (1 - progress) ** 2;
      const end: Vec2 = [
        launchX + (centerX - launchX) * eased + Math.sin(progress * Math.PI * 3) * 0.035,
        -config.height / 2 - 0.25 + (centerY + config.height / 2 + 0.25) * eased,
      ];
      const previous = Math.max(0, progress - 0.16);
      const previousEase = 1 - (1 - previous) ** 2;
      const uncappedStart: Vec2 = [
        launchX + (centerX - launchX) * previousEase,
        -config.height / 2 - 0.25 + (centerY + config.height / 2 + 0.25) * previousEase,
      ];
      rockets.push({
        start: cappedTrailStart(uncappedStart, end, 0.72),
        end,
        color,
        opacity: Math.min(1, progress * 4),
      });
      continue;
    }
    const progress = (phase - launchEnd) / (1 - launchEnd);
    if (progress < ignitionOverlap) {
      const collapse = smoothstep(progress / ignitionOverlap);
      const terminalPrevious = 0.84;
      const terminalPreviousEase = 1 - (1 - terminalPrevious) ** 2;
      const terminalStart: Vec2 = cappedTrailStart([
        launchX + (centerX - launchX) * terminalPreviousEase,
        -config.height / 2 - 0.25
          + (centerY + config.height / 2 + 0.25) * terminalPreviousEase,
      ], [centerX, centerY], 0.72);
      rockets.push({
        start: [
          terminalStart[0] + (centerX - terminalStart[0]) * collapse,
          terminalStart[1] + (centerY - terminalStart[1]) * collapse,
        ],
        end: [centerX, centerY],
        color,
        opacity: (1 - collapse) ** 1.35,
      });
    }
    const travel = 1 - (1 - progress) ** 1.6;
    const previousTravel = 1 - (1 - Math.max(0, progress - config.trail)) ** 1.6;
    const opacity = Math.max(0, (1 - progress) ** 1.25 * Math.min(1, progress * 8));
    const flashFade = Math.max(0, 1 - progress / flashDuration);
    const flashOpacity = flashFade ** 3;
    if (flashOpacity > 0) {
      flashes.push({
        center: [centerX, centerY],
        color,
        opacity: flashOpacity,
        radius: 0.022 + progress * 0.08,
      });
    }
    for (let particle = 0; particle < config.particles; particle += 1) {
      const particleKey = key + particle * 31.719;
      const angle = particle / config.particles * Math.PI * 2
        + (hash01(particleKey + 0.3) - 0.5) * 0.22;
      const speed = config.spread * (0.58 + hash01(particleKey + 1.9) * 0.72);
      const drift = (hash01(particleKey + 3.7) - 0.5) * 0.32 * progress;
      const positionAt = (distance: number, p: number): Vec2 => [
        centerX + Math.cos(angle) * speed * distance + drift,
        centerY + Math.sin(angle) * speed * distance - config.gravity * p * p,
      ];
      const sparkColor = config.palette[
        Math.floor(hash01(particleKey + 6.1) * config.palette.length)
      ] ?? color;
      sparks.push({
        start: positionAt(previousTravel, Math.max(0, progress - config.trail)),
        end: positionAt(travel, progress),
        color: sparkColor,
        opacity,
        radius: 0.018 + hash01(particleKey + 8.3) * 0.026,
      });
    }
  }
  return { rockets, sparks, flashes };
}

function smoothstep(value: number): number {
  const clamped = Math.max(0, Math.min(1, value));
  return clamped * clamped * (3 - 2 * clamped);
}

function hash01(value: number): number {
  const sine = Math.sin(value * 12.9898) * 43758.5453;
  return sine - Math.floor(sine);
}

function cappedTrailStart(start: Vec2, end: Vec2, maximumLength: number): Vec2 {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const length = Math.hypot(dx, dy);
  if (length <= maximumLength) return start;
  const scale = maximumLength / length;
  return [end[0] - dx * scale, end[1] - dy * scale];
}

function finite(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite; received ${value}.`);
  return value;
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

function unit(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${label} must be between 0 and 1; received ${value}.`);
  }
  return value;
}

function integerAtLeast(value: number, minimum: number, label: string): number {
  if (!Number.isInteger(value) || value < minimum) {
    throw new Error(`${label} must be an integer of at least ${minimum}; received ${value}.`);
  }
  return value;
}
