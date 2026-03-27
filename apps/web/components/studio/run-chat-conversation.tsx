"use client";

import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  getToolName,
  isReasoningUIPart,
  isTextUIPart,
  isToolUIPart,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  type UIMessage,
} from "ai";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { FlowCanvasRunPhase } from "@/app/(studio)/run/run-types";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputController,
} from "@/components/ai-elements/prompt-input";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { GenuiSurfaceView } from "@/components/genui-renderer";
import { useStudioRunner } from "@/components/studio/studio-runner-context";
import { createAgentRunFetch } from "@/lib/agent-run-fetch";
import { tryParseGenuiSurfaceFromToolOutput } from "@/lib/genui-tool-output";
import { cn } from "@/lib/utils";

type AddToolApprovalResponse = (args: {
  id: string;
  approved: boolean;
  reason?: string;
}) => void | PromiseLike<void>;

type RunnerToolUIPart = Parameters<typeof getToolName>[0];

function toolPartKey(part: { toolCallId: string }, index: number) {
  return `${part.toolCallId}-${index}`;
}

function renderToolPart(
  part: RunnerToolUIPart,
  index: number,
  addToolApprovalResponse: AddToolApprovalResponse,
) {
  const name = getToolName(part);
  const title =
    "title" in part && typeof (part as { title?: unknown }).title === "string"
      ? (part as { title: string }).title
      : name;

  return (
    <Tool defaultOpen={part.state !== "output-available"} key={toolPartKey(part, index)}>
      <ToolHeader state={part.state} title={title} type={part.type} />
      <ToolContent>
        {"input" in part && part.input !== undefined && part.state !== "input-streaming" ? (
          <ToolInput input={part.input} />
        ) : null}
        {part.state === "approval-requested" ? (
          <div className="flex flex-wrap gap-2 border-t p-4">
            <Button
              size="sm"
              type="button"
              variant="synth"
              onClick={() =>
                void addToolApprovalResponse({
                  id: part.approval.id,
                  approved: true,
                })
              }
            >
              Approve
            </Button>
            <Button
              size="sm"
              type="button"
              variant="outline"
              onClick={() =>
                void addToolApprovalResponse({
                  id: part.approval.id,
                  approved: false,
                  reason: "User denied",
                })
              }
            >
              Deny
            </Button>
          </div>
        ) : null}
        {part.state === "output-denied" ? (
          <div className="text-destructive border-t p-4 text-sm">Execution denied.</div>
        ) : null}
        {part.state === "output-available" ? (
          <div className="space-y-3 border-t">
            {(() => {
              const surface = tryParseGenuiSurfaceFromToolOutput(part.output);
              if (surface) {
                return (
                  <div className="p-4">
                    <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
                      Generative UI
                    </p>
                    <GenuiSurfaceView surface={surface} />
                  </div>
                );
              }
              return (
                <ToolOutput errorText={undefined} output={part.output} />
              );
            })()}
          </div>
        ) : null}
        {part.state === "output-error" ? (
          <ToolOutput errorText={part.errorText} output={undefined} />
        ) : null}
      </ToolContent>
    </Tool>
  );
}

function renderPart(
  part: UIMessage["parts"][number],
  index: number,
  addToolApprovalResponse: AddToolApprovalResponse,
) {
  if (isTextUIPart(part)) {
    return (
      <MessageResponse className="prose prose-sm dark:prose-invert max-w-none">
        {part.text}
      </MessageResponse>
    );
  }
  if (isReasoningUIPart(part)) {
    return (
      <Reasoning
        defaultOpen
        isStreaming={part.state === "streaming"}
        key={`reasoning-${index}`}
      >
        <ReasoningTrigger />
        <ReasoningContent>{part.text}</ReasoningContent>
      </Reasoning>
    );
  }
  if (isToolUIPart(part)) {
    return renderToolPart(part, index, addToolApprovalResponse);
  }
  return (
    <pre
      className="bg-muted/50 max-h-32 overflow-auto rounded-md p-2 font-mono text-[10px]"
      key={`fallback-${index}`}
    >
      {JSON.stringify(part, null, 2)}
    </pre>
  );
}

function ChatPromptForm({
  busy,
  status,
  onSend,
  stop,
}: {
  busy: boolean;
  status: "ready" | "submitted" | "streaming" | "error";
  onSend: (text: string) => void;
  stop: () => void;
}) {
  const { textInput } = usePromptInputController();
  const canSend = textInput.value.trim().length > 0;

  return (
    <PromptInput
      className="w-full"
      onSubmit={({ text }) => {
        const trimmed = text.trim();
        if (!trimmed || busy) return;
        onSend(trimmed);
      }}
    >
      <PromptInputBody>
        <PromptInputTextarea
          aria-label="Chat message"
          disabled={busy}
          placeholder="Message the agent…"
        />
      </PromptInputBody>
      <PromptInputFooter>
        <PromptInputTools className="min-w-0 flex-1" />
        <div className="flex shrink-0 items-center gap-1">
          {busy ? (
            <PromptInputButton
              className="text-destructive hover:text-destructive"
              type="button"
              variant="outline"
              onClick={() => void stop()}
            >
              Stop
            </PromptInputButton>
          ) : null}
          <PromptInputSubmit disabled={busy || !canSend} status={status} />
        </div>
      </PromptInputFooter>
    </PromptInput>
  );
}

export function RunChatConversation({
  flowId,
  agentId,
  variant,
  visible = true,
  suspendWhenHidden = false,
  onCanvasRunPhaseChange,
}: {
  flowId: string | undefined;
  agentId?: string;
  variant: "panel" | "dock";
  visible?: boolean;
  suspendWhenHidden?: boolean;
  onCanvasRunPhaseChange?: (phase: FlowCanvasRunPhase) => void;
}) {
  const [preferOllama, setPreferOllama] = useState(false);

  const studio = useStudioRunner();
  const appendLog = variant === "dock" ? studio.appendLog : undefined;
  const setChatLogSnapshot =
    variant === "dock" ? studio.setChatLogSnapshot : undefined;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/agent/run",
        fetch: createAgentRunFetch(),
        prepareSendMessagesRequest: ({ messages, body }) => ({
          body: {
            ...(body && typeof body === "object" ? body : {}),
            messages,
            ...(flowId ? { flowId } : {}),
            ...(agentId ? { agentId } : {}),
            ...(preferOllama ? { preferOllama: true } : {}),
          },
        }),
      }),
    [flowId, agentId, preferOllama],
  );

  const {
    messages,
    sendMessage,
    status,
    error,
    stop,
    addToolApprovalResponse,
  } = useChat({
    transport,
    sendAutomaticallyWhen: ({ messages: m }) =>
      lastAssistantMessageIsCompleteWithApprovalResponses({ messages: m }),
  });

  const busy = status === "streaming" || status === "submitted";

  const handleSend = useCallback(
    (text: string) => {
      if (variant === "dock" && appendLog) {
        appendLog("info", "User sent message", { text, preferOllama });
      }
      void sendMessage({ text });
    },
    [variant, appendLog, preferOllama, sendMessage],
  );

  useEffect(() => {
    if (variant !== "dock" || !appendLog) return;
    appendLog("status", `chat status: ${status}`);
  }, [variant, status, appendLog]);

  useEffect(() => {
    if (variant !== "dock" || !appendLog || !error) return;
    appendLog("error", error.message, { name: error.name });
  }, [variant, error, appendLog]);

  const prevStatusForLog = useRef(status);
  useEffect(() => {
    if (variant !== "dock" || !appendLog) return;
    const prev = prevStatusForLog.current;
    if (
      (prev === "submitted" || prev === "streaming") &&
      status === "ready"
    ) {
      appendLog("info", "Chat run finished", {
        messageCount: messages.length,
        messages,
      });
    }
    prevStatusForLog.current = status;
  }, [variant, status, messages, appendLog]);

  useEffect(() => {
    if (variant !== "dock" || !setChatLogSnapshot) return;
    setChatLogSnapshot({
      chatStatus: status,
      chatError: error?.message ?? null,
      preferOllama,
      messages,
    });
  }, [variant, status, error, preferOllama, messages, setChatLogSnapshot]);

  useEffect(() => {
    if (suspendWhenHidden && !visible && busy) void stop();
  }, [suspendWhenHidden, visible, busy, stop]);

  const prevStatus = useRef(status);
  useEffect(() => {
    if (suspendWhenHidden && !visible) {
      onCanvasRunPhaseChange?.("idle");
      prevStatus.current = status;
      return;
    }
    const notify = onCanvasRunPhaseChange;
    if (!notify) {
      prevStatus.current = status;
      return;
    }

    const prev = prevStatus.current;
    prevStatus.current = status;

    if (status === "error") {
      notify("error");
      return;
    }
    if (status === "submitted" || status === "streaming") {
      notify("running");
      return;
    }
    if (status === "ready") {
      if (prev === "submitted" || prev === "streaming") {
        notify("success");
        const t = window.setTimeout(() => notify("idle"), 1400);
        return () => window.clearTimeout(t);
      }
      notify("idle");
    }
  }, [status, visible, suspendWhenHidden, onCanvasRunPhaseChange]);

  const conversationLayout = variant === "panel" ? "panel" : "drawer";

  const ollamaToggle = (
    <div className="flex items-center gap-2">
      <input
        id={variant === "panel" ? "prefer-ollama-panel" : "prefer-ollama-dock"}
        type="checkbox"
        checked={preferOllama}
        onChange={(e) => setPreferOllama(e.target.checked)}
        className="border-input accent-primary size-4 shrink-0 rounded border"
        aria-label="Use Ollama for chat requests when OLLAMA_BASE_URL is configured"
      />
      <Label
        htmlFor={
          variant === "panel" ? "prefer-ollama-panel" : "prefer-ollama-dock"
        }
        className="text-muted-foreground cursor-pointer text-xs font-normal leading-snug"
      >
        Use Ollama for chat (set{" "}
        <code className="text-foreground">OLLAMA_BASE_URL</code>)
      </Label>
    </div>
  );

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-3",
        variant === "dock" && "min-h-[280px]",
        variant === "panel" && "min-h-0",
      )}
    >
      {ollamaToggle}
      <div
        className={cn(
          "glass-panel ring-outline-variant/25 relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg ring-1",
          conversationLayout === "panel" &&
            "h-[min(32vh,280px)] min-h-[160px] sm:h-[min(36vh,320px)]",
          conversationLayout === "drawer" &&
            "min-h-[200px] max-h-[min(52dvh,520px)] flex-1",
        )}
      >
        <Conversation className="min-h-0 flex-1">
          <ConversationContent
            className={cn(
              conversationLayout === "panel" ? "gap-4 py-3 pr-2" : "gap-4 py-4 pr-3",
            )}
          >
            {messages.map((m) => (
              <Message from={m.role} key={m.id}>
                <MessageContent>
                  {m.parts.map((part, i) => (
                    <Fragment key={i}>
                      {renderPart(part, i, addToolApprovalResponse)}
                    </Fragment>
                  ))}
                </MessageContent>
              </Message>
            ))}
            {messages.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {variant === "panel"
                  ? "Test this flow without leaving the canvas. Same API as the Runner page."
                  : "Send a message to run the agent with the selected flow and catalog tools. Use exact tool names from the catalog (e.g. echo, web_search)."}
              </p>
            ) : null}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </div>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error.message}
        </p>
      ) : null}
      <PromptInputProvider>
        <ChatPromptForm
          busy={busy}
          onSend={handleSend}
          status={status}
          stop={stop}
        />
      </PromptInputProvider>
    </div>
  );
}
