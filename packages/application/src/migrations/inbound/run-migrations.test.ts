import { describe, expect, test } from "bun:test";
import { inMemoryMigrationLedger } from "../../testing/migration-ledger.fake.ts";
import type { Migration } from "./run-migrations.ts";
import { RunMigrationsUseCase } from "./run-migrations.ts";

function migrationWriting(effects: string[], id: string, summary = "done"): Migration {
  return {
    id,
    execute({ dryRun }) {
      effects.push(`${id}:${dryRun ? "dry" : "live"}`);
      return Promise.resolve(summary);
    },
  };
}

describe("RunMigrationsUseCase", () => {
  test("runs a pending migration and records it as applied", async () => {
    const { ledger, appliedIds } = inMemoryMigrationLedger();
    const effects: string[] = [];

    const result = await new RunMigrationsUseCase(ledger, [
      migrationWriting(effects, "001-first", "changed 3"),
    ]).execute();

    expect(effects).toEqual(["001-first:live"]);
    expect(result).toEqual({ ran: [{ id: "001-first", summary: "changed 3" }], skipped: [] });
    expect(appliedIds()).toEqual(["001-first"]);
  });

  test("never runs a migration twice", async () => {
    const { ledger } = inMemoryMigrationLedger(["001-first"]);
    const effects: string[] = [];

    const result = await new RunMigrationsUseCase(ledger, [
      migrationWriting(effects, "001-first"),
    ]).execute();

    expect(effects).toEqual([]);
    expect(result).toEqual({ ran: [], skipped: ["001-first"] });
  });

  test("a dry run leaves the ledger empty, so the real run still has work to do", async () => {
    const { ledger, appliedIds } = inMemoryMigrationLedger();
    const effects: string[] = [];

    const result = await new RunMigrationsUseCase(ledger, [
      migrationWriting(effects, "001-first"),
    ]).execute({ dryRun: true });

    expect(effects).toEqual(["001-first:dry"]);
    expect(result.ran).toEqual([{ id: "001-first", summary: "done" }]);
    expect(appliedIds()).toEqual([]);
  });

  test("runs the pending migrations in declaration order", async () => {
    const { ledger, appliedIds } = inMemoryMigrationLedger(["001-first"]);
    const effects: string[] = [];
    const migrations = ["001-first", "002-second", "003-third"].map((id) =>
      migrationWriting(effects, id),
    );

    await new RunMigrationsUseCase(ledger, migrations).execute();

    expect(effects).toEqual(["002-second:live", "003-third:live"]);
    expect(appliedIds()).toEqual(["001-first", "002-second", "003-third"]);
  });

  test("a failing migration is not recorded, and the ones behind it do not run", async () => {
    const { ledger, appliedIds } = inMemoryMigrationLedger();
    const effects: string[] = [];
    const migrations: Migration[] = [
      { id: "001-first", execute: () => Promise.reject(new Error("mongo down")) },
      migrationWriting(effects, "002-second"),
    ];

    await expect(new RunMigrationsUseCase(ledger, migrations).execute()).rejects.toThrow(
      "mongo down",
    );

    expect(appliedIds()).toEqual([]);
    expect(effects).toEqual([]);
  });
});
