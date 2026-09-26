import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { bundleScene } from "./bundle.ts";
import { createEncoder } from "./encode.ts";
import { frameCount } from "./frames.ts";
import { createProgressReporter } from "./progress.ts";

export interface RenderOptions {
  output: string;
  fps?: number;
  progress?: boolean;
  onProgress?: (completed: number, total: number) => void;
  /** Write one PNG instead of an MP4. Inferred when `output` ends in `.png`. */
  format?: "mp4" | "png";
  /** Omit the page background so unpainted pixels stay transparent. */
  transparent?: boolean;
  /** Scene time sampled for a PNG. Defaults to 0. */
  at?: number;
  /** Values exposed to the scene as `globalThis.__muraliArgs` before it loads. */
  args?: Record<string, string>;
}

export async function renderScene(scenePath: string, options: RenderOptions): Promise<{ frames: number; duration: number }> {
  const bundle = await bundleScene(scenePath);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    await page.addInitScript(`globalThis.__muraliArgs = ${JSON.stringify(options.args ?? {})};`);
    await page.setContent(`<!doctype html><html><head><style>*{box-sizing:border-box}html,body{margin:0;overflow:hidden;background:transparent}#stage{position:relative;overflow:hidden}</style></head><body><div id="stage"></div></body></html>`);
    await page.addScriptTag({ content: bundle, type: "module" });
    await page.waitForFunction(() => window.__muraliReady === true);
    const metadata = await page.evaluate(() => window.__murali);
    if (!metadata) throw new Error("Scene runtime did not expose metadata.");

    await page.setViewportSize({ width: metadata.width, height: metadata.height });
    const format = options.format ?? (options.output.toLowerCase().endsWith(".png") ? "png" : "mp4");
    if (format === "png") {
      const time = options.at ?? 0;
      await page.evaluate((sampled) => window.__murali?.renderFrame(sampled), time);
      const png = await page.locator("#stage").screenshot({
        type: "png",
        omitBackground: options.transparent === true,
      });
      await mkdir(dirname(resolve(options.output)), { recursive: true });
      await writeFile(resolve(options.output), png);
      return { frames: 1, duration: metadata.duration };
    }
    const fps = options.fps ?? metadata.fps;
    const frames = frameCount(metadata.duration, fps);
    const encoder = await createEncoder(resolve(options.output), fps);
    const reportProgress = options.onProgress
      ?? (options.progress === false ? undefined : createProgressReporter());
    for (let frame = 0; frame < frames; frame += 1) {
      await page.evaluate((time) => window.__murali?.renderFrame(time), frame / fps);
      const png = await page.screenshot({ type: "png" });
      await encoder.write(png);
      reportProgress?.(frame + 1, frames);
    }
    await encoder.finish();
    return { frames, duration: metadata.duration };
  } finally {
    await browser.close();
  }
}
