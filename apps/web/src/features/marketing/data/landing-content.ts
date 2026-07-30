/**
 * Illustrative marketing content for the editorial landing (AT-044).
 * Static by design — NOT wired to live APIs (the landing is public/anon). Numbers are
 * representative, not real KPIs; wiring to real endpoints is a deferred follow-up.
 */

export type Tone = "coverage" | "conviction" | "foreground";

export interface TickerItem {
  label: string;
  coverage: number;
  conviction: number;
}

export interface EditionEntry {
  no: string;
  title: string;
  blurb: string;
  tone: Tone;
}

export interface AttentionShare {
  topic: string;
  value: number;
}

export interface OpenPosition {
  label: string;
  odds: number;
  /** signed daily move; sign picks the delta color */
  delta: number;
}

export interface GapRow {
  label: string;
  coverage: number;
  conviction: number;
  gap: number;
  region: string;
}

export interface SnapshotNote {
  tone: "coverage" | "conviction" | "gap";
  text: string;
}

export interface SnapshotContent {
  scope: string;
  timestamp: string;
  headline: string;
  coverage: number;
  conviction: number;
  gap: number;
  notes: SnapshotNote[];
  sources: string[];
}

export interface LandingStats {
  signalsToday: number;
  sourcesCount: number;
  regionsCount: number;
}

export const MASTHEAD = {
  edition: "No. 412 — Global edition",
  dateLine: "28 July 2026 · 14:02Z",
  premise: "The world is read twice — once in the press, once in the odds.",
  tagline: "Coverage × Conviction",
} as const;

export const STATS: LandingStats = {
  signalsToday: 4128,
  sourcesCount: 1240,
  regionsCount: 194,
};

export const TICKER_ITEMS: TickerItem[] = [
  { label: "sudan corridor", coverage: 88, conviction: 21 },
  { label: "eu chip vote", coverage: 31, conviction: 79 },
  { label: "fed september", coverage: 57, conviction: 38 },
  { label: "taiwan patrols", coverage: 62, conviction: 58 },
  { label: "ebola funding", coverage: 18, conviction: 66 },
];

export const IN_THIS_EDITION: EditionEntry[] = [
  { no: "01", title: "Coverage", blurb: "Attention, normalised into a number.", tone: "coverage" },
  { no: "02", title: "Conviction", blurb: "Opinion with a receipt attached.", tone: "conviction" },
  { no: "03", title: "The gap", blurb: "The disagreement, ranked and dated.", tone: "foreground" },
];

export const ATTENTION_SHARES: AttentionShare[] = [
  { topic: "Conflict", value: 78 },
  { topic: "Technology", value: 64 },
  { topic: "Economy", value: 51 },
  { topic: "Politics", value: 44 },
  { topic: "Climate", value: 22 },
];

export const OPEN_POSITIONS: OpenPosition[] = [
  { label: "Corridor open by 30 Sep", odds: 21, delta: -9 },
  { label: "Fed cuts before September", odds: 38, delta: -7 },
  { label: "EU chip subsidy passes", odds: 79, delta: 11 },
  { label: "Ceasefire holds through Q4", odds: 44, delta: 4 },
];

export const GAP_ROWS: GapRow[] = [
  { label: "Sudan corridor talks", coverage: 88, conviction: 21, gap: -67, region: "east africa" },
  { label: "EU chip subsidy vote", coverage: 31, conviction: 79, gap: 48, region: "europe" },
  {
    label: "Ebola response funding",
    coverage: 18,
    conviction: 66,
    gap: 48,
    region: "central africa",
  },
  { label: "Taiwan strait patrols", coverage: 62, conviction: 58, gap: -4, region: "east asia" },
];

export const SNAPSHOT: SnapshotContent = {
  scope: "Snapshot · conflict · east africa",
  timestamp: "28 jul 2026 · 14:02Z",
  headline: "Corridor talks dominate the coverage while the market quietly prices failure.",
  coverage: 88,
  conviction: 21,
  gap: -67,
  notes: [
    {
      tone: "coverage",
      text: "Three of five wire services led with the talks in the last twelve hours.",
    },
    {
      tone: "conviction",
      text: `"Corridor open by 30 Sep" trades at 21¢, down nine since Tuesday.`,
    },
    { tone: "gap", text: "Widest coverage-to-conviction gap in the region this month." },
  ],
  sources: ["reuters", "apnews", "polymarket", "+14 sources"],
};
