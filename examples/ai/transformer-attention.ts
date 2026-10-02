import { render } from "murali-js";
import {
  ATTENTION_BLOCK_FOCUS,
  AttentionMatrix,
  SignalFlow,
  TokenRow,
  TransformerBlock,
} from "murali-js/ai";
import { Scene, Timeline } from "murali-js/core";
import { palette } from "murali-js/style";
import { Label } from "murali-js/text";
const { GOLD_A, GOLD_C, GRAY_A, GRAY_B, TEAL_A, TEAL_C, WHITE } = palette;

/** AI teaching example: stage focus is a function of scene time. */
class TransformerAttention extends Scene {
  constructor() {
    super({ viewWidth: 17 });
  }

  override construct(): void {
    const title = this.add(Label("Transformer Attention").height(0.38).color(WHITE).typewriter());
    this.toEdge(title, "up", { margin: 0.8 });
    const subtitle = this.add(Label(
      "Tokens form relationships in an attention map, then continue into one transformer block.",
    ).height(0.18).color(GRAY_B).typewriter());
    this.nextTo(subtitle, title, "down", { gap: 0.42 });
    const tokensHeading = this.add(Label("Token sequence").height(0.2).color(GRAY_B).typewriter(), { at: [-4.6, 2.05, 0] });
    const matrixHeading = this.add(Label("Attention matrix").height(0.2).color(GRAY_B).typewriter(), { at: [-4.6, 0.78, 0] });
    const blockHeading = this.add(Label("Semantic transformer block").height(0.2).color(GRAY_B).typewriter(), { at: [3.25, 2.05, 0] });
    const tokens = ["The", "model", "reads", "context"];
    const tokenRow = this.add(TokenRow(tokens, 0.24), { at: [-4.6, 1.62, 0] });
    const matrix = this.add(AttentionMatrix([
      [1, 0.28, 0.12, 0.08],
      [0.22, 0.95, 0.33, 0.2],
      [0.18, 0.46, 0.88, 0.42],
      [0.11, 0.31, 0.57, 0.92],
    ], tokens), { at: [-4.6, -1, 0] });
    const block = this.add(TransformerBlock({
      width: 3.6,
      blockHeight: 0.4,
      gap: 0.09,
      accent: TEAL_C,
      frame: GRAY_A,
      inputLabel: "Input stream",
      outputLabel: "Output stream",
      focus: ATTENTION_BLOCK_FOCUS,
    }), { at: [3.25, -0.25, 0] });
    const down = this.add(SignalFlow([[[-4.6, 1.39], [-4.6, 0.98]]], {
      edge: GOLD_C,
      pulse: GOLD_A,
      thickness: 0.04,
      pulseRadius: 0.08,
    }));
    const across = this.add(SignalFlow([[[-3.72, -1], [1.36, -1]]], {
      edge: TEAL_C,
      pulse: TEAL_A,
      thickness: 0.04,
      pulseRadius: 0.08,
    }));
    const footer = this.add(Label(
      "This family is for model structure, token relationships, and visible signal motion.",
    ).height(0.17).color(GRAY_B).typewriter(), { at: [0, -3.15, 0] });

    const timeline = new Timeline();
    timeline.animate(title).at(0).duration(1).ease("linear").typewrite();
    timeline.animate(subtitle).at(0.35).duration(1.7).ease("linear").typewrite();
    timeline.animate(tokensHeading).at(1.5).duration(0.85).ease("linear").typewrite();
    timeline.animate(tokenRow).at(1.9).duration(0.3).ease("linear").appear();
    timeline.animate(matrixHeading).at(2.8).duration(0.85).ease("linear").typewrite();
    timeline.animate(matrix).at(3.2).duration(0.35).ease("linear").appear();
    timeline.animate(down).at(3.55).duration(0.2).ease("linear").appear();
    timeline.animate(down).at(3.6).duration(1.8).ease("inOutQuad").to({ revealProgress: 1 });
    timeline.animate(blockHeading).at(5.5).duration(0.85).ease("linear").typewrite();
    timeline.animate(block).at(5.9).duration(0.35).ease("linear").appear();
    timeline.animate(across).at(6.2).duration(0.2).ease("linear").appear();
    timeline.animate(across).at(6.3).duration(1.7).ease("inOutQuad").to({ revealProgress: 1 });
    timeline.animate(footer).at(10).duration(1.7).ease("linear").typewrite();
    this.play(timeline);
    if (this.duration < 12.2) this.wait(12.2 - this.duration);
  }
}

render(import.meta.url, TransformerAttention);
