import { render } from "murali-js";
import { Canvas3DTattva } from "murali-js/adapters";
import { Scene, Timeline, type TattvaState } from "murali-js/core";

interface ClearState extends TattvaState {
  amount: number;
}

class Canvas3DTestScene extends Scene {
  constructor() {
    super({ width: 800, height: 450, viewWidth: 8, fps: 20 });
  }

  override construct(): void {
    const surface = this.add(new Canvas3DTattva<ClearState>({
      setup({ canvas }) {
        canvas.dataset.setupCount = String(Number(canvas.dataset.setupCount ?? 0) + 1);
      },
      draw({ canvas, gl }, state, sample) {
        canvas.dataset.sample = JSON.stringify(sample);
        gl.clearColor(1 - state.amount, state.amount, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
      },
    }, { size: [4, 2], state: { amount: 0 } }));

    const timeline = new Timeline();
    timeline.animate(surface).duration(1).ease("linear").to({ amount: 1 });
    this.play(timeline);
  }
}

render(import.meta.url, Canvas3DTestScene);
