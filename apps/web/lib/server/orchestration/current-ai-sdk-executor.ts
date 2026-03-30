import {
  convertToModelMessages,
  generateObject,
  streamText,
  type UIMessage,
} from "ai";
import { randomUUID } from "node:crypto";
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
    try {
      requireLangfuseEnvIfEnabled();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid Langfuse configuration.";
      return NextResponse.json({ error: message }, { status: 503 });
    }

    const envMissing = missingProviderMessage();
    if (envMissing) {
      return NextResponse.json({ error: envMissing }, { status: 503 });
    }

    let body: RunExecutorRequestBody;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const messages = body.messages;
    if (!Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Expected messages array" },
        { status: 400 },
      );
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
      return NextResponse.json({ error: msg }, { status: 503 });
    }

    const coreMessages = await convertToModelMessages(messages as UIMessage[], {
      tools,
      ignoreIncompleteToolCalls: true,
    });

    const runId = randomUUID();
    const t0 = Date.now();

    const result = streamText({
      model: resolved.model,
      system,
      messages: coreMessages,
      tools: Object.keys(tools).length > 0 ? tools : undefined,
      temperature: primaryStep?.temperature,
      maxOutputTokens: primaryStep?.maxTokens,
      topP: primaryStep?.topP,
      toolChoice: primaryStep?.toolChoice,
      ...(maxSteps != null ? { maxSteps } : {}),
      onFinish: (event) => {
        const usage = event.usage;
        const inputTokens = usage.inputTokens ?? 0;
        const outputTokens = usage.outputTokens ?? 0;
        const totalTokens = usage.totalTokens ?? inputTokens + outputTokens;
        const modelRefForPricing = modelRef ?? "";
        const estimatedUsd = estimateUsdFromUsage({
          providerLabel: resolved.providerLabel,
          modelRef: modelRefForPricing,
          inputTokens,
          outputTokens,
          totalTokens,
        });

        console.log(
          JSON.stringify({
            event: "agent_run_finish",
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
      },
    });

    return result.toUIMessageStreamResponse();
  }

  async executeGenUi(req: Request): Promise<Response> {
    try {
      requireLangfuseEnvIfEnabled();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid Langfuse configuration.";
      return NextResponse.json({ error: message }, { status: 503 });
    }

    const envMissing = missingProviderMessage();
    if (envMissing) {
      return NextResponse.json({ error: envMissing }, { status: 503 });
    }

    let body: GenUiExecutorRequestBody;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const userPrompt = body.instruction?.trim() ?? "";
    if (!userPrompt) {
      return NextResponse.json(
        { error: "Expected non-empty instruction string" },
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
      return NextResponse.json({ error: msg }, { status: 503 });
    }

    const runId = randomUUID();
    const t0 = Date.now();

    async function run(model: typeof resolved.model, label: string) {
      const { object, usage } = await generateObject({
        model,
        schema: genuiSurfaceSchema,
        system,
        prompt: userPrompt,
      });
      console.log(
        JSON.stringify({
          event: "agent_genui_finish",
          runId,
          flowId: body.flowId ?? null,
          provider: label,
          durationMs: Date.now() - t0,
          usage,
        }),
      );
      return object;
    }

    function extraOllamaIfNeeded() {
      if (resolved.providerLabel.startsWith("ollama:")) return null;
      if (resolved.fallbackLabel?.startsWith("ollama:")) return null;
      return resolveOllamaLanguageModel(llmStep?.model);
    }

    try {
      const object = await run(resolved.model, resolved.providerLabel);
      return NextResponse.json({ surface: object });
    } catch (first) {
      if (!resolved.fallback || !resolved.fallbackLabel) {
        const ollama = extraOllamaIfNeeded();
        if (ollama) {
          try {
            const object = await run(ollama.model, ollama.providerLabel);
            return NextResponse.json({
              surface: object,
              usedFallback: true,
              fallbackProvider: ollama.providerLabel,
            });
          } catch (ollamaErr) {
            const message =
              ollamaErr instanceof Error
                ? ollamaErr.message
                : "generateObject failed";
            return NextResponse.json({ error: message }, { status: 502 });
          }
        }
        const message =
          first instanceof Error ? first.message : "generateObject failed";
        return NextResponse.json({ error: message }, { status: 502 });
      }
      try {
        const object = await run(resolved.fallback, resolved.fallbackLabel);
        return NextResponse.json({
          surface: object,
          usedFallback: true,
          fallbackProvider: resolved.fallbackLabel,
        });
      } catch (second) {
        const ollama = extraOllamaIfNeeded();
        if (ollama) {
          try {
            const object = await run(ollama.model, ollama.providerLabel);
            return NextResponse.json({
              surface: object,
              usedFallback: true,
              fallbackProvider: ollama.providerLabel,
            });
          } catch (third) {
            const message =
              third instanceof Error ? third.message : "generateObject failed";
            return NextResponse.json({ error: message }, { status: 502 });
          }
        }
        const message =
          second instanceof Error ? second.message : "generateObject failed";
        return NextResponse.json({ error: message }, { status: 502 });
      }
    }
  }
}
