import fs from "node:fs/promises";

import { getDataDir, getRunAnalyticsPath } from "./paths";
import {
  isRunAnalyticsRecordV1,
  type RunAnalyticsRecordV1,
} from "./run-analytics-types";

export async function appendRunAnalyticsRecord(
  record: RunAnalyticsRecordV1,
): Promise<void> {
  const file = getRunAnalyticsPath();
  await fs.mkdir(getDataDir(), { recursive: true });
  const line = `${JSON.stringify(record)}\n`;
  await fs.appendFile(file, line, "utf-8");
}

/** Read all records (newest last in file). Skips corrupt lines. */
export async function readRunAnalyticsRecords(): Promise<RunAnalyticsRecordV1[]> {
  const file = getRunAnalyticsPath();
  let raw: string;
  try {
    raw = await fs.readFile(file, "utf-8");
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return [];
    throw e;
  }
  const out: RunAnalyticsRecordV1[] = [];
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      const row = JSON.parse(t) as unknown;
      if (isRunAnalyticsRecordV1(row)) out.push(row);
    } catch {
      // skip bad line
    }
  }
  return out;
}
