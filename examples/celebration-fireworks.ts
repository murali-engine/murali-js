import { render } from "murali-js";
import { Scene, timeline } from "murali-js/core";
import { Label } from "murali-js/text";
import { Fireworks } from "murali-js/storytelling";

class CelebrationFireworks extends Scene {
  constructor() {
    super({ background: "#050513" });
  }

  override construct(): void {
    const fireworks = this.add(
      Fireworks()
        .size([16, 9])
        .burstCount(7)
        .particlesPerBurst(46)
        .cycleDuration(5.2)
        .spread(2.25)
        .gravity(1.35)
        .glow(1)
        .seed(27)
        .layer(0),
    );
    const title = this.add(
      Label("We did it!")
        .height(0.92)
        .color("#fffaf0")
        .depthMode("overlay")
        .layer(2),
      { at: [0, 0.35, 0] },
    );
    const subtitle = this.add(
      Label("A moment worth celebrating")
        .height(0.28)
        .color("#d9d5ff")
        .depthMode("overlay")
        .layer(2),
      { at: [0, -0.7, 0] },
    );
    this.play(timeline((local) => {
      local.animate(title).duration(0.65).ease("outCubic").appear();
      local.animate(subtitle).at(0.2).duration(0.7).ease("outCubic").appear();
    }));
    this.wait(5.4);
    this.play(timeline((local) => {
      local.animate([title, subtitle, fireworks]).duration(0.55).disappear();
    }));
  }
}

render(import.meta.url, CelebrationFireworks, { fps: 30 });
