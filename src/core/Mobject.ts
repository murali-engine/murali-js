export type StateValue = number | string | boolean | null;

export interface MobjectState {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  [key: string]: StateValue;
}

export interface MobjectOptions {
  id?: string;
  tag?: keyof HTMLElementTagNameMap;
  className?: string;
  html?: string;
  text?: string;
  style?: Partial<CSSStyleDeclaration>;
  state?: Partial<MobjectState>;
}

let objectSequence = 0;

export class Mobject<State extends MobjectState = MobjectState> {
  readonly kind: "dom" | "react" | "three" = "dom";
  readonly id: string;
  readonly tag: keyof HTMLElementTagNameMap;
  readonly className?: string;
  readonly html?: string;
  readonly text?: string;
  readonly initialStyle: Partial<CSSStyleDeclaration>;
  readonly initialState: State;
  state: State;

  constructor(options: MobjectOptions = {}) {
    this.id = options.id ?? `mobject-${++objectSequence}`;
    this.tag = options.tag ?? "div";
    this.className = options.className;
    this.html = options.html;
    this.text = options.text;
    this.initialStyle = options.style ?? {};
    this.initialState = {
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      opacity: 1,
      ...options.state,
    } as State;
    this.state = { ...this.initialState };
  }

  set(next: Partial<State>): this {
    this.state = { ...this.state, ...next };
    return this;
  }
}
