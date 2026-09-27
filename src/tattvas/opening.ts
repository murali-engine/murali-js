import * as THREE from "three";
import type { Scene } from "../core/Scene.ts";
import { ThreeTattva } from "../core/ThreeTattva.ts";
import type { TattvaState, Vec3 } from "../core/Tattva.ts";
import type { Timeline } from "../core/Timeline.ts";
import { Label, type LabelTattva } from "./shapes.ts";

export type OpeningTexture = "whiteMarble" | "blackMarble" | "plain";

export interface OpeningStyle {
  letterHeight: number;
  letterDepth: number;
  letterGap: number;
  spaceWidth: number;
  finalY: number;
  frontColor: string;
  backColor: string;
  sideColor: string;
  particleCount: number;
  particleSize: number;
  particlePalette: readonly string[];
  particleDistance: number;
  particleRise: number;
  particleCurl: number;
  taglineHeight: number;
  taglineColor: string;
  fontFamily: string;
}

export interface OpeningTiming {
  introDelay: number;
  landingStagger: number;
  landingDuration: number;
  bounceUpDuration: number;
  bounceDownDuration: number;
  settledHold: number;
  shakeDuration: number;
  shakeBeats: number;
  particleScatterDuration: number;
  taglineRevealDelay: number;
  dissolveDuration: number;
  endHold: number;
}

export interface OpeningState extends TattvaState {
  openingTime: number;
}

export interface OpeningAnimationOptions {
  at?: number;
}

const DEFAULT_STYLE: OpeningStyle = {
  letterHeight: 2.4,
  letterDepth: 0.95,
  letterGap: 0.34,
  spaceWidth: 0.85,
  finalY: -0.42,
  frontColor: "#fff9e8",
  backColor: "#948c7d",
  sideColor: "#6b6357",
  particleCount: 700,
  particleSize: 0.028,
  particlePalette: ["#2ed1c7", "#5294ff", "#eb6190", "#ffb838", "#7adc61", "#ff6666"],
  particleDistance: 4.8,
  particleRise: 2.35,
  particleCurl: 1,
  taglineHeight: 0.48,
  taglineColor: "#f2f7fc",
  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
};

const DEFAULT_TIMING: OpeningTiming = {
  introDelay: 0.4,
  landingStagger: 0.3,
  landingDuration: 1.38,
  bounceUpDuration: 0.18,
  bounceDownDuration: 0.24,
  settledHold: 0.55,
  shakeDuration: 0.97,
  shakeBeats: 11,
  particleScatterDuration: 1.5,
  taglineRevealDelay: 0.72,
  dissolveDuration: 0.82,
  endHold: 0.59,
};

interface LetterSlot {
  character: string;
  index: number;
  x: number;
  width: number;
}

interface RuntimeLetter {
  solid: THREE.Group;
  particles: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  baseParticles: Float32Array;
  scatterVectors: Float32Array;
  slot: LetterSlot;
}

interface OpeningRuntime {
  letters: RuntimeLetter[];
}

const GLYPH_ALPHA_TEST = 0.08;
const GLYPH_ALPHA_THRESHOLD = Math.round(GLYPH_ALPHA_TEST * 255);

/** Configurable 3D title opening with deterministic landing, shake, particle dissolve, and tagline reveal. */
export function Opening(title: string, tagline: string): OpeningBuilder {
  return new OpeningBuilder(title, tagline);
}

export class OpeningBuilder {
  private styleValue: OpeningStyle = { ...DEFAULT_STYLE, particlePalette: [...DEFAULT_STYLE.particlePalette] };
  private timingValue: OpeningTiming = { ...DEFAULT_TIMING };
  private textureValue: OpeningTexture = "whiteMarble";

  constructor(
    readonly title: string,
    readonly tagline: string,
  ) {}

  style(value: Partial<OpeningStyle>): this {
    this.styleValue = {
      ...this.styleValue,
      ...value,
      particlePalette: value.particlePalette ? [...value.particlePalette] : this.styleValue.particlePalette,
    };
    return this;
  }

  timing(value: Partial<OpeningTiming>): this {
    this.timingValue = { ...this.timingValue, ...value };
    return this;
  }

  texture(value: OpeningTexture): this {
    this.textureValue = value;
    return this;
  }

  fontFamily(value: string): this {
    this.styleValue = { ...this.styleValue, fontFamily: value };
    return this;
  }

  duration(): number {
    this.validate();
    return openingDuration(letterSlots(this.title, this.styleValue).length, this.timingValue);
  }

  addTo(scene: Scene, origin: Vec3 = [0, 0, 0]): OpeningComposition {
    this.validate();
    const style = { ...this.styleValue, particlePalette: [...this.styleValue.particlePalette] };
    const timing = { ...this.timingValue };
    const visual = scene.add(new OpeningTattva(this.title, style, timing, this.textureValue), { at: origin });
    const tagline = scene.add(
      Label(this.tagline)
        .height(style.taglineHeight)
        .color(style.taglineColor)
        .css({ fontFamily: style.fontFamily, fontWeight: "600", letterSpacing: "0.06em" })
        .depthMode("overlay"),
      { at: origin },
    );
    return new OpeningComposition(visual, tagline, timing, letterSlots(this.title, style).length);
  }

  private validate(): void {
    validateTitle(this.title);
    positive(this.styleValue.letterHeight, "Opening letterHeight");
    positive(this.styleValue.letterDepth, "Opening letterDepth");
    nonnegative(this.styleValue.letterGap, "Opening letterGap");
    nonnegative(this.styleValue.spaceWidth, "Opening spaceWidth");
    finite(this.styleValue.finalY, "Opening finalY");
    integer(this.styleValue.particleCount, "Opening particleCount");
    positive(this.styleValue.particleSize, "Opening particleSize");
    nonnegative(this.styleValue.particleDistance, "Opening particleDistance");
    finite(this.styleValue.particleRise, "Opening particleRise");
    nonnegative(this.styleValue.particleCurl, "Opening particleCurl");
    positive(this.styleValue.taglineHeight, "Opening taglineHeight");
    if (this.styleValue.particlePalette.length === 0) throw new Error("Opening particlePalette cannot be empty.");
    if (this.styleValue.fontFamily.trim().length === 0) throw new Error("Opening fontFamily cannot be empty.");
    for (const [name, value] of Object.entries(this.timingValue)) {
      if (name === "shakeBeats") integer(value, "Opening shakeBeats");
      else nonnegative(value, `Opening ${name}`);
    }
  }
}

export class OpeningComposition {
  readonly duration: number;

  constructor(
    readonly visual: OpeningTattva,
    readonly tagline: LabelTattva,
    private readonly timing: OpeningTiming,
    letterCount: number,
  ) {
    this.duration = openingDuration(letterCount, timing);
  }

  all(): readonly [OpeningTattva, LabelTattva] {
    return [this.visual, this.tagline];
  }

  animate(timeline: Timeline, options: OpeningAnimationOptions = {}): this {
    const at = nonnegative(options.at ?? 0, "Opening animation start");
    timeline.animate(this.visual).at(at).duration(this.duration).ease("linear").to({ openingTime: this.duration });
    timeline.animate(this.tagline)
      .at(at + openingTaglineStart(this.visual.letterCount, this.timing))
      .duration(this.timing.dissolveDuration)
      .ease("outCubic")
      .appear();
    return this;
  }
}

export class OpeningTattva extends ThreeTattva<OpeningState> {
  readonly letterCount: number;

  constructor(
    title: string,
    readonly openingStyle: OpeningStyle,
    readonly openingTiming: OpeningTiming,
    texture: OpeningTexture,
  ) {
    const slots = letterSlots(title, openingStyle);
    let runtime: OpeningRuntime | undefined;
    super({
      setup({ scene }) {
        runtime = createRuntime(scene, slots, openingStyle, texture);
      },
      update(_context, state) {
        if (runtime) applyOpeningTime(runtime, state.openingTime, openingStyle, openingTiming);
      },
    }, { state: { openingTime: 0 } });
    this.letterCount = slots.length;
  }
}

/** Total local duration of an opening with `letterCount` visible letters. */
export function openingDuration(letterCount: number, timing: OpeningTiming = DEFAULT_TIMING): number {
  const burst = openingShakeStart(letterCount, timing) + timing.shakeDuration;
  const particles = Math.max(
    timing.particleScatterDuration,
    timing.taglineRevealDelay + timing.dissolveDuration,
  );
  return burst + particles + timing.endHold;
}

function openingTaglineStart(letterCount: number, timing: OpeningTiming): number {
  return openingShakeStart(letterCount, timing) + timing.shakeDuration + timing.taglineRevealDelay;
}

function openingShakeStart(letterCount: number, timing: OpeningTiming): number {
  const lastImpact = timing.introDelay + Math.max(0, letterCount - 1) * timing.landingStagger;
  return lastImpact + timing.landingDuration + timing.bounceUpDuration + timing.bounceDownDuration + timing.settledHold;
}

function letterSlots(title: string, style: OpeningStyle): LetterSlot[] {
  const widths = [...title].map((character) => character === " " ? style.spaceWidth : glyphWidth(character, style.letterHeight));
  const total = widths.reduce((sum, width) => sum + width, 0) + Math.max(0, widths.length - 1) * style.letterGap;
  let cursor = -total / 2;
  let index = 0;
  const result: LetterSlot[] = [];
  [...title].forEach((character, slotIndex) => {
    const width = widths[slotIndex] ?? style.letterHeight * 0.68;
    if (character !== " ") result.push({ character, index: index++, x: cursor + width / 2, width });
    cursor += width + style.letterGap;
  });
  return result;
}

function glyphWidth(character: string, height: number): number {
  if ("MW".includes(character)) return height * 0.9;
  if ("I".includes(character)) return height * 0.34;
  if ("JLT".includes(character)) return height * 0.56;
  return height * 0.69;
}

function createRuntime(
  scene: THREE.Scene,
  slots: readonly LetterSlot[],
  style: OpeningStyle,
  texture: OpeningTexture,
): OpeningRuntime {
  const letters = slots.map((slot) => {
    const glyph = glyphCanvas(slot.character, style, texture);
    const map = new THREE.CanvasTexture(glyph);
    map.colorSpace = THREE.SRGBColorSpace;
    map.needsUpdate = true;
    const solid = new THREE.Group();
    const faceGeometry = new THREE.PlaneGeometry(slot.width, style.letterHeight);
    const front = new THREE.Mesh(faceGeometry, new THREE.MeshBasicMaterial({
      map,
      color: style.frontColor,
      alphaTest: GLYPH_ALPHA_TEST,
      side: THREE.FrontSide,
      depthWrite: true,
    }));
    const back = new THREE.Mesh(faceGeometry, new THREE.MeshBasicMaterial({
      map,
      color: style.backColor,
      alphaTest: GLYPH_ALPHA_TEST,
      side: THREE.FrontSide,
      depthWrite: true,
    }));
    back.position.z = -style.letterDepth;
    back.rotation.y = Math.PI;

    const image = glyph.getContext("2d", { willReadFrequently: true })
      ?.getImageData(0, 0, glyph.width, glyph.height);
    if (!image) throw new Error("Opening requires glyph image data for 3D extrusion.");
    const sideGeometry = new THREE.BufferGeometry();
    sideGeometry.setAttribute("position", new THREE.Float32BufferAttribute(extrudedMaskSidePositions(
      image.data,
      image.width,
      image.height,
      slot.width,
      style.letterHeight,
      style.letterDepth,
      GLYPH_ALPHA_THRESHOLD,
    ), 3));
    sideGeometry.computeVertexNormals();
    const sides = new THREE.Mesh(sideGeometry, new THREE.MeshBasicMaterial({
      color: style.sideColor,
      side: THREE.DoubleSide,
      depthWrite: true,
    }));
    solid.add(front, back, sides);
    scene.add(solid);

    const particleData = glyphParticles(glyph, slot, style);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(particleData.base.slice(), 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(particleData.colors, 3));
    const material = new THREE.PointsMaterial({
      size: style.particleSize,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(geometry, material);
    particles.position.set(slot.x, style.finalY, 0);
    particles.visible = false;
    scene.add(particles);
    return {
      solid,
      particles,
      baseParticles: particleData.base,
      scatterVectors: particleData.scatter,
      slot,
    };
  });
  return { letters };
}

/**
 * Build opaque walls around an RGBA glyph mask. Unlike stacked alpha planes,
 * these quads join the front and back faces into one continuous extrusion.
 */
export function extrudedMaskSidePositions(
  rgba: ArrayLike<number>,
  pixelWidth: number,
  pixelHeight: number,
  worldWidth: number,
  worldHeight: number,
  depth: number,
  alphaThreshold = GLYPH_ALPHA_THRESHOLD,
): Float32Array {
  if (!Number.isInteger(pixelWidth) || pixelWidth <= 0 || !Number.isInteger(pixelHeight) || pixelHeight <= 0) {
    throw new Error(`Opening glyph mask dimensions must be positive integers; received ${pixelWidth} x ${pixelHeight}.`);
  }
  if (rgba.length < pixelWidth * pixelHeight * 4) {
    throw new Error("Opening glyph mask does not contain enough RGBA pixels.");
  }
  positive(worldWidth, "Opening glyph world width");
  positive(worldHeight, "Opening glyph world height");
  positive(depth, "Opening glyph depth");
  if (!Number.isFinite(alphaThreshold) || alphaThreshold < 0 || alphaThreshold > 255) {
    throw new Error(`Opening glyph alpha threshold must be between 0 and 255; received ${alphaThreshold}.`);
  }

  const positions: number[] = [];
  const filled = (x: number, y: number): boolean => x >= 0
    && x < pixelWidth
    && y >= 0
    && y < pixelHeight
    && (rgba[(y * pixelWidth + x) * 4 + 3] ?? 0) >= alphaThreshold;
  const wall = (ax: number, ay: number, bx: number, by: number): void => {
    positions.push(
      ax, ay, 0,
      bx, by, 0,
      bx, by, -depth,
      ax, ay, 0,
      bx, by, -depth,
      ax, ay, -depth,
    );
  };

  for (let y = 0; y < pixelHeight; y += 1) {
    const top = (0.5 - y / pixelHeight) * worldHeight;
    const bottom = (0.5 - (y + 1) / pixelHeight) * worldHeight;
    for (let x = 0; x < pixelWidth; x += 1) {
      if (!filled(x, y)) continue;
      const left = (x / pixelWidth - 0.5) * worldWidth;
      const right = ((x + 1) / pixelWidth - 0.5) * worldWidth;
      if (!filled(x, y - 1)) wall(left, top, right, top);
      if (!filled(x + 1, y)) wall(right, top, right, bottom);
      if (!filled(x, y + 1)) wall(right, bottom, left, bottom);
      if (!filled(x - 1, y)) wall(left, bottom, left, top);
    }
  }
  return new Float32Array(positions);
}

function applyOpeningTime(runtime: OpeningRuntime, time: number, style: OpeningStyle, timing: OpeningTiming): void {
  const shakeStart = openingShakeStart(runtime.letters.length, timing);
  const burst = shakeStart + timing.shakeDuration;
  runtime.letters.forEach((letter, index) => {
    const impact = timing.introDelay + index * timing.landingStagger;
    const landing = easeInCubic(unit(time, impact, timing.landingDuration));
    const startX = letter.slot.x * 0.35;
    const startY = 4.6 + index * 0.18;
    const startZ = 13.2 + index * 0.55;
    let x = mix(startX, letter.slot.x, landing);
    let y = mix(startY, style.finalY, landing);
    let z = mix(startZ, 0, landing);
    let rx = mix(43 + index * 9.7, 0, easeInOutCubic(landing));
    let ry = mix(-37 + index * 13.2, 0, easeInOutCubic(landing));
    let rz = mix(20 - index * 6.3, 0, easeInOutCubic(landing));

    const bounceUpStart = impact + timing.landingDuration;
    const bounceDownStart = bounceUpStart + timing.bounceUpDuration;
    if (time >= bounceUpStart && time < bounceDownStart) {
      y = style.finalY + 0.2 * easeOutCubic(unit(time, bounceUpStart, timing.bounceUpDuration));
    } else if (time >= bounceDownStart) {
      y = style.finalY + 0.2 * (1 - easeInCubic(unit(time, bounceDownStart, timing.bounceDownDuration)));
    }

    if (time >= shakeStart && time < burst && timing.shakeDuration > 0) {
      const shake = unit(time, shakeStart, timing.shakeDuration);
      const energy = shake * shake;
      const wave = Math.sin((shake * timing.shakeBeats + index * 0.5) * Math.PI * 2);
      x += wave * (0.014 + energy * 0.075);
      y -= wave * (0.004 + energy * 0.026);
      rx += wave * energy * 0.7;
      ry -= wave * energy * 1.05;
      rz += wave * (0.35 + energy * 2.6);
    }
    letter.solid.position.set(x, y, z);
    letter.solid.rotation.set(rx * Math.PI / 180, ry * Math.PI / 180, rz * Math.PI / 180);
    letter.solid.visible = time < burst;

    const scatter = easeOutQuad(unit(time, burst, timing.particleScatterDuration));
    const dissolve = easeInOutCubic(unit(time, burst + timing.taglineRevealDelay, timing.dissolveDuration));
    letter.particles.visible = time >= burst && dissolve < 1;
    letter.particles.material.opacity = 1 - dissolve;
    letter.particles.position.set(
      letter.slot.x * (1 + scatter * 0.45),
      style.finalY + [1.25, -0.95, 0.7, -0.55, -0.95, 1.25][index % 6]! * 0.72 * scatter,
      2.2 * scatter,
    );
    letter.particles.scale.setScalar(1 + 0.65 * scatter);
    const positions = letter.particles.geometry.getAttribute("position") as THREE.BufferAttribute;
    const values = positions.array as Float32Array;
    for (let offset = 0; offset < values.length; offset += 3) {
      const curl = Math.sin(scatter * Math.PI * 2 + index + offset * 0.013) * style.particleCurl;
      values[offset] = (letter.baseParticles[offset] ?? 0)
        + (letter.scatterVectors[offset] ?? 0) * style.particleDistance * scatter
        + curl * 0.08 * scatter;
      values[offset + 1] = (letter.baseParticles[offset + 1] ?? 0)
        + (letter.scatterVectors[offset + 1] ?? 0) * style.particleDistance * scatter
        + style.particleRise * scatter * 0.16;
      values[offset + 2] = (letter.baseParticles[offset + 2] ?? 0)
        + (letter.scatterVectors[offset + 2] ?? 0) * style.particleDistance * scatter;
    }
    positions.needsUpdate = true;
  });
}

function glyphCanvas(character: string, style: OpeningStyle, texture: OpeningTexture): HTMLCanvasElement {
  const size = 320;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Opening requires a 2D canvas context.");
  context.clearRect(0, 0, size, size);
  context.fillStyle = "white";
  context.font = `900 250px ${style.fontFamily}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(character, size / 2, size / 2 + 8);
  context.globalCompositeOperation = "source-atop";
  if (texture === "plain") {
    context.fillStyle = "white";
    context.fillRect(0, 0, size, size);
  } else {
    const dark = texture === "blackMarble";
    const gradient = context.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, dark ? "#25272b" : "#fffdf6");
    gradient.addColorStop(0.45, dark ? "#74777d" : "#c8c7c2");
    gradient.addColorStop(0.72, dark ? "#15171a" : "#f4f1e8");
    gradient.addColorStop(1, dark ? "#484b51" : "#aaa9a4");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    context.strokeStyle = dark ? "rgba(225,230,238,0.18)" : "rgba(60,64,70,0.24)";
    context.lineWidth = 3;
    for (let vein = 0; vein < 7; vein += 1) {
      context.beginPath();
      for (let x = -20; x <= size + 20; x += 8) {
        const y = 34 + vein * 42 + Math.sin(x * 0.035 + vein * 1.7) * 17;
        if (x === -20) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.stroke();
    }
  }
  context.globalCompositeOperation = "source-over";
  return canvas;
}

function glyphParticles(
  canvas: HTMLCanvasElement,
  slot: LetterSlot,
  style: OpeningStyle,
): { base: Float32Array; scatter: Float32Array; colors: Float32Array } {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Opening requires a 2D canvas context.");
  const image = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const base = new Float32Array(style.particleCount * 3);
  const scatter = new Float32Array(style.particleCount * 3);
  const colors = new Float32Array(style.particleCount * 3);
  const random = seededRandom(19 + slot.index * 7301 + slot.character.charCodeAt(0));
  let accepted = 0;
  let attempts = 0;
  while (accepted < style.particleCount && attempts < style.particleCount * 80) {
    attempts += 1;
    const px = Math.floor(random() * canvas.width);
    const py = Math.floor(random() * canvas.height);
    if ((image[(py * canvas.width + px) * 4 + 3] ?? 0) < 40) continue;
    const offset = accepted * 3;
    base[offset] = (px / canvas.width - 0.5) * slot.width;
    base[offset + 1] = (0.5 - py / canvas.height) * style.letterHeight;
    base[offset + 2] = -random() * style.letterDepth;
    const angle = random() * Math.PI * 2;
    const vertical = random() * 1.4 - 0.35;
    scatter[offset] = Math.cos(angle) * (0.45 + random() * 0.55);
    scatter[offset + 1] = vertical;
    scatter[offset + 2] = Math.sin(angle) * (0.35 + random() * 0.65);
    const color = new THREE.Color(style.particlePalette[accepted % style.particlePalette.length] ?? "#ffffff");
    colors[offset] = color.r;
    colors[offset + 1] = color.g;
    colors[offset + 2] = color.b;
    accepted += 1;
  }
  if (accepted < style.particleCount) {
    throw new Error(`Opening could sample only ${accepted} particles for ${slot.character}.`);
  }
  return { base, scatter, colors };
}

function validateTitle(title: string): void {
  let letters = 0;
  [...title].forEach((character, index) => {
    if (/[A-Z]/.test(character)) letters += 1;
    else if (character !== " ") throw new Error(`Opening title supports ASCII capitals and spaces; received ${JSON.stringify(character)} at ${index}.`);
  });
  if (letters === 0) throw new Error("Opening title must contain at least one capital letter.");
}

function seededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function unit(time: number, start: number, duration: number): number {
  if (duration <= 0) return time < start ? 0 : 1;
  return Math.max(0, Math.min(1, (time - start) / duration));
}

function mix(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}

function easeInCubic(value: number): number {
  return value * value * value;
}

function easeOutCubic(value: number): number {
  return 1 - (1 - value) ** 3;
}

function easeInOutCubic(value: number): number {
  return value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2;
}

function easeOutQuad(value: number): number {
  return 1 - (1 - value) * (1 - value);
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

function nonnegative(value: number, name: string): number {
  finite(value, name);
  if (value < 0) throw new Error(`${name} cannot be negative; received ${value}.`);
  return value;
}

function integer(value: number, name: string): number {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer; received ${value}.`);
  return value;
}
