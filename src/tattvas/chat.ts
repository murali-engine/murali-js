import { Tattva, type Vec2 } from "../core/Tattva.ts";
import { Label, Rectangle } from "./shapes.ts";

export type ChatTipSide = "left" | "right";

export interface ChatInputOptions {
  width: number;
  height: number;
  tipSide: ChatTipSide;
  tipWidth?: number;
  tipHeight?: number;
  tipInset?: number;
  fill: string;
  stroke: string;
  strokeWidth?: number;
  textHeight: number;
  textColor: string;
  textInset?: readonly [number, number];
  sendButton?: { size: number; radius: number; color: string };
}

export interface ChatInputParts {
  bubble: Tattva;
  text: Tattva;
  sendButton?: Tattva;
  bubbleAt: readonly [number, number, number];
  textAt: readonly [number, number, number];
  sendAt?: readonly [number, number, number];
}

/** A prompt bubble, its typewriter label, and an optional send button. The anchor is the box center. */
export function ChatInput(text: string, center: readonly [number, number], options: ChatInputOptions): ChatInputParts {
  const tipWidth = options.tipWidth ?? 0.42;
  const tipHeight = options.tipHeight ?? 0.28;
  const tipInset = options.tipInset ?? 0.72;
  const textInset = options.textInset ?? [0.38, 0];
  const labelWidth = Math.max(options.textHeight * 0.6, text.length * options.textHeight * 0.58);
  const bubble = new ChatBubbleTattva(options, tipWidth, tipHeight, tipInset);
  const label = Label(text).height(options.textHeight).color(options.textColor).typewriter();
  const button = options.sendButton;
  const send = button
    ? Rectangle().size([button.size, button.size]).cornerRadius(button.radius).fill(button.color)
    : undefined;
  const [boxX, boxY] = center;
  return {
    bubble,
    text: label,
    sendButton: send,
    bubbleAt: [boxX, boxY, 0],
    textAt: [boxX - options.width / 2 + textInset[0] + labelWidth / 2, boxY + textInset[1], 0.08],
    sendAt: button
      ? [boxX + options.width / 2 - textInset[0] - button.size / 2, boxY, 0.06]
      : undefined,
  };
}

class ChatBubbleTattva extends Tattva {
  constructor(
    private readonly options: ChatInputOptions,
    private readonly tipWidth: number,
    private readonly tipHeight: number,
    private readonly tipInset: number,
  ) {
    super();
    this.revealKind = "none";
    this.worldSize = {
      width: options.width + 0.04,
      height: options.height + this.tipHeight * 2 + 0.04,
    };
  }

  override contentHTML(): string {
    const frame = this.worldSize ?? { width: 1, height: 1 };
    const points = bubbleOutline(
      this.options.width,
      this.options.height,
      0.18,
      8,
      this.options.tipSide,
      this.tipWidth,
      this.tipHeight,
      this.tipInset,
    );
    const commands = points.map((point, index) => {
      const [x, y] = svgPoint(frame, point);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    });
    return [
      `<svg width="100%" height="100%" viewBox="0 0 ${frame.width} ${frame.height}" xmlns="http://www.w3.org/2000/svg">`,
      `<path d="${commands.join(" ")} Z" fill="${this.options.fill}" stroke="${this.options.stroke}" stroke-width="${this.options.strokeWidth ?? 0.018}" stroke-linejoin="round" />`,
      "</svg>",
    ].join("");
  }
}

/** Bubble outline in y-up coordinates centered on the box. The tip hangs below. */
export function bubbleOutline(
  width: number,
  height: number,
  radius: number,
  cornerSegments: number,
  tipSide: ChatTipSide,
  tipWidth: number,
  tipHeight: number,
  tipInset: number,
): Vec2[] {
  const halfWidth = Math.abs(width) / 2;
  const halfHeight = Math.abs(height) / 2;
  const curve = Math.max(0.01, Math.min(Math.abs(radius), halfWidth, halfHeight));
  const bottom = -halfHeight;
  const top = halfHeight;
  const left = -halfWidth;
  const right = halfWidth;
  const segments = Math.max(1, cornerSegments);
  const baseHalf = Math.min(Math.abs(tipWidth) / 2, Math.max(0, halfWidth - curve) * 0.5);
  const minCenter = left + curve + baseHalf;
  const maxCenter = right - curve - baseHalf;
  const rawCenter = tipSide === "left" ? left + Math.abs(tipInset) : right - Math.abs(tipInset);
  const tipCenter = Math.max(minCenter, Math.min(maxCenter, rawCenter));
  const points: Vec2[] = [[tipCenter + baseHalf, bottom]];
  points.push([right - curve, bottom]);
  addArc(points, [right - curve, bottom + curve], curve, -Math.PI / 2, 0, segments);
  points.push([right, top - curve]);
  addArc(points, [right - curve, top - curve], curve, 0, Math.PI / 2, segments);
  points.push([left + curve, top]);
  addArc(points, [left + curve, top - curve], curve, Math.PI / 2, Math.PI, segments);
  points.push([left, bottom + curve]);
  addArc(points, [left + curve, bottom + curve], curve, Math.PI, Math.PI * 1.5, segments);
  points.push([tipCenter - baseHalf, bottom], [tipCenter, bottom - Math.abs(tipHeight)]);
  const kept: Vec2[] = [];
  for (const point of points) {
    const previous = kept[kept.length - 1];
    if (!previous || Math.hypot(point[0] - previous[0], point[1] - previous[1]) > 1e-4) kept.push(point);
  }
  return kept;
}

function addArc(points: Vec2[], center: Vec2, radius: number, start: number, end: number, segments: number): void {
  for (let step = 0; step <= segments; step += 1) {
    const angle = start + (end - start) * (step / segments);
    points.push([center[0] + Math.cos(angle) * radius, center[1] + Math.sin(angle) * radius]);
  }
}

function svgPoint(frame: { width: number; height: number }, point: Vec2): [number, number] {
  return [point[0] + frame.width / 2, frame.height / 2 - point[1]];
}
