import { afterEach, describe, expect, it, vi } from "vitest";

const executeGenUi = vi.fn<(req: Request) => Promise<Response>>();

vi.mock("@/lib/server/orchestration/executor", () => ({
  resolveOrchestrationExecutor: () => ({
    executeRun: vi.fn(),
    executeGenUi,
  }),
}));

import { POST } from "./route";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  executeGenUi.mockReset();
  delete process.env.AGENT_ORCHESTRATION_EXECUTOR;
});

describe("POST /api/agent/genui route", () => {
  it("returns success envelope for default backend", async () => {
    process.env.AGENT_ORCHESTRATION_EXECUTOR = "current-ai-sdk";
    executeGenUi.mockResolvedValue(
      json(200, {
        surface: { root: { type: "Text", props: { content: "Hello" } } },
      }),
    );

    const response = await POST(new Request("http://localhost/api/agent/genui"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      surface: { root: { type: "Text", props: { content: "Hello" } } },
    });
  });

  it("returns fallback envelope for next backend without breaking existing parsing", async () => {
    process.env.AGENT_ORCHESTRATION_EXECUTOR = "next-ai-sdk";
    executeGenUi.mockResolvedValue(
      json(200, {
        surface: { root: { type: "Stack", children: [] } },
        usedFallback: true,
        fallbackProvider: "ollama:llama3.2",
        trace: { traceId: "trc_1" },
      }),
    );

    const response = await POST(new Request("http://localhost/api/agent/genui"));
    const body = (await response.json()) as {
      surface: unknown;
      usedFallback?: boolean;
      fallbackProvider?: string;
      trace?: { traceId?: string };
    };

    expect(response.status).toBe(200);
    expect(body.surface).toBeTruthy();
    expect(body.usedFallback).toBe(true);
    expect(body.fallbackProvider).toBe("ollama:llama3.2");
    expect(body.trace?.traceId).toBe("trc_1");
  });

  it("returns failure envelope with stable HTTP status code", async () => {
    executeGenUi.mockResolvedValue(json(502, { error: "generateObject failed" }));

    const response = await POST(new Request("http://localhost/api/agent/genui"));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "generateObject failed" });
  });
});
