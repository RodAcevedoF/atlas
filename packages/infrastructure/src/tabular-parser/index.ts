import { Worker } from "node:worker_threads";
import {
  type DatasetParserPort,
  InvalidTableError,
  type ParseTableInput,
  type TabularParserPort,
} from "@atlas/application";
import type { DatasetSheet, TableProfile } from "@atlas/domain";
export { datasetWorkbook } from "./parser.ts";

const MAX_ACTIVE_PARSERS = 2;
const PARSE_TIMEOUT_MS = 5_000;
let activeParsers = 0;

async function parseBounded(input: ParseTableInput, mode: "profile"): Promise<TableProfile>;
async function parseBounded(input: ParseTableInput, mode: "dataset"): Promise<DatasetSheet[]>;
async function parseBounded(
  input: ParseTableInput,
  mode: "profile" | "dataset",
): Promise<TableProfile | DatasetSheet[]> {
  if (input.bytes.byteLength > 5 * 1024 * 1024)
    throw new InvalidTableError("Spreadsheet must be 5 MB or smaller");
  if (activeParsers >= MAX_ACTIVE_PARSERS)
    throw new InvalidTableError("Spreadsheet parser is busy; try again shortly");
  activeParsers += 1;
  let worker: Worker | undefined;
  try {
    worker = new Worker(new URL("./worker.ts", import.meta.url), { workerData: { input, mode } });
    const parser = worker;
    return await new Promise<TableProfile | DatasetSheet[]>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new InvalidTableError("Spreadsheet parsing timed out")),
        PARSE_TIMEOUT_MS,
      );
      parser.once(
        "message",
        (message: { result?: TableProfile | DatasetSheet[]; error?: string }) => {
          clearTimeout(timer);
          if (message.result) resolve(message.result);
          else reject(new InvalidTableError(message.error ?? "Spreadsheet could not be read"));
        },
      );
      parser.once("error", (error) => {
        clearTimeout(timer);
        reject(new InvalidTableError(error instanceof Error ? error.message : String(error)));
      });
      parser.once("exit", () => {
        clearTimeout(timer);
        reject(new InvalidTableError("Spreadsheet parser exited before completion"));
      });
    });
  } finally {
    if (worker) await worker.terminate();
    activeParsers -= 1;
  }
}

export class ExcelJsTabularParser implements TabularParserPort {
  parse(input: ParseTableInput): Promise<TableProfile> {
    return parseBounded(input, "profile");
  }
}

export class ExcelJsDatasetParser implements DatasetParserPort {
  read(input: ParseTableInput): Promise<DatasetSheet[]> {
    return parseBounded(input, "dataset");
  }
}
