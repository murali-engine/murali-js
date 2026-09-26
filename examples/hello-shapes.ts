import {
  Circle,
  Label,
  Polygon,
  Rectangle,
  Scene,
  Square,
  Timeline,
  render,
} from "venu";

class HelloShapes extends Scene {
  override construct(): void {
    const title = this.add(Label("Hello Shapes").height(0.38).color("white"));
    this.toEdge(title, "up", { margin: 0.8 });

    const subtitle = this.add(
      Label("A first scene with a few core primitives placed by hand.")
        .height(0.18)
        .color("#94a3b8"),
      { at: [0, 2.95, 0] },
    );

    const square = this.add(
      Square()
        .size(1.25)
        .fill("#ef4444")
        .stroke({ width: 0.04, color: "white" })
        .css({ filter: "drop-shadow(0px 0px 0px rgb(239 68 68 / 0%))" })
        .cssVar("--shape-accent", "#ef4444"),
      { at: [-5.2, 0.4, 0] },
    );
    const circle = this.add(
      Circle().radius(0.7).fill("#16a34a").stroke({ width: 0.04, color: "white" }),
      { at: [-1.8, 0.4, 0] },
    );
    const rectangle = this.add(
      Rectangle().size([1.9, 1.05]).fill("#2563eb").stroke({ width: 0.04, color: "white" }),
      { at: [1.9, 0.4, 0] },
    );
    const polygon = this.add(
      Polygon.regular(6).radius(0.8).fill("#f59e0b").stroke({ width: 0.04, color: "white" }),
      { at: [5.3, 0.4, 0] },
    );

    const timeline = new Timeline();
    timeline.animate(title).at(0).duration(1).ease("linear").typewrite();
    timeline.animate(subtitle).at(0.35).duration(1.3).ease("linear").typewrite();
    [square, circle, rectangle, polygon].forEach((shape, index) => {
      timeline.animate(shape).at(1.5 + index * 1.2).duration(0.95).ease("outCubic").appear();
    });
    timeline.animate(square).at(1.5).duration(0.95).ease("outCubic").setStyle({
      filter: "drop-shadow(0px 16px 24px rgb(239 68 68 / 45%))",
    });
    this.play(timeline);
  }
}

render(import.meta.url, HelloShapes);
