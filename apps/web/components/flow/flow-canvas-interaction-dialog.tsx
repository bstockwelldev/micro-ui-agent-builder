"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { FlowCanvasInteractionSettings } from "@/lib/flow-canvas-interaction";
import { cn } from "@/lib/utils";

export type FlowCanvasInteractionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: FlowCanvasInteractionSettings;
  onChange: (patch: Partial<FlowCanvasInteractionSettings>) => void;
  onReset: () => void;
};

export function FlowCanvasInteractionDialog({
  open,
  onOpenChange,
  settings,
  onChange,
  onReset,
}: FlowCanvasInteractionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Canvas interaction</DialogTitle>
          <DialogDescription>
            How dragging, scrolling, and the cursor behave on the empty flow canvas. Node
            dragging is unchanged. Settings are saved in this browser.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-1">
          <fieldset className="space-y-2">
            <legend className="text-foreground mb-2 text-sm font-medium">
              Drag on empty canvas
            </legend>
            <p className="text-muted-foreground text-xs">
              <strong>Pan</strong> uses left-drag to move the view.{" "}
              <strong>Marquee select</strong> draws a selection box with left-drag; pan with
              middle or right mouse, or trackpad.
            </p>
            <div className="flex flex-col gap-2">
              <label
                className={cn(
                  "border-outline-variant/30 hover:bg-surface-container-highest/60 flex cursor-pointer items-start gap-3 rounded-lg border p-3",
                  settings.backgroundDrag === "pan" && "border-primary/50 bg-primary/5",
                )}
              >
                <input
                  type="radio"
                  className="mt-0.5"
                  name="flow-bg-drag"
                  checked={settings.backgroundDrag === "pan"}
                  onChange={() => onChange({ backgroundDrag: "pan" })}
                />
                <span>
                  <span className="text-sm font-medium">Pan (left-drag)</span>
                  <span className="text-muted-foreground block text-xs">
                    Default: drag the canvas with the primary button.
                  </span>
                </span>
              </label>
              <label
                className={cn(
                  "border-outline-variant/30 hover:bg-surface-container-highest/60 flex cursor-pointer items-start gap-3 rounded-lg border p-3",
                  settings.backgroundDrag === "marquee" && "border-primary/50 bg-primary/5",
                )}
              >
                <input
                  type="radio"
                  className="mt-0.5"
                  name="flow-bg-drag"
                  checked={settings.backgroundDrag === "marquee"}
                  onChange={() => onChange({ backgroundDrag: "marquee" })}
                />
                <span>
                  <span className="text-sm font-medium">Marquee select</span>
                  <span className="text-muted-foreground block text-xs">
                    Left-drag selects multiple steps; pan with middle or right button.
                  </span>
                </span>
              </label>
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-foreground mb-2 text-sm font-medium">
              Scroll wheel / trackpad scroll
            </legend>
            <div className="flex flex-col gap-2">
              <label
                className={cn(
                  "border-outline-variant/30 hover:bg-surface-container-highest/60 flex cursor-pointer items-start gap-3 rounded-lg border p-3",
                  settings.wheelScroll === "zoom" && "border-primary/50 bg-primary/5",
                )}
              >
                <input
                  type="radio"
                  className="mt-0.5"
                  name="flow-wheel"
                  checked={settings.wheelScroll === "zoom"}
                  onChange={() => onChange({ wheelScroll: "zoom" })}
                />
                <span>
                  <span className="text-sm font-medium">Zoom</span>
                  <span className="text-muted-foreground block text-xs">
                    Scroll to zoom in and out (use controls or pinch as usual).
                  </span>
                </span>
              </label>
              <label
                className={cn(
                  "border-outline-variant/30 hover:bg-surface-container-highest/60 flex cursor-pointer items-start gap-3 rounded-lg border p-3",
                  settings.wheelScroll === "pan" && "border-primary/50 bg-primary/5",
                )}
              >
                <input
                  type="radio"
                  className="mt-0.5"
                  name="flow-wheel"
                  checked={settings.wheelScroll === "pan"}
                  onChange={() => onChange({ wheelScroll: "pan" })}
                />
                <span>
                  <span className="text-sm font-medium">Pan</span>
                  <span className="text-muted-foreground block text-xs">
                    Scroll moves the viewport (zoom via pinch or the + / − controls).
                  </span>
                </span>
              </label>
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-foreground mb-2 text-sm font-medium">
              Cursor on empty canvas
            </legend>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="cursor-grab" className="sr-only">
                  Grab hand cursor
                </Label>
                <Button
                  id="cursor-grab"
                  type="button"
                  variant={settings.emptyPaneCursor === "grab" ? "synth" : "outline"}
                  className="h-auto w-full flex-col gap-1 py-3"
                  aria-pressed={settings.emptyPaneCursor === "grab"}
                  onClick={() => onChange({ emptyPaneCursor: "grab" })}
                >
                  <span className="text-sm font-semibold">Grab</span>
                  <span className="text-muted-foreground text-[11px] font-normal">
                    Hand / grab affordance
                  </span>
                </Button>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cursor-pointer" className="sr-only">
                  Pointer cursor
                </Label>
                <Button
                  id="cursor-pointer"
                  type="button"
                  variant={settings.emptyPaneCursor === "pointer" ? "synth" : "outline"}
                  className="h-auto w-full flex-col gap-1 py-3"
                  aria-pressed={settings.emptyPaneCursor === "pointer"}
                  onClick={() => onChange({ emptyPaneCursor: "pointer" })}
                >
                  <span className="text-sm font-semibold">Pointer</span>
                  <span className="text-muted-foreground text-[11px] font-normal">
                    Selection / click affordance
                  </span>
                </Button>
              </div>
            </div>
          </fieldset>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => {
              onReset();
            }}
          >
            Reset to defaults
          </Button>
          <Button type="button" variant="synth" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
