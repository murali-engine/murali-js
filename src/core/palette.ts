/** Murali and Manim palette. Shade A is lightest, E is darkest, and the bare name is shade C. */
export const WHITE = "#ffffff";
export const BLACK = "#000000";

export const GRAY_A = "#dcdcdc";
export const GRAY_B = "#bbbbbb";
export const GRAY_C = "#888888";
export const GRAY_D = "#555555";
export const GRAY_E = "#222222";
export const GRAY = GRAY_C;
export const GREY = GRAY_C;

export const BLUE_A = "#c7e9f1";
export const BLUE_B = "#9cdceb";
export const BLUE_C = "#58c4dd";
export const BLUE_D = "#29abca";
export const BLUE_E = "#1c758a";
export const BLUE = BLUE_C;

export const TEAL_A = "#acead7";
export const TEAL_B = "#76ddc0";
export const TEAL_C = "#5cd0b3";
export const TEAL_D = "#55c1a7";
export const TEAL_E = "#49a88f";
export const TEAL = TEAL_C;

export const GREEN_A = "#c9e2ae";
export const GREEN_B = "#a6cf8c";
export const GREEN_C = "#83c167";
export const GREEN_D = "#77b05d";
export const GREEN_E = "#699c52";
export const GREEN = GREEN_C;

export const YELLOW_A = "#fff1b6";
export const YELLOW_B = "#ffea94";
export const YELLOW_C = "#ffff00";
export const YELLOW_D = "#f4d345";
export const YELLOW_E = "#e8c11c";
export const YELLOW = YELLOW_C;

export const GOLD_A = "#f7c797";
export const GOLD_B = "#f9b775";
export const GOLD_C = "#f0ac5f";
export const GOLD_D = "#e1a158";
export const GOLD_E = "#c78d46";
export const GOLD = GOLD_C;

export const ORANGE_A = "#f7c59f";
export const ORANGE_B = "#fcaf80";
export const ORANGE_C = "#ff862f";
export const ORANGE_D = "#f26522";
export const ORANGE_E = "#d14c0a";
export const ORANGE = ORANGE_C;

export const RED_A = "#f7a1a3";
export const RED_B = "#ff8080";
export const RED_C = "#fc6255";
export const RED_D = "#e65a4c";
export const RED_E = "#cf5044";
export const RED = RED_C;

export const MAROON_A = "#ecabc1";
export const MAROON_B = "#ec92ab";
export const MAROON_C = "#c55f73";
export const MAROON_D = "#a24d61";
export const MAROON_E = "#94424f";
export const MAROON = MAROON_C;

export const PURPLE_A = "#caa3e8";
export const PURPLE_B = "#b189c6";
export const PURPLE_C = "#9a72ac";
export const PURPLE_D = "#715582";
export const PURPLE_E = "#644172";
export const PURPLE = PURPLE_C;

export const PINK_A = "#f4a2c0";
export const PINK_B = "#f5829b";
export const PINK_C = "#d147a3";
export const PINK_D = "#c2185b";
export const PINK_E = "#ad1457";
export const PINK = PINK_C;

export const PURE_RED = "#ff0000";
export const PURE_GREEN = "#00ff00";
export const PURE_BLUE = "#0000ff";

/**
 * Murali's fixed compatibility palette. Prefer semantic theme roles for
 * reusable components; use this namespace when a specific swatch is intended.
 */
export const palette = Object.freeze({
  WHITE, BLACK,
  GRAY_A, GRAY_B, GRAY_C, GRAY_D, GRAY_E, GRAY, GREY,
  BLUE_A, BLUE_B, BLUE_C, BLUE_D, BLUE_E, BLUE,
  TEAL_A, TEAL_B, TEAL_C, TEAL_D, TEAL_E, TEAL,
  GREEN_A, GREEN_B, GREEN_C, GREEN_D, GREEN_E, GREEN,
  YELLOW_A, YELLOW_B, YELLOW_C, YELLOW_D, YELLOW_E, YELLOW,
  GOLD_A, GOLD_B, GOLD_C, GOLD_D, GOLD_E, GOLD,
  ORANGE_A, ORANGE_B, ORANGE_C, ORANGE_D, ORANGE_E, ORANGE,
  RED_A, RED_B, RED_C, RED_D, RED_E, RED,
  MAROON_A, MAROON_B, MAROON_C, MAROON_D, MAROON_E, MAROON,
  PURPLE_A, PURPLE_B, PURPLE_C, PURPLE_D, PURPLE_E, PURPLE,
  PINK_A, PINK_B, PINK_C, PINK_D, PINK_E, PINK,
  PURE_RED, PURE_GREEN, PURE_BLUE,
});

export type Palette = typeof palette;

const namedColors: Record<string, string> = {
  WHITE, BLACK,
  GRAY_A, GRAY_B, GRAY_C, GRAY_D, GRAY_E, GRAY, GREY,
  BLUE_A, BLUE_B, BLUE_C, BLUE_D, BLUE_E, BLUE,
  TEAL_A, TEAL_B, TEAL_C, TEAL_D, TEAL_E, TEAL,
  GREEN_A, GREEN_B, GREEN_C, GREEN_D, GREEN_E, GREEN,
  YELLOW_A, YELLOW_B, YELLOW_C, YELLOW_D, YELLOW_E, YELLOW,
  GOLD_A, GOLD_B, GOLD_C, GOLD_D, GOLD_E, GOLD,
  ORANGE_A, ORANGE_B, ORANGE_C, ORANGE_D, ORANGE_E, ORANGE,
  RED_A, RED_B, RED_C, RED_D, RED_E, RED,
  MAROON_A, MAROON_B, MAROON_C, MAROON_D, MAROON_E, MAROON,
  PURPLE_A, PURPLE_B, PURPLE_C, PURPLE_D, PURPLE_E, PURPLE,
  PINK_A, PINK_B, PINK_C, PINK_D, PINK_E, PINK,
  PURE_RED, PURE_GREEN, PURE_BLUE,
};

const lookup = new Map<string, string>();
for (const [name, hex] of Object.entries(namedColors)) {
  lookup.set(normalizeColorName(name), hex);
  if (name.startsWith("GRAY")) lookup.set(normalizeColorName(name.replace("GRAY", "GREY")), hex);
}

/** Resolve a Murali palette name (`RED_B` or `redB`) to hex. Other CSS colors pass through. */
export function resolveColor(value: string): string {
  return lookup.get(normalizeColorName(value)) ?? value;
}

export function isCssPaint(value: string): boolean {
  return /gradient\(|\burl\(|\bimage\(/.test(value);
}

function normalizeColorName(value: string): string {
  return value.toLowerCase().replaceAll("_", "");
}
