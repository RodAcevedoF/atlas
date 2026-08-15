import type { MigrationLedgerPort } from "../migrations/outbound/migration-ledger.ts";

export interface InMemoryMigrationLedger {
  ledger: MigrationLedgerPort;
  appliedIds(): string[];
}

export function inMemoryMigrationLedger(seed: string[] = []): InMemoryMigrationLedger {
  const applied = new Set(seed);

  const ledger: MigrationLedgerPort = {
    listAppliedIds: () => Promise.resolve([...applied]),
    recordApplied(id) {
      applied.add(id);
      return Promise.resolve();
    },
  };

  return { ledger, appliedIds: () => [...applied] };
}
