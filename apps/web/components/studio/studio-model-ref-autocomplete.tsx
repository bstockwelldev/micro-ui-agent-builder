"use client";

import { Autocomplete } from "@base-ui/react/autocomplete";
import { useMemo } from "react";

import type { StudioModelPreset } from "@/lib/studio-llm-providers";
import { cn } from "@/lib/utils";

const INPUT_CLASS =
  "ghost-border h-8 w-full min-w-0 rounded-lg border bg-surface-container-low/40 px-2.5 py-1 font-mono text-sm outline-none transition-[color,box-shadow] transition-expressive placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-surface-container-low/50";

type StudioModelRefAutocompleteProps = {
  id?: string;
  value: string;
  onValueChange: (next: string) => void;
  presets: readonly StudioModelPreset[];
  disabled?: boolean;
  className?: string;
  "aria-invalid"?: boolean;
};

function modelRefFilter(
  item: StudioModelPreset,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    item.value.toLowerCase().includes(q) ||
    item.label.toLowerCase().includes(q)
  );
}

export function StudioModelRefAutocomplete({
  id,
  value,
  onValueChange,
  presets,
  disabled,
  className,
  "aria-invalid": ariaInvalid,
}: StudioModelRefAutocompleteProps) {
  const items = useMemo(() => {
    const list = [...presets];
    const v = value.trim();
    if (v && !list.some((p) => p.value === v)) {
      list.unshift({ value: v, label: v });
    }
    return list;
  }, [presets, value]);

  return (
    <Autocomplete.Root
      items={items}
      value={value}
      onValueChange={onValueChange}
      filter={modelRefFilter}
      openOnInputClick
      disabled={disabled}
      itemToStringValue={(item) => item.value}
    >
      <Autocomplete.Input
        id={id}
        className={cn(INPUT_CLASS, className)}
        autoComplete="off"
        aria-invalid={ariaInvalid}
      />
      <Autocomplete.Portal>
        <Autocomplete.Positioner className="z-[200] outline-none" sideOffset={4}>
          <Autocomplete.Popup
            className={cn(
              "ghost-border max-h-60 overflow-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-md",
            )}
          >
            <Autocomplete.List className="max-h-52 scroll-py-1">
              {(item: StudioModelPreset) => (
                <Autocomplete.Item
                  key={item.value}
                  value={item}
                  className={cn(
                    "flex cursor-default flex-col gap-0.5 rounded-md px-2 py-1.5 text-sm outline-none select-none",
                    "data-highlighted:bg-accent/15 data-highlighted:text-accent-foreground",
                  )}
                >
                  <span className="font-mono text-xs">{item.value}</span>
                  <span className="text-muted-foreground text-[11px]">
                    {item.label}
                  </span>
                </Autocomplete.Item>
              )}
            </Autocomplete.List>
            <Autocomplete.Empty className="text-muted-foreground px-2 py-2 text-xs">
              No matching models
            </Autocomplete.Empty>
          </Autocomplete.Popup>
        </Autocomplete.Positioner>
      </Autocomplete.Portal>
    </Autocomplete.Root>
  );
}
