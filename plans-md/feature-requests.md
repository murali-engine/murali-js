# Active feature requests and candidate gaps

This file contains only unresolved ideas. It is an intake list, not an implementation order. The ordered plan and completion criteria live in [`roadmap.md`](./roadmap.md); Rust comparison evidence lives in [`feature-parity.md`](./feature-parity.md).

## Engine work

- General object match-transform, semantic TeX-token matching, Typst coverage, imported-module formula discovery, and richer equation continuity.
- Object removal and scene clearing.
- Deterministic `callAt` and `callDuring`, with explicit reverse-seeking semantics.
- General source-relative image, texture, and asset resolution beyond the existing font and entry-scene helpers.
- Nearest-project configuration discovery and a diagnostics/doctor surface.
- Interactive orbit, pan, zoom, and model-inspection controls.
- Timeline-driven theme transitions and external theme-file loading.
- A first-class custom web-content lifecycle with stable measurement and deterministic sampled updates.

## Reusable components

- `Cube` and an independently composable `ChatBubble` (`Ellipse` already exists).
- Procedural `NoisyCircle`, `NoisyHorizon`, and layered Perlin fields.
- Reusable 3D letter-particle scatter and dissolve.
- Optimization-path and decision-boundary teaching views.
- Versioned AI trace ingestion, typed agent-flow diagrams, and an AI activity indicator.
- Large-network visual compression and specialized convolutional or architecture views.
- A more web-native, configurable opening Tattva.
- Further visual refinement of the YouTube subscribe Tattva.

## Examples and design work

- Continue moving reviewed examples into subject folders without breaking assets, commands, or recursive preview discovery.
- Continue consolidating examples when one animated story preserves the conceptual and API coverage of several static demonstrations.
- Audit specialized examples for semantic theme usage instead of incidental hard-coded colors.
- Expand the SceneView and clip documentation with lifecycle, looping, and composition guidance.
- Define a Kavriq-specific typography, interface, and motion design language.

## Decisions required before implementation

- Whether Typst compilation should join the native LaTeX path, and whether the native toolchain should remain core or become an optional adapter.
- Whether unified geometric depth across DOM and Three.js is valuable enough to give up part of the current web-native composition model.
- Which missing Rust built-ins are broadly reusable rather than historical collection artifacts.
