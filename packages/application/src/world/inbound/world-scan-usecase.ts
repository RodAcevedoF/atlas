import { marketCategoryToTopic, topMarketMovers } from "@atlas/domain";
import type { MarketStorePort } from "../../markets/outbound/market-store.ts";
import type { OrchestrationPort } from "../outbound/orchestration.ts";
import type { SignalStorePort } from "../outbound/signal-store.ts";
import type { WorldScanReportStorePort } from "../outbound/world-scan-report-store.ts";
import type {
  WorldScan,
  WorldScanInput,
  WorldScanNarrative,
  WorldScanOutput,
} from "./world-scan.ts";

const GRAPH_NAME = "world-scan";
const NEWS_WINDOW = 150;
const MOVER_LIMIT = 8;

export class WorldScanUseCase implements WorldScan {
  constructor(
    private readonly store: MarketStorePort & SignalStorePort & WorldScanReportStorePort,
    private readonly orchestration: OrchestrationPort,
  ) {}

  async execute(input: WorldScanInput = {}): Promise<WorldScanOutput> {
    const [signals, snapshots] = await Promise.all([
      this.store.listSignals({
        source: "news",
        topic: input.topic,
        region: input.region,
        since: input.since,
        limit: NEWS_WINDOW,
      }),
      this.store.getMarketSnapshots({ since: input.since }),
    ]);

    const movers = topMarketMovers(snapshots, MOVER_LIMIT);
    const markets = await Promise.all(movers.map((mover) => this.store.findMarket(mover.marketId)));
    const generatedAt = new Date();

    const moverPayload = movers.map((mover, index) => {
      const market = markets[index];
      const label = market?.title ?? (mover.marketId as string);
      return {
        ref: market?.slug ?? (mover.marketId as string),
        title: label,
        topic: market ? marketCategoryToTopic(market.category) : null,
        region: market?.primaryRegion ?? null,
        volumeUsd: mover.volumeUsd,
        volumeDeltaUsd: mover.volumeDeltaUsd,
        outcomes: mover.outcomes.map((outcome) => ({
          price: outcome.price,
          priceDelta: outcome.priceDelta,
        })),
        from: mover.from.toISOString(),
        to: mover.to.toISOString(),
      };
    });

    const header = {
      windowSince: input.since?.toISOString() ?? null,
      generatedAt: generatedAt.toISOString(),
      newsSignalCount: signals.length,
      marketMoverCount: movers.length,
      topMovers: moverPayload.map((mover) => mover.title),
    };

    if (signals.length === 0 && movers.length === 0) {
      const report: WorldScanOutput = {
        header,
        developments: [],
        divergences: [],
        regionNotes: [],
        coverage: {
          sourcesUsed: [],
          gaps: ["No news signals or market movement in the selected window."],
          note: "Insufficient coverage to produce a scan.",
        },
      };
      await this.persistReport(input, report);
      return report;
    }

    const narrative = (await this.orchestration.run({
      graphName: GRAPH_NAME,
      input: {
        window: {
          since: input.since?.toISOString() ?? null,
          generatedAt: generatedAt.toISOString(),
        },
        focus: { topic: input.topic ?? null, region: input.region ?? null },
        signals: signals.map((signal) => ({
          title: signal.title,
          ref: signal.ref,
          topic: signal.topic,
          region: signal.primaryRegion,
          weight: signal.weight,
          timestamp: signal.timestamp.toISOString(),
        })),
        movers: moverPayload,
      },
    })) as unknown as WorldScanNarrative;

    const report: WorldScanOutput = { header, ...narrative };
    await this.persistReport(input, report);
    return report;
  }

  private async persistReport(input: WorldScanInput, report: WorldScanOutput): Promise<void> {
    // id is assigned by the store (Mongo ObjectId); generatedAt mirrors the report header.
    await this.store.saveWorldScanReport({
      id: "",
      generatedAt: report.header.generatedAt,
      scope: input,
      report,
    });
  }
}
