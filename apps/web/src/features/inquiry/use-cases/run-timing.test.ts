import { expect, test } from "bun:test";
import { formatElapsedSeconds } from "./run-timing.ts";

interface ElapsedCase {
  name: string;
  totalSeconds: number;
  label: string;
}

const elapsedCases: ElapsedCase[] = [
  {
    name: "a run that just started reads as zero seconds, not an empty string",
    totalSeconds: 0,
    label: "0s",
  },
  {
    name: "under a minute stays in plain seconds",
    totalSeconds: 40,
    label: "40s",
  },
  {
    name: "a whole minute drops the seconds part instead of showing 1m 0s",
    totalSeconds: 60,
    label: "1m",
  },
  {
    name: "past a minute reads as minutes plus leftover seconds",
    totalSeconds: 93,
    label: "1m 33s",
  },
  {
    name: "several minutes keep counting instead of capping",
    totalSeconds: 185,
    label: "3m 5s",
  },
];

for (const elapsedCase of elapsedCases) {
  test(elapsedCase.name, () => {
    const label = formatElapsedSeconds(elapsedCase.totalSeconds);

    expect(label).toBe(elapsedCase.label);
  });
}
