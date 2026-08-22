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
