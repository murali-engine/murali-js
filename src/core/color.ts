const HEX_COLOR = /^#([\da-f]{3}|[\da-f]{6})$/i;

function expandHex(value: string): string {
  const hex = value.slice(1);
  return hex.length === 3
    ? hex.split("").map((character) => character + character).join("")
    : hex;
}

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_COLOR.test(value);
}

export function interpolateHex(from: string, to: string, progress: number): string {
  const left = expandHex(from);
  const right = expandHex(to);
  const channels = [0, 2, 4].map((offset) => {
    const start = Number.parseInt(left.slice(offset, offset + 2), 16);
    const end = Number.parseInt(right.slice(offset, offset + 2), 16);
    return Math.round(start + (end - start) * progress).toString(16).padStart(2, "0");
  });
  return `#${channels.join("")}`;
}

export function interpolateValue<T>(from: T, to: T, progress: number): T {
  if (typeof from === "number" && typeof to === "number") {
    return (from + (to - from) * progress) as T;
  }
  if (isHexColor(from) && isHexColor(to)) {
    return interpolateHex(from, to, progress) as T;
  }
  return (progress < 1 ? from : to) as T;
}
