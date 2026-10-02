import { render } from "murali-js";
import { TensorView, tensorSlicingHeads } from "murali-js/ai";
import { Scene, Timeline } from "murali-js/core";
import { palette } from "murali-js/style";
import { Label } from "murali-js/text";
const { GRAY_A, GRAY_B, GOLD_A, TEAL_A, WHITE } = palette;

/** AI teaching example: one head, then the other, with stable token and feature ids. */
class TensorSlicing extends Scene {
  constructor() {
    super({ viewWidth: 14 });
  }

  override construct(): void {
    const { headZero, headOne } = tensorSlicingHeads();
    const title = this.add(Label("Semantic Slices of a Rank-4 Tensor").height(0.4).color(WHITE).typewriter());
    this.toEdge(title, "up", { margin: 0.7 });
    const shape = this.add(Label("[batch, head, token, feature] = [2, 2, 3, 4]").height(0.2).color(GRAY_B));
    this.nextTo(shape, title, "down", { gap: 0.48 });
    const view = this.add(TensorView(headZero, {
      cellWidth: 1,
      cellHeight: 0.72,
      labelHeight: 0.2,
      valueHeight: 0.16,
      morphs: [{ at: 3.2, duration: 1.2, to: headOne }],
    }), { at: [0, -0.1, 0] });
    const headZeroLabel = this.add(Label("batch.0 / head.0").height(0.24).color(TEAL_A), { at: [0, 1.8, 0] });
    const headOneLabel = this.add(Label("batch.0 / head.1").height(0.24).color(GOLD_A), { at: [0, 1.8, 0] });
    const note = this.add(Label("Token and feature IDs remain stable while the fixed head changes.").height(0.2).color(GRAY_A), {
      at: [0, -2.45, 0],
    });

    const timeline = new Timeline();
    timeline.animate(title).at(0).duration(0.8).ease("linear").typewrite();
    for (const item of [shape, view, headZeroLabel]) {
      timeline.animate(item).at(1).duration(0.6).ease("linear").appear();
    }
    timeline.animate(headZeroLabel).at(3.2).duration(0.35).ease("linear").to({ opacity: 0 });
    timeline.animate(headOneLabel).at(3.55).duration(0.5).ease("linear").appear();
    timeline.animate(note).at(4.5).duration(0.8).ease("linear").appear();
    this.play(timeline);
    if (this.duration < 7) this.wait(7 - this.duration);
  }
}

render(import.meta.url, TensorSlicing);
