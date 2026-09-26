# Venu implementation plan

The milestones below are deliberately ordered so public ergonomics drive implementation. Do not implement later collection features by bypassing unfinished language layers. Those milestones are the Manim and Murali baseline. They do not limit scene content: web content does not wait on an engine primitive. Determinism outranks every milestone. Web content is in scope only when its picture is a pure function of scene time.

## Milestone 0 — ergonomic contract

Deliverables:

- `docs/ergonomics.md`
- `docs/feature-parity.md`
- three golden examples under `docs/golden-examples`

Exit criteria:

- builder naming and order are coherent across all three examples
- simple and explicit timeline styles share one conceptual model
- CSS escape hatches are visible but do not dominate basic scenes
- no implementation change is required to review the API

## Milestone 1 — authored state, frames, and world space

Build:

- shared visual base type
- fluent visual builders
- typed 2D/3D vectors
- landscape, portrait, and square frames
- world-to-viewport mapping with positive Y upward
- multi-object `Scene.add`
- visibility and transform intent helpers

Exit criteria:

- golden `hello-shapes` can be implemented without pixel placement
- changing export resolution does not change composition
- authored state is independent of DOM state

## Milestone 2 — one deterministic timeline engine

Build:

- absolute-time `Timeline` builder
- terminal animation verbs that auto-register
- move, scale, rotate, fade, appear, disappear, and color
- easing names and cubic-bezier support
- conflict rules for overlapping property animations
- compile existing sequential `play`/`wait` into the same schedule
- arbitrary-time and reverse-order sampling tests

Exit criteria:

- golden `motion-basics` runs
- rendering the same timestamps in different orders produces the same state
- no `.spawn()` or separate commit trap exists

## Milestone 3 — CSS-native renderer

Build:

- transform/content wrapper boundary
- CSS custom-property transform composition
- fluent `css`, `className`, and `cssVar`
- deterministic interpolation strategy for CSS properties
- gradients, filters, masks, shadows, clipping, and blend modes
- renderer adapter contract for DOM, React, and Three.js

Exit criteria:

- arbitrary user content styling cannot overwrite Venu placement transforms
- CSS animation sampling is deterministic in offline rendering
- DOM and React share the same scene transform model

## Milestone 4 — layout and groups

Build:

- bounds model
- `toEdge`, `nextTo`, and `alignTo`
- Group, HStack, and VStack
- browser measurement pass for DOM/React content
- invalidation when content or style changes measured bounds

Exit criteria:

- golden `layout-and-groups` runs
- group transforms preserve child spacing
- layout is stable across supported output resolutions

## Milestone 5 — primitive and reveal parity

Build:

- geometric primitives and paths
- fill/stroke/dash/arrow styling
- label/text object
- appear/disappear semantics
- path draw/undraw
- grapheme-aware typewrite and text reveal

Exit criteria:

- Murali `hello_shapes`, `style_and_paths`, and `text_animation` have Venu counterparts
- reveal verbs match object semantics rather than all reducing to opacity

## Milestone 6 — clips and composition

Build:

- local-time Clip
- append, overlay, and placeAt
- duration queries
- reusable clip factories
- clear flattening into the scene timeline

Exit criteria:

- sections can be reordered without rewriting their internal timestamps
- nested clip timing remains deterministic

## Milestone 7 — preview, export, config, diagnostics

Build:

- nearest-ancestor `murali.json` discovery starting from the scene file
- environment and call-site overrides
- live preview
- MP4, PNG, GIF, and transparent capture
- default progress output
- useful browser/ffmpeg/config diagnostics
- `doctor` and setup recovery paths if still needed

Exit criteria:

- the same scene can preview or export without changing construction code
- running from any descendant directory resolves the same project config
- missing runtime dependencies produce actionable messages

## Milestone 8 — rich text and assets

Build:

- syntax-highlighted code blocks
- math and rich markup strategy
- images, textures, fonts, and asset resolution
- morph and match-transform foundations

Exit criteria:

- code, equation, matrix, and asset examples have stable authoring APIs

## Milestone 9 — camera, Three.js, procedural visuals

Build:

- orthographic and perspective camera abstractions
- camera animation
- formal Three.js adapter
- updaters, traced paths, particles, surfaces, and 3D props

Exit criteria:

- 3D scene state participates in the same timeline and seeking model
- common camera behavior does not require direct Three.js mutation

## Milestone 10 — child scenes

Build:

- SceneView equivalent
- child clock and camera
- looping and playback modes
- parent transforms and layout

Exit criteria:

- independent inset or looping content composes inside a parent scene
- child seeking and parent seeking remain deterministic

## Milestone 11 — kit and collection parity

Build on stable engine primitives:

- themes and named colors
- composition components
- math and AI teaching views
- tensor, transformer, neural-network, and storytelling components

Exit criteria:

- each ported Murali reference example is represented in the parity ledger
- domain components do not leak specialized behavior into the core engine

## Working method for every milestone

1. Review the matching original Murali API and example.
2. Update the golden API or parity ledger if the target changed.
3. Implement the smallest complete vertical slice.
4. Add deterministic behavioral tests.
5. Add or port one runnable reference example.
6. Render and visually inspect it.
7. Mark only proven capabilities as complete.
