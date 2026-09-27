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
export * from "./core/SceneView.ts";
export * from "./tattvas/shapes.ts";
export * from "./tattvas/paths.ts";
export * from "./tattvas/graph.ts";
export * from "./tattvas/linear-algebra.ts";
export * from "./tattvas/motion.ts";
export * from "./tattvas/notation.ts";
export * from "./tattvas/fourier.ts";
export * from "./tattvas/space.ts";
export * from "./tattvas/gltf.ts";
export * from "./tattvas/prop.ts";
export * from "./tattvas/map.ts";
export * from "./tattvas/teaching.ts";
export * from "./tattvas/tensor.ts";
export * from "./tattvas/stepwise.ts";
export * from "./tattvas/chat.ts";
export * from "./tattvas/opening.ts";
export * from "./tattvas/text3d.ts";
export * from "./tattvas/word-cloud.ts";
export * from "./tattvas/wave-mesh.ts";

import type { SceneConstructor } from "./render/render.ts";
import type { RenderOverrides } from "./render/config.ts";

declare global {
  interface Window {
    __muraliSceneClass?: SceneConstructor;
  }
}

export async function render(
  _source: string | URL,
  scene: SceneConstructor,
  _overrides: RenderOverrides = {},
): Promise<{ frames: number; duration: number }> {
  window.__muraliSceneClass = scene;
  return { frames: 0, duration: 0 };
}
