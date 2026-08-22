import type { Topic } from "../../../repositories/world-repository.ts";
import { TOPIC_COLOR_VAR } from "../../../utils/index.ts";
const resolved = new Map<string, string>();

function resolveToken(token: string): string {
  const name = token
    .replace(/^var\(/, "")
    .replace(/\)$/, "")
    .trim();
  const cached = resolved.get(name);
  if (cached) return cached;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (value) resolved.set(name, value);
  return value;
}

export function topicHex(topic: Topic): string {
  return resolveToken(TOPIC_COLOR_VAR[topic]);
}

export function primaryHex(): string {
  return resolveToken("--primary");
}

export function orbRimHex(): string {
  return resolveToken("--card-foreground");
}

export function orbShadowHex(): string {
  return resolveToken("--card-deep");
}

export function emptyFillHex(): string {
  return resolveToken("--map-empty-fill");
}

export function mapWaterHex(): string {
  return resolveToken("--map-water");
}

export function mapLandHex(): string {
  return resolveToken("--map-land");
}

export function regionOutlineColor(): string {
  return resolveToken("--map-region-outline");
}

const SENTIMENT_TOKENS = {
  negative: "--sentiment-negative",
  neutral: "--sentiment-neutral",
  positive: "--sentiment-positive",
} as const;

type Rgb = [number, number, number];

function hexToRgb(hex: string): Rgb {
  const clean = hex.replace("#", "");
  return [
    Number.parseInt(clean.slice(0, 2), 16),
    Number.parseInt(clean.slice(2, 4), 16),
    Number.parseInt(clean.slice(4, 6), 16),
  ];
}

function mix(from: Rgb, to: Rgb, amount: number): string {
  const channel = (index: number) => Math.round(from[index] + (to[index] - from[index]) * amount);
  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
}

export function sentimentHex(value: number): string {
  const clamped = Math.max(-1, Math.min(1, value));
  const neutral = hexToRgb(resolveToken(SENTIMENT_TOKENS.neutral));
  if (clamped < 0) return mix(neutral, hexToRgb(resolveToken(SENTIMENT_TOKENS.negative)), -clamped);
  return mix(neutral, hexToRgb(resolveToken(SENTIMENT_TOKENS.positive)), clamped);
}
