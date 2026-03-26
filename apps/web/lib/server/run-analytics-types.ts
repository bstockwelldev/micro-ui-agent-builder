export const RUN_ANALYTICS_V1 = 1 as const;

export type RunAnalyticsRecordV1 = {
  v: typeof RUN_ANALYTICS_V1;
  runId: string;
  at: string;
  flowId: string | null;
  agentId: string | null;
  modelRef: string | null;
  providerLabel: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedUsd: number;
  durationMs: number;
  finishReason: string;
};

export function isRunAnalyticsRecordV1(
  row: unknown,
): row is RunAnalyticsRecordV1 {
  if (!row || typeof row !== "object") return false;
  const r = row as Record<string, unknown>;
  return (
    r.v === RUN_ANALYTICS_V1 &&
    typeof r.runId === "string" &&
    typeof r.at === "string"
  );
}
