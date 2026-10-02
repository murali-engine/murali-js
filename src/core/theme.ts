import { resolveColor } from "./palette.ts";

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceElevated: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textOnAccent: string;
  accent: string;
  accentAlt: string;
  positive: string;
  warning: string;
  negative: string;
  stroke: string;
  strokeMuted: string;
  grid: string;
}

export interface ThemeTypography {
  headingFamily: string;
  bodyFamily: string;
  monoFamily: string;
  headingWeight: number;
  bodyWeight: number;
  strongWeight: number;
  headingTracking: string;
  bodyTracking: string;
}

export interface ThemeStrokes {
  thin: number;
  normal: number;
  strong: number;
}

export interface ThemeRadii {
  small: number;
  medium: number;
  large: number;
  pill: number;
}

export interface ThemeEffects {
  glow: number;
  shadowOpacity: number;
  mutedOpacity: number;
}

export interface Theme {
  name: string;
  colors: ThemeColors;
  typography: ThemeTypography;
  strokes: ThemeStrokes;
  radii: ThemeRadii;
  effects: ThemeEffects;
}

export interface ThemePatch {
  name?: string;
  colors?: Partial<ThemeColors>;
  typography?: Partial<ThemeTypography>;
  strokes?: Partial<ThemeStrokes>;
  radii?: Partial<ThemeRadii>;
  effects?: Partial<ThemeEffects>;
}

export type ThemeColorRole = keyof ThemeColors;

export interface ThemeColorRef {
  readonly kind: "theme-color";
  readonly role: ThemeColorRole;
}

export type ColorInput = string | ThemeColorRef;

const DARK_THEME: Theme = {
  name: "murali-dark",
  colors: {
    background: "#080b12",
    surface: "#18181b",
    surfaceElevated: "#27272a",
    textPrimary: "#f8fafc",
    textSecondary: "#c7d1e0",
    textMuted: "#888888",
    textOnAccent: "#ffffff",
    accent: "#22d3ee",
    accentAlt: "#6366f1",
    positive: "#83c167",
    warning: "#f0ac5f",
    negative: "#fc6255",
    stroke: "#ffffff",
    strokeMuted: "rgba(199, 209, 224, 0.55)",
    grid: "rgba(140, 191, 242, 0.18)",
  },
  typography: {
    headingFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    bodyFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    monoFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    headingWeight: 700,
    bodyWeight: 500,
    strongWeight: 780,
    headingTracking: "-0.04em",
    bodyTracking: "0em",
  },
  strokes: { thin: 0.018, normal: 0.05, strong: 0.08 },
  radii: { small: 0.08, medium: 0.18, large: 0.28, pill: 999 },
  effects: { glow: 0.85, shadowOpacity: 0.4, mutedOpacity: 0.62 },
};

const LIGHT_THEME: Theme = mergeTheme(DARK_THEME, {
  name: "murali-light",
  colors: {
    background: "#f7f4ed",
    surface: "#e0e5ea",
    surfaceElevated: "#ffffff",
    textPrimary: "#232b35",
    textSecondary: "#3f4c5a",
    textMuted: "#596675",
    textOnAccent: "#ffffff",
    accent: "#2382d6",
    accentAlt: "#db6647",
    positive: "#3d9660",
    warning: "#e5932d",
    negative: "#c94747",
    stroke: "#344252",
    strokeMuted: "rgba(52, 66, 82, 0.48)",
    grid: "rgba(35, 130, 214, 0.16)",
  },
  effects: { shadowOpacity: 0.18 },
});

export const themes = Object.freeze({
  dark: freezeTheme(DARK_THEME),
  light: freezeTheme(LIGHT_THEME),
});

export function themeColor(role: ThemeColorRole): ThemeColorRef {
  return Object.freeze({ kind: "theme-color", role });
}

export function isThemeColorRef(value: unknown): value is ThemeColorRef {
  return typeof value === "object" && value !== null
    && (value as ThemeColorRef).kind === "theme-color";
}

export function resolveColorInput(value: ColorInput, theme: Theme = themes.dark): string {
  return isThemeColorRef(value) ? theme.colors[value.role] : resolveColor(value);
}

export function createTheme(patch?: ThemePatch): Theme;
export function createTheme(base: Theme, patch: ThemePatch): Theme;
export function createTheme(baseOrPatch: Theme | ThemePatch = {}, patch?: ThemePatch): Theme {
  const base = patch === undefined ? themes.dark : baseOrPatch as Theme;
  const overrides = patch === undefined ? baseOrPatch as ThemePatch : patch;
  return freezeTheme(mergeTheme(base, overrides));
}

export function mergeTheme(base: Theme, patch: ThemePatch = {}): Theme {
  return {
    name: patch.name ?? base.name,
    colors: { ...base.colors, ...patch.colors },
    typography: { ...base.typography, ...patch.typography },
    strokes: { ...base.strokes, ...patch.strokes },
    radii: { ...base.radii, ...patch.radii },
    effects: { ...base.effects, ...patch.effects },
  };
}

export function themeCSSVariables(theme: Theme): Record<`--murali-${string}`, string> {
  const values: Record<`--murali-${string}`, string> = {};
  for (const [name, value] of Object.entries(theme.colors)) {
    values[`--murali-color-${kebab(name)}`] = value;
  }
  for (const [name, value] of Object.entries(theme.typography)) {
    values[`--murali-typography-${kebab(name)}`] = String(value);
  }
  for (const [name, value] of Object.entries(theme.strokes)) {
    values[`--murali-stroke-${kebab(name)}`] = String(value);
  }
  for (const [name, value] of Object.entries(theme.radii)) {
    values[`--murali-radius-${kebab(name)}`] = String(value);
  }
  for (const [name, value] of Object.entries(theme.effects)) {
    values[`--murali-effect-${kebab(name)}`] = String(value);
  }
  return values;
}

function freezeTheme(theme: Theme): Theme {
  validateTheme(theme);
  Object.freeze(theme.colors);
  Object.freeze(theme.typography);
  Object.freeze(theme.strokes);
  Object.freeze(theme.radii);
  Object.freeze(theme.effects);
  return Object.freeze(theme);
}

function validateTheme(theme: Theme): void {
  if (theme.name.trim().length === 0) throw new Error("Theme name cannot be empty.");
  for (const [name, value] of Object.entries(theme.colors)) {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`Theme color ${name} must be a non-empty CSS color.`);
    }
  }
  for (const [name, value] of Object.entries(theme.typography)) {
    if (typeof value === "number" && (!Number.isFinite(value) || value < 0)) {
      throw new Error(`Theme typography ${name} must be a non-negative finite number.`);
    }
    if (typeof value === "string" && value.trim().length === 0) {
      throw new Error(`Theme typography ${name} cannot be empty.`);
    }
  }
  validateNonnegative(theme.strokes, "stroke");
  validateNonnegative(theme.radii, "radius");
  validateNonnegative(theme.effects, "effect");
  for (const name of ["shadowOpacity", "mutedOpacity"] as const) {
    const value = theme.effects[name];
    if (value > 1) throw new Error(`Theme effect ${name} must be between 0 and 1.`);
  }
}

function validateNonnegative(values: object, label: string): void {
  for (const [name, value] of Object.entries(values) as Array<[string, number]>) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Theme ${label} ${name} must be a non-negative finite number.`);
    }
  }
}

function kebab(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}
