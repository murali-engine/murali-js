import {
  BasisVectors,
  CoordinateReadout,
  GRAY_B,
  Label,
  LinearCombination,
  NumberPlane,
  Scene,
  SpanRegion,
  Timeline,
  VectorAddition,
  WHITE,
  render,
} from "murali-js";

/** Port of Murali `examples/linear_algebra_span.rs`. */
class LinearAlgebraSpan extends Scene {
  constructor() {
    super({ viewWidth: 10.5 });
  }

  override construct(): void {
    const u: readonly [number, number] = [1.3, 0.35];
    const v: readonly [number, number] = [0.35, 1.1];
    const scaledU: readonly [number, number] = [u[0] * 1.7, u[1] * 1.7];
    const scaledV: readonly [number, number] = [v[0] * 1.2, v[1] * 1.2];
    const sum: readonly [number, number] = [scaledU[0] + scaledV[0], scaledU[1] + scaledV[1]];

    this.add(Label("Span And Linear Combinations").height(0.36).color(WHITE), { at: [0, 3.05, 0] });
    this.add(
      Label("A span is the set of vectors reachable by scaling and adding basis directions.")
        .height(0.17)
        .color(GRAY_B),
      { at: [0, 2.58, 0] },
    );
    this.add(NumberPlane([-4, 4], [-2.4, 2.4]).step(1).build());
    this.add(SpanRegion(u, v).extent(4.5).step(0.75).color("rgba(87, 199, 242, 0.22)").build());
    this.add(BasisVectors(u, v).labels("u", "v").coordinates(true).build());
    const combination = this.add(LinearCombination(u, v, 1.7, 1.2).labels("1.7u", "1.2v", "x").build());
    const addition = this.add(VectorAddition(scaledU, scaledV).labels("1.7u", "1.2v", "x").build(), { at: [0, -0.08, 0] });
    this.add(CoordinateReadout(sum).mode("column").build(), { at: [4.25, 0.4, 0] });

    const timeline = new Timeline();
    timeline.animate(combination).at(0.35).duration(0.9).appear();
    timeline.animate(addition).at(0.75).duration(0.9).appear();
    this.play(timeline);
  }
}

render(import.meta.url, LinearAlgebraSpan);
