import type { Migration } from "@atlas/application";
import type { InquiryPlace } from "@atlas/domain";
import type { Db } from "mongodb";
import type { InquiryRunDoc } from "./collections.ts";
import { regroupPlacesOntoCoordinates } from "./regroup-places.ts";

const RESEARCH_RUNS = "research_runs";
const INQUIRY_RUNS = "inquiry_runs";

const ORPHANED_MARKET_ERA_COLLECTIONS = [
  "analysis_runs",
  "atlas",
  "insights",
  "market_snapshots",
  "markets",
  "prediction_events",
  "price_ticks",
  "trades",
  "watchlists",
];

async function hasCollection(db: Db, name: string): Promise<boolean> {
  const found = await db.listCollections({ name }, { nameOnly: true }).toArray();
  return found.length > 0;
}

async function presentCollections(db: Db, names: string[]): Promise<string[]> {
  const found = await db.listCollections({}, { nameOnly: true }).toArray();
  return found.map((collection) => collection.name).filter((name) => names.includes(name));
}

async function countIn(db: Db, name: string): Promise<number> {
  if (!(await hasCollection(db, name))) return 0;
  return db.collection(name).countDocuments();
}

export function renameResearchRunsToInquiryRuns(db: Db): Migration {
  return {
    id: "2026-08-22-rename-research-runs-to-inquiry-runs",
    async execute({ dryRun }) {
      if (!(await hasCollection(db, RESEARCH_RUNS))) {
        return `${RESEARCH_RUNS} absent — nothing to rename`;
      }

      const held = await countIn(db, INQUIRY_RUNS);
      if (held > 0) {
        throw new Error(`${INQUIRY_RUNS} already holds ${held} runs — refusing to overwrite`);
      }

      const moving = await countIn(db, RESEARCH_RUNS);
      if (dryRun) return `would rename ${RESEARCH_RUNS} → ${INQUIRY_RUNS} (${moving} runs)`;

      await db.renameCollection(RESEARCH_RUNS, INQUIRY_RUNS, { dropTarget: true });
      return `renamed ${RESEARCH_RUNS} → ${INQUIRY_RUNS} (${moving} runs)`;
    },
  };
}

export function dropSavedReportIds(db: Db): Migration {
  return {
    id: "2026-08-22-drop-saved-report-ids",
    async execute({ dryRun }) {
      const holding = await db
        .collection("users")
        .countDocuments({ "profile.savedReportIds": { $exists: true } });
      if (holding === 0) return "no profile still carries savedReportIds";
      if (dryRun) return `would unset savedReportIds on ${holding} profiles`;

      const result = await db
        .collection("users")
        .updateMany(
          { "profile.savedReportIds": { $exists: true } },
          { $unset: { "profile.savedReportIds": "" } },
        );
      return `unset savedReportIds on ${result.modifiedCount} profiles`;
    },
  };
}

export function emptyGdeltEraInquiryRuns(db: Db): Migration {
  return {
    id: "2026-08-23-empty-gdelt-era-inquiry-runs",
    async execute({ dryRun }) {
      if (!(await hasCollection(db, INQUIRY_RUNS))) {
        return `${INQUIRY_RUNS} absent — nothing to empty`;
      }

      const stale = { places: { $exists: false } };
      const holding = await db.collection(INQUIRY_RUNS).countDocuments(stale);
      if (holding === 0) return "every run already carries the claims shape";
      if (dryRun) return `would empty ${holding} GDELT-era runs`;

      const result = await db.collection(INQUIRY_RUNS).updateMany(stale, {
        $set: { places: [], claimCount: 0, unplacedClaims: 0, costUsd: 0 },
        $unset: { distribution: "", exemplars: "", executedQuery: "" },
      });
      return `emptied ${result.modifiedCount} GDELT-era runs`;
    },
  };
}

function regroupingChanged(stored: InquiryPlace[], regrouped: InquiryPlace[]): boolean {
  if (stored.length !== regrouped.length) return true;
  return regrouped.some(
    (place, index) =>
      place.place !== stored[index].place || place.country !== stored[index].country,
  );
}

export function regroupInquiryPlacesOntoCoordinates(db: Db): Migration {
  return {
    id: "2026-08-23-regroup-inquiry-places-onto-coordinates",
    async execute({ dryRun }) {
      if (!(await hasCollection(db, INQUIRY_RUNS))) {
        return `${INQUIRY_RUNS} absent — nothing to regroup`;
      }

      const runs = await db
        .collection<InquiryRunDoc>(INQUIRY_RUNS)
        .find({ "places.0": { $exists: true } })
        .toArray();

      const stacked = runs
        .map((run) => ({
          id: run._id,
          stored: run.places,
          places: regroupPlacesOntoCoordinates(run.places),
        }))
        .filter((run) => regroupingChanged(run.stored, run.places));
      const merged = stacked.reduce(
        (total, run) => total + run.stored.length - run.places.length,
        0,
      );

      if (stacked.length === 0) return "every run already matches the current grouping";
      if (dryRun) return `would regroup ${stacked.length} runs, merging ${merged} stacked places`;

      await db.collection<InquiryRunDoc>(INQUIRY_RUNS).bulkWrite(
        stacked.map((run) => ({
          updateOne: { filter: { _id: run.id }, update: { $set: { places: run.places } } },
        })),
        { ordered: false },
      );
      return `regrouped ${stacked.length} runs, merging ${merged} stacked places`;
    },
  };
}

const EXA_CUTOVER = new Date("2026-08-22T21:40:00.000Z");

export function dropGdeltEraInquiryRuns(db: Db): Migration {
  return {
    id: "2026-08-23-drop-gdelt-era-inquiry-runs",
    async execute({ dryRun }) {
      if (!(await hasCollection(db, INQUIRY_RUNS))) {
        return `${INQUIRY_RUNS} absent — nothing to drop`;
      }

      const stale = { createdAt: { $lt: EXA_CUTOVER }, costUsd: { $lte: 0 } };
      const holding = await db.collection(INQUIRY_RUNS).countDocuments(stale);
      if (holding === 0) return "no GDELT-era run left";
      if (dryRun) return `would drop ${holding} GDELT-era runs`;

      const result = await db.collection(INQUIRY_RUNS).deleteMany(stale);
      return `dropped ${result.deletedCount} GDELT-era runs`;
    },
  };
}

export function dropOrphanedMarketEraCollections(db: Db): Migration {
  return {
    id: "2026-08-25-drop-orphaned-market-era-collections",
    async execute({ dryRun }) {
      const present = await presentCollections(db, ORPHANED_MARKET_ERA_COLLECTIONS);
      if (present.length === 0) return "no orphaned market-era collection left";

      const counted = await Promise.all(
        present.map(async (name) => ({ name, held: await db.collection(name).countDocuments() })),
      );
      const summary = counted
        .map((collection) => `${collection.name} (${collection.held})`)
        .join(", ");

      if (dryRun) return `would drop ${present.length} orphaned collections: ${summary}`;

      await Promise.all(present.map((name) => db.dropCollection(name)));
      return `dropped ${present.length} orphaned collections: ${summary}`;
    },
  };
}
