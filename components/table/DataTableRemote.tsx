"use client";

import { useEffect, useMemo, useState } from "react";
import { DataTable, DataTableColumn, DataTableSortStatus } from "mantine-datatable";

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

export type DataTableRemoteProps<T extends BaseRecord> = {
  columns: DataTableColumn<T>[];
  /** Required for stable keys if a record has no `id` */
  getRowId?: (row: T, index: number) => string | number;
  fetcher: (args: RemoteFetchArgs) => Promise<RemoteFetchResult<T>>;
  /** initial states */
  initialPage?: number;
  initialPageSize?: number;
  initialSort?: DataTableSortStatus;
  /** search bound from outside if you want to control it globally */
  search?: string;
  /** table chrome */
  className?: string;
  minHeight?: number;
  recordsPerPageOptions?: number[];
  /** Called whenever data is loaded */
  onDataLoaded?: (result: RemoteFetchResult<T>) => void;
};

export default function DataTableRemote<T extends BaseRecord>(props: DataTableRemoteProps<T>) {
  const {
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
  } = props;

  const [records, setRecords] = useState<T[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus>(
    initialSort ?? { columnAccessor: "id", direction: "asc" }
  );
  const [loading, setLoading] = useState(false);

  // re-fetch when deps change
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
  }, [page, pageSize, sortStatus?.columnAccessor, sortStatus?.direction, search]);

  // stable row key
  const rowIdAccessor = useMemo(() => {
    if (getRowId) return getRowId;
    return (row: T, index: number) => (row.id ?? row._id ?? row.key ?? index);
  }, [getRowId]);

  return (
    <div className="datatables">
      <DataTable
        className={className ?? "table-hover whitespace-nowrap"}
        fetching={loading}
        records={records}
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
        rowExpansion={{
          collapseProps: { transitionDuration: 150 },
        }}
        rowIdAccessor={rowIdAccessor as any}
        paginationText={({ from, to, totalRecords }) => `Showing ${from} to ${to} of ${totalRecords} entries`}
      />
    </div>
  );
}
