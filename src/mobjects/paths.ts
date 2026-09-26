import { Tattva, type Vec2 } from "../core/Tattva.ts";

export interface PathBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PathOptions {
  bounds?: PathBounds;
}

export class PathTattva extends Tattva {
  override colorProperty = "color" as const;
  override revealKind = "path" as const;
  protected strokeColor = "#f8fafc";
  protected strokeWidth = 0.05;
  protected fillColor = "none";

  constructor(
    protected pathData: string,
    protected pathBounds: PathBounds = { x: -1, y: -1, width: 2, height: 2 },
  ) {
    super();
    this.syncBounds();
    this.color(this.strokeColor);
  }

  path(value: string): this {
    this.pathData = value;
    return this;
  }

  viewBox(bounds: PathBounds): this {
    this.pathBounds = bounds;
    this.syncBounds();
    return this;
  }

  stroke(options: { color: string; width?: number }): this {
    this.strokeColor = options.color;
    this.strokeWidth = options.width ?? this.strokeWidth;
    this.color(options.color);
    this.syncBounds();
    return this;
  }

  fill(color: string): this {
    this.fillColor = color;
    return this;
  }

  color(value: string): this {
    this.setInitial({ color: value });
    return this.css({ color: value });
  }

  override contentHTML(): string {
    const { x, y, width, height } = this.pathBounds;
    return `<svg width="100%" height="100%" viewBox="${x} ${y} ${width} ${height}" overflow="visible" xmlns="http://www.w3.org/2000/svg"><path data-venu-path d="${escapeAttribute(this.pathData)}" fill="${escapeAttribute(this.fillColor)}" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round" /></svg>`;
  }

  protected syncBounds(): void {
    this.worldSize = {
      width: this.pathBounds.width,
      height: this.pathBounds.height,
    };
  }
}

export class LineTattva extends Tattva {
  override colorProperty = "color" as const;
  override revealKind = "path" as const;
  protected start: Vec2 = [-1, 0];
  protected end: Vec2 = [1, 0];
  protected strokeColor = "#f8fafc";
  protected strokeWidth = 0.05;
  protected arrow = false;

  constructor() {
    super();
    this.color(this.strokeColor);
    this.syncGeometry();
  }

  from(point: Vec2): this {
    this.start = point;
    this.syncGeometry();
    return this;
  }

  to(point: Vec2): this {
    this.end = point;
    this.syncGeometry();
    return this;
  }

  stroke(options: { color: string; width?: number }): this {
    this.strokeColor = options.color;
    this.strokeWidth = options.width ?? this.strokeWidth;
    this.color(options.color);
    this.syncGeometry();
    return this;
  }

  color(value: string): this {
    this.setInitial({ color: value });
    return this.css({ color: value });
  }

  override contentHTML(): string {
    const width = this.worldSize?.width ?? 0;
    const height = this.worldSize?.height ?? 0.1;
    const centerY = height / 2;
    const arrowLength = Math.min(width * 0.2, Math.max(this.strokeWidth * 5, 0.18));
    const arrowHeight = Math.max(this.strokeWidth * 4, 0.16);
    const lineEnd = this.arrow ? Math.max(0, width - arrowLength * 0.7) : width;
    const arrowhead = this.arrow
      ? `<path data-venu-arrowhead d="M ${width - arrowLength} ${centerY - arrowHeight / 2} L ${width} ${centerY} L ${width - arrowLength} ${centerY + arrowHeight / 2} Z" fill="currentColor" />`
      : "";
    return `<svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" overflow="visible" xmlns="http://www.w3.org/2000/svg"><path data-venu-path d="M 0 ${centerY} L ${lineEnd} ${centerY}" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" />${arrowhead}</svg>`;
  }

  protected syncGeometry(): void {
    const dx = this.end[0] - this.start[0];
    const dy = this.end[1] - this.start[1];
    const length = Math.hypot(dx, dy);
    this.worldSize = {
      width: Math.max(length, 0.001),
      height: Math.max(this.strokeWidth * 5, 0.18),
    };
    this.at([(this.start[0] + this.end[0]) / 2, (this.start[1] + this.end[1]) / 2]);
    this.rotate(Math.atan2(dy, dx) * 180 / Math.PI);
  }
}

export class ArrowTattva extends LineTattva {
  constructor() {
    super();
    this.arrow = true;
  }
}

export function Path(data: string, options: PathOptions = {}): PathTattva {
  return new PathTattva(data, options.bounds);
}

export function Line(): LineTattva {
  return new LineTattva();
}

export function Arrow(): ArrowTattva {
  return new ArrowTattva();
}

function escapeAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
