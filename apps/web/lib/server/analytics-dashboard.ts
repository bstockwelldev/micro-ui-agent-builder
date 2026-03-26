import type { StudioStore } from "@repo/shared";

import type { RunAnalyticsRecordV1 } from "./run-analytics-types";
import { readRunAnalyticsRecords } from "./run-analytics-store";
import { readStudioStore } from "./studio-store";

export type AnalyticsDailyPoint = {
  date: string;
  invocations: number;
  tokens: number;
  estimatedUsd: number;
};

export type AnalyticsFlowRow = {
  flowId: string | null;
  name: string;
  invocations: number;
  tokens: number;
  estimatedUsd: number;
};

export type AnalyticsDashboardPayload = {
  totals: {
    invocations: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedUsd: number;
    avgDurationMs: number;
  };
  daily: AnalyticsDailyPoint[];
  byFlow: AnalyticsFlowRow[];
};

function flowNameMap(store: StudioStore): Map<string, string> {
  const m = new Map<string, string>();
  for (const f of store.flows) {
    m.set(f.id, f.name);
  }
  return m;
}

/** UTC date key YYYY-MM-DD */
function dayKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export function buildAnalyticsDashboard(
  records: RunAnalyticsRecordV1[],
  store: StudioStore,
  options?: { maxDailyDays?: number; maxFlows?: number },
): AnalyticsDashboardPayload {
  const maxDailyDays = options?.maxDailyDays ?? 30;
  const maxFlows = options?.maxFlows ?? 12;
  const names = flowNameMap(store);

  let inputTokens = 0;
  let outputTokens = 0;
  let totalTokens = 0;
  let estimatedUsd = 0;
  let durationSum = 0;

  const dailyMap = new Map<
    string,
    { invocations: number; tokens: number; estimatedUsd: number }
  >();
  const flowMap = new Map<
    string | null,
    { invocations: number; tokens: number; estimatedUsd: number }
  >();

  for (const r of records) {
    inputTokens += r.inputTokens;
    outputTokens += r.outputTokens;
    totalTokens += r.totalTokens;
    estimatedUsd += r.estimatedUsd;
    durationSum += r.durationMs;

    const dk = dayKey(r.at);
    const d0 = dailyMap.get(dk) ?? {
      invocations: 0,
      tokens: 0,
      estimatedUsd: 0,
    };
    d0.invocations += 1;
    d0.tokens += r.totalTokens;
    d0.estimatedUsd += r.estimatedUsd;
    dailyMap.set(dk, d0);

    const fk = r.flowId;
    const f0 = flowMap.get(fk) ?? {
      invocations: 0,
      tokens: 0,
      estimatedUsd: 0,
    };
    f0.invocations += 1;
    f0.tokens += r.totalTokens;
    f0.estimatedUsd += r.estimatedUsd;
    flowMap.set(fk, f0);
  }

  const invocations = records.length;
  const avgDurationMs =
    invocations > 0 ? Math.round(durationSum / invocations) : 0;

  const sortedDays = Array.from(dailyMap.keys()).sort();
  const tailDays = sortedDays.slice(-maxDailyDays);
  const daily: AnalyticsDailyPoint[] = tailDays.map((date) => {
    const v = dailyMap.get(date)!;
    return {
      date,
      invocations: v.invocations,
      tokens: v.tokens,
      estimatedUsd: v.estimatedUsd,
    };
  });

  const byFlow: AnalyticsFlowRow[] = Array.from(flowMap.entries())
    .map(([flowId, v]) => ({
      flowId,
      name: flowId
        ? (names.get(flowId) ?? flowId)
        : "Default / unspecified flow",
      invocations: v.invocations,
      tokens: v.tokens,
      estimatedUsd: v.estimatedUsd,
    }))
    .sort((a, b) => b.invocations - a.invocations)
    .slice(0, maxFlows);

  return {
    totals: {
      invocations,
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedUsd,
      avgDurationMs,
    },
    daily,
    byFlow,
  };
}

export async function getAnalyticsDashboard(): Promise<AnalyticsDashboardPayload> {
  const [records, store] = await Promise.all([
    readRunAnalyticsRecords(),
    readStudioStore(),
  ]);
  return buildAnalyticsDashboard(records, store);
}
