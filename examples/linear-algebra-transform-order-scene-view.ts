import {
  BLUE_C,
  GRAY_B,
  GREEN_C,
  Label,
  LabeledVector,
  MatrixTransformPanel,
  Scene,
  Timeline,
  TransformableGrid,
  WHITE,
  composeColumns,
  render,
} from "venu";
import type { Vec2 } from "venu";

/**
 * Port of the inner picture in Murali `examples/linear_algebra_transform_order_scene_view.rs`.
 * This is path 1: A, then B. The outer pair of scene views waits until child scenes exist.
 */
class LinearAlgebraTransformOrder extends Scene {
  constructor() {
    super({ viewWidth: 8.4 });
  }

  override construct(): void {
    const scale: readonly [Vec2, Vec2] = [[1.45, 0], [0, 1]];
    const shear: readonly [Vec2, Vec2] = [[1, 0], [0.65, 1]];
    const composed = composeColumns(shear, scale);
    const image = TransformableGrid(composed[0], composed[1]).transformVector([1, 1]);

    this.add(Label("Path 1").height(0.28).color(WHITE), { at: [0, 2.25, 0] });
    this.add(Label("A first, then B").height(0.16).color(GRAY_B), { at: [0, 1.9, 0] });

    const identity = this.add(layer([[1, 0], [0, 1]], GRAY_B));
    const firstGrid = this.add(layer(scale, BLUE_C));
    const firstLabel = this.add(Label("after A").height(0.17).color(BLUE_C), { at: [-2.55, -2.25, 0] });
    const finalGrid = this.add(layer(composed, GREEN_C));
    const finalLabel = this.add(Label("after B: BA").height(0.17).color(GREEN_C), { at: [1.8, -2.25, 0] });
    const finalVector = this.add(
      LabeledVector("BAx", image).color(GREEN_C).anchorAt("tip").coordinates(true).build(),
    );
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
  return `rgba(${parseInt(value.slice(0, 2), 16)}, ${parseInt(value.slice(2, 4), 16)}, ${parseInt(value.slice(4, 6), 16)}, ${alpha})`;
}

render(import.meta.url, LinearAlgebraTransformOrder);
