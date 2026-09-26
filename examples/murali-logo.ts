import { BLUE_B, Circle, Line, Scene, Timeline, WHITE, render, worldPath } from "venu";
import type { Tattva } from "venu";

/** Port of Murali `examples/murali_logo.rs`, without the commented title and footer. */
class MuraliLogo extends Scene {
  override construct(): void {
    const frame = rgba(0.2, 0.72, 0.98, 0.52);
    const grid = rgba(0.2, 0.72, 0.98, 0.24);
    const axis = rgba(0.28, 0.84, 0.95, 0.86);
    const support = rgba(0.18, 0.58, 0.98, 0.88);
    const mark = rgba(0.18, 0.96, 0.76, 0.96);
    const handle = rgba(0.92, 0.98, 1, 0.18);
    const left = -3.2;
    const right = 3.2;
    const bottom = -2.4;
    const top = 2.4;

    const frameLines = [
      line(this, [left, bottom], [left, top], 0.035, frame),
      line(this, [left, top], [right, top], 0.035, frame),
      line(this, [right, top], [right, bottom], 0.035, frame),
      line(this, [right, bottom], [left, bottom], 0.035, frame),
    ];
    const gridLines = [
      [-2.4, 0.018], [-1.6, 0.02], [-0.8, 0.018], [0, 0.024], [0.8, 0.018], [1.6, 0.02], [2.4, 0.018],
    ].map(([x, thickness]) => line(this, [x, bottom], [x, top], thickness, grid));
    const gridRows = [
      line(this, [left, -1.8], [right, -1.8], 0.018, grid),
      line(this, [left, -1.2], [right, -1.2], 0.02, grid),
      line(this, [left, -0.6], [right, -0.6], 0.018, grid),
      line(this, [left, 0], [right, 0], 0.024, grid),
      line(this, [left, 0.6], [right, 0.6], 0.018, grid),
      line(this, [left, 1.2], [right, 1.2], 0.02, grid),
      line(this, [left, 1.8], [right, 1.8], 0.018, grid),
    ];
    const axisLines = [
      line(this, [left, 0], [right, 0], 0.045, axis),
      line(this, [0, bottom], [0, top], 0.045, axis),
    ];
    const supportPath = this.add(worldPath()
      .moveTo(-2.45, -1.62)
      .cubicTo(-1.85, -1.05, -0.92, -0.72, 0, -0.72)
      .cubicTo(0.92, -0.72, 1.85, -1.05, 2.45, -1.62)
      .stroke({ color: support, width: 0.085 }));
    const supportHandles = [
      line(this, [-2.45, -1.62], [-1.85, -1.05], 0.018, handle),
      line(this, [0, -0.72], [-0.92, -0.72], 0.018, handle),
      line(this, [0, -0.72], [0.92, -0.72], 0.018, handle),
      line(this, [2.45, -1.62], [1.85, -1.05], 0.018, handle),
    ];
    const markPath = this.add(worldPath()
      .moveTo(-2.55, -1.52)
      .cubicTo(-2.62, -0.18, -2.3, 1.52, -1.72, 1.86)
      .cubicTo(-1.18, 2.12, -0.58, 0.92, 0, 0.08)
      .cubicTo(0.58, 0.92, 1.18, 2.12, 1.72, 1.86)
      .cubicTo(2.3, 1.52, 2.62, -0.18, 2.55, -1.52)
      .stroke({ color: mark, width: 0.115 }));
    const markHandles = [
      line(this, [-2.55, -1.52], [-2.62, -0.18], 0.02, handle),
      line(this, [-1.72, 1.86], [-2.3, 1.52], 0.02, handle),
      line(this, [-1.72, 1.86], [-1.18, 2.12], 0.02, handle),
      line(this, [0, 0.08], [-0.58, 0.92], 0.02, handle),
      line(this, [0, 0.08], [0.58, 0.92], 0.02, handle),
      line(this, [1.72, 1.86], [1.18, 2.12], 0.02, handle),
      line(this, [1.72, 1.86], [2.3, 1.52], 0.02, handle),
      line(this, [2.55, -1.52], [2.62, -0.18], 0.02, handle),
    ];
    const guideA = line(this, [-1.6, 2.4], [0, 0], 0.03, rgba(0.3, 0.7, 0.98, 0.56));
    const guideB = line(this, [0, 0], [1.6, 2.4], 0.03, rgba(0.16, 0.94, 0.8, 0.56));
    const dots = [
      [-2.45, -1.62, support],
      [-1.6, 1.9, BLUE_B],
      [1.6, 1.9, mark],
      [-1.55, -0.98, support],
      [1.55, -0.98, support],
    ].map(([x, y, color]) => this.add(
      Circle().radius(0.11).fill(String(color)).stroke({ width: 0.02, color: WHITE }),
      { at: [Number(x), Number(y), 0] },
    ));
    const handleDots = [
      [-2.62, -0.18], [-2.3, 1.52], [-1.18, 2.12], [-0.58, 0.92],
      [0.58, 0.92], [1.18, 2.12], [2.3, 1.52], [2.62, -0.18],
    ].map(([x, y]) => this.add(
      Circle().radius(0.055).fill(rgba(0.92, 0.98, 1, 0.88)).stroke({ width: 0.012, color: WHITE }),
      { at: [x, y, 0] },
    ));

    const timeline = new Timeline();
    appearEach(timeline, frameLines, 1.15, 0.12, 0.18);
    appearEach(timeline, [...gridLines, ...gridRows], 1.8, 0.1, 0.16);
    appearEach(timeline, axisLines, 2.45, 0.12, 0.18);
    timeline.animate(guideA).at(2.9).duration(0.18).ease("linear").appear();
    timeline.animate(guideB).at(3.05).duration(0.18).ease("linear").appear();
    appearEach(timeline, supportHandles, 3, 0.08, 0.16);
    appearEach(timeline, markHandles, 3.25, 0.06, 0.16);
    timeline.animate(supportPath).at(3.2).duration(1.2).ease("outCubic").draw();
    timeline.animate(markPath).at(3.55).duration(1.85).ease("outCubic").draw();
    appearEach(timeline, dots, 4, 0.18, 0.2);
    appearEach(timeline, handleDots, 4.2, 0.08, 0.16);
    timeline.wait(6.6);
    this.play(timeline);
  }
}

render(import.meta.url, MuraliLogo);

function line(
  scene: Scene,
  start: readonly [number, number],
  end: readonly [number, number],
  thickness: number,
  color: string,
) {
  return scene.add(Line().from(start).to(end).stroke({ color, width: thickness }));
}

function appearEach(timeline: Timeline, items: readonly Tattva[], start: number, gap: number, duration: number): void {
  items.forEach((item, index) => {
    timeline.animate(item).at(start + index * gap).duration(duration).ease("linear").appear();
  });
}

function rgba(red: number, green: number, blue: number, alpha: number): string {
  return `rgba(${Math.round(red * 255)}, ${Math.round(green * 255)}, ${Math.round(blue * 255)}, ${alpha})`;
}
