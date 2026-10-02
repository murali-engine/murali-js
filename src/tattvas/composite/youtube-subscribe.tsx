import type { CSSProperties, ReactNode } from "react";
import { ReactTattva } from "../../core/ReactTattva.ts";
import type { TattvaState } from "../../core/Tattva.ts";
import { Timeline } from "../../core/Timeline.ts";
import { resolveImageSource, type ImageFileAsset } from "../../core/image.ts";
import { resolveColorInput, type ColorInput, type Theme } from "../../core/theme.ts";

export type YouTubeSubscribeLayout = "wide" | "compact";

export interface YouTubeSubscribeOptions {
  handle?: string;
  message?: string;
  layout?: YouTubeSubscribeLayout;
  accent?: ColorInput;
  /** Channel photo. A string is used as the image URL. `imageFile()` is embedded at render time. */
  avatar?: string | ImageFileAsset;
  showBell?: boolean;
  size?: readonly [number, number];
}

export interface YouTubeSubscribeState extends TattvaState {
  subscribeProgress: number;
  bellProgress: number;
}

interface SubscribeConfig {
  channel: string;
  handle: string;
  message: string;
  layout: YouTubeSubscribeLayout;
  accent: ColorInput;
  avatar?: string | ImageFileAsset;
  showBell: boolean;
  customSize: boolean;
}

const YOUTUBE_RED = "#ff0000";

const DEFAULT_SIZE: Record<YouTubeSubscribeLayout, readonly [number, number]> = {
  wide: [7.4, 1.62],
  compact: [5.1, 3.6],
};

/** Share of the card height used as the root font size, so type matches the card at any resolution. */
const FONT_FRACTION: Record<YouTubeSubscribeLayout, number> = {
  wide: 0.17,
  compact: 0.08,
};

/** A subscribe end card for landscape videos and portrait Shorts. */
export class YouTubeSubscribeTattva extends ReactTattva<YouTubeSubscribeState> {
  private readonly subscribeConfig: SubscribeConfig;

  constructor(channel: string, options: YouTubeSubscribeOptions = {}) {
    const cleanChannel = requiredText(channel, "YouTube channel name");
    const layout = options.layout ?? "wide";
    const config: SubscribeConfig = {
      channel: cleanChannel,
      handle: options.handle?.trim() ?? "",
      message: options.message?.trim() ?? "Subscribe for more",
      layout,
      accent: options.accent ?? YOUTUBE_RED,
      showBell: options.showBell ?? true,
      customSize: options.size !== undefined,
    };
    if (options.avatar !== undefined) config.avatar = cleanAvatar(options.avatar);
    super((state, context) => renderSubscribe(config, state, context.theme), {
      state: { subscribeProgress: 0, bellProgress: 0 },
    });
    this.subscribeConfig = config;
    this.revealKind = "none";
    this.depthMode("overlay");
    if (options.size) this.size(options.size);
    else this.applySize(DEFAULT_SIZE[layout]);
  }

  layout(value: YouTubeSubscribeLayout): this {
    this.subscribeConfig.layout = value;
    if (!this.subscribeConfig.customSize) this.applySize(DEFAULT_SIZE[value]);
    else this.syncFont();
    return this;
  }

  wide(): this {
    return this.layout("wide");
  }

  compact(): this {
    return this.layout("compact");
  }

  size(value: readonly [number, number]): this {
    this.subscribeConfig.customSize = true;
    return this.applySize(value);
  }

  accent(value: ColorInput): this {
    if (typeof value === "string") requiredText(value, "YouTube subscribe accent");
    this.subscribeConfig.accent = value;
    return this;
  }

  avatar(value: string | ImageFileAsset): this {
    this.subscribeConfig.avatar = cleanAvatar(value);
    return this;
  }

  message(value: string): this {
    this.subscribeConfig.message = value.trim();
    return this;
  }

  handle(value: string): this {
    this.subscribeConfig.handle = value.trim();
    return this;
  }

  showBell(value = true): this {
    this.subscribeConfig.showBell = value;
    return this;
  }

  subscribed(progress = 1): this {
    return this.set({ subscribeProgress: unit(progress, "Subscribe progress") });
  }

  bell(progress = 1): this {
    return this.set({ bellProgress: unit(progress, "Bell progress") });
  }

  private applySize([width, height]: readonly [number, number]): this {
    this.worldSize = {
      width: positive(width, "YouTube subscribe width"),
      height: positive(height, "YouTube subscribe height"),
    };
    this.syncFont();
    return this;
  }

  private syncFont(): void {
    const height = this.worldSize?.height ?? DEFAULT_SIZE[this.subscribeConfig.layout][1];
    this.worldFontSize = height * FONT_FRACTION[this.subscribeConfig.layout];
  }
}

export function YouTubeSubscribe(
  channel: string,
  options: YouTubeSubscribeOptions = {},
): YouTubeSubscribeTattva {
  return new YouTubeSubscribeTattva(channel, options);
}

export interface YouTubeSubscribeSequenceOptions {
  subscribeAt?: number;
  bellAt?: number;
  entranceDuration?: number;
  actionDuration?: number;
}

/** Ready-made deterministic entrance, subscribe click, and bell-ring sequence. */
export function YouTubeSubscribeSequence(
  target: YouTubeSubscribeTattva,
  options: YouTubeSubscribeSequenceOptions = {},
): Timeline {
  const entranceDuration = nonnegative(options.entranceDuration ?? 0.5, "Subscribe entrance duration");
  const actionDuration = nonnegative(options.actionDuration ?? 0.42, "Subscribe action duration");
  const subscribeAt = nonnegative(options.subscribeAt ?? 0.75, "Subscribe action time");
  const bellAt = nonnegative(options.bellAt ?? 1.25, "Bell action time");
  const result = new Timeline();
  result.animate(target).duration(entranceDuration).ease("outCubic").appear();
  result.animate(target).at(subscribeAt).duration(actionDuration).ease("outCubic").to({ subscribeProgress: 1 });
  result.animate(target).at(bellAt).duration(actionDuration).ease("outCubic").to({ bellProgress: 1 });
  return result;
}

function renderSubscribe(
  config: SubscribeConfig,
  state: Readonly<YouTubeSubscribeState>,
  theme: Theme,
): ReactNode {
  const compact = config.layout === "compact";
  const subscribeProgress = clamp01(state.subscribeProgress);
  const bellProgress = clamp01(state.bellProgress);
  const leave = smoothstep(0, 0.38, subscribeProgress);
  const fill = smoothstep(0.08, 0.55, subscribeProgress);
  const arrive = smoothstep(0.42, 0.8, subscribeProgress);
  const press = Math.sin(subscribeProgress * Math.PI) * 0.045;
  const bellGate = config.showBell
    ? Math.max(smoothstep(0.72, 1, subscribeProgress), smoothstep(0, 0.4, bellProgress))
    : 0;
  const bellRotation = Math.sin(bellProgress * Math.PI * 4) * (1 - bellProgress) * 16;
  const initials = config.channel
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  const accent = resolveColorInput(config.accent, theme);
  const avatarUrl = config.avatar ? resolveImageSource(config.avatar) : undefined;
  const neutralFill = `color-mix(in srgb, ${theme.colors.stroke} 12%, transparent)`;
  const root: CSSProperties = {
    boxSizing: "border-box",
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: compact ? "column" : "row",
    alignItems: compact ? "stretch" : "center",
    justifyContent: "center",
    gap: compact ? "0.7em" : "0.8em",
    padding: compact ? "0.75em 0.8em" : "0.42em 0.7em",
    border: `0.055em solid color-mix(in srgb, ${theme.colors.stroke} 22%, transparent)`,
    borderRadius: compact ? "0.9em" : "0.72em",
    background: theme.colors.surface,
    boxShadow: `0 0.35em 1.05em rgb(0 0 0 / ${theme.effects.shadowOpacity})`,
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.bodyFamily,
    fontSize: `${FONT_FRACTION[config.layout] * 100}cqh`,
    lineHeight: 1.15,
    overflow: "hidden",
  };
  const identity: CSSProperties = {
    display: "flex",
    alignItems: "center",
    flexDirection: compact ? "column" : "row",
    textAlign: compact ? "center" : "left",
    gap: compact ? "0.45em" : "0.7em",
    minWidth: 0,
    width: compact ? "100%" : "auto",
    flex: compact ? "0 0 auto" : "1 1 auto",
  };
  return (
    <div style={{ width: "100%", height: "100%", containerType: "size" }}>
      <section style={root} aria-label={`Subscribe to ${config.channel}`}>
        <div style={identity}>
          <Avatar
            initials={initials || "▶"}
            imageUrl={avatarUrl}
            accent={accent}
            theme={theme}
            compact={compact}
          />
          <div style={{ minWidth: 0, width: compact ? "100%" : "auto", flex: compact ? "0 1 auto" : "1 1 auto" }}>
            <div style={titleStyle}>{config.channel}</div>
            {config.handle && <div style={handleStyle(theme)}>{config.handle}</div>}
            {config.message && <div style={messageStyle(theme)}>{config.message}</div>}
          </div>
        </div>
        <div style={{
          display: "flex",
          alignItems: "center",
          width: compact ? "100%" : "auto",
          flex: "0 0 auto",
        }}>
          <div style={{
            boxSizing: "border-box",
            minWidth: compact ? 0 : "8.6em",
            flex: compact ? "1 1 auto" : "0 0 auto",
            height: compact ? "2.55em" : "2.35em",
            padding: "0 1.05em",
            display: "grid",
            placeItems: "center",
            borderRadius: "999px",
            border: `0.07em solid color-mix(in srgb, ${theme.colors.textSecondary} ${fill * 100}%, transparent)`,
            background: `color-mix(in srgb, ${accent} ${(1 - fill) * 100}%, ${neutralFill} ${fill * 100}%)`,
            boxShadow: fill > 0.98
              ? "none"
              : `0 0.22em 0.7em color-mix(in srgb, ${accent} ${(1 - fill) * 38}%, transparent)`,
            fontSize: "0.92em",
            fontWeight: theme.typography.headingWeight,
            lineHeight: 1,
            transform: `scale(${1 - press})`,
          }}>
            <span style={{ gridArea: "1 / 1", opacity: 1 - leave, color: theme.colors.textOnAccent, whiteSpace: "nowrap" }}>
              Subscribe
            </span>
            <span style={{
              gridArea: "1 / 1",
              opacity: arrive,
              color: theme.colors.textPrimary,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35em",
              whiteSpace: "nowrap",
            }}>
              <CheckIcon progress={arrive} />
              Subscribed
            </span>
          </div>
          {config.showBell && <div style={{
            width: `${2.35 * bellGate}em`,
            marginLeft: `${0.45 * bellGate}em`,
            opacity: bellGate,
            overflow: "hidden",
            flex: "0 0 auto",
          }}>
            <div style={{
              width: "2.35em",
              height: "2.35em",
              display: "grid",
              placeItems: "center",
              borderRadius: "50%",
              color: theme.colors.textPrimary,
              background: `color-mix(in srgb, ${theme.colors.stroke} 10%, transparent)`,
            }}>
              <BellIcon rotation={bellRotation} filled={bellProgress} />
            </div>
          </div>}
        </div>
      </section>
    </div>
  );
}

function Avatar({
  initials,
  imageUrl,
  accent,
  theme,
  compact,
}: {
  initials: string;
  imageUrl: string | undefined;
  accent: string;
  theme: Theme;
  compact: boolean;
}): ReactNode {
  const size = compact ? "2.7em" : "2.35em";
  return (
    <div style={{ position: "relative", width: size, height: size, flex: "0 0 auto" }}>
      <div style={{
        width: "100%",
        height: "100%",
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
        borderRadius: "50%",
        border: `0.06em solid color-mix(in srgb, ${theme.colors.stroke} 30%, transparent)`,
        background: `color-mix(in srgb, ${theme.colors.stroke} 16%, ${theme.colors.surfaceElevated})`,
        color: theme.colors.textPrimary,
        fontWeight: theme.typography.headingWeight,
        fontSize: "0.68em",
        letterSpacing: "-0.04em",
      }}>
        {imageUrl
          ? <img src={imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : initials}
      </div>
      <div style={{
        position: "absolute",
        right: "8%",
        bottom: "18%",
        width: "32%",
        height: "23%",
      }}>
        <YouTubeMark color={accent} />
      </div>
    </div>
  );
}

const titleStyle: CSSProperties = {
  overflow: "hidden",
  fontSize: "1.02em",
  fontWeight: 700,
  letterSpacing: "-0.03em",
  lineHeight: 1.12,
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
};

function handleStyle(theme: Theme): CSSProperties {
  return {
    marginTop: "0.14em",
    overflow: "hidden",
    color: theme.colors.textMuted,
    fontSize: "0.72em",
    fontWeight: 500,
    lineHeight: 1.2,
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
  };
}

function messageStyle(theme: Theme): CSSProperties {
  return {
    marginTop: "0.18em",
    overflow: "hidden",
    color: theme.colors.textSecondary,
    fontSize: "0.74em",
    fontWeight: 500,
    lineHeight: 1.28,
    display: "-webkit-box",
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: 2,
  };
}

function YouTubeMark({ color }: { color: string }): ReactNode {
  return (
    <svg width="100%" height="100%" viewBox="0 0 24 17" aria-hidden="true">
      <path
        fill={color}
        d="M23.2 3.15A2.8 2.8 0 0 0 21.2 1.2C19.4.72 12 .72 12 .72S4.6.72 2.8 1.2A2.8 2.8 0 0 0 .8 3.15C.32 4.9.32 8.5.32 8.5s0 3.6.48 5.35a2.8 2.8 0 0 0 2 1.95c1.8.48 9.2.48 9.2.48s7.4 0 9.2-.48a2.8 2.8 0 0 0 2-1.95c.48-1.75.48-5.35.48-5.35s0-3.6-.48-5.35z"
      />
      <path fill="#ffffff" d="M9.7 12.05V4.95L15.85 8.5 9.7 12.05z" />
    </svg>
  );
}

function CheckIcon({ progress }: { progress: number }): ReactNode {
  const length = 14;
  return (
    <svg width="0.95em" height="0.95em" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M3.2 8.3 6.5 11.5 12.8 4.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={length}
        strokeDashoffset={length * (1 - progress)}
      />
    </svg>
  );
}

function BellIcon({ rotation, filled }: { rotation: number; filled: number }): ReactNode {
  const body = "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z";
  return (
    <svg
      width="58%"
      height="58%"
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ transformOrigin: "50% 16%", transform: `rotate(${rotation}deg)` }}
    >
      <path d={body} fill="currentColor" opacity={filled} />
      <path d={body} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" opacity={1 - filled} />
      <path d="M10 21h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function cleanAvatar(value: string | ImageFileAsset): string | ImageFileAsset {
  if (typeof value === "string") return requiredText(value, "YouTube subscribe avatar");
  if (value?.kind !== "file" || value.source.trim().length === 0) {
    throw new Error("YouTube subscribe avatar file must not be empty.");
  }
  return value;
}

function requiredText(value: string, label: string): string {
  const result = value.trim();
  if (!result) throw new Error(`${label} must not be empty.`);
  return result;
}

function positive(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive finite number; received ${value}.`);
  }
  return value;
}

function nonnegative(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a non-negative finite number; received ${value}.`);
  }
  return value;
}

function unit(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${label} must be between 0 and 1; received ${value}.`);
  }
  return value;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const span = edge1 - edge0;
  if (span <= 0) return value >= edge1 ? 1 : 0;
  const t = clamp01((value - edge0) / span);
  return t * t * (3 - 2 * t);
}
