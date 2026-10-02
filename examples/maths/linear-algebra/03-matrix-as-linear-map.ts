import { render } from "murali-js";
import { Scene, Timeline } from "murali-js/core";
import { LinearMap2D } from "murali-js/maths";
import { palette } from "murali-js/style";
import { Label } from "murali-js/text";

const { GRAY_B, TEAL_C, WHITE } = palette;

class MatrixAsLinearMap extends Scene {
  constructor() { super({ viewWidth: 11.5 }); }

  override construct(): void {
    const map = this.add(
      LinearMap2D().vector([1.45, 1.05], "x").columnDecomposition().scale(0.83),
      { at: [0, -0.06, 0] },
    );
    const title = this.add(Label("A Matrix Moves All Of Space").height(0.39).color(WHITE).typewriter(), { at: [0, 2.78, 0] });
    const subtitle = this.add(Label(
      "Its columns are where the basis vectors land; every other vector follows the same rule.",
    ).height(0.17).color(GRAY_B).typewriter(), { at: [0, 2.36, 0] });
    const insight = this.add(Label(
      "Ax is a weighted sum of A's transformed basis vectors.",
    ).height(0.19).color(TEAL_C).opacity(0), { at: [0, -2.76, 0] });

    const timeline = new Timeline();
    timeline.animate(title).at(0).duration(0.85).ease("linear").typewrite();
    timeline.animate(subtitle).at(0.25).duration(1.35).ease("linear").typewrite();
    timeline.animate(map).at(1.2).duration(3.2).ease("inOutCubic").to(
      map.matrixState([1.45, 0.38], [-0.52, 1.18]),
    );
    timeline.animate(insight).at(3.4).duration(0.7).appear();
    timeline.animate(map).at(5).duration(2.4).ease("inOutCubic").to(
      map.matrixState([0.72, -0.5], [0.82, 1.35]),
    );
    timeline.animate(map).at(7.7).duration(1.6).ease("inOutCubic").to(
      map.matrixState([1.45, 0.38], [-0.52, 1.18]),
    );
    this.play(timeline);
    if (this.duration < 9.6) this.wait(9.6 - this.duration);
  }
}

render(import.meta.url, MatrixAsLinearMap, { fps: 60 });
