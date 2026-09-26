import {
  Circle,
  GOLD_A,
  Label,
  Scene,
  Tattva,
  Timeline,
  TracedPath,
  WHITE,
  easeInOutCubic,
  epicycleLinks,
  epicycleTip,
  fourierTerms,
  piOutline,
  render,
  worldPath,
} from "murali-js";
import type { TattvaState, Vec2 } from "murali-js";

const traceStart = 1.1;
const traceDuration = 30;
const harmonics = 34;
const outlinePoints = piOutline(760, 2.65);
const terms = fourierTerms(outlinePoints, harmonics);

/**
 * Port of Murali `examples/fourier_formula_trace.rs`.
 * The π outline is a geometric stand-in: Murali JS does not run Typst to extract a glyph.
 */
class FourierFormulaTrace extends Scene {
  constructor() {
    super({ viewWidth: 11.2 });
  }

  override construct(): void {
    const title = this.add(Label("Fourier Transform Trace").height(0.3).color(WHITE).typewriter(), { at: [0, 2.86, 0] });
    const outline = this.add(outlinePath(outlinePoints));
    this.add(new EpicycleChain());
    const tip = this.add(Circle().radius(0.075).fill("rgba(255, 176, 79, 0.96)").stroke({ color: GOLD_A, width: 0.02 }));
    this.add(TracedPath((time) => tipAt(Math.min(time, traceStart + traceDuration))).minDistance(0.01).maxPoints(1520).color("rgba(255, 176, 79, 0.96)").width(0.045));

    this.updater((time, states) => {
      const state = states.get(tip);
      if (!state) return;
      const point = tipAt(time);
      state.x = point[0];
      state.y = point[1];
    });

    const timeline = new Timeline();
    timeline.animate(title).at(0).duration(0.95).ease("linear").typewrite();
    timeline.animate(tip).at(0.7).duration(0.45).ease("outCubic").appear();
    timeline.animate(outline).at(traceStart + traceDuration * 0.82).duration(2.8).ease("inOutCubic").draw();
    timeline.animateCamera(this.camera).at(traceStart + 8).duration(3).ease("inOutCubic").zoomTo(4);
    timeline.animateCamera(this.camera).at(traceStart + 17).duration(3).ease("inOutCubic").zoomTo(0.25);
    this.play(timeline);
    if (this.duration < traceStart + traceDuration) this.wait(traceStart + traceDuration - this.duration);
  }
}

class EpicycleChain extends Tattva {
  private markup = "";

  constructor() {
    super();
    this.dynamicGeometry = true;
    this.revealKind = "none";
    this.worldSize = { width: 8, height: 8 };
  }

  override influenceState(time: number, state: TattvaState): void {
    const layout = epicycleMarkup(phaseAt(time));
    state.x += layout.x;
    state.y += layout.y;
    this.worldSize = { width: layout.width, height: layout.height };
    this.markup = layout.html;
  }

  override contentHTML(time = 0): string {
    return this.markup || epicycleMarkup(phaseAt(time)).html;
  }
}

function phaseAt(time: number): number {
  if (time <= traceStart) return 0;
  if (time >= traceStart + traceDuration) return 1;
  return easeInOutCubic((time - traceStart) / traceDuration);
}

function tipAt(time: number): Vec2 {
  return epicycleTip(terms, phaseAt(time));
}

function epicycleMarkup(phase: number): { html: string; x: number; y: number; width: number; height: number } {
  const links = epicycleLinks(terms, phase);
  const points = links.flatMap((link) => [link.center, link.next]);
  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);
  const pad = 0.4;
  const minX = Math.min(...xs, -1) - pad;
  const maxX = Math.max(...xs, 1) + pad;
  const minY = Math.min(...ys, -1) - pad;
  const maxY = Math.max(...ys, 1) + pad;
  const circles = links.filter((link) => link.radius > 0.001).map((link) =>
    `<circle cx="${link.center[0]}" cy="${-link.center[1]}" r="${link.radius}" fill="none" stroke="rgba(237, 245, 255, 0.24)" stroke-width="0.015" />`,
  ).join("");
  const spokes = links.map((link) =>
    `<line x1="${link.center[0]}" y1="${-link.center[1]}" x2="${link.next[0]}" y2="${-link.next[1]}" stroke="rgba(250, 235, 184, 0.8)" stroke-width="0.023" />`,
  ).join("");
  return {
    html: `<svg width="100%" height="100%" viewBox="${minX} ${-maxY} ${maxX - minX} ${maxY - minY}" overflow="visible" xmlns="http://www.w3.org/2000/svg">${circles}${spokes}</svg>`,
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
    width: Math.max(0.001, maxX - minX),
    height: Math.max(0.001, maxY - minY),
  };
}

function outlinePath(points: readonly Vec2[]) {
  const path = worldPath().moveTo(points[0]?.[0] ?? 0, points[0]?.[1] ?? 0);
  for (const point of points.slice(1)) path.lineTo(point[0], point[1]);
  return path.stroke({ color: "rgba(92, 235, 245, 0.28)", width: 0.032 });
}

render(import.meta.url, FourierFormulaTrace);
