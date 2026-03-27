import { Suspense } from "react";

import { StudioShell } from "@/components/studio/studio-shell";

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="bg-background min-h-dvh" />}>
      <StudioShell>{children}</StudioShell>
    </Suspense>
  );
}
