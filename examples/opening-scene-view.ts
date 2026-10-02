import { render } from "murali-js";
import { Scene, SceneView, Timeline } from "murali-js/core";
import { palette } from "murali-js/style";
import { Circle, Line, Rectangle } from "murali-js/primitives";
import { Label } from "murali-js/text";
import { Opening } from "murali-js/storytelling";
const { BLUE_D, GOLD_C, GRAY_A, GREEN_C, PINK_C, TEAL_C, WHITE } = palette;
import type { Tattva, Vec3 } from "murali-js/core";

const BACKGROUND = "#0a121c";

class OpeningScene extends Scene {
  constructor() {
    super({ width: 1280, height: 720, background: BACKGROUND });
  }

  override construct(): void {
    this.camera
      .perspective({ fov: 43, near: 0.1, far: 80 })
      .position([0, 2.15, 10.8])
      .lookAt([0, -0.35, 0]);
    const opening = Opening("MURALI", "PROGRAMMATIC VISUALS")
      .texture("blackMarble")
      .style({
        letterHeight: 2.15,
        letterDepth: 0.78,
        letterGap: 0.3,
        particleCount: 360,
        particleSize: 0.025,
        taglineHeight: 0.4,
        taglineColor: alpha(WHITE, 0.94),
      })
      .addTo(this);
    const timeline = new Timeline();
    opening.animate(timeline);
    this.play(timeline);
  }
}

/** Port of Murali `examples/opening_scene_view.rs`. */
class OpeningSceneView extends Scene {
  constructor() {
    super({ width: 1280, height: 720, background: BACKGROUND });
  }

  override construct(): void {
    const child = new OpeningScene().prepare();
    const openingDuration = child.duration;
    const openingView = this.add(SceneView(child)
      .size(this.viewWidth, this.viewHeight)
      .background(BACKGROUND)
      .playback("once")
      .resolution(1280, 720));

    const heading = this.add(Label("A live inference path").height(0.48).color(WHITE).typewriter(), { at: [0, 3.35, 0] });
    const subtitle = this.add(Label("Signals continue after the ident").height(0.19).color(alpha(GRAY_A, 0.78)).typewriter(), { at: [0, 2.82, 0] });
    const stages = [
      addStage(this, -4.55, "OBSERVE", "structured input", TEAL_C),
      addStage(this, 0, "REASON", "latent computation", PINK_C),
      addStage(this, 4.55, "EXPLAIN", "grounded output", GREEN_C),
    ];
    const connectors = [
      this.add(Line().from([-2.92, -0.35]).to([-1.63, -0.35]).stroke({ color: alpha(BLUE_D, 0.62), width: 0.04 })),
      this.add(Line().from([1.63, -0.35]).to([2.92, -0.35]).stroke({ color: alpha(GOLD_C, 0.68), width: 0.04 })),
    ];
    const pulses = [TEAL_C, GOLD_C, GREEN_C].map((color, index) => this.add(
      Circle().radius(0.12).fill(color).stroke({ color: WHITE, width: 0.025 }).depthMode("overlay"),
      { at: [-6.65, -0.35 + (index - 1) * 0.16, 0.2] },
    ));

    const revealStart = openingDuration - 0.15;
    const timeline = new Timeline();
    timeline.animate(openingView).at(openingDuration - 0.3).duration(0.72).ease("inOutCubic").fadeTo(0);
    timeline.animate(heading).at(revealStart).duration(0.65).ease("linear").typewrite();
    timeline.animate(subtitle).at(revealStart + 0.28).duration(0.58).ease("linear").typewrite();
    stages.forEach((stage, index) => scheduleStage(timeline, stage, revealStart + 0.55 + index * 0.24));
    connectors.forEach((connector, index) => {
      timeline.animate(connector).at(revealStart + 1.02 + index * 0.2).duration(0.52).ease("outCubic").draw();
    });
    pulses.forEach((pulse, index) => {
      const start = revealStart + 1.35 + index * 0.42;
      timeline.animate(pulse).at(start).duration(0.16).ease("outCubic").appear();
      timeline.animate(pulse).at(start).duration(2.45).ease("inOutCubic").moveTo([6.65, -0.35 + (index - 1) * 0.16, 0.2]);
      timeline.animate(pulse).at(start + 2.2).duration(0.25).ease("inCubic").fadeTo(0);
    });
    this.play(timeline);
    if (this.duration < openingDuration + 5) this.wait(openingDuration + 5 - this.duration);
  }
}

interface StageParts {
  panel: Tattva;
  title: Tattva;
  detail: Tattva;
  nodes: Tattva[];
}

function addStage(scene: Scene, x: number, title: string, detail: string, color: string): StageParts {
  const panel = scene.add(Rectangle().size([3.25, 3.6]).cornerRadius(0.22).fill(alpha(color, 0.08)).stroke({
    color: alpha(color, 0.72),
    width: 0.035,
  }), { at: [x, -0.35, 0] });
  const titleLabel = scene.add(Label(title).height(0.25).color(color).typewriter(), { at: [x, 0.82, 0.08] });
  const detailLabel = scene.add(Label(detail).height(0.16).color(alpha(GRAY_A, 0.82)).typewriter(), { at: [x, -1.45, 0.08] });
  const nodes = [0.35, -0.25, -0.85].flatMap((y, index) => {
    const radius = 0.18 + index * 0.025;
    return [
      scene.add(Circle().radius(radius + 0.12).fill(alpha(color, 0.11)), { at: [x, y, 0.06] }),
      scene.add(Circle().radius(radius).fill(alpha(color, 0.92)).stroke({ color: alpha(WHITE, 0.85), width: 0.025 }), { at: [x, y, 0.1] }),
    ];
  });
  return { panel, title: titleLabel, detail: detailLabel, nodes };
}

function scheduleStage(timeline: Timeline, stage: StageParts, start: number): void {
  timeline.animate(stage.panel).at(start).duration(0.5).ease("outCubic").appear();
  timeline.animate(stage.title).at(start + 0.12).duration(0.46).ease("linear").typewrite();
  timeline.animate(stage.detail).at(start + 0.3).duration(0.5).ease("linear").typewrite();
  stage.nodes.forEach((node, index) => {
    timeline.animate(node).at(start + 0.24 + index * 0.055).duration(0.34).ease("outCubic").appear();
  });
}

function alpha(hex: string, opacity: number): string {
  const value = hex.replace("#", "");
  return `rgba(${Number.parseInt(value.slice(0, 2), 16)}, ${Number.parseInt(value.slice(2, 4), 16)}, ${Number.parseInt(value.slice(4, 6), 16)}, ${opacity})`;
}

render(import.meta.url, OpeningSceneView, { fps: 30 });
