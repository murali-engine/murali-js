#!/usr/bin/env node
import { Command } from "commander";
import { resolve } from "node:path";
import { renderScene } from "./render/capture.ts";
import { previewScene } from "./render/preview.ts";

const program = new Command().name("murali").description("Render deterministic TypeScript scenes to video.");

interface RenderCommandOptions {
  output: string;
  fps?: number;
  preview?: boolean;
}

async function runRender(scene: string, options: RenderCommandOptions): Promise<void> {
  if (options.preview) {
    await previewScene(resolve(scene));
    return;
  }
  let lastPercent = -1;
  const result = await renderScene(resolve(scene), {
    output: options.output,
    fps: options.fps,
    onProgress(completed, total) {
      const percent = Math.floor((completed / total) * 100);
      if (percent >= lastPercent + 10 || completed === total) {
        process.stdout.write(`Rendering ${completed}/${total} frames (${percent}%)\n`);
        lastPercent = percent;
      }
    },
  });
  process.stdout.write(`Created ${resolve(options.output)} (${result.frames} frames, ${result.duration.toFixed(2)}s)\n`);
}

program
  .command("render")
  .description("Render a scene module to MP4")
  .argument("<scene>", "scene file exporting a Scene subclass")
  .option("-o, --output <path>", "output MP4 path", "output/scene.mp4")
  .option("--fps <number>", "override the scene frame rate", Number.parseFloat)
  .option("--preview", "open a preview window instead of writing an MP4")
  .action(async (scene: string, options: RenderCommandOptions) => {
    await runRender(scene, options);
  });

await program.parseAsync();
