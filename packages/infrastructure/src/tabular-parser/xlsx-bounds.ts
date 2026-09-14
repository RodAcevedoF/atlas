import { inflateRawSync } from "node:zlib";
import { InvalidTableError } from "@atlas/application";

const MAX_EXPANDED_BYTES = 8 * 1024 * 1024;
const MAX_ENTRIES = 128;
export const MAX_CELL_CHARS = 32_768;
export const MAX_PARSED_CELLS = 250_000;

function reject(): never {
  throw new InvalidTableError(
    "Spreadsheet exceeds safe parsing limits or uses unsupported ZIP features",
  );
}

function checkExtraFields(zip: Buffer, start: number, end: number): void {
  let cursor = start;
  while (cursor < end) {
    if (cursor + 4 > end) reject();
    const kind = zip.readUInt16LE(cursor);
    const length = zip.readUInt16LE(cursor + 2);
    if (kind === 0x7075 || cursor + 4 + length > end) reject();
    cursor += 4 + length;
  }
}

function inspectXml(name: string, bytes: Buffer): number {
  if (!name.includes(".xml")) return 0;
  const xml = bytes.toString("utf8");
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) reject();
  for (const match of xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)) {
    if ((match[1]?.length ?? 0) > MAX_CELL_CHARS) reject();
  }
  if (!/xl\/worksheets\//.test(name)) return 0;
  if (/<mergeCell\b/.test(xml)) reject();
  let cells = 0;
  let maximumRow = 0;
  let maximumColumn = 0;
  for (const match of xml.matchAll(/<row\b([^>]*)>/g)) {
    const row = /\br\s*=\s*["'](\d+)["']/.exec(match[1] ?? "");
    if (!row || Number(row[1]) > MAX_PARSED_CELLS) reject();
    maximumRow = Math.max(maximumRow, Number(row[1]));
  }
  for (const match of xml.matchAll(/<col\b([^>]*)>/g)) {
    const maximum = /\bmax\s*=\s*["'](\d+)["']/.exec(match[1] ?? "");
    if (!maximum || Number(maximum[1]) > 16_384) reject();
    maximumColumn = Math.max(maximumColumn, Number(maximum[1]));
  }
  for (const tag of xml.matchAll(/<c\b([^>]*)>/g)) {
    const match = /\br\s*=\s*["']([A-Z]+)(\d+)["']/.exec(tag[1] ?? "");
    if (!match) reject();
    cells += 1;
    let column = 0;
    for (const letter of match[1] ?? "") column = column * 26 + letter.charCodeAt(0) - 64;
    maximumColumn = Math.max(maximumColumn, column);
    maximumRow = Math.max(maximumRow, Number(match[2]));
    if (cells > MAX_PARSED_CELLS || maximumColumn * maximumRow > MAX_PARSED_CELLS) reject();
  }
  if (maximumColumn * maximumRow > MAX_PARSED_CELLS) reject();
  return maximumColumn * maximumRow;
}

export function checkXlsxBounds(bytes: Uint8Array): void {
  const zip = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = zip.length - 22;
  while (end >= Math.max(0, zip.length - 65_557)) {
    if (
      zip.readUInt32LE(end) === 0x06054b50 &&
      end + 22 + zip.readUInt16LE(end + 20) === zip.length
    )
      break;
    end -= 1;
  }
  if (end < Math.max(0, zip.length - 65_557)) reject();
  const entries = zip.readUInt16LE(end + 10);
  if (
    entries === 0 ||
    entries > MAX_ENTRIES ||
    zip.readUInt32LE(end + 4) !== 0 ||
    zip.readUInt16LE(end + 8) !== entries
  )
    reject();
  let cursor = zip.readUInt32LE(end + 16);
  if (cursor + zip.readUInt32LE(end + 12) !== end) reject();
  let expanded = 0;
  let workbookCells = 0;
  const names = new Set<string>();
  for (let entry = 0; entry < entries; entry += 1) {
    if (cursor + 46 > end || zip.readUInt32LE(cursor) !== 0x02014b50) reject();
    const flags = zip.readUInt16LE(cursor + 8);
    const method = zip.readUInt16LE(cursor + 10);
    const compressedSize = zip.readUInt32LE(cursor + 20);
    const expandedSize = zip.readUInt32LE(cursor + 24);
    const nameLength = zip.readUInt16LE(cursor + 28);
    const next =
      cursor + 46 + nameLength + zip.readUInt16LE(cursor + 30) + zip.readUInt16LE(cursor + 32);
    if (next > end || flags & 1 || ![0, 8].includes(method)) reject();
    expanded += expandedSize;
    if (expanded > MAX_EXPANDED_BYTES) reject();
    const name = zip.toString("utf8", cursor + 46, cursor + 46 + nameLength);
    checkExtraFields(
      zip,
      cursor + 46 + nameLength,
      cursor + 46 + nameLength + zip.readUInt16LE(cursor + 30),
    );
    if (
      names.has(name) ||
      name.includes("..") ||
      name.startsWith("/") ||
      name.startsWith("./") ||
      name.includes("/./") ||
      name.includes("//")
    )
      reject();
    names.add(name);
    const local = zip.readUInt32LE(cursor + 42);
    if (local + 30 > cursor || zip.readUInt32LE(local) !== 0x04034b50) reject();
    const localNameEnd = local + 30 + zip.readUInt16LE(local + 26);
    if (
      localNameEnd > cursor ||
      !zip
        .subarray(local + 30, localNameEnd)
        .equals(zip.subarray(cursor + 46, cursor + 46 + nameLength))
    )
      reject();
    const start = localNameEnd + zip.readUInt16LE(local + 28);
    if (start + compressedSize > cursor) reject();
    checkExtraFields(zip, localNameEnd, start);
    const compressed = zip.subarray(start, start + compressedSize);
    const content =
      method === 0
        ? compressed
        : inflateRawSync(compressed, {
            maxOutputLength: Math.max(1, Math.min(expandedSize, MAX_EXPANDED_BYTES)),
          });
    if (content.length !== expandedSize) reject();
    workbookCells += inspectXml(name, content);
    if (workbookCells > MAX_PARSED_CELLS) reject();
    cursor = next;
  }
  if (cursor !== end) reject();
}
