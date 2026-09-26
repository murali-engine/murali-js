# Venu

Venu is a deterministic, code-first animation engine inspired by Manim. A scene is ordinary TypeScript that can combine DOM, React, and Three.js content on one timeline, then render that timeline frame-by-frame to an MP4.

## Quick start

```bash
npm install
npx playwright install chromium
npm run example
```

The rendered video is written to `output/hello.mp4`.

To render a specific example, pass its short name:

```bash
npm run example -- react-card
npm run example -- three-camera
```

Each video is written to `output/<name>.mp4`. See every available example with:

```bash
npm run example -- --list
```

## A scene

```ts
import { FadeIn, Move, Scale, Scene, Text } from "../src/index.ts";

export default class HelloScene extends Scene {
  override construct() {
    const title = this.add(Text("Hello, Venu", { style: { color: "#f8fafc" } }));
    this.play(FadeIn(title), Move(title, { y: -36 }), Scale(title, 1.08));
    this.wait(0.5);
  }
}
```

`construct()` records the full timeline synchronously. No wall-clock animation occurs while authoring. During rendering, `sampleAt(t)` computes the exact state for every object at virtual time `t`, making repeated renders reproducible.

## Commands

```bash
npm run example -- hello
npm run example -- react-card
npm run example -- three-camera
npm run render -- examples/hello-scene.ts -o output/hello.mp4 --fps 30
npm run typecheck
npm test
```

## Architecture

- `src/core` contains objects, animations, easing, interpolation, and the deterministic scene timeline.
- `src/render` bundles a scene for the browser, mounts DOM/React/Three.js objects, captures exact frames in Chromium, and streams them into ffmpeg.
- `src/mobjects` contains convenient shape and text constructors.
- `examples` demonstrates the public API.
- `python` is an optional offline data generator for animation-ready neural-network state.

The core has no dependency on Chromium, esbuild, or ffmpeg; those concerns stay inside `src/render`.
