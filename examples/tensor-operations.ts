import {
  GRAY_B,
  GOLD_A,
  Label,
  PINK,
  Scene,
  TEAL_A,
  TensorView,
  Timeline,
  WHITE,
  render,
  tensorOperationStages,
} from "murali-js";

const STYLE = { cellWidth: 0.9, cellHeight: 0.66, labelHeight: 0.18, valueHeight: 0.16 };

/** Port of Murali `examples/tensor_operations.rs`. Bias, split, and reshape keep element ids. */
class TensorOperations extends Scene {
  constructor() {
    super({ viewWidth: 14 });
  }

  override construct(): void {
    const { activations, biased, left, right, reshaped } = tensorOperationStages();
    const title = this.add(Label("Semantic Tensor Operations").height(0.4).color(WHITE).typewriter());
    this.toEdge(title, "up", { margin: 0.75 });
    const subtitle = this.add(Label(
      "Named axes keep model meaning intact through broadcasting, splitting, and reshaping.",
    ).height(0.17).color(GRAY_B).typewriter(), { at: [0, 2.75, 0] });
    const source = this.add(TensorView(activations, {
      ...STYLE,
      morphs: [{ at: 2.4, duration: 1.1, to: biased }],
    }), { at: [0, -0.1, 0] });
    const leftView = this.add(TensorView(left, STYLE), { at: [-2.65, -0.1, 0] });
    const rightView = this.add(TensorView(right, STYLE), { at: [2.65, -0.1, 0] });
    const reshapedView = this.add(TensorView(reshaped, STYLE), { at: [0, -0.15, 0] });
    const broadcast = this.add(Label("1. Reordered feature bias broadcasts across tokens").height(0.2).color(TEAL_A), {
      at: [0, 2.05, 0],
    });
    const splitCaption = this.add(Label("2. Split feature IDs into two tensors").height(0.2).color(GOLD_A), {
      at: [0, 2.05, 0],
    });
    const reshapeCaption = this.add(Label("3. Merge losslessly, then reshape onto explicit axes").height(0.2).color(PINK), {
      at: [0, 2.05, 0],
    });
    const leftLabel = this.add(Label("features.left").height(0.17).color(GRAY_B), { at: [-2.65, -1.65, 0] });
    const rightLabel = this.add(Label("features.right").height(0.17).color(GRAY_B), { at: [2.65, -1.65, 0] });

    const timeline = new Timeline();
    timeline.animate(title).at(0).duration(0.8).ease("linear").typewrite();
    timeline.animate(subtitle).at(0.25).duration(1.4).ease("linear").typewrite();
    for (const item of [source, broadcast]) {
      timeline.animate(item).at(1.3).duration(0.5).ease("inOutQuad").appear();
    }
    for (const item of [source, broadcast]) {
      timeline.animate(item).at(4.1).duration(0.4).ease("linear").to({ opacity: 0 });
    }
    for (const item of [leftView, rightView, splitCaption, leftLabel, rightLabel]) {
      timeline.animate(item).at(4.5).duration(0.5).ease("inOutQuad").appear();
    }
    for (const item of [leftView, rightView, splitCaption, leftLabel, rightLabel]) {
      timeline.animate(item).at(6.4).duration(0.4).ease("linear").to({ opacity: 0 });
    }
    for (const item of [reshapedView, reshapeCaption]) {
      timeline.animate(item).at(6.8).duration(0.55).ease("inOutQuad").appear();
    }
    this.play(timeline);
    if (this.duration < 9) this.wait(9 - this.duration);
  }
}

render(import.meta.url, TensorOperations);
