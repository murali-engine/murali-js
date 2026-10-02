import { render } from "murali-js";
import { Scene, timeline } from "murali-js/core";
import { Label } from "murali-js/text";
import { Fireworks } from "murali-js/storytelling";

class CelebrationFireworksShort extends Scene {
  constructor() {
    super({ frame: "portrait", background: "#050513" });
  }

  override construct(): void {
    const fireworks = this.add(
      Fireworks()
        .fit(this)
        .burstCount(8)
        .particlesPerBurst(42)
        .cycleDuration(5.4)
        .spread(1.8)
        .gravity(1.3)
        .glow(1)
        .seed(41)
        .layer(0),
    );
    const title = this.add(
      Label("Celebrate!")
        .height(0.72)
        .color("#fffaf0")
        .depthMode("overlay")
        .layer(2),
      { at: [0, 0.5, 0] },
    );
    const subtitle = this.add(
      Label("This moment is yours")
        .height(0.28)
        .color("#d9d5ff")
        .depthMode("overlay")
        .layer(2),
      { at: [0, -0.45, 0] },
    );
    this.play(timeline((local) => {
      local.animate(title).duration(0.65).ease("outCubic").appear();
      local.animate(subtitle).at(0.2).duration(0.7).ease("outCubic").appear();
    }));
    this.wait(5.6);
    this.play(timeline((local) => {
      local.animate([title, subtitle, fireworks]).duration(0.55).disappear();
    }));
  }
}

render(import.meta.url, CelebrationFireworksShort, { fps: 30 });
