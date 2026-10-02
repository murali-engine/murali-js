export type FontDisplay = "auto" | "block" | "swap" | "fallback" | "optional";

export interface FontFaceOptions {
  readonly weight?: string | number;
  readonly style?: "normal" | "italic" | "oblique";
  readonly display?: FontDisplay;
}

export interface FontFaceAsset extends Required<FontFaceOptions> {
  readonly kind: "file" | "url";
  readonly family: string;
  readonly source: string;
}

const fileResources: Record<string, string> = {};

/** Define a font whose file is embedded by the Murali scene bundler. Keep the path as a string literal. */
export function fontFile(family: string, path: string, options: FontFaceOptions = {}): FontFaceAsset {
  return createFont("file", family, path, options);
}

/** Define a browser-loadable font URL or data URL. */
export function fontUrl(family: string, url: string, options: FontFaceOptions = {}): FontFaceAsset {
  return createFont("url", family, url, options);
}

/** Build a CSS font-family stack from a registered font and optional fallbacks. */
export function fontFamily(font: FontFaceAsset | string, ...fallbacks: readonly string[]): string {
  const primary = typeof font === "string" ? font : quoteFamily(font.family);
  return [primary, ...fallbacks].filter((value) => value.trim().length > 0).join(", ");
}

/** @internal Installed by the generated browser entry before the scene is constructed. */
export function installFontFileResources(resources: Readonly<Record<string, string>>): void {
  Object.assign(fileResources, resources);
}

/** @internal Load all registered faces before the first preview or exported frame. */
export async function loadFontFaces(fonts: readonly FontFaceAsset[]): Promise<void> {
  if (typeof document === "undefined" || typeof FontFace === "undefined") return;
  const loaded = fonts.map(async (font) => {
    const source = font.kind === "file" ? fileResources[font.source] : font.source;
    // Private file fonts are optional so a shared checkout can fall back cleanly.
    if (!source) return;
    const face = new FontFace(font.family, `url(${JSON.stringify(source)})`, {
      weight: String(font.weight),
      style: font.style,
      display: font.display,
    });
    document.fonts.add(await face.load());
  });
  await Promise.all(loaded);
  await document.fonts.ready;
}

function createFont(
  kind: FontFaceAsset["kind"],
  family: string,
  source: string,
  options: FontFaceOptions,
): FontFaceAsset {
  const normalizedFamily = nonempty(family, "Font family");
  const normalizedSource = nonempty(source, kind === "file" ? "Font path" : "Font URL");
  const weight = options.weight ?? "normal";
  if (typeof weight === "number" && (!Number.isFinite(weight) || weight < 1 || weight > 1000)) {
    throw new Error(`Font weight must be between 1 and 1000; received ${weight}.`);
  }
  return Object.freeze({
    kind,
    family: normalizedFamily,
    source: normalizedSource,
    weight,
    style: options.style ?? "normal",
    display: options.display ?? "swap",
  });
}

function nonempty(value: string, label: string): string {
  if (value.trim().length === 0) throw new Error(`${label} must not be empty.`);
  return value;
}

function quoteFamily(value: string): string {
  return `"${value.replace(/["\\]/gu, "\\$&")}"`;
}
