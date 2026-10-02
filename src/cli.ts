#!/usr/bin/env node
import { Command } from "commander";
import { resolve } from "node:path";
import { renderScene } from "./render/capture.ts";
import { previewScene } from "./render/preview.ts";

const program = new Command().name("murali").description("Render deterministic TypeScript scenes to video or PNG.");

interface RenderCommandOptions {
  output: string;
  fps?: number;
  preview?: boolean;
  transparent?: boolean;
  at?: number;
  audio?: string;
  audioStart?: number;
  audioEnd?: number;
  audioVolume?: number;
  autoCloseAfter?: number;
}

async function runRender(scene: string, options: RenderCommandOptions): Promise<void> {
  const audio = options.audio
    ? {
        source: options.audio,
        start: options.audioStart,
        end: options.audioEnd,
        volume: options.audioVolume,
      }
    : undefined;
  if (options.preview) {
    await previewScene(resolve(scene), { audio, autoCloseAfter: options.autoCloseAfter });
    return;
  }
  let lastPercent = -1;
  const result = await renderScene(resolve(scene), {
    output: options.output,
    fps: options.fps,
    transparent: options.transparent,
    at: options.at,
    audio,
    onProgress(completed, total) {
      const percent = Math.floor((completed / total) * 100);
      if (percent >= lastPercent + 10 || completed === total) {
        process.stdout.write(`Rendering ${completed}/${total} frames (${percent}%)\n`);
        lastPercent = percent;
      }
    },
  });
  process.stdout.write(`Created ${resolve(options.output)} (${result.frames} frames, ${result.duration.toFixed(2)}s)\n`);
  for (const path of result.screenshots) process.stdout.write(`Created screenshot ${path}\n`);
  for (const path of result.gifs) process.stdout.write(`Created GIF ${path}\n`);
}

program
  .command("render")
  .description("Render a scene module to MP4 or PNG")
  .argument("<scene>", "scene file exporting a Scene subclass")
  .option("-o, --output <path>", "output path (.mp4 or .png)", "output/scene.mp4")
  .option("--fps <number>", "override the scene frame rate", Number.parseFloat)
  .option("--transparent", "omit the scene background when exporting a PNG")
  .option("--at <seconds>", "scene time sampled when exporting a PNG", Number.parseFloat)
  .option("--preview", "open a preview window instead of writing an MP4")
  .option("--auto-close-after <seconds>", "close preview after playback plus this delay", Number.parseFloat)
  .option("--audio <path>", "loop an audio file in the rendered video")
  .option("--audio-start <seconds>", "scene time when audio begins", Number.parseFloat)
  .option("--audio-end <seconds>", "scene time when audio ends", Number.parseFloat)
  .option("--audio-volume <level>", "audio volume from 0 to 1", Number.parseFloat)
  .action(async (scene: string, options: RenderCommandOptions) => {
    await runRender(scene, options);
  });

await program.parseAsync();
