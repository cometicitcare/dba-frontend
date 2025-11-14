// app/(dashboard)/bhikkhu/page.tsx
"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { DataTable, type Column } from "@/components/DataTable";
import { PlusIcon, RotateCwIcon, XIcon } from "lucide-react";
import { FooterBar } from "@/components/FooterBar";
import { _manageBhikku } from "@/services/bhikku";
import { _getNikayaAndParshawa } from "@/services/nikaya";
import TempleAutocomplete from "@/components/Bhikku/Add/AutocompleteTemple"; // <- use provided component
import LocationPicker from "@/components/Bhikku/Filter/LocationPicker";
import BhikkhuCategorySelect from "@/components/Bhikku/Add/CategorySelect";
import BhikkhuStatusSelect from "@/components/Bhikku/Add/StatusSelect";
import { toYYYYMMDD } from "@/components/Bhikku/Add";
import type { LocationSelection } from "@/components/Bhikku/Filter/LocationPicker";

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
    <svg className="h-6 w-6 animate-spin" viewBox="0 0 24 24" role="status" aria-label="Loading">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none" />
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
  status: string[];
  category: string[];
  dateFrom: string; // yyyy-mm-dd
  dateTo: string;   // yyyy-mm-dd
  searchKey: string;
  page: number;
  limit: number;
};

type NikayaHierarchy = {
  nikaya: { code: string; name: string };
  parshawayas: Array<{ code: string; name: string }>;
};

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
  status: [],
  category: [],
  dateFrom: "",
  dateTo: "",
  searchKey: "",
  page: 1,
  limit: 10,
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
  if (f.divisionSecretariat) payload.divisional_secretariat = f.divisionSecretariat;
  if (f.gn) payload.gn_division = f.gn;
  if (f.templeTrn) payload.temple = f.templeTrn;
  if (f.childTempleTrn) payload.child_temple = f.childTempleTrn;
  if (f.nikaya) payload.nikaya = f.nikaya;
  if (f.parchawa) payload.parshawaya = f.parchawa;
  if (f.category.length) payload.category = f.category;
  if (f.status.length) payload.status = f.status;
  const from = toYYYYMMDD(f.dateFrom);
  if (from) payload.date_from = from;
  const to = toYYYYMMDD(f.dateTo);
  if (to) payload.date_to = to;

  return payload;
}

export default function BhikkhuList() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<BhikkuRow[]>([]);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [nikayaData, setNikayaData] = useState<NikayaHierarchy[]>([]);
  const [nikayaLoading, setNikayaLoading] = useState(false);
  const [nikayaError, setNikayaError] = useState<string | null>(null);
  const locationSelection = useMemo<LocationSelection>(
    () => ({
      provinceCode: filters.province || undefined,
      districtCode: filters.district || undefined,
      divisionCode: filters.divisionSecretariat || undefined,
      gnCode: filters.gn || undefined,
    }),
    [filters]
  );

  const loadNikayaHierarchy = useCallback(async () => {
    setNikayaLoading(true);
    setNikayaError(null);
    try {
      const res = await _getNikayaAndParshawa();
      const list = ((res as any)?.data?.data ?? []) as NikayaHierarchy[];
      setNikayaData(Array.isArray(list) ? list : []);
    } catch (error) {
      setNikayaError(error instanceof Error ? error.message : "Failed to load Nikaya data");
    } finally {
      setNikayaLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNikayaHierarchy();
  }, [loadNikayaHierarchy]);

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
          status: row?.br_currstat ?? "",
        }));
        setRecords(cleaned);
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

  const handleEdit = useCallback(
    (item: BhikkuRow) => {
      router.push(`/bhikkhu/manage/${encodeURIComponent(item.regNo)}`);
    },
    [router]
  );

  const handleDelete = useCallback(
    async (item: BhikkuRow) => {
      const ok = typeof window !== "undefined" ? window.confirm(`Delete Bhikku ${item.regNo}?`) : true;
      if (!ok) return;
      setLoading(true);
      try {
        await _manageBhikku({ action: "DELETE", payload: { br_regn: item.regNo } });
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
    await fetchData(undefined, filters);
  }, [fetchData, filters]);

  const clearFilters = useCallback(async () => {
    const reset = { ...DEFAULT_FILTERS };
    setFilters(reset);
    await fetchData(undefined, reset);
  }, [fetchData]);

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <TopBar onMenuClick={() => setSidebarOpen((v) => !v)} />
      <Sidebar isOpen={sidebarOpen} />
      <div className={`transition-all duration-300 pt-16 ${sidebarOpen ? "ml-64" : "ml-0"}`}>
        <main className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Bhikku List</h1>
            <button
              onClick={handleAdd}
              disabled={loading}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              Add Bhikku
            </button>
          </div>

          {/* Filter Bar */}
          <div className="mb-4 bg-white rounded-xl shadow p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Temple Autocomplete (uses TRN) */}
              <div className="lg:col-span-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <TempleAutocomplete
                      id="flt-temple"
                      label="Temples"
                      initialDisplay={filters.templeDisplay}
                      onPick={({ trn, display }) =>
                        setFilters((s) => ({ ...s, templeTrn: trn ?? "", templeDisplay: display }))
                      }
                      storeTrn
                      placeholder="Search temple"
                    />
                  </div>
                  {filters.templeTrn && (
                    <button
                      type="button"
                      aria-label="Clear temple"
                      onClick={() => setFilters((s) => ({ ...s, templeTrn: "", templeDisplay: "" }))}
                      className="h-9 w-9 mt-7 grid place-items-center rounded-md border hover:bg-slate-50"
                    >
                      <XIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Child Temple Autocomplete (uses TRN) */}
              <div className="lg:col-span-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <TempleAutocomplete
                      id="flt-child-temple"
                      label="Child Temple"
                      initialDisplay={filters.childTempleDisplay}
                      onPick={({ trn, display }) =>
                        setFilters((s) => ({ ...s, childTempleTrn: trn ?? "", childTempleDisplay: display }))
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
                        setFilters((s) => ({ ...s, childTempleTrn: "", childTempleDisplay: "" }))
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
                  <span className="text-sm text-gray-500">Loading Nikayaâ€¦</span>
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
                      <option key={n.nikaya.code} value={n.nikaya.code}>
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
              <div className="col-span-1 md:col-span-2 lg:col-span-3">
                <LocationPicker
                  value={locationSelection}
                  onChange={(sel) => handleLocationChange(sel)}
                  className="w-full"
                />
              </div>
              <div>
                <BhikkhuCategorySelect
                  id="flt-category"
                  label="Category"
                  value={filters.category}
                  onPick={({ code }) => setFilters((s) => ({ ...s, category: code }))}
                />
              </div>
              <div>
                <BhikkhuStatusSelect
                  id="flt-status"
                  label="Current Status"
                  value={filters.status}
                  onPick={({ code }) => setFilters((s) => ({ ...s, status: code }))}
                />
              </div>
              <LabeledDate
                label="Date From"
                value={filters.dateFrom}
                onChange={(v) => setFilters((s) => ({ ...s, dateFrom: v }))}
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

          <div className="relative">
            <DataTable columns={columns} data={records} onEdit={handleEdit} onDelete={handleDelete} />
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm rounded-lg">
                <div className="flex items-center gap-2 text-gray-700">
                  <Spinner />
                  <span className="text-sm font-medium">Loadingâ€¦</span>
                </div>
              </div>
            )}
          </div>
        </main>
        <FooterBar />
      </div>
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

