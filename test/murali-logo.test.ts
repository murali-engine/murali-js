import assert from "node:assert/strict";
import { test } from "node:test";
import { Scene } from "../src/core/Scene.ts";
import {
  MURALI_LOGO_COLORS,
  MURALI_LOGO_BACKGROUND,
  MURALI_LOGO_PALETTES,
  MuraliLogoMark,
  MuraliLogoSequence,
  MuraliLogoSwell,
} from "../src/tattvas/composite/murali-logo.ts";

test("builds the canonical Murali logo from three touching geometric ovals", () => {
  const mark = MuraliLogoMark();
  assert.equal(mark.ovals.length, 3);
  assert.deepEqual(MURALI_LOGO_COLORS, ["#2563eb", "#7c3aed", "#ff6b5f"]);
  assert.match(MURALI_LOGO_BACKGROUND, /#0b233f.+#0e6c70/);
  assert.deepEqual(MURALI_LOGO_PALETTES.candyPop, ["#54b8f3", "#fae561", "#e065b2"]);
  assert.deepEqual(mark.ovals.map((oval) => oval.initialState.background), MURALI_LOGO_COLORS);
  assert.ok(mark.ovals[0].initialState.x < mark.ovals[1].initialState.x);
  assert.ok(mark.ovals[1].initialState.x < mark.ovals[2].initialState.x);
  assert.equal(
    mark.ovals[1].initialState.x - mark.ovals[0].initialState.x,
    mark.ovals[0].getLayoutSize().width,
  );
  assert.equal(
    mark.ovals[2].initialState.x - mark.ovals[1].initialState.x,
    mark.ovals[1].getLayoutSize().width,
  );
  for (const oval of mark.ovals) {
    const size = oval.getLayoutSize();
    assert.ok(Math.abs(size.width - 0.96) < 1e-9);
    assert.ok(Math.abs(size.height - 1.64) < 1e-9);
    assert.match(oval.contentHTML() ?? "", /data-murali-shape/);
    assert.match(oval.contentHTML() ?? "", /stroke="none"/);
  }
});

test("validates Murali logo geometry", () => {
  assert.throws(() => MuraliLogoMark({ width: 0 }), /positive finite/);
  assert.throws(() => MuraliLogoMark({ width: Number.NaN }), /positive finite/);
});

test("animates the oval logo from one oval through a squeezed three-oval mark and back", () => {
  class LogoScene extends Scene {
    readonly mark = MuraliLogoMark();

    override construct(): void {
      this.add(this.mark);
      this.play(MuraliLogoSequence(this.mark));
    }
  }

  const scene = new LogoScene().prepare();
  const [left, middle, right] = scene.mark.ovals;
  const span = left.worldSize?.width ?? 0;
  const start = scene.sampleAt(0);
  assert.ok(Math.abs(scene.duration - 6.4) < 1e-10);
  assert.equal(start.get(left)?.opacity, 1);
  assert.equal(start.get(right)?.opacity, 1);
  assert.equal(start.get(left)?.x, 0);
  assert.equal(start.get(right)?.x, 0);
  assert.ok(middle.renderLayer > left.renderLayer);
  assert.ok(middle.renderLayer > right.renderLayer);
  assert.equal(start.get(middle)?.scaleX, 1);

  const touching = scene.sampleAt(6.4 * 0.405);
  assert.equal(touching.get(left)?.scaleX, 1);
  assert.equal(touching.get(middle)?.scaleX, 1);
  assert.equal(touching.get(right)?.scaleX, 1);
  assert.ok(Math.abs((touching.get(left)?.x ?? 0) + span) < 1e-10);
  assert.ok(Math.abs((touching.get(right)?.x ?? 0) - span) < 1e-10);

  const squeezed = scene.sampleAt(6.4 * 0.47);
  assert.equal(squeezed.get(left)?.opacity, 1);
  assert.ok((squeezed.get(left)?.scaleX ?? 1) < 1);
  assert.ok((squeezed.get(middle)?.scaleX ?? 1) < 1);
  assert.ok((squeezed.get(right)?.scaleX ?? 1) < 1);

  const separated = scene.sampleAt(6.4 * 0.59);
  assert.ok(Math.abs(separated.get(left)?.x ?? 0) < 1.5);
  assert.ok(Math.abs(separated.get(right)?.x ?? 0) < 1.5);

  const settled = scene.sampleAt(6.4 * 0.73);
  assert.equal(settled.get(left)?.x, -span);
  assert.equal(settled.get(middle)?.x, 0);
  assert.equal(settled.get(right)?.x, span);
  assert.equal(settled.get(left)?.scaleX, 1);

  const end = scene.sampleAt(scene.duration);
  assert.equal(end.get(left)?.x, 0);
  assert.equal(end.get(left)?.opacity, 1);
  assert.equal(end.get(middle)?.scaleX, 1);
  assert.equal(end.get(right)?.x, 0);
  assert.equal(end.get(right)?.opacity, 1);
  assert.throws(() => MuraliLogoSequence(MuraliLogoMark(), { duration: 0 }), /positive finite/);
});

test("springs the settled logo up from the baseline and back past rest", () => {
  class SwellScene extends Scene {
    readonly mark = MuraliLogoMark({ width: 6.6 });

    override construct(): void {
      this.add(this.mark);
      const swell = MuraliLogoSwell(this.mark);
      this.updater(swell.update);
      this.wait(swell.duration);
    }
  }

  const scene = new SwellScene().prepare();
  const [left, middle, right] = scene.mark.ovals;
  const ovals = [left, middle, right];
  const halfHeight = (left.worldSize?.height ?? 0) / 2;
  const halfWidths = ovals.map((oval) => (oval.worldSize?.width ?? 0) / 2);
  assert.equal(scene.duration, 6);

  const start = scene.sampleAt(0);
  const end = scene.sampleAt(scene.duration);
  for (const oval of ovals) {
    assert.ok(Math.abs((start.get(oval)?.scaleY ?? 0) - (end.get(oval)?.scaleY ?? 0)) < 1e-6);
    assert.ok(Math.abs((start.get(oval)?.x ?? 0) - (end.get(oval)?.x ?? 0)) < 1e-6);
    assert.equal(start.get(oval)?.rotationZ, 0);
  }
  assert.ok(Math.abs((start.get(scene.mark)?.rotationZ ?? 0) - (end.get(scene.mark)?.rotationZ ?? 0)) < 1e-5);

  let blueMax = 0;
  let blueMaxAt = 0;
  let violetMax = 0;
  let violetMaxAt = 0;
  let coralMax = 0;
  let coralMaxAt = 0;
  let blueMinAfter = Infinity;
  let recovered = false;
  let leanMax = 0;
  let quietMin = Infinity;
  let quietMax = -Infinity;
  let maxStep = 0;
  let previousScales: readonly number[] | undefined;

  for (let step = 0; step <= 360; step += 1) {
    const time = scene.duration * step / 360;
    const sampled = scene.sampleAt(time);
    const scales = ovals.map((oval) => sampled.get(oval)?.scaleY ?? 0);
    if (previousScales) {
      const stepSize = Math.max(...scales.map((scale, index) => Math.abs(scale - (previousScales?.[index] ?? scale))));
      if (stepSize > maxStep) maxStep = stepSize;
    }
    previousScales = scales;
    const widths = ovals.map((oval) => sampled.get(oval)?.scaleX ?? 0);
    const centers = ovals.map((oval) => sampled.get(oval)?.x ?? 0);

    ovals.forEach((oval, index) => {
      const state = sampled.get(oval);
      const scaleY = scales[index] ?? 0;
      const bottom = (state?.y ?? 0) - scaleY * halfHeight;
      assert.ok(Math.abs(bottom + halfHeight) < 1e-9, `baseline drifted at ${time}`);
      assert.ok(Math.abs((widths[index] ?? 0) * Math.sqrt(scaleY) - 1) < 1e-9);
      assert.equal(state?.rotationZ, 0);
      assert.ok(scaleY <= 1.35 && scaleY >= 0.94, `height ${scaleY} at ${time}`);
    });

    const leftEdge = centers[0] - halfWidths[0] * widths[0];
    const rightEdge = centers[2] + halfWidths[2] * widths[2];
    assert.ok(Math.abs(leftEdge + rightEdge) < 1e-9);
    assert.ok(Math.abs((centers[1] - centers[0]) - (halfWidths[0] * widths[0] + halfWidths[1] * widths[1])) < 1e-9);
    assert.ok(Math.abs((centers[2] - centers[1]) - (halfWidths[1] * widths[1] + halfWidths[2] * widths[2])) < 1e-9);

    const lean = sampled.get(scene.mark)?.rotationZ ?? 0;
    assert.ok(lean < 2 && lean > -0.15, `lean ${lean} at ${time}`);
    if (lean > leanMax) leanMax = lean;
    if (scales[0] > blueMax) {
      blueMax = scales[0];
      blueMaxAt = time;
    }
    if (scales[1] > violetMax) {
      violetMax = scales[1];
      violetMaxAt = time;
    }
    if (scales[2] > coralMax) {
      coralMax = scales[2];
      coralMaxAt = time;
    }
    if (time > blueMaxAt && time < 4 && scales[0] < blueMinAfter) blueMinAfter = scales[0];
    if (time > 3.2 && scales[0] > 0.99) recovered = true;
    if (time <= 1) {
      quietMin = Math.min(quietMin, ...scales);
      quietMax = Math.max(quietMax, ...scales);
    }
  }

  assert.ok(blueMax > 1.15 && blueMax < 1.35, `blue peak ${blueMax}`);
  assert.ok(violetMax > 1.08 && violetMax < blueMax - 0.05, `violet peak ${violetMax}`);
  assert.ok(coralMax > 1.12 && coralMax < 1.3, `coral peak ${coralMax}`);
  assert.ok(coralMaxAt < blueMaxAt - 0.12, `coral ${coralMaxAt} should flick before blue ${blueMaxAt}`);
  assert.ok(violetMaxAt > blueMaxAt, `violet ${violetMaxAt} should nudge after blue ${blueMaxAt}`);
  const duringNudge = scene.sampleAt(violetMaxAt);
  assert.ok((duringNudge.get(left)?.scaleY ?? 0) > 1.15);
  assert.ok((duringNudge.get(right)?.scaleY ?? 0) < 1.08);
  assert.ok(blueMinAfter < 0.997, `blue should ease through rest, lowest ${blueMinAfter}`);
  assert.ok(maxStep < 0.02, `a frame should not jump, largest step ${maxStep}`);
  assert.equal(recovered, true);
  assert.ok(leanMax > 1 && leanMax < 2, `shared lean ${leanMax}`);
  assert.ok(quietMax - quietMin > 0.02 && quietMax < 1.04 && quietMin > 0.96);

  assert.throws(() => MuraliLogoSwell(MuraliLogoMark(), { duration: 0 }), /positive finite/);
});

test("retimes the logo swell without changing its shape", () => {
  class TimedSwell extends Scene {
    readonly mark = MuraliLogoMark();

    constructor(private readonly seconds: number) {
      super();
    }

    override construct(): void {
      this.add(this.mark);
      const swell = MuraliLogoSwell(this.mark, { duration: this.seconds });
      this.updater(swell.update);
      this.wait(swell.duration);
    }
  }

  const full = new TimedSwell(6).prepare();
  const half = new TimedSwell(3).prepare();
  const fullState = full.sampleAt(3);
  const halfState = half.sampleAt(1.5);
  full.mark.ovals.forEach((oval, index) => {
    const shorter = half.mark.ovals[index];
    assert.ok(shorter);
    assert.ok(Math.abs((fullState.get(oval)?.scaleY ?? 0) - (halfState.get(shorter)?.scaleY ?? 0)) < 1e-9);
  });
  assert.ok(
    Math.abs((fullState.get(full.mark)?.rotationZ ?? 0) - (halfState.get(half.mark)?.rotationZ ?? 0)) < 1e-9,
  );
});
