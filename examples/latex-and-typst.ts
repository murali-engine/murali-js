import {
  BLUE_B,
  GOLD_B,
  GOLD_C,
  GRAY_A,
  GRAY_B,
  Label,
  WHITE,
  MathText,
  Scene,
  TEAL_C,
  Timeline,
  easeInOutCubic,
  render,
} from "murali-js";

/**
 * Port of Murali `examples/latex_and_typst.rs`.
 * Both formulas are MathML from the source string. The vector morph is a crossfade;
 * glyph-to-glyph morphing is still an engine gap.
 */
class LatexAndTypst extends Scene {
  override construct(): void {
    const title = this.add(Label("LaTeX And Typst").height(0.38).color(WHITE).typewriter());
    this.toEdge(title, "up", { margin: 0.8 });
    const subtitle = this.add(Label(
      "Static rendering first, then one vector morph sequence for authored math continuity.",
    ).height(0.18).color(GRAY_B).typewriter(), { at: [0, 2.95, 0] });
    const latexHeading = this.add(Label("LaTeX").height(0.2).color(GOLD_B).typewriter(), { at: [-4.5, 1.85, 0] });
    const latex = this.add(MathText("\\int_0^1 x^2 \\, dx = \\frac{1}{3}").height(0.72).color(GOLD_B), { at: [-4.5, 0.75, 0] });
    const latexCaption = this.add(Label("Good for familiar TeX-style math input.").height(0.16).color(GRAY_A).typewriter(), { at: [-4.5, -0.15, 0] });
    const typstHeading = this.add(Label("Typst").height(0.2).color(TEAL_C).typewriter(), { at: [4.5, 1.85, 0] });
    const typst = this.add(MathText("$f(x) = x^2 + 2 x + 1$").height(0.46).color(TEAL_C), { at: [4.5, 0.8, 0] });
    const typstCaption = this.add(Label("Good for modern document-native math authoring.").height(0.16).color(GRAY_A).typewriter(), { at: [4.5, -0.15, 0] });
    const morphHeading = this.add(Label("Vector Morph").height(0.2).color(GRAY_B).typewriter(), { at: [0, -1.25, 0] });
    const morphCaption = this.add(Label(
      "A compact example: Typst source morphs into a LaTeX result.",
    ).height(0.16).color(GRAY_A).typewriter(), { at: [0, -2.9, 0] });
    const source = this.add(MathText("(a + b)^2").height(0.95).color(BLUE_B), { at: [0, -2, 0] });
    const target = this.add(MathText("a^2 + 2ab + b^2").height(0.95).color(GOLD_C).opacity(0), { at: [0, -2, 0] });

    this.updater((time, states) => {
      const start = 5.5;
      const duration = 2.6;
      if (time < start) return;
      const eased = easeInOutCubic(Math.min(1, (time - start) / duration));
      const sourceState = states.get(source);
      const targetState = states.get(target);
      if (sourceState) sourceState.opacity = 1 - eased;
      if (targetState) targetState.opacity = eased;
    });

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
    this.play(timeline);
    if (this.duration < 8.1) this.wait(8.1 - this.duration);
  }
}

render(import.meta.url, LatexAndTypst);
