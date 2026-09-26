import {
  BasisGrid,
  BasisVectors,
  CoordinateReadout,
  DimensionBadge,
  GRAY_B,
  GREEN_C,
  Label,
  LabeledVector,
  NumberPlane,
  Scene,
  TEAL_C,
  WHITE,
  basisCoordinates,
  render,
} from "venu";

/** Port of Murali `examples/linear_algebra_basis_change.rs`. */
class LinearAlgebraBasisChange extends Scene {
  constructor() {
    super({ viewWidth: 11.2 });
  }

  override construct(): void {
    const basisU: readonly [number, number] = [1.35, 0.45];
    const basisV: readonly [number, number] = [-0.45, 1.25];
    const vector: readonly [number, number] = [2.25, 1.7];

    this.add(Label("Same Vector, Different Coordinates").height(0.34).color(WHITE), { at: [0, 2.72, 0] });
    this.add(
      Label("A basis is a coordinate system: the arrow stays fixed, the numbers change.")
        .height(0.16)
        .color(GRAY_B),
      { at: [0, 2.34, 0] },
    );
    this.add(NumberPlane([-4, 4], [-3, 3]).step(1)
      .gridStyle("rgba(166, 184, 204, 0.22)", 0.008)
      .axisStyle("rgba(214, 224, 235, 0.38)", 0.018)
      .build());
    this.add(BasisGrid(basisU, basisV)
      .range([-2, 3], [-2, 3])
      .step(1)
      .color("rgba(140, 191, 242, 0.18)")
      .thickness(0.012)
      .axisStyle("rgba(184, 219, 255, 0.34)", 0.024)
      .build());
    this.add(BasisVectors(basisU, basisV).labels("b1", "b2").offsets([0.16, -0.28], [-0.34, 0.1]).build());
    this.add(LabeledVector("v", vector).color(GREEN_C).labelColor(WHITE).anchorAt("tip").build());
    this.add(Label("standard").height(0.16).color(GRAY_B), { at: [-3.45, 1.25, 0] });
    this.add(CoordinateReadout(vector).mode("column").build(), { at: [-3.45, 0.75, 0] });
    this.add(Label("basis B").height(0.16).color(GRAY_B), { at: [3.35, 1.25, 0] });
    this.add(CoordinateReadout(basisCoordinates(basisU, basisV, vector)).mode("column").build(), { at: [3.35, 0.75, 0] });
    this.add(DimensionBadge("B", 2, 2).textColor(TEAL_C).build(), { at: [3.35, -0.15, 0] });
  }
}

render(import.meta.url, LinearAlgebraBasisChange);
