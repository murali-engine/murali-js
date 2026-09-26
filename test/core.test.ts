import assert from "node:assert/strict";
import { test } from "node:test";
import { Animate, Mobject, Scene, interpolateHex, linear } from "../src/index.ts";

class TestScene extends Scene {
  readonly dot = new Mobject({ state: { x: 0, color: "#000000" } });

  override construct(): void {
    this.add(this.dot);
    this.play(Animate(this.dot, { x: 100, color: "#ffffff" }, { duration: 2, easing: linear }));
    this.wait(1);
  }
}

test("samples a scene deterministically at arbitrary virtual times", () => {
  const scene = new TestScene().prepare();
  assert.equal(scene.duration, 3);
  assert.deepEqual(scene.sampleAt(1).get(scene.dot), {
    x: 50,
    y: 0,
    scale: 1,
    rotation: 0,
    opacity: 1,
    color: "#808080",
  });
  assert.deepEqual(scene.sampleAt(1).get(scene.dot), scene.sampleAt(1).get(scene.dot));
  assert.equal(scene.sampleAt(3).get(scene.dot)?.x, 100);
});

test("interpolates short and long hex colors", () => {
  assert.equal(interpolateHex("#000", "#fff", 0.5), "#808080");
  assert.equal(interpolateHex("#ff0000", "#00ff00", 0.25), "#bf4000");
});
