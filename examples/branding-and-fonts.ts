import { render } from "murali-js";
import { Scene } from "murali-js/core";
import { fontFamily, fontFile, palette } from "murali-js/style";
import { Group } from "murali-js/layout";
import { Circle } from "murali-js/primitives";
import { Label } from "murali-js/text";

// This private asset is optional and Git-ignored. Rendering falls back cleanly when it is absent.
const SATOSHI = fontFile("Satoshi", "../assets/fonts/private/Satoshi-Bold.ttf", {
  weight: 700,
});

class BrandingAndFonts extends Scene {
  override construct(): void {
    this.registerFont(SATOSHI);

    this.add(
      Label("Choose a font for each story")
        .height(0.62)
        .font(SATOSHI, "Inter", "ui-sans-serif", "sans-serif"),
      { at: [0, 0.5, 0] },
    );
    this.add(
      Label("System fonts work too")
        .height(0.28)
        .font("Georgia, serif")
        .color(palette.GRAY_A),
      { at: [0, -0.4, 0] },
    );

    const brand = Group([
      Circle().radius(0.18).fill(palette.RED_C).at([-0.72, 0, 0]),
      Label("KAVRIQ").height(0.28).font(SATOSHI, "Inter", "sans-serif"),
    ]);
    this.addBranding(brand, { position: "bottomRight", margin: 0.42 });
    this.wait(4);
  }
}

render(import.meta.url, BrandingAndFonts);
