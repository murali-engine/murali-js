# Venu authoring ergonomics

Status: active implementation contract. `examples/hello-shapes.ts` implements the first vertical slice, including local-time clip composition; later golden examples may not compile until their corresponding milestones are complete.

## Product direction

Full determinism is the first priority. Code-first authoring and the web are how scenes are built. Neither one relaxes the rule: the picture at time `t` is fixed by the scene and `t`. The same scene, sampled in any order or rendered again, produces the same frames.

Manim and Murali are the baseline for that model. Venu keeps code-first scenes, semantic objects, and a timeline that can be sampled at any virtual time and exported frame by frame. Authoring records the schedule. It does not play a wall clock.

The web changes what a scene may contain, not how time works. Construction is not limited to the objects Venu implements. Anything the browser can draw can be in a scene, provided its visible state is a function of scene time. Built-in shapes cover the baseline. DOM, CSS, React, and other browser content enter the same timeline without a new engine primitive. They do not bring their own clock.

```text
Scene → anything the web can draw → Timeline → play → preview or export
```

CSS is a first-class styling and transformation language, not an implementation detail hidden behind a narrow wrapper. It is sampled at scene time. It is not left running on the browser clock.

## Principles

1. Determinism comes first. A frame is a pure function of the scene and virtual time. Sampling in any order, or rendering again, produces the same frames. Web content participates only through that function: no wall clock, no unseeded randomness, and no browser animation running on its own.
2. The scene is the source of truth for objects, time, frame, camera, and authored state.
3. Built-in objects are a baseline, not a boundary. Any web content can enter a scene when its picture stays deterministic. The timeline still addresses that content as a scene object, not as frame numbers.
4. Builder APIs read in the order people think: target, start, duration, easing, action.
5. Scene composition uses resolution-independent world coordinates.
6. DOM and React content may use ordinary CSS pixels internally.
7. CSS remains directly available for gradients, filters, masks, typography, layout, blend modes, and custom properties.
8. Simple narrative scenes should be concise; explicit timelines remain available for precise choreography.
9. Renderer, browser, capture, and encoder details do not leak into scene construction.
10. The engine owns time, world placement, sampling, and export. It does not own every visual. A lesson, sentence, or look can be ordinary web content in the scene. It does not need a new built-in before it can render.

## Target scene shape

```ts
import { Circle, Label, Scene, clip, render, timeline } from "venu";

class MotionBasics extends Scene {
  construct() {
    const title = this.add(
      Label("Motion Basics")
        .height(0.38)
        .color("white"),
    );

    this.toEdge(title, "up", { margin: 0.8 });

    const circle = this.add(
      Circle()
        .radius(0.7)
        .fill("#22c55e")
        .stroke({ width: 0.04, color: "white" })
        .css({ filter: "drop-shadow(0 12px 30px rgb(34 197 94 / 30%))" }),
      { at: [-4, 0, 0] },
    );

    const introduction = clip((local) => {
      local.animate(title).duration(1).ease("linear").typewrite();
      local.animate(circle).at(0.4).duration(2).ease("inOutQuad").moveTo([3, 0, 0]);
    });

    this.play(timeline().then(introduction));
  }
}

render(import.meta.url, MotionBasics);
```

## Builder rules

### Visual builders

Visual constructors return mutable authoring builders until added to a scene.

```ts
Circle()
  .radius(0.7)
  .fill("#22c55e")
  .stroke({ width: 0.04, color: "white" })
  .css({ mixBlendMode: "screen" });
```

All visual objects have a complete 3D transform. The concise 2D builders map directly onto it: `at([x, y])` uses `z = 0`, `rotate(degrees)` rotates around Z, and `scale(value)` applies uniform XYZ scale. Explicit 3D authoring uses vectors in degrees and world units:

```ts
Rectangle()
  .position([2, 1, -3])
  .rotation3D([20, 45, 0])
  .scale3D([1, 1.5, 0.75]);
```

The same state is available through deterministic animation builders:

```ts
local.animate(card).duration(2).positionTo([0, 1, 2]);
local.animate(card).duration(2).rotate3DTo([0, 180, 0]);
local.animate(card).duration(2).scale3DTo([1.2, 1.2, 1.2]);
```

Group children retain local transforms and inherit the complete parent matrix. Authored layout bounds use the object's transformed XY footprint; camera projection is applied later by the renderer.

Shared visual builders include `at`, `scale`, `rotate`, `opacity`, `visible`, `layer`, `className`, `css`, and `cssVar`. Type-specific builders remain on the relevant object.

`css()` accepts typed CSS data and merges repeated calls. `cssVar()` adds a custom property:

```ts
Circle()
  .css({ filter: "blur(0px)", mixBlendMode: "screen" })
  .cssVar("--accent", "#22c55e");
```

### Animation builders

Animation builders use the grammar:

```text
animate(target) → at(time) → duration(seconds) → ease(curve) → terminal verb
```

Terminal verbs register an immutable animation specification immediately. JavaScript authoring does not require Murali's Rust-era `.spawn()` commit step.

```ts
timeline
  .animate(circle)
  .at(1)
  .duration(2)
  .ease("outCubic")
  .moveTo([3, 0, 0]);
```

Common terminal verbs:

- `moveTo`, `moveBy`
- `scaleTo`, `rotateTo`
- `fadeTo`, `appear`, `disappear`
- `draw`, `undraw`
- `typewrite`, `untypewrite`, `revealText`
- `setColor`, `setStyle`
- semantic operations such as `morphFrom`, `writeTable`, or `focusStage`

Pass an ordered array to animate several objects with one specification. `stagger()` offsets each target's start time while preserving input order:

```ts
local
  .animate([square, circle, rectangle, polygon])
  .at(0.5)
  .stagger(0.15)
  .duration(0.8)
  .ease("outCubic")
  .appear();
```

Here the objects start at `0.5`, `0.65`, `0.8`, and `0.95` seconds. The last animation's end contributes to the containing clip's duration. Multi-target animation supports shared movement, scale, rotation, opacity, color, CSS style, and reveal verbs. Semantic reveal verbs validate every target before adding any schedule entries.

Reveal verbs are capability-aware. `typewrite`, `untypewrite`, and `revealText` operate on text Tattvas using grapheme clusters. `draw` and `undraw` operate on SVG-backed path Tattvas. Applying a reveal verb to an incompatible object produces an authoring error instead of silently falling back to opacity.

### Clips and scene sequencing

`clip()` authors a reusable section in local time starting at zero. `timeline()` flattens those sections onto the scene's one global clock. Clips do not have independent runtime clocks.

```ts
const introduction = clip((local) => {
  local.animate(title).duration(0.8).appear();
  local.animate(circle).at(0.2).duration(1.2).ease("inOutQuad").moveTo([3, 0]);
});

const explanation = clip((local) => {
  local.animate(label).duration(1).typewrite();
});

this.play(
  timeline()
    .then(introduction)
    .overlap(explanation, { by: 0.3 }),
);
```

Composition methods have distinct timing behavior:

- `then(clip)` places the clip at the composition cursor and advances by its duration.
- `overlap(clip)` places the clip at the start of the latest sequential group.
- `overlap(clip, { by: seconds })` starts it before the current cursor by that amount.
- `add(clip, { at: seconds })` uses an explicit global or enclosing-clip time without moving the cursor.
- `wait(seconds)` advances the composition cursor without adding animations.

Clips may contain other clips and may be placed more than once. Composition copies and offsets their schedules without modifying the source clip. `Scene.play(timeline)` then appends the completed global timeline after the scene cursor; `Scene.wait()` advances that scene cursor between played timelines.

## Coordinates and frames

Scene placement uses a right-handed logical world space with positive Y upward. CSS inside a DOM or React object retains normal browser coordinates.

Default logical frames:

| Frame | Aspect | Logical bounds |
| --- | --- | --- |
| landscape | 16:9 | X `-8…8`, Y `-4.5…4.5` |
| portrait | 9:16 | X `-4.5…4.5`, Y `-8…8` |
| square | 1:1 | X `-8…8`, Y `-8…8` |

Output resolution changes pixel quality, not composition.

## CSS boundary

Every DOM-backed visual uses two layers:

```html
<div class="venu-transform">
  <div class="venu-content"></div>
</div>
```

Venu owns the outer transform wrapper and composes translation, rotation, scale, opacity, and layer there. Authors own the inner content and may apply arbitrary CSS—including `transform`—without replacing scene placement.

CSS can be animated through the same timeline grammar:

```ts
timeline
  .animate(card)
  .at(0.4)
  .duration(1.2)
  .ease("outCubic")
  .setStyle({ filter: "blur(0px)", borderRadius: "32px" });
```

Venu deterministically interpolates numbers, compatible numeric CSS functions, lengths with matching structure, standalone hex colors, and custom properties with compatible numeric values. Incompatible or discrete values retain their starting value and switch when the animation completes.

## Layout

Layout is scene-aware because it depends on frame bounds and relationships between objects.

```ts
scene.toEdge(title, "up", { margin: 0.8 });
scene.nextTo(label, circle, "right", { gap: 0.4 });
scene.alignTo(label, circle, "left");

const row = HStack([a, b, c], { gap: 0.4 });
const column = VStack([x, y, z], { gap: 0.25 });
const group = Group([row, column]);
```

Geometric primitives provide authored bounds. DOM and React visuals may require a browser measurement pass before relational layout resolves.

`Group`, `HStack`, and `VStack` are real parent nodes. Parent movement, rotation, scale, opacity, and CSS affect their complete child subtree while child positions remain local to the group. Core shapes and labels currently use authored bounds; browser-measured bounds for arbitrary DOM and React content remain future work.

## Output and configuration

A scene stays in one executable file:

```ts
render(import.meta.url, MyScene, { fps: 60 });
```

Configuration discovery walks upward from the scene file and uses the nearest `murali.json`. Precedence is:

```text
render call overrides → environment → nearest murali.json → engine defaults
```

Environment variables are intended for environment-specific overrides. Stable project settings belong in `murali.json`.

## Built-in 3D camera

Every `Scene` owns deterministic camera state and defaults to an orthographic view matching its logical frame. Existing 2D content therefore lives on the `z = 0` plane without requiring camera setup. Perspective scenes configure the same scene camera used by DOM, SVG, React, and Three.js roots:

```ts
this.camera
  .perspective({ fov: 42, near: 0.1, far: 100 })
  .position([-5, 3, 9])
  .lookAt([0, 0, 0]);

const world = this.add(
  new ThreeTattva({ setup({ scene }) { /* add Three.js objects */ } }),
);

timeline.animateCamera(this.camera)
  .duration(2)
  .ease("inOutCubic")
  .frameTo([4, 2.5, 7], [0, 0, 0]);

timeline.animateCamera(this.camera)
  .at(2)
  .duration(2)
  .orbitTo({ azimuth: -30, elevation: 18, radius: 7 });
```

Perspective and orthographic projections are built in. Root DOM-family objects are projected as world-space planes; nested children retain local transforms. Three.js surfaces remain viewports and render their geometry through the scene camera. Camera terminal verbs include `frameTo`, `moveTo`, `lookAt`, `orbitTo`, `zoomTo`, `fovTo`, and `viewHeightTo`. Camera values are ordinary deterministic scene state, so preview scrubbing and exported frames resolve the same viewpoint.

Static camera configuration includes `position`, `lookAt`, `up`, `fov`, `viewHeight`, `viewWidth`, `clipping`, `zoom`, `zoomIn`, and `zoomOut`. Camera geometry helpers include `forward()`, `right()`, and `frameBoundsAtZ(z)`. Scene edge layout uses those plane bounds, including under perspective projection.

World objects participate in camera projection and clipping by default. Titles and UI that must remain fixed to the output frame opt into overlay depth:

```ts
const title = Label("Fixed title")
  .depthMode("overlay")
  .layer(1000);
scene.toEdge(title, "up");
```

Projection mode is configured immediately with `perspective()` or `orthographic()`; it is not interpolated as a discrete timeline value. Animate numeric camera properties instead. DOM planes and WebGL geometry use the same camera but remain separate browser compositing surfaces, so they cannot geometrically intersect across that boundary.

## Compatibility stance

Feature parity means equivalent semantic capability, timing, and composition—not identical internals. Browser-native CSS may intentionally produce a better implementation than the original GPU path. Every deliberate difference must be documented in the parity ledger.
