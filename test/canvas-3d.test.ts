import assert from "node:assert/strict";
import { resolve } from "node:path";
import { test } from "node:test";
import { Canvas3DTattva } from "../src/core/Canvas3DTattva.ts";
import { previewScene } from "../src/render/preview.ts";

test("Canvas3DTattva validates and exposes authored world size", () => {
  const canvas = new Canvas3DTattva({ draw() {} }, { size: [4, 2] });
  assert.equal(canvas.kind, "canvas3d");
  assert.equal(canvas.tag, "canvas");
  assert.deepEqual(canvas.worldSize, { width: 4, height: 2 });
  assert.throws(
    () => new Canvas3DTattva({ draw() {} }, { size: [4, Number.NaN] }),
    /positive finite values/,
  );
});

test("Canvas3DTattva draws WebGL2 frames from arbitrary sampled times", { timeout: 60_000 }, async () => {
  await previewScene(resolve("test/fixtures/canvas-3d-scene.ts"), {
    headless: true,
    async ready(page) {
      await page.locator("#murali-play").click();
      const inspect = () => page.locator("[data-murali-canvas3d]").evaluate((element) => {
        const canvas = element as HTMLCanvasElement;
        const gl = canvas.getContext("webgl2");
        if (!gl) throw new Error("Missing WebGL2 context.");
        const pixel = new Uint8Array(4);
        gl.readPixels(10, 10, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        return {
          width: canvas.width,
          height: canvas.height,
          setupCount: canvas.dataset.setupCount,
          sample: JSON.parse(canvas.dataset.sample ?? "null"),
          pixel: [...pixel],
        };
      });

      await page.evaluate(() => window.__murali?.renderFrame(1));
      const end = await inspect();
      assert.equal(end.width, 400);
      assert.equal(end.height, 200);
      assert.equal(end.setupCount, "1");
      assert.deepEqual(end.sample, { time: 1, fps: 20, frame: 20, duration: 1, progress: 1 });
      assert.deepEqual(end.pixel, [0, 255, 0, 255]);

      await page.evaluate(() => window.__murali?.renderFrame(0));
      const start = await inspect();
      assert.deepEqual(start.sample, { time: 0, fps: 20, frame: 0, duration: 1, progress: 0 });
      assert.deepEqual(start.pixel, [255, 0, 0, 255]);
    },
  });
});
