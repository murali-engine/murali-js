# Venu

Venu is a deterministic, code-first animation engine inspired by Manim. A scene is ordinary TypeScript that can combine DOM, React, and Three.js content on one timeline, then render that timeline frame-by-frame to an MP4.

## Quick start

```bash
npm install
npm run example -- hello-shapes
```

The rendered video is written to `examples/output/hello-shapes.mp4`.
Venu depends on Playwright's Chromium package, so the compatible browser is downloaded during a normal npm installation. Set `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` before installing only when your environment manages browsers separately.
The local package is also compiled automatically during `npm install`, so files can be run directly from the examples directory with `npx tsx hello-shapes.ts`.

To render a specific example, pass its short name:

```bash
npm run example -- react-card
npm run example -- three-camera
```

The `examples` directory is one consumer package, and each example is normally one file. A complex example can still use its own folder when needed. See every available example with:

```bash
npm run example -- --list
```

## Use Venu as a package

Define and render the animation from one entry point:

```ts
// hello.ts
import { Circle, Label, Scene, Timeline, render } from "venu";

class HelloScene extends Scene {
  override construct() {
    const title = this.add(Label("Hello, Venu").height(0.5).color("white"));
    this.toEdge(title, "up", { margin: 0.8 });

    const circle = this.add(
      Circle().radius(0.7).fill("#22c55e").stroke({ color: "white", width: 0.04 }),
      { at: [-4, 0] },
    );

    const timeline = new Timeline();
    timeline.animate(title).duration(0.8).typewrite();
    timeline.animate(circle).at(0.4).duration(2).ease("inOutQuad").moveTo([3, 0]);
    this.play(timeline);
  }
}

render(import.meta.url, HelloScene, {
  output: "./output/hello.mp4",
});
```

Run it with `npx tsx hello.ts`. `import.meta.url` identifies the current source file so Venu can bundle the scene for Chromium. The CLI remains available as an optional convenience.

Venu displays frame progress by default while rendering. Disable it for scripts or CI with `render(import.meta.url, HelloScene, { progress: false })`, or provide `onProgress(completed, total)` for custom reporting.

### Shared render configuration

Venu reads `murali.json` and `.env` from the working directory. Explicit options passed to `render()` have the highest priority, followed by environment settings, followed by `murali.json`.

```json
{
  "render": {
    "outputDir": "./output",
    "fps": 30
  }
}
```

Supported environment variables are `MURALI_FPS`, `MURALI_OUTPUT`, `MURALI_OUTPUT_DIR`, and `MURALI_PROGRESS`; `VENU_` aliases are also accepted. Any individual scene can override them:

```ts
render(import.meta.url, HelloScene, {
  fps: 60,
  output: "./output/hello-60fps.mp4",
});
```

`construct()` records the full timeline synchronously. No wall-clock animation occurs while authoring. During rendering, `sampleAt(t)` computes the exact state for every object at virtual time `t`, making repeated renders reproducible.

## Commands

```bash
npm run example -- hello-shapes
npm run example -- react-card
npm run example -- three-camera
npm run build
npm run typecheck
npm test
npm run test:package
```

`test:package` creates an npm tarball, installs it into a clean temporary project, and verifies both `"venu"` and `"venu/render"`. This catches missing build output and incorrect package exports before publishing.

## Architecture

- `src/core` contains Tattvas, timeline builders, easing, interpolation, frames, and deterministic scene sampling.
- `src/render` bundles a scene for the browser, mounts DOM/React/Three.js objects, captures exact frames in Chromium, and streams them into ffmpeg.
- `src/mobjects` contains convenient shape and text constructors.
- `examples` is one standalone consumer package containing executable scene files.
- `python` is an optional offline data generator for animation-ready neural-network state.

The core has no dependency on Chromium, esbuild, or ffmpeg; those concerns stay inside `src/render`.

## Design roadmap

The builder API and ongoing Murali feature-parity work are tracked in:

- [`docs/ergonomics.md`](./docs/ergonomics.md)
- [`docs/feature-parity.md`](./docs/feature-parity.md)
- [`docs/implementation-plan.md`](./docs/implementation-plan.md)
- [`docs/golden-examples`](./docs/golden-examples)

`examples/hello-shapes.ts` is the first runnable vertical slice of that contract. The remaining golden examples continue to define upcoming milestones.
