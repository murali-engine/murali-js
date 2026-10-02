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

test("automatically closes a preview after its first playback", { timeout: 60_000 }, async () => {
  const started = performance.now();
  const result = await previewScene(resolve("test/fixtures/short-preview-scene.ts"), {
    headless: true,
    autoCloseAfter: 0.02,
  });
  assert.equal(result.duration, 0.05);
  assert.ok(performance.now() - started >= 50);
  await assert.rejects(
    () => previewScene(resolve("test/fixtures/short-preview-scene.ts"), { autoCloseAfter: -1 }),
    /non-negative finite number/,
  );
});

test("preview seeks the scene without writing a video", { timeout: 60_000 }, async () => {
  const result = await previewScene(resolve("examples/basic.ts"), {
    headless: true,
    async ready(page) {
      await page.locator("#murali-scrub").evaluate((input) => {
        const scrub = input as HTMLInputElement;
        scrub.value = "0";
        scrub.dispatchEvent(new Event("input", { bubbles: true }));
      });
      const hidden = await page.locator(".murali-transform").first().evaluate((element) => {
        return (element as HTMLElement).style.opacity;
      });
      await page.locator("#murali-scrub").evaluate((input) => {
        const scrub = input as HTMLInputElement;
        scrub.value = "0.9";
        scrub.dispatchEvent(new Event("input", { bubbles: true }));
      });
      const shown = await page.locator(".murali-transform").first().evaluate((element) => {
        return (element as HTMLElement).style.opacity;
      });
      const readout = await page.locator("#murali-readout").innerText();
      assert.equal(hidden, "0");
      assert.equal(shown, "1");
      assert.match(readout, /0\.90s/);
    },
  });
  assert.ok(result.duration > 0);
});

test("preview embeds and waits for a registered local font", { timeout: 60_000 }, async () => {
  await previewScene(resolve("test/fixtures/font-scene.ts"), {
    headless: true,
    async ready(page) {
      const font = await page.locator(".murali-content").first().evaluate((element) => ({
        family: getComputedStyle(element).fontFamily,
        loaded: document.fonts.check('400 16px "Murali Test Pixel"'),
      }));
      assert.match(font.family, /Murali Test Pixel/);
      assert.equal(font.loaded, true);
    },
  });
});

test("preview updates sampled label text from a targeted updater", { timeout: 60_000 }, async () => {
  await previewScene(resolve("examples/updater-coordinate-readout.ts"), {
    headless: true,
    async ready(page) {
      const seek = (time: number) => page.locator("#murali-scrub").evaluate((input, value) => {
        const scrub = input as HTMLInputElement;
        scrub.value = String(value);
        scrub.dispatchEvent(new Event("input", { bubbles: true }));
      }, time);
      const readout = page.getByText(/^x=/u);
      await seek(0);
      assert.equal(await readout.innerText(), "x=-5.00  y=-1.20");
      await seek(2);
      assert.equal(await readout.innerText(), "x=0.00  y=0.00");
      await seek(4);
      assert.equal(await readout.innerText(), "x=5.00  y=1.20");
    },
  });
});

test("context-window headings and row labels stay inside their layout columns", { timeout: 60_000 }, async () => {
  await previewScene(resolve("examples/ai/context-window.ts"), {
    headless: true,
    async ready(page) {
      const svg = await page.locator(".murali-content svg").boundingBox();
      const heading = await page.locator("[data-context-heading]").boundingBox();
      const budget = await page.locator("[data-context-budget]").boundingBox();
      assert.ok(svg && heading && budget);
      assert.ok(heading.x >= svg.x);
      assert.ok(heading.x + heading.width + 12 <= budget.x);
      assert.ok(budget.x + budget.width <= svg.x + svg.width);

      const labels = page.locator("[data-context-label]");
      const tracks = page.locator("[data-context-track]");
      assert.equal(await labels.count(), 5);
      for (let index = 0; index < await labels.count(); index += 1) {
        const label = await labels.nth(index).boundingBox();
        const track = await tracks.nth(index).boundingBox();
        assert.ok(label && track);
        assert.ok(label.x + label.width + 8 <= track.x);
      }
    },
  });
});

test("preview scrubs semantic text and path reveals", { timeout: 60_000 }, async () => {
  await previewScene(resolve("examples/style-and-paths.ts"), {
    headless: true,
    async ready(page) {
      const seek = (time: number) => page.locator("#murali-scrub").evaluate((input, value) => {
        const scrub = input as HTMLInputElement;
        scrub.value = String(value);
        scrub.dispatchEvent(new Event("input", { bubbles: true }));
      }, time);

      await seek(0.5);
      const partialTitle = await page.locator(".murali-content").first().innerText();
      assert.ok(partialTitle.length > 0);
      assert.ok(partialTitle.length < "Style And Paths".length);

      await seek(6.9);
      const authoredPaths = await page.locator("[data-murali-path]").evaluateAll((paths) => paths.map((path) => ({
        color: getComputedStyle(path).stroke,
        offset: path.getAttribute("stroke-dashoffset"),
      })));
      assert.ok(authoredPaths.some(({ color, offset }) =>
        color === "rgb(177, 137, 198)" && Math.abs(Number(offset)) < 0.001
      ));
    },
  });
});

test("grows and contracts a shape fill with its written boundary", { timeout: 60_000 }, async () => {
  await previewScene(resolve("test/fixtures/shape-fill-reveal-scene.ts"), {
    headless: true,
    async ready(page) {
      const seek = (time: number) => page.locator("#murali-scrub").evaluate((input, value) => {
        const scrub = input as HTMLInputElement;
        scrub.value = String(value);
        scrub.dispatchEvent(new Event("input", { bubbles: true }));
      }, time);
      const source = page.locator("[data-murali-shape]");
      const transient = page.locator("[data-murali-transient-fill]");

      await seek(0);
      assert.equal(await source.getAttribute("fill"), "none");
      assert.equal(await transient.getAttribute("d"), "");

      await seek(1);
      const writingFill = await transient.getAttribute("d");
      assert.equal(await source.getAttribute("fill"), "none");
      assert.match(writingFill ?? "", /^M .+ Z$/);

      await seek(2);
      assert.equal(await source.getAttribute("fill"), "#ef4444");
      assert.equal(await transient.getAttribute("d"), "");

      await seek(3);
      assert.equal(await source.getAttribute("fill"), "none");
      assert.equal(await transient.getAttribute("d"), writingFill);
    },
  });
});

test("preview composes hierarchical XYZ transforms while overlays stay camera-independent", { timeout: 60_000 }, async () => {
  await previewScene(resolve("examples/css-3d-transforms.ts"), {
    headless: true,
    async ready(page) {
      const seek = (time: number) => page.locator("#murali-scrub").evaluate((input, value) => {
        const scrub = input as HTMLInputElement;
        scrub.value = String(value);
        scrub.dispatchEvent(new Event("input", { bubbles: true }));
      }, time);
      const worldRoot = page.locator('[data-murali-layer="world"] > .murali-transform').first();
      const child = worldRoot.locator(".murali-transform").first();
      const overlay = page.locator('[data-murali-layer="overlay"] > .murali-transform').first();

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
