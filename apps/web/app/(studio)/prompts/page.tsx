"use client";

import { useEffect, useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type { PromptTemplate } from "@repo/shared";

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/studio");
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        if (!cancelled) setPrompts(data.prompts ?? []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load prompts");
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
        <h1 className="text-2xl font-semibold tracking-tight">Prompts</h1>
        <p className="text-muted-foreground text-sm">
          Prompt templates referenced by flow steps (system / user nodes).
        </p>
      </div>
      <ul className="space-y-4">
        {prompts.map((p) => (
          <li key={p.id}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{p.name}</CardTitle>
                <CardDescription className="font-mono text-xs">
                  {p.id}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted/40 max-h-48 overflow-auto rounded-md p-3 text-xs whitespace-pre-wrap">
                  {p.body}
                </pre>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
      {prompts.length === 0 && (
        <p className="text-muted-foreground text-sm">No prompt templates.</p>
      )}
    </div>
  );
}
