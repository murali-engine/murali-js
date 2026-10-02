import type { Camera, Scene as ThreeScene, WebGLRenderer } from "three";
import { Tattva, type TattvaOptions, type TattvaState } from "./Tattva.ts";
import type { Theme } from "./theme.ts";

export interface ThreeContext {
  scene: ThreeScene;
  camera: Camera;
  renderer: WebGLRenderer;
  theme: Theme;
}

export interface ThreeHooks<State extends TattvaState> {
  setup: (context: ThreeContext) => void;
  update?: (context: ThreeContext, state: Readonly<State>) => void;
}

export class ThreeTattva<State extends TattvaState = TattvaState> extends Tattva<State> {
  override readonly kind = "three" as const;

  constructor(readonly hooks: ThreeHooks<State>, options: TattvaOptions<State> = {}) {
    super(options);
  }
}
