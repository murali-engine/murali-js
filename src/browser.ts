// Browser form of the compatibility prelude.
export * from "./core/index.ts";
export * from "./style/index.ts";
export * from "./adapters/index.ts";
export * from "./tattvas/layout/index.ts";
export * from "./tattvas/primitives/index.ts";
export * from "./tattvas/text/index.ts";
export * from "./tattvas/maths/index.ts";
export * from "./tattvas/ai/index.ts";
export * from "./tattvas/composite/index.ts";
export * from "./tattvas/storytelling/index.ts";
export * from "./tattvas/table/index.ts";
export * from "./tattvas/utility/index.ts";

import type { SceneConstructor } from "./render/render.ts";
import type { RenderOverrides } from "./render/config.ts";
import type { RenderResult } from "./render/capture.ts";

declare global {
  interface Window {
    __muraliSceneClass?: SceneConstructor;
  }
}

export async function render(
  _source: string | URL,
  scene: SceneConstructor,
  _overrides: RenderOverrides = {},
): Promise<RenderResult> {
  window.__muraliSceneClass = scene;
  return { frames: 0, duration: 0, screenshots: [], gifs: [] };
}
