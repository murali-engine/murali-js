import {
  CoordinateReadout,
  GRAY_B,
  GREEN_C,
  Label,
  LabeledVector,
  MatrixTransformPanel,
  Scene,
  Timeline,
  TransformableGrid,
  WHITE,
  render,
} from "venu";

/** Port of Murali `examples/linear_algebra_matrix_transform.rs`. */
class LinearAlgebraMatrixTransform extends Scene {
  constructor() {
    super({ viewWidth: 11.2 });
  }

  override construct(): void {
    const iHat: readonly [number, number] = [1.4, 0.35];
    const jHat: readonly [number, number] = [-0.45, 1.15];
    const input: readonly [number, number] = [1.6, 1.1];
    const grid = TransformableGrid(iHat, jHat).range([-3.5, 3.5], [-2.5, 2.5]).step(0.5);
    const output = grid.transformVector(input);

    this.add(Label("Matrices Transform Space").height(0.36).color(WHITE), { at: [0, 2.85, 0] });
    this.add(
      Label("Each column tells where a basis vector lands; the whole grid follows.")
        .height(0.17)
        .color(GRAY_B),
      { at: [0, 2.43, 0] },
    );
    const gridMark = this.add(grid.build());
    this.add(MatrixTransformPanel(iHat, jHat).cellHeight(0.34).build(), { at: [3.85, 1, 0] });
    this.add(LabeledVector("x", input).color(GRAY_B).labelColor(WHITE).anchorAt("tip").coordinates(true).build());
    const outputArrow = this.add(
      LabeledVector("Ax", output).color(GREEN_C).labelColor(WHITE).anchorAt("tip").coordinates(true).build(),
    );
    this.add(CoordinateReadout(output).mode("column").build(), { at: [3.85, -1, 0] });

    const timeline = new Timeline();
    timeline.animate(gridMark).at(0.25).duration(1).appear();
    timeline.animate(outputArrow).at(0.85).duration(0.8).appear();
    this.play(timeline);
  }
}

render(import.meta.url, LinearAlgebraMatrixTransform);
