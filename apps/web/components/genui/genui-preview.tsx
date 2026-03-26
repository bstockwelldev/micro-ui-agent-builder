"use client";

import type { GenuiNode } from "@repo/shared";

/**
 * Renders a GenUI surface tree for studio review (mirrors `GenuiNode` in @repo/shared).
 */
export function GenuiPreview({ node }: { node: GenuiNode }) {
  switch (node.type) {
    case "Stack": {
      const gapClass =
        node.props?.gap != null
          ? node.props.gap <= 8
            ? "gap-2"
            : node.props.gap <= 16
              ? "gap-4"
              : "gap-6"
          : "gap-3";
      return (
        <div
          className={`flex items-start ${node.props?.direction === "row" ? "flex-row" : "flex-col"} ${gapClass}`}
        >
          {node.children.map((child, i) => (
            <GenuiPreview key={i} node={child} />
          ))}
        </div>
      );
    }
    case "Text":
      return (
        <p className="text-foreground text-sm leading-relaxed">
          {node.props.content}
        </p>
      );
    case "Button":
      return (
        <button
          type="button"
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
        >
          {node.props.label}
          {node.props.actionId ? (
            <span className="text-primary-foreground/70 ml-2 font-mono text-[10px]">
              action:{node.props.actionId}
            </span>
          ) : null}
        </button>
      );
    case "Card":
      return (
        <div className="border-border bg-card rounded-xl border p-4 shadow-sm">
          {node.props?.title ? (
            <h3 className="text-foreground mb-2 text-sm font-semibold">
              {node.props.title}
            </h3>
          ) : null}
          <div className="space-y-2">
            {(node.children ?? []).map((child, i) => (
              <GenuiPreview key={i} node={child} />
            ))}
          </div>
        </div>
      );
    case "FormField":
      return (
        <label className="block space-y-1">
          <span className="text-muted-foreground text-xs">{node.props.label}</span>
          <input
            type={node.props.inputType === "number" ? "number" : "text"}
            readOnly
            aria-readonly
            className="border-input bg-background text-foreground w-full rounded-md border px-2 py-1.5 text-sm"
            placeholder="Preview"
          />
        </label>
      );
    default: {
      const _exhaustive: never = node;
      return _exhaustive;
    }
  }
}
