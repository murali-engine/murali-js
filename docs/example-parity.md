# Murali example parity

Working checklist for porting the Rust examples in `/Users/ravishankar/personal-work/animation/murali/examples`. There are 51 of them. Manim is the model they come from. This file is the order we tackle them in.

Capability status stays in [`feature-parity.md`](./feature-parity.md). An example is done only when it meets that ledger's completion rule: a documented API, deterministic tests, a runnable Venu scene, a comparison with the Murali example, and any intentional web difference written down. Checking a box here means all five are true.

Do not port a later example by rebuilding a missing shared piece inside that one scene. Build the shared piece, then port every example that was waiting on it.

Hex colors may stand in for Murali's named palette until that palette exists. The picture still has to match.

## Order

1. Primitive scenes the engine can already express, plus the small holes those scenes still have: a named color palette, dashed strokes, and `indicate()`.
2. Transparent PNG export, for the logo mark.
3. Number plane, axes, and vector arrows, then the graph and linear-algebra scenes.
4. An updater and a traced path, then particles, streamlines, and force fields.
5. Math text, tables, and code blocks. Math text is KaTeX or MathML sampled at scene time, not a TeX or Typst subprocess. Code blocks are browser text. Both must stay a function of scene time.
6. glTF props, 3D axes, curves, and surfaces, on the scene camera that already exists.
7. Child scenes (`SceneView`): a second timeline with its own camera and clock.
8. Teaching composites: tensors, networks, attention, openings, chat input, and stepwise stories.

## 1. Primitive scenes

Engine today: timeline, layout, shapes, labels, lines, arrows, paths, typewrite, stroke draw, groups, stacks, portrait frames, preview, and MP4.

| Done | Example | Notes |
| --- | --- | --- |
| | `hello_shapes` | Scene script now follows Murali: palette colors, labels, footer, and shape draw. Not checked until the rendered frames are compared. |
| | `layout_and_groups` | Scene script now follows Murali: helpers place labels and the cluster, then each object moves from a messy start. Not checked until the rendered frames are compared. |
| | `motion_basics` | Scene script now follows Murali. Not checked until the rendered frames are compared. |
| | `portrait_video` | Scene script now follows Murali on the 9:16 frame. Not checked until the rendered frames are compared. |
| | `style_and_paths` | Scene script now follows Murali, including dashes and a world-space path. `examples/text-and-paths.ts` remains the earlier smaller demo. Not checked until the rendered frames are compared. |
| | `text_animation` | Scene script now follows Murali, including typewriter, centered reveal, indicate, and undraw. Not checked until the rendered frames are compared. |
| | `murali_logo` | Scene script now follows Murali, including the commented-out title and footer. Not checked until the rendered frames are compared. |

Shared holes to close in this step, before calling the rows done:

- Named colors (`RED_B`, `GOLD_C`, and the rest of the Murali palette). Present.
- Dashed strokes. Present on lines and paths.
- `indicate()`. Present: a scale and color pulse that rests at both ends.

## 2. Still image export

| Done | Example | Notes |
| --- | --- | --- |
| | `murali_logo_transparent` | Scene script follows Murali and writes a transparent PNG. Not checked until the image is compared. |

## 3. Plane, axes, and vectors

Shared piece: a number plane, 2D axes, and a vector arrow. Plots and linear-algebra panels build on that, not the other way around.

| Done | Example | Notes |
| --- | --- | --- |
| | `graphs_2d` | Scene script now follows Murali on `NumberPlane`, `Axes`, a sampled sine, scatter marks, and a legend. `VectorArrow` is available for the linear-algebra scenes, which are not ported yet. Not checked until the rendered frames are compared. |
| | `linear_algebra_vectors` | |
| | `linear_algebra_span` | |
| | `linear_algebra_dot_product` | |
| | `linear_algebra_basis_change` | |
| | `linear_algebra_matrix_vector` | |
| | `linear_algebra_matrix_transform` | |
| | `linear_algebra_column_combination` | |
| | `linear_algebra_determinant` | |
| | `linear_algebra_composition` | |
| | `linear_algebra_transform_order_scene_view` | Also needs a child scene from step 7. Port the picture after step 3; the inset waits for step 7. |

## 4. Updaters and traced paths

Shared piece: a value that is a function of scene time, and a path that grows from a moving point. No wall clock.

| Done | Example | Notes |
| --- | --- | --- |
| | `traced_paths` | |
| | `particles` | |
| | `streamlines` | |
| | `force_fields` | The field changes because the charges move, still sampled at `t`. |

## 5. Math text, tables, and code

| Done | Example | Notes |
| --- | --- | --- |
| | `tables` | A table that writes in and unwrites. |
| | `code_blocks` | Syntax-colored browser text on the timeline. |
| | `latex_and_typst` | Deterministic math rendering, plus one morph. Morph is still an engine gap. |
| | `equation_and_matrix_animation` | Equation continuity and matrix highlight steps. |
| | `fourier_formula_trace` | Also needs the traced path from step 4. |

## 6. 3D objects on the existing camera

The scene camera can already move, look at a target, zoom, and orbit. These examples are missing the objects it would look at.

| Done | Example | Notes |
| --- | --- | --- |
| | `curves_3d` | Parametric curve and 3D axes. |
| | `surfaces_3d` | Parametric surface and a progressive reveal. |
| | `wireframe_surfaces` | Same surface, drawn as a wireframe. |
| | `textured_surface` | An image wrapped on a parametric surface. |
| | `prop3d_glb` | A `.glb` prop placed and animated by the timeline. |
| | `prop3d_gltf` | A `.gltf` plus its `.bin`. |
| | `model_inspector` | Load a model, frame it, and rotate it from scene time. |
| | `map_projection_morph` | A textured surface whose vertices are a function of `t`. |

## 7. Child scenes

Shared piece: a scene inside a scene, with its own clock, camera, and loop. The parent samples both deterministically.

| Done | Example | Notes |
| --- | --- | --- |
| | `scene_view` | |
| | `opening_scene_view` | Also uses the opening composite from step 8. |
| | `linear_algebra_transform_order_scene_view` | Finish the inset left open in step 3. |

## 8. Teaching composites

Build these on the pieces above. Do not add them to the core engine.

| Done | Example | Needs |
| --- | --- | --- |
| | `neural_networks` | Network diagram and a signal playing along edges. |
| | `transformer_attention` | Token row, attention matrix, transformer block. |
| | `context_window` | Role-tagged context blocks and token budget. |
| | `kv_cache` | Tensor grid with rows filling over time. |
| | `normalization` | Layer-norm before/after view. |
| | `next_token_distribution` | Logits, probabilities, and sampling readout. |
| | `tensor_semantics` | Named-axis tensor grid. |
| | `tensor_operations` | Broadcast, split, merge, reshape. |
| | `tensor_slicing` | Rank-4 activations shown as token-by-feature. |
| | `self_attention_lesson` | The tensor grid fed by `examples/data/self_attention_trace.json`. |
| | `stepwise_storytelling` | Stepwise reveal and replay. |
| | `chat_input_box` | Chat input composite and typewriter prompt. |
| | `kavriq_opening` | Opening composite. Perspective camera already exists. |

## Count

| Step | Examples |
| --- | --- |
| 1. Primitives | 7 |
| 2. Still image export | 1 |
| 3. Plane and vectors | 11 |
| 4. Updaters | 4 |
| 5. Math, tables, code | 5 |
| 6. 3D objects | 8 |
| 7. Child scenes | 2 new, plus the inset left open in step 3 |
| 8. Teaching composites | 13 |
| Total | 51 |

`linear_algebra_transform_order_scene_view` is counted in step 3. Step 7 finishes its inset; it is not another example.
