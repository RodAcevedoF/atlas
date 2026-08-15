import type { Migration, SignalStorePort } from "@atlas/application";
import { ReclassifySignalsUseCase } from "@atlas/application";

function percent(share: number): string {
  return `${(share * 100).toFixed(1)}%`;
}

export function buildMigrations(store: SignalStorePort): Migration[] {
  return [
    {
      id: "2026-08-16-reclassify-news-signals",
      async execute({ dryRun }) {
        const result = await new ReclassifySignalsUseCase(store).execute({ dryRun });
        return [
          `scanned ${result.scanned} news signals, ${result.changed} reclassified`,
          `topic "other" ${percent(result.otherShareBefore)} → ${percent(result.otherShareAfter)}`,
          `regions left alone (${result.regions.divergent} diverge from a title-only recompute, ` +
            `${result.regions.wouldNarrowToGlobal} of those would lose all geography)`,
        ].join("; ");
      },
    },
  ];
}
