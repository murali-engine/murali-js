import { render } from "murali-js";
import { Scene, Timeline } from "murali-js/core";
import { palette } from "murali-js/style";
import { Arrow, Circle, Line, Rectangle, worldPath } from "murali-js/primitives";
import { Label } from "murali-js/text";
const { BLUE_B, BLUE_D, GRAY_A, GRAY_B, GOLD_C, GREEN_D, PURPLE_B, TEAL_C, WHITE } = palette;

/** Port of Murali `examples/style_and_paths.rs`. */
class StyleAndPaths extends Scene {
  override construct(): void {
    const title = this.add(Label("Style And Paths").height(0.38).color(WHITE), { at: [0, 3, 0] });
    const subtitle = this.add(
      Label("Fill, stroke, dashes, arrows, and one authored path without mixing in unrelated animation ideas.")
        .height(0.18)
        .color(GRAY_B),
      { at: [0, 2.45, 0] },
    );

    const styleHeading = this.add(Label("Fill And Stroke").height(0.19).color(GRAY_B), { at: [-5, 1.65, 0] });
    const styleCard = this.add(
      Rectangle()
        .size([2.35, 1.5])
        .fill(`linear-gradient(135deg, ${BLUE_D} 0%, ${TEAL_C} 55%, ${GREEN_D} 100%)`)
        .stroke({ width: 0.05, color: WHITE }),
      { at: [-5, 0.35, 0] },
    );
    const styleBadge = this.add(
      Circle().radius(0.28).fill(GOLD_C).stroke({ width: 0.03, color: WHITE }),
      { at: [-4.2, -0.05, 0] },
    );
    const styleCaption = this.add(
      Label("A surface can carry both a fill story and a clear edge.").height(0.16).color(GRAY_A),
      { at: [-5, -1.45, 0] },
    );

    const dashHeading = this.add(Label("Dashes And Direction").height(0.19).color(GRAY_B), { at: [0, 1.65, 0] });
    const dashedLine = this.add(
      Line().from([-1.35, 0.65]).to([1.2, -0.55]).stroke({ color: TEAL_C, width: 0.06 }).dash(0.18, 0.1),
    );
    const arrow = this.add(
      Arrow().from([-1.15, -0.85]).to([1.25, 0.8]).stroke({ color: GOLD_C, width: 0.055 }),
    );
    const dashCaption = this.add(
      Label("Use dashes for guides and arrows when motion needs a destination.").height(0.16).color(GRAY_A),
      { at: [0, -2.05, 0] },
    );

    const pathHeading = this.add(Label("Authored Path").height(0.19).color(GRAY_B), { at: [5, 1.65, 0] });
    const path = this.add(
      worldPath()
        .moveTo(3.55, -0.65)
        .lineTo(4.05, 0.45)
        .quadTo(4.55, 1.05, 5.2, 0.25)
        .cubicTo(5.55, -0.25, 6.05, -0.95, 6.4, 0.15)
        .stroke({ color: PURPLE_B, width: 0.085 }),
    );
    const dotA = this.add(Circle().radius(0.09).fill(BLUE_B).stroke({ width: 0.02, color: WHITE }), { at: [3.55, -0.65, 0] });
    const dotB = this.add(Circle().radius(0.09).fill(TEAL_C).stroke({ width: 0.02, color: WHITE }), { at: [5.2, 0.25, 0] });
    const dotC = this.add(Circle().radius(0.09).fill(GOLD_C).stroke({ width: 0.02, color: WHITE }), { at: [6.4, 0.15, 0] });
    const pathCaption = this.add(
      Label("Lines, quadratics, and cubics let you author one continuous gesture.").height(0.16).color(GRAY_A),
      { at: [5, -1.45, 0] },
    );
    const footer = this.add(
      Label("This example is about visual language: how marks feel before they start moving.")
        .height(0.17)
        .color(GRAY_B),
      { at: [0, -3, 0] },
    );

    const timeline = new Timeline();
    timeline.animate(title).at(0).duration(1).ease("linear").typewrite();
    timeline.animate(subtitle).at(0.35).duration(1.5).ease("linear").typewrite();
    timeline.animate(styleHeading).at(1.4).duration(0.8).ease("linear").typewrite();
    timeline.animate(styleCard).at(1.85).duration(0.7).ease("outCubic").appear();
    timeline.animate(styleBadge).at(2.2).duration(0.55).ease("outCubic").appear();
    timeline.animate(styleCaption).at(2.35).duration(1).ease("linear").typewrite();
    timeline.animate(dashHeading).at(3.25).duration(0.8).ease("linear").typewrite();
    timeline.animate(dashedLine).at(3.7).duration(0.9).ease("outCubic").draw();
    timeline.animate(arrow).at(4.05).duration(0.55).ease("outCubic").appear();
    timeline.animate(dashCaption).at(4.15).duration(1.1).ease("linear").typewrite();
    timeline.animate(pathHeading).at(5.1).duration(0.8).ease("linear").typewrite();
    timeline.animate(path).at(5.55).duration(1.4).ease("outCubic").draw();
    for (const [dot, at] of [[dotA, 5.85], [dotB, 6.25], [dotC, 6.6]] as const) {
      timeline.animate(dot).at(at).duration(0.4).ease("outCubic").appear();
    }
    timeline.animate(pathCaption).at(6).duration(1.15).ease("linear").typewrite();
    timeline.animate(footer).at(7.1).duration(1.5).ease("linear").typewrite();
    this.play(timeline);
  }
}

render(import.meta.url, StyleAndPaths);
