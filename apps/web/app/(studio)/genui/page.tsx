"use client";

import type { GenuiNode } from "@repo/shared";

import { GenuiPreview } from "@/components/genui/genui-preview";
import { StudioPage } from "@/components/studio/studio-page";
import { StudioPageHeader } from "@/components/studio/studio-page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const SAMPLE_DASHBOARD: GenuiNode = {
  type: "Stack",
  props: { direction: "col", gap: 20 },
  children: [
    {
      type: "Text",
      props: {
        content: "Structured surfaces pair well with AI SDK tool results and `streamText` metadata.",
      },
    },
    {
      type: "Card",
      props: { title: "Status" },
      children: [
        {
          type: "Stack",
          props: { direction: "row", gap: 8 },
          children: [
            {
              type: "Button",
              id: "refresh",
              props: { label: "Refresh", actionId: "reload_metrics" },
            },
            {
              type: "Button",
              id: "export",
              props: { label: "Export" },
            },
          ],
        },
      ],
    },
  ],
};

const SAMPLE_FORM: GenuiNode = {
  type: "Stack",
  props: { direction: "col", gap: 16 },
  children: [
    { type: "Text", props: { content: "Quick capture" } },
    {
      type: "FormField",
      id: "title",
      props: { label: "Title", inputType: "text" },
    },
    {
      type: "FormField",
      id: "amount",
      props: { label: "Amount", inputType: "number" },
    },
    {
      type: "Button",
      id: "save",
      props: { label: "Save draft", actionId: "save_draft" },
    },
  ],
};

const TYPE_REFERENCE: {
  name: string;
  summary: string;
  fields: string[];
}[] = [
  {
    name: "Stack",
    summary: "Layout container; composes children vertically or horizontally.",
    fields: ["props.gap?", "props.direction? col | row", "children[]"],
  },
  {
    name: "Text",
    summary: "Static copy block for labels, descriptions, or lightweight prose.",
    fields: ["props.content"],
  },
  {
    name: "Button",
    summary: "Primary affordance; `actionId` maps to tool / client handler names.",
    fields: ["id", "props.label", "props.actionId?"],
  },
  {
    name: "Card",
    summary: "Grouped panel with optional title and nested GenUI children.",
    fields: ["props.title?", "children?[]"],
  },
  {
    name: "FormField",
    summary: "Label + input shell for structured data collection UIs.",
    fields: ["id", "props.label", "props.inputType? text | number"],
  },
];

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="border-border bg-muted/40 text-foreground/90 max-h-56 overflow-auto rounded-lg border p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export default function GenuiLibraryPage() {
  return (
    <StudioPage className="p-6 pb-16 md:p-8">
      <StudioPageHeader
        title="GenUI component library"
        description="Review surface node types shared with the Agent Builder store schema. Use an Output flow step to describe the JSON shape you expect; validate payloads with parseGenuiSurface from @repo/shared."
      />

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Example · dashboard strip</CardTitle>
            <CardDescription>
              Card + horizontal Stack of Buttons — common pattern for toolbars.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-border bg-background/80 rounded-lg border p-4">
              <GenuiPreview node={SAMPLE_DASHBOARD} />
            </div>
            <JsonBlock value={SAMPLE_DASHBOARD} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Example · form column</CardTitle>
            <CardDescription>
              Text, FormField nodes, and a closing action — aligns with strict
              tool / structured-output flows.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-border bg-background/80 rounded-lg border p-4">
              <GenuiPreview node={SAMPLE_FORM} />
            </div>
            <JsonBlock value={SAMPLE_FORM} />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Type reference</CardTitle>
          <CardDescription>
            Matches <code className="text-foreground">genuiNodeSchema</code> /
            <code className="text-foreground"> GenuiNode</code> in{" "}
            <code className="text-foreground">@repo/shared</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            {TYPE_REFERENCE.map((row) => (
              <li
                key={row.name}
                className="border-border border-b pb-4 last:border-0 last:pb-0"
              >
                <p className="text-foreground font-mono text-sm font-semibold">
                  {row.name}
                </p>
                <p className="text-muted-foreground mt-1 text-sm">{row.summary}</p>
                <ul className="text-muted-foreground mt-2 list-inside list-disc font-mono text-[11px]">
                  {row.fields.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI SDK v6 alignment</CardTitle>
          <CardDescription>
            Surfaces are transport-friendly JSON: keep props flat, stable{" "}
            <code className="text-foreground">id</code> values on interactive
            nodes, and compose with Stack instead of ad-hoc wrappers. Pair with{" "}
            <code className="text-foreground">streamText</code> tool results or
            experimental structured UI bridges the same way you would version
            any tool schema.
          </CardDescription>
        </CardHeader>
      </Card>
    </StudioPage>
  );
}
