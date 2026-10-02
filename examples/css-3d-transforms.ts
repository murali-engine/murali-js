import { render } from "murali-js";
import { Scene, clip, timeline } from "murali-js/core";
import { Group } from "murali-js/layout";
import { Rectangle } from "murali-js/primitives";
import { Label } from "murali-js/text";

class CSS3DTransforms extends Scene {
  constructor() {
    super({ width: 1280, height: 720, background: "#070816" });
  }

  override construct(): void {
    this.camera
      .perspective({ fov: 46, near: 0.1, far: 100 })
      .position([0, 1.2, 11])
      .lookAt([0, 0, 0]);

    const title = this.add(
      Label("CSS planes in a real 3D world")
        .height(0.28)
        .color("white")
        .depthMode("overlay")
        .layer(1000),
    );
    this.toEdge(title, "up", { margin: 0.5 });

    const left = Rectangle()
      .size([3.2, 2.1])
      .position([-3.2, 0, -1.2])
      .rotation3D([8, -28, -4])
      .fill("linear-gradient(135deg, #22d3ee, #2563eb)")
      .css({ borderRadius: "28px", boxShadow: "0 32px 80px rgb(34 211 238 / 24%)" });
    const center = Rectangle()
      .size([3.2, 2.1])
      .position([0, 0.15, 0.4])
      .rotation3D([-6, 6, 2])
      .fill("linear-gradient(135deg, #818cf8, #7c3aed)")
      .css({ borderRadius: "28px", boxShadow: "0 32px 80px rgb(129 140 248 / 30%)" });
    const right = Rectangle()
      .size([3.2, 2.1])
      .position([3.2, -0.1, -0.6])
      .rotation3D([10, 30, 5])
      .fill("linear-gradient(135deg, #f472b6, #db2777)")
      .css({ borderRadius: "28px", boxShadow: "0 32px 80px rgb(244 114 182 / 24%)" });

    const gallery = this.add(Group([left, center, right]).rotation3D([0, -8, 0]));

    const motion = clip((local) => {
      local.animate(gallery).duration(4).ease("inOutCubic").rotate3DTo([5, 14, 0]);
      local.animate([left, center, right])
        .stagger(0.18)
        .duration(2.4)
        .ease("inOutCubic")
        .scale3DTo([1.08, 1.08, 1.08]);
      local.animateCamera(this.camera)
        .duration(4)
        .ease("inOutCubic")
        .orbitTo({ azimuth: 15, elevation: 10, radius: 10.5 });
    });

    this.play(timeline().then(motion));
  }
}

render(import.meta.url, CSS3DTransforms, { fps: 24 });
