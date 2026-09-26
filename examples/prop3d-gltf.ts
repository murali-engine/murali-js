import {
  GRAY_B,
  Label,
  Prop3D,
  Scene,
  Timeline,
  WHITE,
  parseGltf,
  render,
} from "venu";
import { appleBin, appleGltf } from "./assets/props/files.ts";

const YAW = -0.35 * 180 / Math.PI;
const FULL_TURN = (Math.PI * 2 - 0.35) * 180 / Math.PI;

/**
 * Port of Murali `examples/prop3d_gltf.rs`.
 * The apple's `.gltf` and sibling `.bin` are inlined, so the first frame does not wait on a fetch.
 * Yaw runs through one full revolution; the source quaternions are the same orientation.
 */
class Prop3DGltf extends Scene {
  override construct(): void {
    this.camera.perspective({ fov: 44, near: 0.1, far: 100 }).position([0, 1.25, 7.2]).lookAt([0, 0.1, 0]);
    const title = this.add(Label("Prop3D: glTF").height(0.42).color(WHITE).typewriter().depthMode("overlay"), { at: [0, 2.85, 0] });
    const subtitle = this.add(Label(
      "A loose .gltf apple prop loaded with its sibling .bin file, then animated with ordinary transforms.",
    ).height(0.18).color(GRAY_B).typewriter().depthMode("overlay"), { at: [0, 2.35, 0] });
    const prop = this.add(
      Prop3D(parseGltf(appleGltf, [appleBin])).scale(1.65).rotation3D([0, YAW, 0]),
      { at: [-0.85, -0.65, 0] },
    );
    const note = this.add(Label(
      "For loose glTF assets, keep the .gltf, .bin, and texture files together.",
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

render(import.meta.url, Prop3DGltf);
