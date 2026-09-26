import { Tattva, type TattvaState, type Vec3 } from "./Tattva.ts";

export type CameraProjection = "perspective" | "orthographic";

export interface Camera3DValues {
  cameraProjection: CameraProjection;
  cameraX: number;
  cameraY: number;
  cameraZ: number;
  cameraTargetX: number;
  cameraTargetY: number;
  cameraTargetZ: number;
  cameraUpX: number;
  cameraUpY: number;
  cameraUpZ: number;
  cameraFov: number;
  cameraNear: number;
  cameraFar: number;
  cameraZoom: number;
  cameraViewHeight: number;
}

export interface Camera3DState extends TattvaState, Camera3DValues {}

export const defaultCamera3DValues: Camera3DValues = {
  cameraProjection: "perspective",
  cameraX: 0,
  cameraY: 0,
  cameraZ: 8,
  cameraTargetX: 0,
  cameraTargetY: 0,
  cameraTargetZ: 0,
  cameraUpX: 0,
  cameraUpY: 1,
  cameraUpZ: 0,
  cameraFov: 45,
  cameraNear: 0.1,
  cameraFar: 1000,
  cameraZoom: 1,
  cameraViewHeight: 9,
};

export interface PerspectiveCameraOptions {
  fov?: number;
  near?: number;
  far?: number;
}

export interface OrthographicCameraOptions {
  viewHeight?: number;
  near?: number;
  far?: number;
}

export interface CameraFrameBounds {
  min: readonly [number, number];
  max: readonly [number, number];
  width: number;
  height: number;
  center: readonly [number, number];
}

/** The scene-owned, deterministically sampled camera. */
export class SceneCamera extends Tattva<Camera3DState> {
  constructor(viewHeight: number, private readonly frameAspect: number) {
    super({
      id: "venu-scene-camera",
      state: Camera3D.orthographic({ viewHeight })
        .position([0, 0, 8])
        .lookAt([0, 0, 0])
        .toState(),
    });
  }

  perspective(options: PerspectiveCameraOptions = {}): this {
    const projection = Camera3D.perspective(options).toState();
    return this.setInitial({
      cameraProjection: projection.cameraProjection,
      cameraFov: projection.cameraFov,
      cameraNear: projection.cameraNear,
      cameraFar: projection.cameraFar,
    });
  }

  orthographic(options: OrthographicCameraOptions = {}): this {
    const projection = Camera3D.orthographic({
      ...options,
      viewHeight: options.viewHeight ?? this.initialState.cameraViewHeight,
    }).toState();
    return this.setInitial({
      cameraProjection: projection.cameraProjection,
      cameraViewHeight: projection.cameraViewHeight,
      cameraNear: projection.cameraNear,
      cameraFar: projection.cameraFar,
    });
  }

  position([cameraX, cameraY, cameraZ]: Vec3): this {
    return this.setInitial({ cameraX, cameraY, cameraZ });
  }

  lookAt([cameraTargetX, cameraTargetY, cameraTargetZ]: Vec3): this {
    return this.setInitial({ cameraTargetX, cameraTargetY, cameraTargetZ });
  }

  up([cameraUpX, cameraUpY, cameraUpZ]: Vec3): this {
    return this.setInitial({ cameraUpX, cameraUpY, cameraUpZ });
  }

  zoom(cameraZoom: number): this {
    return this.setInitial({ cameraZoom: positive(cameraZoom, "Camera zoom") });
  }

  fov(cameraFov: number): this {
    return this.setInitial({
      cameraFov: range(cameraFov, 0.1, 179, "Camera field of view"),
    });
  }

  viewHeight(cameraViewHeight: number): this {
    return this.setInitial({
      cameraViewHeight: positive(cameraViewHeight, "Orthographic view height"),
    });
  }

  viewWidth(cameraViewWidth: number): this {
    return this.viewHeight(positive(cameraViewWidth, "Orthographic view width") / this.frameAspect);
  }

  clipping(cameraNear: number, cameraFar: number): this {
    const builder = new Camera3DBuilder(this.initialState.cameraProjection)
      .clipping(cameraNear, cameraFar);
    const clipping = builder.toState();
    return this.setInitial({ cameraNear: clipping.cameraNear, cameraFar: clipping.cameraFar });
  }

  zoomIn(factor: number): this {
    return this.zoom(this.initialState.cameraZoom * positive(factor, "Camera zoom factor"));
  }

  zoomOut(factor: number): this {
    return this.zoom(this.initialState.cameraZoom / positive(factor, "Camera zoom factor"));
  }

  forward(): Vec3 {
    return normalize([
      this.initialState.cameraTargetX - this.initialState.cameraX,
      this.initialState.cameraTargetY - this.initialState.cameraY,
      this.initialState.cameraTargetZ - this.initialState.cameraZ,
    ], "Camera position and target must differ");
  }

  right(): Vec3 {
    return normalize(cross(this.forward(), [
      this.initialState.cameraUpX,
      this.initialState.cameraUpY,
      this.initialState.cameraUpZ,
    ]), "Camera up direction must not be parallel to its view direction");
  }

  frameBoundsAtZ(planeZ = 0): CameraFrameBounds | undefined {
    if (!Number.isFinite(planeZ)) throw new Error(`Camera plane Z must be finite; received ${planeZ}.`);
    const state = this.initialState;
    const position: Vec3 = [state.cameraX, state.cameraY, state.cameraZ];
    const forward = this.forward();
    const right = this.right();
    const cameraUp = normalize(cross(right, forward), "Camera up direction is invalid");
    const halfHeight = state.cameraProjection === "orthographic"
      ? state.cameraViewHeight / (2 * state.cameraZoom)
      : Math.tan(state.cameraFov * Math.PI / 360) * state.cameraZoom ** -1;
    const halfWidth = halfHeight * this.frameAspect;
    const points: Array<readonly [number, number]> = [];

    for (const [horizontal, vertical] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
      const offset = add(scale(right, horizontal * halfWidth), scale(cameraUp, vertical * halfHeight));
      const origin = state.cameraProjection === "orthographic" ? add(position, offset) : position;
      const direction = state.cameraProjection === "orthographic"
        ? forward
        : normalize(add(forward, offset), "Camera corner ray is invalid");
      if (Math.abs(direction[2]) <= Number.EPSILON) return undefined;
      const distance = (planeZ - origin[2]) / direction[2];
      if (!Number.isFinite(distance)) return undefined;
      const intersection = add(origin, scale(direction, distance));
      points.push([intersection[0], intersection[1]]);
    }

    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    if (maxX - minX <= Number.EPSILON || maxY - minY <= Number.EPSILON) return undefined;
    return {
      min: [minX, minY],
      max: [maxX, maxY],
      width: maxX - minX,
      height: maxY - minY,
      center: [(minX + maxX) / 2, (minY + maxY) / 2],
    };
  }
}

export class Camera3DBuilder {
  private readonly state: Camera3DValues;

  constructor(projection: CameraProjection) {
    this.state = { ...defaultCamera3DValues, cameraProjection: projection };
  }

  position([x, y, z]: Vec3): this {
    Object.assign(this.state, { cameraX: x, cameraY: y, cameraZ: z });
    return this;
  }

  lookAt([x, y, z]: Vec3): this {
    Object.assign(this.state, { cameraTargetX: x, cameraTargetY: y, cameraTargetZ: z });
    return this;
  }

  up([x, y, z]: Vec3): this {
    Object.assign(this.state, { cameraUpX: x, cameraUpY: y, cameraUpZ: z });
    return this;
  }

  zoom(value: number): this {
    this.state.cameraZoom = positive(value, "Camera zoom");
    return this;
  }

  fov(degrees: number): this {
    this.state.cameraFov = range(degrees, 0.1, 179, "Camera field of view");
    return this;
  }

  viewHeight(value: number): this {
    this.state.cameraViewHeight = positive(value, "Orthographic view height");
    return this;
  }

  clipping(near: number, far: number): this {
    if (
      !Number.isFinite(near)
      || !Number.isFinite(far)
      || near >= far
      || (this.state.cameraProjection === "perspective" && near <= 0)
    ) {
      throw new Error(`Camera clipping requires finite near < far; received ${near}, ${far}.`);
    }
    this.state.cameraNear = near;
    this.state.cameraFar = far;
    return this;
  }

  toState(): Camera3DValues {
    return { ...this.state };
  }
}

export const Camera3D = {
  perspective(options: PerspectiveCameraOptions = {}): Camera3DBuilder {
    const camera = new Camera3DBuilder("perspective");
    if (options.fov !== undefined) camera.fov(options.fov);
    if (options.near !== undefined || options.far !== undefined) {
      camera.clipping(options.near ?? 0.1, options.far ?? 1000);
    }
    return camera;
  },

  orthographic(options: OrthographicCameraOptions = {}): Camera3DBuilder {
    const camera = new Camera3DBuilder("orthographic");
    if (options.viewHeight !== undefined) camera.viewHeight(options.viewHeight);
    if (options.near !== undefined || options.far !== undefined) {
      camera.clipping(options.near ?? -1000, options.far ?? 1000);
    } else {
      camera.clipping(-1000, 1000);
    }
    return camera;
  },
};

function positive(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive finite number; received ${value}.`);
  }
  return value;
}

function range(value: number, minimum: number, maximum: number, label: string): number {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${label} must be between ${minimum} and ${maximum}; received ${value}.`);
  }
  return value;
}

function add(left: Vec3, right: Vec3): Vec3 {
  return [left[0] + right[0], left[1] + right[1], left[2] + right[2]];
}

function scale(vector: Vec3, factor: number): Vec3 {
  return [vector[0] * factor, vector[1] * factor, vector[2] * factor];
}

function cross(left: Vec3, right: Vec3): Vec3 {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0],
  ];
}

function normalize(vector: Vec3, message: string): Vec3 {
  const length = Math.hypot(...vector);
  if (!Number.isFinite(length) || length <= Number.EPSILON) throw new Error(message);
  const normalized = scale(vector, 1 / length);
  return [
    Math.abs(normalized[0]) <= Number.EPSILON ? 0 : normalized[0],
    Math.abs(normalized[1]) <= Number.EPSILON ? 0 : normalized[1],
    Math.abs(normalized[2]) <= Number.EPSILON ? 0 : normalized[2],
  ];
}
