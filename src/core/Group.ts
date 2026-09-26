import { Tattva, type Size } from "./Tattva.ts";

export interface StackOptions {
  gap?: number;
}

export type StackAxis = "horizontal" | "vertical";

export interface StackFactory {
  (children: readonly Tattva[], options?: StackOptions): GroupTattva;
  readonly axis: StackAxis;
}

export class GroupTattva extends Tattva {
  override readonly children: readonly Tattva[];

  constructor(children: readonly Tattva[]) {
    super();
    this.children = [...children];
    for (const child of this.children) child.parent = this;
    this.recomputeBounds();
  }

  layout(factory: StackFactory, options: StackOptions = {}): this {
    return this.arrange(factory.axis, options.gap ?? 0.25);
  }

  arrange(axis: StackAxis, gap = 0.25): this {
    const sizes = this.children.map((child) => child.getLayoutSize());
    const primary = sizes.reduce(
      (total, size) => total + (axis === "horizontal" ? size.width : size.height),
      0,
    ) + Math.max(0, this.children.length - 1) * gap;
    let cursor = -primary / 2;

    this.children.forEach((child, index) => {
      const size = sizes[index];
      const extent = axis === "horizontal" ? size.width : size.height;
      const center = cursor + extent / 2;
      if (axis === "horizontal") child.at([center, 0, child.initialState.z]);
      else child.at([0, -center, child.initialState.z]);
      cursor += extent + gap;
    });

    this.recomputeBounds();
    return this;
  }

  recomputeBounds(): this {
    if (this.children.length === 0) {
      this.worldSize = { width: 0, height: 0 };
      return this;
    }

    const extent = this.children.reduce(
      (bounds, child) => {
        const size = child.getLayoutSize();
        const halfWidth = size.width / 2;
        const halfHeight = size.height / 2;
        return {
          width: Math.max(bounds.width, Math.abs(child.initialState.x) + halfWidth),
          height: Math.max(bounds.height, Math.abs(child.initialState.y) + halfHeight),
        };
      },
      { width: 0, height: 0 },
    );
    this.worldSize = { width: extent.width * 2, height: extent.height * 2 };
    return this;
  }

  override getLayoutSize(): Size {
    this.recomputeBounds();
    return super.getLayoutSize();
  }
}

export function Group(children: readonly Tattva[]): GroupTattva {
  return new GroupTattva(children);
}

function stack(axis: StackAxis): StackFactory {
  return Object.assign(
    (children: readonly Tattva[], options: StackOptions = {}) =>
      new GroupTattva(children).arrange(axis, options.gap ?? 0.25),
    { axis },
  );
}

export const HStack = stack("horizontal");
export const VStack = stack("vertical");
