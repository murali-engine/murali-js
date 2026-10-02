import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";

export interface LatexVectorElement {
  readonly key: string;
  readonly kind: "glyph" | "rule";
  readonly path: string;
  readonly x: number;
  readonly y: number;
}

export interface LatexVectorResource {
  readonly source: string;
  readonly viewBox: readonly [number, number, number, number];
  readonly elements: readonly LatexVectorElement[];
}

const resourceCache = new Map<string, LatexVectorResource>();

/** Find literal formulas passed directly to vector-backed LaTeX APIs in a scene source file. */
export function extractLatexSources(source: string, fileName = "scene.ts"): string[] {
  const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const result = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node)
      && ts.isIdentifier(node.expression)
      && (
        node.expression.text === "Latex"
        || node.expression.text === "LatexMorph"
        || node.expression.text === "FormulaOutline"
      )
    ) {
      node.arguments.forEach((argument) => {
        const value = literalText(argument);
        if (value !== undefined) result.add(value);
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return [...result];
}

/** @deprecated Use extractLatexSources. */
export const extractLatexMorphSources = extractLatexSources;

export function compileLatexVector(source: string): LatexVectorResource {
  const cached = resourceCache.get(source);
  if (cached) return cached;
  const directory = mkdtempSync(join(tmpdir(), "murali-latex-"));
  try {
    const texPath = join(directory, "formula.tex");
    writeFileSync(texPath, latexDocument(source));
    run("latex", ["-no-shell-escape", "-interaction=nonstopmode", "-halt-on-error", "formula.tex"], directory);
    run("dvisvgm", ["--no-fonts", "--exact-bbox", "--output=formula.svg", "formula.dvi"], directory);
    const resource = parseDvisvgm(readFileSync(join(directory, "formula.svg"), "utf8"), source);
    resourceCache.set(source, resource);
    return resource;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

export function parseDvisvgm(svg: string, source = ""): LatexVectorResource {
  const viewBoxMatch = /\bviewBox=(['"])(.*?)\1/u.exec(svg);
  if (!viewBoxMatch?.[2]) throw new Error("LaTeX SVG did not contain a viewBox.");
  const values = viewBoxMatch[2].trim().split(/\s+/u).map(Number);
  if (values.length !== 4 || values.some((value) => !Number.isFinite(value))) {
    throw new Error(`Invalid LaTeX SVG viewBox: ${viewBoxMatch[2]}`);
  }
  const definitions = new Map<string, string>();
  for (const tag of svg.matchAll(/<path\b[^>]*>/gu)) {
    const id = attribute(tag[0], "id");
    const path = attribute(tag[0], "d");
    if (id && path) definitions.set(id, path);
  }
  const elements: LatexVectorElement[] = [];
  for (const tag of svg.matchAll(/<use\b[^>]*>/gu)) {
    const href = attribute(tag[0], "xlink:href") ?? attribute(tag[0], "href");
    const path = href?.startsWith("#") ? definitions.get(href.slice(1)) : undefined;
    if (!path) continue;
    elements.push({
      key: `glyph:${path}`,
      kind: "glyph",
      path,
      x: numberAttribute(tag[0], "x"),
      y: numberAttribute(tag[0], "y"),
    });
  }
  for (const tag of svg.matchAll(/<rect\b[^>]*>/gu)) {
    const x = numberAttribute(tag[0], "x");
    const y = numberAttribute(tag[0], "y");
    const width = numberAttribute(tag[0], "width");
    const height = numberAttribute(tag[0], "height");
    if (width <= 0 || height <= 0) continue;
    elements.push({
      key: "rule",
      kind: "rule",
      path: `M0 0H${width}V${height}H0Z`,
      x,
      y,
    });
  }
  if (elements.length === 0) throw new Error("LaTeX SVG contained no vector glyphs or rules.");
  return { source, viewBox: values as unknown as readonly [number, number, number, number], elements };
}

function literalText(node: ts.Expression): string | undefined {
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isTaggedTemplateExpression(node) && ts.isNoSubstitutionTemplateLiteral(node.template)) {
    const tag = node.tag;
    if (
      ts.isPropertyAccessExpression(tag)
      && ts.isIdentifier(tag.expression)
      && tag.expression.text === "String"
      && tag.name.text === "raw"
    ) return node.template.rawText ?? node.template.text;
  }
  return undefined;
}

function latexDocument(source: string): string {
  return String.raw`\documentclass[preview,border=0pt]{standalone}
\usepackage{amsmath,amssymb,mathtools}
\pagestyle{empty}
\begin{document}
$${source}$
\end{document}
`;
}

function run(command: string, args: readonly string[], cwd: string): void {
  try {
    execFileSync(command, args, { cwd, stdio: "pipe" });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to compile LaTeX vector resource with ${command}. Install a TeX distribution containing latex and dvisvgm. ${detail}`,
      { cause: error },
    );
  }
}

function attribute(tag: string, name: string): string | undefined {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return new RegExp(`\\b${escaped}=(['\"])(.*?)\\1`, "u").exec(tag)?.[2];
}

function numberAttribute(tag: string, name: string): number {
  const value = Number(attribute(tag, name) ?? 0);
  return Number.isFinite(value) ? value : 0;
}
