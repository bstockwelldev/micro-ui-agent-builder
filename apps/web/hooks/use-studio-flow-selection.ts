"use client";

import { useParams, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const STORAGE_KEY = "studio.activeFlowId";

/**
 * Resolves flowId from URL (search or /flows/:id path) with sessionStorage fallback.
 * agentId comes from ?agentId= when present.
 */
export function useStudioFlowSelection() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const params = useParams();

  const pathFlowId =
    typeof pathname === "string"
      ? /^\/flows\/([^/]+)/.exec(pathname)?.[1]
      : undefined;
  const paramId = typeof params?.id === "string" ? params.id : undefined;
  const fromPath = pathFlowId ?? paramId;

  const urlFlowId = searchParams.get("flowId") ?? undefined;
  const [storedFlowId, setStoredFlowId] = useState<string | undefined>(
    undefined,
  );

  useEffect(() => {
    try {
      const s = sessionStorage.getItem(STORAGE_KEY);
      if (s) setStoredFlowId(s);
    } catch {
      /* ignore */
    }
  }, []);

  const mergedFromUrl = urlFlowId ?? fromPath;

  useEffect(() => {
    if (!mergedFromUrl) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, mergedFromUrl);
    } catch {
      /* ignore */
    }
    setStoredFlowId(mergedFromUrl);
  }, [mergedFromUrl]);

  const flowId = mergedFromUrl ?? storedFlowId;
  const agentId = searchParams.get("agentId") ?? undefined;

  return { flowId, agentId };
}
