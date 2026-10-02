import { existsSync, readFileSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import ts from "typescript";

/** Discover literal fontFile(family, path) declarations in an entry scene. */
export function extractFontFiles(
  source: string,
  scenePath: string,
): Record<string, string> {
  const file = ts.createSourceFile(scenePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const resources: Record<string, string> = {};
  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node)
      && ts.isIdentifier(node.expression)
      && node.expression.text === "fontFile"
      && node.arguments.length >= 2
      && ts.isStringLiteralLike(node.arguments[1]!)
    ) {
      const authoredPath = node.arguments[1]!.text;
      const absolutePath = resolve(dirname(scenePath), authoredPath);
      if (existsSync(absolutePath)) {
        resources[authoredPath] = dataUrl(absolutePath);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return resources;
}

function dataUrl(path: string): string {
  const mime = {
    ".ttf": "font/ttf",
    ".otf": "font/otf",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
  }[extname(path).toLowerCase()];
  if (!mime) throw new Error(`Unsupported font file extension for ${path}. Use TTF, OTF, WOFF, or WOFF2.`);
  return `data:${mime};base64,${readFileSync(path).toString("base64")}`;
}
