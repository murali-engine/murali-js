import { render } from "murali-js";
import { Scene, Timeline } from "murali-js/core";
import { palette } from "murali-js/style";
import { Label, Latex, LatexMorph, MathText } from "murali-js/text";
const { BLUE_B, GOLD_B, GRAY_A, GRAY_B, WHITE, TEAL_C } = palette;

/**
 * Port of Murali `examples/latex_and_typst.rs`.
 * Static comparison uses browser MathML. The final sequence uses native LaTeX
 * vector outlines and glyph-to-glyph cubic Bezier interpolation.
 */
class LatexAndTypst extends Scene {
  override construct(): void {
    const title = this.add(Label("LaTeX And Typst").height(0.38).color(WHITE).typewriter());
    this.toEdge(title, "up", { margin: 0.8 });
    const subtitle = this.add(Label(
      "Static rendering first, then one vector morph sequence for authored math continuity.",
    ).height(0.18).color(GRAY_B).typewriter(), { at: [0, 2.95, 0] });
    const latexHeading = this.add(Label("LaTeX").height(0.2).color(GOLD_B).typewriter(), { at: [-4.5, 1.85, 0] });
    const latex = this.add(Latex(String.raw`\int_0^1 x^2 \, dx = \frac{1}{3}`).height(0.72).color(GOLD_B), { at: [-4.5, 0.75, 0] });
    const latexCaption = this.add(Label("Good for familiar TeX-style math input.").height(0.16).color(GRAY_A).typewriter(), { at: [-4.5, -0.15, 0] });
    const typstHeading = this.add(Label("Typst").height(0.2).color(TEAL_C).typewriter(), { at: [4.5, 1.85, 0] });
    const typst = this.add(MathText("$f(x) = x^2 + 2 x + 1$").height(0.46).color(TEAL_C), { at: [4.5, 0.8, 0] });
    const typstCaption = this.add(Label("Good for modern document-native math authoring.").height(0.16).color(GRAY_A).typewriter(), { at: [4.5, -0.15, 0] });
    const morphHeading = this.add(Label("Vector Morph").height(0.2).color(GRAY_B).typewriter(), { at: [0, -1.25, 0] });
    const morphCaption = this.add(Label(
      "Matching TeX glyphs persist while the identity expands.",
    ).height(0.16).color(GRAY_A).typewriter(), { at: [0, -2.9, 0] });
    const morph = this.add(
      LatexMorph(String.raw`(a+b)^2`, String.raw`a^2 + 2ab + b^2`)
        .height(0.95)
        .color(BLUE_B),
      { at: [0, -2, 0] },
    );

    const timeline = new Timeline();
    timeline.animate(title).at(0).duration(1).ease("linear").typewrite();
    timeline.animate(subtitle).at(0.35).duration(1.6).ease("linear").typewrite();
    timeline.animate(latexHeading).at(1.5).duration(0.8).ease("linear").typewrite();
    timeline.animate(latex).at(1.9).duration(1).ease("linear").appear();
    timeline.animate(latexCaption).at(2.2).duration(1).ease("linear").typewrite();
    timeline.animate(typstHeading).at(2.8).duration(0.8).ease("linear").typewrite();
    timeline.animate(typst).at(3.2).duration(1).ease("linear").appear();
    timeline.animate(typstCaption).at(3.5).duration(1).ease("linear").typewrite();
    timeline.animate(morphHeading).at(4.5).duration(0.8).ease("linear").typewrite();
    timeline.animate(morphCaption).at(4.9).duration(1).ease("linear").typewrite();
    timeline.animate(morph).at(5.5).duration(2.6).ease("inOutCubic").morphTo(1);
    this.play(timeline);
    if (this.duration < 8.1) this.wait(8.1 - this.duration);
  }
}

render(import.meta.url, LatexAndTypst);
