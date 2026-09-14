import { parentPort, workerData } from "node:worker_threads";
import type { ParseTableInput } from "@atlas/application";
import { ExcelJsDatasetParser, ExcelJsTabularParser } from "./parser.ts";

const { input, mode }: { input: ParseTableInput; mode: "profile" | "dataset" } = workerData;
if (!parentPort) throw new Error("Spreadsheet parser requires a worker");
try {
  const result =
    mode === "profile"
      ? await new ExcelJsTabularParser().parse(input)
      : await new ExcelJsDatasetParser().read(input);
  parentPort.postMessage({ result });
} catch (error) {
  parentPort.postMessage({ error: error instanceof Error ? error.message : String(error) });
}
