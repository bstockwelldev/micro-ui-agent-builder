import { describe, expect, it } from "vitest";

import { createNoopTelemetry } from "../../../apps/web/lib/server/telemetry/noop";
import { wrapToolsWithTelemetry } from "../../../apps/web/lib/server/telemetry/tool-wrap";
import { beginRouteTrace, failTrace } from "../../../apps/web/lib/server/telemetry/with-trace";
import type { ServerTelemetry } from "../../../apps/web/lib/server/telemetry/types";

function createRecorderTelemetry() {
  const calls: Array<{ method: string; payload: unknown }> = [];
  const telemetry: ServerTelemetry = {
    startTrace(context) {
      calls.push({ method: "startTrace", payload: context });
    },
    recordModelEvent(traceId, event) {
      calls.push({ method: "recordModelEvent", payload: { traceId, event } });
    },
    recordToolEvent(traceId, event) {
      calls.push({ method: "recordToolEvent", payload: { traceId, event } });
    },
    captureError(traceId, error, metadata) {
      calls.push({
        method: "captureError",
        payload: { traceId, error, metadata },
      });
    },
    finishTrace(traceId, status, metadata) {
      calls.push({
        method: "finishTrace",
        payload: { traceId, status, metadata },
      });
    },
  };
  return { calls, telemetry };
}

describe("telemetry tool wrapper", () => {
  it("emits tool call start and finish events", async () => {
    const { calls, telemetry } = createRecorderTelemetry();
    const wrapped = wrapToolsWithTelemetry(
      {
        test_tool: {
          description: "test",
          execute: async () => "ok",
        },
      },
      telemetry,
      "trace-1",
    );

    const result = await wrapped.test_tool.execute?.();
    expect(result).toBe("ok");
    const events = calls.map((c) => c.method);
    expect(events).toEqual(["recordToolEvent", "recordToolEvent"]);
  });

  it("emits tool call error event on thrown tool error", async () => {
    const { calls, telemetry } = createRecorderTelemetry();
    const wrapped = wrapToolsWithTelemetry(
      {
        bad_tool: {
          execute: async () => {
            throw new Error("boom");
          },
        },
      },
      telemetry,
      "trace-2",
    );

    await expect(wrapped.bad_tool.execute?.()).rejects.toThrow("boom");
    const phases = calls.map(
      (c) => (c.payload as { event: { phase: string } }).event.phase,
    );
    expect(phases).toEqual(["tool_call_start", "tool_call_error"]);
  });
});

describe("trace helpers", () => {
  it("creates trace context from request header and captures failures", () => {
    const { calls, telemetry } = createRecorderTelemetry();
    const req = new Request("http://localhost/api/agent/run", {
      headers: { "x-trace-id": "trace-from-header" },
    });
    const trace = beginRouteTrace(req, "agent_run", telemetry);
    expect(trace.traceId).toBe("trace-from-header");
    const failure = failTrace(trace, "request_validate", "Expected messages array");
    expect(failure.error).toBe("Expected messages array");

    expect(calls[0]?.method).toBe("startTrace");
    expect(calls[1]?.method).toBe("captureError");
    expect(calls[2]?.method).toBe("finishTrace");
  });

  it("noop telemetry remains callable", () => {
    const noop = createNoopTelemetry();
    noop.startTrace({
      traceId: "t",
      kind: "agent_genui",
      flowId: null,
      agentId: null,
      runId: "r",
    });
    noop.recordModelEvent("t", { phase: "preflight" });
    noop.recordToolEvent("t", { phase: "tool_call_start", toolName: "x" });
    noop.captureError("t", "err");
    noop.finishTrace("t", "ok");
    expect(true).toBe(true);
  });
});
