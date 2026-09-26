import { resolveColor } from "../core/palette.ts";
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
  protected dashLength = 0;
  protected dashGap = 0;

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

  dash(dash: number, gap: number): this {
    if (!Number.isFinite(dash) || !Number.isFinite(gap) || dash < 0 || gap < 0) {
      throw new Error(`Dash and gap must be non-negative finite numbers; received ${dash}, ${gap}.`);
    }
    this.dashLength = dash;
    this.dashGap = gap;
    return this;
  }

  color(value: string): this {
    const resolved = resolveColor(value);
    this.setInitial({ color: resolved });
    return this.css({ color: resolved });
  }

  override contentHTML(): string {
    const { x, y, width, height } = this.pathBounds;
    const dash = dashAttribute(this.dashLength, this.dashGap);
    return `<svg width="100%" height="100%" viewBox="${x} ${y} ${width} ${height}" overflow="visible" xmlns="http://www.w3.org/2000/svg"><path data-venu-path d="${escapeAttribute(this.pathData)}" fill="${escapeAttribute(this.fillColor)}" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"${dash} /></svg>`;
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
  protected dashLength = 0;
  protected dashGap = 0;

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
    const resolved = resolveColor(value);
    this.setInitial({ color: resolved });
    return this.css({ color: resolved });
  }

  dash(dash: number, gap: number): this {
    if (!Number.isFinite(dash) || !Number.isFinite(gap) || dash < 0 || gap < 0) {
      throw new Error(`Dash and gap must be non-negative finite numbers; received ${dash}, ${gap}.`);
    }
    this.dashLength = dash;
    this.dashGap = gap;
    return this;
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
    const clipId = `venu-line-${++lineClipSequence}`;
    const dash = dashAttribute(this.dashLength, this.dashGap);
    return `<svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" overflow="visible" xmlns="http://www.w3.org/2000/svg"><clipPath id="${clipId}"><rect data-venu-reveal-clip x="0" y="${-height}" width="${width}" height="${height * 3}" /></clipPath><path data-venu-path d="M 0 ${centerY} L ${lineEnd} ${centerY}" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" clip-path="url(#${clipId})"${dash} />${arrowhead}</svg>`;
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

/** Author a path in world coordinates, with Y up. The result is positioned on that geometry. */
export function worldPath(): WorldPathBuilder {
  return new WorldPathBuilder();
}

export class WorldPathBuilder {
  private readonly commands: string[] = [];
  private readonly xs: number[] = [];
  private readonly ys: number[] = [];

  moveTo(x: number, y: number): this {
    this.point(x, y);
    this.commands.push(`M ${x} ${-y}`);
    return this;
  }

  lineTo(x: number, y: number): this {
    this.point(x, y);
    this.commands.push(`L ${x} ${-y}`);
    return this;
  }

  quadTo(controlX: number, controlY: number, x: number, y: number): this {
    this.point(controlX, controlY);
    this.point(x, y);
    this.commands.push(`Q ${controlX} ${-controlY} ${x} ${-y}`);
    return this;
  }

  cubicTo(
    control1X: number,
    control1Y: number,
    control2X: number,
    control2Y: number,
    x: number,
    y: number,
  ): this {
    this.point(control1X, control1Y);
    this.point(control2X, control2Y);
    this.point(x, y);
    this.commands.push(`C ${control1X} ${-control1Y} ${control2X} ${-control2Y} ${x} ${-y}`);
    return this;
  }

  stroke(options: { color: string; width?: number }): PathTattva {
    if (this.xs.length === 0) throw new Error("A world path needs at least one point.");
    const pad = options.width ?? 0.05;
    const minX = Math.min(...this.xs) - pad;
    const maxX = Math.max(...this.xs) + pad;
    const minY = Math.min(...this.ys) - pad;
    const maxY = Math.max(...this.ys) + pad;
    const width = Math.max(maxX - minX, 0.001);
    const height = Math.max(maxY - minY, 0.001);
    return Path(this.commands.join(" "), {
      bounds: { x: minX, y: minY, width, height },
    }).stroke(options).at([minX + width / 2, -(minY + height / 2), 0]);
  }

  private point(x: number, y: number): void {
    this.xs.push(x);
    this.ys.push(-y);
  }
}

let lineClipSequence = 0;

function dashAttribute(dash: number, gap: number): string {
  return dash > 0 ? ` data-venu-dash="${dash} ${gap}" stroke-dasharray="${dash} ${gap}"` : "";
}

function escapeAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
