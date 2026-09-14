import type { DatasetTable } from "@atlas/domain";
import type { ParseTableInput } from "../../inquiry/outbound/tabular-parser.ts";

export interface DatasetParserPort {
  read(input: ParseTableInput): Promise<DatasetTable>;
}
