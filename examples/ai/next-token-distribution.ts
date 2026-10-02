import { render } from "murali-js";
import { EntropyBar, NextTokenBoard, nextTokenChoice } from "murali-js/ai";
import { Scene, Timeline } from "murali-js/core";
import { palette } from "murali-js/style";
import { Label } from "murali-js/text";
const { GOLD_A, GOLD_C, GRAY_B, GRAY_D, WHITE } = palette;

const TOKENS = ["scattered", "blue", "across", "through", "softly", "above", "dark"];
const LOGITS = [2.8, 2.25, 1.7, 1.05, 0.4, -0.1, -0.8];
const SAMPLING = { temperature: 0.85, topK: 5, topP: 0.9, unit: 0.61 };

/** AI teaching example: one draw from filtered logits. */
class NextTokenScene extends Scene {
  override construct(): void {
    const choice = nextTokenChoice(TOKENS, LOGITS, SAMPLING);
    const title = this.add(Label("How the next token is chosen").height(0.38).color(WHITE).typewriter());
    this.toEdge(title, "up", { margin: 0.58 });
    const board = this.add(NextTokenBoard(choice, SAMPLING), { at: [0, -0.2, 0] });
    const entropy = this.add(EntropyBar(
      choice.candidates.map((candidate) => candidate.sampling),
      { track: GRAY_D, fill: GOLD_C, label: GRAY_B },
    ), { at: [0, -2.75, 0] });
    const sentence = this.add(
      Label(`The light was  +  ${choice.selected}`).height(0.23).color(GOLD_A).typewriter(),
      { at: [0, -3.28, 0] },
    );

    const timeline = new Timeline();
    timeline.animate(title).at(0).duration(0.9).ease("linear").typewrite();
    timeline.animate(board).at(0.55).duration(0.75).ease("outCubic").appear();
    timeline.animate(entropy).at(1.15).duration(0.6).ease("outCubic").appear();
    timeline.animate(sentence).at(1.45).duration(1.5).ease("linear").typewrite();
    this.play(timeline);
  }
}

render(import.meta.url, NextTokenScene);
