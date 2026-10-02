import { readdir } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const ignoredDirectories = new Set(["assets", "data", "node_modules", "output"]);

export async function discoverExamples(examplesRoot) {
  const files = await exampleFiles(examplesRoot);
  return new Map(files.map((file) => {
    const path = relative(examplesRoot, file);
    return [path.slice(0, -extname(path).length), path];
  }).sort(([left], [right]) => left.localeCompare(right)));
}

async function exampleFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory() && !ignoredDirectories.has(entry.name) && !entry.name.startsWith(".")) {
      return exampleFiles(path);
    }
    return entry.isFile() && /\.(?:ts|tsx)$/.test(entry.name) ? [path] : [];
  }));
  return nested.flat();
}
