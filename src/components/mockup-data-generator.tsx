"use client";

import { useMemo, useState } from "react";
import { Download, RefreshCw, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CSV_TEMPLATE_HEADERS } from "@/lib/csv";
import {
  downloadCsv,
  generateMockOrders,
  generateMockVehicles,
  ORDER_CSV_HEADERS,
} from "@/lib/mockup-data";

type Dataset = "vehicles" | "orders";

function useMockCsv(dataset: Dataset, count: number, seed: number) {
  return useMemo(() => {
    void seed;
    return dataset === "vehicles"
      ? generateMockVehicles(count)
      : generateMockOrders(count);
  }, [dataset, count, seed]);
}

export function MockupDataGenerator() {
  const [dataset, setDataset] = useState<Dataset>("vehicles");
  const [vehicleCount, setVehicleCount] = useState(10);
  const [orderCount, setOrderCount] = useState(12);
  const [seed, setSeed] = useState(0);

  const count = dataset === "vehicles" ? vehicleCount : orderCount;
  const csv = useMockCsv(dataset, count, seed);
  const headers =
    dataset === "vehicles" ? CSV_TEMPLATE_HEADERS : ORDER_CSV_HEADERS;
  const filename =
    dataset === "vehicles"
      ? `mock-vehicle-information-${count}.csv`
      : `mock-routing-orders-${count}.csv`;

  function regenerate() {
    setSeed((value) => value + 1);
  }

  function handleCountChange(value: string) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) return;
    const clamped = Math.min(200, Math.max(1, parsed));
    if (dataset === "vehicles") {
      setVehicleCount(clamped);
    } else {
      setOrderCount(clamped);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-muted p-2">
            <Database className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <CardTitle>Mockup Data Generator</CardTitle>
            <CardDescription>
              Generate sample CSV files for Vehicle Information and Routing
              Orders. Use these files to test connector imports and routing
              optimization workflows.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs
          value={dataset}
          onValueChange={(value) => setDataset((value as Dataset) ?? "vehicles")}
        >
          <TabsList>
            <TabsTrigger value="vehicles">Vehicle Information</TabsTrigger>
            <TabsTrigger value="orders">Routing Orders</TabsTrigger>
          </TabsList>

          <TabsContent value="vehicles" className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Matches the vehicle import template (biaya dalam Rupiah):{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                {CSV_TEMPLATE_HEADERS.join(", ")}
              </code>
            </p>
          </TabsContent>

          <TabsContent value="orders" className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Matches the routing orders import template:{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                {ORDER_CSV_HEADERS.join(", ")}
              </code>
              . Each address is paired with coordinates on a real Jakarta street.
            </p>
          </TabsContent>
        </Tabs>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <Label htmlFor="mock-row-count">Number of rows</Label>
            <Input
              id="mock-row-count"
              type="number"
              min={1}
              max={200}
              value={count}
              onChange={(e) => handleCountChange(e.target.value)}
              className="w-32"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={regenerate}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Regenerate
            </Button>
            <Button onClick={() => downloadCsv(filename, csv)}>
              <Download className="mr-2 h-4 w-4" />
              Download CSV
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label>CSV preview</Label>
            <span className="text-xs text-muted-foreground">
              {count} data row{count === 1 ? "" : "s"} · {headers.length} columns
            </span>
          </div>
          <pre className="max-h-80 overflow-auto rounded-lg border bg-muted/40 p-4 text-xs leading-relaxed whitespace-pre-wrap break-all font-mono">
            {csv}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}
