import { isCssPaint, resolveColor } from "../core/palette.ts";
import { Tattva } from "../core/Tattva.ts";

class ShapeTattva extends Tattva {
  override colorProperty = "background" as const;
  protected shapeFill = "#22d3ee";
  protected shapeStroke = "none";
  protected shapeStrokeWidth = 0;

  fill(color: string): this {
    const resolved = resolveColor(color);
    this.shapeFill = resolved;
    this.setInitial({ background: resolved });
    if (isCssPaint(resolved)) {
      this.revealKind = "none";
      this.paintsOwnStroke = false;
      return this.css({ background: resolved });
    }
    this.revealKind = "path";
    this.paintsOwnStroke = true;
    return this.css({ background: resolved, borderStyle: "none" });
  }

  stroke(options: { color: string; width?: number }): this {
    this.shapeStroke = resolveColor(options.color);
    this.shapeStrokeWidth = options.width ?? 0.05;
    this.worldStrokeWidth = this.shapeStrokeWidth;
    return this.css({ borderColor: this.shapeStroke, borderStyle: "solid" });
  }

  protected shapePath(_width: number, _height: number): string {
    return "";
  }

  override contentHTML(): string | undefined {
    const background = this.initialStyle.background;
    if (typeof background === "string" && isCssPaint(background)) {
      this.revealKind = "none";
      this.paintsOwnStroke = false;
      return undefined;
    }
    if (this.revealKind !== "path") return undefined;
    const width = this.worldSize?.width ?? 0;
    const height = this.worldSize?.height ?? 0;
    if (width <= 0 || height <= 0) return undefined;
    return `<svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" overflow="visible" xmlns="http://www.w3.org/2000/svg"><path data-venu-path data-venu-shape d="${this.shapePath(width, height)}" fill="${escapeAttribute(this.shapeFill)}" stroke="${escapeAttribute(this.shapeStroke)}" stroke-width="${this.shapeStrokeWidth}" stroke-linejoin="round" stroke-linecap="round" /></svg>`;
  }
}

export class CircleTattva extends ShapeTattva {
  private radiusValue = 1;

  constructor() {
    super({ css: { borderRadius: "50%" } });
    this.fill("#22d3ee");
    this.radius(1);
  }

  radius(value: number): this {
    this.radiusValue = value;
    this.worldSize = { width: value * 2, height: value * 2 };
    return this;
  }

  protected override shapePath(width: number, height: number): string {
    const radius = Math.min(width, height) / 2;
    return `M ${this.radiusValue} 0 A ${radius} ${radius} 0 1 1 ${this.radiusValue} ${height} A ${radius} ${radius} 0 1 1 ${this.radiusValue} 0 Z`;
  }
}

export class RectangleTattva extends ShapeTattva {
  private corner = 0;

  constructor() {
    super();
    this.fill("#6366f1");
    this.size([2, 1]);
  }

  size([width, height]: readonly [number, number]): this {
    this.worldSize = { width, height };
    return this;
  }

  cornerRadius(value: number): this {
    this.corner = Math.max(0, value);
    return this;
  }

  protected override shapePath(width: number, height: number): string {
    const radius = Math.min(this.corner, width / 2, height / 2);
    if (radius <= 0) return `M 0 0 H ${width} V ${height} H 0 Z`;
    return `M ${radius} 0 H ${width - radius} A ${radius} ${radius} 0 0 1 ${width} ${radius} V ${height - radius} A ${radius} ${radius} 0 0 1 ${width - radius} ${height} H ${radius} A ${radius} ${radius} 0 0 1 0 ${height - radius} V ${radius} A ${radius} ${radius} 0 0 1 ${radius} 0 Z`;
  }
}

export class SquareTattva extends ShapeTattva {
  constructor() {
    super();
    this.fill("#6366f1");
    this.size(1);
  }

  size(value: number): this {
    this.worldSize = { width: value, height: value };
    return this;
  }

  protected override shapePath(width: number, height: number): string {
    return `M 0 0 H ${width} V ${height} H 0 Z`;
  }
}

export class PolygonTattva extends ShapeTattva {
  private sides: number;
  private radiusValue = 1;

  constructor(sides: number) {
    super();
    this.sides = Math.max(3, Math.floor(sides));
    this.fill("#f59e0b");
    this.radius(1);
  }

  radius(value: number): this {
    this.radiusValue = value;
    this.worldSize = { width: value * 2, height: value * 2 };
    return this;
  }

  protected override shapePath(width: number, height: number): string {
    const points = Array.from({ length: this.sides }, (_, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / this.sides;
      const x = width / 2 + Math.cos(angle) * this.radiusValue;
      const y = height / 2 + Math.sin(angle) * this.radiusValue;
      return `${x} ${y}`;
    });
    return `M ${points.join(" L ")} Z`;
  }
}

export class LabelTattva extends Tattva {
  constructor(content: string) {
    super({
      text: content,
      css: {
        color: "#f8fafc",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        fontWeight: "700",
        letterSpacing: "-0.04em",
        whiteSpace: "pre",
        textAlign: "center",
        lineHeight: "1",
      },
    });
    this.revealKind = "text";
    this.worldSize = { width: 0, height: 0.7 };
    this.height(0.7);
  }

  height(value: number): this {
    const lines = (this.text ?? "").split("\n");
    const longest = Math.max(1, ...lines.map((line) => line.length));
    this.worldFontSize = value;
    this.worldSize = {
      width: Math.max(value * 0.6, longest * value * 0.58),
      height: value * lines.length,
    };
    return this;
  }

  color(value: string): this {
    const resolved = resolveColor(value);
    this.setInitial({ color: resolved });
    return this.css({ color: resolved });
  }

  /** Grow from a stable left edge. Centered reveal is the default. */
  typewriter(enabled = true): this {
    this.textReveal = enabled ? "typewriter" : "centered";
    return this;
  }
}

export function Circle(): CircleTattva {
  return new CircleTattva();
}

export function Rectangle(): RectangleTattva {
  return new RectangleTattva();
}

export function Square(): SquareTattva {
  return new SquareTattva();
}

export const Polygon = {
  regular(sides: number): PolygonTattva {
    return new PolygonTattva(sides);
  },
};

export function Label(content: string): LabelTattva {
  return new LabelTattva(content);
}

function escapeAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
