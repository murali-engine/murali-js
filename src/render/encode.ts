import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import type { ResolvedAudioTrack } from "./audio.ts";

export interface Encoder {
  write: (frame: Buffer) => Promise<void>;
  finish: () => Promise<void>;
}

export interface EncoderOptions {
  duration?: number;
  audio?: ResolvedAudioTrack;
}

export function createEncoderArguments(
  output: string,
  fps: number,
  options: EncoderOptions = {},
): string[] {
  const args = [
    "-y",
    "-f", "image2pipe",
    "-framerate", String(fps),
    "-i", "-",
  ];
  if (options.audio) {
    const activeDuration = options.audio.end - options.audio.start;
    const delayMilliseconds = Math.round(options.audio.start * 1000);
    args.push(
      "-stream_loop", "-1",
      "-i", options.audio.source,
      "-filter_complex",
      `[1:a]volume=${options.audio.volume},atrim=start=0:end=${activeDuration},asetpts=PTS-STARTPTS,adelay=${delayMilliseconds}:all=1[murali_audio]`,
      "-map", "0:v:0",
      "-map", "[murali_audio]",
    );
  }
  args.push(
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
  );
  if (options.audio) args.push("-c:a", "aac", "-b:a", "192k");
  if (options.duration !== undefined) args.push("-t", String(options.duration));
  args.push("-movflags", "+faststart", output);
  return args;
}

export async function createEncoder(
  output: string,
  fps: number,
  options: EncoderOptions = {},
): Promise<Encoder> {
  await mkdir(dirname(output), { recursive: true });
  const require = createRequire(import.meta.url);
  const ffmpegStatic = require("ffmpeg-static") as string | null;
  const binary = ffmpegStatic || "ffmpeg";
  const child = spawn(binary, createEncoderArguments(output, fps, options), {
    stdio: ["pipe", "pipe", "pipe"],
  });
  let stderr = "";
  child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });

  return {
    write(frame) {
      return new Promise((resolveWrite, reject) => {
        const onError = (error: Error) => reject(error);
        child.stdin.once("error", onError);
        if (child.stdin.write(frame)) {
          child.stdin.off("error", onError);
          resolveWrite();
        } else {
          child.stdin.once("drain", () => {
            child.stdin.off("error", onError);
            resolveWrite();
          });
        }
      });
    },
    finish() {
      return new Promise((resolveFinish, reject) => {
        child.once("error", reject);
        child.once("close", (code) => {
          if (code === 0) resolveFinish();
          else reject(new Error(`ffmpeg exited with code ${code}.\n${stderr}`));
        });
        child.stdin.end();
      });
    },
  };
}
