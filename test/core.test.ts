import assert from "node:assert/strict";
import { test } from "node:test";
import {
  Circle,
  Arrow,
  Camera3D,
  HStack,
  Label,
  Scene,
  Square,
  Tattva,
  Timeline,
  ThreeTattva,
  VStack,
  clip,
  interpolateCSSValue,
  interpolateHex,
  splitGraphemes,
  timeline,
} from "../src/index.ts";
import type { Camera3DState, TattvaState } from "../src/index.ts";

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
  assert.equal(scene.dot.initialState.y, 3);
});

test("lays out stacks in world coordinates and preserves their hierarchy", () => {
  const square = Square().size(1);
  const circle = Circle().radius(1);
  const row = HStack([square, circle], { gap: 0.5 });

  assert.equal(square.parent, row);
  assert.equal(circle.parent, row);
  assert.equal(square.initialState.x, -1.25);
  assert.equal(circle.initialState.x, 0.75);
  assert.deepEqual(row.getLayoutSize(), { width: 3.5, height: 2 });
  class GroupScene extends Scene {
    override construct(): void {}
  }
  const scene = new GroupScene();
  scene.add(row);
  assert.deepEqual(scene.allTattvas, [row, square, circle]);

  const column = VStack([Square().size(1), Square().size(2)], { gap: 1 });
  assert.deepEqual(column.getLayoutSize(), { width: 2, height: 4 });
});

test("positions objects relative to bounds and aligns their edges", () => {
  class LayoutScene extends Scene {
    override construct(): void {}
  }

  const scene = new LayoutScene();
  const anchor = scene.add(Square().size(2), { at: [1, 0] });
  const label = scene.add(Label("Label").height(0.5));
  scene.nextTo(label, anchor, "right", { gap: 0.5 });
  assert.equal(label.initialState.x, 1 + 1 + 0.5 + label.getLayoutSize().width / 2);
  scene.alignTo(label, anchor, "up");
  assert.equal(label.initialState.y, 0.75);
});

test("keeps custom animation state strongly typed", () => {
  interface MeterState extends TattvaState {
    progress: number;
  }
  const meter = new Tattva<MeterState>({ state: { progress: 0 } });
  const timeline = new Timeline();
  timeline.animate(meter).to({ progress: 100 });

  if (false) {
    // @ts-expect-error misspelled custom state must be rejected by TypeScript
    timeline.animate(meter).to({ progres: 100 });
  }
  assert.equal(timeline.animations.length, 1);
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

test("composes clip-local animations sequentially and with overlap", () => {
  const first = Circle();
  const second = Square();
  const third = Circle();
  const intro = clip((local) => {
    local.animate(first).at(0.5).duration(1).moveTo([1, 0]);
  });
  const content = clip((local) => {
    local.animate(second).duration(2).moveTo([2, 0]);
  });
  const accent = clip((local) => {
    local.animate(third).duration(1).appear();
  });

  const composed = timeline()
    .then(intro)
    .then(content)
    .overlap(accent, { by: 0.5 });

  assert.deepEqual(composed.animations.map(({ start }) => start), [0.5, 1.5, 3]);
  assert.equal(composed.duration, 4);
});

test("places and reuses nested clips without mutating their local schedules", () => {
  const dot = Circle();
  const pulse = clip((local) => {
    local.animate(dot).at(0.25).duration(0.75).scaleTo(2);
  });
  const section = clip()
    .then(pulse)
    .wait(0.5)
    .then(pulse);
  const composed = timeline()
    .add(section, { at: 2 })
    .add(section, { at: 8 });

  assert.deepEqual(pulse.animations.map(({ start }) => start), [0.25]);
  assert.deepEqual(section.animations.map(({ start }) => start), [0.25, 1.75]);
  assert.deepEqual(composed.animations.map(({ start }) => start), [2.25, 3.75, 8.25, 9.75]);
  assert.equal(section.duration, 2.5);
  assert.equal(composed.duration, 10.5);
});

test("keeps explicit clip placement independent from the sequential cursor", () => {
  const placed = clip((local) => {
    local.animate(Circle()).duration(5).appear();
  });
  const sequential = clip((local) => {
    local.animate(Square()).duration(1).appear();
  });
  const composed = timeline()
    .add(placed, { at: 10 })
    .then(sequential);

  assert.deepEqual(composed.animations.map(({ start }) => start), [10, 0]);
  assert.equal(composed.duration, 15);
  assert.throws(() => timeline().add(placed, { at: Number.NaN }), /non-negative finite/);
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

test("samples semantic text and path reveals deterministically", () => {
  class RevealScene extends Scene {
    readonly label = Label("Hello 👨‍👩‍👧‍👦");
    readonly arrow = Arrow().from([-2, 0]).to([2, 0]);

    override construct(): void {
      this.add(this.label, this.arrow);
      const timeline = new Timeline();
      timeline.animate(this.label).duration(2).ease("linear").typewrite();
      timeline.animate(this.arrow).duration(2).ease("linear").draw();
      this.play(timeline);
    }
  }

  const scene = new RevealScene().prepare();
  assert.equal(scene.sampleAt(0).get(scene.label)?.revealProgress, 0);
  assert.equal(scene.sampleAt(1).get(scene.label)?.revealProgress, 0.5);
  assert.equal(scene.sampleAt(1).get(scene.arrow)?.revealProgress, 0.5);
  assert.equal(scene.sampleAt(2).get(scene.arrow)?.revealProgress, 1);
});

test("segments typewritten text by grapheme and rejects incompatible reveal verbs", () => {
  assert.deepEqual(splitGraphemes("A👨‍👩‍👧‍👦é"), ["A", "👨‍👩‍👧‍👦", "é"]);
  const timeline = new Timeline();
  assert.throws(
    () => timeline.animate(Circle()).draw(),
    /draw\(\) requires a path-reveal Tattva/,
  );
});

test("configures and deterministically animates a built-in perspective camera", () => {
  interface WorldState extends Camera3DState {
    spin: number;
  }

  class CameraScene extends Scene {
    readonly world = new ThreeTattva<WorldState>({ setup() {} }, { state: { spin: 0 } })
      .camera(
        Camera3D.perspective({ fov: 50, near: 0.2, far: 200 })
          .position([-4, 2, 8])
          .lookAt([0, 1, 0]),
      );

    override construct(): void {
      this.add(this.world);
      const timeline = new Timeline();
      timeline.animateCamera(this.world)
        .duration(2)
        .ease("linear")
        .frameTo([4, 4, 6], [2, 0, 0]);
      this.play(timeline);
    }
  }

  const scene = new CameraScene().prepare();
  const halfway = scene.sampleAt(1).get(scene.world) as Camera3DState;
  assert.equal(halfway.cameraX, 0);
  assert.equal(halfway.cameraY, 3);
  assert.equal(halfway.cameraZ, 7);
  assert.equal(halfway.cameraTargetX, 1);
  assert.equal(halfway.cameraTargetY, 0.5);
  assert.equal(halfway.cameraFov, 50);
});

test("supports orthographic cameras, orbit framing, and camera validation", () => {
  const world = new ThreeTattva({ setup() {} }).camera(
    Camera3D.orthographic({ viewHeight: 12 }).position([0, 0, 10]),
  );
  const timeline = new Timeline();
  timeline.animateCamera(world)
    .duration(1)
    .ease("linear")
    .orbitTo({ azimuth: 90, elevation: 0, radius: 5 });

  class OrbitScene extends Scene {
    override construct(): void {
      this.add(world);
      this.play(timeline);
    }
  }

  const state = new OrbitScene().prepare().sampleAt(1).get(world) as Camera3DState;
  assert.equal(state.cameraProjection, "orthographic");
  assert.equal(state.cameraViewHeight, 12);
  assert.ok(Math.abs(state.cameraX - 5) < 1e-10);
  assert.ok(Math.abs(state.cameraZ) < 1e-10);
  assert.throws(() => Camera3D.perspective({ near: 0 }), /near < far/);
  assert.throws(() => timeline.animateCamera(world).zoomTo(0), /positive finite number/);
});
