import { Arrow, Label, Line, Path, Scene, Timeline, render } from "venu";

class TextAndPaths extends Scene {
  override construct(): void {
    const title = this.add(
      Label("Text and Paths ✨").height(0.48).color("white"),
      { at: [0, 3.25] },
    );
    const subtitle = this.add(
      Label("The preview and exporter sample the same reveal state.")
        .height(0.22)
        .color("#94a3b8"),
      { at: [0, 2.65] },
    );

    const axis = this.add(
      Line()
        .from([-5.5, 0.5])
        .to([5.5, 0.5])
        .stroke({ color: "#334155", width: 0.035 }),
    );
    const arrow = this.add(
      Arrow()
        .from([-4.8, 0.5])
        .to([4.8, 0.5])
        .stroke({ color: "#38bdf8", width: 0.065 }),
    );
    const curve = this.add(
      Path("M 0 1.6 C 1.2 0.1 2.8 3.1 4 1.6", {
        bounds: { x: 0, y: 0, width: 4, height: 3.2 },
      })
        .stroke({ color: "#a78bfa", width: 0.07 })
        .at([0, -2]),
    );

    const timeline = new Timeline();
    timeline.animate(title).duration(1.1).ease("linear").typewrite();
    timeline.animate(subtitle).at(0.7).duration(1.6).ease("linear").revealText();
    timeline.animate(axis).at(1.4).duration(0.8).ease("outCubic").draw();
    timeline.animate(arrow).at(1.9).duration(1.5).ease("inOutCubic").draw();
    timeline.animate(curve).at(3).duration(1.8).ease("inOutCubic").draw();
    this.play(timeline);
    this.wait(0.7);
  }
}

render(import.meta.url, TextAndPaths);
