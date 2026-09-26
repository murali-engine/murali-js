import { Tattva } from "../core/Tattva.ts";

class ShapeTattva extends Tattva {
  override colorProperty = "background" as const;

  fill(color: string): this {
    this.setInitial({ background: color });
    return this.css({ background: color });
  }

  stroke(options: { color: string; width?: number }): this {
    const { color, width = 0.05 } = options;
    this.worldStrokeWidth = width;
    return this.css({ borderColor: color, borderStyle: "solid" });
  }
}

export class CircleTattva extends ShapeTattva {
  constructor() {
    super({ css: { borderRadius: "50%", background: "#22d3ee" } });
    this.radius(1);
  }

  radius(value: number): this {
    this.worldSize = { width: value * 2, height: value * 2 };
    return this;
  }
}

export class RectangleTattva extends ShapeTattva {
  constructor() {
    super({ css: { background: "#6366f1" } });
    this.size([2, 1]);
  }

  size([width, height]: readonly [number, number]): this {
    this.worldSize = { width, height };
    return this;
  }
}

export class SquareTattva extends ShapeTattva {
  constructor() {
    super({ css: { background: "#6366f1" } });
    this.size(1);
  }

  size(value: number): this {
    this.worldSize = { width: value, height: value };
    return this;
  }
}

export class PolygonTattva extends ShapeTattva {
  private sides: number;

  constructor(sides: number) {
    super({ css: { background: "#f59e0b" } });
    this.sides = Math.max(3, Math.floor(sides));
    this.radius(1);
    this.updateClipPath();
  }

  radius(value: number): this {
    this.worldSize = { width: value * 2, height: value * 2 };
    return this;
  }

  private updateClipPath(): void {
    const points = Array.from({ length: this.sides }, (_, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / this.sides;
      return `${50 + Math.cos(angle) * 50}% ${50 + Math.sin(angle) * 50}%`;
    });
    this.css({ clipPath: `polygon(${points.join(", ")})` });
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
        whiteSpace: "nowrap",
      },
    });
    this.worldSize = { width: 0, height: 0.7 };
    this.height(0.7);
  }

  height(value: number): this {
    this.worldFontSize = value;
    this.worldSize = {
      width: Math.max(value * 0.6, (this.text?.length ?? 0) * value * 0.58),
      height: value,
    };
    return this;
  }

  color(value: string): this {
    this.setInitial({ color: value });
    return this.css({ color: value });
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
