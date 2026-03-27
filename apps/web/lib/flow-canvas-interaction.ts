export type BackgroundDragMode = "pan" | "marquee";
export type WheelScrollMode = "zoom" | "pan";
export type EmptyPaneCursor = "grab" | "pointer";

export type FlowCanvasInteractionSettings = {
  /** Pan with left-drag on empty canvas vs marquee-select (pan with middle/right). */
  backgroundDrag: BackgroundDragMode;
  /** Mouse wheel zooms the viewport vs pans it. */
  wheelScroll: WheelScrollMode;
  /** Cursor over empty canvas (nodes keep their own affordances). */
  emptyPaneCursor: EmptyPaneCursor;
};

export const FLOW_CANVAS_INTERACTION_STORAGE_KEY =
  "studio.flowCanvasInteraction.v1";

export const DEFAULT_FLOW_CANVAS_INTERACTION: FlowCanvasInteractionSettings = {
  backgroundDrag: "pan",
  wheelScroll: "zoom",
  emptyPaneCursor: "grab",
};

function isBackgroundDragMode(v: unknown): v is BackgroundDragMode {
  return v === "pan" || v === "marquee";
}

function isWheelScrollMode(v: unknown): v is WheelScrollMode {
  return v === "zoom" || v === "pan";
}

function isEmptyPaneCursor(v: unknown): v is EmptyPaneCursor {
  return v === "grab" || v === "pointer";
}

export function parseFlowCanvasInteractionSettings(
  raw: unknown,
): FlowCanvasInteractionSettings | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (
    !isBackgroundDragMode(o.backgroundDrag) ||
    !isWheelScrollMode(o.wheelScroll) ||
    !isEmptyPaneCursor(o.emptyPaneCursor)
  ) {
    return null;
  }
  return {
    backgroundDrag: o.backgroundDrag,
    wheelScroll: o.wheelScroll,
    emptyPaneCursor: o.emptyPaneCursor,
  };
}

export function loadFlowCanvasInteractionSettings(): FlowCanvasInteractionSettings {
  if (typeof window === "undefined") return DEFAULT_FLOW_CANVAS_INTERACTION;
  try {
    const s = window.localStorage.getItem(FLOW_CANVAS_INTERACTION_STORAGE_KEY);
    if (!s) return DEFAULT_FLOW_CANVAS_INTERACTION;
    const parsed = parseFlowCanvasInteractionSettings(JSON.parse(s));
    return parsed ?? DEFAULT_FLOW_CANVAS_INTERACTION;
  } catch {
    return DEFAULT_FLOW_CANVAS_INTERACTION;
  }
}

export function saveFlowCanvasInteractionSettings(
  settings: FlowCanvasInteractionSettings,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      FLOW_CANVAS_INTERACTION_STORAGE_KEY,
      JSON.stringify(settings),
    );
  } catch {
    /* ignore quota / private mode */
  }
}

export type FlowCanvasReactFlowBindings = {
  selectionOnDrag: boolean;
  panOnDrag: boolean | number[];
  zoomOnScroll: boolean;
  panOnScroll: boolean;
  paneCursorClassName: string;
};

/** Maps persisted settings to @xyflow/react props and pane cursor classes. */
export function flowCanvasInteractionToReactFlow(
  s: FlowCanvasInteractionSettings,
): FlowCanvasReactFlowBindings {
  const selectionOnDrag = s.backgroundDrag === "marquee";
  const panOnDrag = selectionOnDrag ? [1, 2] : true;
  const zoomOnScroll = s.wheelScroll === "zoom";
  const panOnScroll = s.wheelScroll === "pan";
  const paneCursorClassName =
    s.emptyPaneCursor === "grab"
      ? "[&_.react-flow__pane]:cursor-grab [&_.react-flow__pane:active]:cursor-grabbing"
      : "[&_.react-flow__pane]:cursor-pointer";
  return {
    selectionOnDrag,
    panOnDrag,
    zoomOnScroll,
    panOnScroll,
    paneCursorClassName,
  };
}
