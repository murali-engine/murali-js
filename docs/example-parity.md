# Murali example parity

This is the implementation and visual-comparison ledger for the 51 Rust examples in `/Users/ravishankar/personal-work/animation/murali/examples`. It is not the product roadmap; current priorities are in [`roadmap.md`](./roadmap.md). Manim is the model the examples ultimately derive from.

Current implementation coverage: **all 51 Murali examples have runnable Venu counterparts.** Most ports still need direct rendered comparison, so their parity cells remain blank even though their scene scripts exist.

Capability status stays in [`feature-parity.md`](./feature-parity.md). An example is done only when it meets that ledger's completion rule: a documented API, deterministic tests, a runnable Venu scene, a comparison with the Murali example, and any intentional web difference written down. Checking a box here means all five are true. A blank box means “parity not yet proven,” not necessarily “unimplemented.”

Shared capabilities belong in Venu's reusable layers rather than being rebuilt inside one example. Browser-native substitutions are allowed, but the visible or behavioral difference must be recorded.

## Capability groups

1. Primitive scenes the engine can already express, plus the small holes those scenes still have: a named color palette, dashed strokes, and `indicate()`.
2. Transparent PNG export, for the logo mark.
3. Number plane, axes, and vector arrows, then the graph and linear-algebra scenes.
4. An updater and a traced path, then particles, streamlines, and force fields.
5. Math text, tables, and code blocks. Math text is KaTeX or MathML sampled at scene time, not a TeX or Typst subprocess. Code blocks are browser text. Both must stay a function of scene time.
6. glTF props, 3D axes, curves, and surfaces, on the scene camera that already exists.
7. Child scenes (`SceneView`): a second timeline with its own camera and clock.
8. Teaching composites: tensors, networks, attention, openings, chat input, and stepwise stories.

## 1. Primitive scenes

Capabilities exercised: timeline, layout, shapes, labels, lines, arrows, paths, typewrite, stroke draw, groups, stacks, portrait frames, preview, and MP4.

| Parity | Example | Notes |
| --- | --- | --- |
| | `hello_shapes` | Scene script now follows Murali: palette colors, labels, footer, and shape draw. Not checked until the rendered frames are compared. |
| | `layout_and_groups` | Scene script now follows Murali: helpers place labels and the cluster, then each object moves from a messy start. Not checked until the rendered frames are compared. |
| | `motion_basics` | Scene script now follows Murali. Not checked until the rendered frames are compared. |
| | `portrait_video` | Scene script now follows Murali on the 9:16 frame. Not checked until the rendered frames are compared. |
| | `style_and_paths` | Scene script now follows Murali, including dashes and a world-space path. `examples/text-and-paths.ts` remains the earlier smaller demo. Not checked until the rendered frames are compared. |
| | `text_animation` | Scene script now follows Murali, including typewriter, centered reveal, indicate, and undraw. Not checked until the rendered frames are compared. |
| | `murali_logo` | Scene script now follows Murali, including the commented-out title and footer. Not checked until the rendered frames are compared. |

Shared capabilities exercised by this group:

- Named colors (`RED_B`, `GOLD_C`, and the rest of the Murali palette). Present.
- Dashed strokes. Present on lines and paths.
- `indicate()`. Present: a scale and color pulse that rests at both ends.

## 2. Still image export

| Parity | Example | Notes |
| --- | --- | --- |
| | `murali_logo_transparent` | Scene script follows Murali and writes a transparent PNG. Not checked until the image is compared. |

## 3. Plane, axes, and vectors

Shared piece: a number plane, 2D axes, and a vector arrow. Plots and linear-algebra panels build on that, not the other way around.

| Parity | Example | Notes |
| --- | --- | --- |
| | `graphs_2d` | Scene script follows Murali on `NumberPlane`, `Axes`, a sampled sine, scatter marks, and a legend. `VectorArrow` is shared with the ported linear-algebra scenes. Not checked until the rendered frames are compared. |
| | `linear_algebra_vectors` | Scene script follows Murali: number plane, labeled `v`, three coordinate readouts, a feature list, a small arrow, and a scalar multiple. Not checked until the rendered frames are compared. |
| | `linear_algebra_span` | Scene script now follows Murali: span lines, basis `u` and `v`, a combination, a parallelogram sum, and the column readout. Not checked until the rendered frames are compared. |
| | `linear_algebra_dot_product` | Scene script now follows Murali: labeled `a` and `b`, the angle, the projection and right-angle mark, and three dot-product meters. Not checked until the rendered frames are compared. |
| | `linear_algebra_basis_change` | Scene script now follows Murali: the standard grid, the tilted basis grid, `v`, and both coordinate readouts. Not checked until the rendered frames are compared. |
| | `linear_algebra_matrix_vector` | Scene script now follows Murali: source and transformed grids, labeled `x` and `Ax`, and both matrix-vector flows. Matrix cells are labels inside line brackets; spacing uses the character-width estimate, not Murali's font metrics. Not checked until the rendered frames are compared. |
| | `linear_algebra_matrix_transform` | Scene script now follows Murali: the source and transformed grids with basis arrows, the highlighted matrix columns, `x` and `Ax`, and the output column. Column plates are flat rectangles behind the cells. Not checked until the rendered frames are compared. |
| | `linear_algebra_column_combination` | Scene script now follows Murali: scaled columns `a1` and `a2`, the sum `Ax`, the target `b` and its residual, the highlighted matrix, and the rank and dimension badges. Badge plates stay square; Murali's are rounded. Not checked until the rendered frames are compared. |
| | `linear_algebra_determinant` | Scene script now follows Murali: three cases, each with a grid, the unit-square image, and the matrix. A positive area is a filled parallelogram; a collapse is the red diagonal. Not checked until the rendered frames are compared. |
| | `linear_algebra_composition` | Scene script now follows Murali: A, B, BA, and AB as highlighted matrices. Not checked until the rendered frames are compared. |
| | `linear_algebra_transform_order_scene_view` | Scene script now follows Murali: two child scenes, path 1 and path 2. The second clock stays at zero until that inset moves up, then each plays once. Not checked until the rendered frames are compared. |

## 4. Updaters and traced paths

Shared piece: a value that is a function of scene time, and a path that grows from a moving point. No wall clock.

| Parity | Example | Notes |
| --- | --- | --- |
| | `traced_paths` | Scene script now follows Murali: the wheel, the dot, and the cycloid. The trace is rebuilt from the point at scene time, sampled every 1/60s, so a seek matches a forward play. Not checked until the rendered frames are compared. |
| | `particles` | Scene script now follows Murali: one seeded belt whose phase is `1.05` times elapsed scene time. The hash uses JavaScript sine, so a dot is not bit-identical to Murali's 32-bit sine. Not checked until the rendered frames are compared. |
| | `streamlines` | Scene script now follows Murali: fourteen seeds grow from 1 step to 170 with an in-out quad. The growth is a function of scene time. Not checked until the rendered frames are compared. |
| | `force_fields` | Scene script now follows Murali: the arrows follow the two moving charges, and the gold path is the fixed plus-mark trail. Charge motion is a function of scene time. Not checked until the rendered frames are compared. |

## 5. Math text, tables, and code

| Parity | Example | Notes |
| --- | --- | --- |
| | `tables` | Scene script now follows Murali: the grid draws, then the cells type on, then the table unwrites. Not checked until the rendered frames are compared. |
| | `code_blocks` | Scene script now follows Murali: a dark Rust window, then a light TOML window. Coloring is browser text for those two languages, not a Typst highlighter. Not checked until the rendered frames are compared. |
| | `latex_and_typst` | Scene script now follows Murali using MathML from the source string. The vector morph is a crossfade; glyph morphing is still an engine gap. Not checked until the rendered frames are compared. |
| | `equation_and_matrix_animation` | Scene script now follows Murali: keyed terms slide from `x + 2 = 5` to `x = 5 - 2`, then the matrix focuses a row, a column, and the diagonal. Not checked until the rendered frames are compared. |
| | `fourier_formula_trace` | Scene script follows the epicycle trace. The π outline is a geometric stand-in, not a Typst glyph. Not checked until the rendered frames are compared. |

## 6. 3D objects on the existing camera

These examples exercise the shared scene camera with Three.js geometry and assets.

| Parity | Example | Notes |
| --- | --- | --- |
| | `curves_3d` | Scene script now follows Murali: perspective camera, 3D axes, and a parametric curve that draws on with a pulse. Lines are WebGL lines, so thickness is in pixels rather than world units. Not checked until the rendered frames are compared. |
| | `surfaces_3d` | Scene script now follows Murali: the hill writes in by parameter row, colored by height. Not checked until the rendered frames are compared. |
| | `wireframe_surfaces` | Scene script now follows Murali: the saddle grid draws across, then down. Not checked until the rendered frames are compared. |
| | `textured_surface` | Scene script now follows Murali: a wire sphere writes in, then a textured sphere replaces it. The map is generated in the page, not Murali's Earth JPEG. Not checked until the rendered frames are compared. |
| | `prop3d_glb` | Scene script now follows Murali: the pyramid is placed, lifted, dropped, and turned. The file is parsed before the first frame, and the model moves in the 3D world rather than by sliding the canvas. The source quaternions are the same orientation, so the yaw is interpolated through one full turn instead. Titles sit in the fixed overlay frame, so the perspective camera does not project them. Not checked until the rendered frames are compared. |
| | `prop3d_gltf` | Scene script now follows Murali: the apple and its sibling `.bin` are inlined and use the same motion as the pyramid, at scale 1.65. Not checked until the rendered frames are compared. |
| | `model_inspector` | Scene script follows the default preview: the apple is fitted to a span of 4.2 and turns at 24 degrees per second for one revolution. Pointer orbit, wheel zoom, and the keyboard modes are not in the recording, and the footer says so. Captions use those same fractions of the fixed frame. Not checked until the rendered frames are compared. |
| | `map_projection_morph` | Scene script now follows Murali: five projection blends, each a function of scene time. The graticule and caption read that same time. Graticule lines are WebGL lines, so thickness is in pixels. The map image is generated, not Murali's Earth JPEG. Not checked until the rendered frames are compared. |

## 7. Child scenes

Shared piece: a scene inside a scene, with its own clock, camera, and loop. The parent samples both deterministically.

| Parity | Example | Notes |
| --- | --- | --- |
| | `scene_view` | Scene script now follows Murali: the network is a child scene looping every 3.5 seconds while the parent moves that inset aside and explains it. The child picture is transparent, so the view's own plate shows behind it. Not checked until the rendered frames are compared. |
| | `opening_scene_view` | Ported with the shared `Opening` composite inside a once-playing `SceneView`, followed by the observe/reason/explain parent sequence and signal pulses. Rendered successfully; direct Murali comparison remains. |
| | `linear_algebra_transform_order_scene_view` | The outer pair is scripted in step 3's row. |

## 8. Teaching composites

These are domain-level components built on the core scene, timeline, layout, and rendering layers.

| Parity | Example | Needs |
| --- | --- | --- |
| | `neural_networks` | Scene script now follows Murali: a 3-5-4-2 network, two dim nodes, and four forward passes of the gold pulse. The trace is the same routes left at full progress. Not checked until the rendered frames are compared. |
| | `transformer_attention` | Scene script now follows Murali: a token row, an attention heatmap, and a pre-norm block. The gold and teal pulses each play once. Stage emphasis is a function of scene time, not a stored focus flag. Not checked until the rendered frames are compared. |
| | `context_window` | Scene script now follows Murali: five role-tagged blocks inside one 8192-token budget. History keeps 2700 of 4900 tokens, trimmed from the start. Not checked until the rendered frames are compared. |
| | `kv_cache` | Scene script now follows Murali: key and value rows fill one token at a time, and the newest row is outlined. Not checked until the rendered frames are compared. |
| | `normalization` | Scene script now follows Murali: each token row shows its residual values beside that row's layer-norm, with the row's mean and divisor. Sums are rounded to 32 bits. The divisor is the square root of variance plus 1e-5, not of the variance alone. Not checked until the rendered frames are compared. |
| | `next_token_distribution` | Scene script now follows Murali: temperature 0.85, then the top 5, then top-p 0.90, then one draw at 0.61. Three tokens remain and the draw selects blue. Exponentials are 64-bit and still pick that same token. The entropy bar is centered on its placed point, with empty space below the label so the bar stays there. Not checked until the rendered frames are compared. |
| | `tensor_semantics` | Scene script now follows Murali: QK^T, scale by sqrt(2), a causal mask of -4, then softmax. The "reads" row stays highlighted. Products are rounded to 32 bits. Not checked until the rendered frames are compared. |
| | `tensor_operations` | Scene script now follows Murali: a feature bias stored out of order is added by element id, the result splits in two, then those halves merge and reshape onto explicit axes. The value change is a smoothstep of scene time. Products and sums are 32-bit. Label widths are character estimates. Not checked until the rendered frames are compared. |
| | `tensor_slicing` | Scene script now follows Murali: batch 0, head 0, then head 1, as token by feature. The head change is a smoothstep of scene time. Activations use JavaScript sine; the printed cells match the 32-bit scene. Not checked until the rendered frames are compared. |
| | `self_attention_lesson` | Scene script now follows Murali: the trace file drives embeddings, Q, K, and V, then scale, a causal mask of -20, softmax, the residual add, and one categorical draw. The last draw at 0.78 selects clearly. Products are 32-bit. Exponentials are 64-bit and still select that token. Label widths are character estimates. Not checked until the rendered frames are compared. |
| | `stepwise_storytelling` | Scene script now follows Murali through the fluent `step`, `connect`, `route`, and `sequence` builder: four steps reveal in order, the feedback hop drops below the row, then a teal signal replays the journey including that hop. Reveal progress is eased, and each step smoothsteps inside its own share. Node widths are character estimates. The diagram is anchored on the first step, with empty space on the other sides, because Venu places an object by its center. Representative Venu frames have been checked; direct side-by-side comparison with Murali remains. |
| | `chat_input_box` | Scene script now follows Murali: the user bubble and send button fade in, then the prompt types; the reply bubble follows. Tips hang below the box. The box stays on its placed point, with empty space above matching the tip. Text positions use a character-width estimate. Not checked until the rendered frames are compared. |
| | `kavriq_opening` | Ported through the reusable `Opening` builder: perspective landing, procedural marble faces, deterministic glyph particles, dissolve, and tagline reveal. Rendered successfully; direct Murali comparison remains. |

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

Implementation coverage: 51 ported, 0 missing. Parity completion remains intentionally lower until rendered comparisons are recorded.

`linear_algebra_transform_order_scene_view` is counted in step 3. Step 7 finishes its inset; it is not another example.
