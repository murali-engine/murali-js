export type ProgressWriter = (message: string) => void;

export function createProgressReporter(
  write: ProgressWriter = (message) => process.stdout.write(message),
  interactive = Boolean(process.stdout.isTTY),
): (completed: number, total: number) => void {
  let lastPercent = -10;

  return (completed, total) => {
    const percent = total === 0 ? 100 : Math.floor((completed / total) * 100);
    const message = `Rendering ${completed}/${total} frames (${percent}%)`;

    if (interactive) {
      write(`\r${message}${completed === total ? "\n" : ""}`);
      return;
    }

    if (percent >= lastPercent + 10 || completed === total) {
      write(`${message}\n`);
      lastPercent = percent;
    }
  };
}
