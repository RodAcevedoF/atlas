import type { Db } from "mongodb";

export async function ensureIndexes(db: Db): Promise<void> {
  await Promise.all([
    db.collection("prediction_events").createIndexes([{ key: { slug: 1 }, unique: false }]),
    db
      .collection("markets")
      .createIndexes([{ key: { slug: 1 } }, { key: { status: 1 } }, { key: { eventId: 1 } }]),
    db
      .collection("price_ticks")
      .createIndexes([{ key: { marketId: 1, outcomeId: 1, timestamp: -1 } }]),
    db.collection("trades").createIndexes([{ key: { marketId: 1, timestamp: -1 } }]),
    db
      .collection("signals")
      .createIndexes([
        { key: { regions: 1, topic: 1 } },
        { key: { source: 1 } },
        { key: { timestamp: -1 } },
      ]),
    db.collection("insights").createIndexes([{ key: { marketId: 1, kind: 1, generatedAt: -1 } }]),
    db.collection("analysis_runs").createIndexes([{ key: { status: 1 } }]),
  ]);
}
