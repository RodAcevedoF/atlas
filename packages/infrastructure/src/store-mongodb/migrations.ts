import type { Migration } from "@atlas/application";
import type { Db } from "mongodb";

const RESEARCH_RUNS = "research_runs";
const INQUIRY_RUNS = "inquiry_runs";

async function hasCollection(db: Db, name: string): Promise<boolean> {
  const found = await db.listCollections({ name }, { nameOnly: true }).toArray();
  return found.length > 0;
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
