import {
  CoordinateReadout,
  GRAY_B,
  GOLD_C,
  Label,
  LabeledVector,
  NumberPlane,
  ScalarMultiplication,
  Scene,
  TEAL_C,
  Timeline,
  VectorArrow,
  WHITE,
  render,
} from "murali-js";

/** Port of Murali `examples/linear_algebra_vectors.rs`. */
class LinearAlgebraVectors extends Scene {
  constructor() {
    super({ viewWidth: 10.5 });
  }

  override construct(): void {
    const vector: readonly [number, number] = [2.6, 1.4];
    this.add(Label("Linear Algebra: Vectors").height(0.36).color(WHITE), { at: [0, 3.05, 0] });
    this.add(
      Label("The same vector can be read geometrically as an arrow and numerically as coordinates.")
        .height(0.17)
        .color(GRAY_B),
      { at: [0, 2.58, 0] },
    );
    this.add(NumberPlane([-4, 4], [-2.4, 2.4]).step(1).build());

    const arrow = this.add(
      LabeledVector("v", vector).color(TEAL_C).labelColor(WHITE).anchorAt("tip").coordinates(true).build(),
    );
    this.add(CoordinateReadout(vector).mode("column").build(), { at: [4.25, 0.75, 0] });
    this.add(CoordinateReadout(vector).mode("tuple").build(), { at: [4.25, 1.55, 0] });
    this.add(CoordinateReadout(vector).mode("row").build(), { at: [4.25, 1.18, 0] });
    this.add(
      CoordinateReadout([0.42, 0.81, 0.18, 0.63])
        .names(["topic", "style", "depth", "tone"])
        .mode("features")
        .highlight([1])
        .build(),
      { at: [-4.45, -0.65, 0] },
    );
    this.add(VectorArrow([-2.1, -1.3], { from: [-3.5, -1.85], color: GOLD_C, width: 0.035 }));
    this.add(ScalarMultiplication([0.7, 0.35], 2.4).labels("u", "2.4u").build(), { at: [1.75, -1.8, 0] });

    const timeline = new Timeline();
    timeline.animate(arrow).at(0.4).duration(1).appear();
    this.play(timeline);
  }
}

render(import.meta.url, LinearAlgebraVectors);
