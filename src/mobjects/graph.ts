import { resolveColor } from "../core/palette.ts";
import { Group, type GroupTattva } from "../core/Group.ts";
import type { Vec2 } from "../core/Tattva.ts";
import { Arrow, Line } from "./paths.ts";
import { Label } from "./shapes.ts";

export type GraphRange = readonly [number, number];

const GRID = "rgb(89, 99, 117)";
const AXIS = "rgb(199, 209, 224)";
const SCATTER = "#eb4f87";

/** Grid over an inclusive coordinate range. The origin lines are slightly heavier. */
export function NumberPlane(xRange: GraphRange, yRange: GraphRange): NumberPlaneBuilder {
  return new NumberPlaneBuilder(xRange, yRange);
}

/** Axis lines and tick marks through the origin. */
export function Axes(xRange: GraphRange, yRange: GraphRange): AxesBuilder {
  return new AxesBuilder(xRange, yRange);
}

/** Arrow from `from` (default origin) to `tip`, in world coordinates. */
export function VectorArrow(
  tip: Vec2,
  options: { from?: Vec2; color?: string; width?: number } = {},
): ReturnType<typeof Arrow> {
  const from = options.from ?? [0, 0];
  return Arrow().from(from).to(tip).stroke({
    color: resolveColor(options.color ?? "#ffffff"),
    width: options.width ?? 0.06,
  });
}

/** Plus-shaped marks at graph coordinates. */
export function ScatterPlot(points: readonly Vec2[]): ScatterPlotBuilder {
  return new ScatterPlotBuilder(points);
}

export function PlotLegend(entries: readonly { label: string; color: string }[]): PlotLegendBuilder {
  return new PlotLegendBuilder(entries);
}

export class NumberPlaneBuilder {
  private stepSize = 1;

  constructor(
    private readonly xRange: GraphRange,
    private readonly yRange: GraphRange,
  ) {}

  step(size: number): this {
    this.stepSize = size;
    return this;
  }

  build(): GroupTattva {
    const lines = [
      ...sampleRange(this.xRange, this.stepSize).map((x) => {
        const axis = Math.abs(x) <= 1e-4;
        return Line()
          .from([x, this.yRange[0]])
          .to([x, this.yRange[1]])
          .stroke({ width: axis ? 0.03 : 0.01, color: axis ? AXIS : GRID });
      }),
      ...sampleRange(this.yRange, this.stepSize).map((y) => {
        const axis = Math.abs(y) <= 1e-4;
        return Line()
          .from([this.xRange[0], y])
          .to([this.xRange[1], y])
          .stroke({ width: axis ? 0.03 : 0.01, color: axis ? AXIS : GRID });
      }),
    ];
    return Group(lines);
  }
}

export class AxesBuilder {
  private stepSize = 1;
  private thicknessValue = 0.02;
  private tickSizeValue = 0.1;
  private axisColor = "#ffffff";
  private ticks = true;

  constructor(
    private readonly xRange: GraphRange,
    private readonly yRange: GraphRange,
  ) {}

  step(size: number): this {
    this.stepSize = size;
    return this;
  }

  thickness(value: number): this {
    this.thicknessValue = value;
    return this;
  }

  tickSize(value: number): this {
    this.tickSizeValue = value;
    return this;
  }

  color(value: string): this {
    this.axisColor = resolveColor(value);
    return this;
  }

  withoutTicks(): this {
    this.ticks = false;
    return this;
  }

  build(): GroupTattva {
    const color = this.axisColor;
    const lines = [
      Line().from([this.xRange[0], 0]).to([this.xRange[1], 0]).stroke({ width: this.thicknessValue, color }),
      Line().from([0, this.yRange[0]]).to([0, this.yRange[1]]).stroke({ width: this.thicknessValue, color }),
    ];
    if (this.ticks) {
      for (const x of sampleRange(this.xRange, this.stepSize)) {
        if (Math.abs(x) <= 1e-3) continue;
        lines.push(Line()
          .from([x, -this.tickSizeValue / 2])
          .to([x, this.tickSizeValue / 2])
          .stroke({ width: this.thicknessValue * 0.6, color }));
      }
      for (const y of sampleRange(this.yRange, this.stepSize)) {
        if (Math.abs(y) <= 1e-3) continue;
        lines.push(Line()
          .from([-this.tickSizeValue / 2, y])
          .to([this.tickSizeValue / 2, y])
          .stroke({ width: this.thicknessValue * 0.6, color }));
      }
    }
    return Group(lines);
  }
}

export class ScatterPlotBuilder {
  private radiusValue = 0.08;
  private markColor = SCATTER;
  private markThickness = 0.025;

  constructor(private readonly points: readonly Vec2[]) {}

  radius(value: number): this {
    this.radiusValue = value;
    return this;
  }

  color(value: string): this {
    this.markColor = resolveColor(value);
    return this;
  }

  build(): GroupTattva {
    const marks = this.points.flatMap(([x, y]) => [
      Line().from([x - this.radiusValue, y]).to([x + this.radiusValue, y]).stroke({ width: this.markThickness, color: this.markColor }),
      Line().from([x, y - this.radiusValue]).to([x, y + this.radiusValue]).stroke({ width: this.markThickness, color: this.markColor }),
    ]);
    return Group(marks);
  }
}

export class PlotLegendBuilder {
  private legendTextColor = "#ffffff";
  private rowHeight = 0.28;
  private lineLength = 0.42;
  private lineThickness = 0.035;
  private fontHeight = 0.16;

  constructor(private readonly entries: readonly { label: string; color: string }[]) {}

  textColor(value: string): this {
    this.legendTextColor = resolveColor(value);
    return this;
  }

  build(): GroupTattva {
    const rows = this.entries.flatMap((entry, index) => {
      const y = -index * this.rowHeight;
      const swatch = Line()
        .from([0, y])
        .to([this.lineLength, y])
        .stroke({ width: this.lineThickness, color: resolveColor(entry.color) });
      const label = Label(entry.label).height(this.fontHeight).color(this.legendTextColor);
      const width = label.getLayoutSize().width;
      label.at([this.lineLength + 0.18 + width / 2, y, 0]);
      return [swatch, label];
    });
    return Group(rows);
  }
}

export function sampleRange([start, end]: GraphRange, step: number): number[] {
  if (!Number.isFinite(step) || step <= 0 || end < start) return [];
  const values: number[] = [];
  const count = Math.floor((end - start) / step + 1e-6) + 1;
  for (let index = 0; index < count; index += 1) {
    const value = start + index * step;
    if (value <= end + 1e-4) values.push(value);
  }
  return values;
}
