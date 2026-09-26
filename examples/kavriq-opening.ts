import { Opening, Scene, Timeline, render } from "murali-js";

const PARTICLE_PALETTE = ["#2ed1c7", "#5294ff", "#eb6190", "#ffb838", "#7adc61", "#ff6666"];

/** Port of Murali `examples/kavriq_opening.rs`. */
class KavriqOpening extends Scene {
  constructor() {
    super({ width: 1280, height: 720, background: "#0a121c" });
  }

  override construct(): void {
    this.camera
      .perspective({ fov: 43, near: 0.1, far: 80 })
      .position([0, 2.15, 10.8])
      .lookAt([0, -0.35, 0]);

    const opening = Opening("KAVRIQ", "The Science Behind AI")
      .texture("whiteMarble")
      .fontFamily("Satoshi, Inter, ui-sans-serif, system-ui, sans-serif")
      .style({
        letterHeight: 2.4,
        letterDepth: 0.95,
        letterGap: 0.34,
        particleCount: 1400,
        particleSize: 0.028,
        particlePalette: PARTICLE_PALETTE,
        taglineColor: "#f2f7fc",
      })
      .timing({ dissolveDuration: 0.82 })
      .addTo(this);

    const timeline = new Timeline();
    opening.animate(timeline);
    this.play(timeline);
  }
}

render(import.meta.url, KavriqOpening, { fps: 30 });
