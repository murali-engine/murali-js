import assert from "node:assert/strict";
import { test } from "node:test";
import { Circle, Scene, Timeline, interpolateCSSValue, interpolateHex } from "../src/index.ts";

class TestScene extends Scene {
  readonly dot = Circle().radius(0.5).fill("#000000");

  override construct(): void {
    this.add(this.dot);
    const timeline = new Timeline();
    timeline.animate(this.dot).duration(2).ease("linear").moveTo([4, 0]);
    timeline.animate(this.dot).duration(2).ease("linear").setColor("#ffffff");
    this.play(timeline);
    this.wait(1);
  }
}

test("samples a scene deterministically at arbitrary virtual times", () => {
  const scene = new TestScene().prepare();
  assert.equal(scene.duration, 3);
  assert.deepEqual(scene.sampleAt(1).get(scene.dot), {
    x: 2,
    y: 0,
    z: 0,
    scale: 1,
    rotation: 0,
    opacity: 1,
    background: "#808080",
  });
  assert.deepEqual(scene.sampleAt(1).get(scene.dot), scene.sampleAt(1).get(scene.dot));
  assert.equal(scene.sampleAt(3).get(scene.dot)?.x, 4);
});

test("uses logical frame coordinates independently of output resolution", () => {
  const scene = new TestScene({ width: 1280, height: 720 }).prepare();
  assert.equal(scene.viewWidth, 16);
  assert.equal(scene.viewHeight, 9);
  scene.toEdge(scene.dot, "up", { margin: 1 });
  assert.equal(scene.dot.initialState.y, 3.5);
});

test("freezes overlapping animation starts and samples correctly in any order", () => {
  class OverlapScene extends Scene {
    readonly dot = Circle();

    override construct(): void {
      this.add(this.dot);
      const timeline = new Timeline();
      timeline.animate(this.dot).at(1).duration(2).ease("linear").moveTo([20, 0]);
      timeline.animate(this.dot).at(0).duration(2).ease("linear").moveTo([10, 0]);
      this.play(timeline);
    }
  }

  const scene = new OverlapScene().prepare();
  const later = scene.sampleAt(2.5).get(scene.dot)?.x;
  const earlier = scene.sampleAt(1.5).get(scene.dot)?.x;
  assert.equal(earlier, 8.75);
  assert.equal(later, 16.25);
  assert.equal(scene.sampleAt(1.5).get(scene.dot)?.x, earlier);
});

test("interpolates short and long hex colors", () => {
  assert.equal(interpolateHex("#000", "#fff", 0.5), "#808080");
  assert.equal(interpolateHex("#ff0000", "#00ff00", 0.25), "#bf4000");
});

test("merges CSS builders and deterministically samples animated styles", () => {
  class StyledScene extends Scene {
    readonly card = Circle()
      .fill("#000000")
      .css({ filter: "blur(0px)", borderRadius: "10px", display: "block" })
      .cssVar("--progress", "0");

    override construct(): void {
      this.add(this.card);
      const timeline = new Timeline();
      timeline.animate(this.card).duration(2).ease("linear").setStyle({
        background: "#ffffff",
        filter: "blur(10px)",
        borderRadius: "30px",
        display: "grid",
        "--progress": "100",
      });
      this.play(timeline);
    }
  }

  const scene = new StyledScene().prepare();
  const halfway = scene.sampleStylesAt(1).get(scene.card);
  assert.equal(halfway?.background, "#808080");
  assert.equal(halfway?.filter, "blur(5px)");
  assert.equal(halfway?.borderRadius, "20px");
  assert.equal(halfway?.["--progress"], "50");
  assert.equal(halfway?.display, "block");
  assert.equal(scene.sampleStylesAt(2).get(scene.card)?.display, "grid");
});

test("interpolates numeric CSS functions while switching incompatible values at the end", () => {
  assert.equal(interpolateCSSValue("translateX(0px) rotate(10deg)", "translateX(20px) rotate(30deg)", 0.5), "translateX(10px) rotate(20deg)");
  assert.equal(interpolateCSSValue("block", "grid", 0.5), "block");
  assert.equal(interpolateCSSValue("block", "grid", 1), "grid");
});
