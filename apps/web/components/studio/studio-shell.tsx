"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Bot,
  FileText,
  History,
  LayoutDashboard,
  Layers,
  Play,
  Rocket,
  Server,
  ShieldCheck,
  Sidebar,
  Wrench,
} from "lucide-react";

import { StudioAuthSection } from "@/components/studio/studio-auth-section";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    label: "Build",
    items: [
      { href: "/flows", label: "Flows", icon: LayoutDashboard },
      { href: "/agents", label: "Agents", icon: Bot },
      { href: "/prompts", label: "Prompts", icon: FileText },
      { href: "/tools", label: "Tools", icon: Wrench },
      { href: "/genui", label: "GenUI", icon: Layers },
      { href: "/mcp", label: "MCP", icon: Server },
    ],
  },
  {
    label: "Run",
    items: [
      { href: "/run", label: "Run", icon: Play },
      { href: "/history", label: "History", icon: History },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/deployments", label: "Deployments", icon: Rocket },
      { href: "/evaluations", label: "Evaluations", icon: ShieldCheck },
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
] as const;

export function StudioShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/flows"
      ? pathname === "/flows" || pathname.startsWith("/flows/")
      : href === "/agents"
        ? pathname === "/agents" || pathname.startsWith("/agents/")
        : href === "/genui"
          ? pathname === "/genui" || pathname.startsWith("/genui/")
          : href === "/history"
            ? pathname === "/history" || pathname.startsWith("/runs/")
            : pathname === href || pathname.startsWith(`${href}/`);

  const navContent = (
    <>
      <div>
        <Link
          href="/flows"
          className="text-sidebar-foreground text-lg font-semibold tracking-tight transition-expressive hover:text-sidebar-primary"
          onClick={() => setMobileNavOpen(false)}
        >
          Agent Builder
        </Link>
        <p className="text-muted-foreground mt-1 text-xs leading-snug">
          Flow studio · AI SDK v6
        </p>
      </div>
      <nav className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-2">
            <p className="text-muted-foreground px-2 text-[10px] font-semibold tracking-wider uppercase">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={cn(
                        "transition-expressive flex items-center gap-2 rounded-md px-2 py-2 text-sm",
                        active
                          ? "bg-sidebar-accent text-sidebar-foreground font-medium"
                          : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
                      )}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setMobileNavOpen(false)}
                    >
                      <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <StudioAuthSection />
    </>
  );

  return (
    <div
      className={cn(
        "bg-background text-foreground flex min-h-dvh",
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
            {navContent}
          </div>
        </SheetContent>
      </Sheet>
      <aside
        className="bg-sidebar text-sidebar-foreground hidden w-56 shrink-0 flex-col gap-6 border-r border-sidebar-border px-4 py-6 md:flex md:w-60"
        aria-label="Studio navigation"
      >
        {navContent}
      </aside>
      <div className="bg-background flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="border-outline-variant/15 bg-surface-container-low/90 sticky top-0 z-40 flex h-12 items-center justify-between border-b px-3 backdrop-blur-md md:hidden">
          <Link
            href="/flows"
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
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div
            className={cn(
              /^\/flows\/[^/]+$/.test(pathname ?? "") ||
                /^\/flows\/[^/]+\/edit$/.test(pathname ?? "")
                ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
                : "mx-auto w-full max-w-6xl px-4 py-4 sm:px-5 sm:py-6 md:px-6",
            )}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
