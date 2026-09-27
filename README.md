# Murali JS

Murali JS is a fully deterministic video tool. That is the first priority. It is also code-first and built on the web, and neither of those changes the rule: the same scene always produces the same frames.

Manim and Murali are the baseline. A scene is ordinary code, objects sit in a world, and a timeline samples them at a virtual time. Rendering seeks that time. It does not play a wall clock.

The web is why scene construction is not limited to the built-in library. The shapes Murali JS ships are conveniences. If the browser can draw it — DOM, CSS, React, another web library, or Three.js — it can be in the scene, on that same timeline, and rendered frame-by-frame to an MP4. Web content is allowed only when its picture is a function of scene time.

## Quick start

```bash
npm install
npm run example -- hello-shapes
```

The rendered video is written to `examples/output/hello-shapes.mp4`.
Pass `--preview` to open the scene in a window instead. Nothing is encoded. Playback seeks the same timeline the exporter uses. Close the window, then run the command again without `--preview` to write the MP4.

```bash
npm run example -- hello-shapes --preview
```
Murali JS depends on Playwright's Chromium package, so the compatible browser is downloaded during a normal npm installation. Set `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` before installing only when your environment manages browsers separately.
The local package is also compiled automatically during `npm install`, so files can be run directly from the examples directory with `npx tsx hello-shapes.ts`. Add `--preview` to open a window instead of exporting: `npx tsx hello-shapes.ts --preview`.

To render a specific example, pass its short name:

```bash
npm run example -- react-card
npm run example -- three-camera
npm run example -- css-3d-transforms
```

The `examples` directory is one consumer package, and each example is normally one file. A complex example can still use its own folder when needed. See every available example with:

```bash
npm run example -- --list
```

## Use Murali JS as a package

Define and render the animation from one entry point:

```ts
// hello.ts
import { Circle, Label, Scene, clip, render, timeline } from "murali-js";

class HelloScene extends Scene {
  override construct() {
    const title = this.add(Label("Hello, Murali JS").height(0.5).color("white"));
    this.toEdge(title, "up", { margin: 0.8 });

    const circle = this.add(
      Circle().radius(0.7).fill("#22c55e").stroke({ color: "white", width: 0.04 }),
      { at: [-4, 0] },
    );

    const introduction = clip((local) => {
      local.animate(title).duration(0.8).typewrite();
      local.animate(circle).at(0.4).duration(2).ease("inOutQuad").moveTo([3, 0]);
    });

    this.play(timeline().then(introduction));
  }
}

render(import.meta.url, HelloScene, {
  output: "./output/hello.mp4",
});
```

Run it with `npx tsx hello.ts`. `import.meta.url` identifies the current source file so Murali JS can bundle the scene for Chromium. The CLI remains available as an optional convenience.

Murali JS displays frame progress by default while rendering. Disable it for scripts or CI with `render(import.meta.url, HelloScene, { progress: false })`, or provide `onProgress(completed, total)` for custom reporting.

### Looping audio

Pass an audio path to loop it for the entire exported video and preview:

```ts
render(import.meta.url, HelloScene, {
  audio: "./assets/music.mp3",
});
```

Use the object form to control its active interval in scene seconds. With only `start`, it loops from that point until the video ends; with both values, it loops only inside that interval:

```ts
render(import.meta.url, HelloScene, {
  audio: {
    source: "./assets/music.mp3",
    start: 2.5,
    end: 11,
    volume: 0.35,
  },
});
```

`volume` is linear from `0` (silent) to `1` (the source level) and defaults to `1`. The audio is repeated and trimmed to the exact interval; it never changes the video duration. Relative paths resolve from the working directory. If the file is missing, Murali renders or previews the scene silently instead of failing. The CLI equivalents are `--audio`, `--audio-start`, `--audio-end`, and `--audio-volume`.

### Shared render configuration

Murali JS reads `murali.json` and `.env` from the working directory. Explicit options passed to `render()` have the highest priority, followed by environment settings, followed by `murali.json`.

```json
{
  "render": {
    "outputDir": "./output",
    "fps": 30
  }
}
```

Supported environment variables are `MURALI_FPS`, `MURALI_OUTPUT`, `MURALI_OUTPUT_DIR`, and `MURALI_PROGRESS`. Any individual scene can override them:

```ts
render(import.meta.url, HelloScene, {
  fps: 60,
  output: "./output/hello-60fps.mp4",
});
```

`construct()` records the full timeline synchronously. No wall-clock animation occurs while authoring. During rendering, `sampleAt(t)` computes the exact state for every object at virtual time `t`, making repeated renders reproducible.

### Vector-extruded 3D text

`Text3D` and `Letter3D` create real vector geometry with triangulated front and back faces, connected side walls, depth testing, and optional bevels:

```ts
const title = this.add(
  Text3D("MURALI")
    .height(2)
    .depth(0.7)
    .bevel({ enabled: true, thickness: 0.05, size: 0.03, segments: 3 })
    .material({ faceColor: "#fff9e8", sideColor: "#6b6357" })
    .rotation3D([15, -25, 0]),
);
```

A bundled vector font is used by default. Use `parseText3DFont()` for Three.js typeface JSON or `parseText3DTTF()` for raw TrueType bytes, then pass the result through `.font()`. See [`examples/text-3d.ts`](./examples/text-3d.ts).

### Animated wave meshes

`WaveMesh()` creates a deterministic glowing wire terrain for reusable lower-third and background compositions. Animate its typed `phase` state through the ordinary timeline; one phase unit is one seamless cycle:

```ts
const mesh = this.add(
  WaveMesh()
    .size(18, 8)
    .amplitude(1.1)
    .samples(61, 27)
    .palette({ near: "#f0a9ff", far: "#2637d4" })
    .farFade(0.45)
    .glowVariation(0.25),
  { at: [0, -2, 0] },
);

timeline.animate(mesh).duration(10).ease("linear").to({ phase: 2 });
```

The grid density, surface fill, nodes, sparkles, colors, far-depth fade, glow variation, and wave profile are configurable. Oversize and reposition the mesh to keep its side and front edges beyond the camera frustum. See [`examples/wave-mesh-background.ts`](./examples/wave-mesh-background.ts).

Animate an ordered collection with the same builder grammar and stagger their starts without manual timestamp arithmetic:

```ts
local
  .animate([square, circle, rectangle])
  .stagger(0.15)
  .duration(0.8)
  .ease("outCubic")
  .appear();
```

### Built-in 3D camera

Every scene owns a deterministic 3D camera. It defaults to an orthographic view matching the logical frame, so ordinary 2D scenes retain their expected composition on the `z = 0` plane. Switch the scene to perspective and animate the same camera when depth is needed:

```ts
this.camera
  .perspective({ fov: 42, near: 0.1, far: 100 })
  .position([-5, 3, 9])
  .lookAt([0, 0, 0]);

local.animateCamera(this.camera)
  .duration(2)
  .orbitTo({ azimuth: 30, elevation: 18, radius: 8 });
```

DOM, SVG, React, and Three.js roots consume this same sampled camera state. Supported camera animation verbs include `frameTo`, `moveTo`, `lookAt`, `orbitTo`, `zoomTo`, `fovTo`, and `viewHeightTo`. See [`examples/three-camera.ts`](./examples/three-camera.ts).

Camera configuration also includes `fov()`, `viewHeight()`, `viewWidth()`, `clipping()`, `zoom()`, `zoomIn()`, and `zoomOut()`. `forward()`, `right()`, and `frameBoundsAtZ()` expose deterministic camera geometry for layout. Objects use world depth by default; use `.depthMode("overlay")` for camera-independent titles or UI and `.layer()` for painter ordering inside that overlay.

Every visual also has complete XYZ transforms through `position()`, `rotation3D()`, and `scale3D()`, with matching `positionTo()`, `rotate3DTo()`, and `scale3DTo()` animation verbs. Existing `at()`, `rotate()`, and `scale()` remain concise 2D/uniform forms. See [`examples/css-3d-transforms.ts`](./examples/css-3d-transforms.ts).

### Stepwise stories

Define a narrative in the scene with stable step handles. Connections describe the diagram; the sequence describes the journey and may revisit a step:

```ts
const flow = Stepwise((story) => {
  const observe = story.step("Observe");
  const reason = story.step("Reason");
  const revise = story.step("Revise");

  story.connect(observe, reason);
  story.connect(reason, revise);
  story.connect(revise, reason).route("down", "left");
  story.sequence([observe, reason, revise, reason, revise]);
}).gap(1.45).signalColor(TEAL_C);

timeline.animate(flow).duration(2.8).to({ reveal: 1 });
timeline.animate(flow).at(3).duration(3).to({ signal: 1 });
```

If connections are omitted, Murali JS creates a linear chain. A cyclic graph must provide an explicit `sequence()`. See [`examples/stepwise-storytelling.ts`](./examples/stepwise-storytelling.ts).

### Word clouds

Word clouds use deterministic seeded placement and keep every word as an ordinary label, so the existing timeline API can animate them individually:

```ts
const cloud = this.add(WordCloud([
  { text: "Murali JS", weight: 100 },
  { text: "animation", weight: 80 },
  { text: "TypeScript", weight: 65 },
])
  .size([12, 6])
  .fontRange([0.22, 1.1])
  .palette([TEAL_C, BLUE_B, GOLD_C])
  .rotations([0, 0, 0, -90, 90])
  .shape("ellipse")
  .seed(2026));

timeline.animate(cloud.words)
  .stagger(0.05)
  .duration(0.5)
  .appear();
```

The builder also supports rectangular clouds, custom padding, font family, font weight, and per-word colors. See [`examples/word-cloud.ts`](./examples/word-cloud.ts).

## Commands

```bash
npm run example -- hello-shapes
npm run example -- hello-shapes --preview
npm run example -- layout-and-groups
npm run example -- text-and-paths
npm run example -- react-card
npm run example -- three-camera
npm run example -- text-3d
npm run example -- wave-mesh-background
npm run build
npm run typecheck
npm test
npm run test:package
```

`test:package` creates an npm tarball, installs it into a clean temporary project, and verifies both `"murali-js"` and `"murali-js/render"`. This catches missing build output and incorrect package exports before publishing.

## Architecture

- `src/core` contains Tattvas, timeline builders, easing, interpolation, frames, and deterministic scene sampling.
- `src/render` bundles a scene for the browser, mounts DOM/React/Three.js objects, captures exact frames in Chromium, and streams them into ffmpeg.
- `src/tattvas` contains concrete visual Tattvas, composite components, and domain-specific builders.
- `examples` is one standalone consumer package containing executable scene files.
- `python` is an optional offline data generator for animation-ready neural-network state.

The core has no dependency on Chromium, esbuild, or ffmpeg; those concerns stay inside `src/render`.

## Project documentation

- [`docs/ergonomics.md`](./docs/ergonomics.md) defines the intended authoring experience.
- [`docs/roadmap.md`](./docs/roadmap.md) is the single current plan and code-health summary.
- [`docs/feature-parity.md`](./docs/feature-parity.md) tracks capability evidence against Murali and Manim.
- [`docs/example-parity.md`](./docs/example-parity.md) tracks all 51 Murali reference examples.
- [`docs/golden-examples`](./docs/golden-examples) contains compact API-design examples.

Murali JS has runnable counterparts for all 51 Murali examples. The immediate priority is API stabilization, followed by package/runtime consistency, visual parity verification, and browser-measured DOM/React layout.
