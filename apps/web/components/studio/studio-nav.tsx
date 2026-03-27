"use client";

import Link from "next/link";
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
  Wrench,
} from "lucide-react";

import { StudioAuthSection } from "@/components/studio/studio-auth-section";
import { cn } from "@/lib/utils";

const studioNavGroups = [
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

function isStudioNavItemActive(pathname: string, href: string) {
  if (href === "/flows") {
    return pathname === "/flows" || pathname.startsWith("/flows/");
  }
  if (href === "/agents") {
    return pathname === "/agents" || pathname.startsWith("/agents/");
  }
  if (href === "/genui") {
    return pathname === "/genui" || pathname.startsWith("/genui/");
  }
  if (href === "/history") {
    return pathname === "/history" || pathname.startsWith("/runs/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function StudioNav({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div>
        <Link
          href="/flows"
          className="text-sidebar-foreground text-lg font-semibold tracking-tight transition-expressive hover:text-sidebar-primary"
          onClick={onNavigate}
        >
          Agent Builder
        </Link>
        <p className="text-muted-foreground mt-1 text-xs leading-snug">
          Flow studio · AI SDK v6
        </p>
      </div>
      <nav className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">
        {studioNavGroups.map((group) => (
          <div key={group.label} className="space-y-2">
            <p className="text-muted-foreground px-2 text-[10px] font-semibold tracking-wider uppercase">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
                const active = isStudioNavItemActive(pathname, href);
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
                      onClick={onNavigate}
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
}
