import { render } from "murali-js";
import { Scene, Timeline, imageFile } from "murali-js/core";
import { palette } from "murali-js/style";
import { Label } from "murali-js/text";
import { Axes3D, ParametricSurface } from "murali-js/maths";
const { BLUE_B, GOLD_C, GRAY_B, ORANGE_B, TEAL_C, WHITE } = palette;
import type { Vec3 } from "murali-js/core";
const EARTH_TEXTURE = imageFile("./assets/textures/earthmap1k.jpg");

/** Port of Murali `examples/textured_surface.rs`, using the same Earth surface image. */
class TexturedSurface extends Scene {
  override construct(): void {
    this.camera.perspective({ fov: 42, near: 0.1, far: 100 }).position([-3.2, 1.9, 5.8]).lookAt([0, 0, 0]);
    const title = this.add(Label("Textured Surface").height(0.38).color(WHITE).typewriter().depthMode("overlay"), { at: [0, 3, 0] });
    const subtitle = this.add(Label(
      "Texture mapping becomes easier to understand when one familiar image wraps around one simple surface.",
    ).height(0.18).color(GRAY_B).typewriter().depthMode("overlay"), { at: [0, 2.45, 0] });
    const axes = this.add(Axes3D([-2.2, 2.2], [-2.2, 2.2], [-2.2, 2.2]).step(1).axisThickness(0.03).tickSize(0.11));
    const wire = this.add(ParametricSurface([0, Math.PI], [0, Math.PI * 2], sphere)
      .samples(40, 54)
      .renderMode("wireframe")
      .writeProgress(0)
      .color(hex(TEAL_C)));
    const surface = this.add(ParametricSurface([0, Math.PI], [0, Math.PI * 2], sphere)
      .samples(40, 54)
      .writeProgress(1)
      .texture(EARTH_TEXTURE)
      .opacity(0));
    const xLabel = this.add(Label("x").height(0.2).color(ORANGE_B).typewriter(), { at: [2.55, 0, 0] });
    const yLabel = this.add(Label("y").height(0.2).color(BLUE_B).typewriter(), { at: [0, 2.55, 0] });
    const zLabel = this.add(Label("z").height(0.2).color(GOLD_C).typewriter(), { at: [0, 0, 2.55] });
    const footer = this.add(Label(
      "This example is about UV mapping: one image, one surface, and camera angles that reveal the wrap.",
    ).height(0.17).color(GRAY_B).typewriter().depthMode("overlay"), { at: [0, -3, 0] });

    const timeline = new Timeline();
    timeline.animate(title).at(0).duration(1).ease("linear").typewrite();
    timeline.animate(subtitle).at(0.35).duration(1.6).ease("linear").typewrite();
    timeline.animate(axes).at(1.45).duration(0.85).ease("linear").appear();
    timeline.animate(xLabel).at(1.8).duration(0.45).ease("linear").typewrite();
    timeline.animate(yLabel).at(1.95).duration(0.45).ease("linear").typewrite();
    timeline.animate(zLabel).at(2.1).duration(0.45).ease("linear").typewrite();
    timeline.animate(wire).at(2.25).duration(2.3).ease("inOutCubic").to({ revealProgress: 1 });
    timeline.animate(surface).at(4.9).duration(1.4).ease("inOutCubic").appear();
    timeline.animate(wire).at(4.9).duration(1.4).ease("inOutCubic").fadeTo(0);
    timeline.animateCamera(this.camera).at(0).duration(4.2).ease("inOutCubic").frameTo([-1.2, 1.55, 4.9], [0, 0, 0]);
    timeline.animateCamera(this.camera).at(4.2).duration(4.1).ease("inOutCubic").frameTo([2.9, 1.1, 4.2], [0, 0, 0]);
    timeline.animate(footer).at(6.2).duration(1.5).ease("linear").typewrite();
    this.play(timeline);
  }
}

function sphere(u: number, v: number): Vec3 {
  const radius = 1.35;
  return [radius * Math.sin(u) * Math.cos(v), radius * Math.cos(u), radius * Math.sin(u) * Math.sin(v)];
}

function hex(value: string): readonly [number, number, number, number] {
  return [
    Number.parseInt(value.slice(1, 3), 16) / 255,
    Number.parseInt(value.slice(3, 5), 16) / 255,
    Number.parseInt(value.slice(5, 7), 16) / 255,
    1,
  ];
}

render(import.meta.url, TexturedSurface);
