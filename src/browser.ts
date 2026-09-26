export * from "./core/color.ts";
export * from "./core/palette.ts";
export * from "./core/Camera3D.ts";
export * from "./core/css.ts";
export * from "./core/easing.ts";
export * from "./core/Group.ts";
export * from "./core/ReactTattva.ts";
export * from "./core/Scene.ts";
export * from "./core/Tattva.ts";
export * from "./core/Timeline.ts";
export * from "./core/text.ts";
export * from "./core/ThreeTattva.ts";
export * from "./mobjects/shapes.ts";
export * from "./mobjects/paths.ts";
export * from "./mobjects/graph.ts";
export * from "./mobjects/linear-algebra.ts";
export * from "./mobjects/motion.ts";

import type { SceneConstructor } from "./render/render.ts";
import type { RenderOverrides } from "./render/config.ts";

declare global {
  interface Window {
    __venuSceneClass?: SceneConstructor;
  }
}

export async function render(
  _source: string | URL,
  scene: SceneConstructor,
  _overrides: RenderOverrides = {},
): Promise<{ frames: number; duration: number }> {
  window.__venuSceneClass = scene;
  return { frames: 0, duration: 0 };
}
