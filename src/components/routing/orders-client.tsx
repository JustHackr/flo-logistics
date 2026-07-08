"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import {
  Car,
  Bike,
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Truck,
  Navigation,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GoogleMapsStatusBanner } from "./google-maps-status-banner";

type StopAccess = "CAR_ONLY" | "MOTORCYCLE_ONLY" | "BOTH";
type OrderStatus =
  | "RECEIVED"
  | "PREPARING"
  | "ON_ROUTE"
  | "DELIVERED";

type NullableISO = string | null;

type OrderRow = {
  id: string;
  recipientAddress: string;
  lat: number;
  lng: number;
  accessRequirement: StopAccess;
  status: OrderStatus;
  receivedAt: NullableISO;
  preparingAt: NullableISO;
  onRouteAt: NullableISO;
  etaAt: NullableISO;
  deliveredAt: NullableISO;
};

const STATUS_OPTIONS: Array<{ value: OrderStatus; label: string }> = [
  { value: "RECEIVED", label: "Received" },
  { value: "PREPARING", label: "Preparing" },
  { value: "ON_ROUTE", label: "On route" },
  { value: "DELIVERED", label: "Delivered" },
];

export function OrdersClient({ initialOrders }: { initialOrders: OrderRow[] }) {
  const router = useRouter();

  const [orders, setOrders] = useState<OrderRow[]>(initialOrders);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  const [createForm, setCreateForm] = useState<{
    recipientAddress: string;
    lat: string;
    lng: string;
    accessRequirement: StopAccess;
  }>({
    recipientAddress: "",
    lat: "",
    lng: "",
    accessRequirement: "BOTH",
  });

  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<{
    imported: number;
    failed: number;
  } | null>(null);

  const selectedCount = selectedOrderIds.length;

  // If initial orders are empty, refresh once (in case server serialization differs).
  useEffect(() => {
    if (initialOrders.length === 0) {
      void refreshOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshOrders() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/routing/orders");
      const data = (await res.json()) as any;
      if (!res.ok) throw new Error(data?.error ?? "Failed to load orders");
      setOrders(data as OrderRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  const selectedSet = useMemo(
    () => new Set<string>(selectedOrderIds),
    [selectedOrderIds]
  );

  function toggleSelected(id: string) {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function formatStatus(iso: NullableISO) {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleString("id-ID", {
      hour12: false,
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function vehicleIcon(access: StopAccess) {
    switch (access) {
      case "CAR_ONLY":
        return <Car className="h-4 w-4" />;
      case "MOTORCYCLE_ONLY":
        return <Bike className="h-4 w-4" />;
      default:
        return <Truck className="h-4 w-4" />;
    }
  }

  async function createOrder() {
    setError(null);
    setLoading(true);
    try {
      const payload = {
        recipientAddress: createForm.recipientAddress.trim(),
        lat: Number(createForm.lat),
        lng: Number(createForm.lng),
        accessRequirement: createForm.accessRequirement,
      };

      const res = await fetch("/api/routing/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to create order");

      setCreateForm({
        recipientAddress: "",
        lat: "",
        lng: "",
        accessRequirement: "BOTH",
      });
      setOrders((prev) => [data, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create order");
    } finally {
      setLoading(false);
    }
  }

  function handleCsvFile(file: File) {
    setError(null);
    setImportSummary(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (result) => {
        try {
          setImporting(true);
          const res = await fetch("/api/routing/orders/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rows: result.data }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error ?? "Failed to import orders");
          setImportSummary({
            imported: data.imported ?? 0,
            failed: data.failed ?? 0,
          });
          void refreshOrders();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Failed to import orders");
        } finally {
          setImporting(false);
        }
      },
    });
  }

  async function deleteOrder(orderId: string) {
    const ok = window.confirm("Delete this order?");
    if (!ok) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/routing/orders/${orderId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to delete order");
      }
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      setSelectedOrderIds((prev) => prev.filter((id) => id !== orderId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete order");
    } finally {
      setLoading(false);
    }
  }

  async function updateOrder(orderId: string) {
    // For v1, update uses the same createForm for a simple edit flow.
    // We'll repurpose by prompting for values; in a later iteration this can be a full edit modal.
    const current = orders.find((o) => o.id === orderId);
    if (!current) return;

    const address = window.prompt("Edit address", current.recipientAddress);
    if (!address) return;
    const latStr = window.prompt("Edit latitude", String(current.lat));
    const lngStr = window.prompt("Edit longitude", String(current.lng));
    if (!latStr || !lngStr) return;

    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/routing/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientAddress: address,
          lat: Number(latStr),
          lng: Number(lngStr),
          accessRequirement: current.accessRequirement,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to update order");

      setOrders((prev) => prev.map((o) => (o.id === orderId ? data : o)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update order");
    } finally {
      setLoading(false);
    }
  }

  async function setOrderStatus(orderId: string, status: OrderStatus) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/routing/orders/${orderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to update status");
      setOrders((prev) => prev.map((o) => (o.id === orderId ? data : o)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update status");
    } finally {
      setLoading(false);
    }
  }

  function exportSelectedCsv() {
    const rows = orders
      .filter((o) => selectedSet.has(o.id))
      .map((o) => ({
        id: o.id,
        recipientAddress: o.recipientAddress,
        accessRequirement: o.accessRequirement,
        status: o.status,
        lat: o.lat,
        lng: o.lng,
      }));

    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "routing-orders-selected.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <GoogleMapsStatusBanner />

      <div>
        <h2 className="text-2xl font-bold tracking-tight">Routing Orders</h2>
        <p className="text-muted-foreground">
          Input recipients (address + lat/lng) and update delivery timestamps. Select orders
          to run batch route optimization for Jakarta (warehouse → sorted stops → warehouse).
        </p>
      </div>

      {error && <div className="rounded-md border border-destructive/30 p-3 text-sm text-destructive">{error}</div>}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create Order</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recipientAddress">Address (recipient)</Label>
              <Textarea
                id="recipientAddress"
                value={createForm.recipientAddress}
                onChange={(e) =>
                  setCreateForm((p) => ({
                    ...p,
                    recipientAddress: e.target.value,
                  }))
                }
                placeholder="e.g. Jl. Sudirman Blok A, Jakarta"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="lat">Latitude</Label>
                <Input
                  id="lat"
                  type="number"
                  value={createForm.lat}
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, lat: e.target.value }))
                  }
                  placeholder="-6.2"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lng">Longitude</Label>
                <Input
                  id="lng"
                  type="number"
                  value={createForm.lng}
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, lng: e.target.value }))
                  }
                  placeholder="106.8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Vehicle access requirement</Label>
              <Select
                value={createForm.accessRequirement}
                onValueChange={(v) =>
                  setCreateForm((p) => ({
                    ...p,
                    accessRequirement: (v as StopAccess) ?? "BOTH",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select access" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CAR_ONLY">Car only</SelectItem>
                  <SelectItem value="MOTORCYCLE_ONLY">Motorcycle only</SelectItem>
                  <SelectItem value="BOTH">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={createOrder} disabled={loading || !createForm.recipientAddress.trim()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Order
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bulk Import (CSV)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload a CSV file with columns{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                recipientAddress, lat, lng, accessRequirement
              </code>{" "}
              to create many routing orders at once.
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href="/templates/routing-orders-template.csv"
                download
                className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
              >
                Download template
              </a>
              <Label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-4 py-2 text-sm text-muted-foreground hover:bg-muted/50">
                <span>Choose CSV file…</span>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleCsvFile(file);
                  }}
                />
              </Label>
            </div>
            {importing && (
              <p className="text-xs text-muted-foreground">
                Importing orders from CSV…
              </p>
            )}
            {importSummary && (
              <p className="text-xs text-muted-foreground">
                Imported {importSummary.imported} orders.
                {importSummary.failed > 0 &&
                  ` ${importSummary.failed} rows failed validation.`}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle>Orders & Status Timeline</CardTitle>
              <CardDescription>
                Select orders to optimize. Use status buttons to set timestamps.
                {selectedCount > 0 && (
                  <span className="ml-1 font-medium text-foreground">
                    · {selectedCount} selected
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={exportSelectedCsv}
                disabled={selectedCount === 0}
              >
                Export Selected
              </Button>
              <Button
                onClick={() => {
                  const qs = new URLSearchParams();
                  qs.set("orderIds", selectedOrderIds.join(","));
                  router.push(`/routing/plan?${qs.toString()}`);
                }}
                disabled={selectedCount === 0}
              >
                <Navigation className="mr-2 h-4 w-4" />
                Optimize Selected
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-h-[640px] overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead className="min-w-[220px]">Recipient</TableHead>
                    <TableHead className="min-w-[120px]">Access</TableHead>
                    <TableHead className="min-w-[100px]">Status</TableHead>
                    <TableHead className="min-w-[160px]">Timestamps</TableHead>
                    <TableHead className="min-w-[200px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedSet.has(o.id)}
                          onChange={() => toggleSelected(o.id)}
                        />
                      </TableCell>
                      <TableCell className="min-w-[220px]">
                        <div className="flex items-start gap-2">
                          <MapPin className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                          <div>
                            <div className="text-sm font-medium">{o.recipientAddress}</div>
                            <div className="text-xs text-muted-foreground">
                              {o.lat.toFixed(5)}, {o.lng.toFixed(5)}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-2">
                          {vehicleIcon(o.accessRequirement)}
                          <span className="capitalize">
                            {o.accessRequirement === "CAR_ONLY"
                              ? "Car only"
                              : o.accessRequirement === "MOTORCYCLE_ONLY"
                              ? "Motor only"
                              : "Both"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs rounded-md border px-2 py-0.5">
                          {o.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        Received: {formatStatus(o.receivedAt)}
                        <br />
                        OnRoute: {formatStatus(o.onRouteAt)}
                        <br />
                        Delivered: {formatStatus(o.deliveredAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => updateOrder(o.id)}
                            disabled={loading}
                            aria-label="Edit order"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteOrder(o.id)}
                            disabled={loading}
                            aria-label="Delete order"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-1">
                          {STATUS_OPTIONS.map((s) => (
                            <Button
                              key={s.value}
                              size="xs"
                              variant="outline"
                              onClick={() => setOrderStatus(o.id, s.value)}
                              disabled={loading || o.status === s.value}
                            >
                              {s.label}
                            </Button>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {orders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                        No orders yet. Add one on the left.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="text-xs text-muted-foreground">
              Uses Google Maps live traffic when connected. Jakarta validation uses a coordinate bounding box.
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={refreshOrders} disabled={loading}>
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

