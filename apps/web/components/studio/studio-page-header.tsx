"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, RefreshCw } from "lucide-react";

type Props = {
  title: string;
  description: ReactNode;
  loading?: boolean;
  onRefresh?: () => void;
};

export function StudioPageHeader({
  title,
  description,
  loading = false,
  onRefresh,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
        {onRefresh ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="transition-expressive"
            onClick={() => void onRefresh()}
            disabled={loading}
            aria-busy={loading}
          >
            <RefreshCw
              className={cn("mr-2 size-4", loading && "animate-spin")}
              aria-hidden
            />
            Refresh
          </Button>
        ) : null}
      </div>
      {loading ? (
        <p
          className="text-muted-foreground flex items-center gap-2 text-sm"
          aria-live="polite"
        >
          <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
          Loading studio data…
        </p>
      ) : null}
    </div>
  );
}
