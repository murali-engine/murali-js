import { render } from "murali-js";
import { Scene, Timeline } from "murali-js/core";
import { palette } from "murali-js/style";
import { Circle, Polygon, Rectangle, Square } from "murali-js/primitives";
import { Label } from "murali-js/text";
const { BLUE_D, GRAY_A, GRAY_B, GOLD_C, GREEN_D, RED_B, WHITE } = palette;

/** Port of Murali `examples/hello_shapes.rs`. */
class HelloShapes extends Scene {
  override construct(): void {
    const title = this.add(Label("Hello Shapes").height(0.38).color(WHITE));
    this.toEdge(title, "up", { margin: 0.8 });

    const subtitle = this.add(
      Label("A first scene with a few core primitives placed by hand.")
        .height(0.18)
        .color(GRAY_B),
      { at: [0, 2.95, 0] },
    );

    const square = this.add(
      Square().size(1.25).fill(RED_B).stroke({ width: 0.04, color: WHITE }),
      { at: [-5.2, 0.4, 0] },
    );
    const squareLabel = this.add(
      Label("Square").height(0.2).color(GRAY_A),
      { at: [-5.2, -1, 0] },
    );
    const circle = this.add(
      Circle().radius(0.7).fill(GREEN_D).stroke({ width: 0.04, color: WHITE }),
      { at: [-1.8, 0.4, 0] },
    );
    const circleLabel = this.add(
      Label("Circle").height(0.2).color(GRAY_A),
      { at: [-1.8, -1, 0] },
    );
    const rectangle = this.add(
      Rectangle().size([1.9, 1.05]).fill(BLUE_D).stroke({ width: 0.04, color: WHITE }),
      { at: [1.9, 0.4, 0] },
    );
    const rectangleLabel = this.add(
      Label("Rectangle").height(0.2).color(GRAY_A),
      { at: [1.9, -1, 0] },
    );
    const polygon = this.add(
      Polygon.regular(6).radius(0.8).fill(GOLD_C).stroke({ width: 0.04, color: WHITE }),
      { at: [5.3, 0.4, 0] },
    );
    const polygonLabel = this.add(
      Label("Polygon").height(0.2).color(GRAY_A),
      { at: [5.3, -1, 0] },
    );
    const footer = this.add(
      Label("This example is intentionally simple: primitives first, composition later.")
        .height(0.17)
        .color(GRAY_B),
      { at: [0, -2.8, 0] },
    );

    const shapes = [
      [square, squareLabel],
      [circle, circleLabel],
      [rectangle, rectangleLabel],
      [polygon, polygonLabel],
    ] as const;

    const timeline = new Timeline();
    timeline.animate(title).at(0).duration(1).ease("linear").typewrite();
    timeline.animate(subtitle).at(0.35).duration(1.3).ease("linear").typewrite();
    shapes.forEach(([shape, label], index) => {
      const start = 1.5 + index * 1.2;
      timeline.animate(shape).at(start).duration(0.95).ease("outCubic").draw();
      timeline.animate(label).at(start + 0.45).duration(0.7).ease("linear").typewrite();
    });
    timeline.animate(footer).at(6.6).duration(1.8).ease("linear").typewrite();
    this.play(timeline);
  }
}

render(import.meta.url, HelloShapes);
