import * as THREE from "three";
import { Camera3D, Scene, ThreeTattva, Timeline, render } from "venu";
import type { Camera3DState } from "venu";

interface OrbitState extends Camera3DState {
  angle: number;
}

class ThreeCameraScene extends Scene {
  constructor() {
    super({ width: 1280, height: 720, background: "#020617" });
  }

  override construct(): void {
    const cubes: THREE.Mesh[] = [];
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
    }).camera(
      Camera3D.perspective({ fov: 42, near: 0.1, far: 100 })
        .position([-5.5, 3.2, 9])
        .lookAt([0, 0, 0]),
    ));

    const timeline = new Timeline();
    timeline.animate(world).duration(4).ease("linear").to({ angle: 1.2 });
    timeline.animateCamera(world)
      .duration(2)
      .ease("inOutCubic")
      .frameTo([4.5, 2.4, 7.5], [0, 0, 0]);
    timeline.animateCamera(world)
      .at(2)
      .duration(2)
      .ease("inOutCubic")
      .orbitTo({ azimuth: -32, elevation: 18, radius: 7.4 });
    this.play(timeline);
  }
}

render(import.meta.url, ThreeCameraScene, { fps: 24 });
