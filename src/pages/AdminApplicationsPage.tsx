import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronUp, ChevronsUpDown, ClipboardList, Columns3, Download, LayoutGrid, List, Plus, RefreshCw } from 'lucide-react'
import { RoleBadge } from '@/components/admin/RoleBadge'
import {
  Shell,
  Toolbar,
  ActionButton,
  Pagination,
  EmptyState,
} from '@/components/layout/Shell'
import {
  useApplicationRows,
  useApplicationKPIs,
  APPLICATIONS_PAGE_SIZE,
} from '@/hooks/useApplications'
import { useApplicationMutations } from '@/hooks/useApplicationMutations'
import { useApplicationDicts, getDictLabel } from '@/hooks/useApplicationDicts'
import { applicationStatusColors, checkStatusColors, jobStatusColors, getStatusBadge } from '@/lib/statusColors'
import { formatDate } from '@/lib/timeAgo'
import { whatsappLink } from '@/lib/normalizePhone'
import { openApplicationCv, applicationHasCv } from '@/lib/cv'
import { ApplicationFiltersBar } from '@/components/applications/ApplicationFiltersBar'
import { ApplicationDetailPanel } from '@/components/applications/ApplicationDetailPanel'
import { ManualCreateDialog } from '@/components/applications/ManualCreateDialog'
import { toast } from 'sonner'
import type { ApplicationFilters, ApplicationRow } from '@/types/applications'

type ViewMode = 'table' | 'grid'

// ─── Column definitions ───────────────────────────────────────────────

const ALL_COLUMNS = [
  { key: 'registry_status', label: 'מצב במאגר' },
  { key: 'work_status', label: 'סטטוס תעסוקה' },
  { key: 'availability', label: 'זמינות' },
  { key: 'job_role', label: 'תפקיד משרה' },
  { key: 'job_city', label: 'עיר משרה' },
  { key: 'job_region', label: 'אזור משרה' },
  { key: 'org_name', label: 'שם ארגון' },
  { key: 'job_status', label: 'סטטוס משרה' },
  { key: 'check_status', label: 'סטטוס בדיקה' },
  { key: 'cv', label: 'קו"ח' },
  { key: 'source', label: 'מקור' },
  { key: 'submission_date', label: 'תאריך הגשה' },
  { key: 'follow_up_date', label: 'תאריך פעולה הבאה' },
  { key: 'notes', label: 'הערות' },
] as const

type ColumnKey = (typeof ALL_COLUMNS)[number]['key']

const DEFAULT_VISIBLE: ColumnKey[] = [
  'registry_status',
  'job_role',
  'job_region',
  'org_name',
  'check_status',
  'cv',
  'source',
  'submission_date',
  'notes',
]

// ─── CSV helper ───────────────────────────────────────────────────────

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  return [
    headers.map(esc).join(','),
    ...rows.map((r) => headers.map((h) => esc(r[h])).join(',')),
  ].join('\n')
}

// ─── Page ────────────────────────────────────────────────────────────

export default function AdminApplicationsPage() {
  const qc = useQueryClient()
  const [filters, setFilters] = useState<ApplicationFilters>({})
  const [page, setPage] = useState(0)
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [sortBy, setSortBy] = useState('submission_date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const handleSort = (key: string) => {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortBy(key); setSortDir('asc') }
  }
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [detailAppId, setDetailAppId] = useState<number | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [bulkStatus, setBulkStatus] = useState<number | ''>('')
  const [bulkCheck, setBulkCheck] = useState<number | ''>('')
  const [bulkFollowUp, setBulkFollowUp] = useState('')
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(DEFAULT_VISIBLE)

  const { data, isLoading } = useApplicationRows(filters, page, sortBy, sortDir)
  const { data: kpis } = useApplicationKPIs()
  const { data: dicts } = useApplicationDicts()
  const {
    bulkUpdateStatus,
    bulkUpdateCheckStatus,
    bulkSetFollowUp,
    createContactFromApplication,
    markSpam,
    sendToLeadsV2,
    archiveApplication,
  } = useApplicationMutations()

  const rows = data?.rows ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / APPLICATIONS_PAGE_SIZE))

  const allPageSelected =
    rows.length > 0 && rows.every((r) => selectedIds.includes(r.application_id))
  const toggleAll = () => {
    if (allPageSelected)
      setSelectedIds((prev) =>
        prev.filter((id) => !rows.find((r) => r.application_id === id))
      )
    else
      setSelectedIds((prev) => [
        ...new Set([...prev, ...rows.map((r) => r.application_id)]),
      ])
  }
  const toggleRow = (id: number) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )

  const toggleColumn = (key: ColumnKey) =>
    setVisibleColumns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )

  const exportCsv = (onlySelected = false) => {
    const source = onlySelected ? rows.filter((r) => selectedIds.includes(r.application_id)) : rows
    const prepared = source.map((r) => ({
      'מזהה הגשה': r.application_id,
      'שם מועמד': r.candidate_name ?? '',
      'נייד מועמד': r.candidate_phone ?? r.phone_norm ?? '',
      'אימייל מועמד': r.candidate_email ?? '',
      'מצב במאגר': r.candidate_link && !r.is_new_candidate ? 'קיים במאגר' : 'חדש למאגר',
      'סטטוס תעסוקה': getDictLabel(dicts?.workStatuses, r.contact_work_status),
      'זמינות': getDictLabel(dicts?.availabilities, r.contact_availability),
      'קוד משרה': r.job_code ?? '',
      'תפקיד משרה': r.job_role ?? '',
      'עיר משרה': r.job_city ?? '',
      'אזור משרה': r.job_region ?? '',
      'שם ארגון': r.account_name ?? '',
      'סטטוס משרה': getDictLabel(dicts?.jobStatuses, r.job_status),
      'סטטוס הגשה': getDictLabel(dicts?.applicationStatuses, r.application_status),
      'סטטוס בדיקה': getDictLabel(dicts?.checkStatuses, r.check_status),
      'מקור': getDictLabel(dicts?.sources, r.source),
      'תאריך הגשה': formatDate(r.submission_date),
      'תאריך פעולה הבאה': formatDate(r.follow_up_date),
      'עם קו"ח': applicationHasCv(r) ? 'כן' : 'לא',
      'ידני': r.is_manual ? 'כן' : 'לא',
      'הערות פנימיות': r.internal_notes ?? '',
    }))
    const csv = toCsv(prepared)
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'applications.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('הייצוא הושלם')
  }

  const runBulkStatus = async () => {
    if (!selectedIds.length || bulkStatus === '') {
      toast.error('יש לבחור רשומות וסטטוס')
      return
    }
    await bulkUpdateStatus.mutateAsync({ applicationIds: selectedIds, status: Number(bulkStatus) })
    toast.success(`${selectedIds.length} הגשות עודכנו`)
    setSelectedIds([])
    setBulkStatus('')
  }

  const runBulkCheck = async () => {
    if (!selectedIds.length || bulkCheck === '') {
      toast.error('יש לבחור רשומות וסטטוס בדיקה')
      return
    }
    await bulkUpdateCheckStatus.mutateAsync({
      applicationIds: selectedIds,
      checkStatus: Number(bulkCheck),
    })
    toast.success(`${selectedIds.length} הגשות עודכנו`)
    setSelectedIds([])
    setBulkCheck('')
  }

  const runBulkFollowUp = async () => {
    if (!selectedIds.length || !bulkFollowUp) {
      toast.error('יש לבחור רשומות ותאריך')
      return
    }
    await bulkSetFollowUp.mutateAsync({ applicationIds: selectedIds, date: bulkFollowUp })
    toast.success(`פעולה הבאה נקבעה ל-${selectedIds.length} הגשות`)
    setSelectedIds([])
    setBulkFollowUp('')
  }

  return (
    <Shell
      title="הגשות"
      subtitle={`${total.toLocaleString()} הגשות במאגר`}
      icon={ClipboardList}
      actions={
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <button
              onClick={() => setViewMode('table')}
              className={`flex h-10 w-10 items-center justify-center ${viewMode === 'table' ? 'bg-teal-50 text-teal-600' : 'text-slate-400'}`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex h-10 w-10 items-center justify-center ${viewMode === 'grid' ? 'bg-amber-50 text-amber-600' : 'text-slate-400'}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
          <ActionButton
            variant="ghost"
            icon={RefreshCw}
            onClick={() => {
              qc.invalidateQueries({ queryKey: ['applications'] })
              qc.invalidateQueries({ queryKey: ['applications-kpis'] })
            }}
          >
            רענון
          </ActionButton>
          <ActionButton variant="ghost" icon={Download} onClick={() => exportCsv(false)}>
            ייצוא
          </ActionButton>
          <ActionButton variant="primary" icon={Plus} onClick={() => setShowCreate(true)}>
            הגשה ידנית
          </ActionButton>
        </div>
      }
    >
      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <KpiCard label="סה״כ" value={kpis?.total ?? 0} hint="כל ההגשות" />
        <KpiCard
          label="הגשות חדשות"
          value={kpis?.newApps ?? 0}
          hint="סטטוס חדש"
          onClick={() => {
            setFilters({ application_status: 1 })
            setPage(0)
          }}
        />
        <KpiCard
          label="ממתינות לטיפול"
          value={kpis?.waitingHandling ?? 0}
          hint="סטטוסים 1-2"
          onClick={() => {
            setFilters({ active_apps_only: true })
            setPage(0)
          }}
        />
        <KpiCard
          label="בראיונות"
          value={kpis?.advanced ?? 0}
          hint="שלבים 6-8"
          onClick={() => {
            setFilters({ application_status: 7 })
            setPage(0)
          }}
        />
        <KpiCard
          label="השמות"
          value={kpis?.hires ?? 0}
          hint="סטטוס 12"
          onClick={() => {
            setFilters({ application_status: 12 })
            setPage(0)
          }}
        />
        <KpiCard
          label='חסר קו"ח'
          value={kpis?.missingCv ?? 0}
          onClick={() => {
            setFilters({ cv_state: 'without' })
            setPage(0)
          }}
        />
        <KpiCard
          label="ממתין למשוב"
          value={kpis?.waitingEmployer ?? 0}
          hint="סטטוס 9"
          onClick={() => {
            setFilters({ application_status: 9 })
            setPage(0)
          }}
        />
        <KpiCard
          label="ארכיון"
          value={kpis?.archived ?? 0}
          hint="סטטוס 13"
          onClick={() => {
            setFilters({ application_status: 13 })
            setPage(0)
          }}
        />
      </div>

      {/* Filters */}
      <ApplicationFiltersBar
        filters={filters}
        onChange={(f) => {
          setFilters(f)
          setPage(0)
        }}
        applicationStatuses={dicts?.applicationStatuses ?? []}
        checkStatuses={dicts?.checkStatuses ?? []}
        sources={dicts?.sources ?? []}
        regions={dicts?.regions ?? []}
        roles={dicts?.roles ?? []}
        cities={dicts?.cities ?? []}
        jobStatuses={dicts?.jobStatuses ?? []}
        workStatuses={dicts?.workStatuses ?? []}
        availabilities={dicts?.availabilities ?? []}
      />

      {/* Bulk actions bar */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-teal-50 p-3 ring-1 ring-teal-200">
          <span className="text-sm font-semibold text-teal-800">{selectedIds.length} נבחרו</span>
          <span className="mx-1 h-5 w-px bg-teal-200" />

          {/* Bulk status */}
          <div className="flex items-center gap-1">
            <select
              dir="rtl"
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value ? Number(e.target.value) : '')}
              className="h-8 rounded-lg border border-teal-300 bg-white px-2 text-xs outline-none"
            >
              <option value="">סטטוס הגשה...</option>
              {(dicts?.applicationStatuses ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button
              onClick={runBulkStatus}
              className="h-8 rounded-lg bg-teal-600 px-3 text-xs font-medium text-white hover:bg-teal-700"
            >
              עדכן
            </button>
          </div>

          {/* Bulk check */}
          <div className="flex items-center gap-1">
            <select
              dir="rtl"
              value={bulkCheck}
              onChange={(e) => setBulkCheck(e.target.value ? Number(e.target.value) : '')}
              className="h-8 rounded-lg border border-teal-300 bg-white px-2 text-xs outline-none"
            >
              <option value="">סטטוס בדיקה...</option>
              {(dicts?.checkStatuses ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button
              onClick={runBulkCheck}
              className="h-8 rounded-lg bg-teal-600 px-3 text-xs font-medium text-white hover:bg-teal-700"
            >
              עדכן
            </button>
          </div>

          {/* Bulk follow-up */}
          <div className="flex items-center gap-1">
            <input
              type="date"
              value={bulkFollowUp}
              onChange={(e) => setBulkFollowUp(e.target.value)}
              className="h-8 rounded-lg border border-teal-300 bg-white px-2 text-xs outline-none"
            />
            <button
              onClick={runBulkFollowUp}
              className="h-8 rounded-lg bg-teal-600 px-3 text-xs font-medium text-white hover:bg-teal-700"
            >
              פעולה הבאה
            </button>
          </div>

          {/* Export selected */}
          <button
            onClick={() => exportCsv(true)}
            className="h-8 rounded-lg border border-teal-300 bg-white px-3 text-xs font-medium text-teal-700 hover:bg-teal-50"
          >
            ייצוא נבחרים
          </button>

          <div className="mr-auto">
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs font-medium text-teal-600 hover:text-teal-800"
            >
              נקה בחירה
            </button>
          </div>
        </div>
      )}

      {/* Table / Grid */}
      <Toolbar>
        {/* Column picker — shown above table */}
        {viewMode === 'table' && (
          <div className="mb-2 flex justify-end">
            <details className="relative">
              <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50">
                <Columns3 className="h-4 w-4" />
                עמודות
              </summary>
              <div className="absolute end-0 top-full z-30 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-md">
                <div className="mb-3 text-[13px] font-bold text-slate-900">בחירת עמודות</div>
                <div className="grid gap-2">
                  {ALL_COLUMNS.map((col) => (
                    <label
                      key={col.key}
                      className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-[13px] cursor-pointer hover:bg-slate-50"
                    >
                      <span>{col.label}</span>
                      <input
                        type="checkbox"
                        checked={visibleColumns.includes(col.key)}
                        onChange={() => toggleColumn(col.key)}
                        className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </details>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-teal-600" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={Object.keys(filters).length === 0 ? 'אין עדיין הגשות' : 'אין הגשות התואמות את הסינון'}
            description={
              Object.keys(filters).length === 0
                ? 'ברגע שמועמדים יגישו מועמדות מהאתר הציבורי, ההגשות יופיעו כאן.'
                : 'נסו לשנות את הסינון'
            }
          />
        ) : viewMode === 'table' ? (
          <ApplicationsTable
            rows={rows}
            selectedIds={selectedIds}
            allSelected={allPageSelected}
            onToggleAll={toggleAll}
            onToggleRow={toggleRow}
            onRowClick={setDetailAppId}
            dicts={dicts}
            visibleColumns={visibleColumns}
            onCreateContact={(app) => createContactFromApplication.mutate(app)}
            onMarkSpam={(app) => markSpam.mutate(app)}
            onSendToLeads={(app) => sendToLeadsV2.mutate(app)}
            onArchive={(id) => archiveApplication.mutate(id)}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={handleSort}
          />
        ) : (
          <ApplicationsGrid rows={rows} onRowClick={setDetailAppId} dicts={dicts} />
        )}
      </Toolbar>

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={(p) => {
          setPage(p)
          setSelectedIds([])
        }}
        totalItems={total}
      />

      {/* Panels */}
      {detailAppId != null && (
        <ApplicationDetailPanel
          applicationId={detailAppId}
          onClose={() => setDetailAppId(null)}
        />
      )}
      {showCreate && (
        <ManualCreateDialog
          onClose={() => setShowCreate(false)}
          onCreated={(id) => {
            setShowCreate(false)
            setDetailAppId(id)
          }}
        />
      )}
    </Shell>
  )
}

// ─── KPI Card ────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  hint,
  onClick,
}: {
  label: string
  value: number
  hint?: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border border-slate-200 bg-white p-4 text-right shadow-sm transition hover:shadow-md ${
        onClick ? 'cursor-pointer' : 'cursor-default'
      }`}
    >
      <p className="text-2xl font-bold text-slate-900">{value.toLocaleString()}</p>
      <p className="mt-0.5 text-xs font-semibold text-slate-700">{label}</p>
      {hint && <p className="mt-0.5 text-[10px] text-slate-400">{hint}</p>}
    </button>
  )
}

// ─── Table View ───────────────────────────────────────────────────────

function getRoleBorderColor(roleId: number | null | undefined): string {
  if (!roleId) return 'border-slate-100'
  if (roleId >= 1 && roleId <= 8) return 'border-blue-300'
  if (roleId === 9)  return 'border-violet-400'
  if (roleId === 10) return 'border-pink-400'
  if (roleId === 11) return 'border-amber-400'
  if (roleId === 12) return 'border-indigo-400'
  if (roleId === 13) return 'border-green-400'
  if (roleId === 14) return 'border-teal-400'
  if (roleId === 15 || roleId === 17 || roleId === 18) return 'border-sky-400'
  if (roleId === 16) return 'border-rose-400'
  return 'border-slate-100'
}

function ApplicationsTable({
  rows,
  selectedIds,
  allSelected,
  onToggleAll,
  onToggleRow,
  onRowClick,
  dicts,
  visibleColumns,
  onCreateContact,
  onMarkSpam,
  onSendToLeads,
  onArchive,
  sortBy,
  sortDir,
  onSort,
}: {
  rows: ApplicationRow[]
  selectedIds: number[]
  allSelected: boolean
  onToggleAll: () => void
  onToggleRow: (id: number) => void
  onRowClick: (id: number) => void
  dicts: ReturnType<typeof useApplicationDicts>['data']
  visibleColumns: ColumnKey[]
  onCreateContact: (app: ApplicationRow) => void
  onMarkSpam: (app: ApplicationRow) => void
  onSendToLeads: (app: ApplicationRow) => void
  onArchive: (id: number) => void
  sortBy: string
  sortDir: 'asc' | 'desc'
  onSort: (key: string) => void
}) {
  const col = (key: ColumnKey) => visibleColumns.includes(key)

  function SortableTh({ label, field }: { label: string; field: string }) {
    const active = sortBy === field
    return (
      <th
        onClick={() => onSort(field)}
        className="cursor-pointer select-none px-3 py-3 hover:bg-slate-100"
      >
        <span className="flex items-center gap-1">
          {label}
          {active ? (
            sortDir === 'asc' ? (
              <ChevronUp className="h-3 w-3 text-teal-600" />
            ) : (
              <ChevronDown className="h-3 w-3 text-teal-600" />
            )
          ) : (
            <ChevronsUpDown className="h-3 w-3 text-slate-300" />
          )}
        </span>
      </th>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="bg-[#F9FAFB]">
          <tr className="border-b border-[#D9D9D9] text-right text-[12px] font-semibold text-[#6B6B6B]">
            <th className="w-10 px-3 py-3">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleAll}
                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
            </th>
            <SortableTh label="שם מועמד" field="candidate_name" />
            <th className="px-3 py-3">נייד מועמד</th>
            {col('registry_status') && <th className="px-3 py-3">מצב במאגר</th>}
            {col('work_status') && <th className="px-3 py-3">סטטוס תעסוקה</th>}
            {col('availability') && <th className="px-3 py-3">זמינות</th>}
            <SortableTh label="קוד משרה" field="job_code" />
            {col('job_role') && <th className="px-3 py-3">תפקיד משרה</th>}
            {col('job_city') && <th className="px-3 py-3">עיר משרה</th>}
            {col('job_region') && <th className="px-3 py-3">אזור משרה</th>}
            {col('org_name') && <SortableTh label="שם ארגון" field="account_name" />}
            {col('job_status') && <th className="px-3 py-3">סטטוס משרה</th>}
            <th className="px-3 py-3">סטטוס הגשה</th>
            {col('check_status') && <th className="px-3 py-3">סטטוס בדיקה</th>}
            {col('cv') && <th className="px-3 py-3">קו"ח</th>}
            {col('source') && <th className="px-3 py-3">מקור</th>}
            {col('submission_date') && <SortableTh label="תאריך הגשה" field="submission_date" />}
            {col('follow_up_date') && <SortableTh label="פעולה הבאה" field="follow_up_date" />}
            {col('notes') && <th className="px-3 py-3">הערות</th>}
            <th className="px-3 py-3">פעולות</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F3F4F6]">
          {rows.map((row) => {
            const appBadge = getStatusBadge(applicationStatusColors, row.application_status)
            const checkBadge = getStatusBadge(checkStatusColors, row.check_status)
            const jobBadge = getStatusBadge(jobStatusColors, row.job_status)
            const appLabel = getDictLabel(dicts?.applicationStatuses, row.application_status) || appBadge.label
            const checkLabel = getDictLabel(dicts?.checkStatuses, row.check_status) || checkBadge.label
            const sourceLabel = getDictLabel(dicts?.sources, row.source)
            const workStatusLabel = getDictLabel(dicts?.workStatuses, row.contact_work_status)
            const availabilityLabel = getDictLabel(dicts?.availabilities, row.contact_availability)
            const isSelected = selectedIds.includes(row.application_id)
            const isNewToRegistry = row.is_new_candidate || !row.candidate_link
            const roleBorderColor = getRoleBorderColor(row.job_role_id)
            return (
              <tr
                key={row.application_id}
                className={`border-s-4 ${roleBorderColor} text-[13px] text-[#2D2D2D] transition-colors hover:bg-[#FAFAF7] ${isSelected ? 'bg-[#F0FDFC]' : ''}`}
              >
                <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleRow(row.application_id)}
                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                </td>
                {/* שם מועמד */}
                <td
                  className="cursor-pointer px-3 py-3 font-medium text-slate-900 hover:text-teal-700"
                  onClick={() => onRowClick(row.application_id)}
                >
                  {row.candidate_name ?? '—'}
                </td>
                {/* נייד מועמד */}
                <td className="px-3 py-3 font-mono text-xs text-slate-600" dir="ltr">
                  {row.candidate_phone ?? '—'}
                </td>
                {/* מצב במאגר */}
                {col('registry_status') && (
                  <td className="px-3 py-3">
                    {isNewToRegistry
                      ? <span className="rounded-[6px] bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700">חדש למאגר</span>
                      : <span className="rounded-[6px] bg-teal-50 px-2 py-0.5 text-[10px] text-teal-700">קיים במאגר</span>
                    }
                  </td>
                )}
                {/* סטטוס תעסוקה */}
                {col('work_status') && (
                  <td className="px-3 py-3 text-xs text-slate-600">
                    {row.candidate_link ? workStatusLabel : '—'}
                  </td>
                )}
                {/* זמינות */}
                {col('availability') && (
                  <td className="px-3 py-3 text-xs text-slate-600">
                    {row.candidate_link ? availabilityLabel : '—'}
                  </td>
                )}
                {/* קוד משרה */}
                <td className="px-3 py-3 font-mono text-xs font-semibold text-slate-700">
                  {row.job_code ?? '—'}
                </td>
                {/* תפקיד משרה */}
                {col('job_role') && (
                  <td className="px-3 py-3">
                    {row.job_role
                      ? <RoleBadge roleId={row.job_role_id} label={row.job_role} />
                      : <span className="text-xs text-slate-300">—</span>
                    }
                  </td>
                )}
                {/* עיר משרה */}
                {col('job_city') && (
                  <td className="px-3 py-3 text-xs text-slate-500">{row.job_city ?? '—'}</td>
                )}
                {/* אזור משרה */}
                {col('job_region') && (
                  <td className="px-3 py-3 text-xs text-slate-500">{row.job_region ?? '—'}</td>
                )}
                {/* שם ארגון */}
                {col('org_name') && (
                  <td className="px-3 py-3 text-xs text-slate-600">{row.account_name ?? '—'}</td>
                )}
                {/* סטטוס משרה */}
                {col('job_status') && (
                  <td className="px-3 py-3">
                    {row.job_status != null ? (
                      <span className={`rounded-[6px] px-2 py-0.5 text-xs font-medium ${jobBadge.bg} ${jobBadge.text}`}>
                        {jobBadge.label}
                      </span>
                    ) : '—'}
                  </td>
                )}
                {/* סטטוס הגשה */}
                <td className="px-3 py-3">
                  <span className={`rounded-[6px] px-2 py-0.5 text-xs font-medium ${appBadge.bg} ${appBadge.text}`}>
                    {appLabel}
                  </span>
                </td>
                {/* סטטוס בדיקה */}
                {col('check_status') && (
                  <td className="px-3 py-3">
                    {row.check_status != null ? (
                      <span className={`rounded-[6px] px-2 py-0.5 text-xs font-medium ${checkBadge.bg} ${checkBadge.text}`}>
                        {checkLabel}
                      </span>
                    ) : '—'}
                  </td>
                )}
                {/* קו"ח */}
                {col('cv') && (
                  <td className="px-3 py-3">
                    {applicationHasCv(row) ? (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openApplicationCv(row) }}
                        className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                      >
                        צפייה ↗
                      </button>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                )}
                {/* מקור */}
                {col('source') && (
                  <td className="px-3 py-3 text-xs text-slate-500">{sourceLabel || '—'}</td>
                )}
                {/* תאריך הגשה */}
                {col('submission_date') && (
                  <td className="px-3 py-3 text-xs text-slate-400">
                    {formatDate(row.submission_date)}
                  </td>
                )}
                {/* תאריך פעולה הבאה */}
                {col('follow_up_date') && (
                  <td className="px-3 py-3 text-xs text-slate-400">
                    {row.follow_up_date ? formatDate(row.follow_up_date) : '—'}
                  </td>
                )}
                {/* הערות */}
                {col('notes') && (
                  <td className="max-w-[120px] truncate px-3 py-3 text-xs text-slate-400">
                    {row.internal_notes ?? '—'}
                  </td>
                )}
                {/* פעולות */}
                <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      {row.candidate_phone && (
                        <a
                          href={whatsappLink(row.candidate_phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-800"
                          title="WhatsApp"
                        >
                          💬
                        </a>
                      )}
                      <button
                        onClick={() => onRowClick(row.application_id)}
                        className="text-xs font-medium text-teal-600 hover:text-teal-800 whitespace-nowrap"
                      >
                        פרטים
                      </button>
                    </div>
                    {isNewToRegistry && (
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => onCreateContact(row)}
                          className="text-[10px] font-medium text-teal-600 hover:text-teal-800 text-right whitespace-nowrap"
                        >
                          מאושר למאגר
                        </button>
                        <button
                          onClick={() => onMarkSpam(row)}
                          className="text-[10px] font-medium text-red-600 hover:text-red-800 text-right whitespace-nowrap"
                        >
                          ספאם
                        </button>
                        <button
                          onClick={() => onSendToLeads(row)}
                          className="text-[10px] font-medium text-amber-600 hover:text-amber-800 text-right whitespace-nowrap"
                        >
                          שלח ללידים
                        </button>
                        <button
                          onClick={() => onArchive(row.application_id)}
                          className="text-[10px] font-medium text-slate-400 hover:text-slate-600 text-right whitespace-nowrap"
                        >
                          ארכיון
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Grid View ────────────────────────────────────────────────────────

function ApplicationsGrid({
  rows,
  onRowClick,
  dicts,
}: {
  rows: ApplicationRow[]
  onRowClick: (id: number) => void
  dicts: ReturnType<typeof useApplicationDicts>['data']
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((row) => {
        const appBadge = getStatusBadge(applicationStatusColors, row.application_status)
        const appLabel = getDictLabel(dicts?.applicationStatuses, row.application_status) || appBadge.label
        return (
          <div
            key={row.application_id}
            onClick={() => onRowClick(row.application_id)}
            className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-900">{row.candidate_name ?? '—'}</p>
                <p className="text-xs text-slate-500" dir="ltr">
                  {row.candidate_phone ?? ''}
                </p>
              </div>
              <span
                className={`rounded-[6px] px-2 py-0.5 text-xs font-medium ${appBadge.bg} ${appBadge.text}`}
              >
                {appLabel}
              </span>
            </div>
            <div className="mt-2 space-y-1">
              <p className="text-xs text-slate-600">
                <span className="font-mono font-semibold">{row.job_code}</span>
                {row.account_name && ` · ${row.account_name}`}
              </p>
              <p className="text-xs text-slate-500">
                {row.job_role ?? ''}
                {row.job_region ? ` · ${row.job_region}` : ''}
              </p>
              <p className="text-xs text-slate-400">{formatDate(row.submission_date)}</p>
            </div>
            {applicationHasCv(row) && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); openApplicationCv(row) }}
                  className="text-xs text-blue-600 hover:underline"
                >
                  קו"ח ↗
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
