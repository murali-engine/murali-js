import {
  Label,
  Prop3D,
  Scene,
  centeredPropPosition,
  fittedScale,
  framingDistance,
  modelCenter,
  modelDimensions,
  parseGltf,
  render,
} from "venu";
import type { Vec3 } from "venu";
import { appleBin, appleGltf } from "./assets/props/files.ts";

const FOV = 42;
const ASPECT = 16 / 9;
const TURN_SPEED = 24;

/**
 * Port of Murali's default `examples/model_inspector.rs` preview.
 * The apple is fitted and turns with scene time. Pointer orbit is not part of the recording.
 */
class ModelInspector extends Scene {
  override construct(): void {
    const model = parseGltf(appleGltf, [appleBin]);
    const dimensions = modelDimensions(model);
    const center = modelCenter(model);
    const scale = fittedScale(dimensions, [1, 1, 1], true);
    const displayed: Vec3 = [
      dimensions[0] * Math.abs(scale[0]),
      dimensions[1] * Math.abs(scale[1]),
      dimensions[2] * Math.abs(scale[2]),
    ];
    const distance = framingDistance(displayed, FOV, ASPECT);
    const radius = Math.hypot(displayed[0], displayed[1], displayed[2]) * 0.5;
    const frameHeight = this.viewHeight;
    this.camera.perspective({
      fov: FOV,
      near: Math.max(0.01, distance - radius * 2),
      far: distance + radius * 4 + 10,
    }).position([0, radius * 0.12, distance]).lookAt([0, 0, 0]);

    this.add(Label("3D Model Preview").height(frameHeight * 0.035).color(rgb(0.96, 0.95, 0.9)).depthMode("overlay"), {
      at: [0, frameHeight * 0.39, 0],
    });
    this.add(Label(
      `demo-apple.gltf  |  ${model.meshCount} meshes  |  ${dimensions.map((value) => value.toFixed(2)).join(" x ")} units`,
    ).height(frameHeight * 0.018).color(rgb(0.7, 0.76, 0.84)).depthMode("overlay"), {
      at: [0, frameHeight * 0.335, 0],
    });
    this.add(Label(
      "The model turns with scene time. Pointer orbit is not part of the recorded picture.",
    ).height(frameHeight * 0.017).color(rgb(0.62, 0.68, 0.76)).depthMode("overlay"), {
      at: [0, -frameHeight * 0.41, 0],
    });
    const prop = this.add(Prop3D(model).scale3D(scale).at(centeredPropPosition([0, 0, 0], [0, 0, 0], center, scale)));
    this.updater((time, states) => {
      const state = states.get(prop);
      if (!state) return;
      const rotation: Vec3 = [0, time * TURN_SPEED, 0];
      const place = centeredPropPosition([0, 0, 0], rotation, center, scale);
      state.rotationX = rotation[0];
      state.rotationY = rotation[1];
      state.rotationZ = rotation[2];
      state.x = place[0];
      state.y = place[1];
      state.z = place[2];
    });
    this.wait(360 / TURN_SPEED);
  }
}

function rgb(red: number, green: number, blue: number): string {
  const channel = (value: number) => Math.round(value * 255);
  return `rgb(${channel(red)}, ${channel(green)}, ${channel(blue)})`;
}

render(import.meta.url, ModelInspector);
