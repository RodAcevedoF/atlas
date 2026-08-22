import type {
  ClaimInquiryRunInput,
  CompleteInquiryRunInput,
  InquiryRunPage,
  InquiryRunStorePort,
} from "@atlas/application";
import { INQUIRY_MAX_ATTEMPTS } from "@atlas/application";
import type { InquiryRun, InquiryRunId, InquiryRunListRow } from "@atlas/domain";
import { makeInquiryRunId } from "@atlas/domain";
import type { Db } from "mongodb";
import type { InquiryRunDoc } from "./collections.ts";

const COLLECTION = "inquiry_runs";

const LIST_PROJECTION = {
  question: 1,
  day: 1,
  window: 1,
  places: { $size: { $ifNull: ["$places", []] } },
  status: 1,
  createdAt: 1,
  startedAt: 1,
  completedAt: 1,
} as const;

type InquiryRunListDoc = Pick<
  InquiryRunDoc,
  "_id" | "question" | "day" | "window" | "status" | "createdAt" | "startedAt" | "completedAt"
> & { places: number };

function docToListRow(doc: InquiryRunListDoc): InquiryRunListRow {
  return {
    id: makeInquiryRunId(doc._id),
    question: doc.question,
    day: doc.day,
    window: doc.window,
    placeCount: doc.places,
    status: doc.status,
    createdAt: doc.createdAt,
    startedAt: doc.startedAt,
    completedAt: doc.completedAt,
  };
}

type ClaimShapeField = "places" | "claimCount" | "unplacedClaims" | "costUsd";

/**
 * What a read can actually hand back. A doc written before the claims shape carries none of these
 * until `2026-08-23-empty-gdelt-era-inquiry-runs` backfills it — the same hole the list projection
 * fills with `$ifNull`. Writes still owe every field, so `InquiryRunDoc` stays the shape we store.
 */
type StoredInquiryRunDoc = Omit<InquiryRunDoc, ClaimShapeField> &
  Partial<Pick<InquiryRunDoc, ClaimShapeField>>;

function docToInquiryRun(doc: StoredInquiryRunDoc): InquiryRun {
  return {
    id: makeInquiryRunId(doc._id),
    question: doc.question,
    questionKey: doc.questionKey,
    day: doc.day,
    window: doc.window,
    places: doc.places ?? [],
    claimCount: doc.claimCount ?? 0,
    unplacedClaims: doc.unplacedClaims ?? 0,
    costUsd: doc.costUsd ?? 0,
    synthesis: doc.synthesis,
    status: doc.status,
    error: doc.error,
    attempts: doc.attempts,
    createdAt: doc.createdAt,
    startedAt: doc.startedAt,
    completedAt: doc.completedAt,
  };
}

export class MongoInquiryRunStore implements InquiryRunStorePort {
  constructor(private readonly db: Db) {}

  async saveInquiryRun(run: InquiryRun): Promise<void> {
    const doc: InquiryRunDoc = {
      _id: run.id,
      question: run.question,
      questionKey: run.questionKey,
      day: run.day,
      window: run.window,
      places: run.places,
      claimCount: run.claimCount,
      unplacedClaims: run.unplacedClaims,
      costUsd: run.costUsd,
      synthesis: run.synthesis,
      status: run.status,
      error: run.error,
      attempts: run.attempts,
      createdAt: run.createdAt,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
    };
    await this.db.collection<InquiryRunDoc>(COLLECTION).insertOne(doc);
  }

  async findInquiryRunById(id: InquiryRunId): Promise<InquiryRun | null> {
    const doc = await this.db
      .collection<InquiryRunDoc>(COLLECTION)
      .findOne<StoredInquiryRunDoc>({ _id: id });
    return doc ? docToInquiryRun(doc) : null;
  }

  async findInquiryRunByQuestionDay(questionKey: string, day: string): Promise<InquiryRun | null> {
    const doc = await this.db
      .collection<InquiryRunDoc>(COLLECTION)
      .findOne<StoredInquiryRunDoc>({ questionKey, day }, { sort: { createdAt: -1 } });
    return doc ? docToInquiryRun(doc) : null;
  }

  async countInquiryRunsForDay(day: string): Promise<number> {
    return this.db.collection<InquiryRunDoc>(COLLECTION).countDocuments({ day });
  }

  async claimNextInquiryRun(input: ClaimInquiryRunInput): Promise<InquiryRun | null> {
    const doc = await this.db.collection<InquiryRunDoc>(COLLECTION).findOneAndUpdate(
      {
        $or: [
          { status: "queued" },
          {
            status: "failed_retryable",
            attempts: { $lt: INQUIRY_MAX_ATTEMPTS },
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
    return doc ? docToInquiryRun(doc) : null;
  }

  async completeInquiryRun(input: CompleteInquiryRunInput): Promise<void> {
    await this.db.collection<InquiryRunDoc>(COLLECTION).updateOne(
      { _id: input.id },
      {
        $set: {
          status: input.status,
          places: input.places,
          claimCount: input.claimCount,
          unplacedClaims: input.unplacedClaims,
          costUsd: input.costUsd,
          synthesis: input.synthesis,
          error: input.error,
          completedAt: input.completedAt,
        },
      },
    );
  }

  async listInquiryRuns(page: InquiryRunPage): Promise<InquiryRunListRow[]> {
    const docs = await this.db
      .collection<InquiryRunDoc>(COLLECTION)
      .find<InquiryRunListDoc>({}, { projection: LIST_PROJECTION })
      .sort({ createdAt: -1 })
      .limit(page.limit)
      .toArray();
    return docs.map(docToListRow);
  }
}
