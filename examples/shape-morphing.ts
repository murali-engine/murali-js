import { render } from "murali-js";
import { Scene, timeline } from "murali-js/core";
import { palette } from "murali-js/style";
import { Circle, Ellipse, Polygon, Rectangle, ShapeMorph, VectorShape } from "murali-js/primitives";
import { Label } from "murali-js/text";

class ShapeMorphing extends Scene {
  override construct(): void {
    const title = this.add(Label("Shape morphing").height(0.58), { at: [0, 3.2, 0] });
    const caption = this.add(
      Label("CIRCLE  →  ROUNDED RECTANGLE  →  TRIANGLE  →  COMPOUND SVG  →  ELLIPSE")
        .height(0.2)
        .color(palette.GRAY_B),
      { at: [0, 2.55, 0] },
    );
    const morph = this.add(
      ShapeMorph(
        Circle()
          .radius(1.35)
          .fill(palette.TEAL_C)
          .stroke({ color: palette.WHITE, width: 0.055 }),
        Rectangle()
          .size([3.8, 2.35])
          .cornerRadius(0.42)
          .fill(palette.PURPLE_B)
          .stroke({ color: palette.WHITE, width: 0.055 }),
        Polygon.regular(3)
          .radius(1.65)
          .fill(palette.GOLD_C)
          .stroke({ color: palette.WHITE, width: 0.055 }),
        VectorShape(
          "M 0 -1.7 L .45 -.55 L 1.7 -.52 L .72 .22 L 1.05 1.45 L 0 .75 L -1.05 1.45 L -.72 .22 L -1.7 -.52 L -.45 -.55 Z M .42 0 A .42 .42 0 1 1 -.42 0 A .42 .42 0 1 1 .42 0 Z",
          { viewBox: { x: -2.05, y: -1.85, width: 4.1, height: 3.7 } },
        )
          .fill(palette.RED_C)
          .stroke({ color: palette.WHITE, width: 0.055 }),
        Ellipse()
          .radii([2.05, 1.05])
          .fill(palette.PINK_C)
          .stroke({ color: palette.WHITE, width: 0.055 }),
      )
        .samples(120)
        .css({ filter: "drop-shadow(0 0 32px rgb(92 208 179 / 32%))" }),
      { at: [0, -0.15, 0] },
    );

    this.play(timeline((local) => {
      local.animate(title).duration(0.55).typewrite();
      local.animate(caption).at(0.2).duration(0.65).typewrite();
      local.animate(morph).at(0.25).duration(0.65).appear();
    }));
    this.wait(0.35);
    this.play(timeline((local) => local.animate(morph).duration(1.15).ease("inOutCubic").morphTo(1)));
    this.wait(0.25);
    this.play(timeline((local) => local.animate(morph).duration(1.15).ease("inOutCubic").morphTo(2)));
    this.wait(0.25);
    this.play(timeline((local) => local.animate(morph).duration(1.15).ease("inOutCubic").morphTo(3)));
    this.wait(0.25);
    this.play(timeline((local) => local.animate(morph).duration(1.15).ease("inOutCubic").morphTo(4)));
    this.wait(0.35);
    this.play(timeline((local) => local.animate(morph).duration(1.35).ease("inOutCubic").morphTo(0)));
    this.wait(0.5);
  }
}

render(import.meta.url, ShapeMorphing, { fps: 60 });
