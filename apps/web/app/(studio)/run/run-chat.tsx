"use client";

import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  isTextUIPart,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  type UIMessage,
} from "ai";
import { parseGenuiSurface, type GenuiSurface } from "@repo/shared";
import { useMemo, useState } from "react";

import { GenuiSurfaceView } from "@/components/genui-renderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
      <pre className="bg-muted/50 text-muted-foreground rounded-md p-2 text-xs">
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
        <div className="border-border space-y-2 rounded-md border p-3">
          {header}
          <pre className="max-h-40 overflow-auto text-xs">
            {JSON.stringify(part.input, null, 2)}
          </pre>
          <div className="flex gap-2">
            <Button
              size="sm"
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
        <div className="border-border space-y-1 rounded-md border p-3">
          {header}
          <pre className="max-h-48 overflow-auto text-xs">
            {JSON.stringify(part.output, null, 2)}
          </pre>
        </div>
      );
    }
    if (part.state === "output-denied") {
      return (
        <div className="border-destructive/40 text-destructive space-y-1 rounded-md border p-3 text-sm">
          {header}
          <p>Execution denied.</p>
        </div>
      );
    }
    return (
      <div className="border-border rounded-md border p-2 text-xs">
        {header}
        <span className="text-muted-foreground">State: {part.state}</span>
      </div>
    );
  }
  return (
    <pre className="bg-muted/30 max-h-32 overflow-auto rounded p-2 text-[10px]">
      {JSON.stringify(part, null, 2)}
    </pre>
  );
}

export function RunChat({ flowId }: { flowId: string | undefined }) {
  const [input, setInput] = useState("");
  const [genuiPrompt, setGenuiPrompt] = useState(
    "Build a small UI: a card titled Demo with a short welcome text and a primary button labeled Continue.",
  );
  const [genuiSurface, setGenuiSurface] = useState<GenuiSurface | null>(null);
  const [genuiBusy, setGenuiBusy] = useState(false);
  const [genuiError, setGenuiError] = useState<string | null>(null);
  const [genuiMeta, setGenuiMeta] = useState<string | null>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/agent/run",
        prepareSendMessagesRequest: ({ messages, body }) => ({
          body: {
            ...(body && typeof body === "object" ? body : {}),
            messages,
            ...(flowId ? { flowId } : {}),
          },
        }),
      }),
    [flowId],
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
    } catch (e) {
      setGenuiSurface(null);
      setGenuiError(e instanceof Error ? e.message : "GenUI request failed");
    } finally {
      setGenuiBusy(false);
    }
  }

  return (
    <Tabs defaultValue="chat" className="w-full">
      <TabsList variant="line" className="w-full max-w-md">
        <TabsTrigger value="chat">Chat</TabsTrigger>
        <TabsTrigger value="genui">Structured UI preview</TabsTrigger>
      </TabsList>
      <TabsContent value="chat" className="mt-4">
        <div className="flex min-h-[480px] flex-col gap-4">
          <ScrollArea className="border-border bg-card/30 h-[min(60vh,520px)] rounded-lg border p-4">
            <div className="space-y-4 pr-3">
              {messages.map((m) => (
                <article
                  key={m.id}
                  className="space-y-2 rounded-md border border-transparent p-2"
                >
                  <div className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
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
                  Send a message to run the agent with the selected flow and
                  catalog tools.
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
              <Button type="submit" disabled={busy || !input.trim()}>
                Send
              </Button>
            </div>
          </form>
        </div>
      </TabsContent>
      <TabsContent value="genui" className="mt-4 space-y-4">
        <p className="text-muted-foreground text-sm">
          Generates a validated component tree via{" "}
          <code className="text-xs">POST /api/agent/genui</code> (same flow
          system prompt + structured output). Groq is preferred when configured;
          the route can fall back to another provider on failure.
        </p>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium" htmlFor="genui-instruction">
            Instruction
          </label>
          <textarea
            id="genui-instruction"
            className="border-input bg-background focus-visible:ring-ring min-h-[100px] w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
            value={genuiPrompt}
            onChange={(e) => setGenuiPrompt(e.target.value)}
            disabled={genuiBusy}
          />
          <Button
            type="button"
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
  );
}
