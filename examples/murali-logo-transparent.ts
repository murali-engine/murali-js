import { Circle, Line, Scene, render, worldPath } from "venu";

/**
 * Port of Murali `examples/murali_logo_transparent.rs`.
 * Writes one transparent PNG. Pass `--light` for the light mark.
 */
class TransparentLogo extends Scene {
  constructor() {
    super({
      frame: "square",
      width: 1200,
      height: 1200,
      viewWidth: 10,
      background: "transparent",
    });
  }

  override construct(): void {
    const palette = logoMode() === "light" ? lightPalette : darkPalette;
    const left = -3.2;
    const right = 3.2;
    const bottom = -2.4;
    const top = 2.4;

    line(this, [-2.4, bottom], [-2.4, top], 0.03, palette.grid);
    line(this, [-1.6, bottom], [-1.6, top], 0.034, palette.grid);
    line(this, [-0.8, bottom], [-0.8, top], 0.03, palette.grid);
    line(this, [0, bottom], [0, top], 0.04, palette.axis);
    line(this, [0.8, bottom], [0.8, top], 0.03, palette.grid);
    line(this, [1.6, bottom], [1.6, top], 0.034, palette.grid);
    line(this, [2.4, bottom], [2.4, top], 0.03, palette.grid);
    line(this, [left, -1.8], [right, -1.8], 0.03, palette.grid);
    line(this, [left, -1.2], [right, -1.2], 0.034, palette.grid);
    line(this, [left, -0.6], [right, -0.6], 0.03, palette.grid);
    line(this, [left, 0], [right, 0], 0.04, palette.axis);
    line(this, [left, 0.6], [right, 0.6], 0.03, palette.grid);
    line(this, [left, 1.2], [right, 1.2], 0.034, palette.grid);
    line(this, [left, 1.8], [right, 1.8], 0.03, palette.grid);

    this.add(worldPath()
      .moveTo(-2.45, -1.62)
      .cubicTo(-1.85, -1.05, -0.92, -0.72, 0, -0.72)
      .cubicTo(0.92, -0.72, 1.85, -1.05, 2.45, -1.62)
      .stroke({ color: palette.support, width: 0.13 }));
    line(this, [-2.45, -1.62], [-1.85, -1.05], 0.03, palette.handle);
    line(this, [0, -0.72], [-0.92, -0.72], 0.03, palette.handle);
    line(this, [0, -0.72], [0.92, -0.72], 0.03, palette.handle);
    line(this, [2.45, -1.62], [1.85, -1.05], 0.03, palette.handle);

    this.add(worldPath()
      .moveTo(-2.55, -1.52)
      .cubicTo(-2.62, -0.18, -2.3, 1.52, -1.72, 1.86)
      .cubicTo(-1.18, 2.12, -0.58, 0.92, 0, 0.08)
      .cubicTo(0.58, 0.92, 1.18, 2.12, 1.72, 1.86)
      .cubicTo(2.3, 1.52, 2.62, -0.18, 2.55, -1.52)
      .stroke({ color: palette.mark, width: 0.18 }));
    line(this, [-2.55, -1.52], [-2.62, -0.18], 0.032, palette.handle);
    line(this, [-1.72, 1.86], [-2.3, 1.52], 0.032, palette.handle);
    line(this, [-1.72, 1.86], [-1.18, 2.12], 0.032, palette.handle);
    line(this, [0, 0.08], [-0.58, 0.92], 0.032, palette.handle);
    line(this, [0, 0.08], [0.58, 0.92], 0.032, palette.handle);
    line(this, [1.72, 1.86], [1.18, 2.12], 0.032, palette.handle);
    line(this, [1.72, 1.86], [2.3, 1.52], 0.032, palette.handle);
    line(this, [2.55, -1.52], [2.62, -0.18], 0.032, palette.handle);
    line(this, [-1.6, 2.4], [0, 0], 0.045, palette.guideA);
    line(this, [0, 0], [1.6, 2.4], 0.045, palette.guideB);

    for (const [x, y, fill] of [
      [-2.45, -1.62, palette.dotA],
      [-1.6, 1.9, palette.dotB],
      [1.6, 1.9, palette.dotC],
      [-1.55, -0.98, palette.dotA],
      [1.55, -0.98, palette.dotA],
    ] as const) {
      this.add(Circle().radius(0.135).fill(fill).stroke({ width: 0.028, color: palette.dotStroke }), { at: [x, y, 0] });
    }
    for (const [x, y] of [
      [-2.62, -0.18], [-2.3, 1.52], [-1.18, 2.12], [-0.58, 0.92],
      [0.58, 0.92], [1.18, 2.12], [2.3, 1.52], [2.62, -0.18],
    ] as const) {
      this.add(
        Circle().radius(0.075).fill(palette.handle).stroke({ width: 0.02, color: palette.dotStroke }),
        { at: [x, y, 0] },
      );
    }
  }
}

const light = logoMode() === "light";
render(import.meta.url, TransparentLogo, {
  output: light ? "./output/murali-logo-light.png" : "./output/murali-logo-dark.png",
  transparent: true,
  at: 0,
  args: { logo: light ? "light" : "dark" },
});

function logoMode(): "dark" | "light" {
  const injected = (globalThis as { __venuArgs?: { logo?: string } }).__venuArgs?.logo;
  if (injected === "light" || injected === "dark") return injected;
  if (typeof process !== "undefined" && process.argv?.includes("--light")) return "light";
  return "dark";
}

function line(
  scene: Scene,
  start: readonly [number, number],
  end: readonly [number, number],
  thickness: number,
  color: string,
): void {
  scene.add(Line().from(start).to(end).stroke({ color, width: thickness }));
}

function rgba(red: number, green: number, blue: number, alpha: number): string {
  return `rgba(${Math.round(red * 255)}, ${Math.round(green * 255)}, ${Math.round(blue * 255)}, ${alpha})`;
}

const darkPalette = {
  grid: rgba(0.2, 0.72, 0.98, 0.38),
  axis: rgba(0.28, 0.84, 0.95, 0.92),
  support: rgba(0.18, 0.58, 0.98, 0.96),
  mark: rgba(0.18, 0.96, 0.76, 1),
  handle: rgba(0.92, 0.98, 1, 0.42),
  guideA: rgba(0.3, 0.7, 0.98, 0.74),
  guideB: rgba(0.16, 0.94, 0.8, 0.74),
  dotA: rgba(0.18, 0.58, 0.98, 1),
  dotB: rgba(0.28, 0.74, 1, 1),
  dotC: rgba(0.18, 0.96, 0.76, 1),
  dotStroke: rgba(1, 1, 1, 0.95),
};

const lightPalette = {
  grid: rgba(0, 0, 0, 0.3),
  axis: rgba(0, 0, 0, 0.72),
  support: rgba(0, 0, 0, 1),
  mark: rgba(0, 0, 0, 1),
  handle: rgba(0, 0, 0, 0.3),
  guideA: rgba(0, 0, 0, 0.3),
  guideB: rgba(0, 0, 0, 0.3),
  dotA: rgba(0, 0, 0, 1),
  dotB: rgba(0, 0, 0, 1),
  dotC: rgba(0, 0, 0, 1),
  dotStroke: rgba(0, 0, 0, 0.9),
};
