"use client";

import { useCallback, useEffect, useState } from "react";

import type { StudioResourceStatusPayload } from "@/lib/studio-resource-status-types";

export function useStudioResourceStatus() {
  const [data, setData] = useState<StudioResourceStatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/studio/resource-status");
      const text = await res.text();
      if (!res.ok) {
        throw new Error(text.trim() || `HTTP ${res.status}`);
      }
      setData(JSON.parse(text) as StudioResourceStatusPayload);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "Failed to load resource status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, refetch: load };
}
