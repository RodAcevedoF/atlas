import type {
  ClaimResearchRunInput,
  CompleteResearchRunInput,
  ResearchRunPage,
  ResearchRunStorePort,
} from "@atlas/application";
import { RESEARCH_MAX_ATTEMPTS } from "@atlas/application";
import type { ResearchRun, ResearchRunId, ResearchRunListRow } from "@atlas/domain";
import { makeResearchRunId } from "@atlas/domain";
import type { Db } from "mongodb";
import type { ResearchRunDoc } from "./collections.ts";

const COLLECTION = "research_runs";

const LIST_PROJECTION = {
  question: 1,
  day: 1,
  window: 1,
  "distribution.country": 1,
  "distribution.confidence": 1,
  status: 1,
  createdAt: 1,
  startedAt: 1,
  completedAt: 1,
} as const;

type ResearchRunListDoc = Pick<
  ResearchRunDoc,
  "_id" | "question" | "day" | "window" | "status" | "createdAt" | "startedAt" | "completedAt"
> & { distribution: ResearchRunListRow["distribution"] };

function docToListRow(doc: ResearchRunListDoc): ResearchRunListRow {
  return {
    id: makeResearchRunId(doc._id),
    question: doc.question,
    day: doc.day,
    window: doc.window,
    distribution: doc.distribution,
    status: doc.status,
    createdAt: doc.createdAt,
    startedAt: doc.startedAt,
    completedAt: doc.completedAt,
  };
}

function docToResearchRun(doc: ResearchRunDoc): ResearchRun {
  return {
    id: makeResearchRunId(doc._id),
    question: doc.question,
    questionKey: doc.questionKey,
    day: doc.day,
    executedQuery: doc.executedQuery,
    window: doc.window,
    distribution: doc.distribution,
    exemplars: doc.exemplars,
    synthesis: doc.synthesis,
    status: doc.status,
    error: doc.error,
    attempts: doc.attempts,
    createdAt: doc.createdAt,
    startedAt: doc.startedAt,
    completedAt: doc.completedAt,
  };
}

export class MongoResearchRunStore implements ResearchRunStorePort {
  constructor(private readonly db: Db) {}

  async saveResearchRun(run: ResearchRun): Promise<void> {
    const doc: ResearchRunDoc = {
      _id: run.id,
      question: run.question,
      questionKey: run.questionKey,
      day: run.day,
      executedQuery: run.executedQuery,
      window: run.window,
      distribution: run.distribution,
      exemplars: run.exemplars,
      synthesis: run.synthesis,
      status: run.status,
      error: run.error,
      attempts: run.attempts,
      createdAt: run.createdAt,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
    };
    await this.db.collection<ResearchRunDoc>(COLLECTION).insertOne(doc);
  }

  async findResearchRunById(id: ResearchRunId): Promise<ResearchRun | null> {
    const doc = await this.db.collection<ResearchRunDoc>(COLLECTION).findOne({ _id: id });
    return doc ? docToResearchRun(doc) : null;
  }

  async findResearchRunByQuestionDay(
    questionKey: string,
    day: string,
  ): Promise<ResearchRun | null> {
    const doc = await this.db
      .collection<ResearchRunDoc>(COLLECTION)
      .findOne({ questionKey, day }, { sort: { createdAt: -1 } });
    return doc ? docToResearchRun(doc) : null;
  }

  async countResearchRunsForDay(day: string): Promise<number> {
    return this.db.collection<ResearchRunDoc>(COLLECTION).countDocuments({ day });
  }

  async claimNextResearchRun(input: ClaimResearchRunInput): Promise<ResearchRun | null> {
    const doc = await this.db.collection<ResearchRunDoc>(COLLECTION).findOneAndUpdate(
      {
        $or: [
          { status: "queued" },
          {
            status: "failed_retryable",
            attempts: { $lt: RESEARCH_MAX_ATTEMPTS },
            completedAt: { $lt: input.completedBefore },
          },
          { status: "running", startedAt: { $lt: input.startedBefore } },
        ],
      },
      {
        $set: { status: "running", startedAt: input.now, completedAt: null, error: null },
        $inc: { attempts: 1 },
      },
      { sort: { createdAt: -1 }, returnDocument: "after" },
    );
    return doc ? docToResearchRun(doc) : null;
  }

  async completeResearchRun(input: CompleteResearchRunInput): Promise<void> {
    await this.db.collection<ResearchRunDoc>(COLLECTION).updateOne(
      { _id: input.id },
      {
        $set: {
          status: input.status,
          executedQuery: input.executedQuery,
          distribution: input.distribution,
          exemplars: input.exemplars,
          synthesis: input.synthesis,
          error: input.error,
          completedAt: input.completedAt,
        },
      },
    );
  }

  async listResearchRuns(page: ResearchRunPage): Promise<ResearchRunListRow[]> {
    const docs = await this.db
      .collection<ResearchRunDoc>(COLLECTION)
      .find<ResearchRunListDoc>({}, { projection: LIST_PROJECTION })
      .sort({ createdAt: -1 })
      .limit(page.limit)
      .toArray();
    return docs.map(docToListRow);
  }
}
