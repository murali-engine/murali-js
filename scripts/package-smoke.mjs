import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const temporaryDirectory = mkdtempSync(join(tmpdir(), "murali-js-package-"));
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const npmEnvironment = { ...process.env, npm_config_cache: join(temporaryDirectory, "npm-cache") };

execFileSync(npmCommand, ["run", "build"], { cwd: resolve("."), stdio: "inherit", env: npmEnvironment });
execFileSync(npmCommand, ["test"], { cwd: resolve("."), stdio: "inherit", env: npmEnvironment });
const packResult = JSON.parse(execFileSync(npmCommand, ["pack", "--ignore-scripts", "--json", "--pack-destination", temporaryDirectory], {
  cwd: resolve("."),
  encoding: "utf8",
  env: npmEnvironment,
}));
const tarball = join(temporaryDirectory, packResult[0].filename);

writeFileSync(join(temporaryDirectory, "package.json"), JSON.stringify({
  private: true,
  type: "module",
  dependencies: { "murali-js": `file:${tarball}` },
}));
execFileSync(npmCommand, ["install", "--ignore-scripts"], { cwd: temporaryDirectory, stdio: "inherit", env: npmEnvironment });
writeFileSync(join(temporaryDirectory, "smoke.mjs"), `
  import { BasisExplorer2D, Camera3D, Circle, Ellipse, FormulaMorph, FormulaOutline, Label, Latex, LatexMorph, LinearMap2D, Matrix, Opening, ProjectionDiagram2D, Scene, ShapeMorph, TextMorph, ThreeTattva, Timeline, VectorShape, WordCloud, createTheme, render, palette, themes } from "murali-js";
  import { Scene as CoreScene } from "murali-js/core";
  import { palette as stylePalette } from "murali-js/style";
  import { ThreeTattva as AdapterThreeTattva } from "murali-js/adapters";
  import { Group } from "murali-js/layout";
  import { Circle as PrimitiveCircle } from "murali-js/primitives";
  import { Label as TextLabel } from "murali-js/text";
  import { Matrix as MathsMatrix } from "murali-js/maths";
  import { NeuralNetwork } from "murali-js/ai";
  import { WaveMesh } from "murali-js/composite";
  import { Stepwise } from "murali-js/storytelling";
  import { Table } from "murali-js/table";
  import { TracedPath } from "murali-js/utility";
  import { renderScene } from "murali-js/render";
  if ([BasisExplorer2D, Circle, Ellipse, FormulaMorph, FormulaOutline, Label, Latex, LatexMorph, LinearMap2D, Matrix, Opening, ProjectionDiagram2D, Scene, ShapeMorph, TextMorph, ThreeTattva, Timeline, VectorShape, WordCloud, createTheme, render, renderScene, CoreScene, AdapterThreeTattva, Group, PrimitiveCircle, TextLabel, MathsMatrix, NeuralNetwork, WaveMesh, Stepwise, Table, TracedPath].some((value) => typeof value !== "function") || typeof Camera3D.perspective !== "function" || themes.dark.colors.accent.length === 0 || palette.TEAL_C.length === 0 || stylePalette.TEAL_C.length === 0) {
    throw new Error("Published exports are incomplete");
  }
`);
execFileSync(process.execPath, [join(temporaryDirectory, "smoke.mjs")], { stdio: "inherit" });

const manifest = JSON.parse(readFileSync(join(temporaryDirectory, "node_modules/murali-js/package.json"), "utf8"));
process.stdout.write(`Verified installed package ${manifest.name}@${manifest.version}\n`);
