# Murali → Murali JS feature parity

This is an evidence ledger, not a roadmap. It tracks the Manim and Murali baseline, using Murali at `/Users/ravishankar/personal-work/animation/murali` as the reference implementation. Current priorities live in [`roadmap.md`](./roadmap.md).

The ledger is not a limit on scene content. Anything the web can draw can be in a Murali JS scene without an entry here, as long as the picture at time `t` is fully determined by the scene and `t`. Determinism outranks that openness.

Status values:

- `baseline` — a limited form exists in Murali JS today
- `planned` — target behavior is specified but not implemented
- `partial` — meaningful coverage exists but parity is incomplete
- `parity` — behavior, tests, and a reference example are complete
- `intentional difference` — browser-native behavior replaces the original implementation

## Core language

| Capability | Original reference | Murali JS status |
| --- | --- | --- |
| Scene owns visual state | `engine/scene.rs` | baseline |
| Deterministic sampling | `engine/timeline.rs` | baseline |
| World coordinates | coordinate-system docs | partial |
| Landscape/portrait/square frames | `engine/frame.rs` | partial |
| Typed visual references | `TattvaId` and Python handles | baseline |
| Visibility, XYZ position/rotation/scale, opacity | scene intent helpers | parity |
| Layers and depth modes | frontend props | partial |
| Object removal/lifecycle | scene lifecycle | planned |

## Timeline and animation

| Capability | Murali JS status |
| --- | --- |
| Builder grammar: target/time/duration/ease/verb | partial |
| Absolute-time scheduling | partial |
| Sequential `play`/`wait` | partial |
| Overlapping animations | baseline |
| Multi-object animation and stagger | partial |
| Move, scale, rotate, fade, color | baseline |
| Appear/disappear | partial |
| Draw/undraw paths | partial |
| Typewrite/reveal text | partial |
| Morph and match transforms | planned |
| Clips: sequential/overlap/explicit placement | partial |
| `callAt` and `callDuring` | planned |
| Seeking and reverse sampling | partial |
| Scene-owned camera and camera animation | parity |

## Styling and browser capabilities

| Capability | Murali JS status |
| --- | --- |
| Fill and stroke builders | partial |
| Arbitrary typed CSS | partial |
| Classes and CSS variables | partial |
| Gradients, filters, shadows, masks, clipping | intentional difference |
| Blend modes and backdrop filters | intentional difference |
| Deterministic CSS interpolation | partial |
| User transform composition without conflicts | partial |
| Themes and named colors | partial |

## Layout and composition

| Capability | Murali JS status |
| --- | --- |
| `toEdge` | partial |
| `nextTo` | partial |
| `alignTo` | partial |
| Group transforms | partial |
| HStack/VStack | partial |
| Authored geometric bounds | partial |
| Browser-measured DOM/React bounds | planned |
| Child scenes / SceneView | partial |

## Visual primitives and content

| Capability | Murali JS status |
| --- | --- |
| Circle, rectangle, square, ellipse, polygon | partial |
| Line, arrow, path | partial |
| Label/text | baseline |
| Code block | partial |
| LaTeX/Typst or browser equivalent | partial |
| Images and textures | partial |
| Axes and number plane | partial |
| Tables | partial |
| Graphs and fields | partial |
| 3D props and surfaces | partial through Three.js with built-in camera |
| Particles and traced paths | partial |

## Runtime and output

| Capability | Murali JS status |
| --- | --- |
| Browser preview | partial |
| MP4 export | baseline |
| PNG capture | partial |
| GIF export | planned |
| Transparent output | partial |
| Render progress | partial |
| Nearest-project configuration discovery | planned |
| Automatic Chromium installation | baseline |
| Diagnostics / doctor | planned |

Configuration currently reads `murali.json` and `.env` from the working directory. Walking upward from the scene file to the nearest project configuration remains roadmap work.

## Collections and teaching components

The original Murali collections belong above the core language and renderer. The implementation and comparison state of the 51 reference examples is in [`example-parity.md`](./example-parity.md).

| Collection | Murali JS status |
| --- | --- |
| Themes and named colors | partial |
| Cards, title cards, openings | partial |
| Neural-network diagrams | partial |
| Transformer and attention views | partial |
| Tensor views and operations | partial |
| Linear-algebra teaching views | partial |
| Stepwise storytelling | partial |
| Charts, probability, normalization | partial |

## Parity completion rule

A capability reaches `parity` only when it has:

1. A documented authoring API.
2. Deterministic behavioral tests.
3. A runnable Murali JS reference example.
4. A comparison against the corresponding Murali example.
5. Documented intentional platform differences.

## Parity comparisons

### Transform parity

Murali's `DrawableProps` represents position as `Vec3`, rotation as a quaternion, and scale as `Vec3`; parent model matrices compose through the scene graph. Murali JS provides the same visible capability through XYZ position, degree-based XYZ Euler rotation, XYZ scale, and hierarchical CSS `matrix3d()` composition. The runnable comparison is `examples/css-3d-transforms.ts`, with deterministic interpolation and browser hierarchy coverage in the core and preview tests. Euler degrees are an intentional JavaScript/CSS-facing authoring difference; Murali JS converts them to quaternions when constructing render matrices. The 2D `at`, `rotate`, and `scale` builders are shorthand for the corresponding 3D state.

### Stepwise storytelling

`Stepwise()` uses a JavaScript callback builder: `step()` returns stable numeric handles, `connect()` creates edges, `route()` adds deterministic orthogonal routing, and `sequence()` defines a replay that may revisit steps. Without explicit connections it creates a linear story; acyclic explicit connections receive a deterministic topological sequence. Cyclic stories require an explicit sequence. Timeline state keeps reveal and replay independent through `reveal` and `signal`. The runnable comparison is `examples/stepwise-storytelling.ts`, and deterministic tests cover reveal phases, routed feedback, replay position, defaults, and validation. Direct side-by-side frame comparison with Murali remains before this reaches `parity`.

### Camera parity

Murali JS's scene camera matches Murali's camera model: orthographic projection by default, opt-in perspective, frame-aware aspect, position/target/up vectors, forward/right helpers, visible bounds on a world Z plane, orthographic zoom, and deterministic `frameTo`, `moveTo`, `lookAt`, `zoomTo`, and `fovTo` animation. `toEdge` resolves against the camera intersection at the object's Z plane. World and overlay depth modes are distinct.

The runnable comparison is `examples/three-camera.ts`, corresponding to Murali's perspective surface and curve examples. It combines camera-animated Three.js geometry, a CSS label projected in world space, and a fixed overlay label. Murali JS expresses FOV in degrees rather than Murali's radians because degrees match Three.js and CSS-facing JavaScript APIs. Projection-mode changes are immediate configuration; numeric camera properties are the animatable surface. Browser DOM planes and WebGL geometry share camera state but remain separate compositing surfaces, so cross-surface geometric intersection is intentionally unsupported.
