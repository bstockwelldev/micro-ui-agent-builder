"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FlowQuickSwitch } from "@/components/studio/flow-quick-switch";
import { useStudioNav } from "@/components/studio/studio-nav-context";
import { Button } from "@/components/ui/button";
import { SimpleTooltip } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  LayoutGrid,
  Menu,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  MousePointer2,
  Settings,
  Terminal,
} from "lucide-react";

export type FlowEditorTopHudProps = {
  flowName: string;
  flowId: string;
  runHref: string;
  onOpenFlowSettings: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  flowOptions: { id: string; name: string }[];
  onRefresh?: () => void;
  validationPanelOpen: boolean;
  onValidationPanelToggle: () => void;
  validationOk: boolean;
  issueCount: number;
  testPanelOpen: boolean;
  onTestPanelToggle: () => void;
  onMobileAdd: () => void;
  onClosePanels: () => void;
  onSave: () => void;
  saving: boolean;
  onOpenCanvasInteraction: () => void;
};

function pillClass(active: boolean) {
  return cn(
    "rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors sm:px-4 sm:text-[11px]",
    active
      ? "bg-primary/25 text-primary shadow-[0_0_0_1px_rgba(0,229,255,0.35)]"
      : "text-muted-foreground hover:bg-surface-container-highest/80 hover:text-foreground",
  );
}

export function FlowEditorTopHud({
  flowName,
  flowId,
  runHref,
  onOpenFlowSettings,
  search,
  onSearchChange,
  flowOptions,
  onRefresh,
  validationPanelOpen,
  onValidationPanelToggle,
  validationOk,
  issueCount,
  testPanelOpen,
  onTestPanelToggle,
  onMobileAdd,
  onClosePanels,
  onSave,
  saving,
  onOpenCanvasInteraction,
}: FlowEditorTopHudProps) {
  const router = useRouter();
  const { openStudioNav } = useStudioNav();
  const canvasOnly = !validationPanelOpen && !testPanelOpen;

  return (
    <header className="border-outline-variant/15 bg-surface/95 supports-[backdrop-filter]:bg-surface/80 z-50 flex w-full shrink-0 flex-col gap-2 border-b px-2 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 backdrop-blur-md sm:px-4 sm:pb-2.5">
      <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-3">
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <SimpleTooltip label="Open studio navigation" side="bottom">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground shrink-0"
              aria-label="Open studio navigation"
              onClick={() => openStudioNav()}
            >
              <Menu className="size-5" aria-hidden />
            </Button>
          </SimpleTooltip>
          <span className="text-foreground hidden shrink-0 text-sm font-black tracking-tighter sm:inline sm:text-base">
            GENUI
          </span>
          <FlowQuickSwitch
            mode="editor"
            flows={flowOptions}
            currentFlowId={flowId}
            className="min-w-0 max-w-[40vw] shrink sm:max-w-[12rem]"
          />
        </div>

        <div className="border-outline-variant/25 bg-surface-container-highest/60 flex min-w-0 flex-1 items-center justify-center gap-0.5 rounded-full border px-1 py-0.5 sm:gap-1 sm:px-2">
          <SimpleTooltip
            label="Return to canvas (close validation and test panels)"
            side="bottom"
          >
            <button
              type="button"
              className={cn(pillClass(canvasOnly), "min-h-10 touch-manipulation sm:min-h-0")}
              aria-pressed={canvasOnly}
              onClick={onClosePanels}
            >
              <span className="flex items-center gap-1">
                <LayoutGrid className="size-3.5 opacity-80 sm:hidden" aria-hidden />
                <span className="hidden sm:inline">Canvas</span>
                <span className="sm:hidden">Edit</span>
              </span>
            </button>
          </SimpleTooltip>
          <SimpleTooltip
            label={
              validationOk
                ? "Open validation panel — UX checks for prompts, models, and outputs"
                : `Open validation panel — ${issueCount} issue(s) to fix`
            }
            side="bottom"
          >
            <button
              type="button"
              className={cn(pillClass(validationPanelOpen), "min-h-10 touch-manipulation sm:min-h-0")}
              aria-pressed={validationPanelOpen}
              aria-expanded={validationPanelOpen}
              aria-controls="flow-editor-validation-panel"
              onClick={onValidationPanelToggle}
            >
              <span className="flex items-center gap-1">
                <AlertTriangle className="size-3.5 opacity-80" aria-hidden />
                <span className="hidden sm:inline">Validation</span>
                {!validationOk ? (
                  <span className="bg-destructive text-destructive-foreground min-w-[1rem] rounded px-1 py-0 text-[9px] font-mono">
                    {issueCount}
                  </span>
                ) : null}
              </span>
            </button>
          </SimpleTooltip>
          <SimpleTooltip
            label="Open test run — chat against this flow in a panel"
            side="bottom"
          >
            <button
              type="button"
              className={cn(pillClass(testPanelOpen), "min-h-10 touch-manipulation sm:min-h-0")}
              aria-pressed={testPanelOpen}
              aria-expanded={testPanelOpen}
              aria-controls="flow-editor-test-run-panel"
              onClick={onTestPanelToggle}
            >
              <span className="flex items-center gap-1">
                <Terminal className="size-3.5 opacity-80" aria-hidden />
                Test
              </span>
            </button>
          </SimpleTooltip>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground h-8 min-h-10 min-w-10 rounded-full px-2 sm:min-h-8 sm:min-w-0"
                  aria-label="More flow actions"
                  title="More flow actions"
                >
                  <MoreHorizontal className="size-4" aria-hidden />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="min-w-48">
              <DropdownMenuItem onClick={() => router.push("/flows")}>
                Flow library
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/dashboard")}>
                Studio dashboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(runHref)}>
                Flow workspace
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onOpenFlowSettings()}>
                Flow settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onOpenCanvasInteraction()}>
                <MousePointer2 className="size-4" aria-hidden />
                Canvas interaction…
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  void onRefresh?.();
                }}
              >
                <RefreshCw className="size-4" aria-hidden />
                Refresh from server
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={saving}
                onClick={() => {
                  onSave();
                }}
              >
                Save layout to studio
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:max-w-md sm:flex-initial lg:max-w-sm">
          <div className="relative hidden min-w-0 flex-1 sm:block">
            <input
              className="border-outline-variant/20 bg-surface-container-lowest focus:border-primary focus:ring-primary w-full rounded-xl border py-1.5 pr-9 pl-3 text-xs outline-none transition-all focus:ring-1"
              placeholder="Search nodes…"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="Search nodes"
            />
            <Search className="text-muted-foreground pointer-events-none absolute top-1.5 right-3 size-4" />
          </div>
          <SimpleTooltip
            label="Canvas interaction — pan, zoom, scroll, and selection"
            side="bottom"
          >
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground hidden shrink-0 sm:inline-flex"
              aria-label="Canvas interaction: pan, scroll, and cursor"
              onClick={() => onOpenCanvasInteraction()}
            >
              <MousePointer2 className="size-5" aria-hidden />
            </Button>
          </SimpleTooltip>
          <SimpleTooltip label="Flow settings" side="bottom">
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground hidden shrink-0 sm:inline-flex"
              aria-label="Flow settings"
              onClick={() => onOpenFlowSettings()}
            >
              <Settings className="size-5" />
            </button>
          </SimpleTooltip>
        </div>
      </div>

      <div className="relative w-full min-w-0 px-2 sm:hidden">
        <input
          className="border-outline-variant/20 bg-surface-container-lowest focus:border-primary focus:ring-primary w-full rounded-xl border py-2 pr-9 pl-3 text-xs outline-none transition-all focus:ring-1"
          placeholder="Search nodes…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search nodes"
        />
        <Search className="text-muted-foreground pointer-events-none absolute top-2 right-3 size-4" />
      </div>

      <div className="flex items-center gap-2 md:hidden">
        <SimpleTooltip label="Add node" side="bottom">
          <button
            type="button"
            className="bg-primary/15 text-primary hover:bg-primary/25 flex size-9 shrink-0 items-center justify-center rounded-lg"
            aria-label="Add node"
            onClick={onMobileAdd}
          >
            <Plus className="size-4" aria-hidden />
          </button>
        </SimpleTooltip>
        <span
          className="text-muted-foreground min-w-0 flex-1 truncate text-center text-[10px]"
          title={flowName}
        >
          {flowName}
        </span>
      </div>
    </header>
  );
}
