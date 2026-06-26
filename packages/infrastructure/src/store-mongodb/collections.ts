import type {
  AnalysisRunStatus,
  GeoRegion,
  InsightKind,
  MarketCategory,
  MarketStatus,
  SignalSource,
  Topic,
  TradeSide,
} from "@atlas/domain";

export interface OutcomeDoc {
  _id: string;
  name: string;
  price: number;
  shares: number;
}

export interface MarketDoc {
  _id: string;
  eventId: string | null;
  slug: string;
  title: string;
  description: string;
  category: MarketCategory;
  primaryRegion: GeoRegion;
  regions: GeoRegion[];
  status: MarketStatus;
  outcomes: OutcomeDoc[];
  volumeUsd: number;
  liquidityUsd: number;
  resolvesAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PredictionEventDoc {
  _id: string;
  slug: string;
  title: string;
  description: string;
  category: MarketCategory;
  tags: string[];
  primaryRegion: GeoRegion;
  regions: GeoRegion[];
  marketIds: string[];
  createdAt: Date;
}

export interface SignalDoc {
  _id: string;
  source: SignalSource;
  topic: Topic;
  primaryRegion: GeoRegion;
  regions: GeoRegion[];
  weight: number;
  title: string;
  ref: string;
  timestamp: Date;
  createdAt: Date;
}

export interface PriceTickDoc {
  marketId: string;
  outcomeId: string;
  price: number;
  timestamp: Date;
}

export interface TradeDoc {
  _id: string;
  marketId: string;
  outcomeId: string;
  side: TradeSide;
  size: number;
  price: number;
  walletAddress: string;
  timestamp: Date;
}

export interface EdgeSignalDoc {
  outcomeId: string;
  outcomeName: string;
  marketPrice: number;
  fairValueEstimate: number;
  edgePct: number;
}

export interface DiscrepancySignalDoc {
  marketIds: string[];
  description: string;
  magnitude: number;
}

export interface InsightDoc {
  _id: string;
  marketId: string | null;
  eventId: string | null;
  kind: InsightKind;
  summary: string;
  narrative: string;
  signals: EdgeSignalDoc[] | DiscrepancySignalDoc[] | null;
  model: string;
  runId: string;
  generatedAt: Date;
}

export interface AnalysisRunDoc {
  _id: string;
  kind: InsightKind;
  marketId: string | null;
  eventId: string | null;
  status: AnalysisRunStatus;
  currentNode: string | null;
  startedAt: Date;
  completedAt: Date | null;
  error: string | null;
}
