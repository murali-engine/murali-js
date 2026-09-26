import type { CSSStyles, CSSValue } from "./css.ts";

export type StateValue = number | string | boolean | null;
export type Vec2 = readonly [number, number];
export type Vec3 = readonly [number, number, number];
export type Point = Vec2 | Vec3;

export interface TattvaState {
  x: number;
  y: number;
  z: number;
  scale: number;
  rotation: number;
  opacity: number;
  [key: string]: StateValue;
}

export interface TattvaOptions {
  id?: string;
  tag?: keyof HTMLElementTagNameMap;
  className?: string;
  html?: string;
  text?: string;
  css?: CSSStyles;
  state?: Partial<TattvaState>;
}

let tattvaSequence = 0;

export class Tattva<State extends TattvaState = TattvaState> {
  readonly kind: "dom" | "react" | "three" = "dom";
  readonly id: string;
  readonly tag: keyof HTMLElementTagNameMap;
  readonly html?: string;
  readonly text?: string;
  elementClassName?: string;
  readonly initialStyle: CSSStyles;
  readonly initialState: State;
  state: State;
  worldSize?: { width: number; height: number };
  worldStrokeWidth?: number;
  worldFontSize?: number;
  colorProperty: "color" | "background" = "color";

  constructor(options: TattvaOptions = {}) {
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
      scale: 1,
      rotation: 0,
      opacity: 1,
      ...options.state,
    } as State;
    this.state = { ...this.initialState };
  }

  at(point: Point): this {
    const [x, y, z = 0] = point;
    return this.setInitial({ x, y, z } as Partial<State>);
  }

  scale(value: number): this {
    return this.setInitial({ scale: value } as Partial<State>);
  }

  rotate(degrees: number): this {
    return this.setInitial({ rotation: degrees } as Partial<State>);
  }

  opacity(value: number): this {
    return this.setInitial({ opacity: value } as Partial<State>);
  }

  visible(value = true): this {
    return this.opacity(value ? 1 : 0);
  }

  layer(value: number): this {
    return this.setInitial({ z: value } as Partial<State>);
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
    this.state = { ...this.state, ...next };
    return this;
  }

  setInitial(next: Partial<State>): this {
    Object.assign(this.initialState, next);
    Object.assign(this.state, next);
    return this;
  }
}
