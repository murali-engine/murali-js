import {
  BLUE_B,
  Circle,
  GOLD_C,
  GRAY_B,
  Group,
  Label,
  Line,
  RED_B,
  Scene,
  TEAL_C,
  Timeline,
  VectorField,
  WHITE,
  render,
} from "venu";
import type { Vec2 } from "venu";

/** Port of Murali `examples/force_fields.rs`. Charges and arrows are both functions of scene time. */
class ForceFields extends Scene {
  constructor() {
    super({ viewWidth: 16 });
  }

  override construct(): void {
    const title = this.add(Label("Force Fields").height(0.38).color(WHITE).typewriter());
    this.toEdge(title, "up", { margin: 0.8 });
    const subtitle = this.add(Label(
      "Move the charges and the field responds continuously, instead of staying a fixed picture.",
    ).height(0.18).color(GRAY_B).typewriter(), { at: [0, 3.05, 0] });
    const heading = this.add(Label("Live charge motion").height(0.2).color(GRAY_B).typewriter(), { at: [0, 2.4, 0] });
    const field = this.add(VectorField([-3.4, 3.4], [-2, 2], 15, 9, (point, time) => fieldAt(point, time))
      .color(BLUE_B)
      .lengthScale(0.34)
      .arrowStyle(0.02, 0.08, 0.06), { at: [0, -0.05, 0] });
    const initial = charges(0);
    const positive = this.add(Circle().radius(0.16).fill(RED_B).stroke({ color: WHITE, width: 0.03 }), {
      at: [initial.positive[0], initial.positive[1] - 0.05, 0],
    });
    const negative = this.add(Circle().radius(0.16).fill(TEAL_C).stroke({ color: WHITE, width: 0.03 }), {
      at: [initial.negative[0], initial.negative[1] - 0.05, 0],
    });
    const plus = this.add(Label("+").height(0.18).color(WHITE).typewriter(), {
      at: [initial.positive[0], initial.positive[1] - 0.05, 0],
    });
    const minus = this.add(Label("-").height(0.18).color(WHITE).typewriter(), {
      at: [initial.negative[0], initial.negative[1] - 0.05, 0],
    });
    const path = this.add(optimizationPath(), { at: [0, -0.05, 0] });
    const footer = this.add(Label(
      "This is the right mental model for force fields: charges move, and the arrows update with them.",
    ).height(0.17).color(GRAY_B).typewriter(), { at: [0, -3.1, 0] });

    this.updater((time, states) => {
      const pose = charges(time);
      place(states.get(positive), pose.positive);
      place(states.get(negative), pose.negative);
      place(states.get(plus), pose.positive);
      place(states.get(minus), pose.negative);
    });

    const timeline = new Timeline();
    timeline.animate(title).at(0).duration(1).ease("linear").typewrite();
    timeline.animate(subtitle).at(0.35).duration(1.6).ease("linear").typewrite();
    timeline.animate(heading).at(1.4).duration(0.8).ease("linear").typewrite();
    timeline.animate(field).at(1.8).duration(1).ease("linear").appear();
    timeline.animate(positive).at(2).duration(0.5).ease("linear").appear();
    timeline.animate(negative).at(2.1).duration(0.5).ease("linear").appear();
    timeline.animate(plus).at(2.15).duration(0.4).ease("linear").typewrite();
    timeline.animate(minus).at(2.25).duration(0.4).ease("linear").typewrite();
    timeline.animate(path).at(2.55).duration(0.6).ease("outCubic").appear();
    timeline.animate(footer).at(3).duration(1.8).ease("linear").typewrite();
    this.play(timeline);
  }
}

function place(state: { x: number; y: number } | undefined, point: Vec2): void {
  if (!state) return;
  state.x = point[0];
  state.y = point[1] - 0.05;
}

function charges(time: number): { positive: Vec2; negative: Vec2 } {
  return {
    positive: [-0.9 + 0.75 * Math.sin(0.9 * time), 0.45 * Math.cos(0.6 * time)],
    negative: [0.9 + 0.55 * Math.cos(0.7 * time + 1.2), -0.4 * Math.sin(0.8 * time)],
  };
}

function fieldAt(point: Vec2, time: number): Vec2 {
  const pose = charges(time);
  const positive = force(point, pose.positive, 1);
  const negative = force(point, pose.negative, -1);
  return [(positive[0] + negative[0]) * 0.6, (positive[1] + negative[1]) * 0.6];
}

function force(point: Vec2, charge: Vec2, sign: number): Vec2 {
  const offset: Vec2 = [point[0] - charge[0], point[1] - charge[1]];
  const distance = Math.max(0.24, Math.hypot(offset[0], offset[1]));
  const scale = sign / (distance * distance * distance);
  return [offset[0] * scale, offset[1] * scale];
}

function optimizationPath() {
  const points: Vec2[] = [[-2.7, -1.45], [-1.9, -1.15], [-1.2, -0.92], [-0.55, -0.78], [-0.05, -0.72]];
  const segments = points.slice(0, -1).map((point, index) => Line()
    .from(point)
    .to(points[index + 1] ?? point)
    .stroke({ color: GOLD_C, width: 0.025 }));
  const marks = points.flatMap((point) => [
    Line().from([point[0] - 0.07, point[1]]).to([point[0] + 0.07, point[1]]).stroke({ color: GOLD_C, width: 0.025 }),
    Line().from([point[0], point[1] - 0.07]).to([point[0], point[1] + 0.07]).stroke({ color: GOLD_C, width: 0.025 }),
  ]);
  return Group([...segments, ...marks]);
}

render(import.meta.url, ForceFields);
