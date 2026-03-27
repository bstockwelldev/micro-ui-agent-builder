"use client";

import { useCallback, useEffect, useState } from "react";

import {
  DEFAULT_FLOW_CANVAS_INTERACTION,
  loadFlowCanvasInteractionSettings,
  saveFlowCanvasInteractionSettings,
  type FlowCanvasInteractionSettings,
} from "@/lib/flow-canvas-interaction";

export function useFlowCanvasInteractionSettings() {
  const [settings, setSettings] = useState<FlowCanvasInteractionSettings>(
    DEFAULT_FLOW_CANVAS_INTERACTION,
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSettings(loadFlowCanvasInteractionSettings());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveFlowCanvasInteractionSettings(settings);
  }, [settings, hydrated]);

  const updateSettings = useCallback(
    (patch: Partial<FlowCanvasInteractionSettings>) => {
      setSettings((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_FLOW_CANVAS_INTERACTION);
  }, []);

  return { settings, updateSettings, resetToDefaults };
}
