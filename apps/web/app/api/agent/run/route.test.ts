import { afterEach, describe, expect, it, vi } from "vitest";
import {
  expectJsonErrorEnvelope,
  expectTraceMetadataIsAdditive,
  jsonResponse,
} from "@/app/api/agent/test-utils/response-assertions";

const executeRun = vi.fn<(req: Request) => Promise<Response>>();

vi.mock("@/lib/server/orchestration/executor", () => ({
  resolveOrchestrationExecutor: () => ({
    executeRun,
    executeGenUi: vi.fn(),
  }),
}));

import { POST } from "./route";

afterEach(() => {
  executeRun.mockReset();
  delete process.env.AGENT_ORCHESTRATION_EXECUTOR;
});

describe("POST /api/agent/run route", () => {
  it("passes through success envelope with default backend", async () => {
    process.env.AGENT_ORCHESTRATION_EXECUTOR = "current-ai-sdk";
    executeRun.mockResolvedValue(
      jsonResponse(200, {
        runId: "run-1",
        messages: [],
        trace: { spanId: "abc123" },
      }),
    );

    const response = await POST(new Request("http://localhost/api/agent/run"));
    const parsed = (await response.json()) as {
      runId: string;
      messages: unknown[];
      trace?: { spanId?: string };
    };

    expect(response.status).toBe(200);
    expect(parsed.runId).toBe("run-1");
    expect(Array.isArray(parsed.messages)).toBe(true);
    expect(parsed.trace?.spanId).toBe("abc123");
    expect(executeRun).toHaveBeenCalledTimes(1);
  });

  it("passes through failure envelope with next backend", async () => {
    process.env.AGENT_ORCHESTRATION_EXECUTOR = "next-ai-sdk";
    executeRun.mockResolvedValue(
      jsonResponse(503, { error: "No LLM API key configured." }),
    );

    const response = await POST(new Request("http://localhost/api/agent/run"));

    await expectJsonErrorEnvelope(response, 503, "No LLM API key configured.");
  });

  it("preserves backward-compatible error envelope when trace metadata is additive", async () => {
    executeRun.mockResolvedValue(
      jsonResponse(400, {
        error: "Expected messages array",
        code: "BAD_INPUT",
        trace: { traceId: "tr_123", backend: "next-ai-sdk" },
      }),
    );

    const response = await POST(new Request("http://localhost/api/agent/run"));
    const body = (await response.json()) as {
      error: string;
      code?: string;
      trace?: Record<string, string>;
    };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Expected messages array");
    expect(body.code).toBe("BAD_INPUT");
    expectTraceMetadataIsAdditive(body, "tr_123");
  });
});
