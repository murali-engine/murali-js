import {
  AngleArc,
  DotProductMeter,
  GRAY_B,
  GOLD_C,
  Label,
  LabeledVector,
  NumberPlane,
  OrthogonalityMarker,
  ProjectionShadow,
  Scene,
  TEAL_C,
  Timeline,
  WHITE,
  projectOnto,
  render,
} from "venu";

/** Port of Murali `examples/linear_algebra_dot_product.rs`. */
class LinearAlgebraDotProduct extends Scene {
  constructor() {
    super({ viewWidth: 9.5 });
  }

  override construct(): void {
    const a: readonly [number, number] = [2.5, 1.2];
    const b: readonly [number, number] = [2.1, -0.25];
    const projection = projectOnto(a, b);
    const residual: readonly [number, number] = [a[0] - projection[0], a[1] - projection[1]];

    this.add(Label("Dot Product And Projection").height(0.36).color(WHITE), { at: [0, 3.05, 0] });
    this.add(
      Label("Alignment becomes visible as an angle, a shadow, and a signed similarity meter.")
        .height(0.17)
        .color(GRAY_B),
      { at: [0, 2.58, 0] },
    );
    this.add(NumberPlane([-3.8, 3.8], [-2.3, 2.3]).step(1).build());

    const vectorA = this.add(LabeledVector("a", a).color(TEAL_C).labelColor(WHITE).anchorAt("tip").build());
    const vectorB = this.add(LabeledVector("b", b).color(GOLD_C).labelColor(WHITE).anchorAt("tip").build());
    this.add(AngleArc(b, a).radius(0.72).autoLabel("degrees").build());
    this.add(ProjectionShadow(a, b).original(false).build());
    this.add(OrthogonalityMarker(b, residual).vertex(projection).size(0.24).build());
    this.add(DotProductMeter(a, b).build(), { at: [0, -2.75, 0] });
    this.add(DotProductMeter(a, b).mode("dot").build(), { at: [-3.15, -2.75, 0] });
    this.add(DotProductMeter(a, [-b[0], -b[1]]).mode("cosine").build(), { at: [3.15, -2.75, 0] });

    const timeline = new Timeline();
    timeline.animate(vectorA).at(0.3).duration(0.8).appear();
    timeline.animate(vectorB).at(0.55).duration(0.8).appear();
    this.play(timeline);
  }
}

render(import.meta.url, LinearAlgebraDotProduct);
