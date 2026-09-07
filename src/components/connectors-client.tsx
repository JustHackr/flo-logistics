"use client";

import { withBasePath } from "@/lib/base-path";
import { useState } from "react";
import { Plus, Pencil, Trash2, Wifi, RefreshCw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CONNECTOR_TYPE_REGISTRY } from "@/lib/connectors/registry";
import {
  connectorStatuses,
  connectorTypes,
  type ConnectorInput,
} from "@/lib/schemas/connector";
import { useI18n } from "@/components/i18n/use-i18n";

type ConnectorRecord = {
  id: string;
  name: string;
  type: string;
  status: string;
  config: string | null;
  description: string | null;
  _count?: { vehicles: number };
};

export function ConnectorsClient({
  initialConnectors,
}: {
  initialConnectors: ConnectorRecord[];
}) {
  const { t, locale } = useI18n();
  const [connectors, setConnectors] = useState(initialConnectors);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ConnectorRecord | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<ConnectorInput>({
    name: "",
    type: "iot",
    status: "disabled",
    config: "",
    description: "",
  });
  const [configFields, setConfigFields] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setForm({
      name: "",
      type: "iot",
      status: "disabled",
      config: "",
      description: "",
    });
    setConfigFields({});
    setDialogOpen(true);
  }

  function openEdit(connector: ConnectorRecord) {
    setEditing(connector);
    setForm({
      name: connector.name,
      type: connector.type as ConnectorInput["type"],
      status: connector.status as ConnectorInput["status"],
      config: connector.config ?? "",
      description: connector.description ?? "",
    });
    try {
      setConfigFields(
        connector.config ? JSON.parse(connector.config) : {}
      );
    } catch {
      setConfigFields({});
    }
    setDialogOpen(true);
  }

  async function handleSave() {
    setLoading(true);
    setError(null);

    const payload: ConnectorInput = {
      ...form,
      config: JSON.stringify(configFields),
      description: form.description || null,
    };

    const url = editing
      ? `/api/connectors/${editing.id}`
      : "/api/connectors";
    const method = editing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? t("errors.requestFailed"));
      setLoading(false);
      return;
    }

    const saved = await res.json();
    if (editing) {
      setConnectors((prev) =>
        prev.map((c) => (c.id === saved.id ? { ...saved, _count: c._count } : c))
      );
    } else {
      setConnectors((prev) => [...prev, { ...saved, _count: { vehicles: 0 } }]);
    }
    setLoading(false);
    setDialogOpen(false);
  }

  async function handleDelete() {
    if (!deleteId) return;
    const res = await fetch(withBasePath(`/api/connectors/${deleteId}`), {
      method: "DELETE",
    });
    if (res.ok) {
      setConnectors((prev) => prev.filter((c) => c.id !== deleteId));
    }
    setDeleteId(null);
  }

  function statusVariant(status: string) {
    switch (status) {
      case "active":
        return "default" as const;
      case "planned":
        return "secondary" as const;
      default:
        return "outline" as const;
    }
  }

  const typeMeta = CONNECTOR_TYPE_REGISTRY[form.type];

  return (
    <div lang={locale} className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t("system.connectors.title")}</h2>
          <p className="text-muted-foreground">
            {t("system.connectors.description")}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {t("system.connectors.addConnector")}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {connectors.map((connector) => {
          const meta =
            CONNECTOR_TYPE_REGISTRY[
              connector.type as keyof typeof CONNECTOR_TYPE_REGISTRY
            ];
          const isInactive =
            connector.status === "planned" || connector.status === "disabled";
          return (
            <Card
              key={connector.id}
              className={cn(isInactive && "opacity-60")}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{connector.name}</CardTitle>
                    <CardDescription>
                      {meta?.label ?? connector.type}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {isInactive && (
                      <Badge variant="outline" className="text-xs">
                        {t("common.comingSoon")}
                      </Badge>
                    )}
                    <Badge variant={statusVariant(connector.status)} className="capitalize">
                      {t(`system.connectors.status.${connector.status}`)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {connector.description ?? meta?.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("system.connectors.linkedVehicles", { count: connector._count?.vehicles ?? 0 })}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Tooltip>
                    <TooltipTrigger
                      className={cn(
                        buttonVariants({ size: "sm", variant: "outline" }),
                        "pointer-events-none opacity-50"
                      )}
                      disabled
                    >
                      <Wifi className="mr-1 h-3 w-3" />
                      {t("system.connectors.test")}
                    </TooltipTrigger>
                    <TooltipContent>{t("system.connectors.futureTooltip")}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger
                      className={cn(
                        buttonVariants({ size: "sm", variant: "outline" }),
                        "pointer-events-none opacity-50"
                      )}
                      disabled
                    >
                      <RefreshCw className="mr-1 h-3 w-3" />
                      {t("system.connectors.sync")}
                    </TooltipTrigger>
                    <TooltipContent>{t("system.connectors.futureTooltip")}</TooltipContent>
                  </Tooltip>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEdit(connector)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleteId(connector.id)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? t("system.connectors.editConnector") : t("system.connectors.addConnector")}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="connector-name">{t("common.name")}</Label>
              <Input
                id="connector-name"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{t("system.connectors.type")}</Label>
              <Select
                value={form.type}
                onValueChange={(v) => {
                  const type = (v ?? "iot") as ConnectorInput["type"];
                  setForm((f) => ({ ...f, type }));
                  setConfigFields({});
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {connectorTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {CONNECTOR_TYPE_REGISTRY[t].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("common.status")}</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    status: (v ?? "disabled") as ConnectorInput["status"],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {connectorStatuses.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {t(`system.connectors.status.${s}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="connector-desc">{t("common.description")}</Label>
              <Textarea
                id="connector-desc"
                value={form.description ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
            {typeMeta?.configFields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  type={field.type === "password" ? "password" : field.type === "number" ? "number" : "text"}
                  placeholder={field.placeholder}
                  value={configFields[field.key] ?? ""}
                  onChange={(e) =>
                    setConfigFields((prev) => ({
                      ...prev,
                      [field.key]: e.target.value,
                    }))
                  }
                />
              </div>
            ))}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? t("system.connectors.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("system.connectors.deleteConnector")}</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
