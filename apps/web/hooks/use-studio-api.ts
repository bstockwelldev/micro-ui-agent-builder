"use client";

import { parseStudioStore, type StudioStore } from "@repo/shared";
import { useCallback, useEffect, useState } from "react";

export function useStudioApi() {
  const [data, setData] = useState<StudioStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/studio");
      const text = await res.text();
      if (!res.ok) {
        throw new Error(text.trim() || `HTTP ${res.status}`);
      }
      const json: unknown = JSON.parse(text);
      setData(parseStudioStore(json));
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "Failed to load studio");
    } finally {
      setLoading(false);
    }
  }, []);

  const saveStore = useCallback(async (next: StudioStore) => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/studio", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const text = await res.text();
      if (!res.ok) {
        throw new Error(text.trim() || `HTTP ${res.status}`);
      }
      const parsed = parseStudioStore(JSON.parse(text) as unknown);
      setData(parsed);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed";
      setSaveError(msg);
      throw e;
    } finally {
      setSaving(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    data,
    loading,
    error,
    refetch: load,
    saveStore,
    saving,
    saveError,
    clearSaveError: () => setSaveError(null),
  };
}
