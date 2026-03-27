"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { Sidebar } from "lucide-react";

import { StudioConversationPanel } from "@/components/studio/studio-conversation-panel";
import { StudioNav } from "@/components/studio/studio-nav";
import { StudioNavProvider } from "@/components/studio/studio-nav-context";
import { StudioRunnerProvider } from "@/components/studio/studio-runner-context";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/** Single-segment flow canvas: /flows/:id (not /flows, not .../settings, not .../edit) */
export function isFlowCanvasRoute(pathname: string) {
  return /^\/flows\/[^/]+$/.test(pathname);
}

export function StudioShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const safePathname = pathname ?? "";
  const flowCanvas = isFlowCanvasRoute(safePathname);
  const isFlowsListPage = safePathname === "/flows";

  const openStudioNav = useCallback(() => {
    setMobileNavOpen(true);
  }, []);

  const navContextValue = useMemo(
    () => ({ openStudioNav }),
    [openStudioNav],
  );

  return (
    <StudioNavProvider value={navContextValue}>
      <div
        className={cn(
          "bg-background text-foreground flex min-h-dvh",
          isFlowsListPage && "h-dvh max-h-dvh min-h-0 overflow-hidden",
          className,
        )}
      >
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent
            side="left"
            className="bg-sidebar text-sidebar-foreground w-[17rem] border-sidebar-border gap-0 p-0"
            showCloseButton={false}
          >
            <div className="flex min-h-dvh flex-col gap-6 px-4 py-6">
              <StudioNav
                pathname={safePathname}
                onNavigate={() => setMobileNavOpen(false)}
              />
            </div>
          </SheetContent>
        </Sheet>
        <aside
          className={cn(
            "bg-sidebar text-sidebar-foreground shrink-0 flex-col gap-6 border-r border-sidebar-border px-4 py-6",
            // Flow canvas: keep aside fully hidden at all breakpoints — base `md:flex` would
            // otherwise override `hidden` at md+ and duplicate the Sheet nav.
            flowCanvas
              ? "hidden"
              : "hidden w-56 md:flex md:w-60",
          )}
          aria-label="Studio navigation"
          aria-hidden={flowCanvas}
        >
          <StudioNav pathname={safePathname} />
        </aside>
        <div className="bg-background flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <header
            className={cn(
              "border-outline-variant/15 bg-surface-container-low/90 sticky top-0 z-40 flex h-12 items-center justify-between border-b px-3 backdrop-blur-md md:hidden",
              flowCanvas && "hidden",
            )}
          >
            <Link
              href="/dashboard"
              className="text-sidebar-foreground text-sm font-semibold tracking-tight"
            >
              Agent Builder
            </Link>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground"
              aria-label="Toggle navigation menu"
              onClick={() => setMobileNavOpen((open) => !open)}
            >
              <Sidebar className="size-4" aria-hidden />
            </Button>
          </header>
          <StudioRunnerProvider>
            <div
              className={cn(
                "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
                !flowCanvas && "lg:flex-row",
              )}
            >
              <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <div
                  className={cn(
                    /^\/flows\/[^/]+$/.test(pathname ?? "") ||
                      /^\/flows\/[^/]+\/edit$/.test(pathname ?? "")
                      ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
                      : isFlowsListPage
                        ? "mx-auto flex w-full max-w-6xl min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-4 py-4 sm:px-5 sm:py-6 md:px-6"
                        : "mx-auto w-full max-w-6xl px-4 py-4 sm:px-5 sm:py-6 md:px-6",
                  )}
                >
                  {children}
                </div>
              </main>
              {!flowCanvas ? <StudioConversationPanel /> : null}
            </div>
          </StudioRunnerProvider>
        </div>
      </div>
    </StudioNavProvider>
  );
}
