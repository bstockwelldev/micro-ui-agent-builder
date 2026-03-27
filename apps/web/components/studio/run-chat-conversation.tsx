"use client";

import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  isTextUIPart,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  type UIMessage,
} from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { FlowCanvasRunPhase } from "@/app/(studio)/run/run-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useStudioRunner } from "@/components/studio/studio-runner-context";
import { createAgentRunFetch } from "@/lib/agent-run-fetch";
import { cn } from "@/lib/utils";

type AddToolApprovalResponse = (args: {
  id: string;
  approved: boolean;
  reason?: string;
}) => void | PromiseLike<void>;

function renderPart(
  part: UIMessage["parts"][number],
  addToolApprovalResponse: AddToolApprovalResponse,
) {
  if (isTextUIPart(part)) {
    return (
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{part.text}</p>
    );
  }
  if (part.type === "reasoning") {
    return (
      <pre className="bg-surface-container-high/80 text-muted-foreground rounded-md p-2 font-mono text-xs">
        {part.text}
      </pre>
    );
  }
  if (part.type === "dynamic-tool") {
    const header = (
      <div className="text-muted-foreground text-xs font-medium">
        Tool: {part.toolName}{" "}
        <span className="font-mono">({part.toolCallId})</span>
      </div>
    );
    if (part.state === "approval-requested") {
      return (
        <div className="bg-surface-container-high ring-outline-variant/25 space-y-2 rounded-md p-3 ring-1">
          {header}
          <pre className="max-h-40 overflow-auto text-xs">
            {JSON.stringify(part.input, null, 2)}
          </pre>
          <div className="flex gap-2">
            <Button
              size="sm"
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
        </div>
      );
    }
    if (part.state === "output-available") {
      return (
        <div className="bg-surface-container-high ring-outline-variant/25 space-y-1 rounded-md p-3 ring-1">
          {header}
          <pre className="max-h-48 overflow-auto text-xs">
            {JSON.stringify(part.output, null, 2)}
          </pre>
        </div>
      );
    }
    if (part.state === "output-denied") {
      return (
        <div className="bg-destructive/10 text-destructive ring-destructive/30 space-y-1 rounded-md p-3 text-sm ring-1">
          {header}
          <p>Execution denied.</p>
        </div>
      );
    }
    return (
      <div className="bg-surface-container-low ring-outline-variant/20 rounded-md p-2 text-xs ring-1">
        {header}
        <span className="text-muted-foreground">State: {part.state}</span>
      </div>
    );
  }
  return (
    <pre className="bg-surface-container-lowest/80 max-h-32 overflow-auto rounded p-2 font-mono text-[10px]">
      {JSON.stringify(part, null, 2)}
    </pre>
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
  const [input, setInput] = useState("");
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

  const onSubmitMessage = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const text = input.trim();
      if (!text || busy) return;
      setInput("");
      if (variant === "dock" && appendLog) {
        appendLog("info", "User sent message", { text, preferOllama });
      }
      void sendMessage({ text });
    },
    [input, busy, variant, appendLog, preferOllama, sendMessage],
  );

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

  const conversationLayout = variant === "panel" ? "panel" : "drawer";

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-3",
        variant === "dock" && "min-h-[280px]",
        variant === "panel" && "min-h-0",
      )}
    >
      {ollamaToggle}
      <ScrollArea
        className={cn(
          "glass-panel ring-outline-variant/25 rounded-lg ring-1",
          conversationLayout === "panel" &&
            "h-[min(32vh,280px)] min-h-[160px] p-3 sm:h-[min(36vh,320px)]",
          conversationLayout === "drawer" &&
            "min-h-[200px] flex-1 p-4 [&>[data-radix-scroll-area-viewport]]:max-h-[min(52dvh,520px)]",
        )}
      >
        <div
          className={cn(
            conversationLayout === "panel" ? "space-y-3 pr-2" : "space-y-4 pr-3",
          )}
        >
          {messages.map((m) => (
            <article
              key={m.id}
              className="bg-surface-container-low/40 space-y-2 rounded-md p-3"
            >
              <div className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                {m.role}
              </div>
              <div className="space-y-2">
                {m.parts.map((part, i) => (
                  <div key={i}>
                    {renderPart(part, addToolApprovalResponse)}
                  </div>
                ))}
              </div>
            </article>
          ))}
          {messages.length === 0 && (
            <p className="text-muted-foreground text-sm">
              {variant === "panel"
                ? "Test this flow without leaving the canvas. Same API as the Runner page."
                : "Send a message to run the agent with the selected flow and catalog tools. Use exact tool names from the catalog (e.g. echo, web_search)."}
            </p>
          )}
        </div>
      </ScrollArea>
      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error.message}
        </p>
      )}
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={onSubmitMessage}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message the agent…"
          disabled={busy}
          aria-label="Chat message"
          className="flex-1"
        />
        <div className="flex gap-2">
          {busy ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => void stop()}
            >
              Stop
            </Button>
          ) : null}
          <Button
            type="submit"
            variant="synth"
            disabled={busy || !input.trim()}
          >
            Send
          </Button>
        </div>
      </form>
    </div>
  );
}
