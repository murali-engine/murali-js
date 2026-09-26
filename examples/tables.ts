import {
  GRAY_B,
  Label,
  Scene,
  TEAL_C,
  Table,
  Timeline,
  WHITE,
  render,
} from "venu";

/** Port of Murali `examples/tables.rs`. Rules draw first, then the cells type on, then the table unwrites. */
class Tables extends Scene {
  override construct(): void {
    const title = this.add(Label("Tables").height(0.38).color(WHITE).typewriter());
    this.toEdge(title, "up", { margin: 0.8 });
    const subtitle = this.add(Label(
      "One table, written in cleanly, held long enough to read, then unwritten.",
    ).height(0.18).color(GRAY_B).typewriter(), { at: [0, 2.95, 0] });
    const table = this.add(Table([
      ["Alice", "28", "NYC"],
      ["Bob", "34", "LA"],
      ["Charlie", "25", "Chicago"],
    ]).columnLabels(["Name", "Age", "City"])
      .rowLabels(["Person 1", "Person 2", "Person 3"])
      .title("Person Data")
      .lineColor(TEAL_C)
      .textColor(WHITE)
      .textHeight(0.25)
      .horizontalPadding(0.3)
      .verticalPadding(0.2)
      .outerLines(true), { at: [0, -0.05, 0] });
    const footer = this.add(Label(
      "Start with one readable table before exploring multiple table styles or transitions.",
    ).height(0.17).color(GRAY_B).typewriter(), { at: [0, -3.05, 0] });

    const timeline = new Timeline();
    timeline.animate(title).at(0).duration(1).ease("linear").typewrite();
    timeline.animate(subtitle).at(0.35).duration(1.5).ease("linear").typewrite();
    timeline.animate(table).at(1.8).duration(3.2).ease("inOutQuad").to({ revealProgress: 1 });
    timeline.animate(footer).at(2.4).duration(1.4).ease("linear").typewrite();
    timeline.animate(table).at(6.8).duration(2.2).ease("inOutQuad").to({ revealProgress: 0 });
    this.play(timeline);
  }
}

render(import.meta.url, Tables);
