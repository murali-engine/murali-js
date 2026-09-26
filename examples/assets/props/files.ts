import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const directory = dirname(fileURLToPath(import.meta.url));

/** Copied from Murali `assets/props`. The preview bundle inlines these bytes. */
export const pyramidGlb = new Uint8Array(readFileSync(resolve(directory, "demo-pyramid.glb")));
export const appleGltf = readFileSync(resolve(directory, "demo-apple/demo-apple.gltf"), "utf8");
export const appleBin = new Uint8Array(readFileSync(resolve(directory, "demo-apple/demo-apple.bin")));
