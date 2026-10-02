import assert from "node:assert/strict";
import { test } from "node:test";
import { Scene } from "../src/core/Scene.ts";
import {
  MURALI_LOGO_COLORS,
  MURALI_LOGO_PALETTES,
  MuraliLogoMark,
  MuraliLogoSequence,
} from "../src/tattvas/composite/murali-logo.ts";

test("builds the canonical Murali logo from three touching geometric ovals", () => {
  const mark = MuraliLogoMark();
  assert.equal(mark.ovals.length, 3);
  assert.deepEqual(MURALI_LOGO_COLORS, ["#2563eb", "#7c3aed", "#ff6b5f"]);
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
  assert.ok(Math.abs((touching.get(left)?.x ?? 0) + 1.04) < 1e-10);
  assert.ok(Math.abs((touching.get(right)?.x ?? 0) - 1.04) < 1e-10);

  const squeezed = scene.sampleAt(6.4 * 0.47);
  assert.equal(squeezed.get(left)?.opacity, 1);
  assert.ok((squeezed.get(left)?.scaleX ?? 1) < 1);
  assert.ok((squeezed.get(middle)?.scaleX ?? 1) < 1);
  assert.ok((squeezed.get(right)?.scaleX ?? 1) < 1);

  const separated = scene.sampleAt(6.4 * 0.59);
  assert.ok(Math.abs(separated.get(left)?.x ?? 0) < 1.5);
  assert.ok(Math.abs(separated.get(right)?.x ?? 0) < 1.5);

  const settled = scene.sampleAt(6.4 * 0.73);
  assert.equal(settled.get(left)?.x, -1.04);
  assert.equal(settled.get(middle)?.x, 0);
  assert.equal(settled.get(right)?.x, 1.04);
  assert.equal(settled.get(left)?.scaleX, 1);

  const end = scene.sampleAt(scene.duration);
  assert.equal(end.get(left)?.x, 0);
  assert.equal(end.get(left)?.opacity, 1);
  assert.equal(end.get(middle)?.scaleX, 1);
  assert.equal(end.get(right)?.x, 0);
  assert.equal(end.get(right)?.opacity, 1);
  assert.throws(() => MuraliLogoSequence(MuraliLogoMark(), { duration: 0 }), /positive finite/);
});
