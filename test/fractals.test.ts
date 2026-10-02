import assert from "node:assert/strict";
import { test } from "node:test";
import {
  FractalPath,
  KochSnowflake,
  fractalTreeSegments,
  kochSnowflakeSegments,
  sierpinskiTriangleSegments,
} from "../src/tattvas/maths/index.ts";

test("built-in fractal generators produce predictable recursive segment counts", () => {
  assert.equal(kochSnowflakeSegments(0).length, 3);
  assert.equal(kochSnowflakeSegments(4).length, 3 * 4 ** 4);
  assert.equal(sierpinskiTriangleSegments(0).length, 3);
  assert.equal(sierpinskiTriangleSegments(5).length, 3 * 3 ** 5);
  assert.equal(fractalTreeSegments(0).length, 1);
  assert.equal(fractalTreeSegments(8).length, 2 ** 9 - 1);
});

test("fractional fractal iterations cross-fade two batched paths", () => {
  const fractal = KochSnowflake({ iterations: 3 }).iteration(0);
  const html = fractal.contentHTML(0, { ...fractal.initialState, iteration: 1.25 });
  assert.equal((html.match(/data-murali-path/g) ?? []).length, 2);
  assert.match(html, /opacity="0\.75"/);
  assert.match(html, /opacity="0\.25"/);
});

test("FractalPath accepts custom deterministic generators", () => {
  const fractal = FractalPath(
    (iteration) => Array.from({ length: iteration + 1 }, (_, index) => ({
      from: [index, 0] as const,
      to: [index, 1] as const,
    })),
    { iterations: 4, initialIteration: 2, padding: 0 },
  );
  assert.equal(fractal.maxIteration, 4);
  assert.equal(fractal.initialState.iteration, 2);
  assert.deepEqual(fractal.iterationState(3.5), { iteration: 3.5 });
  assert.equal((fractal.contentHTML().match(/ M |d="M /g) ?? []).length > 0, true);
});

test("fractal input limits reject accidental runaway recursion", () => {
  assert.throws(() => KochSnowflake({ iterations: 8 }), /between 0 and 7/);
  assert.throws(() => FractalPath(() => [], { iterations: 2 }), /no segments/);
});
