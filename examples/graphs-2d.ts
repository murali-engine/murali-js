import {
  Axes,
  BLUE_B,
  GRAY_A,
  GRAY_B,
  GOLD_C,
  Group,
  Label,
  NumberPlane,
  ORANGE_B,
  PlotLegend,
  ScatterPlot,
  Scene,
  Timeline,
  WHITE,
  render,
  worldPath,
} from "venu";

/** Port of Murali `examples/graphs_2d.rs`. */
class Graphs2D extends Scene {
  override construct(): void {
    const title = this.add(Label("2D Graphs").height(0.38).color(WHITE));
    this.toEdge(title, "up", { margin: 0.8 });
    const subtitle = this.add(
      Label("A simple graphing scene with a plane, axes, one sine wave, sampled points, and labels.")
        .height(0.18)
        .color(GRAY_B),
      { at: [0, 2.95, 0] },
    );

    const plane = this.add(NumberPlane([-7, 7], [-1.8, 1.8]).step(1).build(), { at: [0, -0.1, 0] });
    const axes = this.add(
      Axes([-7, 7], [-1.8, 1.8]).step(1).thickness(0.028).tickSize(0.14).color(GRAY_A).build(),
      { at: [0, -0.1, 0] },
    );

    const curve = sinePath(-2 * Math.PI, 2 * Math.PI, 420);
    this.add(Group([curve]), { at: [0, -0.1, 0] });
    const points = this.add(
      ScatterPlot([
        [-3 * Math.PI / 2, Math.sin(-3 * Math.PI / 2)],
        [-Math.PI / 2, Math.sin(-Math.PI / 2)],
        [Math.PI / 2, Math.sin(Math.PI / 2)],
        [3 * Math.PI / 2, Math.sin(3 * Math.PI / 2)],
      ]).build(),
      { at: [0, -0.1, 0] },
    );

    const equation = this.add(Label("y = sin(x)").height(0.22).color(BLUE_B), { at: [0, 2, 0] });
    const legend = this.add(
      PlotLegend([
        { label: "sine curve", color: BLUE_B },
        { label: "sampled extrema", color: GOLD_C },
      ]).textColor(GRAY_B).build(),
      { at: [4.4, 1.45, 0] },
    );
    const xLabel = this.add(Label("x").height(0.22).color(ORANGE_B), { at: [4.45, -0.15, 0] });
    const yLabel = this.add(Label("y").height(0.22).color(BLUE_B), { at: [0.15, 2.45, 0] });
    const footer = this.add(
      Label("Start with one function and a few observations before layering more graphing ideas.")
        .height(0.17)
        .color(GRAY_B),
      { at: [0, -3.1, 0] },
    );

    const timeline = new Timeline();
    timeline.animate(title).at(0).duration(1).ease("linear").typewrite();
    timeline.animate(subtitle).at(0.35).duration(1.6).ease("linear").typewrite();
    timeline.animate(plane).at(1.4).duration(1).ease("linear").appear();
    timeline.animate(axes).at(1.7).duration(0.9).ease("linear").appear();
    timeline.animate(equation).at(2.6).duration(1).ease("linear").typewrite();
    timeline.animate(legend).at(2.75).duration(0.55).ease("outCubic").appear();
    timeline.animate(xLabel).at(2.9).duration(0.6).ease("linear").typewrite();
    timeline.animate(yLabel).at(3.1).duration(0.6).ease("linear").typewrite();
    timeline.animate(curve).at(3.5).duration(10).ease("linear").draw();
    timeline.animate(points).at(13).duration(1).ease("linear").appear();
    timeline.animate(footer).at(13.6).duration(1.6).ease("linear").typewrite();
    this.play(timeline);
  }
}

render(import.meta.url, Graphs2D);

function sinePath(start: number, end: number, samples: number) {
  const count = Math.max(2, samples);
  const step = (end - start) / (count - 1);
  const path = worldPath().moveTo(start, Math.sin(start));
  for (let index = 1; index < count; index += 1) {
    const x = start + index * step;
    path.lineTo(x, Math.sin(x));
  }
  return path.stroke({ color: BLUE_B, width: 0.06 });
}
