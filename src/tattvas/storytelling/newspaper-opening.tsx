import type { CSSProperties, ReactNode } from "react";
import type { Scene } from "../../core/Scene.ts";
import { ReactTattva } from "../../core/ReactTattva.ts";
import type { TattvaState, Vec3 } from "../../core/Tattva.ts";
import type { Timeline } from "../../core/Timeline.ts";
import { resolveImageSource, type ImageFileAsset } from "../../core/image.ts";

export type NewspaperLayout = "lead" | "columns" | "tabloid";

export interface NewspaperImageOptions {
  fit?: "cover" | "contain";
  alt?: string;
}

/** Text and layout overrides for one sheet in the stack. */
export interface NewspaperPageContent {
  headline?: string;
  keyword?: string;
  publication?: string;
  date?: string;
  volume?: string;
  section?: string;
  deck?: string;
  body?: readonly string[];
  layout?: NewspaperLayout;
  /** A URL or `imageFile()` asset. When present, generated newspaper content is skipped. */
  image?: string | ImageFileAsset;
  imageFit?: "cover" | "contain";
  imageAlt?: string;
}

/** Fluent description of one generated or image-backed newspaper sheet. */
export class Newspaper {
  private readonly value: NewspaperPageContent;

  constructor(headline = "") {
    this.value = headline.trim().length > 0 ? { headline: headline.trim() } : {};
  }

  static fromImage(image: string | ImageFileAsset, options: NewspaperImageOptions = {}): Newspaper {
    return new Newspaper().image(image, options);
  }

  headline(value: string): this { this.value.headline = requiredText(value, "Newspaper headline"); return this; }
  keyword(value: string): this { this.value.keyword = value.trim(); return this; }
  publication(value: string): this { this.value.publication = value.trim(); return this; }
  date(value: string): this { this.value.date = value.trim(); return this; }
  volume(value: string): this { this.value.volume = value.trim(); return this; }
  section(value: string): this { this.value.section = value.trim(); return this; }
  deck(value: string): this { this.value.deck = value.trim(); return this; }
  body(...paragraphs: readonly string[]): this {
    this.value.body = cleanList(paragraphs, "Newspaper body");
    return this;
  }
  layout(value: NewspaperLayout): this { validateLayout(value); this.value.layout = value; return this; }
  image(value: string | ImageFileAsset, options: NewspaperImageOptions = {}): this {
    if (typeof value === "string") requiredText(value, "Newspaper image URL");
    this.value.image = value;
    this.value.imageFit = options.fit ?? "contain";
    this.value.imageAlt = options.alt?.trim() ?? "";
    return this;
  }

  build(): NewspaperPageContent {
    if (this.value.image === undefined && !this.value.headline) {
      throw new Error("A generated newspaper needs a headline; provide one or use image().");
    }
    return { ...this.value, body: this.value.body ? [...this.value.body] : undefined };
  }
}

export interface NewspaperOpeningOptions {
  title?: string;
  kicker?: string;
  publication?: string;
  date?: string;
  volume?: string;
  finalBody?: readonly string[];
  /** Exact total animation duration. Individual timing phases are scaled proportionally. */
  totalTime?: number;
  timing?: Partial<NewspaperOpeningTiming>;
  style?: Partial<NewspaperOpeningStyle>;
  layouts?: NewspaperLayout | readonly NewspaperLayout[];
}

export interface NewspaperOpeningContent {
  /** Final title assembled after the rapid headline montage. */
  title: string;
  /** Short words emphasized with ink blocks during the montage. */
  keywords?: readonly string[];
  /** Headlines printed on the animated newspaper sheets. */
  headlines?: readonly string[];
  /** Fully custom sheets. These override the matching headline/keyword pool entries. */
  newspapers?: readonly NewspaperPageContent[];
  kicker?: string;
  publication?: string;
  date?: string;
  volume?: string;
  finalBody?: readonly string[];
}

export interface NewspaperOpeningStyle {
  width: number;
  height: number;
  paperColor: string;
  inkColor: string;
  accentColor: string;
  backdropColor: string;
  serifFamily: string;
  sansFamily: string;
}

export interface NewspaperOpeningTiming {
  introDelay: number;
  /** Time taken by each new sheet to land on the stack. */
  flashDuration: number;
  /** Time between successive sheets. May be shorter than flashDuration for overlap. */
  flashStagger: number;
  /** Pause between the last sheet landing and the final title sheet. */
  finalDelay: number;
  finalRevealDuration: number;
  endHold: number;
}

export interface NewspaperOpeningState extends TattvaState {
  newspaperTime: number;
}

export interface NewspaperOpeningAnimationOptions {
  at?: number;
}

const DEFAULT_STYLE: NewspaperOpeningStyle = {
  width: 15.2,
  height: 8.15,
  paperColor: "#eee8d7",
  inkColor: "#171613",
  accentColor: "#bd271e",
  backdropColor: "#0c0b0a",
  serifFamily: "Georgia, 'Times New Roman', serif",
  sansFamily: "Inter, Arial, sans-serif",
};

const DEFAULT_TIMING: NewspaperOpeningTiming = {
  introDelay: 0.18,
  flashDuration: 0.82,
  flashStagger: 0.43,
  finalDelay: 0.18,
  finalRevealDuration: 1.05,
  endHold: 1.2,
};

interface ResolvedNewspaperPage {
  headline: string;
  keyword: string;
  publication: string;
  date: string;
  volume: string;
  section: string;
  deck: string;
  body: readonly string[];
  layout: NewspaperLayout;
  image?: string | ImageFileAsset;
  imageFit: "cover" | "contain";
  imageAlt: string;
}

interface ResolvedNewspaperContent {
  title: string;
  kicker: string;
  publication: string;
  date: string;
  volume: string;
  finalBody: readonly string[];
}

interface NewspaperConfig {
  content: ResolvedNewspaperContent;
  pages: readonly ResolvedNewspaperPage[];
  style: NewspaperOpeningStyle;
  timing: NewspaperOpeningTiming;
}

/** A configurable rapid-fire newspaper stack that resolves into a final title card. */
export function NewspaperOpening(newspapers: readonly Newspaper[], options?: NewspaperOpeningOptions): NewspaperOpeningBuilder;
/** Compatibility form using headline and keyword pools. */
export function NewspaperOpening(content: NewspaperOpeningContent): NewspaperOpeningBuilder;
export function NewspaperOpening(
  input: NewspaperOpeningContent | readonly Newspaper[],
  options: NewspaperOpeningOptions = {},
): NewspaperOpeningBuilder {
  if (!Array.isArray(input)) return new NewspaperOpeningBuilder(input as NewspaperOpeningContent);
  if (input.length === 0) throw new Error("Newspaper opening newspapers cannot be empty.");
  const pages = input.map((newspaper, index) => {
    if (!(newspaper instanceof Newspaper)) throw new Error(`Newspaper opening item ${index + 1} must be a Newspaper.`);
    return newspaper.build();
  });
  const inferredTitle = pages[pages.length - 1]?.headline || "LATEST EDITION";
  const builder = new NewspaperOpeningBuilder({
    title: options.title ?? inferredTitle,
    kicker: options.kicker,
    publication: options.publication,
    date: options.date,
    volume: options.volume,
    finalBody: options.finalBody,
    newspapers: pages,
  });
  if (options.style) builder.style(options.style);
  if (options.timing) builder.timing(options.timing);
  if (options.layouts) builder.layouts(options.layouts);
  if (options.totalTime !== undefined) builder.totalTime(options.totalTime);
  return builder;
}

export class NewspaperOpeningBuilder {
  private readonly contentValue: NewspaperOpeningContent;
  private styleValue: NewspaperOpeningStyle = { ...DEFAULT_STYLE };
  private timingValue: NewspaperOpeningTiming = { ...DEFAULT_TIMING };
  private countValue?: number;
  private layoutsValue: readonly NewspaperLayout[] = ["lead", "columns", "tabloid"];
  private totalTimeValue?: number;

  constructor(content: NewspaperOpeningContent) {
    this.contentValue = { ...content, title: requiredText(content.title, "Newspaper opening title") };
  }

  style(value: Partial<NewspaperOpeningStyle>): this {
    this.styleValue = { ...this.styleValue, ...value };
    return this;
  }

  timing(value: Partial<NewspaperOpeningTiming>): this {
    this.timingValue = { ...this.timingValue, ...value };
    return this;
  }

  /** Scale all phases proportionally so the full opening lasts exactly this many seconds. */
  totalTime(value: number): this {
    this.totalTimeValue = positive(value, "Newspaper opening total time");
    return this;
  }

  /** Number of sheets to add before the final title sheet. Content pools repeat as needed. */
  newspaperCount(value: number): this {
    this.countValue = positiveInteger(value, "Newspaper opening newspaper count");
    return this;
  }

  /** Layouts to cycle through when a sheet does not specify its own layout. */
  layouts(value: NewspaperLayout | readonly NewspaperLayout[]): this {
    const values = typeof value === "string" ? [value] : [...value];
    if (values.length === 0) throw new Error("Newspaper opening layouts cannot be empty.");
    values.forEach(validateLayout);
    this.layoutsValue = values;
    return this;
  }

  duration(): number {
    this.validate();
    return newspaperOpeningDuration(this.pageCount(), this.resolvedTiming());
  }

  addTo(scene: Scene, origin: Vec3 = [0, 0, 0]): NewspaperOpeningComposition {
    this.validate();
    const pages = this.resolvePages();
    const timing = this.resolvedTiming();
    const config: NewspaperConfig = {
      content: resolveFinalContent(this.contentValue),
      pages,
      style: { ...this.styleValue },
      timing,
    };
    const visual = scene.add(new NewspaperOpeningTattva(config), { at: origin });
    return new NewspaperOpeningComposition(visual, config.timing, pages.length);
  }

  private pageCount(): number {
    if (this.countValue !== undefined) return this.countValue;
    return Math.max(
      this.contentValue.newspapers?.length ?? 0,
      this.contentValue.headlines?.length ?? 0,
      this.contentValue.keywords?.length ?? 0,
    );
  }

  private resolvePages(): readonly ResolvedNewspaperPage[] {
    const count = this.pageCount();
    if (count === 0) throw new Error("Newspaper opening needs headlines, keywords, or custom newspapers.");
    return Array.from({ length: count }, (_, index) => resolvePage(this.contentValue, this.layoutsValue, index));
  }

  private resolvedTiming(): NewspaperOpeningTiming {
    if (this.totalTimeValue === undefined) return { ...this.timingValue };
    const natural = newspaperOpeningDuration(this.pageCount(), this.timingValue);
    const scale = this.totalTimeValue / natural;
    return Object.fromEntries(
      Object.entries(this.timingValue).map(([name, value]) => [name, value * scale]),
    ) as unknown as NewspaperOpeningTiming;
  }

  private validate(): void {
    positive(this.styleValue.width, "Newspaper opening width");
    positive(this.styleValue.height, "Newspaper opening height");
    if (this.pageCount() === 0) throw new Error("Newspaper opening needs headlines, keywords, or custom newspapers.");
    for (const [name, value] of Object.entries(this.timingValue)) nonnegative(value, `Newspaper opening ${name}`);
    positive(this.timingValue.flashDuration, "Newspaper opening flashDuration");
    positive(this.timingValue.finalRevealDuration, "Newspaper opening finalRevealDuration");
    for (const [name, value] of Object.entries(this.styleValue)) {
      if (typeof value === "string" && value.trim().length === 0) throw new Error(`Newspaper opening ${name} cannot be empty.`);
    }
  }
}

export class NewspaperOpeningComposition {
  readonly duration: number;

  constructor(
    readonly visual: NewspaperOpeningTattva,
    timing: NewspaperOpeningTiming,
    flashCount: number,
  ) {
    this.duration = newspaperOpeningDuration(flashCount, timing);
  }

  all(): readonly [NewspaperOpeningTattva] {
    return [this.visual];
  }

  animate(timeline: Timeline, options: NewspaperOpeningAnimationOptions = {}): this {
    const at = nonnegative(options.at ?? 0, "Newspaper opening animation start");
    timeline.animate(this.visual).at(at).duration(this.duration).ease("linear").to({ newspaperTime: this.duration });
    return this;
  }
}

export class NewspaperOpeningTattva extends ReactTattva<NewspaperOpeningState> {
  constructor(readonly newspaperConfig: NewspaperConfig) {
    super((state) => renderNewspaperOpening(newspaperConfig, state.newspaperTime), {
      state: { newspaperTime: 0 },
    });
    this.worldSize = { width: newspaperConfig.style.width, height: newspaperConfig.style.height };
    this.worldFontSize = newspaperConfig.style.height * 0.04;
    this.depthMode("overlay");
  }
}

export function newspaperOpeningDuration(
  flashCount: number,
  timing: NewspaperOpeningTiming = DEFAULT_TIMING,
): number {
  if (!Number.isInteger(flashCount) || flashCount <= 0) throw new Error("Newspaper opening flash count must be a positive integer.");
  const montageEnd = timing.introDelay + (flashCount - 1) * timing.flashStagger + timing.flashDuration;
  return montageEnd + timing.finalDelay + timing.finalRevealDuration + timing.endHold;
}

function renderNewspaperOpening(config: NewspaperConfig, time: number): ReactNode {
  const { content, pages, style, timing } = config;
  const count = pages.length;
  const montageEnd = timing.introDelay + (count - 1) * timing.flashStagger + timing.flashDuration;
  const finalStart = montageEnd + timing.finalDelay;
  const reveal = smoothstep(finalStart, finalStart + timing.finalRevealDuration, time);
  const noiseShift = Math.round(time * 24) % 7;
  const root: CSSProperties = {
    position: "relative",
    width: "100%",
    height: "100%",
    overflow: "hidden",
    color: style.inkColor,
    background: `radial-gradient(circle at 50% 42%, #2c2923 0%, ${style.backdropColor} 68%)`,
    fontFamily: style.serifFamily,
    isolation: "isolate",
  };

  return (
    <main style={root} aria-label={`${content.title} newspaper opening`}>
      <div style={{
        position: "absolute", inset: 0, opacity: 0.12, pointerEvents: "none", zIndex: 20,
        backgroundImage: "repeating-radial-gradient(circle at 0 0, #fff 0 0.7px, transparent 0.9px 3px)",
        backgroundPosition: `${noiseShift}px ${-noiseShift}px`,
        mixBlendMode: "screen",
      }} />
      {pages.map((page, index) => {
        const start = timing.introDelay + index * timing.flashStagger;
        const local = (time - start) / timing.flashDuration;
        if (local <= 0) return null;
        return (
          <PaperFlash
            key={index}
            index={index}
            progress={clamp01(local)}
            page={page}
            style={style}
          />
        );
      })}
      <FinalPage content={content} style={style} reveal={reveal} zIndex={count + 10} />
      <div style={{
        position: "absolute", inset: 0, zIndex: 30, pointerEvents: "none",
        background: "radial-gradient(circle, transparent 48%, rgb(0 0 0 / 48%) 100%)",
      }} />
    </main>
  );
}

function PaperFlash({
  index, progress, page, style,
}: {
  index: number;
  progress: number;
  page: ResolvedNewspaperPage;
  style: NewspaperOpeningStyle;
}): ReactNode {
  const placements = [
    [-2.8, 1.4, -2.4, -13, 8], [2.5, -1.1, 1.8, 14, -9], [-1.4, -1.7, -1.1, -9, -12],
    [1.7, 1.5, 2.7, 11, 10], [-0.5, 0.7, -1.8, 4, -13], [-2.1, -0.5, 1.2, -14, 3],
  ] as const;
  const [settledX, settledY, rotation, entryX, entryY] = placements[index % placements.length];
  const enter = smoothstep(0, 0.7, progress);
  const scale = 1.18 - enter * 0.18;
  const translateX = settledX + entryX * (1 - enter);
  const translateY = settledY + entryY * (1 - enter);
  const paper: CSSProperties = {
    position: "absolute",
    left: "7%",
    top: "5%",
    width: "86%",
    height: "90%",
    boxSizing: "border-box",
    padding: page.image === undefined ? "2.3% 3.2%" : 0,
    overflow: "hidden",
    opacity: 1,
    transform: `translate(${translateX}%, ${translateY}%) rotate(${rotation + (1 - enter) * rotation * 1.8}deg) scale(${scale})`,
    transformOrigin: "center",
    backgroundColor: style.paperColor,
    backgroundImage: "linear-gradient(88deg, rgb(0 0 0 / 3%), transparent 28%, rgb(255 255 255 / 16%) 62%, rgb(0 0 0 / 4%))",
    boxShadow: "0 1.8em 5em rgb(0 0 0 / 55%)",
    zIndex: 2 + index,
  };
  return (
    <article style={paper}>
      {page.image === undefined ? <>
        <Masthead publication={page.publication} date={page.date} volume={page.volume} style={style} />
        <PageLayout page={page} index={index} style={style} />
      </> : <NewspaperImage page={page} style={style} />}
    </article>
  );
}

function NewspaperImage({ page, style }: { page: ResolvedNewspaperPage; style: NewspaperOpeningStyle }): ReactNode {
  const source = page.image === undefined ? undefined : resolveImageSource(page.image);
  if (!source) {
    return <div style={{ display: "grid", width: "100%", height: "100%", placeItems: "center", border: `0.15em solid ${style.inkColor}`, font: `700 0.9em ${style.sansFamily}` }}>NEWSPAPER IMAGE UNAVAILABLE</div>;
  }
  return <img src={source} alt={page.imageAlt} style={{ display: "block", width: "100%", height: "100%", objectFit: page.imageFit }} />;
}

function PageLayout({ page, index, style }: { page: ResolvedNewspaperPage; index: number; style: NewspaperOpeningStyle }): ReactNode {
  if (page.layout === "columns") return <ColumnsLayout page={page} index={index} style={style} />;
  if (page.layout === "tabloid") return <TabloidLayout page={page} index={index} style={style} />;
  return <LeadLayout page={page} index={index} style={style} />;
}

function LeadLayout({ page, index, style }: { page: ResolvedNewspaperPage; index: number; style: NewspaperOpeningStyle }): ReactNode {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "2.25fr 1fr", gap: "3%", height: "82%", paddingTop: "2.2%" }}>
      <section>
        <SectionLabel page={page} style={style} />
        <Headline page={page} fontSize="3.15em" />
        <p style={deckStyle(style)}>{page.deck}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.9em", borderTop: `0.12em solid ${style.inkColor}`, paddingTop: "0.75em" }}>
          {[0, 1, 2].map((column) => <BodyCopy key={column} text={page.body[column % page.body.length] ?? ""} />)}
        </div>
      </section>
      <aside style={{ borderLeft: `0.12em solid ${style.inkColor}`, paddingLeft: "1.2em", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <PhotoBlock color={style.inkColor} />
        <Keyword value={page.keyword} style={style} rotation={-2 + index % 3} />
        <BodyCopy text={page.body[(index + 1) % page.body.length] ?? ""} />
      </aside>
    </div>
  );
}

function ColumnsLayout({ page, index, style }: { page: ResolvedNewspaperPage; index: number; style: NewspaperOpeningStyle }): ReactNode {
  return (
    <div style={{ height: "82%", paddingTop: "1.7%" }}>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "1em", alignItems: "center" }}>
        <Keyword value={page.keyword} style={style} rotation={index % 2 ? 1 : -1} />
        <div><SectionLabel page={page} style={style} /><Headline page={page} fontSize="2.55em" /></div>
      </div>
      <p style={{ ...deckStyle(style), borderBottom: `0.1em solid ${style.inkColor}`, paddingBottom: "0.65em" }}>{page.deck}</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.35fr 1fr", gap: "1.2em", marginTop: "0.9em" }}>
        <BodyColumn page={page} offset={0} />
        <div><PhotoBlock color={style.inkColor} /><BodyCopy text={page.body[1 % page.body.length] ?? ""} /></div>
        <BodyColumn page={page} offset={2} />
      </div>
    </div>
  );
}

function TabloidLayout({ page, index, style }: { page: ResolvedNewspaperPage; index: number; style: NewspaperOpeningStyle }): ReactNode {
  return (
    <div style={{ position: "relative", height: "82%", paddingTop: "2%", textAlign: "center" }}>
      <SectionLabel page={page} style={style} />
      <Headline page={page} fontSize="4.15em" />
      <p style={{ ...deckStyle(style), margin: "0.35em auto 0.7em", maxWidth: "80%" }}>{page.deck}</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr 1fr", gap: "1.2em", textAlign: "left" }}>
        <BodyColumn page={page} offset={0} />
        <PhotoBlock color={style.inkColor} />
        <BodyColumn page={page} offset={1} />
      </div>
      <div style={{ position: "absolute", right: "2%", bottom: "5%" }}>
        <Keyword value={page.keyword} style={style} rotation={index % 2 ? 3 : -3} />
      </div>
    </div>
  );
}

function SectionLabel({ page, style }: { page: ResolvedNewspaperPage; style: NewspaperOpeningStyle }): ReactNode {
  return <div style={{ color: style.accentColor, font: `800 0.75em ${style.sansFamily}`, letterSpacing: "0.16em", textTransform: "uppercase" }}>{page.section}</div>;
}

function Headline({ page, fontSize }: { page: ResolvedNewspaperPage; fontSize: string }): ReactNode {
  return <h2 style={{ margin: "0.08em 0 0.08em", fontSize, lineHeight: 0.86, letterSpacing: "-0.055em", textTransform: "uppercase" }}>{page.headline}</h2>;
}

function Keyword({ value, style, rotation }: { value: string; style: NewspaperOpeningStyle; rotation: number }): ReactNode {
  return <div style={{ display: "inline-block", font: `900 2.05em/0.88 ${style.sansFamily}`, textTransform: "uppercase", color: style.paperColor, background: style.accentColor, padding: "0.22em", transform: `rotate(${rotation}deg)` }}>{value}</div>;
}

function BodyColumn({ page, offset }: { page: ResolvedNewspaperPage; offset: number }): ReactNode {
  return <div>{[0, 1].map((index) => <BodyCopy key={index} text={page.body[(offset + index) % page.body.length] ?? ""} />)}</div>;
}

function BodyCopy({ text }: { text: string }): ReactNode {
  return <p style={{ margin: "0 0 0.62em", fontSize: "0.58em", lineHeight: 1.34, textAlign: "justify" }}>{text}</p>;
}

function PhotoBlock({ color }: { color: string }): ReactNode {
  return <div style={{ minHeight: "5.4em", marginBottom: "0.75em", background: `repeating-linear-gradient(135deg, ${color} 0 0.14em, transparent 0.14em 0.34em)`, opacity: 0.74 }} />;
}

function deckStyle(style: NewspaperOpeningStyle): CSSProperties {
  return { margin: "0.18em 0 0.55em", font: `700 0.72em/1.25 ${style.sansFamily}` };
}

function FinalPage({
  content, style, reveal, zIndex,
}: {
  content: ResolvedNewspaperContent;
  style: NewspaperOpeningStyle;
  reveal: number;
  zIndex: number;
}): ReactNode {
  const pageReveal = smoothstep(0, 0.64, reveal);
  const titleReveal = smoothstep(0.34, 0.92, reveal);
  return (
    <article style={{
      position: "absolute", inset: "5% 7%", boxSizing: "border-box", padding: "2.3% 3.2%",
      overflow: "hidden", opacity: pageReveal,
      transform: `translate(0.7%, -0.4%) rotate(${0.6 + (1 - pageReveal) * -3}deg) scale(${0.82 + pageReveal * 0.18})`,
      background: style.paperColor, boxShadow: "0 2em 7em rgb(0 0 0 / 65%)", zIndex,
    }}>
      <Masthead publication={content.publication} date={content.date} volume={content.volume} style={style} />
      <div style={{ marginTop: "2.2%", borderTop: `0.22em solid ${style.inkColor}`, borderBottom: `0.08em solid ${style.inkColor}`, padding: "1.7% 0 2.3%", textAlign: "center" }}>
        <div style={{
          display: "inline-block", padding: "0.25em 0.7em", color: style.paperColor, background: style.accentColor,
          font: `800 0.8em ${style.sansFamily}`, letterSpacing: "0.22em", opacity: titleReveal,
          transform: `translateY(${(1 - titleReveal) * -80}%) rotate(-1deg)`,
        }}>{content.kicker}</div>
        <h1 style={{
          margin: "0.15em auto 0.04em", maxWidth: "92%", fontSize: "4.65em", lineHeight: 0.82,
          letterSpacing: "-0.065em", textTransform: "uppercase", opacity: titleReveal,
          clipPath: `inset(0 ${(1 - titleReveal) * 50}% 0 ${(1 - titleReveal) * 50}%)`,
          transform: `scale(${0.82 + titleReveal * 0.18})`,
        }}>{content.title}</h1>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.55fr 1fr", gap: "2%", marginTop: "1.7%", opacity: smoothstep(0.62, 1, reveal) }}>
        <BodyCopy text={content.finalBody[0] ?? ""} />
        <div style={{ height: "5.2em", background: `repeating-linear-gradient(0deg, ${style.inkColor} 0 0.08em, transparent 0.08em 0.2em)`, opacity: 0.58 }} />
        <BodyCopy text={content.finalBody[1 % content.finalBody.length] ?? ""} />
      </div>
    </article>
  );
}

function Masthead({ publication, date, volume, style }: { publication: string; date: string; volume: string; style: NewspaperOpeningStyle }): ReactNode {
  return (
    <header style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "end", borderBottom: `0.08em solid ${style.inkColor}`, paddingBottom: "0.45em" }}>
      <span style={{ font: `700 0.58em ${style.sansFamily}`, letterSpacing: "0.12em" }}>{volume}</span>
      <strong style={{ fontSize: "1.42em", letterSpacing: "-0.04em", textTransform: "uppercase" }}>{publication}</strong>
      <span style={{ justifySelf: "end", font: `700 0.58em ${style.sansFamily}`, letterSpacing: "0.12em" }}>{date}</span>
    </header>
  );
}

const DEFAULT_BODY = [
  "Across the city, readers are following a story whose effects are already being felt in homes, studios, and workplaces.",
  "Analysts say the pace of change is accelerating as new ideas move from early experiments into everyday life.",
  "The next chapter will be shaped by the choices people make now, and by the questions that remain unanswered.",
];

function resolveFinalContent(content: NewspaperOpeningContent): ResolvedNewspaperContent {
  return {
    title: requiredText(content.title, "Newspaper opening title"),
    kicker: optionalText(content.kicker, "SPECIAL REPORT"),
    publication: optionalText(content.publication, "THE DAILY EDITION"),
    date: optionalText(content.date, "LATEST EDITION"),
    volume: optionalText(content.volume, "VOL. 01 · NO. 01"),
    finalBody: cleanOptionalList(content.finalBody, DEFAULT_BODY, "Newspaper opening final body"),
  };
}

function resolvePage(
  content: NewspaperOpeningContent,
  layouts: readonly NewspaperLayout[],
  index: number,
): ResolvedNewspaperPage {
  const override = content.newspapers?.[index];
  const headlines = cleanOptionalList(content.headlines, [content.title], "Newspaper opening headlines");
  const keywords = cleanOptionalList(content.keywords, ["EXTRA"], "Newspaper opening keywords");
  const body = cleanOptionalList(override?.body, DEFAULT_BODY, `Newspaper ${index + 1} body`);
  const layout = override?.layout ?? layouts[index % layouts.length] ?? "lead";
  validateLayout(layout);
  return {
    headline: override?.headline === undefined
      ? headlines[index % headlines.length] ?? content.title
      : requiredText(override.headline, `Newspaper ${index + 1} headline`),
    keyword: optionalText(override?.keyword, keywords[index % keywords.length] ?? "EXTRA"),
    publication: optionalText(override?.publication, optionalText(content.publication, "THE DAILY EDITION")),
    date: optionalText(override?.date, optionalText(content.date, "LATEST EDITION")),
    volume: optionalText(override?.volume, optionalText(content.volume, `VOL. 01 · NO. ${String(index + 1).padStart(2, "0")}`)),
    section: optionalText(override?.section, "BREAKING NEWS"),
    deck: optionalText(override?.deck, "The developments, people, and ideas behind today's leading story."),
    body,
    layout,
    image: override?.image,
    imageFit: override?.imageFit ?? "contain",
    imageAlt: override?.imageAlt?.trim() ?? "",
  };
}

function cleanOptionalList(
  value: readonly string[] | undefined,
  fallback: readonly string[],
  name: string,
): readonly string[] {
  if (value === undefined) return [...fallback];
  return cleanList(value, name);
}

function cleanList(value: readonly string[], name: string): readonly string[] {
  if (!Array.isArray(value)) throw new Error(`${name} must be an array.`);
  const result = value.map((item) => requiredText(item, name));
  if (result.length === 0) throw new Error(`${name} cannot be empty.`);
  return result;
}

function optionalText(value: string | undefined, fallback: string): string {
  return value === undefined ? fallback : value.trim();
}

function validateLayout(value: NewspaperLayout): void {
  if (value !== "lead" && value !== "columns" && value !== "tabloid") {
    throw new Error(`Unknown newspaper layout ${JSON.stringify(value)}.`);
  }
}

function requiredText(value: string, name: string): string {
  if (typeof value !== "string" || value.trim().length === 0) throw new Error(`${name} cannot be empty.`);
  return value.trim();
}

function smoothstep(from: number, to: number, value: number): number {
  if (to <= from) return value >= to ? 1 : 0;
  const t = clamp01((value - from) / (to - from));
  return t * t * (3 - 2 * t);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function nonnegative(value: number, name: string): number {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${name} must be a finite nonnegative number; received ${value}.`);
  return value;
}

function positive(value: number, name: string): number {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be a positive number; received ${value}.`);
  return value;
}

function positiveInteger(value: number, name: string): number {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer; received ${value}.`);
  return value;
}
