import { Label, Scene, WaveMesh, timeline, render } from "murali-js";

/** Reusable lower-screen animated mesh inspired by event-stage motion graphics. */
class WaveMeshBackground extends Scene {
  constructor() {
    super({ background: "#09072a" });
  }

  override construct(): void {
    this.camera
      .perspective({ fov: 46, near: 0.1, far: 100 })
      .position([0, 3.7, 8.6])
      .lookAt([0, -1.15, -0.8]);

    const terrain = this.add(
      WaveMesh()
        .size(18, 8)
        .amplitude(1.15)
        .samples(61, 27)
        .palette({
          near: "#f0a9ff",
          far: "#2637d4",
          peak: "#fff5ff",
          fill: "#5a27d6",
          sparkle: "#ffffff",
        })
        .lineOpacity(0.9)
        .fillOpacity(0.11)
        .nodes({ size: 0.032, opacity: 0.75 })
        .sparkles({ size: 0.085, ratio: 0.028 }),
      { at: [0, -2.05, 0] },
    );

    const title = this.add(
      Label("Deterministic ideas, beautifully in motion")
        .height(0.52)
        .color("#f8f5ff")
        .depthMode("overlay"),
      { at: [0, 1.65, 0] },
    );
    const subtitle = this.add(
      Label("A reusable WaveMesh background for openings, explainers, and transitions")
        .height(0.2)
        .color("#bcb8ff")
        .depthMode("overlay"),
      { at: [0, 0.95, 0] },
    );

    this.play(timeline((local) => {
      local.animate(terrain).duration(10).ease("linear").to({ phase: 2 });
      local.animate(title).duration(0.8).appear();
      local.animate(subtitle).at(0.25).duration(0.9).appear();
    }));
  }
}

render(import.meta.url, WaveMeshBackground, { fps: 30 });
