"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

export type PrinterInfo = {
  name: string;
  status?: string;
  driverName?: string;
  portName?: string;
  isDefault?: boolean;
};

export type ShowPrinterProps = {
  open: boolean;
  onClose: () => void;
  onPrinterSelect?: (printer: PrinterInfo | null) => void;
  pdfBase64?: string | null;
  initialPageSize?: PageSize;
};

type StatusType = "success" | "error" | "loading";
type PageSize = "legal" | "a4" | "a5";

type PrinterStats = {
  total: number;
  ready: number;
  offline: number;
  defaults: number;
};

const STATUS_STYLE: Record<StatusType, string> = {
  success: "border border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border border-rose-200 bg-rose-50 text-rose-800",
  loading: "border border-amber-200 bg-amber-50 text-amber-800",
};

const READY_MATCHER = /(ready|idle)/i;

function isReadyStatus(status?: string) {
  if (!status) return false;
  return READY_MATCHER.test(status);
}

type StatsCardProps = {
  label: string;
  value: number;
  variant?: "default" | "emerald" | "amber" | "slate";
  hint?: string;
};

const STATS_VARIANT_STYLES: Record<NonNullable<StatsCardProps["variant"]>, { border: string; text: string }> = {
  default: { border: "border-slate-100", text: "text-slate-900" },
  emerald: { border: "border-emerald-100", text: "text-emerald-900" },
  amber: { border: "border-amber-100", text: "text-amber-900" },
  slate: { border: "border-slate-100", text: "text-slate-900" },
};

function StatsCard({ label, value, variant = "default", hint }: StatsCardProps) {
  const styles = STATS_VARIANT_STYLES[variant];
  return (
    <div
      className={`rounded-2xl border ${styles.border} bg-white/80 px-4 py-3 text-center shadow-sm`}
    >
      <p className="text-[10px] uppercase tracking-[0.4em] text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${styles.text}`}>{value}</p>
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export default function ShowPrinter({
  open,
  onClose,
  onPrinterSelect,
  pdfBase64 = null,
  initialPageSize = "legal",
}: ShowPrinterProps) {
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [selectedPrinterName, setSelectedPrinterName] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<StatusType | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [pageSize, setPageSize] = useState<PageSize>(initialPageSize);

  const selectedPrinter = useMemo(
    () => printers.find((printer) => printer.name === selectedPrinterName) ?? null,
    [printers, selectedPrinterName]
  );

  useEffect(() => {
    if (!onPrinterSelect) return;
    onPrinterSelect(selectedPrinter);
  }, [onPrinterSelect, selectedPrinter]);

  useEffect(() => {
    setPageSize(initialPageSize);
  }, [initialPageSize]);

  const scanPrinters = useCallback(
    async (message = "Scanning for printers...") => {
      setIsFetching(true);
      setStatusType("loading");
      setStatusMessage(message);
      try {
        const response = await fetch("/api/printers", {
          method: "GET",
          cache: "no-store",
        });
        const payload = await response.json();

        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error ?? `Request failed (${response.status})`);
        }

        const list: PrinterInfo[] = Array.isArray(payload.printers) ? payload.printers : [];
        setPrinters(list);

        if (list.length === 0) {
          setSelectedPrinterName(null);
          setStatusType("error");
          setStatusMessage("No physical printers detected on this machine.");
          return;
        }

        const defaultPrinter = list.find((printer) => printer.isDefault) ?? list[0];
        setSelectedPrinterName((current) => {
          if (current && list.some((printer) => printer.name === current)) {
            return current;
          }
          return defaultPrinter.name;
        });

        setStatusType("success");
        setStatusMessage(`Found ${list.length} printer${list.length === 1 ? "" : "s"}.`);
      } catch (error: any) {
        setPrinters([]);
        setSelectedPrinterName(null);
        setStatusType("error");
        setStatusMessage(error?.message ?? String(error));
      } finally {
        setIsFetching(false);
      }
    },
    []
  );

  const handlePrint = useCallback(async () => {
    if (!selectedPrinter) return;
    const pdfPayload = pdfBase64?.trim();
    const shouldPrintPdf = Boolean(pdfPayload);
    setIsPrinting(true);
    setStatusType("loading");
    setStatusMessage(
      shouldPrintPdf ? "Sending document to printer..." : "Sending a test page..."
    );
    try {
      const response = await fetch(shouldPrintPdf ? "/api/print-pdf" : "/api/print-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: shouldPrintPdf
          ? JSON.stringify({
              printerName: selectedPrinter.name,
              pdfBase64: pdfPayload,
              pageSize,
            })
          : JSON.stringify({ printerName: selectedPrinter.name }),
      });
      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? `Print failed (${response.status})`);
      }

      const jobSuffix = payload?.jobId ? ` (Job ID: ${payload.jobId})` : "";
      setStatusType("success");
      setStatusMessage(
        shouldPrintPdf
          ? `Document sent to ${selectedPrinter.name}${jobSuffix}.`
          : `Test page sent to ${selectedPrinter.name}${jobSuffix}.`
      );
    } catch (error: any) {
      setStatusType("error");
      setStatusMessage(error?.message ?? String(error));
    } finally {
      setIsPrinting(false);
    }
  }, [pageSize, pdfBase64, selectedPrinter]);

  useEffect(() => {
    if (!open) return;
    scanPrinters();
  }, [open, scanPrinters]);

  const stats = useMemo<PrinterStats>(() => {
    const summary: PrinterStats = {
      total: printers.length,
      defaults: 0,
      ready: 0,
      offline: 0,
    };
    printers.forEach((printer) => {
      if (printer.isDefault) summary.defaults += 1;
      if (isReadyStatus(printer.status)) {
        summary.ready += 1;
      } else {
        summary.offline += 1;
      }
    });
    return summary;
  }, [printers]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle className="flex items-center justify-between gap-2">
        <span className="text-lg font-semibold">Physical printers on this machine</span>
        <IconButton edge="end" size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            
          </div>
          <div className="flex flex-wrap gap-2">
            <FormControl
              size="small"
              className="min-w-[160px]"
              disabled={isFetching || isPrinting}
            >
              <InputLabel id="page-size-label">Page size</InputLabel>
              <Select
                labelId="page-size-label"
                value={pageSize}
                label="Page size"
                onChange={(event) => setPageSize(event.target.value as PageSize)}
              >
                <MenuItem value="legal">Legal (default)</MenuItem>
                <MenuItem value="a4">A4</MenuItem>
                <MenuItem value="a5">A5</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              onClick={() => scanPrinters("Scanning for printers...")}
              disabled={isFetching || isPrinting}
            >
              Scan for printers
            </Button>
            <Button
              variant="text"
              onClick={() => scanPrinters("Refreshing printer list...")}
              disabled={isFetching || isPrinting}
            >
              Refresh
            </Button></div>
        </div>

        {statusType && statusMessage && (
          <div className={`rounded-2xl px-4 py-3 text-sm font-medium ${STATUS_STYLE[statusType]}`}>
            {statusMessage}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard label="Total printers" value={stats.total} />
          <StatsCard label="Ready / idle" value={stats.ready} variant="emerald" />
          <StatsCard label="Offline / paused" value={stats.offline} variant="slate" />
          <StatsCard label="Defaults" value={stats.defaults} variant="amber" />
        </div>

        <div className="max-h-[320px] space-y-2 overflow-auto">
          {printers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
              <p className="text-base font-semibold text-slate-800">No printers found</p>
              <p>Click “Scan for printers” to discover devices visible to the host.</p>
            </div>
          ) : (
            printers.map((printer) => {
              const isSelected = printer.name === selectedPrinterName;
              const ready = isReadyStatus(printer.status);
              return (
                <button
                  key={printer.name}
                  type="button"
                  onClick={() => setSelectedPrinterName(printer.name)}
                  className={`group w-full rounded-2xl border px-4 py-3 text-left transition ${
                    isSelected
                      ? "border-sky-500 bg-white shadow-lg"
                      : "border-slate-200 bg-white hover:shadow-sm"
                  }`}
                  aria-pressed={isSelected}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-slate-900">{printer.name}</p>
                      <p className="text-sm text-slate-500">{printer.driverName ?? "Driver unknown"}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 text-right text-xs">
                      <span className={`font-semibold uppercase tracking-[0.3em] ${ready ? "text-emerald-600" : "text-rose-600"}`}>
                        {printer.status ?? "Unknown"}
                      </span>
                      <div className="flex gap-1">
                        {printer.isDefault && (
                          <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-600">
                            Default
                          </span>
                        )}
                        {!ready && (
                          <span className="rounded-full border border-rose-100 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-rose-600">
                            Offline
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                    <p>
                      <span className="font-semibold text-slate-700">Port:</span> {printer.portName ?? "Unknown"}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-700">Connection:</span>{" "}
                      {printer.driverName ?? "Unknown interface"}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          onClick={handlePrint}
          disabled={!selectedPrinter || isPrinting || isFetching}
        >
          {isPrinting ? "Printing..." : "Print"}
        </Button>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}


