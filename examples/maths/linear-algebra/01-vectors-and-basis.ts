import { render } from "murali-js";
import { Scene, Timeline } from "murali-js/core";
import { BasisExplorer2D } from "murali-js/maths";
import { palette } from "murali-js/style";
import { Label } from "murali-js/text";

const { GRAY_B, TEAL_C, WHITE } = palette;

class VectorsAndBasis extends Scene {
  constructor() { super({ viewWidth: 11.2 }); }

  override construct(): void {
    const title = this.add(Label("A Vector Is A Recipe").height(0.38).color(WHITE).typewriter(), { at: [0, 2.78, 0] });
    const subtitle = this.add(Label(
      "Change the coefficients and the arrow explores the span. Change the basis and its description changes.",
    ).height(0.17).color(GRAY_B).typewriter(), { at: [0, 2.36, 0] });

    const span = this.add(BasisExplorer2D([1.25, 0.25], [-0.35, 1.15]).coefficients(0, 0).scale(0.82), { at: [0, -0.08, 0] });
    const spanCaption = this.add(Label("First: coefficients move the vector").height(0.2).color(TEAL_C), { at: [0, -2.75, 0] });

    const fixed = this.add(
      BasisExplorer2D([1, 0], [0, 1]).fixedVector([2.2, 1.55], "x").scale(0.82).opacity(0),
      { at: [0, -0.08, 0] },
    );
    const basisCaption = this.add(
      Label("Then: the vector stays still while its coordinates change").height(0.2).color(TEAL_C).opacity(0),
      { at: [0, -2.75, 0] },
    );

    const timeline = new Timeline();
    timeline.animate(title).at(0).duration(0.8).ease("linear").typewrite();
    timeline.animate(subtitle).at(0.25).duration(1.3).ease("linear").typewrite();
    timeline.animate(span).at(1).duration(2.2).ease("inOutCubic").to(span.coefficientState(2.1, 1.2));
    timeline.animate(span).at(3.35).duration(1.8).ease("inOutCubic").to(span.coefficientState(-1.15, 1.75));
    timeline.animate(span).at(5.35).duration(0.55).fadeTo(0);
    timeline.animate(spanCaption).at(5.35).duration(0.45).fadeTo(0);
    timeline.animate(fixed).at(5.65).duration(0.6).appear();
    timeline.animate(basisCaption).at(5.65).duration(0.6).appear();
    timeline.animate(fixed).at(6.35).duration(2.8).ease("inOutCubic").to(
      fixed.basisState([1.35, 0.42], [-0.48, 1.2]),
    );
    this.play(timeline);
    if (this.duration < 9.5) this.wait(9.5 - this.duration);
  }
}

render(import.meta.url, VectorsAndBasis, { fps: 60 });
