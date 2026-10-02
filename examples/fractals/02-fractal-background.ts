import { render } from "murali-js";
import { Scene, timeline } from "murali-js/core";
import { KochSnowflake, FractalTree } from "murali-js/maths";
import { palette } from "murali-js/style";
import { Label } from "murali-js/text";

class FractalBackground extends Scene {
  constructor() {
    super({ viewWidth: 16 });
  }

  override construct(): void {
    const snowflake = this.add(
      KochSnowflake({ iterations: 6, radius: 3.2 })
        .iteration(1)
        .stroke({ color: palette.BLUE_C, width: 0.024 })
        .opacity(0.16)
        .scale(1.7)
        .rotate(10)
        .layer(-20)
        .css({ filter: "drop-shadow(0 0 18px rgb(88 196 221 / 35%))" }),
      { at: [-4.7, -0.5] },
    );
    const tree = this.add(
      FractalTree({ iterations: 10, trunkLength: 1.45, angle: 24, branchScale: 0.72 })
        .iteration(3)
        .stroke({ color: palette.PURPLE_B, width: 0.026 })
        .opacity(0.15)
        .scale(1.5)
        .layer(-20),
      { at: [5.5, -2.7] },
    );
    const title = this.add(Label("Fractals can be atmosphere, too.").height(0.62), { at: [0, 0.35] });
    const subtitle = this.add(
      Label("One reusable Tattva · low DOM cost · deterministic at every frame")
        .height(0.22)
        .color(palette.GRAY_A),
      { at: [0, -0.42] },
    );

    this.play(timeline((t) => {
      t.animate(snowflake).duration(9).ease("inOutCubic").to(snowflake.iterationState(6));
      t.animate(tree).duration(9).ease("inOutCubic").to(tree.iterationState(10));
      t.animate(title).at(0.35).duration(0.9).typewrite();
      t.animate(subtitle).at(0.85).duration(1.1).typewrite();
    }));
  }
}

render(import.meta.url, FractalBackground, { fps: 60 });
