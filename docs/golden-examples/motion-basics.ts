/**
 * Golden API example: aspirational authoring contract, not part of the current build.
 * Original reference: Murali examples/motion_basics.rs.
 */
import { Circle, Label, Scene, Square, Timeline, render } from "venu";

class MotionBasics extends Scene {
  construct() {
    const title = this.add(Label("Motion Basics").height(0.38).color("white"));
    this.toEdge(title, "up", { margin: 0.8 });

    const moveShape = this.add(
      Square().size(0.9).fill("redB").stroke({ width: 0.04, color: "white" }),
      { at: [-5.4, 0.15, 0] },
    );
    const scaleShape = this.add(
      Circle().radius(0.5).fill("tealC").stroke({ width: 0.04, color: "white" }),
      { at: [-1.8, 0.15, 0] },
    );
    const rotateShape = this.add(
      Square().size(0.95).fill("blueD").stroke({ width: 0.04, color: "white" }),
      { at: [1.8, 0.15, 0] },
    );
    const fadeShape = this.add(
      Circle().radius(0.5).fill("goldC").stroke({ width: 0.04, color: "white" }),
      { at: [5.4, 0.15, 0] },
    );

    const timeline = new Timeline();
    timeline.animate(title).at(0).duration(1).typewrite();
    timeline.animate(moveShape).at(1).duration(2).ease("inOutQuad").moveTo([-4.4, 0.15, 0]);
    timeline.animate(scaleShape).at(1).duration(2).ease("outCubic").scaleTo(1.8);
    timeline.animate(rotateShape).at(1).duration(2).ease("inOutCubic").rotateTo(90);
    timeline.animate(fadeShape).at(1).duration(1).ease("linear").fadeTo(0.18);
    timeline.animate(fadeShape).at(2).duration(1).ease("linear").fadeTo(1);

    this.play(timeline);
  }
}

render(import.meta.url, MotionBasics);
