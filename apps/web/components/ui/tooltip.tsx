"use client";

import { Tooltip } from "@base-ui/react/tooltip";
import type { ReactElement } from "react";

import { cn } from "@/lib/utils";

export const TooltipProvider = Tooltip.Provider;

export function SimpleTooltip({
  label,
  children,
  side = "top",
  sideOffset = 6,
  delay = 400,
  disabled,
}: {
  label: string;
  children: ReactElement;
  side?: "top" | "bottom" | "left" | "right" | "inline-start" | "inline-end";
  sideOffset?: number;
  delay?: number;
  disabled?: boolean;
}) {
  if (disabled) {
    return children;
  }
  return (
    <Tooltip.Root>
      <Tooltip.Trigger delay={delay} render={children} />
      <Tooltip.Portal>
        <Tooltip.Positioner
          side={side}
          sideOffset={sideOffset}
          className="isolate z-[200] outline-none"
        >
          <Tooltip.Popup
            className={cn(
              "border-border bg-popover text-popover-foreground max-w-[min(20rem,calc(100vw-1rem))] rounded-md border px-2 py-1 text-xs shadow-md",
              "data-[instant]:transition-none",
            )}
          >
            {label}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
