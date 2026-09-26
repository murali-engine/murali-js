import {
  BLUE_D,
  Circle,
  GRAY_A,
  GRAY_B,
  GOLD_C,
  Label,
  RED_B,
  Scene,
  Square,
  TEAL_C,
  Timeline,
  WHITE,
  render,
} from "venu";

/** Port of Murali `examples/motion_basics.rs`. */
class MotionBasics extends Scene {
  override construct(): void {
    const title = this.add(Label("Motion Basics").height(0.38).color(WHITE));
    this.toEdge(title, "up", { margin: 0.8 });
    const subtitle = this.add(
      Label("A first pass through movement, scaling, rotation, fading, and easing.")
        .height(0.18)
        .color(GRAY_B),
      { at: [0, 2.95, 0] },
    );

    const moveHeading = this.add(Label("Move").height(0.2).color(GRAY_B), { at: [-5.4, 1.8, 0] });
    const moveShape = this.add(
      Square().size(0.9).fill(RED_B).stroke({ width: 0.04, color: WHITE }),
      { at: [-5.4, 0.15, 0] },
    );
    const moveCaption = this.add(Label("Ease::InOutQuad").height(0.17).color(GRAY_A), { at: [-5.4, -1.1, 0] });

    const scaleHeading = this.add(Label("Scale").height(0.2).color(GRAY_B), { at: [-1.8, 1.8, 0] });
    const scaleShape = this.add(
      Circle().radius(0.5).fill(TEAL_C).stroke({ width: 0.04, color: WHITE }),
      { at: [-1.8, 0.15, 0] },
    );
    const scaleCaption = this.add(Label("Ease::OutCubic").height(0.17).color(GRAY_A), { at: [-1.8, -1.1, 0] });

    const rotateHeading = this.add(Label("Rotate").height(0.2).color(GRAY_B), { at: [1.8, 1.8, 0] });
    const rotateShape = this.add(
      Square().size(0.95).fill(BLUE_D).stroke({ width: 0.04, color: WHITE }),
      { at: [1.8, 0.15, 0] },
    );
    const rotateCaption = this.add(Label("Ease::InOutCubic").height(0.17).color(GRAY_A), { at: [1.8, -1.1, 0] });

    const fadeHeading = this.add(Label("Fade").height(0.2).color(GRAY_B), { at: [5.4, 1.8, 0] });
    const fadeShape = this.add(
      Circle().radius(0.5).fill(GOLD_C).stroke({ width: 0.04, color: WHITE }),
      { at: [5.4, 0.15, 0] },
    );
    const fadeCaption = this.add(Label("Ease::Linear").height(0.17).color(GRAY_A), { at: [5.4, -1.1, 0] });

    const footer = this.add(
      Label("These are the core building blocks before morphs, semantic transforms, or camera choreography.")
        .height(0.17)
        .color(GRAY_B),
      { at: [0, -3.05, 0] },
    );

    const sections = [
      [moveHeading, moveShape, moveCaption],
      [scaleHeading, scaleShape, scaleCaption],
      [rotateHeading, rotateShape, rotateCaption],
      [fadeHeading, fadeShape, fadeCaption],
    ] as const;

    const timeline = new Timeline();
    timeline.animate(title).at(0).duration(3).ease("linear").typewrite();
    timeline.animate(subtitle).at(1.05).duration(4.8).ease("linear").typewrite();
    sections.forEach(([heading, shape, caption], index) => {
      const start = 4.5 + index * 5.1;
      timeline.animate(heading).at(start).duration(2.55).ease("linear").typewrite();
      timeline.animate(shape).at(start + 1.05).duration(3.15).ease("outCubic").draw();
      timeline.animate(caption).at(start + 1.8).duration(2.55).ease("linear").typewrite();
    });
    timeline.animate(moveShape).at(6.6).duration(6).ease("inOutQuad").moveTo([-4.4, 0.15, 0]);
    timeline.animate(scaleShape).at(12.8).duration(5.8).ease("inOutCubic").scaleTo(1.8);
    timeline.animate(rotateShape).at(18.6).duration(5.4).ease("inOutCubic").rotateTo(90);
    timeline.animate(fadeShape).at(24.4).duration(4.5).ease("linear").fadeTo(0.18);
    timeline.animate(fadeShape).at(29.2).duration(4.05).ease("linear").fadeTo(1);
    timeline.animate(footer).at(31.8).duration(5.4).ease("linear").typewrite();
    this.play(timeline);
  }
}

render(import.meta.url, MotionBasics);
