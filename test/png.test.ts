import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { inflateSync } from "node:zlib";
import { renderScene } from "../src/render/capture.ts";

test("writes a transparent PNG of one sampled frame and overrides the scene background", { timeout: 60_000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), "murali-png-"));
  const output = join(directory, "logo.png");
  try {
    const result = await renderScene(resolve("examples/murali-logo-image.ts"), {
      output,
      transparent: true,
      at: 0,
      progress: false,
      args: { background: "#f7f4ed" },
    });
    const png = await readFile(output);
    assert.equal(result.frames, 1);
    assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(png.readUInt32BE(16), 1200);
    assert.equal(png.readUInt32BE(20), 1200);
    assert.equal(png[25], 6);
    assert.equal(cornerAlpha(png), 0);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

function cornerAlpha(png: Buffer): number {
  const rows: Buffer[] = [];
  let offset = 8;
  const idat: Buffer[] = [];
  let width = 0;
  while (offset + 8 <= png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.subarray(offset + 4, offset + 8).toString("ascii");
    const data = png.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") width = data.readUInt32BE(0);
    if (type === "IDAT") idat.push(data);
    if (type === "IEND") break;
    offset += 12 + length;
  }
  const inflated = inflateSync(Buffer.concat(idat));
  const stride = width * 4;
  let source = 0;
  let previous = Buffer.alloc(stride);
  for (let remaining = inflated.length; remaining > 0; remaining -= stride + 1) {
    const filter = inflated[source];
    const row = Buffer.from(inflated.subarray(source + 1, source + 1 + stride));
    if (filter === 1 || filter === 3 || filter === 4) {
      for (let index = 0; index < row.length; index += 1) {
        const left = index >= 4 ? row[index - 4] : 0;
        const up = previous[index];
        const upperLeft = index >= 4 ? previous[index - 4] : 0;
        const predictor = filter === 1 ? left
          : filter === 3 ? Math.floor((left + up) / 2)
          : paeth(left, up, upperLeft);
        row[index] = (row[index] + predictor) & 255;
      }
    } else if (filter === 2) {
      for (let index = 0; index < row.length; index += 1) row[index] = (row[index] + previous[index]) & 255;
    } else if (filter !== 0) {
      throw new Error(`Unexpected PNG filter ${filter}.`);
    }
    rows.push(row);
    previous = row;
    source += stride + 1;
    if (rows.length === 1) break;
  }
  return rows[0]?.[3] ?? 255;
}

function paeth(left: number, up: number, upperLeft: number): number {
  const estimate = left + up - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= upDistance && leftDistance <= upperLeftDistance) return left;
  if (upDistance <= upperLeftDistance) return up;
  return upperLeft;
}
