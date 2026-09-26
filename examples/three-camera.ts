import * as THREE from "three";
import { Animate, Scene, ThreeMobject, render } from "venu";
import type { MobjectState } from "venu";

interface OrbitState extends MobjectState {
  angle: number;
  radius: number;
}

class ThreeCameraScene extends Scene {
  constructor() {
    super({ width: 1280, height: 720, background: "#020617" });
  }

  override construct(): void {
    const cubes: THREE.Mesh[] = [];
    const world = this.add(new ThreeMobject<OrbitState>({
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
      update({ camera }, state) {
        camera.position.x = Math.sin(state.angle) * state.radius;
        camera.position.z = Math.cos(state.angle) * state.radius;
        camera.position.y = 3;
        camera.lookAt(0, 0, 0);
        cubes.forEach((cube, index) => {
          cube.rotation.x = state.angle * (0.55 + index * 0.1);
          cube.rotation.y = state.angle + index * 0.35;
        });
      },
    }, {
      style: { width: "1280px", height: "720px" },
      state: { angle: -0.7, radius: 9 },
    }));

    this.play(Animate(world, { angle: 1.2, radius: 7 }, { duration: 4 }));
  }
}

render(import.meta.url, ThreeCameraScene, { fps: 24 });
