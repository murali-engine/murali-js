import { render } from "murali-js";
import { Scene, Timeline } from "murali-js/core";
import { ProjectionDiagram2D } from "murali-js/maths";
import { palette } from "murali-js/style";
import { Label } from "murali-js/text";

const { GRAY_B, WHITE } = palette;

class DotProductProjection extends Scene {
  constructor() { super({ viewWidth: 10.8 }); }

  override construct(): void {
    const a: readonly [number, number] = [2.55, 1.05];
    const diagram = this.add(ProjectionDiagram2D(a, [2.35, 0.35]).scale(0.84), { at: [0, -0.08, 0] });
    const title = this.add(Label("The Dot Product Measures Alignment").height(0.38).color(WHITE).typewriter(), { at: [0, 2.76, 0] });
    const subtitle = this.add(Label(
      "Watch the shadow shrink, vanish at 90°, then reverse direction.",
    ).height(0.18).color(GRAY_B).typewriter(), { at: [0, 2.34, 0] });

    const timeline = new Timeline();
    timeline.animate(title).at(0).duration(0.85).ease("linear").typewrite();
    timeline.animate(subtitle).at(0.3).duration(1.2).ease("linear").typewrite();
    timeline.animate(diagram).at(1.25).duration(2.4).ease("inOutCubic").to(
      diagram.vectorsState(a, [-1.05, 2.55]),
    );
    timeline.animate(diagram).at(4).duration(2.6).ease("inOutCubic").to(
      diagram.vectorsState(a, [-2.45, -0.65]),
    );
    timeline.animate(diagram).at(6.95).duration(2.1).ease("inOutCubic").to(
      diagram.vectorsState(a, [1.4, 1.8]),
    );
    this.play(timeline);
    if (this.duration < 9.4) this.wait(9.4 - this.duration);
  }
}

render(import.meta.url, DotProductProjection, { fps: 60 });
