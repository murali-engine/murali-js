import { Scene, Square, Timeline, render } from "murali-js";

class ShapeFillRevealScene extends Scene {
  override construct(): void {
    const square = this.add(
      Square().size(2).fill("#ef4444").stroke({ color: "#ffffff", width: 0.08 }),
    );
    const timeline = new Timeline();
    timeline.animate(square).duration(2).ease("linear").draw();
    timeline.animate(square).at(2).duration(2).ease("linear").undraw();
    this.play(timeline);
  }
}

render(import.meta.url, ShapeFillRevealScene);
