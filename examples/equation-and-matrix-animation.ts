import { render } from "murali-js";
import { Scene, Timeline, easeInOutCubic } from "murali-js/core";
import { palette } from "murali-js/style";
import { Label } from "murali-js/text";
import { Equation, Matrix, continuityPlacement } from "murali-js/maths";
const { BLUE_B, GOLD_C, GRAY_A, GRAY_B, TEAL_C, WHITE } = palette;

const entries = [
  ["2", "-1", "0"],
  ["-1", "2", "-1"],
  ["0", "-1", "2"],
] as const;

/** Port of Murali `examples/equation_and_matrix_animation.rs`. */
class EquationAndMatrixAnimation extends Scene {
  constructor() {
    super({ viewWidth: 16 });
  }

  override construct(): void {
    const title = this.add(Label("Equation And Matrix Animation").height(0.38).color(WHITE).typewriter(), { at: [0, 3, 0] });
    const subtitle = this.add(Label(
      "Math animation becomes easier to read when terms keep their identity and matrix focus steps stay explicit.",
    ).height(0.18).color(GRAY_B).typewriter(), { at: [0, 2.45, 0] });
    const equationHeading = this.add(Label("Equation Continuity").height(0.19).color(GRAY_B).typewriter(), { at: [0, 1.55, 0] });
    const source = Equation([
      { text: "x", key: "x", color: TEAL_C },
      { text: "+", key: "plus", color: GRAY_A },
      { text: "2", key: "two", color: GOLD_C },
      { text: "=", key: "eq", color: GRAY_A },
      { text: "5", key: "five", color: BLUE_B },
    ], 0.42);
    const target = Equation([
      { text: "x", key: "x", color: TEAL_C },
      { text: "=", key: "eq", color: GRAY_A },
      { text: "5", key: "five", color: BLUE_B },
      { text: "-", key: "minus", color: GRAY_A },
      { text: "2", key: "two", color: GOLD_C },
    ], 0.42);
    const sourceGroup = this.add(source.group, { at: [0, 0.65, 0] });
    const targetGroup = this.add(target.group.opacity(0), { at: [0, 0.65, 0] });
    const equationCaption = this.add(Label(
      "The shared terms keep their place in the viewer's memory while only the moved term changes role.",
    ).height(0.16).color(GRAY_A).typewriter(), { at: [0, -0.15, 0] });
    const matrixHeading = this.add(Label("Matrix Steps").height(0.19).color(GRAY_B).typewriter(), { at: [0, -0.72, 0] });
    const matrix = this.add(Matrix(entries).cellHeight(0.44));
    matrix.at([0, -2, 0]);
    const matrixCaption = this.add(Label(
      "Row, column, and cell highlights turn a static array into a guided explanation.",
    ).height(0.16).color(GRAY_A).typewriter(), { at: [0, -3.72, 0] });
    const targetKeys = new Set(target.terms.map((term) => term.key));

    this.updater((time, states) => {
      const start = 3.15;
      const duration = 1.5;
      if (time < start) return;
      const eased = easeInOutCubic(Math.min(1, (time - start) / duration));
      const targetState = states.get(targetGroup);
      if (targetState) targetState.opacity = 1;
      for (const term of source.terms) {
        const state = states.get(term.tattva);
        if (!state) continue;
        // Matching terms are represented by the moving target glyphs. Only
        // source-only syntax remains here long enough to fade away.
        state.opacity = targetKeys.has(term.key) ? 0 : 1 - eased;
      }
      for (const place of continuityPlacement(source.terms, target.terms, eased, {
        path: "arc",
        arcHeight: 0.32,
      })) {
        const state = states.get(place.tattva);
        if (!state) continue;
        state.x = place.x;
        state.y = place.y;
        state.opacity = place.opacity;
        state.scaleX = place.scale;
        state.scaleY = place.scale;
      }
    });

    const timeline = new Timeline();
    timeline.animate(title).at(0).duration(1).ease("linear").typewrite();
    timeline.animate(subtitle).at(0.35).duration(1.6).ease("linear").typewrite();
    timeline.animate(equationHeading).at(1.25).duration(0.85).ease("linear").typewrite();
    timeline.animate(sourceGroup).at(1.7).duration(0.5).ease("outCubic").appear();
    timeline.animate(equationCaption).at(2.1).duration(1.2).ease("linear").typewrite();
    timeline.animate(matrixHeading).at(4.8).duration(0.85).ease("linear").typewrite();
    timeline.animate(matrix).at(5.15).duration(0.5).ease("outCubic").appear();
    timeline.animate(matrixCaption).at(5.45).duration(1.1).ease("linear").typewrite();
    timeline.animate(matrix).at(6).duration(0.95).focus(matrix.row(1), {
      color: TEAL_C,
      dim: 0.28,
    });
    timeline.animate(matrix).at(7.1).duration(0.95).focus(matrix.column(1), {
      color: BLUE_B,
      dim: 0.24,
    });
    timeline.animate(matrix).at(8.2).duration(1).focus(matrix.diagonal(), {
      color: GOLD_C,
      dim: 0.24,
    });
    this.play(timeline);
    if (this.duration < 9.2) this.wait(9.2 - this.duration);
  }
}

render(import.meta.url, EquationAndMatrixAnimation);
