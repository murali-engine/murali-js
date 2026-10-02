import { render } from "murali-js";
import { Scene, Timeline } from "murali-js/core";
import { palette } from "murali-js/style";
import { Label } from "murali-js/text";
import { Axes3D, ParametricSurface } from "murali-js/maths";
const { BLUE_B, GOLD_C, GRAY_B, ORANGE_B, TEAL_C, WHITE } = palette;
import type { Vec3 } from "murali-js/core";

/** Port of Murali `examples/wireframe_surfaces.rs`. */
class WireframeSurfaces extends Scene {
  override construct(): void {
    this.camera.perspective({ fov: 42, near: 0.1, far: 100 }).position([-4.6, 2.4, 6.4]).lookAt([0, 0, 0]);
    const title = this.add(Label("Wireframe Surfaces").height(0.38).color(WHITE).typewriter().depthMode("overlay"), { at: [0, 3, 0] });
    const subtitle = this.add(Label(
      "Wireframes are best when the grid itself teaches the curvature, without a filled surface competing for attention.",
    ).height(0.18).color(GRAY_B).typewriter().depthMode("overlay"), { at: [0, 2.45, 0] });
    const axes = this.add(Axes3D([-2.6, 2.6], [-1.4, 1.4], [-2.6, 2.6]).step(1).axisThickness(0.03).tickSize(0.12));
    const surface = this.add(ParametricSurface([-2, 2], [-2, 2], saddle)
      .samples(30, 30)
      .renderMode("wireframe")
      .writeProgress(0)
      .color(saddleColor));
    const xLabel = this.add(Label("x").height(0.2).color(ORANGE_B).typewriter(), { at: [3, 0, 0] });
    const yLabel = this.add(Label("y").height(0.2).color(BLUE_B).typewriter(), { at: [0, 1.8, 0] });
    const zLabel = this.add(Label("z").height(0.2).color(GOLD_C).typewriter(), { at: [0, 0, 3] });
    const footer = this.add(Label(
      "This mode is for reading structure: the crossings and bends of the grid are the explanation.",
    ).height(0.17).color(GRAY_B).typewriter().depthMode("overlay"), { at: [0, -3, 0] });

    const timeline = new Timeline();
    timeline.animate(title).at(0).duration(1).ease("linear").typewrite();
    timeline.animate(subtitle).at(0.35).duration(1.6).ease("linear").typewrite();
    timeline.animate(axes).at(1.45).duration(0.9).ease("linear").appear();
    timeline.animate(xLabel).at(1.85).duration(0.45).ease("linear").typewrite();
    timeline.animate(yLabel).at(2).duration(0.45).ease("linear").typewrite();
    timeline.animate(zLabel).at(2.15).duration(0.45).ease("linear").typewrite();
    timeline.animate(surface).at(2.35).duration(2.5).ease("inOutCubic").to({ revealProgress: 1 });
    timeline.animateCamera(this.camera).at(0).duration(4.3).ease("inOutCubic").frameTo([-2.2, 2, 7.4], [0, 0, 0]);
    timeline.animateCamera(this.camera).at(4.3).duration(4).ease("inOutCubic").frameTo([3, 1.55, 5.8], [0, 0, 0]);
    timeline.animate(footer).at(6.25).duration(1.5).ease("linear").typewrite();
    this.play(timeline);
  }
}

function saddle(u: number, v: number): Vec3 {
  return [u, 0.26 * (u * u - v * v), v];
}

function saddleColor(point: Vec3): readonly [number, number, number, number] {
  const t = Math.max(0, Math.min(1, (point[1] + 1) / 2));
  return mix(mix(hex(BLUE_B), hex(TEAL_C), 0.45 + 0.3 * t), hex(GOLD_C), t * 0.8);
}

function hex(value: string): readonly [number, number, number, number] {
  return [
    Number.parseInt(value.slice(1, 3), 16) / 255,
    Number.parseInt(value.slice(3, 5), 16) / 255,
    Number.parseInt(value.slice(5, 7), 16) / 255,
    1,
  ];
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
    1,
  ];
}

render(import.meta.url, WireframeSurfaces);
