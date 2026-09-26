import assert from "node:assert/strict";
import { resolve } from "node:path";
import { test } from "node:test";
import { previewRequested } from "../src/render/render.ts";
import { frameCount } from "../src/render/frames.ts";
import { previewScene } from "../src/render/preview.ts";

test("preview is requested only by the flag or an explicit option", () => {
  assert.equal(previewRequested(["node", "scene.ts"], false), false);
  assert.equal(previewRequested(["node", "scene.ts", "--preview"], false), true);
  assert.equal(previewRequested(["node", "scene.ts"], true), true);
});

test("counts export frames from duration and frame rate", () => {
  assert.equal(frameCount(0, 30), 1);
  assert.equal(frameCount(2, 30), 60);
  assert.equal(frameCount(1 / 30, 30), 1);
});

test("preview seeks the scene without writing a video", { timeout: 60_000 }, async () => {
  const result = await previewScene(resolve("examples/basic.ts"), {
    headless: true,
    async ready(page) {
      await page.locator("#venu-scrub").evaluate((input) => {
        const scrub = input as HTMLInputElement;
        scrub.value = "0";
        scrub.dispatchEvent(new Event("input", { bubbles: true }));
      });
      const hidden = await page.locator(".venu-transform").first().evaluate((element) => {
        return (element as HTMLElement).style.opacity;
      });
      await page.locator("#venu-scrub").evaluate((input) => {
        const scrub = input as HTMLInputElement;
        scrub.value = "0.9";
        scrub.dispatchEvent(new Event("input", { bubbles: true }));
      });
      const shown = await page.locator(".venu-transform").first().evaluate((element) => {
        return (element as HTMLElement).style.opacity;
      });
      const readout = await page.locator("#venu-readout").innerText();
      assert.equal(hidden, "0");
      assert.equal(shown, "1");
      assert.match(readout, /0\.90s/);
    },
  });
  assert.ok(result.duration > 0);
});

test("preview scrubs semantic text and path reveals", { timeout: 60_000 }, async () => {
  await previewScene(resolve("examples/text-and-paths.ts"), {
    headless: true,
    async ready(page) {
      const seek = (time: number) => page.locator("#venu-scrub").evaluate((input, value) => {
        const scrub = input as HTMLInputElement;
        scrub.value = String(value);
        scrub.dispatchEvent(new Event("input", { bubbles: true }));
      }, time);

      await seek(0.5);
      const partialTitle = await page.locator(".venu-content").first().innerText();
      assert.ok(partialTitle.length > 0);
      assert.ok(partialTitle.length < "Text and Paths ✨".length);

      await seek(4.2);
      const arrow = page.locator("[data-venu-path]").nth(1);
      assert.equal(await arrow.getAttribute("stroke-dashoffset"), "0");
      assert.equal(await arrow.evaluate((path) => getComputedStyle(path).stroke), "rgb(56, 189, 248)");
    },
  });
});

test("preview composes hierarchical XYZ transforms while overlays stay camera-independent", { timeout: 60_000 }, async () => {
  await previewScene(resolve("examples/css-3d-transforms.ts"), {
    headless: true,
    async ready(page) {
      const seek = (time: number) => page.locator("#venu-scrub").evaluate((input, value) => {
        const scrub = input as HTMLInputElement;
        scrub.value = String(value);
        scrub.dispatchEvent(new Event("input", { bubbles: true }));
      }, time);
      const worldRoot = page.locator('[data-venu-layer="world"] > .venu-transform').first();
      const child = worldRoot.locator(".venu-transform").first();
      const overlay = page.locator('[data-venu-layer="overlay"] > .venu-transform').first();

      await seek(0);
      const initialRootTransform = await worldRoot.evaluate((element) => (element as HTMLElement).style.transform);
      const initialOverlay = await overlay.boundingBox();
      await seek(2);
      const animatedRootTransform = await worldRoot.evaluate((element) => (element as HTMLElement).style.transform);
      const childTransform = await child.evaluate((element) => (element as HTMLElement).style.transform);
      const animatedOverlay = await overlay.boundingBox();
      const childBounds = await child.boundingBox();

      assert.match(initialRootTransform, /matrix3d/);
      assert.notEqual(animatedRootTransform, initialRootTransform);
      assert.match(childTransform, /rotateX\(/);
      assert.ok(childBounds && childBounds.width > 0 && childBounds.height > 0);
      assert.deepEqual(animatedOverlay, initialOverlay);
    },
  });
});
