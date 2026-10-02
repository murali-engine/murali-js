import type { CSSProperties } from "react";
import { render } from "murali-js";
import { Scene, Timeline } from "murali-js/core";
import { ReactTattva } from "murali-js/adapters";
import type { TattvaState } from "murali-js/core";

interface CardState extends TattvaState {
  progress: number;
}

const cardStyle: CSSProperties = {
  width: 560,
  padding: 36,
  border: "1px solid rgba(255,255,255,.14)",
  borderRadius: 30,
  color: "white",
  background: "linear-gradient(145deg, rgba(30,41,59,.96), rgba(15,23,42,.9))",
  boxShadow: "0 28px 80px rgba(0,0,0,.4)",
  fontFamily: "Inter, system-ui, sans-serif",
};

class ReactCardScene extends Scene {
  constructor() {
    super({ width: 1280, height: 720, background: "#020617" });
  }

  override construct(): void {
    const card = this.add(new ReactTattva<CardState>((state) => (
      <section style={cardStyle}>
        <div style={{ color: "#94a3b8", fontSize: 18 }}>Render progress</div>
        <strong style={{ display: "block", fontSize: 72, letterSpacing: "-.05em", margin: "10px 0 24px" }}>
          {Math.round(state.progress)}%
        </strong>
        <div style={{ height: 10, background: "#1e293b", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ width: `${state.progress}%`, height: "100%", background: "#38bdf8" }} />
        </div>
      </section>
    ), { state: { y: -0.45, opacity: 0, progress: 0 } }));

    const entrance = new Timeline();
    entrance.animate(card).duration(1).appear();
    entrance.animate(card).duration(1).moveTo([0, 0]);
    this.play(entrance);

    const progress = new Timeline();
    progress.animate(card).duration(2).ease("linear").to({ progress: 100 });
    this.play(progress);
    this.wait(0.5);
  }
}

render(import.meta.url, ReactCardScene);
