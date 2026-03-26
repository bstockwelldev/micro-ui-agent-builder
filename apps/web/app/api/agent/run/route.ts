import {
  convertToModelMessages,
  streamText,
  type UIMessage,
} from "ai";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { buildToolSetFromStore } from "@/lib/server/agent-tools";
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
import {
  getAgentById,
  getFlowById,
  readStudioStore,
} from "@/lib/server/studio-store";

export const maxDuration = 60;

export async function POST(req: Request) {
  const envMissing = missingProviderMessage();
  if (envMissing) {
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
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const messages = body.messages;
  if (!Array.isArray(messages)) {
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

  const tools = buildToolSetFromStore(store);

  const llmStep =
    flow?.steps
      .filter((s) => s.type === "llm")
      .sort((a, b) => a.order - b.order)[0] ?? undefined;
  const modelRef = llmStep?.model;

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

  const coreMessages = await convertToModelMessages(messages, {
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
    temperature: llmStep?.temperature,
    maxOutputTokens: llmStep?.maxTokens,
    topP: llmStep?.topP,
    toolChoice: llmStep?.toolChoice,
    onFinish: (event) => {
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
    },
  });

  return result.toUIMessageStreamResponse();
}
