import type { CSSStyles, CSSValue } from "./css.ts";

export type StateValue = number | string | boolean | null;
export type Vec2 = readonly [number, number];
export type Vec3 = readonly [number, number, number];
export type Point = Vec2 | Vec3;

export interface TattvaState {
  x: number;
  y: number;
  z: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  opacity: number;
  color?: string;
  background?: string;
  revealProgress?: number;
  /** 0 at the start and end of an indicate pulse, 1 at the requested peak time. */
  indicate?: number;
}

export type RevealKind = "none" | "text" | "path";
export type DepthMode = "world" | "overlay";

export interface TattvaOptions<State extends TattvaState = TattvaState> {
  id?: string;
  tag?: keyof HTMLElementTagNameMap;
  className?: string;
  html?: string;
  text?: string;
  css?: CSSStyles;
  state?: Partial<State>;
}

export interface Size {
  width: number;
  height: number;
}

let tattvaSequence = 0;

export class Tattva<State extends TattvaState = TattvaState> {
  readonly kind: "dom" | "react" | "three" = "dom";
  readonly id: string;
  readonly tag: keyof HTMLElementTagNameMap;
  readonly html?: string;
  readonly text?: string;
  readonly children: readonly Tattva[] = [];
  parent?: Tattva;
  elementClassName?: string;
  readonly initialStyle: CSSStyles;
  readonly initialState: State;
  worldSize?: { width: number; height: number };
  worldStrokeWidth?: number;
  worldFontSize?: number;
  colorProperty: "color" | "background" = "color";
  revealKind: RevealKind = "none";
  /** Typewriter text keeps its left edge. Centered text grows in place. */
  textReveal: "typewriter" | "centered" = "centered";
  /** Stroke is drawn inside the object's own markup, not as a CSS border. */
  paintsOwnStroke = false;
  renderLayer = 0;
  depthModeValue: DepthMode = "world";
  /** Geometry markup is rebuilt from scene time on every sample. */
  dynamicGeometry = false;

  constructor(options: TattvaOptions<State> = {}) {
    this.id = options.id ?? `tattva-${++tattvaSequence}`;
    this.tag = options.tag ?? "div";
    this.elementClassName = options.className;
    this.html = options.html;
    this.text = options.text;
    this.initialStyle = { ...options.css };
    this.initialState = {
      x: 0,
      y: 0,
      z: 0,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      rotationX: 0,
      rotationY: 0,
      rotationZ: 0,
      opacity: 1,
      ...options.state,
    } as State;
  }

  at(point: Point): this {
    const [x, y, z = 0] = point;
    return this.setInitial({ x, y, z } as Partial<State>);
  }

  position(point: Point): this {
    return this.at(point);
  }

  scale(value: number): this {
    return this.scale3D([value, value, value]);
  }

  scale3D([scaleX, scaleY, scaleZ]: Vec3): this {
    return this.setInitial({ scaleX, scaleY, scaleZ } as Partial<State>);
  }

  rotate(degrees: number): this {
    return this.setInitial({ rotationZ: degrees } as Partial<State>);
  }

  rotation3D([rotationX, rotationY, rotationZ]: Vec3): this {
    return this.setInitial({ rotationX, rotationY, rotationZ } as Partial<State>);
  }

  rotateX(degrees: number): this {
    return this.setInitial({ rotationX: degrees } as Partial<State>);
  }

  rotateY(degrees: number): this {
    return this.setInitial({ rotationY: degrees } as Partial<State>);
  }

  rotateZ(degrees: number): this {
    return this.rotate(degrees);
  }

  opacity(value: number): this {
    return this.setInitial({ opacity: value } as Partial<State>);
  }

  visible(value = true): this {
    return this.opacity(value ? 1 : 0);
  }

  layer(value: number): this {
    if (!Number.isFinite(value)) throw new Error(`Layer must be finite; received ${value}.`);
    this.renderLayer = value;
    return this;
  }

  depthMode(value: DepthMode): this {
    this.depthModeValue = value;
    return this;
  }

  css(styles: CSSStyles): this {
    Object.assign(this.initialStyle, styles);
    return this;
  }

  cssVar(name: `--${string}`, value: CSSValue): this {
    this.initialStyle[name] = value;
    return this;
  }

  className(value: string): this {
    this.elementClassName = value;
    return this;
  }

  set(next: Partial<State>): this {
    Object.assign(this.initialState, next);
    return this;
  }

  setInitial(next: Partial<State>): this {
    return this.set(next);
  }

  getLayoutSize(): Size {
    const width = (this.worldSize?.width ?? 0) + (this.worldStrokeWidth ?? 0) * 2;
    const height = (this.worldSize?.height ?? 0) + (this.worldStrokeWidth ?? 0) * 2;
    const corners = [
      [-width / 2 * this.initialState.scaleX, -height / 2 * this.initialState.scaleY, 0],
      [width / 2 * this.initialState.scaleX, -height / 2 * this.initialState.scaleY, 0],
      [width / 2 * this.initialState.scaleX, height / 2 * this.initialState.scaleY, 0],
      [-width / 2 * this.initialState.scaleX, height / 2 * this.initialState.scaleY, 0],
    ].map((corner) => rotateXYZ(corner as unknown as Vec3, [
      this.initialState.rotationX,
      this.initialState.rotationY,
      this.initialState.rotationZ,
    ]));
    const xs = corners.map(([x]) => x);
    const ys = corners.map(([, y]) => y);
    return {
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
    };
  }

  contentHTML(_time?: number): string | undefined {
    return this.html;
  }

  /** Adjust the sampled state for this exact scene time. Must not depend on earlier samples. */
  influenceState(_time: number, _state: State): void {}
}

function rotateXYZ([x, y, z]: Vec3, [rotationX, rotationY, rotationZ]: Vec3): Vec3 {
  const rx = rotationX * Math.PI / 180;
  const ry = rotationY * Math.PI / 180;
  const rz = rotationZ * Math.PI / 180;
  const cosX = Math.cos(rx);
  const sinX = Math.sin(rx);
  const cosY = Math.cos(ry);
  const sinY = Math.sin(ry);
  const cosZ = Math.cos(rz);
  const sinZ = Math.sin(rz);
  const afterX: Vec3 = [x, y * cosX - z * sinX, y * sinX + z * cosX];
  const afterY: Vec3 = [
    afterX[0] * cosY + afterX[2] * sinY,
    afterX[1],
    -afterX[0] * sinY + afterX[2] * cosY,
  ];
  return [
    afterY[0] * cosZ - afterY[1] * sinZ,
    afterY[0] * sinZ + afterY[1] * cosZ,
    afterY[2],
  ];
}
