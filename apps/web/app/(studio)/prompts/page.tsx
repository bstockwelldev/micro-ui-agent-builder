"use client";

import { StudioPage } from "@/components/studio/studio-page";
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
    <StudioPage>
      <StudioPageHeader
        title="Prompt Lab"
        description="Prompt templates referenced by flow steps (system / user nodes). Compare versions and attach eval hooks when the runner persists drafts."
        loading={loading}
        onRefresh={refetch}
      />
      {error && !loading ? (
        <div
          className="glass-panel ring-destructive/30 space-y-2 rounded-lg p-4 ring-1"
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
                    <CardDescription className="font-mono text-xs">{p.id}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-surface-container-lowest/90 max-h-48 overflow-auto rounded-lg p-3 font-mono text-xs whitespace-pre-wrap ring-1 ring-outline-variant/20">
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
    </StudioPage>
  );
}
