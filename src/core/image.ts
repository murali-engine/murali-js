export interface ImageFileAsset {
  readonly kind: "file";
  readonly source: string;
}

const fileResources: Record<string, string> = {};

/** Define an image embedded by the Murali scene bundler. Keep the path as a string literal. */
export function imageFile(path: string): ImageFileAsset {
  if (path.trim().length === 0) throw new Error("Image path must not be empty.");
  return Object.freeze({ kind: "file", source: path });
}

/** @internal Installed by the generated browser entry before scene construction. */
export function installImageFileResources(resources: Readonly<Record<string, string>>): void {
  Object.assign(fileResources, resources);
}

/** @internal Resolve a registered file asset or an ordinary browser URL. */
export function resolveImageSource(source: string | ImageFileAsset): string | undefined {
  return typeof source === "string" ? source : fileResources[source.source];
}
