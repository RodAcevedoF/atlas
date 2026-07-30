export type SlideKind = "premise" | "gap" | "artifact" | "scan";

export interface Slide {
  kind: SlideKind;
  label: string;
  kicker: string;
  titleLead: string;
  titleAccent: string;
  body: string;
  glow: string;
}

export const SLIDES: Slide[] = [
  {
    kind: "premise",
    label: "The premise",
    kicker: "Coverage × Conviction",
    titleLead: "The world is read twice. Once in the press,",
    titleAccent: "once in the odds.",
    body: "Atlas holds global coverage and prediction-market pricing in one frame, then writes a snapshot you can cite.",
    glow: "radial-gradient(78% 80% at 78% 40%, rgba(72,110,255,0.45), transparent 70%), radial-gradient(60% 60% at 18% 88%, rgba(79,227,193,0.16), transparent 70%)",
  },
  {
    kind: "gap",
    label: "The gap",
    kicker: "Ranked by divergence",
    titleLead: "Where the headlines and the money",
    titleAccent: "disagree.",
    body: "Four thousand signals a day, sorted by the distance between what is covered and what is priced. The widest gaps move first.",
    glow: "radial-gradient(78% 80% at 78% 40%, rgba(255,110,138,0.32), transparent 70%), radial-gradient(60% 60% at 14% 86%, rgba(72,110,255,0.3), transparent 70%)",
  },
  {
    kind: "artifact",
    label: "The artifact",
    kicker: "A snapshot, not a feed",
    titleLead: "One dated page for any topic,",
    titleAccent: "any region, any hour.",
    body: "Timestamped, immutable and fully sourced — every claim carries its wire story and its market beside it.",
    glow: "radial-gradient(78% 80% at 78% 40%, rgba(79,227,193,0.3), transparent 70%), radial-gradient(60% 60% at 16% 88%, rgba(72,110,255,0.28), transparent 70%)",
  },
  {
    kind: "scan",
    label: "Live scan",
    kicker: "194 regions · 9 topics",
    titleLead: "The scan never stops,",
    titleAccent: "so your read never ages.",
    body: "Coverage and pricing refresh continuously. Keep a shelf of snapshots and the trend writes itself.",
    glow: "radial-gradient(78% 80% at 78% 40%, rgba(167,120,255,0.34), transparent 70%), radial-gradient(60% 60% at 16% 86%, rgba(79,227,193,0.2), transparent 70%)",
  },
];

export interface GapRow {
  title: string;
  region: string;
  coverage: number;
  conviction: number;
}

export const GAP_ROWS: GapRow[] = [
  { title: "Sudan corridor talks", region: "East Africa", coverage: 88, conviction: 21 },
  { title: "EU chip subsidy vote", region: "Europe", coverage: 31, conviction: 79 },
  { title: "Ebola response funding", region: "Central Africa", coverage: 18, conviction: 66 },
  { title: "Taiwan strait patrols", region: "East Asia", coverage: 62, conviction: 58 },
];

export interface ArtifactContent {
  header: string;
  headline: string;
  coverage: number;
  conviction: number;
  gap: number;
  sources: string[];
}

export const ARTIFACT: ArtifactContent = {
  header: "Conflict · East Africa",
  headline: "Corridor talks dominate the coverage while the market quietly prices failure.",
  coverage: 88,
  conviction: 21,
  gap: -67,
  sources: ["reuters", "apnews", "polymarket", "+14"],
};

export const SCAN_GRID = { cells: 54, columns: 9 } as const;
