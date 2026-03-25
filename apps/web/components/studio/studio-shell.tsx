import Link from "next/link";

import { cn } from "@/lib/utils";

const links = [
  { href: "/flows", label: "Flows" },
  { href: "/run", label: "Run" },
  { href: "/prompts", label: "Prompts" },
  { href: "/tools", label: "Tools" },
  { href: "/mcp", label: "MCP" },
] as const;

export function StudioShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-h-screen bg-background text-foreground", className)}>
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
          <Link
            href="/flows"
            className="text-lg font-semibold tracking-tight"
          >
            Agent Builder
          </Link>
          <nav
            className="flex flex-wrap gap-1"
            aria-label="Studio sections"
          >
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
