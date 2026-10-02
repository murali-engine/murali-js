import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeAudioTrack, resolveAudioTrack } from "../src/render/audio.ts";
import { createEncoderArguments } from "../src/render/encode.ts";

test("normalizes full, start-only, and bounded looping audio intervals", () => {
  assert.deepEqual(normalizeAudioTrack("music.mp3", 12), {
    source: "music.mp3",
    start: 0,
    end: 12,
    volume: 1,
  });
  assert.deepEqual(normalizeAudioTrack({ source: "music.mp3", start: 3 }, 12), {
    source: "music.mp3",
    start: 3,
    end: 12,
    volume: 1,
  });
  assert.deepEqual(normalizeAudioTrack({ source: "music.mp3", start: 3, end: 8, volume: 0.35 }, 12), {
    source: "music.mp3",
    start: 3,
    end: 8,
    volume: 0.35,
  });
});

test("validates audio timing and builds a looped, delayed, duration-bound mix", () => {
  assert.throws(() => normalizeAudioTrack("music.mp3", 0), /positive duration/);
  assert.throws(() => normalizeAudioTrack({ source: "", start: 0 }, 5), /non-empty/);
  assert.throws(() => normalizeAudioTrack({ source: "music.mp3", start: -1 }, 5), /non-negative/);
  assert.throws(() => normalizeAudioTrack({ source: "music.mp3", start: 4, end: 3 }, 5), /greater than start/);
  assert.throws(() => normalizeAudioTrack({ source: "music.mp3", start: 5 }, 5), /before video duration/);
  assert.throws(() => normalizeAudioTrack({ source: "music.mp3", end: 6 }, 5), /cannot exceed/);
  assert.throws(() => normalizeAudioTrack({ source: "music.mp3", volume: 1.1 }, 5), /between 0 and 1/);

  const args = createEncoderArguments("movie.mp4", 30, {
    duration: 10,
    audio: { source: "/tmp/music.mp3", start: 2.5, end: 7, volume: 0.4 },
  });
  assert.deepEqual(args.slice(0, 7), ["-y", "-f", "image2pipe", "-framerate", "30", "-i", "-"]);
  assert.ok(args.includes("-stream_loop"));
  assert.ok(args.includes("/tmp/music.mp3"));
  assert.ok(args.includes("[1:a]volume=0.4,atrim=start=0:end=4.5,asetpts=PTS-STARTPTS,adelay=2500:all=1[murali_audio]"));
  assert.ok(args.includes("aac"));
  assert.ok(args.includes("10"));
});

test("uses VP9 alpha and Opus only for the WebM encoder path", () => {
  const args = createEncoderArguments("overlay.webm", 60, {
    format: "webm",
    duration: 2,
    audio: { source: "/tmp/music.mp3", start: 0, end: 2, volume: 0.4 },
  });
  assert.ok(args.includes("libvpx-vp9"));
  assert.ok(args.includes("yuva420p"));
  assert.ok(args.includes("alpha_mode=1"));
  assert.ok(args.includes("libopus"));
  assert.ok(!args.includes("libx264"));
  assert.ok(!args.includes("-movflags"));
});

test("silently ignores a missing audio source", async () => {
  const audio = await resolveAudioTrack(
    "/path-that-does-not-exist/murali-missing-audio.mp3",
    10,
  );
  assert.equal(audio, undefined);
});
