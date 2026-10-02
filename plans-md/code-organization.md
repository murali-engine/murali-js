# Code organization

Murali JS uses the same broad collection taxonomy as Murali Rust. Each collection is also an intentional package subpath, so specialized APIs no longer need to accumulate at the package root.

## Tattva domains

The target internal structure mirrors the useful parts of Murali Rust's collections without copying its module depth mechanically:

```text
src/tattvas/
  primitives/       shapes, paths, props, particle primitives
  text/             labels, code, LaTeX, 3D text, text morphing
  maths/            graphs, notation, Fourier, linear algebra, geometry
  ai/               networks, transformers, tensors, sampling
  layout/           groups and spatial arrangement
  composite/        reusable visuals assembled from other Tattvas
  storytelling/     stepwise narratives, chat, openings, celebrations
  table/            semantic tabular presentation
  utility/          tracing and authoring utilities
```

Engine and platform boundaries sit alongside the collections:

```text
src/core/            scene, timeline, camera and Tattva contracts
src/style/           themes, palette, fonts and CSS helpers
src/adapters/        React and Three.js Tattva adapters
src/render/          capture, preview, audio and encoding
```

The public entry points are `murali-js/core`, `/style`, `/adapters`, `/layout`, `/primitives`, `/text`, `/maths`, `/ai`, `/composite`, `/storytelling`, `/table`, `/utility`, and `/render`. Tattva implementation files physically live in their owning collection; category `index.ts` files are public barrels over sibling implementations, not facades over the former flat `src/tattvas/*.ts` layout.

For example:

```ts
import { Scene, Timeline } from "murali-js/core";
import { Circle, Arrow } from "murali-js/primitives";
import { Label, LatexMorph } from "murali-js/text";
import { Matrix, VectorField } from "murali-js/maths";
import { NeuralNetwork } from "murali-js/ai";
```

The package root is a compatibility prelude during the migration. Existing scenes can keep importing from `murali-js`, while new examples and documentation should use category imports. Once the repository and downstream scenes have migrated, the root can be reduced to the frequently used authoring grammar in a deliberate release.

The `ai/` category currently has these focused entry points:

- `neural-networks.ts`
- `signal-flow.ts`
- `context-window.ts`
- `transformers.ts`
- `tensors.ts`
- `sampling.ts`

The obsolete `src/tattvas/teaching.ts` compatibility barrel has been removed. AI consumers import from `murali-js/ai`, while the category's focused source entry points own discovery within the repository. Shared implementation belongs in private `internal/` modules; there is no public `common` or `internal` package export.

## Splitting rules

A split should improve ownership rather than merely create more files:

1. One category physically owns each visual model or tightly related family.
2. Domain-specific layout, validation, and SVG helpers stay beside that model.
3. A helper moves to a shared internal module only after at least two sibling components need it.
4. Old internal paths are removed after their repository consumers move; internal compatibility barrels are not retained.
5. Category subpaths are the canonical public homes of domain APIs.
6. Every move must keep deterministic tests and recursive example discovery green.

Files above roughly 600–800 lines should be reviewed for cohesive splits. Line count alone is not a reason to separate code that shares one model and rendering pipeline.

## Example domains

Examples use the same conceptual vocabulary:

```text
examples/
  ai/
  maths/
    linear-algebra/
  primitives/
  text/
  layout/
  composite/
  storytelling/
  table/
  utility/
  production/       rendering and capture workflows
```

Example discovery is recursive, so categorized scenes continue to work with `npm run preview:all`. Folder names become part of filtering and resume commands, for example:

```bash
cd examples
npm run preview:all -- --match ai
npx tsx ai/neural-networks.ts --preview
```

Moves are performed one domain at a time together with documentation and direct test-path updates. Category names describe subject ownership; rendering dimensionality does not create separate `spatial` ownership. For example, `Text3D` remains text and a parametric surface remains mathematics.
