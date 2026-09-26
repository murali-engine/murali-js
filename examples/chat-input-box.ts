import {
  BLUE_C,
  ChatInput,
  GRAY_A,
  GRAY_B,
  Label,
  Scene,
  Timeline,
  WHITE,
  render,
} from "murali-js";

const rgba = (red: number, green: number, blue: number, alpha: number) => {
  const channel = (value: number) => Math.round(value * 255);
  return `rgba(${channel(red)}, ${channel(green)}, ${channel(blue)}, ${alpha})`;
};

/** Port of Murali `examples/chat_input_box.rs`. The box fades in, then its text types. */
class ChatInputScene extends Scene {
  override construct(): void {
    const title = this.add(Label("Chat Input Box").height(0.38).color(WHITE).typewriter());
    this.toEdge(title, "up", { margin: 0.8 });
    const subtitle = this.add(Label(
      "A beta composite for prompt-entry and dialogue moments in explainer videos.",
    ).height(0.18).color(GRAY_B).typewriter(), { at: [0, 2.95, 0] });
    const user = ChatInput("Why is the sky blue?", [0, 0.85], {
      width: 5.8,
      height: 0.82,
      tipSide: "right",
      fill: rgba(0.08, 0.11, 0.15, 0.94),
      stroke: rgba(0.56, 0.72, 0.9, 0.55),
      textHeight: 0.22,
      textColor: rgba(0.94, 0.97, 1, 0.96),
      sendButton: { size: 0.34, radius: 0.15, color: BLUE_C },
    });
    const assistant = ChatInput("The sky appears blue because sunlight is scattered...", [0, -0.45], {
      width: 8.1,
      height: 0.82,
      tipSide: "left",
      fill: rgba(0.11, 0.14, 0.13, 0.94),
      stroke: rgba(0.5, 0.76, 0.62, 0.5),
      textHeight: 0.2,
      textColor: rgba(0.92, 0.98, 0.94, 0.95),
    });
    const note = this.add(Label(
      "Use the returned text id with typewrite_text(); the box itself is ordinary geometry.",
    ).height(0.16).color(GRAY_A).typewriter(), { at: [0, -2.3, 0] });

    this.add(user.bubble, { at: user.bubbleAt });
    this.add(user.text, { at: user.textAt });
    if (user.sendButton && user.sendAt) this.add(user.sendButton, { at: user.sendAt });
    this.add(assistant.bubble, { at: assistant.bubbleAt });
    this.add(assistant.text, { at: assistant.textAt });

    const timeline = new Timeline();
    timeline.animate(title).at(0).duration(0.8).ease("linear").typewrite();
    timeline.animate(subtitle).at(0.25).duration(1.5).ease("linear").typewrite();
    timeline.animate([user.bubble, ...(user.sendButton ? [user.sendButton] : [])]).at(1.25).duration(0.55).ease("outCubic").appear();
    timeline.animate(user.text).at(1.55).duration(1.25).ease("linear").typewrite();
    timeline.animate([assistant.bubble]).at(3.1).duration(0.55).ease("outCubic").appear();
    timeline.animate(assistant.text).at(3.4).duration(2.1).ease("linear").typewrite();
    timeline.animate(note).at(5.65).duration(1.8).ease("linear").typewrite();
    this.play(timeline);
  }
}

render(import.meta.url, ChatInputScene);
