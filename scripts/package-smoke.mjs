import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const temporaryDirectory = mkdtempSync(join(tmpdir(), "murali-js-package-"));
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

execFileSync(npmCommand, ["run", "build"], { cwd: resolve("."), stdio: "inherit" });
execFileSync(npmCommand, ["test"], { cwd: resolve("."), stdio: "inherit" });
const packResult = JSON.parse(execFileSync(npmCommand, ["pack", "--ignore-scripts", "--json", "--pack-destination", temporaryDirectory], {
  cwd: resolve("."),
  encoding: "utf8",
}));
const tarball = join(temporaryDirectory, packResult[0].filename);

writeFileSync(join(temporaryDirectory, "package.json"), JSON.stringify({
  private: true,
  type: "module",
  dependencies: { "murali-js": `file:${tarball}` },
}));
execFileSync(npmCommand, ["install", "--ignore-scripts"], { cwd: temporaryDirectory, stdio: "inherit" });
writeFileSync(join(temporaryDirectory, "smoke.mjs"), `
  import { Camera3D, Circle, Label, Opening, Scene, ThreeTattva, Timeline, WordCloud, render } from "murali-js";
  import { renderScene } from "murali-js/render";
  if ([Circle, Label, Opening, Scene, ThreeTattva, Timeline, WordCloud, render, renderScene].some((value) => typeof value !== "function") || typeof Camera3D.perspective !== "function") {
    throw new Error("Published exports are incomplete");
  }
`);
execFileSync(process.execPath, [join(temporaryDirectory, "smoke.mjs")], { stdio: "inherit" });

const manifest = JSON.parse(readFileSync(join(temporaryDirectory, "node_modules/murali-js/package.json"), "utf8"));
process.stdout.write(`Verified installed package ${manifest.name}@${manifest.version}\n`);
