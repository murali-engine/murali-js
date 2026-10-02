import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { renderScene } from "../src/render/capture.ts";

test("writes scene-authored named screenshots and an animated GIF", { timeout: 60_000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), "murali-captures-"));
  try {
    const result = await renderScene(resolve("examples/capture-markers.ts"), {
      output: join(directory, "still.png"),
      at: 0,
      progress: false,
    });
    assert.equal(result.frames, 1);
    assert.deepEqual(result.screenshots.map((path) => path.slice(directory.length + 1)), [
      "captures/start.png",
      "captures/middle.png",
      "captures/capture_00000.png",
    ]);
    assert.deepEqual(result.gifs.map((path) => path.slice(directory.length + 1)), [
      "gifs/dot-journey.gif",
      "gifs/highlights.gif",
    ]);
    for (const path of result.screenshots) {
      const png = await readFile(path);
      assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    }
    for (const path of result.gifs) {
      const gif = await readFile(path);
      assert.match(gif.subarray(0, 6).toString("ascii"), /^GIF8[79]a$/);
      assert.ok((await stat(path)).size > 1_000);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
