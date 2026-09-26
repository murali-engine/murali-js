import { Circle, Label, Scene, Timeline, render } from "murali-js";

class BasicScene extends Scene {
  constructor() {
    super({ width: 1280, height: 720, background: "#070b16" });
  }

  override construct(): void {
    const glow = this.add(
      Circle()
        .radius(1.7)
        .at([-4.4, 0])
        .scale(0.72)
        .opacity(0)
        .css({
          background: "radial-gradient(circle at 35% 30%, #67e8f9, #2563eb 58%, #312e81)",
          boxShadow: "0 0 120px rgba(37, 99, 235, 0.5)",
        }),
    );
    const title = this.add(
      Label("Make motion deterministic.")
        .height(0.82)
        .at([1.9, 0.3])
        .opacity(0),
    );
    const detail = this.add(
      Label("DOM  ·  REACT  ·  THREE.JS")
        .height(0.27)
        .color("#93c5fd")
        .at([1.9, -0.8])
        .opacity(0)
        .css({ fontWeight: "600", letterSpacing: "0.22em" }),
    );

    const entrance = new Timeline();
    entrance.animate(glow).duration(0.9).ease("outCubic").appear();
    entrance.animate(glow).duration(0.9).ease("outCubic").moveTo([-4.1, 0]);
    entrance.animate(glow).duration(0.9).ease("outCubic").scaleTo(1);
    entrance.animate(title).at(0.7).duration(0.7).ease("outCubic").appear();
    entrance.animate(title).at(0.7).duration(0.7).ease("outCubic").moveTo([1.65, 0.3]);
    entrance.animate(detail).at(1.25).duration(0.55).ease("outCubic").appear();
    this.play(entrance);

    this.wait(0.8);

    const exit = new Timeline();
    exit.animate(title).duration(0.45).disappear();
    exit.animate(detail).duration(0.45).disappear();
    exit.animate(glow).duration(0.45).scaleTo(0.82);
    this.play(exit);
  }
}

render(import.meta.url, BasicScene);
