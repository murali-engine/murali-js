import { Scene } from "./Scene.ts";
import { Tattva } from "./Tattva.ts";
import { finiteNonNegative } from "./time.ts";

/** How the child clock follows the parent. `paused` stays at the local offset. */
export type SceneViewPlayback = "continuous" | "once" | "paused" | { readonly loop: number };

export interface SceneViewClock {
  parentTime: number;
  startTime: number;
  offset: number;
  timeScale: number;
  playback: SceneViewPlayback;
  /** Child timeline end. `once` does not play past it. */
  childEnd: number;
}

/** The child clock as a function of parent time. Seeking does not depend on the previous sample. */
export function sceneViewLocalTime(clock: SceneViewClock): number {
  const parentTime = finiteNonNegative(clock.parentTime, "Scene view parent time");
  const startTime = finiteNonNegative(clock.startTime, "Scene view start time");
  const offset = finiteNonNegative(clock.offset, "Scene view local-time offset");
  const timeScale = finiteNonNegative(clock.timeScale, "Scene view time scale");
  const childEnd = finiteNonNegative(clock.childEnd, "Scene view child end time");
  if (clock.playback === "paused") return offset;
  const elapsed = Math.max(0, parentTime - startTime) * timeScale;
  const local = offset + elapsed;
  if (clock.playback === "once") return Math.min(local, childEnd);
  if (clock.playback === "continuous") return local;
  const duration = finiteNonNegative(clock.playback.loop, "Scene view loop duration");
  if (duration === 0) {
    throw new Error("Scene view loop duration must be greater than zero; received 0.");
  }
  return local - Math.floor(local / duration) * duration;
}

/**
 * A scene drawn inside another scene. It has its own camera and clock.
 * The picture is one object the parent can move, scale, and rotate.
 */
export class SceneViewTattva extends Tattva {
  readonly nestsScene = true;
  readonly child: Scene;
  plate = "transparent";
  corner = 0;
  borderWidth = 0;
  borderColor = "transparent";
  playbackMode: SceneViewPlayback = "continuous";
  startTime = 0;
  offset = 0;
  clockScale = 1;
  pixelWidth: number;
  pixelHeight: number;

  constructor(child: Scene) {
    super();
    this.child = child.prepare();
    this.pixelWidth = child.width;
    this.pixelHeight = child.height;
    this.size(child.viewWidth, child.viewHeight);
  }

  size(width: number, height: number): this {
    this.worldSize = { width: Math.max(width, 1e-4), height: Math.max(height, 1e-4) };
    return this;
  }

  background(color: string): this {
    this.plate = color;
    return this;
  }

  cornerRadius(radius: number): this {
    this.corner = Math.max(0, radius);
    return this;
  }

  border(width: number, color: string): this {
    this.borderWidth = Math.max(0, width);
    this.borderColor = color;
    return this;
  }

  playback(mode: SceneViewPlayback): this {
    if (typeof mode === "object") {
      finiteNonNegative(mode.loop, "Scene view loop duration");
      if (mode.loop === 0) {
        throw new Error("Scene view loop duration must be greater than zero; received 0.");
      }
    }
    this.playbackMode = mode;
    return this;
  }

  /** Parent time at which the child clock reads zero, before any offset. */
  startAt(parentTime: number): this {
    this.startTime = finiteNonNegative(parentTime, "Scene view start time");
    return this;
  }

  localTimeOffset(offset: number): this {
    this.offset = finiteNonNegative(offset, "Scene view local-time offset");
    return this;
  }

  timeScale(scale: number): this {
    this.clockScale = finiteNonNegative(scale, "Scene view time scale");
    return this;
  }

  /** Pixel size of the offscreen picture. The parent still scales it to `size`. */
  resolution(width: number, height: number): this {
    this.pixelWidth = Math.max(1, Math.floor(width));
    this.pixelHeight = Math.max(1, Math.floor(height));
    return this;
  }

  localTime(parentTime: number): number {
    return sceneViewLocalTime({
      parentTime,
      startTime: this.startTime,
      offset: this.offset,
      timeScale: this.clockScale,
      playback: this.playbackMode,
      childEnd: this.child.duration,
    });
  }
}

export function SceneView(child: Scene): SceneViewTattva {
  return new SceneViewTattva(child);
}
