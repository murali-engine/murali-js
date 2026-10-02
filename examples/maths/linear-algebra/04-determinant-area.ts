import { render } from "murali-js";
import { Scene, Timeline } from "murali-js/core";
import { LinearMap2D } from "murali-js/maths";
import { palette } from "murali-js/style";
import { Label } from "murali-js/text";

const { GRAY_B, WHITE } = palette;

class DeterminantArea extends Scene {
  constructor() { super({ viewWidth: 11.2 }); }

  override construct(): void {
    const map = this.add(LinearMap2D().unitSquare().basisVectors(true).scale(0.82), { at: [0, -0.06, 0] });
    const title = this.add(Label("The Determinant Tells A Geometric Story").height(0.38).color(WHITE).typewriter(), { at: [0, 2.76, 0] });
    const subtitle = this.add(Label(
      "Area grows, orientation flips, and a singular map crushes the plane.",
    ).height(0.18).color(GRAY_B).typewriter(), { at: [0, 2.34, 0] });

    const timeline = new Timeline();
    timeline.animate(title).at(0).duration(0.85).ease("linear").typewrite();
    timeline.animate(subtitle).at(0.3).duration(1.2).ease("linear").typewrite();
    timeline.animate(map).at(1.1).duration(2.3).ease("inOutCubic").to(
      map.matrixState([1.65, 0.24], [-0.32, 1.25]),
    );
    timeline.animate(map).at(3.8).duration(2.3).ease("inOutCubic").to(
      map.matrixState([0.2, 1.1], [1.2, 0.15]),
    );
    timeline.animate(map).at(6.5).duration(2.5).ease("inOutCubic").to(
      map.matrixState([0.8, 0.4], [1.6, 0.8]),
    );
    this.play(timeline);
    if (this.duration < 9.5) this.wait(9.5 - this.duration);
  }
}

render(import.meta.url, DeterminantArea, { fps: 60 });
