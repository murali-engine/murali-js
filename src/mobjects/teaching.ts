import { Tattva, type TattvaState, type Vec2 } from "../core/Tattva.ts";

export interface NetworkDiagram {
  layers: readonly number[];
  layerSpacing: number;
  nodeSpacing: number;
  nodeRadius: number;
  inactive: ReadonlySet<string>;
  labels: readonly string[];
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
  if (layers.length === 0 || layers.some((count) => count < 1)) {
    throw new Error("A neural network needs every layer to contain at least one node.");
  }
  return {
    layers,
    layerSpacing: options.layerSpacing ?? 1.8,
    nodeSpacing: options.nodeSpacing ?? 0.8,
    nodeRadius: options.nodeRadius ?? 0.12,
    inactive: new Set((options.inactive ?? []).map(([layer, node]) => `${layer}:${node}`)),
    labels: options.labels ?? [],
  };
}

export function networkNode(diagram: NetworkDiagram, layer: number, node: number): Vec2 | undefined {
  const count = diagram.layers[layer];
  if (count === undefined || node < 0 || node >= count) return undefined;
  const width = (diagram.layers.length - 1) * diagram.layerSpacing;
  const height = (count - 1) * diagram.nodeSpacing;
  return [-width / 2 + layer * diagram.layerSpacing, height / 2 - node * diagram.nodeSpacing];
}

export function networkNodeActive(diagram: NetworkDiagram, layer: number, node: number): boolean {
  const count = diagram.layers[layer];
  return count !== undefined && node < count && !diagram.inactive.has(`${layer}:${node}`);
}

/** Every complete route that only visits active nodes, in layer order. */
export function networkPaths(diagram: NetworkDiagram): Vec2[][] {
  const paths: Vec2[][] = [];
  const choice: number[] = [];
  const visit = (layer: number): void => {
    const count = diagram.layers[layer] ?? 0;
    for (let node = 0; node < count; node += 1) {
      if (!networkNodeActive(diagram, layer, node)) continue;
      choice.push(node);
      if (layer + 1 === diagram.layers.length) {
        const points = choice.map((index, layerIndex) => networkNode(diagram, layerIndex, index));
        if (points.every((point): point is Vec2 => point !== undefined)) paths.push(points);
      } else {
        visit(layer + 1);
      }
      choice.pop();
    }
  };
  visit(0);
  return paths;
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

/** The static network: dim inactive nodes, and a label above each layer. */
export function NeuralNetwork(diagram: NetworkDiagram): Tattva {
  return new NetworkTattva(diagram);
}

class NetworkTattva extends Tattva {
  private readonly frame: Frame;

  constructor(private readonly diagram: NetworkDiagram) {
    super();
    this.frame = networkFrame(diagram);
    this.worldSize = { width: this.frame.width, height: this.frame.height };
  }

  override contentHTML(): string {
    return networkMarkup(this.diagram, this.frame);
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

interface Frame {
  width: number;
  height: number;
}

function networkFrame(diagram: NetworkDiagram): Frame {
  let top = 0;
  diagram.layers.forEach((count, layer) => {
    const origin = networkNode(diagram, layer, 0);
    if (origin) top = Math.max(top, origin[1] + diagram.nodeSpacing * 0.7 + 0.22);
  });
  const side = (diagram.layers.length - 1) * diagram.layerSpacing / 2 + diagram.nodeRadius;
  const half = Math.max(side, top, diagram.nodeRadius) + 0.2;
  return { width: half * 2, height: half * 2 };
}

function frameAround(points: readonly Vec2[], pad: number): Frame {
  const reach = points.reduce((max, point) => Math.max(max, Math.abs(point[0]), Math.abs(point[1])), 0);
  const half = reach + pad + 0.05;
  return { width: Math.max(0.2, half * 2), height: Math.max(0.2, half * 2) };
}

function networkMarkup(diagram: NetworkDiagram, frame: Frame): string {
  const parts: string[] = [svgOpen(frame)];
  for (let layer = 0; layer < diagram.layers.length - 1; layer += 1) {
    const fromCount = diagram.layers[layer] ?? 0;
    const toCount = diagram.layers[layer + 1] ?? 0;
    for (let from = 0; from < fromCount; from += 1) {
      for (let to = 0; to < toCount; to += 1) {
        const start = networkNode(diagram, layer, from);
        const end = networkNode(diagram, layer + 1, to);
        if (!start || !end) continue;
        const active = networkNodeActive(diagram, layer, from) && networkNodeActive(diagram, layer + 1, to);
        parts.push(svgLine(frame, start, end, active ? unitColor(0.48, 0.56, 0.68) : unitColor(0.28, 0.32, 0.38, 0.45), 0.015));
      }
    }
  }
  diagram.layers.forEach((count, layer) => {
    for (let node = 0; node < count; node += 1) {
      const point = networkNode(diagram, layer, node);
      if (!point) continue;
      const active = networkNodeActive(diagram, layer, node);
      parts.push(svgDot(frame, point, diagram.nodeRadius, active ? unitColor(0.36, 0.77, 0.98) : unitColor(0.26, 0.3, 0.36, 0.95)));
    }
    const label = diagram.labels[layer];
    const top = networkNode(diagram, layer, 0);
    if (label && top) {
      parts.push(svgText(frame, [top[0], top[1] + diagram.nodeSpacing * 0.7], label, 0.22, unitColor(0.9, 0.9, 0.9), "middle"));
    }
  });
  parts.push("</svg>");
  return parts.join("");
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
  parts.push(svgText(frame, [-model.width / 2 + model.padding + 1.25, top - 0.13], model.title, 0.22, ink, "middle"));
  parts.push(svgText(
    frame,
    [model.width / 2 - model.padding - 0.85, top - 0.13],
    `${contextUsedTokens(model)} / ${model.budget} TOKENS`,
    0.17,
    unitColor(0.7, 0.75, 0.8),
    "middle",
  ));
  const labelX = -model.width / 2 + model.padding + 1.05;
  const trackX = -model.width / 2 + model.padding + 2.25;
  const trackWidth = model.width - model.padding * 2 - 2.45;
  let rowY = top - 0.55 - model.rowHeight / 2;
  for (const block of model.blocks) {
    const retained = block.retained ?? block.tokens;
    const role = ROLE_COLOR[block.role];
    parts.push(svgRect(frame, [0, rowY], model.width - model.padding * 2, model.rowHeight, unitColor(0.09, 0.11, 0.14)));
    parts.push(svgRect(frame, [-model.width / 2 + model.padding + 0.035, rowY], 0.07, model.rowHeight, role));
    parts.push(svgText(frame, [labelX, rowY + 0.14], ROLE_NAME[block.role], 0.12, role, "start"));
    parts.push(svgText(frame, [labelX, rowY - 0.1], block.label, 0.16, ink, "start"));
    parts.push(svgRect(frame, [trackX + trackWidth / 2, rowY], trackWidth, 0.28, track));
    const scale = trackWidth / model.budget;
    const original = Math.min(trackWidth, block.tokens * scale);
    const kept = Math.min(original, retained * scale);
    const omitted = Math.max(0, original - kept);
    const keptX = block.cut === "start" ? trackX + omitted + kept / 2 : trackX + kept / 2;
    const omittedX = block.cut === "start" ? trackX + omitted / 2 : trackX + kept + omitted / 2;
    if (kept > 0) parts.push(svgRect(frame, [keptX, rowY], kept, 0.28, role));
    if (omitted > 0) parts.push(svgRect(frame, [omittedX, rowY], omitted, 0.28, trimmed));
    const preview = (block.preview ?? "").slice(0, 34);
    const note = preview ? `${preview}  |  ${retained} tokens` : `${retained} tokens`;
    parts.push(svgText(frame, [trackX + trackWidth / 2, rowY], note, 0.12, unitColor(0.89, 0.92, 0.95), "middle"));
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

function svgLine(frame: Frame, start: Vec2, end: Vec2, color: string, thickness: number): string {
  const [x1, y1] = svgPoint(frame, start);
  const [x2, y2] = svgPoint(frame, end);
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${thickness}" stroke-linecap="round" />`;
}

function svgDot(frame: Frame, point: Vec2, radius: number, color: string): string {
  const [x, y] = svgPoint(frame, point);
  return `<circle cx="${x}" cy="${y}" r="${radius}" fill="${color}" />`;
}

function svgRect(frame: Frame, center: Vec2, width: number, height: number, color: string): string {
  const [x, y] = svgPoint(frame, center);
  return `<rect x="${x - width / 2}" y="${y - height / 2}" width="${width}" height="${height}" fill="${color}" />`;
}

function svgText(
  frame: Frame,
  point: Vec2,
  text: string,
  height: number,
  color: string,
  anchor: "start" | "middle",
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
