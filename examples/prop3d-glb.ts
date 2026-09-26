import {
  GRAY_B,
  Label,
  Prop3D,
  Scene,
  Timeline,
  WHITE,
  parseGlb,
  render,
} from "murali-js";
import { pyramidGlb } from "./assets/props/files.ts";

const YAW = -0.35 * 180 / Math.PI;
const FULL_TURN = (Math.PI * 2 - 0.35) * 180 / Math.PI;

/**
 * Port of Murali `examples/prop3d_glb.rs`.
 * The two quaternions in that scene are the same orientation, so a quaternion blend does not turn.
 * The yaw here runs through one full revolution, which is the turn the scene asks for.
 */
class Prop3DGlb extends Scene {
  override construct(): void {
    this.camera.perspective({ fov: 44, near: 0.1, far: 100 }).position([0, 1.25, 7.2]).lookAt([0, 0.1, 0]);
    const title = this.add(Label("Prop3D: GLB").height(0.42).color(WHITE).typewriter().depthMode("overlay"), { at: [0, 2.85, 0] });
    const subtitle = this.add(Label(
      "A single-file .glb prop placed, lifted, dropped, and rotated like any other Murali tattva.",
    ).height(0.18).color(GRAY_B).typewriter().depthMode("overlay"), { at: [0, 2.35, 0] });
    const prop = this.add(
      Prop3D(parseGlb(pyramidGlb)).scale(1.4).rotation3D([0, YAW, 0]),
      { at: [-0.85, -0.65, 0] },
    );
    const note = this.add(Label(
      "GLB is the preferred prop format because geometry, materials, and textures can travel as one file.",
    ).height(0.17).color(GRAY_B).typewriter().depthMode("overlay"), { at: [0, -2.85, 0] });

    const timeline = new Timeline();
    timeline.animate(title).at(0).duration(0.8).ease("linear").typewrite();
    timeline.animate(subtitle).at(0.25).duration(1.5).ease("linear").typewrite();
    timeline.animate(prop).at(0.8).duration(0.55).ease("outQuad").moveTo([-0.25, 0.12, 0]);
    timeline.animate(prop).at(1.35).duration(0.55).ease("inQuad").moveTo([0.55, -0.65, 0]);
    timeline.animate(prop).at(2.05).duration(2.2).ease("inOutCubic").rotate3DTo([0, FULL_TURN, 0]);
    timeline.animate(note).at(3).duration(1.5).ease("linear").typewrite();
    this.play(timeline);
  }
}

render(import.meta.url, Prop3DGlb);
