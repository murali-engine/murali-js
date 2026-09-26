import { build } from "esbuild";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export async function bundleScene(scenePath: string): Promise<string> {
  const absoluteScene = resolve(scenePath);
  const runtimePath = resolve(dirname(fileURLToPath(import.meta.url)), "runtime.ts");
  const source = `
    import SceneClass from ${JSON.stringify(absoluteScene)};
    import { mountAndExpose } from ${JSON.stringify(runtimePath)};
    mountAndExpose(SceneClass);
  `;
  const result = await build({
    stdin: { contents: source, loader: "ts", resolveDir: process.cwd() },
    bundle: true,
    write: false,
    platform: "browser",
    format: "iife",
    target: "chrome120",
    jsx: "automatic",
  });
  return result.outputFiles[0]?.text ?? "";
}
