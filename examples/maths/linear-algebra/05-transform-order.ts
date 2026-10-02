import { render } from "murali-js";
import { Scene, Timeline, type Vec2 } from "murali-js/core";
import { LinearMap2D } from "murali-js/maths";
import { palette } from "murali-js/style";
import { Label } from "murali-js/text";

const { BLUE_B, GOLD_B, GRAY_B, TEAL_C, WHITE } = palette;

class TransformOrder extends Scene {
  constructor() { super({ viewWidth: 12.4 }); }

  override construct(): void {
    const angle = 35 * Math.PI / 180;
    const scale: readonly [Vec2, Vec2] = [[1.6, 0], [0, 0.75]];
    const rotate: readonly [Vec2, Vec2] = [
      [Math.cos(angle), Math.sin(angle)],
      [-Math.sin(angle), Math.cos(angle)],
    ];
    const rotateAfterScale = compose(rotate, scale);
    const scaleAfterRotate = compose(scale, rotate);

    const left = this.add(LinearMap2D().vector([1, 1], "x").matrixReadout(false).scale(0.43), { at: [-3.05, -0.14, 0] });
    const right = this.add(LinearMap2D().vector([1, 1], "x").matrixReadout(false).scale(0.43), { at: [3.05, -0.14, 0] });
    const title = this.add(Label("Order Changes The Outcome").height(0.39).color(WHITE).typewriter(), { at: [0, 2.76, 0] });
    const subtitle = this.add(Label("The same two transformations follow different journeys—and land differently.").height(0.17).color(GRAY_B).typewriter(), { at: [0, 2.34, 0] });
    this.add(Label("scale → rotate").height(0.22).color(BLUE_B), { at: [-3.05, 1.76, 0] });
    this.add(Label("rotate → scale").height(0.22).color(GOLD_B), { at: [3.05, 1.76, 0] });
    const conclusion = this.add(Label("BAx ≠ ABx: matrix multiplication is not commutative.").height(0.21).color(TEAL_C).opacity(0), { at: [0, -2.68, 0] });

    const timeline = new Timeline();
    timeline.animate(title).at(0).duration(0.8).ease("linear").typewrite();
    timeline.animate(subtitle).at(0.25).duration(1.25).ease("linear").typewrite();
    timeline.animate(left).at(1.2).duration(2).ease("inOutCubic").to(left.matrixState(scale[0], scale[1]));
    timeline.animate(right).at(1.2).duration(2).ease("inOutCubic").to(right.matrixState(rotate[0], rotate[1]));
    timeline.animate(left).at(3.65).duration(2.5).ease("inOutCubic").to(left.matrixState(rotateAfterScale[0], rotateAfterScale[1]));
    timeline.animate(right).at(3.65).duration(2.5).ease("inOutCubic").to(right.matrixState(scaleAfterRotate[0], scaleAfterRotate[1]));
    timeline.animate(conclusion).at(5.8).duration(0.8).appear();
    this.play(timeline);
    if (this.duration < 7.2) this.wait(7.2 - this.duration);
  }
}

function compose(later: readonly [Vec2, Vec2], earlier: readonly [Vec2, Vec2]): readonly [Vec2, Vec2] {
  const apply = (point: Vec2): Vec2 => [
    later[0][0] * point[0] + later[1][0] * point[1],
    later[0][1] * point[0] + later[1][1] * point[1],
  ];
  return [apply(earlier[0]), apply(earlier[1])];
}

render(import.meta.url, TransformOrder, { fps: 60 });
