import assert from "node:assert/strict";
import { test } from "node:test";
import { createProgressReporter } from "../src/render/progress.ts";

test("reports every frame on an interactive terminal", () => {
  const output: string[] = [];
  const report = createProgressReporter((message) => output.push(message), true);
  report(1, 3);
  report(2, 3);
  report(3, 3);

  assert.deepEqual(output, [
    "\rRendering 1/3 frames (33%)",
    "\rRendering 2/3 frames (66%)",
    "\rRendering 3/3 frames (100%)\n",
  ]);
});

test("throttles progress in non-interactive logs while always reporting completion", () => {
  const output: string[] = [];
  const report = createProgressReporter((message) => output.push(message), false);
  report(1, 100);
  report(5, 100);
  report(11, 100);
  report(100, 100);

  assert.deepEqual(output, [
    "Rendering 1/100 frames (1%)\n",
    "Rendering 11/100 frames (11%)\n",
    "Rendering 100/100 frames (100%)\n",
  ]);
});
