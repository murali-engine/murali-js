import { render } from "murali-js";
import { Scene, timeline } from "murali-js/core";
import { palette } from "murali-js/style";
import { Circle } from "murali-js/primitives";
import { Label } from "murali-js/text";

class CaptureMarkers extends Scene {
  override construct(): void {
    const title = this.add(Label("Scene-authored captures").height(0.55), { at: [0, 2.7, 0] });
    const dot = this.add(Circle().radius(0.7).fill(palette.TEAL_C), { at: [-4, 0, 0] });
    this.play(timeline((local) => {
      local.animate(title).duration(0.5).typewrite();
      local.animate(dot).duration(2).ease("inOutCubic").moveTo([4, 0, 0]);
      local.animate(dot).duration(2).ease("inOutCubic").setColor(palette.GOLD_C);
    }));

    this.captureScreenshotsNamed([
      [0, "captures/start.png"],
      [1, "captures/middle.png"],
    ]);
    this.captureScreenshots([2]);
    this.captureGifRange("dot-journey", { from: 0, to: 2, fps: 12 });
    this.captureGif("highlights", [
      1.25,
      1.3,
      1.5,
      2.0,
    ]);
  }
}

render(import.meta.url, CaptureMarkers, { fps: 30 });
