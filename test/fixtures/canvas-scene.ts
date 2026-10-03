import { render } from "murali-js";
import { CanvasTattva } from "murali-js/adapters";
import { Scene, Timeline, type TattvaState } from "murali-js/core";

interface MarkerState extends TattvaState {
  amount: number;
}

class CanvasScene extends Scene {
  constructor() {
    super({ width: 800, height: 450, viewWidth: 8, fps: 20 });
  }

  override construct(): void {
    const marker = this.add(new CanvasTattva<MarkerState>({
      setup({ canvas }) {
        canvas.dataset.setupCount = String(Number(canvas.dataset.setupCount ?? 0) + 1);
      },
      draw({ canvas, context }, state, sample) {
        canvas.dataset.sample = JSON.stringify(sample);
        context.fillStyle = state.amount < 0.5 ? "#ff0000" : "#00ff00";
        context.fillRect(state.amount * (canvas.width - 40), 0, 40, 40);
      },
    }, { size: [4, 2], state: { amount: 0 } }));

    const timeline = new Timeline();
    timeline.animate(marker).duration(1).ease("linear").to({ amount: 1 });
    this.play(timeline);
  }
}

render(import.meta.url, CanvasScene);
