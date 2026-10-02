import { render } from "murali-js";
import { Scene, timeline } from "murali-js/core";
import { palette } from "murali-js/style";
import { Label, LatexMorph } from "murali-js/text";

class LatexVectorMorphing extends Scene {
  override construct(): void {
    const title = this.add(Label("LaTeX vector morphing").height(0.52), { at: [0, 3.15, 0] });
    const caption = this.add(
      Label("Real TeX outlines · cubic Bézier correspondence · deterministic timeline")
        .height(0.19)
        .color(palette.GRAY_B),
      { at: [0, 2.48, 0] },
    );
    const equation = this.add(
      LatexMorph(
        String.raw`(a+b)^2`,
        String.raw`a^2 + 2ab + b^2`,
        String.raw`c = \sqrt{a^2+b^2}`,
      )
        .height(1.35)
        .color(palette.GOLD_C)
        .css({ filter: "drop-shadow(0 0 24px rgb(250 190 88 / 22%))" }),
      { at: [0, -0.25, 0] },
    );

    this.play(timeline((local) => {
      local.animate(title).duration(0.6).typewrite();
      local.animate(caption).at(0.2).duration(0.9).typewrite();
      local.animate(equation).at(0.45).duration(0.7).appear();
    }));
    this.wait(0.4);
    this.play(timeline((local) => local.animate(equation).duration(1.8).ease("inOutCubic").morphTo(1)));
    this.wait(0.45);
    this.play(timeline((local) => local.animate(equation).duration(1.9).ease("inOutCubic").morphTo(2)));
    this.wait(0.7);
  }
}

render(import.meta.url, LatexVectorMorphing, { fps: 60 });
