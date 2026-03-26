"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  FileText,
  History,
  LayoutDashboard,
  Play,
  Rocket,
  Server,
  ShieldCheck,
  Wrench,
} from "lucide-react";

import { cn } from "@/lib/utils";

const navGroups = [
  {
    label: "Build",
    items: [
      { href: "/flows", label: "Flows", icon: LayoutDashboard },
      { href: "/prompts", label: "Prompts", icon: FileText },
      { href: "/tools", label: "Tools", icon: Wrench },
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

  return (
    <div
      className={cn(
        "bg-background text-foreground flex min-h-screen",
        className,
      )}
    >
      <aside
        className="bg-sidebar text-sidebar-foreground flex w-56 shrink-0 flex-col gap-6 border-r border-sidebar-border px-4 py-6 md:w-60"
        aria-label="Studio navigation"
      >
        <div>
          <Link
            href="/flows"
            className="text-sidebar-foreground text-lg font-semibold tracking-tight transition-expressive hover:text-sidebar-primary"
          >
            Agent Builder
          </Link>
          <p className="text-muted-foreground mt-1 text-xs leading-snug">
            Flow studio · AI SDK v6
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-6">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-2">
              <p className="text-muted-foreground px-2 text-[10px] font-semibold tracking-wider uppercase">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map(({ href, label, icon: Icon }) => {
                  const active =
                    href === "/flows"
                      ? pathname === "/flows" || pathname.startsWith("/flows/")
                      : href === "/history"
                        ? pathname === "/history" || pathname.startsWith("/runs/")
                        : pathname === href || pathname.startsWith(`${href}/`);
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
      </aside>
      <div className="bg-background flex min-w-0 flex-1 flex-col">
        <main className="flex-1">
          <div className="mx-auto max-w-6xl px-5 py-6 md:px-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
