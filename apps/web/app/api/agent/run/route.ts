import {
  convertToModelMessages,
  streamText,
  type UIMessage,
} from "ai";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { buildToolSetFromStore } from "@/lib/server/agent-tools";
import { buildSystemPromptFromFlow } from "@/lib/server/flow-prompt";
import {
  missingProviderMessage,
  resolveLanguageModel,
} from "@/lib/server/language-model";
import {
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
  const system = buildSystemPromptFromFlow(flow, store);
  const tools = buildToolSetFromStore(store);

  const llmStep = flow?.steps.find((s) => s.type === "llm");
  const modelRef = llmStep?.model;

  let resolved;
  try {
    resolved = resolveLanguageModel(modelRef);
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
    onFinish: (event) => {
      console.log(
        JSON.stringify({
          event: "agent_run_finish",
          runId,
          flowId: body.flowId ?? null,
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
