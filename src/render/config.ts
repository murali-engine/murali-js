import { readFile } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { RenderOptions } from "./capture.ts";

interface FileRenderConfig {
  output?: string;
  outputDir?: string;
  fps?: number;
}

interface MuraliConfig {
  render?: FileRenderConfig;
}

export interface RenderOverrides extends Partial<RenderOptions> {
  configFile?: string;
}

function parseEnv(contents: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || line.trimStart().startsWith("#")) continue;
    const [, key, rawValue] = match;
    values[key] = rawValue.replace(/^(['"])(.*)\1$/, "$2");
  }
  return values;
}

async function readOptional(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

export async function resolveRenderOptions(
  source: string | URL,
  overrides: RenderOverrides = {},
): Promise<{ sourcePath: string; options: RenderOptions }> {
  const sourcePath = source instanceof URL || source.startsWith("file:")
    ? fileURLToPath(source)
    : resolve(source);
  const projectDirectory = process.cwd();
  const configPath = resolve(projectDirectory, overrides.configFile ?? "murali.json");
  const configContents = await readOptional(configPath);
  const config = configContents ? JSON.parse(configContents) as MuraliConfig : {};
  const envContents = await readOptional(resolve(projectDirectory, ".env"));
  const fileEnv = envContents ? parseEnv(envContents) : {};
  const env = { ...fileEnv, ...process.env };
  const renderConfig = config.render ?? {};

  const configuredFps = env.MURALI_FPS ?? env.VENU_FPS;
  const fps = overrides.fps
    ?? (configuredFps === undefined ? renderConfig.fps : Number.parseFloat(configuredFps));
  if (fps !== undefined && (!Number.isFinite(fps) || fps <= 0)) {
    throw new Error(`Render FPS must be a positive number; received ${String(fps)}.`);
  }

  const sourceName = basename(sourcePath, extname(sourcePath));
  const outputDirectory = env.MURALI_OUTPUT_DIR ?? env.VENU_OUTPUT_DIR ?? renderConfig.outputDir ?? "./output";
  const output = overrides.output
    ?? env.MURALI_OUTPUT
    ?? env.VENU_OUTPUT
    ?? renderConfig.output
    ?? join(outputDirectory, `${sourceName}.mp4`);

  return {
    sourcePath,
    options: {
      output,
      fps,
      onProgress: overrides.onProgress,
    },
  };
}
