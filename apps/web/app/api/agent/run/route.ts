import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  streamText,
  type UIMessage,
} from "ai";
import { NextResponse } from "next/server";

import { buildToolSetFromStore } from "@/lib/server/agent-tools";
import { buildSystemPromptFromFlow } from "@/lib/server/flow-prompt";
import {
  getFlowById,
  readStudioStore,
} from "@/lib/server/studio-store";

export const maxDuration = 60;

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        error:
          "Missing OPENAI_API_KEY. Add it in .env.local (dev) or Vercel project settings.",
      },
      { status: 503 },
    );
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

  const modelId = flow?.steps.find((s) => s.type === "llm" && s.model)?.model;
  const modelName = modelId?.includes("/")
    ? (modelId.split("/").pop() ?? "gpt-4o-mini")
    : modelId ?? "gpt-4o-mini";

  const coreMessages = await convertToModelMessages(messages, {
    tools,
    ignoreIncompleteToolCalls: true,
  });

  const result = streamText({
    model: openai(modelName),
    system,
    messages: coreMessages,
    tools: Object.keys(tools).length > 0 ? tools : undefined,
  });

  return result.toUIMessageStreamResponse();
}
