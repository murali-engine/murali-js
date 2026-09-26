import { interpolateValue } from "./color.ts";

export type CSSValue = string | number | null;

export type CSSStyles = Partial<Record<keyof CSSStyleDeclaration, CSSValue>> & {
  [customProperty: `--${string}`]: CSSValue;
};

const NUMBER = /-?(?:\d+\.?\d*|\.\d+)/g;

export function interpolateCSSValue(from: CSSValue, to: CSSValue, progress: number): CSSValue {
  if (from === null || to === null) return progress < 1 ? from : to;
  if (typeof from === "number" && typeof to === "number") {
    return interpolateValue(from, to, progress);
  }
  if (typeof from !== "string" || typeof to !== "string") {
    return progress < 1 ? from : to;
  }

  const direct = interpolateValue(from, to, progress);
  if (direct !== from || progress >= 1) return direct;

  const fromNumbers = [...from.matchAll(NUMBER)];
  const toNumbers = [...to.matchAll(NUMBER)];
  if (fromNumbers.length === 0 || fromNumbers.length !== toNumbers.length) return from;

  const fromShape = from.replace(NUMBER, "#");
  const toShape = to.replace(NUMBER, "#");
  if (fromShape !== toShape) return from;

  let index = 0;
  return from.replace(NUMBER, () => {
    const start = Number(fromNumbers[index][0]);
    const end = Number(toNumbers[index][0]);
    index += 1;
    return String(start + (end - start) * progress);
  });
}
