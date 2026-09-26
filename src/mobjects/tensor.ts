import { Tattva, type Vec2 } from "../core/Tattva.ts";

const f32 = Math.fround;
const smoothstep = (value: number) => value * value * (3 - 2 * value);

export interface TensorAxis {
  id: string;
  label: string;
  elementIds: readonly string[];
  elementLabels: readonly string[];
}

export interface TensorSnapshot {
  id: string;
  values: readonly number[];
  axes: readonly TensorAxis[];
}

export interface TensorMorph {
  at: number;
  duration: number;
  to: TensorSnapshot;
}

export interface TensorViewOptions {
  cellWidth: number;
  cellHeight: number;
  labelHeight: number;
  valueHeight: number;
  /** Value blends. Progress is smoothstep, matching Murali's InOutSmooth. */
  morphs?: readonly TensorMorph[];
}

export interface TensorSample {
  elementId: string;
  token: string;
  probability: number;
}

export interface AttentionTrace {
  tokens: readonly { id: string; text: string }[];
  tensors: readonly {
    id: string;
    values: readonly number[];
    axes: readonly {
      id: string;
      label: string;
      element_ids: readonly string[];
      element_labels: readonly string[];
    }[];
  }[];
}

export interface AttentionLesson {
  tokens: readonly string[];
  embeddings: TensorSnapshot;
  queries: TensorSnapshot;
  keys: TensorSnapshot;
  values: TensorSnapshot;
  scores: TensorSnapshot;
  scaled: TensorSnapshot;
  masked: TensorSnapshot;
  attention: TensorSnapshot;
  context: TensorSnapshot;
  residual: TensorSnapshot;
  logits: TensorSnapshot;
  probabilities: TensorSnapshot;
  sample: TensorSample;
}

export function tensorAxis(
  id: string,
  label: string,
  elements: readonly (readonly [string, string])[],
): TensorAxis {
  return {
    id,
    label,
    elementIds: elements.map(([elementId]) => elementId),
    elementLabels: elements.map(([, elementLabel]) => elementLabel),
  };
}

export function tensorSnapshot(id: string, values: readonly number[], axes: readonly TensorAxis[]): TensorSnapshot {
  const count = axes.reduce((product, axis) => product * axis.elementIds.length, 1);
  if (count !== values.length) throw new Error(`${id} has ${values.length} values for ${count} elements.`);
  return { id, values: values.map((value) => f32(value)), axes };
}

/** Add after aligning the right-hand side by axis id and element id. The left snapshot owns the shape. */
export function tensorAdd(left: TensorSnapshot, right: TensorSnapshot, outputId: string): TensorSnapshot {
  const leftShape = shapeOf(left);
  const rightShape = shapeOf(right);
  const values = left.values.map((lhs, flat) => {
    const leftIndices = unravel(flat, leftShape);
    const rightIndices = right.axes.map((axis) => {
      const leftAxis = left.axes.findIndex((candidate) => candidate.id === axis.id);
      if (leftAxis < 0) throw new Error(`elementwise add is missing axis ${axis.id}.`);
      if (axis.elementIds.length === 1) return 0;
      const elementId = left.axes[leftAxis]?.elementIds[leftIndices[leftAxis] ?? 0];
      const position = axis.elementIds.indexOf(elementId ?? "");
      if (position < 0) throw new Error(`elementwise add is missing element ${elementId ?? ""} on ${axis.id}.`);
      return position;
    });
    return f32(f32(lhs) + f32(right.values[flatIndex(rightIndices, rightShape)] ?? 0));
  });
  return { id: outputId, values, axes: left.axes };
}

export function tensorSplit(
  snapshot: TensorSnapshot,
  axisId: string,
  lengths: readonly number[],
  outputIds: readonly string[],
): TensorSnapshot[] {
  const shape = shapeOf(snapshot);
  const axis = axisIndex(snapshot, axisId);
  if (lengths.reduce((sum, length) => sum + length, 0) !== shape[axis]) {
    throw new Error(`split lengths must cover ${axisId}.`);
  }
  let offset = 0;
  return lengths.map((length, part) => {
    const outShape = shape.slice();
    outShape[axis] = length;
    const count = outShape.reduce((product, size) => product * size, 1);
    const values: number[] = [];
    for (let flat = 0; flat < count; flat += 1) {
      const indices = unravel(flat, outShape);
      indices[axis] = (indices[axis] ?? 0) + offset;
      values.push(snapshot.values[flatIndex(indices, shape)] ?? 0);
    }
    const axes = snapshot.axes.map((spec, index) => index === axis
      ? {
        ...spec,
        elementIds: spec.elementIds.slice(offset, offset + length),
        elementLabels: spec.elementLabels.slice(offset, offset + length),
      }
      : spec);
    offset += length;
    return { id: outputIds[part] ?? snapshot.id, values, axes };
  });
}

export function tensorMerge(snapshots: readonly TensorSnapshot[], axisId: string, outputId: string): TensorSnapshot {
  const first = snapshots[0];
  if (!first) throw new Error("merge needs at least one tensor.");
  const axis = axisIndex(first, axisId);
  const axes = first.axes.map((spec, index) => index === axis
    ? {
      ...spec,
      elementIds: snapshots.flatMap((snapshot) => snapshot.axes[axis]?.elementIds ?? []),
      elementLabels: snapshots.flatMap((snapshot) => snapshot.axes[axis]?.elementLabels ?? []),
    }
    : spec);
  const shape = shapeOf({ id: outputId, values: [], axes });
  const count = shape.reduce((product, size) => product * size, 1);
  const values: number[] = [];
  for (let flat = 0; flat < count; flat += 1) {
    const indices = unravel(flat, shape);
    let cursor = indices[axis] ?? 0;
    let source = first;
    for (const snapshot of snapshots) {
      const length = shapeOf(snapshot)[axis] ?? 0;
      if (cursor < length) {
        source = snapshot;
        break;
      }
      cursor -= length;
    }
    const sourceIndices = indices.slice();
    sourceIndices[axis] = cursor;
    values.push(source.values[flatIndex(sourceIndices, shapeOf(source))] ?? 0);
  }
  return { id: outputId, values, axes };
}

export function tensorReshape(snapshot: TensorSnapshot, outputId: string, axes: readonly TensorAxis[]): TensorSnapshot {
  const count = axes.reduce((product, axis) => product * axis.elementIds.length, 1);
  if (count !== snapshot.values.length) throw new Error("reshape axes must cover the same values.");
  return { id: outputId, values: snapshot.values, axes };
}

/** Drop fixed axes, then keep the named row and column axes in that order. */
export function tensorProject2d(
  snapshot: TensorSnapshot,
  outputId: string,
  rowAxisId: string,
  columnAxisId: string,
  fixed: Readonly<Record<string, string>>,
): TensorSnapshot {
  const sliced = tensorSlice(snapshot, outputId, fixed);
  if (sliced.axes.length !== 2) throw new Error("a 2D projection must keep exactly two axes.");
  if (sliced.axes[0]?.id === rowAxisId && sliced.axes[1]?.id === columnAxisId) return sliced;
  if (sliced.axes[0]?.id === columnAxisId && sliced.axes[1]?.id === rowAxisId) return tensorTranspose2d(sliced, outputId);
  throw new Error("row and column must name the two retained axes.");
}

export function tensorTranspose2d(snapshot: TensorSnapshot, outputId: string): TensorSnapshot {
  const rows = snapshot.axes[0]?.elementIds.length ?? 0;
  const columns = snapshot.axes[1]?.elementIds.length ?? 0;
  const values = Array.from({ length: rows * columns }, () => 0);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      values[column * rows + row] = snapshot.values[row * columns + column] ?? 0;
    }
  }
  return { id: outputId, values, axes: [snapshot.axes[1], snapshot.axes[0]].filter((axis): axis is TensorAxis => axis !== undefined) };
}

/** Contract on element id, not storage order. Each product and running sum is 32-bit. */
export function tensorMatmul(left: TensorSnapshot, right: TensorSnapshot, outputId: string): TensorSnapshot {
  if (left.axes.length !== 2 || right.axes.length !== 2) throw new Error("matmul needs rank-2 tensors.");
  if (left.axes[1]?.id !== right.axes[0]?.id) throw new Error("matmul contraction axes do not match.");
  const aligned = (left.axes[1]?.elementIds ?? []).map((elementId) => {
    const index = right.axes[0]?.elementIds.indexOf(elementId) ?? -1;
    if (index < 0) throw new Error(`matmul is missing element ${elementId}.`);
    return index;
  });
  const rows = left.axes[0]?.elementIds.length ?? 0;
  const contracted = aligned.length;
  const columns = right.axes[1]?.elementIds.length ?? 0;
  const values: number[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      let sum = 0;
      for (let lane = 0; lane < contracted; lane += 1) {
        const rightRow = aligned[lane] ?? 0;
        sum = f32(sum + f32(f32(left.values[row * contracted + lane] ?? 0) * f32(right.values[rightRow * columns + column] ?? 0)));
      }
      values.push(sum);
    }
  }
  const rowAxis = left.axes[0];
  const columnAxis = right.axes[1];
  if (!rowAxis || !columnAxis) throw new Error("matmul is missing an axis.");
  return { id: outputId, values, axes: [rowAxis, columnAxis] };
}

export function tensorScale(snapshot: TensorSnapshot, divisor: number): TensorSnapshot {
  const scale = f32(divisor);
  return { ...snapshot, values: snapshot.values.map((value) => f32(f32(value) / scale)) };
}

export function tensorCausalMask(snapshot: TensorSnapshot, maskedValue: number): TensorSnapshot {
  const rows = snapshot.axes[0]?.elementIds.length ?? 0;
  const columns = snapshot.axes[1]?.elementIds.length ?? 0;
  const values = snapshot.values.slice();
  for (let row = 0; row < rows; row += 1) {
    for (let column = row + 1; column < columns; column += 1) values[row * columns + column] = f32(maskedValue);
  }
  return { ...snapshot, values };
}

/** Stable softmax along one named axis. The exponential is 64-bit. */
export function tensorSoftmax(snapshot: TensorSnapshot, axisId: string): TensorSnapshot {
  const shape = shapeOf(snapshot);
  const axis = axisIndex(snapshot, axisId);
  const axisLength = shape[axis] ?? 0;
  const inner = shape.slice(axis + 1).reduce((product, size) => product * size, 1);
  const outer = snapshot.values.length / (axisLength * inner);
  const values = snapshot.values.slice();
  for (let outerIndex = 0; outerIndex < outer; outerIndex += 1) {
    for (let innerIndex = 0; innerIndex < inner; innerIndex += 1) {
      const indexAt = (axisIndexValue: number) => outerIndex * axisLength * inner + axisIndexValue * inner + innerIndex;
      let max = Number.NEGATIVE_INFINITY;
      for (let cursor = 0; cursor < axisLength; cursor += 1) max = Math.max(max, snapshot.values[indexAt(cursor)] ?? 0);
      const weights: number[] = [];
      let sum = 0;
      for (let cursor = 0; cursor < axisLength; cursor += 1) {
        const weight = Math.exp((snapshot.values[indexAt(cursor)] ?? 0) - max);
        weights.push(weight);
        sum += weight;
      }
      for (let cursor = 0; cursor < axisLength; cursor += 1) values[indexAt(cursor)] = (weights[cursor] ?? 0) / sum;
    }
  }
  return { ...snapshot, values };
}

export function tensorSampleCategorical(
  snapshot: TensorSnapshot,
  axisId: string,
  units: readonly number[],
): TensorSample[] {
  const shape = shapeOf(snapshot);
  const axis = axisIndex(snapshot, axisId);
  const axisLength = shape[axis] ?? 0;
  const inner = shape.slice(axis + 1).reduce((product, size) => product * size, 1);
  const outer = snapshot.values.length / (axisLength * inner);
  if (units.length !== outer * inner) throw new Error("categorical sample count does not match the tensor slices.");
  const samples: TensorSample[] = [];
  let sliceIndex = 0;
  for (let outerIndex = 0; outerIndex < outer; outerIndex += 1) {
    for (let innerIndex = 0; innerIndex < inner; innerIndex += 1) {
      const slice: number[] = [];
      for (let cursor = 0; cursor < axisLength; cursor += 1) {
        slice.push(snapshot.values[outerIndex * axisLength * inner + cursor * inner + innerIndex] ?? 0);
      }
      const sum = slice.reduce((total, value) => total + value, 0);
      const unit = units[sliceIndex] ?? 0;
      sliceIndex += 1;
      let walked = 0;
      let chosen = slice.length - 1;
      for (let cursor = 0; cursor < slice.length; cursor += 1) {
        walked += (slice[cursor] ?? 0) / sum;
        if (unit < walked || cursor + 1 === slice.length) {
          chosen = cursor;
          break;
        }
      }
      const flat = outerIndex * axisLength * inner + chosen * inner + innerIndex;
      const indices = unravel(flat, shape);
      samples.push({
        elementId: snapshot.axes[axis]?.elementIds[indices[axis] ?? 0] ?? "",
        token: snapshot.axes[axis]?.elementLabels[indices[axis] ?? 0] ?? "",
        probability: (snapshot.values[flat] ?? 0) / sum,
      });
    }
  }
  return samples;
}

/** The broadcast, split, and reshape tensors from the operations scene. */
export function tensorOperationStages(): {
  activations: TensorSnapshot;
  biased: TensorSnapshot;
  left: TensorSnapshot;
  right: TensorSnapshot;
  reshaped: TensorSnapshot;
} {
  const tokens = tensorAxis("token", "Tokens", [["token.0", "AI"], ["token.1", "learns"]]);
  const features = tensorAxis("feature", "Features", [
    ["feature.0", "x0"],
    ["feature.1", "x1"],
    ["feature.2", "x2"],
    ["feature.3", "x3"],
  ]);
  const activations = tensorSnapshot("activations", [1, 2, 3, 4, 5, 6, 7, 8], [tokens, features]);
  const bias = tensorSnapshot("bias", [0.4, 0.1, 0.3, 0.2], [
    tensorAxis("feature", "Bias", [
      ["feature.3", "x3"],
      ["feature.0", "x0"],
      ["feature.2", "x2"],
      ["feature.1", "x1"],
    ]),
  ]);
  const biased = tensorAdd(activations, bias, "activations");
  const [left, right] = tensorSplit(biased, "feature", [2, 2], ["features.left", "features.right"]);
  if (!left || !right) throw new Error("feature split did not produce two tensors.");
  const merged = tensorMerge([left, right], "feature", "features.merged");
  const reshaped = tensorReshape(merged, "heads", [
    tensorAxis("head_token", "Head / token", [
      ["head.0.token.0", "h0 / AI"],
      ["head.0.token.1", "h0 / learns"],
      ["head.1.token.0", "h1 / AI"],
      ["head.1.token.1", "h1 / learns"],
    ]),
    tensorAxis("channel", "Channels", [["channel.0", "c0"], ["channel.1", "c1"]]),
  ]);
  return { activations, biased, left, right, reshaped };
}

/** Batch 0 of the rank-4 activation tensor, one head at a time. Sine is JavaScript's. */
export function tensorSlicingHeads(): { headZero: TensorSnapshot; headOne: TensorSnapshot } {
  const values = Array.from({ length: 48 }, (_, index) => f32((Math.sin(f32(f32(index) * f32(0.43))) + 1) * 0.5));
  const activations = tensorSnapshot("encoder.activations", values, [
    tensorAxis("batch", "Batch", [["batch.0", "0"], ["batch.1", "1"]]),
    tensorAxis("head", "Head", [["head.0", "0"], ["head.1", "1"]]),
    tensorAxis("token", "Tokens", [["token.0", "AI"], ["token.1", "learns"], ["token.2", "by"]]),
    tensorAxis("feature", "Features", [["feature.0", "f0"], ["feature.1", "f1"], ["feature.2", "f2"], ["feature.3", "f3"]]),
  ]);
  const project = (head: string) => tensorProject2d(activations, "encoder.head.view", "token", "feature", {
    batch: "batch.0",
    head,
  });
  return { headZero: project("head.0"), headOne: project("head.1") };
}

/** Q, K, V, masked attention, the residual, and the last categorical draw from one trace. */
export function selfAttentionLesson(trace: AttentionTrace): AttentionLesson {
  const requireTensor = (id: string) => {
    const tensor = trace.tensors.find((candidate) => candidate.id === id);
    if (!tensor) throw new Error(`trace is missing ${id}.`);
    return tensorSnapshot(tensor.id, tensor.values, tensor.axes.map((axis) => ({
      id: axis.id,
      label: axis.label,
      elementIds: axis.element_ids,
      elementLabels: axis.element_labels,
    })));
  };
  const embeddings = requireTensor("embedding.query");
  const keyEmbeddings = requireTensor("embedding.key");
  const queryWeights = requireTensor("weights.q");
  const keyWeights = requireTensor("weights.k");
  const valueWeights = requireTensor("weights.v");
  const outputWeights = requireTensor("weights.output");
  const queries = tensorMatmul(embeddings, queryWeights, "attention.q");
  const keys = tensorMatmul(keyEmbeddings, keyWeights, "attention.k");
  const values = tensorMatmul(keyEmbeddings, valueWeights, "attention.v");
  const scores = tensorMatmul(queries, tensorTranspose2d(keys, "attention.k.transpose"), "attention.weights");
  const scaled = tensorScale(scores, Math.sqrt(queries.axes[1]?.elementIds.length ?? 1));
  const masked = tensorCausalMask(scaled, -20);
  const attention = tensorSoftmax(masked, "key");
  const context = tensorMatmul(attention, values, "attention.context");
  const headAxis = queryWeights.axes[1];
  const queryAxis = embeddings.axes[0];
  if (!headAxis || !queryAxis) throw new Error("trace is missing the residual axes.");
  const residualInput = tensorReshape(embeddings, "residual.input", [queryAxis, headAxis]);
  const residual = tensorAdd(residualInput, context, "residual.output");
  const logits = tensorMatmul(residual, outputWeights, "next_token");
  const probabilities = tensorSoftmax(logits, "vocabulary");
  const samples = tensorSampleCategorical(probabilities, "vocabulary", [0.15, 0.55, 0.78]);
  const sample = samples[samples.length - 1];
  if (!sample) throw new Error("the trace did not produce a sample.");
  return {
    tokens: trace.tokens.map((token) => token.text),
    embeddings,
    queries,
    keys,
    values,
    scores,
    scaled,
    masked,
    attention,
    context,
    residual,
    logits,
    probabilities,
    sample,
  };
}

export interface TensorCell {
  value: number;
  opacity: number;
}

/** Cells at `time`, matched by element id. A finished blend shows only the target. */
export function tensorCellsAt(
  time: number,
  initial: TensorSnapshot,
  morphs: readonly TensorMorph[] = [],
): TensorCell[] {
  return cellsFor(stageAt(time, initial, morphs), 0, 0).map((cell) => ({ value: cell.value, opacity: cell.opacity }));
}

/** A rank-2 tensor heatmap. Label placement uses a character-width estimate. */
export function TensorView(initial: TensorSnapshot, options: TensorViewOptions): Tattva {
  return new TensorViewTattva(initial, options);
}

class TensorViewTattva extends Tattva {
  private sampleTime = 0;

  constructor(
    private readonly initial: TensorSnapshot,
    private readonly options: TensorViewOptions,
  ) {
    super();
    const morphs = options.morphs ?? [];
    this.dynamicGeometry = morphs.length > 0;
    const snapshots = [initial, ...morphs.map((morph) => morph.to)];
    this.worldSize = frameFor(snapshots, options);
  }

  override influenceState(time: number): void {
    this.sampleTime = time;
  }

  override contentHTML(): string {
    return tensorMarkup(this.initial, this.options, this.sampleTime, this.worldSize ?? { width: 1, height: 1 });
  }
}

function tensorSlice(
  snapshot: TensorSnapshot,
  outputId: string,
  fixed: Readonly<Record<string, string>>,
): TensorSnapshot {
  const shape = shapeOf(snapshot);
  const fixedIndex = snapshot.axes.map((axis) => {
    const elementId = fixed[axis.id];
    if (elementId === undefined) return null;
    const index = axis.elementIds.indexOf(elementId);
    if (index < 0) throw new Error(`slice is missing ${elementId} on ${axis.id}.`);
    return index;
  });
  const kept = snapshot.axes.map((_, index) => index).filter((index) => fixedIndex[index] === null);
  const axes = kept.map((index) => snapshot.axes[index]).filter((axis): axis is TensorAxis => axis !== undefined);
  const outShape = kept.map((index) => shape[index] ?? 0);
  const count = outShape.reduce((product, size) => product * size, 1);
  const values: number[] = [];
  for (let flat = 0; flat < count; flat += 1) {
    const outputIndices = unravel(flat, outShape);
    const source = shape.map(() => 0);
    let cursor = 0;
    for (let axis = 0; axis < shape.length; axis += 1) {
      const fixedAt = fixedIndex[axis];
      if (fixedAt !== null && fixedAt !== undefined) source[axis] = fixedAt;
      else source[axis] = outputIndices[cursor++] ?? 0;
    }
    values.push(snapshot.values[flatIndex(source, shape)] ?? 0);
  }
  return { id: outputId, values, axes };
}

interface Stage {
  source: TensorSnapshot;
  target: TensorSnapshot;
  progress: number;
}

function stageAt(time: number, initial: TensorSnapshot, morphs: readonly TensorMorph[]): Stage {
  let current = initial;
  for (const morph of morphs) {
    if (time < morph.at) break;
    const local = Math.min(1, (time - morph.at) / morph.duration);
    const progress = local >= 1 ? 1 : smoothstep(local);
    if (progress >= 1 - 1.1920929e-7) {
      current = morph.to;
      continue;
    }
    return { source: current, target: morph.to, progress };
  }
  return { source: current, target: current, progress: 1 };
}

interface PlacedCell extends TensorCell {
  key: string;
  x: number;
  y: number;
}

function cellsFor(stage: Stage, cellWidth: number, cellHeight: number): PlacedCell[] {
  const settling = stage.progress >= 1 - 1.1920929e-7;
  if (settling) return layout(stage.target, cellWidth, cellHeight, 1);
  const source = layout(stage.source, cellWidth, cellHeight, 1);
  const target = layout(stage.target, cellWidth, cellHeight, 1);
  const sourceByKey = new Map(source.map((cell) => [cell.key, cell]));
  const matched = new Set<string>();
  const cells: PlacedCell[] = [];
  for (const next of target) {
    const previous = sourceByKey.get(next.key);
    if (!previous) {
      cells.push({ ...next, opacity: stage.progress });
      continue;
    }
    matched.add(next.key);
    cells.push({
      ...next,
      value: previous.value + (next.value - previous.value) * stage.progress,
      x: previous.x + (next.x - previous.x) * stage.progress,
      y: previous.y + (next.y - previous.y) * stage.progress,
      opacity: 1,
    });
  }
  for (const previous of source) {
    if (!matched.has(previous.key)) cells.push({ ...previous, opacity: 1 - stage.progress });
  }
  return cells;
}

function layout(snapshot: TensorSnapshot, cellWidth: number, cellHeight: number, opacity: number): PlacedCell[] {
  const rows = snapshot.axes[0]?.elementIds.length ?? 0;
  const columns = snapshot.axes[1]?.elementIds.length ?? 0;
  const width = columns * cellWidth;
  const height = rows * cellHeight;
  const cells: PlacedCell[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const rowAxis = snapshot.axes[0];
      const columnAxis = snapshot.axes[1];
      cells.push({
        key: [snapshot.id, rowAxis?.id, rowAxis?.elementIds[row], columnAxis?.id, columnAxis?.elementIds[column]].join("|"),
        x: -width / 2 + (column + 0.5) * cellWidth,
        y: height / 2 - (row + 0.5) * cellHeight,
        value: snapshot.values[row * columns + column] ?? 0,
        opacity,
      });
    }
  }
  return cells;
}

function frameFor(snapshots: readonly TensorSnapshot[], options: TensorViewOptions): { width: number; height: number } {
  let width = 0.1;
  let height = 0.1;
  for (const snapshot of snapshots) {
    const columns = snapshot.axes[1]?.elementIds.length ?? 0;
    const rows = snapshot.axes[0]?.elementIds.length ?? 0;
    const labelWidth = Math.max(...(snapshot.axes[0]?.elementLabels ?? [""]).map((label) => label.length * options.labelHeight * 0.58));
    const leftPad = labelWidth + options.labelHeight * 2.1;
    const topPad = options.labelHeight * 3.1;
    width = Math.max(width, columns * options.cellWidth + leftPad * 2);
    height = Math.max(height, rows * options.cellHeight + topPad * 2);
  }
  return { width, height };
}

function tensorMarkup(initial: TensorSnapshot, options: TensorViewOptions, time: number, frame: { width: number; height: number }): string {
  const stage = stageAt(time, initial, options.morphs ?? []);
  const cells = cellsFor(stage, options.cellWidth, options.cellHeight);
  const limit = Math.max(Number.EPSILON, ...[stage.source.values, stage.target.values].flat().map((value) => Math.abs(value)));
  const parts = [svgOpen(frame)];
  for (const cell of cells) {
    parts.push(svgRect(frame, [cell.x, cell.y], options.cellWidth * 0.98, options.cellHeight * 0.98, heat(cell.value, limit, cell.opacity)));
    parts.push(svgText(frame, [cell.x, cell.y], cell.value.toFixed(2), options.valueHeight, unitColor(0.97, 0.98, 0.99, cell.opacity), "middle"));
    const [x, y] = svgPoint(frame, [cell.x - options.cellWidth / 2, cell.y + options.cellHeight / 2]);
    parts.push(`<rect x="${x}" y="${y}" width="${options.cellWidth}" height="${options.cellHeight}" fill="none" stroke="${unitColor(0.7, 0.76, 0.82, cell.opacity)}" stroke-width="0.012" />`);
  }
  const settling = stage.source === stage.target;
  if (settling) parts.push(axisLabels(frame, stage.target, options, 1));
  else {
    parts.push(axisLabels(frame, stage.source, options, 1 - stage.progress));
    parts.push(axisLabels(frame, stage.target, options, stage.progress));
  }
  parts.push("</svg>");
  return parts.join("");
}

function axisLabels(frame: { width: number; height: number }, snapshot: TensorSnapshot, options: TensorViewOptions, opacity: number): string {
  if (opacity <= 1e-6) return "";
  const rows = snapshot.axes[0];
  const columns = snapshot.axes[1];
  if (!rows || !columns) return "";
  const gridWidth = columns.elementIds.length * options.cellWidth;
  const gridHeight = rows.elementIds.length * options.cellHeight;
  const left = -gridWidth / 2;
  const top = gridHeight / 2;
  const ink = unitColor(0.9, 0.93, 0.96, opacity);
  const parts: string[] = [];
  columns.elementLabels.forEach((label, column) => {
    parts.push(svgText(frame, [left + (column + 0.5) * options.cellWidth, top + options.labelHeight * 1.1], label, options.labelHeight, ink, "middle"));
  });
  rows.elementLabels.forEach((label, row) => {
    const labelWidth = label.length * options.labelHeight * 0.58;
    parts.push(svgText(
      frame,
      [left - labelWidth / 2 - options.labelHeight * 0.55, top - (row + 0.5) * options.cellHeight],
      label,
      options.labelHeight,
      ink,
      "middle",
    ));
  });
  parts.push(svgText(frame, [0, top + options.labelHeight * 2.5], columns.label, options.labelHeight, ink, "middle"));
  const maxWidth = Math.max(...rows.elementLabels.map((label) => label.length * options.labelHeight * 0.58));
  const [sx, sy] = svgPoint(frame, [left - maxWidth - options.labelHeight * 1.45, 0]);
  parts.push(`<text x="${sx}" y="${sy}" fill="${ink}" font-size="${options.labelHeight}" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-weight="700" text-anchor="middle" dominant-baseline="middle" transform="rotate(-90 ${sx} ${sy})">${escapeText(rows.label)}</text>`);
  return parts.join("");
}

function shapeOf(snapshot: TensorSnapshot): number[] {
  return snapshot.axes.map((axis) => axis.elementIds.length);
}

function axisIndex(snapshot: TensorSnapshot, axisId: string): number {
  const index = snapshot.axes.findIndex((axis) => axis.id === axisId);
  if (index < 0) throw new Error(`missing axis ${axisId}.`);
  return index;
}

function unravel(flat: number, shape: readonly number[]): number[] {
  const indices = shape.map(() => 0);
  let remainder = flat;
  for (let axis = shape.length - 1; axis >= 0; axis -= 1) {
    const size = shape[axis] ?? 1;
    indices[axis] = remainder % size;
    remainder = Math.floor(remainder / size);
  }
  return indices;
}

function flatIndex(indices: readonly number[], shape: readonly number[]): number {
  let flat = 0;
  let stride = 1;
  for (let axis = shape.length - 1; axis >= 0; axis -= 1) {
    flat += (indices[axis] ?? 0) * stride;
    stride *= shape[axis] ?? 1;
  }
  return flat;
}

function heat(value: number, limit: number, opacity: number): string {
  const amount = Math.max(0, Math.min(1, Math.abs(value) / limit));
  if (value < 0) return unitColor(lerp(0.12, 0.94, amount), lerp(0.16, 0.42, amount), lerp(0.22, 0.48, amount), opacity);
  return unitColor(lerp(0.12, 0.25, amount), lerp(0.16, 0.78, amount), lerp(0.22, 0.74, amount), opacity);
}

function lerp(from: number, to: number, mix: number): number {
  return from + (to - from) * mix;
}

function svgOpen(frame: { width: number; height: number }): string {
  return `<svg width="100%" height="100%" viewBox="0 0 ${frame.width} ${frame.height}" xmlns="http://www.w3.org/2000/svg">`;
}

function svgPoint(frame: { width: number; height: number }, point: Vec2): [number, number] {
  return [point[0] + frame.width / 2, frame.height / 2 - point[1]];
}

function svgRect(frame: { width: number; height: number }, center: Vec2, width: number, height: number, color: string): string {
  const [x, y] = svgPoint(frame, center);
  return `<rect x="${x - width / 2}" y="${y - height / 2}" width="${width}" height="${height}" fill="${color}" />`;
}

function svgText(
  frame: { width: number; height: number },
  point: Vec2,
  text: string,
  height: number,
  color: string,
  anchor: "start" | "middle" | "end",
): string {
  const [x, y] = svgPoint(frame, point);
  return `<text x="${x}" y="${y}" fill="${color}" font-size="${height}" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-weight="700" text-anchor="${anchor}" dominant-baseline="middle">${escapeText(text)}</text>`;
}

function unitColor(red: number, green: number, blue: number, alpha = 1): string {
  const channel = (value: number) => Math.round(Math.max(0, Math.min(1, value)) * 255);
  return `rgba(${channel(red)}, ${channel(green)}, ${channel(blue)}, ${alpha})`;
}

function escapeText(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
