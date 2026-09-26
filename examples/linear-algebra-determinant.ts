import {
  DeterminantArea,
  GRAY_B,
  Label,
  MatrixTransformPanel,
  NumberPlane,
  Scene,
  TransformableGrid,
  WHITE,
  render,
} from "murali-js";
import type { Vec2 } from "murali-js";

/** Port of Murali `examples/linear_algebra_determinant.rs`. */
class LinearAlgebraDeterminant extends Scene {
  constructor() {
    super({ viewWidth: 10.5 });
  }

  override construct(): void {
    this.add(Label("Determinant As Area Scaling").height(0.34).color(WHITE), { at: [0, 3, 0] });
    this.add(
      Label("The unit square becomes a parallelogram; its signed area is det(A).").height(0.16).color(GRAY_B),
      { at: [0, 2.58, 0] },
    );
    addCase(this, "scales area", [1.6, 0.25], [-0.35, 1.2], [-3.25, 0.25]);
    addCase(this, "flips orientation", [0.2, 1.1], [1.2, 0.15], [0, 0.25]);
    addCase(this, "collapses", [1.2, 0.65], [2.4, 1.3], [3.25, 0.25]);
  }
}

function addCase(scene: Scene, title: string, iHat: Vec2, jHat: Vec2, at: Vec2): void {
  scene.add(Label(title).height(0.2).color(WHITE), { at: [at[0], at[1] + 1.55, 0] });
  scene.add(NumberPlane([-1.2, 2.2], [-0.8, 2]).step(1).build(), { at: [...at, 0] });
  scene.add(
    TransformableGrid(iHat, jHat).range([-1.2, 2.2], [-0.8, 2]).step(1).sourceGrid(false).basisVectors(false).build(),
    { at: [...at, 0] },
  );
  scene.add(DeterminantArea(iHat, jHat).build(), { at: [...at, 0] });
  scene.add(MatrixTransformPanel(iHat, jHat).cellHeight(0.2).build(), { at: [at[0], at[1] - 1.55, 0] });
}

render(import.meta.url, LinearAlgebraDeterminant);
