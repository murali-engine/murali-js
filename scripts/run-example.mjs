import { readdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { basename, extname, resolve } from "node:path";

const examplesRoot = resolve("examples");
const entries = await readdir(examplesRoot, { withFileTypes: true });
const examples = new Map(entries
  .filter((entry) => entry.isFile() && /\.(?:ts|tsx)$/.test(entry.name))
  .map((entry) => [basename(entry.name, extname(entry.name)), entry.name])
  .sort());

const args = process.argv.slice(2);
if (args.includes("--list") || args.includes("-l")) {
  process.stdout.write(`${[...examples.keys()].join("\n")}\n`);
  process.exit(0);
}

const requested = args.find((arg) => !arg.startsWith("-")) ?? "basic";
const forward = args.filter((arg) => arg !== requested);

const aliases = new Map([["hello", "basic"]]);
const name = aliases.get(requested) ?? requested;
const entry = examples.get(name);
if (!entry) {
  process.stderr.write(`Unknown example "${requested}". Available examples: ${[...examples.keys()].join(", ")}\n`);
  process.exit(1);
}

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const child = spawn(npmCommand, ["run", "render", "--workspace", "@venu/examples", "--", entry, ...forward], {
  cwd: process.cwd(),
  stdio: "inherit",
});

child.once("error", (error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
child.once("exit", (code) => process.exit(code ?? 1));
