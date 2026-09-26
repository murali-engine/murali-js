import {
  GRAY_B,
  Label,
  NormalizationPanel,
  Scene,
  Timeline,
  WHITE,
  render,
} from "venu";

const TOKENS = ["The", "model", "learns", "patterns"];
const RESIDUAL = [
  1, 2, 4, 5, 8,
  -3, -1, 0, 2, 7,
  0.5, 0.8, 1.4, 2.2, 4.8,
  -5, -2, 1, 4, 10,
];

/** Port of Murali `examples/normalization.rs`. Each token row is layer-normalized on its own. */
class NormalizationScene extends Scene {
  override construct(): void {
    const title = this.add(Label("LayerNorm stabilizes each token").height(0.38).color(WHITE).typewriter());
    this.toEdge(title, "up", { margin: 0.58 });
    const view = this.add(NormalizationPanel(TOKENS, RESIDUAL, 5), { at: [0, -0.15, 0] });
    const note = this.add(Label(
      "Every token row gets its own mean and variance; feature identity is preserved.",
    ).height(0.17).color(GRAY_B).typewriter(), { at: [0, -3.2, 0] });

    const timeline = new Timeline();
    timeline.animate(title).at(0).duration(0.9).ease("linear").typewrite();
    timeline.animate(view).at(0.55).duration(0.8).ease("outCubic").appear();
    timeline.animate(note).at(1.55).duration(1.8).ease("linear").typewrite();
    this.play(timeline);
  }
}

render(import.meta.url, NormalizationScene);
