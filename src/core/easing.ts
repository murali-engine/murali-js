export type Easing = (t: number) => number;

export const linear: Easing = (t) => t;
export const easeInQuad: Easing = (t) => t * t;
export const easeOutQuad: Easing = (t) => 1 - (1 - t) * (1 - t);
export const easeInOutQuad: Easing = (t) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
export const easeInCubic: Easing = (t) => t * t * t;
export const easeOutCubic: Easing = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic: Easing = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const easeInSine: Easing = (t) => 1 - Math.cos((t * Math.PI) / 2);
export const easeOutSine: Easing = (t) => Math.sin((t * Math.PI) / 2);
export const easeInOutSine: Easing = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

export const easeInBack: Easing = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return c3 * t * t * t - c1 * t * t;
};
export const easeOutBack: Easing = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
export const easeInOutBack: Easing = (t) => {
  const c1 = 1.70158;
  const c2 = c1 * 1.525;
  return t < 0.5
    ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
    : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
};

export const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

