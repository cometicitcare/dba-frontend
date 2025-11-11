// ./src/app/(default)/bhikkhu/manage/page.tsx
"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { DataTable, type Column } from "@/components/DataTable";
import { PlusIcon } from "lucide-react";
import { FooterBar } from "@/components/FooterBar";
import { _manageBhikku } from "@/services/bhikku";

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
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export default function BhikkhuList() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<BhikkuRow[]>([]);

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

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const body = {
        action: "READ_ALL",
        payload: { page: 1, limit: 200, search_key: "", sort_by: "br_regn", sort_dir: "asc" },
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
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    fetchData(ac.signal);
    return () => ac.abort();
  }, [fetchData]);

  const handleAdd = useCallback(() => {
    router.push("/bhikku/add");
  }, [router]);

  const handleEdit = useCallback(
    (item: BhikkuRow) => {
      router.push(`/bhikku/edit/${encodeURIComponent(item.regNo)}`);
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
        await fetchData();
      } catch (e) {
        console.error("Delete Error:", e);
      } finally {
        setLoading(false);
      }
    },
    [fetchData]
  );

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

          <div className="relative">
            <DataTable
              columns={columns}
              data={records}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm rounded-lg">
                <div className="flex items-center gap-2 text-gray-700">
                  <Spinner />
                  <span className="text-sm font-medium">Loading…</span>
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
