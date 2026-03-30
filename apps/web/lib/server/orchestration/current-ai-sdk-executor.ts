import {
  convertToModelMessages,
  generateObject,
  streamText,
  type UIMessage,
} from "ai";
import { NextResponse } from "next/server";

import { genuiSurfaceSchema, type FlowStep } from "@repo/shared";

import { mergeAgentProfileIntoSystemPrompt } from "@/lib/server/agent-system-appendix";
import { buildToolSetForAgentRun } from "@/lib/server/agent-tools";
import { estimateUsdFromUsage } from "@/lib/server/estimate-llm-spend";
import {
  runFlowPreflight,
  stepsOrderedBeforeFirstLlm,
} from "@/lib/server/flow-preflight";
import { buildSystemPromptFromFlow } from "@/lib/server/flow-prompt";
import {
  augmentSystemWithFlowKnowledge,
  augmentSystemWithFlowKnowledgeForQuery,
} from "@/lib/server/flow-knowledge-rag";
import {
  getFlowKnowledgeEntry,
  readFlowKnowledgeRoot,
} from "@/lib/server/flow-knowledge-store";
import { requireLangfuseEnvIfEnabled } from "@/lib/server/langfuse-env";
import {
  missingProviderMessage,
  resolveLanguageModel,
  resolveOllamaLanguageModel,
  type ResolvedLanguageModel,
} from "@/lib/server/language-model";
import { appendRunAnalyticsRecord } from "@/lib/server/run-analytics-store";
import { RUN_ANALYTICS_V1 } from "@/lib/server/run-analytics-types";
import { wrapToolsWithTelemetry } from "@/lib/server/telemetry/tool-wrap";
import { beginRouteTrace, failTrace } from "@/lib/server/telemetry/with-trace";
import {
  getAgentById,
  getFlowById,
  readStudioStore,
} from "@/lib/server/studio-store";
import type {
  GenUiExecutorRequestBody,
  OrchestrationRouteExecutor,
  RunExecutorRequestBody,
} from "@/lib/server/orchestration/types";

const genuiSystemExtra = `You also emit a small JSON UI tree (GenUI) that matches the schema: a single root node with type Stack, Text, Button, Card, or FormField. Use Stack to group children. Keep the tree shallow (2–4 levels) for demos.`;

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

export class CurrentAiSdkOrchestrationExecutor
  implements OrchestrationRouteExecutor
{
  async executeRun(req: Request): Promise<Response> {
    const trace = beginRouteTrace(req, "agent_run");
    const { telemetry, traceId, runId } = trace;

    try {
      requireLangfuseEnvIfEnabled();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid Langfuse configuration.";
      return NextResponse.json({ error: message }, { status: 503 });
    }

    const envMissing = missingProviderMessage();
    if (envMissing) {
      const failed = failTrace(trace, "provider_precheck", envMissing);
      return NextResponse.json({ error: failed.error }, { status: 503 });
    }

    let body: RunExecutorRequestBody;
    try {
      body = await req.json();
    } catch {
      const failed = failTrace(trace, "request_parse", "Invalid JSON body");
      return NextResponse.json({ error: failed.error }, { status: 400 });
    }

    const messages = body.messages;
    if (!Array.isArray(messages)) {
      const failed = failTrace(trace, "request_validate", "Expected messages array");
      return NextResponse.json({ error: failed.error }, { status: 400 });
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
      failTrace(trace, "preflight", preflight.message);
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
      failTrace(trace, "model_selection", msg);
      return NextResponse.json({ error: msg }, { status: 503 });
    }
    telemetry.recordModelEvent(traceId, {
      phase: "model_selection",
      providerLabel: resolved.providerLabel,
      modelRef: modelRef ?? null,
      fallbackProviderLabel: resolved.fallbackLabel ?? null,
    });

    const coreMessages = await convertToModelMessages(messages as UIMessage[], {
      tools,
      ignoreIncompleteToolCalls: true,
    });

    const t0 = Date.now();
    telemetry.recordModelEvent(traceId, {
      phase: "generation_start",
      providerLabel: resolved.providerLabel,
      modelRef: modelRef ?? null,
    });

    const wrappedTools = wrapToolsWithTelemetry(tools, telemetry, traceId);

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

  async executeGenUi(req: Request): Promise<Response> {
    const trace = beginRouteTrace(req, "agent_genui");
    const { telemetry, traceId, runId } = trace;

    try {
      requireLangfuseEnvIfEnabled();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid Langfuse configuration.";
      return NextResponse.json({ error: message }, { status: 503 });
    }

    const envMissing = missingProviderMessage();
    if (envMissing) {
      const failed = failTrace(trace, "provider_precheck", envMissing);
      return NextResponse.json({ error: failed.error }, { status: 503 });
    }

    let body: GenUiExecutorRequestBody;
    try {
      body = await req.json();
    } catch {
      const failed = failTrace(trace, "request_parse", "Invalid JSON body");
      return NextResponse.json({ error: failed.error }, { status: 400 });
    }

    const userPrompt = body.instruction?.trim() ?? "";
    if (!userPrompt) {
      const failed = failTrace(
        trace,
        "request_validate",
        "Expected non-empty instruction string",
      );
      return NextResponse.json(
        { error: failed.error },
        { status: 400 },
      );
    }

    const store = await readStudioStore();
    const flow = getFlowById(store, body.flowId);
    let baseSystem = mergeAgentProfileIntoSystemPrompt(
      buildSystemPromptFromFlow(flow, store),
      getAgentById(store, body.agentId),
    );
    if (flow?.knowledgeBaseEnabled) {
      const kbRoot = await readFlowKnowledgeRoot();
      const kbEntry = getFlowKnowledgeEntry(kbRoot, flow.id);
      baseSystem = await augmentSystemWithFlowKnowledgeForQuery(
        baseSystem,
        kbEntry,
        userPrompt,
      );
    }
    const system = `${baseSystem}\n\n${genuiSystemExtra}`;

    const llmStep = flow?.steps.find((s) => s.type === "llm");
    telemetry.recordModelEvent(traceId, {
      phase: "preflight",
      modelRef: llmStep?.model ?? null,
      metadata: {
        hasKnowledgeBase: Boolean(flow?.knowledgeBaseEnabled),
      },
    });
    let resolved: ResolvedLanguageModel;
    try {
      resolved = resolveLanguageModel(llmStep?.model);
    } catch (e) {
      const msg =
        e instanceof Error && e.message === "NO_PROVIDER"
          ? missingProviderMessage()
          : e instanceof Error
            ? e.message
            : "Model resolution failed";
      failTrace(trace, "model_selection", msg);
      return NextResponse.json({ error: msg }, { status: 503 });
    }
    telemetry.recordModelEvent(traceId, {
      phase: "model_selection",
      providerLabel: resolved.providerLabel,
      modelRef: llmStep?.model ?? null,
      fallbackProviderLabel: resolved.fallbackLabel ?? null,
    });

    const t0 = Date.now();

    async function run(model: typeof resolved.model, label: string) {
      telemetry.recordModelEvent(traceId, {
        phase: "generation_start",
        providerLabel: label,
        modelRef: llmStep?.model ?? null,
      });
      const { object, usage } = await generateObject({
        model,
        schema: genuiSurfaceSchema,
        system,
        prompt: userPrompt,
      });
      console.log(
        JSON.stringify({
          event: "agent_genui_finish",
          traceId,
          runId,
          flowId: body.flowId ?? null,
          provider: label,
          durationMs: Date.now() - t0,
          usage,
        }),
      );
      telemetry.recordModelEvent(traceId, {
        phase: "generation_finish",
        providerLabel: label,
        modelRef: llmStep?.model ?? null,
        usage,
        finishReason: "stop",
      });
      return object;
    }

    function extraOllamaIfNeeded() {
      if (resolved.providerLabel.startsWith("ollama:")) return null;
      if (resolved.fallbackLabel?.startsWith("ollama:")) return null;
      return resolveOllamaLanguageModel(llmStep?.model);
    }

    try {
      const object = await run(resolved.model, resolved.providerLabel);
      telemetry.finishTrace(traceId, "ok", { durationMs: Date.now() - t0 });
      return NextResponse.json({ surface: object, metadata: { traceId } });
    } catch (first) {
      if (!resolved.fallback || !resolved.fallbackLabel) {
        const ollama = extraOllamaIfNeeded();
        if (ollama) {
          try {
            const object = await run(ollama.model, ollama.providerLabel);
            telemetry.finishTrace(traceId, "ok", { durationMs: Date.now() - t0 });
            return NextResponse.json({
              surface: object,
              usedFallback: true,
              fallbackProvider: ollama.providerLabel,
              metadata: { traceId },
            });
          } catch (ollamaErr) {
            const message =
              ollamaErr instanceof Error
                ? ollamaErr.message
                : "generateObject failed";
            telemetry.captureError(traceId, ollamaErr, { stage: "generate_fallback" });
            telemetry.finishTrace(traceId, "error", { durationMs: Date.now() - t0 });
            return NextResponse.json({ error: message }, { status: 502 });
          }
        }
        const message =
          first instanceof Error ? first.message : "generateObject failed";
        telemetry.captureError(traceId, first, { stage: "generate_primary" });
        telemetry.finishTrace(traceId, "error", { durationMs: Date.now() - t0 });
        return NextResponse.json({ error: message }, { status: 502 });
      }
      try {
        const object = await run(resolved.fallback, resolved.fallbackLabel);
        telemetry.finishTrace(traceId, "ok", { durationMs: Date.now() - t0 });
        return NextResponse.json({
          surface: object,
          usedFallback: true,
          fallbackProvider: resolved.fallbackLabel,
          metadata: { traceId },
        });
      } catch (second) {
        const ollama = extraOllamaIfNeeded();
        if (ollama) {
          try {
            const object = await run(ollama.model, ollama.providerLabel);
            telemetry.finishTrace(traceId, "ok", { durationMs: Date.now() - t0 });
            return NextResponse.json({
              surface: object,
              usedFallback: true,
              fallbackProvider: ollama.providerLabel,
              metadata: { traceId },
            });
          } catch (third) {
            const message =
              third instanceof Error ? third.message : "generateObject failed";
            telemetry.captureError(traceId, third, { stage: "generate_ollama_fallback" });
            telemetry.finishTrace(traceId, "error", { durationMs: Date.now() - t0 });
            return NextResponse.json({ error: message }, { status: 502 });
          }
        }
        const message =
          second instanceof Error ? second.message : "generateObject failed";
        telemetry.captureError(traceId, second, { stage: "generate_secondary_fallback" });
        telemetry.finishTrace(traceId, "error", { durationMs: Date.now() - t0 });
        return NextResponse.json({ error: message }, { status: 502 });
      }
    }
  }
}
