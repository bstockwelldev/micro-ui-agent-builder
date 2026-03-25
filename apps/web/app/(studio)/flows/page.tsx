"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type { FlowDocument } from "@repo/shared";

export default function FlowsPage() {
  const [flows, setFlows] = useState<FlowDocument[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/studio");
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        if (!cancelled) setFlows(data.flows ?? []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load flows");
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
        <h1 className="text-2xl font-semibold tracking-tight">Flows</h1>
        <p className="text-muted-foreground text-sm">
          Linear flow documents drive system context and model selection for Run.
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2">
        {flows.map((flow) => (
          <li key={flow.id}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{flow.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {flow.description ?? flow.id}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{flow.steps.length} steps</Badge>
                <Link
                  href={`/run?flowId=${encodeURIComponent(flow.id)}`}
                  className="text-primary text-sm font-medium underline-offset-4 hover:underline"
                >
                  Open in Run
                </Link>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
      {flows.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No flows yet. Seed data is created on first API access.
        </p>
      )}
    </div>
  );
}
