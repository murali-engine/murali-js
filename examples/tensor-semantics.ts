import {
  GRAY_B,
  Label,
  Scene,
  TEAL_A,
  TensorGrid,
  Timeline,
  WHITE,
  render,
  tensorSemanticsFrame,
} from "venu";

/**
 * Port of Murali `examples/tensor_semantics.rs`.
 * The cells move from QK^T through scale, a causal mask, and softmax.
 * The "reads" row stays selected while the values change.
 */
class TensorSemantics extends Scene {
  constructor() {
    super({ viewWidth: 14 });
  }

  override construct(): void {
    const title = this.add(Label("Inside Self-Attention").height(0.38).color(WHITE).typewriter());
    this.toEdge(title, "up", { margin: 0.8 });
    const subtitle = this.add(Label(
      "Q and K produce every animated value, from dot products to attention weights.",
    ).height(0.18).color(GRAY_B).typewriter(), { at: [0, 2.9, 0] });
    const grid = this.add(TensorGrid(tensorSemanticsFrame), { at: [0, -0.15, 0] });
    const stages = this.add(Label("QK^T   ->   / sqrt(d_k)   ->   + causal mask   ->   softmax").height(0.2).color(TEAL_A).typewriter(), {
      at: [0, 2.15, 0],
    });
    const caption = this.add(Label(
      "The highlighted token keeps its identity while real tensor operations change the values.",
    ).height(0.17).color(GRAY_B).typewriter(), { at: [0, -3.05, 0] });

    const timeline = new Timeline();
    timeline.animate(title).at(0).duration(0.9).ease("linear").typewrite();
    timeline.animate(subtitle).at(0.3).duration(1.6).ease("linear").typewrite();
    timeline.animate(grid).at(1.5).duration(0.5).ease("inOutQuad").appear();
    timeline.animate(stages).at(1.7).duration(1.5).ease("linear").typewrite();
    timeline.animate(caption).at(2.3).duration(1.3).ease("linear").typewrite();
    this.play(timeline);
    if (this.duration < 9) this.wait(9 - this.duration);
  }
}

render(import.meta.url, TensorSemantics);
