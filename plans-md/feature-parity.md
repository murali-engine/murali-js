# Murali → Murali JS feature parity

This is an evidence ledger, not a roadmap. It tracks the Manim and Murali baseline, using Murali at `/Users/ravishankar/personal-work/animation/murali` as the reference implementation. Current priorities live in [`roadmap.md`](./roadmap.md). The latest source-level audit was completed on **29 September 2026**.

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
| Landscape/portrait/square frames | `engine/frame.rs` | parity: `16 x 9`, `9 x 16`, and `9 x 9` logical worlds with independent pixel resolution |
| Typed visual references | `TattvaId` and Python handles | baseline |
| Visibility, XYZ position/rotation/scale, opacity | scene intent helpers | parity |
| Layers and depth modes | frontend props | partial |
| Object removal/lifecycle | scene lifecycle | planned |
| Deterministic per-frame updaters and removal handles | scene updater manager | baseline: global and target-aware callbacks, typed sampled-state access, active ranges, individual/per-target/all removal, and dynamic label text |

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
| Closed-shape morphing | parity foundation: cubic Bézier contours, arbitrary SVG paths, compound paths/holes, cyclic/winding alignment, style interpolation, deterministic seeking, tests, and a runnable example |
| Matching text and formulas | word/grapheme correspondence, unequal-token entrance and exit, structural scripts/fractions/radicals, matching overrides, native LaTeX outlines, cubic Bézier glyph interpolation, deterministic seeking, tests, and runnable examples |
| General object match transforms and semantic TeX-token matching | planned |
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
| Themes and named colors | partial: static typed themes, semantic roles, group scopes, CSS variables, React context, and Three.js context are implemented; timeline transitions and external theme files remain |

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
| Circle, ellipse, rectangle, square, polygon | partial |
| Closed-shape contour morphing | baseline implemented for built-ins and arbitrary `VectorShape` SVG geometry, including compound paths and holes |
| Semantic text and formula morphing | baseline implemented for words, graphemes, and a nested TeX-like formula subset |
| Native LaTeX outline morphing | baseline implemented through `latex`/`dvisvgm`, exact-outline matching, nearest repeated-glyph assignment, and normalized cubic Bézier interpolation |
| Line, arrow, path | partial |
| Label/text | baseline: per-label CSS font selection and registered source-relative or URL font faces are supported |
| Code block | partial |
| LaTeX/Typst or browser equivalent | partial: MathML/browser text and native LaTeX vector outlines with glyph continuity exist; Typst compilation, semantic TeX-token correspondence, imported-module discovery, and toolchain portability remain |
| Images and textures | partial: generated Canvas textures and glTF assets exist; local entry-scene fonts are supported, but general source-relative image/texture loading does not |
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
| PNG capture | baseline: main-frame PNG plus exact-time named and unnamed scene-authored captures |
| GIF export | baseline: looping GIFs from arbitrary timestamp groups or inclusive sampled ranges |
| Transparent output | parity for stills: scene backgrounds can be force-omitted from exact-time PNG exports through the API, CLI, project config, or environment |
| Render progress | partial |
| Nearest-project configuration discovery | planned |
| Automatic Chromium installation | baseline |
| Diagnostics / doctor | planned |
| Scene-authored multi-frame capture sets | baseline: deterministic screenshots and GIFs rendered at exact virtual times |

Configuration currently reads `murali.json` and `.env` from the working directory. Walking upward from the scene file to the nearest project configuration remains roadmap work.

## Collections and teaching components

The original Murali collections belong above the core language and renderer. The implementation and comparison state of the 51 reference examples is in [`example-parity.md`](./example-parity.md).

| Collection | Murali JS status |
| --- | --- |
| Themes and named colors | partial: the static theme foundation is implemented |
| Cards, title cards, openings | partial |
| Neural-network diagrams | baseline: stable semantic layer/node/edge IDs, dense weighted or explicit sparse/skip connectivity, horizontal/vertical layout, theme-aware value/activation/weight rendering, interpolated cumulative snapshots, unique-edge flow, and bounded route selection |
| Transformer and attention views | partial |
| Tensor views and operations | partial |
| Linear-algebra teaching views | partial |
| Stepwise storytelling | partial |
| Charts, probability, normalization | partial |

## Rust capability audit (29 September 2026)

All 51 Rust examples have runnable Murali JS counterparts, but example coverage is not the same as parity with every public Rust API. Several Rust facilities are not exercised by those examples, and most example ports still await direct rendered comparison.

### Confirmed Murali JS gaps

| Area | Rust capability | Murali JS state |
| --- | --- | --- |
| Transform continuity | `match_transform`, `morph_from`, staged matching, vector equation/formula morphing | Closed built-in shapes morph through normalized contours; text and formulas have staged semantic matching; native LaTeX glyph outlines use cubic Bézier interpolation. General object matching and semantic TeX-token matching remain |
| Timeline callbacks | `call_at`, `call_during`, and reversible variants | Not implemented |
| Object lifecycle | Remove a Tattva, clear a scene, remove one updater or all updaters for a target | Updater handles and individual/per-target/all removal are implemented; Tattva removal and scene clearing remain |
| Authored captures | Multiple named screenshots and GIF capture ranges declared by a scene | Implemented with named and unnamed exact-time PNGs, arbitrary GIF timestamp groups, inclusive range sampling, per-range FPS, tests, and a runnable example |
| Mathematical typesetting | Native LaTeX/Typst compilation, rasterization, vector paths, and outline extraction | Native LaTeX compilation and vector extraction are implemented for literal `LatexMorph` stages; static MathML remains browser-native; Typst and general asset caching remain incomplete |
| Resource management | Registered fonts, measured glyph assets, file-backed textures, and caches | Entry-scene local/URL font registration is implemented; measured glyph assets, general file-backed textures, and a unified cache contract remain |
| Project ergonomics | Nearest-project `murali.toml` discovery and tool diagnostics | Configuration is resolved from the working directory; no doctor command/report |
| Interactive inspection | Orbit and pan/zoom camera controllers used by the model inspector | Authored camera animation exists; pointer/keyboard inspection controls do not |
| AI trace semantics | Versioned `AiTrace`, typed events, metadata, roles, and validation | Strong individual teaching models exist, but no unified trace ingestion contract |
| Renderer integration | Lines, meshes, text, and shapes share one native GPU depth space | DOM/SVG/React planes and Three.js roots share camera state but are composited surfaces |
| 3D resource scale | One native renderer owns shared GPU resources | Each Three.js Tattva currently owns a WebGL renderer; sharing and formal disposal remain |

### Rust built-ins without equivalent reusable JS exports

- `Cube` and a standalone `ChatBubble`. `Ellipse` is now a built-in and participates in shape morphing.
- `NoisyCircle`, `NoisyHorizon`, and `LayeredPerlinField`. `WaveMesh` is related but is not the same 2D procedural primitive family.
- Reusable `LetterParticles3D`; the opening has deterministic glyph particles, but that behavior is not exposed as a general Tattva.
- `OptimizationPath2D` and `DecisionBoundaryPlot`.
- `AgenticFlowChart` and `MuraliAiIndicator`. `Stepwise` and `SignalFlow` cover some visual vocabulary but not the typed agent-flow model.

### Intentional differences, not gaps

- Rust targets Tattvas through numeric `TattvaId` values; JavaScript uses typed object references.
- Rust authoring uses quaternions; Murali JS exposes Euler degrees and converts them when composing 3D transforms.
- Rust uses hecs internally. ECS is an implementation choice, not a user-facing capability Murali JS must reproduce.
- Browser gradients, filters, masks, CSS, React, and arbitrary web content intentionally replace several native rendering mechanisms.

### Areas where Murali JS is already broader

- Scene and scoped typed themes across DOM, SVG, React, and Three.js.
- Looping audio with start/end intervals, preview playback, missing-file tolerance, and volume control.
- Browser-native CSS/React composition, reusable `WaveMesh`, `Fireworks`, `WordCloud`, and YouTube subscribe components.
- True vector-extruded `Text3D` with browser-loadable typeface and TrueType input.

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
