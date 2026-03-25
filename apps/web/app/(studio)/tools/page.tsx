"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type { ToolDefinition } from "@repo/shared";

export default function ToolsPage() {
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/studio");
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        if (!cancelled) setTools(data.tools ?? []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load tools");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <p className="text-destructive text-sm" role="alert">
        {error}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tools</h1>
        <p className="text-muted-foreground text-sm">
          Catalog definitions exposed to the agent. Approval-required tools show
          approve/deny in Run.
        </p>
      </div>
      <ul className="grid gap-4 md:grid-cols-2">
        {tools.map((t) => (
          <li key={t.id}>
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base">{t.id}</CardTitle>
                  {t.requiresApproval ? (
                    <Badge variant="outline">Approval</Badge>
                  ) : null}
                </div>
                <CardDescription>{t.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted/40 max-h-36 overflow-auto rounded-md p-2 text-[11px]">
                  {t.parametersJson}
                </pre>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
      {tools.length === 0 && (
        <p className="text-muted-foreground text-sm">No tools in catalog.</p>
      )}
    </div>
  );
}
