import { easeInOutQuad } from "../../core/easing.ts";
import { Tattva, type TattvaState, type Vec2 } from "../../core/Tattva.ts";
import {
  resolveColorInput,
  themeColor,
  type ColorInput,
  type Theme,
} from "../../core/theme.ts";

export type NetworkOrientation = "horizontal" | "vertical";
export type NetworkActivation = "none" | "relu" | "sigmoid" | "tanh" | string;

export interface NetworkNodeInput {
  id: string;
  label?: string;
  value?: number;
}

export interface NetworkLayerInput {
  id: string;
  label?: string;
  nodes: number | readonly (string | NetworkNodeInput)[];
  activation?: NetworkActivation;
}

export interface NetworkEdgeInput {
  id?: string;
  from: string;
  to: string;
  weight?: number;
  label?: string;
}

export interface NetworkNode {
  id: string;
  layerId: string;
  layer: number;
  index: number;
  label?: string;
  value?: number;
}

export interface NetworkLayer {
  id: string;
  index: number;
  label?: string;
  activation: NetworkActivation;
  nodes: readonly NetworkNode[];
}

export interface NetworkEdge {
  id: string;
  from: string;
  to: string;
  fromLayer: number;
  toLayer: number;
  weight?: number;
  label?: string;
}

export interface NetworkDiagram {
  /** Layer sizes retained for compatibility with the original compact API. */
  layers: readonly number[];
  layerSpecs: readonly NetworkLayer[];
  nodes: readonly NetworkNode[];
  edges: readonly NetworkEdge[];
  layerSpacing: number;
  nodeSpacing: number;
  nodeRadius: number;
  inactive: ReadonlySet<string>;
  labels: readonly string[];
  orientation: NetworkOrientation;
}

export interface NeuralNetworkModelOptions {
  layerSpacing?: number;
  nodeSpacing?: number;
  nodeRadius?: number;
  inactive?: readonly string[];
  connections?: "dense" | "none" | readonly NetworkEdgeInput[];
  /** Dense weight matrices ordered as [transition][target node][source node]. */
  weights?: readonly (readonly (readonly number[])[])[];
  orientation?: NetworkOrientation;
}

/** A semantic layered network with stable layer, node, and edge identities. */
export function neuralNetwork(
  layers: readonly NetworkLayerInput[],
  options: NeuralNetworkModelOptions = {},
): NetworkDiagram {
  if (layers.length === 0) throw new Error("A neural network needs at least one layer.");
  const layerIds = new Set<string>();
  const nodeIds = new Set<string>();
  const layerSpecs: NetworkLayer[] = layers.map((layer, layerIndex) => {
    validateNetworkId(layer.id, "layer");
    if (layerIds.has(layer.id)) throw new Error(`Duplicate neural-network layer id: ${layer.id}.`);
    layerIds.add(layer.id);
    const inputs: NetworkNodeInput[] = typeof layer.nodes === "number"
      ? Array.from({ length: validateNodeCount(layer.nodes, layer.id) }, (_, index) => ({ id: String(index) }))
      : layer.nodes.map((node) => typeof node === "string" ? { id: node, label: node } : node);
    if (inputs.length === 0) throw new Error(`Neural-network layer ${layer.id} needs at least one node.`);
    const nodes = inputs.map((node, index): NetworkNode => {
      validateNetworkId(node.id, "node");
      const id = `${layer.id}:${node.id}`;
      if (nodeIds.has(id)) throw new Error(`Duplicate neural-network node id: ${id}.`);
      nodeIds.add(id);
      return { id, layerId: layer.id, layer: layerIndex, index, label: node.label, value: node.value };
    });
    return {
      id: layer.id,
      index: layerIndex,
      label: layer.label,
      activation: layer.activation ?? "none",
      nodes,
    };
  });
  const flatNodes = layerSpecs.flatMap((layer) => layer.nodes);
  const byId = new Map(flatNodes.map((node) => [node.id, node]));
  const connections = options.connections ?? "dense";
  if (options.weights && connections !== "dense") {
    throw new Error("Neural-network weight matrices can only be used with dense connectivity.");
  }
  validateWeightMatrices(layerSpecs, options.weights);
  const edgeInputs: NetworkEdgeInput[] = connections === "dense"
    ? layerSpecs.slice(0, -1).flatMap((layer, index) => {
      const next = layerSpecs[index + 1]!;
      return layer.nodes.flatMap((from) => next.nodes.map((to) => ({
        from: from.id,
        to: to.id,
        weight: options.weights?.[index]?.[to.index]?.[from.index],
      })));
    })
    : connections === "none" ? [] : [...connections];
  const edgeIds = new Set<string>();
  const edges = edgeInputs.map((edge): NetworkEdge => {
    const from = resolveNodeReference(edge.from, byId);
    const to = resolveNodeReference(edge.to, byId);
    if (from.layer >= to.layer) throw new Error(`Neural-network edge ${edge.from} -> ${edge.to} must point to a later layer.`);
    validateFiniteState(edge.weight, `${edge.from} -> ${edge.to} weight`);
    const id = edge.id ?? `${from.id}->${to.id}`;
    if (edgeIds.has(id)) throw new Error(`Duplicate neural-network edge id: ${id}.`);
    edgeIds.add(id);
    return { ...edge, id, from: from.id, to: to.id, fromLayer: from.layer, toLayer: to.layer };
  });
  return {
    layers: layerSpecs.map((layer) => layer.nodes.length),
    layerSpecs,
    nodes: flatNodes,
    edges,
    layerSpacing: positive(options.layerSpacing ?? 1.8, "Layer spacing"),
    nodeSpacing: positive(options.nodeSpacing ?? 0.8, "Node spacing"),
    nodeRadius: positive(options.nodeRadius ?? 0.12, "Node radius"),
    inactive: new Set((options.inactive ?? []).map((id) => resolveNodeReference(id, byId).id)),
    labels: layerSpecs.map((layer) => layer.label ?? ""),
    orientation: options.orientation ?? "horizontal",
  };
}

/** A layered network. Node positions are centered on the local origin. */
export function networkDiagram(
  layers: readonly number[],
  options: {
    layerSpacing?: number;
    nodeSpacing?: number;
    nodeRadius?: number;
    inactive?: readonly (readonly [number, number])[];
    labels?: readonly string[];
  } = {},
): NetworkDiagram {
  return neuralNetwork(layers.map((count, index) => ({
    id: String(index),
    label: options.labels?.[index],
    nodes: count,
  })), {
    layerSpacing: options.layerSpacing,
    nodeSpacing: options.nodeSpacing,
    nodeRadius: options.nodeRadius,
    inactive: (options.inactive ?? []).map(([layer, node]) => `${layer}:${node}`),
  });
}

export function networkNode(diagram: NetworkDiagram, layer: number, node: number): Vec2 | undefined {
  const item = diagram.layerSpecs[layer]?.nodes[node];
  if (!item) return undefined;
  return networkNodePosition(diagram, item);
}

export function networkNodeById(diagram: NetworkDiagram, id: string): NetworkNode | undefined {
  const exact = diagram.nodes.find((node) => node.id === id);
  if (exact) return exact;
  const matches = diagram.nodes.filter((node) => node.id.endsWith(`:${id}`));
  return matches.length === 1 ? matches[0] : undefined;
}

export function networkNodePosition(diagram: NetworkDiagram, node: NetworkNode | string): Vec2 | undefined {
  const item = typeof node === "string" ? networkNodeById(diagram, node) : node;
  if (!item) return undefined;
  const count = diagram.layers[item.layer]!;
  const width = (diagram.layers.length - 1) * diagram.layerSpacing;
  const height = (count - 1) * diagram.nodeSpacing;
  const primary = -width / 2 + item.layer * diagram.layerSpacing;
  const secondary = height / 2 - item.index * diagram.nodeSpacing;
  return diagram.orientation === "horizontal" ? [primary, secondary] : [-secondary, -primary];
}

export function networkNodeActive(diagram: NetworkDiagram, layer: number, node: number): boolean {
  const item = diagram.layerSpecs[layer]?.nodes[node];
  return item !== undefined && !diagram.inactive.has(item.id);
}

export function networkEdges(diagram: NetworkDiagram, activeOnly = false): NetworkEdge[] {
  if (!activeOnly) return [...diagram.edges];
  return diagram.edges.filter((edge) => !diagram.inactive.has(edge.from) && !diagram.inactive.has(edge.to));
}

/** Every complete route that only visits active nodes, in layer order. */
export function networkPaths(diagram: NetworkDiagram): Vec2[][] {
  return networkRoutes(diagram).map((route) => route.map((id) => networkNodePosition(diagram, id)!));
}

/** Deterministic semantic routes through explicit edges. Use `maxPaths` for bounded playback. */
export function networkRoutes(diagram: NetworkDiagram, options: { maxPaths?: number } = {}): string[][] {
  const maximum = options.maxPaths ?? Number.POSITIVE_INFINITY;
  if (maximum !== Number.POSITIVE_INFINITY && (!Number.isInteger(maximum) || maximum < 0)) {
    throw new Error(`Neural-network maxPaths must be a non-negative integer; received ${maximum}.`);
  }
  if (maximum <= 0 || diagram.layerSpecs.length === 0) return [];
  const outgoing = new Map<string, NetworkEdge[]>();
  for (const edge of networkEdges(diagram, true)) {
    const list = outgoing.get(edge.from) ?? [];
    list.push(edge);
    outgoing.set(edge.from, list);
  }
  const lastLayer = diagram.layerSpecs.length - 1;
  const routes: string[][] = [];
  const visit = (node: NetworkNode, route: string[], visited: Set<string>): void => {
    if (routes.length >= maximum) return;
    if (node.layer === lastLayer) {
      routes.push([...route]);
      return;
    }
    for (const edge of outgoing.get(node.id) ?? []) {
      if (visited.has(edge.to)) continue;
      const next = networkNodeById(diagram, edge.to);
      if (!next || next.layer <= node.layer) continue;
      visited.add(next.id);
      route.push(next.id);
      visit(next, route, visited);
      route.pop();
      visited.delete(next.id);
      if (routes.length >= maximum) return;
    }
  };
  for (const node of diagram.layerSpecs[0]?.nodes ?? []) {
    if (diagram.inactive.has(node.id)) continue;
    visit(node, [node.id], new Set([node.id]));
    if (routes.length >= maximum) break;
  }
  return routes;
}

/** Where a signal sits along a polyline. Progress walks segments evenly, not by length. */
export function signalPoint(path: readonly Vec2[], progress: number): Vec2 | undefined {
  if (path.length === 0) return undefined;
  const first = path[0];
  if (!first || path.length === 1) return first;
  const segments = path.length - 1;
  const scaled = Math.max(0, Math.min(1, progress)) * segments;
  const index = Math.min(segments - 1, Math.floor(scaled));
  const start = path[index];
  const end = path[Math.min(path.length - 1, index + 1)];
  if (!start || !end) return first;
  if (progress >= 1) return path[path.length - 1];
  const mix = scaled - index;
  return [start[0] + (end[0] - start[0]) * mix, start[1] + (end[1] - start[1]) * mix];
}

export interface NetworkNodeSnapshot {
  value?: number;
  activation?: number;
  emphasis?: number;
}

export interface NetworkEdgeSnapshot {
  weight?: number;
  activation?: number;
  emphasis?: number;
}

export interface NetworkSnapshot {
  name?: string;
  nodes?: Readonly<Record<string, NetworkNodeSnapshot>>;
  edges?: Readonly<Record<string, NetworkEdgeSnapshot>>;
}

export interface NeuralNetworkStyle {
  node?: ColorInput;
  nodeIdle?: ColorInput;
  edge?: ColorInput;
  inactive?: ColorInput;
  positive?: ColorInput;
  negative?: ColorInput;
  flow?: ColorInput;
  text?: ColorInput;
  edgeThickness?: number;
  showValues?: boolean;
  valueDigits?: number;
  encodeWeightWidth?: boolean;
  encodeWeightSign?: boolean;
  pulseRadius?: number;
}

export interface NeuralNetworkState extends TattvaState {
  morphProgress: number;
  flowProgress: number;
}

/** Theme-aware, stateful layered network. Snapshots interpolate through `morphTo()`. */
export function NeuralNetwork(
  diagram: NetworkDiagram,
  options: NeuralNetworkStyle & { snapshots?: readonly NetworkSnapshot[] } = {},
): NeuralNetworkTattva {
  return new NeuralNetworkTattva(diagram, options);
}

export class NeuralNetworkTattva extends Tattva<NeuralNetworkState> {
  private readonly frame: Frame;
  private readonly snapshots: NetworkSnapshot[];
  private readonly styleInputs: Required<Omit<NeuralNetworkStyle, "showValues" | "valueDigits" | "encodeWeightWidth" | "encodeWeightSign" | "edgeThickness" | "pulseRadius">>;
  private colors!: NetworkColors;

  constructor(readonly diagram: NetworkDiagram, private readonly options: NeuralNetworkStyle & { snapshots?: readonly NetworkSnapshot[] } = {}) {
    super({ state: { morphProgress: 0, flowProgress: 0 } });
    this.styleInputs = {
      node: options.node ?? themeColor("accent"),
      nodeIdle: options.nodeIdle ?? themeColor("surfaceElevated"),
      edge: options.edge ?? themeColor("strokeMuted"),
      inactive: options.inactive ?? themeColor("textMuted"),
      positive: options.positive ?? themeColor("positive"),
      negative: options.negative ?? themeColor("negative"),
      flow: options.flow ?? themeColor("warning"),
      text: options.text ?? themeColor("textPrimary"),
    };
    this.snapshots = [{ name: "base" }, ...(options.snapshots ?? [])];
    this.snapshots.forEach((snapshot) => validateSnapshot(diagram, snapshot));
    this.morphStageCount = this.snapshots.length;
    this.dynamicGeometry = true;
    this.frame = networkFrame(diagram);
    this.worldSize = { width: this.frame.width, height: this.frame.height };
    this.resolveColors(this.resolvedTheme);
  }

  snapshot(snapshot: NetworkSnapshot): this {
    if (snapshot.name && this.snapshots.some((item) => item.name === snapshot.name)) {
      throw new Error(`Duplicate neural-network snapshot name: ${snapshot.name}.`);
    }
    validateSnapshot(this.diagram, snapshot);
    this.snapshots.push(snapshot);
    this.morphStageCount = this.snapshots.length;
    return this;
  }

  snapshotIndex(name: string): number {
    const index = this.snapshots.findIndex((snapshot) => snapshot.name === name);
    if (index < 0) throw new Error(`Unknown neural-network snapshot: ${name}.`);
    return index;
  }

  stage(value: number | string): this {
    const index = typeof value === "string" ? this.snapshotIndex(value) : value;
    if (!Number.isInteger(index) || index < 0 || index >= this.snapshots.length) {
      throw new Error(`Neural-network snapshot must be from 0 to ${this.snapshots.length - 1}; received ${index}.`);
    }
    return this.setInitial({ morphProgress: index });
  }

  override contentHTML(_time = 0, state: Readonly<NeuralNetworkState> = this.initialState): string {
    return networkMarkup(this.diagram, this.frame, this.snapshotAt(state.morphProgress), this.colors, {
      edgeThickness: positive(this.options.edgeThickness ?? 0.018, "Network edge thickness"),
      showValues: this.options.showValues ?? true,
      valueDigits: Math.max(0, Math.floor(this.options.valueDigits ?? 2)),
      encodeWeightWidth: this.options.encodeWeightWidth ?? true,
      encodeWeightSign: this.options.encodeWeightSign ?? true,
      flowProgress: clamp01(state.flowProgress),
      pulseRadius: positive(this.options.pulseRadius ?? this.diagram.nodeRadius * 0.58, "Network pulse radius"),
    });
  }

  protected override onThemeResolved(theme: Theme): void {
    this.resolveColors(theme);
  }

  private resolveColors(theme: Theme): void {
    this.colors = Object.fromEntries(
      Object.entries(this.styleInputs).map(([name, color]) => [name, resolveColorInput(color, theme)]),
    ) as unknown as NetworkColors;
  }

  private snapshotAt(progressValue: number): ResolvedNetworkSnapshot {
    const maximum = this.snapshots.length - 1;
    const progress = Math.max(0, Math.min(maximum, progressValue));
    const left = Math.floor(progress);
    const right = Math.min(maximum, left + 1);
    return interpolateSnapshot(
      resolveNetworkSnapshot(this.diagram, this.snapshots, left),
      resolveNetworkSnapshot(this.diagram, this.snapshots, right),
      progress - left,
    );
  }
}

export interface SignalStyle {
  edge: string;
  pulse: string;
  thickness: number;
  pulseRadius: number;
}

/** Paths that grow with `revealProgress`, plus a dot at the moving tip. */
export function SignalFlow(paths: readonly (readonly Vec2[])[], style: SignalStyle): Tattva {
  return new SignalFlowTattva(paths, style);
}

class SignalFlowTattva extends Tattva {
  private shown = 0;
  private readonly frame: Frame;

  constructor(
    private readonly paths: readonly (readonly Vec2[])[],
    private readonly style: SignalStyle,
  ) {
    super();
    this.dynamicGeometry = true;
    this.setInitial({ revealProgress: 0 });
    this.frame = frameAround(paths.flat(), style.pulseRadius + style.thickness);
    this.worldSize = { width: this.frame.width, height: this.frame.height };
  }

  override influenceState(_time: number, state: TattvaState): void {
    this.shown = Math.max(0, Math.min(1, state.revealProgress ?? 0));
  }

  override contentHTML(): string {
    return signalMarkup(this.paths, this.style, this.shown, this.frame);
  }
}

export type ContextRole = "system" | "user" | "assistant" | "tool" | "retrieved";
export type ContextCut = "start" | "end";

export interface ContextBlockSpec {
  label: string;
  role: ContextRole;
  tokens: number;
  retained?: number;
  cut?: ContextCut;
  preview?: string;
}

export interface ContextWindowModel {
  title: string;
  budget: number;
  blocks: readonly ContextBlockSpec[];
  width: number;
  rowHeight: number;
  rowGap: number;
  padding: number;
}

const ROLE_COLOR: Record<ContextRole, string> = {
  system: unitColor(0.61, 0.48, 0.88),
  user: unitColor(0.35, 0.77, 0.87),
  assistant: unitColor(0.36, 0.82, 0.7),
  tool: unitColor(0.95, 0.67, 0.37),
  retrieved: unitColor(0.52, 0.76, 0.4),
};

const ROLE_NAME: Record<ContextRole, string> = {
  system: "SYSTEM",
  user: "USER",
  assistant: "ASSISTANT",
  tool: "TOOL",
  retrieved: "RETRIEVED",
};

/** Role-tagged blocks against one token budget. Retained tokens cannot exceed the budget. */
export function contextWindow(blocks: readonly ContextBlockSpec[], budget: number, title = "MODEL CONTEXT"): ContextWindowModel {
  if (blocks.length === 0) throw new Error("A context window needs at least one block.");
  if (budget < 1) throw new Error("A context window token budget must be at least 1.");
  const normalized = blocks.map((block) => ({
    ...block,
    retained: block.retained ?? block.tokens,
  }));
  const used = normalized.reduce((sum, block) => sum + block.retained, 0);
  if (used > budget) throw new Error(`${used} retained tokens exceed budget ${budget}.`);
  return {
    title,
    budget,
    blocks: normalized,
    width: 9.2,
    rowHeight: 0.68,
    rowGap: 0.13,
    padding: 0.34,
  };
}

export function contextUsedTokens(model: ContextWindowModel): number {
  return model.blocks.reduce((sum, block) => sum + (block.retained ?? block.tokens), 0);
}

export function ContextWindow(model: ContextWindowModel): Tattva {
  return new ContextWindowTattva(model);
}

class ContextWindowTattva extends Tattva {
  private readonly panelHeight: number;

  constructor(private readonly model: ContextWindowModel) {
    super();
    this.panelHeight = contextHeight(model);
    this.worldSize = { width: model.width, height: this.panelHeight };
  }

  override contentHTML(): string {
    return contextMarkup(this.model, this.panelHeight);
  }
}

export interface FocusStep {
  at: number;
  duration: number;
  stage: string | null;
}

export interface StageFocus {
  from: string | null;
  to: string | null;
  mix: number;
}

/** The focus crossfade used by the transformer-attention scene. */
export const ATTENTION_BLOCK_FOCUS: readonly FocusStep[] = [
  { at: 6.4, duration: 0.45, stage: "self_attention" },
  { at: 7.6, duration: 0.45, stage: "attention_residual" },
  { at: 8.8, duration: 0.45, stage: "mlp" },
  { at: 10, duration: 0.45, stage: "mlp_residual" },
  { at: 11.1, duration: 0.45, stage: null },
];

/** Which stage is emphasized at `time`. The mix is in-out quad, and a seek does not depend on the previous stage. */
export function stageFocusAt(time: number, steps: readonly FocusStep[]): StageFocus {
  let active: string | null = null;
  for (const step of steps) {
    if (time < step.at) break;
    const local = step.duration <= 0 ? 1 : Math.min(1, (time - step.at) / step.duration);
    if (local < 1) {
      return { from: active, to: step.stage, mix: easeInOutQuad(Math.max(0, local)) };
    }
    active = step.stage;
  }
  return { from: active, to: active, mix: 1 };
}

export function stageOpacity(stageId: string, focus: StageFocus, inactive = 0.35): number {
  const opacityFor = (active: string | null) => (active !== null && active !== stageId ? inactive : 1);
  const source = opacityFor(focus.from);
  const target = opacityFor(focus.to);
  return source + (target - source) * Math.max(0, Math.min(1, focus.mix));
}

/** A horizontal row of token boxes. Widths are character estimates. */
export function TokenRow(tokens: readonly string[], tokenHeight = 0.24): Tattva {
  return new TokenRowTattva(tokens, tokenHeight);
}

class TokenRowTattva extends Tattva {
  constructor(
    private readonly tokens: readonly string[],
    private readonly tokenHeight: number,
  ) {
    super();
    const size = tokenRowSize(tokens, tokenHeight);
    this.worldSize = size;
  }

  override contentHTML(): string {
    return tokenRowMarkup(this.tokens, this.tokenHeight, this.worldSize ?? { width: 1, height: 1 });
  }
}

/** A square heatmap. Column names are turned upright beside the grid. */
export function AttentionMatrix(values: readonly (readonly number[])[], tokens?: readonly string[]): Tattva {
  return new AttentionMatrixTattva(values, tokens ?? []);
}

class AttentionMatrixTattva extends Tattva {
  constructor(
    private readonly values: readonly (readonly number[])[],
    private readonly tokens: readonly string[],
  ) {
    super();
    this.worldSize = matrixFrame(values, tokens);
  }

  override contentHTML(): string {
    return matrixMarkup(this.values, this.tokens, this.worldSize ?? { width: 1, height: 1 });
  }
}

export interface EncoderStage {
  id: string;
  label: string;
  kind: "norm" | "accent" | "residual";
  residualFrom?: "input" | string;
}

export const ENCODER_STAGES: readonly EncoderStage[] = [
  { id: "attention_norm", label: "Layer Norm", kind: "norm" },
  { id: "self_attention", label: "Multi-Head Self-Attention", kind: "accent" },
  { id: "attention_residual", label: "Residual Add", kind: "residual", residualFrom: "input" },
  { id: "mlp_norm", label: "Layer Norm", kind: "norm" },
  { id: "mlp", label: "MLP", kind: "accent" },
  { id: "mlp_residual", label: "Residual Add", kind: "residual", residualFrom: "attention_residual" },
];

export interface TransformerBlockOptions {
  width?: number;
  blockHeight?: number;
  gap?: number;
  accent?: string;
  frame?: string;
  inputLabel?: string;
  outputLabel?: string;
  focus?: readonly FocusStep[];
}

/** A pre-norm encoder stack. Focus steps dim every stage except the one in progress. */
export function TransformerBlock(options: TransformerBlockOptions = {}): Tattva {
  return new TransformerBlockTattva(options);
}

class TransformerBlockTattva extends Tattva {
  private sampleTime = 0;

  constructor(private readonly options: TransformerBlockOptions) {
    super();
    this.dynamicGeometry = true;
    const width = options.width ?? 3;
    const blockHeight = options.blockHeight ?? 0.5;
    const gap = options.gap ?? 0.16;
    const stack = ENCODER_STAGES.length * blockHeight + (ENCODER_STAGES.length - 1) * gap;
    this.worldSize = { width: width + 0.75, height: stack + blockHeight * 1.8 };
  }

  override influenceState(time: number): void {
    this.sampleTime = time;
  }

  override contentHTML(): string {
    return blockMarkup(this.options, this.worldSize ?? { width: 1, height: 1 }, stageFocusAt(this.sampleTime, this.options.focus ?? []));
  }
}

interface Frame {
  width: number;
  height: number;
}

interface NetworkColors {
  node: string;
  nodeIdle: string;
  edge: string;
  inactive: string;
  positive: string;
  negative: string;
  flow: string;
  text: string;
}

interface ResolvedNodeSnapshot {
  value?: number;
  activation: number;
  emphasis: number;
}

interface ResolvedEdgeSnapshot {
  weight?: number;
  activation: number;
  emphasis: number;
}

interface ResolvedNetworkSnapshot {
  nodes: ReadonlyMap<string, ResolvedNodeSnapshot>;
  edges: ReadonlyMap<string, ResolvedEdgeSnapshot>;
}

interface ResolvedNetworkRenderOptions {
  edgeThickness: number;
  showValues: boolean;
  valueDigits: number;
  encodeWeightWidth: boolean;
  encodeWeightSign: boolean;
  flowProgress: number;
  pulseRadius: number;
}

function validateNetworkId(id: string, kind: string): void {
  if (id.trim().length === 0 || id.includes(":")) {
    throw new Error(`Neural-network ${kind} ids must be non-empty and cannot contain ':'.`);
  }
}

function validateNodeCount(count: number, layer: string): number {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`Neural-network layer ${layer} needs a positive integer node count; received ${count}.`);
  }
  return count;
}

function validateWeightMatrices(
  layers: readonly NetworkLayer[],
  matrices: readonly (readonly (readonly number[])[])[] | undefined,
): void {
  if (!matrices) return;
  if (matrices.length !== Math.max(0, layers.length - 1)) {
    throw new Error(`Neural-network weights need ${Math.max(0, layers.length - 1)} matrices; received ${matrices.length}.`);
  }
  matrices.forEach((matrix, transition) => {
    const source = layers[transition]!;
    const target = layers[transition + 1]!;
    if (matrix.length !== target.nodes.length || matrix.some((row) => row.length !== source.nodes.length)) {
      throw new Error(
        `Neural-network weight matrix ${transition} must be ${target.nodes.length}x${source.nodes.length}.`,
      );
    }
    matrix.flat().forEach((weight) => validateFiniteState(weight, `weight matrix ${transition}`));
  });
}

function positive(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} must be a positive finite number; received ${value}.`);
  return value;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function resolveNodeReference(reference: string, nodes: ReadonlyMap<string, NetworkNode>): NetworkNode {
  const exact = nodes.get(reference);
  if (exact) return exact;
  const matches = [...nodes.values()].filter((node) => node.id.endsWith(`:${reference}`));
  if (matches.length === 1) return matches[0]!;
  if (matches.length > 1) throw new Error(`Ambiguous neural-network node reference: ${reference}. Use its full layer:node id.`);
  throw new Error(`Unknown neural-network node: ${reference}.`);
}

function resolveEdgeReference(diagram: NetworkDiagram, reference: string): NetworkEdge | undefined {
  const exact = diagram.edges.find((edge) => edge.id === reference);
  if (exact) return exact;
  const separator = reference.indexOf("->");
  if (separator < 0) return undefined;
  const from = networkNodeById(diagram, reference.slice(0, separator));
  const to = networkNodeById(diagram, reference.slice(separator + 2));
  if (!from || !to) return undefined;
  return diagram.edges.find((edge) => edge.from === from.id && edge.to === to.id);
}

function validateSnapshot(diagram: NetworkDiagram, snapshot: NetworkSnapshot): void {
  for (const [reference, state] of Object.entries(snapshot.nodes ?? {})) {
    if (!networkNodeById(diagram, reference)) throw new Error(`Unknown neural-network snapshot node: ${reference}.`);
    validateFiniteState(state.value, `${reference} value`);
    validateFiniteState(state.activation, `${reference} activation`);
    validateFiniteState(state.emphasis, `${reference} emphasis`);
  }
  for (const [reference, state] of Object.entries(snapshot.edges ?? {})) {
    if (!resolveEdgeReference(diagram, reference)) throw new Error(`Unknown neural-network snapshot edge: ${reference}.`);
    validateFiniteState(state.weight, `${reference} weight`);
    validateFiniteState(state.activation, `${reference} activation`);
    validateFiniteState(state.emphasis, `${reference} emphasis`);
  }
}

function validateFiniteState(value: number | undefined, label: string): void {
  if (value !== undefined && !Number.isFinite(value)) throw new Error(`Neural-network ${label} must be finite.`);
}

function resolveNetworkSnapshot(
  diagram: NetworkDiagram,
  snapshots: readonly NetworkSnapshot[],
  index: number,
): ResolvedNetworkSnapshot {
  const hasAnimation = snapshots.length > 1;
  const nodes = new Map<string, ResolvedNodeSnapshot>(diagram.nodes.map((node) => [node.id, {
    value: node.value,
    activation: diagram.inactive.has(node.id) ? 0 : hasAnimation ? 0 : 1,
    emphasis: 0,
  }]));
  const edges = new Map<string, ResolvedEdgeSnapshot>(diagram.edges.map((edge) => [edge.id, {
    weight: edge.weight,
    activation: 0,
    emphasis: 0,
  }]));
  for (const snapshot of snapshots.slice(0, index + 1)) {
    for (const [reference, patch] of Object.entries(snapshot.nodes ?? {})) {
      const node = networkNodeById(diagram, reference)!;
      nodes.set(node.id, { ...nodes.get(node.id)!, ...patch });
    }
    for (const [reference, patch] of Object.entries(snapshot.edges ?? {})) {
      const edge = resolveEdgeReference(diagram, reference)!;
      edges.set(edge.id, { ...edges.get(edge.id)!, ...patch });
    }
  }
  return { nodes, edges };
}

function interpolateSnapshot(
  left: ResolvedNetworkSnapshot,
  right: ResolvedNetworkSnapshot,
  mix: number,
): ResolvedNetworkSnapshot {
  const nodes = new Map<string, ResolvedNodeSnapshot>();
  for (const [id, from] of left.nodes) {
    const to = right.nodes.get(id) ?? from;
    nodes.set(id, {
      value: interpolateOptional(from.value, to.value, mix),
      activation: lerp(from.activation, to.activation, mix),
      emphasis: lerp(from.emphasis, to.emphasis, mix),
    });
  }
  const edges = new Map<string, ResolvedEdgeSnapshot>();
  for (const [id, from] of left.edges) {
    const to = right.edges.get(id) ?? from;
    edges.set(id, {
      weight: interpolateOptional(from.weight, to.weight, mix),
      activation: lerp(from.activation, to.activation, mix),
      emphasis: lerp(from.emphasis, to.emphasis, mix),
    });
  }
  return { nodes, edges };
}

function interpolateOptional(from: number | undefined, to: number | undefined, mix: number): number | undefined {
  if (from === undefined && to === undefined) return undefined;
  return lerp(from ?? 0, to ?? 0, mix);
}

function networkFrame(diagram: NetworkDiagram): Frame {
  const points = diagram.nodes.map((node) => networkNodePosition(diagram, node)!);
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const padX = diagram.orientation === "horizontal" ? 0.9 : 0.72;
  const padY = diagram.orientation === "horizontal" ? 0.72 : 0.42;
  return {
    width: Math.max(0.2, Math.max(...xs) - Math.min(...xs) + diagram.nodeRadius * 2 + padX * 2),
    height: Math.max(0.2, Math.max(...ys) - Math.min(...ys) + diagram.nodeRadius * 2 + padY * 2),
  };
}

function frameAround(points: readonly Vec2[], pad: number): Frame {
  const reach = points.reduce((max, point) => Math.max(max, Math.abs(point[0]), Math.abs(point[1])), 0);
  const half = reach + pad + 0.05;
  return { width: Math.max(0.2, half * 2), height: Math.max(0.2, half * 2) };
}

function networkMarkup(
  diagram: NetworkDiagram,
  frame: Frame,
  snapshot: ResolvedNetworkSnapshot,
  colors: NetworkColors,
  options: ResolvedNetworkRenderOptions,
): string {
  const parts: string[] = [svgOpen(frame)];
  for (const edge of diagram.edges) {
    const start = networkNodePosition(diagram, edge.from);
    const end = networkNodePosition(diagram, edge.to);
    if (!start || !end) continue;
    const active = !diagram.inactive.has(edge.from) && !diagram.inactive.has(edge.to);
    const state = snapshot.edges.get(edge.id)!;
    const weight = state.weight ?? edge.weight;
    const width = options.edgeThickness
      * (options.encodeWeightWidth && weight !== undefined ? 0.65 + Math.min(2.35, Math.abs(weight)) : 1)
      * (1 + Math.max(0, state.emphasis) * 0.7);
    const color = !active
      ? colors.inactive
      : options.encodeWeightSign && weight !== undefined
      ? weight < 0 ? colors.negative : colors.positive
      : colors.edge;
    parts.push(svgLine(frame, start, end, color, width, `data-network-edge="${escapeAttribute(edge.id)}" opacity="${active ? 0.38 + 0.5 * clamp01(state.activation) : 0.22}"`));
  }

  const layerCount = Math.max(1, diagram.layerSpecs.length - 1);
  if (options.flowProgress > 0) {
    for (const edge of networkEdges(diagram, true)) {
      const start = networkNodePosition(diagram, edge.from);
      const end = networkNodePosition(diagram, edge.to);
      if (!start || !end) continue;
      const from = Math.min(edge.fromLayer, edge.toLayer) / layerCount;
      const to = Math.max(edge.fromLayer, edge.toLayer) / layerCount;
      const local = clamp01((options.flowProgress - from) / Math.max(Number.EPSILON, to - from));
      if (local <= 0) continue;
      const tip: Vec2 = [lerp(start[0], end[0], local), lerp(start[1], end[1], local)];
      parts.push(svgLine(frame, start, tip, colors.flow, options.edgeThickness * 1.8, `data-network-flow="${escapeAttribute(edge.id)}" opacity="0.88"`));
      if (local < 1) parts.push(svgDot(frame, tip, options.pulseRadius, colors.flow, `data-network-pulse="${escapeAttribute(edge.id)}"`));
    }
  }

  diagram.layerSpecs.forEach((layer) => {
    for (const node of layer.nodes) {
      const point = networkNodePosition(diagram, node)!;
      const active = !diagram.inactive.has(node.id);
      const state = snapshot.nodes.get(node.id)!;
      const strength = active ? clamp01(Math.abs(state.activation)) : 0;
      const radius = diagram.nodeRadius * (1 + Math.max(0, state.emphasis) * 0.18);
      const activeColor = state.activation < 0 ? colors.negative : colors.node;
      parts.push(svgDot(frame, point, radius, active ? colors.nodeIdle : colors.inactive, `data-network-node="${escapeAttribute(node.id)}"`));
      if (strength > 0) parts.push(svgDot(frame, point, radius * (0.76 + strength * 0.2), activeColor, `opacity="${0.28 + strength * 0.72}"`));
      if (node.label) parts.push(svgText(frame, point, node.label, Math.min(0.15, radius * 0.92), colors.text, "middle"));
      const value = state.value ?? node.value;
      if (options.showValues && value !== undefined) {
        const offset: Vec2 = diagram.orientation === "horizontal"
          ? [point[0], point[1] - radius - 0.14]
          : [point[0] + radius + 0.12, point[1]];
        parts.push(svgText(frame, offset, formatNetworkValue(value, options.valueDigits), 0.12, colors.text, diagram.orientation === "horizontal" ? "middle" : "start"));
      }
    }
    const label = layer.label;
    const top = layer.nodes[0] ? networkNodePosition(diagram, layer.nodes[0]) : undefined;
    if (label && top) {
      const labelPoint: Vec2 = diagram.orientation === "horizontal"
        ? [top[0], top[1] + diagram.nodeSpacing * 0.62 + 0.22]
        : [top[0] - diagram.nodeSpacing * 0.62 - 0.22, top[1]];
      parts.push(svgText(frame, labelPoint, label, 0.19, colors.text, "middle"));
    }
    const bottom = layer.nodes.at(-1) ? networkNodePosition(diagram, layer.nodes.at(-1)!) : undefined;
    if (bottom && layer.activation !== "none") {
      const activationPoint: Vec2 = diagram.orientation === "horizontal"
        ? [bottom[0], bottom[1] - diagram.nodeRadius - 0.34]
        : [bottom[0] + diagram.nodeRadius + 0.36, bottom[1]];
      parts.push(svgText(frame, activationPoint, layer.activation, 0.12, colors.flow, "middle"));
    }
  });
  parts.push("</svg>");
  return parts.join("");
}

function formatNetworkValue(value: number, digits: number): string {
  return Number(value.toFixed(digits)).toString();
}

function signalMarkup(
  paths: readonly (readonly Vec2[])[],
  style: SignalStyle,
  progress: number,
  frame: Frame,
): string {
  const parts: string[] = [svgOpen(frame)];
  for (const path of paths) {
    if (path.length < 2) continue;
    const segments = path.length - 1;
    const scaled = Math.max(0, Math.min(1, progress)) * segments;
    const index = Math.min(segments, Math.floor(scaled));
    const mix = scaled - Math.floor(scaled);
    for (let segment = 0; segment < segments; segment += 1) {
      const start = path[segment];
      const end = path[segment + 1];
      if (!start || !end) continue;
      if (segment < index) parts.push(svgLine(frame, start, end, style.edge, style.thickness));
      else if (segment === index && progress < 1 && mix > 0) {
        parts.push(svgLine(frame, start, [start[0] + (end[0] - start[0]) * mix, start[1] + (end[1] - start[1]) * mix], style.edge, style.thickness));
      }
    }
    const tip = signalPoint(path, progress);
    if (tip && style.pulseRadius > 0) parts.push(svgDot(frame, tip, style.pulseRadius, style.pulse));
  }
  parts.push("</svg>");
  return parts.join("");
}

function contextHeight(model: ContextWindowModel): number {
  const rows = model.blocks.length * model.rowHeight + Math.max(0, model.blocks.length - 1) * model.rowGap;
  return model.padding * 2 + 0.55 + rows + 0.52;
}

function contextMarkup(model: ContextWindowModel, height: number): string {
  const frame = { width: model.width, height };
  const panel = unitColor(0.055, 0.068, 0.085, 0.98);
  const track = unitColor(0.14, 0.17, 0.21);
  const trimmed = unitColor(0.34, 0.22, 0.25);
  const ink = unitColor(0.94, 0.97, 1);
  const parts: string[] = [svgOpen(frame), svgRect(frame, [0, 0], model.width, height, panel)];
  const top = height / 2 - model.padding;
  const innerLeft = -model.width / 2 + model.padding;
  const innerRight = model.width / 2 - model.padding;
  parts.push(svgText(frame, [innerLeft, top - 0.13], model.title, 0.2, ink, "start", "data-context-heading"));
  parts.push(svgText(
    frame,
    [innerRight, top - 0.13],
    `${contextUsedTokens(model)} / ${model.budget} TOKENS`,
    0.15,
    unitColor(0.7, 0.75, 0.8),
    "end",
    "data-context-budget",
  ));
  const labelX = innerLeft + 0.35;
  const trackX = innerLeft + 2.6;
  const trackWidth = innerRight - trackX;
  let rowY = top - 0.55 - model.rowHeight / 2;
  for (const block of model.blocks) {
    const retained = block.retained ?? block.tokens;
    const role = ROLE_COLOR[block.role];
    parts.push(svgRect(frame, [0, rowY], model.width - model.padding * 2, model.rowHeight, unitColor(0.09, 0.11, 0.14)));
    parts.push(svgRect(frame, [-model.width / 2 + model.padding + 0.035, rowY], 0.07, model.rowHeight, role));
    parts.push(svgText(frame, [labelX, rowY + 0.14], ROLE_NAME[block.role], 0.11, role, "start"));
    parts.push(svgText(frame, [labelX, rowY - 0.1], block.label, 0.15, ink, "start", "data-context-label"));
    parts.push(svgRect(frame, [trackX + trackWidth / 2, rowY], trackWidth, 0.26, track, "data-context-track"));
    const scale = trackWidth / model.budget;
    const original = Math.min(trackWidth, block.tokens * scale);
    const kept = Math.min(original, retained * scale);
    const omitted = Math.max(0, original - kept);
    const keptX = block.cut === "start" ? trackX + omitted + kept / 2 : trackX + kept / 2;
    const omittedX = block.cut === "start" ? trackX + omitted / 2 : trackX + kept + omitted / 2;
    if (kept > 0) parts.push(svgRect(frame, [keptX, rowY], kept, 0.26, role));
    if (omitted > 0) parts.push(svgRect(frame, [omittedX, rowY], omitted, 0.26, trimmed));
    const preview = (block.preview ?? "").slice(0, 34);
    const note = preview ? `${preview}  |  ${retained} tokens` : `${retained} tokens`;
    parts.push(svgText(frame, [trackX + trackWidth / 2, rowY], note, 0.11, unitColor(0.89, 0.92, 0.95), "middle"));
    rowY -= model.rowHeight + model.rowGap;
  }
  const meterY = -height / 2 + model.padding + 0.13;
  const meterWidth = model.width - model.padding * 2;
  const usedWidth = meterWidth * contextUsedTokens(model) / model.budget;
  parts.push(svgRect(frame, [0, meterY], meterWidth, 0.12, track));
  if (usedWidth > 0) parts.push(svgRect(frame, [-meterWidth / 2 + usedWidth / 2, meterY], usedWidth, 0.12, ROLE_COLOR.user));
  parts.push("</svg>");
  return parts.join("");
}

function svgOpen(frame: Frame): string {
  return `<svg width="100%" height="100%" viewBox="0 0 ${frame.width} ${frame.height}" xmlns="http://www.w3.org/2000/svg">`;
}

function svgPoint(frame: Frame, point: Vec2): [number, number] {
  return [point[0] + frame.width / 2, frame.height / 2 - point[1]];
}

function svgLine(frame: Frame, start: Vec2, end: Vec2, color: string, thickness: number, attributes = ""): string {
  const [x1, y1] = svgPoint(frame, start);
  const [x2, y2] = svgPoint(frame, end);
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${thickness}" stroke-linecap="round"${attributes ? ` ${attributes}` : ""} />`;
}

function svgDot(frame: Frame, point: Vec2, radius: number, color: string, attributes = ""): string {
  const [x, y] = svgPoint(frame, point);
  return `<circle cx="${x}" cy="${y}" r="${radius}" fill="${color}"${attributes ? ` ${attributes}` : ""} />`;
}

function svgRect(
  frame: Frame,
  center: Vec2,
  width: number,
  height: number,
  color: string,
  attributes = "",
): string {
  const [x, y] = svgPoint(frame, center);
  return `<rect x="${x - width / 2}" y="${y - height / 2}" width="${width}" height="${height}" fill="${color}"${attributes ? ` ${attributes}` : ""} />`;
}

function svgText(
  frame: Frame,
  point: Vec2,
  text: string,
  height: number,
  color: string,
  anchor: "start" | "middle" | "end",
  attributes = "",
): string {
  const [x, y] = svgPoint(frame, point);
  return `<text x="${x}" y="${y}" fill="${color}" font-size="${height}" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-weight="700" text-anchor="${anchor}" dominant-baseline="middle"${attributes ? ` ${attributes}` : ""}>${escapeText(text)}</text>`;
}

function unitColor(red: number, green: number, blue: number, alpha = 1): string {
  const channel = (value: number) => Math.round(Math.max(0, Math.min(1, value)) * 255);
  return `rgba(${channel(red)}, ${channel(green)}, ${channel(blue)}, ${alpha})`;
}

function escapeText(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeAttribute(value: string): string {
  return escapeText(value).replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

const f32 = Math.fround;

export interface Matrix2 {
  rows: number;
  columns: number;
  values: number[];
  rowLabels: readonly string[];
  columnLabels: readonly string[];
  rowTitle: string;
  columnTitle: string;
}

/** Rank-2 product. Each multiply and running sum is rounded to 32 bits, matching Murali's floats. */
export function matmul2(left: Matrix2, right: Matrix2): Matrix2 {
  if (left.columns !== right.rows) throw new Error("Matrix multiply needs matching inner dimensions.");
  const values: number[] = [];
  for (let row = 0; row < left.rows; row += 1) {
    for (let column = 0; column < right.columns; column += 1) {
      let sum = 0;
      for (let inner = 0; inner < left.columns; inner += 1) {
        const product = f32(f32(left.values[row * left.columns + inner] ?? 0) * f32(right.values[inner * right.columns + column] ?? 0));
        sum = f32(sum + product);
      }
      values.push(sum);
    }
  }
  return {
    rows: left.rows,
    columns: right.columns,
    values,
    rowLabels: left.rowLabels,
    columnLabels: right.columnLabels,
    rowTitle: left.rowTitle,
    columnTitle: right.columnTitle,
  };
}

export function transpose2(matrix: Matrix2): Matrix2 {
  const values: number[] = [];
  for (let column = 0; column < matrix.columns; column += 1) {
    for (let row = 0; row < matrix.rows; row += 1) {
      values.push(matrix.values[row * matrix.columns + column] ?? 0);
    }
  }
  return {
    rows: matrix.columns,
    columns: matrix.rows,
    values,
    rowLabels: matrix.columnLabels,
    columnLabels: matrix.rowLabels,
    rowTitle: matrix.columnTitle,
    columnTitle: matrix.rowTitle,
  };
}

export function scaleMatrix(matrix: Matrix2, divisor: number): Matrix2 {
  return { ...matrix, values: matrix.values.map((value) => f32(value / divisor)) };
}

export function causalMask(matrix: Matrix2, maskedValue: number): Matrix2 {
  const values = matrix.values.slice();
  for (let row = 0; row < matrix.rows; row += 1) {
    for (let column = row + 1; column < matrix.columns; column += 1) values[row * matrix.columns + column] = maskedValue;
  }
  return { ...matrix, values };
}

/** Stable softmax along each row. */
export function softmaxRows(matrix: Matrix2): Matrix2 {
  const values: number[] = [];
  for (let row = 0; row < matrix.rows; row += 1) {
    let max = Number.NEGATIVE_INFINITY;
    for (let column = 0; column < matrix.columns; column += 1) max = Math.max(max, matrix.values[row * matrix.columns + column] ?? 0);
    const weights = Array.from({ length: matrix.columns }, (_, column) => Math.exp((matrix.values[row * matrix.columns + column] ?? 0) - max));
    const sum = weights.reduce((total, weight) => total + weight, 0);
    values.push(...weights.map((weight) => weight / sum));
  }
  return { ...matrix, values };
}

const TOKENS = ["The", "model", "reads", "context"] as const;
const QUERY_VALUES = [1, 0.2, 0.1, 1, -0.4, 0.8, -0.5, 0.6];
const KEY_VALUES = [1, 0.3, 0.2, 1, -0.3, 0.7, 0.1, 0.5];

/** Q, K, and the four attention stages from the tensor-semantics scene. */
export function attentionMatrices(): { dots: Matrix2; scaled: Matrix2; masked: Matrix2; weights: Matrix2 } {
  const queries: Matrix2 = {
    rows: 4,
    columns: 2,
    values: QUERY_VALUES,
    rowLabels: TOKENS,
    columnLabels: ["x", "y"],
    rowTitle: "Query tokens",
    columnTitle: "Features",
  };
  const keys: Matrix2 = {
    rows: 4,
    columns: 2,
    values: KEY_VALUES,
    rowLabels: TOKENS,
    columnLabels: ["x", "y"],
    rowTitle: "Key tokens",
    columnTitle: "Features",
  };
  const transposed = transpose2(keys);
  const dots = matmul2(queries, {
    ...transposed,
    columnLabels: TOKENS,
    columnTitle: "Key tokens",
  });
  const scaled = scaleMatrix(dots, Math.sqrt(2));
  const masked = causalMask(scaled, -4);
  return { dots, scaled, masked, weights: softmaxRows(masked) };
}

export interface TensorFrame {
  rowLabels: readonly string[];
  columnLabels: readonly string[];
  rowTitle: string;
  columnTitle: string;
  values: readonly number[];
  highlightRow: number;
  highlight: number;
  cellWidth: number;
  cellHeight: number;
  labelHeight: number;
  valueHeight: number;
  scaleLimit: number;
}

const smoothstep = (value: number) => value * value * (3 - 2 * value);

/** The tensor-semantics picture at `time`: select "reads", then scale, mask, and softmax. */
export function tensorSemanticsFrame(time: number): TensorFrame {
  const { dots, scaled, masked, weights } = attentionMatrices();
  const stage = morphStage(time, [
    { at: 3.2, duration: 1.1, from: dots, to: scaled },
    { at: 4.8, duration: 1.1, from: scaled, to: masked },
    { at: 6.4, duration: 1.1, from: masked, to: weights },
  ], dots);
  const highlight = time < 2.1 ? 0 : time >= 2.8 ? 1 : easeInOutQuad((time - 2.1) / 0.7);
  return {
    rowLabels: dots.rowLabels,
    columnLabels: dots.columnLabels,
    rowTitle: dots.rowTitle,
    columnTitle: dots.columnTitle,
    values: stage.values,
    highlightRow: 2,
    highlight,
    cellWidth: 1.05,
    cellHeight: 0.72,
    labelHeight: 0.2,
    valueHeight: 0.17,
    scaleLimit: stage.limit,
  };
}

export function TensorGrid(frameAt: (time: number) => TensorFrame): Tattva {
  return new TensorGridTattva(frameAt);
}

class TensorGridTattva extends Tattva {
  private sampleTime = 0;

  constructor(private readonly frameAt: (time: number) => TensorFrame) {
    super();
    this.dynamicGeometry = true;
    const sample = frameAt(0);
    const labelWidth = Math.max(...sample.rowLabels.map((label) => label.length * sample.labelHeight * 0.58));
    const pad = labelWidth + sample.labelHeight * 1.8;
    this.worldSize = {
      width: sample.columnLabels.length * sample.cellWidth + pad * 2,
      height: sample.rowLabels.length * sample.cellHeight + sample.labelHeight * 5.2,
    };
  }

  override influenceState(time: number): void {
    this.sampleTime = time;
  }

  override contentHTML(): string {
    return tensorMarkup(this.frameAt(this.sampleTime), this.worldSize ?? { width: 1, height: 1 });
  }
}

export interface CachePanel {
  tokens: readonly string[];
  values: readonly number[];
}

/** Keys beside values. `occupancy` is how many token rows have been written. */
export function KvCache(keys: CachePanel, values: CachePanel): KvCacheTattva {
  return new KvCacheTattva(keys, values);
}

export class KvCacheTattva extends Tattva<TattvaState & { occupancy: number }> {
  private filled = 0;

  constructor(
    private readonly keys: CachePanel,
    private readonly valuePanel: CachePanel,
  ) {
    super({ state: { occupancy: 0 } });
    this.dynamicGeometry = true;
    const features = keys.values.length / keys.tokens.length;
    const cell = { x: 0.48, y: 0.4 };
    const width = 0.34 * 2 + 1.35 + features * cell.x * 2 + 0.72;
    const height = 0.34 * 2 + 0.72 + keys.tokens.length * cell.y;
    this.worldSize = { width, height };
  }

  override influenceState(_time: number, state: TattvaState & { occupancy: number }): void {
    this.filled = state.occupancy;
  }

  override contentHTML(): string {
    return cacheMarkup(this.keys, this.valuePanel, this.filled, this.worldSize ?? { width: 1, height: 1 });
  }
}

function morphStage(
  time: number,
  steps: readonly { at: number; duration: number; from: Matrix2; to: Matrix2 }[],
  initial: Matrix2,
): { values: number[]; limit: number } {
  let current = initial;
  for (const step of steps) {
    if (time < step.at) break;
    const local = Math.min(1, (time - step.at) / step.duration);
    const mix = local >= 1 ? 1 : smoothstep(local);
    current = {
      ...step.to,
      values: step.from.values.map((value, index) => value + ((step.to.values[index] ?? 0) - value) * mix),
    };
    if (local < 1) return { values: current.values, limit: limitOf(step.from.values, step.to.values) };
  }
  return { values: current.values, limit: limitOf(current.values) };
}

function limitOf(...groups: readonly (readonly number[])[]): number {
  return Math.max(Number.EPSILON, ...groups.flat().map((value) => Math.abs(value)));
}

function tensorMarkup(frame: TensorFrame, box: Frame): string {
  const columns = frame.columnLabels.length;
  const rows = frame.rowLabels.length;
  const gridWidth = columns * frame.cellWidth;
  const gridHeight = rows * frame.cellHeight;
  const left = -gridWidth / 2;
  const top = gridHeight / 2;
  const parts = [svgOpen(box)];
  frame.values.forEach((value, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const center: Vec2 = [left + (column + 0.5) * frame.cellWidth, top - (row + 0.5) * frame.cellHeight];
    parts.push(svgRect(box, center, frame.cellWidth * 0.98, frame.cellHeight * 0.98, divergingColor(value, frame.scaleLimit)));
    parts.push(svgText(box, center, value.toFixed(2), frame.valueHeight, unitColor(0.97, 0.98, 0.99), "middle"));
    if (row === frame.highlightRow && frame.highlight > 0) {
      parts.push(`<rect x="${svgPoint(box, [center[0] - frame.cellWidth * 0.46, center[1] + frame.cellHeight * 0.46])[0]}" y="${svgPoint(box, [center[0], center[1] + frame.cellHeight * 0.46])[1]}" width="${frame.cellWidth * 0.92}" height="${frame.cellHeight * 0.92}" fill="none" stroke="#f7c797" stroke-width="${0.03}" stroke-opacity="${frame.highlight}" />`);
    }
  });
  frame.columnLabels.forEach((label, column) => {
    parts.push(svgText(box, [left + (column + 0.5) * frame.cellWidth, top + frame.labelHeight * 1.1], label, frame.labelHeight, unitColor(0.9, 0.93, 0.96), "middle"));
  });
  frame.rowLabels.forEach((label, row) => {
    parts.push(svgText(box, [left - frame.labelHeight * 1.2, top - (row + 0.5) * frame.cellHeight], label, frame.labelHeight, unitColor(0.9, 0.93, 0.96), "end"));
  });
  parts.push(svgText(box, [0, top + frame.labelHeight * 2.5], frame.columnTitle, frame.labelHeight, unitColor(0.9, 0.93, 0.96), "middle"));
  parts.push("</svg>");
  return parts.join("");
}

function cacheMarkup(keys: CachePanel, values: CachePanel, occupancy: number, box: Frame): string {
  const tokens = keys.tokens.length;
  const features = keys.values.length / tokens;
  const cellX = 0.48;
  const cellY = 0.4;
  const padding = 0.34;
  const width = box.width;
  const height = box.height;
  const left = -width / 2 + padding;
  const top = height / 2 - padding;
  const matrixWidth = features * cellX;
  const keyLeft = left + 1.35;
  const valueLeft = keyLeft + matrixWidth + 0.72;
  const limit = Math.max(Number.EPSILON, ...keys.values.map(Math.abs), ...values.values.map(Math.abs));
  const parts = [svgOpen(box), svgRect(box, [0, 0], width, height, unitColor(0.055, 0.068, 0.085, 0.98))];
  parts.push(svgText(box, [left + 0.7, top - 0.13], "KV CACHE", 0.22, unitColor(0.94, 0.97, 1), "middle"));
  parts.push(svgText(box, [width / 2 - padding - 0.7, top - 0.13], `${Math.round(occupancy)} / ${tokens} SLOTS`, 0.15, unitColor(0.7, 0.75, 0.8), "middle"));
  parts.push(svgText(box, [keyLeft + matrixWidth / 2, top - 0.48], "KEYS", 0.16, unitColor(0.33, 0.78, 0.72), "middle"));
  parts.push(svgText(box, [valueLeft + matrixWidth / 2, top - 0.48], "VALUES", 0.16, unitColor(0.36, 0.64, 0.91), "middle"));
  const rowTop = top - 0.72;
  for (let token = 0; token < tokens; token += 1) {
    const rowY = rowTop - token * cellY - cellY / 2;
    const strength = Math.max(0, Math.min(1, occupancy - token));
    const newest = strength > 0 && token === Math.ceil(Math.max(occupancy, 1)) - 1;
    if (newest) {
      const outlineTop = rowY + cellY * 0.94 / 2;
      const outlineHeight = cellY * 0.94;
      const outlineLeft = keyLeft - 0.06;
      const outlineWidth = valueLeft + matrixWidth + 0.06 - outlineLeft;
      const origin = svgPoint(box, [outlineLeft, outlineTop]);
      parts.push(`<rect x="${origin[0]}" y="${origin[1]}" width="${outlineWidth}" height="${outlineHeight}" fill="none" stroke="${unitColor(0.96, 0.72, 0.35)}" stroke-width="0.018" />`);
    }
    parts.push(svgText(box, [left + 0.58, rowY], `${keys.tokens[token] ?? ""}  [${token}]`, 0.13, strength > 0 ? unitColor(0.94, 0.97, 1) : unitColor(0.42, 0.47, 0.53), "middle"));
    for (let feature = 0; feature < features; feature += 1) {
      const panels = [
        [keys.values[token * features + feature] ?? 0, keyLeft, [0.33, 0.78, 0.72]] as const,
        [values.values[token * features + feature] ?? 0, valueLeft, [0.36, 0.64, 0.91]] as const,
      ];
      for (const [value, panelLeft, positive] of panels) {
        const ink = strength <= 0
          ? unitColor(0.105, 0.125, 0.15)
          : mixColor(cacheColor(value, limit, positive), unitColor(0.105, 0.125, 0.15), 1 - strength);
        parts.push(svgRect(box, [panelLeft + feature * cellX + cellX / 2, rowY], cellX * 0.94, cellY * 0.88, ink));
      }
    }
  }
  parts.push("</svg>");
  return parts.join("");
}

function cacheColor(value: number, limit: number, positive: readonly [number, number, number]): string {
  const normalized = Math.max(-1, Math.min(1, value / limit));
  if (normalized < 0) return unitColor(lerp(0.14, 0.9, -normalized), lerp(0.17, 0.36, -normalized), lerp(0.21, 0.48, -normalized));
  return unitColor(lerp(0.14, positive[0], normalized), lerp(0.17, positive[1], normalized), lerp(0.21, positive[2], normalized));
}

function divergingColor(value: number, limit: number): string {
  const amount = Math.max(0, Math.min(1, Math.abs(value) / limit));
  if (value < 0) return unitColor(lerp(0.12, 0.94, amount), lerp(0.16, 0.42, amount), lerp(0.22, 0.48, amount));
  return unitColor(lerp(0.12, 0.25, amount), lerp(0.16, 0.78, amount), lerp(0.22, 0.74, amount));
}

function lerp(from: number, to: number, mix: number): number {
  return from + (to - from) * mix;
}

function mixColor(from: string, to: string, mix: number): string {
  const read = (color: string) => [...color.matchAll(/[\d.]+/g)].map((part) => Number(part[0]));
  const start = read(from);
  const end = read(to);
  return `rgba(${start.map((channel, index) => channel + ((end[index] ?? channel) - channel) * mix).join(", ")})`;
}

export interface NormRow {
  label: string;
  input: number[];
  output: number[];
  mean: number;
  divisor: number;
}

/** Layer-norm each row. Sums are 32-bit, and the divisor is the square root of variance plus epsilon. */
export function layerNormRows(rows: readonly (readonly number[])[], epsilon = 1e-5): NormRow[] {
  const eps = f32(epsilon);
  return rows.map((row) => {
    const values = row.map((value) => f32(value));
    const count = values.length;
    let mean = 0;
    for (const value of values) mean = f32(mean + value);
    mean = f32(mean / count);
    let variance = 0;
    for (const value of values) {
      const delta = f32(value - mean);
      variance = f32(variance + f32(delta * delta));
    }
    variance = f32(variance / count);
    const divisor = f32(Math.sqrt(f32(variance + eps)));
    return {
      label: "",
      input: values,
      output: values.map((value) => f32(f32(value - mean) / divisor)),
      mean,
      divisor,
    };
  });
}

/** Before and after panels for one layer-norm. */
export function NormalizationPanel(labels: readonly string[], values: readonly number[], features: number): Tattva {
  const rows = layerNormRows(chunk(values, features)).map((row, index) => ({ ...row, label: labels[index] ?? "" }));
  return new NormalizationPanelTattva(rows, features);
}

class NormalizationPanelTattva extends Tattva {
  constructor(
    private readonly rows: readonly NormRow[],
    private readonly features: number,
  ) {
    super();
    const cell = { x: 0.54, y: 0.46 };
    this.worldSize = {
      width: 0.34 * 2 + 1.25 + features * cell.x * 2 + 2.35,
      height: 0.34 * 2 + 0.86 + rows.length * cell.y,
    };
  }

  override contentHTML(): string {
    return normMarkup(this.rows, this.features, this.worldSize ?? { width: 1, height: 1 });
  }
}

export interface TokenCandidate {
  token: string;
  logit: number;
  model: number;
  sampling: number;
  retained: boolean;
  selected: boolean;
}

export interface NextTokenChoice {
  candidates: TokenCandidate[];
  selected: string;
}

/**
 * Temperature, top-k, then top-p, then one categorical draw.
 * `unit` is in `[0, 1)`. Exponentials stay 64-bit; the authored scenes still pick the 32-bit token.
 */
export function nextTokenChoice(
  tokens: readonly string[],
  logits: readonly number[],
  options: { temperature: number; topK: number; topP: number; unit: number },
): NextTokenChoice {
  const model = softmax(logits.map((logit) => logit / options.temperature));
  const filtered = model.slice();
  const byScore = filtered.map((_, index) => index).sort((left, right) => filtered[right]! - filtered[left]! || left - right);
  for (const index of byScore.slice(options.topK)) filtered[index] = 0;
  renormalize(filtered);
  const nucleus = filtered.map((_, index) => index).filter((index) => (filtered[index] ?? 0) > 0)
    .sort((left, right) => filtered[right]! - filtered[left]! || left - right);
  let cumulative = 0;
  let keep = 0;
  for (const index of nucleus) {
    cumulative += filtered[index] ?? 0;
    keep += 1;
    if (cumulative >= options.topP) break;
  }
  for (const index of nucleus.slice(keep)) filtered[index] = 0;
  renormalize(filtered);
  const total = filtered.reduce((sum, value) => sum + value, 0);
  let walked = 0;
  let chosen = filtered.length - 1;
  for (let index = 0; index < filtered.length; index += 1) {
    walked += total > 0 ? (filtered[index] ?? 0) / total : 0;
    if (options.unit < walked || index + 1 === filtered.length) {
      chosen = index;
      break;
    }
  }
  const candidates = tokens.map((token, index) => ({
    token,
    logit: logits[index] ?? 0,
    model: model[index] ?? 0,
    sampling: filtered[index] ?? 0,
    retained: (filtered[index] ?? 0) > 0,
    selected: index === chosen,
  }));
  return { candidates, selected: tokens[chosen] ?? "" };
}

export function entropyBits(probabilities: readonly number[]): { bits: number; maxBits: number; ratio: number } {
  const bits = probabilities.filter((probability) => probability > 0).reduce((sum, probability) => sum - probability * Math.log2(probability), 0);
  const maxBits = probabilities.length <= 1 ? 0 : Math.log2(probabilities.length);
  return { bits, maxBits, ratio: maxBits <= 0 ? 0 : Math.max(0, Math.min(1, bits / maxBits)) };
}

export function NextTokenBoard(choice: NextTokenChoice, sampling: { temperature: number; topK: number; topP: number; unit: number }): Tattva {
  return new NextTokenBoardTattva(choice, sampling);
}

class NextTokenBoardTattva extends Tattva {
  constructor(
    private readonly choice: NextTokenChoice,
    private readonly sampling: { temperature: number; topK: number; topP: number; unit: number },
  ) {
    super();
    const rowHeight = 0.48;
    const rowGap = 0.08;
    const rows = choice.candidates.length * rowHeight + Math.max(0, choice.candidates.length - 1) * rowGap;
    this.worldSize = { width: 8.8, height: 0.34 * 2 + 0.72 + rows + 0.32 };
  }

  override contentHTML(): string {
    return tokenBoardMarkup(this.choice, this.sampling, this.worldSize ?? { width: 1, height: 1 });
  }
}

export function EntropyBar(probabilities: readonly number[], colors: { track: string; fill: string; label: string }): Tattva {
  return new EntropyBarTattva(probabilities, colors);
}

class EntropyBarTattva extends Tattva {
  private readonly bits: number;
  private readonly ratio: number;

  constructor(
    probabilities: readonly number[],
    private readonly colors: { track: string; fill: string; label: string },
  ) {
    super();
    const meter = entropyBits(probabilities);
    this.bits = meter.bits;
    this.ratio = meter.ratio;
    // The bar stays on the object center. Empty space below the label balances the space above it.
    this.worldSize = { width: 2.8, height: 0.56 };
  }

  override contentHTML(): string {
    const frame = this.worldSize ?? { width: 2.8, height: 0.56 };
    const bar = 0.12;
    const fill = frame.width * this.ratio;
    const parts = [
      svgOpen(frame),
      svgRect(frame, [0, 0], frame.width, bar, this.colors.track),
    ];
    if (fill > 0) parts.push(svgRect(frame, [-frame.width / 2 + fill / 2, 0], fill, bar, this.colors.fill));
    parts.push(svgText(frame, [0, bar * 1.4], `sampling entropy: ${this.bits.toFixed(2)} bits`, 0.16, this.colors.label, "middle"));
    parts.push("</svg>");
    return parts.join("");
  }
}

function chunk(values: readonly number[], size: number): number[][] {
  const rows: number[][] = [];
  for (let index = 0; index < values.length; index += size) rows.push(values.slice(index, index + size));
  return rows;
}

function softmax(values: readonly number[]): number[] {
  const max = Math.max(...values);
  const weights = values.map((value) => Math.exp(value - max));
  const sum = weights.reduce((total, weight) => total + weight, 0);
  return weights.map((weight) => weight / sum);
}

function renormalize(values: number[]): void {
  const sum = values.reduce((total, value) => total + value, 0);
  if (sum > 0) {
    for (let index = 0; index < values.length; index += 1) values[index] = (values[index] ?? 0) / sum;
  }
}

function normMarkup(rows: readonly NormRow[], features: number, box: Frame): string {
  const cellX = 0.54;
  const cellY = 0.46;
  const padding = 0.34;
  const left = -box.width / 2 + padding;
  const top = box.height / 2 - padding;
  const matrixWidth = features * cellX;
  const inputLeft = left + 1.25;
  const outputLeft = inputLeft + matrixWidth + 2.35;
  const statsX = inputLeft + matrixWidth + 1.175;
  const limit = Math.max(Number.EPSILON, ...rows.flatMap((row) => [...row.input, ...row.output].map(Math.abs)));
  const parts = [svgOpen(box), svgRect(box, [0, 0], box.width, box.height, unitColor(0.055, 0.068, 0.085, 0.98))];
  parts.push(svgText(box, [left + 0.85, top - 0.13], "LAYER NORM", 0.22, unitColor(0.94, 0.97, 1), "middle"));
  parts.push(svgText(box, [box.width / 2 - padding - 1.05, top - 0.13], `axis feature   epsilon ${formatEpsilon(1e-5)}`, 0.14, unitColor(0.44, 0.49, 0.55), "middle"));
  parts.push(svgText(box, [inputLeft + matrixWidth / 2, top - 0.53], "INPUT", 0.16, unitColor(0.45, 0.61, 0.88), "middle"));
  parts.push(svgText(box, [outputLeft + matrixWidth / 2, top - 0.53], "NORMALIZED", 0.16, unitColor(0.33, 0.79, 0.68), "middle"));
  const rowTop = top - 0.86;
  rows.forEach((row, group) => {
    const rowY = rowTop - group * cellY - cellY / 2;
    parts.push(svgText(box, [left + 0.52, rowY], row.label, 0.14, unitColor(0.94, 0.97, 1), "middle"));
    parts.push(svgText(box, [statsX, rowY], `mu ${signed(row.mean, 2)}  sigma ${row.divisor.toFixed(2)}`, 0.12, unitColor(0.44, 0.49, 0.55), "middle"));
    for (let feature = 0; feature < features; feature += 1) {
      const panels = [
        [row.input[feature] ?? 0, inputLeft, [0.45, 0.61, 0.88]] as const,
        [row.output[feature] ?? 0, outputLeft, [0.33, 0.79, 0.68]] as const,
      ];
      for (const [value, panelLeft, positive] of panels) {
        const x = panelLeft + feature * cellX + cellX / 2;
        parts.push(svgRect(box, [x, rowY], cellX * 0.94, cellY * 0.88, cacheColor(value, limit, positive)));
        parts.push(svgText(box, [x, rowY], signed(value, 1), 0.11, unitColor(0.94, 0.97, 1), "middle"));
      }
    }
  });
  parts.push("</svg>");
  return parts.join("");
}

function tokenBoardMarkup(
  choice: NextTokenChoice,
  sampling: { temperature: number; topK: number; topP: number; unit: number },
  box: Frame,
): string {
  const padding = 0.34;
  const rowHeight = 0.48;
  const rowGap = 0.08;
  const top = box.height / 2 - padding;
  const left = -box.width / 2 + padding;
  const trackX = left + 2.25;
  const trackWidth = box.width - padding * 2 - 3;
  const parts = [svgOpen(box), svgRect(box, [0, 0], box.width, box.height, unitColor(0.055, 0.068, 0.085, 0.98))];
  parts.push(svgText(box, [left + 0.8, top - 0.13], "NEXT TOKEN", 0.22, unitColor(0.94, 0.97, 1), "middle"));
  parts.push(svgText(
    box,
    [box.width / 2 - padding - 1.55, top - 0.13],
    `T ${sampling.temperature.toFixed(2)}   TOP-K ${sampling.topK}   TOP-P ${sampling.topP.toFixed(2)}   u ${sampling.unit.toFixed(2)}`,
    0.15,
    unitColor(0.7, 0.75, 0.8),
    "middle",
  ));
  let rowY = top - 0.72 - rowHeight / 2;
  for (const candidate of choice.candidates) {
    if (candidate.selected) parts.push(svgRect(box, [0, rowY], box.width - padding * 2, rowHeight, unitColor(0.18, 0.145, 0.09)));
    const nameInk = candidate.selected
      ? unitColor(0.96, 0.72, 0.35)
      : candidate.retained ? unitColor(0.94, 0.97, 1) : unitColor(0.31, 0.33, 0.37);
    const rowInk = candidate.retained ? unitColor(0.94, 0.97, 1) : unitColor(0.31, 0.33, 0.37);
    parts.push(svgText(box, [left + 0.7, rowY], `${candidate.selected ? "> " : ""}${candidate.token}`, 0.17, nameInk, "middle"));
    parts.push(svgText(box, [left + 1.75, rowY], signed(candidate.logit, 2), 0.13, rowInk, "middle"));
    parts.push(svgRect(box, [trackX + trackWidth / 2, rowY], trackWidth, 0.18, unitColor(0.14, 0.17, 0.21)));
    const bar = trackWidth * candidate.sampling;
    if (bar > 0) {
      parts.push(svgRect(box, [trackX + bar / 2, rowY], bar, 0.18, candidate.selected ? unitColor(0.96, 0.72, 0.35) : unitColor(0.35, 0.77, 0.87)));
    }
    const readout = candidate.retained
      ? `${(candidate.sampling * 100).toFixed(1).padStart(5)}%  model ${(candidate.model * 100).toFixed(1).padStart(5)}%`
      : `FILTERED  model ${(candidate.model * 100).toFixed(1).padStart(5)}%`;
    parts.push(svgText(box, [trackX + trackWidth - 0.72, rowY], readout, 0.12, rowInk, "middle"));
    rowY -= rowHeight + rowGap;
  }
  parts.push("</svg>");
  return parts.join("");
}

function formatEpsilon(epsilon: number): string {
  const exp = Math.round(Math.log10(epsilon));
  return `${Math.round(epsilon / 10 ** exp)}e${exp}`;
}

function signed(value: number, digits: number): string {
  const text = Math.abs(value).toFixed(digits);
  return value < 0 ? `-${text}` : `+${text}`;
}

function tokenWidth(token: string, tokenHeight: number): number {
  const text = Math.max(token.length, 1) * tokenHeight * 0.58;
  return text + tokenHeight * 0.35 * 2;
}

function tokenRowSize(tokens: readonly string[], tokenHeight: number): Frame {
  const gap = tokenHeight * 0.45;
  const width = tokens.reduce((sum, token) => sum + tokenWidth(token, tokenHeight), 0) + gap * Math.max(0, tokens.length - 1);
  const height = tokenHeight + tokenHeight * 0.28 * 2;
  return { width: Math.max(0.1, width), height: Math.max(0.1, height) };
}

function tokenRowMarkup(tokens: readonly string[], tokenHeight: number, frame: Frame): string {
  const gap = tokenHeight * 0.45;
  const boxHeight = tokenHeight + tokenHeight * 0.28 * 2;
  let cursor = -frame.width / 2;
  const parts = [svgOpen(frame)];
  for (const token of tokens) {
    const width = tokenWidth(token, tokenHeight);
    const center = cursor + width / 2;
    parts.push(`<rect x="${svgPoint(frame, [center - width / 2, boxHeight / 2])[0]}" y="${svgPoint(frame, [center, boxHeight / 2])[1]}" width="${width}" height="${boxHeight}" fill="none" stroke="${unitColor(0.42, 0.55, 0.86)}" stroke-width="0.02" />`);
    parts.push(svgText(frame, [center, 0], token, tokenHeight, unitColor(0.97, 0.98, 0.99), "middle"));
    cursor += width + gap;
  }
  parts.push("</svg>");
  return parts.join("");
}

function matrixFrame(values: readonly (readonly number[])[], tokens: readonly string[]): Frame {
  const rows = values.length;
  const columns = values.reduce((max, row) => Math.max(max, row.length), 0);
  const cell = 0.38;
  const labelHeight = 0.2;
  const longestLabel = tokens.reduce((max, token) => Math.max(max, tokenWidth(token, labelHeight)), 0);
  const horizontalPad = tokens.length > 0 ? cell * 0.7 + longestLabel + 0.08 : 0;
  const verticalPad = tokens.length > 0 ? cell * 0.55 + longestLabel / 2 + 0.08 : 0;
  return {
    width: Math.max(0.2, columns * cell + horizontalPad * 2),
    height: Math.max(0.2, rows * cell + verticalPad * 2),
  };
}

function matrixMarkup(values: readonly (readonly number[])[], tokens: readonly string[], frame: Frame): string {
  const cell = 0.38;
  const rows = values.length;
  const columns = values.reduce((max, row) => Math.max(max, row.length), 0);
  const gridWidth = columns * cell;
  const gridHeight = rows * cell;
  const left = -gridWidth / 2;
  const top = gridHeight / 2;
  const parts = [svgOpen(frame)];
  values.forEach((row, rowIndex) => {
    row.forEach((value, column) => {
      const center: Vec2 = [left + column * cell + cell / 2, top - rowIndex * cell - cell / 2];
      parts.push(svgRect(frame, center, cell * 0.96, cell * 0.96, heatColor(value)));
    });
  });
  const grid = unitColor(0.88, 0.92, 0.96);
  for (let column = 0; column <= columns; column += 1) {
    const x = left + column * cell;
    parts.push(svgLine(frame, [x, -gridHeight / 2], [x, gridHeight / 2], grid, 0.015));
  }
  for (let row = 0; row <= rows; row += 1) {
    const y = top - row * cell;
    parts.push(svgLine(frame, [left, y], [left + gridWidth, y], grid, 0.015));
  }
  tokens.forEach((token, index) => {
    if (index < columns) {
      const x = left + index * cell + cell / 2;
      const [sx, sy] = svgPoint(frame, [x, top + cell * 0.55]);
      parts.push(`<text x="${sx}" y="${sy}" fill="${grid}" font-size="0.2" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-weight="700" text-anchor="middle" dominant-baseline="middle" transform="rotate(-90 ${sx} ${sy})">${escapeText(token)}</text>`);
    }
    if (index < rows) {
      const y = top - index * cell - cell / 2;
      parts.push(svgText(frame, [left - cell * 0.7, y], token, 0.2, grid, "end"));
    }
  });
  parts.push("</svg>");
  return parts.join("");
}

function heatColor(value: number): string {
  const mix = Math.max(0, Math.min(1, value));
  const low = [0.14, 0.18, 0.27];
  const high = [0.2, 0.82, 0.88];
  return unitColor(
    low[0] + (high[0] - low[0]) * mix,
    low[1] + (high[1] - low[1]) * mix,
    low[2] + (high[2] - low[2]) * mix,
  );
}

function blockMarkup(options: TransformerBlockOptions, frame: Frame, focus: StageFocus): string {
  const width = options.width ?? 3;
  const blockHeight = options.blockHeight ?? 0.5;
  const gap = options.gap ?? 0.16;
  const accent = options.accent ?? unitColor(0.45, 0.78, 0.98);
  const frameColor = options.frame ?? unitColor(0.86, 0.9, 0.95);
  const residual = unitColor(0.98, 0.72, 0.35);
  const ink = unitColor(0.95, 0.97, 0.99);
  const stages = ENCODER_STAGES;
  const stack = stages.length * blockHeight + (stages.length - 1) * gap;
  const stageY = (index: number) => stack / 2 - blockHeight / 2 - index * (blockHeight + gap);
  const colorFor = (kind: EncoderStage["kind"]) => (kind === "residual" ? residual : kind === "accent" ? accent : frameColor);
  const parts = [svgOpen(frame)];
  const inner = width * 0.86;
  stages.forEach((stage, index) => {
    const y = stageY(index);
    const opacity = stageOpacity(stage.id, focus);
    parts.push(`<g opacity="${opacity}">`);
    parts.push(`<rect x="${svgPoint(frame, [-inner / 2, y + blockHeight / 2])[0]}" y="${svgPoint(frame, [0, y + blockHeight / 2])[1]}" width="${inner}" height="${blockHeight}" fill="none" stroke="${colorFor(stage.kind)}" stroke-width="0.03" />`);
    parts.push(svgText(frame, [0, y], stage.label, blockHeight * 0.32, ink, "middle"));
    parts.push("</g>");
    if (index + 1 < stages.length) {
      const next = stageY(index + 1);
      parts.push(svgLine(frame, [0, y - blockHeight / 2], [0, next + blockHeight / 2], frameColor, 0.03));
    }
  });
  const inputY = stageY(0) + blockHeight / 2 + 0.4;
  const outputY = stageY(stages.length - 1) - blockHeight / 2 - 0.4;
  for (const stage of stages) {
    if (!stage.residualFrom) continue;
    const sourceY = stage.residualFrom === "input"
      ? inputY
      : stageY(stages.findIndex((candidate) => candidate.id === stage.residualFrom));
    const targetY = stageY(stages.findIndex((candidate) => candidate.id === stage.id));
    const lane = width / 2 + 0.3;
    const boxRight = inner / 2;
    for (const [start, end] of [
      [[boxRight, sourceY], [lane, sourceY]],
      [[lane, sourceY], [lane, targetY]],
      [[lane, targetY], [boxRight, targetY]],
    ] as const) {
      const [x1, y1] = svgPoint(frame, start);
      const [x2, y2] = svgPoint(frame, end);
      parts.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${residual}" stroke-width="0.03" stroke-dasharray="0.1 0.06" />`);
    }
  }
  parts.push(svgText(frame, [0, inputY], options.inputLabel ?? "Input Residual Stream", 0.2, ink, "middle"));
  parts.push(svgText(frame, [0, outputY], options.outputLabel ?? "Output Residual Stream", 0.2, ink, "middle"));
  parts.push("</svg>");
  return parts.join("");
}
