import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, extname, isAbsolute, join, resolve } from "node:path";
import type { Page } from "playwright-core";
import type { GifCapture, ScreenshotCapture } from "../core/Scene.ts";
import { createGifEncoder } from "./encode.ts";

export interface AuthoredCaptureMetadata {
  readonly duration: number;
  readonly screenshotCaptures: readonly ScreenshotCapture[];
  readonly gifCaptures: readonly GifCapture[];
}

export interface AuthoredCaptureOptions {
  readonly output: string;
  readonly fps: number;
  readonly transparent?: boolean;
}

export interface AuthoredCaptureResult {
  readonly screenshots: readonly string[];
  readonly gifs: readonly string[];
}

/** Render scene-authored PNG timestamps and GIF timestamp groups at exact virtual times. */
export async function captureAuthoredArtifacts(
  page: Page,
  metadata: AuthoredCaptureMetadata,
  options: AuthoredCaptureOptions,
): Promise<AuthoredCaptureResult> {
  validateCaptureTimes(metadata);
  const artifactDirectory = dirname(resolve(options.output));
  const stage = page.locator("#stage");
  const screenshots: string[] = [];
  let unnamedIndex = 0;
  for (const capture of metadata.screenshotCaptures) {
    await page.evaluate((time) => window.__murali?.renderFrame(time), capture.time);
    const png = await stage.screenshot({ type: "png", omitBackground: options.transparent === true });
    const path = capture.name === undefined
      ? join(artifactDirectory, "captures", `capture_${String(unnamedIndex++).padStart(5, "0")}.png`)
      : isAbsolute(capture.name) ? capture.name : join(artifactDirectory, capture.name);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, png);
    screenshots.push(path);
  }

  const gifs: string[] = [];
  for (const capture of metadata.gifCaptures) {
    const path = join(artifactDirectory, "gifs", `${sanitizeStem(capture.name)}.gif`);
    const encoder = await createGifEncoder(path, capture.fps ?? options.fps);
    for (const time of capture.times) {
      await page.evaluate((sampled) => window.__murali?.renderFrame(sampled), time);
      await encoder.write(await stage.screenshot({ type: "png", omitBackground: options.transparent === true }));
    }
    await encoder.finish();
    gifs.push(path);
  }
  return { screenshots, gifs };
}

function validateCaptureTimes(metadata: AuthoredCaptureMetadata): void {
  const validate = (time: number, label: string): void => {
    if (!Number.isFinite(time) || time < 0 || time > metadata.duration + 1e-9) {
      throw new Error(`${label} ${time} must be inside the scene duration 0..${metadata.duration}.`);
    }
  };
  metadata.screenshotCaptures.forEach((capture) => validate(capture.time, "Screenshot capture time"));
  metadata.gifCaptures.forEach((capture) => {
    if (capture.times.length === 0) throw new Error(`GIF capture ${JSON.stringify(capture.name)} has no frame times.`);
    capture.times.forEach((time) => validate(time, `GIF capture ${JSON.stringify(capture.name)} time`));
  });
}

function sanitizeStem(value: string): string {
  const fileName = basename(value, extname(value));
  const sanitized = fileName.replace(/[^A-Za-z0-9._-]+/gu, "_").replace(/^\.+|\.+$/gu, "");
  return sanitized || "capture";
}
