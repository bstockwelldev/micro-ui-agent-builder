"use client";

import type {
  FlowNodeType,
  FlowStep,
  FlowToolChoice,
  FlowValidationIssue,
  PromptTemplate,
  ToolDefinition,
} from "@repo/shared";
import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { StudioResourceStatusBadge } from "@/components/studio/studio-resource-status-badge";
import { Button } from "@/components/ui/button";
import type { StudioResourceStatusPayload } from "@/lib/studio-resource-status-types";
import {
  providerStateForModelRef,
  toolStatusById,
} from "@/lib/studio-resource-status-helpers";
import {
  STUDIO_LLM_PROVIDERS,
  coerceStudioLlmProviderLabel,
} from "@/lib/studio-llm-providers";
import { FLOW_NODE_TYPE_OPTIONS } from "@/lib/flow-default-step";

const TOOL_CHOICE_OPTIONS: { value: FlowToolChoice; label: string; hint: string }[] =
  [
    { value: "auto", label: "auto", hint: "Model may call tools when useful" },
    { value: "required", label: "required", hint: "Force a tool call when tools exist" },
    { value: "none", label: "none", hint: "Disable tool calls for this step" },
  ];

type PanelProps = {
  step: FlowStep | null;
  open: boolean;
  prompts: PromptTemplate[];
  tools: ToolDefinition[];
  resourceStatus?: StudioResourceStatusPayload | null;
  resourceStatusLoading?: boolean;
  /** Issues for the currently selected step (from `validateFlowSteps`). */
  validationIssues?: FlowValidationIssue[];
  onClose: () => void;
  onApply: (patch: Partial<FlowStep>) => void;
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-muted-foreground mb-2 block font-mono text-[10px] uppercase tracking-widest">
      {children}
    </span>
  );
}

export function FlowNodeConfigPanel({
  step,
  open,
  prompts,
  tools,
  resourceStatus,
  resourceStatusLoading,
  validationIssues = [],
  onClose,
  onApply,
}: PanelProps) {
  const [refId, setRefId] = useState("");
  const [content, setContent] = useState("");
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [topPOverride, setTopPOverride] = useState(false);
  const [topP, setTopP] = useState(0.95);
  const [toolChoice, setToolChoice] = useState<FlowToolChoice | "">("");
  const [displayLabel, setDisplayLabel] = useState("");
  const [allowUrls, setAllowUrls] = useState(false);
  const [rubricFailOnFindings, setRubricFailOnFindings] = useState(false);
  const [genuiCheckpointSurfaceJson, setGenuiCheckpointSurfaceJson] =
    useState("");
  const [maxToolIterations, setMaxToolIterations] = useState<number | "">("");
  const [codeExecLanguage, setCodeExecLanguage] = useState<
    "javascript" | "typescript" | "python" | ""
  >("");

  const promptOptions = useMemo(
    () => [...prompts].sort((a, b) => a.name.localeCompare(b.name)),
    [prompts],
  );
  const toolOptions = useMemo(
    () => [...tools].sort((a, b) => a.id.localeCompare(b.id)),
    [tools],
  );

  const selectedTool = useMemo(
    () => tools.find((t) => t.id === refId),
    [tools, refId],
  );

  useEffect(() => {
    if (!step) return;
    setRefId(step.refId ?? "");
    setContent(step.content ?? "");
    setProvider(
      coerceStudioLlmProviderLabel(step.modelProvider, step.model),
    );
    setModel(step.model ?? "");
    setTemperature(step.temperature ?? 0.7);
    setMaxTokens(step.maxTokens ?? 4096);
    setTopPOverride(step.topP !== undefined && step.topP !== null);
    setTopP(
      step.topP !== undefined && step.topP !== null ? step.topP : 0.95,
    );
    setToolChoice(step.toolChoice ?? "");
    setDisplayLabel(step.displayLabel ?? "");
    setAllowUrls(step.allowUrls === true);
    setRubricFailOnFindings(step.rubricFailOnFindings === true);
    setGenuiCheckpointSurfaceJson(step.genuiCheckpointSurfaceJson ?? "");
    setMaxToolIterations(
      step.maxToolIterations != null ? step.maxToolIterations : "",
    );
    setCodeExecLanguage(step.codeExecLanguage ?? "");
  }, [step]);

  if (!open || !step) return null;

  return (
    <aside
      className="border-outline-variant/15 bg-surface-container-low absolute right-0 top-0 z-40 flex h-full w-80 flex-col border-l shadow-[-10px_0_30px_rgba(0,0,0,0.5)]"
      aria-label="Node configuration"
    >
      <div className="border-outline-variant/10 border-b p-6">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-foreground text-sm font-bold tracking-tight">
            Configuration
          </h2>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground transition-colors"
            onClick={onClose}
            aria-label="Close configuration panel"
          >
            <X className="size-5" />
          </button>
        </div>
        <p className="text-secondary-foreground font-mono text-[10px]">
          NODE_ID: {step.id}
        </p>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        {validationIssues.length > 0 ? (
          <div
            className="border-destructive/50 bg-destructive/10 space-y-2 rounded-lg border p-3"
            role="alert"
          >
            <p className="text-destructive font-mono text-[10px] font-bold uppercase tracking-wider">
              Validation
            </p>
            <ul className="text-destructive/95 list-inside list-disc text-[11px] leading-snug">
              {validationIssues.map((vi, i) => (
                <li key={`${vi.field ?? "f"}-${i}`}>
                  {vi.field ? (
                    <span className="text-muted-foreground">{vi.field}: </span>
                  ) : null}
                  {vi.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <label className="block">
          <FieldLabel>Node type</FieldLabel>
          <select
            className="border-outline-variant/20 bg-surface-container-lowest text-foreground focus:border-primary w-full rounded-lg border p-2 text-xs outline-none transition-colors"
            value={step.type}
            onChange={(e) => {
              const t = e.target.value as FlowNodeType;
              if (t === step.type) return;
              onApply({ type: t });
            }}
            aria-label="Node type"
          >
            {FLOW_NODE_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <FieldLabel>Display label (optional)</FieldLabel>
          <input
            className="border-outline-variant/20 bg-surface-container-lowest text-foreground focus:border-primary w-full rounded-lg border p-2 font-mono text-xs outline-none"
            value={displayLabel}
            onChange={(e) => setDisplayLabel(e.target.value)}
            placeholder="Overrides canvas title for this node"
          />
        </label>

        {(step.type === "system" || step.type === "user") && (
          <>
            <label className="block">
              <FieldLabel>
                Prompt template ({step.type === "system" ? "system" : "user"})
              </FieldLabel>
              <select
                id="step-ref-prompt"
                className="border-outline-variant/20 bg-surface-container-lowest text-foreground focus:border-primary w-full rounded-lg border p-2 text-xs outline-none transition-colors"
                value={refId}
                onChange={(e) => setRefId(e.target.value)}
              >
                <option value="">— None —</option>
                {promptOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.id})
                  </option>
                ))}
              </select>
            </label>
            <p className="text-muted-foreground text-[11px] leading-snug">
              Resolved from the Prompts catalog and merged into the run&apos;s{" "}
              <code className="text-foreground/90">system</code> string (see
              flow compiler).
            </p>
            <label className="block">
              <FieldLabel>
                {step.type === "system"
                  ? "Inline system text"
                  : "User / context template"}
              </FieldLabel>
              <textarea
                className="border-outline-variant/20 bg-surface-container-lowest text-foreground/90 focus:border-primary h-32 w-full resize-none rounded-lg border p-3 font-mono text-[11px] outline-none transition-colors"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={
                  step.type === "system"
                    ? "Optional extra system instructions…"
                    : "Static or template user context…"
                }
              />
            </label>
          </>
        )}

        {(step.type === "llm" || step.type === "tool_loop") && (
          <>
            <label className="block">
              <FieldLabel>Model provider</FieldLabel>
              <select
                id="step-provider"
                className="border-outline-variant/20 bg-surface-container-lowest text-foreground focus:border-primary w-full rounded-lg border p-2 text-xs outline-none transition-colors"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
              >
                {STUDIO_LLM_PROVIDERS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <FieldLabel>Model id</FieldLabel>
              <input
                id="step-model"
                className="border-outline-variant/20 bg-surface-container-lowest text-foreground focus:border-primary w-full rounded-lg border p-2 font-mono text-xs outline-none transition-colors"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. gemini-2.5-flash-lite"
              />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground font-mono text-[10px] uppercase">
                Inferred provider
              </span>
              {resourceStatusLoading ? (
                <span className="text-muted-foreground text-[10px]">Checking…</span>
              ) : (
                (() => {
                  const inf = providerStateForModelRef(resourceStatus, model);
                  if (!inf) {
                    return (
                      <span className="text-muted-foreground text-[10px]">—</span>
                    );
                  }
                  const row = resourceStatus?.providers.find(
                    (p) => p.id === inf.providerId,
                  );
                  return (
                    <StudioResourceStatusBadge
                      state={inf.state}
                      note={
                        row
                          ? `${row.label} (${inf.providerId})`
                          : inf.providerId
                      }
                    />
                  );
                })()
              )}
            </div>
            <label className="block">
              <FieldLabel>Model instructions</FieldLabel>
              <textarea
                className="border-outline-variant/20 bg-surface-container-lowest text-foreground/90 focus:border-primary h-28 w-full resize-none rounded-lg border p-3 font-mono text-[11px] outline-none transition-colors"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Folded into system prompt as [Model instructions — LLM step]"
              />
            </label>
            <div className="border-outline-variant/10 space-y-6 border-t pt-4">
              <div className="space-y-2">
                <div className="text-muted-foreground flex justify-between font-mono text-[10px] uppercase">
                  <span>Temperature</span>
                  <span className="text-primary">{temperature.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.05}
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  aria-label="Temperature"
                  className="bg-surface-container-highest accent-primary h-1.5 w-full appearance-none rounded-full"
                />
              </div>
              <div className="space-y-2">
                <div className="text-muted-foreground flex justify-between font-mono text-[10px] uppercase">
                  <span>Max output tokens</span>
                  <span className="text-primary">{maxTokens}</span>
                </div>
                <input
                  type="range"
                  min={256}
                  max={32000}
                  step={256}
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(Number(e.target.value))}
                  aria-label="Max output tokens"
                  className="bg-surface-container-highest accent-primary h-1.5 w-full appearance-none rounded-full"
                />
              </div>
              <div className="space-y-2">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    className="border-outline-variant/40 accent-primary rounded"
                    checked={topPOverride}
                    onChange={(e) => setTopPOverride(e.target.checked)}
                  />
                  <span className="text-muted-foreground font-mono text-[10px] uppercase">
                    Set top P (nucleus sampling)
                  </span>
                </label>
                {topPOverride ? (
                  <>
                    <div className="text-muted-foreground flex justify-between font-mono text-[10px] uppercase">
                      <span>Top P</span>
                      <span className="text-primary">{topP.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={topP}
                      onChange={(e) => setTopP(Number(e.target.value))}
                      aria-label="Top P nucleus sampling"
                      className="bg-surface-container-highest accent-primary h-1.5 w-full appearance-none rounded-full"
                    />
                  </>
                ) : (
                  <p className="text-muted-foreground text-[10px]">
                    Omitted — provider default (forwarded only when enabled).
                  </p>
                )}
              </div>
            </div>
            <label className="block">
              <FieldLabel>
                Tool choice (AI SDK{" "}
                <code className="normal-case">streamText</code>)
              </FieldLabel>
              <select
                id="step-tool-choice"
                className="border-outline-variant/20 bg-surface-container-lowest text-foreground focus:border-primary w-full rounded-lg border p-2 text-xs outline-none transition-colors"
                value={toolChoice}
                onChange={(e) =>
                  setToolChoice(e.target.value as FlowToolChoice | "")
                }
              >
                <option value="">— Provider default —</option>
                {TOOL_CHOICE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label} — {o.hint}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <FieldLabel>
                Max tool iterations (
                {step.type === "tool_loop"
                  ? "required — maps to streamText maxSteps"
                  : "optional — enables multi-step tool use on LLM"}
                )
              </FieldLabel>
              <input
                type="number"
                min={1}
                max={64}
                className="border-outline-variant/20 bg-surface-container-lowest text-foreground focus:border-primary w-full rounded-lg border p-2 font-mono text-xs outline-none"
                value={maxToolIterations === "" ? "" : maxToolIterations}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") {
                    setMaxToolIterations("");
                    return;
                  }
                  const n = Number(v);
                  if (!Number.isFinite(n)) return;
                  setMaxToolIterations(Math.min(64, Math.max(1, Math.floor(n))));
                }}
                placeholder={step.type === "tool_loop" ? "e.g. 8" : "Leave empty for single-step"}
              />
            </label>
          </>
        )}

        {step.type === "tool" && (
          <>
            <label className="block">
              <FieldLabel>Catalog tool</FieldLabel>
              <select
                id="step-ref-tool"
                className="border-outline-variant/20 bg-surface-container-lowest text-foreground focus:border-primary w-full rounded-lg border p-2 text-xs outline-none transition-colors"
                value={refId}
                onChange={(e) => setRefId(e.target.value)}
              >
                <option value="">— Select tool —</option>
                {toolOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.id}
                    {t.requiresApproval ? " (approval)" : ""}
                  </option>
                ))}
              </select>
            </label>
            {refId.trim() ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground font-mono text-[10px] uppercase">
                  Runtime
                </span>
                {resourceStatusLoading ? (
                  <span className="text-muted-foreground text-[10px]">Checking…</span>
                ) : (
                  (() => {
                    const ts = toolStatusById(resourceStatus, refId.trim());
                    return ts ? (
                      <StudioResourceStatusBadge
                        state={ts.state}
                        note={ts.note}
                      />
                    ) : (
                      <span className="text-muted-foreground text-[10px]">—</span>
                    );
                  })()
                )}
              </div>
            ) : null}
            {selectedTool ? (
              <div className="border-outline-variant/15 bg-surface-container-highest/40 space-y-2 rounded-lg border p-3 text-[11px]">
                <p className="text-muted-foreground font-mono text-[10px] uppercase">
                  Description
                </p>
                <p className="text-foreground/90 leading-snug">
                  {selectedTool.description}
                </p>
                <p className="text-muted-foreground mt-2 font-mono text-[10px] uppercase">
                  parametersJson
                </p>
                <pre className="text-foreground/80 max-h-24 overflow-auto rounded bg-black/20 p-2 font-mono text-[10px] whitespace-pre-wrap">
                  {selectedTool.parametersJson || "{}"}
                </pre>
              </div>
            ) : null}
            <label className="block">
              <FieldLabel>Tool input notes</FieldLabel>
              <textarea
                className="border-outline-variant/20 bg-surface-container-lowest text-foreground/90 focus:border-primary h-28 w-full resize-none rounded-lg border p-3 font-mono text-[11px] outline-none transition-colors"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Hints for argument shape, examples, or JSON…"
              />
            </label>
            <p className="text-muted-foreground text-[11px] leading-snug">
              Tool nodes map to{" "}
              <code className="text-foreground/90">dynamicTool</code> entries at
              run time; approval flows use{" "}
              <code className="text-foreground/90">needsApproval</code> when the
              catalog marks the tool sensitive.
            </p>
          </>
        )}

        {step.type === "human_gate" && (
          <>
            <label className="block">
              <FieldLabel>Checkpoint instructions</FieldLabel>
              <textarea
                className="border-outline-variant/20 bg-surface-container-lowest text-foreground/90 focus:border-primary h-36 w-full resize-none rounded-lg border p-3 font-mono text-[11px] outline-none transition-colors"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Describe what must be confirmed before continuing…"
              />
            </label>
            <label className="block">
              <FieldLabel>GenUI checkpoint surface (JSON, optional)</FieldLabel>
              <textarea
                className="border-outline-variant/20 bg-surface-container-lowest text-foreground/90 focus:border-primary h-40 w-full resize-none rounded-lg border p-3 font-mono text-[11px] outline-none transition-colors"
                value={genuiCheckpointSurfaceJson}
                onChange={(e) => setGenuiCheckpointSurfaceJson(e.target.value)}
                placeholder='{"root": { "type": "Stack", "children": [...] } }'
              />
            </label>
            <p className="text-muted-foreground text-[11px] leading-snug">
              When set, parsed and merged into the compiled system prompt for
              structured approval UI (GenUI surface). Invalid JSON is rejected at
              validation time.
            </p>
          </>
        )}

        {step.type === "code_exec" && (
          <>
            <label className="block">
              <FieldLabel>Language hint</FieldLabel>
              <select
                className="border-outline-variant/20 bg-surface-container-lowest text-foreground focus:border-primary w-full rounded-lg border p-2 text-xs outline-none"
                value={codeExecLanguage}
                onChange={(e) =>
                  setCodeExecLanguage(
                    e.target.value as "javascript" | "typescript" | "python" | "",
                  )
                }
              >
                <option value="">— Not specified —</option>
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
              </select>
            </label>
            <label className="block">
              <FieldLabel>Catalog tool (optional sandbox runner)</FieldLabel>
              <select
                id="step-code-exec-tool"
                className="border-outline-variant/20 bg-surface-container-lowest text-foreground focus:border-primary w-full rounded-lg border p-2 text-xs outline-none transition-colors"
                value={refId}
                onChange={(e) => setRefId(e.target.value)}
              >
                <option value="">— None —</option>
                {toolOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.id}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <FieldLabel>Execution instructions</FieldLabel>
              <textarea
                className="border-outline-variant/20 bg-surface-container-lowest text-foreground/90 focus:border-primary h-36 w-full resize-none rounded-lg border p-3 font-mono text-[11px] outline-none transition-colors"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="How the agent should use code execution or the linked tool…"
              />
            </label>
            <p className="text-muted-foreground text-[11px] leading-snug">
              Merged into the system prompt; link a catalog tool when your
              runtime exposes a code/sandbox executor.
            </p>
          </>
        )}

        {step.type === "output" && (
          <>
            <label className="block">
              <FieldLabel>Output contract</FieldLabel>
              <textarea
                className="border-outline-variant/20 bg-surface-container-lowest text-foreground/90 focus:border-primary h-36 w-full resize-none rounded-lg border p-3 font-mono text-[11px] outline-none transition-colors"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Format, schema, tone, or GenUI surface expectations…"
              />
            </label>
            <p className="text-muted-foreground text-[11px] leading-snug">
              Use this to steer structured or GenUI-shaped responses (e.g.
              surface JSON matching the GenUI node types).
            </p>
          </>
        )}

        {step.type === "guardrail" && (
          <>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                className="border-outline-variant/40 accent-primary rounded"
                checked={allowUrls}
                onChange={(e) => setAllowUrls(e.target.checked)}
              />
              <span className="text-muted-foreground font-mono text-[10px] uppercase">
                Allow URLs in user text (policy.allowUrls)
              </span>
            </label>
            <label className="block">
              <FieldLabel>Notes (merged into compiled system)</FieldLabel>
              <textarea
                className="border-outline-variant/20 bg-surface-container-lowest text-foreground/90 focus:border-primary h-32 w-full resize-none rounded-lg border p-3 font-mono text-[11px] outline-none transition-colors"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Operator-facing note; runtime uses prompt-guardrails-core validatePromptInput on latest user message."
              />
            </label>
            <p className="text-muted-foreground text-[11px] leading-snug">
              Runs before the first LLM step on the run API. Blocks injection
              patterns, control chars, length, and URLs unless allowed above.
            </p>
          </>
        )}

        {step.type === "rubric" && (
          <>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                className="border-outline-variant/40 accent-primary rounded"
                checked={rubricFailOnFindings}
                onChange={(e) => setRubricFailOnFindings(e.target.checked)}
              />
              <span className="text-muted-foreground font-mono text-[10px] uppercase">
                Fail run on any static finding (prompt-rubric)
              </span>
            </label>
            <label className="block">
              <FieldLabel>Notes (merged into compiled system)</FieldLabel>
              <textarea
                className="border-outline-variant/20 bg-surface-container-lowest text-foreground/90 focus:border-primary h-32 w-full resize-none rounded-lg border p-3 font-mono text-[11px] outline-none transition-colors"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Scope or rubric hints; static scan uses analyzePromptSource on full compiled system string."
              />
            </label>
            <p className="text-muted-foreground text-[11px] leading-snug">
              Advisory by default. Enable fail-on-findings for CI-style gating
              before the model runs.
            </p>
          </>
        )}

        {step.type === "branch" && (
          <>
            <label className="block">
              <FieldLabel>Required substring (latest user message)</FieldLabel>
              <input
                className="border-outline-variant/20 bg-surface-container-lowest text-foreground focus:border-primary w-full rounded-lg border p-2 font-mono text-xs outline-none"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="e.g. APPROVE — case-insensitive match"
              />
            </label>
            <p className="text-muted-foreground text-[11px] leading-snug">
              If set, the run API returns 400 unless the latest user text
              contains this substring (case-insensitive). Leave empty to
              document-only.
            </p>
          </>
        )}

        <div className="border-outline-variant/5 bg-surface-container-highest/30 space-y-2 rounded-xl border p-4">
          <div className="text-muted-foreground flex justify-between font-mono text-[10px]">
            <span>Avg. latency</span>
            <span className="text-foreground">—</span>
          </div>
          <div className="text-muted-foreground flex justify-between font-mono text-[10px]">
            <span>Cost / 1k runs</span>
            <span className="text-foreground">—</span>
          </div>
        </div>
      </div>

      <div className="border-outline-variant/10 bg-surface-container-lowest border-t p-6">
        <Button
          type="button"
          className="bg-foreground text-background hover:bg-foreground/90 w-full rounded-xl py-6 text-xs font-bold uppercase tracking-widest"
          onClick={() => {
            const labelPatch = {
              displayLabel: displayLabel.trim() || undefined,
            };
            if (step.type === "system" || step.type === "user") {
              onApply({
                ...labelPatch,
                refId: refId.trim() || undefined,
                content: content.trim() || undefined,
              });
              return;
            }
            if (step.type === "llm" || step.type === "tool_loop") {
              const mti =
                maxToolIterations === ""
                  ? step.type === "tool_loop"
                    ? 8
                    : undefined
                  : maxToolIterations;
              onApply({
                ...labelPatch,
                modelProvider: provider,
                model: model.trim() || undefined,
                content: content.trim() || undefined,
                temperature,
                maxTokens,
                topP: topPOverride ? topP : undefined,
                toolChoice: toolChoice || undefined,
                maxToolIterations: mti,
              });
              return;
            }
            if (step.type === "tool") {
              onApply({
                ...labelPatch,
                refId: refId.trim() || undefined,
                content: content.trim() || undefined,
              });
              return;
            }
            if (step.type === "human_gate") {
              onApply({
                ...labelPatch,
                content: content.trim() || undefined,
                genuiCheckpointSurfaceJson:
                  genuiCheckpointSurfaceJson.trim() || undefined,
              });
              return;
            }
            if (step.type === "output") {
              onApply({
                ...labelPatch,
                content: content.trim() || undefined,
              });
              return;
            }
            if (step.type === "code_exec") {
              onApply({
                ...labelPatch,
                refId: refId.trim() || undefined,
                codeExecLanguage: codeExecLanguage || undefined,
                content: content.trim() || undefined,
              });
              return;
            }
            if (step.type === "guardrail") {
              onApply({
                ...labelPatch,
                allowUrls,
                content: content.trim() || undefined,
              });
              return;
            }
            if (step.type === "rubric") {
              onApply({
                ...labelPatch,
                rubricFailOnFindings,
                content: content.trim() || undefined,
              });
              return;
            }
            if (step.type === "branch") {
              onApply({
                ...labelPatch,
                content: content.trim() || undefined,
              });
              return;
            }
          }}
        >
          Apply changes
        </Button>
      </div>
    </aside>
  );
}
