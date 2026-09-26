import type { ReactNode } from "react";
import { Tattva, type TattvaOptions, type TattvaState } from "./Tattva.ts";

export type ReactRenderer<State extends TattvaState> = (state: Readonly<State>) => ReactNode;

export class ReactTattva<State extends TattvaState = TattvaState> extends Tattva<State> {
  override readonly kind = "react" as const;

  constructor(readonly render: ReactRenderer<State>, options: TattvaOptions<State> = {}) {
    super(options);
  }
}
