import { render } from "murali-js";
import { Scene } from "murali-js/core";
import { ReactTattva, ThreeTattva } from "murali-js/adapters";
import { createTheme, themeColor, themes } from "murali-js/style";
import { Group } from "murali-js/layout";
import { Circle, Rectangle } from "murali-js/primitives";
import { Label } from "murali-js/text";
import { createElement } from "react";
import { Mesh, MeshStandardMaterial, TorusGeometry } from "three";

const kavriqTheme = createTheme(themes.dark, {
  name: "kavriq",
  colors: {
    background: "#050513",
    surface: "#111126",
    surfaceElevated: "#1a1a38",
    textPrimary: "#fffaf0",
    textMuted: "#aaa6c9",
    accent: "#52d8ff",
    accentAlt: "#a78bfa",
    positive: "#7cf29a",
    warning: "#ffcc33",
    negative: "#ff5d8f",
  },
  typography: {
    headingWeight: 760,
  },
});

class ThemeSystemExample extends Scene {
  constructor() {
    super({ theme: kavriqTheme });
  }

  override construct(): void {
    this.add(Label("One theme. Every renderer.").height(0.62), { at: [0, 2.55, 0] });
    this.add(Label("Labels and primitives inherit semantic roles.").height(0.24).color(themeColor("textMuted")), {
      at: [0, 1.9, 0],
    });

    this.add(Rectangle().size([3.4, 1.45]).cornerRadius(0.2), { at: [-3.5, 0, 0] });
    this.add(Circle().radius(0.72), { at: [0, 0, 0] });
    this.add(Circle().radius(0.72).fill(themeColor("positive")), { at: [3.5, 0, 0] });

    const scoped = Group([
      Label("Scoped celebration").height(0.3),
      Circle().radius(0.28),
    ]).theme({
      colors: {
        textPrimary: "#fff3c4",
        accent: "#ff5d8f",
      },
    });
    scoped.children[0]?.at([-0.55, 0, 0]);
    scoped.children[1]?.at([1.6, 0, 0]);
    scoped.recomputeBounds();
    this.add(scoped, { at: [0, -2.25, 0] });

    const reactBadge = new ReactTattva((_state, { theme }) => createElement("div", {
      style: {
        width: "100%",
        height: "100%",
        display: "grid",
        placeItems: "center",
        borderRadius: "999px",
        background: theme.colors.surfaceElevated,
        color: theme.colors.textPrimary,
        fontFamily: theme.typography.bodyFamily,
        fontWeight: theme.typography.strongWeight,
      },
    }, "React context"));
    reactBadge.worldSize = { width: 2.2, height: 0.6 };
    this.add(reactBadge, { at: [-4.5, -3.25, 0] });

    this.add(new ThreeTattva({
      setup({ scene, theme }) {
        scene.add(new Mesh(
          new TorusGeometry(0.42, 0.12, 18, 48),
          new MeshStandardMaterial({ color: theme.colors.accentAlt, emissive: theme.colors.accentAlt }),
        ));
      },
    }), { at: [4.5, -3.25, 0] });
    this.wait(3);
  }
}

render(import.meta.url, ThemeSystemExample, { fps: 30 });
