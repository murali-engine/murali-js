import * as THREE from "three";
import { render } from "murali-js";
import { Scene, clip, timeline } from "murali-js/core";
import { ThreeTattva } from "murali-js/adapters";
import { Label } from "murali-js/text";
import type { TattvaState } from "murali-js/core";

interface OrbitState extends TattvaState {
  angle: number;
}

class ThreeCameraScene extends Scene {
  constructor() {
    super({ width: 1280, height: 720, background: "#020617" });
  }

  override construct(): void {
    this.camera
      .perspective({ fov: 42, near: 0.1, far: 100 })
      .position([-5.5, 3.2, 9])
      .lookAt([0, 0, 0]);

    const cubes: THREE.Mesh[] = [];
    this.add(
      Label("CSS in the same 3D world")
        .height(0.28)
        .color("#c4b5fd")
        .at([0, 2.35, 0]),
    );
    const overlay = this.add(
      Label("Scene camera · Perspective")
        .height(0.2)
        .color("white")
        .depthMode("overlay")
        .layer(1000),
    );
    this.toEdge(overlay, "up", { margin: 0.45 });

    const world = this.add(new ThreeTattva<OrbitState>({
      setup({ scene }) {
        scene.add(new THREE.AmbientLight(0x8ea7ff, 1.8));
        const light = new THREE.DirectionalLight(0xffffff, 5);
        light.position.set(3, 5, 6);
        scene.add(light);
        [-2.3, 0, 2.3].forEach((x, index) => {
          const cube = new THREE.Mesh(
            new THREE.BoxGeometry(1.4, 1.4, 1.4),
            new THREE.MeshStandardMaterial({ color: [0x22d3ee, 0x818cf8, 0xf472b6][index] }),
          );
          cube.position.x = x;
          scene.add(cube);
          cubes.push(cube);
        });
      },
      update(_context, state) {
        cubes.forEach((cube, index) => {
          cube.rotation.x = state.angle * (0.55 + index * 0.1);
          cube.rotation.y = state.angle + index * 0.35;
        });
      },
    }, {
      css: { width: "1280px", height: "720px" },
      state: { angle: -0.7 },
    }));

    const cameraMove = clip((local) => {
      local.animate(world).duration(4).ease("linear").to({ angle: 1.2 });
      local.animateCamera(this.camera)
        .duration(2)
        .ease("inOutCubic")
        .frameTo([4.5, 2.4, 7.5], [0, 0, 0]);
      local.animateCamera(this.camera)
        .at(2)
        .duration(2)
        .ease("inOutCubic")
        .orbitTo({ azimuth: -32, elevation: 18, radius: 7.4 });
    });
    this.play(timeline().then(cameraMove));
  }
}

render(import.meta.url, ThreeCameraScene, { fps: 24 });
