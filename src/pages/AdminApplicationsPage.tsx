import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ClipboardList, Download, LayoutGrid, List, Plus, RefreshCw } from 'lucide-react'
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
import { applicationStatusColors, checkStatusColors, getStatusBadge } from '@/lib/statusColors'
import { formatDate } from '@/lib/timeAgo'
import { whatsappLink } from '@/lib/normalizePhone'
import { ApplicationFiltersBar } from '@/components/applications/ApplicationFiltersBar'
import { ApplicationDetailPanel } from '@/components/applications/ApplicationDetailPanel'
import { ManualCreateDialog } from '@/components/applications/ManualCreateDialog'
import { toast } from 'sonner'
import type { ApplicationFilters, ApplicationRow } from '@/types/applications'

type ViewMode = 'table' | 'grid'

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  return [
    headers.map(esc).join(','),
    ...rows.map((r) => headers.map((h) => esc(r[h])).join(',')),
  ].join('\n')
}

export default function AdminApplicationsPage() {
  const qc = useQueryClient()
  const [filters, setFilters] = useState<ApplicationFilters>({})
  const [page, setPage] = useState(0)
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [detailAppId, setDetailAppId] = useState<number | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [bulkStatus, setBulkStatus] = useState<number | ''>('')
  const [bulkCheck, setBulkCheck] = useState<number | ''>('')
  const [bulkAssignTo, setBulkAssignTo] = useState('')
  const [bulkFollowUp, setBulkFollowUp] = useState('')

  const { data, isLoading } = useApplicationRows(filters, page)
  const { data: kpis } = useApplicationKPIs()
  const { data: dicts } = useApplicationDicts()
  const {
    bulkUpdateStatus,
    bulkUpdateCheckStatus,
    bulkAssign,
    bulkSetFollowUp,
    createContactFromApplication,
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

  const exportCsv = (onlySelected = false) => {
    const source = onlySelected ? rows.filter((r) => selectedIds.includes(r.application_id)) : rows
    const prepared = source.map((r) => ({
      'מזהה': r.application_id,
      'שם מועמד': r.candidate_name ?? '',
      'טלפון': r.candidate_phone ?? r.phone_norm ?? '',
      'אימייל': r.candidate_email ?? '',
      'קוד משרה': r.job_code ?? '',
      'מעסיק': r.account_name ?? '',
      'תפקיד': r.job_role ?? '',
      'אזור': r.job_region ?? '',
      'סטטוס הגשה': getDictLabel(dicts?.applicationStatuses, r.application_status),
      'סטטוס בדיקה': getDictLabel(dicts?.checkStatuses, r.check_status),
      'תאריך הגשה': formatDate(r.submission_date),
      'מוקצה ל': r.assigned_to ?? '',
      'מעקב': formatDate(r.follow_up_date),
      'עם קו"ח': r.cv_link ? 'כן' : 'לא',
      'ידני': r.is_manual ? 'כן' : 'לא',
      'מועמד חדש': r.is_new_candidate ? 'כן' : 'לא',
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

  const runBulkAssign = async () => {
    if (!selectedIds.length || !bulkAssignTo.trim()) {
      toast.error('יש לבחור רשומות ושם')
      return
    }
    await bulkAssign.mutateAsync({ applicationIds: selectedIds, assignedTo: bulkAssignTo.trim() })
    toast.success(`הוקצה "${bulkAssignTo}" ל-${selectedIds.length} הגשות`)
    setSelectedIds([])
    setBulkAssignTo('')
  }

  const runBulkFollowUp = async () => {
    if (!selectedIds.length || !bulkFollowUp) {
      toast.error('יש לבחור רשומות ותאריך')
      return
    }
    await bulkSetFollowUp.mutateAsync({ applicationIds: selectedIds, date: bulkFollowUp })
    toast.success(`נקבע מעקב ל-${selectedIds.length} הגשות`)
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
        <KpiCard label="סה״כ" value={kpis?.total ?? 0} hint="במאגר" />
        <KpiCard
          label="הגשות חדשות"
          value={kpis?.newApps ?? 0}
          hint="7 ימים"
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
            setFilters({ application_status: 2 })
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
          label="ממתין למשוב מעסיק"
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

          {/* Bulk assign */}
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={bulkAssignTo}
              onChange={(e) => setBulkAssignTo(e.target.value)}
              placeholder="הקצה ל..."
              className="h-8 w-32 rounded-lg border border-teal-300 bg-white px-2 text-xs outline-none"
            />
            <button
              onClick={runBulkAssign}
              className="h-8 rounded-lg bg-teal-600 px-3 text-xs font-medium text-white hover:bg-teal-700"
            >
              הקצה
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
              מעקב
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
            onCreateContact={(app) => createContactFromApplication.mutate(app)}
            onSendToLeads={(app) => sendToLeadsV2.mutate(app)}
            onArchive={(id) => archiveApplication.mutate(id)}
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

function ApplicationsTable({
  rows,
  selectedIds,
  allSelected,
  onToggleAll,
  onToggleRow,
  onRowClick,
  dicts,
  onCreateContact,
  onSendToLeads,
  onArchive,
}: {
  rows: ApplicationRow[]
  selectedIds: number[]
  allSelected: boolean
  onToggleAll: () => void
  onToggleRow: (id: number) => void
  onRowClick: (id: number) => void
  dicts: ReturnType<typeof useApplicationDicts>['data']
  onCreateContact: (app: ApplicationRow) => void
  onSendToLeads: (app: ApplicationRow) => void
  onArchive: (id: number) => void
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1400px] text-sm">
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
            <th className="px-3 py-3">שם</th>
            <th className="px-3 py-3">נייד</th>
            <th className="px-3 py-3">מצב פרופיל</th>
            <th className="px-3 py-3">קוד משרה</th>
            <th className="px-3 py-3">תפקיד</th>
            <th className="px-3 py-3">אזור</th>
            <th className="px-3 py-3">שם מעסיק</th>
            <th className="px-3 py-3">סטטוס הגשה</th>
            <th className="px-3 py-3">קו"ח</th>
            <th className="px-3 py-3">מקור</th>
            <th className="px-3 py-3">תאריך הגשה</th>
            <th className="px-3 py-3">הערות</th>
            <th className="px-3 py-3">פעולות</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F3F4F6]">
          {rows.map((row) => {
            const appBadge = getStatusBadge(applicationStatusColors, row.application_status)
            const checkBadge = getStatusBadge(checkStatusColors, row.check_status)
            const appLabel = getDictLabel(dicts?.applicationStatuses, row.application_status) || appBadge.label
            const sourceLabel = getDictLabel(dicts?.sources, row.source)
            const isSelected = selectedIds.includes(row.application_id)
            const isNewWithNoProfile = row.is_new_candidate && !row.candidate_link
            return (
              <tr
                key={row.application_id}
                className={`text-[13px] text-[#2D2D2D] transition-colors hover:bg-[#FAFAF7] ${isSelected ? 'bg-[#F0FDFC]' : ''}`}
              >
                <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleRow(row.application_id)}
                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                </td>
                {/* שם — contact name if linked, otherwise candidate_name */}
                <td
                  className="cursor-pointer px-3 py-3 font-medium text-slate-900 hover:text-teal-700"
                  onClick={() => onRowClick(row.application_id)}
                >
                  {row.candidate_name ?? '—'}
                </td>
                <td className="px-3 py-3 font-mono text-xs text-slate-600" dir="ltr">
                  {row.candidate_phone ?? '—'}
                </td>
                {/* מצב פרופיל */}
                <td className="px-3 py-3">
                  {row.is_new_candidate
                    ? <span className="rounded-[6px] bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">לא קיים פרופיל</span>
                    : <span className="rounded-[6px] bg-teal-50 px-2 py-0.5 text-[10px] text-teal-700">קיים פרופיל</span>
                  }
                </td>
                <td className="px-3 py-3 font-mono text-xs font-semibold text-slate-700">
                  {row.job_code ?? '—'}
                </td>
                <td className="px-3 py-3 text-xs text-slate-600">{row.job_role ?? '—'}</td>
                <td className="px-3 py-3 text-xs text-slate-500">{row.job_region ?? '—'}</td>
                <td className="px-3 py-3 text-xs text-slate-600">{row.account_name ?? '—'}</td>
                <td className="px-3 py-3">
                  <span className={`rounded-[6px] px-2 py-0.5 text-xs font-medium ${appBadge.bg} ${appBadge.text}`}>
                    {appLabel}
                  </span>
                </td>
                {/* קו"ח */}
                <td className="px-3 py-3">
                  {row.has_cv && row.cv_link ? (
                    <a
                      href={row.cv_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                    >
                      צפייה / הורדה ↗
                    </a>
                  ) : (
                    <span className="text-xs text-slate-300">אין קו"ח</span>
                  )}
                </td>
                {/* מקור */}
                <td className="px-3 py-3 text-xs text-slate-500">{sourceLabel || '—'}</td>
                <td className="px-3 py-3 text-xs text-slate-400">
                  {formatDate(row.submission_date)}
                </td>
                <td className="max-w-[120px] truncate px-3 py-3 text-xs text-slate-400">
                  {row.internal_notes ?? '—'}
                </td>
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
                    {/* פעולות למועמד ללא פרופיל */}
                    {isNewWithNoProfile && (
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => onCreateContact(row)}
                          className="text-[10px] font-medium text-blue-600 hover:text-blue-800 text-right whitespace-nowrap"
                        >
                          הקם פרופיל
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
            {row.cv_link && (
              <div className="mt-2">
                <a
                  href={row.cv_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-blue-600 hover:underline"
                >
                  קו"ח ↗
                </a>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
