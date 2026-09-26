import {
  GOLD_A,
  GOLD_C,
  GRAY_B,
  Label,
  NeuralNetwork,
  Scene,
  SignalFlow,
  Timeline,
  WHITE,
  networkDiagram,
  networkPaths,
  render,
} from "murali-js";

/** Port of Murali `examples/neural_networks.rs`. The gold pulse loops four times, then the trace stays. */
class NeuralNetworks extends Scene {
  override construct(): void {
    const title = this.add(Label("Neural Networks").height(0.38).color(WHITE).typewriter());
    this.toEdge(title, "up", { margin: 0.8 });
    const subtitle = this.add(Label(
      "A few inputs flow forward through the same network, then the scene stops.",
    ).height(0.18).color(GRAY_B).typewriter(), { at: [0, 2.95, 0] });
    const heading = this.add(Label("Signal flow through layers").height(0.2).color(GRAY_B).typewriter(), { at: [0, 2.3, 0] });
    const diagram = networkDiagram([3, 5, 4, 2], {
      layerSpacing: 1.7,
      nodeSpacing: 0.58,
      nodeRadius: 0.11,
      labels: ["Input", "Hidden", "Hidden", "Output"],
      inactive: [[1, 4], [2, 0]],
    });
    const paths = networkPaths(diagram);
    const network = this.add(NeuralNetwork(diagram), { at: [0, 0.15, 0] });
    const live = this.add(SignalFlow(paths, {
      edge: GOLD_C,
      pulse: GOLD_A,
      thickness: 0.04,
      pulseRadius: 0.09,
    }), { at: [0, 0.15, 0] });
    const trace = this.add(SignalFlow(paths, {
      edge: "rgba(250, 194, 77, 0.28)",
      pulse: "rgba(255, 245, 184, 0)",
      thickness: 0.022,
      pulseRadius: 0.001,
    }), { at: [0, 0.15, 0] });
    trace.setInitial({ revealProgress: 1 });
    const caption = this.add(Label(
      "Inactive nodes stay dim; repeated inference passes move left-to-right, never backward.",
    ).height(0.17).color(GRAY_B).typewriter(), { at: [0, -2.55, 0] });
    const footer = this.add(Label(
      "Weights usually change during training after loss/backprop, not during a plain inference pass.",
    ).height(0.17).color(GRAY_B).typewriter(), { at: [0, -3.1, 0] });

    const timeline = new Timeline();
    timeline.animate(title).at(0).duration(1).ease("linear").typewrite();
    timeline.animate(subtitle).at(0.35).duration(1.6).ease("linear").typewrite();
    timeline.animate(heading).at(1.5).duration(0.8).ease("linear").typewrite();
    timeline.animate(network).at(1.9).duration(0.8).ease("linear").appear();
    timeline.animate(caption).at(2.4).duration(1.1).ease("linear").typewrite();
    timeline.animate(live).at(2.75).duration(0.2).ease("linear").appear();
    for (let repeat = 0; repeat < 4; repeat += 1) {
      const start = 2.8 + repeat * 1.25;
      timeline.animate(live).at(start).duration(1.25).ease("inOutQuad").to({ revealProgress: 1 });
      if (repeat < 3) timeline.animate(live).at(start + 1.25).duration(0).ease("inOutQuad").to({ revealProgress: 0 });
    }
    timeline.animate(trace).at(4.05).duration(0.35).ease("linear").appear();
    timeline.animate(live).at(7.8).duration(0.35).ease("linear").fadeTo(0);
    timeline.animate(footer).at(8.2).duration(1.6).ease("linear").typewrite();
    this.play(timeline);
  }
}

render(import.meta.url, NeuralNetworks);
