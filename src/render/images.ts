import { existsSync, readFileSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import ts from "typescript";

/** Discover literal imageFile(path) declarations in an entry scene. */
export function extractImageFiles(source: string, scenePath: string): Record<string, string> {
  const file = ts.createSourceFile(scenePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const resources: Record<string, string> = {};
  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node)
      && ts.isIdentifier(node.expression)
      && node.expression.text === "imageFile"
      && node.arguments.length >= 1
      && ts.isStringLiteralLike(node.arguments[0]!)
    ) {
      const authoredPath = node.arguments[0]!.text;
      const absolutePath = resolve(dirname(scenePath), authoredPath);
      if (existsSync(absolutePath)) resources[authoredPath] = dataUrl(absolutePath);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return resources;
}

function dataUrl(path: string): string {
  const mime = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
  }[extname(path).toLowerCase()];
  if (!mime) throw new Error(`Unsupported image file extension for ${path}. Use JPG, PNG, or WebP.`);
  return `data:${mime};base64,${readFileSync(path).toString("base64")}`;
}
