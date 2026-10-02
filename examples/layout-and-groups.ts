import { render } from "murali-js";
import { Scene, Timeline } from "murali-js/core";
import { palette } from "murali-js/style";
import { Circle, Square } from "murali-js/primitives";
import { Label } from "murali-js/text";
const { BLUE_B, GRAY_A, GRAY_B, GOLD_C, GREEN_D, ORANGE_B, PURPLE_B, RED_B, TEAL_C, WHITE } = palette;
import type { Tattva, Vec3 } from "murali-js/core";

/** Port of Murali `examples/layout_and_groups.rs`. */
class LayoutAndGroups extends Scene {
  override construct(): void {
    const title = this.add(
      Label("Layout And Groups").height(0.38).color(WHITE),
      { at: [0, 3, 0] },
    );
    const subtitle = this.add(
      Label("Good layout helpers should visibly remove guesswork: align one thing, stack many things, move a whole cluster together.")
        .height(0.18)
        .color(GRAY_B),
      { at: [0, 2.42, 0] },
    );

    const anchoredHeading = this.add(
      Label("Anchor One Label").height(0.19).color(GRAY_B),
      { at: [-4.8, 1.45, 0] },
    );
    const anchoredSquare = this.add(
      Square().size(1.05).fill(RED_B).stroke({ width: 0.04, color: WHITE }),
      { at: [-5, 0.1, 0] },
    );
    const anchoredLabel = this.add(
      Label("aligned by helper").height(0.2).color(WHITE),
      { at: [-6.2, -0.95, 0] },
    );
    this.nextTo(anchoredLabel, anchoredSquare, "up", { gap: 0.28 });
    this.alignTo(anchoredLabel, anchoredSquare, "left");
    const anchoredLabelTarget = pointOf(anchoredLabel);
    anchoredLabel.at([-6.2, -0.95, 0]);
    const anchoredCaption = this.add(
      Label("Start anywhere. Then `next_to`\nand `align_to` place it cleanly.")
        .height(0.145)
        .color(GRAY_A),
      { at: [-4.85, -1.65, 0] },
    );

    const stackHeading = this.add(
      Label("Resolve A Mess Into Stacks").height(0.19).color(GRAY_B),
      { at: [0, 1.45, 0] },
    );
    const input = this.add(Label("Input").height(0.24).color(BLUE_B));
    const hidden = this.add(Label("Hidden").height(0.24).color(TEAL_C));
    const output = this.add(Label("Output").height(0.24).color(GOLD_C));
    placeInRow(this, [input, hidden, output], 0.42);
    const rowTargets = positionsAfterMoveTo([input, hidden, output], [-0.7, 0.35]);
    input.at([-1.4, 0.95, 0]);
    hidden.at([0.6, -0.1, 0]);
    output.at([1.25, 1, 0]);

    const observe = this.add(Label("Observe").height(0.22).color(GRAY_A));
    const reason = this.add(Label("Reason").height(0.22).color(GRAY_A));
    const act = this.add(Label("Act").height(0.22).color(GRAY_A));
    placeInColumn(this, [observe, reason, act], 0.22);
    const columnTargets = positionsAfterMoveTo([observe, reason, act], [3.45, 0.15]);
    observe.at([2.55, 0.95, 0]);
    reason.at([4.15, 0.25, 0]);
    act.at([2.35, -0.55, 0]);
    const stackCaption = this.add(
      Label("`HStack` and `VStack`\nturn clutter into reading order.")
        .height(0.145)
        .color(GRAY_A),
      { at: [1.35, -1.65, 0] },
    );

    const groupHeading = this.add(
      Label("Move A Whole Cluster").height(0.19).color(GRAY_B),
      { at: [0, -2.05, 0] },
    );
    const groupSquare = this.add(
      Square().size(0.72).fill(ORANGE_B).stroke({ width: 0.035, color: WHITE }),
      { at: [-4.45, -3.05, 0] },
    );
    const groupCircle = this.add(
      Circle().radius(0.34).fill(GREEN_D).stroke({ width: 0.035, color: WHITE }),
      { at: [-3.35, -3.05, 0] },
    );
    const groupSmallSquare = this.add(
      Square().size(0.52).fill(PURPLE_B).stroke({ width: 0.035, color: WHITE }),
      { at: [-2.35, -3.05, 0] },
    );
    const cluster = [groupSquare, groupCircle, groupSmallSquare];
    const clusterTargets = positionsAfterMoveTo(cluster, [3.15, -3.05]);
    const groupCaption = this.add(
      Label("One `Group.move_to` keeps spacing intact\nwhile the whole cluster travels.")
        .height(0.145)
        .color(GRAY_A),
      { at: [0, -4.15, 0] },
    );

    const timeline = new Timeline();
    timeline.animate(title).at(0).duration(1.2).ease("linear").typewrite();
    timeline.animate(subtitle).at(0.35).duration(2.1).ease("linear").typewrite();

    timeline.animate(anchoredHeading).at(1.8).duration(1).ease("linear").typewrite();
    timeline.animate(anchoredSquare).at(2.35).duration(1).ease("outCubic").draw();
    timeline.animate(anchoredLabel).at(2.8).duration(0.95).ease("linear").typewrite();
    timeline.animate(anchoredLabel).at(3.95).duration(1.8).ease("inOutCubic").moveTo(anchoredLabelTarget);
    timeline.animate(anchoredCaption).at(4.55).duration(1.45).ease("linear").typewrite();

    timeline.animate(stackHeading).at(5.8).duration(1).ease("linear").typewrite();
    for (const [item, at] of [[input, 6.45], [hidden, 6.8], [output, 7.15]] as const) {
      timeline.animate(item).at(at).duration(0.75).ease("linear").typewrite();
    }
    for (const [item, at] of [[observe, 6.95], [reason, 7.3], [act, 7.65]] as const) {
      timeline.animate(item).at(at).duration(0.75).ease("linear").typewrite();
    }
    [input, hidden, output].forEach((item, index) => {
      timeline.animate(item).at(8.7).duration(1.8).ease("inOutCubic").moveTo(rowTargets[index]);
    });
    [observe, reason, act].forEach((item, index) => {
      timeline.animate(item).at(9.2).duration(1.8).ease("inOutCubic").moveTo(columnTargets[index]);
    });
    timeline.animate(stackCaption).at(10.2).duration(1.5).ease("linear").typewrite();

    timeline.animate(groupHeading).at(11.85).duration(1).ease("linear").typewrite();
    cluster.forEach((item, index) => {
      timeline.animate(item).at(12.5 + index * 0.28).duration(0.8).ease("outCubic").draw();
    });
    cluster.forEach((item, index) => {
      timeline.animate(item).at(13.9).duration(2).ease("inOutCubic").moveTo(clusterTargets[index]);
    });
    timeline.animate(groupCaption).at(14.75).duration(1.55).ease("linear").typewrite();
    this.play(timeline);
  }
}

render(import.meta.url, LayoutAndGroups);

function placeInRow(scene: Scene, items: readonly Tattva[], gap: number): void {
  for (let index = 1; index < items.length; index += 1) {
    scene.nextTo(items[index], items[index - 1], "right", { gap });
    scene.alignTo(items[index], items[0], "down");
  }
}

function placeInColumn(scene: Scene, items: readonly Tattva[], gap: number): void {
  for (let index = 1; index < items.length; index += 1) {
    scene.nextTo(items[index], items[index - 1], "down", { gap });
    scene.alignTo(items[index], items[0], "left");
  }
}

function positionsAfterMoveTo(items: readonly Tattva[], [centerX, centerY]: readonly [number, number]): Vec3[] {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const item of items) {
    const size = item.getLayoutSize();
    const { x, y } = item.initialState;
    minX = Math.min(minX, x - size.width / 2);
    maxX = Math.max(maxX, x + size.width / 2);
    minY = Math.min(minY, y - size.height / 2);
    maxY = Math.max(maxY, y + size.height / 2);
  }
  const dx = centerX - (minX + maxX) / 2;
  const dy = centerY - (minY + maxY) / 2;
  return items.map((item) => [item.initialState.x + dx, item.initialState.y + dy, item.initialState.z]);
}

function pointOf(item: Tattva): Vec3 {
  return [item.initialState.x, item.initialState.y, item.initialState.z];
}
