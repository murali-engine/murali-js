export function frameCount(duration: number, fps: number): number {
  if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(fps) || fps <= 0) return 1;
  return Math.max(1, Math.ceil(duration * fps));
}
