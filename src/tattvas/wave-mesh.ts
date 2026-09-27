import * as THREE from "three";
import { ThreeTattva } from "../core/ThreeTattva.ts";
import type { TattvaState, Vec3 } from "../core/Tattva.ts";

export interface WaveMeshState extends TattvaState {
  /** One unit is one seamless wave cycle. */
  phase: number;
  /** Multiplier applied to the authored terrain height. */
  energy: number;
}

export type WaveMeshProfile = (x: number, z: number, phase: number) => number;

export interface WaveMeshPalette {
  near: string;
  far: string;
  peak: string;
  fill: string;
  sparkle: string;
}

interface WaveMeshConfig {
  width: number;
  depth: number;
  amplitude: number;
  columns: number;
  rows: number;
  lineOpacity: number;
  fillOpacity: number;
  pointOpacity: number;
  pointSize: number;
  sparkleSize: number;
  sparkleRatio: number;
  palette: WaveMeshPalette;
  profile: WaveMeshProfile;
}

interface WaveMeshRuntime {
  positions: Float32Array;
  colors: Float32Array;
  positionAttribute: THREE.BufferAttribute;
  colorAttribute: THREE.BufferAttribute;
  sparklePositions: Float32Array;
  sparkleAttribute: THREE.BufferAttribute;
  sparkleIndices: readonly number[];
}

const DEFAULT_PALETTE: WaveMeshPalette = {
  near: "#f1b7ff",
  far: "#3347d8",
  peak: "#f7edff",
  fill: "#4b2ac8",
  sparkle: "#fff7ff",
};

const DEFAULT_CONFIG: WaveMeshConfig = {
  width: 17,
  depth: 7,
  amplitude: 1.1,
  columns: 57,
  rows: 25,
  lineOpacity: 0.82,
  fillOpacity: 0.1,
  pointOpacity: 0.72,
  pointSize: 0.035,
  sparkleSize: 0.075,
  sparkleRatio: 0.035,
  palette: DEFAULT_PALETTE,
  profile: defaultWaveMeshProfile,
};

/** A reusable animated wire terrain intended for lower-third and background compositions. */
export class WaveMeshTattva extends ThreeTattva<WaveMeshState> {
  private readonly waveConfig: WaveMeshConfig;

  constructor() {
    const config: WaveMeshConfig = {
      ...DEFAULT_CONFIG,
      palette: { ...DEFAULT_PALETTE },
    };
    let runtime: WaveMeshRuntime | undefined;
    super({
      setup({ scene }) {
        runtime = createWaveMeshRuntime(scene, config);
      },
      update(_context, state) {
        if (runtime) updateWaveMesh(runtime, config, state.phase, state.energy);
      },
    }, { state: { phase: 0, energy: 1 } });
    this.waveConfig = config;
    this.refreshBounds();
  }

  size(width: number, depth: number): this {
    this.waveConfig.width = positive(width, "WaveMesh width");
    this.waveConfig.depth = positive(depth, "WaveMesh depth");
    return this.refreshBounds();
  }

  amplitude(value: number): this {
    this.waveConfig.amplitude = nonnegative(value, "WaveMesh amplitude");
    return this.refreshBounds();
  }

  samples(columns: number, rows: number): this {
    this.waveConfig.columns = integerAtLeast(columns, 2, "WaveMesh columns");
    this.waveConfig.rows = integerAtLeast(rows, 2, "WaveMesh rows");
    return this;
  }

  palette(value: Partial<WaveMeshPalette>): this {
    this.waveConfig.palette = { ...this.waveConfig.palette, ...value };
    return this;
  }

  lineOpacity(value: number): this {
    this.waveConfig.lineOpacity = unit(value, "WaveMesh line opacity");
    return this;
  }

  fillOpacity(value: number): this {
    this.waveConfig.fillOpacity = unit(value, "WaveMesh fill opacity");
    return this;
  }

  nodes(options: { size?: number; opacity?: number } = {}): this {
    if (options.size !== undefined) this.waveConfig.pointSize = positive(options.size, "WaveMesh node size");
    if (options.opacity !== undefined) this.waveConfig.pointOpacity = unit(options.opacity, "WaveMesh node opacity");
    return this;
  }

  sparkles(options: { size?: number; ratio?: number } = {}): this {
    if (options.size !== undefined) {
      this.waveConfig.sparkleSize = positive(options.size, "WaveMesh sparkle size");
    }
    if (options.ratio !== undefined) {
      this.waveConfig.sparkleRatio = unit(options.ratio, "WaveMesh sparkle ratio");
    }
    return this;
  }

  profile(value: WaveMeshProfile): this {
    this.waveConfig.profile = value;
    return this;
  }

  phase(value: number): this {
    return this.set({ phase: finite(value, "WaveMesh phase") });
  }

  energy(value: number): this {
    return this.set({ energy: nonnegative(value, "WaveMesh energy") });
  }

  private refreshBounds(): this {
    this.worldSize = {
      width: this.waveConfig.width,
      height: this.waveConfig.amplitude * 2,
    };
    return this;
  }
}

export function WaveMesh(): WaveMeshTattva {
  return new WaveMeshTattva();
}

/** Seamless deterministic default terrain; `phase + 1` returns the same shape. */
export function defaultWaveMeshProfile(x: number, z: number, phase: number): number {
  const turn = phase * Math.PI * 2;
  return (
    Math.sin(x * 0.88 + turn) * 0.38
    + Math.cos(z * 1.17 - turn) * 0.24
    + Math.sin(x * 0.42 + z * 0.73 + turn * 2) * 0.2
    + Math.cos(x * 1.31 - z * 0.37 - turn) * 0.1
  );
}

/** Deterministically sample the authored WaveMesh grid in row-major order. */
export function sampleWaveMesh(
  width: number,
  depth: number,
  columns: number,
  rows: number,
  amplitude: number,
  phase: number,
  energy = 1,
  profile: WaveMeshProfile = defaultWaveMeshProfile,
): Vec3[] {
  const safeWidth = positive(width, "WaveMesh width");
  const safeDepth = positive(depth, "WaveMesh depth");
  const safeColumns = integerAtLeast(columns, 2, "WaveMesh columns");
  const safeRows = integerAtLeast(rows, 2, "WaveMesh rows");
  const safeAmplitude = nonnegative(amplitude, "WaveMesh amplitude");
  const safePhase = finite(phase, "WaveMesh phase");
  const safeEnergy = nonnegative(energy, "WaveMesh energy");
  const points: Vec3[] = [];
  for (let row = 0; row < safeRows; row += 1) {
    const z = -safeDepth / 2 + safeDepth * row / (safeRows - 1);
    for (let column = 0; column < safeColumns; column += 1) {
      const x = -safeWidth / 2 + safeWidth * column / (safeColumns - 1);
      points.push([x, profile(x, z, safePhase) * safeAmplitude * safeEnergy, z]);
    }
  }
  return points;
}

function createWaveMeshRuntime(scene: THREE.Scene, config: WaveMeshConfig): WaveMeshRuntime {
  const count = config.columns * config.rows;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const positionAttribute = new THREE.BufferAttribute(positions, 3);
  positionAttribute.setUsage(THREE.DynamicDrawUsage);
  const colorAttribute = new THREE.BufferAttribute(colors, 3);
  colorAttribute.setUsage(THREE.DynamicDrawUsage);

  const surfaceGeometry = new THREE.BufferGeometry();
  surfaceGeometry.setAttribute("position", positionAttribute);
  surfaceGeometry.setAttribute("color", colorAttribute);
  surfaceGeometry.setIndex(triangleIndices(config.columns, config.rows));
  const surface = new THREE.Mesh(surfaceGeometry, new THREE.MeshBasicMaterial({
    color: config.palette.fill,
    vertexColors: true,
    transparent: true,
    opacity: config.fillOpacity,
    side: THREE.DoubleSide,
    depthWrite: false,
  }));
  surface.renderOrder = 0;

  const wireGeometry = new THREE.BufferGeometry();
  wireGeometry.setAttribute("position", positionAttribute);
  wireGeometry.setAttribute("color", colorAttribute);
  wireGeometry.setIndex(edgeIndices(config.columns, config.rows));
  const wire = new THREE.LineSegments(wireGeometry, new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: config.lineOpacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  wire.renderOrder = 1;

  const nodesGeometry = new THREE.BufferGeometry();
  nodesGeometry.setAttribute("position", positionAttribute);
  nodesGeometry.setAttribute("color", colorAttribute);
  const nodes = new THREE.Points(nodesGeometry, new THREE.PointsMaterial({
    vertexColors: true,
    size: config.pointSize,
    sizeAttenuation: true,
    transparent: true,
    opacity: config.pointOpacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  nodes.renderOrder = 2;

  const sparkleIndices = Array.from({ length: count }, (_, index) => index)
    .filter((index) => hash01(index * 91.73 + 17.1) < config.sparkleRatio);
  const sparklePositions = new Float32Array(sparkleIndices.length * 3);
  const sparkleAttribute = new THREE.BufferAttribute(sparklePositions, 3);
  sparkleAttribute.setUsage(THREE.DynamicDrawUsage);
  const sparkleGeometry = new THREE.BufferGeometry();
  sparkleGeometry.setAttribute("position", sparkleAttribute);
  const sparkles = new THREE.Points(sparkleGeometry, new THREE.PointsMaterial({
    color: config.palette.sparkle,
    size: config.sparkleSize,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  sparkles.renderOrder = 3;

  scene.add(surface, wire, nodes, sparkles);
  const runtime = {
    positions,
    colors,
    positionAttribute,
    colorAttribute,
    sparklePositions,
    sparkleAttribute,
    sparkleIndices,
  };
  updateWaveMesh(runtime, config, 0, 1);
  return runtime;
}

function updateWaveMesh(
  runtime: WaveMeshRuntime,
  config: WaveMeshConfig,
  phase: number,
  energy: number,
): void {
  const points = sampleWaveMesh(
    config.width,
    config.depth,
    config.columns,
    config.rows,
    config.amplitude,
    phase,
    energy,
    config.profile,
  );
  const near = new THREE.Color(config.palette.near);
  const far = new THREE.Color(config.palette.far);
  const peak = new THREE.Color(config.palette.peak);
  const mixed = new THREE.Color();
  points.forEach(([x, y, z], index) => {
    const offset = index * 3;
    runtime.positions[offset] = x;
    runtime.positions[offset + 1] = y;
    runtime.positions[offset + 2] = z;
    const nearness = Math.max(0, Math.min(1, z / config.depth + 0.5));
    const peakness = config.amplitude === 0
      ? 0
      : Math.max(0, Math.min(1, y / (config.amplitude * Math.max(energy, 0.001))));
    mixed.lerpColors(far, near, 0.2 + nearness * 0.8).lerp(peak, peakness * 0.42);
    runtime.colors[offset] = mixed.r;
    runtime.colors[offset + 1] = mixed.g;
    runtime.colors[offset + 2] = mixed.b;
  });
  runtime.sparkleIndices.forEach((pointIndex, sparkleIndex) => {
    const source = pointIndex * 3;
    const target = sparkleIndex * 3;
    runtime.sparklePositions[target] = runtime.positions[source] ?? 0;
    runtime.sparklePositions[target + 1] = (runtime.positions[source + 1] ?? 0) + 0.018;
    runtime.sparklePositions[target + 2] = runtime.positions[source + 2] ?? 0;
  });
  runtime.positionAttribute.needsUpdate = true;
  runtime.colorAttribute.needsUpdate = true;
  runtime.sparkleAttribute.needsUpdate = true;
}

function triangleIndices(columns: number, rows: number): number[] {
  const indices: number[] = [];
  for (let row = 0; row < rows - 1; row += 1) {
    for (let column = 0; column < columns - 1; column += 1) {
      const a = row * columns + column;
      const b = a + 1;
      const c = a + columns;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  return indices;
}

function edgeIndices(columns: number, rows: number): number[] {
  const indices: number[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const current = row * columns + column;
      if (column + 1 < columns) indices.push(current, current + 1);
      if (row + 1 < rows) indices.push(current, current + columns);
    }
  }
  return indices;
}

function hash01(value: number): number {
  const sine = Math.sin(value * 12.9898) * 43758.5453;
  return sine - Math.floor(sine);
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

function finite(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite; received ${value}.`);
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

