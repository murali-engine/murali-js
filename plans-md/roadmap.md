# Murali JS roadmap

Status: current plan as of September 2026.

This is the single ordered implementation plan for Murali JS. Work from the numbered list in order unless a production bug requires an earlier correction. The authoring contract lives in [`ergonomics.md`](./ergonomics.md); Murali capability and example evidence live in [`feature-parity.md`](./feature-parity.md) and [`example-parity.md`](./example-parity.md).

## Product direction

Murali JS is a deterministic, code-first animation package for JavaScript and TypeScript. It combines a useful built-in library of Tattvas with the full visual vocabulary of the web. Built-ins make common animation work concise; they must never become a boundary that prevents an author from introducing a completely new visual construct.

The intended authoring loop is:

```text
one scene file -> built-in or user-defined web content -> one timeline -> preview or render
```

DOM, CSS, SVG, Canvas, React, Three.js, and future browser libraries must be able to participate in the same scene graph, camera, timeline, layout, and deterministic sampling rules. An author should not need a new Murali JS release merely because their visual is new.

Implementation modules, package exports, and runnable examples are being organized with Rust-aligned domains. The category subpaths and migration rules are documented in [`code-organization.md`](./code-organization.md). Existing root imports remain a compatibility prelude while examples move incrementally to their canonical category imports.

## Decisions already made

These are product decisions, not open roadmap questions:

1. **Virtual time and FPS define the render.** Authors schedule in seconds. FPS selects the sampling interval, and frame index and timestamp are derived as `time = frame / fps`. Frame number is useful metadata, not the primary authoring unit.
2. **Wall-clock time never defines an exported frame.** Preview may use the wall clock to choose which virtual time to display, but the displayed state is sampled from Murali JS's virtual timeline.
3. **Logical world coordinates are resolution independent.** Landscape uses a `16 x 9` world, portrait uses `9 x 16`, and square uses `9 x 9` by default. Output pixels change image quality, not composition. Custom frames may override these defaults.
4. **The web platform is the visual foundation.** CSS remains directly available. Raw DOM, SVG, Canvas, React, Three.js, and future browser libraries are valid scene content when driven by Murali JS's sampled time.
5. **Built-in Tattvas remain a first-class convenience library.** Shapes, text, diagrams, teaching components, and higher-level artifacts are valuable, but users can create equally capable custom constructs without modifying Murali JS internals.
6. **The fluent builder API remains the preferred code-first ergonomics.** Custom web content should gain the same placement, grouping, styling, camera, and timeline grammar as built-ins.
7. **React and Three.js adapter separation is desirable but not urgent by itself.** Refactor when it simplifies the runtime or unlocks other browser renderers; do not split packages merely for architectural purity.
8. **Murali JS is the JavaScript implementation of Murali Engine.** The original Rust/Python engine remains the parity baseline and historical source of useful ideas, but it does not constrain the web implementation's internal architecture.

## Current state

The project is already a broad working implementation, not an early prototype.

| Area | Available today | Still incomplete |
| --- | --- | --- |
| Authoring | Single-file scenes, fluent Tattvas, scene helpers, clips, timelines, overlap, nesting, multi-target animation, stagger | A few APIs have inconsistent state, validation, or composition semantics |
| Web platform | DOM/SVG output, direct CSS, React Tattvas, Three.js Tattvas, first-class deterministic Canvas 2D and raw WebGL2 Tattvas | A general user-facing DOM/SVG lifecycle, arbitrary-library adapters, browser-measured layout |
| Styling and layout | Typed CSS, CSS variables, animated styles, static typed themes, scoped theme overrides, groups, stacks, authored bounds, frame and camera-edge layout, persistent branding overlays | Browser-measured bounds, measurement invalidation, shape-safe CSS paints, timeline-driven theme changes |
| 2D and text | Shapes, cubic closed-shape and compound SVG morphing, matching word/grapheme text, structural formula morphing, native LaTeX vector typesetting and cubic glyph-outline interpolation, labels, registered browser/local fonts, lines, arrows, paths, tables, code, MathML, semantic reveals, deterministic word clouds, Fireworks, YouTube CTA | Open-path morphing, general object matching, semantic TeX-token correspondence, Typst parity, imported-module formula discovery, general non-font asset handling |
| 3D | Scene-owned orthographic and perspective camera, XYZ transforms, Three.js content, curves, surfaces, glTF props, true extruded Text3D, WaveMesh | Resource disposal, renderer sharing, cross-surface depth limits, broader performance testing |
| Composition | Child scenes, independent child clocks, looping and playback modes | Visual parity proof and lifecycle semantics |
| Runtime | Preview, MP4, PNG, transparency, progress, looping audio with volume and intervals, scene-authored screenshot sets and GIFs, npm installation, bundled Chromium | Source-relative config discovery, unified CLI behavior, diagnostics |
| Teaching components | Linear algebra; semantic weighted/sparse neural networks with snapshot animation and unique-edge flow; transformers; tensors; probability; normalization; chat; stepwise stories; reusable 3D openings | Timeline-native tensor morphs, composable chat objects, large-network visual compression, specialized architecture views, API curation |
| Murali coverage | All 51 reference lessons are represented by 45 Murali JS scenes after linear-algebra and 3D-format consolidation | Systematic rendered comparisons and documented intentional differences |

The verification baseline is 90 deterministic tests plus a package smoke test that installs the packed npm artifact and imports the root, render pipeline, and every public category subpath.

## Rust parity audit snapshot

A source-level comparison against the Rust engine was refreshed on **29 September 2026**. All 51 reference examples are ported, but the following public Rust capabilities remain absent or materially incomplete in Murali JS:

- general object match-transform, semantic TeX-token correspondence, Typst parity, and richer equation continuity; closed-shape, semantic text, structural formulas, native LaTeX vector typesetting, and cubic glyph-outline interpolation are implemented;
- scene removal/clear operations remain; typed per-frame updater handles, active ranges, and removal are implemented;
- deterministic `callAt`/`callDuring` callbacks and reversible variants;
- scene-authored named and unnamed screenshot sets, arbitrary-time GIF groups, and inclusive GIF capture ranges are implemented;
- native Typst compilation; LaTeX compilation and vector-outline extraction are implemented for literal stages in the entry scene;
- source-relative registered font faces are implemented; general image and texture management remains;
- nearest-project configuration discovery and environment diagnostics;
- interactive orbit/pan/zoom inspection controls;
- a versioned, validated AI trace ingestion model;
- specialized built-ins including procedural noisy shapes/fields, `Cube`, standalone `ChatBubble`, reusable letter particles, decision-boundary/optimization views, and typed agent-flow components. `Ellipse` is now implemented.

The native Rust renderer also provides one geometric depth space and shared GPU ownership. Murali JS instead shares camera state across separately composited DOM/SVG/React and Three.js surfaces. That is an intentional platform tradeoff unless a real scene demonstrates that unified cross-surface intersection is worth a different renderer architecture. Rust's ECS is likewise not a parity requirement.

This snapshot is an inventory, **not a new priority order**. The next planning step is to rank these gaps against web-native investments by user value, reuse, determinism risk, implementation cost, and whether an adequate browser escape hatch already exists. The detailed evidence is in [`feature-parity.md`](./feature-parity.md#rust-capability-audit-29-september-2026).

## Numbered implementation roadmap

### 1. Stabilize authored state and timeline correctness

Complete the current foundations before widening the extension surface.

Completed foundation:

- one authoritative authored state is used by `set()` and deterministic sampling;
- timing validation covers timelines, scenes, cameras, clips, multi-target animation, and child scenes;
- duplicate ownership and accidental multi-parent groups are rejected;
- 2D layout helpers preserve Z.

Remaining work:

- Move tensor morphing from absolute scene timestamps into ordinary timeline state and animation verbs.
- Make `ChatInput` a composable Tattva/group with typed access to independently animated parts.
- Make CSS paints respect non-rectangular geometry, especially polygons.

Completion criteria:

- invalid input fails at authoring time with an actionable error;
- moving a clip or changing the scene cursor never requires editing timestamps inside an object;
- every returned visual can be added, transformed, grouped, and animated through the standard grammar;
- focused tests cover every corrected behavior.

### 2. Add a first-class custom web-content primitive

This is the main architectural expansion. A user must be able to create a visual Murali JS has never heard of without changing the renderer.

Completed foundation:

- `CanvasTattva` and `Canvas3DTattva` provide output-resolution-aware HTML Canvas 2D and raw WebGL2 surfaces with one-time setup, independently sampled drawing, typed custom animation state, theme access, and virtual-time metadata.

- Design a small public lifecycle for custom browser content: mount, sampled update, optional measurement, and dispose.
- Support author-created HTML elements and document fragments without requiring raw HTML strings.
- Support inline SVG as ordinary scene content; Canvas 2D is now available through `CanvasTattva`.
- Allow a custom construct to declare strongly typed animation state and receive its sampled state and virtual-time context.
- Preserve Murali JS's outer transform wrapper so user CSS transforms do not replace world placement, camera projection, opacity, or grouping.
- Give custom content the standard builders: position, full XYZ transform, opacity, layer/depth mode, class, CSS, CSS variables, grouping, and timeline animation.
- Provide a safe escape hatch for integrating another browser library without adding a new hard-coded `kind` to Murali JS.
- Add concise examples for raw DOM/CSS, SVG, Canvas, and one small third-party-style adapter.

The sampled context may expose derived conveniences such as `time`, `fps`, `frame`, `duration`, and `progress`, but `time` and FPS remain authoritative. A frame value is derived from them rather than becoming a second clock.

Completion criteria:

- a new visual construct can be authored entirely in an example or consumer package;
- adding it does not require editing `src/render/runtime.ts`;
- it previews, exports, groups, transforms, and animates like a built-in Tattva;
- reverse-order sampling produces the same visible state.

### 3. Complete web-native measurement and layout

- Measure arbitrary DOM, SVG, Canvas, and React content in Chromium.
- Convert measurements into stable world-space bounds.
- Invalidate cached measurements when content or layout-affecting styles change.
- Define when layout resolves relative to scene construction, font loading, and rendering.
- Verify `nextTo`, `alignTo`, `toEdge`, groups, and stacks with user-supplied web content.
- Preserve the default logical worlds: `16 x 9`, `9 x 16`, and `9 x 9`, independently of output resolution.

Completion criteria:

- relational layout works for built-in and user-created web content;
- the same scene composition survives changes in output resolution;
- portrait and landscape scenes use the same authoring grammar;
- measurement never introduces wall-clock-dependent exported frames.

### 4. Add deterministic guardrails for custom web content

Murali JS cannot prevent arbitrary JavaScript from being stateful, but it should make the deterministic path obvious and convenient.

- Provide a scene-owned seeded random service for procedural authoring, for example `scene.random("stars")`. The same scene seed and stream name must produce the same values on every construction.
- Keep component-level seeds such as `WordCloud(...).seed(42)` when a reusable artifact needs an explicit local override.
- Document and detect common nondeterministic patterns where practical: `Math.random()`, timers, autonomous CSS animations, and stateful per-frame mutation.
- Decide how CSS animations and transitions are frozen or rejected during deterministic export.
- Ensure fonts, images, and other required browser assets are ready before capture.
- Add deterministic lifecycle tests for custom DOM, SVG, Canvas, React, and Three.js content.

Why the shared random service exists: it is not mandatory randomness and does not replace local seeds. It gives authors of new procedural constructs a reproducible alternative to unseeded `Math.random()`.

Completion criteria:

- procedural custom content has an officially supported reproducible random source;
- deterministic examples remain identical when sampled in forward, reverse, and arbitrary order;
- the extension documentation clearly separates safe sampled behavior from autonomous browser animation.

### 5. Add first-class theme support

Static foundation completed: typed scene themes and patches, dark/light built-ins, semantic color references, group scopes, explicit-style precedence, CSS custom properties, and shared React/Three render contexts. Remaining work in this section is primarily timeline-driven theme changes, broader migration of specialized components, and external theme-file loading.

Completed foundation:

- typed semantic colors, typography, surfaces, strokes, radii, and effects;
- scene themes, dark/light defaults, and custom theme creation;
- semantic defaults for built-ins with explicit-style precedence;
- scoped group overrides;
- CSS custom properties plus React and Three.js theme contexts;
- fixed swatches under the `palette` namespace rather than package-root color constants.

Remaining work:

- migrate any specialized component that still hard-codes a value that should be semantic;
- load external theme files through a documented, source-relative asset path;
- Define deterministic timeline-driven theme changes. Compatible colors and numeric tokens may interpolate; discrete tokens switch at an exact authored time.

Completion criteria:

- one scene-level theme consistently styles built-in and user-created content;
- reusable components can use semantic tokens without depending on a particular built-in palette;
- explicit object styles override theme defaults predictably;
- scoped and timeline-driven theme changes produce identical results during preview, arbitrary seeking, and export.

### 6. Stabilize package and render ergonomics

- Resolve `.env` and `murali.json` relative to the source scene or nearest project root, not the shell working directory.
- Route direct `render()` usage and the optional CLI through the same option-resolution and progress path.
- Make `npm run typecheck` independent of generated `dist` output by resolving workspace imports to source.
- Curate the root package API and move specialized or experimental domains behind intentional subpath exports where useful.
- Prevent `src/index.ts` and `src/browser.ts` from drifting, preferably through a shared export surface or an automated check.
- Add CI for build, type-check, deterministic tests, and installed-package smoke testing.
- Improve Chromium, ffmpeg, bundling, configuration, and asset diagnostics.

Completion criteria:

- a clean checkout can type-check without building first;
- the same scene uses the same configuration regardless of its launch directory;
- direct execution, preview, CLI rendering, and installed-package rendering share observable behavior;
- the supported public API is deliberate and documented.

### 7. Generalize renderer adapters where it pays off

Do this after the custom web lifecycle has established the correct abstraction. Separate npm packages are optional.

- Implement DOM, React, and Three.js through the smallest shared lifecycle that is genuinely useful.
- Remove hard-coded renderer branching when the shared lifecycle can replace it cleanly.
- Formalize setup, sampled update, commit, measurement, and disposal responsibilities.
- Formalize Three.js resource ownership and evaluate sharing a renderer across scenes with many 3D roots.
- Keep a convenient default installation; do not make ordinary users assemble several packages unless bundle size or optional peer dependencies justify it.

Completion criteria:

- a future browser renderer can be added without redesigning the timeline or scene graph;
- React and Three.js retain the same authoring experience;
- adapter cleanup produces a concrete extensibility, lifecycle, or performance benefit.

### 8. Prove visual parity and prevent visual regressions

Runnable examples demonstrate coverage but do not by themselves prove parity.

- Add a small manifest of representative timestamps for each parity scene.
- Capture deterministic Murali JS frames at those timestamps.
- Maintain approved Murali reference frames or side-by-side comparison sheets.
- Record intentional browser differences next to each comparison.
- Start with stepwise stories, chat, tensor operations, tensor slicing, and self-attention.
- Then review primitives, layout, linear algebra, procedural scenes, 3D, and child scenes in dependency order.
- Add representative custom-web-content scenes to the visual regression set.

Completion criteria:

- an example is marked complete only when it satisfies the rule in [`example-parity.md`](./example-parity.md);
- visual regressions can be reviewed without rendering an entire video manually;
- intentional differences are documented rather than hidden by vague `partial` statuses.

### 9. Close remaining engine and artifact gaps

- Object removal and lifecycle semantics.
- Deterministic `callAt` and `callDuring` behavior, including a decision on reversible callbacks.
- Add timeline-native camera projection switching at an exact virtual time, for example changing from orthographic to perspective at `3s`, with projection-specific settings applied atomically.
- Define smooth orthographic-to-perspective transition semantics separately; do not imply that interpolating two projection matrices produces a meaningful camera move.
- Extend the completed closed-shape, semantic matching, and LaTeX-outline foundations into general object match-transform, semantic TeX-token matching, richer equation continuity, and Typst parity.
- Decide whether native Typst compilation belongs in core or an adapter, and whether the LaTeX toolchain should become optional.
- General image, file-backed texture, and asset resolution beyond the completed entry-scene font registry.
- A versioned AI trace ingestion contract if recorded model/system traces remain a core product direction.
- Expand the built-in artifact library only when an abstraction is broadly reusable.

Completion criteria:

- lifecycle and removal work for built-in and custom content;
- camera projection can change deterministically at an authored timeline position, with cut and smooth-transition behavior clearly distinguished;
- morphing uses ordinary timeline semantics;
- assets resolve consistently in source, preview, installed-package, and export workflows;
- new built-ins do not weaken the ability to author an equivalent construct in user code.

### 10. Improve performance and reproducibility across environments

- Profile real scenes on the 16-GB development machine before optimizing abstractions.
- Avoid one expensive renderer or browser resource per object when resources can safely be shared.
- Explore independent or parallel frame rendering only after custom-content lifecycle and resource ownership are explicit.
- Pin or record Chromium, fonts, viewport, DPR, Three.js, and renderer settings for reproducible CI captures.
- Document the difference between deterministic scene state and pixel-identical output across operating systems and GPUs.

Completion criteria:

- representative 2D, DOM-heavy, and 3D scenes have recorded performance baselines;
- CI visual comparisons run in a pinned environment;
- performance work does not introduce playback-history-dependent frames.

## Completed foundation: Murali port coverage

- The reusable opening composite is implemented with configurable texture, typography, particles, style, timing, and deterministic timeline choreography.
- `kavriq_opening` and `opening_scene_view` are ported and render successfully.
- All 51 Murali reference lessons are represented by runnable Murali JS scenes; ten static linear-algebra ports were consolidated into five animated scenes.
- Visual comparison of the complete set remains part of roadmap item 8.

## Definition of done

A capability is complete only when it has:

1. A coherent authoring API consistent with the rest of Murali JS.
2. Deterministic arbitrary-time and reverse-order sampling tests where relevant.
3. A runnable example that consumes Murali JS as a package.
4. Render or preview verification for visual behavior.
5. Documentation of constraints and intentional browser differences.
6. A user-extension story when the capability introduces a new kind of visual content.

Passing unit tests alone means the implementation is working; it does not establish ergonomic, visual, or extensibility completeness.

## Documentation ownership

- [`../README.md`](../README.md): installation, first scene, everyday commands, and a concise feature overview.
- [`ergonomics.md`](./ergonomics.md): the intended public authoring contract.
- [`roadmap.md`](./roadmap.md): the numbered implementation order and completion criteria.
- [`feature-parity.md`](./feature-parity.md): capability-level evidence against Murali and Manim.
- [`example-parity.md`](./example-parity.md): example-level implementation and comparison ledger.

Historical milestone sequencing is available in Git history. It is intentionally not maintained as a second roadmap.
