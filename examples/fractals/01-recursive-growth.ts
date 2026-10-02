import { render } from "murali-js";
import { Scene, timeline } from "murali-js/core";
import { KochSnowflake, SierpinskiTriangle, FractalTree } from "murali-js/maths";
import { palette } from "murali-js/style";
import { Label } from "murali-js/text";

class RecursiveGrowth extends Scene {
  constructor() {
    super({ viewWidth: 16 });
  }

  override construct(): void {
    const title = this.add(Label("Simple rules, infinite detail").height(0.48), { at: [0, 3.45] });
    const subtitle = this.add(
      Label("Iteration depth is ordinary timeline state.").height(0.2).color(palette.GRAY_B),
      { at: [0, 2.92] },
    );

    const koch = this.add(
      KochSnowflake({ iterations: 5, radius: 1.65 })
        .iteration(0)
        .stroke({ color: palette.BLUE_C, width: 0.035 })
        .css({ filter: "drop-shadow(0 0 12px rgb(88 196 221 / 32%))" }),
      { at: [-5.1, -0.2] },
    );
    const sierpinski = this.add(
      SierpinskiTriangle({ iterations: 6, size: 3.35 })
        .iteration(0)
        .stroke({ color: palette.PURPLE_B, width: 0.032 })
        .css({ filter: "drop-shadow(0 0 12px rgb(156 92 224 / 28%))" }),
      { at: [0, -0.15] },
    );
    const tree = this.add(
      FractalTree({ iterations: 9, trunkLength: 1.08, angle: 25, branchScale: 0.7 })
        .iteration(0)
        .stroke({ color: palette.GREEN_C, width: 0.032 })
        .scale(0.8),
      { at: [5.05, -0.2] },
    );

    const labels = [
      this.add(Label("Koch snowflake").height(0.2).color(palette.GRAY_A), { at: [-5.1, -2.65] }),
      this.add(Label("Sierpiński triangle").height(0.2).color(palette.GRAY_A), { at: [0, -2.65] }),
      this.add(Label("Recursive tree").height(0.2).color(palette.GRAY_A), { at: [5.05, -2.65] }),
    ];

    this.play(timeline((t) => {
      t.animate(title).duration(0.65).typewrite();
      t.animate(subtitle).at(0.2).duration(0.7).typewrite();
      [koch, sierpinski, tree].forEach((fractal, index) => {
        t.animate(fractal).at(0.65 + index * 0.18).duration(0.45).draw();
        t.animate(fractal)
          .at(1.15 + index * 0.22)
          .duration(4.2)
          .ease("inOutCubic")
          .to(fractal.iterationState(fractal.maxIteration));
        t.animate(labels[index]!).at(0.85 + index * 0.18).duration(0.45).appear();
      });
    }));
    this.wait(0.8);
  }
}

render(import.meta.url, RecursiveGrowth, { fps: 60 });
