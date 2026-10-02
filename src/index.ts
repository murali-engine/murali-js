// Compatibility prelude. New code should use the category subpaths for domain APIs.
export * from "./core/index.ts";
export * from "./style/index.ts";
export * from "./adapters/index.ts";
export * from "./tattvas/layout/index.ts";
export * from "./tattvas/primitives/index.ts";
export * from "./tattvas/text/index.ts";
export * from "./tattvas/maths/index.ts";
export * from "./tattvas/ai/index.ts";
export * from "./tattvas/composite/index.ts";
export * from "./tattvas/storytelling/index.ts";
export * from "./tattvas/table/index.ts";
export * from "./tattvas/utility/index.ts";
export * from "./render/render.ts";
export type { RenderOverrides } from "./render/config.ts";
export type { AudioTrack, AudioTrackOptions } from "./render/audio.ts";
