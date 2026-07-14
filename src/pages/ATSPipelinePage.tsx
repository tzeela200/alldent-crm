import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Inbox,
  Loader2,
  MessageCircle,
  MoveRight,
  RefreshCw,
  UserRound,
  X,
} from 'lucide-react'
import {
  Shell,
  Toolbar,
  SearchBar,
  SelectFilter,
  ActionButton,
  EmptyState,
} from '@/components/layout/Shell'
import { useApplications, useJobs } from '@/hooks/useSupabaseData'
import { useApplicationDicts } from '@/hooks/useApplicationDicts'
import { openApplicationCv, applicationHasCv } from '@/lib/cv'
import { useApplicationMutations } from '@/hooks/useApplicationMutations'
import { formatDate, timeAgo } from '@/lib/timeAgo'
import { applicationStatusColors, checkStatusColors, getStatusBadge } from '@/lib/statusColors'


type PipelineFilters = {
  search?: string
  job_code?: string
  account_name?: string
  region?: string
  role?: string
  check_status?: number
  date_from?: string
  date_to?: string
  active_only?: boolean
  stale_only?: boolean
}


type ToastTone = 'success' | 'error' | 'info'


type ToastState = {
  open: boolean
  tone: ToastTone
  message: string
}


type PipelineCardRow = {
  application_id: number
  candidate_name?: string | null
  candidate_phone?: string | null
  candidate_email?: string | null
  candidate_link?: number | null
  job_code?: string | null
  job_role?: string | null
  job_region?: string | null
  job_region_id?: number | null
  job_city_id?: number | null
  master_region_id?: number | null
  master_city_id?: number | null
  account_name?: string | null
  application_status?: number | null
  submission_date?: string | null
  cv_link?: string | null
  cv_storage_path?: string | null
  has_cv?: boolean | null
  candidate_notes?: string | null
  internal_notes?: string | null
  check_status?: number | null
  updated_timestamp?: string | null
  created_timestamp?: string | null
  is_new_candidate?: boolean | null
  pending_employer_feedback?: boolean
}


type DetailSheetState = {
  open: boolean
  row: PipelineCardRow | null
}


type ColumnConfig = {
  key: string
  title: string
  statuses: number[]
  tone: 'default' | 'warning' | 'success' | 'danger'
}


const COLUMN_PAGE_SIZE = 8
const STALE_DAYS = 5


const COLUMN_CONFIGS: ColumnConfig[] = [
  { key: 'new', title: 'חדש', statuses: [1], tone: 'default' },
  { key: 'screening', title: 'סינון ראשוני', statuses: [2, 3], tone: 'warning' },
  { key: 'in_progress', title: 'בטיפול', statuses: [4], tone: 'default' },
  { key: 'sent_to_employer', title: 'הועבר למעסיק', statuses: [5, 6], tone: 'warning' },
  { key: 'interview', title: 'ראיון', statuses: [7, 8], tone: 'default' },
  { key: 'feedback', title: 'משוב', statuses: [9, 10], tone: 'warning' },
  { key: 'trial', title: 'חפיפה / ניסיון', statuses: [11], tone: 'default' },
  { key: 'closed', title: 'השמה / סגירה', statuses: [12, 13, 14, 15], tone: 'success' },
]


const ADJACENT_STATUS_POLICY: Record<number, number[]> = {
  1: [2],
  2: [1, 3],
  3: [2, 4],
  4: [3, 5],
  5: [4, 6],
  6: [5, 7],
  7: [6, 8],
  8: [7, 9],
  9: [8, 10],
  10: [9, 11],
  11: [10, 12],
  12: [11],
  13: [12],
  14: [12],
  15: [12],
}


export default function ATSPipelinePage() {
  const [filters, setFilters] = useState<PipelineFilters>({})
  const [detailSheet, setDetailSheet] = useState<DetailSheetState>({ open: false, row: null })
  const [localRows, setLocalRows] = useState<PipelineCardRow[]>([])
  const [toast, setToast] = useState<ToastState>({ open: false, tone: 'info', message: '' })
  const [loadingMoreByColumn, setLoadingMoreByColumn] = useState<Record<string, boolean>>({})
  const [columnPageByKey, setColumnPageByKey] = useState<Record<string, number>>(
    Object.fromEntries(COLUMN_CONFIGS.map((column) => [column.key, 1])),
  )
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null)
  const [updatingCheckStatusId, setUpdatingCheckStatusId] = useState<number | null>(null)


  const { data: applications = [], loading, error } = useApplications({})
  const { data: jobs = [] } = useJobs({})
  const { data: dicts } = useApplicationDicts()
  const { updateApplication } = useApplicationMutations()
  const queryClient = useQueryClient()


  const applicationStatuses = dicts?.applicationStatuses ?? []
  const checkStatuses = dicts?.checkStatuses ?? []
  const regions = dicts?.regions ?? []
  const roles = dicts?.roles ?? []

  // מיפוי משרה לפי קוד — מקור התפקיד/תת-תפקיד/אזור לכרטיס (applications מחזיק רק snapshot טקסטואלי)
  const jobsByCode = useMemo(() => {
    const map = new Map<string, any>()
    ;(jobs as any[]).forEach((job) => {
      if (job.job_code) map.set(String(job.job_code), job)
    })
    return map
  }, [jobs])

  const roleName = (id: number | null | undefined) =>
    roles.find((r: any) => Number(r.id) === Number(id))?.name ?? '—'


  useEffect(() => {
    setLocalRows(
      (applications as any[]).map((row) => ({
        ...row,
        pending_employer_feedback: [5, 6, 9].includes(Number(row.application_status ?? 0)),
      })),
    )
  }, [applications])


  useEffect(() => {
    if (!toast.open) return
    const timer = window.setTimeout(() => {
      setToast((prev) => ({ ...prev, open: false }))
    }, 2600)
    return () => window.clearTimeout(timer)
  }, [toast.open])


  const jobsOptions = useMemo(() => {
    return (jobs as any[])
      .filter((job) => Boolean(job.job_code))
      // צימוד ארגון→משרה: אם נבחר ארגון, להציג רק את משרותיו
      .filter(
        (job) =>
          !filters.account_name || String(job.account_name ?? '') === String(filters.account_name),
      )
      .slice()
      // מיון: משרות פעילות (job_status=3) קודם, ואז לפי קוד יורד (חדש→ישן)
      .sort((a, b) => {
        const aActive = Number(a.job_status) === 3 ? 1 : 0
        const bActive = Number(b.job_status) === 3 ? 1 : 0
        if (aActive !== bActive) return bActive - aActive
        return String(b.job_code).localeCompare(String(a.job_code), undefined, { numeric: true })
      })
      // תווית: קוד • תפקיד (בלי ארגון — פילטר הארגון כבר מצמצם)
      .map((job) => ({
        value: String(job.job_code),
        label: `${job.job_code} • ${roleName(job.job_role)}`,
      }))
  }, [jobs, filters.account_name, roles])


  const accountOptions = useMemo(() => {
    return Array.from(
      new Set(localRows.map((row) => String(row.account_name ?? '').trim()).filter(Boolean)),
    ).map((name) => ({ value: name, label: name }))
  }, [localRows])


  // אזור/תפקיד מהמילון החי (dict_regions / dict_roles) — לא מטקסט קפוא
  const regionOptions = useMemo(
    () => (regions as any[]).map((r: any) => ({ value: String(r.id), label: r.name })),
    [regions],
  )

  const roleOptions = useMemo(
    () => (roles as any[]).map((r: any) => ({ value: String(r.id), label: r.name })),
    [roles],
  )


  const filteredRows = useMemo(() => {
    return localRows.filter((row) => {
      const normalizedSearch = normalizeSearchText(filters.search ?? '')


      if (normalizedSearch) {
        const haystack = normalizeSearchText(
          [
            row.candidate_name,
            row.candidate_phone,
            row.candidate_email,
            row.job_code,
            row.account_name,
          ]
            .filter(Boolean)
            .join(' '),
        )
        const phoneDigits = normalizeDigits(filters.search ?? '')
        const rowDigits = normalizeDigits([row.candidate_phone].filter(Boolean).join(' '))


        const isMatch = haystack.includes(normalizedSearch) || (phoneDigits && rowDigits.includes(phoneDigits))
        if (!isMatch) return false
      }


      if (filters.job_code && String(row.job_code ?? '') !== String(filters.job_code)) return false
      if (filters.account_name && String(row.account_name ?? '') !== String(filters.account_name)) return false
      if (filters.region && Number(row.job_region_id) !== Number(filters.region)) return false
      if (filters.role) {
        const job = jobsByCode.get(String(row.job_code ?? ''))
        if (Number(job?.job_role) !== Number(filters.role)) return false
      }
      if (filters.check_status && Number(row.check_status) !== Number(filters.check_status)) return false
      if (filters.active_only && [12, 13, 14, 15].includes(Number(row.application_status ?? 0))) return false
      if (filters.stale_only && !isStale(row.updated_timestamp, STALE_DAYS)) return false
      if (filters.date_from && !isOnOrAfter(row.submission_date, filters.date_from)) return false
      if (filters.date_to && !isOnOrBefore(row.submission_date, filters.date_to)) return false


      return true
    })
  }, [localRows, filters, jobsByCode])


  const totalVisibleCards = filteredRows.length


  const rowsByColumn = useMemo(() => {
    const mapping: Record<string, PipelineCardRow[]> = Object.fromEntries(
      COLUMN_CONFIGS.map((column) => [column.key, [] as PipelineCardRow[]]),
    )


    filteredRows.forEach((row) => {
      const column = COLUMN_CONFIGS.find((item) =>
        item.statuses.includes(Number(row.application_status ?? 0)),
      )
      if (column) mapping[column.key].push(row)
    })


    Object.keys(mapping).forEach((key) => {
      mapping[key].sort((a, b) => {
        const aPriority =
          (isStale(a.updated_timestamp, STALE_DAYS) ? 20 : 0) +
          (!applicationHasCv(a) ? 10 : 0) +
          (a.pending_employer_feedback ? 8 : 0)
        const bPriority =
          (isStale(b.updated_timestamp, STALE_DAYS) ? 20 : 0) +
          (!applicationHasCv(b) ? 10 : 0) +
          (b.pending_employer_feedback ? 8 : 0)


        if (aPriority !== bPriority) return bPriority - aPriority
        return new Date(b.updated_timestamp ?? b.submission_date ?? 0).getTime() -
          new Date(a.updated_timestamp ?? a.submission_date ?? 0).getTime()
      })
    })


    return mapping
  }, [filteredRows])


  const showToast = (message: string, tone: ToastTone = 'info') => {
    setToast({ open: true, tone, message })
  }


  const resetFilters = () => {
    setFilters({})
  }


  const handleLoadMore = async (columnKey: string) => {
    setLoadingMoreByColumn((prev) => ({ ...prev, [columnKey]: true }))
    await delay(300)
    setColumnPageByKey((prev) => ({ ...prev, [columnKey]: (prev[columnKey] ?? 1) + 1 }))
    setLoadingMoreByColumn((prev) => ({ ...prev, [columnKey]: false }))
  }


  const patchRow = (applicationId: number, patch: Partial<PipelineCardRow>) => {
    setLocalRows((prev) =>
      prev.map((row) =>
        Number(row.application_id) === Number(applicationId)
          ? { ...row, ...patch }
          : row,
      ),
    )
  }


  const validateTransition = (fromStatus: number, toStatus: number) => {
    if (fromStatus === toStatus) return true
    return (ADJACENT_STATUS_POLICY[fromStatus] ?? []).includes(toStatus)
  }


  const handleStatusChange = async (row: PipelineCardRow, nextStatus: number) => {
    const currentStatus = Number(row.application_status ?? 0)


    if (!validateTransition(currentStatus, nextStatus)) {
      showToast('המעבר בין השלבים אינו חוקי לפי מדיניות ה־Pipeline', 'error')
      return
    }


    if ([12, 13, 14, 15].includes(nextStatus)) {
      const confirmed = window.confirm('מעבר לשלב סגירה דורש אישור. להמשיך?')
      if (!confirmed) return
    }


    const previousStatus = currentStatus
    setUpdatingStatusId(Number(row.application_id))


    patchRow(Number(row.application_id), {
      application_status: nextStatus,
      updated_timestamp: new Date().toISOString(),
    })


    try {
      await updateApplication.mutateAsync({
        applicationId: Number(row.application_id),
        updates: { application_status: nextStatus },
        jobCode: row.job_code,
      })


      if (nextStatus === 12) {
        showToast('הכרטיס קוּדם להשמה. יש להפעיל גם עדכון job_status = 5', 'success')
      } else {
        showToast('סטטוס הכרטיס עודכן', 'success')
      }
    } catch (err) {
      patchRow(Number(row.application_id), {
        application_status: previousStatus,
        updated_timestamp: row.updated_timestamp,
      })
      showToast(
        `שגיאה בעדכון סטטוס: ${err instanceof Error ? err.message : 'שגיאה לא ידועה'}. בוצע rollback`,
        'error',
      )
    } finally {
      setUpdatingStatusId(null)
    }
  }


  const handleCheckStatusChange = async (row: PipelineCardRow, nextCheckStatus: number) => {
    const previous = Number(row.check_status ?? 0)
    setUpdatingCheckStatusId(Number(row.application_id))


    patchRow(Number(row.application_id), {
      check_status: nextCheckStatus,
      updated_timestamp: new Date().toISOString(),
    })


    try {
      await updateApplication.mutateAsync({
        applicationId: Number(row.application_id),
        updates: { check_status: nextCheckStatus },
      })
      showToast('Check status עודכן', 'success')
    } catch (err) {
      patchRow(Number(row.application_id), {
        check_status: previous,
        updated_timestamp: row.updated_timestamp,
      })
      showToast(
        `שגיאה בעדכון check status: ${err instanceof Error ? err.message : 'שגיאה לא ידועה'}`,
        'error',
      )
    } finally {
      setUpdatingCheckStatusId(null)
    }
  }


  return (
    <Shell
      title="ATS Pipeline"
      subtitle={`ניהול סטטוסי הגשות לאורך תהליך הגיוס • ${totalVisibleCards} הגשות בתצוגה`}
      icon={ClipboardList}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <ActionButton
            variant="ghost"
            icon={RefreshCw}
            onClick={() => {
              // רענון אמיתי מ-Supabase לפני הודעת ההצלחה
              queryClient.invalidateQueries({ queryKey: ['applications'] })
              queryClient.invalidateQueries({ queryKey: ['jobs'] })
              showToast('הלוח רוענן', 'success')
            }}
          >
            רענון
          </ActionButton>
          <Link to="/admin/applications">
            <ActionButton variant="ghost" icon={Inbox}>פתיחת כל ההגשות</ActionButton>
          </Link>
        </div>
      }
    >
      <div className="space-y-6 font-['Heebo']">
        <Toolbar>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-8">
            <div className="xl:col-span-2">
              <SearchBar
                value={filters.search ?? ''}
                onChange={(value) => setFilters((prev) => ({ ...prev, search: value }))}
                placeholder="חיפוש מועמד, טלפון, אימייל, קוד משרה, מעסיק..."
              />
            </div>


            <SelectFilter
              value={String(filters.job_code ?? '')}
              onChange={(value) => setFilters((prev) => ({ ...prev, job_code: value || undefined }))}
              options={jobsOptions}
              placeholder="משרה"
            />


            <SelectFilter
              value={String(filters.account_name ?? '')}
              onChange={(value) => setFilters((prev) => ({ ...prev, account_name: value || undefined }))}
              options={accountOptions}
              placeholder="ארגון"
            />


            <SelectFilter
              value={String(filters.region ?? '')}
              onChange={(value) => setFilters((prev) => ({ ...prev, region: value || undefined }))}
              options={regionOptions}
              placeholder="אזור"
            />


            <SelectFilter
              value={String(filters.role ?? '')}
              onChange={(value) => setFilters((prev) => ({ ...prev, role: value || undefined }))}
              options={roleOptions}
              placeholder="תפקיד"
            />


            <SelectFilter
              value={String(filters.check_status ?? '')}
              onChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  check_status: value ? Number(value) : undefined,
                }))
              }
              options={checkStatuses.map((item: any) => ({
                value: String(item.id),
                label: item.name,
              }))}
              placeholder="סטטוס בדיקה"
            />


            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, active_only: !prev.active_only }))}
                className={`h-10 rounded-xl px-3 text-sm font-semibold ${
                  filters.active_only
                    ? 'bg-[#FFF7ED] text-[#D97706]'
                    : 'border border-slate-200 bg-white text-slate-700'
                }`}
              >
                רק פעילים
              </button>


              <button
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, stale_only: !prev.stale_only }))}
                className={`h-10 rounded-xl px-3 text-sm font-semibold ${
                  filters.stale_only
                    ? 'bg-[#FEF2F2] text-[#DC2626]'
                    : 'border border-slate-200 bg-white text-slate-700'
                }`}
              >
                רק תקועים
              </button>
            </div>
          </div>


          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <DateInput
              label="מתאריך"
              value={filters.date_from ?? ''}
              onChange={(value) => setFilters((prev) => ({ ...prev, date_from: value || undefined }))}
            />
            <DateInput
              label="עד תאריך"
              value={filters.date_to ?? ''}
              onChange={(value) => setFilters((prev) => ({ ...prev, date_to: value || undefined }))}
            />


            <div className="flex items-end gap-2">
              <ActionButton variant="ghost" onClick={resetFilters}>
                איפוס פילטרים
              </ActionButton>
            </div>
          </div>
        </Toolbar>


        {error ? (
          <Toolbar>
            <EmptyState
              icon={AlertTriangle}
              title="שגיאה בטעינת הלוח"
              description="אירעה שגיאה בטעינת נתוני ה־Pipeline."
              action={
                <ActionButton variant="primary" icon={RefreshCw} onClick={() => window.location.reload()}>
                  רענון
                </ActionButton>
              }
            />
          </Toolbar>
        ) : loading ? (
          <Toolbar>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-4 2xl:grid-cols-8">
              {COLUMN_CONFIGS.map((column) => (
                <div key={column.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-4 h-5 w-32 animate-pulse rounded bg-slate-200" />
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="rounded-2xl border border-slate-100 p-4">
                        <div className="mb-2 h-4 w-24 animate-pulse rounded bg-slate-200" />
                        <div className="mb-2 h-3 w-full animate-pulse rounded bg-slate-100" />
                        <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Toolbar>
        ) : totalVisibleCards === 0 ? (
          <Toolbar>
            <EmptyState
              icon={ClipboardList}
              title="אין הגשות להצגה"
              description="אין תוצאות עבור הסינון הנוכחי."
              action={
                <ActionButton variant="secondary" onClick={resetFilters}>
                  נקה פילטרים
                </ActionButton>
              }
            />
          </Toolbar>
        ) : (
          <div className="overflow-x-auto pb-2">
            <div className="flex min-w-[1800px] gap-4">
              {COLUMN_CONFIGS.map((column) => {
                const rows = rowsByColumn[column.key] ?? []
                const currentPage = columnPageByKey[column.key] ?? 1
                const visibleRows = rows.slice(0, currentPage * COLUMN_PAGE_SIZE)
                const hasMore = visibleRows.length < rows.length
                const columnTone =
                  column.tone === 'success'
                    ? 'bg-[#F0FDF4] border-[#BBF7D0]'
                    : column.tone === 'warning'
                      ? 'bg-[#FFFBEB] border-[#FDE68A]'
                      : column.tone === 'danger'
                        ? 'bg-[#FEF2F2] border-[#FECACA]'
                        : 'bg-white border-slate-200'


                return (
                  <div
                    key={column.key}
                    className={`w-[360px] shrink-0 rounded-2xl border p-4 shadow-sm ${columnTone}`}
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-base font-extrabold text-slate-900">{column.title}</div>
                        <div className="text-xs font-medium text-slate-500">{rows.length} כרטיסים</div>
                      </div>


                      <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                        {rows.length}
                      </div>
                    </div>


                    {visibleRows.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-6 text-center text-sm text-slate-500">
                        אין כרטיסים בעמודה
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {visibleRows.map((row) => (
                          <AtsCard
                            key={row.application_id}
                            row={row}
                            checkStatuses={checkStatuses}
                            onOpen={() => setDetailSheet({ open: true, row })}
                            onStatusChange={(nextStatus) => handleStatusChange(row, nextStatus)}
                            onCheckStatusChange={(nextCheckStatus) =>
                              handleCheckStatusChange(row, nextCheckStatus)
                            }
                            updatingStatus={updatingStatusId === Number(row.application_id)}
                            updatingCheckStatus={updatingCheckStatusId === Number(row.application_id)}
                          />
                        ))}
                      </div>
                    )}


                    <div className="mt-4">
                      {hasMore ? (
                        <button
                          type="button"
                          onClick={() => handleLoadMore(column.key)}
                          disabled={Boolean(loadingMoreByColumn[column.key])}
                          className="flex h-10 w-full items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {loadingMoreByColumn[column.key] ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              טוען עוד...
                            </span>
                          ) : (
                            'load more'
                          )}
                        </button>
                      ) : rows.length > 0 ? (
                        <div className="text-center text-xs text-slate-500">סוף העמודה</div>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}


        {detailSheet.open && detailSheet.row && (
          <DetailSheet
            row={detailSheet.row}
            applicationStatuses={applicationStatuses}
            checkStatuses={checkStatuses}
            onClose={() => setDetailSheet({ open: false, row: null })}
            onStatusChange={(nextStatus) => handleStatusChange(detailSheet.row as PipelineCardRow, nextStatus)}
            onCheckStatusChange={(nextCheckStatus) =>
              handleCheckStatusChange(detailSheet.row as PipelineCardRow, nextCheckStatus)
            }
            updatingStatus={updatingStatusId === Number(detailSheet.row.application_id)}
            updatingCheckStatus={updatingCheckStatusId === Number(detailSheet.row.application_id)}
          />
        )}


        {toast.open && (
          <div className="fixed bottom-6 left-6 z-[70]">
            <div
              className={`rounded-2xl border px-4 py-3 shadow-lg ${
                toast.tone === 'success'
                  ? 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]'
                  : toast.tone === 'error'
                    ? 'border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]'
                    : 'border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]'
              }`}
            >
              <div className="flex items-center gap-2 text-[13px] font-semibold">
                {toast.tone === 'success' ? <CheckCircle2 className="h-4 w-4" /> : null}
                {toast.tone === 'error' ? <AlertTriangle className="h-4 w-4" /> : null}
                {toast.message}
              </div>
            </div>
          </div>
        )}
      </div>
    </Shell>
  )
}


function AtsCard({
  row,
  checkStatuses,
  onOpen,
  onStatusChange,
  onCheckStatusChange,
  updatingStatus,
  updatingCheckStatus,
}: {
  row: PipelineCardRow
  checkStatuses: any[]
  onOpen: () => void
  onStatusChange: (nextStatus: number) => void
  onCheckStatusChange: (nextStatus: number) => void
  updatingStatus: boolean
  updatingCheckStatus: boolean
}) {
  const appBadge = getStatusBadge(applicationStatusColors, Number(row.application_status ?? 0))
  const checkBadge = getStatusBadge(checkStatusColors, Number(row.check_status ?? 0))
  const stale = isStale(row.updated_timestamp, STALE_DAYS)
  const missingCv = !applicationHasCv(row)
  const employerFeedback = Boolean(row.pending_employer_feedback)


  const nextStatusOptions = ADJACENT_STATUS_POLICY[Number(row.application_status ?? 0)] ?? []


  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F0FDFC] text-[15px] font-bold text-[#008080]">
            {(row.candidate_name ?? '?').charAt(0)}
          </div>


          <div>
            <div className="text-[14px] font-bold text-slate-900">{row.candidate_name ?? '—'}</div>
            <div className="mt-1 text-[12px] text-slate-500">{row.job_code ?? '—'} • {row.account_name ?? '—'}</div>
          </div>
        </div>


        <button
          type="button"
          onClick={onOpen}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          title="Open details"
          aria-label="Open details"
        >
          <Eye className="h-4 w-4" />
        </button>
      </div>


      <div className="mb-3 flex flex-wrap gap-1.5">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${appBadge.bg} ${appBadge.text}`}>
          {appBadge.label}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${checkBadge.bg} ${checkBadge.text}`}>
          {checkBadge.label}
        </span>
        {stale ? <InlineSignal tone="danger">תקוע</InlineSignal> : null}
        {missingCv ? <InlineSignal tone="warning">ללא קו"ח</InlineSignal> : null}
        {employerFeedback ? <InlineSignal tone="warning">ממתין למשוב מעסיק</InlineSignal> : null}
      </div>


      <div className="space-y-1 text-[12px] text-slate-600">
        <div>תאריך הגשה: {formatDate(row.submission_date)}</div>
        <div>עודכן: {timeAgo(row.updated_timestamp)}</div>
        <div>תפקיד: {row.job_role ?? '—'}</div>
      </div>


      <div className="mt-3 rounded-xl bg-slate-50 p-3 text-[12px] text-slate-600">
        {row.internal_notes || row.candidate_notes || 'אין הערות להצגה'}
      </div>


      <div className="mt-3 grid grid-cols-2 gap-2">
        <QuickIconLink
          title="WhatsApp"
          href={buildWhatsAppLink(row.candidate_phone ?? '')}
          disabled={!normalizeDigits(row.candidate_phone ?? '')}
          icon={<MessageCircle className="h-4 w-4" />}
        />
        <QuickIconLink
          title="CV"
          href={row.cv_link ?? '#'}
          onClick={() => openApplicationCv(row)}
          disabled={!applicationHasCv(row)}
          icon={<FileText className="h-4 w-4" />}
        />
        <QuickRouteLink
          title="Candidate 360"
          to={row.candidate_link ? `/admin/candidates/${row.candidate_link}` : ''}
          disabled={!row.candidate_link}
          icon={<UserRound className="h-4 w-4" />}
        />
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <ExternalLink className="h-4 w-4" />
          Open details
        </button>
      </div>


      <div className="mt-3 grid grid-cols-1 gap-2">
        <select
          dir="rtl"
          value=""
          onChange={(e) => {
            const value = Number(e.target.value)
            if (value) onStatusChange(value)
          }}
          disabled={updatingStatus || nextStatusOptions.length === 0}
          className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-medium outline-none focus:border-[#008080] disabled:cursor-not-allowed disabled:bg-slate-100"
        >
          <option value="">שינוי שלב</option>
          {nextStatusOptions.map((statusId) => (
            <option key={statusId} value={statusId}>
              {applicationStatusColors[statusId]?.label ?? `סטטוס ${statusId}`}
            </option>
          ))}
        </select>


        <select
          dir="rtl"
          value={String(row.check_status ?? '')}
          onChange={(e) => onCheckStatusChange(Number(e.target.value))}
          disabled={updatingCheckStatus}
          className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-medium outline-none focus:border-[#008080] disabled:cursor-not-allowed disabled:bg-slate-100"
        >
          {checkStatuses.map((status: any) => (
            <option key={status.id} value={status.id}>
              {status.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}


function DetailSheet({
  row,
  applicationStatuses,
  checkStatuses,
  onClose,
  onStatusChange,
  onCheckStatusChange,
  updatingStatus,
  updatingCheckStatus,
}: {
  row: PipelineCardRow
  applicationStatuses: any[]
  checkStatuses: any[]
  onClose: () => void
  onStatusChange: (nextStatus: number) => void
  onCheckStatusChange: (nextStatus: number) => void
  updatingStatus: boolean
  updatingCheckStatus: boolean
}) {
  const appBadge = getStatusBadge(applicationStatusColors, Number(row.application_status ?? 0))
  const checkBadge = getStatusBadge(checkStatusColors, Number(row.check_status ?? 0))
  const nextStatusOptions = ADJACENT_STATUS_POLICY[Number(row.application_status ?? 0)] ?? []


  return (
    <div className="fixed inset-0 z-[80] flex justify-start">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside className="relative z-10 h-full w-full max-w-[560px] overflow-y-auto border-l border-slate-200 bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur-sm">
          <div>
            <h3 className="text-[22px] font-bold text-slate-900">Detail Sheet</h3>
            <p className="mt-1 text-[13px] text-slate-500">עבודה על הכרטיס בלי לצאת מהלוח</p>
          </div>


          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>


        <div className="space-y-4 p-5">
          <SectionCard title="candidate summary">
            <DetailsGrid
              items={[
                { label: 'שם מועמד', value: row.candidate_name },
                { label: 'נייד', value: row.candidate_phone },
                { label: 'אימייל', value: row.candidate_email },
                { label: 'Candidate 360', value: row.candidate_link ? 'זמין' : 'לא קיים' },
              ]}
            />
          </SectionCard>


          <SectionCard title="job summary">
            <DetailsGrid
              items={[
                { label: 'קוד משרה', value: row.job_code },
                { label: 'תפקיד', value: row.job_role },
                { label: 'אזור', value: row.job_region },
                { label: 'תאריך הגשה', value: formatDate(row.submission_date) },
              ]}
            />
          </SectionCard>


          <SectionCard title="employer summary">
            <DetailsGrid
              items={[
                { label: 'ארגון', value: row.account_name },
                { label: 'סטטוס במאגר', value: row.candidate_link != null ? 'קיים במאגר' : 'חדש – ממתין לבדיקה' },
                { label: 'עודכן', value: timeAgo(row.updated_timestamp) },
                { label: 'נוצר', value: formatDate(row.created_timestamp) },
              ]}
            />
          </SectionCard>


          <SectionCard title="application status">
            <div className="space-y-3">
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${appBadge.bg} ${appBadge.text}`}>
                {appBadge.label}
              </span>


              <select
                dir="rtl"
                value=""
                onChange={(e) => {
                  const value = Number(e.target.value)
                  if (value) onStatusChange(value)
                }}
                disabled={updatingStatus || nextStatusOptions.length === 0}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#008080] disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                <option value="">עדכון סטטוס</option>
                {nextStatusOptions.map((statusId) => (
                  <option key={statusId} value={statusId}>
                    {applicationStatuses.find((item) => Number(item.id) === Number(statusId))?.name ??
                      applicationStatusColors[statusId]?.label ??
                      `סטטוס ${statusId}`}
                  </option>
                ))}
              </select>
            </div>
          </SectionCard>


          <SectionCard title="check status">
            <div className="space-y-3">
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${checkBadge.bg} ${checkBadge.text}`}>
                {checkBadge.label}
              </span>


              <select
                dir="rtl"
                value={String(row.check_status ?? '')}
                onChange={(e) => onCheckStatusChange(Number(e.target.value))}
                disabled={updatingCheckStatus}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#008080] disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                {checkStatuses.map((status: any) => (
                  <option key={status.id} value={status.id}>
                    {status.name}
                  </option>
                ))}
              </select>
            </div>
          </SectionCard>


          <SectionCard title="CV">
            {applicationHasCv(row) ? (
              <button
                type="button"
                onClick={() => openApplicationCv(row)}
                className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Open CV
              </button>
            ) : (
              <div className="rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-800">
                חסר קו"ח לפני ראיון / שליחה למעסיק
              </div>
            )}
          </SectionCard>


          <SectionCard title="candidate notes">
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
              {row.candidate_notes ?? 'אין הערות מועמד'}
            </div>
          </SectionCard>


          <SectionCard title="internal notes">
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
              {row.internal_notes ?? 'אין הערות פנימיות'}
            </div>
          </SectionCard>


          <SectionCard title="timeline">
            <div className="space-y-2 text-sm text-slate-600">
              <div>נוצר: {formatDate(row.created_timestamp)}</div>
              <div>הוגש: {formatDate(row.submission_date)}</div>
              <div>עודכן לאחרונה: {timeAgo(row.updated_timestamp)}</div>
            </div>
          </SectionCard>


          <SectionCard title="פעולות">
            <div className="grid grid-cols-1 gap-2">
              <QuickSheetButton
                label="WhatsApp"
                href={buildWhatsAppLink(row.candidate_phone ?? '')}
                disabled={!normalizeDigits(row.candidate_phone ?? '')}
              />
              <QuickSheetButton label="Open CV" href={row.cv_link ?? '#'} onClick={() => openApplicationCv(row)} disabled={!applicationHasCv(row)} />
              <QuickSheetRouteButton
                label="Open Candidate 360"
                to={row.candidate_link ? `/admin/candidates/${row.candidate_link}` : ''}
                disabled={!row.candidate_link}
              />
              <QuickSheetRouteButton
                label="Open Job Details"
                to={row.job_code ? `/admin/jobs/${row.job_code}` : ''}
                disabled={!row.job_code}
              />
            </div>
          </SectionCard>
        </div>
      </aside>
    </div>
  )
}


function SectionCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h4 className="mb-4 text-[16px] font-bold text-slate-900">{title}</h4>
      {children}
    </div>
  )
}


function DetailsGrid({
  items,
}: {
  items: Array<{ label: string; value: React.ReactNode }>
}) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`} className="rounded-xl bg-slate-50 p-3">
          <div className="text-[12px] font-semibold text-slate-500">{item.label}</div>
          <div className="mt-1 text-[13px] font-semibold text-slate-900">{item.value ?? '—'}</div>
        </div>
      ))}
    </div>
  )
}


function InlineSignal({
  children,
  tone,
}: {
  children: React.ReactNode
  tone: 'warning' | 'danger' | 'success'
}) {
  const style =
    tone === 'warning'
      ? 'bg-[#FFFBEB] text-[#D97706]'
      : tone === 'danger'
        ? 'bg-[#FEF2F2] text-[#DC2626]'
        : 'bg-[#F0FDF4] text-[#16A34A]'


  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${style}`}>{children}</span>
}


function QuickIconLink({
  title,
  href,
  disabled,
  icon,
  onClick,
}: {
  title: string
  href: string
  disabled?: boolean
  icon: React.ReactNode
  onClick?: () => void
}) {
  if (disabled) {
    return (
      <span className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-400">
        {icon}
        {title}
      </span>
    )
  }


  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={onClick ? (e) => { e.preventDefault(); onClick() } : undefined}
      className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
    >
      {icon}
      {title}
    </a>
  )
}


function QuickRouteLink({
  title,
  to,
  disabled,
  icon,
}: {
  title: string
  to: string
  disabled?: boolean
  icon: React.ReactNode
}) {
  if (disabled) {
    return (
      <span className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-400">
        {icon}
        {title}
      </span>
    )
  }


  return (
    <Link
      to={to}
      className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
    >
      {icon}
      {title}
    </Link>
  )
}


function QuickSheetButton({
  label,
  href,
  disabled,
  onClick,
}: {
  label: string
  href: string
  disabled?: boolean
  onClick?: () => void
}) {
  if (disabled) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 px-4 text-sm font-semibold text-slate-400"
      >
        {label}
      </button>
    )
  }


  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={onClick ? (e) => { e.preventDefault(); onClick() } : undefined}
      className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
    >
      {label}
    </a>
  )
}


function QuickSheetRouteButton({
  label,
  to,
  disabled,
}: {
  label: string
  to: string
  disabled?: boolean
}) {
  if (disabled) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 px-4 text-sm font-semibold text-slate-400"
      >
        {label}
      </button>
    )
  }


  return (
    <Link
      to={to}
      className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
    >
      {label}
    </Link>
  )
}


function DateInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <div className="mb-1 text-[12px] font-semibold text-slate-500">{label}</div>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#008080]"
      />
    </label>
  )
}


function normalizeSearchText(value: string) {
  return String(value ?? '').trim().toLowerCase()
}


function normalizeDigits(value: string) {
  return String(value ?? '').replace(/\D/g, '')
}


function buildWhatsAppLink(phone: string) {
  const normalized = normalizeDigits(phone)
  if (!normalized) return ''
  return `https://wa.me/${normalized}`
}


function isOnOrAfter(value?: string | null, limit?: string) {
  if (!value || !limit) return false
  return new Date(value).getTime() >= new Date(limit).getTime()
}


function isOnOrBefore(value?: string | null, limit?: string) {
  if (!value || !limit) return false
  return new Date(value).getTime() <= new Date(limit).getTime() + 24 * 60 * 60 * 1000 - 1
}


function isStale(value?: string | null, days = 5) {
  if (!value) return true
  const ts = new Date(value).getTime()
  if (Number.isNaN(ts)) return true
  return ts < Date.now() - days * 24 * 60 * 60 * 1000
}


function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}



