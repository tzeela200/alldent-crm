import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ClipboardList, Columns3, Download, LayoutGrid, List, Plus, RefreshCw } from 'lucide-react'
import {
  Shell,
  Toolbar,
  ActionButton,
  KPICard,
} from '@/components/layout/Shell'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  useApplicationRows,
  useApplicationKPIs,
  fetchAllApplicationRows,
  APPLICATIONS_PAGE_SIZE,
  INTERVIEW_STAGE_STATUSES,
} from '@/hooks/useApplications'
import { useApplicationMutations } from '@/hooks/useApplicationMutations'
import { useApplicationDicts, getDictLabel } from '@/hooks/useApplicationDicts'
import { formatDate } from '@/lib/timeAgo'
import { applicationHasCv } from '@/lib/cv'
import { ApplicationFiltersBar } from '@/components/applications/ApplicationFiltersBar'
import { ApplicationDetailPanel } from '@/components/applications/ApplicationDetailPanel'
import { ManualCreateDialog } from '@/components/applications/ManualCreateDialog'
import { ApplicationsTable } from '@/components/applications/ApplicationsTable'
import { ApplicationsGrid } from '@/components/applications/ApplicationsGrid'
import { ALL_COLUMNS, DEFAULT_VISIBLE, type ColumnKey } from '@/components/applications/applicationColumns'
import { toast } from 'sonner'
import type { ApplicationFilters } from '@/types/applications'

type ViewMode = 'table' | 'grid'

// ─── Persisted view state ─────────────────────────────────────────────

const VIEW_STORAGE_KEY = 'alldent:applications:view'

interface PersistedView {
  filters?: ApplicationFilters
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  visibleColumns?: ColumnKey[]
  viewMode?: ViewMode
}

function loadPersistedView(): PersistedView {
  try {
    return JSON.parse(localStorage.getItem(VIEW_STORAGE_KEY) ?? '{}') as PersistedView
  } catch {
    return {}
  }
}

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
  const [filters, setFilters] = useState<ApplicationFilters>(
    () => loadPersistedView().filters ?? {}
  )
  const [page, setPage] = useState(0)
  const [viewMode, setViewMode] = useState<ViewMode>(
    () => loadPersistedView().viewMode ?? 'table'
  )
  const [sortBy, setSortBy] = useState(() => loadPersistedView().sortBy ?? 'submission_date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(
    () => loadPersistedView().sortDir ?? 'desc'
  )
  const handleSort = (key: string) => {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortBy(key); setSortDir('asc') }
  }
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [detailAppId, setDetailAppId] = useState<number | null>(null)

  // Deep link from Contact 360: /admin/applications?application=<id> opens the
  // existing detail panel. Read once, then drop the param so closing the panel
  // does not immediately reopen it. No new route is introduced.
  const [searchParams, setSearchParams] = useSearchParams()
  useEffect(() => {
    const requested = Number(searchParams.get('application'))
    if (!Number.isFinite(requested) || requested <= 0) return
    setDetailAppId(requested)
    const next = new URLSearchParams(searchParams)
    next.delete('application')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])
  const [showCreate, setShowCreate] = useState(false)
  const [bulkStatus, setBulkStatus] = useState<number | ''>('')
  const [bulkCheck, setBulkCheck] = useState<number | ''>('')
  const [bulkFollowUp, setBulkFollowUp] = useState('')
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(
    () => loadPersistedView().visibleColumns ?? DEFAULT_VISIBLE
  )
  const [exporting, setExporting] = useState(false)

  // Persist the user's working view (filters / sort / columns / layout).
  useEffect(() => {
    try {
      localStorage.setItem(
        VIEW_STORAGE_KEY,
        JSON.stringify({ filters, sortBy, sortDir, visibleColumns, viewMode })
      )
    } catch {
      /* storage full or unavailable — non-fatal */
    }
  }, [filters, sortBy, sortDir, visibleColumns, viewMode])

  const { data, isLoading, error } = useApplicationRows(filters, page, sortBy, sortDir)
  const { data: kpis } = useApplicationKPIs()
  const { data: dicts, error: dictsError } = useApplicationDicts()
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
  const hasActiveFilter = Object.keys(filters).length > 0

  const allPageSelected =
    rows.length > 0 && rows.every((r) => selectedIds.includes(r.application_id))
  const somePageSelected =
    rows.length > 0 && rows.some((r) => selectedIds.includes(r.application_id))
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

  const exportCsv = async (onlySelected = false) => {
    setExporting(true)
    try {
      // "Export all" pulls the whole filtered result set, not just this page.
      const source = onlySelected
        ? rows.filter((r) => selectedIds.includes(r.application_id))
        : await fetchAllApplicationRows(filters, sortBy, sortDir)
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
      toast.success(`הייצוא הושלם — ${source.length.toLocaleString()} רשומות`)
    } catch (err) {
      toast.error(`ייצוא נכשל: ${err instanceof Error ? err.message : 'שגיאה לא ידועה'}`)
    } finally {
      setExporting(false)
    }
  }

  const runBulkStatus = async () => {
    if (!selectedIds.length || bulkStatus === '') {
      toast.error('יש לבחור רשומות וסטטוס')
      return
    }
    const updated = await bulkUpdateStatus.mutateAsync({
      applicationIds: selectedIds,
      status: Number(bulkStatus),
    })
    toast.success(`${updated} הגשות עודכנו`)
    setSelectedIds([])
    setBulkStatus('')
  }

  const runBulkCheck = async () => {
    if (!selectedIds.length || bulkCheck === '') {
      toast.error('יש לבחור רשומות וסטטוס בדיקה')
      return
    }
    const updated = await bulkUpdateCheckStatus.mutateAsync({
      applicationIds: selectedIds,
      checkStatus: Number(bulkCheck),
    })
    toast.success(`${updated} הגשות עודכנו`)
    setSelectedIds([])
    setBulkCheck('')
  }

  const runBulkFollowUp = async () => {
    if (!selectedIds.length || !bulkFollowUp) {
      toast.error('יש לבחור רשומות ותאריך')
      return
    }
    const updated = await bulkSetFollowUp.mutateAsync({
      applicationIds: selectedIds,
      date: bulkFollowUp,
    })
    toast.success(`פעולה הבאה נקבעה ל-${updated} הגשות`)
    setSelectedIds([])
    setBulkFollowUp('')
  }

  const bulkActionsBar = (
    <>
      <select
        dir="rtl"
        value={bulkStatus}
        onChange={(e) => setBulkStatus(e.target.value ? Number(e.target.value) : '')}
        className="h-8 rounded-[8px] border border-[#99D6D6] bg-white px-2 text-[13px] outline-none"
      >
        <option value="">סטטוס הגשה…</option>
        {(dicts?.applicationStatuses ?? []).map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <button
        onClick={runBulkStatus}
        className="h-8 rounded-[8px] bg-[#008080] px-3 text-[13px] font-semibold text-white transition hover:bg-[#006D6D]"
      >
        עדכן
      </button>

      <span className="h-5 w-px bg-[#99D6D6]" />

      <select
        dir="rtl"
        value={bulkCheck}
        onChange={(e) => setBulkCheck(e.target.value ? Number(e.target.value) : '')}
        className="h-8 rounded-[8px] border border-[#99D6D6] bg-white px-2 text-[13px] outline-none"
      >
        <option value="">סטטוס בדיקה…</option>
        {(dicts?.checkStatuses ?? []).map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <button
        onClick={runBulkCheck}
        className="h-8 rounded-[8px] bg-[#008080] px-3 text-[13px] font-semibold text-white transition hover:bg-[#006D6D]"
      >
        עדכן
      </button>

      <span className="h-5 w-px bg-[#99D6D6]" />

      <input
        type="date"
        value={bulkFollowUp}
        onChange={(e) => setBulkFollowUp(e.target.value)}
        className="h-8 rounded-[8px] border border-[#99D6D6] bg-white px-2 text-[13px] outline-none"
      />
      <button
        onClick={runBulkFollowUp}
        className="h-8 rounded-[8px] bg-[#008080] px-3 text-[13px] font-semibold text-white transition hover:bg-[#006D6D]"
      >
        פעולה הבאה
      </button>

      <button
        onClick={() => exportCsv(true)}
        className="h-8 rounded-[8px] border border-[#99D6D6] bg-white px-3 text-[13px] font-semibold text-[#008080] transition hover:bg-[#E6F3F3]"
      >
        ייצוא נבחרים
      </button>

      <button
        onClick={() => setSelectedIds([])}
        className="mr-auto text-[13px] font-semibold text-[#008080] hover:underline"
      >
        נקה בחירה
      </button>
    </>
  )

  return (
    <Shell
      title="הגשות"
      subtitle={`${total.toLocaleString()} הגשות במאגר`}
      icon={ClipboardList}
      actions={
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex overflow-hidden rounded-[14px] border border-[#D9D9D9] bg-white">
            <button
              onClick={() => setViewMode('table')}
              aria-label="תצוגת טבלה"
              className={`flex h-11 w-11 items-center justify-center transition ${viewMode === 'table' ? 'bg-[#E6F3F3] text-[#008080]' : 'text-[#6B6B6B] hover:bg-[#F3F4F6]'}`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              aria-label="תצוגת כרטיסים"
              className={`flex h-11 w-11 items-center justify-center transition ${viewMode === 'grid' ? 'bg-[#E6F3F3] text-[#008080]' : 'text-[#6B6B6B] hover:bg-[#F3F4F6]'}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>

          {/* Column picker — shared dropdown, not a raw <details> */}
          {viewMode === 'table' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="inline-flex h-11 items-center gap-2 rounded-[14px] border border-[#D9D9D9] bg-white px-4 text-sm font-medium text-[#2D2D2D] transition hover:bg-[#F3F4F6]">
                  <Columns3 className="h-4 w-4" />
                  עמודות
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64">
                <DropdownMenuLabel>בחירת עמודות</DropdownMenuLabel>
                <div className="max-h-[320px] overflow-y-auto">
                  {ALL_COLUMNS.map((col) => (
                    <label
                      key={col.key}
                      className="flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-sm transition hover:bg-slate-100"
                    >
                      <span>{col.label}</span>
                      <input
                        type="checkbox"
                        checked={visibleColumns.includes(col.key)}
                        onChange={() => toggleColumn(col.key)}
                        className="h-4 w-4 rounded border-[#D9D9D9] accent-[#008080]"
                      />
                    </label>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

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
          <ActionButton
            variant="ghost"
            icon={Download}
            onClick={() => exportCsv(false)}
            disabled={exporting}
          >
            {exporting ? 'מייצא…' : 'ייצוא'}
          </ActionButton>
          <ActionButton variant="primary" icon={Plus} onClick={() => setShowCreate(true)}>
            הגשה ידנית
          </ActionButton>
        </div>
      }
    >
      {/* Dictionary load failure — labels would otherwise render as raw IDs */}
      {dictsError && (
        <div className="rounded-[18px] bg-[#FDF3E7] px-4 py-3 text-sm text-[#92400E] ring-1 ring-[#F6D5A8]">
          <span className="font-semibold">שגיאה בטעינת המילונים.</span>{' '}
          {dictsError instanceof Error ? dictsError.message : ''} — ייתכן שיוצגו מזהים
          מספריים במקום שמות.
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <KPICard label="סה״כ" value={kpis?.total ?? 0} hint="כל ההגשות" />
        <KPICard
          label="הגשות חדשות"
          value={kpis?.newApps ?? 0}
          hint="סטטוס חדש"
          onClick={() => { setFilters({ application_status: 1 }); setPage(0) }}
        />
        <KPICard
          label="ממתינות לטיפול"
          value={kpis?.waitingHandling ?? 0}
          hint="סטטוסים 1-2"
          onClick={() => { setFilters({ application_status_in: [1, 2] }); setPage(0) }}
        />
        <KPICard
          label="בראיונות"
          value={kpis?.advanced ?? 0}
          hint="שלבים 6-8"
          // Must select the same range the card counts, or the card shows a
          // number and the click lands on an empty list (INC-3116).
          onClick={() => { setFilters({ application_status_in: INTERVIEW_STAGE_STATUSES }); setPage(0) }}
        />
        <KPICard
          label="השמות"
          value={kpis?.hires ?? 0}
          hint="סטטוס 12"
          onClick={() => { setFilters({ application_status: 12 }); setPage(0) }}
        />
        <KPICard
          label='חסר קו"ח'
          value={kpis?.missingCv ?? 0}
          onClick={() => { setFilters({ cv_state: 'without' }); setPage(0) }}
        />
        <KPICard
          label="ממתין למשוב"
          value={kpis?.waitingEmployer ?? 0}
          hint="סטטוס 9"
          onClick={() => { setFilters({ application_status: 9 }); setPage(0) }}
        />
        <KPICard
          label="ארכיון"
          value={kpis?.archived ?? 0}
          hint="סטטוס 15"
          onClick={() => { setFilters({ application_status: 15 }); setPage(0) }}
        />
      </div>

      {/* Filters */}
      <ApplicationFiltersBar
        filters={filters}
        onChange={(f) => { setFilters(f); setPage(0) }}
        applicationStatuses={dicts?.applicationStatuses ?? []}
        checkStatuses={dicts?.checkStatuses ?? []}
        sources={dicts?.sources ?? []}
        roles={dicts?.roles ?? []}
        jobStatuses={dicts?.jobStatuses ?? []}
        workStatuses={dicts?.workStatuses ?? []}
        availabilities={dicts?.availabilities ?? []}
      />

      {/* Table / Grid */}
      {viewMode === 'table' ? (
        <ApplicationsTable
          rows={rows}
          total={total}
          page={page}
          pageSize={APPLICATIONS_PAGE_SIZE}
          onPageChange={(p) => { setPage(p); setSelectedIds([]) }}
          selectedIds={selectedIds}
          onToggleRow={toggleRow}
          onToggleAll={toggleAll}
          allSelected={allPageSelected}
          someSelected={somePageSelected}
          onRowClick={setDetailAppId}
          dicts={dicts}
          visibleColumns={visibleColumns}
          isLoading={isLoading}
          error={
            error
              ? `שגיאה בטעינת ההגשות: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'} — זו תקלת טעינה, אין להסיק שאין הגשות במערכת.`
              : undefined
          }
          hasActiveFilter={hasActiveFilter}
          bulkActions={bulkActionsBar}
          onCreateContact={(app) => createContactFromApplication.mutate(app)}
          onMarkSpam={(app) => markSpam.mutate(app)}
          onSendToLeads={(app) => sendToLeadsV2.mutate(app)}
          onArchive={(id) => archiveApplication.mutate(id)}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={handleSort}
        />
      ) : (
        <Toolbar>
          <ApplicationsGrid rows={rows} onRowClick={setDetailAppId} />
        </Toolbar>
      )}

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
