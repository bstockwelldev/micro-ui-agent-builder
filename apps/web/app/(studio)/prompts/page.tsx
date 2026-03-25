"use client";

import { StudioPageHeader } from "@/components/studio/studio-page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useStudioApi } from "@/hooks/use-studio-api";

export default function PromptsPage() {
  const { data, loading, error, refetch } = useStudioApi();
  const prompts = data?.prompts ?? [];

  return (
    <div className="space-y-6">
      <StudioPageHeader
        title="Prompts"
        description="Prompt templates referenced by flow steps (system / user nodes)."
        loading={loading}
        onRefresh={refetch}
      />
      {error && !loading ? (
        <div
          className="space-y-2 rounded-md border border-destructive/40 bg-destructive/5 p-4"
          role="alert"
        >
          <p className="text-destructive text-sm">{error}</p>
          <Button type="button" size="sm" variant="outline" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : null}
      {!loading && !error ? (
        <>
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
          {prompts.length === 0 ? (
            <p className="text-muted-foreground text-sm">No prompt templates.</p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
