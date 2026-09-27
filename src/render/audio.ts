export interface AudioTrackOptions {
  /** Audio file path. Relative paths are resolved from the current working directory. */
  source: string;
  /** Scene time in seconds when audio begins. Defaults to 0. */
  start?: number;
  /** Scene time in seconds when audio stops. Defaults to the end of the video. */
  end?: number;
  /** Linear playback volume from 0 (silent) to 1 (original level). Defaults to 1. */
  volume?: number;
}

/** A file path plays for the full video; use the object form for a scene-time interval. */
export type AudioTrack = string | AudioTrackOptions;

export interface ResolvedAudioTrack {
  source: string;
  start: number;
  end: number;
  volume: number;
}

export function normalizeAudioTrack(
  audio: AudioTrack | undefined,
  videoDuration: number,
): ResolvedAudioTrack | undefined {
  if (audio === undefined) return undefined;
  if (!Number.isFinite(videoDuration) || videoDuration <= 0) {
    throw new Error(`Audio requires a video with positive duration; received ${videoDuration}.`);
  }
  const value = typeof audio === "string" ? { source: audio } : audio;
  if (typeof value.source !== "string" || value.source.trim().length === 0) {
    throw new Error("Audio source must be a non-empty file path.");
  }
  const start = value.start ?? 0;
  const end = value.end ?? videoDuration;
  const volume = value.volume ?? 1;
  if (!Number.isFinite(start) || start < 0) {
    throw new Error(`Audio start must be a non-negative finite number; received ${start}.`);
  }
  if (start >= videoDuration) {
    throw new Error(`Audio start ${start} must be before video duration ${videoDuration}.`);
  }
  if (!Number.isFinite(end) || end <= start) {
    throw new Error(`Audio end must be finite and greater than start; received ${end}.`);
  }
  if (end > videoDuration) {
    throw new Error(`Audio end ${end} cannot exceed video duration ${videoDuration}.`);
  }
  if (!Number.isFinite(volume) || volume < 0 || volume > 1) {
    throw new Error(`Audio volume must be between 0 and 1; received ${volume}.`);
  }
  return { source: value.source, start, end, volume };
}

/** Resolve an authored audio track, returning undefined when its file is absent. */
export async function resolveAudioTrack(
  audio: AudioTrack | undefined,
  videoDuration: number,
): Promise<ResolvedAudioTrack | undefined> {
  const normalized = normalizeAudioTrack(audio, videoDuration);
  if (!normalized) return undefined;
  const source = resolve(normalized.source);
  try {
    await access(source);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
  return { ...normalized, source };
}
import { access } from "node:fs/promises";
import { resolve } from "node:path";
