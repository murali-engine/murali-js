import { readFile } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { RenderOptions } from "./capture.ts";
import type { AudioTrack } from "./audio.ts";

interface FileRenderConfig {
  output?: string;
  outputDir?: string;
  fps?: number;
  progress?: boolean;
  transparent?: boolean;
  at?: number;
  audio?: AudioTrack;
}

interface MuraliConfig {
  render?: FileRenderConfig;
}

export interface RenderOverrides extends Partial<RenderOptions> {
  configFile?: string;
  /** Open a preview window instead of writing an MP4. */
  preview?: boolean;
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

function parseBoolean(value: string | undefined, label: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (["1", "true", "yes", "on"].includes(value.toLowerCase())) return true;
  if (["0", "false", "no", "off"].includes(value.toLowerCase())) return false;
  throw new Error(`${label} must be a boolean; received ${value}.`);
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

  const configuredFps = env.MURALI_FPS;
  const fps = overrides.fps
    ?? (configuredFps === undefined ? renderConfig.fps : Number.parseFloat(configuredFps));
  if (fps !== undefined && (!Number.isFinite(fps) || fps <= 0)) {
    throw new Error(`Render FPS must be a positive number; received ${String(fps)}.`);
  }

  const sourceName = basename(sourcePath, extname(sourcePath));
  const outputDirectory = env.MURALI_OUTPUT_DIR ?? renderConfig.outputDir ?? "./output";
  const output = overrides.output
    ?? env.MURALI_OUTPUT
    ?? renderConfig.output
    ?? join(outputDirectory, `${sourceName}.mp4`);
  const progress = overrides.progress
    ?? parseBoolean(env.MURALI_PROGRESS, "Render progress")
    ?? renderConfig.progress
    ?? true;
  const transparent = overrides.transparent
    ?? parseBoolean(env.MURALI_TRANSPARENT, "Render transparency")
    ?? renderConfig.transparent
    ?? false;
  const configuredAt = env.MURALI_AT;
  const at = overrides.at
    ?? (configuredAt === undefined ? renderConfig.at : Number.parseFloat(configuredAt));
  if (at !== undefined && (!Number.isFinite(at) || at < 0)) {
    throw new Error(`PNG sample time must be a non-negative number; received ${String(at)}.`);
  }
  const audio = overrides.audio
    ?? env.MURALI_AUDIO
    ?? renderConfig.audio;

  return {
    sourcePath,
    options: {
      output,
      fps,
      progress,
      onProgress: overrides.onProgress,
      format: overrides.format,
      transparent,
      at,
      args: overrides.args,
      audio,
    },
  };
}
