import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import trace from "../examples/data/self_attention_trace.json" with { type: "json" };
import {
  Circle,
  Arrow,
  resolveColor,
  HStack,
  Axes,
  AngleArc,
  BasisGrid,
  BasisExplorer2D,
  BasisVectors,
  basisCoordinates,
  ColumnCombination,
  CoordinateReadout,
  DeterminantArea,
  DimensionBadge,
  LinearCombination,
  MatrixDisplay,
  Matrix,
  MatrixTransformPanel,
  MatrixVectorFlow,
  LinearMap2D,
  SpanRegion,
  TransformableGrid,
  formatMatrixEntry,
  Label,
  LabeledVector,
  Line,
  NumberPlane,
  QuantityBadge,
  VectorArrow,
  cosineSimilarity,
  formatValue,
  projectOnto,
  ProjectionDiagram2D,
  sampleRange,
  Rectangle,
  Ellipse,
  FormulaOutline,
  FormulaMorph,
  fontFamily,
  fontFile,
  Latex,
  LatexMorph,
  type LabelState,
  installLatexResources,
  Polygon,
  Scene,
  ShapeMorph,
  VectorShape,
  TextMorph,
  Square,
  Tattva,
  Timeline,
  ThreeTattva,
  VStack,
  CodeBlock,
  Equation,
  MathText,
  NumberLine,
  ParametricSurface,
  sampleCurve,
  tickValues,
  ParticleBelt,
  Table,
  SceneView,
  StreamLines,
  TracedPath,
  sceneViewLocalTime,
  VectorField,
  composeColumns,
  continuityPlacement,
  epicycleTip,
  fourierTerms,
  MAP_FOOTER_START,
  Prop3D,
  centeredPropPosition,
  fittedScale,
  framingDistance,
  ATTENTION_BLOCK_FOCUS,
  KvCache,
  attentionMatrices,
  contextUsedTokens,
  contextWindow,
  mapPoint,
  mathml,
  networkDiagram,
  neuralNetwork,
  NeuralNetwork,
  networkEdges,
  networkPaths,
  networkRoutes,
  signalPoint,
  stageFocusAt,
  tensorSemanticsFrame,
  entropyBits,
  layerNormRows,
  nextTokenChoice,
  ChatInput,
  Opening,
  openingDuration,
  extrudedMaskSidePositions,
  WordCloud,
  Stepwise,
  type StepwiseStoryBuilder,
  bubbleOutline,
  selfAttentionLesson,
  stepwisePicture,
  stepwiseModel,
  tensorAdd,
  tensorCellsAt,
  tensorMatmul,
  tensorOperationStages,
  tensorSlicingHeads,
  stageOpacity,
  modelCenter,
  modelDimensions,
  parseGlb,
  parseGltf,
  projectLonLat,
  projectionBlendAt,
  solveMollweideTheta,
  visibleProjectionCaption,
  matrixMarkup,
  piOutline,
  clip,
  interpolateCSSValue,
  interpolateHex,
  splitGraphemes,
  timeline,
  Text3D,
  Letter3D,
  createText3DGeometry,
  parseText3DTTF,
  WaveMesh,
  defaultWaveMeshProfile,
  sampleWaveMesh,
  YouTubeSubscribe,
  YouTubeSubscribeSequence,
  Fireworks,
  Group,
  createTheme,
  themes,
  themeColor,
  themeCSSVariables,
  palette,
} from "../src/index.ts";
import { extractLatexSources, parseDvisvgm } from "../src/render/latex.ts";
const { RED_B } = palette;
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

test("uses a symmetric nine-by-nine logical world for square frames", () => {
  class SquareScene extends Scene {
    override construct(): void {}
  }

  const scene = new SquareScene({ frame: "square" });
  assert.equal(scene.width, 1080);
  assert.equal(scene.height, 1080);
  assert.equal(scene.viewWidth, 9);
  assert.equal(scene.viewHeight, 9);
  assert.deepEqual(scene.camera.frameBoundsAtZ(0), {
    min: [-4.5, -4.5],
    max: [4.5, 4.5],
    width: 9,
    height: 9,
    center: [0, 0],
  });
});

test("sorts authored screenshot markers and expands inclusive GIF ranges", () => {
  class CaptureScene extends Scene {
    override construct(): void {
      this.wait(2);
      this.captureScreenshotsNamed([[1.5, "later.png"], [0.25, "earlier.png"]]);
      this.captureScreenshots([1]);
      this.captureGifRange("pulse", { from: 0.5, to: 1.5, fps: 2 });
    }
  }
  const scene = new CaptureScene().prepare();
  assert.deepEqual(scene.screenshotCaptures, [
    { time: 0.25, name: "earlier.png" },
    { time: 1.5, name: "later.png" },
    { time: 1 },
  ]);
  assert.deepEqual(scene.gifCaptures, [{ name: "pulse", times: [0.5, 1, 1.5], fps: 2 }]);
  assert.throws(() => scene.captureGif("empty", []), /at least one/);
  assert.throws(() => scene.captureGifRange("backward", { from: 2, to: 1 }), /at or after/);
});

test("morphs normalized closed-shape contours deterministically across keyframes", () => {
  const morph = ShapeMorph(
    Circle().radius(1).fill("#ff0000").stroke({ color: "#ffffff", width: 0.04 }),
    Rectangle().size([3, 2]).cornerRadius(0.32).fill("#0000ff").stroke({ color: "#00ff00", width: 0.08 }),
    Polygon.regular(5).radius(1.25).fill("#ffcc00").stroke({ color: "#ffffff", width: 0.03 }),
  ).samples(48);

  assert.deepEqual(morph.worldSize, { width: 3, height: 2.5 });
  assert.equal(morph.morphStageCount, 3);
  const start = morph.contentHTML(0, { ...morph.initialState, morphProgress: 0 });
  const middle = morph.contentHTML(0, { ...morph.initialState, morphProgress: 0.5 });
  const target = morph.contentHTML(0, { ...morph.initialState, morphProgress: 1 });
  assert.match(start, /fill="#ff0000"/);
  assert.match(middle, /fill="#800080"/);
  assert.match(target, /fill="#0000ff"/);
  assert.equal((middle.match(/\bC\b/g) ?? []).length, 48);
  assert.notEqual(start, middle);
  assert.notEqual(middle, target);

  class MorphScene extends Scene {
    readonly shape = morph;

    override construct(): void {
      this.add(this.shape);
      this.play(timeline((local) => local.animate(this.shape).duration(1).ease("linear").morphTo(1)));
      this.play(timeline((local) => local.animate(this.shape).duration(1).ease("linear").morphTo(2)));
    }
  }

  const scene = new MorphScene().prepare();
  assert.equal(scene.sampleAt(0.5).get(morph)?.morphProgress, 0.5);
  assert.equal(scene.sampleAt(1.5).get(morph)?.morphProgress, 1.5);
  assert.equal(scene.sampleAt(2).get(morph)?.morphProgress, 2);
  assert.deepEqual(scene.sampleAt(0.5), scene.sampleAt(0.5));
  assert.throws(() => timeline().animate(morph).morphTo(3), /integer from 0 to 2/);
  assert.throws(() => timeline().animate(Circle()).morphTo(1), /morph-capable/);
  assert.throws(() => ShapeMorph(Circle()), /at least two/);
  assert.throws(() => ShapeMorph(Circle(), Square()).samples(8), /at least 12/);
});

test("morphs arbitrary compound SVG shapes with cubic curves and holes", () => {
  const ring = VectorShape(
    "M -2 -2 H 2 V 2 H -2 Z M -0.8 -0.8 V 0.8 H 0.8 V -0.8 Z",
    { viewBox: { x: -2.5, y: -2.5, width: 5, height: 5 } },
  ).fill("#22d3ee");
  const drop = VectorShape(
    "M 0 -2 C 1.6 -0.6 2 0.4 2 1 A 2 2 0 1 1 -2 1 C -2 0.4 -1.6 -0.6 0 -2 Z",
    { viewBox: { x: -2.5, y: -2.5, width: 5, height: 5 } },
  ).fill("#f59e0b");
  const morph = ShapeMorph(ring, drop).samples(24);
  const middle = morph.contentHTML(0, { ...morph.initialState, morphProgress: 0.5 });
  assert.match(middle, /fill-rule="evenodd"/);
  assert.ok((middle.match(/\bM\b/g) ?? []).length >= 2);
  assert.ok((middle.match(/\bC\b/g) ?? []).length >= 24);
  assert.match(ring.contentHTML(), /data-murali-vector-shape/);
  assert.deepEqual(ring.worldSize, { width: 5, height: 5 });
  assert.throws(() => VectorShape("M 0 0 L 1 1"), /closed SVG path contours/);
});

test("builds ellipses as dedicated morphable shapes", () => {
  const ellipse = Ellipse().radii([1.8, 0.7]);
  assert.deepEqual(ellipse.worldSize, { width: 3.6, height: 1.4 });
  assert.equal(ellipse.morphContour(32).length, 32);
  assert.throws(() => Ellipse().radii([0, 1]), /positive finite/);
});

test("matches persistent text tokens while unequal text enters and leaves", () => {
  const morph = TextMorph("CAT", "COAST", "A COAST")
    .matchBy("grapheme")
    .height(0.8)
    .unmatched("scale");
  assert.equal(morph.morphStageCount, 3);
  const start = morph.contentHTML(0, { ...morph.initialState, morphProgress: 0 });
  const middle = morph.contentHTML(0, { ...morph.initialState, morphProgress: 0.5 });
  const target = morph.contentHTML(0, { ...morph.initialState, morphProgress: 1 });
  assert.match(start, /data-murali-matching-morph="text"/);
  assert.match(middle, /data-murali-morph-role="matched"/);
  assert.match(middle, /data-murali-morph-role="arriving"/);
  assert.match(target, />O<\/text>/);
  assert.deepEqual(morph.matchingKeys(0), ["grapheme:C", "grapheme:A", "grapheme:T"]);
  assert.equal(middle, morph.contentHTML(4, { ...morph.initialState, morphProgress: 0.5 }));
  assert.throws(() => TextMorph("only one"), /at least two stages/);
  assert.throws(() => morph.stage(3), /integer from 0 to 2/);
});

test("morphs structured formula tokens through powers radicals and fractions", () => {
  const morph = FormulaMorph(
    String.raw`a^2 + b^2 = c^2`,
    String.raw`c = \sqrt{a^2 + b^2}`,
    String.raw`\frac{a}{b} = c`,
  ).height(0.9);
  assert.equal(morph.morphStageCount, 3);
  const radical = morph.contentHTML(0, { ...morph.initialState, morphProgress: 1 });
  const fraction = morph.contentHTML(0, { ...morph.initialState, morphProgress: 2 });
  assert.match(radical, /data-murali-matching-morph="formula"/);
  assert.match(radical, /<path[^>]+data-murali-morph-role="departing"/);
  assert.match(radical, /data-murali-morph-role="arriving"/);
  assert.match(fraction, /<line[^>]+data-murali-morph-role/);
  assert.ok(morph.matchingKeys(1).includes("radical"));
  assert.ok((morph.worldSize?.height ?? 0) > 0.9);

  class FormulaScene extends Scene {
    override construct(): void {
      this.add(morph);
      this.play(timeline((local) => local.animate(morph).duration(1).ease("linear").morphTo(1)));
    }
  }
  assert.equal(new FormulaScene().prepare().sampleAt(0.5).get(morph)?.morphProgress, 0.5);
});

test("extracts literal LaTeX stages and parses dvisvgm vector output", () => {
  assert.deepEqual(
    extractLatexSources("const staticFormula = Latex('E=mc^2'); const formula = LatexMorph(String.raw`a^2 + b^2`, 'c^2', dynamicFormula); const outline = FormulaOutline(String.raw`\\pi`);"),
    ["E=mc^2", "a^2 + b^2", "c^2", "\\pi"],
  );
  const resource = parseDvisvgm(`
    <svg viewBox="0 0 20 10" xmlns:xlink="http://www.w3.org/1999/xlink">
      <defs><path id="g0" d="M0 0C2 0 4 2 4 4Z"/></defs>
      <use x="2" y="3" xlink:href="#g0"/>
      <rect x="8" y="4" width="10" height="1"/>
    </svg>
  `, "a=b");
  assert.deepEqual(resource.viewBox, [0, 0, 20, 10]);
  assert.equal(resource.elements.length, 2);
  assert.equal(resource.elements[0]?.kind, "glyph");
  assert.equal(resource.elements[1]?.kind, "rule");
});

test("interpolates actual LaTeX glyph outlines as normalized cubic Beziers", () => {
  installLatexResources({
    alpha: {
      source: "alpha",
      viewBox: [0, 0, 12, 12],
      elements: [{
        key: "glyph:alpha",
        kind: "glyph",
        path: "M1 10L6 1L11 10Z",
        x: 0,
        y: 0,
      }],
    },
    beta: {
      source: "beta",
      viewBox: [0, 0, 12, 12],
      elements: [{
        key: "glyph:beta",
        kind: "glyph",
        path: "M1 1C11 1 11 11 1 11Z",
        x: 0,
        y: 0,
      }],
    },
  });
  const morph = LatexMorph("alpha", "beta").height(1.2).shapeMismatches(true);
  const formula = Latex("alpha").height(0.8);
  const outline = FormulaOutline("alpha").height(1.2).samplePoints(64);
  const start = morph.contentHTML(0, { ...morph.initialState, morphProgress: 0 });
  const middle = morph.contentHTML(99, { ...morph.initialState, morphProgress: 0.5 });
  const target = morph.contentHTML(0, { ...morph.initialState, morphProgress: 1 });
  assert.equal(morph.morphStageCount, 2);
  assert.equal(morph.glyphCount(0), 1);
  assert.equal(outline.length, 64);
  assert.ok(Math.max(...outline.map((point) => point[1])) > 0);
  assert.ok(Math.min(...outline.map((point) => point[1])) < 0);
  assert.match(formula.contentHTML(), /data-murali-latex="true"/);
  assert.match(middle, /data-murali-matching-morph="latex"/);
  assert.match(middle, /data-murali-morph-role="matched"/);
  assert.match(middle, /\bC[-\d]/);
  assert.doesNotMatch(middle, /data-murali-morph-role="(?:departing|arriving)"/);
  assert.notEqual(start, middle);
  assert.notEqual(middle, target);
  assert.equal(middle, morph.contentHTML(0, { ...morph.initialState, morphProgress: 0.5 }));
  assert.throws(() => LatexMorph("alpha"), /at least two stages/);
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

  assert.throws(() => HStack([square, square]), /same Tattva more than once/);
  assert.throws(() => VStack([square]), /already belongs to/);

  const released = row.detachChildren();
  assert.deepEqual(released, [square, circle]);
  assert.equal(square.parent, undefined);
  assert.deepEqual(row.children, []);
  const regrouped = HStack(released);
  assert.equal(square.parent, regrouped);
});

test("positions objects relative to bounds and aligns their edges", () => {
  class LayoutScene extends Scene {
    override construct(): void {}
  }

  const scene = new LayoutScene();
  const anchor = scene.add(Square().size(2), { at: [1, 0] });
  const label = scene.add(Label("Label").height(0.5).at([0, 0, 3]));
  scene.nextTo(label, anchor, "right", { gap: 0.5 });
  assert.equal(label.initialState.x, 1 + 1 + 0.5 + label.getLayoutSize().width / 2);
  assert.equal(label.initialState.z, 3);
  scene.alignTo(label, anchor, "up");
  assert.equal(label.initialState.y, 0.75);
  assert.equal(label.initialState.z, 3);
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

test("uses one authoritative authored state for set and deterministic sampling", () => {
  interface MeterState extends TattvaState {
    progress: number;
  }
  class MeterScene extends Scene {
    readonly meter = new Tattva<MeterState>({ state: { progress: 0 } }).set({ progress: 25, z: 4 });

    override construct(): void {
      this.add(this.meter);
    }
  }

  const scene = new MeterScene();
  assert.equal(scene.meter.initialState.progress, 25);
  assert.equal(scene.meter.initialState.z, 4);
  assert.equal((scene.sampleAt(0).get(scene.meter) as MeterState | undefined)?.progress, 25);
  assert.equal(scene.sampleAt(10).get(scene.meter)?.z, 4);
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

test("rejects invalid authored times across timelines, scenes, cameras, and child scenes", () => {
  const dot = Circle();
  const animation = timeline();
  assert.throws(() => animation.animate(dot).at(-1), /Animation start time.*non-negative finite/);
  assert.throws(() => animation.animate(dot).duration(Number.NaN), /Animation duration.*non-negative finite/);
  assert.throws(() => animation.wait(Number.POSITIVE_INFINITY), /Timeline wait.*non-negative finite/);
  assert.throws(
    () => animation.schedule({
      tattva: dot,
      start: 0,
      duration: -1,
      easing: (value) => value,
      to: { opacity: 0 },
    }),
    /Animation duration.*non-negative finite/,
  );

  class EmptyScene extends Scene {
    override construct(): void {}
  }
  const scene = new EmptyScene();
  assert.throws(() => scene.wait(-1), /Scene wait.*non-negative finite/);
  assert.throws(() => scene.sampleAt(Number.NaN), /Scene sample time.*non-negative finite/);
  assert.throws(() => scene.sampleStylesAt(-1), /Scene style sample time.*non-negative finite/);
  assert.throws(
    () => timeline().animateCamera(scene.camera).at(Number.POSITIVE_INFINITY),
    /Camera animation start time.*non-negative finite/,
  );

  const view = SceneView(new EmptyScene());
  assert.throws(() => view.startAt(-1), /Scene view start time.*non-negative finite/);
  assert.throws(() => view.localTimeOffset(Number.NaN), /local-time offset.*non-negative finite/);
  assert.throws(() => view.timeScale(-1), /time scale.*non-negative finite/);
  assert.throws(() => view.playback({ loop: 0 }), /loop duration must be greater than zero/);
  assert.throws(() => view.localTime(-1), /parent time.*non-negative finite/);
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
  assert.match(guide.contentHTML(), /data-murali-dash="0.18 0.1"/);
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

test("formats vector readouts and places a labeled vector at its tip", () => {
  assert.equal(formatValue(2.6), "2.60");
  assert.equal(formatValue(2), "2");
  const column = CoordinateReadout([2.6, 1.4]).mode("column").build();
  assert.deepEqual(column.children.map((child) => child.text), ["[ 2.60 ]", "[ 1.40 ]"]);
  const features = CoordinateReadout([0.42, 0.81]).names(["topic", "style"]).mode("features").highlight([1]).build();
  assert.equal(features.children[1]?.text, "style: 0.81");
  const vector = LabeledVector("v", [2.6, 1.4]).coordinates(true).build();
  const label = vector.children.find((child) => child.text?.startsWith("v "));
  assert.equal(label?.text, "v (2.60, 1.40)");
  assert.equal(label?.initialState.x, 2.6 + 0.16);
});

test("fills a span and names a linear combination", () => {
  const u: readonly [number, number] = [1.3, 0.35];
  const v: readonly [number, number] = [0.35, 1.1];
  assert.equal(SpanRegion(u, v).extent(4.5).step(0.75).build().children.length, 26);
  const combination = LinearCombination(u, v, 1.7, 1.2).labels("1.7u", "1.2v", "x").build();
  const result = combination.children.find((child) => child.text?.startsWith("x "));
  assert.equal(result?.text, "x (2.63, 1.92)");
  const basis = BasisVectors(u, v).labels("u", "v").coordinates(true).build();
  assert.equal(basis.children.filter((child) => child.text?.startsWith("u ")).length, 1);
});

test("changes a vector into basis coordinates", () => {
  const u: readonly [number, number] = [1.35, 0.45];
  const v: readonly [number, number] = [-0.45, 1.25];
  const [first, second] = basisCoordinates(u, v, [2.25, 1.7]);
  assert.ok(Math.abs(first - 1.892857) < 1e-4);
  assert.ok(Math.abs(second - 0.678571) < 1e-4);
  assert.equal(BasisGrid(u, v).range([-2, 3], [-2, 3]).step(1).build().children.length, 12);
});

test("multiplies a matrix by a vector and draws the transformed grid", () => {
  const grid = TransformableGrid([2, 1], [-1, 1.5]);
  const image = grid.transformVector([3, 2]);
  assert.ok(Math.abs(image[0] - 4) < 1e-5);
  assert.ok(Math.abs(image[1] - 6) < 1e-5);
  assert.ok(Math.abs(grid.determinant() - 4) < 1e-5);

  const shown = TransformableGrid([1.4, 0.35], [-0.45, 1.15])
    .range([-3.3, 3.3], [-2.2, 2.2])
    .step(0.55)
    .basisVectors(false)
    .build();
  const vertical = sampleRange([-3.3, 3.3], 0.55).length;
  const horizontal = sampleRange([-2.2, 2.2], 0.55).length;
  assert.equal(shown.children.length, (vertical + horizontal) * 2);
  assert.equal(collectText(shown).includes("Ae1"), false);

  const clamped = TransformableGrid([1, 0], [0, 1])
    .range([0, 1], [0, 1])
    .step(0.01)
    .sourceGrid(false)
    .basisVectors(false)
    .build();
  assert.equal(clamped.children.length, sampleRange([0, 1], 0.1).length * 2);

  const flow = MatrixVectorFlow([[1.4, -0.45], [0.35, 1.15]], [1.6, 1.1]).labels("A", "x", "b = Ax");
  const result = flow.resultValues();
  assert.ok(Math.abs((result[0] ?? 0) - 1.745) < 1e-5);
  assert.ok(Math.abs((result[1] ?? 0) - 1.825) < 1e-5);
  const output: readonly [number, number] = [result[0] ?? 0, result[1] ?? 0];
  const arrow = LabeledVector("Ax", output).coordinates(true).build();
  assert.equal(arrow.children.find((child) => child.text?.startsWith("Ax"))?.text, "Ax (1.75, 1.83)");

  const texts = collectText(flow.build());
  assert.ok(texts.includes("1.40"));
  assert.ok(texts.includes("-0.45"));
  assert.ok(texts.includes("b = Ax"));
  assert.ok(texts.includes("1.40*1.60 + -0.45*1.10 = 1.75"));
  assert.ok(texts.includes("0.35*1.60 + 1.15*1.10 = 1.83"));
  assert.equal(MatrixDisplay([["1.40", "-0.45"], ["0.35", "1.15"]]).cellHeight(0.26).build().children.length, 10);

  const wide = MatrixVectorFlow([[1, 2, 0.5], [0, -1, 3]], [2, -1, 4]);
  assert.deepEqual(wide.resultValues(), [2, 13]);
  const rectangular = MatrixVectorFlow([[1, -0.5, 2], [0, 1.5, 0.75]], [2, 1, -0.5]).rowExpansion(false).build();
  const rectangularText = collectText(rectangular);
  assert.deepEqual(
    MatrixVectorFlow([[1, -0.5, 2], [0, 1.5, 0.75]], [2, 1, -0.5]).resultValues().map(formatMatrixEntry),
    ["0.50", "1.13"],
  );
  assert.ok(rectangularText.includes("0"));
  assert.equal(rectangularText.some((text) => text.includes("*")), false);
  assert.throws(() => MatrixVectorFlow([[1, 2]], [1]), /input length 1/);
  assert.equal(formatMatrixEntry(0), "0");
  assert.equal(formatMatrixEntry(1.4), "1.40");
});

test("highlights the columns of a matrix transform", () => {
  const panel = MatrixTransformPanel([2, 1], [-1, 1.5]);
  assert.deepEqual(panel.entries(), [["2", "-1"], ["1", "1.50"]]);
  const built = panel.build();
  const labels = built.children.filter((child) => child.text);
  assert.deepEqual(labels.map((child) => child.text), ["2", "-1", "1", "1.50"]);
  assert.equal(labels[0]?.initialState.color, "rgb(87, 199, 242)");
  assert.equal(labels[1]?.initialState.color, "rgb(250, 189, 71)");
  const plates = built.children.filter((child) => child.initialState.background?.startsWith("rgba"));
  assert.equal(plates.length, 4);
  assert.equal(plates[0]?.initialState.background, "rgba(87, 199, 242, 0.18)");
  assert.equal(plates[1]?.initialState.background, "rgba(250, 189, 71, 0.18)");
  assert.equal(panel.columnHighlights(false).build().children.filter((child) => child.text).length, 4);

  const grid = TransformableGrid([1.4, 0.35], [-0.45, 1.15]).range([-3.5, 3.5], [-2.5, 2.5]).step(0.5);
  const output = grid.transformVector([1.6, 1.1]);
  const drawn = grid.build();
  const lines = sampleRange([-3.5, 3.5], 0.5).length + sampleRange([-2.5, 2.5], 0.5).length;
  assert.equal(drawn.children.length, lines * 2 + 2);
  assert.ok(collectText(drawn).includes("Ae1"));
  assert.deepEqual(
    CoordinateReadout(output).mode("column").build().children.map((child) => child.text),
    ["[ 1.75 ]", "[ 1.83 ]"],
  );
});

test("combines matrix columns and marks the residual", () => {
  const close = (actual: readonly number[], expected: readonly number[]) => {
    assert.ok(Math.abs((actual[0] ?? 0) - (expected[0] ?? 0)) < 1e-5);
    assert.ok(Math.abs((actual[1] ?? 0) - (expected[1] ?? 0)) < 1e-5);
  };
  const view = ColumnCombination([2, 1], [-1, 3], [1.5, -0.5]);
  close(view.firstComponent(), [3, 1.5]);
  close(view.secondComponent(), [0.5, -1.5]);
  close(view.result(), [3.5, 0]);

  const aimed = ColumnCombination([2, 0], [0, 3], [1, 1]).target([3, 2], "b");
  close(aimed.result(), [2, 3]);
  close(aimed.residual() ?? [0, 0], [1, -1]);

  const drawn = ColumnCombination([1.45, 0.55], [-0.55, 1.25], [1.45, 1.1])
    .labels("a1", "a2", "Ax")
    .target([1.25, 2.55], "b")
    .build();
  const texts = collectText(drawn);
  assert.equal(drawn.children.length, 9);
  assert.ok(texts.includes("a1"));
  assert.ok(texts.includes("1.45a1"));
  assert.ok(texts.includes("1.10a2"));
  assert.ok(texts.includes("Ax (1.50, 2.17)"));
  assert.ok(texts.includes("b (1.25, 2.55)"));

  const rank = QuantityBadge("rank", "2").build();
  assert.ok(collectText(rank).includes("rank: 2"));
  assert.ok(rank.getLayoutSize().width >= 0.82);
  assert.ok(rank.getLayoutSize().height >= 0.34);
  assert.ok(collectText(DimensionBadge("x", 2, 1).build()).includes("x: 2x1"));
});

test("reports the signed area of a transformed unit square", () => {
  const positive = DeterminantArea([2, 0], [0, 3]);
  assert.equal(positive.determinant(), 6);
  assert.equal(positive.areaScale(), 6);
  assert.equal(positive.orientation(), 1);
  assert.equal(positive.labelText(), "det(A) = 6, area scales by 6");
  const drawn = positive.build();
  assert.ok(drawn.children.some((child) => child.contentHTML()?.includes("rgba(112, 219, 133, 0.28)")));
  assert.ok(collectText(drawn).includes("Ae1"));

  const negative = DeterminantArea([0, 1], [1, 0]);
  assert.equal(negative.determinant(), -1);
  assert.equal(negative.orientation(), -1);
  assert.equal(negative.labelText(), "det(A) = -1, area flips");

  const flat = DeterminantArea([1, 1], [2, 2]);
  assert.equal(flat.collapsed(), true);
  assert.equal(flat.labelText(), "det(A) = 0, area collapses");
  assert.equal(flat.build().children.some((child) => child.contentHTML()?.includes("rgba(112, 219, 133, 0.28)")), false);

  const stretch = DeterminantArea([1.6, 0.25], [-0.35, 1.2]);
  assert.equal(stretch.labelText(), "det(A) = 2.01, area scales by 2.01");
  const flip = DeterminantArea([0.2, 1.1], [1.2, 0.15]);
  assert.equal(flip.labelText(), "det(A) = -1.29, area flips");

  const scale: readonly [[number, number], [number, number]] = [[1.45, 0], [0, 1]];
  const shear: readonly [[number, number], [number, number]] = [[1, 0], [0.65, 1]];
  const ba = composeColumns(shear, scale);
  const ab = composeColumns(scale, shear);
  assert.deepEqual(MatrixTransformPanel(ba[0], ba[1]).entries(), [["1.45", "0.65"], ["0", "1"]]);
  assert.deepEqual(MatrixTransformPanel(ab[0], ab[1]).entries(), [["1.45", "0.94"], ["0", "1"]]);
  const image = TransformableGrid(ba[0], ba[1]).transformVector([1, 1]);
  const arrow = LabeledVector("BAx", image).coordinates(true).build();
  assert.equal(arrow.children.find((child) => child.text?.startsWith("BAx"))?.text, "BAx (2.10, 1)");
});

test("derives animated linear-algebra diagrams from sampled mathematical state", () => {
  const basis = BasisExplorer2D([1, 0], [0, 1]).fixedVector([2, 1], "x");
  assert.match(basis.contentHTML(), /x stays fixed\s+\[2, 1\] in this basis/);
  assert.match(
    basis.contentHTML(0, { ...basis.initialState, ...basis.basisState([2, 0], [0, 0.5]) }),
    /x stays fixed\s+\[1, 2\] in this basis/,
  );

  const projection = ProjectionDiagram2D([1, 0], [0, 1]);
  const projectionMarkup = projection.contentHTML();
  assert.match(projectionMarkup, /a · b = 0\s+•\s+cos θ = 0\s+•\s+θ = 90°/);
  assert.match(projectionMarkup, /rgba\(220,232,247,.48\)/);
  assert.match(projectionMarkup, /data-murali-right-angle="true"/);

  class AnimatedMapScene extends Scene {
    readonly map = LinearMap2D().unitSquare().vector([1, 1]).columnDecomposition();

    override construct(): void {
      this.add(this.map);
      const movement = new Timeline();
      movement.animate(this.map).duration(2).ease("linear").to(
        this.map.matrixState([2, 0], [0, 0.5]),
      );
      this.play(movement);
    }
  }

  const scene = new AnimatedMapScene().prepare();
  const middle = scene.sampleAt(1).get(scene.map) as Readonly<typeof scene.map.initialState> | undefined;
  assert.ok(middle);
  assert.equal(middle?.iX, 1.5);
  assert.equal(middle?.jY, 0.75);
  assert.match(scene.map.contentHTML(1, middle), /det\(A\) = 1.13/);
  assert.match(scene.map.contentHTML(1, middle), /A = \[ 1.50\s+0 ;\s+0\s+0.75 \]/);
  assert.match(scene.map.contentHTML(1, middle), /Ax = 1Ae₁ \+ 1Ae₂/);
});

function collectText(tattva: Tattva): string[] {
  const own = tattva.text ? [tattva.text] : [];
  return [...own, ...tattva.children.flatMap((child) => collectText(child))];
}

test("samples an updater and a traced path from scene time alone", () => {
  const scene = new class extends Scene {
    readonly dot = Circle().radius(0.1);
    constructor() {
      super();
      this.add(this.dot);
    }
    construct(): void {
      this.updater((time, states) => {
        const state = states.get(this.dot);
        if (state) state.x = time;
      });
    }
  }();
  assert.equal(scene.sampleAt(3).get(scene.dot)?.x, 3);
  assert.equal(scene.sampleAt(1).get(scene.dot)?.x, 1);

  const radius = 0.55;
  const startX = -3.45;
  const groundY = -1.15;
  const trace = TracedPath((time) => {
    const elapsed = Math.min(5.4, Math.max(0, time - 2.2));
    const theta = (elapsed / 5.4) * Math.PI * 4;
    const centerX = startX + radius * theta;
    return [centerX - radius * Math.sin(theta), groundY + radius - radius * Math.cos(theta)];
  }).minDistance(0.02);
  assert.equal(trace.pointsAt(2.2).length, 1);
  const rolled = trace.pointsAt(7.6);
  const last = rolled[rolled.length - 1];
  assert.ok(rolled.length > 2);
  assert.ok(Math.abs((last?.[0] ?? 0) - (startX + radius * Math.PI * 4)) < 1e-6);
  assert.ok(Math.abs((last?.[1] ?? 0) - groundY) < 1e-6);

  const belt = ParticleBelt(2.25).particleCount(220).seed(7).orbitSpeed(1);
  assert.equal(belt.particlesAt(0).length, 220);
  assert.notDeepEqual(belt.particlesAt(0)[0]?.center, belt.particlesAt(5.88)[0]?.center);

  const streams = StreamLines([[0, 0]], () => [1, 0]).stepSize(0.07).bounds([-1, -1], [2, 1]);
  assert.equal(streams.tracesAt(1)[0]?.length, 2);
  assert.ok((streams.tracesAt(10)[0]?.length ?? 0) > 2);

  const field = VectorField([-1, 1], [-1, 1], 3, 3, () => [0, 1]);
  assert.equal(field.arrowsAt(0).length, 9);
  assert.ok((field.arrowsAt(0)[0]?.vector[1] ?? 0) > 0);
});

test("runs typed targeted updaters in a deterministic range and supports removal", () => {
  class CoordinateScene extends Scene {
    readonly ball = Circle().radius(0.1).at([-1, 0, 0]);
    readonly readout = Label("pending").reserveText("x=-0.00");
    readonly handle;

    constructor() {
      super();
      this.add(this.ball, this.readout);
      this.handle = this.addUpdater(this.ball, ({ state, stateOf }) => {
        const label = stateOf(this.readout);
        if (!label) return;
        label.x = state.x;
        label.text = `x=${state.x.toFixed(2)}`;
      }, { from: 0.5, until: 1.5 });
    }

    override construct(): void {
      this.play(timeline((local) => local.animate(this.ball).duration(2).ease("linear").moveTo([1, 0, 0])));
    }
  }

  const scene = new CoordinateScene().prepare();
  assert.equal((scene.sampleAt(0.25).get(scene.readout) as LabelState).text, "pending");
  assert.equal((scene.sampleAt(0.5).get(scene.readout) as LabelState).text, "x=-0.50");
  assert.equal((scene.sampleAt(1.5).get(scene.readout) as LabelState).text, "x=0.50");
  assert.equal((scene.sampleAt(2).get(scene.readout) as LabelState).text, "pending");
  assert.equal(scene.removeUpdater(scene.handle), true);
  assert.equal(scene.removeUpdater(scene.handle), false);
  assert.equal((scene.sampleAt(1).get(scene.readout) as LabelState).text, "pending");

  const first = scene.addUpdater(scene.ball, () => undefined);
  scene.addUpdater(scene.ball, () => undefined);
  scene.updater(() => undefined);
  assert.equal(scene.removeUpdatersFor(scene.ball), 2);
  assert.equal(scene.removeUpdater(first), false);
  assert.equal(scene.clearUpdaters(), 1);
  assert.equal(scene.clearUpdaters(), 0);
  assert.throws(
    () => scene.addUpdater(scene.ball, () => undefined, { from: 2, until: 1 }),
    /at or after/,
  );
});

test("writes a table, colors code, and lays out math from scene data", () => {
  const table = Table([
    ["Alice", "28", "NYC"],
    ["Bob", "34", "LA"],
  ]).columnLabels(["Name"]).rowLabels(["Person 1"]).title("Person Data").textHeight(0.25);
  assert.deepEqual(table.textsAt(0), []);
  const written = table.textsAt(1);
  assert.ok(written.includes("Person Data"));
  assert.ok(written.includes("Alice"));
  assert.ok(written.includes("Name"));

  const code = CodeBlock("fn highlight() {\n    1\n}", "rust").theme("dark").title("highlight.rs");
  assert.match(code.contentHTML(), /fn/);
  assert.match(code.contentHTML(), /#f0ac5f/);
  assert.match(CodeBlock("fps = 60\n", "toml").theme("light").contentHTML(), /60/);

  const formula = mathml("\\int_0^1 x^2 \\, dx = \\frac{1}{3}");
  assert.match(formula, /<mfrac>/);
  assert.match(formula, /∫/);
  assert.match(MathText("(a + b)^2").contentHTML(), /msup/);

  const source = Equation([
    { text: "x", key: "x", color: "#5cd0b3" },
    { text: "+", key: "plus", color: "#dcdcdc" },
    { text: "2", key: "two", color: "#f0ac5f" },
  ]);
  const target = Equation([
    { text: "x", key: "x", color: "#5cd0b3" },
    { text: "-", key: "minus", color: "#dcdcdc" },
  ]);
  const start = continuityPlacement(source.terms, target.terms, 0);
  const xTerm = start.find((term) => term.tattva === target.terms[0]?.tattva);
  assert.equal(xTerm?.x, source.terms[0]?.center[0]);
  const minus = start.find((term) => term.tattva === target.terms[1]?.tattva);
  assert.equal(minus?.opacity, 0);
  const arcSource = Equation([
    { text: "a", key: "a", color: "#ffffff" },
    { text: "b", key: "b", color: "#ffffff" },
  ]);
  const arcTarget = Equation([
    { text: "b", key: "b", color: "#ffffff" },
    { text: "a", key: "a", color: "#ffffff" },
  ]);
  const arcMiddle = continuityPlacement(arcSource.terms, arcTarget.terms, 0.5, {
    path: "arc",
    arcHeight: 0.4,
  });
  const movingA = arcMiddle.find((term) => term.tattva === arcTarget.terms[1]?.tattva);
  const movingB = arcMiddle.find((term) => term.tattva === arcTarget.terms[0]?.tattva);
  assert.equal(movingA?.y, 0.4);
  assert.equal(movingB?.y, -0.4);
  assert.equal(continuityPlacement(arcSource.terms, arcTarget.terms, 0, { path: "arc" })[0]?.y, 0);
  assert.ok(Math.abs(continuityPlacement(arcSource.terms, arcTarget.terms, 1, { path: "arc" })[0]?.y ?? 1) < 1e-12);
  assert.throws(
    () => continuityPlacement(arcSource.terms, arcTarget.terms, 0.5, { path: "arc", arcHeight: Number.NaN }),
    /finite/,
  );
  assert.equal(NumberLine([-3, 6]).step(1).build().children.length > 2, true);

  const focus = matrixMarkup([["2", "-1"], ["-1", "2"]], 0.44, {
    cells: [[0, 0]],
    color: "#5cd0b3",
    amount: 1,
    dim: 0.28,
  });
  assert.match(focus, /#5cd0b3/);

  const outline = piOutline(32, 2.65);
  assert.equal(outline.length, 32);
  const outlineArea = outline.reduce((sum, point, index) => {
    const next = outline[(index + 1) % outline.length] ?? point;
    return sum + point[0] * next[1] - next[0] * point[1];
  }, 0) / 2;
  assert.ok(Math.abs(outlineArea) > 2.5, "π should be a closed silhouette, not disconnected strokes");
  const terms = fourierTerms(outline, 2);
  assert.equal(terms[0]?.frequency, 0);
  assert.notDeepEqual(epicycleTip(terms, 0), epicycleTip(terms, 0.5));
});

test("selects and smoothly refocuses semantic matrix cells", () => {
  const matrix = Matrix([
    ["2", "-1", "0"],
    ["-1", "2", "-1"],
    ["0", "-1", "2"],
  ]).cellHeight(0.44);
  assert.deepEqual(matrix.row(1).coordinates, [[1, 0], [1, 1], [1, 2]]);
  assert.deepEqual(matrix.column(1).coordinates, [[0, 1], [1, 1], [2, 1]]);
  assert.deepEqual(matrix.diagonal().coordinates, [[0, 0], [1, 1], [2, 2]]);
  assert.deepEqual(matrix.antiDiagonal().coordinates, [[0, 2], [1, 1], [2, 0]]);
  assert.deepEqual(
    matrix.row(1).intersect(matrix.column(1)).coordinates,
    [[1, 1]],
  );
  assert.deepEqual(
    matrix.diagonal().union(matrix.antiDiagonal()).coordinates,
    [[0, 0], [1, 1], [2, 2], [0, 2], [2, 0]],
  );
  assert.deepEqual(
    matrix.where(({ value }) => value.startsWith("-")).coordinates,
    [[0, 1], [1, 0], [1, 2], [2, 1]],
  );
  assert.throws(() => matrix.row(3), /between 0 and 2/);
  assert.throws(() => matrix.row(0).union(Matrix([["1"]]).row(0)), /different matrices/);
  assert.throws(() => matrix.createFocusAnimation(matrix.row(0), { dim: 2 }), /between 0 and 1/);
  if (false) {
    // @ts-expect-error clearFocus is available only on semantic focus targets
    new Timeline().animate(Circle()).clearFocus();
    // @ts-expect-error Matrix focus requires a MatrixSelection
    new Timeline().animate(matrix).focus("row 1");
  }

  class MatrixFocusScene extends Scene {
    readonly matrix = matrix;

    override construct(): void {
      this.add(this.matrix);
      const timeline = new Timeline();
      timeline.animate(this.matrix).at(0).duration(1).ease("linear").focus(this.matrix.row(1), {
        color: "#5cd0b3",
        dim: 0.28,
      });
      timeline.animate(this.matrix).at(1).duration(1).ease("linear").focus(this.matrix.column(1), {
        color: "#9cdceb",
        dim: 0.24,
      });
      timeline.animate(this.matrix).at(2).duration(1).ease("linear").clearFocus();
      this.play(timeline);
    }
  }

  const scene = new MatrixFocusScene();
  const markupAt = (time: number) => matrix.contentHTML(
    time,
    scene.sampleAt(time).get(matrix) as typeof matrix.initialState,
  );
  const opacityAt = (markup: string, row: number, column: number) => {
    const match = new RegExp(
      `data-matrix-row="${row}" data-matrix-column="${column}" data-matrix-opacity="([^"]+)"`,
    ).exec(markup);
    return Number(match?.[1]);
  };

  const rowFocused = markupAt(1);
  assert.equal(opacityAt(rowFocused, 1, 0), 1);
  assert.equal(opacityAt(rowFocused, 0, 0), 0.28);
  const crossfade = markupAt(1.5);
  assert.equal(opacityAt(crossfade, 1, 1), 1);
  assert.ok(Math.abs(opacityAt(crossfade, 1, 0) - 0.62) < 1e-9);
  assert.ok(Math.abs(opacityAt(crossfade, 0, 1) - 0.64) < 1e-9);
  assert.ok(opacityAt(crossfade, 0, 0) < 0.3);
  const cleared = markupAt(3);
  assert.equal(opacityAt(cleared, 0, 0), 1);
  assert.equal(opacityAt(cleared, 1, 1), 1);
});

test("samples a space curve and writes a parametric surface by row", () => {
  const curve = sampleCurve([0, 6.4], (t) => [
    1.7 * Math.cos(0.9 * t),
    0.85 * Math.sin(1.4 * t),
    -1.5 + 0.48 * t + 0.22 * Math.cos(1.1 * t),
  ], 240);
  assert.equal(curve.length, 240);
  assert.ok(Math.abs((curve[0]?.[0] ?? 0) - 1.7) < 1e-9);
  assert.equal(curve[0]?.[1], 0);
  assert.ok(Math.abs((curve[0]?.[2] ?? 0) + 1.28) < 1e-9);
  assert.equal(tickValues([-2.8, 2.8], 1).includes(0), false);

  const surface = ParametricSurface([-2, 2], [-1.8, 1.8], (u, v) => [u, 0, v]).samples(42, 42).writeProgress(0);
  assert.equal(surface.rowsAt(0), 0);
  assert.equal(surface.rowsAt(0.5), 21);
  assert.equal(surface.rowsAt(1), 42);
});

test("loads demo props and morphs a map from scene time", () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const pyramid = parseGlb(readFileSync(resolve(root, "examples/assets/props/demo-pyramid.glb")));
  assert.equal(pyramid.meshCount, 5);
  assert.ok(Math.abs((pyramid.meshes[0]?.positions[0] ?? 0) + 1.0355) < 1e-3);
  assert.ok(Math.abs(pyramid.meshes[0]?.positions[1] ?? 1) < 1e-6);

  const apple = parseGltf(
    readFileSync(resolve(root, "examples/assets/props/demo-apple/demo-apple.gltf"), "utf8"),
    [readFileSync(resolve(root, "examples/assets/props/demo-apple/demo-apple.bin"))],
  );
  assert.equal(apple.meshCount, 3);
  const dimensions = modelDimensions(apple);
  assert.ok(Math.abs(dimensions[0] - 1.8) < 1e-3);
  assert.ok(Math.abs(dimensions[1] - 2.61) < 1e-3);
  assert.ok(Math.abs(dimensions[2] - 1.64) < 1e-3);
  const fit = fittedScale(dimensions, [1, 1, 1], true);
  assert.ok(Math.abs(fit[1] - 4.2 / dimensions[1]) < 1e-9);
  assert.ok(Math.abs(fittedScale([2, 4, 1], [3, 1, 1], true)[0] - 3.15) < 1e-5);
  const distance = framingDistance([2, 4, 2], 42, 16 / 9);
  const tan = Math.tan(21 * Math.PI / 180);
  const expectedDistance = (Math.max(2 / tan, 1 / (tan * 16 / 9)) + 1) * 1.35;
  assert.ok(Math.abs(distance - expectedDistance) < 1e-9);
  const centered = centeredPropPosition([1, 0, 0], [0, 90, 0], [1, 0, 0], [1, 1, 1]);
  assert.ok(Math.abs(centered[0] - 1) < 1e-9);
  assert.ok(Math.abs(centered[1]) < 1e-9);
  assert.ok(Math.abs(centered[2] - 1) < 1e-9);
  assert.ok(Math.abs(modelCenter(apple)[0]) < 1e-6);

  const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
  const translated = parseGltf(JSON.stringify({
    asset: { version: "2.0" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, translation: [1, 0, 0] }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, material: 0 }] }],
    materials: [{ pbrMetallicRoughness: { baseColorFactor: [0.2, 0.4, 0.6, 1] } }],
    buffers: [{ byteLength: 36 }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36 }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3" }],
  }), [new Uint8Array(positions.buffer)]);
  assert.equal(translated.meshCount, 1);
  assert.equal(translated.meshes[0]?.positions[0], 1);
  assert.equal(translated.meshes[0]?.indices.length, 3);
  assert.equal(translated.meshes[0]?.color[0], 0.2);

  const yaw = -0.35 * 180 / Math.PI;
  class YawScene extends Scene {
    readonly prop = Prop3D(translated).scale(1.4).rotation3D([0, yaw, 0]);

    override construct(): void {
      this.add(this.prop, { at: [-0.85, -0.65, 0] });
      const timeline = new Timeline();
      timeline.animate(this.prop).at(2.05).duration(2.2).ease("inOutCubic").rotate3DTo([0, yaw + 360, 0]);
      this.play(timeline);
    }
  }
  const yawScene = new YawScene();
  const start = yawScene.sampleAt(0).get(yawScene.prop);
  const middle = yawScene.sampleAt(2.05 + 1.1).get(yawScene.prop);
  const end = yawScene.sampleAt(4.25).get(yawScene.prop);
  assert.equal(start?.y, -0.65);
  assert.equal(start?.scaleX, 1.4);
  assert.ok(Math.abs((start?.rotationY ?? 0) - yaw) < 1e-9);
  assert.ok(Math.abs((middle?.rotationY ?? 0) - (yaw + 180)) < 1e-6);
  assert.ok(Math.abs((end?.rotationY ?? 0) - (yaw + 360)) < 1e-6);

  assert.equal(solveMollweideTheta(0), 0);
  const pole = projectLonLat({ from: "Equirectangular", to: "Equirectangular", mix: 0 }, Math.PI, Math.PI / 2);
  assert.ok(Math.abs(pole[0] - 5.9) < 1e-9);
  assert.ok(Math.abs(pole[1] - 3.5) < 1e-9);
  const blend = projectionBlendAt(2.8 + 2.4);
  assert.equal(blend.from, "Equirectangular");
  assert.equal(blend.to, "Sinusoidal");
  assert.ok(Math.abs(blend.mix - 0.5) < 1e-9);
  assert.equal(projectionBlendAt(7.6).from, "Sinusoidal");
  assert.equal(visibleProjectionCaption(0), "");
  assert.equal(visibleProjectionCaption(2.5), "Equirectangular");
  assert.equal(visibleProjectionCaption(2.8), "Equirectangular to Sinusoidal");
  assert.equal(MAP_FOOTER_START, 25.6);

  class MorphScene extends Scene {
    readonly sheet = ParametricSurface([0, Math.PI], [0, Math.PI * 2], mapPoint).samples(8, 8);

    override construct(): void {
      this.add(this.sheet);
      this.wait(10);
    }
  }
  const morph = new MorphScene();
  morph.sampleAt(2.8);
  const before = morph.sheet.point(Math.PI / 4, Math.PI * 1.5);
  morph.sampleAt(2.8 + 2.4);
  const during = morph.sheet.point(Math.PI / 4, Math.PI * 1.5);
  assert.ok(Math.abs(before[0] - 2.95) < 1e-9);
  assert.ok(during[0] < before[0] - 0.3);
});

test("maps a child scene clock from parent time", () => {
  assert.equal(sceneViewLocalTime({
    parentTime: 1,
    startTime: 2,
    offset: 0,
    timeScale: 1,
    playback: "continuous",
    childEnd: 4,
  }), 0);
  assert.ok(Math.abs(sceneViewLocalTime({
    parentTime: 3.25,
    startTime: 2,
    offset: 0,
    timeScale: 1,
    playback: "continuous",
    childEnd: 4,
  }) - 1.25) < 1e-9);
  assert.ok(Math.abs(sceneViewLocalTime({
    parentTime: 6,
    startTime: 2,
    offset: 0.5,
    timeScale: 0.25,
    playback: "continuous",
    childEnd: 4,
  }) - 1.5) < 1e-9);
  assert.ok(Math.abs(sceneViewLocalTime({
    parentTime: 2.5,
    startTime: 0,
    offset: 0,
    timeScale: 1,
    playback: { loop: 2 },
    childEnd: 4,
  }) - 0.5) < 1e-9);
  assert.equal(sceneViewLocalTime({
    parentTime: 9,
    startTime: 0,
    offset: 0,
    timeScale: 1,
    playback: "once",
    childEnd: 2.75,
  }), 2.75);
  assert.equal(sceneViewLocalTime({
    parentTime: 4,
    startTime: 0,
    offset: 0.25,
    timeScale: 1,
    playback: "paused",
    childEnd: 2,
  }), 0.25);

  class ChildClock extends Scene {
    readonly dot = Circle().radius(0.2);

    override construct(): void {
      this.add(this.dot);
      const timeline = new Timeline();
      timeline.animate(this.dot).duration(2).ease("linear").moveTo([2, 0]);
      this.play(timeline);
    }
  }
  class ParentClock extends Scene {
    readonly nested = new ChildClock();
    readonly view = SceneView(this.nested).size(4, 2).playback({ loop: 2 });

    override construct(): void {
      this.add(this.view);
      const timeline = new Timeline();
      timeline.animate(this.view).duration(1).ease("linear").moveTo([3, 1]);
      this.play(timeline);
    }
  }
  const parent = new ParentClock();
  const moved = parent.sampleAt(1).get(parent.view);
  assert.equal(moved?.x, 3);
  assert.equal(moved?.y, 1);
  assert.equal(parent.view.localTime(1), 1);
  assert.equal(parent.view.child.sampleAt(parent.view.localTime(1)).get(parent.nested.dot)?.x, 1);
  assert.equal(parent.view.localTime(2.5), 0.5);
  assert.equal(parent.view.worldSize?.width, 4);
  assert.equal(parent.view.worldSize?.height, 2);
});

test("routes a network around inactive nodes and counts a context budget", () => {
  const diagram = networkDiagram([3, 5, 4, 2], {
    layerSpacing: 1.7,
    nodeSpacing: 0.58,
    inactive: [[1, 4], [2, 0]],
  });
  const paths = networkPaths(diagram);
  assert.equal(paths.length, 3 * 4 * 3 * 2);
  assert.equal(paths.every((path) => path.length === 4), true);
  const start = paths[0]?.[0];
  const end = paths[0]?.[3];
  assert.ok(start && end);
  assert.deepEqual(signalPoint(paths[0] ?? [], 0), start);
  assert.deepEqual(signalPoint(paths[0] ?? [], 1), end);
  const midway = signalPoint(paths[0] ?? [], 0.5);
  const second = paths[0]?.[1];
  const third = paths[0]?.[2];
  assert.ok(midway && second && third);
  assert.ok(Math.abs(midway[0] - (second[0] + third[0]) / 2) < 1e-9);

  const window = contextWindow([
    { label: "Core instructions", role: "system", tokens: 620 },
    { label: "Conversation history", role: "user", tokens: 4900, retained: 2700, cut: "start" },
    { label: "Retrieved documents", role: "retrieved", tokens: 1850 },
    { label: "Tool result", role: "tool", tokens: 760 },
    { label: "Latest request", role: "user", tokens: 410 },
  ], 8192);
  assert.equal(contextUsedTokens(window), 6340);
  assert.throws(() => contextWindow([{ label: "too big", role: "user", tokens: 10 }], 4));
});

test("models weighted and sparse neural networks with stable semantic identities", () => {
  const weighted = neuralNetwork([
    { id: "input", nodes: ["x", "y"] },
    { id: "hidden", nodes: 2, activation: "relu" },
    { id: "output", nodes: ["score"] },
  ], {
    weights: [
      [[1, -0.5], [0.25, 0.75]],
      [[1.2, -0.8]],
    ],
  });
  assert.equal(weighted.nodes[0]?.id, "input:x");
  assert.equal(weighted.layerSpecs[1]?.activation, "relu");
  assert.equal(networkEdges(weighted).length, 6);
  assert.equal(weighted.edges.find((edge) => edge.from === "input:y" && edge.to === "hidden:0")?.weight, -0.5);

  const sparse = neuralNetwork([
    { id: "input", nodes: ["x", "y"] },
    { id: "hidden", nodes: ["h"] },
    { id: "output", nodes: ["score"] },
  ], {
    connections: [
      { from: "input:x", to: "hidden:h" },
      { from: "hidden:h", to: "output:score" },
      { id: "residual", from: "input:y", to: "output:score" },
    ],
  });
  assert.equal(networkEdges(sparse).length, 3);
  assert.deepEqual(networkRoutes(sparse), [
    ["input:x", "hidden:h", "output:score"],
    ["input:y", "output:score"],
  ]);
  assert.equal(networkRoutes(weighted, { maxPaths: 3 }).length, 3);
});

test("interpolates cumulative neural-network snapshots and flows over unique edges", () => {
  const model = neuralNetwork([
    { id: "input", nodes: ["x", "y"] },
    { id: "hidden", nodes: ["h₁", "h₂"] },
    { id: "output", nodes: ["ŷ"] },
  ]);
  const view = NeuralNetwork(model)
    .snapshot({ name: "input", nodes: { "input:x": { value: 0.8, activation: 0.8 } } })
    .snapshot({ name: "hidden", nodes: { "hidden:h₁": { value: 0.6, activation: 0.6 } } });
  view.resolveTheme(createTheme(themes.dark, { colors: { accent: "#123456", warning: "#fedcba" } }));
  assert.equal(view.snapshotIndex("hidden"), 2);
  const html = view.contentHTML(0, {
    ...view.initialState,
    morphProgress: 2,
    flowProgress: 0.5,
  });
  assert.match(html, /#123456/);
  assert.match(html, />0\.8<\/text>/);
  assert.match(html, />0\.6<\/text>/);
  assert.equal([...html.matchAll(/data-network-edge=/g)].length, model.edges.length);
  assert.equal([...html.matchAll(/data-network-flow=/g)].length, 4);
});

test("focuses one transformer stage at a time and then clears it", () => {
  const resting = stageFocusAt(0, ATTENTION_BLOCK_FOCUS);
  assert.equal(stageOpacity("self_attention", resting), 1);
  assert.equal(stageOpacity("mlp", resting), 1);
  const held = stageFocusAt(7, ATTENTION_BLOCK_FOCUS);
  assert.equal(stageOpacity("self_attention", held), 1);
  assert.ok(Math.abs(stageOpacity("mlp", held) - 0.35) < 1e-9);
  const cleared = stageFocusAt(12, ATTENTION_BLOCK_FOCUS);
  assert.equal(stageOpacity("self_attention", cleared), 1);
  assert.equal(stageOpacity("mlp_residual", cleared), 1);
  const mid = stageFocusAt(6.4 + 0.225, ATTENTION_BLOCK_FOCUS);
  const dimming = stageOpacity("mlp", mid);
  assert.ok(dimming < 1 && dimming > 0.35);
});

test("multiplies query and key vectors, then masks and normalizes attention", () => {
  const { dots, scaled, masked, weights } = attentionMatrices();
  assert.equal(dots.values[0], Math.fround(1 + Math.fround(0.2 * 0.3)));
  assert.equal(masked.values[1], -4);
  assert.equal(masked.values[0], scaled.values[0]);
  const firstRow = weights.values.slice(0, 4).reduce((sum, value) => sum + value, 0);
  assert.ok(Math.abs(firstRow - 1) < 1e-6);
  assert.ok((weights.values[1] ?? 1) < 0.01);
  const early = tensorSemanticsFrame(2);
  const selected = tensorSemanticsFrame(3);
  const afterScale = tensorSemanticsFrame(4.5);
  assert.equal(early.highlight, 0);
  assert.equal(selected.highlight, 1);
  assert.equal(selected.values[0], dots.values[0]);
  assert.notEqual(afterScale.values[0], dots.values[0]);

  class FillScene extends Scene {
    readonly cache = KvCache({ tokens: ["The", "model"], values: [1, 0, 0, 1] }, { tokens: ["The", "model"], values: [0, 1, 1, 0] });

    override construct(): void {
      this.add(this.cache);
      const timeline = new Timeline();
      timeline.animate(this.cache).duration(1).ease("linear").to({ occupancy: 1 });
      this.play(timeline);
    }
  }
  const scene = new FillScene();
  const occupancyAt = (time: number) => (scene.sampleAt(time).get(scene.cache) as unknown as { occupancy: number }).occupancy;
  assert.equal(occupancyAt(0), 0);
  assert.equal(occupancyAt(0.5), 0.5);
  assert.equal(occupancyAt(1), 1);
});

test("layer-normalizes each token row and draws one next token", () => {
  const rows = layerNormRows([
    [1, 2, 4, 5, 8],
    [-3, -1, 0, 2, 7],
    [0.5, 0.8, 1.4, 2.2, 4.8],
    [-5, -2, 1, 4, 10],
  ]);
  const first = rows[0];
  assert.ok(first);
  assert.equal(first.mean, 4);
  assert.equal(first.divisor.toFixed(2), "2.45");
  assert.ok(Math.abs(first.divisor - Math.sqrt(6 + 1e-5)) < 1e-5);
  assert.equal(first.output.map((value) => value.toFixed(1)).join(" "), "-1.2 -0.8 0.0 0.4 1.6");
  assert.equal(rows[2]?.mean.toFixed(2), "1.94");

  const even = entropyBits([0.5, 0.5]);
  assert.ok(Math.abs(even.bits - 1) < 1e-5);
  assert.ok(Math.abs(even.ratio - 1) < 1e-5);

  const probe = nextTokenChoice(
    ["blue", "clear", "bright", "dark", "warm"],
    [2.4, 1.8, 0.9, 0.2, -0.4],
    { temperature: 0.8, topK: 4, topP: 0.88, unit: 0.72 },
  );
  assert.equal(probe.candidates.filter((candidate) => candidate.retained).length, 3);
  assert.equal(probe.selected, "clear");
  assert.equal(probe.candidates.filter((candidate) => candidate.selected).length, 1);
  assert.equal(probe.candidates[4]?.sampling, 0);
  assert.ok((probe.candidates[4]?.model ?? 0) > 0);
  const probeSum = probe.candidates.reduce((sum, candidate) => sum + candidate.sampling, 0);
  assert.ok(Math.abs(probeSum - 1) < 1e-6);

  const scene = nextTokenChoice(
    ["scattered", "blue", "across", "through", "softly", "above", "dark"],
    [2.8, 2.25, 1.7, 1.05, 0.4, -0.1, -0.8],
    { temperature: 0.85, topK: 5, topP: 0.9, unit: 0.61 },
  );
  assert.equal(scene.selected, "blue");
  assert.equal(scene.candidates.filter((candidate) => candidate.retained).length, 3);
  const sceneSum = scene.candidates.reduce((sum, candidate) => sum + candidate.sampling, 0);
  assert.ok(Math.abs(sceneSum - 1) < 1e-6);
});

test("aligns tensor math by element id and samples the attention trace", () => {
  const { activations, biased, left, right, reshaped } = tensorOperationStages();
  assert.equal(biased.values.map((value) => value.toFixed(2)).join(" "), "1.10 2.20 3.30 4.40 5.10 6.20 7.30 8.40");
  assert.equal(left.axes[1]?.elementLabels.join(" "), "x0 x1");
  assert.equal(right.axes[1]?.elementLabels.join(" "), "x2 x3");
  assert.equal(reshaped.values.map((value) => value.toFixed(2)).join(" "), biased.values.map((value) => value.toFixed(2)).join(" "));
  assert.equal(reshaped.axes[0]?.elementLabels[0], "h0 / AI");
  const mid = tensorCellsAt(2.95, activations, [{ at: 2.4, duration: 1.1, to: biased }]);
  assert.ok(Math.abs((mid[0]?.value ?? 0) - 1.05) < 1e-6);
  assert.throws(() => tensorAdd(activations, { ...biased, axes: [{ ...biased.axes[1], id: "other", elementIds: ["missing"], elementLabels: ["no"] }] }, "bad"));

  const swapped = tensorMatmul(
    { id: "row", values: [1, 2], axes: [
      { id: "token", label: "Token", elementIds: ["t"], elementLabels: ["t"] },
      { id: "feature", label: "Feature", elementIds: ["f0", "f1"], elementLabels: ["f0", "f1"] },
    ] },
    { id: "column", values: [4, 10], axes: [
      { id: "feature", label: "Feature", elementIds: ["f1", "f0"], elementLabels: ["f1", "f0"] },
      { id: "out", label: "Out", elementIds: ["o"], elementLabels: ["o"] },
    ] },
    "product",
  );
  assert.equal(swapped.values[0], 18);

  const { headZero, headOne } = tensorSlicingHeads();
  assert.equal(headZero.values.slice(0, 4).map((value) => value.toFixed(2)).join(" "), "0.50 0.71 0.88 0.98");
  assert.equal(headOne.values.slice(0, 4).map((value) => value.toFixed(2)).join(" "), "0.05 0.18 0.37 0.58");
  assert.equal(headZero.axes[0]?.elementLabels.join(" "), "AI learns by");

  const lesson = selfAttentionLesson(trace);
  assert.equal(lesson.queries.values[0]?.toFixed(2), "0.79");
  assert.equal(lesson.sample.token, "clearly");
  assert.equal(lesson.sample.probability.toFixed(3), "0.320");
  assert.equal(lesson.tokens.join(" "), "AI learns by");
});

test("reveals a stepwise story before the signal replays it", () => {
  const script = (story: StepwiseStoryBuilder) => {
    const observe = story.step("Observe");
    const reason = story.step("Reason");
    const revise = story.step("Revise");
    const publish = story.step("Publish");
    story.connect(observe, reason);
    story.connect(reason, revise);
    story.connect(revise, publish);
    story.connect(revise, reason).route("down", "left");
    story.sequence([observe, reason, revise, reason, revise, publish]);
  };
  const model = stepwiseModel(script);
  const hidden = stepwisePicture(model, 0, 0);
  assert.equal(hidden.buildSequence.join(","), "0,1,2,3");
  assert.equal(hidden.nodes[0]?.phase, "active");
  assert.equal(hidden.nodes[0]?.local, 0);
  assert.equal(hidden.nodes.slice(1).every((node) => node.phase === "pending"), true);
  assert.equal(hidden.edges[0]?.trim, 0);
  assert.equal(hidden.signal, null);
  const early = stepwisePicture(model, 0.4, 0);
  assert.equal(early.nodes[0]?.phase, "completed");
  assert.equal(early.nodes[1]?.phase, "active");
  assert.equal(early.edges[3]?.phase, "hidden");
  const loop = stepwisePicture(model, 0.6, 0);
  assert.equal(loop.edges[3]?.phase, "completed");
  assert.ok((loop.edges[3]?.points ?? []).some((point) => point[1] < -1));
  const traveling = stepwisePicture(model, 1, 1.5 / 11);
  assert.ok(traveling.signal);
  assert.ok((traveling.signal?.[0] ?? 0) > (traveling.nodes[0]?.x ?? 0));
  assert.ok((traveling.signal?.[0] ?? 0) < (traveling.nodes[1]?.x ?? 0));

  class StoryScene extends Scene {
    readonly flow = Stepwise(script);

    override construct(): void {
      this.add(this.flow);
      const timeline = new Timeline();
      timeline.animate(this.flow).at(1.9).duration(2.8).ease("inOutQuad").to({ reveal: 1 });
      timeline.animate(this.flow).at(5).duration(3).ease("linear").to({ signal: 1 });
      this.play(timeline);
    }
  }
  const scene = new StoryScene();
  const read = (time: number) => scene.sampleAt(time).get(scene.flow) as unknown as { reveal: number; signal: number };
  assert.equal(read(0).reveal, 0);
  assert.equal(read(0).signal, 0);
  assert.equal(read(3.3).reveal, 0.5);
  assert.equal(read(5).signal, 0);
  assert.equal(read(6.5).signal, 0.5);
  assert.equal(read(8).reveal, 1);
  assert.equal(read(8).signal, 1);
  assert.equal(scene.duration, 8);

  const user = ChatInput("Why is the sky blue?", [0, 0.85], {
    width: 5.8,
    height: 0.82,
    tipSide: "right",
    fill: "rgba(20, 28, 38, 0.94)",
    stroke: "rgba(143, 184, 230, 0.55)",
    textHeight: 0.22,
    textColor: "rgba(240, 247, 255, 0.96)",
    sendButton: { size: 0.34, radius: 0.15, color: "#58c4dd" },
  });
  const reply = ChatInput("The sky appears blue because sunlight is scattered...", [0, -0.45], {
    width: 8.1,
    height: 0.82,
    tipSide: "left",
    fill: "rgba(28, 36, 33, 0.94)",
    stroke: "rgba(128, 194, 158, 0.5)",
    textHeight: 0.2,
    textColor: "rgba(235, 250, 240, 0.95)",
  });
  assert.ok(user.sendButton);
  assert.equal(reply.sendButton, undefined);
  assert.equal(user.bubbleAt[1], 0.85);
  const outline = bubbleOutline(5.8, 0.82, 0.18, 8, "right", 0.42, 0.28, 0.72);
  const lowest = Math.min(...outline.map((point) => point[1]));
  assert.ok(Math.abs(lowest - (-0.82 / 2 - 0.28)) < 1e-6);
  assert.ok(user.textAt[0] < 0);
});

test("builds linear stepwise stories and validates cyclic scripts", () => {
  const linear = stepwiseModel((story) => {
    story.step("Draft");
    story.step("Review");
    story.step("Publish");
  });
  assert.deepEqual(linear.transitions, [{ from: 0, to: 1 }, { from: 1, to: 2 }]);
  assert.deepEqual(linear.sequence, [0, 1, 2]);

  assert.throws(() => stepwiseModel((story) => {
    const first = story.step("First");
    const second = story.step("Second");
    story.connect(first, second);
    story.connect(second, first);
  }), /explicit sequence/);
  assert.throws(() => stepwiseModel((story) => {
    story.step("Known");
    story.connect(0, 2);
  }), /unknown step 2/);
});

test("authors a reusable opening on the ordinary scene timeline", () => {
  class OpeningTestScene extends Scene {
    readonly composition = Opening("MURALI", "DETERMINISTIC VISUALS")
      .style({ particleCount: 24 })
      .timing({ introDelay: 0.2, endHold: 0.4 })
      .addTo(this);

    override construct(): void {
      const timeline = new Timeline();
      this.composition.animate(timeline, { at: 0.5 });
      this.play(timeline);
    }
  }

  const scene = new OpeningTestScene().prepare();
  const { visual, tagline, duration } = scene.composition;
  assert.equal(scene.duration, 0.5 + duration);
  const openingAt = (time: number) => scene.sampleAt(time).get(visual) as unknown as { openingTime: number };
  assert.equal(openingAt(0).openingTime, 0);
  assert.ok(Math.abs(openingAt(0.5 + duration / 2).openingTime - duration / 2) < 1e-9);
  assert.equal(scene.sampleAt(0).get(tagline)?.opacity, 0);
  assert.equal(scene.sampleAt(scene.duration).get(tagline)?.opacity, 1);
  assert.ok(openingDuration(4) > 5);
  assert.throws(() => Opening("Murali JS", "invalid").duration(), /ASCII capitals/);
  assert.throws(() => Opening("   ", "invalid").duration(), /at least one capital/);
  assert.throws(() => Opening("MURALI", "invalid").style({ particleCount: 0 }).duration(), /positive integer/);
});

test("builds continuous side walls for extruded opening glyph masks", () => {
  const rgba = new Uint8Array([
    0, 0, 0, 255,
  ]);
  const positions = extrudedMaskSidePositions(rgba, 1, 1, 2, 4, 0.75);
  assert.equal(positions.length, 4 * 6 * 3);
  const xs = [...positions].filter((_, index) => index % 3 === 0);
  const ys = [...positions].filter((_, index) => index % 3 === 1);
  const zs = [...positions].filter((_, index) => index % 3 === 2);
  assert.deepEqual([Math.min(...xs), Math.max(...xs)], [-1, 1]);
  assert.deepEqual([Math.min(...ys), Math.max(...ys)], [-2, 2]);
  assert.deepEqual([Math.min(...zs), Math.max(...zs)], [-0.75, 0]);

  const adjacent = new Uint8Array([
    0, 0, 0, 255,
    0, 0, 0, 255,
  ]);
  assert.equal(extrudedMaskSidePositions(adjacent, 2, 1, 2, 1, 1).length, 6 * 6 * 3);
  assert.throws(
    () => extrudedMaskSidePositions(new Uint8Array(0), 1, 1, 1, 1, 1),
    /does not contain enough RGBA pixels/,
  );
});

test("builds true vector-extruded Text3D geometry and validates its authoring API", () => {
  const geometry = createText3DGeometry("A", { height: 2, depth: 0.6, curveSegments: 8 });
  const positions = geometry.getAttribute("position");
  assert.ok(positions.count > 0);
  assert.equal(geometry.groups.some((group) => group.materialIndex === 0), true);
  assert.equal(geometry.groups.some((group) => group.materialIndex === 1), true);
  assert.ok(geometry.boundingBox);
  assert.ok(Math.abs((geometry.boundingBox?.max.z ?? 0) - 0.3) < 1e-6);
  assert.ok(Math.abs((geometry.boundingBox?.min.z ?? 0) + 0.3) < 1e-6);
  geometry.dispose();

  const title = Text3D("MURALI")
    .height(2)
    .depth(0.7)
    .bevel({ enabled: true, thickness: 0.04, size: 0.02, segments: 2 })
    .material({ faceColor: "white", sideColor: "#555", roughness: 0.5, metalness: 0.1 });
  assert.equal(title.kind, "three");
  assert.ok((title.worldSize?.width ?? 0) > 5);
  assert.ok((title.worldSize?.height ?? 0) > 1.9);
  assert.throws(() => Letter3D("AB"), /exactly one character/);
  assert.throws(() => Text3D(" "), /no drawable outlines/);
  assert.throws(() => title.depth(0), /positive finite number/);
  assert.throws(() => title.material({ roughness: 2 }), /between 0 and 1/);

  const ttf = readFileSync(resolve("node_modules/three/examples/fonts/ttf/kenpixel.ttf"));
  const customFontGeometry = createText3DGeometry("A", {
    font: parseText3DTTF(ttf),
    height: 1,
    depth: 0.25,
  });
  assert.ok(customFontGeometry.getAttribute("position").count > 0);
  customFontGeometry.dispose();
});

test("samples a reusable WaveMesh deterministically with seamless phase cycles", () => {
  const first = sampleWaveMesh(8, 4, 5, 3, 1.2, 0);
  const repeated = sampleWaveMesh(8, 4, 5, 3, 1.2, 1);
  const moving = sampleWaveMesh(8, 4, 5, 3, 1.2, 0.25);
  assert.equal(first.length, 15);
  first.forEach((point, index) => {
    assert.ok(Math.abs(point[0] - (repeated[index]?.[0] ?? Number.NaN)) < 1e-10);
    assert.ok(Math.abs(point[1] - (repeated[index]?.[1] ?? Number.NaN)) < 1e-10);
    assert.ok(Math.abs(point[2] - (repeated[index]?.[2] ?? Number.NaN)) < 1e-10);
  });
  assert.notDeepEqual(first.map((point) => point[1]), moving.map((point) => point[1]));
  assert.ok(Math.abs(defaultWaveMeshProfile(1.2, -0.7, 0) - defaultWaveMeshProfile(1.2, -0.7, 1)) < 1e-10);

  const mesh = WaveMesh()
    .size(12, 5)
    .amplitude(0.8)
    .samples(31, 15)
    .farFade(0.55)
    .glowVariation(0.3)
    .phase(0.5)
    .energy(0.7);
  assert.equal(mesh.initialState.phase, 0.5);
  assert.equal(mesh.initialState.energy, 0.7);
  assert.deepEqual(mesh.worldSize, { width: 12, height: 1.6 });
  assert.throws(() => mesh.samples(1, 10), /integer of at least 2/);
  assert.throws(() => mesh.sparkles({ ratio: 2 }), /between 0 and 1/);
  assert.throws(() => mesh.farFade(-0.1), /between 0 and 1/);
  assert.throws(() => mesh.glowVariation(1.1), /between 0 and 1/);
});

test("builds responsive YouTube subscribe CTAs and a deterministic action sequence", () => {
  const subscribe = YouTubeSubscribe("Kavriq", { handle: "@kavriq" });
  assert.equal(subscribe.depthModeValue, "overlay");
  assert.deepEqual(subscribe.worldSize, { width: 7.4, height: 1.62 });
  assert.equal(subscribe.worldFontSize, 1.62 * 0.17);
  subscribe.compact();
  assert.deepEqual(subscribe.worldSize, { width: 5.1, height: 3.6 });
  assert.equal(subscribe.worldFontSize, 3.6 * 0.08);
  subscribe.subscribed(0.4).bell(0.25);
  assert.equal(subscribe.initialState.subscribeProgress, 0.4);
  assert.equal(subscribe.initialState.bellProgress, 0.25);

  const sequence = YouTubeSubscribeSequence(subscribe);
  assert.equal(sequence.animations.length, 3);
  assert.equal(sequence.duration, 1.67);

  const custom = YouTubeSubscribe("Channel", { size: [5, 2] }).compact();
  assert.deepEqual(custom.worldSize, { width: 5, height: 2 });
  assert.equal(custom.worldFontSize, 2 * 0.08);
  assert.throws(() => YouTubeSubscribe("  "), /must not be empty/);
  assert.throws(() => subscribe.avatar("  "), /must not be empty/);
  assert.throws(() => subscribe.subscribed(2), /between 0 and 1/);
});

test("builds deterministic looping fireworks with configurable celebration styling", () => {
  const fireworks = Fireworks()
    .size([9, 16])
    .burstCount(5)
    .particlesPerBurst(20)
    .cycleDuration(4)
    .spread(1.8)
    .gravity(1.2)
    .trail(0.16)
    .glow(0.9)
    .seed(8)
    .palette(["#ffcc33", "#52d8ff"]);

  assert.equal(fireworks.depthModeValue, "overlay");
  assert.deepEqual(fireworks.worldSize, { width: 9, height: 16 });
  assert.deepEqual(fireworks.frameAt(1.4), fireworks.frameAt(1.4));
  assert.notDeepEqual(fireworks.frameAt(1.4), fireworks.frameAt(1.8));
  assert.ok(fireworks.frameAt(1.4).sparks.length > 0);
  assert.throws(() => fireworks.burstCount(0), /integer of at least 1/);
  assert.throws(() => fireworks.particlesPerBurst(2), /integer of at least 3/);
  assert.throws(() => fireworks.palette([]), /cannot be empty/);
  assert.throws(() => fireworks.glow(1.1), /between 0 and 1/);

  const landscape = Fireworks({ layout: "landscape" });
  const portrait = Fireworks({ layout: "portrait" });
  const square = Fireworks().square();
  assert.deepEqual(landscape.worldSize, { width: 16, height: 9 });
  assert.deepEqual(portrait.worldSize, { width: 9, height: 16 });
  assert.deepEqual(square.worldSize, { width: 9, height: 9 });
  assert.deepEqual(Fireworks().fit({ viewWidth: 7, viewHeight: 12 }).worldSize, {
    width: 7,
    height: 12,
  });

  const ignition = Fireworks().burstCount(1).cycleDuration(4).seed(3);
  const justBeforeBurst = ignition.frameAt(4 * 0.28 - 0.001);
  const justAfterBurst = ignition.frameAt(4 * 0.28 + 0.001);
  assert.equal(justBeforeBurst.rockets.length, 1);
  assert.equal(justAfterBurst.rockets.length, 1);
  assert.ok(justAfterBurst.rockets[0]!.opacity > 0.99);
  assert.ok(justAfterBurst.sparks.length > 0);
  assert.ok(justAfterBurst.flashes.length > 0);
  const afterIgnition = ignition.frameAt(1.34);
  assert.equal(afterIgnition.rockets.length, 0);
  assert.equal(afterIgnition.flashes.length, 0);
  assert.ok(afterIgnition.sparks.length > 0);
  assert.match(ignition.contentHTML(4 * 0.28 + 0.001), /radialGradient/);
  assert.doesNotMatch(ignition.contentHTML(4 * 0.28 + 0.001), /fill="none"/);
});

test("resolves scene, scoped, semantic, and explicit theme styles predictably", () => {
  const brand = createTheme(themes.dark, {
    name: "test-brand",
    colors: {
      background: "#10131f",
      textPrimary: "#fef6df",
      accent: "#21c7a8",
      accentAlt: "#745cff",
    },
    typography: {
      headingFamily: "Test Sans, sans-serif",
      headingWeight: 640,
    },
  });

  class ThemeScene extends Scene {
    readonly inheritedLabel = Label("Inherited");
    readonly inheritedCircle = Circle();
    readonly semanticCircle = Circle().fill(themeColor("positive"));
    readonly explicitLabel = Label("Explicit").color("#abcdef");
    readonly explicitCSSLabel = Label("CSS explicit").css({ color: "#123456" });
    readonly explicitCSSCircle = Circle().css({ background: "#654321" });
    readonly scopedLabel = Label("Scoped");
    readonly scopedCircle = Circle();

    constructor() {
      super({ theme: brand });
    }

    override construct(): void {
      this.add(
        this.inheritedLabel,
        this.inheritedCircle,
        this.semanticCircle,
        this.explicitLabel,
        this.explicitCSSLabel,
        this.explicitCSSCircle,
        Group([this.scopedLabel, this.scopedCircle]).theme({
          colors: { textPrimary: "#ffeeaa", accent: "#ff3366" },
        }),
      );
    }
  }

  const scene = new ThemeScene().prepare();
  assert.equal(scene.background, "#10131f");
  assert.equal(scene.inheritedLabel.initialState.color, "#fef6df");
  assert.equal(scene.inheritedLabel.initialStyle.fontFamily, "Test Sans, sans-serif");
  assert.equal(scene.inheritedLabel.initialStyle.fontWeight, "640");
  assert.equal(scene.inheritedCircle.initialState.background, "#21c7a8");
  assert.equal(scene.semanticCircle.initialState.background, brand.colors.positive);
  assert.equal(scene.explicitLabel.initialState.color, "#abcdef");
  assert.equal(scene.explicitCSSLabel.initialState.color, "#123456");
  assert.equal(scene.explicitCSSCircle.initialState.background, "#654321");
  assert.equal(scene.scopedLabel.initialState.color, "#ffeeaa");
  assert.equal(scene.scopedCircle.initialState.background, "#ff3366");
  assert.equal(scene.scopedLabel.resolvedTheme.colors.accentAlt, "#745cff");

  const variables = themeCSSVariables(brand);
  assert.equal(variables["--murali-color-text-primary"], "#fef6df");
  assert.equal(variables["--murali-typography-heading-family"], "Test Sans, sans-serif");
  assert.equal(palette.TEAL_C, "#5cd0b3");
  assert.throws(() => createTheme({ name: "" }), /cannot be empty/);
  assert.throws(() => createTheme({ effects: { mutedOpacity: 2 } }), /between 0 and 1/);
});

test("registers selectable font faces and positions persistent branding in the overlay", () => {
  const satoshi = fontFile("Satoshi", "../assets/fonts/private/Satoshi-Bold.ttf", {
    weight: 700,
  });

  class BrandedScene extends Scene {
    readonly brand = Label("KAVRIQ").height(0.4).font(satoshi, "Inter", "sans-serif");

    override construct(): void {
      this.registerFont(satoshi).registerFont(satoshi);
      this.addBranding(this.brand, { position: "bottomRight", margin: 0.3 });
      this.wait(3);
    }
  }

  const scene = new BrandedScene().prepare();
  assert.deepEqual(scene.fonts, [satoshi]);
  assert.equal(scene.brand.initialStyle.fontFamily, fontFamily(satoshi, "Inter", "sans-serif"));
  assert.equal(scene.brand.depthModeValue, "overlay");
  assert.equal(scene.brand.renderLayer, 1_000_000);
  assert.equal(scene.brand.initialState.x, scene.viewWidth / 2 - 0.3 - scene.brand.getLayoutSize().width / 2);
  assert.equal(scene.brand.initialState.y, -4);
  assert.equal(scene.sampleAt(0).get(scene.brand)?.opacity, 1);
  assert.equal(scene.sampleAt(3).get(scene.brand)?.opacity, 1);
  assert.throws(
    () => scene.registerFont(fontFile("Satoshi", "different.ttf", { weight: 700 })),
    /different source/,
  );
  assert.throws(() => fontFile("", "font.ttf"), /must not be empty/);
  assert.throws(() => fontFile("Bad", "font.ttf", { weight: 1001 }), /between 1 and 1000/);
});

test("lays out word clouds deterministically without overlapping labels", () => {
  const entries = [
    { text: "Murali JS", weight: 10 },
    { text: "timeline", weight: 8 },
    { text: "CSS", weight: 6 },
    { text: "camera", weight: 5 },
    { text: "render", weight: 4 },
    { text: "scene", weight: 3 },
  ];
  const build = () => WordCloud(entries)
    .size([8, 4])
    .fontRange([0.2, 0.8])
    .rotations([0, 0, 90])
    .seed(42);
  const first = build();
  const second = build();
  const snapshot = (cloud: ReturnType<typeof build>) => cloud.words.map((word) => ({
    x: word.initialState.x,
    y: word.initialState.y,
    rotation: word.initialState.rotationZ,
    color: word.initialState.color,
    size: word.getLayoutSize(),
  }));
  assert.deepEqual(snapshot(first), snapshot(second));
  const layout = snapshot(first);
  for (let left = 0; left < layout.length; left += 1) {
    for (let right = left + 1; right < layout.length; right += 1) {
      const a = layout[left]!;
      const b = layout[right]!;
      const separated = Math.abs(a.x - b.x) >= (a.size.width + b.size.width) / 2
        || Math.abs(a.y - b.y) >= (a.size.height + b.size.height) / 2;
      assert.equal(separated, true);
    }
  }
  assert.throws(() => WordCloud([]), /at least one word/);
  assert.throws(() => WordCloud([{ text: "bad", weight: 0 }]), /must be positive/);
});

test("projects one vector onto another and labels the angle", () => {
  const a: readonly [number, number] = [2.5, 1.2];
  const b: readonly [number, number] = [2.1, -0.25];
  const projected = projectOnto(a, b);
  assert.ok(Math.abs(projected[0] - 2.324) < 0.01);
  assert.ok(cosineSimilarity(a, [-b[0], -b[1]]) < 0);
  const arc = AngleArc(b, a).radius(0.72).autoLabel("degrees").build();
  const label = arc.children.find((child) => child.text?.endsWith(" deg"));
  assert.equal(label?.text, "32 deg");
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
  assert.match(scene.square.contentHTML() ?? "", /data-murali-shape/);
  assert.match(scene.square.contentHTML() ?? "", /data-murali-reveal-fill/);
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
