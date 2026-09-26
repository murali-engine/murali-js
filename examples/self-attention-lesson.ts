import {
  BLUE_A,
  GOLD_A,
  GRAY_B,
  GREEN_A,
  Label,
  PINK,
  Scene,
  TEAL_A,
  TensorView,
  Timeline,
  TokenRow,
  WHITE,
  render,
  selfAttentionLesson,
} from "murali-js";
import trace from "./data/self_attention_trace.json" with { type: "json" };

const VIEW = { labelHeight: 0.16, valueHeight: 0.14 };

/** Port of Murali `examples/self_attention_lesson.rs`. Every number comes from the trace file. */
class SelfAttentionLesson extends Scene {
  constructor() {
    super({ viewWidth: 15 });
  }

  override construct(): void {
    const lesson = selfAttentionLesson(trace);
    const title = this.add(Label("A Complete Self-Attention Step").height(0.4).color(WHITE).typewriter());
    this.toEdge(title, "up", { margin: 0.7 });
    const subtitle = this.add(Label(
      "Every displayed value is computed from the same semantic tensor snapshots.",
    ).height(0.18).color(GRAY_B).typewriter(), { at: [0, 3.05, 0] });
    const tokens = this.add(TokenRow(lesson.tokens, 0.22), { at: [0, 2.45, 0] });
    const embeddings = this.add(TensorView(lesson.embeddings, { ...VIEW, cellWidth: 0.8, cellHeight: 0.56 }), { at: [0, -0.2, 0] });
    const queries = this.add(TensorView(lesson.queries, { ...VIEW, cellWidth: 0.68, cellHeight: 0.52 }), { at: [-4.4, -0.2, 0] });
    const keys = this.add(TensorView(lesson.keys, { ...VIEW, cellWidth: 0.68, cellHeight: 0.52 }), { at: [0, -0.2, 0] });
    const values = this.add(TensorView(lesson.values, { ...VIEW, cellWidth: 0.68, cellHeight: 0.52 }), { at: [4.4, -0.2, 0] });
    const attention = this.add(TensorView(lesson.scores, {
      ...VIEW,
      cellWidth: 0.82,
      cellHeight: 0.56,
      morphs: [
        { at: 8.6, duration: 0.9, to: lesson.scaled },
        { at: 10, duration: 0.9, to: lesson.masked },
        { at: 11.4, duration: 0.9, to: lesson.attention },
      ],
    }), { at: [0, -0.2, 0] });
    const context = this.add(TensorView(lesson.context, { ...VIEW, cellWidth: 0.75, cellHeight: 0.54 }), { at: [-2.5, -0.2, 0] });
    const residual = this.add(TensorView(lesson.residual, { ...VIEW, cellWidth: 0.75, cellHeight: 0.54 }), { at: [2.5, -0.2, 0] });
    const output = this.add(TensorView(lesson.logits, {
      ...VIEW,
      cellWidth: 0.92,
      cellHeight: 0.56,
      morphs: [{ at: 17.6, duration: 1, to: lesson.probabilities }],
    }), { at: [0, -0.2, 0] });

    const stageText = [
      ["1. Token IDs anchor the embedding rows", TEAL_A],
      ["2. Learned projections produce Q, K, and V", BLUE_A],
      ["3. QK^T -> scale -> causal mask -> softmax", GOLD_A],
      ["4. Attention @ V, then add the residual stream", GREEN_A],
      ["5. Output projection -> softmax -> categorical sample", PINK],
    ] as const;
    const stages = stageText.map(([text, color]) => this.add(Label(text).height(0.2).color(color), { at: [0, 1.65, 0] }));
    const queryLabel = this.add(Label("Queries").height(0.18).color(BLUE_A), { at: [-4.4, -2.35, 0] });
    const keyLabel = this.add(Label("Keys").height(0.18).color(BLUE_A), { at: [0, -2.35, 0] });
    const valueLabel = this.add(Label("Values").height(0.18).color(BLUE_A), { at: [4.4, -2.35, 0] });
    const contextLabel = this.add(Label("Context").height(0.18).color(GREEN_A), { at: [-2.5, -2.35, 0] });
    const residualLabel = this.add(Label("Context + residual").height(0.18).color(GREEN_A), { at: [2.5, -2.35, 0] });
    const sample = this.add(Label(
      `u = 0.78 selects '${lesson.sample.token}' with p = ${lesson.sample.probability.toFixed(3)}`,
    ).height(0.22).color(GOLD_A), { at: [0, -3.2, 0] });

    const [embeddingsStage, projectionStage, attentionStage, residualStage, outputStage] = stages;
    if (!embeddingsStage || !projectionStage || !attentionStage || !residualStage || !outputStage) {
      throw new Error("The lesson is missing a stage caption.");
    }
    const timeline = new Timeline();
    timeline.animate(title).at(0).duration(0.8).ease("linear").typewrite();
    timeline.animate(subtitle).at(0.25).duration(1.4).ease("linear").typewrite();
    timeline.animate([tokens]).at(1.2).duration(0.45).ease("linear").appear();
    timeline.animate([embeddings, embeddingsStage]).at(2).duration(0.45).ease("linear").appear();
    timeline.animate([embeddings, embeddingsStage]).at(4).duration(0.4).ease("linear").fadeTo(0);
    timeline.animate([queries, keys, values, queryLabel, keyLabel, valueLabel, projectionStage]).at(4.4).duration(0.45).ease("linear").appear();
    timeline.animate([queries, keys, values, queryLabel, keyLabel, valueLabel, projectionStage]).at(7).duration(0.4).ease("linear").fadeTo(0);
    timeline.animate([attention, attentionStage]).at(7.4).duration(0.45).ease("linear").appear();
    timeline.animate([attention, attentionStage]).at(12.8).duration(0.4).ease("linear").fadeTo(0);
    timeline.animate([context, residual, contextLabel, residualLabel, residualStage]).at(13.2).duration(0.45).ease("linear").appear();
    timeline.animate([context, residual, contextLabel, residualLabel, residualStage]).at(15.8).duration(0.4).ease("linear").fadeTo(0);
    timeline.animate([output, outputStage]).at(16.2).duration(0.45).ease("linear").appear();
    timeline.animate([sample]).at(19).duration(0.6).ease("linear").appear();
    this.play(timeline);
    if (this.duration < 21) this.wait(21 - this.duration);
  }
}

render(import.meta.url, SelfAttentionLesson);
