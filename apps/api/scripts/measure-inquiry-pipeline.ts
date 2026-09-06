import type { InquiryRunEnvelope } from "@atlas/application";
import {
  INQUIRY_GRAPH_NAME,
  INQUIRY_WINDOW,
  isRunEnvelope,
  isTerminalRunEnvelope,
} from "@atlas/application";
import { HttpOrchestration } from "@atlas/infra/orchestration-http";

interface Case {
  label: string;
  question: string;
}

const FIXED_CORPUS: readonly Case[] = [
  {
    label: "global",
    question:
      "What is happening in North America, Latin America, Africa, the Middle East, Europe, Oceania and Asia right now?",
  },
  {
    label: "wildfires",
    question: "What major wildfires are affecting communities in North America right now?",
  },
  {
    label: "water",
    question: "How are drought and water shortages affecting Spain, Morocco, and Italy right now?",
  },
];

interface Sample {
  label: string;
  question: string;
  repetition: number;
  startedAt: string;
  status: string;
  failureClass: string | null;
  error: string | null;
  retrievalMs: number | null;
  normaliseMs: number | null;
  synthesisMs: number | null;
  observedMapReadyMs: number | null;
  totalMs: number | null;
  observedTotalMs: number;
  claimCount: number | null;
  documentCount: number | null;
  distinctPlaceStrings: number | null;
  placeCount: number | null;
  unplacedClaims: number | null;
  placeReadCount: number;
  exaCostUsd: number | null;
  exaCostReported: boolean | null;
}

interface Options {
  repeats: number;
  baseUrl: string;
  out: string | null;
  cases: readonly Case[];
}

const MEASURED_FIELDS = [
  "retrievalMs",
  "normaliseMs",
  "synthesisMs",
  "observedMapReadyMs",
  "totalMs",
  "observedTotalMs",
  "claimCount",
  "distinctPlaceStrings",
  "placeCount",
  "unplacedClaims",
  "exaCostUsd",
] as const;

type MeasuredField = (typeof MEASURED_FIELDS)[number];

function parseOptions(argv: readonly string[]): Options {
  let repeats = 3;
  let baseUrl = process.env.INTELLIGENCE_URL ?? "http://127.0.0.1:8888";
  let out: string | null = null;
  const labels: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (flag === "--repeats" && value) {
      repeats = Number.parseInt(value, 10);
      index += 1;
      continue;
    }
    if (flag === "--url" && value) {
      baseUrl = value;
      index += 1;
      continue;
    }
    if (flag === "--out" && value) {
      out = value;
      index += 1;
      continue;
    }
    if (flag === "--only" && value) {
      labels.push(value);
      index += 1;
      continue;
    }
    throw new Error(`unknown argument: ${flag}`);
  }

  if (!Number.isInteger(repeats) || repeats < 1) {
    throw new Error("--repeats must be a positive integer");
  }
  const cases = labels.length
    ? FIXED_CORPUS.filter((entry) => labels.includes(entry.label))
    : FIXED_CORPUS;
  if (!cases.length) throw new Error(`no case matches --only ${labels.join(", ")}`);
  return { repeats, baseUrl, out, cases };
}

function numberAt(data: Record<string, unknown>, key: string): number | null {
  const value = data[key];
  return typeof value === "number" ? value : null;
}

function countAt(data: Record<string, unknown>, key: string): number | null {
  const value = data[key];
  return Array.isArray(value) ? value.length : null;
}

function countDistinctPlaces(claims: unknown): number | null {
  if (!Array.isArray(claims)) return null;
  const names = new Set<string>();
  for (const claim of claims) {
    if (typeof claim !== "object" || claim === null) continue;
    const place = (claim as Record<string, unknown>).place;
    if (typeof place !== "object" || place === null) continue;
    const name = (place as Record<string, unknown>).name;
    if (typeof name === "string") names.add(name);
  }
  return names.size;
}

function failureClassOf(envelope: InquiryRunEnvelope): string | null {
  const value = envelope.data.failureClass;
  return typeof value === "string" ? value : null;
}

function resultOf(envelope: InquiryRunEnvelope): Record<string, unknown> | null {
  const result = envelope.data.result;
  if (typeof result !== "object" || result === null || Array.isArray(result)) return null;
  return result as Record<string, unknown>;
}

// the terminal result is the only p/run tally a no_coverage or below_floor run ever reports
function applyTerminal(sample: Sample, envelope: InquiryRunEnvelope, elapsed: number): void {
  sample.totalMs = envelope.durationMs;
  sample.observedTotalMs = elapsed;
  sample.failureClass = failureClassOf(envelope);

  const result = resultOf(envelope);
  if (result === null) return;
  sample.status = typeof result.status === "string" ? result.status : "unknown";
  sample.claimCount = numberAt(result, "claimCount");
  sample.documentCount = numberAt(result, "documentCount");
  sample.placeCount = countAt(result, "places");
  sample.unplacedClaims = numberAt(result, "unplacedClaims");
  sample.exaCostUsd = numberAt(result, "costUsd");
  sample.exaCostReported = result.costReported === true;
}

async function measureOnce(
  orchestration: HttpOrchestration,
  entry: Case,
  repetition: number,
): Promise<Sample> {
  const startedAt = new Date();
  const start = performance.now();
  const sample: Sample = {
    label: entry.label,
    question: entry.question,
    repetition,
    startedAt: startedAt.toISOString(),
    status: "unknown",
    failureClass: null,
    error: null,
    retrievalMs: null,
    normaliseMs: null,
    synthesisMs: null,
    observedMapReadyMs: null,
    totalMs: null,
    observedTotalMs: 0,
    claimCount: null,
    documentCount: null,
    distinctPlaceStrings: null,
    placeCount: null,
    unplacedClaims: null,
    placeReadCount: 0,
    exaCostUsd: null,
    exaCostReported: null,
  };

  try {
    const frames = orchestration.stream({
      graphName: INQUIRY_GRAPH_NAME,
      runId: crypto.randomUUID(),
      input: { question: entry.question, window: INQUIRY_WINDOW },
      attempt: 1,
    });

    for await (const frame of frames) {
      if (!isRunEnvelope(frame)) continue;
      const elapsed = Math.round(performance.now() - start);

      if (frame.type === "retrieval_complete") {
        sample.retrievalMs = frame.durationMs;
        sample.distinctPlaceStrings = countDistinctPlaces(frame.data.claims);
        continue;
      }
      if (frame.type === "map_ready") {
        sample.normaliseMs = frame.durationMs;
        sample.observedMapReadyMs = elapsed;
        continue;
      }
      if (frame.type === "synthesis_ready") {
        sample.synthesisMs = frame.durationMs;
        continue;
      }
      if (frame.type === "place_read_ready") {
        sample.placeReadCount += 1;
        continue;
      }
      if (isTerminalRunEnvelope(frame)) {
        applyTerminal(sample, frame, elapsed);
      }
    }
  } catch (error) {
    sample.observedTotalMs = Math.round(performance.now() - start);
    sample.status = "stream_error";
    sample.error = error instanceof Error ? error.message : String(error);
  }

  return sample;
}

function median(values: readonly number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

function medianOf(samples: readonly Sample[], field: MeasuredField): number | null {
  const values: number[] = [];
  for (const sample of samples) {
    const value = sample[field];
    if (typeof value === "number") values.push(value);
  }
  return median(values);
}

interface CaseSummary {
  label: string;
  runs: number;
  succeeded: number;
  statuses: Record<string, number>;
  medians: Record<MeasuredField, number | null>;
}

/** medians describe succeeded runs only — a no_coverage total or a below_floor null stage is not comparable */
function summarise(label: string, samples: readonly Sample[]): CaseSummary {
  const statuses: Record<string, number> = {};
  for (const sample of samples) {
    statuses[sample.status] = (statuses[sample.status] ?? 0) + 1;
  }
  const successful = samples.filter((sample) => sample.status === "succeeded");
  const medians = {} as Record<MeasuredField, number | null>;
  for (const field of MEASURED_FIELDS) {
    medians[field] = medianOf(successful, field);
  }
  return { label, runs: samples.length, succeeded: successful.length, statuses, medians };
}

function summariseAll(cases: readonly Case[], samples: readonly Sample[]): CaseSummary[] {
  return cases
    .map((entry) =>
      summarise(
        entry.label,
        samples.filter((sample) => sample.label === entry.label),
      ),
    )
    .filter((summary) => summary.runs > 0);
}

function seconds(value: number | null): string {
  return value === null ? "—" : `${(value / 1000).toFixed(1)} s`;
}

function plain(value: number | null): string {
  return value === null ? "—" : String(value);
}

function report(summaries: readonly CaseSummary[]): void {
  console.log("\nMedians over succeeded runs (stage durations are Intelligence-reported):\n");
  console.log(
    [
      "case",
      "runs",
      "ok",
      "retrieval",
      "normalise",
      "map ready (observed)",
      "synthesis",
      "total",
      "claims",
      "raw places",
      "places",
      "exa $",
    ].join("\t"),
  );
  for (const summary of summaries) {
    console.log(
      [
        summary.label,
        String(summary.runs),
        String(summary.succeeded),
        seconds(summary.medians.retrievalMs),
        seconds(summary.medians.normaliseMs),
        seconds(summary.medians.observedMapReadyMs),
        seconds(summary.medians.synthesisMs),
        seconds(summary.medians.totalMs),
        plain(summary.medians.claimCount),
        plain(summary.medians.distinctPlaceStrings),
        plain(summary.medians.placeCount),
        summary.medians.exaCostUsd === null ? "—" : summary.medians.exaCostUsd.toFixed(3),
      ].join("\t"),
    );
  }
  for (const summary of summaries) {
    const failed = Object.entries(summary.statuses).filter(([status]) => status !== "succeeded");
    if (!failed.length) continue;
    console.log(
      `\n${summary.label} non-successful outcomes: ${failed
        .map(([status, count]) => `${status}×${count}`)
        .join(", ")}`,
    );
  }
}

async function persist(out: string, options: Options, samples: readonly Sample[]): Promise<void> {
  const body = {
    measuredAt: new Date().toISOString(),
    baseUrl: options.baseUrl,
    samples,
    summaries: summariseAll(options.cases, samples),
  };
  await Bun.write(out, `${JSON.stringify(body, null, 2)}\n`);
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const orchestration = new HttpOrchestration(options.baseUrl);
  const samples: Sample[] = [];

  console.log(
    `Measuring ${options.cases.length} case(s) × ${options.repeats} repetition(s) against ${options.baseUrl}`,
  );

  for (const entry of options.cases) {
    for (let repetition = 1; repetition <= options.repeats; repetition += 1) {
      process.stdout.write(`${entry.label} #${repetition} … `);
      const sample = await measureOnce(orchestration, entry, repetition);
      samples.push(sample);
      console.log(
        `${sample.status} in ${seconds(sample.totalMs ?? sample.observedTotalMs)} (map ready ${seconds(sample.observedMapReadyMs)})`,
      );
      if (sample.error) console.log(`  error: ${sample.error}`);
      if (options.out) await persist(options.out, options, samples);
    }
  }

  report(summariseAll(options.cases, samples));

  if (options.out) {
    console.log(`\nWrote ${samples.length} samples to ${options.out}`);
  }
}

await main();
