import {
  BLUE_B,
  BLUE_D,
  Circle,
  GOLD_C,
  GRAY_A,
  GRAY_B,
  GRAY_C,
  GREEN_C,
  Label,
  Line,
  ORANGE_C,
  PINK_C,
  PURPLE_B,
  Rectangle,
  Scene,
  SceneView,
  TEAL_C,
  Timeline,
  WHITE,
  render,
} from "murali-js";
import type { CircleTattva, LabelTattva, RectangleTattva, Vec3 } from "murali-js";

/**
 * Port of Murali `examples/scene_view.rs`.
 * The network is a child scene whose clock loops while the parent explains it.
 */
class HandBuiltTransformer extends Scene {
  override construct(): void {
    const columns: Vec3[][] = [
      [[-5.5, -1.45, 0], [-5.5, 0, 0], [-5.5, 1.45, 0]],
      [[-3, -2, 0], [-3, -0.68, 0], [-3, 0.68, 0], [-3, 2, 0]],
      [[-0.45, -2.1, 0], [-0.45, -1.05, 0], [-0.45, 0, 0], [-0.45, 1.05, 0], [-0.45, 2.1, 0]],
      [[2.15, -2, 0], [2.15, -0.68, 0], [2.15, 0.68, 0], [2.15, 2, 0]],
      [[5.05, -1.35, 0], [5.05, 0, 0], [5.05, 1.35, 0]],
    ];
    const colors = [BLUE_D, TEAL_C, PURPLE_B, ORANGE_C, GREEN_C];
    const headings = ["TOKENS", "EMBED", "ATTENTION", "MLP", "NEXT TOKEN"];
    columns.forEach((column, index) => {
      const color = colors[index] ?? BLUE_D;
      this.add(Rectangle().size([2.05, 5.55]).cornerRadius(0.24).fill(rgba(color, 0.08)).stroke({
        color: rgba(color, 0.34),
        width: 0.025,
      }).layer(-2), { at: [column[0]?.[0] ?? 0, -0.15, -0.2] });
    });
    for (let index = 0; index < columns.length - 1; index += 1) {
      connect(this, columns[index] ?? [], columns[index + 1] ?? [], colors[index + 1] ?? TEAL_C);
    }
    columns.forEach((column, index) => {
      const color = colors[index] ?? BLUE_D;
      this.add(Label(headings[index] ?? "").height(0.17).color(rgba(color, 0.95)), {
        at: [column[0]?.[0] ?? 0, 2.95, 0.1],
      });
      for (const position of column) node(this, position, color);
    });
    for (const [token, y] of [["scene", 1.45], ["views", 0], ["work", -1.45]] as const) {
      this.add(Label(token).height(0.13).color(WHITE), { at: [-5.5, y, 0.12] });
    }
    for (const [label, probability, y, color] of [
      ["beautiful", "0.62", 1.35, GREEN_C],
      ["together", "0.24", 0, BLUE_B],
      ["smoothly", "0.09", -1.35, GOLD_C],
    ] as const) {
      this.add(Label(label).height(0.13).color(WHITE), { at: [5.05, y + 0.12, 0.12] });
      this.add(Label(probability).height(0.11).color(color), { at: [5.05, y - 0.13, 0.12] });
    }
    this.add(Rectangle().size([4.3, 0.46]).cornerRadius(0.22).fill(rgba(BLUE_D, 0.12)).stroke({
      color: rgba(BLUE_B, 0.5),
      width: 0.025,
    }), { at: [0, -3.45, 0] });
    this.add(Label("LIVE FORWARD PASS  /  12.4 ms").height(0.15).color(BLUE_B), { at: [0, -3.45, 0.1] });

    const routes = [
      [columns[0]?.[0], columns[1]?.[2], columns[2]?.[3], columns[3]?.[2], columns[4]?.[0]],
      [columns[0]?.[1], columns[1]?.[1], columns[2]?.[2], columns[3]?.[1], columns[4]?.[1]],
      [columns[0]?.[2], columns[1]?.[3], columns[2]?.[1], columns[3]?.[0], columns[4]?.[2]],
    ];
    const timeline = new Timeline();
    routes.forEach((route, index) => {
      const points = route.filter((point): point is Vec3 => point !== undefined);
      const start = points[0] ?? [0, 0, 0];
      const pulse = this.add(Circle().radius(0.12).fill(pulseColor(index)).stroke({ color: WHITE, width: 0.035 }).layer(2), {
        at: [start[0], start[1], start[2] + 0.25],
      });
      activate(timeline, pulse, points, [0, 0.55, 1.1][index] ?? 0);
    });
    this.play(timeline);
    if (this.duration < 3.5) this.wait(3.5 - this.duration);
  }
}

class SceneViewExample extends Scene {
  override construct(): void {
    const view = this.add(SceneView(new HandBuiltTransformer())
      .size(14.7, 8.15)
      .background("rgb(5, 7, 11)")
      .cornerRadius(0.32)
      .border(0.055, rgba(BLUE_B, 0.85))
      .playback({ loop: 3.5 }));
    const heading = this.add(Label("Inside one forward pass").height(0.48).color(WHITE).typewriter(), { at: [-3.55, 3.25, 0] });
    const subtitle = this.add(Label("The live SceneView keeps running while the parent explains it.").height(0.18).color(rgba(GRAY_A, 0.78)), {
      at: [-3.55, 2.7, 0],
    });
    const accent = this.add(Line().from([-6.7, 2.42]).to([-0.4, 2.42]).stroke({ color: BLUE_D, width: 0.035 }));
    const cards = [
      card(this, [-5.05, 1.25, 0], "01", "Tokenize", "Words become stable\nvector identities.", BLUE_D),
      card(this, [-1.95, 1.25, 0], "02", "Attend", "Context decides which\nsignals matter now.", PURPLE_B),
      card(this, [-5.05, -0.85, 0], "03", "Transform", "Features mix through\nlearned nonlinear paths.", ORANGE_C),
      card(this, [-1.95, -0.85, 0], "04", "Decode", "The final state becomes\na probability distribution.", GREEN_C),
    ];
    const outputPanel = this.add(Rectangle().size([4.35, 2.45]).cornerRadius(0.22).fill(rgba(GREEN_C, 0.075)).stroke({
      color: rgba(GREEN_C, 0.55),
      width: 0.035,
    }), { at: [3.65, -1.45, 0] });
    const outputTitle = this.add(Label("NEXT TOKEN").height(0.17).color(GREEN_C).typewriter(), { at: [3.65, -0.65, 0.08] });
    const outputWord = this.add(Label("beautiful").height(0.44).color(WHITE).typewriter(), { at: [3.15, -1.35, 0.08] });
    const outputProbability = this.add(Label("62%").height(0.32).color(GOLD_C).typewriter(), { at: [5.05, -1.35, 0.08] });
    const outputNote = this.add(Label("P(next | scene, views, work)").height(0.15).color(GRAY_C).typewriter(), { at: [3.65, -2.15, 0.08] });

    const timeline = new Timeline();
    timeline.animate(view).at(1.55).duration(0.95).ease("inOutCubic").moveTo([5.05, 2.65, 0]);
    timeline.animate(view).at(1.55).duration(0.95).ease("inOutCubic").scale3DTo([0.35, 0.35, 1]);
    timeline.animate(view).at(1.55).duration(0.95).ease("inOutCubic").rotateTo(-0.035 * 180 / Math.PI);
    timeline.animate(heading).at(2.05).duration(0.8).ease("linear").typewrite();
    timeline.animate(subtitle).at(2.3).duration(0.65).ease("outCubic").appear();
    timeline.animate(accent).at(2.35).duration(0.7).ease("outCubic").draw();
    cards.forEach((ids, index) => scheduleCard(timeline, ids, 2.75 + index * 0.42));
    timeline.animate(outputPanel).at(4.5).duration(0.5).ease("outCubic").appear();
    [outputTitle, outputWord, outputProbability, outputNote].forEach((label, index) => {
      timeline.animate(label).at(4.62 + index * 0.16).duration(0.55).ease("linear").typewrite();
    });
    for (const item of [heading, subtitle, accent, outputPanel, outputTitle, outputWord, outputProbability, outputNote, ...cards.flat()]) {
      timeline.animate(item).at(6.55).duration(0.45).ease("inOutCubic").fadeTo(0);
    }
    timeline.animate(view).at(6.85).duration(1).ease("inOutCubic").moveTo([0, 0, 0]);
    timeline.animate(view).at(6.85).duration(1).ease("inOutCubic").scaleTo(1);
    timeline.animate(view).at(6.85).duration(1).ease("inOutCubic").rotateTo(0);
    this.play(timeline);
    if (this.duration < 8) this.wait(8 - this.duration);
  }
}

function node(scene: Scene, position: Vec3, color: string): void {
  scene.add(Circle().radius(0.34).fill(rgba(color, 0.13)), { at: position });
  scene.add(Circle().radius(0.22).fill(color).stroke({ color: rgba(WHITE, 0.9), width: 0.035 }), {
    at: [position[0], position[1], position[2] + 0.02],
  });
}

function connect(scene: Scene, from: Vec3[], to: Vec3[], color: string): void {
  from.forEach((start, index) => {
    for (let offset = 0; offset < Math.min(2, to.length); offset += 1) {
      const end = to[(index + offset) % to.length];
      if (!end) continue;
      scene.add(Line().from([start[0], start[1]]).to([end[0], end[1]]).stroke({
        color: rgba(color, 0.28),
        width: 0.024,
      }).layer(-1));
    }
  });
}

function activate(timeline: Timeline, pulse: CircleTattva, route: Vec3[], start: number): void {
  timeline.animate(pulse).at(start).duration(0.12).ease("outCubic").appear();
  route.slice(1).forEach((target, hop) => {
    timeline.animate(pulse).at(start + hop * 0.55).duration(0.55).ease("inOutCubic").moveTo([
      target[0],
      target[1],
      target[2] + 0.25,
    ]);
  });
  timeline.animate(pulse).at(start + (route.length - 1) * 0.55 - 0.18).duration(0.3).ease("outCubic").fadeTo(0);
}

function card(scene: Scene, position: Vec3, number: string, title: string, detail: string, color: string): [RectangleTattva, LabelTattva, LabelTattva, LabelTattva] {
  return [
    scene.add(Rectangle().size([2.75, 1.72]).cornerRadius(0.18).fill(rgba(color, 0.09)).stroke({
      color: rgba(color, 0.65),
      width: 0.035,
    }), { at: position }),
    scene.add(Label(number).height(0.18).color(color).typewriter(), {
      at: [position[0] - 1.03, position[1] + 0.52, position[2] + 0.08],
    }),
    scene.add(Label(title).height(0.22).color(WHITE).typewriter(), {
      at: [position[0], position[1] + 0.18, position[2] + 0.08],
    }),
    scene.add(Label(detail).height(0.135).color(GRAY_B).typewriter(), {
      at: [position[0], position[1] - 0.38, position[2] + 0.08],
    }),
  ];
}

function scheduleCard(timeline: Timeline, ids: readonly [RectangleTattva, LabelTattva, LabelTattva, LabelTattva], start: number): void {
  timeline.animate(ids[0]).at(start).duration(0.45).ease("outCubic").appear();
  ids.slice(1).forEach((id, offset) => {
    timeline.animate(id).at(start + 0.12 + offset * 0.08).duration(0.5).ease("linear").typewrite();
  });
}

function pulseColor(index: number): string {
  return [PINK_C, GOLD_C, BLUE_B][index] ?? PINK_C;
}

function rgba(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  return `rgba(${Number.parseInt(value.slice(0, 2), 16)}, ${Number.parseInt(value.slice(2, 4), 16)}, ${Number.parseInt(value.slice(4, 6), 16)}, ${alpha})`;
}

render(import.meta.url, SceneViewExample);
