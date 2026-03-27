"use client";

import type { CSSProperties } from "react";

import { ControlButton, Controls, MiniMap, useReactFlow } from "@xyflow/react";
import { Map, ScanSearch } from "lucide-react";

/** Override @xyflow default near-white buttons + inherited muted icon color. */
const controlsThemeStyle = {
  "--xy-controls-button-background-color-default": "var(--surface-container-high)",
  "--xy-controls-button-background-color-hover-default": "var(--surface-container-highest)",
  "--xy-controls-button-color-default": "var(--foreground)",
  "--xy-controls-button-color-hover-default": "var(--foreground)",
  "--xy-controls-button-border-color-default":
    "color-mix(in srgb, var(--outline-variant) 30%, transparent)",
} as CSSProperties;

function FitViewControlButton() {
  const { fitView } = useReactFlow();

  return (
    <ControlButton
      className="!text-foreground"
      onClick={() => {
        void fitView({ padding: 0.15, duration: 200 });
      }}
      title="Fit view"
      aria-label="Fit flow to view"
    >
      <ScanSearch className="size-4 shrink-0 text-foreground" aria-hidden />
    </ControlButton>
  );
}

export type FlowEditorCanvasRailProps = {
  minimapVisible: boolean;
  onMinimapToggle: () => void;
};

export function FlowEditorCanvasRail({
  minimapVisible,
  onMinimapToggle,
}: FlowEditorCanvasRailProps) {
  return (
    <>
      <Controls
        position="top-right"
        orientation="vertical"
        showZoom={false}
        showFitView={false}
        showInteractive={false}
        style={controlsThemeStyle}
        className="!bg-surface-container-high !border-outline-variant/20 !shadow-lg !mt-12 !mr-2 sm:!mt-14 [&_button]:border-outline-variant/15 [&_.react-flow__controls-button_svg]:!max-h-4 [&_.react-flow__controls-button_svg]:!max-w-4 [&_.react-flow__controls-button_svg]:fill-none"
      >
        <FitViewControlButton />
        <ControlButton
          className="!text-foreground"
          onClick={onMinimapToggle}
          title={minimapVisible ? "Hide minimap" : "Show minimap"}
          aria-pressed={minimapVisible}
          aria-label="Toggle minimap"
        >
          <Map className="size-4 shrink-0 text-foreground" aria-hidden />
        </ControlButton>
      </Controls>
      {minimapVisible ? (
        <MiniMap
          position="bottom-right"
          className="!bg-surface-container-high/95 !border-outline-variant/25 !mr-3 !mb-32 !h-28 !w-40 sm:!mr-4 sm:!mb-40"
          pannable
          zoomable
          aria-label="Flow overview minimap"
        />
      ) : null}
    </>
  );
}
