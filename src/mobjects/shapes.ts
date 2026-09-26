import { Mobject, type MobjectOptions } from "../core/Mobject.ts";

type ShapeOptions = Omit<MobjectOptions, "tag" | "html" | "text">;

export function Rect(width = 320, height = 180, options: ShapeOptions = {}): Mobject {
  return new Mobject({
    ...options,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      background: "#6366f1",
      borderRadius: "24px",
      ...options.style,
    },
  });
}

export function Circle(radius = 80, options: ShapeOptions = {}): Mobject {
  return new Mobject({
    ...options,
    style: {
      width: `${radius * 2}px`,
      height: `${radius * 2}px`,
      borderRadius: "999px",
      background: "#22d3ee",
      ...options.style,
    },
  });
}

export function Text(content: string, options: ShapeOptions = {}): Mobject {
  return new Mobject({
    ...options,
    tag: "div",
    text: content,
    style: {
      color: "#f8fafc",
      fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      fontSize: "72px",
      fontWeight: "700",
      letterSpacing: "-0.04em",
      whiteSpace: "nowrap",
      ...options.style,
    },
  });
}
