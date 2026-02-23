"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { DataTable, type Column } from "@/components/DataTable";
import { PlusIcon, XIcon } from "lucide-react";
import { FooterBar } from "@/components/FooterBar";
import { _manageVihara } from "@/services/vihara";
import { _manageTempTemple } from "@/services/temple";
import LocationPickerCompact from "@/components/Bhikku/Filter/LocationPickerCompact";
import NikayaParshawaCompact from "@/components/Bhikku/Filter/NikayaParshawaCompact";
import { toYYYYMMDD } from "@/components/Bhikku/Add";
import type { LocationSelection } from "@/components/Bhikku/Filter/LocationPickerCompact";
import selectionsData from "@/utils/selectionsData.json";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { VIHARA } from "../../constants";
import { getStoredUserData } from "@/utils/userData";
import { DIVITIONAL_SEC_MANAGEMENT_DEPARTMENT } from "@/utils/config";

/** Human-readable labels + badge colors for every known workflow_status value */
const STATUS_META: Record<string, { label: string; color: string }> = {
  S1_PENDING:          { label: "Stage 1 — Pending",              color: "bg-yellow-100 text-yellow-800" },
  S1_PRINTING:         { label: "Stage 1 — Printing",             color: "bg-blue-100 text-blue-800" },
  S1_PEND_APPROVAL:    { label: "Stage 1 — Awaiting Approval",    color: "bg-orange-100 text-orange-800" },
  S1_APPROVED:         { label: "Stage 1 — Approved",             color: "bg-green-100 text-green-800" },
  S1_REJECTED:         { label: "Stage 1 — Rejected",             color: "bg-red-100 text-red-800" },
  S1_NO_DETAIL_COMP:   { label: "No Detail — Complete (Bypass)",  color: "bg-amber-100 text-amber-800" },
  S1_NO_CHIEF_COMP:    { label: "No Chief — Complete (Bypass)",   color: "bg-amber-100 text-amber-800" },
  S1_LTR_CERT_DONE:    { label: "Letter & Cert — Done (Bypass)",  color: "bg-amber-100 text-amber-800" },
  S2_PENDING:          { label: "Stage 2 — Pending",              color: "bg-teal-100 text-teal-800" },
  S2_PRINTING:         { label: "Stage 2 — Printing",             color: "bg-cyan-100 text-cyan-800" },
  S2_PEND_APPROVAL:    { label: "Stage 2 — Awaiting Approval",    color: "bg-indigo-100 text-indigo-800" },
  S2_APPROVED:         { label: "Stage 2 — Approved",             color: "bg-emerald-100 text-emerald-800" },
  COMPLETED:           { label: "Completed",                      color: "bg-green-200 text-green-900" },
  REJECTED:            { label: "Rejected (Final)",               color: "bg-red-200 text-red-900" },
  TEMPORARY:           { label: "Temporary",                      color: "bg-slate-100 text-slate-600" },
  PENDING:             { label: "Pending",                        color: "bg-yellow-100 text-yellow-800" },
};

function StatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  const meta = STATUS_META[status];
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${
      meta ? meta.color : "bg-slate-100 text-slate-700"
    }`}>
      {meta ? meta.label : status}
    </span>
  );
}
type ViharaRow = {
  vh_id: number;
  vh_trn: string;
  name: string;
  mobile?: string;
  email?: string;
  address?: string;
  province?: string;
  district?: string;
  nikaya?: string;
  workflow_status?: string;
};

type ApiResponse<T> = { data?: { data?: T; rows?: T } | T };
function pickRows<T>(res: unknown): T[] {
  const r = res as ApiResponse<T[]>;
  const d = r?.data as any;
  if (Array.isArray(d?.data)) return d.data as T[];
  if (Array.isArray(d?.rows)) return d.rows as T[];
  if (Array.isArray(r?.data)) return (r.data as unknown as T[]);
  if (Array.isArray(res)) return res as T[];
  return [];
}

// tiny inline spinner (why: avoid adding dependency)
function Spinner() {
  return (
    <svg
      className="h-6 w-6 animate-spin"
      viewBox="0 0 24 24"
      role="status"
      aria-label="Loading"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
        opacity="0.25"
      />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

type FilterState = {
  province: string;
  district: string;
  // temple fields (TRN + display)
  templeTrn: string;
  templeDisplay: string;
  // child temple fields (TRN + display)
  childTempleTrn: string;
  childTempleDisplay: string;

  nikaya: string;
  parchawa: string;
  divisionSecretariat: string;
  gn: string;
  vhTrn: string;
  status: string;
  category: string;
  workflow_status: string;
  dateFrom: string; // yyyy-mm-dd
  dateTo: string; // yyyy-mm-dd
  searchKey: string;
  page: number;
  limit: number;
};

type NikayaHierarchy = {
  nikaya: { code: string; name: string };
  parshawayas: Array<{ code: string; name: string }>;
};

type RawNikayaEntry = {
  nikaya: { code: string; name: string };
  parshawayas?: Array<{ code: string; name: string }>;
};

const STATIC_NIKAYAS: NikayaHierarchy[] = Array.isArray(
  (selectionsData as any)?.nikayas
)
  ? ((selectionsData as any).nikayas as RawNikayaEntry[]).map((entry) => ({
      nikaya: entry.nikaya,
      parshawayas: (entry.parshawayas ?? []).map((p) => ({
        code: p.code,
        name: p.name,
      })),
    }))
  : [];

const DEFAULT_FILTERS: FilterState = {
  province: "",
  district: "",
  templeTrn: "",
  templeDisplay: "",
  childTempleTrn: "",
  childTempleDisplay: "",
  nikaya: "",
  parchawa: "",
  divisionSecretariat: "",
  gn: "",
  vhTrn: "",
  status: "",
  category: "",
  workflow_status: "",
  dateFrom: "",
  dateTo: "",
  searchKey: "",
  page: 1,
  limit: 5,
};

// Only include set values (why: back-end may reject empty keys)
function buildFilterPayload(f: FilterState) {
  const skip = Math.max(0, (f.page - 1) * f.limit);
  const payload: Record<string, unknown> = {
    skip,
    limit: f.limit,
    page: f.page,
    search_key: f.searchKey ?? "",
    vh_trn: f.vhTrn ?? "",
  };

  if (f.province) payload.province = f.province;
  if (f.district) payload.district = f.district;
  if (f.divisionSecretariat)
    payload.divisional_secretariat = f.divisionSecretariat;
  if (f.gn) payload.gn_division = f.gn;
  if (f.templeTrn) payload.temple = f.templeTrn;
  if (f.childTempleTrn) payload.child_temple = f.childTempleTrn;
  if (f.nikaya) payload.nikaya = f.nikaya;
  if (f.parchawa) payload.parshawaya = f.parchawa;
  if (f.category.length) payload.category = f.category;
  if (f.status.length) payload.status = f.status;
  if (f.workflow_status) payload.workflow_status = f.workflow_status;
  const from = toYYYYMMDD(f.dateFrom);
  if (from) payload.date_from = from;
  const to = toYYYYMMDD(f.dateTo);
  if (to) payload.date_to = to;

  return payload;
}

export default function RecordList({ canDelete }: { canDelete: boolean }) {
  const router = useRouter();
  const [isDivisionalSec, setIsDivisionalSec] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<ViharaRow[]>([]);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [hasMoreResults, setHasMoreResults] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const prevFiltersRef = useRef<FilterState>(DEFAULT_FILTERS);
  const searchDebounceRef = useRef<number | null>(null);
  const nikayaData = STATIC_NIKAYAS;
  const nikayaLoading = false;
  const nikayaError: string | null = null;

  const loadNikayaHierarchy = useCallback(() => {
    // Static data currently; hook left for future dynamic loads
  }, []);

  const locationSelection = useMemo<LocationSelection>(
    () => ({
      provinceCode: filters.province || undefined,
      districtCode: filters.district || undefined,
      divisionCode: filters.divisionSecretariat || undefined,
      gnCode: filters.gn || undefined,
    }),
    [filters]
  );

  const parshawaOptions = useMemo(() => {
    const nikaya = nikayaData.find((n) => n.nikaya.code === filters.nikaya);
    return nikaya?.parshawayas ?? [];
  }, [nikayaData, filters.nikaya]);

  const handleNikayaChange = (code: string) => {
    setFilters((prev) => {
      const next = { ...prev, nikaya: code };
      if (code !== prev.nikaya) next.parchawa = "";
      return next;
    });
  };

  const handleParshawaChange = (code: string) => {
    setFilters((prev) => ({ ...prev, parchawa: code }));
  };

  const handleLocationChange = useCallback((selection: LocationSelection) => {
    setFilters((prev) => ({
      ...prev,
      province: selection.provinceCode ?? "",
      district: selection.districtCode ?? "",
      divisionSecretariat: selection.divisionCode ?? "",
      gn: selection.gnCode ?? "",
    }));
  }, []);

 const fetchData = useCallback(
  async (signal?: AbortSignal, f: FilterState = filters) => {
    setLoading(true);
    try {
      const payload = buildFilterPayload(f);
      
      // Fetch regular viharas
      const response = await _manageVihara({
        action: "READ_ALL",
        payload,
      });

      const apiData = pickRows<any>(response.data);
      const total = (response.data as any)?.totalRecords ?? apiData.length;

      // Fetch temporary viharas
      let tempViharas: any[] = [];
      let tempTotal = 0;
      try {
        const tempPayload = {
          page: f.page,
          limit: f.limit,
          search: f.searchKey ?? "",
        };
        
        const tempResponse = await _manageTempTemple({
          action: "READ_ALL",
          payload: tempPayload,
        });
        
        // Handle both response formats
        const tempData = (tempResponse.data as any);
        if (tempData?.data?.records) {
          tempViharas = tempData.data.records;
          tempTotal = tempData.data?.total ?? 0;
        } else if (Array.isArray(tempData?.records)) {
          tempViharas = tempData.records;
          tempTotal = tempData?.total ?? 0;
        } else if (Array.isArray(tempData?.data)) {
          tempViharas = tempData.data;
          tempTotal = tempData?.total ?? tempViharas.length;
        }
      } catch (tempError) {
        console.warn("Warning: Could not fetch temporary viharas:", tempError);
        // Continue without TEMP records if fetch fails
      }

      // Merge regular and temporary viharas
      const allRecords = [
        ...apiData,
        ...tempViharas.map((temp: any) => ({
          tv_id: temp?.tv_id,
          vh_id: -Math.abs(temp?.tv_id || 0), // Use negative ID for TEMP records
          vh_trn: `TEMP-${temp?.tv_id ?? ""}`,
          name: String(temp?.tv_name ?? ""),
          mobile: temp?.tv_mobile ?? "",
          email: temp?.tv_email ?? "",
          address: String(temp?.tv_address ?? ""),
          province: temp?.tv_province ?? "",
          district: temp?.tv_district ?? "",
          nikaya: "",
          workflow_status: "TEMPORARY",
        }))
      ];

      const cleaned: ViharaRow[] = allRecords.map((row: any) => ({
        vh_id: row?.vh_id ?? row?.tv_id ?? 0,
        vh_trn: String(row?.vh_trn ?? ""),
        name: String(row?.vh_vname ?? row?.name ?? row?.tv_name ?? ""),
        mobile: row?.vh_mobile ?? row?.mobile ?? row?.tv_mobile ?? "",
        email: row?.vh_email ?? row?.email ?? row?.tv_email ?? "",
        address: String(row?.vh_addrs ?? row?.address ?? row?.tv_address ?? ""),
        province: row?.vh_province ?? row?.province ?? row?.tv_province ?? "",
        district: row?.vh_district ?? row?.district ?? row?.tv_district ?? "",
        nikaya: row?.vh_nikaya ?? row?.nikaya ?? "",
        workflow_status: row?.vh_workflow_status ?? row?.workflow_status ?? "TEMPORARY",
      }));

      // Total is sum of both regular and temp records
      const combinedTotal = total + tempTotal;
      
      setRecords(cleaned);
      setTotalRecords(combinedTotal);
      setHasMoreResults((f.page * f.limit) < combinedTotal);
    } catch (error) {
      console.error("Error fetching vihara data:", error);
      setRecords([]);
      setTotalRecords(0);
      setHasMoreResults(false);
    } finally {
      setLoading(false);
    }
  },
  [filters]
);


  // Fetch data when page or limit changes (initial load and pagination)
  useEffect(() => {
    const ac = new AbortController();
    fetchData(ac.signal, filters);
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.page, filters.limit]);

  const handleAdd = useCallback(() => {
    router.push("/temple/vihara/add");
  }, [router]);

  const handleAddSilmatha = useCallback(() => {
    router.push("/silmatha/add");
  }, [router]);

  const handleAddUpasampada = useCallback(() => {
    router.push("/bhikkhu/upasmpada/add");
  }, [router]);

  const handleEdit = useCallback(
    (item: ViharaRow) => {
      // Use vh_id if available, otherwise use vh_trn
      const id = item.vh_id ? String(item.vh_id) : item.vh_trn;
      router.push(`/temple/vihara/${encodeURIComponent(id)}/update`);
    },
    [router]
  );

  const handleDelete = useCallback(
    async (item: ViharaRow) => {
      const ok =
        typeof window !== "undefined"
          ? window.confirm(`Delete Vihara ${item.vh_trn}?`)
          : true;
      if (!ok) return;
      setLoading(true);
      try {
        await _manageVihara({
          action: "DELETE",
          payload: { vh_id: item.vh_id },
        });
        toast.success("Vihara deleted successfully");
        await fetchData(undefined, filters);
      } catch (e) {
        console.error("Delete Error:", e);
        toast.error("Failed to delete vihara");
      } finally {
        setLoading(false);
      }
    },
    [fetchData, filters]
  );

  const handlePageChange = useCallback(
    async (nextPage: number) => {
      const safe = Math.max(1, nextPage);
      const nextFilters = { ...filters, page: safe };
      setFilters(nextFilters);
      await fetchData(undefined, nextFilters);
    },
    [fetchData, filters]
  );

  const handlePageSizeChange = useCallback(
    async (size: number) => {
      const limit = Math.max(1, size);
      const nextFilters = { ...filters, page: 1, limit };
      setFilters(nextFilters);
      await fetchData(undefined, nextFilters);
    },
    [fetchData, filters]
  );

  const handleFillStageTwo = useCallback(
    (item: ViharaRow) => {
      if (item.workflow_status !== "S1_APPROVED") {
        toast.error("Stage 1 must be approved before starting Stage 2.");
        return;
      }
      const id = item.vh_id ? String(item.vh_id) : item.vh_trn;
      router.push(`/temple/vihara/add?id=${encodeURIComponent(id)}&stage=2`);
    },
    [router]
  );

  useEffect(() => {
    const stored = getStoredUserData();
    setIsDivisionalSec(
      (stored?.department || "") === DIVITIONAL_SEC_MANAGEMENT_DEPARTMENT
    );
  }, []);

  useEffect(() => {
    const prev = prevFiltersRef.current;
    const searchChanged = prev.searchKey !== filters.searchKey;
    const nonSearchChanged =
      prev.nikaya !== filters.nikaya ||
      prev.parchawa !== filters.parchawa ||
      prev.province !== filters.province ||
      prev.district !== filters.district ||
      prev.divisionSecretariat !== filters.divisionSecretariat ||
      prev.gn !== filters.gn;

    if (searchDebounceRef.current) {
      window.clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }

    // Reset to page 1 when any filter changes
    if ((searchChanged || nonSearchChanged) && filters.page !== 1) {
      setFilters((s) => ({ ...s, page: 1 }));
      return;
    }

    if (searchChanged) {
      const key = filters.searchKey.trim();
      if (key.length > 0 && key.length < 3) {
        prevFiltersRef.current = filters;
        return;
      }

      const delay = key.length >= 3 ? 400 : 0;
      searchDebounceRef.current = window.setTimeout(() => {
        fetchData(undefined, filters);
      }, delay);
    } else if (nonSearchChanged) {
      fetchData(undefined, filters);
    }

    prevFiltersRef.current = filters;
  }, [
    fetchData,
    filters,
    filters.searchKey,
    filters.nikaya,
    filters.parchawa,
    filters.province,
    filters.district,
    filters.divisionSecretariat,
    filters.gn,
  ]);

  const columns: Column[] = useMemo(
    () => [
      { key: "vh_trn", label: "TRN", sortable: true },
      { key: "name", label: "Name", sortable: true },
      { key: "mobile", label: "Mobile" },
      { key: "address", label: "Address" },
      {
        key: "workflow_status",
        label: "Status",
        sortable: true,
        render: (item: ViharaRow) => <StatusBadge status={item.workflow_status} />,
      },
      ...(isDivisionalSec
        ? []
        : [
            {
              key: "stage2",
              label: "Fill Stage 2",
              render: (item: ViharaRow) => {
                const canFill = item.workflow_status === "S1_APPROVED";
                return (
                  <button
                    onClick={() => handleFillStageTwo(item)}
                    disabled={!canFill}
                    className={`text-xs font-semibold rounded-md px-2 py-1 transition-all ${
                      canFill
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-slate-200 text-slate-500 cursor-not-allowed"
                    }`}
                  >
                    Fill Stage 2
                  </button>
                );
              },
            },
          ]),
    ],
    [handleFillStageTwo, isDivisionalSec]
  );

  return (
    <div >
      <main className="p-0">
          <div className="relative mb-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h1 className="text-xl font-bold text-gray-800">Vihara</h1>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleAdd}
                  disabled={loading}
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white px-3 py-1.5 text-sm rounded-lg transition-colors"
                >
                  <PlusIcon className="w-5 h-5" />
                  Add Vihara
                </button>
                {/* <button
                  onClick={handleAddSilmatha}
                  disabled={loading}
                  className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <PlusIcon className="w-5 h-5" />
                  Add Silmatha
                </button> */}
                {/* <button
                  onClick={handleAddUpasampada}
                  disabled={loading}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <PlusIcon className="w-5 h-5" />
                  Add Upasampada
                </button> */}
              </div>
            </div>

          </div>
          <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3 lg:grid-cols-4">
              <div>
                <input
                  type="text"
                  value={filters.searchKey}
                  onChange={(e) =>
                    setFilters((s) => ({
                      ...s,
                      searchKey: e.target.value,
                    }))
                  }
                  placeholder="Search by name, reg. no, etc."
                  className="w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <NikayaParshawaCompact
                nikayaValue={filters.nikaya}
                onNikayaChange={handleNikayaChange}
                parshawaValue={filters.parchawa}
                onParshawaChange={handleParshawaChange}
                nikayaOptions={nikayaData.map((n) => n.nikaya)}
                parshawaOptions={parshawaOptions}
                nikayaLoading={nikayaLoading}
                nikayaError={nikayaError}
                onRetry={loadNikayaHierarchy}
              />

              <div className="md:col-span-3 lg:col-span-4">
                <LocationPickerCompact
                  value={locationSelection}
                  onChange={(sel) => handleLocationChange(sel)}
                  className="w-full"
                />
              </div>
            </div>

            <div className="mt-2" />
          </div>

<div className="relative overflow-y-auto max-h-[240px]">
            <DataTable
              columns={columns}
              data={records}
              onEdit={handleEdit}
              hidePagination
              onDelete={canDelete ? handleDelete : undefined}
              activePage={VIHARA}
            />
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm rounded-lg">
                <div className="flex items-center gap-2 text-gray-700">
                  <Spinner />
                  <span className="text-sm font-medium">Loading...</span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-xs text-slate-600">
              {totalRecords > 0
                ? `Showing ${
                    (filters.page - 1) * filters.limit + 1
                  } to ${
                    Math.min((filters.page - 1) * filters.limit + records.length, totalRecords)
                  } of ${totalRecords}`
                : "No records to display"}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-600">
                Rows per page
                <select
                  value={filters.limit}
                  onChange={(e) =>
                    handlePageSizeChange(Number(e.target.value))
                  }
                  className="border border-slate-300 rounded px-2 py-1 text-xs"
                  disabled={loading}
                >
                  {[5, 10, 25, 50].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePageChange(filters.page - 1)}
                  disabled={loading || filters.page <= 1}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${
                    filters.page <= 1 || loading
                      ? "text-slate-400 border-slate-200"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Previous
                </button>
                <span className="text-xs font-semibold text-slate-700">
                  Page {filters.page}
                </span>
                <button
                  type="button"
                  onClick={() => handlePageChange(filters.page + 1)}
                  disabled={loading || !hasMoreResults}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${
                    !hasMoreResults || loading
                      ? "text-slate-400 border-slate-200"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </main>
        <ToastContainer position="top-right" newestOnTop closeOnClick pauseOnHover />

    </div>
  );
}

/* ---------- Small UI primitives ---------- */

function LabeledDate({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const hiddenRef = useRef<HTMLInputElement | null>(null);
  const normalized = toYYYYMMDD(value); // Convert to display format (YYYY/MM/DD)

  const openPicker = () => {
    const el = hiddenRef.current;
    if (el?.showPicker) el.showPicker();
    else el?.click();
  };

  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-gray-600">{label}</span>
      <div className="relative flex">
        <input
          type="text"
          inputMode="numeric"
          pattern="(\d{4}-\d{2}-\d{2}|\d{4}/\d{2}/\d{2})"
          placeholder="YYYY/MM/DD"
          value={normalized}
          onChange={(e) => onChange(toYYYYMMDD(e.target.value))}
          onBlur={(e) => onChange(toYYYYMMDD(e.target.value))}
          className="w-full rounded-l-md border border-gray-300 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={openPicker}
          className="px-2 border border-l-0 border-gray-300 rounded-r-md text-gray-600 hover:bg-gray-50 text-xs"
          aria-label={`Pick ${label}`}
        >
          Pick
        </button>
        <input
          ref={hiddenRef}
          type="date"
          value={toYYYYMMDD(value).replace(/\//g, "-")}
          onChange={(e) => onChange(toYYYYMMDD(e.target.value))}
          className="absolute opacity-0 pointer-events-none w-0 h-0"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>
      <span className="text-[11px] text-gray-500">Format: YYYY/MM/DD</span>
    </label>
  );
}
