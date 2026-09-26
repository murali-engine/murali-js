import {
  GRAY_B,
  Label,
  MatrixTransformPanel,
  Scene,
  TEAL_C,
  WHITE,
  composeColumns,
  render,
} from "murali-js";
import type { Vec2 } from "murali-js";

/** Port of Murali `examples/linear_algebra_composition.rs`. */
class LinearAlgebraComposition extends Scene {
  constructor() {
    super({ viewWidth: 8.8 });
  }

  override construct(): void {
    const scale: readonly [Vec2, Vec2] = [[1.45, 0], [0, 1]];
    const shear: readonly [Vec2, Vec2] = [[1, 0], [0.65, 1]];

    this.add(Label("Transform Composition").height(0.34).color(WHITE), { at: [0, 2.55, 0] });
    this.add(
      Label("For column vectors: applying A, then B gives BA. Reversing the order gives AB.")
        .height(0.16)
        .color(GRAY_B),
      { at: [0, 2.18, 0] },
    );

    this.add(Label("A then B").height(0.2).color(GRAY_B), { at: [-3.7, 0.9, 0] });
    addMatrixCase(this, "A", scale, [-2.2, 0.55]);
    addMatrixCase(this, "B", shear, [0, 0.55]);
    addMatrixCase(this, "BA", composeColumns(shear, scale), [2.2, 0.55]);
    addOperatorLabels(this, 0.55);

    this.add(Label("B then A").height(0.2).color(GRAY_B), { at: [-3.7, -1.15, 0] });
    addMatrixCase(this, "B", shear, [-2.2, -1.5]);
    addMatrixCase(this, "A", scale, [0, -1.5]);
    addMatrixCase(this, "AB", composeColumns(scale, shear), [2.2, -1.5]);
    addOperatorLabels(this, -1.5);

    this.add(
      Label("BA and AB are different here, so transform order matters.").height(0.18).color(TEAL_C),
      { at: [0, -2.55, 0] },
    );
  }
}

function addMatrixCase(
  scene: Scene,
  label: string,
  columns: readonly [Vec2, Vec2],
  at: Vec2,
): void {
  scene.add(Label(label).height(0.24).color(WHITE), { at: [at[0], at[1] + 0.7, 0] });
  scene.add(MatrixTransformPanel(columns[0], columns[1]).cellHeight(0.24).build(), { at: [...at, 0] });
}

function addOperatorLabels(scene: Scene, y: number): void {
  scene.add(Label("then").height(0.18).color(GRAY_B), { at: [-1.45, y, 0] });
  scene.add(Label("=").height(0.26).color(GRAY_B), { at: [1.45, y, 0] });
}

render(import.meta.url, LinearAlgebraComposition);
