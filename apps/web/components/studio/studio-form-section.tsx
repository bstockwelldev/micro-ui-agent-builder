"use client";

/**
 * Groups related fields in studio modals (agents, LLM profiles, etc.) for scanability.
 */
export function StudioFormSection({
  sectionId,
  title,
  hint,
  children,
}: {
  sectionId: string;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const headingId = `studio-section-${sectionId}`;
  return (
    <section
      className="border-outline-variant/10 space-y-3 border-b pb-4 last:border-b-0 last:pb-0"
      aria-labelledby={headingId}
    >
      <div>
        <h3
          id={headingId}
          className="text-foreground text-[10px] font-bold tracking-widest uppercase"
        >
          {title}
        </h3>
        {hint ? (
          <p className="text-muted-foreground mt-1.5 text-[11px] leading-snug">{hint}</p>
        ) : null}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
