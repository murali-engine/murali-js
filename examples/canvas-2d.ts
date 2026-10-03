import { render } from "murali-js";
import { Scene, Timeline, type TattvaState } from "murali-js/core";
import { CanvasTattva } from "murali-js/adapters";

interface WaveState extends TattvaState {
  phase: number;
  amplitude: number;
}

class Canvas2DScene extends Scene {
  constructor() {
    super({ width: 1280, height: 720, fps: 30, background: "#07111f" });
  }

  override construct(): void {
    const wave = this.add(new CanvasTattva<WaveState>({
      draw({ canvas, context: draw, theme }, state, { time }) {
        const { width, height } = canvas;
        draw.fillStyle = theme.colors.surface;
        draw.fillRect(0, 0, width, height);

        const gradient = draw.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, "#22d3ee");
        gradient.addColorStop(1, "#a78bfa");
        draw.strokeStyle = gradient;
        draw.lineWidth = Math.max(3, height * 0.018);
        draw.lineCap = "round";
        draw.beginPath();
        for (let x = 0; x <= width; x += 3) {
          const y = height / 2
            + Math.sin(x / width * Math.PI * 4 + state.phase) * height * state.amplitude
            + Math.sin(x / width * Math.PI * 9 - time * 2) * height * 0.035;
          if (x === 0) draw.moveTo(x, y);
          else draw.lineTo(x, y);
        }
        draw.stroke();
      },
    }, {
      size: [10, 4.5],
      state: { phase: 0, amplitude: 0.12 },
      css: { borderRadius: "28px", boxShadow: "0 28px 80px rgba(0,0,0,.35)" },
    }));

    const motion = new Timeline();
    motion.animate(wave).duration(4).ease("linear").to({ phase: Math.PI * 4, amplitude: 0.32 });
    this.play(motion);
  }
}

render(import.meta.url, Canvas2DScene);
