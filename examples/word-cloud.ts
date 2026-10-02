import { render } from "murali-js";
import { Scene, Timeline } from "murali-js/core";
import { palette } from "murali-js/style";
import { Label } from "murali-js/text";
import { WordCloud } from "murali-js/maths";
const { BLUE_B, GOLD_C, GREEN_C, PINK_C, PURPLE_B, TEAL_C, WHITE } = palette;

const WORDS = [
  ["Murali JS", 100], ["animation", 88], ["deterministic", 82], ["timeline", 75],
  ["TypeScript", 70], ["CSS", 68], ["3D", 64], ["camera", 58],
  ["storytelling", 56], ["React", 50], ["SVG", 49], ["preview", 46],
  ["render", 45], ["scene", 44], ["motion", 42], ["layout", 40],
  ["particles", 37], ["shapes", 36], ["clips", 34], ["video", 32],
  ["WebGL", 30], ["typography", 27], ["graphs", 25], ["tensors", 24],
  ["creative", 22], ["code-first", 20], ["reusable", 18], ["world-space", 17],
] as const;

class WordCloudScene extends Scene {
  override construct(): void {
    const title = this.add(Label("A deterministic word cloud").height(0.42).color(WHITE).typewriter());
    this.toEdge(title, "up", { margin: 0.55 });
    const cloud = this.add(WordCloud(WORDS.map(([text, weight]) => ({ text, weight })))
      .size([13.5, 6.3])
      .fontRange([0.2, 1.15])
      .palette([TEAL_C, BLUE_B, PURPLE_B, PINK_C, GOLD_C, GREEN_C])
      .rotations([0, 0, 0, 0, -90, 90])
      .shape("ellipse")
      .padding(0.07)
      .seed(2026), { at: [0, -0.35, 0] });

    const timeline = new Timeline();
    timeline.animate(title).duration(0.8).ease("linear").typewrite();
    timeline.animate(cloud.words).at(0.45).stagger(0.045).duration(0.5).ease("outCubic").appear();
    this.play(timeline);
  }
}

render(import.meta.url, WordCloudScene);
