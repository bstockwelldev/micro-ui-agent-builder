"use client";

import { ChevronDown, ChevronLeft, MessageSquare } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";

import { RunChatConversation } from "@/components/studio/run-chat-conversation";
import { Button } from "@/components/ui/button";
import { useStudioFlowSelection } from "@/hooks/use-studio-flow-selection";
import { cn } from "@/lib/utils";

const PANEL_EXPANDED_KEY = "micro-ui-studio.conversationPanelExpanded";

export function StudioConversationPanel() {
  const { flowId, agentId } = useStudioFlowSelection();
  const panelId = useId();
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PANEL_EXPANDED_KEY);
      if (raw === "0") setExpanded(false);
      if (raw === "1") setExpanded(true);
    } catch {
      // ignore
    }
  }, []);

  const setExpandedPersisted = useCallback((next: boolean) => {
    setExpanded(next);
    try {
      localStorage.setItem(PANEL_EXPANDED_KEY, next ? "1" : "0");
    } catch {
      // ignore
    }
  }, []);

  return (
    <aside
      id={panelId}
      className={cn(
        "border-outline-variant/25 bg-surface-container-low/35 flex w-full shrink-0 flex-col overflow-hidden border-t transition-[width,min-height] duration-200 ease-out",
        expanded
          ? "min-h-[min(320px,50dvh)] md:min-h-0 md:w-[min(400px,36vw)] md:max-w-[min(420px,40vw)]"
          : "min-h-0 md:w-12 md:min-w-12 md:max-w-12",
        "md:border-l md:border-t-0",
      )}
      aria-label="Agent conversation"
    >
      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header
          className={cn(
            "border-outline-variant/20 flex shrink-0 gap-2 border-b",
            expanded
              ? "items-start justify-between px-4 py-3"
              : "items-center justify-between px-2 py-2 md:flex-col md:items-center md:justify-start md:gap-3 md:px-1.5 md:py-3",
          )}
        >
          {expanded ? (
            <>
              <div className="min-w-0 space-y-1 pr-1">
                <div className="flex items-center gap-2">
                  <MessageSquare
                    className="text-muted-foreground size-4 shrink-0"
                    aria-hidden
                  />
                  <h2 className="text-base font-semibold">Conversation</h2>
                </div>
                <p className="text-muted-foreground text-sm">
                  Chat uses the active flow, merged agent profile (if any), and
                  studio tool catalog. Stays open while you navigate the studio.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground shrink-0"
                aria-expanded={expanded}
                aria-controls={`${panelId}-body`}
                onClick={() => setExpandedPersisted(false)}
                title="Collapse conversation"
              >
                <ChevronDown className="size-4 rotate-[-90deg]" aria-hidden />
                <span className="sr-only">Collapse conversation</span>
              </Button>
            </>
          ) : (
            <>
              <div className="flex min-w-0 flex-1 items-center gap-2 md:hidden">
                <MessageSquare
                  className="text-muted-foreground size-4 shrink-0"
                  aria-hidden
                />
                <span className="text-sm font-medium">Conversation</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="md:hidden"
                aria-expanded={expanded}
                aria-controls={`${panelId}-body`}
                onClick={() => setExpandedPersisted(true)}
              >
                Open
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hidden md:flex"
                aria-expanded={expanded}
                aria-controls={`${panelId}-body`}
                onClick={() => setExpandedPersisted(true)}
                title="Expand conversation"
              >
                <ChevronLeft className="size-4" aria-hidden />
                <span className="sr-only">Expand conversation</span>
              </Button>
            </>
          )}
        </header>
        <div
          id={`${panelId}-body`}
          role="region"
          aria-label="Conversation messages"
          hidden={!expanded}
          className="flex min-h-0 flex-1 flex-col px-4 py-4"
        >
          <RunChatConversation
            flowId={flowId}
            agentId={agentId}
            variant="dock"
          />
        </div>
      </section>
    </aside>
  );
}
