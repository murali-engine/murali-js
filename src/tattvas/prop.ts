import * as THREE from "three";
import { ThreeTattva } from "../core/ThreeTattva.ts";
import type { Vec3 } from "../core/Tattva.ts";
import type { GltfModel } from "./gltf.ts";

/** A static glTF prop. Position, rotation, and scale are applied in the 3D world, not by sliding the canvas. */
export function Prop3D(model: GltfModel): ThreeTattva {
  return new ThreeTattva({
    setup({ scene }) {
      for (const mesh of model.meshes) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(mesh.positions, 3));
        geometry.setIndex(new THREE.BufferAttribute(mesh.indices, 1));
        const [red, green, blue, alpha] = mesh.color;
        scene.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
          color: new THREE.Color(red, green, blue),
          opacity: alpha,
          transparent: alpha < 1,
        })));
      }
    },
  });
}

/** Uniform fit used by the model inspector. `span` is the longest side after fitting. */
export function fittedScale(dimensions: Vec3, requested: Vec3, fit: boolean, span = 4.2): Vec3 {
  const longest = Math.max(dimensions[0], dimensions[1], dimensions[2]);
  if (!Number.isFinite(longest) || longest <= Number.EPSILON) {
    throw new Error("model has empty or invalid 3D bounds");
  }
  const factor = fit ? span / longest : 1;
  return [requested[0] * factor, requested[1] * factor, requested[2] * factor];
}

/** Camera distance that frames a fitted model at the given vertical field of view. */
export function framingDistance(dimensions: Vec3, fovDegrees: number, aspect: number): number {
  const half: Vec3 = [dimensions[0] * 0.5, dimensions[1] * 0.5, dimensions[2] * 0.5];
  const tanVertical = Math.tan(fovDegrees * Math.PI / 360);
  const vertical = half[1] / tanVertical;
  const horizontal = half[0] / (tanVertical * aspect);
  return Math.max(1, (Math.max(vertical, horizontal) + half[2]) * 1.35);
}

/** `position - rotation * (center * scale)`, matching the inspector's centering step. */
export function centeredPropPosition(position: Vec3, rotationDegrees: Vec3, center: Vec3, scale: Vec3): Vec3 {
  const rotated = rotateEulerXYZ([
    center[0] * scale[0],
    center[1] * scale[1],
    center[2] * scale[2],
  ], rotationDegrees);
  return [position[0] - rotated[0], position[1] - rotated[1], position[2] - rotated[2]];
}

/** Intrinsic X, then Y, then Z. Degrees, matching the timeline's `rotationX/Y/Z`. */
export function rotateEulerXYZ([x, y, z]: Vec3, [rotationX, rotationY, rotationZ]: Vec3): Vec3 {
  const rx = rotationX * Math.PI / 180;
  const ry = rotationY * Math.PI / 180;
  const rz = rotationZ * Math.PI / 180;
  const cosX = Math.cos(rx);
  const sinX = Math.sin(rx);
  const cosY = Math.cos(ry);
  const sinY = Math.sin(ry);
  const cosZ = Math.cos(rz);
  const sinZ = Math.sin(rz);
  const afterX: Vec3 = [x, y * cosX - z * sinX, y * sinX + z * cosX];
  const afterY: Vec3 = [
    afterX[0] * cosY + afterX[2] * sinY,
    afterX[1],
    -afterX[0] * sinY + afterX[2] * cosY,
  ];
  return [
    afterY[0] * cosZ - afterY[1] * sinZ,
    afterY[0] * sinZ + afterY[1] * cosZ,
    afterY[2],
  ];
}
