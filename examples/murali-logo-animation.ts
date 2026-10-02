import { render } from "murali-js";
import { MuraliLogoMark, MuraliLogoSequence } from "murali-js/composite";
import { Scene } from "murali-js/core";

/** Reusable one-oval → Murali mark → one-oval brand animation. */
class MuraliLogoAnimation extends Scene {
  constructor() {
    super({ frame: "square", background: "#f7f4ed" });
  }

  override construct(): void {
    const mark = this.add(MuraliLogoMark({ width: 6.6 }));
    this.play(MuraliLogoSequence(mark));
  }
}

render(import.meta.url, MuraliLogoAnimation, {
  output: "./output/murali-logo-animation.webm",
  transparent: true,
});
