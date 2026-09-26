# Murali → Venu feature parity

This ledger tracks the Manim and Murali baseline, using Murali at `/Users/ravishankar/personal-work/animation/murali` as the reference implementation. It is not a limit on scene content. Anything the web can draw can be in a Venu scene without an entry here, as long as the picture at time `t` is fully determined by the scene and `t`. Determinism outranks that openness.

Status values:

- `baseline` — a limited form exists in Venu today
- `planned` — target behavior is specified but not implemented
- `partial` — meaningful coverage exists but parity is incomplete
- `parity` — behavior, tests, and a reference example are complete
- `intentional difference` — browser-native behavior replaces the original implementation

## Core language

| Capability | Original reference | Venu status | Target milestone |
| --- | --- | --- | --- |
| Scene owns visual state | `engine/scene.rs` | baseline | 1 |
| Deterministic sampling | `engine/timeline.rs` | baseline | 2 |
| World coordinates | coordinate-system docs | partial | 1 |
| Landscape/portrait/square frames | `engine/frame.rs` | partial | 1 |
| Typed visual references | `TattvaId` and Python handles | baseline | 1 |
| Visibility, XYZ position/rotation/scale, opacity | scene intent helpers | parity | 1 |
| Layers and depth modes | frontend props | planned | 3 |
| Object removal/lifecycle | scene lifecycle | planned | 3 |

## Timeline and animation

| Capability | Venu status | Target milestone |
| --- | --- | --- |
| Builder grammar: target/time/duration/ease/verb | partial | 2 |
| Absolute-time scheduling | partial | 2 |
| Sequential `play`/`wait` | partial | 2 |
| Overlapping animations | baseline | 2 |
| Multi-object animation and stagger | baseline | 6 |
| Move, scale, rotate, fade, color | baseline | 2 |
| Appear/disappear | partial | 2 |
| Draw/undraw paths | partial | 5 |
| Typewrite/reveal text | partial | 5 |
| Morph and match transforms | planned | 8 |
| Clips: sequential/overlap/explicit placement | partial | 6 |
| `callAt` and `callDuring` | planned | 7 |
| Seeking and reverse sampling | partial | 2 |
| Scene-owned camera and camera animation | parity | 9 |

## Styling and browser capabilities

| Capability | Venu status | Target milestone |
| --- | --- | --- |
| Fill and stroke builders | partial | 3 |
| Arbitrary typed CSS | partial | 3 |
| Classes and CSS variables | partial | 3 |
| Gradients, filters, shadows, masks, clipping | intentional difference | 3 |
| Blend modes and backdrop filters | intentional difference | 3 |
| Deterministic CSS interpolation | partial | 3 |
| User transform composition without conflicts | partial | 3 |
| Themes and named colors | planned for kit | 11 |

## Layout and composition

| Capability | Venu status | Target milestone |
| --- | --- | --- |
| `toEdge` | partial | 4 |
| `nextTo` | partial | 4 |
| `alignTo` | partial | 4 |
| Group transforms | partial | 4 |
| HStack/VStack | partial | 4 |
| Authored geometric bounds | partial | 4 |
| Browser-measured DOM/React bounds | planned | 4 |
| Child scenes / SceneView | planned | 10 |

## Visual primitives and content

| Capability | Venu status | Target milestone |
| --- | --- | --- |
| Circle, rectangle, square, ellipse, polygon | partial | 5 |
| Line, arrow, path | partial | 5 |
| Label/text | baseline | 5 |
| Code block | planned | 8 |
| LaTeX/Typst or browser equivalent | planned | 8 |
| Images and textures | planned | 8 |
| Axes and number plane | planned | 11 |
| Tables | planned | 11 |
| Graphs and fields | planned for kit | 11 |
| 3D props and surfaces | partial through Three.js with built-in camera | 9 |
| Particles and traced paths | planned | 9 |

## Runtime and output

| Capability | Venu status | Target milestone |
| --- | --- | --- |
| Browser preview | partial | 7 |
| MP4 export | baseline | 7 |
| PNG capture | planned | 7 |
| GIF export | planned | 7 |
| Transparent output | planned | 7 |
| Render progress | partial | 7 |
| Nearest-project configuration discovery | partial | 7 |
| Automatic Chromium installation | baseline | 7 |
| Diagnostics / doctor | planned | 7 |

## Collections and teaching components

The original Murali collections become a later kit layer. Port only after the language features they depend on are stable. The order for the 51 Murali examples is [`example-parity.md`](./example-parity.md).

| Collection | Venu status |
| --- | --- |
| Themes and named colors | partial |
| Cards, title cards, openings | planned |
| Neural-network diagrams | planned |
| Transformer and attention views | planned |
| Tensor views and operations | planned |
| Linear-algebra teaching views | planned |
| Stepwise storytelling | planned |
| Charts, probability, normalization | planned |

## Parity completion rule

A capability reaches `parity` only when it has:

1. A documented authoring API.
2. Deterministic behavioral tests.
3. A runnable Venu reference example.
4. A comparison against the corresponding Murali example.
5. Documented intentional platform differences.

## Parity comparisons

### Transform parity

Murali's `DrawableProps` represents position as `Vec3`, rotation as a quaternion, and scale as `Vec3`; parent model matrices compose through the scene graph. Venu provides the same visible capability through XYZ position, degree-based XYZ Euler rotation, XYZ scale, and hierarchical CSS `matrix3d()` composition. The runnable comparison is `examples/css-3d-transforms.ts`, with deterministic interpolation and browser hierarchy coverage in the core and preview tests. Euler degrees are an intentional JavaScript/CSS-facing authoring difference; Venu converts them to quaternions when constructing render matrices. The 2D `at`, `rotate`, and `scale` builders are shorthand for the corresponding 3D state.

### Camera parity

Venu's scene camera matches Murali's camera model: orthographic projection by default, opt-in perspective, frame-aware aspect, position/target/up vectors, forward/right helpers, visible bounds on a world Z plane, orthographic zoom, and deterministic `frameTo`, `moveTo`, `lookAt`, `zoomTo`, and `fovTo` animation. `toEdge` resolves against the camera intersection at the object's Z plane. World and overlay depth modes are distinct.

The runnable comparison is `examples/three-camera.ts`, corresponding to Murali's perspective surface and curve examples. It combines camera-animated Three.js geometry, a CSS label projected in world space, and a fixed overlay label. Venu expresses FOV in degrees rather than Murali's radians because degrees match Three.js and CSS-facing JavaScript APIs. Projection-mode changes are immediate configuration; numeric camera properties are the animatable surface. Browser DOM planes and WebGL geometry share camera state but remain separate compositing surfaces, so cross-surface geometric intersection is intentionally unsupported.
