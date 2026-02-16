"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { FooterBar } from "@/components/FooterBar";
import { DataTable, type Column } from "@/components/DataTable";
import {
  _getSasanarakshakaList,
  type SasanarakshakaListResponse,
} from "@/services/sasanarakshaka";

type SasanarakshakaRow = {
  sr_ssbmcode: string;
  sr_ssbname: string;
  sr_created_at?: string | null;
  sr_id?: number;
};

type ApiResponse = SasanarakshakaListResponse<SasanarakshakaRow>;

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, "0");
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

function getAuthToken() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as any;
    return (
      parsed?.token ??
      parsed?.access_token ??
      parsed?.accessToken ??
      parsed?.data?.token ??
      parsed?.data?.access_token ??
      parsed?.user?.token ??
      parsed?.user?.access_token ??
      null
    );
  } catch {
    return null;
  }
}

export default function SasanarakshakaPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rows, setRows] = useState<SasanarakshakaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  const fetchRows = useCallback(async (nextPage = page, nextLimit = limit) => {
    setLoading(true);
    setError(null);
    try {
      const token = getAuthToken();
      const response = await _getSasanarakshakaList(
        {
          page: nextPage,
          limit: nextLimit,
          search_key: "",
          sr_dvcd: "",
        },
        token
      );

      const payload = response?.data as ApiResponse | undefined;
      if (payload?.status && payload.status !== "success") {
        const msg = payload?.message || "Failed to load Sasanarakshaka list.";
        throw new Error(msg);
      }
      if (payload?.success === false) {
        const msg = payload?.message || "Failed to load Sasanarakshaka list.";
        throw new Error(msg);
      }

      const data = Array.isArray(payload?.data) ? payload.data : [];
      setRows(data);
      setTotal(Number(payload?.total ?? data.length) || 0);
      setPage(Number(payload?.page ?? nextPage) || nextPage);
      setLimit(Number(payload?.limit ?? nextLimit) || nextLimit);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load Sasanarakshaka list.";
      setError(msg);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [limit, page]);

  useEffect(() => {
    fetchRows(page, limit);
  }, [fetchRows, page, limit]);

  const columns: Column<SasanarakshakaRow>[] = useMemo(
    () => [
      { key: "sr_ssbmcode", label: "SSBM Code", sortable: true },
      { key: "sr_ssbname", label: "SSB Name", sortable: true },
      {
        key: "sr_created_at",
        label: "Created At",
        sortable: true,
        render: (item) => formatDateTime(item.sr_created_at),
      },
    ],
    []
  );

  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit)));
  const hasMore = page < totalPages;

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar isOpen={sidebarOpen} />

      <div className={`transition-all duration-300 pt-20 ${sidebarOpen ? "ml-64" : "ml-0"}`}>
        <main className="p-6 pb-32">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Sasana arakshaka balamandalaya</h1>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="relative overflow-y-auto max-h-[520px]">
            <DataTable columns={columns} data={rows} hidePagination />
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm rounded-lg">
                <span className="text-sm font-medium text-gray-700">Loading...</span>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-slate-600">
              {total > 0
                ? `Showing ${(page - 1) * limit + 1} to ${Math.min(
                    (page - 1) * limit + rows.length,
                    total
                  )} of ${total}`
                : "No records to display"}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                Rows per page
                <select
                  value={limit}
                  onChange={(e) => {
                    const next = Math.max(1, Number(e.target.value));
                    setPage(1);
                    setLimit(next);
                  }}
                  className="border border-slate-300 rounded px-2 py-1 text-sm"
                  disabled={loading}
                >
                  {[5, 10, 25, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={loading || page <= 1}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium ${
                    page <= 1 || loading
                      ? "text-slate-400 border-slate-200"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Previous
                </button>
                <span className="text-sm font-semibold text-slate-700">Page {page}</span>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={loading || !hasMore}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium ${
                    !hasMore || loading
                      ? "text-slate-400 border-slate-200"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
          <FooterBar />
        </main>
      </div>
    </div>
  );
}
