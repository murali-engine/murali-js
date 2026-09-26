import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname } from "node:path";

export interface Encoder {
  write: (frame: Buffer) => Promise<void>;
  finish: () => Promise<void>;
}

export async function createEncoder(output: string, fps: number): Promise<Encoder> {
  await mkdir(dirname(output), { recursive: true });
  const require = createRequire(import.meta.url);
  const ffmpegStatic = require("ffmpeg-static") as string | null;
  const binary = ffmpegStatic || "ffmpeg";
  const child = spawn(binary, [
    "-y",
    "-f", "image2pipe",
    "-framerate", String(fps),
    "-i", "-",
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    output,
  ], { stdio: ["pipe", "pipe", "pipe"] });
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
