import { describe, expect, it } from "vitest";

import { buildDashboardCommandCenterPayload } from "./dashboard-command-center.js";
import { parseStudioStore } from "./schemas.js";

const baseAnalytics = {
  totals: {
    invocations: 0,
    totalTokens: 0,
    estimatedUsd: 0,
    avgDurationMs: 0,
  },
  daily: [] as { date: string; tokens: number; estimatedUsd: number }[],
};

function minimalFlow(
  id: string,
  name: string,
  updatedAt?: string,
) {
  return {
    id,
    name,
    steps: [{ id: "s1", type: "llm" as const, order: 0, model: "openai/gpt-4o-mini" }],
    updatedAt,
  };
}

describe("buildDashboardCommandCenterPayload", () => {
  it("empty store and no runs yields empty signals", () => {
    const store = parseStudioStore({
      flows: [],
      prompts: [],
      tools: [],
      mcpServers: [],
      agents: [],
    });
    const out = buildDashboardCommandCenterPayload(store, [], baseAnalytics, {
      nowMs: Date.parse("2025-03-01T00:00:00.000Z"),
    });
    expect(out.hasFlows).toBe(false);
    expect(out.hasAnalytics).toBe(false);
    expect(out.counts.flows).toBe(0);
    expect(out.recentFlows).toHaveLength(0);
    expect(out.recentRuns).toHaveLength(0);
    expect(out.metrics.healthSubtext).toBe("No runs recorded yet");
  });

  it("single flow appears in recent flows with resume link", () => {
    const store = parseStudioStore({
      flows: [
        minimalFlow("f1", "Only Flow", "2025-02-01T01:00:00.000Z"),
      ],
      prompts: [],
      tools: [],
      mcpServers: [],
      agents: [],
    });
    const out = buildDashboardCommandCenterPayload(store, [], baseAnalytics, {
      nowMs: Date.parse("2025-02-10T00:00:00.000Z"),
    });
    expect(out.hasFlows).toBe(true);
    expect(out.recentFlows).toHaveLength(1);
    expect(out.recentFlows[0].name).toBe("Only Flow");
    expect(out.recentFlows[0].resumeHref).toContain("flowId=f1");
  });

  it("sorts recent runs by at descending", () => {
    const store = parseStudioStore({
      flows: [
        minimalFlow("fx", "Fx", "2025-01-01T00:00:00.000Z"),
      ],
      prompts: [],
      tools: [],
      mcpServers: [],
      agents: [],
    });
    const records = [
      {
        runId: "older",
        at: "2025-01-10T10:00:00.000Z",
        flowId: "fx" as string | null,
        totalTokens: 10,
        estimatedUsd: 0,
        durationMs: 100,
        finishReason: "stop",
      },
      {
        runId: "newer",
        at: "2025-01-12T15:00:00.000Z",
        flowId: "fx",
        totalTokens: 20,
        estimatedUsd: 0,
        durationMs: 200,
        finishReason: "stop",
      },
      {
        runId: "mid",
        at: "2025-01-11T12:00:00.000Z",
        flowId: null,
        totalTokens: 5,
        estimatedUsd: 0,
        durationMs: 50,
        finishReason: "error",
      },
    ];
    const analytics = {
      totals: {
        invocations: 3,
        totalTokens: 35,
        estimatedUsd: 0.01,
        avgDurationMs: 120,
      },
      daily: [
        { date: "2025-01-12", tokens: 20, estimatedUsd: 0.005 },
        { date: "2025-01-11", tokens: 15, estimatedUsd: 0.005 },
      ],
    };
    const out = buildDashboardCommandCenterPayload(store, records, analytics, {
      nowMs: Date.parse("2025-01-15T00:00:00.000Z"),
      recentRunLimit: 5,
    });
    expect(out.hasAnalytics).toBe(true);
    expect(out.recentRuns.map((r) => r.runId)).toEqual([
      "newer",
      "mid",
      "older",
    ]);
    expect(out.recentRuns[0].runHref).toContain("/runs/newer");
    expect(out.recentRuns[0].flowName).toBe("Fx");
  });
});
