import { Group, type GroupTattva } from "../layout/Group.ts";
import { interpolateValue } from "../../core/color.ts";
import type { FocusAnimationSpec, FocusAnimationTarget } from "../../core/Timeline.ts";
import { Tattva, type StateValue, type TattvaState, type Vec2 } from "../../core/Tattva.ts";
import { resolveColor } from "../../core/palette.ts";
import { resolveColorInput, type ColorInput } from "../../core/theme.ts";
import { sampleRange } from "./graph.ts";
import { Line } from "../primitives/paths.ts";
import { Label, type LabelTattva } from "../primitives/shapes.ts";

const CELL_WIDTH = 1.2;
const CELL_HEIGHT = 0.6;

/** A grid of text that draws its rules, then types its cells, as `revealProgress` goes from 0 to 1. */
export function Table(rows: readonly (readonly string[])[]): TableTattva {
  return new TableTattva(rows);
}

export class TableTattva extends Tattva {
  private rowNames: string[] = [];
  private columnNames: string[] = [];
  private titleText: string | null = null;
  private ruleColor = "#cccccc";
  private ink = "#ffffff";
  private fontHeight = 0.3;
  private horizontalGap = 0.2;
  private verticalGap = 0.2;
  private includeOuter = true;
  private shown = 0;

  constructor(private readonly rows: readonly (readonly string[])[]) {
    super();
    this.dynamicGeometry = true;
    this.revealKind = "none";
    this.setInitial({ revealProgress: 0 });
    this.syncSize();
  }

  columnLabels(labels: readonly string[]): this {
    this.columnNames = [...labels];
    this.syncSize();
    return this;
  }

  rowLabels(labels: readonly string[]): this {
    this.rowNames = [...labels];
    this.syncSize();
    return this;
  }

  title(value: string): this {
    this.titleText = value;
    this.syncSize();
    return this;
  }

  lineColor(value: string): this {
    this.ruleColor = resolveColor(value);
    return this;
  }

  textColor(value: string): this {
    this.ink = resolveColor(value);
    return this;
  }

  textHeight(value: number): this {
    this.fontHeight = value;
    this.syncSize();
    return this;
  }

  horizontalPadding(value: number): this {
    this.horizontalGap = value;
    this.syncSize();
    return this;
  }

  verticalPadding(value: number): this {
    this.verticalGap = value;
    this.syncSize();
    return this;
  }

  outerLines(show = true): this {
    this.includeOuter = show;
    return this;
  }

  /** Cell and label strings visible at a write progress in `0..1`. */
  textsAt(progress: number): string[] {
    return this.entries(progress).map((entry) => entry.text);
  }

  override influenceState(_time: number, state: TattvaState): void {
    this.shown = Math.max(0, Math.min(1, state.revealProgress ?? 0));
  }

  override contentHTML(): string {
    return this.markup(this.shown);
  }

  private syncSize(): void {
    const size = this.dimensions();
    this.worldSize = { width: size.width, height: size.height };
  }

  private dimensions(): { width: number; height: number } {
    const columns = this.rows[0]?.length ?? 0;
    const gridWidth = columns * CELL_WIDTH + Math.max(0, columns - 1) * this.horizontalGap;
    const gridHeight = this.rows.length * CELL_HEIGHT + Math.max(0, this.rows.length - 1) * this.verticalGap;
    const labelColumn = this.rowNames.length > 0 ? 1.5 + this.horizontalGap : 0;
    const labelRow = this.columnNames.length > 0 ? CELL_HEIGHT + this.verticalGap : 0;
    const titleBlock = this.titleText ? this.fontHeight * 1.2 + this.fontHeight * 0.9 : 0;
    return {
      width: gridWidth + labelColumn + 0.4,
      height: gridHeight + labelRow + titleBlock + 0.2,
    };
  }

  private entries(progress: number): Array<{ text: string; x: number; y: number; height: number }> {
    const textProgress = Math.max(0, Math.min(1, (progress - 0.28) / 0.72));
    const columns = this.rows[0]?.length ?? 0;
    const gridWidth = columns * (CELL_WIDTH + this.horizontalGap);
    const gridHeight = this.rows.length * (CELL_HEIGHT + this.verticalGap);
    const startX = -gridWidth / 2;
    const startY = gridHeight / 2;
    const entries: Array<{ text: string; x: number; y: number }> = [];
    this.columnNames.forEach((label, index) => {
      entries.push({
        text: label,
        x: startX + index * (CELL_WIDTH + this.horizontalGap) + (CELL_WIDTH + this.horizontalGap) / 2,
        y: startY + (CELL_HEIGHT + this.verticalGap) / 2,
      });
    });
    this.rowNames.forEach((label, index) => {
      entries.push({
        text: label,
        x: startX - (CELL_WIDTH + this.horizontalGap) / 2,
        y: startY - index * (CELL_HEIGHT + this.verticalGap) - (CELL_HEIGHT + this.verticalGap) / 2,
      });
    });
    this.rows.forEach((row, rowIndex) => {
      row.forEach((cell, columnIndex) => {
        entries.push({
          text: cell,
          x: startX + columnIndex * (CELL_WIDTH + this.horizontalGap) + (CELL_WIDTH + this.horizontalGap) / 2,
          y: startY - rowIndex * (CELL_HEIGHT + this.verticalGap) - (CELL_HEIGHT + this.verticalGap) / 2,
        });
      });
    });
    const visible = entries.flatMap((entry, index) => {
      const reveal = staggered(textProgress, index, entries.length, 1.2);
      const count = Math.ceil(entry.text.length * reveal);
      return count > 0 ? [{ ...entry, text: entry.text.slice(0, count), height: this.fontHeight * 0.8 }] : [];
    });
    if (this.titleText && textProgress > 0) {
      const titleReveal = Math.min(1, textProgress / 0.35);
      const count = Math.ceil(this.titleText.length * titleReveal);
      const size = this.dimensions();
      if (count > 0) {
        visible.unshift({
          text: this.titleText.slice(0, count),
          x: 0,
          y: -size.height / 2 + this.fontHeight * 0.45,
          height: this.fontHeight * 0.9,
        });
      }
    }
    return visible;
  }

  private markup(progress: number): string {
    const size = this.dimensions();
    const columns = this.rows[0]?.length ?? 0;
    const gridWidth = columns * (CELL_WIDTH + this.horizontalGap);
    const gridHeight = this.rows.length * (CELL_HEIGHT + this.verticalGap);
    const startX = -gridWidth / 2;
    const startY = gridHeight / 2;
    const lineProgress = Math.max(0, Math.min(1, progress / 0.52));
    const horizontal = this.includeOuter ? range(this.rows.length + 1) : range(Math.max(0, this.rows.length - 1), 1);
    const vertical = this.includeOuter ? range(columns + 1) : range(Math.max(0, columns - 1), 1);
    const total = horizontal.length + vertical.length;
    const lines = [
      ...horizontal.map((row, order) => {
        const draw = segmentProgress(lineProgress, order, total);
        const y = startY - row * (CELL_HEIGHT + this.verticalGap);
        return `<line x1="${startX}" y1="${-y}" x2="${startX + gridWidth * draw}" y2="${-y}" stroke="${this.ruleColor}" stroke-width="0.02" />`;
      }),
      ...vertical.map((column, order) => {
        const draw = segmentProgress(lineProgress, horizontal.length + order, total);
        const x = startX + column * (CELL_WIDTH + this.horizontalGap);
        return `<line x1="${x}" y1="${-startY}" x2="${x}" y2="${-(startY - gridHeight * draw)}" stroke="${this.ruleColor}" stroke-width="0.02" />`;
      }),
    ].join("");
    const texts = this.entries(progress).map((entry) =>
      `<text x="${entry.x}" y="${-entry.y}" fill="${this.ink}" font-size="${entry.height}" text-anchor="middle" dominant-baseline="middle" font-family="Inter, ui-sans-serif, system-ui, sans-serif">${escapeHtml(entry.text)}</text>`,
    ).join("");
    const minX = -size.width / 2;
    const maxY = size.height / 2;
    return `<svg width="100%" height="100%" viewBox="${minX} ${-maxY} ${size.width} ${size.height}" overflow="visible" xmlns="http://www.w3.org/2000/svg">${lines}${texts}</svg>`;
  }
}

export interface EquationTerm {
  text: string;
  key: string;
  color: string;
}

export interface PlacedTerm {
  key: string;
  text: string;
  color: string;
  center: Vec2;
  tattva: LabelTattva;
}

/** A row of keyed terms. Matching keys can slide from one equation to another. */
export function Equation(terms: readonly EquationTerm[], height = 0.42): EquationBuild {
  const gap = height * 0.35;
  const widths = terms.map((term) => Math.max(height * 0.4, term.text.length * height * 0.58));
  const total = widths.reduce((sum, width) => sum + width, 0) + gap * Math.max(0, terms.length - 1);
  let cursor = -total / 2;
  const placed: PlacedTerm[] = terms.map((term, index) => {
    const width = widths[index] ?? height;
    const center = cursor + width / 2;
    cursor += width + gap;
    const tattva = Label(term.text).height(height).color(term.color).at([center, 0, 0]);
    return { key: term.key, text: term.text, color: term.color, center: [center, 0], tattva };
  });
  return { group: Group(placed.map((term) => term.tattva)), terms: placed };
}

export interface EquationBuild {
  group: GroupTattva;
  terms: PlacedTerm[];
}

export interface ContinuityPlacementOptions {
  /** Straight interpolation by default; arcs separate terms travelling in opposite directions. */
  path?: "straight" | "arc";
  /** Maximum perpendicular displacement for an arc, in world units. Defaults to 0.32. */
  arcHeight?: number;
}

/** Where each target term sits while `eased` moves from 0 to 1. */
export function continuityPlacement(
  source: readonly PlacedTerm[],
  target: readonly PlacedTerm[],
  eased: number,
  options: ContinuityPlacementOptions = {},
): Array<{ tattva: LabelTattva; x: number; y: number; opacity: number; scale: number }> {
  const path = options.path ?? "straight";
  const arcHeight = options.arcHeight ?? 0.32;
  if (!Number.isFinite(arcHeight)) throw new RangeError("Equation continuity arc height must be finite");
  const byKey = new Map(source.map((term) => [term.key, term]));
  return target.map((term) => {
    const match = byKey.get(term.key);
    if (!match) {
      return { tattva: term.tattva, x: term.center[0], y: term.center[1] + (1 - eased) * 0.42 * 0.35, opacity: eased, scale: 0.9 + 0.1 * eased };
    }
    const x = match.center[0] + (term.center[0] - match.center[0]) * eased;
    const y = match.center[1] + (term.center[1] - match.center[1]) * eased;
    const travelX = term.center[0] - match.center[0];
    const arc = path === "arc" && Math.abs(travelX) > 1e-6
      ? Math.sign(travelX) * Math.sin(Math.PI * eased) * arcHeight
      : 0;
    return {
      tattva: term.tattva,
      x,
      y: y + arc,
      opacity: 1,
      scale: 1,
    };
  });
}

/** Horizontal axis with ticks. The origin tick uses a separate color. */
export function NumberLine(range: readonly [number, number]): NumberLineBuilder {
  return new NumberLineBuilder(range);
}

export class NumberLineBuilder {
  private stepSize = 1;
  private ink = "#ffffff";
  private originInk = "#ffffff";
  private thicknessValue = 0.02;
  private tick = 0.14;

  constructor(private readonly range: readonly [number, number]) {}

  step(value: number): this {
    this.stepSize = value;
    return this;
  }

  color(value: string): this {
    this.ink = resolveColor(value);
    return this;
  }

  originColor(value: string): this {
    this.originInk = resolveColor(value);
    return this;
  }

  build(): GroupTattva {
    const ticks = sampleRange(this.range, this.stepSize);
    return Group([
      Line().from([this.range[0], 0]).to([this.range[1], 0]).stroke({ color: this.ink, width: this.thicknessValue }),
      ...ticks.map((value) => {
        const origin = Math.abs(value) <= 1e-4;
        const size = origin ? this.tick * 1.35 : this.tick;
        return Line()
          .from([value, -size / 2])
          .to([value, size / 2])
          .stroke({ color: origin ? this.originInk : this.ink, width: this.thicknessValue });
      }),
    ]);
  }
}

/** Browser math for a small TeX/Typst subset. Sampled from the source string, not a TeX process. */
export function MathText(source: string): MathTextTattva {
  return new MathTextTattva(source);
}

export class MathTextTattva extends Tattva {
  private ink = "#ffffff";

  constructor(private readonly source: string) {
    super();
    this.revealKind = "none";
    this.height(0.5);
  }

  height(value: number): this {
    this.worldFontSize = value;
    this.worldSize = { width: Math.max(value * 2, sourceWidth(this.source) * value), height: value * 1.6 };
    return this;
  }

  color(value: string): this {
    this.ink = resolveColor(value);
    this.setInitial({ color: this.ink });
    return this;
  }

  override contentHTML(): string {
    return `<math xmlns="http://www.w3.org/1998/Math/MathML" display="block" style="color:${this.ink}">${mathml(stripMath(this.source))}</math>`;
  }
}

/** A window of syntax-colored browser text. */
export function CodeBlock(source: string, language: "rust" | "toml"): CodeBlockTattva {
  return new CodeBlockTattva(source, language);
}

export class CodeBlockTattva extends Tattva {
  private codeTheme?: "dark" | "light";
  private titleText = "";
  private numbers = true;
  private box: readonly [number, number] = [6, 2];

  constructor(
    private readonly source: string,
    private readonly language: "rust" | "toml",
  ) {
    super();
    this.revealKind = "none";
    this.resize();
  }

  theme(value: "dark" | "light"): this {
    this.codeTheme = value;
    return this;
  }

  surface(value: "dark" | "light"): this {
    this.codeTheme = value;
    return this;
  }

  title(value: string): this {
    this.titleText = value;
    return this;
  }

  lineNumbers(show = true): this {
    this.numbers = show;
    return this;
  }

  contentBox(width: number, height: number): this {
    this.box = [width, height];
    this.resize();
    return this;
  }

  fontSize(value: number): this {
    this.worldFontSize = value;
    return this;
  }

  override contentHTML(): string {
    const explicitDark = this.codeTheme === "dark";
    const explicitLight = this.codeTheme === "light";
    const background = explicitDark
      ? "rgb(15, 23, 41)"
      : explicitLight ? "rgb(247, 250, 255)" : this.resolvedTheme.colors.surface;
    const titleBar = explicitDark
      ? "rgb(31, 41, 61)"
      : explicitLight ? "rgb(235, 240, 250)" : this.resolvedTheme.colors.surfaceElevated;
    const foreground = explicitDark
      ? "rgb(204, 214, 230)"
      : explicitLight ? "rgb(51, 64, 89)" : this.resolvedTheme.colors.textPrimary;
    const gutterColor = explicitDark
      ? "rgb(120, 130, 145)"
      : explicitLight ? "rgb(140, 150, 165)" : this.resolvedTheme.colors.textMuted;
    const syntax = explicitDark || explicitLight
      ? legacyCodeColors(explicitDark)
      : {
          keyword: this.resolvedTheme.colors.warning,
          string: this.resolvedTheme.colors.positive,
          number: this.resolvedTheme.colors.accentAlt,
          comment: this.resolvedTheme.colors.textMuted,
        };
    const lines = this.source.replace(/\n$/, "").split("\n");
    const gutter = this.numbers
      ? `<div style="color:${gutterColor};text-align:right;padding-right:0.6em;user-select:none">${lines.map((_, index) => index + 1).join("<br>")}</div>`
      : "";
    const code = lines.map((line) => highlightLine(line, this.language, syntax) || "&nbsp;").join("<br>");
    return `<div style="width:100%;height:100%;display:flex;flex-direction:column;background:${background};color:${foreground};border-radius:0.35em;overflow:hidden;font-family:${this.resolvedTheme.typography.monoFamily};line-height:1.35">
      <div style="display:flex;align-items:center;gap:0.4em;background:${titleBar};padding:0.35em 0.7em;font-family:${this.resolvedTheme.typography.bodyFamily}">
        <span style="width:0.55em;height:0.55em;border-radius:50%;background:#ff5f57"></span>
        <span style="width:0.55em;height:0.55em;border-radius:50%;background:#febc2e"></span>
        <span style="width:0.55em;height:0.55em;border-radius:50%;background:#28c840"></span>
        <span style="margin-left:0.4em">${escapeHtml(this.titleText)}</span>
      </div>
      <div style="display:flex;padding:0.55em 0.7em;white-space:pre">${gutter}<div>${code}</div></div>
    </div>`;
  }

  private resize(): void {
    this.worldSize = { width: this.box[0], height: this.box[1] + 0.55 };
  }
}

export function mathml(source: string): string {
  return parseMath(tokenize(source)).markup;
}

interface CodeColors {
  keyword: string;
  string: string;
  number: string;
  comment: string;
}

function legacyCodeColors(dark: boolean): CodeColors {
  return dark
    ? { keyword: "#f0ac5f", string: "#86efac", number: "#f9b775", comment: "#8b95a7" }
    : { keyword: "#1c758a", string: "#2f6b4f", number: "#b45309", comment: "#64748b" };
}

function highlightLine(line: string, language: "rust" | "toml", colors: CodeColors): string {
  const { keyword, string, number, comment } = colors;
  if (language === "toml" && line.trim().startsWith("#")) return `<span style="color:${comment}">${escapeHtml(line)}</span>`;
  if (language === "rust" && line.trim().startsWith("//")) return `<span style="color:${comment}">${escapeHtml(line)}</span>`;
  return line.split(/("[^"]*"|'[^']*'|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b|\/\/.*|#.*)/).map((part) => {
    if (!part) return "";
    if (part.startsWith("//") || part.startsWith("#")) return `<span style="color:${comment}">${escapeHtml(part)}</span>`;
    if (part.startsWith("\"") || part.startsWith("'")) return `<span style="color:${string}">${escapeHtml(part)}</span>`;
    if (/^\d/.test(part)) return `<span style="color:${number}">${escapeHtml(part)}</span>`;
    if (isKeyword(part, language)) return `<span style="color:${keyword}">${escapeHtml(part)}</span>`;
    return escapeHtml(part);
  }).join("");
}

function isKeyword(word: string, language: "rust" | "toml"): boolean {
  const rust = new Set(["fn", "let", "mut", "pub", "return", "if", "else", "struct", "impl", "use"]);
  const toml = new Set(["true", "false"]);
  return (language === "rust" ? rust : toml).has(word);
}

function stripMath(source: string): string {
  return source.trim().replace(/^\$/, "").replace(/\$$/, "");
}

function sourceWidth(source: string): number {
  return Math.max(2, stripMath(source).length * 0.55);
}

interface Token { kind: "command" | "word" | "number" | "symbol" | "group"; value: string }

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  while (index < source.length) {
    const char = source[index] ?? "";
    if (/\s/.test(char) || char === "\\") {
      if (char === "\\") {
        if (source[index + 1] === "," || source[index + 1] === " ") {
          index += 2;
          continue;
        }
        const command = /^\\([A-Za-z]+)/.exec(source.slice(index));
        if (command?.[1]) {
          tokens.push({ kind: "command", value: command[1] });
          index += command[1].length + 1;
          continue;
        }
      }
      index += 1;
      continue;
    }
    if (char === "{") {
      const end = source.indexOf("}", index);
      tokens.push({ kind: "group", value: source.slice(index + 1, end === -1 ? source.length : end) });
      index = end === -1 ? source.length : end + 1;
      continue;
    }
    if (/[0-9.]/.test(char)) {
      const number = /^[0-9.]+/.exec(source.slice(index));
      tokens.push({ kind: "number", value: number?.[0] ?? char });
      index += number?.[0].length ?? 1;
      continue;
    }
    if (/[A-Za-z]/.test(char)) {
      const word = /^[A-Za-z]+/.exec(source.slice(index));
      tokens.push({ kind: "word", value: word?.[0] ?? char });
      index += word?.[0].length ?? 1;
      continue;
    }
    tokens.push({ kind: "symbol", value: char });
    index += 1;
  }
  return tokens;
}

function parseMath(tokens: Token[]): { markup: string; index: number } {
  let markup = "";
  let index = 0;
  while (index < tokens.length) {
    const parsed = parseAtom(tokens, index);
    markup += parsed.markup;
    index = parsed.index;
  }
  return { markup, index };
}

function parseAtom(tokens: Token[], index: number): { markup: string; index: number } {
  const token = tokens[index];
  if (!token) return { markup: "", index };
  let markup = "";
  let next = index + 1;
  if (token.kind === "command" && token.value === "frac") {
    const numerator = tokens[next];
    const denominator = tokens[next + 1];
    markup = `<mfrac>${mathml(numerator?.value ?? "")}${mathml(denominator?.value ?? "")}</mfrac>`;
    next += 2;
  } else if (token.kind === "command" && token.value === "int") {
    markup = "<mo>∫</mo>";
  } else if (token.kind === "group") {
    markup = mathml(token.value);
  } else if (token.kind === "number") {
    markup = `<mn>${escapeHtml(token.value)}</mn>`;
  } else if (token.kind === "word") {
    markup = [...token.value].map((char) => `<mi>${escapeHtml(char)}</mi>`).join("");
  } else if (token.kind === "symbol" && "()".includes(token.value)) {
    markup = `<mo>${escapeHtml(token.value)}</mo>`;
  } else if (token.kind === "symbol") {
    markup = `<mo>${escapeHtml(token.value)}</mo>`;
  }
  const superscript = tokens[next];
  const subscript = tokens[next];
  if (superscript?.kind === "symbol" && superscript.value === "^") {
    const power = parseAtom(tokens, next + 1);
    markup = `<msup>${markup}${power.markup}</msup>`;
    next = power.index;
  }
  if (subscript?.kind === "symbol" && subscript.value === "_" && tokens[next] === subscript) {
    const lower = parseAtom(tokens, next + 1);
    const upper = tokens[lower.index];
    if (upper?.kind === "symbol" && upper.value === "^") {
      const higher = parseAtom(tokens, lower.index + 1);
      markup = `<msubsup>${markup}${lower.markup}${higher.markup}</msubsup>`;
      next = higher.index;
    } else {
      markup = `<msub>${markup}${lower.markup}</msub>`;
      next = lower.index;
    }
  }
  return { markup, index: next };
}

export type MatrixCoordinate = readonly [row: number, column: number];

export interface MatrixCellContext {
  row: number;
  column: number;
  value: string;
}

/** A reusable, composable set of cells belonging to one Matrix. */
export class MatrixSelection {
  readonly coordinates: readonly MatrixCoordinate[];
  private readonly keys: ReadonlySet<string>;

  constructor(
    private readonly owner: object,
    coordinates: readonly MatrixCoordinate[],
  ) {
    const unique = new Map(coordinates.map(([row, column]) => [matrixCellKey(row, column), [row, column] as const]));
    this.coordinates = Object.freeze([...unique.values()]);
    this.keys = new Set(unique.keys());
  }

  includes(row: number, column: number): boolean {
    return this.keys.has(matrixCellKey(row, column));
  }

  union(other: MatrixSelection): MatrixSelection {
    this.requireSameOwner(other);
    return new MatrixSelection(this.owner, [...this.coordinates, ...other.coordinates]);
  }

  intersect(other: MatrixSelection): MatrixSelection {
    this.requireSameOwner(other);
    return new MatrixSelection(this.owner, this.coordinates.filter(([row, column]) => other.includes(row, column)));
  }

  except(other: MatrixSelection): MatrixSelection {
    this.requireSameOwner(other);
    return new MatrixSelection(this.owner, this.coordinates.filter(([row, column]) => !other.includes(row, column)));
  }

  belongsTo(owner: object): boolean {
    return this.owner === owner;
  }

  private requireSameOwner(other: MatrixSelection): void {
    if (!other.belongsTo(this.owner)) throw new Error("Matrix selections from different matrices cannot be combined.");
  }
}

export interface MatrixFocusOptions {
  color?: ColorInput;
  /** Opacity approached by cells outside the selection. Defaults to 0.24. */
  dim?: number;
  /** Selected-cell text scale. Defaults to 1.12. */
  scale?: number;
  /** Selected-cell plate opacity. Defaults to 0.28. */
  fillOpacity?: number;
  /** Selected-cell glow strength in world units. Defaults to 0. */
  glow?: number;
}

export interface MatrixState extends TattvaState {}

interface MatrixFocusStage {
  key: string;
  selection: MatrixSelection | null;
  options: MatrixFocusOptions;
}

interface MatrixCellAppearance {
  color: string;
  opacity: number;
  scale: number;
  plateOpacity: number;
  plateColor: string;
  glow: number;
}

interface MatrixCellLayout extends MatrixCellContext {
  x: number;
  y: number;
  width: number;
}

interface MatrixLayout {
  cells: MatrixCellLayout[];
  width: number;
  height: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  arm: number;
}

/** A semantic matrix with addressable cells and deterministic focus transitions. */
export function Matrix(entries: readonly (readonly string[])[]): MatrixTattva {
  return new MatrixTattva(entries);
}

export class MatrixTattva extends Tattva<MatrixState>
  implements FocusAnimationTarget<MatrixState, MatrixSelection, MatrixFocusOptions> {
  private cellHeightValue = 0.44;
  private ink: ColorInput = { kind: "theme-color", role: "textPrimary" };
  private bracketStyle: "square" | "round" | "none" = "square";
  private readonly focusStages: MatrixFocusStage[] = [];
  readonly rows: number;
  readonly columns: number;

  constructor(readonly entries: readonly (readonly string[])[]) {
    super();
    if (entries.length === 0 || (entries[0]?.length ?? 0) === 0) {
      throw new Error("Matrix requires at least one row and one column.");
    }
    this.columns = entries[0]?.length ?? 0;
    if (entries.some((row) => row.length !== this.columns)) {
      throw new Error("Matrix rows must all contain the same number of entries.");
    }
    this.rows = entries.length;
    this.dynamicGeometry = true;
    this.revealKind = "none";
    this.syncSize();
  }

  cellHeight(value: number): this {
    if (!Number.isFinite(value) || value <= 0) throw new Error("Matrix cell height must be a positive finite number.");
    this.cellHeightValue = value;
    this.syncSize();
    return this;
  }

  color(value: ColorInput): this {
    this.ink = value;
    return this;
  }

  brackets(value: "square" | "round" | "none"): this {
    this.bracketStyle = value;
    this.syncSize();
    return this;
  }

  row(index: number): MatrixSelection {
    this.requireRow(index);
    return this.selectCells(Array.from({ length: this.columns }, (_, column) => [index, column] as const));
  }

  column(index: number): MatrixSelection {
    this.requireColumn(index);
    return this.selectCells(Array.from({ length: this.rows }, (_, row) => [row, index] as const));
  }

  cell(row: number, column: number): MatrixSelection {
    this.requireCell(row, column);
    return this.selectCells([[row, column]]);
  }

  cells(coordinates: readonly MatrixCoordinate[]): MatrixSelection {
    coordinates.forEach(([row, column]) => this.requireCell(row, column));
    return this.selectCells(coordinates);
  }

  diagonal(offset = 0): MatrixSelection {
    this.requireInteger(offset, "Matrix diagonal offset");
    return this.where(({ row, column }) => column - row === offset);
  }

  antiDiagonal(offset = 0): MatrixSelection {
    this.requireInteger(offset, "Matrix anti-diagonal offset");
    return this.where(({ row, column }) => row + column === this.columns - 1 + offset);
  }

  where(predicate: (cell: MatrixCellContext) => boolean): MatrixSelection {
    const coordinates: MatrixCoordinate[] = [];
    this.entries.forEach((row, rowIndex) => row.forEach((value, columnIndex) => {
      if (predicate({ row: rowIndex, column: columnIndex, value })) coordinates.push([rowIndex, columnIndex]);
    }));
    return this.selectCells(coordinates);
  }

  createFocusAnimation(
    selection: MatrixSelection,
    options: MatrixFocusOptions = {},
  ): FocusAnimationSpec<MatrixState> {
    if (!selection.belongsTo(this)) throw new Error("Cannot focus a selection belonging to another Matrix.");
    return this.addFocusStage(selection, validateMatrixFocusOptions(options));
  }

  createClearFocusAnimation(): FocusAnimationSpec<MatrixState> {
    return this.addFocusStage(null, {});
  }

  override contentHTML(_time = 0, state: Readonly<MatrixState> = this.initialState): string {
    const layout = this.layout();
    const baseColor = resolveColorInput(this.ink, this.resolvedTheme);
    const appearances = layout.cells.map<MatrixCellAppearance>(() => neutralMatrixAppearance(baseColor));
    for (const stage of this.focusStages) {
      const progress = Number((state as unknown as Record<string, StateValue>)[stage.key] ?? 0);
      if (progress <= 0) continue;
      const focusColor = resolveColorInput(stage.options.color ?? { kind: "theme-color", role: "accent" }, this.resolvedTheme);
      layout.cells.forEach((cell, index) => {
        const target = stage.selection === null
          ? neutralMatrixAppearance(baseColor)
          : focusedMatrixAppearance(baseColor, focusColor, stage.selection.includes(cell.row, cell.column), stage.options);
        appearances[index] = interpolateMatrixAppearance(appearances[index]!, target, progress);
      });
    }

    const cells = layout.cells.map((cell, index) => {
      const appearance = appearances[index]!;
      const plate = appearance.plateOpacity > 1e-4
        ? `<rect x="${cell.x - cell.width * 0.58}" y="${-(cell.y + this.cellHeightValue * 0.58)}" width="${cell.width * 1.16}" height="${this.cellHeightValue * 1.16}" rx="${this.cellHeightValue * 0.09}" fill="${appearance.plateColor}" fill-opacity="${appearance.plateOpacity}" />`
        : "";
      const glow = appearance.glow > 1e-4
        ? ` style="filter:drop-shadow(0 0 ${appearance.glow * 18}px ${appearance.color})"`
        : "";
      return `<g data-matrix-row="${cell.row}" data-matrix-column="${cell.column}" data-matrix-opacity="${appearance.opacity}" data-matrix-scale="${appearance.scale}" data-matrix-plate-opacity="${appearance.plateOpacity}">${plate}<text x="${cell.x}" y="${-cell.y}" fill="${appearance.color}" fill-opacity="${appearance.opacity}" font-size="${this.cellHeightValue * appearance.scale}" text-anchor="middle" dominant-baseline="middle" font-family="${escapeHtml(this.resolvedTheme.typography.bodyFamily)}"${glow}>${escapeHtml(cell.value)}</text></g>`;
    }).join("");
    const brackets = this.bracketMarkup(layout);
    const viewLeft = layout.left - layout.arm;
    const viewTop = -layout.top - this.cellHeightValue * 0.2;
    return `<svg width="100%" height="100%" viewBox="${viewLeft} ${viewTop} ${layout.width} ${layout.height}" overflow="visible" role="table" aria-label="${this.rows} by ${this.columns} matrix" xmlns="http://www.w3.org/2000/svg">${cells}${brackets}</svg>`;
  }

  private addFocusStage(
    selection: MatrixSelection | null,
    options: MatrixFocusOptions,
  ): FocusAnimationSpec<MatrixState> {
    const key = `matrixFocus${this.focusStages.length}`;
    this.focusStages.push({ key, selection, options });
    return {
      from: { [key]: 0 } as Partial<MatrixState>,
      to: { [key]: 1 } as Partial<MatrixState>,
      hideBeforeStart: true,
    };
  }

  private selectCells(coordinates: readonly MatrixCoordinate[]): MatrixSelection {
    return new MatrixSelection(this, coordinates);
  }

  private syncSize(): void {
    const layout = this.layout();
    this.worldSize = { width: layout.width, height: layout.height };
  }

  private layout(): MatrixLayout {
    const height = this.cellHeightValue;
    const gapX = height * 0.9;
    const gapY = height * 0.45;
    const widths = Array.from({ length: this.columns }, (_, column) => Math.max(
      height * 0.7,
      ...this.entries.map((row) => Math.max(1, row[column]?.length ?? 0) * height * 0.58),
    ));
    const contentWidth = widths.reduce((sum, width) => sum + width, 0) + gapX * Math.max(0, this.columns - 1);
    const contentHeight = this.rows * height + gapY * Math.max(0, this.rows - 1);
    let cursor = -contentWidth / 2;
    const centers = widths.map((width) => {
      const center = cursor + width / 2;
      cursor += width + gapX;
      return center;
    });
    const cells = this.entries.flatMap((row, rowIndex) => row.map((value, columnIndex) => ({
      row: rowIndex,
      column: columnIndex,
      value,
      x: centers[columnIndex] ?? 0,
      y: contentHeight / 2 - height / 2 - rowIndex * (height + gapY),
      width: widths[columnIndex] ?? height,
    })));
    const bracketPad = this.bracketStyle === "none" ? 0 : height * 0.7;
    const arm = this.bracketStyle === "none" ? 0 : height * 0.28;
    const left = -contentWidth / 2 - bracketPad;
    const right = contentWidth / 2 + bracketPad;
    const top = contentHeight / 2 + height * 0.35;
    const bottom = -contentHeight / 2 - height * 0.35;
    return {
      cells,
      left,
      right,
      top,
      bottom,
      arm,
      width: right - left + arm * 2,
      height: top - bottom + height * 0.4,
    };
  }

  private bracketMarkup(layout: MatrixLayout): string {
    if (this.bracketStyle === "none") return "";
    const stroke = this.resolvedTheme.colors.stroke;
    if (this.bracketStyle === "round") {
      const curve = this.cellHeightValue * 0.32;
      return [layout.left, layout.right].map((x, index) => {
        const sign = index === 0 ? 1 : -1;
        return `<path d="M ${x + curve * sign} ${-layout.bottom} Q ${x} ${-layout.bottom} ${x} ${-(layout.bottom + curve)} L ${x} ${-(layout.top - curve)} Q ${x} ${-layout.top} ${x + curve * sign} ${-layout.top}" fill="none" stroke="${stroke}" stroke-width="0.03" />`;
      }).join("");
    }
    return [layout.left, layout.right].map((x, index) => {
      const sign = index === 0 ? 1 : -1;
      return `<path d="M ${x} ${-layout.bottom} L ${x} ${-layout.top} M ${x} ${-layout.top} L ${x + layout.arm * sign} ${-layout.top} M ${x} ${-layout.bottom} L ${x + layout.arm * sign} ${-layout.bottom}" fill="none" stroke="${stroke}" stroke-width="0.03" />`;
    }).join("");
  }

  private requireRow(row: number): void {
    this.requireInteger(row, "Matrix row");
    if (row < 0 || row >= this.rows) throw new RangeError(`Matrix row must be between 0 and ${this.rows - 1}; received ${row}.`);
  }

  private requireColumn(column: number): void {
    this.requireInteger(column, "Matrix column");
    if (column < 0 || column >= this.columns) throw new RangeError(`Matrix column must be between 0 and ${this.columns - 1}; received ${column}.`);
  }

  private requireCell(row: number, column: number): void {
    this.requireRow(row);
    this.requireColumn(column);
  }

  private requireInteger(value: number, label: string): void {
    if (!Number.isInteger(value)) throw new TypeError(`${label} must be an integer; received ${value}.`);
  }
}

function matrixCellKey(row: number, column: number): string {
  return `${row}:${column}`;
}

function validateMatrixFocusOptions(options: MatrixFocusOptions): MatrixFocusOptions {
  const dim = options.dim ?? 0.24;
  const scale = options.scale ?? 1.12;
  const fillOpacity = options.fillOpacity ?? 0.28;
  const glow = options.glow ?? 0;
  if (!Number.isFinite(dim) || dim < 0 || dim > 1) throw new RangeError("Matrix focus dim must be between 0 and 1.");
  if (!Number.isFinite(scale) || scale <= 0) throw new RangeError("Matrix focus scale must be positive and finite.");
  if (!Number.isFinite(fillOpacity) || fillOpacity < 0 || fillOpacity > 1) throw new RangeError("Matrix focus fill opacity must be between 0 and 1.");
  if (!Number.isFinite(glow) || glow < 0) throw new RangeError("Matrix focus glow must be non-negative and finite.");
  return { ...options, dim, scale, fillOpacity, glow };
}

function neutralMatrixAppearance(color: string): MatrixCellAppearance {
  return { color, opacity: 1, scale: 1, plateOpacity: 0, plateColor: color, glow: 0 };
}

function focusedMatrixAppearance(
  baseColor: string,
  focusColor: string,
  selected: boolean,
  options: MatrixFocusOptions,
): MatrixCellAppearance {
  if (!selected) return { ...neutralMatrixAppearance(baseColor), opacity: options.dim ?? 0.24 };
  return {
    color: focusColor,
    opacity: 1,
    scale: options.scale ?? 1.12,
    plateOpacity: options.fillOpacity ?? 0.28,
    plateColor: focusColor,
    glow: options.glow ?? 0,
  };
}

function interpolateMatrixAppearance(
  from: MatrixCellAppearance,
  to: MatrixCellAppearance,
  progress: number,
): MatrixCellAppearance {
  return {
    color: interpolateValue(from.color, to.color, progress),
    opacity: interpolateValue(from.opacity, to.opacity, progress),
    scale: interpolateValue(from.scale, to.scale, progress),
    plateOpacity: interpolateValue(from.plateOpacity, to.plateOpacity, progress),
    plateColor: interpolateValue(from.plateColor, to.plateColor, progress),
    glow: interpolateValue(from.glow, to.glow, progress),
  };
}

export interface MatrixFocus {
  cells: readonly (readonly [number, number])[];
  color: string;
  /** 0 hides the focus, 1 shows it fully. Other cells fade toward `dim`. */
  amount: number;
  dim: number;
}

/** @deprecated Prefer the semantic `Matrix()` Tattva and timeline `focus()` transitions. */
export function matrixMarkup(
  entries: readonly (readonly string[])[],
  cellHeight: number,
  focus: MatrixFocus | null = null,
): string {
  const rows = entries.length;
  const columns = entries[0]?.length ?? 0;
  const width = Math.max(...entries.flat().map((entry) => entry.length)) * cellHeight * 0.62;
  const gapX = cellHeight * 0.9;
  const gapY = cellHeight * 0.45;
  const totalWidth = columns * width + Math.max(0, columns - 1) * gapX;
  const totalHeight = rows * cellHeight + Math.max(0, rows - 1) * gapY;
  const cells = entries.flatMap((row, rowIndex) => row.map((entry, columnIndex) => {
    const x = -totalWidth / 2 + columnIndex * (width + gapX) + width / 2;
    const y = totalHeight / 2 - rowIndex * (cellHeight + gapY) - cellHeight / 2;
    const selected = focus?.cells.some(([row, column]) => row === rowIndex && column === columnIndex) ?? false;
    const amount = focus?.amount ?? 0;
    const opacity = focus ? (selected ? 1 : 1 + (focus.dim - 1) * amount) : 1;
    const scale = selected ? 1 + 0.12 * amount : 1;
    const plate = selected
      ? `<rect x="${x - width * 0.55}" y="${-(y + cellHeight * 0.55)}" width="${width * 1.1}" height="${cellHeight * 1.1}" fill="${withAlpha(focus?.color ?? "#ffffff", 0.35 * amount)}" />`
      : "";
    return `${plate}<text x="${x}" y="${-y}" fill="${selected ? focus?.color ?? "#ffffff" : "#ffffff"}" fill-opacity="${opacity}" font-size="${cellHeight * scale}" text-anchor="middle" dominant-baseline="middle" font-family="Inter, ui-sans-serif, system-ui, sans-serif">${escapeHtml(entry)}</text>`;
  })).join("");
  const pad = cellHeight * 0.7;
  const left = -totalWidth / 2 - pad;
  const right = totalWidth / 2 + pad;
  const top = totalHeight / 2 + cellHeight * 0.35;
  const bottom = -totalHeight / 2 - cellHeight * 0.35;
  const arm = cellHeight * 0.28;
  const brackets = [left, right].map((x, index) => {
    const sign = index === 0 ? 1 : -1;
    return `<path d="M ${x} ${-bottom} L ${x} ${-top} M ${x} ${-top} L ${x + arm * sign} ${-top} M ${x} ${-bottom} L ${x + arm * sign} ${-bottom}" fill="none" stroke="rgb(224, 230, 240)" stroke-width="0.03" />`;
  }).join("");
  return `<svg width="100%" height="100%" viewBox="${left - arm} ${-top - cellHeight * 0.2} ${(right - left) + arm * 2} ${top - bottom + cellHeight * 0.4}" overflow="visible" xmlns="http://www.w3.org/2000/svg">${cells}${brackets}</svg>`;
}

function withAlpha(color: string, alpha: number): string {
  const hex = /^#([0-9a-f]{6})$/i.exec(color);
  if (!hex?.[1]) return color;
  const value = hex[1];
  return `rgba(${Number.parseInt(value.slice(0, 2), 16)}, ${Number.parseInt(value.slice(2, 4), 16)}, ${Number.parseInt(value.slice(4, 6), 16)}, ${alpha})`;
}

function range(length: number, start = 0): number[] {
  return Array.from({ length: Math.max(0, length - start) }, (_, index) => index + start);
}

function segmentProgress(progress: number, index: number, total: number): number {
  if (total <= 0) return 1;
  const start = index / total;
  const end = (index + 1) / total;
  return Math.max(0, Math.min(1, (progress - start) / (end - start)));
}

function staggered(progress: number, index: number, total: number, windowFactor: number): number {
  if (total <= 0) return 1;
  const step = 1 / (Math.max(0, total - 1) + windowFactor);
  const start = index * step;
  const end = start + step * windowFactor;
  return Math.max(0, Math.min(1, (progress - start) / (end - start)));
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
