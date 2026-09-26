import {
  Axes3D,
  BLUE_B,
  GOLD_A,
  GOLD_C,
  GRAY_B,
  Label,
  ORANGE_B,
  ParametricCurve,
  Scene,
  Timeline,
  WHITE,
  render,
} from "murali-js";
import type { Vec3 } from "murali-js";

/** Port of Murali `examples/curves_3d.rs`. The curve is a Three.js line revealed by scene time. */
class Curves3D extends Scene {
  override construct(): void {
    this.camera.perspective({ fov: 45, near: 0.1, far: 100 }).position([0, 0.8, 12.8]).lookAt([0, 0.1, 0]);
    const title = this.add(Label("3D Curves").height(0.38).color(WHITE).typewriter().depthMode("overlay"));
    this.toEdge(title, "up", { margin: 0.8 });
    const subtitle = this.add(Label(
      "A single parametric space curve with 3D axes and a few camera frames to reveal its shape.",
    ).height(0.18).color(GRAY_B).typewriter().depthMode("overlay"), { at: [0, 2.95, 0] });
    const axes = this.add(Axes3D([-2.8, 2.8], [-2.2, 2.2], [-2, 2]).step(1).axisThickness(0.03).tickSize(0.14));
    const curve = this.add(ParametricCurve([0, 6.4], spaceCurve).sampleCount(240).color(GOLD_C).pulseColor(GOLD_A).pulseRadius(0.09));
    const xLabel = this.add(Label("x").height(0.2).color(ORANGE_B).typewriter(), { at: [3.25, 0, 0] });
    const yLabel = this.add(Label("y").height(0.2).color(BLUE_B).typewriter(), { at: [0, 2.55, 0] });
    const zLabel = this.add(Label("z").height(0.2).color(GOLD_C).typewriter(), { at: [0, 0, 2.55] });
    const footer = this.add(Label(
      "Use camera framing to help the eye understand depth before introducing surfaces.",
    ).height(0.17).color(GRAY_B).typewriter().depthMode("overlay"), { at: [0, -3.05, 0] });

    const timeline = new Timeline();
    timeline.animate(title).at(0).duration(1).ease("linear").typewrite();
    timeline.animate(subtitle).at(0.35).duration(1.6).ease("linear").typewrite();
    timeline.animate(axes).at(1.5).duration(1).ease("linear").appear();
    timeline.animate(xLabel).at(1.95).duration(0.5).ease("linear").typewrite();
    timeline.animate(yLabel).at(2.1).duration(0.5).ease("linear").typewrite();
    timeline.animate(zLabel).at(2.25).duration(0.5).ease("linear").typewrite();
    timeline.animate(curve).at(2.5).duration(3.2).ease("inOutCubic").to({ revealProgress: 1 });
    timeline.animateCamera(this.camera).at(0).duration(2.4).ease("inOutQuad").frameTo([-1.8, 2.6, 11.8], [0, 0.1, 0]);
    timeline.animateCamera(this.camera).at(2.4).duration(2.6).ease("inOutQuad").frameTo([2.2, 1.3, 10.8], [0.1, 0.1, 0.2]);
    timeline.animateCamera(this.camera).at(5).duration(2).ease("outQuad").frameTo([0.4, 3.8, 11.6], [0, 0.2, 0.2]);
    timeline.animate(footer).at(6.2).duration(1.5).ease("linear").typewrite();
    this.play(timeline);
  }
}

function spaceCurve(t: number): Vec3 {
  return [
    1.7 * Math.cos(0.9 * t),
    0.85 * Math.sin(1.4 * t),
    -1.5 + 0.48 * t + 0.22 * Math.cos(1.1 * t),
  ];
}

render(import.meta.url, Curves3D);
