import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { previewScene } from "../dist/render/preview.js";
import { discoverExamples } from "./example-files.mjs";

const args = process.argv.slice(2);
const delay = numericOption(args, "--delay", 2);
const match = stringOption(args, "--match");
const from = stringOption(args, "--from");
const skip = integerOption(args, "--skip", 0);
const headless = args.includes("--headless");
const stopOnError = args.includes("--stop-on-error");
const knownOptions = new Set(["--delay", "--match", "--from", "--skip", "--headless", "--stop-on-error"]);
validateArguments(args, knownOptions);
if (from && skip > 0) throw new Error("Use either --from or --skip, not both.");

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const examplesRoot = resolve(repositoryRoot, "examples");
const discovered = [...(await discoverExamples(examplesRoot)).entries()].map(([name, path], index) => ({
  name,
  path,
  galleryIndex: index + 1,
}));
const matched = match
  ? discovered.filter(({ name }) => name.toLowerCase().includes(match.toLowerCase()))
  : discovered;
const start = from ? matched.findIndex(({ name }) => name === from) : skip;
if (from && start < 0) throw new Error(`Unknown starting example "${from}".`);
if (skip >= matched.length && skip > 0) {
  throw new Error(`--skip ${skip} leaves no examples to preview; the selection contains ${matched.length}.`);
}
const examples = matched.slice(start);
if (examples.length === 0) throw new Error("No examples matched the requested preview selection.");

const selectionNote = match ? ` from ${matched.length} matched` : "";
process.stdout.write(
  `Previewing ${examples.length}${selectionNote} of ${discovered.length} gallery examples sequentially; each closes ${delay.toFixed(2)}s after playback.\n`,
);
const failures = [];
for (const [index, { name, path, galleryIndex }] of examples.entries()) {
  const runIndex = index + 1;
  const position = examples.length === discovered.length
    ? `${galleryIndex}/${discovered.length}`
    : `${galleryIndex}/${discovered.length} · run ${runIndex}/${examples.length}`;
  process.stdout.write(`\n[${position}] ${name}\n`);
  try {
    await previewScene(resolve(examplesRoot, path), { autoCloseAfter: delay, headless });
  } catch (error) {
    failures.push({ name, error });
    process.stderr.write(`Failed ${name}: ${error instanceof Error ? error.message : String(error)}\n`);
    if (stopOnError) break;
  }
}

if (failures.length > 0) {
  process.stderr.write(`\n${failures.length} example${failures.length === 1 ? "" : "s"} failed preview.\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`\nFinished previewing ${examples.length} examples.\n`);
}

function numericOption(values, name, fallback) {
  const raw = stringOption(values, name);
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) throw new Error(`${name} must be a non-negative finite number.`);
  return value;
}

function integerOption(values, name, fallback) {
  const value = numericOption(values, name, fallback);
  if (!Number.isSafeInteger(value)) throw new Error(`${name} must be a non-negative integer.`);
  return value;
}

function stringOption(values, name) {
  const index = values.indexOf(name);
  if (index < 0) return undefined;
  const value = values[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value.`);
  return value;
}

function validateArguments(values, known) {
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) continue;
    if (!known.has(value)) throw new Error(`Unknown option "${value}".`);
    if (value === "--delay" || value === "--match" || value === "--from" || value === "--skip") index += 1;
  }
}
