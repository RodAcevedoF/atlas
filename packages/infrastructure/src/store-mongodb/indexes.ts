import type { Db } from "mongodb";

export async function ensureIndexes(db: Db): Promise<void> {
  await db
    .collection("inquiry_runs")
    .createIndexes([
      { key: { createdAt: -1 } },
      { key: { status: 1, createdAt: 1 } },
      { key: { day: 1, questionKey: 1 } },
    ]);
}
