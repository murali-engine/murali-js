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

To visually review the complete example collection, run:

```bash
cd examples
npm run preview:all
```

Examples play sequentially in real time. Each preview closes two seconds after its first playback finishes, then the next window opens. Change the hold time, filter the list, or resume from a named example:

```bash
npm run preview:all -- --delay 4
npm run preview:all -- --match maths/linear-algebra
npm run preview:all -- --from maths/linear-algebra/03-matrix-as-linear-map
npm run preview:all -- --skip 20
```

From the repository root, use `npm run preview:all --workspace @murali-js/examples`; options still follow the final `--`.

Every preview prints its stable one-based gallery index. Use `--skip N` to omit the first N examples and resume numerically; when combined with `--match`, the count applies after filtering. `--skip` and `--from` are alternative ways to choose the starting point and cannot be combined.

The runner continues after a broken example and reports failures at the end; add `--stop-on-error` to stop immediately. `--headless` is available for automated smoke runs. Supporting TypeScript modules under `examples/assets` and `examples/data` are excluded from discovery.

## Use Murali JS as a package

Define and render the animation from one entry point:

```ts
// hello.ts
import { render } from "murali-js";
import { Scene, clip, timeline } from "murali-js/core";
import { Circle } from "murali-js/primitives";
import { Label } from "murali-js/text";

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

The package root above remains a compatibility prelude. For larger scenes, category imports make ownership and autocomplete clearer:

```ts
import { Scene, clip, timeline } from "murali-js/core";
import { Circle } from "murali-js/primitives";
import { Label } from "murali-js/text";
import { render } from "murali-js";
```

Available domains include `core`, `style`, `adapters`, `layout`, `primitives`, `text`, `maths`, `ai`, `composite`, `storytelling`, `table`, `utility`, and the Node-only `render` pipeline. See [`docs/code-organization.md`](./docs/code-organization.md).

Murali JS displays frame progress by default while rendering. Disable it for scripts or CI with `render(import.meta.url, HelloScene, { progress: false })`, or provide `onProgress(completed, total)` for custom reporting.

### Frame formats and transparent exports

Murali has three resolution-independent frame presets. Landscape uses a logical `16 x 9` world, portrait uses `9 x 16`, and square uses `9 x 9`. Square coordinates therefore run from `-4.5` to `4.5` on both axes, regardless of the output pixel resolution:

```ts
class SquareScene extends Scene {
  constructor() {
    super({ frame: "square", width: 1200, height: 1200 });
  }

  override construct() {
    // The visible logical bounds are X/Y -4.5…4.5.
  }
}
```

To export an exact scene time as a PNG with an alpha channel, choose a `.png` output and set `transparent: true`. This deliberately removes the scene background at export time, so the scene does not need to use `background: "transparent"`:

```ts
render(import.meta.url, SquareScene, {
  output: "./output/square-mark.png",
  at: 1.5,
  transparent: true,
});
```

The equivalent CLI command is `murali render square-scene.ts -o output/square-mark.png --at 1.5 --transparent`. Project configuration accepts `render.transparent` and `render.at`; the matching environment variables are `MURALI_TRANSPARENT` and `MURALI_AT`.

Transparent video uses WebM with VP9 alpha:

```ts
render(import.meta.url, SquareScene, {
  output: "./output/square-mark.webm",
  transparent: true,
});
```

Ordinary video remains MP4/H.264. WebM is deliberately reserved for `transparent: true`, and transparent MP4 is rejected because the normal MP4 path has no alpha channel. When no output path is provided, enabling transparency chooses a `.webm` path automatically. The CLI equivalent is `murali render square-scene.ts --transparent`; add `-o output/square-mark.webm` to choose its location.

### Murali logo assets

The canonical logo is `MuraliLogoMark`: three touching blue, violet, and coral ovals with no text or outline. [`examples/murali-logo-image.ts`](./examples/murali-logo-image.ts) always exports two square PNGs in one run: `murali-logo-background.png` using the supplied background color, and `murali-logo-transparent.png` with alpha. It uses the warm brand background by default:

```bash
cd examples
npx tsx murali-logo-image.ts
npx tsx murali-logo-image.ts -- --background "#071426"
```

Choose another destination directory when needed:

```bash
npx tsx murali-logo-image.ts -- \
  --background "#071426" \
  --output-dir ./output/brand
```

### Reusable Murali logo animation

`MuraliLogoSequence` turns the canonical three-oval mark into a complete, seamless brand gesture: one oval breathes, splits into three, compresses on contact, separates, settles into the logo, and folds back into one oval.

```ts
import { MuraliLogoMark, MuraliLogoSequence } from "murali-js/composite";

const mark = this.add(MuraliLogoMark({ width: 6.6 }));
this.play(MuraliLogoSequence(mark));
```

The default duration is 6.4 seconds. Pass `{ duration: 4 }` to retime the whole gesture without changing its relative choreography.

`MuraliLogoSwell` keeps the settled mark and lets one phrase disturb it. Each oval grows from the shared baseline, narrows by `1 / sqrt(height)` so it stays plump, and springs back past rest. Left takes the low swell, the middle a smaller nudge, and the right a short transient. [`examples/murali-logo-animation.ts`](./examples/murali-logo-animation.ts) renders that phrase to `murali-logo-animation.webm` with VP9 alpha.

### Themes and the system palette

Scenes accept typed semantic themes. Built-in Tattvas inherit the scene theme, a `Group` can override a subtree, and explicit object styles continue to win:

```ts
import { Scene } from "murali-js/core";
import { Group } from "murali-js/layout";
import { Circle } from "murali-js/primitives";
import { createTheme, themeColor, themes } from "murali-js/style";
import { Label } from "murali-js/text";

const kavriq = createTheme(themes.dark, {
  name: "kavriq",
  colors: {
    background: "#050513",
    textPrimary: "#fffaf0",
    accent: "#52d8ff",
    accentAlt: "#a78bfa",
  },
});

class ThemedScene extends Scene {
  constructor() {
    super({ theme: kavriq });
  }

  override construct() {
    this.add(Label("Inherited title"));
    this.add(Circle().fill(themeColor("positive")));
    this.add(Group([Label("Scoped"), Circle()]).theme({
      colors: { accent: "#ff5d8f" },
    }));
  }
}
```

The same resolved theme is exposed as `--murali-*` CSS variables and passed into React and Three.js render contexts. `useMuraliTheme()` is available inside custom React components.

Fixed Murali/Manim swatches now live under `palette` rather than as top-level exports:

```ts
import { palette } from "murali-js/style";

Circle().fill(palette.TEAL_C);
```

Use semantic roles for reusable components and `palette` when a particular swatch is intentionally part of the artwork. See [`examples/theme-system.ts`](./examples/theme-system.ts) and [`docs/themes.md`](./docs/themes.md).

### Semantic neural networks

`neuralNetwork` models named layers, stable node and edge IDs, dense weight matrices, or explicit sparse/skip connections. `NeuralNetwork` renders that model with theme-aware activation and signed-weight encodings. Cumulative snapshots interpolate values and activations through ordinary timeline state, while `flowProgress` propagates over unique edges without enumerating every end-to-end route.

See [`examples/ai/neural-networks.ts`](./examples/ai/neural-networks.ts) and [`docs/neural-networks.md`](./docs/neural-networks.md).

### Semantic matrices

`Matrix` keeps rows, columns, cells, and diagonals addressable instead of exposing only rendered text. Selections compose with `union`, `intersect`, and `except`, and timeline focus transitions interpolate every cell from the preceding semantic state:

```ts
const matrix = Matrix([
  ["2", "-1", "0"],
  ["-1", "2", "-1"],
  ["0", "-1", "2"],
]).cellHeight(0.44);

this.add(matrix);

const timeline = new Timeline();
timeline.animate(matrix).at(0).duration(0.8).focus(matrix.row(1), {
  color: palette.TEAL_C,
  dim: 0.28,
});
timeline.animate(matrix).at(1).duration(0.8).focus(matrix.column(1), {
  color: palette.BLUE_B,
});
timeline.animate(matrix).at(2).duration(0.8).focus(matrix.diagonal(), {
  color: palette.GOLD_C,
});
timeline.animate(matrix).at(3).duration(0.3).clearFocus();
this.play(timeline);
```

Available selectors include `row`, `column`, `cell`, `cells`, `diagonal`, `antiDiagonal`, and `where`. Consecutive focus animations crossfade directly—there is no neutral reset between selections. See [`examples/equation-and-matrix-animation.ts`](./examples/equation-and-matrix-animation.ts).

### Animated linear algebra

`BasisExplorer2D`, `ProjectionDiagram2D`, and `LinearMap2D` keep the mathematical inputs in timeline state. Their grids, vectors, projections, coordinates, areas, and readouts are therefore recomputed on every sampled frame instead of being assembled as static illustrations:

```ts
const map = LinearMap2D()
  .vector([1.45, 1.05], "x")
  .unitSquare();

this.add(map);
this.play(timeline((local) =>
  local.animate(map).duration(2.4).ease("inOutCubic").to(
    map.matrixState([1.45, 0.38], [-0.52, 1.18]),
  )
));
```

The curated [`examples/maths/linear-algebra/`](./examples/maths/linear-algebra/) suite uses these primitives to tell five short visual stories: vectors and basis, dot product and projection, matrices as maps and column combinations, determinant and oriented area, and transform order. It replaces ten older static parity scenes without removing their reusable library APIs.

### Fonts and persistent branding

System fonts can be selected directly on a label:

```ts
Label("Editorial title").font("Georgia, serif");
```

For a local TTF, OTF, WOFF, or WOFF2 file, declare the face with a literal source-relative path, register it on the scene, and select it per label or through a theme:

```ts
const satoshi = fontFile(
  "Satoshi",
  "../assets/fonts/private/Satoshi-Bold.ttf",
  { weight: 700 },
);

override construct(): void {
  this.registerFont(satoshi);
  this.add(
    Label("KAVRIQ")
      .font(satoshi, "Inter", "ui-sans-serif", "sans-serif")
      .fontWeight(700),
  );
}
```

Murali embeds registered local fonts into preview and export, waits for them before exposing the first frame, and falls back cleanly when an optional private file is absent. `fontUrl(...)` supports browser-loadable URLs and data URLs. File declarations currently need to appear directly in the entry scene as `fontFile(..., "literal/path.ttf")` so the bundler can discover them.

Use `addBranding()` for a visual that remains in the camera-independent overlay throughout the scene:

```ts
const mark = Label("KAVRIQ").height(0.22).opacity(0.72);
this.addBranding(mark, {
  position: "bottomRight",
  margin: 0.4,
});
```

The brand may be any Tattva or `Group`, not only text. Positions include all four corners plus `top` and `bottom`; an explicit `at` point is also supported. See [`examples/branding-and-fonts.ts`](./examples/branding-and-fonts.ts).

The private Satoshi file has been copied to `assets/fonts/private/Satoshi-Bold.ttf` for local use. That directory is Git-ignored and excluded from package publication; see [`assets/fonts/README.md`](./assets/fonts/README.md).

### Shape writing

Solid-filled shapes use geometry-aware writing. During `.draw()`, Murali closes the boundary portion already written into a temporary polygon and fills only that region; `.undraw()` contracts the same region in reverse. The complete fill is used only once the boundary is complete. This applies to built-in shapes, `VectorShape` compound paths and holes, and explicitly filled `Path` objects.

### Shape morphing

`ShapeMorph` normalizes two or more closed shape keyframes into aligned contours. The geometry, solid fill color, stroke color, and stroke width interpolate from virtual scene time:

```ts
const mark = ShapeMorph(
  Circle().radius(1).fill(palette.TEAL_C),
  Rectangle().size([3, 2]).cornerRadius(0.3).fill(palette.PURPLE_B),
  Polygon.regular(3).radius(1.4).fill(palette.GOLD_C),
);

this.add(mark);
this.play(timeline((local) =>
  local.animate(mark).duration(1.2).ease("inOutCubic").morphTo(1)
));
```

Stages are zero-based and may be revisited in any order. `Circle`, `Ellipse`, `Rectangle` (including rounded corners), `Square`, regular `Polygon`, and arbitrary closed `VectorShape` SVG paths are supported. Paths are converted to cubic Bézier contours; compound paths and holes use even-odd filling, missing contours collapse deterministically, and curve counts, winding, and cyclic start points are aligned before interpolation:

```ts
const icon = VectorShape(
  "M 0 -2 C 1.5 -1 2 0 2 1 A 2 2 0 1 1 -2 1 C -2 0 -1.5 -1 0 -2 Z",
  { viewBox: { x: -2.5, y: -2.5, width: 5, height: 5 } },
);
```

SVG commands `M`, `L`, `H`, `V`, `C`, `S`, `Q`, `T`, `A`, and `Z`, including relative forms, are accepted. Shape morphing remains separate from semantic text and formula matching. See [`examples/shape-morphing.ts`](./examples/shape-morphing.ts).

### Matching text and formulas

`TextMorph` keeps matching words or graphemes alive while their positions change. Unequal source and target lengths are supported; unmatched tokens fade or scale in and out:

```ts
const heading = TextMorph("Shape morphing", "Text morphing", "Formula morphing")
  .matchBy("word")
  .height(0.7)
  .unmatched("scale");

this.add(heading);
this.play(timeline((local) => local.animate(heading).duration(1.2).morphTo(1)));
```

`FormulaMorph` parses a deterministic TeX-like subset into nested rows, powers, subscripts, fractions, and square roots. Identical mathematical tokens persist and move rather than cross-fading the complete formula:

```ts
const equation = FormulaMorph(
  String.raw`a^2 + b^2 = c^2`,
  String.raw`c = \sqrt{a^2 + b^2}`,
).height(0.9);

this.add(equation);
this.play(timeline((local) => local.animate(equation).duration(1.6).morphTo(1)));
```

Use `.matchingKeys(stage)` to inspect the available semantic keys and `.match({ "source-key": "target-key" })` when an intentional mismatch should correspond. This lightweight formula layer is structural and browser-native. See [`examples/text-and-formula-morphing.ts`](./examples/text-and-formula-morphing.ts). Use the native path below when the authentic TeX layout and glyph outlines matter.

For native LaTeX typesetting, use `Latex`; for real outline morphing, use `LatexMorph`. The render bundler runs `latex` and `dvisvgm`, embeds the resulting vector glyphs, preserves identical glyphs by outline signature, and can interpolate unmatched compatible outlines as normalized cubic Bézier contours:

```ts
const identity = Latex(String.raw`e^{i\pi}+1=0`).height(0.9);
const equation = LatexMorph(
  String.raw`(a+b)^2`,
  String.raw`a^2 + 2ab + b^2`,
  String.raw`c = \sqrt{a^2+b^2}`,
).height(1.2).color(palette.GOLD_C);

this.add(equation);
this.play(timeline((local) =>
  local.animate(equation).duration(1.8).ease("inOutCubic").morphTo(1)
));

const piContour = FormulaOutline(String.raw`\pi`)
  .height(2.65)
  .samplePoints(760);
```

`FormulaOutline` exposes the same authentic glyph geometry as uniformly spaced world-coordinate samples. Use `.samplePoints(count)` for one-contour glyphs such as `\pi`, or `.sampleContours(totalPoints)` when a formula contains several glyphs or holes. This makes typeset outlines reusable by Fourier, particle, path, and procedural-geometry systems without coupling those systems to TeX.

Formulas must currently be string literals passed directly to `Latex`, `LatexMorph`, or `FormulaOutline`, so they can be discovered before the browser bundle is built. The machine rendering or previewing the scene needs `latex` and `dvisvgm`; shell escape is disabled. By default, exact shapes move and unmatched glyphs fade/scale, mirroring Manim's conservative matching behavior. Enable `.shapeMismatches(true)` only when different glyphs should genuinely reshape through their Bézier outlines. See [`examples/latex-vector-morphing.ts`](./examples/latex-vector-morphing.ts) and [`examples/fourier-formula-trace.ts`](./examples/fourier-formula-trace.ts).

### Deterministic per-frame updaters

Use a targeted updater when one visual derives from another visual's fully animated state. This coordinate readout follows a moving ball and changes its text at every sampled scene time:

```ts
const ball = this.add(Circle().radius(0.4), { at: [-5, 0, 0] });
const coordinates = this.add(
  Label("x=-5.00, y=0.00")
    .height(0.22)
    .reserveText("x=-00.00, y=-00.00"),
);

const handle = this.addUpdater(ball, ({ state, stateOf }) => {
  const label = stateOf(coordinates);
  if (!label) return;

  label.x = state.x;
  label.y = state.y + 0.7;
  label.text = `x=${state.x.toFixed(2)}, y=${state.y.toFixed(2)}`;
});
```

`state` is the target's sampled state after ordinary timeline animation. `stateOf(other)` preserves the other Tattva's state type, so `LabelState.text` is available without casting. `reserveText()` gives changing text stable authored layout bounds.

An updater can be active only within a virtual-time interval:

```ts
this.addUpdater(ball, updateCoordinates, { from: 1, until: 5 });
```

Outside that interval the frame starts from ordinary authored/timeline state, as it does for every deterministic sample. Registration can be removed during scene authoring with `removeUpdater(handle)`, `removeUpdatersFor(ball)`, or `clearUpdaters()`. The original global `updater((time, states) => ...)` remains available for relationships without one natural target.

Updaters must derive output from `time` and the provided sampled states. Do not increment from a previous frame or depend on wall-clock time: preview scrubbing and export may request frames in any order. See [`examples/updater-coordinate-readout.ts`](./examples/updater-coordinate-readout.ts).

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

### Scene-authored screenshots and GIFs

A scene can declare exact virtual times to export alongside its main video or PNG:

```ts
override construct(): void {
  // Build the scene and its timeline first.
  this.wait(4);

  this.captureScreenshotsNamed([
    [0, "captures/opening.png"],
    [2.5, "captures/turn.png"],
  ]);
  this.captureScreenshots([4]);

  // Arbitrary sampled moments, played at the effective render FPS.
  this.captureGif("highlights", [0.5, 1.4, 2.8, 4]);

  // Every frame in an inclusive range, sampled and played at 12 FPS.
  this.captureGifRange("full-motion", { from: 1, to: 3, fps: 12 });
}
```

Named relative screenshots resolve from the main output's directory. Unnamed screenshots are written as `captures/capture_00000.png`; GIFs are written as `gifs/<name>.gif` and loop continuously. Absolute screenshot paths are also accepted. Capture times must lie within the completed scene duration.

These artifacts are generated during an export, not during interactive preview. They use the same resolution, transparency setting, deterministic browser renderer, and exact-time sampling as the main output. [`examples/capture-markers.ts`](./examples/capture-markers.ts) is a runnable example.

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

### YouTube subscribe end cards

`YouTubeSubscribe()` creates a reusable overlay CTA with wide video and compact Shorts layouts. Its typed subscribe and bell states can be animated manually, or with the ready-made deterministic sequence:

```ts
const subscribe = this.add(
  YouTubeSubscribe("Kavriq", {
    handle: "@kavriq",
    message: "More visual stories every week",
  }),
  { at: [0, -2.4, 0] },
);

this.play(YouTubeSubscribeSequence(subscribe));
```

Use `.compact()` for a portrait/Shorts composition and `.wide()` for landscape. The component defaults to overlay mode, but supports `.depthMode("world")` like other Tattvas. See [`examples/youtube-subscribe.ts`](./examples/youtube-subscribe.ts) and [`examples/youtube-subscribe-short.ts`](./examples/youtube-subscribe-short.ts).

### Celebration fireworks

`Fireworks()` adds a deterministic, continuously looping celebration layer with rising rockets, glowing bursts, particle trails, and gravity:

```ts
const fireworks = this.add(
  Fireworks()
    .fit(this)
    .burstCount(7)
    .particlesPerBurst(46)
    .cycleDuration(5.2)
    .spread(2.25)
    .gravity(1.35)
    .glow(1)
    .palette(["#ffcc33", "#ff5d8f", "#52d8ff"])
    .seed(27),
);

timeline.animate(fireworks).duration(0.4).appear();
timeline.animate(fireworks).at(4.5).duration(0.5).disappear();
```

`.fit(this)` covers the current scene's exact logical viewport, whether it is landscape, portrait, square, or a custom frame. Alternatively use `Fireworks({ layout: "portrait" })`, `.landscape()`, `.portrait()`, or `.square()` explicitly. The effect defaults to overlay mode, so it works over both 2D and 3D scenes; use `.depthMode("world")` when the fireworks should participate in scene depth. The seed makes every render repeatable while time drives the launch-and-burst loop. See [`examples/celebration-fireworks.ts`](./examples/celebration-fireworks.ts) and [`examples/celebration-fireworks-short.ts`](./examples/celebration-fireworks-short.ts).

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
}).gap(1.45).signalColor(palette.TEAL_C);

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
  .palette([palette.TEAL_C, palette.BLUE_B, palette.GOLD_C])
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
npm run example -- style-and-paths
npm run example -- react-card
npm run example -- three-camera
npm run example -- text-3d
npm run example -- wave-mesh-background
npm run example -- celebration-fireworks
npm run example -- celebration-fireworks-short
npm run example -- theme-system
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

Murali JS represents the lessons from all 51 Murali examples in 45 runnable scenes; ten static linear-algebra ports became five animated stories, and the separate GLB/glTF demonstrations became one format-comparison scene. Example coverage is not the same as complete Rust API parity. A source-level Rust gap audit and the still-unprioritized candidate set are recorded in [`docs/feature-parity.md`](./docs/feature-parity.md#rust-capability-audit-29-september-2026) and [`docs/roadmap.md`](./docs/roadmap.md#rust-parity-audit-snapshot). The next planning step is to rank those gaps alongside web-native investments before changing the roadmap order.
