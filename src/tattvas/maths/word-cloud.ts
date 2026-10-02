import { GroupTattva } from "../layout/Group.ts";
import { resolveColor } from "../../core/palette.ts";
import type { Vec2 } from "../../core/Tattva.ts";
import { Label, type LabelTattva } from "../primitives/shapes.ts";

export interface WordCloudWord {
  text: string;
  weight: number;
  color?: string;
}

export type WordCloudShape = "ellipse" | "rectangle";

interface PlacedBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

interface WordLayout {
  label: LabelTattva;
  index: number;
  height: number;
  rotation: number;
  color: string;
}

/** A deterministic weighted word cloud. Words remain ordinary Label Tattvas for animation and styling. */
export function WordCloud(words: readonly WordCloudWord[]): WordCloudTattva {
  return new WordCloudTattva(words);
}

export class WordCloudTattva extends GroupTattva {
  readonly words: readonly LabelTattva[];
  private cloudWidth = 12;
  private cloudHeight = 6;
  private minimumHeight = 0.24;
  private maximumHeight = 1.1;
  private cloudPalette = ["#58c4dd", "#5cd0b3", "#f0ac5f", "#d147a3", "#9a72ac"];
  private allowedRotations: readonly number[] = [0, 0, 0, 0, -90, 90];
  private cloudShape: WordCloudShape = "ellipse";
  private cloudSeed = 1;
  private wordPadding = 0.08;
  private family = "Inter, ui-sans-serif, system-ui, sans-serif";
  private weightValue: string | number = 700;

  constructor(private readonly entries: readonly WordCloudWord[]) {
    validateWords(entries);
    const labels = entries.map((entry) => Label(entry.text));
    super(labels);
    this.words = labels;
    this.relayout();
  }

  size([width, height]: Vec2): this {
    this.cloudWidth = positive(width, "Word cloud width");
    this.cloudHeight = positive(height, "Word cloud height");
    return this.relayout();
  }

  fontRange([minimum, maximum]: Vec2): this {
    this.minimumHeight = positive(minimum, "Word cloud minimum font height");
    this.maximumHeight = positive(maximum, "Word cloud maximum font height");
    if (maximum < minimum) throw new Error("Word cloud fontRange maximum must be at least its minimum.");
    return this.relayout();
  }

  palette(colors: readonly string[]): this {
    if (colors.length === 0) throw new Error("Word cloud palette cannot be empty.");
    this.cloudPalette = colors.map(resolveColor);
    return this.relayout();
  }

  rotations(degrees: readonly number[]): this {
    if (degrees.length === 0) throw new Error("Word cloud rotations cannot be empty.");
    degrees.forEach((value) => finite(value, "Word cloud rotation"));
    this.allowedRotations = [...degrees];
    return this.relayout();
  }

  shape(value: WordCloudShape): this {
    this.cloudShape = value;
    return this.relayout();
  }

  seed(value: number): this {
    this.cloudSeed = finite(value, "Word cloud seed");
    return this.relayout();
  }

  padding(value: number): this {
    this.wordPadding = nonnegative(value, "Word cloud padding");
    return this.relayout();
  }

  fontFamily(value: string): this {
    if (value.trim().length === 0) throw new Error("Word cloud fontFamily cannot be empty.");
    this.family = value;
    return this.relayout();
  }

  fontWeight(value: string | number): this {
    this.weightValue = value;
    return this.relayout();
  }

  private relayout(): this {
    const minWeight = Math.min(...this.entries.map((entry) => entry.weight));
    const maxWeight = Math.max(...this.entries.map((entry) => entry.weight));
    const span = maxWeight - minWeight;
    const specifications = this.entries.map((entry, index): WordLayout => {
      const normalized = span <= Number.EPSILON ? 0.5 : (entry.weight - minWeight) / span;
      const emphasis = Math.sqrt(normalized);
      const random = seededRandom(hashSeed(this.cloudSeed, entry.text, index));
      return {
        label: this.words[index]!,
        index,
        height: this.minimumHeight + (this.maximumHeight - this.minimumHeight) * emphasis,
        rotation: this.allowedRotations[Math.floor(random() * this.allowedRotations.length)] ?? 0,
        color: resolveColor(entry.color ?? this.cloudPalette[Math.floor(random() * this.cloudPalette.length)] ?? "#ffffff"),
      };
    }).sort((left, right) => this.entries[right.index]!.weight - this.entries[left.index]!.weight || left.index - right.index);

    for (let scale = 1; scale >= 0.35 - 1e-9; scale -= 0.05) {
      const occupied: PlacedBounds[] = [];
      let complete = true;
      for (const specification of specifications) {
        const height = specification.height * scale;
        specification.label
          .height(height)
          .color(specification.color)
          .rotate(specification.rotation)
          .css({ fontFamily: this.family, fontWeight: this.weightValue });
        const size = specification.label.getLayoutSize();
        const placement = this.findPlacement(specification, size, occupied);
        if (!placement) {
          complete = false;
          break;
        }
        specification.label.at([placement.x, placement.y, 0]);
        occupied.push(boundsAt(placement.x, placement.y, size, this.wordPadding));
      }
      if (complete) {
        this.recomputeBounds();
        return this;
      }
    }
    throw new Error(`Word cloud could not place ${this.entries.length} words inside ${this.cloudWidth}x${this.cloudHeight}.`);
  }

  private findPlacement(
    specification: WordLayout,
    size: { width: number; height: number },
    occupied: readonly PlacedBounds[],
  ): { x: number; y: number } | undefined {
    const random = seededRandom(hashSeed(this.cloudSeed + 1777, this.entries[specification.index]!.text, specification.index));
    const phase = random() * Math.PI * 2;
    const direction = random() < 0.5 ? -1 : 1;
    for (let attempt = 0; attempt < 4200; attempt += 1) {
      const angle = phase + direction * attempt * 0.52;
      const radius = 0.025 * Math.sqrt(attempt) * Math.min(this.cloudWidth, this.cloudHeight);
      const x = Math.cos(angle) * radius * (this.cloudWidth / this.cloudHeight);
      const y = Math.sin(angle) * radius;
      const bounds = boundsAt(x, y, size, this.wordPadding);
      if (!this.insideCloud(bounds)) continue;
      if (occupied.some((other) => intersects(bounds, other))) continue;
      return { x, y };
    }
    return undefined;
  }

  private insideCloud(bounds: PlacedBounds): boolean {
    if (bounds.minX < -this.cloudWidth / 2 || bounds.maxX > this.cloudWidth / 2) return false;
    if (bounds.minY < -this.cloudHeight / 2 || bounds.maxY > this.cloudHeight / 2) return false;
    if (this.cloudShape === "rectangle") return true;
    const halfWidth = this.cloudWidth / 2;
    const halfHeight = this.cloudHeight / 2;
    return [
      [bounds.minX, bounds.minY],
      [bounds.minX, bounds.maxY],
      [bounds.maxX, bounds.minY],
      [bounds.maxX, bounds.maxY],
    ].every(([x, y]) => (x! / halfWidth) ** 2 + (y! / halfHeight) ** 2 <= 1);
  }
}

function validateWords(words: readonly WordCloudWord[]): void {
  if (words.length === 0) throw new Error("Word cloud needs at least one word.");
  words.forEach((word, index) => {
    if (word.text.trim().length === 0) throw new Error(`Word cloud entry ${index} has no text.`);
    positive(word.weight, `Word cloud weight for ${JSON.stringify(word.text)}`);
  });
}

function boundsAt(x: number, y: number, size: { width: number; height: number }, padding: number): PlacedBounds {
  return {
    minX: x - size.width / 2 - padding,
    maxX: x + size.width / 2 + padding,
    minY: y - size.height / 2 - padding,
    maxY: y + size.height / 2 + padding,
  };
}

function intersects(left: PlacedBounds, right: PlacedBounds): boolean {
  return left.minX < right.maxX && left.maxX > right.minX && left.minY < right.maxY && left.maxY > right.minY;
}

function hashSeed(seed: number, text: string, index: number): number {
  let hash = (Math.trunc(seed) ^ (index * 2654435761)) >>> 0;
  for (const character of text) hash = Math.imul(hash ^ character.codePointAt(0)!, 16777619) >>> 0;
  return hash;
}

function seededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function finite(value: number, name: string): number {
  if (!Number.isFinite(value)) throw new Error(`${name} must be finite; received ${value}.`);
  return value;
}

function positive(value: number, name: string): number {
  finite(value, name);
  if (value <= 0) throw new Error(`${name} must be positive; received ${value}.`);
  return value;
}

function nonnegative(value: number, name: string): number {
  finite(value, name);
  if (value < 0) throw new Error(`${name} cannot be negative; received ${value}.`);
  return value;
}
