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
import { PlusIcon, RotateCwIcon, XIcon } from "lucide-react";
import { FooterBar } from "@/components/FooterBar";
import { _manageBhikku } from "@/services/bhikku";
import TempleAutocomplete from "@/components/Bhikku/Add/AutocompleteTemple"; // <- use provided component
import LocationPickerStacked from "@/components/Bhikku/Filter/LocationPickerStacked";
import BhikkhuStatusSelect from "@/components/Bhikku/Add/StatusSelect";
import { toYYYYMMDD } from "@/components/Bhikku/Add";
import type { LocationSelection } from "@/components/Bhikku/Filter/LocationPickerStacked";
import selectionsData from "@/utils/selectionsData.json";

type BhikkuRow = {
  regNo: string;
  name: string;
  fatherName?: string;
  mobile?: string;
  email?: string;
  mahanayaka?: string;
  remarks?: string;
  category?: string;
  status?: string;
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
  if (f.status.length) payload.status = [f.status];
  const from = toYYYYMMDD(f.dateFrom);
  if (from) payload.date_from = from;
  const to = toYYYYMMDD(f.dateTo);
  if (to) payload.date_to = to;

  return payload;
}

export default function UpasampadaList () {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<BhikkuRow[]>([]);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [hasMoreResults, setHasMoreResults] = useState(false);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);
  const filterPanelRef = useRef<HTMLDivElement | null>(null);
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

  const columns: Column[] = useMemo(
    () => [
      { key: "regNo", label: "Reg. No", sortable: true },
      { key: "name", label: "Name", sortable: true },
      { key: "mobile", label: "Mobile" },
      { key: "email", label: "Email" },
      { key: "status", label: "Status", sortable: true },
    ],
    []
  );

  const fetchData = useCallback(
    async (signal?: AbortSignal, f: FilterState = filters) => {
      setLoading(true);
      try {
        const body = {
          action: "READ_ALL",
          payload: buildFilterPayload(f),
        };
        // @ts-expect-error: service typing may be loose
        const res = await _manageBhikku(body, { signal });
        const raw = pickRows<any>(res);
        const cleaned: BhikkuRow[] = raw.map((row: any) => ({
          regNo: String(row?.br_regn ?? ""),
          name: String(row?.br_gihiname ?? ""),
          fatherName: row?.br_fathrname ?? "",
          mobile: row?.br_mobile ?? "",
          email: row?.br_email ?? "",
          mahanayaka: row?.br_mahananame ?? "",
          remarks: row?.br_remarks ?? "",
          category: row?.br_cat ?? "",
          status: row?.br_currstat?.st_descr ?? "",
        }));
        setRecords(cleaned);
        setHasMoreResults(cleaned.length === f.limit);
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          console.error("Fetch Error:", e);
          setRecords([]);
        }
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  useEffect(() => {
    const ac = new AbortController();
    fetchData(ac.signal, filters);
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // initial load only

  const handleAdd = useCallback(() => {
    router.push("/bhikkhu/add");
  }, [router]);

  const handleAddSilmatha = useCallback(() => {
    router.push("/silmatha/add");
  }, [router]);

  const handleAddUpasampada = useCallback(() => {
    router.push("/bhikkhu/upasmpada/add");
  }, [router]);

  const handleEdit = useCallback(
    (item: BhikkuRow) => {
      router.push(`/bhikkhu/manage/${encodeURIComponent(item.regNo)}`);
    },
    [router]
  );

  const handleDelete = useCallback(
    async (item: BhikkuRow) => {
      const ok =
        typeof window !== "undefined"
          ? window.confirm(`Delete Bhikku ${item.regNo}?`)
          : true;
      if (!ok) return;
      setLoading(true);
      try {
        await _manageBhikku({
          action: "DELETE",
          payload: { br_regn: item.regNo },
        });
        await fetchData(undefined, filters);
      } catch (e) {
        console.error("Delete Error:", e);
      } finally {
        setLoading(false);
      }
    },
    [fetchData, filters]
  );

  const applyFilters = useCallback(async () => {
    const next = { ...filters, page: 1 };
    setFilters(next);
    await fetchData(undefined, next);
    setFilterPanelOpen(false);
  }, [fetchData, filters]);

  const clearFilters = useCallback(async () => {
    const reset = { ...DEFAULT_FILTERS };
    setFilters(reset);
    await fetchData(undefined, reset);
    setFilterPanelOpen(false);
  }, [fetchData]);

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

  useEffect(() => {
    if (!filterPanelOpen) return undefined;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target?.closest('[data-filter-keepopen="true"]')) return;
      if (
        filterPanelRef.current &&
        !filterPanelRef.current.contains(target) &&
        filterButtonRef.current &&
        !filterButtonRef.current.contains(target)
      ) {
        setFilterPanelOpen(false);
      }
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFilterPanelOpen(false);
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [filterPanelOpen]);

  return (
    <div >
      <main >
          <div className="relative mb-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-800">Bhikku List</h1>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleAdd}
                  disabled={loading}
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <PlusIcon className="w-5 h-5" />
                  Add Bhikku
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
                <button
                  ref={filterButtonRef}
                  type="button"
                  onClick={() => setFilterPanelOpen((prev) => !prev)}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors ${
                    filterPanelOpen
                      ? "border-blue-500 bg-blue-50 text-blue-600"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                  aria-expanded={filterPanelOpen}
                  aria-haspopup="dialog"
                >
                  Filter
                </button>
              </div>
            </div>

            {filterPanelOpen && (
              <div
                ref={filterPanelRef}
                className="absolute right-0 top-full z-30 mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl overflow-y-auto"
                style={{ width: "300px", height: "400px" }}
                role="dialog"
                aria-label="Bhikku filters"
                data-filter-keepopen="true"
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-lg font-semibold text-slate-800">
                    Filters
                  </p>
                  <button
                    type="button"
                    onClick={() => setFilterPanelOpen(false)}
                    className="rounded-full border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
                    aria-label="Close filter panel"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="flex flex-col gap-1">
                      <span className="text-sm text-gray-600">Search</span>
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
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </label>
                  </div>

                  {/* Temple Autocomplete (uses TRN) */}
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <TempleAutocomplete
                          id="flt-temple"
                          label="Temples"
                          initialDisplay={filters.templeDisplay}
                          onPick={({ trn, display }) =>
                            setFilters((s) => ({
                              ...s,
                              templeTrn: trn ?? "",
                              templeDisplay: display,
                            }))
                          }
                          storeTrn
                          placeholder="Search temple"
                        />
                      </div>
                      {filters.templeTrn && (
                        <button
                          type="button"
                          aria-label="Clear temple"
                          onClick={() =>
                            setFilters((s) => ({
                              ...s,
                              templeTrn: "",
                              templeDisplay: "",
                            }))
                          }
                          className="h-9 w-9 mt-7 grid place-items-center rounded-md border hover:bg-slate-50"
                        >
                          <XIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Child Temple Autocomplete (uses TRN) */}
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <TempleAutocomplete
                          id="flt-child-temple"
                          label="Child Temple"
                          initialDisplay={filters.childTempleDisplay}
                          onPick={({ trn, display }) =>
                            setFilters((s) => ({
                              ...s,
                              childTempleTrn: trn ?? "",
                              childTempleDisplay: display,
                            }))
                          }
                          storeTrn
                          placeholder="Search child temple"
                        />
                      </div>
                      {filters.childTempleTrn && (
                        <button
                          type="button"
                          aria-label="Clear child temple"
                          onClick={() =>
                            setFilters((s) => ({
                              ...s,
                              childTempleTrn: "",
                              childTempleDisplay: "",
                            }))
                          }
                          className="h-9 w-9 mt-7 grid place-items-center rounded-md border hover:bg-slate-50"
                        >
                          <XIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-gray-600">Nikaya</span>
                    {nikayaLoading ? (
                      <span className="text-sm text-gray-500">
                        Loading Nikaya...
                      </span>
                    ) : nikayaError ? (
                      <div className="flex flex-wrap items-center gap-2 text-sm text-red-600">
                        <span>Error loading Nikaya</span>
                        <button
                          type="button"
                          onClick={() => loadNikayaHierarchy()}
                          className="text-xs font-medium text-blue-600 underline disabled:text-blue-400"
                          disabled={nikayaLoading}
                        >
                          Retry
                        </button>
                      </div>
                    ) : (
                      <select
                        value={filters.nikaya}
                        onChange={(e) => handleNikayaChange(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                        disabled={!nikayaData.length}
                      >
                        <option value="">Select Nikaya</option>
                        {nikayaData.map((n) => (
                          <option
                            key={n.nikaya.code}
                            value={n.nikaya.code}
                          >
                            {n.nikaya.name} - {n.nikaya.code}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-gray-600">Parchawa</span>
                    <select
                      value={filters.parchawa}
                      onChange={(e) => handleParshawaChange(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      disabled={!filters.nikaya || parshawaOptions.length === 0}
                    >
                      <option value="">
                        {!filters.nikaya
                          ? "Select Nikaya first"
                          : parshawaOptions.length
                          ? "Select Chapter"
                          : "No chapters available"}
                      </option>
                      {parshawaOptions.map((p) => (
                        <option key={p.code} value={p.code}>
                          {p.name} - {p.code}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <LocationPickerStacked
                      value={locationSelection}
                      onChange={(sel) => handleLocationChange(sel)}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <BhikkhuStatusSelect
                      id="flt-status"
                      label="Current Status"
                      value={filters.status}
                      onPick={({ code }) =>
                        setFilters((s) => ({ ...s, status: code }))
                      }
                    />
                  </div>

                  <LabeledDate
                    label="Date From"
                    value={filters.dateFrom}
                    onChange={(v) =>
                      setFilters((s) => ({ ...s, dateFrom: v }))
                    }
                  />
                  <LabeledDate
                    label="Date To"
                    value={filters.dateTo}
                    onChange={(v) => setFilters((s) => ({ ...s, dateTo: v }))}
                  />
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                  <button
                    onClick={applyFilters}
                    disabled={loading}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    Apply Filters
                  </button>
                  <button
                    onClick={clearFilters}
                    disabled={loading}
                    className="px-3 py-2 rounded-lg border text-gray-700 hover:bg-gray-50 disabled:opacity-60 inline-flex items-center gap-1"
                  >
                    <RotateCwIcon className="w-4 h-4" />
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <DataTable
              columns={columns}
              data={records}
              onEdit={handleEdit}
              onDelete={handleDelete}
              hidePagination
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

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-slate-600">
              {records.length
                ? `Showing ${
                    (filters.page - 1) * filters.limit + 1
                  } to ${
                    (filters.page - 1) * filters.limit + records.length
                  }`
                : "No records to display"}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                Rows per page
                <select
                  value={filters.limit}
                  onChange={(e) =>
                    handlePageSizeChange(Number(e.target.value))
                  }
                  className="border border-slate-300 rounded px-2 py-1 text-sm"
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
                  className={`px-4 py-2 rounded-lg border text-sm font-medium ${
                    filters.page <= 1 || loading
                      ? "text-slate-400 border-slate-200"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Previous
                </button>
                <span className="text-sm font-semibold text-slate-700">
                  Page {filters.page}
                </span>
                <button
                  type="button"
                  onClick={() => handlePageChange(filters.page + 1)}
                  disabled={loading || !hasMoreResults}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium ${
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
  const normalized = toYYYYMMDD(value);

  const openPicker = () => {
    const el = hiddenRef.current;
    if (el?.showPicker) el.showPicker();
    else el?.click();
  };

  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="relative flex">
        <input
          type="text"
          inputMode="numeric"
          pattern="\\d{4}-\\d{2}-\\d{2}"
          placeholder="YYYY-MM-DD"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => onChange(toYYYYMMDD(e.target.value))}
          className="w-full rounded-l-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={openPicker}
          className="px-3 border border-l-0 border-gray-300 rounded-r-lg text-gray-600 hover:bg-gray-50 text-sm"
          aria-label={`Pick ${label}`}
        >
          Pick
        </button>
        <input
          ref={hiddenRef}
          type="date"
          value={normalized}
          onChange={(e) => onChange(toYYYYMMDD(e.target.value))}
          className="absolute opacity-0 pointer-events-none w-0 h-0"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>
      <span className="text-xs text-gray-500">Format: YYYY-MM-DD</span>
    </label>
  );
}
