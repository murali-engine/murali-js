import {
  BLUE_B,
  Equation,
  GOLD_C,
  GRAY_A,
  GRAY_B,
  Label,
  NumberLine,
  Scene,
  TEAL_C,
  Tattva,
  Timeline,
  WHITE,
  continuityPlacement,
  easeInOutCubic,
  matrixMarkup,
  render,
} from "venu";

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
    const numberLine = this.add(NumberLine([-3, 6]).step(1).color(GRAY_B).originColor(GOLD_C).build(), { at: [0, -0.45, 0] });
    const matrixHeading = this.add(Label("Matrix Steps").height(0.19).color(GRAY_B).typewriter(), { at: [0, -0.9, 0] });
    const matrix = this.add(new SteppedMatrix());
    matrix.at([0, -2.1, 0]);
    const matrixCaption = this.add(Label(
      "Row, column, and cell highlights turn a static array into a guided explanation.",
    ).height(0.16).color(GRAY_A).typewriter(), { at: [0, -4, 0] });

    this.updater((time, states) => {
      const start = 3.15;
      const duration = 1.5;
      if (time < start) return;
      const eased = easeInOutCubic(Math.min(1, (time - start) / duration));
      const sourceState = states.get(sourceGroup);
      const targetState = states.get(targetGroup);
      if (sourceState) sourceState.opacity = 1 - eased;
      if (targetState) targetState.opacity = 1;
      for (const place of continuityPlacement(source.terms, target.terms, eased)) {
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
    timeline.animate(numberLine).at(2.45).duration(0.45).ease("outCubic").appear();
    timeline.animate(matrixHeading).at(4.8).duration(0.85).ease("linear").typewrite();
    timeline.animate(matrix).at(5.15).duration(0.5).ease("outCubic").appear();
    timeline.animate(matrixCaption).at(5.45).duration(1.1).ease("linear").typewrite();
    this.play(timeline);
    if (this.duration < 9.2) this.wait(9.2 - this.duration);
  }
}

class SteppedMatrix extends Tattva {
  constructor() {
    super();
    this.dynamicGeometry = true;
    this.revealKind = "none";
    this.worldSize = { width: 4.2, height: 2.4 };
  }

  override contentHTML(time = 0): string {
    return matrixMarkup(entries, 0.44, focusAt(time));
  }
}

function focusAt(time: number) {
  const row = step(time, 6, 0.95);
  const column = step(time, 7.1, 0.95);
  const diagonal = step(time, 8.2, 1);
  if (diagonal > 0) return { cells: [[0, 0], [1, 1], [2, 2]] as const, color: GOLD_C, amount: diagonal, dim: 0.24 };
  if (column > 0) return { cells: [[0, 1], [1, 1], [2, 1]] as const, color: BLUE_B, amount: column, dim: 0.24 };
  if (row > 0) return { cells: [[1, 0], [1, 1], [1, 2]] as const, color: TEAL_C, amount: row, dim: 0.28 };
  return null;
}

function step(time: number, start: number, duration: number): number {
  if (time < start) return 0;
  return easeInOutCubic(Math.min(1, (time - start) / duration));
}

render(import.meta.url, EquationAndMatrixAnimation);
