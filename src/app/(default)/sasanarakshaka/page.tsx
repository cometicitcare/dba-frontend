"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { FooterBar } from "@/components/FooterBar";
import { _manageSecurityCouncil } from "@/services/securityCouncil";
import { useRouter } from "next/navigation";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";

type SecurityCouncilRecord = {
  sar_id?: number;
  temple_trn?: string | null;
  temple?: {
    vh_trn?: string | null;
    vh_vname?: string | null;
    vh_addrs?: string | null;
  } | null;
  temple_address?: string | null;
  mandala_name?: string | null;
  bank_name?: string | null;
  account_number?: string | null;
  president_name?: string | null;
  deputy_president_name?: string | null;
  vice_president_1_name?: string | null;
  vice_president_2_name?: string | null;
  general_secretary_name?: string | null;
  deputy_secretary_name?: string | null;
  treasurer_name?: string | null;
  committee_member_1?: string | null;
  committee_member_2?: string | null;
  committee_member_3?: string | null;
  committee_member_4?: string | null;
  committee_member_5?: string | null;
  committee_member_6?: string | null;
  committee_member_7?: string | null;
  committee_member_8?: string | null;
  chief_organizer_name?: string | null;
  sar_created_at?: string | null;
};

type ManageResponse = {
  status?: string;
  success?: boolean;
  message?: string;
  data?: SecurityCouncilRecord | SecurityCouncilRecord[];
  total?: number | null;
  page?: number | null;
  limit?: number | null;
  errors?: Array<{ field?: string | null; message?: string | null }>;
};

const ROWS_PER_PAGE_OPTIONS = [5, 10, 25, 50];

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function parseApiError(err: any, fallback: string) {
  const message =
    err?.response?.data?.message ||
    err?.message ||
    fallback;
  return message;
}

function normalizeRecords(payload?: ManageResponse) {
  if (!payload) return [];
  if (Array.isArray(payload.data)) return payload.data;
  if (payload.data && !Array.isArray(payload.data)) return [payload.data];
  return [];
}

export default function SasanarakshakaPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [records, setRecords] = useState<SecurityCouncilRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SecurityCouncilRecord | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchKey, setSearchKey] = useState("");

  const fetchRecords = useCallback(async (nextPage = page, nextLimit = limit, nextSearch = searchKey) => {
    setLoading(true);
    try {
      const response = await _manageSecurityCouncil({
        action: "READ_ALL",
        payload: {
          page: nextPage,
          limit: nextLimit,
          search_key: nextSearch.trim(),
        },
      });

      const payload = response?.data as ManageResponse | undefined;
      if (payload?.status && payload.status !== "success") {
        throw new Error(payload?.message || "Failed to load records.");
      }
      if (payload?.success === false) {
        throw new Error(payload?.message || "Failed to load records.");
      }

      const data = normalizeRecords(payload);
      setRecords(data);
      setTotal(Number(payload?.total ?? data.length) || 0);
      setPage(Number(payload?.page ?? nextPage) || nextPage);
      setLimit(Number(payload?.limit ?? nextLimit) || nextLimit);
    } catch (err: any) {
      toast.error(parseApiError(err, "Failed to load records."));
      setRecords([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [limit, page, searchKey]);

  useEffect(() => {
    fetchRecords(page, limit, searchKey);
  }, [fetchRecords, page, limit, searchKey]);

  const handleDelete = async (sarId?: number) => {
    if (!sarId) return;
    setDeletingId(sarId);
    try {
      const response = await _manageSecurityCouncil({
        action: "DELETE",
        payload: { sar_id: sarId },
      });
      const payload = response?.data as ManageResponse | undefined;
      if (payload?.status && payload.status !== "success") {
        throw new Error(payload?.message || "Failed to delete record.");
      }
      if (payload?.success === false) {
        throw new Error(payload?.message || "Failed to delete record.");
      }

      toast.success(payload?.message || "Record deleted successfully.");
      fetchRecords(page, limit, searchKey);
    } catch (err: any) {
      toast.error(parseApiError(err, "Failed to delete record."));
    } finally {
      setDeletingId(null);
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  const openDeleteDialog = (row: SecurityCouncilRecord) => {
    setDeleteTarget(row);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    if (deletingId) return;
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
  };

  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit)));
  const canGoPrev = page > 1;
  const canGoNext = page < totalPages;

  const handleLimitChange = (nextLimit: number) => {
    setLimit(nextLimit);
    setPage(1);
  };

  const goToPage = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages) return;
    setPage(nextPage);
  };

  const tableRows = useMemo(() => records, [records]);

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <TopBar onMenuClick={() => setSidebarOpen((v) => !v)} />
      <Sidebar isOpen={sidebarOpen} />

      <div className={`transition-all duration-300 pt-16 ${sidebarOpen ? "ml-64" : "ml-0"}`}>
        <main className="p-6 pb-24">
          <section className="space-y-6 border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-800">
                  Sasana Arakshaka Balamandalaya
                </h1>
                <p className="text-sm text-gray-500">
                  Manage registrations for Sasana Arakshaka councils.
                </p>
              </div>
              <button
                type="button"
                onClick={() => fetchRecords(1, limit, searchKey)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                disabled={loading}
              >
                Refresh
              </button>
            </div>

            <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-600">Search</label>
                    <input
                      type="search"
                      value={searchKey}
                      onChange={(e) => {
                        setSearchKey(e.target.value);
                        setPage(1);
                      }}
                      placeholder="Search by mandala name, temple TRN..."
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push("/sasanarakshaka/create")}
                    className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 sm:mt-6"
                  >
                    Create New
                  </button>
                </div>

                <div className="relative overflow-hidden border border-gray-200 bg-white shadow">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <tr>
                          <th className="px-4 py-3">ID</th>
                          <th className="px-4 py-3">Temple TRN</th>
                          <th className="px-4 py-3">Mandala Name</th>
                          <th className="px-4 py-3">President</th>
                          <th className="px-4 py-3">Created</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {tableRows.map((row, index) => (
                          <tr key={row.sar_id ?? row.temple_trn ?? `row-${index}`} className="hover:bg-slate-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-800">{row.sar_id ?? "-"}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{row.temple_trn ?? "-"}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{row.mandala_name ?? "-"}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{row.president_name ?? "-"}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{formatDateTime(row.sar_created_at)}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!row.sar_id) return;
                                    router.push(`/sasanarakshaka/update/${row.sar_id}`);
                                  }}
                                  className="rounded-lg border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                                  disabled={!row.sar_id}
                                >
                                  Update
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openDeleteDialog(row)}
                                  className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                                  disabled={deletingId === row.sar_id}
                                >
                                  {deletingId === row.sar_id ? "Deleting..." : "Delete"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {tableRows.length === 0 && (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-4 py-8 text-center text-sm font-medium text-gray-500"
                            >
                              {loading ? "Loading records..." : "No records found."}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                      <p className="text-sm font-semibold text-gray-600">Loading records...</p>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
                  <p>
                    Page {page} of {totalPages} (Total {total})
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      Rows per page
                      <select
                        value={limit}
                        onChange={(e) => handleLimitChange(Number(e.target.value))}
                        className="border border-slate-300 rounded px-2 py-1 text-sm"
                        disabled={loading}
                      >
                        {ROWS_PER_PAGE_OPTIONS.map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => goToPage(page - 1)}
                        disabled={!canGoPrev || loading}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium ${
                          !canGoPrev || loading
                            ? "text-slate-400 border-slate-200"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => goToPage(page + 1)}
                        disabled={!canGoNext || loading}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium ${
                          !canGoNext || loading
                            ? "text-slate-400 border-slate-200"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
            </div>
          </section>
          <FooterBar />
        </main>
      </div>
      <ToastContainer position="top-right" autoClose={3000} />

      <Dialog open={deleteDialogOpen} onClose={closeDeleteDialog} fullWidth>
        <DialogTitle>Delete Sasana Arakshaka record</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {deleteTarget?.mandala_name
              ? `Are you sure you want to delete ${deleteTarget.mandala_name}? This action cannot be undone.`
              : "Are you sure you want to delete this record? This action cannot be undone."}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog} disabled={Boolean(deletingId)}>
            Cancel
          </Button>
          <Button
            onClick={() => handleDelete(deleteTarget?.sar_id)}
            color="error"
            disabled={Boolean(deletingId)}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
