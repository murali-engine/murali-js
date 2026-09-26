import {
  GRAY_B,
  KvCache,
  Label,
  Scene,
  Timeline,
  WHITE,
  render,
} from "murali-js";

const TOKENS = ["The", "model", "reuses", "past", "keys", "values"];
const KEYS = [
  0.8, -0.2, 0.4, 0.1,
  0.5, 0.7, -0.3, 0.2,
  -0.4, 0.9, 0.6, -0.1,
  0.3, -0.6, 0.8, 0.5,
  0.7, 0.2, -0.5, 0.9,
  -0.2, 0.4, 0.6, 0.1,
];
const VALUES = [
  -0.1, 0.6, 0.3, 0.7,
  0.8, -0.5, 0.2, 0.4,
  0.4, 0.7, -0.3, 0.1,
  0.2, -0.8, 0.5, 0.6,
  -0.4, 0.9, 0.2, -0.2,
  0.5, 0.8, 0.3, -0.6,
];

/** Port of Murali `examples/kv_cache.rs`. Rows fill one token at a time. */
class KvCacheScene extends Scene {
  override construct(): void {
    const title = this.add(Label("Why generation gets faster").height(0.38).color(WHITE).typewriter());
    this.toEdge(title, "up", { margin: 0.58 });
    const cache = this.add(KvCache(
      { tokens: TOKENS, values: KEYS },
      { tokens: TOKENS, values: VALUES },
    ), { at: [0, -0.1, 0] });
    const note = this.add(Label(
      "Each generated token appends one key row and one value row; earlier rows are reused.",
    ).height(0.17).color(GRAY_B).typewriter(), { at: [0, -3.25, 0] });

    const timeline = new Timeline();
    timeline.animate(title).at(0).duration(0.9).ease("linear").typewrite();
    for (let occupied = 1; occupied <= TOKENS.length; occupied += 1) {
      timeline.animate(cache).at(0.55 + occupied * 0.48).duration(0.38).ease("outCubic").to({ occupancy: occupied });
    }
    timeline.animate(note).at(3.75).duration(1.8).ease("linear").typewrite();
    this.play(timeline);
  }
}

render(import.meta.url, KvCacheScene);
