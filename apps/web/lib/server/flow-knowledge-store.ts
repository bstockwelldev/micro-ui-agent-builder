import fs from "node:fs/promises";

import { getDataDir, getFlowKnowledgeFilePath } from "./paths";

export type FlowKnowledgeEmbeddingProvider = "openai" | "google";

export type FlowKnowledgeDocument = {
  id: string;
  name: string;
  mimeType: string;
  uploadedAt: string;
  charCount: number;
};

export type FlowKnowledgeChunk = {
  id: string;
  documentId: string;
  text: string;
  vector: number[];
};

export type FlowKnowledgeEntry = {
  embeddingProvider: FlowKnowledgeEmbeddingProvider;
  embeddingModelId: string;
  documents: FlowKnowledgeDocument[];
  chunks: FlowKnowledgeChunk[];
};

export type FlowKnowledgeRoot = {
  version: 1;
  flows: Record<string, FlowKnowledgeEntry>;
};

const EMPTY_ROOT: FlowKnowledgeRoot = { version: 1, flows: {} };

export async function readFlowKnowledgeRoot(): Promise<FlowKnowledgeRoot> {
  const file = getFlowKnowledgeFilePath();
  try {
    const raw = await fs.readFile(file, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      (parsed as FlowKnowledgeRoot).version !== 1 ||
      typeof (parsed as FlowKnowledgeRoot).flows !== "object" ||
      (parsed as FlowKnowledgeRoot).flows === null
    ) {
      return { ...EMPTY_ROOT };
    }
    return parsed as FlowKnowledgeRoot;
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      return { ...EMPTY_ROOT };
    }
    throw e;
  }
}

export async function writeFlowKnowledgeRoot(root: FlowKnowledgeRoot): Promise<void> {
  const file = getFlowKnowledgeFilePath();
  await fs.mkdir(getDataDir(), { recursive: true });
  await fs.writeFile(file, JSON.stringify(root, null, 2), "utf-8");
}

export function getFlowKnowledgeEntry(
  root: FlowKnowledgeRoot,
  flowId: string,
): FlowKnowledgeEntry | undefined {
  return root.flows[flowId];
}

export function summarizeEntryForApi(entry: FlowKnowledgeEntry | undefined): {
  documents: FlowKnowledgeDocument[];
  chunkCount: number;
  embeddingProvider: FlowKnowledgeEmbeddingProvider | null;
  embeddingModelId: string | null;
} {
  if (!entry) {
    return {
      documents: [],
      chunkCount: 0,
      embeddingProvider: null,
      embeddingModelId: null,
    };
  }
  return {
    documents: entry.documents,
    chunkCount: entry.chunks.length,
    embeddingProvider: entry.embeddingProvider,
    embeddingModelId: entry.embeddingModelId,
  };
}
