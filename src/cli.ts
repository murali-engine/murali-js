#!/usr/bin/env node
import { Command } from "commander";
import { readdir } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { renderScene } from "./render/capture.ts";

const program = new Command().name("venu").description("Render deterministic TypeScript scenes to video.");

interface RenderCommandOptions {
  output: string;
  fps?: number;
}

async function runRender(scene: string, options: RenderCommandOptions): Promise<void> {
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

async function availableExamples(): Promise<Map<string, string>> {
  const examplesDirectory = resolve("examples");
  const files = await readdir(examplesDirectory);
  return new Map(
    files
      .filter((file) => /-scene\.tsx?$/.test(file))
      .sort()
      .map((file) => [basename(file).replace(/-scene\.tsx?$/, ""), resolve(examplesDirectory, file)]),
  );
}

program
  .command("render")
  .description("Render a scene module to MP4")
  .argument("<scene>", "scene file exporting a Scene subclass")
  .option("-o, --output <path>", "output MP4 path", "output/scene.mp4")
  .option("--fps <number>", "override the scene frame rate", Number.parseFloat)
  .action(async (scene: string, options: { output: string; fps?: number }) => {
    await runRender(scene, options);
  });

program
  .command("example")
  .description("Render one of the scenes in the examples directory")
  .argument("[name]", "example name", "hello")
  .option("-l, --list", "list available examples")
  .option("-o, --output <path>", "override the automatic output path")
  .option("--fps <number>", "override the scene frame rate", Number.parseFloat)
  .action(async (name: string, options: { list?: boolean; output?: string; fps?: number }) => {
    const examples = await availableExamples();
    if (options.list) {
      process.stdout.write(`${[...examples.keys()].join("\n")}\n`);
      return;
    }
    const normalizedName = name.replace(/-scene(?:\.tsx?)?$/, "");
    const scene = examples.get(normalizedName);
    if (!scene) {
      program.error(`Unknown example "${name}". Available examples: ${[...examples.keys()].join(", ")}`);
      return;
    }
    await runRender(scene, {
      output: options.output ?? `output/${normalizedName}.mp4`,
      fps: options.fps,
    });
  });

await program.parseAsync();
