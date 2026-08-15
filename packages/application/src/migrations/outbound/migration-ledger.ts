export interface MigrationLedgerPort {
  listAppliedIds(): Promise<string[]>;
  recordApplied(id: string): Promise<void>;
}
