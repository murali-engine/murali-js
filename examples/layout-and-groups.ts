import {
  Circle,
  Group,
  HStack,
  Label,
  Scene,
  Square,
  Timeline,
  VStack,
  render,
} from "venu";

class LayoutAndGroups extends Scene {
  override construct(): void {
    const title = this.add(Label("Layout and Groups").height(0.38).color("white"));
    this.toEdge(title, "up", { margin: 0.8 });

    const anchor = this.add(Square().size(1.05).fill("#ef4444"), { at: [-5, 0.1, 0] });
    const label = this.add(Label("aligned by helper").height(0.2).color("white"));
    this.nextTo(label, anchor, "up", { gap: 0.28 });
    this.alignTo(label, anchor, "left");

    const stages = this.add(
      HStack(
        [
          Label("Input").height(0.3).color("#60a5fa"),
          Label("Hidden").height(0.3).color("#2dd4bf"),
          Label("Output").height(0.3).color("#fbbf24"),
        ],
        { gap: 0.42 },
      ),
      { at: [-0.7, 0.35, 0] },
    );

    const loop = this.add(
      VStack(
        [
          Label("Observe").height(0.28),
          Label("Reason").height(0.28),
          Label("Act").height(0.28),
        ],
        { gap: 0.22 },
      ),
      { at: [3.45, 0.15, 0] },
    );

    const cluster = this.add(
      Group([
        Square().size(0.72).fill("#f97316"),
        Circle().radius(0.34).fill("#16a34a"),
        Square().size(0.52).fill("#a855f7"),
      ]).layout(HStack, { gap: 0.35 }),
      { at: [-3.4, -3.05, 0] },
    );

    const timeline = new Timeline();
    timeline.animate(title).at(0).duration(1).typewrite();
    timeline.animate(anchor).at(0.8).duration(0.8).appear();
    timeline.animate(label).at(1.2).duration(0.8).typewrite();
    timeline.animate(stages).at(2).duration(1.4).ease("inOutCubic").appear();
    timeline.animate(loop).at(2.4).duration(1.4).ease("inOutCubic").appear();
    timeline.animate(cluster).at(4).duration(2).ease("inOutCubic").moveTo([3.15, -3.05, 0]);
    timeline.animate(cluster).at(4).duration(2).ease("inOutCubic").rotateTo(360);
    this.play(timeline);
  }
}

render(import.meta.url, LayoutAndGroups);
