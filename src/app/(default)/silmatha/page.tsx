'use client'

import { FooterBar } from '@/components/FooterBar'
import { Sidebar } from '@/components/Sidebar'
import { TopBar } from '@/components/TopBar'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getStoredUserData } from '@/utils/userData'
import { SILMATHA_MANAGEMENT_DEPARTMENT } from '@/utils/config'
import { PlusIcon, EditIcon, Trash2Icon } from 'lucide-react'
import { _manageSilmatha } from '@/services/bhikku'
import selectionsData from '@/utils/selectionsData.json'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material'

type ProvinceEntry = {
  cp_code: string
  cp_name: string
  districts?: DistrictEntry[]
}

type DistrictEntry = {
  dd_dcode: string
  dd_dname: string
}

type WorkflowStatusOption = {
  code: string
  label: string
}

type StatusOption = {
  st_statcd: string
  st_descr: string
}

type SelectionData = {
  provinces?: ProvinceEntry[]
  statuses?: StatusOption[]
  workflowStatuses?: WorkflowStatusOption[]
}

const selectionData = selectionsData as SelectionData

const PROVINCES = selectionData.provinces ?? []
const STATUS_OPTIONS = selectionData.statuses ?? []
const DEFAULT_WORKFLOW_STATUS_OPTIONS: WorkflowStatusOption[] = [
  { code: 'PENDING', label: 'Pending' },
  { code: 'PRINTED', label: 'Printed' },
  { code: 'PEND-APPROVAL', label: 'Pend Approval' },
  { code: 'REJECTED', label: 'Rejected' },
  { code: 'COMPLETED', label: 'Completed' },
]
const WORKFLOW_STATUS_OPTIONS = selectionData.workflowStatuses?.length
  ? selectionData.workflowStatuses
  : DEFAULT_WORKFLOW_STATUS_OPTIONS

const WORKFLOW_STATUS_LABEL_MAP = new Map<string, string>(
  WORKFLOW_STATUS_OPTIONS.map((status) => [status.code, status.label])
)

type FilterState = {
  searchKey: string
  province: string
  district: string
  workflowStatus: string
  status: string
  dateFrom: string
  dateTo: string
  page: number
  limit: number
}

type SilmathaRecord = {
  sil_regn?: string | null
  sil_gihiname?: string | null
  sil_mahananame?: string | null
  sil_reqstdate?: string | null
  sil_workflow_status?: string | null
  sil_currstat?: {
    st_code?: string | null
    st_descr?: string | null
    st_description?: string | null
  } | null
  sil_province?: {
    pr_code?: string | null
    pr_name?: string | null
  } | null
  sil_district?: {
    ds_code?: string | null
    ds_name?: string | null
  } | null
  sil_division?: {
    dv_code?: string | null
    dv_name?: string | null
  } | null
}

type SilmathaRow = {
  regn: string
  name: string
  mahananame: string
  requestDate: string
  workflowStatus: string
  currentStatus: string
  province: string
  district: string
  division: string
}

const DEFAULT_FILTERS: FilterState = {
  searchKey: '',
  province: '',
  district: '',
  workflowStatus: '',
  status: '',
  dateFrom: '',
  dateTo: '',
  page: 1,
  limit: 5,
}

const ROWS_PER_PAGE_OPTIONS = [5, 10, 25, 50]

export default function Page() {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [accessChecked, setAccessChecked] = useState(false)
  const [accessDenied, setAccessDenied] = useState(false)

  useEffect(() => {
    const stored = getStoredUserData()
    if (!stored || stored.department !== SILMATHA_MANAGEMENT_DEPARTMENT) {
      setAccessDenied(true)
      router.replace('/')
      return
    }

    setAccessChecked(true)
  }, [router])

  if (accessDenied) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm font-medium text-red-600">
          You do not have access to this section.
        </p>
      </div>
    )
  }

  if (!accessChecked) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Checking access...</p>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <TopBar onMenuClick={() => setSidebarOpen((v) => !v)} />
      <Sidebar isOpen={sidebarOpen} />
      <div className={`transition-all duration-300 pt-16 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <main className="p-6">
          <SilmathaDashboard />
        </main>
        <FooterBar />
      </div>
    </div>
  )
}

function SilmathaDashboard() {
  const router = useRouter()
  const [operationLoading, setOperationLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<SilmathaRow | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [inputFilters, setInputFilters] = useState<FilterState>({ ...DEFAULT_FILTERS })
  const [appliedFilters, setAppliedFilters] = useState<FilterState>({ ...DEFAULT_FILTERS })
  const [records, setRecords] = useState<SilmathaRow[]>([])
  const [totalRecords, setTotalRecords] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterPanelOpen, setFilterPanelOpen] = useState(false)
  const filterButtonRef = useRef<HTMLButtonElement | null>(null)
  const filterPanelRef = useRef<HTMLDivElement | null>(null)

  const districtOptions = useMemo(() => {
    if (!inputFilters.province) return []
    const province = PROVINCES.find((p) => p.cp_code === inputFilters.province)
    return province?.districts ?? []
  }, [inputFilters.province])

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await _manageSilmatha({
        action: 'READ_ALL',
        payload: buildFilterPayload(appliedFilters),
      })
      const payload = response?.data ?? {}
      const rawRecords = pickSilmathaRecords(payload)
      setRecords(rawRecords.map(normalizeRecord))
      setTotalRecords(parseTotalRecords(payload, rawRecords.length))
    } catch (err: any) {
      console.error('Silmatha list fetch error:', err)
      setError(err?.message ?? 'Unable to load Silmatha records.')
      setRecords([])
      setTotalRecords(0)
    } finally {
      setLoading(false)
    }
  }, [appliedFilters])

  const handleEdit = useCallback(
    (row: SilmathaRow) => {
      const encodedRegn = encodeURIComponent(row.regn)
      router.push(`/silmatha/manage/${encodedRegn}`)
    },
    [router]
  )

  const closeDeleteDialog = useCallback(() => {
    setDeleteDialogOpen(false)
    setDeleteTarget(null)
  }, [])

  const performDelete = useCallback(
    async (row: SilmathaRow) => {
      setOperationLoading(true)
      try {
        await _manageSilmatha({
          action: 'DELETE',
          payload: { sil_regn: row.regn },
        })
        await fetchRecords()
      } catch (err: any) {
        console.error('Silmatha delete error:', err)
        setError(err?.message ?? 'Unable to delete record.')
      } finally {
        setOperationLoading(false)
        closeDeleteDialog()
      }
    },
    [fetchRecords, closeDeleteDialog]
  )

  const handleDeleteConfirm = useCallback(() => {
    if (deleteTarget) {
      performDelete(deleteTarget)
    }
  }, [deleteTarget, performDelete])

  const handleDeleteClick = useCallback((row: SilmathaRow) => {
    setDeleteTarget(row)
    setDeleteDialogOpen(true)
  }, [])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  useEffect(() => {
    if (!filterPanelOpen) return undefined

    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        filterPanelRef.current &&
        !filterPanelRef.current.contains(target) &&
        filterButtonRef.current &&
        !filterButtonRef.current.contains(target)
      ) {
        setFilterPanelOpen(false)
      }
    }

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFilterPanelOpen(false)
    }

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [filterPanelOpen])

  const handleApplyFilters = () => {
    const next = { ...inputFilters, page: 1 }
    setInputFilters(next)
    setAppliedFilters(next)
  }

  const handleClearFilters = () => {
    const reset = { ...DEFAULT_FILTERS }
    setInputFilters(reset)
    setAppliedFilters(reset)
  }

  const handleLimitChange = (limit: number) => {
    const next: FilterState = { ...appliedFilters, limit, page: 1 }
    setInputFilters((prev) => ({ ...prev, limit, page: 1 }))
    setAppliedFilters(next)
  }

  const goToPage = (page: number) => {
    if (page === appliedFilters.page) return
    setAppliedFilters((prev) => ({ ...prev, page }))
  }

  const startRecord = records.length === 0 ? 0 : (appliedFilters.page - 1) * appliedFilters.limit + 1
  const endRecord = records.length === 0 ? 0 : startRecord + records.length - 1
  const canGoPrev = appliedFilters.page > 1
  const canGoNext = appliedFilters.page * appliedFilters.limit < totalRecords

  return (
    <section className="space-y-6 border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Silmatha Records</h1>
        </div>
        <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => router.push('/silmatha/add')}
          className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
        >
          <PlusIcon className="h-4 w-4" />
          Add Silmatha
        </button>
        <button
          type="button"
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          onClick={() => setAppliedFilters((prev) => ({ ...prev }))}
          disabled={loading}
        >
          Refresh
        </button>
        <button
          ref={filterButtonRef}
          type="button"
          onClick={() => setFilterPanelOpen((prev) => !prev)}
          className={`rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold ${
            filterPanelOpen
              ? 'border-blue-500 bg-blue-50 text-blue-600'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Filters
        </button>
        </div>
      </div>

      <div className="relative flex flex-wrap gap-2">
        {filterPanelOpen && (
          <div
            ref={filterPanelRef}
            className="absolute right-0 z-30 mt-4  border border-slate-200 bg-white p-6 shadow-2xl"
            style={{ width: "min(90vw, 440px)" }}
            role="dialog"
            aria-label="Silmatha filters"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-lg font-semibold text-slate-800">Filters</p>
              <button
                type="button"
                onClick={() => setFilterPanelOpen(false)}
                className="rounded-full border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
                aria-label="Close filter panel"
              >
                &times;
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <label className="flex flex-col gap-1 text-sm text-gray-600">
                <span>Search</span>
                <input
                  type="search"
                  value={inputFilters.searchKey}
                  onChange={(e) =>
                    setInputFilters((prev) => ({ ...prev, searchKey: e.target.value }))
                  }
                  placeholder="Search by name, reg no."
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm text-gray-600">
                <span>Province</span>
                <select
                  value={inputFilters.province}
                  onChange={(e) =>
                    setInputFilters((prev) => ({
                      ...prev,
                      province: e.target.value,
                      district: '',
                    }))
                  }
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">All Provinces</option>
                  {PROVINCES.map((province) => (
                    <option key={province.cp_code} value={province.cp_code}>
                      {province.cp_name ?? province.cp_code}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm text-gray-600">
                <span>District</span>
                <select
                  value={inputFilters.district}
                  onChange={(e) =>
                    setInputFilters((prev) => ({ ...prev, district: e.target.value }))
                  }
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">All Districts</option>
                  {districtOptions.map((district) => (
                    <option key={district.dd_dcode} value={district.dd_dcode}>
                      {district.dd_dname ?? district.dd_dcode}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm text-gray-600">
                <span>Workflow Status</span>
                <select
                  value={inputFilters.workflowStatus}
                  onChange={(e) =>
                    setInputFilters((prev) => ({ ...prev, workflowStatus: e.target.value }))
                  }
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">All Workflow Statuses</option>
                  {WORKFLOW_STATUS_OPTIONS.map((status) => (
                    <option key={status.code} value={status.code}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm text-gray-600">
                <span>Current Status</span>
                <select
                  value={inputFilters.status}
                  onChange={(e) =>
                    setInputFilters((prev) => ({ ...prev, status: e.target.value }))
                  }
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">All Statuses</option>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status.st_statcd} value={status.st_statcd}>
                      {status.st_descr ?? status.st_statcd}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm text-gray-600">
                <span>Date From</span>
                <input
                  type="date"
                  value={inputFilters.dateFrom}
                  onChange={(e) =>
                    setInputFilters((prev) => ({ ...prev, dateFrom: e.target.value }))
                  }
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm text-gray-600">
                <span>Date To</span>
                <input
                  type="date"
                  value={inputFilters.dateTo}
                  onChange={(e) =>
                    setInputFilters((prev) => ({ ...prev, dateTo: e.target.value }))
                  }
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
              <button
                onClick={() => {
                  handleApplyFilters()
                  setFilterPanelOpen(false)
                }}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                Apply Filters
              </button>
              <button
                onClick={() => {
                  handleClearFilters()
                  setFilterPanelOpen(false)
                }}
                disabled={loading}
                className="px-3 py-2 rounded-lg border text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 inline-flex items-center gap-1"
              >
                Clear
              </button>
            </div>
          </div>
        )}
        
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="relative overflow-hidden  border border-gray-200 bg-white shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Reg. No</th>
                <th className="px-4 py-3">Mahananame</th>
                <th className="px-4 py-3">Workflow Status</th>
                <th className="px-4 py-3">Current Status</th>
                <th className="px-4 py-3">Province</th>
                <th className="px-4 py-3">District</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map((row) => (
              <tr key={row.regn} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-800">{row.regn}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{row.mahananame}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{row.workflowStatus}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{row.currentStatus}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{row.province}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{row.district}</td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(row)}
                      className="rounded-full border border-slate-300 p-2 text-slate-600 hover:border-blue-500 hover:text-blue-600"
                    >
                      <EditIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(row)}
                      disabled={operationLoading}
                      className="rounded-full border border-slate-300 p-2 text-slate-600 hover:border-rose-500 hover:text-rose-600 disabled:opacity-60"
                    >
                      <Trash2Icon className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm font-medium text-gray-500"
                  >
                    {loading ? 'Loading records...' : 'No records matched the current filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <p className="text-sm font-semibold text-gray-600">Loading Silmatha records...</p>
          </div>
        )}
      </div>

      <Dialog open={deleteDialogOpen} onClose={closeDeleteDialog} fullWidth>
        <DialogTitle>Delete Silmatha record</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {deleteTarget
              ? `Are you sure you want to delete ${deleteTarget.regn}? This action cannot be undone.`
              : 'Are you sure you want to delete this record?'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog} disabled={operationLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            disabled={operationLoading}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Showing {startRecord} to {endRecord} of {totalRecords} records
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Rows per page
            <select
              value={appliedFilters.limit}
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
              onClick={() => goToPage(appliedFilters.page - 1)}
              disabled={!canGoPrev || loading}
              className={`px-4 py-2 rounded-lg border text-sm font-medium ${
                !canGoPrev || loading
                  ? "text-slate-400 border-slate-200"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              Previous
            </button>
            <span className="text-sm font-semibold text-slate-700">Page {appliedFilters.page}</span>
            <button
              type="button"
              onClick={() => goToPage(appliedFilters.page + 1)}
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
    </section>
  )
}

function buildFilterPayload(filters: FilterState) {
  const skip = Math.max(0, (filters.page - 1) * filters.limit)
  const payload: Record<string, unknown> = {
    skip,
    limit: filters.limit,
    page: filters.page,
  }
  if (filters.searchKey.trim()) payload.search_key = filters.searchKey.trim()
  if (filters.province) payload.province = filters.province
  if (filters.district) payload.district = filters.district
  if (filters.workflowStatus) payload.workflow_status = filters.workflowStatus
  if (filters.status) payload.status = filters.status
  if (filters.dateFrom) payload.date_from = filters.dateFrom
  if (filters.dateTo) payload.date_to = filters.dateTo
  return payload
}

function pickSilmathaRecords(payload: unknown): SilmathaRecord[] {
  if (!payload) return []
  const body = payload as any
  if (Array.isArray(body.data)) return body.data
  if (Array.isArray(body.rows)) return body.rows
  if (Array.isArray(body?.data?.data)) return body.data.data
  if (Array.isArray(body?.data?.rows)) return body.data.rows
  return []
}

function normalizeRecord(record: SilmathaRecord): SilmathaRow {
  const workflowLabel =
    (record.sil_workflow_status && WORKFLOW_STATUS_LABEL_MAP.get(record.sil_workflow_status)) ??
    record.sil_workflow_status ??
    'N/A'
  const currentStatus =
    record.sil_currstat?.st_descr ??
    record.sil_currstat?.st_description ??
    record.sil_currstat?.st_code ??
    'N/A'

  return {
    regn: record.sil_regn ?? 'N/A',
    name: record.sil_gihiname ?? 'N/A',
    mahananame: record.sil_mahananame ?? 'N/A',
    requestDate: record.sil_reqstdate ?? 'N/A',
    workflowStatus: workflowLabel,
    currentStatus,
    province: record.sil_province?.pr_name ?? record.sil_province?.pr_code ?? 'N/A',
    district: record.sil_district?.ds_name ?? record.sil_district?.ds_code ?? 'N/A',
    division: record.sil_division?.dv_name ?? record.sil_division?.dv_code ?? 'N/A',
  }
}

function parseTotalRecords(payload: any, fallback: number) {
  const candidate =
    payload?.totalRecords ?? payload?.total_records ?? payload?.count ?? fallback
  const parsed = Number(candidate)
  return Number.isFinite(parsed) ? parsed : fallback
}
