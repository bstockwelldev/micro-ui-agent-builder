import { generateObject } from "ai";
import { NextResponse } from "next/server";

import { genuiSurfaceSchema } from "@repo/shared";

import { buildSystemPromptFromFlow } from "@/lib/server/flow-prompt";
import { augmentSystemWithFlowKnowledgeForQuery } from "@/lib/server/flow-knowledge-rag";
import {
  getFlowKnowledgeEntry,
  readFlowKnowledgeRoot,
} from "@/lib/server/flow-knowledge-store";
import {
  missingProviderMessage,
  resolveLanguageModel,
  resolveOllamaLanguageModel,
  type ResolvedLanguageModel,
} from "@/lib/server/language-model";
import { mergeAgentProfileIntoSystemPrompt } from "@/lib/server/agent-system-appendix";
import { requireAiSdkExecutorForRoute } from "@/lib/server/runtime-config";
import { beginRouteTrace, failTrace } from "@/lib/server/telemetry/with-trace";
import {
  getAgentById,
  getFlowById,
  readStudioStore,
} from "@/lib/server/studio-store";

const genuiSystemExtra = `You also emit a small JSON UI tree (GenUI) that matches the schema: a single root node with type Stack, Text, Button, Card, or FormField. Use Stack to group children. Keep the tree shallow (2–4 levels) for demos.`;

export async function POST(req: Request) {
  const trace = beginRouteTrace(req, "agent_genui");
  const { telemetry, traceId, runId } = trace;

  try {
    requireAiSdkExecutorForRoute();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid server runtime configuration.";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  const envMissing = missingProviderMessage();
  if (envMissing) {
    const failed = failTrace(trace, "provider_precheck", envMissing);
    return NextResponse.json({ error: failed.error }, { status: 503 });
  }

  let body: { flowId?: string; instruction?: string; agentId?: string };
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
