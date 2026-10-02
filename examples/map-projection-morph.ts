import { render } from "murali-js";
import { Scene, Timeline, imageFile } from "murali-js/core";
import { palette } from "murali-js/style";
import { Label } from "murali-js/text";
import {
  MAP_FOOTER_START,
  MapGraticule,
  ParametricSurface,
  ProjectionCaption,
  mapPoint,
} from "murali-js/maths";
const { GRAY_A, GRAY_B, WHITE } = palette;
const EARTH_TEXTURE = imageFile("./assets/textures/earthmap1k.jpg");

/**
 * Port of Murali `examples/map_projection_morph.rs`.
 * The projection blend is a function of scene time and uses Murali's Earth surface image.
 */
class MapProjectionMorph extends Scene {
  constructor() {
    super({ viewWidth: 15 });
  }

  override construct(): void {
    this.camera.position([0, 0, 10]);
    const title = this.add(Label("Map Projection Morph").height(0.38).color(WHITE).typewriter().depthMode("overlay"));
    this.toEdge(title, "up", { margin: 0.9 });
    const subtitle = this.add(Label(
      "The Earth texture itself bends through several projections so the distortion is visible immediately.",
    ).height(0.18).color(GRAY_B).typewriter().depthMode("overlay"));
    this.nextTo(subtitle, title, "down", { gap: 0.38 });
    const surface = this.add(ParametricSurface([0, Math.PI], [0, Math.PI * 2], mapPoint)
      .samples(72, 144)
      .writeProgress(0)
      .color([1, 1, 1, 0.98])
      .texture(EARTH_TEXTURE)
      .scale(0.72), { at: [0, -0.08, 0] });
    const graticule = this.add(MapGraticule().scale(0.72), { at: [0, -0.08, 0] });
    this.add(ProjectionCaption().depthMode("overlay"), { at: [0, -3.5, 0] });
    const footer = this.add(Label(
      "This uses the Earth surface image directly, so stretched Greenland and swollen polar bands become obvious.",
    ).height(0.16).color(GRAY_A).typewriter().depthMode("overlay"), { at: [0, -2.98, 0] });

    const timeline = new Timeline();
    timeline.animate(title).at(0).duration(0.95).ease("linear").typewrite();
    timeline.animate(subtitle).at(0.25).duration(1.6).ease("linear").typewrite();
    timeline.animate(surface).at(1.2).duration(1.35).ease("inOutCubic").to({ revealProgress: 1 });
    timeline.animate(graticule).at(2).duration(0.6).ease("outCubic").appear();
    timeline.animate(footer).at(MAP_FOOTER_START).duration(1.5).ease("linear").typewrite();
    this.play(timeline);
  }
}

render(import.meta.url, MapProjectionMorph);
