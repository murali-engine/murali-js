import {
  ColumnCombination,
  DimensionBadge,
  GRAY_B,
  GOLD_C,
  GREEN_C,
  Label,
  MatrixTransformPanel,
  NumberPlane,
  QuantityBadge,
  RED_C,
  Scene,
  TEAL_C,
  WHITE,
  render,
} from "venu";

/** Port of Murali `examples/linear_algebra_column_combination.rs`. */
class LinearAlgebraColumnCombination extends Scene {
  constructor() {
    super({ viewWidth: 8.8 });
  }

  override construct(): void {
    const first: readonly [number, number] = [1.45, 0.55];
    const second: readonly [number, number] = [-0.55, 1.25];
    const coefficients: readonly [number, number] = [1.45, 1.1];
    const target: readonly [number, number] = [1.25, 2.55];

    this.add(Label("Matrix Columns As Building Blocks").height(0.34).color(WHITE), { at: [0, 3, 0] });
    this.add(Label("Ax is a weighted sum of the columns of A.").height(0.16).color(GRAY_B), { at: [0, 2.58, 0] });
    this.add(NumberPlane([-3, 3.2], [-1.5, 3.1]).step(1).build());
    this.add(
      ColumnCombination(first, second, coefficients).labels("a1", "a2", "Ax").target(target, "b").build(),
      { at: [-1.35, 0.15, 0] },
    );
    this.add(MatrixTransformPanel(first, second).cellHeight(0.28).build(), { at: [2.95, 0.85, 0] });
    this.add(Label("x = [1.45, 1.10]").height(0.18).color(GRAY_B), { at: [2.95, 0.15, 0] });
    this.add(Label("b - Ax is the residual").height(0.16).color(RED_C), { at: [2.95, -0.35, 0] });
    this.add(DimensionBadge("A", 2, 2).textColor(TEAL_C).build(), { at: [2.35, -0.9, 0] });
    this.add(DimensionBadge("x", 2, 1).textColor(GOLD_C).build(), { at: [3.2, -0.9, 0] });
    this.add(QuantityBadge("rank", "2").textColor(GREEN_C).build(), { at: [2.78, -1.35, 0] });
  }
}

render(import.meta.url, LinearAlgebraColumnCombination);
