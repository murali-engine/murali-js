import { render } from "murali-js";
import { MuraliLogoMark, MuraliLogoSwell } from "murali-js/composite";
import { Scene } from "murali-js/core";

/**
 * The settled mark rides one musical phrase.
 * Blue lifts from the baseline on the low swell, violet nudges after it,
 * and coral swells ahead of them. The rise and the return both ease,
 * and the phrase closes on the same breath it opens on.
 */
class MuraliLogoAnimation extends Scene {
  constructor() {
    super({ frame: "square", background: "#f7f4ed" });
  }

  override construct(): void {
    const mark = this.add(MuraliLogoMark({ width: 6.6 }));
    const swell = MuraliLogoSwell(mark);
    this.updater(swell.update);
    this.wait(swell.duration);
  }
}

render(import.meta.url, MuraliLogoAnimation, {
  output: "./output/murali-logo-animation.webm",
  transparent: true,
});
