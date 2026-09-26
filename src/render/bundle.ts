import { build } from "esbuild";
import { readFileSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export async function bundleScene(scenePath: string): Promise<string> {
  const absoluteScene = resolve(scenePath);
  const bundlePath = fileURLToPath(import.meta.url);
  const runtimePath = resolve(dirname(bundlePath), `runtime${extname(bundlePath)}`);
  const source = `
    import * as sceneModule from ${JSON.stringify(absoluteScene)};
    import { mountAndExpose } from ${JSON.stringify(runtimePath)};
    const SceneClass = window.__muraliSceneClass ?? Reflect.get(sceneModule, "default");
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
    plugins: [{
      name: "inline-prop-files",
      setup(build) {
        build.onLoad({ filter: /[\\/]assets[\\/]props[\\/]files\.ts$/ }, (args) => {
          const directory = dirname(args.path);
          const pyramid = readFileSync(resolve(directory, "demo-pyramid.glb"));
          const appleGltf = readFileSync(resolve(directory, "demo-apple/demo-apple.gltf"), "utf8");
          const appleBin = readFileSync(resolve(directory, "demo-apple/demo-apple.bin"));
          return {
            loader: "js",
            contents: [
              `export const pyramidGlb = new Uint8Array([${pyramid.join(",")}]);`,
              `export const appleGltf = ${JSON.stringify(appleGltf)};`,
              `export const appleBin = new Uint8Array([${appleBin.join(",")}]);`,
            ].join("\n"),
          };
        });
      },
    }],
  });
  return result.outputFiles[0]?.text ?? "";
}
