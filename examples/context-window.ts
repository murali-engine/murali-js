import {
  ContextWindow,
  GRAY_B,
  Label,
  Scene,
  Timeline,
  WHITE,
  contextWindow,
  render,
} from "venu";

/** Port of Murali `examples/context_window.rs`. Older history is trimmed from the start. */
class ContextWindowScene extends Scene {
  override construct(): void {
    const title = this.add(Label("What the model can see").height(0.38).color(WHITE).typewriter());
    this.toEdge(title, "up", { margin: 0.58 });
    const window = this.add(ContextWindow(contextWindow([
      { label: "Core instructions", role: "system", tokens: 620, preview: "Answer clearly and cite sources" },
      {
        label: "Conversation history",
        role: "user",
        tokens: 4900,
        retained: 2700,
        cut: "start",
        preview: "Earlier turns and decisions",
      },
      { label: "Retrieved documents", role: "retrieved", tokens: 1850, preview: "Three relevant passages" },
      { label: "Tool result", role: "tool", tokens: 760, preview: "Live weather observations" },
      { label: "Latest request", role: "user", tokens: 410, preview: "Plan tomorrow's field recording" },
    ], 8192, "ASSEMBLED MODEL CONTEXT")), { at: [0, -0.15, 0] });
    const note = this.add(Label(
      "Older history was trimmed from the start; the current request remains intact.",
    ).height(0.17).color(GRAY_B).typewriter(), { at: [0, -3.25, 0] });

    const timeline = new Timeline();
    timeline.animate(title).at(0).duration(0.9).ease("linear").typewrite();
    timeline.animate(window).at(0.65).duration(0.8).ease("outCubic").appear();
    timeline.animate(note).at(1.55).duration(1.7).ease("linear").typewrite();
    this.play(timeline);
  }
}

render(import.meta.url, ContextWindowScene);
