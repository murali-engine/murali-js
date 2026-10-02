import { render } from "murali-js";
import { Scene, Timeline, easeInOutQuad } from "murali-js/core";
import { palette } from "murali-js/style";
import { Circle } from "murali-js/primitives";
import { Label } from "murali-js/text";
import { StreamLines, circleSeeds } from "murali-js/maths";
const { GOLD_C, GRAY_A, GRAY_B, TEAL_C, WHITE } = palette;
import type { Vec2 } from "murali-js/core";

const growthStart = 2;
const growthDuration = 2.8;

/** Port of Murali `examples/streamlines.rs`. Step count and opacity are functions of scene time. */
class Streamlines extends Scene {
  constructor() {
    super({ viewWidth: 16 });
  }

  override construct(): void {
    const title = this.add(Label("Streamlines").height(0.38).color(WHITE).typewriter(), { at: [0, 3.5, 0] });
    const subtitle = this.add(Label(
      "Streamlines answer a different question than arrows: not the field at a point, but the path a particle would follow.",
    ).height(0.18).color(GRAY_B).typewriter(), { at: [0, 3, 0] });
    const heading = this.add(Label("Seeded flow paths").height(0.19).color(GRAY_B).typewriter(), { at: [0, 2.5, 0] });
    const ring = this.add(Circle()
      .radius(1.15)
      .fill("rgba(0, 0, 0, 0)")
      .stroke({ color: "rgba(107, 214, 250, 0.18)", width: 0.03 }), { at: [-1.8, -0.15, 0] });
    const seed = this.add(Circle().radius(0.07).fill(TEAL_C).stroke({ color: WHITE, width: 0.02 }), { at: [-0.65, -0.15, 0] });
    const streams = this.add(StreamLines(circleSeeds([-1.8, -0.15], 1.15, 14), vortexWithDrift)
      .color(GOLD_C)
      .thickness(0.035)
      .stepSize(0.07)
      .maxSteps((time) => Math.round(1 + growth(time) * 169))
      .alpha(growth)
      .bounds([-4.8, -2.2], [4.8, 2]));
    const caption = this.add(Label(
      "Start points matter: change the seeds and you change the story the flow tells.",
    ).height(0.16).color(GRAY_A).typewriter(), { at: [0, -3, 0] });

    const timeline = new Timeline();
    timeline.animate(title).at(0).duration(1).ease("linear").typewrite();
    timeline.animate(subtitle).at(0.35).duration(1.6).ease("linear").typewrite();
    timeline.animate(heading).at(1.15).duration(0.8).ease("linear").typewrite();
    timeline.animate(ring).at(1.55).duration(0.85).ease("outCubic").draw();
    timeline.animate(seed).at(1.95).duration(0.45).ease("outCubic").appear();
    timeline.animate(streams).at(2).duration(0.2).ease("linear").appear();
    timeline.animate(caption).at(2.7).duration(1.2).ease("linear").typewrite();
    timeline.animateCamera(this.camera).at(2.4).duration(2.8).ease("inOutQuad").zoomTo(1.12);
    this.play(timeline);
  }
}

function growth(time: number): number {
  if (time <= growthStart) return 0;
  return easeInOutQuad(Math.min(1, (time - growthStart) / growthDuration));
}

function vortexWithDrift(point: Vec2): Vec2 {
  return [
    -point[1] * 0.65 - point[0] * 0.18 + 0.42,
    point[0] * 0.65 - point[1] * 0.18,
  ];
}

render(import.meta.url, Streamlines);
