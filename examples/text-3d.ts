import { render } from "murali-js";
import { Scene, timeline } from "murali-js/core";
import { Text3D } from "murali-js/text";

/** True vector-extruded text with deterministic XYZ animation. */
class Text3DScene extends Scene {
  constructor() {
    super({ background: "#07111f" });
  }

  override construct(): void {
    this.camera
      .perspective({ fov: 38, near: 0.1, far: 100 })
      .position([0, 0.6, 15])
      .lookAt([0, 0, 0]);

    const title = this.add(
      Text3D("MURALI")
        .height(2)
        .depth(0.72)
        .bevel({ enabled: true, thickness: 0.06, size: 0.035, segments: 3 })
        .material({
          faceColor: "#f7efd8",
          sideColor: "#5f574b",
          roughness: 0.58,
          metalness: 0.08,
        })
        .rotation3D([16, -28, 0]),
    );

    this.play(timeline((local) => {
      local.animate(title)
        .duration(3)
        .ease("inOutCubic")
        .rotate3DTo([-10, 32, 4]);
    }));
    this.wait(0.5);
  }
}

render(import.meta.url, Text3DScene, { fps: 30 });
