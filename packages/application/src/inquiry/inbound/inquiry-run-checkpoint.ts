import type { InquiryPlace, InquiryRunId, InquirySourceDocument } from "@atlas/domain";
import type { InquiryRunEnvelope } from "../../world/outbound/run-envelope.ts";
import type { InquiryRunCheckpoint } from "../outbound/inquiry-run-store.ts";
import { asCount, asDocuments, asPlaceRead, asPlaces, asText } from "./inquiry-graph-payload.ts";

export interface PreservedArtifacts {
  places: InquiryPlace[];
  documents: InquirySourceDocument[];
  claimCount: number;
  unplacedClaims: number;
  costUsd: number;
  synthesis: string | null;
}

type CheckpointOrigin = Pick<InquiryRunCheckpoint, "id" | "attempt" | "sequence" | "occurredAt">;

function retrievalCheckpoint(
  origin: CheckpointOrigin,
  data: Record<string, unknown>,
): InquiryRunCheckpoint | null {
  const documents = asDocuments(data.documents);
  const claimCount = asCount(data.claimCount);
  const costUsd = asCount(data.costUsd);
  if (documents === null || claimCount === null || costUsd === null) return null;
  return { ...origin, stage: "retrieval_complete", documents, claimCount, costUsd };
}

function mapCheckpoint(
  origin: CheckpointOrigin,
  data: Record<string, unknown>,
): InquiryRunCheckpoint | null {
  const places = asPlaces(data.places);
  const claimCount = asCount(data.claimCount);
  const unplacedClaims = asCount(data.unplacedClaims);
  if (places === null || claimCount === null || unplacedClaims === null) return null;
  return { ...origin, stage: "map_ready", places, claimCount, unplacedClaims };
}

function synthesisCheckpoint(
  origin: CheckpointOrigin,
  data: Record<string, unknown>,
): InquiryRunCheckpoint | null {
  const synthesis = asText(data.synthesis);
  if (synthesis === null) return null;
  return { ...origin, stage: "synthesis_ready", synthesis };
}

function placeReadCheckpoint(
  origin: CheckpointOrigin,
  data: Record<string, unknown>,
  places: InquiryPlace[],
): InquiryRunCheckpoint | null {
  const { latitude, longitude } = data;
  if (typeof latitude !== "number" || typeof longitude !== "number") return null;
  const mapped = places.find(
    (place) => place.latitude === latitude && place.longitude === longitude,
  );
  if (!mapped) return null;
  const read = asPlaceRead(data.read, mapped.claims);
  if (read === null) return null;
  return { ...origin, stage: "place_read_ready", latitude, longitude, read };
}

export function toCheckpoint(
  runId: InquiryRunId,
  envelope: InquiryRunEnvelope,
  places: InquiryPlace[],
): InquiryRunCheckpoint | null {
  const origin = {
    id: runId,
    attempt: envelope.attempt,
    sequence: envelope.sequence,
    occurredAt: envelope.occurredAt,
  };
  switch (envelope.type) {
    case "retrieval_complete":
      return retrievalCheckpoint(origin, envelope.data);
    case "map_ready":
      return mapCheckpoint(origin, envelope.data);
    case "synthesis_ready":
      return synthesisCheckpoint(origin, envelope.data);
    case "place_read_ready":
      return placeReadCheckpoint(origin, envelope.data, places);
    default:
      return null;
  }
}

export function withCheckpoint(
  preserved: PreservedArtifacts,
  checkpoint: InquiryRunCheckpoint,
): PreservedArtifacts {
  switch (checkpoint.stage) {
    case "retrieval_complete":
      return {
        ...preserved,
        documents: checkpoint.documents,
        claimCount: checkpoint.claimCount,
        costUsd: checkpoint.costUsd,
      };
    case "map_ready":
      return {
        ...preserved,
        places: checkpoint.places,
        claimCount: checkpoint.claimCount,
        unplacedClaims: checkpoint.unplacedClaims,
      };
    case "synthesis_ready":
      return { ...preserved, synthesis: checkpoint.synthesis };
    case "place_read_ready":
      return {
        ...preserved,
        places: preserved.places.map((place) =>
          place.latitude === checkpoint.latitude && place.longitude === checkpoint.longitude
            ? { ...place, read: checkpoint.read }
            : place,
        ),
      };
  }
}
