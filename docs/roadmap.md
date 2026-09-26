# Venu roadmap

Status: current plan as of September 2026.

This is the single planning document for Venu. It records what is working, what needs correction, and the order in which new work should happen. The authoring contract lives in [`ergonomics.md`](./ergonomics.md); Murali capability and example evidence live in [`feature-parity.md`](./feature-parity.md) and [`example-parity.md`](./example-parity.md).

## Product direction

Venu is a deterministic, code-first animation package for JavaScript and TypeScript. A rendered frame must be a function of scene data and virtual scene time, independent of playback history or wall-clock time.

The intended authoring loop is:

```text
one scene file -> fluent objects -> one timeline model -> preview or render
```

The web platform is a strength, not a separate execution model. DOM, CSS, React, SVG, and Three.js content must participate in the same scene graph, camera, timeline, and deterministic sampling rules.

## Current state

The project is already a broad working implementation, not an early prototype.

| Area | Available today | Still incomplete |
| --- | --- | --- |
| Authoring | Single-file scenes, fluent Tattvas, scene helpers, clips, timelines, overlap, nesting, multi-target animation, stagger | A few APIs have inconsistent state, validation, or composition semantics |
| Styling and layout | Typed CSS, CSS variables, animated styles, groups, stacks, authored bounds, frame and camera-edge layout | Browser-measured DOM/React bounds, measurement invalidation, shape-safe CSS paints |
| 2D and text | Shapes, labels, lines, arrows, paths, tables, code, MathML, semantic reveals, deterministic word clouds | Morph and match transforms, general font and asset handling |
| 3D | Scene-owned orthographic and perspective camera, XYZ transforms, Three.js content, curves, surfaces, glTF props | A clearer shared-renderer/adapter boundary and broader performance testing |
| Composition | Child scenes, independent child clocks, looping and playback modes | Remaining opening composite and visual parity proof |
| Runtime | Preview, MP4, PNG, transparency, progress, npm installation, bundled Chromium | Source-relative config discovery, unified CLI behavior, diagnostics, optional GIF output |
| Teaching components | Linear algebra, networks, transformers, tensors, probability, normalization, chat, stepwise stories, reusable 3D openings | Timeline-native tensor morphs, composable chat objects, API curation |
| Murali coverage | All 51 examples have Venu scene files | Systematic rendered comparisons and documented intentional differences |

The current verification baseline is 59 deterministic tests plus a package smoke test that installs the packed npm artifact and imports both `venu` and `venu/render`.

## Work order

### 1. Stabilize the authoring model

Do this before adding another large family of components.

- Establish one authoritative authored state. `Tattva.set()` must affect sampling or be removed; `state` and `initialState` must not present conflicting truths.
- Validate all time inputs with one finite, non-negative validator. Apply it to single-target, multi-target, camera, clip, scene, and child-scene timing.
- Protect scene-tree ownership: reject duplicate children and accidental multi-parent groups, or provide an explicit reparent operation.
- Preserve Z in 2D layout helpers such as `nextTo`.
- Move tensor morphing from absolute scene timestamps into ordinary timeline state and animation verbs.
- Make `ChatInput` a composable Tattva/group with typed access to independently animated parts.
- Make CSS paints respect non-rectangular geometry, especially polygons.

Exit criteria:

- invalid input fails at authoring time with an actionable error;
- moving a clip or changing the scene cursor never requires editing timestamps inside an object;
- every returned visual can be added, transformed, grouped, and animated through the standard grammar;
- focused tests cover each corrected behavior.

### 2. Stabilize package and render ergonomics

- Resolve `.env` and `murali.json` relative to the source scene or nearest project root, not the shell working directory.
- Route direct `render()` usage and the optional CLI through the same option-resolution and progress path.
- Make `npm run typecheck` independent of generated `dist` output by resolving workspace imports to source.
- Curate the root package API. Move specialized or experimental domains behind intentional subpath exports where useful.
- Prevent `src/index.ts` and `src/browser.ts` from drifting, preferably through a shared export surface or an automated check.
- Add CI for build, type-check, deterministic tests, and installed-package smoke testing.
- Improve Chromium, ffmpeg, bundling, configuration, and asset diagnostics.

Exit criteria:

- a clean checkout can type-check without building first;
- the same scene uses the same configuration regardless of the directory from which it is launched;
- direct execution, preview, CLI rendering, and installed-package rendering share observable behavior;
- the supported public API is deliberate and documented.

### 3. Prove visual parity

Runnable examples demonstrate coverage but do not by themselves prove parity.

- Add a small manifest of representative timestamps for each parity scene.
- Capture deterministic Venu frames at those timestamps.
- Maintain approved Murali reference frames or side-by-side comparison sheets.
- Record intentional browser differences next to each comparison.
- Start with the most recently added systems: stepwise stories, chat, tensor operations, tensor slicing, and self-attention.
- Then review primitives, layout, linear algebra, procedural scenes, 3D, and child scenes in dependency order.

Exit criteria:

- an example is marked complete only when it satisfies the rule in [`example-parity.md`](./example-parity.md);
- visual regressions can be reviewed without rendering an entire video manually;
- intentional differences are documented rather than hidden by vague `partial` statuses.

### 4. Complete web-native layout

- Measure arbitrary DOM and React content in the browser.
- Convert measurements into stable world-space bounds.
- Invalidate cached measurements when content or layout-affecting styles change.
- Define when layout resolves relative to scene construction and rendering.
- Verify `nextTo`, `alignTo`, groups, and stacks with custom DOM and React objects.

Exit criteria:

- relational layout works for built-in and user-supplied web content;
- output resolution does not change composition;
- measurement does not introduce wall-clock-dependent frames.

### 5. Close remaining engine gaps

- Object removal and lifecycle semantics.
- Deterministic `callAt` and `callDuring` behavior, if callbacks remain necessary.
- Morph and match-transform foundations.
- General image, font, and asset resolution.
- GIF export only if it remains a real product requirement.
- Formalize Three.js resource ownership and evaluate sharing renderers for scenes with many 3D roots.

### 6. Murali port coverage — complete

- The reusable opening composite is implemented with configurable texture, typography, particles, style, timing, and deterministic timeline choreography.
- `kavriq_opening` and `opening_scene_view` are ported and render successfully.
- All 51 Murali examples now have runnable Venu counterparts.
- Visual comparison of the complete set remains part of phase 3.

## Definition of done

A capability is complete only when it has:

1. A coherent authoring API consistent with the rest of Venu.
2. Deterministic arbitrary-time and reverse-order sampling tests where relevant.
3. A runnable example that consumes Venu as a package.
4. Render or preview verification for visual behavior.
5. Documentation of constraints and intentional browser differences.

Passing unit tests alone means the implementation is working; it does not establish ergonomic or visual completeness.

## Documentation ownership

- [`../README.md`](../README.md): installation, first scene, everyday commands, and a concise feature overview.
- [`ergonomics.md`](./ergonomics.md): the intended public authoring contract.
- [`roadmap.md`](./roadmap.md): current priorities and completion criteria.
- [`feature-parity.md`](./feature-parity.md): capability-level evidence against Murali and Manim.
- [`example-parity.md`](./example-parity.md): example-level implementation and comparison ledger.

Historical milestone sequencing is available in Git history. It is intentionally not maintained as a second roadmap.
