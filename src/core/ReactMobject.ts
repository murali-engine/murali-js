import type { ReactNode } from "react";
import { Mobject, type MobjectOptions, type MobjectState } from "./Mobject.ts";

export type ReactRenderer<State extends MobjectState> = (state: Readonly<State>) => ReactNode;

export class ReactMobject<State extends MobjectState = MobjectState> extends Mobject<State> {
  override readonly kind = "react" as const;

  constructor(readonly render: ReactRenderer<State>, options: MobjectOptions = {}) {
    super(options);
  }
}
