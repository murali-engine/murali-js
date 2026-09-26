import type { Easing } from "./easing.ts";
import { easeInOutCubic, linear } from "./easing.ts";
import type { Mobject, MobjectState } from "./Mobject.ts";

export interface AnimationSpec<State extends MobjectState = MobjectState> {
  mobject: Mobject<State>;
  to: Partial<State>;
  duration: number;
  easing: Easing;
}

export interface AnimationOptions {
  duration?: number;
  easing?: Easing;
}

export function Animate<State extends MobjectState>(
  mobject: Mobject<State>,
  to: Partial<State>,
  options: AnimationOptions = {},
): AnimationSpec<State> {
  return {
    mobject,
    to,
    duration: options.duration ?? 1,
    easing: options.easing ?? easeInOutCubic,
  };
}

export const FadeIn = <State extends MobjectState>(mobject: Mobject<State>, options: AnimationOptions = {}) =>
  Animate(mobject, { opacity: 1 } as Partial<State>, options);
export const FadeOut = <State extends MobjectState>(mobject: Mobject<State>, options: AnimationOptions = {}) =>
  Animate(mobject, { opacity: 0 } as Partial<State>, options);
export const Move = <State extends MobjectState>(
  mobject: Mobject<State>,
  position: Partial<Pick<MobjectState, "x" | "y">>,
  options: AnimationOptions = {},
) => Animate(mobject, position as Partial<State>, options);
export const Scale = <State extends MobjectState>(mobject: Mobject<State>, scale: number, options: AnimationOptions = {}) =>
  Animate(mobject, { scale } as Partial<State>, options);
export const Rotate = <State extends MobjectState>(mobject: Mobject<State>, rotation: number, options: AnimationOptions = {}) =>
  Animate(mobject, { rotation } as Partial<State>, options);
export const SetColor = <State extends MobjectState>(mobject: Mobject<State>, color: string, options: AnimationOptions = {}) =>
  Animate(mobject, { color } as unknown as Partial<State>, options);

export const instant = { duration: 0, easing: linear } satisfies AnimationOptions;
