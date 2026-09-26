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

/** The scene-owned, deterministically sampled camera. */
export class SceneCamera extends Tattva<Camera3DState> {
  constructor(viewHeight: number) {
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
    const projection = Camera3D.orthographic(options).toState();
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
