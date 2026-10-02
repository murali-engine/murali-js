import { render } from "murali-js";
import { Scene, Timeline } from "murali-js/core";
import { Prop3D, parseGlb, parseGltf } from "murali-js/primitives";
import { palette } from "murali-js/style";
import { Label } from "murali-js/text";
import { appleBin, appleGltf, pyramidGlb } from "./assets/props/files.ts";

const { GOLD_C, GRAY_B, TEAL_C, WHITE } = palette;
const START_YAW = -20;
const FULL_TURN = 340;

/** Compares single-file GLB and loose glTF assets through the same Prop3D animation grammar. */
class Prop3DFormats extends Scene {
  override construct(): void {
    this.camera
      .perspective({ fov: 44, near: 0.1, far: 100 })
      .position([0, 1.25, 8.2])
      .lookAt([0, 0, 0]);

    const title = this.add(
      Label("Two packages, one Prop3D API").height(0.42).color(WHITE).typewriter().depthMode("overlay"),
      { at: [0, 2.9, 0] },
    );
    const subtitle = this.add(Label(
      "GLB carries one binary bundle; glTF can keep JSON and buffers separate.",
    ).height(0.18).color(GRAY_B).typewriter().depthMode("overlay"), { at: [0, 2.4, 0] });

    const glb = this.add(
      Prop3D(parseGlb(pyramidGlb)).scale(1.15).rotation3D([0, START_YAW, 0]),
      { at: [-2.4, -0.45, 0] },
    );
    const gltf = this.add(
      Prop3D(parseGltf(appleGltf, [appleBin])).scale(1.35).rotation3D([0, START_YAW, 0]),
      { at: [2.4, -0.45, 0] },
    );

    const glbLabel = this.add(
      Label("GLB  ·  one portable file").height(0.2).color(TEAL_C).typewriter().depthMode("overlay"),
      { at: [-2.4, -2.3, 0] },
    );
    const gltfLabel = this.add(
      Label("glTF  ·  JSON + sibling buffer").height(0.2).color(GOLD_C).typewriter().depthMode("overlay"),
      { at: [2.4, -2.3, 0] },
    );
    const note = this.add(Label(
      "Loading differs; placement, transforms, camera, and timeline remain identical.",
    ).height(0.17).color(GRAY_B).typewriter().depthMode("overlay"), { at: [0, -3.05, 0] });

    const timeline = new Timeline();
    timeline.animate(title).at(0).duration(0.8).ease("linear").typewrite();
    timeline.animate(subtitle).at(0.25).duration(1.4).ease("linear").typewrite();
    timeline.animate([glb, gltf]).at(0.9).duration(0.7).ease("outCubic").moveBy([0, 0.65, 0]);
    timeline.animate([glb, gltf]).at(1.8).duration(2.4).ease("inOutCubic").rotate3DTo([0, FULL_TURN, 0]);
    timeline.animate(glbLabel).at(2.15).duration(0.8).ease("linear").typewrite();
    timeline.animate(gltfLabel).at(2.35).duration(0.9).ease("linear").typewrite();
    timeline.animate(note).at(3.5).duration(1.5).ease("linear").typewrite();
    this.play(timeline);
  }
}

render(import.meta.url, Prop3DFormats);
