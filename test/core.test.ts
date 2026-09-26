import assert from "node:assert/strict";
import { test } from "node:test";
import {
  Circle,
  Arrow,
  RED_B,
  resolveColor,
  HStack,
  Axes,
  Label,
  Line,
  NumberPlane,
  VectorArrow,
  sampleRange,
  Rectangle,
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
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
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

test("animates ordered targets with deterministic staggered start times", () => {
  const shapes = [Circle(), Square(), Circle()] as const;
  const entrance = clip((local) => {
    local
      .animate(shapes)
      .at(0.5)
      .stagger(0.25)
      .duration(1)
      .ease("linear")
      .appear();
  });

  assert.deepEqual(entrance.animations.map(({ tattva }) => tattva), shapes);
  assert.deepEqual(entrance.animations.map(({ start }) => start), [0.5, 0.75, 1]);
  assert.equal(entrance.duration, 2);
});

test("validates multi-target animation before scheduling any entries", () => {
  const dot = Circle();
  assert.throws(() => timeline().animate([]), /at least one Tattva/);
  assert.throws(() => timeline().animate([dot, dot]), /same Tattva more than once/);

  const mixed = timeline();
  assert.throws(
    () => mixed.animate([Label("Hello"), dot]).stagger(0.1).typewrite(),
    /requires text-reveal Tattvas/,
  );
  assert.equal(mixed.animations.length, 0);
  assert.throws(() => timeline().animate([dot]).stagger(-1), /non-negative finite/);
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
    () => timeline.animate(new Tattva()).draw(),
    /draw\(\) requires a path-reveal Tattva/,
  );
});

test("dashes a line and pulses indicate back to rest", () => {
  const guide = Line().from([-1, 0]).to([1, 0]).stroke({ color: "tealC", width: 0.06 }).dash(0.18, 0.1);
  assert.match(guide.contentHTML(), /data-venu-dash="0.18 0.1"/);
  assert.throws(() => Line().dash(-1, 0.1), /non-negative/);

  class IndicateScene extends Scene {
    readonly label = Label("Pulse").height(0.3).color("#58c4dd");

    override construct(): void {
      this.add(this.label);
      const timeline = new Timeline();
      timeline.animate(this.label).duration(2).ease("linear").indicate();
      this.play(timeline);
    }
  }

  const scene = new IndicateScene().prepare();
  assert.equal(scene.sampleAt(0).get(scene.label)?.indicate, 0);
  assert.equal(scene.sampleAt(1).get(scene.label)?.indicate, 0.5);
  assert.equal(scene.sampleAt(2).get(scene.label)?.indicate, 1);
});

test("builds a number plane, axis ticks, and a vector arrow", () => {
  const yTicks = sampleRange([-1.8, 1.8], 1);
  assert.equal(yTicks.length, 4);
  assert.ok(Math.abs(yTicks[2] - 0.2) < 1e-9);
  const plane = NumberPlane([-7, 7], [-1.8, 1.8]).step(1).build();
  assert.equal(plane.children.length, 15 + 4);
  const axes = Axes([-2, 2], [-1, 1]).step(1).build();
  assert.equal(axes.children.length, 2 + 4 + 2);
  const arrow = VectorArrow([2, 0]);
  assert.equal(arrow.initialState.x, 1);
  assert.equal(arrow.initialState.rotationZ, 0);
});

test("sizes a multiline label from its longest line", () => {
  const label = Label("one\nthree!!").height(0.2);
  assert.equal(label.getLayoutSize().height, 0.4);
  assert.equal(label.getLayoutSize().width, Label("three!!").height(0.2).getLayoutSize().width);
});

test("resolves Murali palette names and draws solid shapes", () => {
  assert.equal(resolveColor("redB"), RED_B);
  assert.equal(resolveColor("RED_B"), RED_B);
  assert.equal(resolveColor("grey"), "#888888");
  assert.equal(resolveColor("#abc"), "#abc");

  class DrawnShapes extends Scene {
    readonly square = Square().size(1.25).fill("redB").stroke({ width: 0.04, color: "white" });

    override construct(): void {
      this.add(this.square);
      const timeline = new Timeline();
      timeline.animate(this.square).duration(2).ease("linear").draw();
      this.play(timeline);
    }
  }

  const scene = new DrawnShapes().prepare();
  assert.equal(scene.square.initialState.background, RED_B);
  assert.equal(scene.sampleAt(0).get(scene.square)?.revealProgress, 0);
  assert.equal(scene.sampleAt(1).get(scene.square)?.revealProgress, 0.5);
  assert.match(scene.square.contentHTML() ?? "", /data-venu-shape/);
});

test("configures and deterministically animates the scene-owned perspective camera", () => {
  interface WorldState extends TattvaState {
    spin: number;
  }

  class CameraScene extends Scene {
    readonly world = new ThreeTattva<WorldState>({ setup() {} }, { state: { spin: 0 } });

    override construct(): void {
      this.camera
        .perspective({ fov: 50, near: 0.2, far: 200 })
        .position([-4, 2, 8])
        .lookAt([0, 1, 0]);
      this.add(this.world);
      const timeline = new Timeline();
      timeline.animateCamera(this.camera)
        .duration(2)
        .ease("linear")
        .frameTo([4, 4, 6], [2, 0, 0]);
      this.play(timeline);
    }
  }

  const scene = new CameraScene().prepare();
  const halfway = scene.sampleAt(1).get(scene.camera) as Camera3DState;
  assert.equal(halfway.cameraX, 0);
  assert.equal(halfway.cameraY, 3);
  assert.equal(halfway.cameraZ, 7);
  assert.equal(halfway.cameraTargetX, 1);
  assert.equal(halfway.cameraTargetY, 0.5);
  assert.equal(halfway.cameraFov, 50);
});

test("supports orthographic cameras, orbit framing, and camera validation", () => {
  class OrbitScene extends Scene {
    override construct(): void {
      this.camera.orthographic({ viewHeight: 12 }).position([0, 0, 10]);
      const animation = new Timeline();
      animation.animateCamera(this.camera)
        .duration(1)
        .ease("linear")
        .orbitTo({ azimuth: 90, elevation: 0, radius: 5 });
      this.play(animation);
    }
  }

  const scene = new OrbitScene().prepare();
  const state = scene.sampleAt(1).get(scene.camera) as Camera3DState;
  assert.equal(state.cameraProjection, "orthographic");
  assert.equal(state.cameraViewHeight, 12);
  assert.ok(Math.abs(state.cameraX - 5) < 1e-10);
  assert.ok(Math.abs(state.cameraZ) < 1e-10);
  assert.throws(() => new OrbitScene().camera.perspective({ near: 0 }), /near < far/);
  assert.throws(() => new Timeline().animateCamera(scene.camera).zoomTo(0), /positive finite number/);
});

test("gives every scene an orthographic camera matching its logical frame", () => {
  class EmptyScene extends Scene {
    override construct(): void {}
  }

  const scene = new EmptyScene({ width: 1280, height: 720, viewWidth: 16 });
  assert.equal(scene.camera.initialState.cameraProjection, "orthographic");
  assert.equal(scene.camera.initialState.cameraViewHeight, 9);
  assert.equal(scene.camera.initialState.cameraTargetZ, 0);
});

test("provides Murali-parity camera geometry and orthographic framing helpers", () => {
  class EmptyScene extends Scene {
    override construct(): void {}
  }

  const scene = new EmptyScene({ width: 1600, height: 800, viewWidth: 16 });
  scene.camera.position([3, -2, 10]).lookAt([3, -2, 0]).viewWidth(20);
  assert.deepEqual(scene.camera.forward(), [0, 0, -1]);
  assert.deepEqual(scene.camera.right(), [1, 0, 0]);
  assert.equal(scene.camera.initialState.cameraViewHeight, 10);
  assert.deepEqual(scene.camera.frameBoundsAtZ(0), {
    min: [-7, -7],
    max: [13, 3],
    width: 20,
    height: 10,
    center: [3, -2],
  });

  scene.camera.zoomIn(2);
  assert.equal(scene.camera.frameBoundsAtZ(0)?.width, 10);
  scene.camera.zoomOut(2);
  assert.equal(scene.camera.frameBoundsAtZ(0)?.width, 20);
});

test("computes perspective layout-plane bounds and validates camera configuration", () => {
  class PerspectiveScene extends Scene {
    override construct(): void {}
  }

  const scene = new PerspectiveScene({ width: 1600, height: 800 });
  scene.camera
    .perspective({ fov: 90 })
    .position([0, 0, 10])
    .lookAt([0, 0, 0])
    .clipping(0.1, 100);
  const bounds = scene.camera.frameBoundsAtZ(0);
  assert.ok(bounds);
  assert.ok(Math.abs(bounds.width - 40) < 1e-10);
  assert.ok(Math.abs(bounds.height - 20) < 1e-10);
  assert.throws(() => scene.camera.clipping(-1, 100), /near < far/);

  const invalidProjection = new Timeline();
  invalidProjection.animate(scene.camera).to({ cameraProjection: "orthographic" });
  assert.throws(() => scene.play(invalidProjection), /configured immediately/);
});

test("places objects at perspective camera edges on their world Z plane", () => {
  class PerspectiveLayoutScene extends Scene {
    override construct(): void {}
  }

  const scene = new PerspectiveLayoutScene({ width: 1600, height: 800 });
  scene.camera.perspective({ fov: 90 }).position([0, 0, 10]).lookAt([0, 0, 0]);
  const square = Square().size(2).at([0, 0, 0]);
  scene.toEdge(square, "right", { margin: 1 });
  assert.ok(Math.abs(square.initialState.x - 18) < 1e-10);

  const overlay = Square().size(2).depthMode("overlay");
  scene.toEdge(overlay, "right", { margin: 1 });
  assert.equal(overlay.initialState.x, 6);

  scene.camera.position([10, 0, 0]).lookAt([0, 0, 0]);
  assert.equal(scene.camera.frameBoundsAtZ(0), undefined);
  assert.throws(() => scene.toEdge(square, "right"), /Cannot place/);
});

test("separates world depth from painter-order overlay layers", () => {
  const object = Circle().at([0, 0, 5]).layer(42).depthMode("overlay");
  assert.equal(object.initialState.z, 5);
  assert.equal(object.renderLayer, 42);
  assert.equal(object.depthModeValue, "overlay");
  assert.throws(() => object.layer(Number.NaN), /Layer must be finite/);
});

test("authors and samples complete XYZ transforms deterministically", () => {
  class TransformScene extends Scene {
    readonly card = Rectangle()
      .position([1, 2, -3])
      .rotation3D([10, 20, 30])
      .scale3D([1, 2, 0.5]);

    override construct(): void {
      this.add(this.card);
      const animation = new Timeline();
      animation.animate(this.card).duration(2).ease("linear").positionTo([5, 4, 1]);
      animation.animate(this.card).duration(2).ease("linear").rotate3DTo([30, 60, 90]);
      animation.animate(this.card).duration(2).ease("linear").scale3DTo([3, 4, 1.5]);
      this.play(animation);
    }
  }

  const scene = new TransformScene().prepare();
  const halfway = scene.sampleAt(1).get(scene.card);
  assert.equal(halfway?.x, 3);
  assert.equal(halfway?.y, 3);
  assert.equal(halfway?.z, -1);
  assert.equal(halfway?.rotationX, 20);
  assert.equal(halfway?.rotationY, 40);
  assert.equal(halfway?.rotationZ, 60);
  assert.equal(halfway?.scaleX, 2);
  assert.equal(halfway?.scaleY, 3);
  assert.equal(halfway?.scaleZ, 1);
});

test("maps 2D transform conveniences onto the complete 3D state", () => {
  const card = Rectangle().size([4, 2]).at([1, 2]).scale(2).rotate(30);
  assert.deepEqual(
    {
      position: [card.initialState.x, card.initialState.y, card.initialState.z],
      scale: [card.initialState.scaleX, card.initialState.scaleY, card.initialState.scaleZ],
      rotation: [card.initialState.rotationX, card.initialState.rotationY, card.initialState.rotationZ],
    },
    { position: [1, 2, 0], scale: [2, 2, 2], rotation: [0, 0, 30] },
  );

  const tilted = Rectangle().size([4, 2]).rotation3D([0, 60, 0]);
  assert.ok(Math.abs(tilted.getLayoutSize().width - 2) < 1e-10);
  assert.equal(tilted.getLayoutSize().height, 2);
});
