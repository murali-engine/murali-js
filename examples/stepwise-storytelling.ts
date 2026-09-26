import {
  GRAY_B,
  Label,
  Scene,
  Stepwise,
  TEAL_C,
  Timeline,
  WHITE,
  render,
} from "murali-js";

/** Port of Murali `examples/stepwise_storytelling.rs`. The path reveals, then the signal replays it. */
class StepwiseStory extends Scene {
  override construct(): void {
    const title = this.add(Label("Stepwise Storytelling").height(0.38).color(WHITE).typewriter(), { at: [0, 3, 0] });
    const subtitle = this.add(Label(
      "A narrative flow can reveal step by step, then replay the journey through the same path.",
    ).height(0.18).color(GRAY_B).typewriter(), { at: [0, 2.45, 0] });
    const heading = this.add(Label("Observe -> Reason -> Revise -> Publish").height(0.19).color(GRAY_B).typewriter(), {
      at: [0, 1.7, 0],
    });
    const flow = this.add(Stepwise((story) => {
      const observe = story.step("Observe");
      const reason = story.step("Reason");
      const revise = story.step("Revise");
      const publish = story.step("Publish");

      story.connect(observe, reason);
      story.connect(reason, revise);
      story.connect(revise, publish);
      story.connect(revise, reason).route("down", "left");
      story.sequence([observe, reason, revise, reason, revise, publish]);
    }).gap(1.45).signalColor(TEAL_C), { at: [-5, 0.1, 0] });
    const caption = this.add(Label("The feedback loop is part of the story, not a separate diagram.").height(0.17).color(GRAY_B).typewriter(), {
      at: [0, -2.5, 0],
    });
    const footer = this.add(Label(
      "Use this when the audience should feel the sequence, not just see the final structure.",
    ).height(0.17).color(GRAY_B).typewriter(), { at: [0, -3.05, 0] });

    const timeline = new Timeline();
    timeline.animate(title).at(0).duration(1).ease("linear").typewrite();
    timeline.animate(subtitle).at(0.35).duration(1.5).ease("linear").typewrite();
    timeline.animate(heading).at(1.4).duration(0.9).ease("linear").typewrite();
    timeline.animate(flow).at(1.9).duration(2.8).ease("inOutQuad").to({ reveal: 1 });
    timeline.animate(caption).at(2.5).duration(1.1).ease("linear").typewrite();
    timeline.animate(flow).at(5).duration(3).ease("linear").to({ signal: 1 });
    timeline.animate(footer).at(6.1).duration(1.6).ease("linear").typewrite();
    this.play(timeline);
  }
}

render(import.meta.url, StepwiseStory);
