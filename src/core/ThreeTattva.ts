import type { Camera, Scene as ThreeScene, WebGLRenderer } from "three";
import { Tattva, type TattvaOptions, type TattvaState } from "./Tattva.ts";
import {
  type Camera3DBuilder,
  type Camera3DState,
  defaultCamera3DValues,
} from "./Camera3D.ts";

export interface ThreeContext {
  scene: ThreeScene;
  camera: Camera;
  renderer: WebGLRenderer;
}

export interface ThreeHooks<State extends Camera3DState> {
  setup: (context: ThreeContext) => void;
  update?: (context: ThreeContext, state: Readonly<State>) => void;
}

export class ThreeTattva<State extends Camera3DState = Camera3DState> extends Tattva<State> {
  override readonly kind = "three" as const;

  constructor(readonly hooks: ThreeHooks<State>, options: TattvaOptions<State> = {}) {
    super({
      ...options,
      state: { ...defaultCamera3DValues, ...options.state } as Partial<State>,
    });
  }

  camera(builder: Camera3DBuilder): this {
    return this.setInitial(builder.toState() as Partial<State>);
  }
}
