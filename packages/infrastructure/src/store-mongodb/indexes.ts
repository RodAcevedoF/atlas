import type { Db } from "mongodb";

export async function ensureIndexes(db: Db): Promise<void> {
  await Promise.all([
    db
      .collection("signals")
      .createIndexes([
        { key: { regions: 1, topic: 1 } },
        { key: { source: 1 } },
        { key: { timestamp: -1 } },
      ]),
    // not unique
    db
      .collection("inquiry_runs")
      .createIndexes([
        { key: { createdAt: -1 } },
        { key: { status: 1, createdAt: 1 } },
        { key: { day: 1, questionKey: 1 } },
      ]),
  ]);
}
