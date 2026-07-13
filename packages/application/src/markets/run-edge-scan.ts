import type { Insight, MarketCategory } from "@atlas/domain";

export interface RunEdgeScanInput {
  categories?: MarketCategory[];
  minVolumeUsd?: number;
  topK?: number;
}

export interface RunEdgeScanOutput {
  runId: string;
  insights: Insight[];
}

export interface RunEdgeScan {
  execute(input: RunEdgeScanInput): Promise<RunEdgeScanOutput>;
}
