# Example collections

Examples follow the same subject taxonomy as the public Murali JS API. Categorized scenes currently live under:

- `ai/` — neural networks, transformers, tensors, sampling, and context
- `maths/linear-algebra/` — vectors, projections, matrices, determinants, and transforms

The remaining root scenes are retained while they are reviewed and moved into `primitives`, `text`, `layout`, `composite`, `storytelling`, `table`, `utility`, or `production`. Example discovery is recursive, so moving a scene does not remove it from `npm run preview:all`.

New examples should use category imports such as `murali-js/ai` or `murali-js/maths`. The root `murali-js` import remains available as a compatibility prelude.

Prefer one animated teaching story over several static API samples. Variants remain separate only when their output format or runtime behavior is itself under test—for example portrait versus landscape responsiveness.
