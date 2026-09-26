import { basename } from "node:path";
import { chromium, type Page } from "playwright-core";
import { bundleScene } from "./bundle.ts";
import { frameCount } from "./frames.ts";

export interface PreviewOptions {
  headless?: boolean;
  /** Values exposed to the scene as `globalThis.__venuArgs` before it loads. */
  args?: Record<string, string>;
  /** Runs after the window is showing the scene. The window closes when this returns. */
  ready?: (page: Page) => Promise<void>;
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
  const bundle = await bundleScene(scenePath);
  const browser = await chromium.launch({ headless: options.headless ?? false });
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
    });
    page.on("pageerror", (error) => {
      process.stderr.write(`Preview failed: ${error.message}\n`);
    });
    await page.addInitScript(`globalThis.__venuArgs = ${JSON.stringify(options.args ?? {})};`);
    await page.setContent(previewDocument(basename(scenePath)));
    await page.addScriptTag({ content: bundle, type: "module" });
    await page.waitForFunction(() => window.__venuReady === true);
    const metadata = await page.evaluate((): SceneMetadata | null => {
      const api = window.__venu;
      if (!api) return null;
      return { width: api.width, height: api.height, duration: api.duration, fps: api.fps };
    });
    if (!metadata) throw new Error("Scene runtime did not expose metadata.");

    const fps = metadata.fps;
    await page.addScriptTag({
      content: playerScript({
        ...metadata,
        fps,
        frames: frameCount(metadata.duration, fps),
      }),
    });

    if (options.headless !== true) {
      process.stdout.write(`Previewing ${basename(scenePath)}. Close the window to exit.\n`);
    }
    if (options.ready) {
      await options.ready(page);
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
    #venu-scrub { flex: 1; accent-color: #7dd3fc; }
    #venu-readout { min-width: 12rem; text-align: right; font-variant-numeric: tabular-nums; color: #b7c3d4; }
  </style>
</head>
<body>
  <div id="fit"><div id="frame"><div id="stage"></div></div></div>
  <div id="bar">
    <button id="venu-play" type="button">Play</button>
    <button id="venu-prev" type="button">Prev</button>
    <button id="venu-next" type="button">Next</button>
    <input id="venu-scrub" type="range" min="0" max="0" step="any" value="0" aria-label="Scene time">
    <span id="venu-readout"></span>
  </div>
</body>
</html>`;
}

function playerScript(input: SceneMetadata & { frames: number }): string {
  return `(() => {
  const input = ${JSON.stringify(input)};
  const api = window.__venu;
  const stage = document.querySelector("#stage");
  const frameElement = document.querySelector("#frame");
  const playButton = document.querySelector("#venu-play");
  const scrub = document.querySelector("#venu-scrub");
  const readout = document.querySelector("#venu-readout");
  if (!api || !stage || !frameElement || !playButton || !scrub || !readout) return;

  const width = input.width;
  const height = input.height;
  const duration = input.duration;
  const fps = input.fps;
  const frames = input.frames;
  let time = 0;
  let frame = 0;
  let playing = duration > 0;
  let lastTick = performance.now();

  const show = (nextTime, nextFrame = Math.round(nextTime * fps)) => {
    time = Math.min(Math.max(nextTime, 0), duration);
    frame = Math.min(frames - 1, Math.max(0, nextFrame));
    api.renderFrame(time);
    scrub.max = String(duration);
    scrub.value = String(time);
    playButton.textContent = playing ? "Pause" : "Play";
    readout.textContent = time.toFixed(2) + "s / " + duration.toFixed(2) + "s  ·  frame " + (frame + 1) + "/" + frames;
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
    show(nextFrame / fps, nextFrame);
  };

  playButton.addEventListener("click", () => {
    if (playing) {
      playing = false;
    } else {
      if (time >= duration) show(0, 0);
      playing = duration > 0;
      lastTick = performance.now();
    }
    show(time, frame);
  });
  const previous = document.querySelector("#venu-prev");
  const next = document.querySelector("#venu-next");
  if (previous) previous.addEventListener("click", () => step(-1));
  if (next) next.addEventListener("click", () => step(1));
  scrub.addEventListener("input", () => {
    playing = false;
    show(Number(scrub.value));
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
      }
      show(time, Math.floor(time * fps));
    }
    lastTick = now;
    requestAnimationFrame(tick);
  };

  fit();
  show(0, 0);
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
