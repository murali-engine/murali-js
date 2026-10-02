# Neural-network diagrams

Murali JS separates a neural network's semantic model from its rendered and animated state. Layers, nodes, and edges have stable IDs, so examples can explain actual values and weights without hand-positioned overlays.

## Build a model

`neuralNetwork` accepts named layers. Dense adjacent connectivity is the default:

```ts
const model = neuralNetwork([
  { id: "input", label: "Features", nodes: ["x₁", "x₂"] },
  { id: "hidden", label: "Hidden", nodes: 3, activation: "ReLU" },
  { id: "output", label: "Prediction", nodes: ["ŷ"], activation: "sigmoid" },
], {
  weights: [
    [[0.9, -0.4], [-0.6, 0.8], [0.3, 0.7]],
    [[1.2, -0.8, 0.9]],
  ],
});
```

Weight matrices use `[transition][target node][source node]`. Their dimensions are validated at authoring time.

Use explicit connections for sparse, skip, or residual networks:

```ts
const model = neuralNetwork(layers, {
  connections: [
    { from: "input:x", to: "hidden:h", weight: 0.8 },
    { from: "hidden:h", to: "output:y", weight: 1.1 },
    { id: "skip", from: "input:x", to: "output:y", weight: -0.2 },
  ],
});
```

Node references use `layer:node`. An unqualified node name is accepted only when it is unique.

## Animate computed state

Snapshots are cumulative patches. Values, activation strength, and emphasis interpolate deterministically through ordinary timeline state:

```ts
const network = NeuralNetwork(model)
  .snapshot({
    name: "input",
    nodes: { "input:x₁": { value: 0.8, activation: 0.8 } },
  })
  .snapshot({
    name: "hidden",
    nodes: { "hidden:0": { value: 0.9, activation: 0.9 } },
  });

timeline.animate(network)
  .duration(0.8)
  .morphTo(network.snapshotIndex("input"));

timeline.animate(network)
  .at(1)
  .duration(1)
  .to({
    morphProgress: network.snapshotIndex("hidden"),
    flowProgress: 0.5,
  });
```

`flowProgress` travels through the layer axis and draws every active edge at most once. It does not enumerate every complete input-to-output route.

## Visual encoding

By default:

- node fill shows activation magnitude and sign;
- edge color shows weight sign;
- edge thickness shows weight magnitude;
- node values appear when a value is available;
- activation names are annotations on their layer;
- colors inherit semantic scene-theme roles.

`NeuralNetwork(model, options)` can override those colors, encodings, numeric precision, edge thickness, and pulse size.

## Compatibility and route utilities

`networkDiagram([3, 5, 2])` remains the compact compatibility constructor. `networkPaths()` remains available when exhaustive routes are explicitly wanted. Prefer:

- `networkEdges(model, true)` for unique active edges;
- `networkRoutes(model, { maxPaths: 64 })` for bounded deterministic route selection;
- `SignalFlow` for paths that are not owned by a neural-network model.

The runnable reference is [`examples/ai/neural-networks.ts`](../examples/ai/neural-networks.ts).
