import { render } from "murali-js";
import { MuraliLogoMark } from "murali-js/composite";
import { Scene } from "murali-js/core";

const settings = logoImageSettings();

/** Export the standalone Murali mark as two square PNG variants. */
class MuraliLogoImage extends Scene {
  constructor() {
    super({
      frame: "square",
      width: 1200,
      height: 1200,
      background: settings.background,
    });
  }

  override construct(): void {
    this.add(MuraliLogoMark({ width: 6.6 }));
  }
}

await render(import.meta.url, MuraliLogoImage, {
  output: `${settings.outputDirectory}/murali-logo-background.png`,
  format: "png",
  transparent: false,
  at: 0,
  args: { background: settings.background },
});

await render(import.meta.url, MuraliLogoImage, {
  output: `${settings.outputDirectory}/murali-logo-transparent.png`,
  format: "png",
  transparent: true,
  at: 0,
  args: { background: settings.background },
});

interface LogoImageSettings {
  readonly background: string;
  readonly outputDirectory: string;
}

function logoImageSettings(): LogoImageSettings {
  const injected = (globalThis as { __muraliArgs?: { background?: string } }).__muraliArgs;
  if (injected?.background) {
    return {
      background: injected.background,
      outputDirectory: "./output",
    };
  }

  const argv = typeof process === "undefined" ? [] : process.argv.slice(2);
  return {
    background: argumentValue(argv, "--background") ?? "#f7f4ed",
    outputDirectory: trimTrailingSlash(argumentValue(argv, "--output-dir") ?? "./output"),
  };
}

function trimTrailingSlash(path: string): string {
  const trimmed = path.replace(/\/+$/u, "");
  return trimmed || ".";
}

function argumentValue(argv: readonly string[], name: string): string | undefined {
  const equals = argv.find((argument) => argument.startsWith(`${name}=`));
  if (equals) return equals.slice(name.length + 1);
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
}
