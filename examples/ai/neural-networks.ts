import { render } from "murali-js";
import { NeuralNetwork, neuralNetwork } from "murali-js/ai";
import { Scene, Timeline } from "murali-js/core";
import { palette } from "murali-js/style";
import { Label } from "murali-js/text";

const { GOLD_A, GRAY_B, GREEN_C, WHITE } = palette;

/** AI teaching example: two features become ReLU activations and an output probability. */
class NeuralNetworks extends Scene {
  override construct(): void {
    const title = this.add(Label("A neural network makes a prediction").height(0.38).color(WHITE).typewriter());
    this.toEdge(title, "up", { margin: 0.72 });
    const subtitle = this.add(Label(
      "Values, signed weights, and activations are semantic state—not hand-positioned overlays.",
    ).height(0.17).color(GRAY_B).typewriter(), { at: [0, 2.82, 0] });

    const model = neuralNetwork([
      { id: "input", label: "Input features", nodes: ["x₁", "x₂"] },
      { id: "hidden", label: "Hidden layer", nodes: ["h₁", "h₂", "h₃"], activation: "ReLU" },
      { id: "output", label: "Prediction", nodes: ["ŷ"], activation: "sigmoid" },
    ], {
      layerSpacing: 2.65,
      nodeSpacing: 1.05,
      nodeRadius: 0.22,
      weights: [
        [[0.9, -0.4], [-0.6, 0.8], [0.3, 0.7]],
        [[1.2, -0.8, 0.9]],
      ],
    });

    // x = [0.8, -0.2]
    // ReLU(Wx + b) = [0.90, 0.00, 0.10]
    // sigmoid(vh - 0.25) = 0.72
    const network = this.add(NeuralNetwork(model, {
      showValues: true,
      valueDigits: 2,
      edgeThickness: 0.026,
      pulseRadius: 0.09,
    })
      .snapshot({
        name: "input",
        nodes: {
          "input:x₁": { value: 0.8, activation: 0.8, emphasis: 1 },
          "input:x₂": { value: -0.2, activation: -0.2, emphasis: 1 },
        },
      })
      .snapshot({
        name: "hidden",
        nodes: {
          "hidden:h₁": { value: 0.9, activation: 0.9, emphasis: 1 },
          "hidden:h₂": { value: 0, activation: 0, emphasis: 0.4 },
          "hidden:h₃": { value: 0.1, activation: 0.1, emphasis: 1 },
        },
      })
      .snapshot({
        name: "output",
        nodes: {
          "output:ŷ": { value: 0.72, activation: 0.72, emphasis: 1 },
        },
      }), { at: [0, 0.25, 0] });

    const inputCaption = this.add(Label("x = [0.8, −0.2]").height(0.2).color(GOLD_A).typewriter(), { at: [-3.65, -2.05, 0] });
    const hiddenCaption = this.add(Label("ReLU(Wx + b)").height(0.2).color(GOLD_A).typewriter(), { at: [0, -2.05, 0] });
    const outputCaption = this.add(Label("P(class) = 0.72").height(0.22).color(GREEN_C).typewriter(), { at: [3.55, -2.05, 0] });
    const footer = this.add(Label(
      "Green edges are positive weights; red edges are negative; thickness shows magnitude.",
    ).height(0.16).color(GRAY_B).typewriter(), { at: [0, -3.12, 0] });

    const timeline = new Timeline();
    timeline.animate(title).at(0).duration(0.9).ease("linear").typewrite();
    timeline.animate(subtitle).at(0.35).duration(1.45).ease("linear").typewrite();
    timeline.animate(network).at(1.3).duration(0.65).ease("outCubic").appear();
    timeline.animate(network).at(1.85).duration(0.7).ease("inOutCubic").morphTo(network.snapshotIndex("input"));
    timeline.animate(inputCaption).at(1.95).duration(0.65).ease("linear").typewrite();
    timeline.animate(network).at(2.65).duration(1.05).ease("inOutCubic").to({
      flowProgress: 0.5,
      morphProgress: network.snapshotIndex("hidden"),
    });
    timeline.animate(hiddenCaption).at(3.2).duration(0.7).ease("linear").typewrite();
    timeline.animate(network).at(4).duration(1.05).ease("inOutCubic").to({
      flowProgress: 1,
      morphProgress: network.snapshotIndex("output"),
    });
    timeline.animate(outputCaption).at(4.55).duration(0.7).ease("linear").typewrite();
    timeline.animate(network).at(5.1).duration(0).ease("linear").to({ flowProgress: 0 });
    timeline.animate(footer).at(5.25).duration(1.25).ease("linear").typewrite();
    this.play(timeline);
  }
}

render(import.meta.url, NeuralNetworks);
