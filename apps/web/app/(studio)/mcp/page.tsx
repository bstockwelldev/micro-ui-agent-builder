"use client";

import { nanoid } from "nanoid";
import { useState } from "react";
import type { McpServerConfig } from "@repo/shared";

import { StudioApiStatusBanners } from "@/components/studio/studio-api-status-banners";
import { StudioConfirmDialog } from "@/components/studio/studio-confirm-dialog";
import { StudioPage } from "@/components/studio/studio-page";
import { StudioPageHeader } from "@/components/studio/studio-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  studioCardEditHint,
  studioResourceCardInteractiveClass,
  StudioCardDeleteIconButton,
  StudioCardEditIconButton,
} from "@/components/studio/studio-resource-card-actions";
import { StudioResourceStatusBadge } from "@/components/studio/studio-resource-status-badge";
import { useStudioApi } from "@/hooks/use-studio-api";
import { useStudioResourceStatus } from "@/hooks/use-studio-resource-status";
import { mcpStatusById } from "@/lib/studio-resource-status-helpers";
import { STUDIO_NATIVE_SELECT_CLASS } from "@/lib/studio-native-select-class";
import { cn } from "@/lib/utils";

export default function McpPage() {
  const { data, loading, error, refetch, saveStore, saving, saveError, clearSaveError } =
    useStudioApi();
  const {
    data: statusPayload,
    loading: statusLoading,
    error: statusError,
    refetch: refetchStatus,
  } = useStudioResourceStatus();
  const servers = data?.mcpServers ?? [];

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<McpServerConfig | null>(null);
  const [formId, setFormId] = useState("");
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formTransport, setFormTransport] = useState<McpServerConfig["transport"]>("http");
  const [deleteTarget, setDeleteTarget] = useState<McpServerConfig | null>(null);

  function openCreate() {
    clearSaveError();
    setEditing(null);
    setFormId(`mcp_${nanoid(8)}`);
    setFormName("");
    setFormUrl("");
    setFormTransport("http");
    setEditorOpen(true);
  }

  function openEdit(s: McpServerConfig) {
    clearSaveError();
    setEditing(s);
    setFormId(s.id);
    setFormName(s.name);
    setFormUrl(s.url);
    setFormTransport(s.transport);
    setEditorOpen(true);
  }

  async function handleSave() {
    if (!data || !formId.trim() || !formName.trim() || !formUrl.trim()) return;
    const row: McpServerConfig = {
      id: formId.trim(),
      name: formName.trim(),
      url: formUrl.trim(),
      transport: formTransport,
    };
    const next = editing
      ? data.mcpServers.map((x) => (x.id === editing.id ? row : x))
      : data.mcpServers.some((x) => x.id === row.id)
        ? data.mcpServers.map((x) => (x.id === row.id ? row : x))
        : [...data.mcpServers, row];
    await saveStore({ ...data, mcpServers: next });
    setEditorOpen(false);
  }

  async function handleDelete() {
    if (!data || !deleteTarget) return;
    await saveStore({
      ...data,
      mcpServers: data.mcpServers.filter((s) => s.id !== deleteTarget.id),
    });
    setDeleteTarget(null);
  }

  return (
    <StudioPage>
      <StudioPageHeader
        title="MCP & connectors"
        description={
          <>
            Registered MCP servers.{" "}
            <code className="font-mono text-xs">POST /api/mcp/proxy</code> forwards JSON to{" "}
            <code className="font-mono text-xs">transport=http</code> URLs (JSON body{" "}
            <code className="font-mono text-xs">mcpServerId</code> +{" "}
            <code className="font-mono text-xs">request</code>).
          </>
        }
        loading={loading}
        onRefresh={() => {
          void refetch();
          void refetchStatus();
        }}
      />
      {statusError ? (
        <p className="text-muted-foreground mb-3 text-xs" role="status">
          Reachability check unavailable: {statusError}
        </p>
      ) : null}
      <Button
        type="button"
        size="sm"
        variant="synth"
        className="mb-4"
        disabled={loading || !data || saving}
        onClick={openCreate}
      >
        New MCP server
      </Button>
      <StudioApiStatusBanners
        saveError={saveError}
        onDismissSaveError={clearSaveError}
        loadError={error}
        loading={loading}
        onRetryLoad={refetch}
      />
      {!loading && !error ? (
        <>
          <ul className="grid gap-5 lg:grid-cols-2">
            {servers.map((s) => {
              const reach = mcpStatusById(statusPayload, s.id);
              return (
              <li key={s.id}>
                <Card
                  role="button"
                  tabIndex={0}
                  aria-label={`Edit MCP server ${s.name}`}
                  className={cn(studioResourceCardInteractiveClass)}
                  onClick={() => openEdit(s)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openEdit(s);
                    }
                  }}
                >
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-base">{s.name}</CardTitle>
                        <Badge variant="secondary">{s.transport}</Badge>
                        {statusLoading ? (
                          <span className="text-muted-foreground text-[10px]">…</span>
                        ) : reach ? (
                          <StudioResourceStatusBadge
                            state={reach.state}
                            note={reach.note}
                          />
                        ) : null}
                      </div>
                      <div
                        className="flex flex-wrap items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <StudioCardEditIconButton
                          label={s.name}
                          disabled={saving || !data}
                          onClick={() => openEdit(s)}
                        />
                        <StudioCardDeleteIconButton
                          label={s.name}
                          disabled={saving || !data}
                          onClick={() => {
                            clearSaveError();
                            setDeleteTarget(s);
                          }}
                        />
                      </div>
                    </div>
                    <p className="text-muted-foreground pt-1 text-[11px]">{studioCardEditHint}</p>
                    <CardDescription className="font-mono text-xs break-all">
                      {s.url}
                      {reach?.note ? (
                        <span className="text-muted-foreground mt-1 block font-sans text-[10px]">
                          {reach.note}
                        </span>
                      ) : null}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground font-mono text-xs">
                      id: <span className="text-foreground">{s.id}</span>
                    </p>
                  </CardContent>
                </Card>
              </li>
            );
            })}
          </ul>
          {servers.length === 0 ? (
            <p className="text-muted-foreground text-sm">No MCP servers configured.</p>
          ) : null}
        </>
      ) : null}

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit MCP server" : "New MCP server"}</DialogTitle>
            <DialogDescription>
              HTTP transport is supported by the in-app proxy; other modes are stored for future
              runners.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="mcp-id">Id</Label>
              <Input
                id="mcp-id"
                value={formId}
                onChange={(e) => setFormId(e.target.value)}
                disabled={Boolean(editing)}
                className={cn("font-mono text-sm", editing && "opacity-80")}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mcp-name">Name</Label>
              <Input
                id="mcp-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mcp-url">URL</Label>
              <Input
                id="mcp-url"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                autoComplete="off"
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mcp-transport">Transport</Label>
              <select
                id="mcp-transport"
                className={STUDIO_NATIVE_SELECT_CLASS}
                value={formTransport}
                onChange={(e) =>
                  setFormTransport(e.target.value as McpServerConfig["transport"])
                }
              >
                <option value="http">http</option>
                <option value="sse">sse</option>
                <option value="stdio">stdio</option>
              </select>
            </div>
          </div>
          <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
            <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
              <Button type="button" variant="outline" onClick={() => setEditorOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="synth"
                disabled={!formId.trim() || !formName.trim() || !formUrl.trim() || saving}
                onClick={() => void handleSave()}
              >
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StudioConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete MCP server"
        description={
          deleteTarget
            ? `Remove “${deleteTarget.name}” (${deleteTarget.id})?`
            : ""
        }
        loading={saving}
        onConfirm={handleDelete}
      />
    </StudioPage>
  );
}
