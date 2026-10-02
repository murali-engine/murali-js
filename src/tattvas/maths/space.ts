import * as THREE from "three";
import { ThreeTattva } from "../../core/ThreeTattva.ts";
import type { Vec3 } from "../../core/Tattva.ts";
import { resolveImageSource, type ImageFileAsset } from "../../core/image.ts";

type Range = readonly [number, number];
type Rgba = readonly [number, number, number, number];

const X_AXIS: Rgba = [0.96, 0.42, 0.34, 1];
const Y_AXIS: Rgba = [0.34, 0.78, 0.95, 1];
const Z_AXIS: Rgba = [0.95, 0.82, 0.34, 1];

export interface Axes3DObject extends ThreeTattva {
  step(value: number): this;
  axisThickness(value: number): this;
  tickSize(value: number): this;
}

/** X, Y, and Z axes with ticks, drawn in the scene camera's Three.js world. */
export function Axes3D(xRange: Range, yRange: Range, zRange: Range): Axes3DObject {
  let step = 1;
  let thickness = 0.03;
  let tickSize = 0.16;
  const build = () => {
    const group = new THREE.Group();
    group.add(axisLine([xRange[0], 0, 0], [xRange[1], 0, 0], thickness, X_AXIS));
    group.add(axisLine([0, yRange[0], 0], [0, yRange[1], 0], thickness, Y_AXIS));
    group.add(axisLine([0, 0, zRange[0]], [0, 0, zRange[1]], thickness, Z_AXIS));
    for (const x of tickValues(xRange, step)) {
      group.add(axisLine([x, -tickSize / 2, 0], [x, tickSize / 2, 0], thickness * 0.6, X_AXIS));
      group.add(axisLine([x, 0, -tickSize * 0.35], [x, 0, tickSize * 0.35], thickness * 0.5, X_AXIS));
    }
    for (const y of tickValues(yRange, step)) {
      group.add(axisLine([-tickSize / 2, y, 0], [tickSize / 2, y, 0], thickness * 0.6, Y_AXIS));
      group.add(axisLine([0, y, -tickSize * 0.35], [0, y, tickSize * 0.35], thickness * 0.5, Y_AXIS));
    }
    for (const z of tickValues(zRange, step)) {
      group.add(axisLine([-tickSize / 2, 0, z], [tickSize / 2, 0, z], thickness * 0.6, Z_AXIS));
      group.add(axisLine([0, -tickSize * 0.35, z], [0, tickSize * 0.35, z], thickness * 0.5, Z_AXIS));
    }
    return group;
  };
  const tattva = new ThreeTattva({
    setup({ scene }) {
      scene.add(build());
    },
  }) as Axes3DObject;
  tattva.step = (value) => {
    step = value;
    return tattva;
  };
  tattva.axisThickness = (value) => {
    thickness = value;
    return tattva;
  };
  tattva.tickSize = (value) => {
    tickSize = value;
    return tattva;
  };
  return tattva;
}

export function tickValues([start, end]: Range, step: number): number[] {
  if (step <= 0) return [];
  const values: number[] = [];
  const count = Math.floor((end - start) / step + 1e-4) + 1;
  for (let index = 0; index < count; index += 1) {
    const value = start + index * step;
    if (value <= end + 1e-4 && Math.abs(value) > 0.001) values.push(value);
  }
  return values;
}

/** Points of a parametric curve. The returned object reveals them with `revealProgress`. */
export function ParametricCurve(range: Range, pointAt: (t: number) => Vec3): ParametricCurveTattva {
  return new ParametricCurveTattva(range, pointAt);
}

class ParametricCurveTattva extends ThreeTattva {
  private samples = 128;
  private ink = "#f0ac5f";
  private pulse = "#f7c797";
  private radius = 0.09;

  constructor(
    private readonly range: Range,
    private readonly pointAt: (t: number) => Vec3,
  ) {
    super({
      setup: ({ scene }) => {
        const points = this.points();
        const geometry = new THREE.BufferGeometry().setFromPoints(points.map((point) => new THREE.Vector3(...point)));
        const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: this.ink }));
        line.name = "curve";
        line.geometry.setDrawRange(0, 0);
        scene.add(line);
        const marker = new THREE.Mesh(
          new THREE.SphereGeometry(this.radius, 16, 12),
          new THREE.MeshBasicMaterial({ color: this.pulse }),
        );
        marker.name = "pulse";
        scene.add(marker);
      },
      update: ({ scene }, state) => {
        const points = this.points();
        const progress = Math.max(0, Math.min(1, state.revealProgress ?? 0));
        const count = Math.max(0, Math.ceil(points.length * progress));
        const line = scene.getObjectByName("curve");
        if (line instanceof THREE.Line) line.geometry.setDrawRange(0, count);
        const marker = scene.getObjectByName("pulse");
        const point = points[Math.max(0, count - 1)] ?? points[0];
        if (marker && point) {
          marker.position.set(...point);
          marker.visible = count > 1;
        }
      },
    });
    this.setInitial({ revealProgress: 0 });
  }

  sampleCount(value: number): this {
    this.samples = Math.max(2, Math.floor(value));
    return this;
  }

  color(value: string): this {
    this.ink = value;
    return this;
  }

  pulseColor(value: string): this {
    this.pulse = value;
    return this;
  }

  pulseRadius(value: number): this {
    this.radius = value;
    return this;
  }

  points(): Vec3[] {
    return sampleCurve(this.range, this.pointAt, this.samples);
  }
}

export function sampleCurve(range: Range, pointAt: (t: number) => Vec3, samples: number): Vec3[] {
  const count = Math.max(2, samples);
  return Array.from({ length: count }, (_, index) => {
    const t = range[0] + ((range[1] - range[0]) * index) / (count - 1);
    return pointAt(t);
  });
}

export type SurfaceMode = "solid" | "wireframe";

/** A parametric sheet. `revealProgress` writes it from the first parameter row. */
export function ParametricSurface(
  uRange: Range,
  vRange: Range,
  pointAt: (u: number, v: number) => Vec3,
): ParametricSurfaceTattva {
  return new ParametricSurfaceTattva(uRange, vRange, pointAt);
}

class ParametricSurfaceTattva extends ThreeTattva {
  private uCount = 24;
  private vCount = 24;
  private mode: SurfaceMode = "solid";
  private colorAt: (point: Vec3) => Rgba = () => [0.7, 0.8, 0.9, 1];
  private paint: ((context: CanvasRenderingContext2D, width: number, height: number) => void) | null = null;
  private textureSource: string | ImageFileAsset | null = null;
  private flipVertical = false;
  private tinted = false;
  private sampleTime = 0;

  constructor(
    private readonly uRange: Range,
    private readonly vRange: Range,
    private readonly pointAt: (u: number, v: number, time: number) => Vec3,
  ) {
    super({
      setup: ({ scene }) => {
        const mesh = new THREE.Mesh(
          new THREE.BufferGeometry(),
          new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, side: THREE.DoubleSide, depthWrite: false }),
        );
        mesh.name = "surface";
        scene.add(mesh);
        const lines = new THREE.LineSegments(
          new THREE.BufferGeometry(),
          new THREE.LineBasicMaterial({ vertexColors: true, transparent: true }),
        );
        lines.name = "wire";
        scene.add(lines);
        const material = mesh.material;
        const textureUrl = this.textureSource ? resolveImageSource(this.textureSource) : undefined;
        if (textureUrl && material instanceof THREE.MeshBasicMaterial) {
          const texture = new THREE.TextureLoader().load(textureUrl);
          texture.colorSpace = THREE.SRGBColorSpace;
          material.map = texture;
          material.vertexColors = this.tinted;
        } else if (this.paint && typeof document !== "undefined") {
          const canvas = document.createElement("canvas");
          canvas.width = 512;
          canvas.height = 256;
          const context = canvas.getContext("2d");
          if (context) {
            this.paint(context, canvas.width, canvas.height);
            if (material instanceof THREE.MeshBasicMaterial) {
              material.map = new THREE.CanvasTexture(canvas);
              material.vertexColors = this.tinted;
            }
          }
        }
      },
      update: ({ scene }, state) => {
        const progress = Math.max(0, Math.min(1, state.revealProgress ?? 1));
        const rows = Math.min(this.uCount, Math.ceil(progress * this.uCount));
        const mesh = scene.getObjectByName("surface");
        const lines = scene.getObjectByName("wire");
        if (mesh instanceof THREE.Mesh) {
          mesh.visible = this.mode === "solid" && rows > 1;
          if (mesh.visible) mesh.geometry.dispose();
          if (mesh.visible) {
            mesh.geometry = solidGeometry(
              this.grid(rows),
              this.vCount,
              this.colorAt,
              Boolean(this.paint || this.textureSource),
              this.tinted,
              this.flipVertical,
            );
          }
        }
        if (lines instanceof THREE.LineSegments) {
          lines.visible = this.mode === "wireframe" && rows > 0;
          if (lines.visible) {
            lines.geometry.dispose();
            lines.geometry = wireGeometry(this.grid(rows), this.vCount, this.colorAt, progress);
          }
        }
      },
    });
    this.setInitial({ revealProgress: 1 });
  }

  override influenceState(time: number): void {
    this.sampleTime = time;
  }

  /** The surface point at the most recently sampled scene time. */
  point(u: number, v: number): Vec3 {
    return this.pointAt(u, v, this.sampleTime);
  }

  samples(u: number, v: number): this {
    this.uCount = Math.max(2, Math.floor(u));
    this.vCount = Math.max(2, Math.floor(v));
    return this;
  }

  renderMode(mode: SurfaceMode): this {
    this.mode = mode;
    return this;
  }

  color(value: Rgba | ((point: Vec3) => Rgba)): this {
    this.tinted = true;
    this.colorAt = typeof value === "function" ? value : () => value;
    return this;
  }

  /** Match Murali's `texture_flip_y`. The default keeps `u` running down the texture. */
  flipY(value = true): this {
    this.flipVertical = value;
    return this;
  }

  /** Use an imported image URL or draw a texture in the browser. `v` runs across the width and `u` down the height. */
  texture(source: string | ImageFileAsset | ((context: CanvasRenderingContext2D, width: number, height: number) => void)): this {
    this.textureSource = typeof source === "function" ? null : source;
    this.paint = typeof source === "function" ? source : null;
    return this;
  }

  writeProgress(value: number): this {
    this.setInitial({ revealProgress: Math.max(0, Math.min(1, value)) });
    return this;
  }

  rowsAt(progress: number): number {
    return Math.min(this.uCount, Math.ceil(Math.max(0, Math.min(1, progress)) * this.uCount));
  }

  private grid(rows: number): Vec3[] {
    return sampleSurface(this.uRange, this.vRange, (u, v) => this.pointAt(u, v, this.sampleTime), rows, this.vCount);
  }
}

export function sampleSurface(
  uRange: Range,
  vRange: Range,
  pointAt: (u: number, v: number) => Vec3,
  uSamples: number,
  vSamples: number,
): Vec3[] {
  const uCount = Math.max(2, uSamples);
  const vCount = Math.max(2, vSamples);
  const points: Vec3[] = [];
  for (let i = 0; i < uCount; i += 1) {
    const u = uRange[0] + ((uRange[1] - uRange[0]) * i) / (uCount - 1);
    for (let j = 0; j < vCount; j += 1) {
      const v = vRange[0] + ((vRange[1] - vRange[0]) * j) / (vCount - 1);
      points.push(pointAt(u, v));
    }
  }
  return points;
}

function solidGeometry(
  points: Vec3[],
  columns: number,
  colorAt: (point: Vec3) => Rgba,
  textured: boolean,
  tinted: boolean,
  flipY: boolean,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const rows = Math.floor(points.length / columns);
  points.forEach((point, index) => {
    positions.push(...point);
    const color = colorAt(point);
    colors.push(color[0], color[1], color[2], color[3]);
    const row = Math.floor(index / columns);
    const column = index % columns;
    const down = row / Math.max(1, rows - 1);
    uvs.push(column / Math.max(1, columns - 1), flipY ? down : 1 - down);
  });
  for (let row = 0; row < rows - 1; row += 1) {
    for (let column = 0; column < columns - 1; column += 1) {
      const a = row * columns + column;
      const b = a + 1;
      const c = a + columns;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  if (!textured || tinted) geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 4));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}

function wireGeometry(points: Vec3[], columns: number, colorAt: (point: Vec3) => Rgba, progress: number): THREE.BufferGeometry {
  const rows = Math.floor(points.length / columns);
  const positions: number[] = [];
  const colors: number[] = [];
  const push = (point: Vec3) => {
    positions.push(...point);
    const color = colorAt(point);
    colors.push(color[0], color[1], color[2]);
  };
  const horizontal = Math.min(rows, Math.ceil(Math.min(1, progress * 2) * rows));
  for (let row = 0; row < horizontal; row += 1) {
    for (let column = 0; column < columns - 1; column += 1) {
      const start = points[row * columns + column];
      const end = points[row * columns + column + 1];
      if (start && end) {
        push(start);
        push(end);
      }
    }
  }
  const vertical = Math.min(columns, Math.ceil(Math.max(0, (progress - 0.5) * 2) * columns));
  for (let column = 0; column < vertical; column += 1) {
    for (let row = 0; row < rows - 1; row += 1) {
      const start = points[row * columns + column];
      const end = points[(row + 1) * columns + column];
      if (start && end) {
        push(start);
        push(end);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  return geometry;
}

function axisLine(start: Vec3, end: Vec3, thickness: number, color: Rgba): THREE.Line {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(...start),
    new THREE.Vector3(...end),
  ]);
  return new THREE.Line(geometry, new THREE.LineBasicMaterial({
    color: new THREE.Color(color[0], color[1], color[2]),
    transparent: color[3] < 1,
    opacity: color[3],
  }));
}
