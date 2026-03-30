import {
  convertToModelMessages,
  streamText,
  type UIMessage,
} from "ai";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { buildToolSetForAgentRun } from "@/lib/server/agent-tools";
import {
  runFlowPreflight,
  stepsOrderedBeforeFirstLlm,
} from "@/lib/server/flow-preflight";
import { buildSystemPromptFromFlow } from "@/lib/server/flow-prompt";
import { augmentSystemWithFlowKnowledge } from "@/lib/server/flow-knowledge-rag";
import {
  getFlowKnowledgeEntry,
  readFlowKnowledgeRoot,
} from "@/lib/server/flow-knowledge-store";
import {
  missingProviderMessage,
  resolveLanguageModel,
  resolveOllamaLanguageModel,
} from "@/lib/server/language-model";
import { mergeAgentProfileIntoSystemPrompt } from "@/lib/server/agent-system-appendix";
import { estimateUsdFromUsage } from "@/lib/server/estimate-llm-spend";
import { appendRunAnalyticsRecord } from "@/lib/server/run-analytics-store";
import { RUN_ANALYTICS_V1 } from "@/lib/server/run-analytics-types";
import { requireLangfuseEnvIfEnabled } from "@/lib/server/langfuse-env";
import { getServerTelemetry } from "@/lib/server/telemetry/noop";
import {
  getAgentById,
  getFlowById,
  readStudioStore,
} from "@/lib/server/studio-store";
import type { FlowStep } from "@repo/shared";
import type { ToolSet } from "ai";

export const maxDuration = 60;

function firstPrimaryModelStep(
  steps: FlowStep[] | undefined,
): FlowStep | undefined {
  if (!steps?.length) return undefined;
  const ordered = [...steps].sort((a, b) => a.order - b.order);
  return ordered.find((s) => s.type === "llm" || s.type === "tool_loop");
}

function maxStepsForPrimaryStep(step: FlowStep | undefined): number | undefined {
  if (!step) return undefined;
  if (step.type === "tool_loop" && step.maxToolIterations != null) {
    return step.maxToolIterations;
  }
  if (
    step.type === "llm" &&
    step.maxToolIterations != null &&
    step.maxToolIterations >= 2
  ) {
    return step.maxToolIterations;
  }
  return undefined;
}

export async function POST(req: Request) {
  const traceId = req.headers.get("x-trace-id")?.trim() || randomUUID();
  const runId = randomUUID();
  const telemetry = getServerTelemetry();
  telemetry.startTrace({
    traceId,
    kind: "agent_run",
    flowId: null,
    agentId: null,
    runId,
  });

  try {
    requireLangfuseEnvIfEnabled();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid Langfuse configuration.";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  const envMissing = missingProviderMessage();
  if (envMissing) {
    telemetry.captureError(traceId, envMissing, { stage: "provider_precheck" });
    telemetry.finishTrace(traceId, "error", { stage: "provider_precheck" });
    return NextResponse.json({ error: envMissing }, { status: 503 });
  }

  let body: {
    messages?: UIMessage[];
    flowId?: string;
    /** When set, merges that agent profile into the system prompt after the flow text. */
    agentId?: string;
    /** When true, use Ollama (OLLAMA_BASE_URL) for this request only. */
    preferOllama?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    telemetry.captureError(traceId, "Invalid JSON body", { stage: "request_parse" });
    telemetry.finishTrace(traceId, "error", { stage: "request_parse" });
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const messages = body.messages;
  if (!Array.isArray(messages)) {
    telemetry.captureError(traceId, "Expected messages array", {
      stage: "request_validate",
    });
    telemetry.finishTrace(traceId, "error", { stage: "request_validate" });
    return NextResponse.json({ error: "Expected messages array" }, { status: 400 });
  }

  const store = await readStudioStore();
  const flow = getFlowById(store, body.flowId);
  const agent = getAgentById(store, body.agentId);
  const baseSystem = mergeAgentProfileIntoSystemPrompt(
    buildSystemPromptFromFlow(flow, store),
    agent,
  );

  const preflight = runFlowPreflight({
    stepsBeforeLlm: stepsOrderedBeforeFirstLlm(flow?.steps),
    compiledSystemPrompt: baseSystem,
    messages,
  });
  if (preflight) {
    telemetry.captureError(traceId, preflight.message, {
      stage: "preflight",
      code: preflight.code,
    });
    telemetry.finishTrace(traceId, "error", {
      stage: "preflight",
      code: preflight.code,
    });
    return NextResponse.json(
      { error: preflight.message, code: preflight.code, details: preflight.details },
      { status: 400 },
    );
  }

  let system = baseSystem;
  if (flow?.knowledgeBaseEnabled) {
    const kbRoot = await readFlowKnowledgeRoot();
    const kbEntry = getFlowKnowledgeEntry(kbRoot, flow.id);
    system = await augmentSystemWithFlowKnowledge(system, kbEntry, messages);
  }

  const { tools, appendix } = await buildToolSetForAgentRun(
    store,
    flow,
    body.flowId,
  );
  if (appendix) {
    system += appendix;
  }

  const primaryStep = firstPrimaryModelStep(flow?.steps);
  const modelRef = primaryStep?.model;
  const maxSteps = maxStepsForPrimaryStep(primaryStep);
  telemetry.recordModelEvent(traceId, {
    phase: "preflight",
    modelRef: modelRef ?? null,
    metadata: {
      hasKnowledgeBase: Boolean(flow?.knowledgeBaseEnabled),
      toolCount: Object.keys(tools).length,
    },
  });

  let resolved;
  try {
    if (body.preferOllama) {
      const ollama = resolveOllamaLanguageModel(modelRef);
      if (!ollama) {
        return NextResponse.json(
          {
            error:
              "Ollama fallback requested but OLLAMA_BASE_URL is not set (or is invalid).",
          },
          { status: 503 },
        );
      }
      resolved = ollama;
    } else {
      resolved = resolveLanguageModel(modelRef);
    }
  } catch (e) {
    const msg =
      e instanceof Error && e.message === "NO_PROVIDER"
        ? missingProviderMessage()
        : e instanceof Error
          ? e.message
          : "Model resolution failed";
    telemetry.captureError(traceId, msg, { stage: "model_selection" });
    telemetry.finishTrace(traceId, "error", { stage: "model_selection" });
    return NextResponse.json({ error: msg }, { status: 503 });
  }
  telemetry.recordModelEvent(traceId, {
    phase: "model_selection",
    providerLabel: resolved.providerLabel,
    modelRef: modelRef ?? null,
    fallbackProviderLabel: resolved.fallbackLabel ?? null,
  });

  const coreMessages = await convertToModelMessages(messages, {
    tools,
    ignoreIncompleteToolCalls: true,
  });

  const t0 = Date.now();
  telemetry.recordModelEvent(traceId, {
    phase: "generation_start",
    providerLabel: resolved.providerLabel,
    modelRef: modelRef ?? null,
  });

  const wrappedTools: ToolSet = Object.fromEntries(
    Object.entries(tools).map(([toolName, toolDef]) => {
      if (!toolDef || typeof toolDef !== "object" || !("execute" in toolDef)) {
        return [toolName, toolDef];
      }
      const execute = (toolDef as { execute?: unknown }).execute;
      if (typeof execute !== "function") return [toolName, toolDef];
      const wrapped = async (...args: unknown[]) => {
        telemetry.recordToolEvent(traceId, {
          phase: "tool_call_start",
          toolName,
        });
        try {
          const value = await execute(...args);
          telemetry.recordToolEvent(traceId, {
            phase: "tool_call_finish",
            toolName,
          });
          return value;
        } catch (error) {
          telemetry.recordToolEvent(traceId, {
            phase: "tool_call_error",
            toolName,
            metadata: {
              error: error instanceof Error ? error.message : String(error),
            },
          });
          throw error;
        }
      };
      return [toolName, { ...toolDef, execute: wrapped }];
    }),
  );

  const result = streamText({
    model: resolved.model,
    system,
    messages: coreMessages,
    tools: Object.keys(wrappedTools).length > 0 ? wrappedTools : undefined,
    temperature: primaryStep?.temperature,
    maxOutputTokens: primaryStep?.maxTokens,
    topP: primaryStep?.topP,
    toolChoice: primaryStep?.toolChoice,
    ...(maxSteps != null ? { maxSteps } : {}),
    onFinish: (event) => {
      const usage = event.usage;
      const inputTokens = usage.inputTokens ?? 0;
      const outputTokens = usage.outputTokens ?? 0;
      const totalTokens =
        usage.totalTokens ?? inputTokens + outputTokens;
      const modelRefForPricing = modelRef ?? "";
      const estimatedUsd = estimateUsdFromUsage({
        providerLabel: resolved.providerLabel,
        modelRef: modelRefForPricing,
        inputTokens,
        outputTokens,
        totalTokens,
      });

      telemetry.recordModelEvent(traceId, {
        phase: "generation_finish",
        providerLabel: resolved.providerLabel,
        modelRef: modelRef ?? null,
        finishReason: String(event.finishReason ?? ""),
        usage,
      });
      console.log(
        JSON.stringify({
          event: "agent_run_finish",
          traceId,
          runId,
          flowId: body.flowId ?? null,
          agentId: body.agentId ?? null,
          provider: resolved.providerLabel,
          fallbackAvailable: Boolean(resolved.fallback),
          durationMs: Date.now() - t0,
          usage: event.usage,
          finishReason: event.finishReason,
        }),
      );

      void appendRunAnalyticsRecord({
        v: RUN_ANALYTICS_V1,
        runId,
        at: new Date().toISOString(),
        flowId: body.flowId ?? null,
        agentId: body.agentId ?? null,
        modelRef: modelRef ?? null,
        providerLabel: resolved.providerLabel,
        inputTokens,
        outputTokens,
        totalTokens,
        estimatedUsd,
        durationMs: Date.now() - t0,
        finishReason: String(event.finishReason ?? ""),
      }).catch((err) => {
        console.error("[run-analytics] append failed", err);
      });
      telemetry.finishTrace(traceId, "ok", {
        durationMs: Date.now() - t0,
      });
    },
  });

  return result.toUIMessageStreamResponse({
    headers: {
      "x-trace-id": traceId,
    },
    messageMetadata: () => ({
      traceId,
    }),
  });
}
