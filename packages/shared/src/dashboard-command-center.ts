import type { FlowDocument, StudioStore } from "./schemas.js";

/** Minimal run row for dashboard aggregation (mirrors server analytics record fields we use). */
export type DashboardRunRecordInput = {
  runId: string;
  at: string;
  flowId: string | null;
  totalTokens: number;
  estimatedUsd: number;
  durationMs: number;
  finishReason: string;
};

export type DashboardStoreCounts = {
  flows: number;
  agents: number;
  prompts: number;
  tools: number;
  mcpServers: number;
};

export type DashboardRecentFlowRow = {
  id: string;
  name: string;
  updatedRelative: string;
  resumeHref: string;
};

export type DashboardRecentRunRow = {
  runId: string;
  atIso: string;
  atRelative: string;
  flowId: string | null;
  flowName: string | null;
  finishReason: string;
  totalTokens: number;
  runHref: string;
};

export type DashboardActiveAgentRow = {
  id: string;
  name: string;
  detailHref: string;
};

export type DashboardCommandCenterPayload = {
  counts: DashboardStoreCounts;
  hasFlows: boolean;
  hasAnalytics: boolean;
  recentFlows: DashboardRecentFlowRow[];
  recentRuns: DashboardRecentRunRow[];
  metrics: {
    tokenVelocityLabel: string;
    tokenSparkline: number[];
    costPer1kLabel: string;
    costSparkline: number[];
    healthPercent: number;
    healthSubtext: string | null;
  };
  activeAgents: DashboardActiveAgentRow[];
};

export type BuildDashboardAnalyticsInput = {
  totals: {
    invocations: number;
    totalTokens: number;
    estimatedUsd: number;
    avgDurationMs: number;
  };
  daily: { date: string; tokens: number; estimatedUsd: number }[];
};

function flowSortKey(f: FlowDocument): number {
  if (!f.updatedAt) return 0;
  const t = Date.parse(f.updatedAt);
  return Number.isNaN(t) ? 0 : t;
}

function formatRelativeShort(iso: string, nowMs: number): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  const diffMs = Math.max(0, nowMs - t);
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function normalizeSparkline(values: number[]): number[] {
  if (values.length === 0) return [];
  const max = Math.max(...values, 1e-9);
  return values.map((v) => Math.round((v / max) * 100));
}

function formatTokenVelocity(tokensLastWindow: number, windowMinutes: number): string {
  if (windowMinutes <= 0) return "0/min";
  const perMin = tokensLastWindow / windowMinutes;
  if (perMin >= 1000) return `${(perMin / 1000).toFixed(1)}k/min`;
  if (perMin >= 100) return `${Math.round(perMin)}/min`;
  return `${perMin.toFixed(1)}/min`;
}

function formatUsd(n: number): string {
  if (n >= 100) return `$${n.toFixed(0)}`;
  if (n >= 10) return `$${n.toFixed(1)}`;
  return `$${n.toFixed(2)}`;
}

function isSuccessfulFinish(finishReason: string): boolean {
  const r = finishReason.toLowerCase();
  if (r.includes("error") || r.includes("fail")) return false;
  return true;
}

function flowNameMap(store: StudioStore): Map<string, string> {
  const m = new Map<string, string>();
  for (const f of store.flows) m.set(f.id, f.name);
  return m;
}

export function buildDashboardCommandCenterPayload(
  store: StudioStore,
  records: DashboardRunRecordInput[],
  analytics: BuildDashboardAnalyticsInput,
  options?: {
    nowMs?: number;
    recentFlowLimit?: number;
    recentRunLimit?: number;
    activeAgentLimit?: number;
    healthSampleSize?: number;
  },
): DashboardCommandCenterPayload {
  const nowMs = options?.nowMs ?? Date.now();
  const recentFlowLimit = options?.recentFlowLimit ?? 3;
  const recentRunLimit = options?.recentRunLimit ?? 8;
  const activeAgentLimit = options?.activeAgentLimit ?? 4;
  const healthSampleSize = options?.healthSampleSize ?? 24;

  const names = flowNameMap(store);

  const counts: DashboardStoreCounts = {
    flows: store.flows.length,
    agents: store.agents.length,
    prompts: store.prompts.length,
    tools: store.tools.length,
    mcpServers: store.mcpServers.length,
  };

  const hasFlows = counts.flows > 0;
  const hasAnalytics = records.length > 0;

  const sortedFlows = [...store.flows].sort(
    (a, b) => flowSortKey(b) - flowSortKey(a),
  );
  const recentFlows: DashboardRecentFlowRow[] = sortedFlows
    .slice(0, recentFlowLimit)
    .map((f) => ({
      id: f.id,
      name: f.name,
      updatedRelative: f.updatedAt
        ? formatRelativeShort(f.updatedAt, nowMs)
        : "—",
      resumeHref: `/flows?flowId=${encodeURIComponent(f.id)}`,
    }));

  const sortedRuns = [...records].sort(
    (a, b) => Date.parse(b.at) - Date.parse(a.at),
  );
  const recentRuns: DashboardRecentRunRow[] = sortedRuns
    .slice(0, recentRunLimit)
    .map((r) => ({
      runId: r.runId,
      atIso: r.at,
      atRelative: formatRelativeShort(r.at, nowMs),
      flowId: r.flowId,
      flowName: r.flowId ? (names.get(r.flowId) ?? r.flowId) : null,
      finishReason: r.finishReason,
      totalTokens: r.totalTokens,
      runHref: `/runs/${encodeURIComponent(r.runId)}`,
    }));

  const dailyTokens =
    analytics.daily.length > 0
      ? analytics.daily.map((d) => d.tokens)
      : analytics.totals.totalTokens > 0
        ? [analytics.totals.totalTokens]
        : [];
  const dailyCost =
    analytics.daily.length > 0
      ? analytics.daily.map((d) => d.estimatedUsd)
      : analytics.totals.estimatedUsd > 0
        ? [analytics.totals.estimatedUsd]
        : [];
  const tokenSparkline = normalizeSparkline(dailyTokens);
  const costSparkline = normalizeSparkline(dailyCost);

  const windowDays = analytics.daily.length > 0 ? analytics.daily.length : 7;
  const windowMinutes = windowDays * 24 * 60;
  const tokensInWindow =
    dailyTokens.length > 0
      ? dailyTokens.reduce((a, b) => a + b, 0)
      : analytics.totals.totalTokens;
  const tokenVelocityLabel = formatTokenVelocity(tokensInWindow, windowMinutes);

  const inv = Math.max(0, analytics.totals.invocations);
  const costPer1k =
    inv > 0 ? (analytics.totals.estimatedUsd / inv) * 1000 : 0;
  const costPer1kLabel = `${formatUsd(costPer1k)}/1k runs`;

  const healthSample = sortedRuns.slice(0, healthSampleSize);
  let healthPercent = 100;
  let healthSubtext: string | null = null;
  if (healthSample.length > 0) {
    const ok = healthSample.filter((r) => isSuccessfulFinish(r.finishReason))
      .length;
    healthPercent = Math.round((ok / healthSample.length) * 1000) / 10;
    const bad = healthSample.length - ok;
    if (bad > 0) {
      healthSubtext = `${bad} non-success finish${bad === 1 ? "" : "es"} in last ${healthSample.length} runs`;
    }
  } else {
    healthSubtext = "No runs recorded yet";
  }

  const activeAgents: DashboardActiveAgentRow[] = store.agents
    .slice(0, activeAgentLimit)
    .map((a) => ({
      id: a.id,
      name: a.name,
      detailHref: "/agents",
    }));

  return {
    counts,
    hasFlows,
    hasAnalytics,
    recentFlows,
    recentRuns,
    metrics: {
      tokenVelocityLabel,
      tokenSparkline,
      costPer1kLabel,
      costSparkline,
      healthPercent,
      healthSubtext,
    },
    activeAgents,
  };
}
