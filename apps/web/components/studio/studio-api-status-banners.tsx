"use client";

import { Button } from "@/components/ui/button";

type StudioApiStatusBannersProps = {
  saveError?: string | null;
  onDismissSaveError: () => void;
  loadError?: string | null;
  loading: boolean;
  onRetryLoad: () => void | Promise<void>;
};

export function StudioApiStatusBanners({
  saveError,
  onDismissSaveError,
  loadError,
  loading,
  onRetryLoad,
}: StudioApiStatusBannersProps) {
  return (
    <>
      {saveError ? (
        <div
          className="glass-panel ring-destructive/30 mb-4 space-y-2 rounded-lg p-4 ring-1"
          role="alert"
        >
          <p className="text-destructive text-sm">{saveError}</p>
          <Button type="button" size="sm" variant="outline" onClick={onDismissSaveError}>
            Dismiss
          </Button>
        </div>
      ) : null}
      {loadError && !loading ? (
        <div
          className="glass-panel ring-destructive/30 space-y-2 rounded-lg p-4 ring-1"
          role="alert"
        >
          <p className="text-destructive text-sm">{loadError}</p>
          <Button type="button" size="sm" variant="outline" onClick={() => void onRetryLoad()}>
            Try again
          </Button>
        </div>
      ) : null}
    </>
  );
}
