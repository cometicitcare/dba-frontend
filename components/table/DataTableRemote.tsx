"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  DataTable,
  DataTableColumn,
  DataTableSortStatus,
  DataTableRowExpansionProps,
} from "mantine-datatable";

export type RemoteFetchArgs = {
  page: number;
  pageSize: number;
  sort?: DataTableSortStatus;
  search?: string;
};

export type RemoteFetchResult<T> = {
  records: T[];
  totalRecords: number;
};

type BaseRecord = Record<string, any>;
type RowExpandArgs<T> = { record: T; recordIndex: number; collapse: () => void };

export type DataTableRemoteProps<T extends BaseRecord> = {
  columns: DataTableColumn<T>[];
  /** Build a stable unique key; if provided, it will be stored on __rowId */
  getRowId?: (row: T, index: number) => string | number;
  fetcher: (args: RemoteFetchArgs) => Promise<RemoteFetchResult<T>>;
  initialPage?: number;
  initialPageSize?: number;
  initialSort?: DataTableSortStatus;
  search?: string;
  className?: string;
  minHeight?: number;
  recordsPerPageOptions?: number[];
  onDataLoaded?: (result: RemoteFetchResult<T>) => void;
  renderExpand?: (args: RowExpandArgs<T>) => React.ReactNode;
  expandTransitionMs?: number;
};

export default function DataTableRemote<T extends BaseRecord>({
  columns,
  getRowId,
  fetcher,
  initialPage = 1,
  initialPageSize = 10,
  initialSort,
  search,
  className,
  minHeight = 300,
  recordsPerPageOptions = [10, 20, 30, 50, 100],
  onDataLoaded,
  renderExpand,
  expandTransitionMs = 150,
}: DataTableRemoteProps<T>) {
  const [records, setRecords] = useState<T[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus>(
    initialSort ?? { columnAccessor: "id", direction: "asc" }
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetcher({ page, pageSize, sort: sortStatus, search });
        if (cancelled) return;
        setRecords(res.records);
        setTotalRecords(res.totalRecords);
        onDataLoaded?.(res);
      } catch (e) {
        console.error("DataTableRemote fetch error", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, sortStatus?.columnAccessor, sortStatus?.direction, search, fetcher, onDataLoaded]);

  // If getRowId is provided, clone records and add __rowId to each one
  const tableRecords = useMemo(() => {
    if (!getRowId) return records;
    return records.map((r, i) => ({ ...(r as object), __rowId: getRowId(r, i) })) as unknown as T[];
  }, [records, getRowId]);

  // Mantine expects a string path for the accessor
  const idAccessor: string | undefined = getRowId ? "__rowId" : undefined;

  const rowExpansion: DataTableRowExpansionProps<T> | undefined = renderExpand
    ? {
        content: ({ record, recordIndex, collapse }) =>
          renderExpand({ record, recordIndex, collapse }),
        collapseProps: { transitionDuration: expandTransitionMs },
      }
    : undefined;

  return (
    <div className="datatables">
      <DataTable
        className={className ?? "table-hover whitespace-nowrap"}
        fetching={loading}
        records={tableRecords}
        columns={columns}
        totalRecords={totalRecords}
        recordsPerPage={pageSize}
        page={page}
        onPageChange={setPage}
        recordsPerPageOptions={recordsPerPageOptions}
        onRecordsPerPageChange={(size) => {
          setPage(1);
          setPageSize(size);
        }}
        sortStatus={sortStatus}
        onSortStatusChange={setSortStatus}
        minHeight={minHeight}
        rowExpansion={rowExpansion}
        idAccessor={idAccessor} // ✅ string path, not a function
        paginationText={({ from, to, totalRecords }) =>
          `Showing ${from} to ${to} of ${totalRecords} entries`
        }
      />
    </div>
  );
}
