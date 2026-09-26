import * as THREE from "three";
import { easeInOutCubic } from "../core/easing.ts";
import { ThreeTattva } from "../core/ThreeTattva.ts";
import { Tattva, type Vec2, type Vec3 } from "../core/Tattva.ts";
import { GOLD_C, resolveColor } from "../core/palette.ts";

export const MAP_HALF_WIDTH = 5.9;
export const MAP_HALF_HEIGHT = 3.5;
export const MAP_TRANSITION_START = 2.8;
export const MAP_TRANSITION_DURATION = 4.8;
export const MAP_FOOTER_START = MAP_TRANSITION_START + 5 * MAP_TRANSITION_DURATION - 1.2;

export const PROJECTION_NAMES = [
  "Equirectangular",
  "Sinusoidal",
  "Mollweide",
  "Hammer",
  "Mercator",
  "Equirectangular",
] as const;

export type ProjectionName = (typeof PROJECTION_NAMES)[number];

export interface ProjectionBlend {
  from: ProjectionName;
  to: ProjectionName;
  mix: number;
}

const CAPTION_START = 1.55;
const CAPTION_DURATION = 0.65;

/** The projection pair and mix at `time`. This replaces a callback that mutates the blend. */
export function projectionBlendAt(time: number): ProjectionBlend {
  if (time < MAP_TRANSITION_START) {
    return { from: "Equirectangular", to: "Equirectangular", mix: 0 };
  }
  const elapsed = time - MAP_TRANSITION_START;
  const last = PROJECTION_NAMES.length - 2;
  const index = Math.min(last, Math.floor(elapsed / MAP_TRANSITION_DURATION));
  const local = Math.min(1, Math.max(0, (elapsed - index * MAP_TRANSITION_DURATION) / MAP_TRANSITION_DURATION));
  return {
    from: PROJECTION_NAMES[index] ?? "Equirectangular",
    to: PROJECTION_NAMES[index + 1] ?? "Equirectangular",
    mix: easeInOutCubic(local),
  };
}

export function projectLonLat(blend: ProjectionBlend, longitude: number, latitude: number): Vec2 {
  const start = projectPoint(blend.from, longitude, latitude);
  const end = projectPoint(blend.to, longitude, latitude);
  const mix = Math.max(0, Math.min(1, blend.mix));
  return [start[0] + (end[0] - start[0]) * mix, start[1] + (end[1] - start[1]) * mix];
}

/** Eight Newton iterations, matching Murali's Mollweide solve. */
export function solveMollweideTheta(latitude: number): number {
  if (Math.PI / 2 - Math.abs(latitude) < 1e-4) return Math.sign(latitude) * Math.PI / 2;
  let theta = latitude;
  for (let step = 0; step < 8; step += 1) {
    const numerator = 2 * theta + Math.sin(2 * theta) - Math.PI * Math.sin(latitude);
    const denominator = Math.max(1e-4, 2 + 2 * Math.cos(2 * theta));
    theta -= numerator / denominator;
  }
  return theta;
}

/** A point on the unit sphere's parameter domain, placed by the projection at `time`. */
export function mapPoint(u: number, v: number, time = 0): Vec3 {
  const latitude = Math.PI / 2 - u;
  const longitude = v - Math.PI;
  const projected = projectLonLat(projectionBlendAt(time), longitude, latitude);
  return [projected[0], projected[1], 0];
}

export function projectionCaption(time: number): string {
  const blend = projectionBlendAt(time);
  if (time < MAP_TRANSITION_START) return blend.from;
  return `${blend.from} to ${blend.to}`;
}

/** The caption as it reads at `time`, including the opening type-on. */
export function visibleProjectionCaption(time: number): string {
  const text = projectionCaption(time);
  if (time < CAPTION_START) return "";
  if (time < MAP_TRANSITION_START) {
    const progress = Math.min(1, (time - CAPTION_START) / CAPTION_DURATION);
    return text.slice(0, Math.floor(text.length * progress));
  }
  return text;
}

/** Latitude and longitude lines for the projection at the sampled scene time. */
export function MapGraticule(): ThreeTattva {
  return new MapGraticuleTattva();
}

class MapGraticuleTattva extends ThreeTattva {
  private sampleTime = 0;

  constructor() {
    super({
      setup({ scene }) {
        const lines = new THREE.LineSegments(
          new THREE.BufferGeometry(),
          new THREE.LineBasicMaterial({
            color: new THREE.Color(0.78, 0.92, 1),
            transparent: true,
            opacity: 0.22,
          }),
        );
        lines.name = "graticule";
        scene.add(lines);
      },
      update: ({ scene }) => {
        const lines = scene.getObjectByName("graticule");
        if (!(lines instanceof THREE.LineSegments)) return;
        lines.geometry.dispose();
        lines.geometry = graticuleGeometry(projectionBlendAt(this.sampleTime));
      },
    });
  }

  override influenceState(time: number): void {
    this.sampleTime = time;
  }
}

/** The projection name. The words are a function of scene time, so a seek does not depend on a text replacement. */
export function ProjectionCaption(): Tattva {
  return new ProjectionCaptionTattva();
}

class ProjectionCaptionTattva extends Tattva {
  constructor() {
    super({
      css: {
        color: resolveColor(GOLD_C),
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        fontWeight: "700",
        letterSpacing: "-0.04em",
        whiteSpace: "pre",
        textAlign: "center",
        lineHeight: "1",
      },
    });
    this.dynamicGeometry = true;
    this.revealKind = "none";
    this.setInitial({ color: resolveColor(GOLD_C) });
    this.sync("");
  }

  override contentHTML(time = 0): string {
    const text = visibleProjectionCaption(time);
    this.sync(text);
    return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  }

  private sync(text: string): void {
    const height = 0.24;
    this.worldFontSize = height;
    this.worldSize = {
      width: Math.max(height * 0.6, Math.max(1, text.length) * height * 0.58),
      height,
    };
  }
}

function projectPoint(kind: ProjectionName, longitude: number, latitude: number): Vec2 {
  let x = 0;
  let y = 0;
  if (kind === "Equirectangular") {
    x = longitude / Math.PI;
    y = latitude / (Math.PI / 2);
  } else if (kind === "Sinusoidal") {
    x = (longitude * Math.cos(latitude)) / Math.PI;
    y = latitude / (Math.PI / 2);
  } else if (kind === "Mollweide") {
    const theta = solveMollweideTheta(latitude);
    x = (longitude * Math.cos(theta)) / Math.PI;
    y = Math.sin(theta);
  } else if (kind === "Hammer") {
    const denominator = Math.max(1e-4, Math.sqrt(1 + Math.cos(latitude) * Math.cos(longitude * 0.5)));
    x = (2 * Math.SQRT2 * Math.cos(latitude) * Math.sin(longitude * 0.5)) / denominator / (2 * Math.SQRT2);
    y = (Math.SQRT2 * Math.sin(latitude)) / denominator / Math.SQRT2;
  } else {
    const clamped = Math.max(-80 * Math.PI / 180, Math.min(80 * Math.PI / 180, latitude));
    const mercator = Math.log(Math.tan(Math.PI / 4 + clamped * 0.5));
    const limit = Math.log(Math.tan(Math.PI / 4 + (80 * Math.PI / 180) * 0.5));
    x = longitude / Math.PI;
    y = mercator / limit;
  }
  return [x * MAP_HALF_WIDTH, y * MAP_HALF_HEIGHT];
}

function graticuleGeometry(blend: ProjectionBlend): THREE.BufferGeometry {
  const positions: number[] = [];
  const push = (longitudeDegrees: number, latitudeDegrees: number, previous: Vec2 | null): Vec2 => {
    const point = projectLonLat(
      blend,
      longitudeDegrees * Math.PI / 180,
      latitudeDegrees * Math.PI / 180,
    );
    if (previous) positions.push(previous[0], previous[1], 0.04, point[0], point[1], 0.04);
    return point;
  };
  for (const latitude of [-60, -30, 0, 30, 60]) {
    let previous: Vec2 | null = null;
    for (let step = 0; step <= 160; step += 1) {
      previous = push(-180 + step * 360 / 160, latitude, previous);
    }
  }
  for (const longitude of [-150, -90, -30, 30, 90, 150]) {
    let previous: Vec2 | null = null;
    for (let step = 0; step <= 120; step += 1) {
      previous = push(longitude, -85 + step * 170 / 120, previous);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}
