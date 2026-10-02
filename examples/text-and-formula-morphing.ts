import { render } from "murali-js";
import { Scene, timeline } from "murali-js/core";
import { palette } from "murali-js/style";
import { FormulaMorph, Label, TextMorph } from "murali-js/text";

class TextAndFormulaMorphing extends Scene {
  override construct(): void {
    const title = this.add(Label("Matching morphs").height(0.48), { at: [0, 3.25, 0] });
    const textCaption = this.add(
      Label("Words persist while unmatched words enter and leave.").height(0.18).color(palette.GRAY_B),
      { at: [0, 2.62, 0] },
    );
    const words = this.add(
      TextMorph("Texts morphing", "Shapes morphing", "Formula morphing")
        .matchBy("word")
        .height(0.72)
        .color(palette.TEAL_C)
        .css({ filter: "drop-shadow(0 0 20px rgb(92 208 179 / 24%))" }),
      { at: [0, 1.65, 0] },
    );

    const formulaCaption = this.add(
      Label("Terms retain their identity as the equation is rearranged.").height(0.18).color(palette.GRAY_B),
      { at: [0, 0.55, 0] },
    );
    const formula = this.add(
      FormulaMorph(
        String.raw`a^2 + b^2 = c^2`,
        String.raw`c^2 - a^2 = b^2`,
        String.raw`c = \sqrt{a^2 + b^2}`,
      )
        .height(0.92)
        .color(palette.GOLD_C)
        .unmatched("scale")
        .css({ filter: "drop-shadow(0 0 22px rgb(250 190 88 / 20%))" }),
      { at: [0, -0.75, 0] },
    );

    this.play(timeline((local) => {
      local.animate(title).duration(0.6).typewrite();
      local.animate(textCaption).at(0.2).duration(0.8).typewrite();
      local.animate(words).at(0.35).duration(0.65).appear();
      local.animate(formulaCaption).at(0.55).duration(0.9).typewrite();
      local.animate(formula).at(0.75).duration(0.7).appear();
    }));
    this.wait(0.35);
    this.play(timeline((local) => {
      local.animate(words).duration(1.15).ease("inOutCubic").morphTo(1);
      local.animate(formula).duration(1.45).ease("inOutCubic").morphTo(1);
    }));
    this.wait(0.4);
    this.play(timeline((local) => {
      local.animate(words).duration(1.15).ease("inOutCubic").morphTo(2);
      local.animate(formula).duration(1.65).ease("inOutCubic").morphTo(2);
    }));
    this.wait(0.7);
  }
}

render(import.meta.url, TextAndFormulaMorphing, { fps: 60 });
