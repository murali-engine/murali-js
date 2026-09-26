import { Tattva, type TattvaState, type Vec2 } from "../core/Tattva.ts";
import { resolveColor } from "../core/palette.ts";

const CHAR_WIDTH = 0.58;
const smoothstep = (value: number) => value * value * (3 - 2 * value);

export type StepDirection = "up" | "down" | "left" | "right";

export interface StepwiseTransition {
  from: number;
  to: number;
  route?: readonly StepDirection[];
}

export interface StepwiseModel {
  steps: readonly string[];
  transitions: readonly StepwiseTransition[];
  /** Journey order. Repeats are the replay, including a feedback hop. */
  sequence: readonly number[];
}

export type StepwiseScript = (story: StepwiseStoryBuilder) => void;

interface NodeBox {
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface StepwiseNodeState {
  label: string;
  x: number;
  y: number;
  width: number;
  phase: "pending" | "active" | "completed";
  local: number;
  visited: boolean;
  scale: number;
}

export interface StepwiseEdgeState {
  from: number;
  to: number;
  phase: "hidden" | "drawing" | "completed";
  trim: number;
  signaled: boolean;
  points: Vec2[];
}

export interface StepwisePicture {
  nodes: StepwiseNodeState[];
  edges: StepwiseEdgeState[];
  signal: Vec2 | null;
  buildSequence: number[];
}

const NODE_HEIGHT = 1.2;
const LABEL_HEIGHT = 0.3;
const STROKE = 0.04;
const EDGE = 0.04;
const RADIUS = 0.15;
const SIGNAL_RADIUS = 0.1;
const PULSE = 0.15;

/** Build a reusable story model with stable numeric handles for its steps. */
export function stepwiseModel(script: StepwiseScript): StepwiseModel {
  const builder = new StepwiseStoryBuilder();
  script(builder);
  return builder.build();
}

/** Fluent authoring surface for a stepwise story. */
export class StepwiseStoryBuilder {
  private readonly steps: string[] = [];
  private readonly transitions: StepwiseTransition[] = [];
  private explicitSequence?: number[];

  step(label: string): number {
    const handle = this.steps.length;
    this.steps.push(label);
    return handle;
  }

  connect(from: number, to: number): StepwiseConnectionBuilder {
    this.assertStep(from, "from");
    this.assertStep(to, "to");
    const transition: { from: number; to: number; route?: readonly StepDirection[] } = { from, to };
    this.transitions.push(transition);
    return new StepwiseConnectionBuilder(transition);
  }

  sequence(steps: readonly number[]): this {
    steps.forEach((step) => this.assertStep(step, "sequence"));
    this.explicitSequence = [...steps];
    return this;
  }

  build(): StepwiseModel {
    const transitions = this.transitions.length > 0
      ? this.transitions.map((transition) => ({ ...transition, route: transition.route ? [...transition.route] : undefined }))
      : this.steps.slice(1).map((_, index) => ({ from: index, to: index + 1 }));
    const sequence = this.explicitSequence ?? topologicalSequence(this.steps.length, transitions);
    if (this.steps.length > 0 && sequence.length !== this.steps.length && this.explicitSequence === undefined) {
      throw new Error("A cyclic stepwise story needs an explicit sequence().");
    }
    return { steps: [...this.steps], transitions, sequence: [...sequence] };
  }

  private assertStep(step: number, role: string): void {
    if (!Number.isInteger(step) || step < 0 || step >= this.steps.length) {
      throw new Error(`Stepwise ${role} references unknown step ${step}.`);
    }
  }
}

export class StepwiseConnectionBuilder {
  constructor(private readonly transition: { from: number; to: number; route?: readonly StepDirection[] }) {}

  route(...directions: StepDirection[]): this {
    if (directions.length === 0) throw new Error("A stepwise route needs at least one direction.");
    this.transition.route = directions;
    return this;
  }
}

/** Unique steps in first-seen order. The reveal walks this, not the replay. */
export function stepwiseBuildSequence(sequence: readonly number[]): number[] {
  const seen = new Set<number>();
  return sequence.filter((step) => {
    if (seen.has(step)) return false;
    seen.add(step);
    return true;
  });
}

/**
 * The diagram at one reveal and one signal progress.
 * Reveal is already eased by the timeline. Each node's local amount is smoothstepped again.
 */
export function stepwisePicture(model: StepwiseModel, reveal: number, signal: number, gap = 1.45): StepwisePicture {
  const boxes = nodeBoxes(model.steps, gap);
  const build = stepwiseBuildSequence(model.sequence);
  const phases = revealPhases(model, build, reveal);
  const nodes = model.steps.map((label, index) => {
    const box = boxes[index];
    const signalState = nodeSignal(model.sequence, index, signal);
    return {
      label,
      x: box?.x ?? 0,
      y: box?.y ?? 0,
      width: box?.width ?? NODE_HEIGHT,
      phase: phases.steps[index] ?? "pending",
      local: phases.locals[index] ?? 0,
      visited: signalState.visited,
      scale: 1 + PULSE * signalState.intensity,
    };
  });
  const edges = model.transitions.map((transition, index) => {
    const phase = phases.edges[index] ?? "hidden";
    const points = transition.route
      ? routePoints(transition.from, transition.to, transition.route, boxes, gap)
      : clipEdge(boxes[transition.from], boxes[transition.to], 0.05);
    return {
      from: transition.from,
      to: transition.to,
      phase,
      trim: phase === "drawing" ? smoothstep(phases.edgeLocal[index] ?? 0) : phase === "completed" ? 1 : 0,
      signaled: edgeSignaled(model, transition, signal),
      points,
    };
  });
  return { nodes, edges, signal: signalPoint(model, boxes, gap, signal), buildSequence: build };
}

/** A story whose reveal and replay progress can be animated on the timeline. */
export function Stepwise(script: StepwiseScript): StepwiseTattva {
  return new StepwiseTattva(stepwiseModel(script), 1.45, "#5cd0b3");
}

export class StepwiseTattva extends Tattva<TattvaState & { reveal: number; signal: number }> {
  private shownReveal = 0;
  private shownSignal = 0;

  constructor(
    private readonly model: StepwiseModel,
    private storyGap: number,
    private storySignalColor: string,
  ) {
    super({ state: { reveal: 0, signal: 0 } });
    this.dynamicGeometry = true;
    this.worldSize = frameFor(model, storyGap);
  }

  gap(value: number): this {
    if (!Number.isFinite(value) || value < 0) throw new Error(`Stepwise gap must be a non-negative number; received ${value}.`);
    this.storyGap = value;
    this.worldSize = frameFor(this.model, value);
    return this;
  }

  signalColor(value: string): this {
    this.storySignalColor = resolveColor(value);
    return this;
  }

  override influenceState(_time: number, state: TattvaState & { reveal: number; signal: number }): void {
    this.shownReveal = state.reveal;
    this.shownSignal = state.signal;
  }

  override contentHTML(): string {
    const frame = this.worldSize ?? { width: 1, height: 1 };
    return stepwiseMarkup(stepwisePicture(this.model, this.shownReveal, this.shownSignal, this.storyGap), frame, this.storySignalColor);
  }
}

function topologicalSequence(stepCount: number, transitions: readonly StepwiseTransition[]): number[] {
  const incoming = Array.from({ length: stepCount }, () => 0);
  const outgoing = Array.from({ length: stepCount }, () => [] as number[]);
  for (const transition of transitions) {
    incoming[transition.to] = (incoming[transition.to] ?? 0) + 1;
    outgoing[transition.from]?.push(transition.to);
  }
  const queue = incoming.flatMap((count, index) => count === 0 ? [index] : []);
  const sequence: number[] = [];
  while (queue.length > 0) {
    const step = queue.shift();
    if (step === undefined) break;
    sequence.push(step);
    for (const next of outgoing[step] ?? []) {
      incoming[next] = (incoming[next] ?? 0) - 1;
      if (incoming[next] === 0) queue.push(next);
    }
  }
  return sequence;
}

function nodeBoxes(labels: readonly string[], gap: number): NodeBox[] {
  const boxes: NodeBox[] = [];
  let cursor = 0;
  labels.forEach((label, index) => {
    const text = Math.max(label.length, 1) * LABEL_HEIGHT * CHAR_WIDTH;
    const width = Math.max(NODE_HEIGHT, text + 0.6);
    if (index > 0) {
      const previous = boxes[index - 1];
      cursor += (previous?.width ?? 0) / 2 + gap + width / 2;
    }
    boxes.push({ label, x: cursor, y: 0, width, height: NODE_HEIGHT });
  });
  return boxes;
}

function revealPhases(model: StepwiseModel, build: readonly number[], reveal: number): {
  steps: ("pending" | "active" | "completed")[];
  locals: number[];
  edges: ("hidden" | "drawing" | "completed")[];
  edgeLocal: number[];
} {
  const steps = model.steps.map(() => "pending" as "pending" | "active" | "completed");
  const locals = model.steps.map(() => 0);
  const edges = model.transitions.map(() => "hidden" as "hidden" | "drawing" | "completed");
  const edgeLocal = model.transitions.map(() => 0);
  if (build.length === 0) return { steps, locals, edges, edgeLocal };
  const progress = Math.max(0, Math.min(1, reveal));
  if (progress >= 1) {
    return {
      steps: steps.map(() => "completed"),
      locals,
      edges: edges.map(() => "completed"),
      edgeLocal: edgeLocal.map(() => 1),
    };
  }
  const order = new Map<number, number>();
  build.forEach((step, index) => order.set(step, index));
  const segment = 1 / build.length;
  const active = Math.min(build.length - 1, Math.floor(progress / segment));
  const local = Math.max(0, Math.min(1, (progress - active * segment) / segment));
  build.forEach((step, index) => {
    if (index < active) steps[step] = "completed";
    else if (index === active) {
      steps[step] = "active";
      locals[step] = local;
    }
  });
  model.transitions.forEach((transition, index) => {
    const from = order.get(transition.from);
    const to = order.get(transition.to);
    if (from === undefined || to === undefined) return;
    if (from + 1 === to) {
      if (from < active) edges[index] = "completed";
      else if (from === active) {
        edges[index] = "drawing";
        edgeLocal[index] = local;
      }
    } else if (from <= active) {
      edges[index] = "completed";
    }
  });
  return { steps, locals, edges, edgeLocal };
}

function nodeSignal(sequence: readonly number[], node: number, signal: number): { intensity: number; visited: boolean } {
  if (signal < 0.001 || sequence.length === 0) return { intensity: 0, visited: false };
  const total = 2 * sequence.length - 1;
  const raw = Math.max(0, Math.min(1, signal)) * total;
  const segment = Math.min(total - 1, Math.floor(raw));
  const local = Math.max(0, Math.min(1, raw - segment));
  let intensity = 0;
  let visited = false;
  sequence.forEach((step, hop) => {
    if (step !== node) return;
    const pulse = hop * 2;
    if (segment >= pulse) visited = true;
    if (segment === pulse) {
      const triangle = local < 0.5 ? local * 2 : 2 - local * 2;
      intensity = smoothstep(triangle);
    }
  });
  return { intensity, visited };
}

function edgeSignaled(model: StepwiseModel, transition: StepwiseTransition, signal: number): boolean {
  if (signal < 0.001 || model.sequence.length < 2) return false;
  const total = 2 * model.sequence.length - 1;
  const segment = Math.floor(Math.max(0, Math.min(1, signal)) * total);
  for (let hop = 0; hop < model.sequence.length - 1; hop += 1) {
    if (model.sequence[hop] === transition.from && model.sequence[hop + 1] === transition.to && segment >= hop * 2 + 1) {
      return true;
    }
  }
  return false;
}

function signalPoint(model: StepwiseModel, boxes: readonly NodeBox[], gap: number, signal: number): Vec2 | null {
  if (signal <= 0.001 || model.sequence.length < 2) return null;
  const total = 2 * model.sequence.length - 1;
  const raw = Math.max(0, Math.min(1, signal)) * total;
  const segment = Math.min(total - 1, Math.floor(raw));
  const local = Math.max(0, Math.min(1, raw - segment));
  if (segment % 2 === 0) return null;
  const hop = (segment - 1) / 2;
  const from = model.sequence[hop];
  const to = model.sequence[hop + 1];
  if (from === undefined || to === undefined) return null;
  const transition = model.transitions.find((candidate) => candidate.from === from && candidate.to === to);
  const points = transition?.route
    ? routePoints(from, to, transition.route, boxes, gap)
    : clipEdge(boxes[from], boxes[to], 0);
  return pointAlong(points, smoothstep(local));
}

function clipEdge(from: NodeBox | undefined, to: NodeBox | undefined, padding: number): Vec2[] {
  if (!from || !to) return [];
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1e-6) return [[from.x, from.y], [to.x, to.y]];
  const direction: Vec2 = [dx / distance, dy / distance];
  const travel = (vector: Vec2, width: number, height: number) => {
    const horizontal = Math.abs(vector[0]) > 1e-6 ? (width / 2 + padding) / Math.abs(vector[0]) : Number.POSITIVE_INFINITY;
    const vertical = Math.abs(vector[1]) > 1e-6 ? (height / 2 + padding) / Math.abs(vector[1]) : Number.POSITIVE_INFINITY;
    return Math.min(horizontal, vertical);
  };
  const start = travel(direction, from.width, from.height);
  const end = travel([-direction[0], -direction[1]], to.width, to.height);
  return [
    [from.x + direction[0] * start, from.y + direction[1] * start],
    [to.x - direction[0] * end, to.y - direction[1] * end],
  ];
}

function routePoints(
  fromIndex: number,
  toIndex: number,
  route: readonly StepDirection[],
  boxes: readonly NodeBox[],
  gap: number,
): Vec2[] {
  const from = boxes[fromIndex];
  const to = boxes[toIndex];
  if (!from || !to || route.length === 0) return clipEdge(from, to, 0.05);
  const lane = gap * 0.8;
  const spanned = boxes.slice(Math.min(fromIndex, toIndex), Math.max(fromIndex, toIndex) + 1);
  const halfHeight = Math.max(...spanned.map((box) => box.height / 2));
  const start: Vec2 = route[0] === "up"
    ? [from.x, from.y + from.height / 2]
    : route[0] === "down"
      ? [from.x, from.y - from.height / 2]
      : route[0] === "left"
        ? [from.x - from.width / 2, from.y]
        : [from.x + from.width / 2, from.y];
  const points: Vec2[] = [start];
  let rank = fromIndex;
  let x = start[0];
  let y = start[1];
  for (const direction of route) {
    if (direction === "left" || direction === "right") {
      rank += direction === "right" ? 1 : -1;
      rank = Math.max(0, Math.min(boxes.length - 1, rank));
      x = boxes[rank]?.x ?? x;
    } else {
      const goUp = direction === "up";
      y = (goUp ? Math.max(from.y, to.y) : Math.min(from.y, to.y)) + (goUp ? 1 : -1) * (halfHeight + lane);
    }
    points.push([x, y]);
  }
  const last = points[points.length - 1] ?? start;
  const dx = last[0] - to.x;
  const dy = last[1] - to.y;
  let end: Vec2;
  if (Math.abs(dy) > to.height / 2 + 0.05) end = [to.x, to.y + Math.sign(dy) * to.height / 2];
  else if (Math.abs(dx) > to.width / 2 + 0.05) end = [to.x + Math.sign(dx) * to.width / 2, to.y];
  else if (Math.abs(dy) >= Math.abs(dx)) end = [to.x, to.y + Math.sign(dy || 1) * to.height / 2];
  else end = [to.x + Math.sign(dx || 1) * to.width / 2, to.y];
  if (Math.abs(last[0] - end[0]) > 0.001 && Math.abs(last[1] - end[1]) > 0.001) {
    const verticalFace = Math.abs(end[0] - to.x) < 0.001;
    points.push(verticalFace ? [end[0], last[1]] : [last[0], end[1]]);
  }
  points.push(end);
  const kept: Vec2[] = [];
  for (const point of points) {
    const previous = kept[kept.length - 1];
    if (!previous || Math.hypot(point[0] - previous[0], point[1] - previous[1]) > 0.001) kept.push(point);
  }
  return kept;
}

function pointAlong(points: readonly Vec2[], amount: number): Vec2 | null {
  if (points.length === 0) return null;
  const first = points[0];
  if (!first || points.length === 1) return first ?? null;
  const lengths: number[] = [];
  let total = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    const length = Math.hypot((points[index + 1]?.[0] ?? 0) - (points[index]?.[0] ?? 0), (points[index + 1]?.[1] ?? 0) - (points[index]?.[1] ?? 0));
    lengths.push(length);
    total += length;
  }
  let target = Math.max(0, Math.min(1, amount)) * total;
  for (let index = 0; index < lengths.length; index += 1) {
    const length = lengths[index] ?? 0;
    const from = points[index];
    const to = points[index + 1];
    if (!from || !to) continue;
    if (target <= length || index === lengths.length - 1) {
      const mix = length < 1e-6 ? 0 : target / length;
      return [from[0] + (to[0] - from[0]) * mix, from[1] + (to[1] - from[1]) * mix];
    }
    target -= length;
  }
  return points[points.length - 1] ?? null;
}

function frameFor(model: StepwiseModel, gap: number): { width: number; height: number } {
  const picture = stepwisePicture(model, 1, 1, gap);
  const boxes = nodeBoxes(model.steps, gap);
  const xs = [0];
  const ys = [0];
  for (const box of boxes) {
    xs.push(box.x - box.width * 0.575, box.x + box.width * 0.575);
    ys.push(box.y - box.height * 0.575, box.y + box.height * 0.575);
  }
  for (const edge of picture.edges) {
    for (const point of edge.points) {
      xs.push(point[0]);
      ys.push(point[1]);
    }
  }
  const halfWidth = Math.max(...xs.map((value) => Math.abs(value))) + SIGNAL_RADIUS;
  const halfHeight = Math.max(...ys.map((value) => Math.abs(value))) + SIGNAL_RADIUS;
  return { width: Math.max(0.1, halfWidth * 2), height: Math.max(0.1, halfHeight * 2) };
}

function stepwiseMarkup(picture: StepwisePicture, frame: { width: number; height: number }, signalColor: string): string {
  const parts = [`<svg width="100%" height="100%" viewBox="0 0 ${frame.width} ${frame.height}" xmlns="http://www.w3.org/2000/svg">`];
  for (const edge of picture.edges) {
    if (edge.phase === "hidden" || edge.points.length < 2) continue;
    const color = edge.phase === "drawing"
      ? unitColor(0.35, 0.45, 0.6)
      : edge.signaled ? unitColor(0.35, 0.7, 1) : unitColor(0.35, 0.45, 0.6, 0.6);
    parts.push(svgPolyline(frame, edge.points, color, EDGE, edge.trim));
  }
  for (const node of picture.nodes) {
    if (node.phase === "pending") continue;
    const width = node.width * node.scale;
    const height = NODE_HEIGHT * node.scale;
    const eased = node.phase === "active" ? smoothstep(node.local) : 1;
    const outline = node.phase === "active" ? Math.max(0, Math.min(1, eased * 2)) : 1;
    const fillAmount = node.phase === "active" ? Math.max(0, Math.min(1, (eased - 0.5) * 2)) : 1;
    const active = node.visited || node.phase === "active";
    const stroke = active ? unitColor(0.35, 0.7, 1) : unitColor(0.4, 0.5, 0.6);
    const fill = active ? unitColor(0.12, 0.18, 0.3, fillAmount) : unitColor(0.18, 0.22, 0.28, fillAmount);
    if (outline > 0) parts.push(roundedNode(frame, node.x, node.y, width, height, RADIUS * node.scale, fill, stroke, outline));
    if (fillAmount > 0.001) {
      const count = Math.ceil(node.label.length * fillAmount);
      parts.push(svgText(frame, [node.x, node.y], node.label.slice(0, count), LABEL_HEIGHT * node.scale, unitColor(0.95, 0.97, 1, fillAmount)));
    }
  }
  if (picture.signal) parts.push(svgDot(frame, picture.signal, SIGNAL_RADIUS, signalColor));
  parts.push("</svg>");
  return parts.join("");
}

function roundedNode(
  frame: { width: number; height: number },
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: string,
  stroke: string,
  trim: number,
): string {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const curve = Math.min(radius, halfWidth, halfHeight);
  const at = (px: number, py: number): Vec2 => [x + px, y + py];
  const samples: Vec2[] = [at(-halfWidth + curve, -halfHeight)];
  const pushLine = (point: Vec2) => samples.push(point);
  const pushCurve = (control: Vec2, end: Vec2) => {
    const from = samples[samples.length - 1] ?? end;
    for (let step = 1; step <= 8; step += 1) samples.push(quadratic(from, control, end, step / 8));
  };
  pushLine(at(halfWidth - curve, -halfHeight));
  pushCurve(at(halfWidth, -halfHeight), at(halfWidth, -halfHeight + curve));
  pushLine(at(halfWidth, halfHeight - curve));
  pushCurve(at(halfWidth, halfHeight), at(halfWidth - curve, halfHeight));
  pushLine(at(-halfWidth + curve, halfHeight));
  pushCurve(at(-halfWidth, halfHeight), at(-halfWidth, halfHeight - curve));
  pushLine(at(-halfWidth, -halfHeight + curve));
  pushCurve(at(-halfWidth, -halfHeight), at(-halfWidth + curve, -halfHeight));
  const commands = samples.map((point, index) => {
    const [sx, sy] = svgPoint(frame, point);
    return `${index === 0 ? "M" : "L"} ${sx} ${sy}`;
  });
  let length = 0;
  for (let index = 0; index < samples.length - 1; index += 1) {
    length += Math.hypot((samples[index + 1]?.[0] ?? 0) - (samples[index]?.[0] ?? 0), (samples[index + 1]?.[1] ?? 0) - (samples[index]?.[1] ?? 0));
  }
  const drawn = Math.max(0, Math.min(1, trim)) * length;
  return `<path d="${commands.join(" ")} Z" fill="${fill}" stroke="${stroke}" stroke-width="${STROKE}" stroke-dasharray="${length} ${length}" stroke-dashoffset="${length - drawn}" />`;
}

function quadratic(from: Vec2, control: Vec2, to: Vec2, amount: number): Vec2 {
  const rest = 1 - amount;
  return [
    rest * rest * from[0] + 2 * rest * amount * control[0] + amount * amount * to[0],
    rest * rest * from[1] + 2 * rest * amount * control[1] + amount * amount * to[1],
  ];
}

function svgPolyline(frame: { width: number; height: number }, points: readonly Vec2[], color: string, thickness: number, trim: number): string {
  let length = 0;
  const commands = points.map((point, index) => {
    if (index > 0) {
      length += Math.hypot(point[0] - (points[index - 1]?.[0] ?? 0), point[1] - (points[index - 1]?.[1] ?? 0));
    }
    const [x, y] = svgPoint(frame, point);
    return `${x} ${y}`;
  });
  const drawn = Math.max(0, Math.min(1, trim)) * length;
  return `<polyline points="${commands.join(" ")}" fill="none" stroke="${color}" stroke-width="${thickness}" stroke-dasharray="${length} ${length}" stroke-dashoffset="${length - drawn}" />`;
}

function svgDot(frame: { width: number; height: number }, point: Vec2, radius: number, color: string): string {
  const [x, y] = svgPoint(frame, point);
  return `<circle cx="${x}" cy="${y}" r="${radius}" fill="${color}" />`;
}

function svgText(frame: { width: number; height: number }, point: Vec2, text: string, height: number, color: string): string {
  const [x, y] = svgPoint(frame, point);
  return `<text x="${x}" y="${y}" fill="${color}" font-size="${height}" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-weight="700" text-anchor="middle" dominant-baseline="middle">${escapeText(text)}</text>`;
}

function svgPoint(frame: { width: number; height: number }, point: Vec2): [number, number] {
  return [point[0] + frame.width / 2, frame.height / 2 - point[1]];
}

function unitColor(red: number, green: number, blue: number, alpha = 1): string {
  const channel = (value: number) => Math.round(Math.max(0, Math.min(1, value)) * 255);
  return `rgba(${channel(red)}, ${channel(green)}, ${channel(blue)}, ${alpha})`;
}

function escapeText(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
