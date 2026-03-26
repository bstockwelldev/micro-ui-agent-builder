"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type KnowledgeApi = {
  flowId: string;
  documents: Array<{
    id: string;
    name: string;
    mimeType: string;
    uploadedAt: string;
    charCount: number;
  }>;
  chunkCount: number;
  embeddingProvider: string | null;
  embeddingModelId: string | null;
};

export function FlowKnowledgePanel({ flowId }: { flowId: string }) {
  const [data, setData] = useState<KnowledgeApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/flows/${encodeURIComponent(flowId)}/knowledge`,
      );
      const j: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof j === "object" &&
          j !== null &&
          "error" in j &&
          typeof (j as { error: unknown }).error === "string"
            ? (j as { error: string }).error
            : res.statusText;
        throw new Error(msg);
      }
      setData(j as KnowledgeApi);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load knowledge");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [flowId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(
        `/api/flows/${encodeURIComponent(flowId)}/knowledge`,
        { method: "POST", body: fd },
      );
      const j: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof j === "object" &&
          j !== null &&
          "error" in j &&
          typeof (j as { error: unknown }).error === "string"
            ? (j as { error: string }).error
            : res.statusText;
        throw new Error(msg);
      }
      const row = j as Record<string, unknown>;
      setData({
        flowId,
        documents: (row.documents as KnowledgeApi["documents"]) ?? [],
        chunkCount: typeof row.chunkCount === "number" ? row.chunkCount : 0,
        embeddingProvider:
          typeof row.embeddingProvider === "string" ? row.embeddingProvider : null,
        embeddingModelId:
          typeof row.embeddingModelId === "string" ? row.embeddingModelId : null,
      });
    } catch (er) {
      setError(er instanceof Error ? er.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function removeDoc(documentId: string) {
    setError(null);
    try {
      const res = await fetch(
        `/api/flows/${encodeURIComponent(flowId)}/knowledge?documentId=${encodeURIComponent(documentId)}`,
        { method: "DELETE" },
      );
      const j: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof j === "object" &&
          j !== null &&
          "error" in j &&
          typeof (j as { error: unknown }).error === "string"
            ? (j as { error: string }).error
            : res.statusText;
        throw new Error(msg);
      }
      const row = j as Record<string, unknown>;
      setData({
        flowId,
        documents: (row.documents as KnowledgeApi["documents"]) ?? [],
        chunkCount: typeof row.chunkCount === "number" ? row.chunkCount : 0,
        embeddingProvider:
          typeof row.embeddingProvider === "string" ? row.embeddingProvider : null,
        embeddingModelId:
          typeof row.embeddingModelId === "string" ? row.embeddingModelId : null,
      });
    } catch (er) {
      setError(er instanceof Error ? er.message : "Delete failed");
    }
  }

  return (
    <div className="bg-surface-container-low/50 ring-outline-variant/20 space-y-4 rounded-lg p-4 ring-1">
      <h2 className="text-sm font-medium">Flow knowledge (RAG)</h2>
      <p className="text-muted-foreground text-xs">
        Upload <code className="text-[10px]">.txt</code> or <code className="text-[10px]">.md</code>{" "}
        files. Chunks are embedded with the AI SDK using OpenAI (
        <code className="text-[10px]">text-embedding-3-small</code> when{" "}
        <code className="text-[10px]">OPENAI_API_KEY</code> is set) or Gemini (
        <code className="text-[10px]">gemini-embedding-001</code>). Turn on “Use knowledge base when
        running this flow” so Run and GenUI append retrieved snippets after preflight. Vectors live
        in <code className="text-[10px]">data/flow-knowledge.json</code> (ephemeral on Vercel{" "}
        <code className="text-[10px]">/tmp</code>).
      </p>
      {loading ? <p className="text-muted-foreground text-sm">Loading…</p> : null}
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      {!loading && data ? (
        <>
          {data.embeddingProvider ? (
            <p className="text-muted-foreground text-xs">
              Index: {data.embeddingProvider} / {data.embeddingModelId} — {data.chunkCount}{" "}
              chunk(s)
            </p>
          ) : (
            <p className="text-muted-foreground text-xs">No documents indexed yet.</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor={`kb-upload-${flowId}`} className="sr-only">
              Upload knowledge file
            </Label>
            <input
              id={`kb-upload-${flowId}`}
              type="file"
              accept=".txt,.md,.text,text/plain,text/markdown"
              className="text-muted-foreground max-w-full text-sm file:mr-2 file:rounded file:border-0 file:bg-surface-container-high file:px-2 file:py-1"
              disabled={uploading}
              onChange={(e) => void onUpload(e)}
            />
            {uploading ? (
              <span className="text-muted-foreground text-xs">Uploading…</span>
            ) : null}
          </div>
          {data.documents.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {data.documents.map((d) => (
                <li
                  key={d.id}
                  className="bg-surface-container-lowest/40 flex flex-wrap items-center justify-between gap-2 rounded-md px-2 py-1.5"
                >
                  <span className="min-w-0 truncate font-mono text-xs">{d.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {d.charCount} chars · {new Date(d.uploadedAt).toLocaleString()}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={() => void removeDoc(d.id)}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
