import assert from "node:assert/strict";
import { test } from "node:test";
import {
  resolveRenderFormat,
  validateRenderFormat,
} from "../src/render/capture.ts";

test("infers PNG and WebM explicitly while leaving ordinary video as MP4", () => {
  assert.equal(resolveRenderFormat("frame.PNG"), "png");
  assert.equal(resolveRenderFormat("overlay.WEBM"), "webm");
  assert.equal(resolveRenderFormat("movie.mp4"), "mp4");
  assert.equal(resolveRenderFormat("movie.mov"), "mp4");
});

test("allows WebM only for transparent video", () => {
  assert.doesNotThrow(() => validateRenderFormat("mp4", false, false));
  assert.doesNotThrow(() => validateRenderFormat("webm", true, false));
  assert.doesNotThrow(() => validateRenderFormat("webm", true, true));
  assert.doesNotThrow(() => validateRenderFormat("png", true, false));

  assert.throws(
    () => validateRenderFormat("webm", false, false),
    /reserved for transparent video/,
  );
  assert.throws(
    () => validateRenderFormat("mp4", true, false),
    /requires WebM output/,
  );
  assert.throws(
    () => validateRenderFormat("png", true, true),
    /Audio is supported only for video/,
  );
});
