import type { Scene } from "../core/Scene.ts";
import { renderScene, type RenderResult } from "./capture.ts";
import { resolveRenderOptions, type RenderOverrides } from "./config.ts";
import { previewScene } from "./preview.ts";

export type SceneConstructor = new () => Scene;

export function previewRequested(argv: readonly string[], preview?: boolean): boolean {
  return preview === true || argv.includes("--preview");
}

export async function render(
  source: string | URL,
  _scene: SceneConstructor,
  overrides: RenderOverrides = {},
): Promise<RenderResult> {
  const resolved = await resolveRenderOptions(source, overrides);
  if (previewRequested(process.argv, overrides.preview)) {
    const preview = await previewScene(resolved.sourcePath, {
      args: resolved.options.args,
      audio: resolved.options.audio,
    });
    return { frames: 0, duration: preview.duration, screenshots: [], gifs: [] };
  }
  return renderScene(resolved.sourcePath, resolved.options);
}
