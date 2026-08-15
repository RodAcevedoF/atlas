import type { MigrationLedgerPort } from "../outbound/migration-ledger.ts";

export interface MigrationContext {
  dryRun: boolean;
}

export interface Migration {
  id: string;
  execute(context: MigrationContext): Promise<string>;
}

export interface MigrationRun {
  id: string;
  summary: string;
}

export interface RunMigrationsInput {
  dryRun?: boolean;
}

export interface RunMigrationsOutput {
  ran: MigrationRun[];
  skipped: string[];
}

export interface RunMigrations {
  execute(input?: RunMigrationsInput): Promise<RunMigrationsOutput>;
}

export class RunMigrationsUseCase implements RunMigrations {
  constructor(
    private readonly ledger: MigrationLedgerPort,
    private readonly migrations: Migration[],
  ) {}

  async execute(input: RunMigrationsInput = {}): Promise<RunMigrationsOutput> {
    const dryRun = input.dryRun ?? false;
    const appliedIds = new Set(await this.ledger.listAppliedIds());
    const ran: MigrationRun[] = [];
    const skipped: string[] = [];

    for (const migration of this.migrations) {
      if (appliedIds.has(migration.id)) {
        skipped.push(migration.id);
        continue;
      }
      const summary = await migration.execute({ dryRun });
      if (!dryRun) await this.ledger.recordApplied(migration.id);
      ran.push({ id: migration.id, summary });
    }

    return { ran, skipped };
  }
}
