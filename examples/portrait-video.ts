import { render } from "murali-js";
import { Scene, Timeline } from "murali-js/core";
import { palette } from "murali-js/style";
import { Circle } from "murali-js/primitives";
import { Label } from "murali-js/text";
const { BLUE_D, GREEN_D, WHITE } = palette;

/** Port of Murali `examples/portrait_video.rs`. */
class PortraitVideo extends Scene {
  constructor() {
    super({ frame: "portrait" });
  }

  override construct(): void {
    const title = this.add(Label("Portrait Video").height(0.55).color(WHITE));
    this.toEdge(title, "up", { margin: 0.8 });
    const first = this.add(
      Circle().radius(1.25).fill(BLUE_D).stroke({ width: 0.05, color: WHITE }),
      { at: [0, 3, 0] },
    );
    const second = this.add(
      Circle().radius(1.25).fill(GREEN_D).stroke({ width: 0.05, color: WHITE }),
      { at: [0, -1, 0] },
    );
    const footer = this.add(
      Label("9:16 composition, ordinary world coordinates")
        .height(0.28)
        .color("rgba(199, 209, 224, 1)"),
    );
    this.toEdge(footer, "down", { margin: 0.8 });

    const timeline = new Timeline();
    timeline.animate(title).at(0).duration(0.8).ease("linear").typewrite();
    timeline.animate(first).at(0.7).duration(1).ease("outCubic").draw();
    timeline.animate(second).at(1.5).duration(1).ease("outCubic").draw();
    timeline.animate(footer).at(2.2).duration(1).ease("linear").typewrite();
    this.play(timeline);
  }
}

render(import.meta.url, PortraitVideo);
