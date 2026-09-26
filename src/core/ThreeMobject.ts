import type { Camera, Scene as ThreeScene, WebGLRenderer } from "three";
import { Mobject, type MobjectOptions, type MobjectState } from "./Mobject.ts";

export interface ThreeContext {
  scene: ThreeScene;
  camera: Camera;
  renderer: WebGLRenderer;
}

export interface ThreeHooks<State extends MobjectState> {
  setup: (context: ThreeContext) => void;
  update?: (context: ThreeContext, state: Readonly<State>) => void;
}

export class ThreeMobject<State extends MobjectState = MobjectState> extends Mobject<State> {
  override readonly kind = "three" as const;

  constructor(readonly hooks: ThreeHooks<State>, options: MobjectOptions = {}) {
    super(options);
  }
}
