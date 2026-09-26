import {
  BLUE_C,
  BLUE_D,
  GRAY_B,
  GREEN_C,
  GREEN_D,
  Label,
  LabeledVector,
  MatrixTransformPanel,
  Scene,
  SceneView,
  TEAL_C,
  Timeline,
  TransformableGrid,
  WHITE,
  composeColumns,
  render,
} from "venu";
import type { Vec2 } from "venu";

/**
 * Port of Murali `examples/linear_algebra_transform_order_scene_view.rs`.
 * Each path is its own scene. The second clock starts only when that inset moves up.
 */
class TransformSequence extends Scene {
  constructor(
    private readonly titleText: string,
    private readonly firstName: string,
    private readonly secondName: string,
    private readonly first: readonly [Vec2, Vec2],
    private readonly second: readonly [Vec2, Vec2],
  ) {
    super({ viewWidth: 8.4 });
  }

  override construct(): void {
    const composed = composeColumns(this.second, this.first);
    const image = TransformableGrid(composed[0], composed[1]).transformVector([1, 1]);
    this.add(Label(this.titleText).height(0.28).color(WHITE), { at: [0, 2.25, 0] });
    this.add(Label(`${this.firstName} first, then ${this.secondName}`).height(0.16).color(GRAY_B), { at: [0, 1.9, 0] });
    const identity = this.add(layer([[1, 0], [0, 1]], GRAY_B));
    const firstGrid = this.add(layer(this.first, BLUE_C));
    const firstLabel = this.add(Label(`after ${this.firstName}`).height(0.17).color(BLUE_C), { at: [-2.55, -2.25, 0] });
    const finalGrid = this.add(layer(composed, GREEN_C));
    const finalLabel = this.add(Label(`after ${this.secondName}: ${this.secondName}${this.firstName}`).height(0.17).color(GREEN_C), {
      at: [1.8, -2.25, 0],
    });
    const finalVector = this.add(LabeledVector(`${this.secondName}${this.firstName}x`, image).color(GREEN_C).anchorAt("tip").coordinates(true).build());
    this.add(LabeledVector("x", [1, 1]).color(GRAY_B).anchorAt("tip").build());
    const panel = this.add(MatrixTransformPanel(composed[0], composed[1]).cellHeight(0.22).build(), { at: [3.1, 1.1, 0] });

    const timeline = new Timeline();
    timeline.animate(identity).at(0.1).duration(0.45).ease("outCubic").appear();
    timeline.animate(firstGrid).at(0.8).duration(0.7).ease("outCubic").appear();
    timeline.animate(firstLabel).at(0.8).duration(0.7).ease("outCubic").appear();
    timeline.animate(finalGrid).at(1.7).duration(0.7).ease("outCubic").appear();
    timeline.animate(finalLabel).at(1.7).duration(0.7).ease("outCubic").appear();
    timeline.animate(panel).at(1.7).duration(0.7).ease("outCubic").appear();
    timeline.animate(finalVector).at(2.2).duration(0.55).ease("outCubic").appear();
    this.play(timeline);
  }
}

class LinearAlgebraTransformOrder extends Scene {
  constructor() {
    super({ viewWidth: 9.8 });
  }

  override construct(): void {
    const scale: readonly [Vec2, Vec2] = [[1.45, 0], [0, 1]];
    const shear: readonly [Vec2, Vec2] = [[1, 0], [0.65, 1]];
    const pathOne = this.add(SceneView(new TransformSequence("Path 1", "A", "B", scale, shear))
      .size(8.8, 5)
      .background(rgba(BLUE_D, 0.12))
      .border(0.035, rgba(BLUE_C, 0.75))
      .cornerRadius(0.16)
      .playback("once"));
    const pathTwo = this.add(SceneView(new TransformSequence("Path 2", "B", "A", shear, scale))
      .size(8.8, 5)
      .background(rgba(GREEN_D, 0.1))
      .border(0.035, rgba(GREEN_C, 0.75))
      .cornerRadius(0.16)
      .startAt(3.15)
      .playback("once"), { at: [0, -7, 0] });
    const title = this.add(Label("Same transforms, different order").height(0.34).color(WHITE), { at: [0, 2.75, 0] });
    const compare = this.add(Label("A then B lands differently from B then A").height(0.2).color(TEAL_C), { at: [0, -2.75, 0] });

    const timeline = new Timeline();
    timeline.animate(pathOne).at(2.95).duration(0.8).ease("inOutCubic").moveTo([-2.95, 1.15, 0]);
    timeline.animate(pathOne).at(2.95).duration(0.8).ease("inOutCubic").scale3DTo([0.42, 0.42, 1]);
    timeline.animate(pathTwo).at(3.15).duration(0.75).ease("inOutCubic").moveTo([0, 0, 0]);
    timeline.animate(pathTwo).at(5.95).duration(0.8).ease("inOutCubic").moveTo([2.95, 1.15, 0]);
    timeline.animate(pathTwo).at(5.95).duration(0.8).ease("inOutCubic").scale3DTo([0.42, 0.42, 1]);
    timeline.animate(title).at(6.75).duration(0.5).ease("outCubic").appear();
    timeline.animate(compare).at(7.05).duration(0.6).ease("outCubic").appear();
    this.play(timeline);
  }
}

function layer(columns: readonly [Vec2, Vec2], color: string) {
  return TransformableGrid(columns[0], columns[1])
    .range([-2.4, 2.4], [-1.8, 1.8])
    .step(0.6)
    .sourceGrid(false)
    .basisVectors(false)
    .color(rgba(color, 0.42))
    .axisStyle(rgba(color, 0.82), 0.03)
    .build();
}

function rgba(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  return `rgba(${Number.parseInt(value.slice(0, 2), 16)}, ${Number.parseInt(value.slice(2, 4), 16)}, ${Number.parseInt(value.slice(4, 6), 16)}, ${alpha})`;
}

render(import.meta.url, LinearAlgebraTransformOrder);
