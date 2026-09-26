# Venu authoring ergonomics

Status: active implementation contract. `examples/hello-shapes.ts` implements the first vertical slice; later golden examples may not compile until their corresponding milestones are complete.

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
import { Circle, Label, Scene, Timeline, render } from "venu";

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

    const timeline = new Timeline();
    timeline
      .animate(title)
      .at(0)
      .duration(1)
      .ease("linear")
      .typewrite();

    timeline
      .animate(circle)
      .at(0.4)
      .duration(2)
      .ease("inOutQuad")
      .moveTo([3, 0, 0]);

    this.play(timeline);
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

Reveal verbs are capability-aware. `typewrite`, `untypewrite`, and `revealText` operate on text Tattvas using grapheme clusters. `draw` and `undraw` operate on SVG-backed path Tattvas. Applying a reveal verb to an incompatible object produces an authoring error instead of silently falling back to opacity.

### Scene sequencing

`Scene.play(timeline)` appends a completed timeline after the current scene cursor. `Scene.wait` advances that cursor. A scene can therefore combine precise absolute choreography inside each timeline with readable sequential sections.

```ts
const entrance = new Timeline();
entrance.animate(title).duration(0.8).appear();
entrance.animate(circle).at(0.2).duration(1.2).ease("inOutQuad").moveTo([3, 0]);
this.play(entrance);
this.wait(0.5);
```

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

Each `ThreeTattva` owns deterministic camera state. Camera setup uses a fluent projection builder, and camera movement uses the same timeline grammar as every other animation:

```ts
const world = this.add(
  new ThreeTattva({ setup({ scene }) { /* add Three.js objects */ } })
    .camera(
      Camera3D.perspective({ fov: 42, near: 0.1, far: 100 })
        .position([-5, 3, 9])
        .lookAt([0, 0, 0]),
    ),
);

timeline.animateCamera(world)
  .duration(2)
  .ease("inOutCubic")
  .frameTo([4, 2.5, 7], [0, 0, 0]);

timeline.animateCamera(world)
  .at(2)
  .duration(2)
  .orbitTo({ azimuth: -30, elevation: 18, radius: 7 });
```

Perspective and orthographic projections are built in. Camera terminal verbs include `frameTo`, `moveTo`, `lookAt`, `orbitTo`, `zoomTo`, `fovTo`, and `viewHeightTo`. Camera values are ordinary deterministic scene state, so preview scrubbing and exported frames resolve the same viewpoint.

## Compatibility stance

Feature parity means equivalent semantic capability, timing, and composition—not identical internals. Browser-native CSS may intentionally produce a better implementation than the original GPU path. Every deliberate difference must be documented in the parity ledger.
