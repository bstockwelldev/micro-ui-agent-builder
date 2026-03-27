import {
  buildDashboardCommandCenterPayload,
  type DashboardCommandCenterPayload,
  type DashboardRunRecordInput,
} from "@repo/shared";

import { buildAnalyticsDashboard } from "./analytics-dashboard";
import { readRunAnalyticsRecords } from "./run-analytics-store";
import { readStudioStore } from "./studio-store";

function mapRecordsToInputs(
  records: Awaited<ReturnType<typeof readRunAnalyticsRecords>>,
): DashboardRunRecordInput[] {
  return records.map((r) => ({
    runId: r.runId,
    at: r.at,
    flowId: r.flowId,
    totalTokens: r.totalTokens,
    estimatedUsd: r.estimatedUsd,
    durationMs: r.durationMs,
    finishReason: r.finishReason,
  }));
}

export async function getDashboardCommandCenterData(): Promise<DashboardCommandCenterPayload> {
  const [records, store] = await Promise.all([
    readRunAnalyticsRecords(),
    readStudioStore(),
  ]);

  const analytics = buildAnalyticsDashboard(records, store, {
    maxDailyDays: 7,
    maxFlows: 5,
  });

  const inputs = mapRecordsToInputs(records);

  return buildDashboardCommandCenterPayload(store, inputs, {
    totals: {
      invocations: analytics.totals.invocations,
      totalTokens: analytics.totals.totalTokens,
      estimatedUsd: analytics.totals.estimatedUsd,
      avgDurationMs: analytics.totals.avgDurationMs,
    },
    daily: analytics.daily.map((d) => ({
      date: d.date,
      tokens: d.tokens,
      estimatedUsd: d.estimatedUsd,
    })),
  });
}
