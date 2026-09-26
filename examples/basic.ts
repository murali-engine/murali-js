import {
  Circle,
  FadeIn,
  FadeOut,
  Move,
  Scale,
  Scene,
  SetColor,
  Text,
  easeOutCubic,
  render,
} from "venu";

class BasicScene extends Scene {
  constructor() {
    super({ width: 1280, height: 720, background: "#070b16" });
  }

  override construct(): void {
    const glow = this.add(Circle(138, {
      style: {
        background: "radial-gradient(circle at 35% 30%, #67e8f9, #2563eb 58%, #312e81)",
        boxShadow: "0 0 120px rgba(37, 99, 235, 0.5)",
      },
      state: { x: -350, scale: 0.72, opacity: 0 },
    }));
    const title = this.add(Text("Make motion deterministic.", {
      style: { fontSize: "66px" },
      state: { x: 150, y: -24, opacity: 0 },
    }));
    const detail = this.add(Text("DOM  ·  REACT  ·  THREE.JS", {
      style: {
        color: "#93c5fd",
        fontSize: "21px",
        fontWeight: "600",
        letterSpacing: "0.22em",
      },
      state: { x: 150, y: 62, opacity: 0 },
    }));

    this.play(
      FadeIn(glow, { duration: 0.9, easing: easeOutCubic }),
      Move(glow, { x: -330 }, { duration: 0.9, easing: easeOutCubic }),
      Scale(glow, 1, { duration: 0.9, easing: easeOutCubic }),
    );
    this.play(
      FadeIn(title, { duration: 0.7 }),
      Move(title, { x: 130 }, { duration: 0.7 }),
      SetColor(glow, "#22d3ee", { duration: 0.7 }),
    );
    this.play(FadeIn(detail, { duration: 0.55 }), Move(detail, { y: 52 }, { duration: 0.55 }));
    this.wait(0.8);
    this.play(FadeOut(title, { duration: 0.45 }), FadeOut(detail, { duration: 0.45 }), Scale(glow, 0.82, { duration: 0.45 }));
  }
}

render(import.meta.url, BasicScene, {
  onProgress(completed, total) {
    process.stdout.write(`\rRendering ${completed}/${total} frames`);
    if (completed === total) process.stdout.write("\n");
  },
});
