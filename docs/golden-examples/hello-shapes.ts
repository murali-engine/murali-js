/**
 * Golden API example: aspirational authoring contract, not part of the current build.
 * Original reference: Murali examples/hello_shapes.rs.
 */
import {
  Circle,
  Label,
  Polygon,
  Rectangle,
  Scene,
  Square,
  clip,
  render,
  timeline,
} from "venu";

class HelloShapes extends Scene {
  construct() {
    const title = this.add(Label("Hello Shapes").height(0.38).color("white"));
    this.toEdge(title, "up", { margin: 0.8 });

    const subtitle = this.add(
      Label("A first scene with a few core primitives placed by hand.")
        .height(0.18)
        .color("grayB"),
      { at: [0, 2.95, 0] },
    );

    const square = this.add(
      Square().size(1.25).fill("redB").stroke({ width: 0.04, color: "white" }),
      { at: [-5.2, 0.4, 0] },
    );
    const circle = this.add(
      Circle().radius(0.7).fill("greenD").stroke({ width: 0.04, color: "white" }),
      { at: [-1.8, 0.4, 0] },
    );
    const rectangle = this.add(
      Rectangle().size([1.9, 1.05]).fill("blueD").stroke({ width: 0.04, color: "white" }),
      { at: [1.9, 0.4, 0] },
    );
    const polygon = this.add(
      Polygon.regular(6).radius(0.8).fill("goldC").stroke({ width: 0.04, color: "white" }),
      { at: [5.3, 0.4, 0] },
    );

    const introduction = clip((local) => {
      local.animate(title).duration(1).ease("linear").typewrite();
      local.animate(subtitle).at(0.35).duration(1.3).ease("linear").typewrite();
    });

    const shapeEntrance = clip((local) => {
      local
        .animate([square, circle, rectangle, polygon])
        .stagger(1.2)
        .duration(0.95)
        .ease("outCubic")
        .appear();
    });

    this.play(
      timeline()
        .then(introduction)
        .overlap(shapeEntrance, { by: 0.15 }),
    );
  }
}

render(import.meta.url, HelloShapes);
