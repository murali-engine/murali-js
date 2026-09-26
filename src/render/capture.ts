import { chromium } from "playwright-core";
import { resolve } from "node:path";
import { bundleScene } from "./bundle.ts";
import { createEncoder } from "./encode.ts";
import { createProgressReporter } from "./progress.ts";

export interface RenderOptions {
  output: string;
  fps?: number;
  progress?: boolean;
  onProgress?: (completed: number, total: number) => void;
}

export async function renderScene(scenePath: string, options: RenderOptions): Promise<{ frames: number; duration: number }> {
  const bundle = await bundleScene(scenePath);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    await page.setContent(`<!doctype html><html><head><style>*{box-sizing:border-box}html,body{margin:0;overflow:hidden}#stage{position:relative;overflow:hidden}</style></head><body><div id="stage"></div></body></html>`);
    await page.addScriptTag({ content: bundle, type: "module" });
    await page.waitForFunction(() => window.__venuReady === true);
    const metadata = await page.evaluate(() => window.__venu);
    if (!metadata) throw new Error("Scene runtime did not expose metadata.");

    await page.setViewportSize({ width: metadata.width, height: metadata.height });
    const fps = options.fps ?? metadata.fps;
    const frames = Math.max(1, Math.ceil(metadata.duration * fps));
    const encoder = await createEncoder(resolve(options.output), fps);
    const reportProgress = options.onProgress
      ?? (options.progress === false ? undefined : createProgressReporter());
    for (let frame = 0; frame < frames; frame += 1) {
      await page.evaluate((time) => window.__venu?.renderFrame(time), frame / fps);
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
