import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import { chromium, type Page } from "playwright-core";
import { bundleScene } from "./bundle.ts";
import { frameCount } from "./frames.ts";
import { resolveAudioTrack, type AudioTrack } from "./audio.ts";

export interface PreviewOptions {
  headless?: boolean;
  /** Values exposed to the scene as `globalThis.__muraliArgs` before it loads. */
  args?: Record<string, string>;
  /** Runs after the window is showing the scene. The window closes when this returns. */
  ready?: (page: Page) => Promise<void>;
  /** Loop an audio file across the full preview or a scene-time interval. */
  audio?: AudioTrack;
  /** Close the preview this many seconds after its first playback completes. */
  autoCloseAfter?: number;
}

interface SceneMetadata {
  width: number;
  height: number;
  duration: number;
  fps: number;
}

export async function previewScene(
  scenePath: string,
  options: PreviewOptions = {},
): Promise<{ duration: number }> {
  if (options.autoCloseAfter !== undefined && (!Number.isFinite(options.autoCloseAfter) || options.autoCloseAfter < 0)) {
    throw new Error(`Preview auto-close delay must be a non-negative finite number; received ${options.autoCloseAfter}.`);
  }
  const bundle = await bundleScene(scenePath);
  const browser = await chromium.launch({
    headless: options.headless ?? false,
    args: ["--autoplay-policy=no-user-gesture-required"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
    });
    page.on("pageerror", (error) => {
      process.stderr.write(`Preview failed: ${error.message}\n`);
    });
    await page.addInitScript(`globalThis.__muraliArgs = ${JSON.stringify(options.args ?? {})};`);
    await page.setContent(previewDocument(basename(scenePath)));
    await page.evaluate((args) => {
      (globalThis as typeof globalThis & { __muraliArgs?: Record<string, string> }).__muraliArgs = args;
    }, options.args ?? {});
    await page.addScriptTag({ content: bundle, type: "module" });
    await page.waitForFunction(() => window.__muraliReady === true);
    const metadata = await page.evaluate((): SceneMetadata | null => {
      const api = window.__murali;
      if (!api) return null;
      return { width: api.width, height: api.height, duration: api.duration, fps: api.fps };
    });
    if (!metadata) throw new Error("Scene runtime did not expose metadata.");

    const fps = metadata.fps;
    const audio = await previewAudio(options.audio, metadata.duration);
    await page.addScriptTag({
      content: playerScript({
        ...metadata,
        fps,
        frames: frameCount(metadata.duration, fps),
        audio,
      }),
    });

    if (options.headless !== true) process.stdout.write(
      options.autoCloseAfter === undefined
        ? `Previewing ${basename(scenePath)}. Close the window to exit.\n`
        : `Previewing ${basename(scenePath)}. Auto-closing ${options.autoCloseAfter.toFixed(2)}s after playback.\n`,
    );
    if (options.ready) {
      await options.ready(page);
    } else if (options.autoCloseAfter !== undefined) {
      await waitForPlaybackAndClose(page, options.autoCloseAfter);
    } else {
      await new Promise<void>((resolve, reject) => {
        browser.on("disconnected", () => resolve());
        page.on("close", () => resolve());
        page.on("crash", () => reject(new Error("The preview window crashed.")));
      });
    }
    return { duration: metadata.duration };
  } finally {
    await browser.close().catch(() => undefined);
  }
}

async function waitForPlaybackAndClose(page: Page, delay: number): Promise<void> {
  const manuallyClosed = new Promise<void>((resolve) => page.once("close", () => resolve()));
  const completed = page
    .waitForFunction(() => window.__muraliPreviewFinished === true, undefined, { timeout: 0 })
    .then(async () => {
      if (delay > 0 && !page.isClosed()) await page.waitForTimeout(delay * 1000);
    })
    .catch((error: unknown) => {
      if (!page.isClosed()) throw error;
    });
  await Promise.race([manuallyClosed, completed]);
}

function previewDocument(title: string): string {
  return `<!doctype html>
<html>
<head>
  <title>Preview — ${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; height: 100%; overflow: hidden; background: #0e1116; color: #e8eef7; font-family: ui-sans-serif, system-ui, sans-serif; }
    body { display: flex; flex-direction: column; }
    #fit { flex: 1; display: flex; align-items: center; justify-content: center; min-height: 0; }
    #frame { position: relative; overflow: hidden; flex: none; background: #000; }
    #stage { position: absolute; left: 0; top: 0; overflow: hidden; transform-origin: top left; }
    #bar { display: flex; gap: 10px; align-items: center; padding: 10px 14px; background: #161b22; border-top: 1px solid #2a3340; }
    button { background: #222a35; color: inherit; border: 1px solid #3a4656; border-radius: 6px; padding: 6px 10px; font: inherit; }
    button:hover { background: #2a3442; }
    #murali-scrub { flex: 1; accent-color: #7dd3fc; }
    #murali-readout { min-width: 12rem; text-align: right; font-variant-numeric: tabular-nums; color: #b7c3d4; }
  </style>
</head>
<body>
  <div id="fit"><div id="frame"><div id="stage"></div></div></div>
  <div id="bar">
    <button id="murali-play" type="button">Play</button>
    <button id="murali-prev" type="button">Prev</button>
    <button id="murali-next" type="button">Next</button>
    <input id="murali-scrub" type="range" min="0" max="0" step="any" value="0" aria-label="Scene time">
    <span id="murali-readout"></span>
  </div>
</body>
</html>`;
}

interface PreviewAudio {
  url: string;
  start: number;
  end: number;
  volume: number;
}

async function previewAudio(
  authored: AudioTrack | undefined,
  duration: number,
): Promise<PreviewAudio | undefined> {
  const audio = await resolveAudioTrack(authored, duration);
  if (!audio) return undefined;
  const bytes = await readFile(audio.source);
  const mime = audioMimeType(extname(audio.source));
  return {
    url: `data:${mime};base64,${bytes.toString("base64")}`,
    start: audio.start,
    end: audio.end,
    volume: audio.volume,
  };
}

function audioMimeType(extension: string): string {
  switch (extension.toLowerCase()) {
    case ".mp3": return "audio/mpeg";
    case ".m4a":
    case ".mp4": return "audio/mp4";
    case ".ogg":
    case ".oga": return "audio/ogg";
    case ".wav": return "audio/wav";
    case ".flac": return "audio/flac";
    case ".aac": return "audio/aac";
    default: return "application/octet-stream";
  }
}

function playerScript(input: SceneMetadata & { frames: number; audio?: PreviewAudio }): string {
  return `(() => {
  const input = ${JSON.stringify(input)};
  const api = window.__murali;
  const stage = document.querySelector("#stage");
  const frameElement = document.querySelector("#frame");
  const playButton = document.querySelector("#murali-play");
  const scrub = document.querySelector("#murali-scrub");
  const readout = document.querySelector("#murali-readout");
  if (!api || !stage || !frameElement || !playButton || !scrub || !readout) return;

  const width = input.width;
  const height = input.height;
  const duration = input.duration;
  const fps = input.fps;
  const frames = input.frames;
  let time = 0;
  let frame = 0;
  let playing = duration > 0;
  window.__muraliPreviewFinished = duration <= 0;
  let lastTick = performance.now();
  const audio = input.audio ? new Audio(input.audio.url) : null;
  if (audio) {
    audio.id = "murali-audio";
    audio.loop = true;
    audio.volume = input.audio.volume;
    audio.preload = "auto";
    audio.dataset.start = String(input.audio.start);
    audio.dataset.end = String(input.audio.end);
    audio.dataset.volume = String(input.audio.volume);
    document.body.appendChild(audio);
  }

  const syncAudio = (seek = false) => {
    if (!audio || !input.audio) return;
    const active = time >= input.audio.start && time < input.audio.end;
    if (!active || !playing) {
      audio.pause();
      return;
    }
    if (seek || audio.paused) {
      const elapsed = Math.max(0, time - input.audio.start);
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        audio.currentTime = elapsed % audio.duration;
      }
    }
    if (audio.paused) void audio.play().catch(() => undefined);
  };

  const show = (nextTime, nextFrame = Math.round(nextTime * fps), seekAudio = false) => {
    time = Math.min(Math.max(nextTime, 0), duration);
    frame = Math.min(frames - 1, Math.max(0, nextFrame));
    api.renderFrame(time);
    scrub.max = String(duration);
    scrub.value = String(time);
    playButton.textContent = playing ? "Pause" : "Play";
    readout.textContent = time.toFixed(2) + "s / " + duration.toFixed(2) + "s  ·  frame " + (frame + 1) + "/" + frames;
    syncAudio(seekAudio);
  };

  const fit = () => {
    const bar = document.querySelector("#bar");
    const availableHeight = window.innerHeight - (bar ? bar.offsetHeight : 0);
    const scale = Math.min(window.innerWidth / width, availableHeight / height);
    frameElement.style.width = Math.max(1, width * scale) + "px";
    frameElement.style.height = Math.max(1, height * scale) + "px";
    stage.style.transform = "scale(" + scale + ")";
  };

  const step = (delta) => {
    playing = false;
    const nextFrame = Math.min(frames - 1, Math.max(0, frame + delta));
    show(nextFrame / fps, nextFrame, true);
  };

  playButton.addEventListener("click", () => {
    if (playing) {
      playing = false;
    } else {
      if (time >= duration) show(0, 0, true);
      playing = duration > 0;
      window.__muraliPreviewFinished = duration <= 0;
      lastTick = performance.now();
    }
    show(time, frame, false);
  });
  const previous = document.querySelector("#murali-prev");
  const next = document.querySelector("#murali-next");
  if (previous) previous.addEventListener("click", () => step(-1));
  if (next) next.addEventListener("click", () => step(1));
  scrub.addEventListener("input", () => {
    playing = false;
    show(Number(scrub.value), undefined, true);
  });
  window.addEventListener("keydown", (event) => {
    if (event.code === "Space") {
      event.preventDefault();
      playButton.click();
    } else if (event.code === "ArrowRight") {
      event.preventDefault();
      step(1);
    } else if (event.code === "ArrowLeft") {
      event.preventDefault();
      step(-1);
    }
  });
  window.addEventListener("resize", fit);

  const tick = (now) => {
    if (playing) {
      time += (now - lastTick) / 1000;
      if (time >= duration) {
        time = duration;
        playing = false;
        window.__muraliPreviewFinished = true;
      }
      show(time, Math.floor(time * fps));
    }
    lastTick = now;
    requestAnimationFrame(tick);
  };

  fit();
  show(0, 0, true);
  requestAnimationFrame(tick);
})();`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
