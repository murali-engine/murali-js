import {
  CodeBlock,
  GRAY_B,
  Label,
  Scene,
  Timeline,
  WHITE,
  render,
} from "murali-js";

const rustCode = `fn highlight(tokens: &[&str]) -> Vec<String> {
    tokens
        .iter()
        .map(|token| token.to_uppercase())
        .collect()
}`;
const tomlCode = `[render]
fps = 60
background = "slate"
`;

/** Port of Murali `examples/code_blocks.rs`. Coloring is browser text, not highlight.js or Typst. */
class CodeBlocks extends Scene {
  override construct(): void {
    const title = this.add(Label("Re-imagined Code Blocks").height(0.38).color(WHITE).typewriter());
    this.toEdge(title, "up", { margin: 0.8 });
    const subtitle = this.add(Label(
      "Murali now supports window decorations, line numbers, and custom themes for professional presentations.",
    ).height(0.18).color(GRAY_B).typewriter(), { at: [0, 2.9, 0] });
    const rustHeading = this.add(Label("highlight.rs").height(0.24).color(GRAY_B).typewriter(), { at: [0, 2.1, 0] });
    const tomlHeading = this.add(Label("murali.toml").height(0.24).color(GRAY_B).typewriter().opacity(0), { at: [0, 2.1, 0] });
    const rust = this.add(CodeBlock(rustCode, "rust")
      .theme("dark")
      .surface("dark")
      .title("highlight.rs")
      .lineNumbers(false)
      .contentBox(7.2, 2.4)
      .fontSize(0.28)
      .opacity(0), { at: [3, -0.33, 0] });
    const toml = this.add(CodeBlock(tomlCode, "toml")
      .theme("light")
      .surface("light")
      .title("murali.toml")
      .lineNumbers(true)
      .contentBox(4.2, 1.35)
      .fontSize(0.3)
      .opacity(0), { at: [2.9, -0.03, 0] });
    const footer = this.add(Label(
      "Typst-powered line numbering and triangulated window dots ensure maximum clarity at any scale.",
    ).height(0.15).color(GRAY_B).typewriter(), { at: [0, -2.5, 0] });

    const timeline = new Timeline();
    timeline.animate(title).at(0).duration(1).ease("linear").typewrite();
    timeline.animate(subtitle).at(0.35).duration(1.7).ease("linear").typewrite();
    timeline.animate(rustHeading).at(1.6).duration(0.9).ease("linear").typewrite();
    timeline.animate(rust).at(2).duration(0.35).ease("linear").appear();
    timeline.animate(rust).at(2).duration(1.2).ease("inOutCubic").moveTo([3, -0.15, 0]);
    timeline.animate(rust).at(5.3).duration(0.6).ease("inOutCubic").fadeTo(0);
    timeline.animate(rustHeading).at(5.8).duration(0.2).fadeTo(0);
    timeline.animate(tomlHeading).at(5.8).duration(0.2).appear();
    timeline.animate(toml).at(6.2).duration(0.35).ease("linear").appear();
    timeline.animate(toml).at(6.2).duration(1.2).ease("inOutCubic").moveTo([2.9, 0.15, 0]);
    timeline.animate(footer).at(8.5).duration(1.8).ease("linear").typewrite();
    this.play(timeline);
  }
}

render(import.meta.url, CodeBlocks);
