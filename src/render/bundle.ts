import { build } from "esbuild";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export async function bundleScene(scenePath: string): Promise<string> {
  const absoluteScene = resolve(scenePath);
  const bundlePath = fileURLToPath(import.meta.url);
  const runtimePath = resolve(dirname(bundlePath), `runtime${extname(bundlePath)}`);
  const source = `
    import * as sceneModule from ${JSON.stringify(absoluteScene)};
    import { mountAndExpose } from ${JSON.stringify(runtimePath)};
    const SceneClass = window.__venuSceneClass ?? Reflect.get(sceneModule, "default");
    if (!SceneClass) throw new Error("The scene file must call render(import.meta.url, SceneClass, options) or export a default Scene class.");
    mountAndExpose(SceneClass);
  `;
  const result = await build({
    stdin: { contents: source, loader: "ts", resolveDir: process.cwd() },
    bundle: true,
    write: false,
    platform: "browser",
    format: "esm",
    target: "chrome120",
    jsx: "automatic",
  });
  return result.outputFiles[0]?.text ?? "";
}
