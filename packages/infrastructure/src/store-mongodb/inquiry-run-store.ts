import type {
  ClaimInquiryRunInput,
  CompleteInquiryRunInput,
  InquiryRunCheckpoint,
  InquiryRunNotification,
  InquiryRunPage,
  InquiryRunStorePort,
  InquiryRunSummaryCounts,
  UnnotifiedInquiryRunQuery,
} from "@atlas/application";
import { INQUIRY_MAX_ATTEMPTS } from "@atlas/application";
import type {
  InquiryClaim,
  InquiryPlace,
  InquiryRun,
  InquiryRunId,
  InquiryRunListRow,
  InquiryRunProgress,
  InquiryRunStatus,
  UserId,
} from "@atlas/domain";
import { INQUIRY_PROGRESS_STAGES, makeInquiryRunId, makeUserId } from "@atlas/domain";
import type { Db, Document, Filter } from "mongodb";
import type { InquiryRunDoc } from "./collections.ts";

const COLLECTION = "inquiry_runs";

function freshCheckpointPredicate(checkpoint: InquiryRunCheckpoint): Filter<InquiryRunDoc> {
  return {
    _id: checkpoint.id,
    completedAt: null,
    $or: [
      { "checkpoint.attempt": { $exists: false } },
      { "checkpoint.attempt": { $lt: checkpoint.attempt } },
      {
        "checkpoint.attempt": checkpoint.attempt,
        "checkpoint.sequence": { $lt: checkpoint.sequence },
      },
    ],
  };
}

function reachedStage(stage: InquiryRunCheckpoint["stage"]): Document {
  const held = { $ifNull: ["$progress.stage", "queued"] };
  return {
    $cond: [
      {
        $gt: [
          INQUIRY_PROGRESS_STAGES.indexOf(stage),
          { $indexOfArray: [[...INQUIRY_PROGRESS_STAGES], held] },
        ],
      },
      stage,
      held,
    ],
  };
}

function mergedPlaceRead(
  checkpoint: Extract<InquiryRunCheckpoint, { stage: "place_read_ready" }>,
): Document {
  return {
    $map: {
      input: { $ifNull: ["$places", []] },
      as: "place",
      in: {
        $cond: [
          {
            $and: [
              { $eq: ["$$place.latitude", checkpoint.latitude] },
              { $eq: ["$$place.longitude", checkpoint.longitude] },
            ],
          },
          { $mergeObjects: ["$$place", { read: checkpoint.read }] },
          "$$place",
        ],
      },
    },
  };
}

function checkpointArtifacts(checkpoint: InquiryRunCheckpoint): Document {
  if (checkpoint.stage === "retrieval_complete") {
    return {
      documents: checkpoint.documents,
      claimCount: checkpoint.claimCount,
      costUsd: checkpoint.costUsd,
    };
  }
  if (checkpoint.stage === "map_ready") {
    return {
      places: checkpoint.places,
      claimCount: checkpoint.claimCount,
      unplacedClaims: checkpoint.unplacedClaims,
    };
  }
  if (checkpoint.stage === "synthesis_ready") {
    return { synthesis: checkpoint.synthesis };
  }
  return { places: mergedPlaceRead(checkpoint) };
}

function claimablePredicate(input: ClaimInquiryRunInput): Filter<InquiryRunDoc> {
  return {
    $or: [
      { status: "queued" },
      {
        status: "failed_retryable",
        attempts: { $lt: INQUIRY_MAX_ATTEMPTS },
        completedAt: { $lt: input.completedBefore },
      },
      { status: "running", startedAt: { $lt: input.startedBefore } },
    ],
  };
}

/** a re-claimed run is in flight again, so its terminal stage must not outlive the attempt that set it */
function claimUpdate(input: ClaimInquiryRunInput): Document[] {
  return [
    {
      $set: {
        status: "running",
        startedAt: input.now,
        completedAt: null,
        failure: null,
        error: null,
        attempts: { $add: [{ $ifNull: ["$attempts", 0] }, 1] },
        progress: {
          stage: "queued",
          revision: { $add: [{ $ifNull: ["$progress.revision", 0] }, 1] },
          updatedAt: input.now,
        },
      },
    },
  ];
}

const LIST_PROJECTION = {
  ownerId: 1,
  question: 1,
  day: 1,
  window: 1,
  places: { $size: { $ifNull: ["$places", []] } },
  status: 1,
  revision: { $ifNull: ["$progress.revision", 0] },
  createdAt: 1,
  startedAt: 1,
  completedAt: 1,
} as const;

type InquiryRunListDoc = Pick<
  InquiryRunDoc,
  | "_id"
  | "ownerId"
  | "question"
  | "day"
  | "window"
  | "status"
  | "createdAt"
  | "startedAt"
  | "completedAt"
> & { places: number; revision: number };

function docToOwnerId(doc: Pick<InquiryRunDoc, "ownerId">): UserId | null {
  return doc.ownerId ? makeUserId(doc.ownerId) : null;
}

function docToListRow(doc: InquiryRunListDoc): InquiryRunListRow {
  return {
    id: makeInquiryRunId(doc._id),
    ownerId: docToOwnerId(doc),
    question: doc.question,
    day: doc.day,
    window: doc.window,
    placeCount: doc.places,
    status: doc.status,
    revision: doc.revision,
    createdAt: doc.createdAt,
    startedAt: doc.startedAt,
    completedAt: doc.completedAt,
  };
}

type ClaimShapeField = "places" | "claimCount" | "unplacedClaims" | "costUsd";

type StoredInquiryClaim = Omit<InquiryClaim, "sourceImageUrl"> &
  Partial<Pick<InquiryClaim, "sourceImageUrl">>;

type StoredInquiryPlace = Omit<InquiryPlace, "claims" | "read"> & {
  claims: StoredInquiryClaim[];
  read?: InquiryPlace["read"];
};

type ProgressShapeField = "progress" | "completion" | "degradations";

type StoredInquiryRunDoc = Omit<InquiryRunDoc, ClaimShapeField | "documents" | ProgressShapeField> &
  Partial<Omit<Pick<InquiryRunDoc, ClaimShapeField>, "places">> &
  Partial<Pick<InquiryRunDoc, ProgressShapeField>> & {
    places?: StoredInquiryPlace[];
    documents?: InquiryRunDoc["documents"];
  };

type StoredProgressSource = Pick<
  StoredInquiryRunDoc,
  "progress" | "status" | "createdAt" | "startedAt" | "completedAt"
>;

export function normalizeStoredProgress(doc: StoredProgressSource): InquiryRunProgress {
  if (doc.progress) return doc.progress;
  const reached = doc.status === "queued" || doc.status === "running" ? "queued" : "terminal";
  return {
    stage: reached,
    revision: 0,
    updatedAt: doc.completedAt ?? doc.startedAt ?? doc.createdAt,
  };
}

export function normalizeStoredPlaces(places: StoredInquiryPlace[] | undefined): InquiryPlace[] {
  return (places ?? []).map((place) => ({
    ...place,
    read: place.read ?? null,
    claims: place.claims.map((claim) => ({
      ...claim,
      sourceImageUrl: claim.sourceImageUrl ?? null,
    })),
  }));
}

function docToInquiryRun(doc: StoredInquiryRunDoc): InquiryRun {
  return {
    id: makeInquiryRunId(doc._id),
    ownerId: docToOwnerId(doc),
    question: doc.question,
    questionKey: doc.questionKey,
    day: doc.day,
    window: doc.window,
    places: normalizeStoredPlaces(doc.places),
    documents: doc.documents ?? [],
    claimCount: doc.claimCount ?? 0,
    unplacedClaims: doc.unplacedClaims ?? 0,
    costUsd: doc.costUsd ?? 0,
    synthesis: doc.synthesis,
    status: doc.status,
    failure: doc.failure ?? null,
    error: doc.error,
    attempts: doc.attempts,
    progress: normalizeStoredProgress(doc),
    completion: doc.completion ?? null,
    degradations: doc.degradations ?? [],
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
      ownerId: run.ownerId,
      question: run.question,
      questionKey: run.questionKey,
      day: run.day,
      window: run.window,
      places: run.places,
      documents: run.documents,
      claimCount: run.claimCount,
      unplacedClaims: run.unplacedClaims,
      costUsd: run.costUsd,
      synthesis: run.synthesis,
      status: run.status,
      failure: run.failure,
      error: run.error,
      attempts: run.attempts,
      progress: run.progress,
      completion: run.completion,
      degradations: run.degradations,
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

  async findInquiryRunListRowById(id: InquiryRunId): Promise<InquiryRunListRow | null> {
    const doc = await this.db
      .collection<InquiryRunDoc>(COLLECTION)
      .findOne<InquiryRunListDoc>({ _id: id }, { projection: LIST_PROJECTION });
    return doc ? docToListRow(doc) : null;
  }

  async findInquiryRunByQuestionDay(
    ownerId: UserId,
    questionKey: string,
    day: string,
  ): Promise<InquiryRun | null> {
    const doc = await this.db
      .collection<InquiryRunDoc>(COLLECTION)
      .findOne<StoredInquiryRunDoc>({ ownerId, questionKey, day }, { sort: { createdAt: -1 } });
    return doc ? docToInquiryRun(doc) : null;
  }

  async countSucceededQuestionsForOwnerDay(ownerId: UserId, day: string): Promise<number> {
    const keys = await this.db
      .collection<InquiryRunDoc>(COLLECTION)
      .distinct("questionKey", { ownerId, day, status: "succeeded" });
    return keys.length;
  }

  async claimNextInquiryRun(input: ClaimInquiryRunInput): Promise<InquiryRun | null> {
    const doc = await this.db
      .collection<InquiryRunDoc>(COLLECTION)
      .findOneAndUpdate(claimablePredicate(input), claimUpdate(input), {
        sort: { createdAt: -1 },
        returnDocument: "after",
      });
    return doc ? docToInquiryRun(doc) : null;
  }

  async claimInquiryRunById(
    id: InquiryRunId,
    input: ClaimInquiryRunInput,
  ): Promise<InquiryRun | null> {
    const doc = await this.db
      .collection<InquiryRunDoc>(COLLECTION)
      .findOneAndUpdate({ _id: id, ...claimablePredicate(input) }, claimUpdate(input), {
        returnDocument: "after",
      });
    return doc ? docToInquiryRun(doc) : null;
  }

  async deleteInquiryRunById(id: InquiryRunId): Promise<boolean> {
    const result = await this.db.collection<InquiryRunDoc>(COLLECTION).deleteOne({ _id: id });
    return result.deletedCount === 1;
  }

  async completeInquiryRun(input: CompleteInquiryRunInput): Promise<number | null> {
    const doc = await this.db.collection<InquiryRunDoc>(COLLECTION).findOneAndUpdate(
      { _id: input.id },
      [
        {
          $set: {
            status: input.status,
            places: input.places,
            documents: input.documents,
            claimCount: input.claimCount,
            unplacedClaims: input.unplacedClaims,
            costUsd: input.costUsd,
            synthesis: input.synthesis,
            failure: input.failure,
            error: input.error,
            completion: input.completion,
            degradations: input.degradations,
            completedAt: input.completedAt,
            progress: {
              stage: "terminal",
              revision: { $add: [{ $ifNull: ["$progress.revision", 0] }, 1] },
              updatedAt: input.completedAt,
            },
          },
        },
      ],
      { returnDocument: "after", projection: { progress: 1 } },
    );
    return doc?.progress?.revision ?? null;
  }

  async confirmInquiryRunNotification(notification: InquiryRunNotification): Promise<void> {
    await this.db
      .collection<InquiryRunDoc>(COLLECTION)
      .updateOne(
        { _id: notification.runId },
        { $max: { notifiedRevision: notification.revision } },
      );
  }

  async findUnnotifiedInquiryRuns(
    query: UnnotifiedInquiryRunQuery,
  ): Promise<InquiryRunNotification[]> {
    const docs = await this.db
      .collection<InquiryRunDoc>(COLLECTION)
      .find<Pick<InquiryRunDoc, "_id" | "progress">>(
        {
          "progress.updatedAt": { $gt: query.updatedAfter },
          $expr: {
            $gt: [{ $ifNull: ["$progress.revision", 0] }, { $ifNull: ["$notifiedRevision", 0] }],
          },
        },
        { projection: { progress: 1 } },
      )
      .limit(query.limit)
      .toArray();
    return docs.map((doc) => ({
      runId: makeInquiryRunId(doc._id),
      revision: doc.progress.revision,
    }));
  }

  async applyInquiryRunCheckpoint(checkpoint: InquiryRunCheckpoint): Promise<number | null> {
    const doc = await this.db.collection<InquiryRunDoc>(COLLECTION).findOneAndUpdate(
      freshCheckpointPredicate(checkpoint),
      [
        {
          $set: {
            ...checkpointArtifacts(checkpoint),
            checkpoint: { attempt: checkpoint.attempt, sequence: checkpoint.sequence },
            progress: {
              stage: reachedStage(checkpoint.stage),
              revision: { $add: [{ $ifNull: ["$progress.revision", 0] }, 1] },
              updatedAt: checkpoint.occurredAt,
            },
          },
        },
      ],
      { returnDocument: "after", projection: { progress: 1 } },
    );
    return doc?.progress?.revision ?? null;
  }

  async listInquiryRuns(page: InquiryRunPage): Promise<InquiryRunListRow[]> {
    const ownerFilter = page.ownerId === null ? {} : { ownerId: page.ownerId };
    const docs = await this.db
      .collection<InquiryRunDoc>(COLLECTION)
      .find<InquiryRunListDoc>(ownerFilter, { projection: LIST_PROJECTION })
      .sort({ createdAt: -1 })
      .limit(page.limit)
      .toArray();
    return docs.map(docToListRow);
  }

  async summarizeInquiryRuns(day: string): Promise<InquiryRunSummaryCounts> {
    const [summary] = await this.db
      .collection<InquiryRunDoc>(COLLECTION)
      .aggregate<{
        total: Array<{ count: number }>;
        today: Array<{ count: number }>;
        byStatus: Array<{ _id: InquiryRunStatus; count: number }>;
        cost: Array<{ retrievalCostUsd: number }>;
      }>([
        {
          $facet: {
            total: [{ $count: "count" }],
            today: [{ $match: { day } }, { $count: "count" }],
            byStatus: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
            cost: [
              {
                $group: {
                  _id: null,
                  retrievalCostUsd: { $sum: { $ifNull: ["$costUsd", 0] } },
                },
              },
            ],
          },
        },
      ])
      .toArray();

    const byStatus: Partial<Record<InquiryRunStatus, number>> = {};
    for (const row of summary?.byStatus ?? []) {
      byStatus[row._id] = row.count;
    }
    return {
      total: summary?.total[0]?.count ?? 0,
      today: summary?.today[0]?.count ?? 0,
      byStatus,
      retrievalCostUsd: summary?.cost[0]?.retrievalCostUsd ?? 0,
    };
  }
}
