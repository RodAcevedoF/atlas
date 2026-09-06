import type {
  InquiryClaim,
  InquiryPlace,
  InquiryPlaceRead,
  InquiryRunStatus,
  InquirySourceDocument,
} from "@atlas/domain";
import { INQUIRY_RUN_STATUSES } from "@atlas/domain";

const IN_FLIGHT_STATUSES = ["queued", "running"] as const satisfies readonly InquiryRunStatus[];

export function isTerminalStatus(value: unknown): value is InquiryRunStatus {
  if (typeof value !== "string") return false;
  if (!(INQUIRY_RUN_STATUSES as readonly string[]).includes(value)) return false;
  return !(IN_FLIGHT_STATUSES as readonly string[]).includes(value);
}

function isNullableText(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isSafeSourceImageUrl(value: string): boolean {
  if (value !== value.trim()) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname.length > 0 &&
      url.username === "" &&
      url.password === ""
    );
  } catch {
    return false;
  }
}

function asClaim(value: unknown): InquiryClaim | null {
  if (typeof value !== "object" || value === null) return null;
  const row = value as Record<string, unknown>;
  if (typeof row.text !== "string") return null;
  if (typeof row.confidence !== "number") return null;
  if (typeof row.sourceUrl !== "string") return null;
  if (!isNullableText(row.sourceTitle)) return null;
  if (!isNullableText(row.publishedDate)) return null;
  if (
    row.sourceImageUrl !== undefined &&
    row.sourceImageUrl !== null &&
    (typeof row.sourceImageUrl !== "string" || !isSafeSourceImageUrl(row.sourceImageUrl))
  ) {
    return null;
  }
  return {
    text: row.text,
    confidence: row.confidence,
    sourceUrl: row.sourceUrl,
    sourceTitle: row.sourceTitle,
    publishedDate: row.publishedDate,
    sourceImageUrl: row.sourceImageUrl ?? null,
  };
}

export function asPlaceRead(value: unknown, claims: InquiryClaim[]): InquiryPlaceRead | null {
  if (value === undefined || value === null || claims.length < 2) return null;
  if (typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.text !== "string" || row.text.trim().length === 0) return null;
  if (!Array.isArray(row.sourceUrls) || row.sourceUrls.length === 0) return null;
  if (!row.sourceUrls.every((sourceUrl) => typeof sourceUrl === "string")) return null;
  const claimSourceUrls = new Set(claims.map((claim) => claim.sourceUrl));
  if (!row.sourceUrls.every((sourceUrl) => claimSourceUrls.has(sourceUrl))) return null;
  return {
    text: row.text.trim(),
    sourceUrls: [...new Set(row.sourceUrls)],
  };
}

function asPlace(value: unknown): InquiryPlace | null {
  if (typeof value !== "object" || value === null) return null;
  const row = value as Record<string, unknown>;
  if (typeof row.place !== "string") return null;
  if (!isNullableText(row.country)) return null;
  if (typeof row.latitude !== "number") return null;
  if (typeof row.longitude !== "number") return null;
  if (!Array.isArray(row.claims)) return null;
  const claims: InquiryClaim[] = [];
  for (const value of row.claims) {
    const claim = asClaim(value);
    if (claim === null) return null;
    claims.push(claim);
  }
  if (row.claimCount !== claims.length) return null;
  return {
    place: row.place,
    country: row.country,
    latitude: row.latitude,
    longitude: row.longitude,
    claimCount: claims.length,
    read: asPlaceRead(row.read, claims),
    claims,
  };
}

export function asText(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function asPlaces(value: unknown): InquiryPlace[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return null;
  const places: InquiryPlace[] = [];
  for (const row of value) {
    const place = asPlace(row);
    if (place === null) return null;
    places.push(place);
  }
  return places;
}

function asSourceDocument(value: unknown): InquirySourceDocument | null {
  if (typeof value !== "object" || value === null) return null;
  const row = value as Record<string, unknown>;
  if (typeof row.url !== "string") return null;
  if (!isNullableText(row.title)) return null;
  if (!isNullableText(row.publishedDate)) return null;
  if (!isNullableText(row.text)) return null;
  if (!Array.isArray(row.highlights)) return null;
  if (!row.highlights.every((highlight) => typeof highlight === "string")) return null;
  return {
    url: row.url,
    title: row.title,
    publishedDate: row.publishedDate,
    text: row.text,
    highlights: row.highlights,
  };
}

export function asDocuments(value: unknown): InquirySourceDocument[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return null;
  const documents: InquirySourceDocument[] = [];
  for (const row of value) {
    const document = asSourceDocument(row);
    if (document === null) return null;
    documents.push(document);
  }
  return documents;
}

export function asCount(value: unknown): number | null {
  if (value === undefined || value === null) return 0;
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}
