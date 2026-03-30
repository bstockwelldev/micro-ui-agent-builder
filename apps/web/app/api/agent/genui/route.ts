import { generateObject } from "ai";
import { randomUUID } from "node:crypto";
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
import { requireLangfuseEnvIfEnabled } from "@/lib/server/langfuse-env";
import {
  getAgentById,
  getFlowById,
  readStudioStore,
} from "@/lib/server/studio-store";

const genuiSystemExtra = `You also emit a small JSON UI tree (GenUI) that matches the schema: a single root node with type Stack, Text, Button, Card, or FormField. Use Stack to group children. Keep the tree shallow (2–4 levels) for demos.`;

export async function POST(req: Request) {
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

  let body: { flowId?: string; instruction?: string; agentId?: string };
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
