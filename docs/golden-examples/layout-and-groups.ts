/**
 * Golden API contract. See examples/layout-and-groups.ts for the runnable implementation.
 * Original reference: Murali examples/layout_and_groups.rs.
 */
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
} from "murali-js";

class LayoutAndGroups extends Scene {
  construct() {
    const title = this.add(Label("Layout and Groups").height(0.38).color("white"));
    this.toEdge(title, "up", { margin: 0.8 });

    const anchor = this.add(Square().size(1.05).fill("redB"), { at: [-5, 0.1, 0] });
    const label = this.add(Label("aligned by helper").height(0.2).color("white"));
    this.nextTo(label, anchor, "up", { gap: 0.28 });
    this.alignTo(label, anchor, "left");

    const stages = this.add(
      HStack(
        [
          Label("Input").color("blueB"),
          Label("Hidden").color("tealC"),
          Label("Output").color("goldC"),
        ],
        { gap: 0.42 },
      ),
      { at: [-0.7, 0.35, 0] },
    );

    const loop = this.add(
      VStack(
        [Label("Observe"), Label("Reason"), Label("Act")],
        { gap: 0.22 },
      ),
      { at: [3.45, 0.15, 0] },
    );

    const cluster = this.add(
      Group([
        Square().size(0.72).fill("orangeB"),
        Circle().radius(0.34).fill("greenD"),
        Square().size(0.52).fill("purpleB"),
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

    this.play(timeline);
  }
}

render(import.meta.url, LayoutAndGroups);
