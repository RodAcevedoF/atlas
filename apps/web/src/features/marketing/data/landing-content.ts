export type SlideKind = "premise" | "question" | "artifact" | "live";

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
    kicker: "Reported everywhere · happening somewhere",
    titleLead: "Every story is reported everywhere.",
    titleAccent: "It only happens somewhere.",
    body: "Coverage tells you who is talking. Atlas reads the claims underneath and pins each one where it actually happened.",
    glow: "radial-gradient(78% 80% at 78% 40%, rgba(72,110,255,0.45), transparent 70%), radial-gradient(60% 60% at 18% 88%, rgba(79,227,193,0.16), transparent 70%)",
  },
  {
    kind: "question",
    label: "The question",
    kicker: "One question in, a located world out",
    titleLead: "Ask one question.",
    titleAccent: "Watch the world answer.",
    body: "Type what you want to know. Atlas searches, extracts every claim it can place, and lights the map where the answer is happening.",
    glow: "radial-gradient(78% 80% at 78% 40%, rgba(255,110,138,0.32), transparent 70%), radial-gradient(60% 60% at 14% 86%, rgba(72,110,255,0.3), transparent 70%)",
  },
  {
    kind: "artifact",
    label: "The artifact",
    kicker: "A snapshot, not a feed",
    titleLead: "One dated map for any question,",
    titleAccent: "every claim sourced.",
    body: "Timestamped and fully cited — each claim carries the place it happened and the story it came from.",
    glow: "radial-gradient(78% 80% at 78% 40%, rgba(79,227,193,0.3), transparent 70%), radial-gradient(60% 60% at 16% 88%, rgba(72,110,255,0.28), transparent 70%)",
  },
  {
    kind: "live",
    label: "Live",
    kicker: "194 regions · 9 topics",
    titleLead: "The map keeps moving,",
    titleAccent: "so your read never ages.",
    body: "Re-run any question and it redraws on today's claims. Keep the old snapshots and the trend writes itself.",
    glow: "radial-gradient(78% 80% at 78% 40%, rgba(167,120,255,0.34), transparent 70%), radial-gradient(60% 60% at 16% 86%, rgba(79,227,193,0.2), transparent 70%)",
  },
];

export interface PlaceRow {
  place: string;
  region: string;
  claims: number;
}

export const PLACE_ROWS: PlaceRow[] = [
  { place: "Port Sudan", region: "East Africa", claims: 34 },
  { place: "Brussels", region: "Europe", claims: 21 },
  { place: "Goma", region: "Central Africa", claims: 17 },
  { place: "Taipei", region: "East Asia", claims: 9 },
];

export interface ArtifactContent {
  header: string;
  headline: string;
  claims: number;
  places: number;
  sources: number;
  refs: string[];
}

export const ARTIFACT: ArtifactContent = {
  header: "Conflict · East Africa",
  headline: "Aid convoys reach Port Sudan while fighting closes the northern corridor.",
  claims: 34,
  places: 11,
  sources: 18,
  refs: ["reuters", "apnews", "unnews", "+15"],
};

export const SCAN_GRID = { cells: 54, columns: 9 } as const;
