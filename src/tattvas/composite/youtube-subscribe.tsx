import type { CSSProperties, ReactNode } from "react";
import { ReactTattva } from "../../core/ReactTattva.ts";
import type { TattvaState } from "../../core/Tattva.ts";
import { Timeline } from "../../core/Timeline.ts";
import { resolveColorInput, themeColor, type ColorInput, type Theme } from "../../core/theme.ts";

export type YouTubeSubscribeLayout = "wide" | "compact";

export interface YouTubeSubscribeOptions {
  handle?: string;
  message?: string;
  layout?: YouTubeSubscribeLayout;
  accent?: ColorInput;
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
  showBell: boolean;
  customSize: boolean;
}

const DEFAULT_SIZE: Record<YouTubeSubscribeLayout, readonly [number, number]> = {
  wide: [7.2, 1.35],
  compact: [3.8, 2.65],
};

/** A responsive YouTube subscribe CTA for landscape videos and portrait Shorts. */
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
      accent: options.accent ?? themeColor("negative"),
      showBell: options.showBell ?? true,
      customSize: options.size !== undefined,
    };
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
    return this;
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
  const subscribed = state.subscribeProgress >= 0.55;
  const subscribePulse = 1 + Math.sin(Math.min(1, state.subscribeProgress) * Math.PI) * 0.09;
  const bellProgress = Math.min(1, Math.max(0, state.bellProgress));
  const bellRotation = Math.sin(bellProgress * Math.PI * 4) * (1 - bellProgress) * 24;
  const initials = config.channel
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  const accent = resolveColorInput(config.accent, theme);
  const root: CSSProperties = {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: compact ? "column" : "row",
    alignItems: "center",
    justifyContent: compact ? "center" : "space-between",
    gap: compact ? "6%" : "3%",
    padding: compact ? "9% 8%" : "10% 3%",
    border: `1px solid color-mix(in srgb, ${theme.colors.stroke} 16%, transparent)`,
    borderRadius: compact ? "12%" : "999px",
    background: `linear-gradient(145deg, ${theme.colors.surfaceElevated}, ${theme.colors.surface})`,
    boxShadow: `0 12px 42px rgba(0,0,0,${theme.effects.shadowOpacity}), inset 0 1px color-mix(in srgb, ${theme.colors.stroke} 8%, transparent)`,
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.bodyFamily,
    fontSize: compact ? "clamp(14px, 2vw, 30px)" : "clamp(12px, 1.25vw, 24px)",
    overflow: "hidden",
  };
  const identity: CSSProperties = {
    display: "flex",
    alignItems: "center",
    flexDirection: compact ? "column" : "row",
    textAlign: compact ? "center" : "left",
    gap: compact ? ".45em" : ".75em",
    minWidth: 0,
    flex: compact ? "0 0 auto" : "1 1 auto",
  };
  const actions: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: ".55em",
    flex: "0 0 auto",
  };
  return (
    <section style={root} aria-label={`Subscribe to ${config.channel}`}>
      <div style={identity}>
        <div style={{
          width: compact ? "3em" : "3.2em",
          height: compact ? "3em" : "3.2em",
          flex: "0 0 auto",
          display: "grid",
          placeItems: "center",
          borderRadius: "50%",
          background: `linear-gradient(145deg, ${accent}, color-mix(in srgb, ${accent} 55%, ${theme.colors.surface}))`,
          boxShadow: `0 0 1.5em color-mix(in srgb, ${accent} 45%, transparent)`,
          fontWeight: 850,
          fontSize: "1.2em",
          letterSpacing: "-.04em",
        }}>{initials || "▶"}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: compact ? "center" : "flex-start",
            gap: ".35em",
            fontSize: compact ? "1.12em" : "1.2em",
            fontWeight: 780,
            lineHeight: 1.05,
            letterSpacing: "-.035em",
            whiteSpace: "nowrap",
          }}>
            <YouTubeMark color={accent} compact={compact} />
            {config.channel}
          </div>
          {(config.handle || config.message) && <div style={{
            marginTop: ".38em",
            color: theme.colors.textMuted,
            fontSize: ".65em",
            fontWeight: 520,
            whiteSpace: "nowrap",
          }}>
            {[config.handle, config.message].filter(Boolean).join("  ·  ")}
          </div>}
        </div>
      </div>
      <div style={actions}>
        <div style={{
          minWidth: compact ? "7.8em" : "7.35em",
          height: compact ? "2.4em" : "2.7em",
          padding: compact ? "0 1.15em" : "0 1.3em",
          display: "grid",
          placeItems: "center",
          borderRadius: "999px",
          background: subscribed ? theme.colors.surfaceElevated : accent,
          color: subscribed ? theme.colors.textPrimary : theme.colors.textOnAccent,
          boxShadow: subscribed
            ? "0 .25em .8em rgba(0,0,0,.22)"
            : `0 .25em 1em color-mix(in srgb, ${accent} 36%, transparent)`,
          fontSize: compact ? ".86em" : ".94em",
          fontWeight: 760,
          lineHeight: 1,
          transform: `scale(${subscribePulse})`,
        }}>
          {subscribed ? "Subscribed" : "Subscribe"}
        </div>
        {config.showBell && <div style={{
          width: compact ? "2.4em" : "2.7em",
          height: compact ? "2.4em" : "2.7em",
          display: "grid",
          placeItems: "center",
          borderRadius: "50%",
          color: bellProgress > 0.65 ? theme.colors.warning : theme.colors.textSecondary,
          background: `color-mix(in srgb, ${theme.colors.stroke} 9%, transparent)`,
          transform: `rotate(${bellRotation}deg)`,
          boxShadow: bellProgress > 0.1 ? `0 0 ${bellProgress}em color-mix(in srgb, ${theme.colors.warning} 30%, transparent)` : "none",
        }}>
          <BellIcon />
        </div>}
      </div>
    </section>
  );
}

function YouTubeMark({ color, compact }: { color: string; compact: boolean }): ReactNode {
  return (
    <svg width={compact ? "1.15em" : "1.2em"} height={compact ? ".78em" : ".8em"} viewBox="0 0 48 32" aria-hidden="true">
      <rect width="48" height="32" rx="8" fill={color} />
      <path d="M20 9.5 32 16 20 22.5Z" fill="white" />
    </svg>
  );
}

function BellIcon(): ReactNode {
  return (
    <svg width="58%" height="58%" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M10 21h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
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
