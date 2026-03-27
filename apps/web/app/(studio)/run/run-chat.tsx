"use client";

import { parseGenuiSurface, type GenuiSurface } from "@repo/shared";
import { useCallback, useMemo, useState } from "react";

import { GenuiSurfaceView } from "@/components/genui-renderer";
import { AgentSessionLog } from "@/components/studio/agent-session-log";
import { RunChatConversation } from "@/components/studio/run-chat-conversation";
import { useStudioRunner } from "@/components/studio/studio-runner-context";
import { Button } from "@/components/ui/button";
import type { FlowCanvasRunPhase } from "./run-types";

export type { FlowCanvasRunPhase } from "./run-types";

function RunChatPanel({
  flowId,
  agentId,
  visible,
  suspendWhenHidden,
  onCanvasRunPhaseChange,
}: {
  flowId: string | undefined;
  agentId?: string;
  visible: boolean;
  suspendWhenHidden: boolean;
  onCanvasRunPhaseChange?: (phase: FlowCanvasRunPhase) => void;
}) {
  return (
    <RunChatConversation
      flowId={flowId}
      agentId={agentId}
      variant="panel"
      visible={visible}
      suspendWhenHidden={suspendWhenHidden}
      onCanvasRunPhaseChange={onCanvasRunPhaseChange}
    />
  );
}

function RunChatDefault({
  flowId,
  agentId,
}: {
  flowId: string | undefined;
  agentId?: string;
}) {
  const { logEntries, appendLog, clearLog, chatLogSnapshot } = useStudioRunner();

  const [genuiPrompt, setGenuiPrompt] = useState(
    "Build a small UI: a card titled Demo with a short welcome text and a primary button labeled Continue.",
  );
  const [genuiSurface, setGenuiSurface] = useState<GenuiSurface | null>(null);
  const [genuiBusy, setGenuiBusy] = useState(false);
  const [genuiError, setGenuiError] = useState<string | null>(null);
  const [genuiMeta, setGenuiMeta] = useState<string | null>(null);

  const logSnapshot = useMemo(
    () => ({
      chatStatus: chatLogSnapshot.chatStatus,
      chatError: chatLogSnapshot.chatError,
      preferOllama: chatLogSnapshot.preferOllama,
      messages: chatLogSnapshot.messages,
      genui: {
        error: genuiError,
        meta: genuiMeta,
        hasSurface: Boolean(genuiSurface),
      },
    }),
    [chatLogSnapshot, genuiError, genuiMeta, genuiSurface],
  );

  const generateGenui = useCallback(async () => {
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
  }, [genuiPrompt, genuiBusy, flowId, agentId, appendLog]);

  return (
    <div className="min-w-0 space-y-4">
      <section className="space-y-4">
        <h2 className="text-sm font-medium">Structured UI preview</h2>
        <p className="text-muted-foreground text-sm">
          Generates a validated component tree via{" "}
          <code className="text-xs">POST /api/agent/genui</code> (same flow system
          prompt + structured output). Cloud providers are tried first; the route can
          fall back (including Ollama when{" "}
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
      </section>
      <div>
        <AgentSessionLog
          entries={logEntries}
          snapshot={logSnapshot}
          flowId={flowId}
          onClear={clearLog}
        />
      </div>
    </div>
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
  if (variant === "panel") {
    return (
      <RunChatPanel
        flowId={flowId}
        agentId={agentId}
        visible={visible}
        suspendWhenHidden={suspendWhenHidden}
        onCanvasRunPhaseChange={onCanvasRunPhaseChange}
      />
    );
  }

  return <RunChatDefault flowId={flowId} agentId={agentId} />;
}
