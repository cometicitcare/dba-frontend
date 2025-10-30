'use client';

import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import { useEffect, useState, Fragment } from 'react';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import sortBy from 'lodash/sortBy';
import IconPencil from '@/components/icon/icon-pencil';
import IconTrashLines from '@/components/icon/icon-trash-lines';
import { _manageBhikku } from '@/services/bhikku';
import { _manageVihara } from '@/services/vihara';

import { useRouter } from 'next/navigation';
import { Dialog, Transition, DialogPanel, TransitionChild } from '@headlessui/react';

const ComponentsDatatablesMultipleTables = () => {
  const [recordsData, setRecordsData] = useState<any[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);

  // pagination as page numbers
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
    columnAccessor: 'br_regn',
    direction: 'asc',
  });

  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRegn, setSelectedRegn] = useState<string | null>(null);
  const router = useRouter();

  // ✅ Fetch Bhikku Data with backend pagination by page number
  const fetchData = async () => {
    try {
      setLoading(true);

      const body = {
        action: 'READ_ALL',
        payload: {
          // send page-based pagination
          page,                 // 1-based page index
          limit: pageSize,      // page size
          search_key: search || '',
          // optionally let backend sort so we only get current page rows
          sort_by: sortStatus.columnAccessor,
          sort_dir: sortStatus.direction, // 'asc' | 'desc'
        },
      };

      const result = await _manageBhikku(body);

      // robust parsing for different API shapes
      const bhikkuData = result?.data?.data || result?.data?.rows || [];
      const cleaned = bhikkuData.map(
        ({ br_id, br_is_deleted, br_version_number, br_upasampada_serial_no, ...rest }: any) => rest
      );

      // if backend already sorted, skip client sort;
      // otherwise keep client-side sort for safety
      const maybeSorted = sortBy(cleaned, sortStatus.columnAccessor);
      const finalData = sortStatus.direction === 'desc' ? maybeSorted.reverse() : maybeSorted;

      setRecordsData(finalData);
      setTotalRecords(
        result?.data?.totalRecords ??
        result?.data?.total ??
        result?.data?.count ??
        0
      );
    } catch (err) {
      console.error('Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Delete confirmation handler
  const handleDeleteData = async () => {
    if (!selectedRegn) return;
    try {
      setLoading(true);
      const body = {
        action: 'DELETE',
        payload: { br_regn: selectedRegn },
      };
      await _manageBhikku(body);
      // refetch current page (if page becomes empty after delete, you can adjust page - 1 here)
      fetchData();
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
        <h5 className="text-lg font-semibold dark:text-white-light">Bhikku List</h5>
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
            onClick={() => router.push('/bhikku/add')}
          >
            Add Bhikku
          </button>
        </div>
      </div>

      {/* ✅ Data Table */}
      <div className="datatables">
        <DataTable
          className="table-hover whitespace-nowrap"
          fetching={loading}
          records={recordsData}
          columns={[
            { accessor: 'br_regn', title: 'Reg. No', sortable: true },
            { accessor: 'br_gihiname', title: 'Name', sortable: true },
            { accessor: 'br_fathrname', title: 'Father Name' },
            { accessor: 'br_mobile', title: 'Mobile' },
            { accessor: 'br_email', title: 'Email' },
            { accessor: 'br_mahananame', title: 'Mahanayaka' },
            { accessor: 'br_remarks', title: 'Remarks' },
            { accessor: 'br_cat', title: 'Category' },
            { accessor: 'br_currstat', title: 'Status' },
            {
              accessor: 'action',
              title: 'Action',
              titleClassName: '!text-center',
              render: (record) => (
                <div className="mx-auto flex w-max items-center gap-2">
                  {/* ✅ EDIT BUTTON REDIRECT */}
                  <Tippy content="Edit">
                    <button
                      type="button"
                      className="text-primary hover:text-blue-600"
                      onClick={() => router.push(`/bhikku/edit/${record.br_regn}`)}
                    >
                      <IconPencil />
                    </button>
                  </Tippy>

                  <Tippy content="Delete">
                    <button
                      type="button"
                      className="text-danger hover:text-red-600"
                      onClick={() => {
                        setSelectedRegn(record.br_regn);
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
                      Are you sure you want to delete this Bhikku record (
                      <strong>{selectedRegn}</strong>)? This action cannot be undone.
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

export default ComponentsDatatablesMultipleTables;
