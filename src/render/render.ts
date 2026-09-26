import type { Scene } from "../core/Scene.ts";
import { renderScene } from "./capture.ts";
import { resolveRenderOptions, type RenderOverrides } from "./config.ts";

export type SceneConstructor = new () => Scene;

export async function render(
  source: string | URL,
  _scene: SceneConstructor,
  overrides: RenderOverrides = {},
): Promise<{ frames: number; duration: number }> {
  const resolved = await resolveRenderOptions(source, overrides);
  return renderScene(resolved.sourcePath, resolved.options);
}
