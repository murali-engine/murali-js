import assert from "node:assert/strict";
import { resolve } from "node:path";
import { test } from "node:test";
import { CanvasTattva } from "../src/core/CanvasTattva.ts";
import { previewScene } from "../src/render/preview.ts";

test("CanvasTattva validates and exposes authored world size", () => {
  const canvas = new CanvasTattva({ draw() {} }, { size: [4, 2] });
  assert.equal(canvas.kind, "canvas");
  assert.equal(canvas.tag, "canvas");
  assert.deepEqual(canvas.worldSize, { width: 4, height: 2 });
  assert.throws(
    () => new CanvasTattva({ draw() {} }, { size: [0, 2] }),
    /positive finite values/,
  );
});

test("CanvasTattva draws deterministic independently sampled frames", { timeout: 60_000 }, async () => {
  await previewScene(resolve("test/fixtures/canvas-scene.ts"), {
    headless: true,
    async ready(page) {
      await page.locator("#murali-play").click();
      const inspect = () => page.locator("[data-murali-canvas]").evaluate((element) => {
        const canvas = element as HTMLCanvasElement;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Missing Canvas 2D context.");
        return {
          width: canvas.width,
          height: canvas.height,
          setupCount: canvas.dataset.setupCount,
          sample: JSON.parse(canvas.dataset.sample ?? "null"),
          left: [...context.getImageData(10, 10, 1, 1).data],
          right: [...context.getImageData(canvas.width - 10, 10, 1, 1).data],
        };
      });

      await page.evaluate(() => window.__murali?.renderFrame(1));
      const end = await inspect();
      assert.equal(end.width, 400);
      assert.equal(end.height, 200);
      assert.equal(end.setupCount, "1");
      assert.deepEqual(end.sample, { time: 1, fps: 20, frame: 20, duration: 1, progress: 1 });
      assert.deepEqual(end.left, [0, 0, 0, 0]);
      assert.deepEqual(end.right, [0, 255, 0, 255]);

      await page.evaluate(() => window.__murali?.renderFrame(0));
      const start = await inspect();
      assert.deepEqual(start.sample, { time: 0, fps: 20, frame: 0, duration: 1, progress: 0 });
      assert.deepEqual(start.left, [255, 0, 0, 255]);
      assert.deepEqual(start.right, [0, 0, 0, 0]);
    },
  });
});
