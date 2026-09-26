import {
  GRAY_A,
  GRAY_B,
  Label,
  MAP_FOOTER_START,
  MapGraticule,
  ParametricSurface,
  ProjectionCaption,
  Scene,
  Timeline,
  WHITE,
  mapPoint,
  render,
} from "murali-js";

/**
 * Port of Murali `examples/map_projection_morph.rs`.
 * The projection blend is a function of scene time. The map image is generated, not the Earth JPEG.
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
    ).height(0.18).color(GRAY_B).typewriter().depthMode("overlay"), { at: [0, 2.42, 0] });
    this.toEdge(subtitle, "down", { margin: 0.6 });
    const surface = this.add(ParametricSurface([0, Math.PI], [0, Math.PI * 2], mapPoint)
      .samples(72, 144)
      .writeProgress(0)
      .flipY()
      .color([1, 1, 1, 0.98])
      .texture(paintEarth), { at: [0, -0.08, 0] });
    const graticule = this.add(MapGraticule(), { at: [0, -0.08, 0] });
    this.add(ProjectionCaption().depthMode("overlay"), { at: [0, -3.72, 0] });
    const footer = this.add(Label(
      "This uses the Earth surface image directly, so stretched Greenland and swollen polar bands become obvious.",
    ).height(0.16).color(GRAY_A).typewriter().depthMode("overlay"), { at: [0, -3.12, 0] });

    const timeline = new Timeline();
    timeline.animate(title).at(0).duration(0.95).ease("linear").typewrite();
    timeline.animate(subtitle).at(0.25).duration(1.6).ease("linear").typewrite();
    timeline.animate(surface).at(1.2).duration(1.35).ease("inOutCubic").to({ revealProgress: 1 });
    timeline.animate(graticule).at(2).duration(0.6).ease("outCubic").appear();
    timeline.animate(footer).at(MAP_FOOTER_START).duration(1.5).ease("linear").typewrite();
    this.play(timeline);
  }
}

function paintEarth(context: CanvasRenderingContext2D, width: number, height: number): void {
  context.fillStyle = "#1d4e89";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#2f6b4f";
  for (let index = 0; index < 12; index += 1) {
    const x = (index * 97) % width;
    const y = (index * 53) % height;
    context.beginPath();
    context.ellipse(x, y, 28 + (index % 4) * 8, 14 + (index % 3) * 6, index, 0, Math.PI * 2);
    context.fill();
  }
  context.fillStyle = "#d9e7c4";
  context.fillRect(0, height * 0.08, width, height * 0.08);
  context.fillRect(0, height * 0.84, width, height * 0.08);
}

render(import.meta.url, MapProjectionMorph);
