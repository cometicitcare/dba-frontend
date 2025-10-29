'use client';

import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import { useEffect, useState, Fragment } from 'react';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import sortBy from 'lodash/sortBy';
import IconPencil from '@/components/icon/icon-pencil';
import IconTrashLines from '@/components/icon/icon-trash-lines';
import { _manageVihara } from '@/services/vihara';
import { useRouter } from 'next/navigation';
import { Dialog, Transition, DialogPanel, TransitionChild } from '@headlessui/react';

function formatDate(val?: string | null) {
  if (!val) return '—';
  // Try to display YYYY-MM-DD if ISO timestamp, else pass through
  const onlyDate = /^\d{4}-\d{2}-\d{2}$/.test(val);
  if (onlyDate) return val;
  const d = new Date(val);
  return isNaN(d.getTime()) ? val : d.toISOString().slice(0, 10);
}

const ViharaList = () => {
  const [recordsData, setRecordsData] = useState<any[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);

  // pagination as page numbers
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
    columnAccessor: 'vh_trn',
    direction: 'asc',
  });

  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const router = useRouter();

  // ✅ Fetch Vihara Data (matches your API and response)
  const fetchData = async () => {
    try {
      setLoading(true);

      const body = {
        action: 'READ_ALL',
        payload: {
          skip: (page - 1) * pageSize,
          limit: pageSize,
          page,
          search_key: search || '',
        },
      };

      const result = await _manageVihara(body);

      // Response shape you provided:
      // { status, message, data: [...], totalRecords, page, limit }
      const rows = result?.data?.data ?? [];
      const cleaned = rows.map((r: any) => ({
        ...r,
        vh_bgndate: formatDate(r.vh_bgndate),
        vh_syojakarmdate: formatDate(r.vh_syojakarmdate),
        vh_pralesigdate: formatDate(r.vh_pralesigdate),
        vh_bacgrcmdate: formatDate(r.vh_bacgrcmdate),
        vh_minissecrsigdate: formatDate(r.vh_minissecrsigdate),
        vh_ssbmsigdate: formatDate(r.vh_ssbmsigdate),
        vh_created_at: formatDate(r.vh_created_at),
        vh_updated_at: formatDate(r.vh_updated_at),
      }));

      // Client-side sort fallback
      const maybeSorted = sortBy(cleaned, sortStatus.columnAccessor as string);
      const finalData = sortStatus.direction === 'desc' ? maybeSorted.reverse() : maybeSorted;

      setRecordsData(finalData);
      setTotalRecords(result?.data?.totalRecords ?? 0);
    } catch (err) {
      console.error('Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Delete (uses vh_id)
  const handleDeleteData = async () => {
    if (selectedId == null) return;
    try {
      setLoading(true);
      const body = {
        action: 'DELETE',
        payload: { vh_id: selectedId },
      };
      await _manageVihara(body);

      // Optional: if last item on page was deleted, step back a page
      // if (recordsData.length === 1 && page > 1) setPage(p => p - 1);

      await fetchData();
      setModalOpen(false);
    } catch (err) {
      console.error('Delete Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, sortStatus, search]);

  return (
    <div className="panel mt-6">
      {/* Header with Search and Add Button */}
      <div className="mb-5 flex flex-col gap-5 md:flex-row md:items-center">
        <h5 className="text-lg font-semibold dark:text-white-light">Vihara List</h5>
        <div className="flex items-center gap-3 ltr:ml-auto rtl:mr-auto">
          <input
            type="text"
            className="form-input w-auto"
            placeholder="Search..."
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => router.push('/vihara/add')}
          >
            Add Vihara
          </button>
        </div>
      </div>

      {/* ✅ Data Table (columns reflect your response fields) */}
      <div className="datatables">
        <DataTable
          className="table-hover whitespace-nowrap"
          fetching={loading}
          records={recordsData}
          columns={[
            { accessor: 'vh_trn', title: 'TRN', sortable: true },
            { accessor: 'vh_vname', title: 'Vihara Name', sortable: true },
            { accessor: 'vh_addrs', title: 'Address' },
            { accessor: 'vh_mobile', title: 'Mobile' },
            { accessor: 'vh_whtapp', title: 'WhatsApp' },
            { accessor: 'vh_email', title: 'Email' },
            { accessor: 'vh_typ', title: 'Type' },
            { accessor: 'vh_gndiv', title: 'GN Div.' },
            { accessor: 'vh_fmlycnt', title: 'Families' },
            { accessor: 'vh_bgndate', title: 'Begin Date' },
            { accessor: 'vh_ownercd', title: 'Owner Code' },
            { accessor: 'vh_parshawa', title: 'Parshawa' },
            { accessor: 'vh_ssbmcode', title: 'SSBM Code' },
            { accessor: 'vh_syojakarmakrs', title: 'Syoja Karma Krs' },
            { accessor: 'vh_syojakarmdate', title: 'Syoja Karma Date' },
            { accessor: 'vh_landownrship', title: 'Land Ownership' },
            { accessor: 'vh_pralename', title: 'Prale Name' },
            { accessor: 'vh_pralesigdate', title: 'Prale Sig. Date' },
            { accessor: 'vh_bacgrecmn', title: 'Background Recmn' },
            { accessor: 'vh_bacgrcmdate', title: 'Background Rcm Date' },
            { accessor: 'vh_minissecrsigdate', title: 'Ministry Sec. Sig. Date' },
            { accessor: 'vh_minissecrmrks', title: 'Ministry Sec. Remarks' },
            { accessor: 'vh_ssbmsigdate', title: 'SSBM Sig. Date' },
            { accessor: 'vh_created_at', title: 'Created At' },
            { accessor: 'vh_updated_at', title: 'Updated At' },
            { accessor: 'vh_created_by', title: 'Created By' },
            { accessor: 'vh_updated_by', title: 'Updated By' },
            { accessor: 'vh_version_number', title: 'Version' },
            { accessor: 'vh_id', title: 'ID', sortable: true },
            {
              accessor: 'action',
              title: 'Action',
              titleClassName: '!text-center',
              render: (record: any) => (
                <div className="mx-auto flex w-max items-center gap-2">
                  <Tippy content="Edit">
                    <button
                      type="button"
                      className="text-primary hover:text-blue-600"
                      onClick={() => router.push(`/vihara/edit/${record.vh_id}`)}
                    >
                      <IconPencil />
                    </button>
                  </Tippy>

                  <Tippy content="Delete">
                    <button
                      type="button"
                      className="text-danger hover:text-red-600"
                      onClick={() => {
                        setSelectedId(record.vh_id);
                        setModalOpen(true);
                      }}
                    >
                      <IconTrashLines />
                    </button>
                  </Tippy>
                </div>
              ),
            },
          ]}
          totalRecords={totalRecords}
          recordsPerPage={pageSize}
          page={page}
          onPageChange={setPage}
          recordsPerPageOptions={[10, 20, 30, 50, 100]}
          onRecordsPerPageChange={(size) => {
            setPage(1);
            setPageSize(size);
          }}
          sortStatus={sortStatus}
          onSortStatusChange={setSortStatus}
          minHeight={300}
          paginationText={({ from, to, totalRecords }) =>
            `Showing ${from} to ${to} of ${totalRecords} entries`
          }
        />
      </div>

      {/* ✅ Delete Confirmation Modal */}
      <Transition appear show={modalOpen} as={Fragment}>
        <Dialog as="div" open={modalOpen} onClose={() => setModalOpen(false)}>
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-[black]/60 z-[999]" />
          </TransitionChild>

          <div className="fixed inset-0 z-[1000] overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <DialogPanel className="panel border-0 p-0 rounded-lg overflow-hidden w-full max-w-md my-8 text-black dark:text-white-dark">
                  <div className="flex bg-[#fbfbfb] dark:bg-[#121c2c] items-center justify-between px-5 py-3">
                    <h5 className="font-bold text-lg">Confirm Deletion</h5>
                    <button
                      type="button"
                      className="text-white-dark hover:text-dark"
                      onClick={() => setModalOpen(false)}
                    >
                      ✖
                    </button>
                  </div>
                  <div className="p-5">
                    <p>
                      Are you sure you want to delete this Vihara record (
                      <strong>{selectedId ?? ''}</strong>)? This action cannot be undone.
                    </p>
                    <div className="flex justify-end items-center mt-8">
                      <button
                        type="button"
                        className="btn btn-outline-danger"
                        onClick={() => setModalOpen(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary ltr:ml-4 rtl:mr-4"
                        onClick={handleDeleteData}
                      >
                        Confirm Delete
                      </button>
                    </div>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};

export default ViharaList;
