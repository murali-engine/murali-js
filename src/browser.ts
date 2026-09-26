export * from "./core/Animation.ts";
export * from "./core/color.ts";
export * from "./core/easing.ts";
export * from "./core/Mobject.ts";
export * from "./core/ReactMobject.ts";
export * from "./core/Scene.ts";
export * from "./core/ThreeMobject.ts";
export * from "./mobjects/shapes.ts";

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
