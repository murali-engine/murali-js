import {
  BLUE_B,
  GRAY_A,
  GRAY_B,
  GOLD_C,
  Label,
  PURPLE_B,
  Scene,
  TEAL_C,
  Timeline,
  WHITE,
  render,
  worldPath,
} from "murali-js";

/** Port of Murali `examples/text_animation.rs`. */
class TextAnimation extends Scene {
  override construct(): void {
    const title = this.add(Label("Text Animation").height(0.38).color(WHITE));
    this.toEdge(title, "up", { margin: 0.8 });
    const subtitle = this.add(
      Label("Typewriter, centered reveal, indicate, and one simple authored path write.")
        .height(0.18)
        .color(GRAY_B),
      { at: [0, 2.95, 0] },
    );

    const typeHeading = this.add(Label("Typewrite").height(0.18).color(GRAY_B), { at: [-4.9, 1.85, 0] });
    const typeLabel = this.add(
      Label("A narrated line grows from left to right.").height(0.3).color(TEAL_C).typewriter(),
      { at: [-4.1, 0.7, 0] },
    );
    const typeCaption = this.add(
      Label("Stable anchor, good for spoken narration.").height(0.16).color(GRAY_A),
      { at: [-4.1, -0.15, 0] },
    );

    const revealHeading = this.add(Label("Reveal").height(0.18).color(GRAY_B), { at: [0, 1.85, 0] });
    const revealLabel = this.add(
      Label("A centered line blooms into view.").height(0.3).color(GOLD_C),
      { at: [0, 0.7, 0] },
    );
    const revealCaption = this.add(
      Label("Symmetric motion, good for emphasis.").height(0.16).color(GRAY_A),
      { at: [0, -0.15, 0] },
    );

    const indicateHeading = this.add(Label("Indicate").height(0.18).color(GRAY_B), { at: [4.9, 1.85, 0] });
    const indicateLabel = this.add(
      Label("This phrase matters right now.").height(0.3).color(BLUE_B),
      { at: [4.9, 0.7, 0] },
    );
    const indicateCaption = this.add(
      Label("A pulse for attention without relayout.").height(0.16).color(GRAY_A),
      { at: [4.9, -0.15, 0] },
    );

    const pathHeading = this.add(Label("Draw And Undraw").height(0.18).color(GRAY_B), { at: [0, -1.2, 0] });
    const path = this.add(
      worldPath()
        .moveTo(-1.9, -2.15)
        .quadTo(-1.1, -1.25, -0.2, -2)
        .cubicTo(0.4, -2.45, 1, -1.05, 1.8, -1.9)
        .stroke({ color: PURPLE_B, width: 0.08 }),
    );
    const pathCaption = this.add(
      Label("Useful when text and line-work need the same authored timing.").height(0.16).color(GRAY_A),
      { at: [0, -2.9, 0] },
    );

    const timeline = new Timeline();
    timeline.animate(title).at(0).duration(1).ease("linear").typewrite();
    timeline.animate(subtitle).at(0.35).duration(1.5).ease("linear").typewrite();

    timeline.animate(typeHeading).at(1.5).duration(0.8).ease("linear").typewrite();
    timeline.animate(typeLabel).at(1.9).duration(2).ease("linear").typewrite();
    timeline.animate(typeCaption).at(2.2).duration(1.1).ease("linear").typewrite();
    timeline.animate(typeLabel).at(4.8).duration(0.9).ease("linear").untypewrite();
    timeline.animate(typeCaption).at(4.95).duration(0.8).ease("linear").untypewrite();
    timeline.animate(typeHeading).at(5.1).duration(0.7).ease("linear").untypewrite();

    timeline.animate(revealHeading).at(5.9).duration(0.8).ease("linear").typewrite();
    timeline.animate(revealLabel).at(6.3).duration(1.8).ease("linear").revealText();
    timeline.animate(revealCaption).at(6.6).duration(1).ease("linear").typewrite();
    timeline.animate(revealLabel).at(9).duration(1).ease("linear").hideText();
    timeline.animate(revealCaption).at(9.15).duration(0.8).ease("linear").untypewrite();
    timeline.animate(revealHeading).at(9.3).duration(0.7).ease("linear").untypewrite();

    timeline.animate(indicateHeading).at(10.2).duration(0.8).ease("linear").typewrite();
    timeline.animate(indicateLabel).at(10.6).duration(1.3).ease("linear").typewrite();
    timeline.animate(indicateCaption).at(10.85).duration(1).ease("linear").typewrite();
    for (const at of [11.9, 12.7, 13.4]) {
      timeline.animate(indicateLabel).at(at).duration(0.75).ease("inOutCubic").indicate();
    }
    timeline.animate(indicateLabel).at(14.5).duration(0.9).ease("linear").untypewrite();
    timeline.animate(indicateCaption).at(14.65).duration(0.8).ease("linear").untypewrite();
    timeline.animate(indicateHeading).at(14.8).duration(0.7).ease("linear").untypewrite();

    timeline.animate(pathHeading).at(15.5).duration(0.9).ease("linear").typewrite();
    timeline.animate(path).at(16).duration(1.8).ease("outCubic").draw();
    timeline.animate(pathCaption).at(16.35).duration(1.2).ease("linear").typewrite();
    timeline.animate(path).at(19).duration(1.5).ease("inCubic").undraw();
    timeline.animate(pathCaption).at(19.15).duration(0.9).ease("linear").untypewrite();
    timeline.animate(pathHeading).at(19.3).duration(0.8).ease("linear").untypewrite();
    this.play(timeline);
  }
}

render(import.meta.url, TextAnimation);
