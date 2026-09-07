"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import Papa from "papaparse";
import { Download, Upload } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { validateCsvRow } from "@/lib/csv";
import type { CsvValidationResult } from "@/lib/csv";
import { withBasePath } from "@/lib/base-path";
import { useI18n } from "@/components/i18n/use-i18n";

export default function ImportPage() {
  const { t } = useI18n();
  const [results, setResults] = useState<CsvValidationResult[]>([]);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<{
    imported: number;
    failed: number;
  } | null>(null);

  const handleFile = useCallback((file: File) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (parsed) => {
        const validated = parsed.data.map((row, index) =>
          validateCsvRow(row, index + 2)
        );
        setResults(validated);
        setImportSummary(null);
      },
    });
  }, []);

  async function handleImport() {
    const validRows = results.filter((r) => r.valid).map((r) => r.data);
    if (validRows.length === 0) return;

    setImporting(true);
    const res = await fetch(withBasePath("/api/vehicles/import"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: validRows }),
    });
    const data = await res.json();
    setImportSummary({ imported: data.imported, failed: data.failed });
    setImporting(false);
  }

  const validCount = results.filter((r) => r.valid).length;
  const invalidCount = results.length - validCount;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t("fleet.import.title")}</h2>
        <p className="text-muted-foreground">
          {t("fleet.import.subtitle")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("fleet.import.upload")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <a
            href={withBasePath("/templates/vehicles-template.csv")}
            download
            className={cn(buttonVariants({ variant: "outline" }), "inline-flex")}
          >
            <Download className="mr-2 h-4 w-4" />
            {t("fleet.import.downloadTemplate")}
          </a>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground hover:bg-muted/50">
            <Upload className="h-4 w-4" />
            <span>{t("fleet.import.chooseFile")}</span>
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </label>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t("fleet.import.preview", { count: results.length })}</CardTitle>
            <div className="flex gap-2">
              <Badge variant="default">{t("fleet.import.validCount", { count: validCount })}</Badge>
              {invalidCount > 0 && (
                <Badge variant="destructive">{t("fleet.import.invalidCount", { count: invalidCount })}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-h-96 overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("fleet.import.row")}</TableHead>
                    <TableHead>{t("common.name")}</TableHead>
                    <TableHead>{t("fleet.vehicles.type")}</TableHead>
                    <TableHead>{t("fleet.vehicles.engine")}</TableHead>
                    <TableHead>{t("common.status")}</TableHead>
                    <TableHead>{t("fleet.import.errors")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((row) => (
                    <TableRow key={row.row}>
                      <TableCell>{row.row}</TableCell>
                      <TableCell>{row.data.name}</TableCell>
                      <TableCell>{row.data.vehicleType}</TableCell>
                      <TableCell>{row.data.engineType}</TableCell>
                      <TableCell>
                        <Badge variant={row.valid ? "default" : "destructive"}>
                          {row.valid ? t("fleet.import.valid") : t("fleet.import.invalid")}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs text-xs text-destructive">
                        {row.errors.join("; ")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleImport}
                disabled={importing || validCount === 0}
              >
                {importing ? t("fleet.import.importing") : t("fleet.import.importVehicles", { count: validCount })}
              </Button>
              <Link
                href="/vehicles"
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                {t("fleet.import.viewVehicles")}
              </Link>
            </div>
            {importSummary && (
              <p className="text-sm text-muted-foreground">
                {t("fleet.import.imported", { count: importSummary.imported })}{" "}
                {importSummary.failed > 0 &&
                  t("fleet.import.skipped", { count: importSummary.failed })}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
