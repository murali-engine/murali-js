import {
  Axes3D,
  BLUE_B,
  GOLD_C,
  GRAY_B,
  Label,
  ORANGE_B,
  ParametricSurface,
  Scene,
  Timeline,
  WHITE,
  render,
} from "venu";
import type { Vec3 } from "venu";

/** Port of Murali `examples/surfaces_3d.rs`. The sheet writes in by parameter row. */
class Surfaces3D extends Scene {
  override construct(): void {
    this.camera.perspective({ fov: 42, near: 0.1, far: 100 }).position([-5.6, 2.25, 8.2]).lookAt([0, 0.24, 0]);
    const title = this.add(Label("3D Surfaces").height(0.38).color(WHITE).typewriter().depthMode("overlay"), { at: [0, 3, 0] });
    const subtitle = this.add(Label(
      "A more expressive surface reads best when color and camera movement both reinforce where it rises away from the xz plane.",
    ).height(0.18).color(GRAY_B).typewriter().depthMode("overlay"), { at: [0, 2.45, 0] });
    const axes = this.add(Axes3D([-2.4, 2.4], [-0.6, 1.4], [-2.2, 2.2]).step(1).axisThickness(0.03).tickSize(0.13));
    const surface = this.add(ParametricSurface([-2, 2], [-1.8, 1.8], hillSurface)
      .samples(42, 42)
      .writeProgress(0)
      .color(hillColor));
    const xLabel = this.add(Label("x").height(0.2).color(ORANGE_B).typewriter(), { at: [2.85, 0, 0] });
    const yLabel = this.add(Label("y").height(0.2).color(BLUE_B).typewriter(), { at: [0, 1.75, 0] });
    const zLabel = this.add(Label("z").height(0.2).color(GOLD_C).typewriter(), { at: [0, 0, 2.55] });
    const footer = this.add(Label(
      "Warm color now marks the parts farthest from the xz plane, while the lighter surface lets the axes stay visible through the form.",
    ).height(0.17).color(GRAY_B).typewriter().depthMode("overlay"), { at: [0, -3, 0] });

    const timeline = new Timeline();
    timeline.animate(title).at(0).duration(1).ease("linear").typewrite();
    timeline.animate(subtitle).at(0.35).duration(1.6).ease("linear").typewrite();
    timeline.animate(axes).at(1.45).duration(0.9).ease("linear").appear();
    timeline.animate(xLabel).at(1.85).duration(0.45).ease("linear").typewrite();
    timeline.animate(yLabel).at(2).duration(0.45).ease("linear").typewrite();
    timeline.animate(zLabel).at(2.15).duration(0.45).ease("linear").typewrite();
    timeline.animate(surface).at(2.35).duration(2.9).ease("inOutCubic").to({ revealProgress: 1 });
    timeline.animateCamera(this.camera).at(0).duration(4.8).ease("inOutCubic").frameTo([-2.6, 2, 7.2], [0, 0.26, 0]);
    timeline.animateCamera(this.camera).at(4.8).duration(4.6).ease("inOutCubic").frameTo([4.4, 1.45, 5.8], [0, 0.32, 0]);
    timeline.animateCamera(this.camera).at(9.4).duration(4.2).ease("inOutCubic").frameTo([0, 4.9, 4.8], [0, 0.18, 0]);
    timeline.animate(footer).at(10.7).duration(1.8).ease("linear").typewrite();
    this.play(timeline);
  }
}

function hillSurface(u: number, v: number): Vec3 {
  const ridge = 0.95 * Math.exp(-(0.38 * (u - 0.55) ** 2 + 0.82 * (v + 0.15) ** 2));
  const shoulder = 0.48 * Math.exp(-(1.1 * (u + 0.95) ** 2 + 0.46 * (v - 0.45) ** 2));
  const ripple = 0.14 * Math.sin(1.7 * u) * Math.cos(1.25 * v);
  const basin = 0.1 * (0.55 * u * u + 0.9 * v * v);
  return [u, ridge + shoulder + ripple - basin - 0.28, v];
}

function hillColor(point: Vec3): readonly [number, number, number, number] {
  const t = Math.max(0, Math.min(1, (point[1] + 0.42) / 1.42));
  const low: readonly [number, number, number, number] = [0.1, 0.48, 0.72, 1];
  const mid: readonly [number, number, number, number] = [0.24, 0.78, 0.64, 1];
  const high: readonly [number, number, number, number] = [0.96, 0.76, 0.22, 1];
  const peak: readonly [number, number, number, number] = [0.95, 0.36, 0.2, 1];
  const color = t < 0.55 ? mix(low, mid, t / 0.55) : t < 0.82 ? mix(mid, high, (t - 0.55) / 0.27) : mix(high, peak, (t - 0.82) / 0.18);
  return [color[0], color[1], color[2], 0.46];
}

function mix(
  from: readonly [number, number, number, number],
  to: readonly [number, number, number, number],
  t: number,
): readonly [number, number, number, number] {
  return [
    from[0] + (to[0] - from[0]) * t,
    from[1] + (to[1] - from[1]) * t,
    from[2] + (to[2] - from[2]) * t,
    from[3] + (to[3] - from[3]) * t,
  ];
}

render(import.meta.url, Surfaces3D);
