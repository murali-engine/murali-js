import {
  GRAY_B,
  GREEN_C,
  Label,
  LabeledVector,
  MatrixVectorFlow,
  NumberPlane,
  Scene,
  Timeline,
  TransformableGrid,
  WHITE,
  render,
} from "murali-js";

/** Port of Murali `examples/linear_algebra_matrix_vector.rs`. */
class LinearAlgebraMatrixVector extends Scene {
  constructor() {
    super({ viewWidth: 9.8 });
  }

  override construct(): void {
    const iHat: readonly [number, number] = [1.4, 0.35];
    const jHat: readonly [number, number] = [-0.45, 1.15];
    const input: readonly [number, number] = [1.6, 1.1];
    const flow = MatrixVectorFlow(
      [[iHat[0], jHat[0]], [iHat[1], jHat[1]]],
      input,
    ).labels("A", "x", "b = Ax")
      .positions([-1.95, 0.2], [-0.65, 0.2], [0.35, 0.2], [1.3, 0.2])
      .expansionAt([-0.2, -0.78]);
    const [outX, outY] = flow.resultValues();
    const output: readonly [number, number] = [outX ?? 0, outY ?? 0];

    this.add(Label("Matrix Vector Multiplication").height(0.34).color(WHITE), { at: [0, 3, 0] });
    this.add(
      Label("The input vector moves by following the same rule that moves every grid point.")
        .height(0.16)
        .color(GRAY_B),
      { at: [0, 2.58, 0] },
    );
    this.add(NumberPlane([-3.3, 3.3], [-2.2, 2.2]).step(1).build());
    this.add(TransformableGrid(iHat, jHat)
      .range([-3.3, 3.3], [-2.2, 2.2])
      .step(0.55)
      .basisVectors(false)
      .build());

    const inputArrow = this.add(
      LabeledVector("x", input).color(GRAY_B).labelColor(WHITE).anchorAt("tip").coordinates(true).build(),
    );
    const outputArrow = this.add(
      LabeledVector("Ax", output).color(GREEN_C).labelColor(WHITE).anchorAt("tip").coordinates(true).build(),
    );
    this.add(flow.build(), { at: [0, -2.55, 0] });
    this.add(
      MatrixVectorFlow(
        [[1, -0.5, 2], [0, 1.5, 0.75]],
        [2, 1, -0.5],
      ).labels("R", "z", "Rz")
        .rowExpansion(false)
        .positions([-1.7, 0], [-0.35, 0], [0.72, 0], [1.55, 0])
        .textHeight(0.16)
        .cellHeight(0.2)
        .build(),
      { at: [2.6, -1.45, 0] },
    );

    const timeline = new Timeline();
    timeline.animate(inputArrow).at(0.25).duration(0.7).appear();
    timeline.animate(outputArrow).at(0.75).duration(0.8).appear();
    this.play(timeline);
  }
}

render(import.meta.url, LinearAlgebraMatrixVector);
