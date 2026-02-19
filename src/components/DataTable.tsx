// app/components/DataTable.tsx
"use client";
import React, { useMemo, useState } from "react";
import {
  SearchIcon,
  EditIcon,
  TrashIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronsLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsRightIcon,
} from "lucide-react";
import { ARAMA, DEWALA, NILAME, VIHARA } from "@/app/(default)/temple/constants";

export interface Column<T extends Record<string, unknown> = any> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T extends Record<string, unknown> = any> {
  columns: Column<T>[];
  data: T[];
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  /** Pagination window config (optional tuning for very large page counts) */
  paginationConfig?: {
    siblingCount?: number; // pages around current
    boundaryCount?: number; // pages at start/end
  };
  hidePagination?: boolean;
  activePage?: string;
  haveAccess?: boolean;
}

function isNumberLike(v: unknown): v is number {
  return typeof v === "number" && !Number.isNaN(v);
}

function defaultComparator(a: unknown, b: unknown): number {
  // Why: robust, consistent sorting across types.
  if (isNumberLike(a) && isNumberLike(b)) return a - b;
  const as = String(a ?? "");
  const bs = String(b ?? "");
  return as.localeCompare(bs, undefined, { numeric: true, sensitivity: "base" });
}

function getPaginationRange(
  totalPages: number,
  currentPage: number,
  siblingCount = 1,
  boundaryCount = 1
): Array<number | "…"> {
  if (totalPages <= 0) return [];
  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
  const curr = clamp(currentPage, 1, totalPages);

  const startPages = Array.from({ length: Math.min(boundaryCount, totalPages) }, (_, i) => i + 1);
  const endPages = Array.from(
    { length: Math.min(boundaryCount, totalPages) },
    (_, i) => totalPages - Math.min(boundaryCount, totalPages) + 1 + i
  );

  const left = clamp(curr - siblingCount, 1, totalPages);
  const right = clamp(curr + siblingCount, 1, totalPages);

  const range: Array<number | "…"> = [];

  // Start
  for (const p of startPages) range.push(p);

  // Left ellipsis
  const leftGap = left - (startPages[startPages.length - 1] ?? 0);
  if (leftGap > 1) {
    range.push("…");
  } else if (leftGap === 1) {
    range.push(left - 1);
  }

  // Middle
  for (let p = left; p <= right; p++) {
    if (p > 0 && p <= totalPages) range.push(p);
  }

  // Right ellipsis
  const lastOfMiddle = right;
  const firstOfEnd = endPages[0] ?? totalPages + 1;
  const rightGap = firstOfEnd - lastOfMiddle;
  if (rightGap > 1) {
    range.push("…");
  } else if (rightGap === 1) {
    range.push(firstOfEnd - 1);
  }

  // End
  for (const p of endPages) {
    if (!range.includes(p)) range.push(p);
  }

  // Deduplicate & sort stable by order of insertion
  return range.filter((v, i, arr) => arr.indexOf(v) === i);
}

export function DataTable<T extends Record<string, unknown> = any>({
  columns,
  data,
  onEdit,
  onDelete,
  paginationConfig,
  hidePagination = false,
  activePage,
  haveAccess,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const siblingCount = paginationConfig?.siblingCount ?? 1;
  const boundaryCount = paginationConfig?.boundaryCount ?? 1;

  const handleSort = (key: string) => {
    if (sortColumn === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(key);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return data;
    return data.filter((item) =>
      Object.values(item).some((v) => String(v ?? "").toLowerCase().includes(q))
    );
  }, [data, searchTerm]);

  const sorted = useMemo(() => {
    if (!sortColumn) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const cmp = defaultComparator(a[sortColumn], b[sortColumn]);
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortColumn, sortDirection]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(sorted.length / Math.max(1, itemsPerPage))),
    [sorted.length, itemsPerPage]
  );

  // Clamp current page if itemsPerPage or data changes
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const page = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * itemsPerPage;
    return sorted.slice(startIndex, startIndex + itemsPerPage);
  }, [sorted, safeCurrentPage, itemsPerPage]);

  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const displayedRows = hidePagination ? sorted : page;

  const goToPage = (p: number) => {
    const clamped = Math.max(1, Math.min(totalPages, p));
    setCurrentPage(clamped);
  };

  const visibleRange = useMemo(
    () => getPaginationRange(totalPages, safeCurrentPage, siblingCount, boundaryCount),
    [totalPages, safeCurrentPage, siblingCount, boundaryCount]
  );

  console.log('haveAccess in DataTable:', haveAccess);
  console.log('activePage in DataTable:', activePage);
  console.log('onEdit in DataTable:', !!onEdit);  
  console.log('onDelete in DataTable:', !!onDelete);

  return (
    <div className="bg-white rounded-lg shadow">
      {/* <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
      </div> */}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map((c) => (
                <th
                  key={String(c.key)}
                  className="px-3 py-1 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wide"
                >
                  {c.sortable ? (
                    <button
                      onClick={() => handleSort(String(c.key))}
                      className="flex items-center gap-2 hover:text-gray-700"
                    >
                      {c.label}
                      {sortColumn === String(c.key) &&
                        (sortDirection === "asc" ? (
                          <ChevronUpIcon className="w-4 h-4" />
                        ) : (
                          <ChevronDownIcon className="w-4 h-4" />
                        ))}
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              ))}
              {(onEdit || onDelete) && 
              (activePage !== NILAME && activePage !== DEWALA) && 
              (
                <th className="px-3 py-1 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                  Action
                </th>
              )}
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {displayedRows.map((item, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                {columns.map((c) => {
                  const colKey = String(c.key);
                  const rawValue = c.render ? c.render(item) : (item as any)?.[colKey];
                  const content =
                    rawValue === null || rawValue === undefined
                      ? ""
                      : React.isValidElement(rawValue)
                      ? rawValue
                      : typeof rawValue === "string" ||
                        typeof rawValue === "number" ||
                        typeof rawValue === "boolean"
                      ? String(rawValue)
                      : String(rawValue);

                  return (
                    <td key={colKey} className="px-3 py-1 whitespace-nowrap text-xs text-gray-900">
                      {content}
                    </td>
                  );
                })}
                {(onEdit || onDelete) && 
                (activePage !== NILAME && activePage !== DEWALA)
                 && (
                  <td className="px-3 py-1 whitespace-nowrap text-xs">
                    <div className="flex gap-2">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(item)}
                          className="text-blue-600 hover:text-blue-800"
                          aria-label="Edit"
                        >
                          <EditIcon className="w-4 h-4" />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(item)}
                          className="text-red-600 hover:text-red-800"
                          aria-label="Delete"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {displayedRows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + (onEdit || onDelete ? 1 : 0)}
                  className="px-4 py-6 text-center text-xs text-gray-500"
                >
                  No records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!hidePagination && (
        <div className="px-4 py-3 border-t border-gray-200 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-gray-700">
            Showing {sorted.length === 0 ? 0 : startIndex + 1} to{" "}
            {Math.min(startIndex + itemsPerPage, sorted.length)} of {sorted.length} entries
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-700">Records per page</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  const n = Math.max(1, Number(e.target.value));
                  setItemsPerPage(n);
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded px-2 py-1 text-xs"
              >
                {[5, 10, 25, 50, 100, 250].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <nav className="flex items-center gap-1" aria-label="Pagination">
              <button
                onClick={() => goToPage(1)}
                disabled={safeCurrentPage === 1}
                className={`px-2 py-1 rounded border text-xs ${
                  safeCurrentPage === 1
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-white hover:bg-gray-50 text-gray-700"
                }`}
                aria-label="First page"
                title="First page"
              >
                <ChevronsLeftIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => goToPage(safeCurrentPage - 1)}
                disabled={safeCurrentPage === 1}
                className={`px-2 py-1 rounded border text-xs ${
                  safeCurrentPage === 1
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-white hover:bg-gray-50 text-gray-700"
                }`}
                aria-label="Previous page"
                title="Previous page"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>

              {visibleRange.map((p, i) =>
                p === "…" ? (
                  <span key={`ellipsis-${i}`} className="px-2 py-1 text-xs text-gray-500">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => goToPage(p)}
                    className={`px-2.5 py-1 rounded text-xs ${
                      p === safeCurrentPage
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                onClick={() => goToPage(safeCurrentPage + 1)}
                disabled={safeCurrentPage === totalPages}
                className={`px-2 py-1 rounded border text-xs ${
                  safeCurrentPage === totalPages
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-white hover:bg-gray-50 text-gray-700"
                }`}
                aria-label="Next page"
                title="Next page"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => goToPage(totalPages)}
                disabled={safeCurrentPage === totalPages}
                className={`px-2 py-1 rounded border text-xs ${
                  safeCurrentPage === totalPages
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-white hover:bg-gray-50 text-gray-700"
                }`}
                aria-label="Last page"
                title="Last page"
              >
                <ChevronsRightIcon className="w-4 h-4" />
              </button>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
