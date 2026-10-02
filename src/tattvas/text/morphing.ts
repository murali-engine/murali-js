import { Tattva, type TattvaState, type Vec2 } from "../../core/Tattva.ts";
import {
  resolveColorInput,
  themeColor,
  type ColorInput,
  type Theme,
} from "../../core/theme.ts";
import type { LatexVectorResource } from "../../render/latex.ts";

export type TextMatchMode = "grapheme" | "word";
export type UnmatchedMorph = "fade" | "scale";

export interface MatchingMorphState extends TattvaState {
  morphProgress: number;
}

interface MorphPart {
  readonly key: string;
  readonly text?: string;
  readonly kind: "text" | "line" | "radical";
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly fontSize: number;
  readonly fitWidth?: boolean;
  /** Structural formula ancestors, from the leaf toward the complete expression. */
  readonly affinities?: readonly string[];
}

interface MorphLayout {
  readonly parts: readonly MorphPart[];
  readonly width: number;
  readonly height: number;
}

interface PartMatch {
  readonly source: MorphPart;
  readonly target: MorphPart;
}

abstract class MatchingMorphTattva extends Tattva<MatchingMorphState> {
  protected layouts: MorphLayout[] = [];
  protected fontHeight = 0.7;
  protected inkInput: ColorInput = themeColor("textPrimary");
  protected ink = "#f8fafc";
  protected unmatchedMode: UnmatchedMorph = "scale";
  protected keyMap: Readonly<Record<string, string>> = {};

  protected constructor(readonly stages: readonly string[]) {
    super({ state: { morphProgress: 0 } });
    if (stages.length < 2) throw new Error(`${this.constructor.name} requires at least two stages.`);
    this.dynamicGeometry = true;
    this.morphStageCount = stages.length;
  }

  height(value: number): this {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`Morph text height must be a positive finite number; received ${value}.`);
    }
    this.fontHeight = value;
    this.worldFontSize = value;
    return this.syncLayouts();
  }

  color(value: ColorInput): this {
    this.inkInput = value;
    this.ink = resolveColorInput(value, this.resolvedTheme);
    this.setInitial({ color: this.ink });
    return this;
  }

  unmatched(value: UnmatchedMorph): this {
    this.unmatchedMode = value;
    return this;
  }

  /** Semantic keys available for automatic or explicit matching at one stage. */
  matchingKeys(stage = 0): string[] {
    if (!Number.isInteger(stage) || stage < 0 || stage >= this.layouts.length) {
      throw new Error(`Matching-key stage must be an integer from 0 to ${this.layouts.length - 1}; received ${stage}.`);
    }
    return [...new Set(this.layouts[stage]!.parts.map((part) => part.key))];
  }

  /** Map a source semantic key to a target key when automatic equality is insufficient. */
  match(mapping: Readonly<Record<string, string>>): this {
    this.keyMap = { ...mapping };
    return this;
  }

  stage(value: number): this {
    if (!Number.isInteger(value) || value < 0 || value >= this.stages.length) {
      throw new Error(`Morph stage must be an integer from 0 to ${this.stages.length - 1}; received ${value}.`);
    }
    return this.setInitial({ morphProgress: value });
  }

  override contentHTML(_time = 0, state: Readonly<MatchingMorphState> = this.initialState): string {
    const maximum = this.layouts.length - 1;
    const progress = Math.max(0, Math.min(maximum, state.morphProgress));
    const leftIndex = Math.min(Math.floor(progress), maximum - 1);
    const amount = progress >= maximum ? 1 : clamp01(progress - leftIndex);
    const source = this.layouts[leftIndex]!;
    const target = this.layouts[leftIndex + 1]!;
    const markup = renderTransition(source, target, amount, this.ink, this.fontFamily(), this.unmatchedMode, this.keyMap);
    const width = this.worldSize?.width ?? 1;
    const height = this.worldSize?.height ?? 1;
    return `<svg data-murali-matching-morph="${this.morphKind()}" width="100%" height="100%" viewBox="${-width / 2} ${-height / 2} ${width} ${height}" overflow="visible" xmlns="http://www.w3.org/2000/svg">${markup}</svg>`;
  }

  protected override onThemeResolved(theme: Theme): void {
    this.ink = resolveColorInput(this.inkInput, theme);
    this.setInitial({ color: this.ink });
  }

  protected syncLayouts(): this {
    this.layouts = this.stages.map((stage) => this.layoutStage(stage));
    this.worldSize = {
      width: Math.max(...this.layouts.map((layout) => layout.width)),
      height: Math.max(...this.layouts.map((layout) => layout.height)),
    };
    return this;
  }

  protected abstract layoutStage(source: string): MorphLayout;
  protected abstract morphKind(): string;
  protected abstract fontFamily(): string;
}

export class TextMorphTattva extends MatchingMorphTattva {
  private mode: TextMatchMode = "grapheme";

  constructor(stages: readonly string[]) {
    super(stages);
    this.syncLayouts();
  }

  matchBy(mode: TextMatchMode): this {
    this.mode = mode;
    return this.syncLayouts();
  }

  protected override layoutStage(source: string): MorphLayout {
    return layoutText(source, this.fontHeight, this.mode);
  }

  protected override morphKind(): string {
    return "text";
  }

  protected override fontFamily(): string {
    return this.resolvedTheme.typography.headingFamily;
  }
}

export class FormulaMorphTattva extends MatchingMorphTattva {
  constructor(stages: readonly string[]) {
    super(stages);
    this.syncLayouts();
  }

  protected override layoutStage(source: string): MorphLayout {
    return layoutFormula(source, this.fontHeight);
  }

  protected override morphKind(): string {
    return "formula";
  }

  protected override fontFamily(): string {
    return "STIX Two Math, Cambria Math, Times New Roman, serif";
  }
}

export function TextMorph(...stages: readonly string[]): TextMorphTattva {
  return new TextMorphTattva(stages);
}

export function FormulaMorph(...stages: readonly string[]): FormulaMorphTattva {
  return new FormulaMorphTattva(stages);
}

interface CubicCurve {
  readonly p0: Vec2;
  readonly c1: Vec2;
  readonly c2: Vec2;
  readonly p3: Vec2;
}

interface CubicContour {
  readonly curves: readonly CubicCurve[];
  readonly closed: boolean;
}

interface LatexGlyph {
  readonly key: string;
  readonly kind: "glyph" | "rule";
  readonly center: Vec2;
  readonly contours: readonly CubicContour[];
}

interface LatexStageLayout {
  readonly glyphs: readonly LatexGlyph[];
  readonly width: number;
  readonly height: number;
}

interface LatexGlyphPair {
  readonly source: LatexGlyph;
  readonly target: LatexGlyph;
  readonly contours: readonly (readonly [CubicContour, CubicContour])[];
}

interface LatexTransition {
  readonly pairs: readonly LatexGlyphPair[];
  readonly sourceOnly: readonly LatexGlyph[];
  readonly targetOnly: readonly LatexGlyph[];
}

const latexResourceGlobal = globalThis as typeof globalThis & {
  __muraliLatexResources?: Map<string, LatexVectorResource>;
};

function latexResourceRegistry(): Map<string, LatexVectorResource> {
  return latexResourceGlobal.__muraliLatexResources ??= new Map<string, LatexVectorResource>();
}

/** Installed by the render bundler before a scene containing LatexMorph is constructed. */
export function installLatexResources(resources: Readonly<Record<string, LatexVectorResource>>): void {
  const registry = latexResourceRegistry();
  Object.entries(resources).forEach(([source, resource]) => registry.set(source, resource));
}

/** Full TeX typesetting backed by latex+dvisvgm and cubic vector-outline interpolation. */
export class LatexMorphTattva extends Tattva<MatchingMorphState> {
  private fontHeight = 1;
  private inkInput: ColorInput = themeColor("textPrimary");
  private ink = "#f8fafc";
  private unmatchedMode: UnmatchedMorph = "scale";
  private morphMismatches = false;
  private layouts: LatexStageLayout[] = [];
  private transitions: LatexTransition[] = [];

  constructor(readonly stages: readonly string[]) {
    super({ state: { morphProgress: 0 } });
    if (stages.length < 2) throw new Error("LatexMorph requires at least two stages.");
    this.dynamicGeometry = true;
    this.morphStageCount = stages.length;
    this.syncLayouts();
  }

  height(value: number): this {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`LaTeX morph height must be a positive finite number; received ${value}.`);
    }
    this.fontHeight = value;
    this.worldFontSize = value;
    return this.syncLayouts();
  }

  color(value: ColorInput): this {
    this.inkInput = value;
    this.ink = resolveColorInput(value, this.resolvedTheme);
    this.setInitial({ color: this.ink });
    return this;
  }

  unmatched(value: UnmatchedMorph): this {
    this.unmatchedMode = value;
    return this;
  }

  /** When disabled, non-identical leftover glyphs cross-fade instead of morphing their outlines. */
  shapeMismatches(enabled = true): this {
    this.morphMismatches = enabled;
    return this.syncTransitions();
  }

  stage(value: number): this {
    if (!Number.isInteger(value) || value < 0 || value >= this.stages.length) {
      throw new Error(`LaTeX morph stage must be an integer from 0 to ${this.stages.length - 1}; received ${value}.`);
    }
    return this.setInitial({ morphProgress: value });
  }

  glyphCount(stage = 0): number {
    this.validateStage(stage);
    return this.layouts[stage]!.glyphs.length;
  }

  override contentHTML(_time = 0, state: Readonly<MatchingMorphState> = this.initialState): string {
    const maximum = this.layouts.length - 1;
    const progress = Math.max(0, Math.min(maximum, state.morphProgress));
    const leftIndex = Math.min(Math.floor(progress), maximum - 1);
    const amount = progress >= maximum ? 1 : clamp01(progress - leftIndex);
    const transition = this.transitions[leftIndex]!;
    const paths = transition.pairs.map((pair) => {
      const center: Vec2 = [
        lerp(pair.source.center[0], pair.target.center[0], amount),
        lerp(pair.source.center[1], pair.target.center[1], amount),
      ];
      return latexPath(interpolateCubicContours(pair.contours, amount), center, this.ink, 1, 1, "matched");
    });
    const departingAmount = clamp01(amount / 0.85);
    const arrivingAmount = clamp01((amount - 0.15) / 0.85);
    for (const glyph of transition.sourceOnly) {
      paths.push(latexPath(
        glyph.contours,
        [glyph.center[0], glyph.center[1] - amount * this.fontHeight * 0.1],
        this.ink,
        1 - departingAmount,
        this.unmatchedMode === "scale" ? 1 - departingAmount * 0.3 : 1,
        "departing",
      ));
    }
    for (const glyph of transition.targetOnly) {
      paths.push(latexPath(
        glyph.contours,
        [glyph.center[0], glyph.center[1] + (1 - amount) * this.fontHeight * 0.1],
        this.ink,
        arrivingAmount,
        this.unmatchedMode === "scale" ? 0.7 + arrivingAmount * 0.3 : 1,
        "arriving",
      ));
    }
    const width = this.worldSize?.width ?? 1;
    const height = this.worldSize?.height ?? 1;
    return `<svg data-murali-matching-morph="latex" width="100%" height="100%" viewBox="${-width / 2} ${-height / 2} ${width} ${height}" overflow="visible" xmlns="http://www.w3.org/2000/svg">${paths.join("")}</svg>`;
  }

  protected override onThemeResolved(theme: Theme): void {
    this.ink = resolveColorInput(this.inkInput, theme);
    this.setInitial({ color: this.ink });
  }

  private syncLayouts(): this {
    this.layouts = this.stages.map((source) => {
      const resource = latexResourceRegistry().get(source);
      if (!resource) {
        throw new Error(
          `No compiled LaTeX vector resource exists for ${JSON.stringify(source)}. Pass literal stages directly to LatexMorph so the render bundler can compile them.`,
        );
      }
      return layoutLatexResource(resource, this.fontHeight);
    });
    this.worldSize = {
      width: Math.max(...this.layouts.map((layout) => layout.width)),
      height: Math.max(...this.layouts.map((layout) => layout.height)),
    };
    return this.syncTransitions();
  }

  private syncTransitions(): this {
    this.transitions = this.layouts.slice(0, -1).map((layout, index) =>
      matchLatexGlyphs(layout.glyphs, this.layouts[index + 1]!.glyphs, this.morphMismatches)
    );
    return this;
  }

  private validateStage(stage: number): void {
    if (!Number.isInteger(stage) || stage < 0 || stage >= this.layouts.length) {
      throw new Error(`LaTeX glyph stage must be an integer from 0 to ${this.layouts.length - 1}; received ${stage}.`);
    }
  }
}

export function LatexMorph(...stages: readonly string[]): LatexMorphTattva {
  return new LatexMorphTattva(stages);
}

/** One fully typeset LaTeX formula backed by native vector glyph outlines. */
export class LatexTattva extends Tattva<TattvaState> {
  private fontHeight = 1;
  private inkInput: ColorInput = themeColor("textPrimary");
  private ink = "#f8fafc";
  private layout: LatexStageLayout;

  constructor(readonly source: string) {
    super();
    this.layout = this.resolveLayout();
    this.syncSize();
  }

  height(value: number): this {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`LaTeX height must be a positive finite number; received ${value}.`);
    }
    this.fontHeight = value;
    this.worldFontSize = value;
    this.layout = this.resolveLayout();
    return this.syncSize();
  }

  color(value: ColorInput): this {
    this.inkInput = value;
    this.ink = resolveColorInput(value, this.resolvedTheme);
    this.setInitial({ color: this.ink });
    return this;
  }

  override contentHTML(): string {
    const paths = this.layout.glyphs.map((glyph) =>
      latexPath(glyph.contours, glyph.center, this.ink, 1, 1, "static")
    ).join("");
    const width = this.worldSize?.width ?? 1;
    const height = this.worldSize?.height ?? 1;
    return `<svg data-murali-latex="true" width="100%" height="100%" viewBox="${-width / 2} ${-height / 2} ${width} ${height}" overflow="visible" xmlns="http://www.w3.org/2000/svg">${paths}</svg>`;
  }

  protected override onThemeResolved(theme: Theme): void {
    this.ink = resolveColorInput(this.inkInput, theme);
    this.setInitial({ color: this.ink });
  }

  private resolveLayout(): LatexStageLayout {
    const resource = latexResourceRegistry().get(this.source);
    if (!resource) {
      throw new Error(
        `No compiled LaTeX vector resource exists for ${JSON.stringify(this.source)}. Pass a literal formula directly to Latex so the render bundler can compile it.`,
      );
    }
    return layoutLatexResource(resource, this.fontHeight);
  }

  private syncSize(): this {
    this.worldSize = { width: this.layout.width, height: this.layout.height };
    return this;
  }
}

export function Latex(source: string): LatexTattva {
  return new LatexTattva(source);
}

/**
 * Samples the actual vector contours of a typeset LaTeX expression in world
 * coordinates. Single-contour glyphs can be passed directly to algorithms such
 * as Fourier epicycles; compound expressions retain their separate contours.
 */
export class FormulaOutlineSampler {
  private outlineHeight = 1;

  constructor(readonly source: string) {}

  height(value: number): this {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`Formula outline height must be a positive finite number; received ${value}.`);
    }
    this.outlineHeight = value;
    return this;
  }

  sampleContours(totalPoints = 760): Vec2[][] {
    if (!Number.isInteger(totalPoints) || totalPoints < 3) {
      throw new Error(`Formula outline sample count must be an integer of at least 3; received ${totalPoints}.`);
    }
    const layout = this.resolveLayout();
    const contours = layout.glyphs.flatMap((glyph) => glyph.contours.map((contour) => ({
      contour,
      center: glyph.center,
      length: contour.curves.reduce((sum, curve) => sum + controlPolygonLength(curve), 0),
    })));
    if (contours.length === 0) throw new Error(`Formula ${JSON.stringify(this.source)} has no vector contours.`);
    if (totalPoints < contours.length * 3) {
      throw new Error(
        `Formula outline requires at least ${contours.length * 3} samples for ${contours.length} contours; received ${totalPoints}.`,
      );
    }
    const counts = distributeSamples(contours.map((entry) => entry.length), totalPoints, 3);
    return contours.map((entry, index) => sampleCubicContour(
      entry.contour,
      entry.center,
      counts[index] ?? 3,
      this.outlineHeight,
    ));
  }

  samplePoints(count = 760): Vec2[] {
    const contours = this.sampleContours(count);
    if (contours.length !== 1) {
      throw new Error(
        `Formula ${JSON.stringify(this.source)} has ${contours.length} contours; use sampleContours() and explicitly choose or route them.`,
      );
    }
    return contours[0]!;
  }

  private resolveLayout(): LatexStageLayout {
    const resource = latexResourceRegistry().get(this.source);
    if (!resource) {
      throw new Error(
        `No compiled LaTeX vector resource exists for ${JSON.stringify(this.source)}. Pass a literal formula directly to FormulaOutline so the render bundler can compile it.`,
      );
    }
    return layoutLatexResource(resource, this.outlineHeight);
  }
}

export function FormulaOutline(source: string): FormulaOutlineSampler {
  return new FormulaOutlineSampler(source);
}

function layoutLatexResource(resource: LatexVectorResource, height: number): LatexStageLayout {
  const [viewX, viewY, viewWidth, viewHeight] = resource.viewBox;
  const scale = height / viewHeight;
  const glyphs = resource.elements.map((element): LatexGlyph => {
    const contours = parseSvgCubicPath(element.path);
    const bounds = cubicBounds(contours);
    const localCenter: Vec2 = [(bounds.minX + bounds.maxX) / 2, (bounds.minY + bounds.maxY) / 2];
    return {
      key: element.key,
      kind: element.kind,
      center: [
        (element.x + localCenter[0] - viewX - viewWidth / 2) * scale,
        (element.y + localCenter[1] - viewY - viewHeight / 2) * scale,
      ],
      contours: contours.map((contour) => ({
        ...contour,
        curves: contour.curves.map((curve) => mapCurve(curve, (point) => [
          (point[0] - localCenter[0]) * scale,
          (point[1] - localCenter[1]) * scale,
        ])),
      })),
    };
  });
  return { glyphs, width: viewWidth * scale, height };
}

function matchLatexGlyphs(
  source: readonly LatexGlyph[],
  target: readonly LatexGlyph[],
  morphMismatches: boolean,
): LatexTransition {
  const sourceAvailable = new Set(source.map((_, index) => index));
  const targetAvailable = new Set(target.map((_, index) => index));
  const pairs: LatexGlyphPair[] = [];
  pairGlyphCandidates(source, target, sourceAvailable, targetAvailable, (left, right) => left.key === right.key, pairs);
  if (morphMismatches) {
    pairGlyphCandidates(source, target, sourceAvailable, targetAvailable, (left, right) => left.kind === right.kind, pairs);
  }
  return {
    pairs,
    sourceOnly: source.filter((_, index) => sourceAvailable.has(index)),
    targetOnly: target.filter((_, index) => targetAvailable.has(index)),
  };
}

function pairGlyphCandidates(
  source: readonly LatexGlyph[],
  target: readonly LatexGlyph[],
  sourceAvailable: Set<number>,
  targetAvailable: Set<number>,
  accepts: (source: LatexGlyph, target: LatexGlyph) => boolean,
  result: LatexGlyphPair[],
): void {
  const candidates: Array<{ sourceIndex: number; targetIndex: number; distance: number }> = [];
  for (const sourceIndex of sourceAvailable) {
    for (const targetIndex of targetAvailable) {
      const left = source[sourceIndex]!;
      const right = target[targetIndex]!;
      if (!accepts(left, right)) continue;
      const dx = left.center[0] - right.center[0];
      const dy = left.center[1] - right.center[1];
      candidates.push({ sourceIndex, targetIndex, distance: dx * dx + dy * dy });
    }
  }
  candidates.sort((left, right) => left.distance - right.distance || left.sourceIndex - right.sourceIndex || left.targetIndex - right.targetIndex);
  for (const candidate of candidates) {
    if (!sourceAvailable.has(candidate.sourceIndex) || !targetAvailable.has(candidate.targetIndex)) continue;
    const left = source[candidate.sourceIndex]!;
    const right = target[candidate.targetIndex]!;
    sourceAvailable.delete(candidate.sourceIndex);
    targetAvailable.delete(candidate.targetIndex);
    result.push({ source: left, target: right, contours: normalizeCubicContours(left.contours, right.contours) });
  }
}

function normalizeCubicContours(
  source: readonly CubicContour[],
  target: readonly CubicContour[],
): Array<readonly [CubicContour, CubicContour]> {
  const left = [...source].sort((a, b) => Math.abs(contourArea(b)) - Math.abs(contourArea(a)));
  const right = [...target].sort((a, b) => Math.abs(contourArea(b)) - Math.abs(contourArea(a)));
  const count = Math.max(left.length, right.length);
  const result: Array<readonly [CubicContour, CubicContour]> = [];
  for (let index = 0; index < count; index += 1) {
    const sourceContour = left[index] ?? degenerateContour(contourCenter(right[index]!));
    const targetContour = right[index] ?? degenerateContour(contourCenter(left[index]!));
    const curveCount = Math.max(sourceContour.curves.length, targetContour.curves.length);
    const denseSource = densifyContour(sourceContour, curveCount);
    const denseTarget = densifyContour(targetContour, curveCount);
    result.push([alignCubicContour(denseSource, denseTarget), denseTarget]);
  }
  return result;
}

function interpolateCubicContours(
  pairs: readonly (readonly [CubicContour, CubicContour])[],
  amount: number,
): CubicContour[] {
  return pairs.map(([source, target]) => ({
    closed: source.closed || target.closed,
    curves: source.curves.map((curve, index) => {
      const right = target.curves[index]!;
      return {
        p0: lerpPoint(curve.p0, right.p0, amount),
        c1: lerpPoint(curve.c1, right.c1, amount),
        c2: lerpPoint(curve.c2, right.c2, amount),
        p3: lerpPoint(curve.p3, right.p3, amount),
      };
    }),
  }));
}

function latexPath(
  contours: readonly CubicContour[],
  center: Vec2,
  color: string,
  opacity: number,
  scale: number,
  role: string,
): string {
  const path = contours.map((contour) => {
    const first = contour.curves[0];
    if (!first) return "";
    const curves = contour.curves.map((curve) =>
      `C${format(curve.c1[0])} ${format(curve.c1[1])} ${format(curve.c2[0])} ${format(curve.c2[1])} ${format(curve.p3[0])} ${format(curve.p3[1])}`
    ).join(" ");
    return `M${format(first.p0[0])} ${format(first.p0[1])} ${curves}${contour.closed ? " Z" : ""}`;
  }).join(" ");
  return `<path data-murali-morph-role="${role}" d="${path}" transform="translate(${format(center[0])} ${format(center[1])}) scale(${format(scale)})" fill="${escapeAttribute(color)}" fill-rule="evenodd" opacity="${format(opacity)}" />`;
}

function parseSvgCubicPath(data: string): CubicContour[] {
  const tokens = data.match(/[A-Za-z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/gu) ?? [];
  const contours: CubicContour[] = [];
  let index = 0;
  let command = "";
  let current: Vec2 = [0, 0];
  let start: Vec2 = [0, 0];
  let curves: CubicCurve[] = [];
  let previousCubicControl: Vec2 | undefined;
  let previousQuadraticControl: Vec2 | undefined;

  const finish = (closed: boolean): void => {
    if (closed && curves.length > 0 && !samePoint(current, start)) curves.push(lineCurve(current, start));
    if (curves.length > 0) contours.push({ curves, closed });
    curves = [];
  };
  const number = (): number => {
    const value = Number(tokens[index++]);
    if (!Number.isFinite(value)) throw new Error(`Invalid SVG path number in ${data}`);
    return value;
  };
  const point = (relative: boolean): Vec2 => {
    const value: Vec2 = [number(), number()];
    return relative ? [current[0] + value[0], current[1] + value[1]] : value;
  };

  while (index < tokens.length) {
    if (/^[A-Za-z]$/u.test(tokens[index]!)) command = tokens[index++]!;
    if (!command) throw new Error(`SVG path data begins without a command: ${data}`);
    const relative = command === command.toLowerCase();
    const upper = command.toUpperCase();
    if (upper === "Z") {
      finish(true);
      current = start;
      previousCubicControl = undefined;
      previousQuadraticControl = undefined;
      command = "";
      continue;
    }
    if (upper === "M") {
      const next = point(relative);
      if (curves.length > 0) finish(false);
      current = next;
      start = next;
      command = relative ? "l" : "L";
      previousCubicControl = undefined;
      previousQuadraticControl = undefined;
      continue;
    }
    const from = current;
    if (upper === "L") {
      current = point(relative);
      curves.push(lineCurve(from, current));
      previousCubicControl = undefined;
      previousQuadraticControl = undefined;
      continue;
    }
    if (upper === "H") {
      const x = number();
      current = [relative ? current[0] + x : x, current[1]];
      curves.push(lineCurve(from, current));
      previousCubicControl = undefined;
      previousQuadraticControl = undefined;
      continue;
    }
    if (upper === "V") {
      const y = number();
      current = [current[0], relative ? current[1] + y : y];
      curves.push(lineCurve(from, current));
      previousCubicControl = undefined;
      previousQuadraticControl = undefined;
      continue;
    }
    if (upper === "C") {
      const c1 = point(relative);
      const c2 = point(relative);
      current = point(relative);
      curves.push({ p0: from, c1, c2, p3: current });
      previousCubicControl = c2;
      previousQuadraticControl = undefined;
      continue;
    }
    if (upper === "S") {
      const c1 = previousCubicControl ? reflect(previousCubicControl, from) : from;
      const c2 = point(relative);
      current = point(relative);
      curves.push({ p0: from, c1, c2, p3: current });
      previousCubicControl = c2;
      previousQuadraticControl = undefined;
      continue;
    }
    if (upper === "Q") {
      const control = point(relative);
      current = point(relative);
      curves.push(quadraticCurve(from, control, current));
      previousQuadraticControl = control;
      previousCubicControl = undefined;
      continue;
    }
    if (upper === "T") {
      const control = previousQuadraticControl ? reflect(previousQuadraticControl, from) : from;
      current = point(relative);
      curves.push(quadraticCurve(from, control, current));
      previousQuadraticControl = control;
      previousCubicControl = undefined;
      continue;
    }
    throw new Error(`Unsupported SVG path command ${command} in LaTeX glyph outline.`);
  }
  if (curves.length > 0) finish(false);
  return contours;
}

function lineCurve(start: Vec2, end: Vec2): CubicCurve {
  return {
    p0: start,
    c1: lerpPoint(start, end, 1 / 3),
    c2: lerpPoint(start, end, 2 / 3),
    p3: end,
  };
}

function quadraticCurve(start: Vec2, control: Vec2, end: Vec2): CubicCurve {
  return {
    p0: start,
    c1: [start[0] + (control[0] - start[0]) * 2 / 3, start[1] + (control[1] - start[1]) * 2 / 3],
    c2: [end[0] + (control[0] - end[0]) * 2 / 3, end[1] + (control[1] - end[1]) * 2 / 3],
    p3: end,
  };
}

function densifyContour(contour: CubicContour, count: number): CubicContour {
  const curves = [...contour.curves];
  if (curves.length === 0) return degenerateContour([0, 0], count);
  while (curves.length < count) {
    let splitIndex = 0;
    let longest = -1;
    curves.forEach((curve, index) => {
      const length = controlPolygonLength(curve);
      if (length > longest) {
        longest = length;
        splitIndex = index;
      }
    });
    const [left, right] = splitCubic(curves[splitIndex]!);
    curves.splice(splitIndex, 1, left, right);
  }
  return { curves, closed: contour.closed };
}

function splitCubic(curve: CubicCurve): readonly [CubicCurve, CubicCurve] {
  const a = lerpPoint(curve.p0, curve.c1, 0.5);
  const b = lerpPoint(curve.c1, curve.c2, 0.5);
  const c = lerpPoint(curve.c2, curve.p3, 0.5);
  const d = lerpPoint(a, b, 0.5);
  const e = lerpPoint(b, c, 0.5);
  const middle = lerpPoint(d, e, 0.5);
  return [
    { p0: curve.p0, c1: a, c2: d, p3: middle },
    { p0: middle, c1: e, c2: c, p3: curve.p3 },
  ];
}

function alignCubicContour(source: CubicContour, target: CubicContour): CubicContour {
  if (!source.closed || !target.closed || source.curves.length !== target.curves.length) return source;
  const forward = bestCubicShift(source.curves, target.curves);
  const reversed = bestCubicShift(reverseCurves(source.curves), target.curves);
  return { curves: reversed.score < forward.score ? reversed.curves : forward.curves, closed: source.closed };
}

function bestCubicShift(
  source: readonly CubicCurve[],
  target: readonly CubicCurve[],
): { curves: CubicCurve[]; score: number } {
  let bestShift = 0;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let shift = 0; shift < source.length; shift += 1) {
    let score = 0;
    for (let index = 0; index < source.length; index += 1) {
      const left = source[(index + shift) % source.length]!.p0;
      const right = target[index]!.p0;
      score += squaredDistance(left, right);
    }
    if (score < bestScore) {
      bestScore = score;
      bestShift = shift;
    }
  }
  return {
    curves: Array.from({ length: source.length }, (_, index) => source[(index + bestShift) % source.length]!),
    score: bestScore,
  };
}

function reverseCurves(curves: readonly CubicCurve[]): CubicCurve[] {
  return [...curves].reverse().map((curve) => ({ p0: curve.p3, c1: curve.c2, c2: curve.c1, p3: curve.p0 }));
}

function degenerateContour(center: Vec2, count = 1): CubicContour {
  return {
    closed: true,
    curves: Array.from({ length: Math.max(1, count) }, () => ({ p0: center, c1: center, c2: center, p3: center })),
  };
}

function contourCenter(contour: CubicContour): Vec2 {
  const points = contour.curves.map((curve) => curve.p0);
  if (points.length === 0) return [0, 0];
  return [
    points.reduce((sum, point) => sum + point[0], 0) / points.length,
    points.reduce((sum, point) => sum + point[1], 0) / points.length,
  ];
}

function contourArea(contour: CubicContour): number {
  const points = contour.curves.map((curve) => curve.p0);
  return points.reduce((area, point, index) => {
    const next = points[(index + 1) % points.length] ?? point;
    return area + point[0] * next[1] - next[0] * point[1];
  }, 0) / 2;
}

function cubicBounds(contours: readonly CubicContour[]): { minX: number; minY: number; maxX: number; maxY: number } {
  const points = contours.flatMap((contour) => contour.curves.flatMap((curve) => [curve.p0, curve.c1, curve.c2, curve.p3]));
  if (points.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  return {
    minX: Math.min(...points.map((point) => point[0])),
    minY: Math.min(...points.map((point) => point[1])),
    maxX: Math.max(...points.map((point) => point[0])),
    maxY: Math.max(...points.map((point) => point[1])),
  };
}

function mapCurve(curve: CubicCurve, transform: (point: Vec2) => Vec2): CubicCurve {
  return { p0: transform(curve.p0), c1: transform(curve.c1), c2: transform(curve.c2), p3: transform(curve.p3) };
}

function controlPolygonLength(curve: CubicCurve): number {
  return Math.sqrt(squaredDistance(curve.p0, curve.c1))
    + Math.sqrt(squaredDistance(curve.c1, curve.c2))
    + Math.sqrt(squaredDistance(curve.c2, curve.p3));
}

function distributeSamples(lengths: readonly number[], total: number, minimum: number): number[] {
  const counts = lengths.map(() => minimum);
  let remaining = total - counts.length * minimum;
  if (remaining <= 0) return counts;
  const lengthTotal = lengths.reduce((sum, length) => sum + Math.max(0, length), 0);
  const shares = lengths.map((length) => remaining * (
    lengthTotal > 1e-12 ? Math.max(0, length) / lengthTotal : 1 / lengths.length
  ));
  shares.forEach((share, index) => {
    const whole = Math.floor(share);
    counts[index] = (counts[index] ?? minimum) + whole;
    remaining -= whole;
  });
  const order = shares
    .map((share, index) => ({ index, fraction: share - Math.floor(share) }))
    .sort((left, right) => right.fraction - left.fraction || left.index - right.index);
  for (let index = 0; index < remaining; index += 1) {
    const target = order[index % order.length]?.index ?? 0;
    counts[target] = (counts[target] ?? minimum) + 1;
  }
  return counts;
}

function sampleCubicContour(
  contour: CubicContour,
  center: Vec2,
  count: number,
  height: number,
): Vec2[] {
  const dense: Vec2[] = [];
  const tolerance = Math.max(1e-5, height / 100);
  contour.curves.forEach((curve, curveIndex) => {
    if (curveIndex === 0) dense.push(toWorldPoint(curve.p0, center));
    const steps = Math.max(4, Math.min(64, Math.ceil(controlPolygonLength(curve) / tolerance)));
    for (let step = 1; step <= steps; step += 1) {
      dense.push(toWorldPoint(cubicPoint(curve, step / steps), center));
    }
  });
  return resampleOutline(dense, count, contour.closed);
}

function cubicPoint(curve: CubicCurve, t: number): Vec2 {
  const u = 1 - t;
  const u2 = u * u;
  const t2 = t * t;
  return [
    curve.p0[0] * u2 * u + curve.c1[0] * 3 * u2 * t + curve.c2[0] * 3 * u * t2 + curve.p3[0] * t2 * t,
    curve.p0[1] * u2 * u + curve.c1[1] * 3 * u2 * t + curve.c2[1] * 3 * u * t2 + curve.p3[1] * t2 * t,
  ];
}

function toWorldPoint(point: Vec2, center: Vec2): Vec2 {
  return [center[0] + point[0], -(center[1] + point[1])];
}

function resampleOutline(points: readonly Vec2[], count: number, closed: boolean): Vec2[] {
  if (points.length === 0) return Array.from({ length: count }, () => [0, 0] as Vec2);
  const source = [...points];
  if (closed && !samePoint(source[0]!, source[source.length - 1]!)) source.push(source[0]!);
  const lengths = [0];
  for (let index = 1; index < source.length; index += 1) {
    const previous = source[index - 1]!;
    const point = source[index]!;
    lengths.push((lengths[index - 1] ?? 0) + Math.hypot(point[0] - previous[0], point[1] - previous[1]));
  }
  const total = lengths[lengths.length - 1] ?? 0;
  if (total <= 1e-12) return Array.from({ length: count }, () => [...source[0]!] as Vec2);
  return Array.from({ length: count }, (_, sampleIndex) => {
    const divisor = closed ? count : Math.max(1, count - 1);
    const target = total * sampleIndex / divisor;
    let upper = 1;
    while (upper < lengths.length - 1 && (lengths[upper] ?? total) < target) upper += 1;
    const lower = upper - 1;
    const span = Math.max(1e-12, (lengths[upper] ?? total) - (lengths[lower] ?? 0));
    const amount = (target - (lengths[lower] ?? 0)) / span;
    return lerpPoint(source[lower]!, source[upper]!, amount);
  });
}

function reflect(point: Vec2, around: Vec2): Vec2 {
  return [around[0] * 2 - point[0], around[1] * 2 - point[1]];
}

function samePoint(left: Vec2, right: Vec2): boolean {
  return squaredDistance(left, right) <= 1e-16;
}

function squaredDistance(left: Vec2, right: Vec2): number {
  const dx = left[0] - right[0];
  const dy = left[1] - right[1];
  return dx * dx + dy * dy;
}

function lerpPoint(left: Vec2, right: Vec2, amount: number): Vec2 {
  return [lerp(left[0], right[0], amount), lerp(left[1], right[1], amount)];
}

function layoutText(source: string, height: number, mode: TextMatchMode): MorphLayout {
  const segments = segmentText(source, mode);
  const advances = segments.map((segment) => textAdvance(segment.text, height));
  const width = Math.max(height * 0.3, advances.reduce((sum, value) => sum + value, 0));
  let cursor = -width / 2;
  const parts: MorphPart[] = [];
  for (const [index, segment] of segments.entries()) {
    const advance = advances[index]!;
    if (!segment.space) {
      parts.push({
        key: `${mode}:${segment.text}`,
        text: segment.text,
        kind: "text",
        x: cursor + advance / 2,
        y: 0,
        width: advance,
        height,
        fontSize: height,
      });
    }
    cursor += advance;
  }
  return { parts, width, height: height * 1.25 };
}

function segmentText(source: string, mode: TextMatchMode): Array<{ text: string; space: boolean }> {
  const segmenter = new Intl.Segmenter(undefined, { granularity: mode === "word" ? "word" : "grapheme" });
  return [...segmenter.segment(source)].map(({ segment }) => ({ text: segment, space: /^\s+$/u.test(segment) }));
}

function textAdvance(text: string, height: number): number {
  if (/^\s+$/u.test(text)) return height * 0.34 * [...text].length;
  const units = [...text].reduce((sum, character) => {
    if (/[ilI1.,'|]/u.test(character)) return sum + 0.32;
    if (/[MW@%]/u.test(character)) return sum + 0.9;
    return sum + 0.6;
  }, 0);
  return Math.max(height * 0.28, units * height);
}

function renderTransition(
  source: MorphLayout,
  target: MorphLayout,
  amount: number,
  color: string,
  fontFamily: string,
  unmatched: UnmatchedMorph,
  keyMap: Readonly<Record<string, string>>,
): string {
  const { matches, sourceOnly, targetOnly } = matchParts(source.parts, target.parts, keyMap);
  const matched = matches.flatMap(({ source: left, target: right }) => {
    const part = interpolatePart(left, right, amount);
    if (left.kind === right.kind && left.text === right.text) {
      return [renderPart(part, color, fontFamily, 1, 1, "matched")];
    }
    return [
      renderPart({ ...part, text: left.text, kind: left.kind }, color, fontFamily, 1 - amount, 1, "mapped-source"),
      renderPart({ ...part, text: right.text, kind: right.kind }, color, fontFamily, amount, 1, "mapped-target"),
    ];
  });
  const departingAmount = clamp01(amount / 0.85);
  const arrivingAmount = clamp01((amount - 0.15) / 0.85);
  const departing = sourceOnly.map((part) => renderPart(
    { ...part, y: part.y + amount * part.fontSize * 0.14 },
    color,
    fontFamily,
    1 - departingAmount,
    unmatched === "scale" ? 1 - departingAmount * 0.35 : 1,
    "departing",
  ));
  const arriving = targetOnly.map((part) => renderPart(
    { ...part, y: part.y - (1 - amount) * part.fontSize * 0.14 },
    color,
    fontFamily,
    arrivingAmount,
    unmatched === "scale" ? 0.65 + arrivingAmount * 0.35 : 1,
    "arriving",
  ));
  return [...matched, ...departing, ...arriving].join("");
}

function matchParts(
  source: readonly MorphPart[],
  target: readonly MorphPart[],
  keyMap: Readonly<Record<string, string>>,
): { matches: PartMatch[]; sourceOnly: MorphPart[]; targetOnly: MorphPart[] } {
  const candidates: Array<{ sourceIndex: number; targetIndex: number; affinity: number; distance: number }> = [];
  source.forEach((left, sourceIndex) => {
    const desired = keyMap[left.key] ?? left.key;
    target.forEach((right, targetIndex) => {
      if (desired !== right.key) return;
      const dx = left.x - right.x;
      const dy = left.y - right.y;
      const affinity = left.affinities?.filter((value) => right.affinities?.includes(value)).length ?? 0;
      candidates.push({ sourceIndex, targetIndex, affinity, distance: dx * dx + dy * dy });
    });
  });
  candidates.sort((a, b) => b.affinity - a.affinity || a.distance - b.distance || a.sourceIndex - b.sourceIndex || a.targetIndex - b.targetIndex);
  const usedSource = new Set<number>();
  const usedTarget = new Set<number>();
  const matches: PartMatch[] = [];
  for (const candidate of candidates) {
    if (usedSource.has(candidate.sourceIndex) || usedTarget.has(candidate.targetIndex)) continue;
    usedSource.add(candidate.sourceIndex);
    usedTarget.add(candidate.targetIndex);
    matches.push({ source: source[candidate.sourceIndex]!, target: target[candidate.targetIndex]! });
  }
  return {
    matches,
    sourceOnly: source.filter((_, index) => !usedSource.has(index)),
    targetOnly: target.filter((_, index) => !usedTarget.has(index)),
  };
}

function interpolatePart(left: MorphPart, right: MorphPart, amount: number): MorphPart {
  return {
    key: right.key,
    text: right.text,
    kind: right.kind,
    x: lerp(left.x, right.x, amount),
    y: lerp(left.y, right.y, amount),
    width: lerp(left.width, right.width, amount),
    height: lerp(left.height, right.height, amount),
    fontSize: lerp(left.fontSize, right.fontSize, amount),
    fitWidth: right.fitWidth,
  };
}

function renderPart(
  part: MorphPart,
  color: string,
  fontFamily: string,
  opacity: number,
  scale: number,
  role: string,
): string {
  const transform = `translate(${format(part.x)} ${format(-part.y)}) scale(${format(scale)})`;
  if (part.kind === "line") {
    return `<line data-murali-morph-role="${role}" x1="${format(-part.width / 2)}" y1="0" x2="${format(part.width / 2)}" y2="0" transform="${transform}" stroke="${escapeAttribute(color)}" stroke-width="${format(Math.max(0.018, part.height))}" stroke-linecap="round" opacity="${format(opacity)}" />`;
  }
  if (part.kind === "radical") {
    const width = part.width;
    const height = part.height;
    const path = [
      `M ${format(-width / 2)} ${format(height * 0.04)}`,
      `L ${format(-width * 0.3)} ${format(height * 0.04)}`,
      `L ${format(-width * 0.06)} ${format(height * 0.38)}`,
      `L ${format(width * 0.16)} ${format(-height * 0.48)}`,
      `L ${format(width / 2)} ${format(-height * 0.48)}`,
    ].join(" ");
    return `<path data-murali-morph-role="${role}" d="${path}" transform="${transform}" fill="none" stroke="${escapeAttribute(color)}" stroke-width="${format(Math.max(0.025, part.fontSize * 0.07))}" stroke-linecap="round" stroke-linejoin="round" opacity="${format(opacity)}" />`;
  }
  const widthFit = part.fitWidth ? ` textLength="${format(part.width)}" lengthAdjust="spacingAndGlyphs"` : "";
  return `<text data-murali-morph-role="${role}" x="0" y="0" transform="${transform}" fill="${escapeAttribute(color)}" opacity="${format(opacity)}" font-size="${format(part.fontSize)}" font-family="${escapeAttribute(fontFamily)}" text-anchor="middle" dominant-baseline="central"${widthFit}>${escapeHtml(part.text ?? "")}</text>`;
}

type FormulaNode =
  | { kind: "row"; children: FormulaNode[] }
  | { kind: "symbol"; value: string; role?: string }
  | { kind: "scripts"; base: FormulaNode; superscript?: FormulaNode; subscript?: FormulaNode }
  | { kind: "fraction"; numerator: FormulaNode; denominator: FormulaNode }
  | { kind: "sqrt"; body: FormulaNode };

interface FormulaBox {
  readonly parts: readonly MorphPart[];
  readonly width: number;
  readonly ascent: number;
  readonly descent: number;
}

function layoutFormula(source: string, height: number): MorphLayout {
  const parser = new FormulaParser(stripFormulaDelimiters(source));
  const box = layoutFormulaNode(parser.parse(), height);
  const centerY = (box.ascent - box.descent) / 2;
  const parts = box.parts.map((part) => ({ ...part, x: part.x - box.width / 2, y: part.y - centerY }));
  return { parts, width: Math.max(height * 0.4, box.width), height: Math.max(height, box.ascent + box.descent) };
}

class FormulaParser {
  private index = 0;

  constructor(private readonly source: string) {}

  parse(stop = ""): FormulaNode {
    const children: FormulaNode[] = [];
    while (this.index < this.source.length && this.source[this.index] !== stop) {
      if (/\s/u.test(this.source[this.index] ?? "")) {
        this.index += 1;
        continue;
      }
      let node = this.parseBase();
      let superscript: FormulaNode | undefined;
      let subscript: FormulaNode | undefined;
      while (this.source[this.index] === "^" || this.source[this.index] === "_") {
        const marker = this.source[this.index++];
        const script = this.parseArgument();
        if (marker === "^") superscript = script;
        else subscript = script;
      }
      if (superscript || subscript) node = { kind: "scripts", base: node, superscript, subscript };
      children.push(node);
    }
    if (stop && this.source[this.index] === stop) this.index += 1;
    return children.length === 1 ? children[0]! : { kind: "row", children };
  }

  private parseBase(): FormulaNode {
    const char = this.source[this.index] ?? "";
    if (char === "{") {
      this.index += 1;
      return this.parse("}");
    }
    if (char === "\\") return this.parseCommand();
    this.index += 1;
    return { kind: "symbol", value: normalizeFormulaCharacter(char) };
  }

  private parseArgument(): FormulaNode {
    while (/\s/u.test(this.source[this.index] ?? "")) this.index += 1;
    return this.parseBase();
  }

  private parseCommand(): FormulaNode {
    this.index += 1;
    const match = /^[A-Za-z]+/u.exec(this.source.slice(this.index));
    const command = match?.[0] ?? this.source[this.index] ?? "";
    this.index += match?.[0].length ?? 1;
    if (command === "frac") {
      return { kind: "fraction", numerator: this.parseArgument(), denominator: this.parseArgument() };
    }
    if (command === "sqrt") return { kind: "sqrt", body: this.parseArgument() };
    if (command === "left" || command === "right") return this.parseBase();
    if (command === "," || command === "quad" || command === "qquad") return { kind: "symbol", value: " " };
    return { kind: "symbol", value: commandSymbol(command), role: `command:${command}` };
  }
}

function layoutFormulaNode(node: FormulaNode, size: number): FormulaBox {
  if (node.kind === "symbol") {
    if (node.value === " ") return { parts: [], width: size * 0.3, ascent: size * 0.55, descent: size * 0.25 };
    const width = formulaAdvance(node.value, size);
    return {
      parts: [{
        key: node.role ?? `symbol:${node.value}`,
        text: node.value,
        kind: "text",
        x: width / 2,
        y: 0,
        width,
        height: size,
        fontSize: size,
        fitWidth: true,
        affinities: [formulaFingerprint(node)],
      }],
      width,
      ascent: size * 0.65,
      descent: size * 0.35,
    };
  }
  if (node.kind === "row") {
    const boxes = node.children.map((child) => layoutFormulaNode(child, size));
    let cursor = 0;
    const parts: MorphPart[] = [];
    boxes.forEach((box, index) => {
      parts.push(...shiftParts(box.parts, cursor, 0));
      cursor += box.width + (index < boxes.length - 1
        ? formulaGap(node.children[index]!, node.children[index + 1]!, size)
        : 0);
    });
    return {
      parts: withAffinity(parts, formulaFingerprint(node)),
      width: cursor,
      ascent: Math.max(size * 0.65, ...boxes.map((box) => box.ascent)),
      descent: Math.max(size * 0.35, ...boxes.map((box) => box.descent)),
    };
  }
  if (node.kind === "scripts") {
    const base = layoutFormulaNode(node.base, size);
    const superscript = node.superscript ? layoutFormulaNode(node.superscript, size * 0.62) : undefined;
    const subscript = node.subscript ? layoutFormulaNode(node.subscript, size * 0.62) : undefined;
    const scriptWidth = Math.max(superscript?.width ?? 0, subscript?.width ?? 0);
    const scriptX = base.width + scriptWidth / 2;
    const supY = base.ascent * 0.78 + (superscript?.descent ?? 0);
    const subY = -(base.descent * 0.72 + (subscript?.ascent ?? 0));
    return {
      parts: withAffinity([
        ...base.parts,
        ...shiftParts(superscript?.parts ?? [], base.width, supY),
        ...shiftParts(subscript?.parts ?? [], base.width, subY),
      ], formulaFingerprint(node)),
      width: base.width + scriptWidth,
      ascent: Math.max(base.ascent, supY + (superscript?.ascent ?? 0)),
      descent: Math.max(base.descent, -subY + (subscript?.descent ?? 0)),
    };
  }
  if (node.kind === "fraction") {
    const numerator = layoutFormulaNode(node.numerator, size * 0.78);
    const denominator = layoutFormulaNode(node.denominator, size * 0.78);
    const width = Math.max(numerator.width, denominator.width) + size * 0.38;
    const numeratorY = size * 0.42 + numerator.descent;
    const denominatorY = -(size * 0.42 + denominator.ascent);
    return {
      parts: withAffinity([
        ...shiftParts(numerator.parts, (width - numerator.width) / 2, numeratorY),
        ...shiftParts(denominator.parts, (width - denominator.width) / 2, denominatorY),
        { key: "fraction-bar", kind: "line", x: width / 2, y: 0, width: width - size * 0.12, height: size * 0.045, fontSize: 0 },
      ], formulaFingerprint(node)),
      width,
      ascent: numeratorY + numerator.ascent + size * 0.08,
      descent: -denominatorY + denominator.descent + size * 0.08,
    };
  }
  const body = layoutFormulaNode(node.body, size * 0.94);
  const radicalWidth = size * 0.62;
  const width = radicalWidth + body.width + size * 0.12;
  const barY = body.ascent + size * 0.08;
  const radicalDepth = Math.max(body.descent, size * 0.42);
  const radicalHeight = barY + radicalDepth;
  return {
    parts: withAffinity([
      {
        key: "radical",
        kind: "radical",
        x: radicalWidth * 0.48,
        y: barY - radicalHeight * 0.48,
        width: radicalWidth,
        height: radicalHeight,
        fontSize: size,
      },
      ...shiftParts(body.parts, radicalWidth, 0),
      { key: "radical-bar", kind: "line", x: radicalWidth + body.width / 2, y: barY, width: body.width + size * 0.1, height: size * 0.04, fontSize: 0 },
    ], formulaFingerprint(node)),
    width,
    ascent: barY + size * 0.08,
    descent: Math.max(body.descent, size * 0.32),
  };
}

function shiftParts(parts: readonly MorphPart[], x: number, y: number): MorphPart[] {
  return parts.map((part) => ({ ...part, x: part.x + x, y: part.y + y }));
}

function withAffinity(parts: readonly MorphPart[], affinity: string): MorphPart[] {
  return parts.map((part) => ({ ...part, affinities: [...(part.affinities ?? []), affinity] }));
}

function formulaFingerprint(node: FormulaNode): string {
  if (node.kind === "symbol") return `symbol(${node.role ?? node.value})`;
  if (node.kind === "row") return `row(${node.children.map(formulaFingerprint).join(",")})`;
  if (node.kind === "scripts") {
    return `scripts(${formulaFingerprint(node.base)};${node.superscript ? formulaFingerprint(node.superscript) : ""};${node.subscript ? formulaFingerprint(node.subscript) : ""})`;
  }
  if (node.kind === "fraction") return `frac(${formulaFingerprint(node.numerator)};${formulaFingerprint(node.denominator)})`;
  return `sqrt(${formulaFingerprint(node.body)})`;
}

function formulaAdvance(value: string, size: number): number {
  if (/[=+\-×÷<>]/u.test(value)) return size * 0.72;
  if (/[()[\]{}]/u.test(value)) return size * 0.42;
  if (/[∫∑∏√]/u.test(value)) return size * 0.7;
  return textAdvance(value, size);
}

function formulaGap(left: FormulaNode, right: FormulaNode, size: number): number {
  return isSpacedOperator(left) || isSpacedOperator(right) ? size * 0.18 : size * 0.055;
}

function isSpacedOperator(node: FormulaNode): boolean {
  return node.kind === "symbol" && /^(?:=|\+|−|×|÷|<|>|≤|≥|≠|±)$/u.test(node.value);
}

function commandSymbol(command: string): string {
  const symbols: Record<string, string> = {
    alpha: "α", beta: "β", gamma: "γ", delta: "δ", theta: "θ", lambda: "λ", mu: "μ", pi: "π",
    sigma: "σ", phi: "φ", omega: "ω", cdot: "·", times: "×", div: "÷", pm: "±", neq: "≠",
    le: "≤", ge: "≥", infty: "∞", int: "∫", sum: "∑", prod: "∏", to: "→",
  };
  return symbols[command] ?? command;
}

function normalizeFormulaCharacter(value: string): string {
  return value === "-" ? "−" : value;
}

function stripFormulaDelimiters(source: string): string {
  return source.trim().replace(/^\$+|\$+$/gu, "");
}

function lerp(left: number, right: number, amount: number): number {
  return left + (right - left) * amount;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function format(value: number): string {
  return Number(value.toFixed(5)).toString();
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replaceAll('"', "&quot;");
}
