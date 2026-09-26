import type { Scene } from "../core/Scene.ts";
import { renderScene } from "./capture.ts";
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
): Promise<{ frames: number; duration: number }> {
  const resolved = await resolveRenderOptions(source, overrides);
  if (previewRequested(process.argv, overrides.preview)) {
    const preview = await previewScene(resolved.sourcePath, { args: resolved.options.args });
    return { frames: 0, duration: preview.duration };
  }
  return renderScene(resolved.sourcePath, resolved.options);
}
