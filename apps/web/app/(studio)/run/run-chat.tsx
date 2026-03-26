"use client";

import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  isTextUIPart,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  type UIMessage,
} from "ai";
import { parseGenuiSurface, type GenuiSurface } from "@repo/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { GenuiSurfaceView } from "@/components/genui-renderer";
import {
  AgentSessionLog,
  type AgentSessionLogEntry,
} from "@/components/studio/agent-session-log";
import { Button } from "@/components/ui/button";
import { createAgentRunFetch } from "@/lib/agent-run-fetch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type AddToolApprovalResponse = (args: {
  id: string;
  approved: boolean;
  reason?: string;
}) => void | PromiseLike<void>;

/** Drives status-colored canvas outline in the flow editor test panel. */
export type FlowCanvasRunPhase = "idle" | "running" | "error" | "success";

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

export function RunChat({
  flowId,
  agentId,
  variant = "default",
  visible = true,
  suspendWhenHidden = false,
  onCanvasRunPhaseChange,
}: {
  flowId: string | undefined;
  /** When set, server merges this agent profile into the system prompt. */
  agentId?: string;
  /** `panel`: chat only, compact — for flow editor test run. */
  variant?: "default" | "panel";
  /** When false with `suspendWhenHidden`, in-flight streams are stopped. */
  visible?: boolean;
  /** Stop streaming when the panel is hidden (flow editor). */
  suspendWhenHidden?: boolean;
  onCanvasRunPhaseChange?: (phase: FlowCanvasRunPhase) => void;
}) {
  const [input, setInput] = useState("");
  const [genuiPrompt, setGenuiPrompt] = useState(
    "Build a small UI: a card titled Demo with a short welcome text and a primary button labeled Continue.",
  );
  const [genuiSurface, setGenuiSurface] = useState<GenuiSurface | null>(null);
  const [genuiBusy, setGenuiBusy] = useState(false);
  const [genuiError, setGenuiError] = useState<string | null>(null);
  const [genuiMeta, setGenuiMeta] = useState<string | null>(null);
  const [preferOllama, setPreferOllama] = useState(false);
  const [logEntries, setLogEntries] = useState<AgentSessionLogEntry[]>([]);

  const appendLog = useCallback(
    (kind: AgentSessionLogEntry["kind"], message: string, detail?: unknown) => {
      setLogEntries((prev) => [
        ...prev,
        { at: new Date().toISOString(), kind, message, detail },
      ]);
    },
    [],
  );

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
    appendLog("status", `chat status: ${status}`);
  }, [status, appendLog]);

  useEffect(() => {
    if (error) {
      appendLog("error", error.message, {
        name: error.name,
      });
    }
  }, [error, appendLog]);

  const prevStatusForLog = useRef(status);
  useEffect(() => {
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
  }, [status, messages, appendLog]);

  const logSnapshot = useMemo(
    () => ({
      chatStatus: status,
      chatError: error?.message ?? null,
      preferOllama,
      messages,
      genui: {
        error: genuiError,
        meta: genuiMeta,
        hasSurface: Boolean(genuiSurface),
      },
    }),
    [
      status,
      error,
      preferOllama,
      messages,
      genuiError,
      genuiMeta,
      genuiSurface,
    ],
  );

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

  async function generateGenui() {
    const text = genuiPrompt.trim();
    if (!text || genuiBusy) return;
    setGenuiBusy(true);
    setGenuiError(null);
    setGenuiMeta(null);
    try {
      const res = await fetch("/api/agent/genui", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flowId: flowId ?? undefined,
          instruction: text,
          ...(agentId ? { agentId } : {}),
        }),
      });
      const json: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err =
          typeof json === "object" &&
          json !== null &&
          "error" in json &&
          typeof (json as { error: unknown }).error === "string"
            ? (json as { error: string }).error
            : `HTTP ${res.status}`;
        throw new Error(err);
      }
      if (
        typeof json !== "object" ||
        json === null ||
        !("surface" in json) ||
        (json as { surface: unknown }).surface === undefined
      ) {
        throw new Error("Invalid response: missing surface");
      }
      const surface = parseGenuiSurface((json as { surface: unknown }).surface);
      setGenuiSurface(surface);
      const usedFallback =
        "usedFallback" in json && (json as { usedFallback?: boolean }).usedFallback;
      const fb = (json as { fallbackProvider?: string }).fallbackProvider;
      if (usedFallback && fb) {
        setGenuiMeta(`Used fallback provider: ${fb}`);
      }
      appendLog("genui", "GenUI OK", {
        usedFallback: Boolean(usedFallback),
        fallbackProvider: fb ?? null,
      });
    } catch (e) {
      setGenuiSurface(null);
      const msg = e instanceof Error ? e.message : "GenUI request failed";
      setGenuiError(msg);
      appendLog("genui", "GenUI failed", { error: msg });
    } finally {
      setGenuiBusy(false);
    }
  }

  const ollamaToggle = (
    <div className="flex items-center gap-2">
      <input
        id={variant === "panel" ? "prefer-ollama-panel" : "prefer-ollama-run"}
        type="checkbox"
        checked={preferOllama}
        onChange={(e) => setPreferOllama(e.target.checked)}
        className="border-input accent-primary size-4 shrink-0 rounded border"
        aria-label="Use Ollama for chat requests when OLLAMA_BASE_URL is configured"
      />
      <Label
        htmlFor={variant === "panel" ? "prefer-ollama-panel" : "prefer-ollama-run"}
        className="text-muted-foreground cursor-pointer text-xs font-normal leading-snug"
      >
        Use Ollama for chat (set <code className="text-foreground">OLLAMA_BASE_URL</code>)
      </Label>
    </div>
  );

  const chatBlock = (
    <div
      className={
        variant === "panel"
          ? "flex min-h-0 flex-1 flex-col gap-3"
          : "flex min-h-[480px] flex-col gap-4"
      }
    >
      {ollamaToggle}
      <ScrollArea
        className={
          variant === "panel"
            ? "glass-panel ring-outline-variant/25 h-[min(32vh,280px)] min-h-[160px] rounded-lg p-3 ring-1 sm:h-[min(36vh,320px)]"
            : "glass-panel ring-outline-variant/25 h-[min(60vh,520px)] rounded-lg p-4 ring-1"
        }
      >
        <div className={variant === "panel" ? "space-y-3 pr-2" : "space-y-4 pr-3"}>
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
                : "Send a message to run the agent with the selected flow and catalog tools."}
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
        onSubmit={(e) => {
          e.preventDefault();
          const text = input.trim();
          if (!text || busy) return;
          setInput("");
          appendLog("info", "User sent message", {
            text,
            preferOllama,
          });
          void sendMessage({ text });
        }}
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

  if (variant === "panel") {
    return chatBlock;
  }

  return (
    <>
    <Tabs defaultValue="chat" className="w-full">
      <TabsList variant="line" className="w-full max-w-md">
        <TabsTrigger value="chat">Chat</TabsTrigger>
        <TabsTrigger value="genui">Structured UI preview</TabsTrigger>
      </TabsList>
      <TabsContent value="chat" className="mt-4">
        {chatBlock}
      </TabsContent>
      <TabsContent value="genui" className="mt-4 space-y-4">
        <p className="text-muted-foreground text-sm">
          Generates a validated component tree via{" "}
          <code className="text-xs">POST /api/agent/genui</code> (same flow
          system prompt + structured output). Cloud providers are tried first;
          the route can fall back (including Ollama when{" "}
          <code className="text-xs">OLLAMA_BASE_URL</code> is set).
        </p>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium" htmlFor="genui-instruction">
            Instruction
          </label>
          <textarea
            id="genui-instruction"
            className="ghost-border bg-surface-container-low/50 focus-visible:ring-ring min-h-[100px] w-full rounded-md border px-3 py-2 font-mono text-sm outline-none transition-expressive focus-visible:ring-2"
            value={genuiPrompt}
            onChange={(e) => setGenuiPrompt(e.target.value)}
            disabled={genuiBusy}
          />
          <Button
            type="button"
            variant="synth"
            disabled={genuiBusy || !genuiPrompt.trim()}
            onClick={() => void generateGenui()}
          >
            {genuiBusy ? "Generating…" : "Generate structured UI"}
          </Button>
        </div>
        {genuiError ? (
          <p className="text-destructive text-sm" role="alert">
            {genuiError}
          </p>
        ) : null}
        {genuiMeta ? (
          <p className="text-muted-foreground text-xs">{genuiMeta}</p>
        ) : null}
        {genuiSurface ? <GenuiSurfaceView surface={genuiSurface} /> : null}
      </TabsContent>
    </Tabs>
    <div className="mt-6">
      <AgentSessionLog
        entries={logEntries}
        snapshot={logSnapshot}
        flowId={flowId}
        onClear={() => setLogEntries([])}
      />
    </div>
  </>
  );
}
