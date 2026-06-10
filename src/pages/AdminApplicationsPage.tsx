import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  LayoutGrid,
  List,
  MessageCircle,
  Plus,
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
  Pagination,
  EmptyState,
} from '@/components/layout/Shell'
import { useApplications, useCandidates, useJobs, useDicts } from '@/hooks/useMockData'
import { applicationStatusColors, checkStatusColors, getStatusBadge } from '@/lib/statusColors'
import { formatDate, timeAgo } from '@/lib/timeAgo'
import type { ApplicationFilters } from '@/types'


type ViewMode = 'table' | 'grid'
type CvFilter = 'all' | 'with' | 'without'
type SortField =
  | 'application_id'
  | 'candidate_name'
  | 'job_code'
  | 'submission_date'
  | 'application_status'
type SortDirection = 'asc' | 'desc'


type ExtendedFilters = ApplicationFilters & {
  region?: string
  role?: string
  source?: number
  dateFrom?: string
  dateTo?: string
  cvState?: CvFilter
  activeOnly?: boolean
  campaignShielded?: boolean
}


type ToastTone = 'success' | 'error' | 'info'


type ToastState = {
  open: boolean
  tone: ToastTone
  message: string
}


type LocalApplicationRow = {
  application_id: number
  record_name?: string | null
  submission_date?: string | null
  display_date?: string | null
  form_title?: string | null
  job_code?: string | null
  job_link?: string | null
  account_name?: string | null
  job_role?: string | null
  job_city?: string | null
  job_region?: string | null
  candidate_phone?: string | null
  candidate_name?: string | null
  candidate_email?: string | null
  cv_link?: string | null
  candidate_link?: number | null
  candidate_notes?: string | null
  status_in_master?: string | null
  check_status?: number | null
  job_status_view?: string | null
  application_status?: number | null
  master_availability?: string | null
  master_role?: string | null
  master_city?: string | null
  master_region?: string | null
  internal_notes?: string | null
  phone_norm?: string | null
  record_quality?: string | null
  created_timestamp?: string | null
  updated_timestamp?: string | null
  source?: number | null
  campaign_shielded?: boolean
  campaign_last_sent?: string | null
  follow_up_date?: string | null
  is_manual?: boolean
}


type DetailsSheetState = {
  open: boolean
  row: LocalApplicationRow | null
}


type NotesEditorState = {
  open: boolean
  rowId: number | null
  internalNotes: string
  candidateNotes: string
}


type ManualCreateState = {
  open: boolean
  candidateId: number | ''
  jobCode: string
  applicationStatus: number | ''
  checkStatus: number | ''
  source: number | ''
  notes: string
}


const PAGE_SIZE = 20


export default function AdminApplicationsPage() {
  const [filters, setFilters] = useState<ExtendedFilters>({
    cvState: 'all',
    activeOnly: false,
    campaignShielded: false,
  })
  const [page, setPage] = useState(0)
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [sortField, setSortField] = useState<SortField>('submission_date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [selectedRows, setSelectedRows] = useState<number[]>([])
  const [localRows, setLocalRows] = useState<LocalApplicationRow[]>([])
  const [toast, setToast] = useState<ToastState>({ open: false, tone: 'info', message: '' })
  const [detailsSheet, setDetailsSheet] = useState<DetailsSheetState>({ open: false, row: null })
  const [notesEditor, setNotesEditor] = useState<NotesEditorState>({
    open: false,
    rowId: null,
    internalNotes: '',
    candidateNotes: '',
  })
  const [manualCreate, setManualCreate] = useState<ManualCreateState>({
    open: false,
    candidateId: '',
    jobCode: '',
    applicationStatus: '',
    checkStatus: '',
    source: '',
    notes: '',
  })
  const [bulkStatusValue, setBulkStatusValue] = useState<number | ''>('')
  const [bulkCheckValue, setBulkCheckValue] = useState<number | ''>('')
  const [bulkFollowUpDate, setBulkFollowUpDate] = useState<string>('')
  const [pageError, setPageError] = useState<string>('')


  const { data: applications = [], total } = useApplications(filters)
  const { data: candidates = [] } = useCandidates({})
  const { data: jobs = [] } = useJobs({})
  const dicts = useDicts()


  const applicationStatuses = dicts.applicationStatuses ?? []
  const checkStatuses = dicts.checkStatuses ?? []
  const regions = dicts.regions ?? []
  const roles = dicts.roles ?? []
  const sources = dicts.sources ?? []
  const availability = dicts.availability ?? []


  const regionNameById = useMemo(
    () => new Map(regions.map((item: { id: number; name: string }) => [item.id, item.name])),
    [regions],
  )


  const roleNameById = useMemo(
    () => new Map(roles.map((item: { id: number; name: string }) => [item.id, item.name])),
    [roles],
  )


  const availabilityNameById = useMemo(
    () => new Map(availability.map((item: { id: number; name: string }) => [item.id, item.name])),
    [availability],
  )


  const sourceNameById = useMemo(
    () => new Map(sources.map((item: { id: number; name: string }) => [item.id, item.name])),
    [sources],
  )


  const candidatesById = useMemo(() => {
    const map = new Map<number, any>()
    candidates.forEach((candidate: any) => {
      map.set(candidate.contact_id, candidate)
    })
    return map
  }, [candidates])


  const jobsByCode = useMemo(() => {
    const map = new Map<string, any>()
    jobs.forEach((job: any) => {
      if (job.job_code) map.set(String(job.job_code).toLowerCase(), job)
    })
    return map
  }, [jobs])


  useEffect(() => {
    try {
      const enriched = (applications as any[]).map((row) => {
        const candidate = row.candidate_link ? candidatesById.get(Number(row.candidate_link)) : null
        const job = row.job_code ? jobsByCode.get(String(row.job_code).toLowerCase()) : null


        const sourceFromCandidate = candidate?.source ?? null
        const campaignLastSent = candidate?.whatsapp_campaign_last_sent ?? null
        const campaignShielded = Boolean(campaignLastSent)


        return {
          ...row,
          source: sourceFromCandidate,
          campaign_shielded: campaignShielded,
          campaign_last_sent: campaignLastSent,
          job_region:
            row.job_region ??
            (job?.region_id ? regionNameById.get(Number(job.region_id)) : null) ??
            row.master_region ??
            null,
          job_role:
            row.job_role ??
            (job?.job_role ? roleNameById.get(Number(job.job_role)) : null) ??
            row.master_role ??
            null,
          master_availability:
            row.master_availability ??
            (candidate?.availability ? availabilityNameById.get(Number(candidate.availability)) : null) ??
            null,
          candidate_phone: row.candidate_phone ?? candidate?.phone ?? null,
          candidate_email: row.candidate_email ?? candidate?.email ?? null,
          cv_link: row.cv_link ?? candidate?.cv_link ?? null,
        } as LocalApplicationRow
      })


      setLocalRows(enriched)
      setPageError('')
    } catch {
      setPageError('אירעה שגיאה בטעינת ההגשות')
    }
  }, [applications, candidatesById, jobsByCode, regionNameById, roleNameById, availabilityNameById])


  useEffect(() => {
    setPage(0)
  }, [filters, sortField, sortDirection, viewMode])


  useEffect(() => {
    if (!toast.open) return
    const timer = window.setTimeout(() => {
      setToast((prev) => ({ ...prev, open: false }))
    }, 2600)
    return () => window.clearTimeout(timer)
  }, [toast.open])


  const candidateOptions = useMemo(() => {
    return (candidates as any[])
      .filter((candidate) => Boolean(candidate.contact_id))
      .map((candidate) => ({
        value: candidate.contact_id,
        label: `${candidate.full_name ?? candidate.display_name ?? 'ללא שם'} • ${
          candidate.phone_norm ?? candidate.phone ?? 'ללא טלפון'
        }`,
      }))
  }, [candidates])


  const jobOptions = useMemo(() => {
    return (jobs as any[])
      .filter((job) => Boolean(job.job_code))
      .map((job) => ({
        value: String(job.job_code),
        label: `${job.job_code} • ${job.job_title ?? 'ללא כותרת'} • ${job.account_name ?? 'ללא ארגון'}`,
      }))
  }, [jobs])


  const showToast = (message: string, tone: ToastTone = 'info') => {
    setToast({ open: true, tone, message })
  }


  const filteredRows = useMemo(() => {
    const normalizedSearch = normalizeSearchText(filters.search ?? '')
    const searchDigits = normalizeDigits(filters.search ?? '')


    return localRows.filter((row) => {
      if (normalizedSearch) {
        const haystack = normalizeSearchText(
          [
            row.candidate_name,
            row.candidate_phone,
            row.phone_norm,
            row.candidate_email,
            row.job_code,
            row.account_name,
          ]
            .filter(Boolean)
            .join(' '),
        )


        const digitsHaystack = normalizeDigits(
          [row.candidate_phone, row.phone_norm].filter(Boolean).join(' '),
        )


        const searchMatch =
          haystack.includes(normalizedSearch) ||
          (searchDigits ? digitsHaystack.includes(searchDigits) : false)


        if (!searchMatch) return false
      }


      if (filters.application_status && Number(row.application_status) !== Number(filters.application_status)) {
        return false
      }


      if (filters.check_status && Number(row.check_status) !== Number(filters.check_status)) {
        return false
      }


      if (filters.region && String(row.job_region ?? row.master_region ?? '') !== String(filters.region)) {
        return false
      }


      if (filters.role && String(row.job_role ?? row.master_role ?? '') !== String(filters.role)) {
        return false
      }


      if (filters.source && Number(row.source) !== Number(filters.source)) {
        return false
      }


      if (filters.dateFrom && !isDateOnOrAfter(row.submission_date, filters.dateFrom)) {
        return false
      }


      if (filters.dateTo && !isDateOnOrBefore(row.submission_date, filters.dateTo)) {
        return false
      }


      if (filters.cvState === 'with' && !row.cv_link) {
        return false
      }


      if (filters.cvState === 'without' && row.cv_link) {
        return false
      }


      if (filters.activeOnly && Number(row.application_status) === 13) {
        return false
      }


      if (filters.campaignShielded && !row.campaign_shielded) {
        return false
      }


      return true
    })
  }, [localRows, filters])


  const sortedRows = useMemo(() => {
    const copied = [...filteredRows]
    copied.sort((a, b) => {
      let left: string | number = ''
      let right: string | number = ''


      if (sortField === 'application_id') {
        left = Number(a.application_id ?? 0)
        right = Number(b.application_id ?? 0)
      } else if (sortField === 'candidate_name') {
        left = String(a.candidate_name ?? '')
        right = String(b.candidate_name ?? '')
      } else if (sortField === 'job_code') {
        left = String(a.job_code ?? '')
        right = String(b.job_code ?? '')
      } else if (sortField === 'application_status') {
        left = Number(a.application_status ?? 0)
        right = Number(b.application_status ?? 0)
      } else {
        left = new Date(a.submission_date ?? 0).getTime()
        right = new Date(b.submission_date ?? 0).getTime()
      }


      if (typeof left === 'number' && typeof right === 'number') {
        return sortDirection === 'asc' ? left - right : right - left
      }


      return sortDirection === 'asc'
        ? String(left).localeCompare(String(right), 'he')
        : String(right).localeCompare(String(left), 'he')
    })
    return copied
  }, [filteredRows, sortDirection, sortField])


  const totalVisible = sortedRows.length
  const totalPages = Math.max(1, Math.ceil(totalVisible / PAGE_SIZE))
  const pageData = sortedRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)


  const kpis = useMemo(() => {
    const openStatuses = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 15])
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000


    const newApplications = localRows.filter((row) => {
      const submittedAt = new Date(row.submission_date ?? 0).getTime()
      return submittedAt >= sevenDaysAgo && openStatuses.has(Number(row.application_status))
    }).length


    const waitingForHandling = localRows.filter((row) => [1, 2].includes(Number(row.application_status))).length
    const advanced = localRows.filter((row) => [4, 5, 6, 7].includes(Number(row.application_status))).length
    const hires = localRows.filter((row) => Number(row.application_status) === 12).length
    const missingCv = localRows.filter((row) => !row.cv_link).length
    const waitingEmployer = localRows.filter((row) => Number(row.application_status) === 7).length
    const stale = localRows.filter((row) => isOlderThanDays(row.updated_timestamp, 7)).length
    const archived = localRows.filter((row) => Number(row.application_status) === 13).length


    return {
      newApplications,
      waitingForHandling,
      advanced,
      hires,
      missingCv,
      waitingEmployer,
      stale,
      archived,
    }
  }, [localRows])


  const duplicateGuardSet = useMemo(() => {
    const set = new Set<string>()
    localRows.forEach((row) => {
      const key = `${String(row.job_code ?? '').trim().toLowerCase()}::${normalizeDigits(row.phone_norm ?? row.candidate_phone ?? '')}`
      if (key !== '::') set.add(key)
    })
    return set
  }, [localRows])


  const partialCount = useMemo(() => {
    return localRows.filter(
      (row) => !row.cv_link || !row.source || !row.candidate_link || !row.internal_notes || !row.candidate_notes,
    ).length
  }, [localRows])


  const allPageSelected =
    pageData.length > 0 && pageData.every((row) => selectedRows.includes(Number(row.application_id)))


  const selectedCount = selectedRows.length


  const clearFilters = () => {
    setFilters({
      cvState: 'all',
      activeOnly: false,
      campaignShielded: false,
    })
    setSelectedRows([])
  }


  const togglePageSelection = () => {
    const ids = pageData.map((row) => Number(row.application_id))
    if (allPageSelected) {
      setSelectedRows((prev) => prev.filter((id) => !ids.includes(id)))
      return
    }
    setSelectedRows((prev) => Array.from(new Set([...prev, ...ids])))
  }


  const toggleRowSelection = (applicationId: number) => {
    setSelectedRows((prev) =>
      prev.includes(applicationId) ? prev.filter((id) => id !== applicationId) : [...prev, applicationId],
    )
  }


  const patchRow = (applicationId: number, patch: Partial<LocalApplicationRow>) => {
    setLocalRows((prev) =>
      prev.map((row) => (Number(row.application_id) === Number(applicationId) ? { ...row, ...patch } : row)),
    )
  }


  const patchRows = (ids: number[], patch: Partial<LocalApplicationRow>) => {
    setLocalRows((prev) =>
      prev.map((row) =>
        ids.includes(Number(row.application_id))
          ? {
              ...row,
              ...patch,
            }
          : row,
      ),
    )
  }


  const handleStatusUpdate = (applicationId: number, nextStatus: number) => {
    patchRow(applicationId, {
      application_status: nextStatus,
      updated_timestamp: new Date().toISOString(),
    })


    if (nextStatus === 12) {
      showToast('סטטוס ההגשה עודכן ונרשם טריגר איוש למשרה', 'success')
      return
    }


    showToast('סטטוס ההגשה עודכן', 'success')
  }


  const handleCheckStatusUpdate = (applicationId: number, nextCheck: number) => {
    patchRow(applicationId, {
      check_status: nextCheck,
      updated_timestamp: new Date().toISOString(),
    })
    showToast('סטטוס הבדיקה עודכן', 'success')
  }


  const handleArchiveRow = (applicationId: number) => {
    patchRow(applicationId, {
      application_status: 13,
      updated_timestamp: new Date().toISOString(),
    })
    showToast('ההגשה הועברה לארכיון', 'success')
  }


  const openNotesEditor = (row: LocalApplicationRow) => {
    setNotesEditor({
      open: true,
      rowId: Number(row.application_id),
      internalNotes: String(row.internal_notes ?? ''),
      candidateNotes: String(row.candidate_notes ?? ''),
    })
  }


  const saveNotesEditor = () => {
    if (!notesEditor.rowId) return
    patchRow(notesEditor.rowId, {
      internal_notes: notesEditor.internalNotes || null,
      candidate_notes: notesEditor.candidateNotes || null,
      updated_timestamp: new Date().toISOString(),
    })
    setNotesEditor({
      open: false,
      rowId: null,
      internalNotes: '',
      candidateNotes: '',
    })
    showToast('ההערות נשמרו', 'success')
  }


  const runBulkArchive = () => {
    if (!selectedCount) {
      showToast('יש לבחור לפחות הגשה אחת', 'error')
      return
    }
    patchRows(selectedRows, {
      application_status: 13,
      updated_timestamp: new Date().toISOString(),
    })
    showToast(`בוצע ארכוב עבור ${selectedCount} הגשות`, 'success')
    setSelectedRows([])
  }


  const runBulkStatus = () => {
    if (!selectedCount || !bulkStatusValue) {
      showToast('יש לבחור רשומות וסטטוס יעד', 'error')
      return
    }
    patchRows(selectedRows, {
      application_status: Number(bulkStatusValue),
      updated_timestamp: new Date().toISOString(),
    })
    if (Number(bulkStatusValue) === 12) {
      showToast(`בוצע עדכון סטטוס עבור ${selectedCount} הגשות ונרשם טריגר איוש`, 'success')
    } else {
      showToast(`בוצע עדכון סטטוס עבור ${selectedCount} הגשות`, 'success')
    }
    setBulkStatusValue('')
    setSelectedRows([])
  }


  const runBulkCheckStatus = () => {
    if (!selectedCount || !bulkCheckValue) {
      showToast('יש לבחור רשומות וסטטוס בדיקה יעד', 'error')
      return
    }
    patchRows(selectedRows, {
      check_status: Number(bulkCheckValue),
      updated_timestamp: new Date().toISOString(),
    })
    showToast(`בוצע עדכון סטטוס בדיקה עבור ${selectedCount} הגשות`, 'success')
    setBulkCheckValue('')
    setSelectedRows([])
  }


  const runBulkAssignFollowUp = () => {
    if (!selectedCount || !bulkFollowUpDate) {
      showToast('יש לבחור רשומות ותאריך מעקב', 'error')
      return
    }
    patchRows(selectedRows, {
      follow_up_date: bulkFollowUpDate,
      updated_timestamp: new Date().toISOString(),
    })
    showToast(`נקבע מעקב עבור ${selectedCount} הגשות`, 'success')
    setBulkFollowUpDate('')
    setSelectedRows([])
  }


  const exportRowsToCsv = (rows: LocalApplicationRow[]) => {
    const prepared = rows.map((row) => ({
      'מזהה הגשה': row.application_id,
      'שם מועמד': row.candidate_name ?? '',
      טלפון: row.candidate_phone ?? row.phone_norm ?? '',
      אימייל: row.candidate_email ?? '',
      'קוד משרה': row.job_code ?? '',
      'שם מעסיק': row.account_name ?? '',
      'תפקיד משרה': row.job_role ?? '',
      אזור: row.job_region ?? '',
      'סטטוס הגשה': getApplicationStatusName(row.application_status, applicationStatuses),
      'סטטוס בדיקה': getCheckStatusName(row.check_status, checkStatuses),
      'תאריך הגשה': formatDate(row.submission_date),
      מקור: row.source ? sourceNameById.get(Number(row.source)) ?? '' : '',
      'עם קו"ח': row.cv_link ? 'כן' : 'לא',
      'קמפיין חסום': row.campaign_shielded ? 'כן' : 'לא',
      'הערות פנימיות': row.internal_notes ?? '',
      'הערות מועמד': row.candidate_notes ?? '',
      'עודכן לאחרונה': formatDate(row.updated_timestamp),
    }))


    const csv = toCsv(prepared)
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'admin-applications.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }


  const openManualCreate = () => {
    setManualCreate({
      open: true,
      candidateId: '',
      jobCode: '',
      applicationStatus: '',
      checkStatus: '',
      source: '',
      notes: '',
    })
  }


  const submitManualCreate = () => {
    const candidate = candidatesById.get(Number(manualCreate.candidateId))
    const job = jobsByCode.get(String(manualCreate.jobCode).toLowerCase())


    if (!candidate) {
      showToast('יש לבחור מועמד תקף', 'error')
      return
    }


    if (!job) {
      showToast('יש לבחור משרה תקפה', 'error')
      return
    }


    const phoneNorm = normalizeDigits(candidate.phone_norm ?? candidate.phone ?? '')
    const duplicateKey = `${String(job.job_code ?? '').trim().toLowerCase()}::${phoneNorm}`


    if (duplicateGuardSet.has(duplicateKey)) {
      showToast('כבר קיימת הגשה עבור אותה קומבינציה של קוד משרה וטלפון', 'error')
      return
    }


    const nextId =
      localRows.reduce((max, row) => Math.max(max, Number(row.application_id ?? 0)), 0) + 1


    const createdAt = new Date().toISOString()


    const nextRow: LocalApplicationRow = {
      application_id: nextId,
      record_name: `APP-${String(nextId).padStart(3, '0')}`,
      submission_date: createdAt,
      display_date: formatDate(createdAt),
      form_title: 'יצירה ידנית',
      job_code: job.job_code,
      job_link: job.job_url ?? null,
      account_name: job.account_name ?? null,
      job_role: roleNameById.get(Number(job.job_role)) ?? null,
      job_city: job.city_id ? null : null,
      job_region: job.region_id ? regionNameById.get(Number(job.region_id)) ?? null : null,
      candidate_phone: candidate.phone ?? candidate.phone_norm ?? null,
      candidate_name: candidate.full_name ?? candidate.display_name ?? null,
      candidate_email: candidate.email ?? null,
      cv_link: candidate.cv_link ?? null,
      candidate_link: candidate.contact_id,
      candidate_notes: null,
      status_in_master: null,
      check_status: manualCreate.checkStatus ? Number(manualCreate.checkStatus) : null,
      job_status_view: null,
      application_status: manualCreate.applicationStatus ? Number(manualCreate.applicationStatus) : 1,
      master_availability: candidate.availability
        ? availabilityNameById.get(Number(candidate.availability)) ?? null
        : null,
      master_role: candidate.role ? roleNameById.get(Number(candidate.role)) ?? null : null,
      master_city: candidate.city_id ? String(candidate.city_id) : null,
      master_region: candidate.region_id ? regionNameById.get(Number(candidate.region_id)) ?? null : null,
      internal_notes: manualCreate.notes || null,
      phone_norm: candidate.phone_norm ?? normalizeDigits(candidate.phone ?? ''),
      source: manualCreate.source ? Number(manualCreate.source) : null,
      campaign_shielded: Boolean(candidate.whatsapp_campaign_last_sent),
      campaign_last_sent: candidate.whatsapp_campaign_last_sent ?? null,
      created_timestamp: createdAt,
      updated_timestamp: createdAt,
      is_manual: true,
    }


    setLocalRows((prev) => [nextRow, ...prev])
    setManualCreate({
      open: false,
      candidateId: '',
      jobCode: '',
      applicationStatus: '',
      checkStatus: '',
      source: '',
      notes: '',
    })


    if (Number(nextRow.application_status) === 12) {
      showToast('הגשה ידנית נוצרה ונרשם טריגר איוש', 'success')
      return
    }


    showToast('הגשה ידנית נוצרה בהצלחה', 'success')
  }


  const renderInlineStatusSelect = (row: LocalApplicationRow) => {
    return (
      <select
        dir="rtl"
        value={String(row.application_status ?? '')}
        onChange={(event) => handleStatusUpdate(Number(row.application_id), Number(event.target.value))}
        className="h-9 min-w-[140px] rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-medium text-[#0F172A] outline-none focus:border-[#008080] focus:ring-2 focus:ring-[#008080]/10"
      >
        <option value="">בחר סטטוס</option>
        {applicationStatuses.map((status: { id: number; name: string }) => (
          <option key={status.id} value={status.id}>
            {status.name}
          </option>
        ))}
      </select>
    )
  }


  const renderInlineCheckSelect = (row: LocalApplicationRow) => {
    return (
      <select
        dir="rtl"
        value={String(row.check_status ?? '')}
        onChange={(event) => handleCheckStatusUpdate(Number(row.application_id), Number(event.target.value))}
        className="h-9 min-w-[140px] rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-medium text-[#0F172A] outline-none focus:border-[#008080] focus:ring-2 focus:ring-[#008080]/10"
      >
        <option value="">בחר סטטוס בדיקה</option>
        {checkStatuses.map((status: { id: number; name: string }) => (
          <option key={status.id} value={status.id}>
            {status.name}
          </option>
        ))}
      </select>
    )
  }


  return (
    <Shell
      title="הגשות"
      subtitle={`ניהול כלל ההגשות והסטטוסים במערכת • ${totalVisible} תוצאות לאחר סינון`}
      icon={ClipboardList}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex h-10 w-10 items-center justify-center ${
                viewMode === 'table' ? 'bg-[#F0FDFC] text-[#008080]' : 'text-slate-500'
              }`}
              title="תצוגת טבלה"
              aria-label="תצוגת טבלה"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex h-10 w-10 items-center justify-center ${
                viewMode === 'grid' ? 'bg-[#FFF7ED] text-[#D97706]' : 'text-slate-500'
              }`}
              title="תצוגת גריד"
              aria-label="תצוגת גריד"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>


          <ActionButton
            variant="ghost"
            icon={RefreshCw}
            onClick={() => showToast('הרשימה רועננה', 'success')}
          >
            רענון
          </ActionButton>


          <ActionButton
            variant="ghost"
            icon={Download}
            onClick={() => {
              exportRowsToCsv(sortedRows)
              showToast('הייצוא הושלם', 'success')
            }}
          >
            ייצוא
          </ActionButton>


          <button
            type="button"
            onClick={() => setFilters((prev) => ({ ...prev, search: '', application_status: 1 }))}
            className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            חדשות בלבד
          </button>


          <button
            type="button"
            onClick={() => setFilters((prev) => ({ ...prev, application_status: 2 }))}
            className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            ממתינות לטיפול
          </button>


          <ActionButton variant="primary" icon={Plus} onClick={openManualCreate}>
            יצירת הגשה ידנית
          </ActionButton>
        </div>
      }
    >
      <div dir="rtl" className="min-h-screen bg-[#F8FAFC] font-['Heebo'] text-[#0F172A]">
        <div className="space-y-6">
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
            <KpiCard
              label="הגשות חדשות"
              value={kpis.newApplications}
              hint="7 ימים אחרונים"
              tone="default"
              onClick={() => setFilters((prev) => ({ ...prev, application_status: 1 }))}
            />
            <KpiCard
              label="ממתינות לטיפול"
              value={kpis.waitingForHandling}
              hint="סטטוסים ראשוניים"
              tone="warning"
              onClick={() => setFilters((prev) => ({ ...prev, application_status: 2 }))}
            />
            <KpiCard
              label="בראיונות / מתקדם"
              value={kpis.advanced}
              hint="שלבים אמצעיים"
              tone="default"
              onClick={() => setFilters((prev) => ({ ...prev, application_status: 5 }))}
            />
            <KpiCard
              label="השמות"
              value={kpis.hires}
              hint="לפי חוק הטריגר"
              tone="success"
              onClick={() => setFilters((prev) => ({ ...prev, application_status: 12 }))}
            />
            <KpiCard
              label='חסר קו"ח'
              value={kpis.missingCv}
              hint="ללא קישור"
              tone="warning"
              onClick={() => setFilters((prev) => ({ ...prev, cvState: 'without' }))}
            />
            <KpiCard
              label="ממתינות למשוב מעסיק"
              value={kpis.waitingEmployer}
              hint="ממתין לתגובה"
              tone="accent"
              onClick={() => setFilters((prev) => ({ ...prev, application_status: 7 }))}
            />
            <KpiCard
              label="תקועות"
              value={kpis.stale}
              hint="מעל 7 ימים"
              tone="danger"
              onClick={() => showToast('הכרטיסים התקועים מסומנים במסך', 'info')}
            />
            <KpiCard
              label="ארכיון / לא רלוונטיות"
              value={kpis.archived}
              hint="סטטוס ארכיון"
              tone="muted"
              onClick={() => setFilters((prev) => ({ ...prev, activeOnly: false, application_status: 13 }))}
            />
          </section>


          <Toolbar>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#F0FDFC] text-[#008080]">
                  <Filter className="h-4 w-4" />
                </div>
                <h2 className="text-[15px] font-bold text-[#0F172A]">חיפוש, פילטרים ומיון</h2>
                <span className="rounded-full bg-[#F8FAFC] px-2.5 py-1 text-[12px] font-semibold text-slate-500">
                  Table First
                </span>
              </div>


              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
                <SearchBar
                  value={filters.search ?? ''}
                  onChange={(value) => setFilters((prev) => ({ ...prev, search: value }))}
                  placeholder="חיפוש שם, טלפון, אימייל, קוד משרה, מעסיק..."
                />


                <SelectFilter
                  value={String(filters.application_status ?? '')}
                  onChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      application_status: value ? Number(value) : undefined,
                    }))
                  }
                  options={applicationStatuses.map((item: { id: number; name: string }) => ({
                    value: String(item.id),
                    label: item.name,
                  }))}
                  placeholder="סטטוס הגשה"
                />


                <SelectFilter
                  value={String(filters.check_status ?? '')}
                  onChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      check_status: value ? Number(value) : undefined,
                    }))
                  }
                  options={checkStatuses.map((item: { id: number; name: string }) => ({
                    value: String(item.id),
                    label: item.name,
                  }))}
                  placeholder="סטטוס בדיקה"
                />


                <SelectFilter
                  value={String(filters.region ?? '')}
                  onChange={(value) => setFilters((prev) => ({ ...prev, region: value || undefined }))}
                  options={Array.from(new Set(localRows.map((row) => String(row.job_region ?? '')).filter(Boolean))).map(
                    (value) => ({
                      value,
                      label: value,
                    }),
                  )}
                  placeholder="אזור"
                />


                <SelectFilter
                  value={String(filters.role ?? '')}
                  onChange={(value) => setFilters((prev) => ({ ...prev, role: value || undefined }))}
                  options={Array.from(new Set(localRows.map((row) => String(row.job_role ?? '')).filter(Boolean))).map(
                    (value) => ({
                      value,
                      label: value,
                    }),
                  )}
                  placeholder="תפקיד"
                />


                <SelectFilter
                  value={String(filters.source ?? '')}
                  onChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      source: value ? Number(value) : undefined,
                    }))
                  }
                  options={sources.map((item: { id: number; name: string }) => ({
                    value: String(item.id),
                    label: item.name,
                  }))}
                  placeholder="מקור"
                />


                <DateField
                  label="מתאריך"
                  value={filters.dateFrom ?? ''}
                  onChange={(value) => setFilters((prev) => ({ ...prev, dateFrom: value || undefined }))}
                />


                <DateField
                  label="עד תאריך"
                  value={filters.dateTo ?? ''}
                  onChange={(value) => setFilters((prev) => ({ ...prev, dateTo: value || undefined }))}
                />


                <SelectFilter
                  value={String(filters.cvState ?? 'all')}
                  onChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      cvState: (value as CvFilter) || 'all',
                    }))
                  }
                  options={[
                    { value: 'all', label: 'כל הקו"ח' },
                    { value: 'with', label: 'עם קו"ח' },
                    { value: 'without', label: 'ללא קו"ח' },
                  ]}
                  placeholder='קו"ח'
                />


                <SelectFilter
                  value={`${sortField}:${sortDirection}`}
                  onChange={(value) => {
                    const [field, direction] = String(value).split(':') as [SortField, SortDirection]
                    setSortField(field)
                    setSortDirection(direction)
                  }}
                  options={[
                    { value: 'submission_date:desc', label: 'חדש לישן' },
                    { value: 'submission_date:asc', label: 'ישן לחדש' },
                    { value: 'candidate_name:asc', label: 'שם מועמד א-ת' },
                    { value: 'job_code:asc', label: 'קוד משרה א-ת' },
                    { value: 'application_status:asc', label: 'סטטוס הגשה' },
                    { value: 'application_id:desc', label: 'מזהה גבוה לנמוך' },
                  ]}
                  placeholder="מיון"
                />
              </div>


              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                <FilterChip
                  active={Boolean(filters.activeOnly)}
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      activeOnly: !prev.activeOnly,
                    }))
                  }
                >
                  פעילים בלבד
                </FilterChip>


                <FilterChip
                  active={Boolean(filters.campaignShielded)}
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      campaignShielded: !prev.campaignShielded,
                    }))
                  }
                >
                  Campaign Shield
                </FilterChip>


                <InfoPill label={`תוצאות: ${totalVisible}`} />
                <InfoPill label={`Partial: ${partialCount}`} tone="warning" />


                <div className="ms-auto flex flex-wrap gap-2">
                  {Object.values(filters).some(Boolean) && (
                    <ActionButton variant="ghost" onClick={clearFilters}>
                      נקה פילטרים
                    </ActionButton>
                  )}
                </div>
              </div>
            </div>
          </Toolbar>


          {selectedCount > 0 && (
            <Toolbar>
              <div className="rounded-2xl border border-[#D97706]/20 bg-[#FFFBEB] p-4 shadow-sm">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white px-3 py-1 text-[13px] font-bold text-[#D97706] shadow-sm">
                      נבחרו {selectedCount} הגשות
                    </span>
                    <span className="text-[13px] font-medium text-slate-600">פעולות גורפות</span>
                  </div>


                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      dir="rtl"
                      value={String(bulkStatusValue)}
                      onChange={(event) =>
                        setBulkStatusValue(event.target.value ? Number(event.target.value) : '')
                      }
                      className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-medium text-[#0F172A] outline-none focus:border-[#008080] focus:ring-2 focus:ring-[#008080]/10"
                    >
                      <option value="">שינוי סטטוס</option>
                      {applicationStatuses.map((status: { id: number; name: string }) => (
                        <option key={status.id} value={status.id}>
                          {status.name}
                        </option>
                      ))}
                    </select>


                    <button
                      type="button"
                      onClick={runBulkStatus}
                      className="inline-flex h-10 items-center rounded-xl bg-[#008080] px-4 text-[13px] font-semibold text-white shadow-sm transition hover:opacity-95"
                    >
                      החל סטטוס
                    </button>


                    <select
                      dir="rtl"
                      value={String(bulkCheckValue)}
                      onChange={(event) =>
                        setBulkCheckValue(event.target.value ? Number(event.target.value) : '')
                      }
                      className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-medium text-[#0F172A] outline-none focus:border-[#008080] focus:ring-2 focus:ring-[#008080]/10"
                    >
                      <option value="">עדכון בדיקה</option>
                      {checkStatuses.map((status: { id: number; name: string }) => (
                        <option key={status.id} value={status.id}>
                          {status.name}
                        </option>
                      ))}
                    </select>


                    <button
                      type="button"
                      onClick={runBulkCheckStatus}
                      className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                      החל בדיקה
                    </button>


                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                      <CalendarClock className="h-4 w-4 text-[#D97706]" />
                      <input
                        type="date"
                        value={bulkFollowUpDate}
                        onChange={(event) => setBulkFollowUpDate(event.target.value)}
                        className="bg-transparent text-[13px] font-medium text-[#0F172A] outline-none"
                      />
                    </div>


                    <button
                      type="button"
                      onClick={runBulkAssignFollowUp}
                      className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                      שיוך מעקב
                    </button>


                    <button
                      type="button"
                      onClick={() => {
                        exportRowsToCsv(sortedRows.filter((row) => selectedRows.includes(Number(row.application_id))))
                        showToast('הייצוא בוצע עבור הרשומות המסומנות', 'success')
                      }}
                      className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                      ייצוא
                    </button>


                    <button
                      type="button"
                      onClick={() => {
                        patchRows(selectedRows, {
                          check_status: 1,
                          updated_timestamp: new Date().toISOString(),
                        })
                        showToast(`הרשומות סומנו לבדיקה עבור ${selectedCount} הגשות`, 'success')
                        setSelectedRows([])
                      }}
                      className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                      סמן לבדיקה
                    </button>


                    <button
                      type="button"
                      onClick={runBulkArchive}
                      className="inline-flex h-10 items-center rounded-xl border border-[#DC2626]/20 bg-white px-4 text-[13px] font-semibold text-[#DC2626] shadow-sm transition hover:bg-[#FEF2F2]"
                    >
                      ארכוב גורף
                    </button>
                  </div>
                </div>
              </div>
            </Toolbar>
          )}


          <Toolbar>
            {pageError ? (
              <ErrorStateCard
                title="שגיאה בטעינה"
                description={pageError}
                onRetry={() => {
                  setPageError('')
                  showToast('בוצע ניסיון טעינה מחדש', 'info')
                }}
              />
            ) : localRows.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <EmptyState
                  icon={ClipboardList}
                  title="אין הגשות במערכת"
                  description="עדיין לא קיימות הגשות להצגה."
                />
              </div>
            ) : pageData.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <EmptyState
                  icon={ClipboardList}
                  title="לא נמצאו תוצאות לאחר הסינון"
                  description="שנו את תנאי הסינון כדי לראות הגשות."
                />
              </div>
            ) : viewMode === 'table' ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-[1880px] w-full text-right">
                    <thead className="bg-[#F8FAFC]">
                      <tr className="border-b border-slate-200 text-[13px] font-semibold text-slate-500">
                        <th className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={allPageSelected}
                            onChange={togglePageSelection}
                            className="h-4 w-4 rounded border-slate-300 text-[#008080] focus:ring-[#008080]"
                          />
                        </th>
                        <th className="px-4 py-3">שם מועמד</th>
                        <th className="px-4 py-3">טלפון</th>
                        <th className="px-4 py-3">אימייל</th>
                        <th className="px-4 py-3">קוד משרה</th>
                        <th className="px-4 py-3">תפקיד משרה</th>
                        <th className="px-4 py-3">שם מעסיק</th>
                        <th className="px-4 py-3">סטטוס הגשה</th>
                        <th className="px-4 py-3">סטטוס בדיקה</th>
                        <th className="px-4 py-3">תאריך הגשה</th>
                        <th className="px-4 py-3">קו״ח</th>
                        <th className="px-4 py-3">הערות פנימיות</th>
                        <th className="px-4 py-3">מקור</th>
                        <th className="px-4 py-3">פעולות</th>
                      </tr>
                    </thead>


                    <tbody className="divide-y divide-slate-100 bg-white">
                      {pageData.map((row) => {
                        const applicationBadge = getStatusBadge(
                          applicationStatusColors,
                          Number(row.application_status ?? 0),
                        )
                        const checkBadge = getStatusBadge(
                          checkStatusColors,
                          Number(row.check_status ?? 0),
                        )
                        const isPartial =
                          !row.cv_link ||
                          !row.source ||
                          !row.candidate_link ||
                          !row.internal_notes ||
                          !row.candidate_notes


                        return (
                          <tr
                            key={row.application_id}
                            className="cursor-pointer text-[13px] font-medium text-[#0F172A] transition hover:bg-slate-50"
                            onClick={() => setDetailsSheet({ open: true, row })}
                          >
                            <td
                              className="px-4 py-3"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                checked={selectedRows.includes(Number(row.application_id))}
                                onChange={() => toggleRowSelection(Number(row.application_id))}
                                className="h-4 w-4 rounded border-slate-300 text-[#008080] focus:ring-[#008080]"
                              />
                            </td>


                            <td className="px-4 py-3">
                              <div className="min-w-[220px]">
                                <div className="flex items-start gap-3">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F0FDFC] text-[15px] font-bold text-[#008080] shadow-sm">
                                    {(row.candidate_name ?? '?').charAt(0)}
                                  </div>


                                  <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      {row.candidate_link ? (
                                        <Link
                                          to={`/candidates/${row.candidate_link}`}
                                          className="text-[14px] font-bold text-[#0F172A] hover:text-[#008080]"
                                          onClick={(event) => event.stopPropagation()}
                                        >
                                          {row.candidate_name ?? '—'}
                                        </Link>
                                      ) : (
                                        <span className="text-[14px] font-bold text-[#0F172A]">
                                          {row.candidate_name ?? '—'}
                                        </span>
                                      )}


                                      {row.campaign_shielded && (
                                        <InlineSignal tone="warning">Shield</InlineSignal>
                                      )}
                                      {isPartial && <InlineSignal tone="muted">Partial</InlineSignal>}
                                      {isOlderThanDays(row.updated_timestamp, 7) && (
                                        <InlineSignal tone="danger">תקוע</InlineSignal>
                                      )}
                                    </div>


                                    <div className="text-[12px] text-slate-500">
                                      {row.master_availability ?? 'ללא זמינות'}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>


                            <td className="px-4 py-3">
                              <div className="space-y-1">
                                <div className="font-semibold text-slate-700">
                                  {formatPhoneLike(row.candidate_phone ?? row.phone_norm ?? '—')}
                                </div>
                                <div className="text-[12px] text-slate-400">{row.phone_norm ?? '—'}</div>
                              </div>
                            </td>


                            <td className="px-4 py-3">
                              <div className="max-w-[220px] truncate">{row.candidate_email ?? '—'}</div>
                            </td>


                            <td className="px-4 py-3">
                              {row.job_code ? (
                                <Link
                                  to={`/jobs/${row.job_code}`}
                                  className="font-mono text-[13px] font-bold text-[#008080] hover:underline"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  {row.job_code}
                                </Link>
                              ) : (
                                '—'
                              )}
                            </td>


                            <td className="px-4 py-3">{row.job_role ?? '—'}</td>
                            <td className="px-4 py-3">{row.account_name ?? '—'}</td>


                            <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                              <div className="space-y-2">
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-semibold ${applicationBadge.bg} ${applicationBadge.text}`}
                                >
                                  {applicationBadge.label}
                                </span>
                                {renderInlineStatusSelect(row)}
                              </div>
                            </td>


                            <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                              <div className="space-y-2">
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-semibold ${checkBadge.bg} ${checkBadge.text}`}
                                >
                                  {checkBadge.label}
                                </span>
                                {renderInlineCheckSelect(row)}
                              </div>
                            </td>


                            <td className="px-4 py-3">
                              <div className="space-y-1">
                                <div>{formatDate(row.submission_date)}</div>
                                <div className="text-[12px] text-slate-400">{timeAgo(row.updated_timestamp)}</div>
                              </div>
                            </td>


                            <td className="px-4 py-3">
                              {row.cv_link ? (
                                <a
                                  href={row.cv_link}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(event) => event.stopPropagation()}
                                  className="inline-flex items-center gap-1.5 rounded-full bg-[#F0FDF4] px-2.5 py-1 text-[12px] font-semibold text-[#16A34A]"
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  פתח
                                </a>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFFBEB] px-2.5 py-1 text-[12px] font-semibold text-[#D97706]">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  חסר
                                </span>
                              )}
                            </td>


                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  openNotesEditor(row)
                                }}
                                className="max-w-[260px] truncate rounded-xl bg-slate-50 px-3 py-2 text-right text-[12px] font-medium text-slate-600 transition hover:bg-slate-100"
                              >
                                {row.internal_notes ?? 'הוסף הערה'}
                              </button>
                            </td>


                            <td className="px-4 py-3">
                              {row.source ? (
                                <span className="rounded-full bg-[#F8FAFC] px-2.5 py-1 text-[12px] font-semibold text-slate-700">
                                  {sourceNameById.get(Number(row.source)) ?? '—'}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>


                            <td
                              className="px-4 py-3"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <div className="flex flex-wrap items-center gap-1.5">
                                <IconAction
                                  title="פתיחת פרטים"
                                  onClick={() => setDetailsSheet({ open: true, row })}
                                  icon={<Eye className="h-4 w-4" />}
                                />


                                <IconAction
                                  title="Candidate 360"
                                  asLink={row.candidate_link ? `/candidates/${row.candidate_link}` : undefined}
                                  onClick={() => {}}
                                  disabled={!row.candidate_link}
                                  icon={<UserRound className="h-4 w-4" />}
                                />


                                <IconAction
                                  title="Job Details"
                                  asLink={row.job_code ? `/jobs/${row.job_code}` : undefined}
                                  onClick={() => {}}
                                  disabled={!row.job_code}
                                  icon={<ExternalLink className="h-4 w-4" />}
                                />


                                <IconAction
                                  title="וואטסאפ"
                                  href={
                                    normalizeDigits(row.phone_norm ?? row.candidate_phone ?? '')
                                      ? `https://wa.me/${normalizeDigits(row.phone_norm ?? row.candidate_phone ?? '')}`
                                      : undefined
                                  }
                                  onClick={() => {}}
                                  disabled={!normalizeDigits(row.phone_norm ?? row.candidate_phone ?? '')}
                                  icon={<MessageCircle className="h-4 w-4" />}
                                />


                                <IconAction
                                  title='פתח קו"ח'
                                  href={row.cv_link ?? undefined}
                                  onClick={() => {}}
                                  disabled={!row.cv_link}
                                  icon={<FileText className="h-4 w-4" />}
                                />


                                <IconAction
                                  title="עריכת הערות"
                                  onClick={() => openNotesEditor(row)}
                                  icon={<ClipboardList className="h-4 w-4" />}
                                />


                                <IconAction
                                  title="ארכוב"
                                  onClick={() => handleArchiveRow(Number(row.application_id))}
                                  icon={<X className="h-4 w-4" />}
                                />


                                <IconAction
                                  title="פתח ב־ATS"
                                  asLink="/pipeline"
                                  onClick={() => {}}
                                  icon={<ChevronDown className="h-4 w-4" />}
                                />
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>


                <div className="border-t border-slate-200 bg-white px-4 py-3">
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    totalItems={totalVisible}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {partialCount > 0 && (
                  <div className="rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-[13px] font-semibold text-[#92400E]">
                      <AlertTriangle className="h-4 w-4" />
                      קיימות {partialCount} הגשות במצב Partial — חלק מהנתונים חסרים.
                    </div>
                  </div>
                )}


                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {pageData.map((row) => {
                    const applicationBadge = getStatusBadge(
                      applicationStatusColors,
                      Number(row.application_status ?? 0),
                    )
                    const checkBadge = getStatusBadge(
                      checkStatusColors,
                      Number(row.check_status ?? 0),
                    )
                    const isStale = isOlderThanDays(row.updated_timestamp, 7)
                    const hasMissingCv = !row.cv_link


                    return (
                      <div
                        key={row.application_id}
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#008080]/20 hover:shadow-md"
                      >
                        <div className="mb-4 flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F0FDFC] text-[16px] font-bold text-[#008080]">
                              {(row.candidate_name ?? '?').charAt(0)}
                            </div>


                            <div>
                              <div className="text-[15px] font-bold text-[#0F172A]">
                                {row.candidate_name ?? '—'}
                              </div>
                              <div className="mt-1 text-[12px] text-slate-500">
                                {row.candidate_phone ?? row.phone_norm ?? '—'}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                <span
                                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${applicationBadge.bg} ${applicationBadge.text}`}
                                >
                                  {applicationBadge.label}
                                </span>
                                <span
                                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${checkBadge.bg} ${checkBadge.text}`}
                                >
                                  {checkBadge.label}
                                </span>
                              </div>
                            </div>
                          </div>


                          <input
                            type="checkbox"
                            checked={selectedRows.includes(Number(row.application_id))}
                            onChange={() => toggleRowSelection(Number(row.application_id))}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-[#008080] focus:ring-[#008080]"
                          />
                        </div>


                        <div className="space-y-2 text-[13px]">
                          <GridInfoRow label="קוד משרה" value={row.job_code ?? '—'} mono />
                          <GridInfoRow label="ארגון" value={row.account_name ?? '—'} />
                          <GridInfoRow label="תפקיד" value={row.job_role ?? '—'} />
                          <GridInfoRow label="תאריך הגשה" value={formatDate(row.submission_date)} />
                          <GridInfoRow
                            label='קו"ח'
                            value={hasMissingCv ? 'חסר' : 'קיים'}
                            valueTone={hasMissingCv ? 'warning' : 'success'}
                          />
                          <GridInfoRow
                            label="מקור"
                            value={row.source ? sourceNameById.get(Number(row.source)) ?? '—' : '—'}
                          />
                        </div>


                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {row.campaign_shielded && <InlineSignal tone="warning">Campaign Shield</InlineSignal>}
                          {isStale && <InlineSignal tone="danger">תקוע</InlineSignal>}
                          {hasMissingCv && <InlineSignal tone="warning">ללא קו״ח</InlineSignal>}
                          {!row.internal_notes && <InlineSignal tone="muted">ללא הערות</InlineSignal>}
                        </div>


                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setDetailsSheet({ open: true, row })}
                            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            פרטים
                          </button>


                          <button
                            type="button"
                            onClick={() => openNotesEditor(row)}
                            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            הערות
                          </button>


                          <button
                            type="button"
                            onClick={() => handleArchiveRow(Number(row.application_id))}
                            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            ארכוב
                          </button>


                          <Link
                            to="/pipeline"
                            className="inline-flex h-10 items-center justify-center rounded-xl bg-[#008080] px-3 text-[13px] font-semibold text-white shadow-sm transition hover:opacity-95"
                          >
                            ATS
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>


                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    totalItems={totalVisible}
                  />
                </div>
              </div>
            )}
          </Toolbar>
        </div>


        {detailsSheet.open && detailsSheet.row && (
          <SideSheet onClose={() => setDetailsSheet({ open: false, row: null })} title="פרטי הגשה">
            <div className="space-y-4">
              <SectionCard title="סיכום מועמד">
                <DetailsGrid
                  items={[
                    { label: 'שם מועמד', value: detailsSheet.row.candidate_name },
                    { label: 'טלפון', value: detailsSheet.row.candidate_phone ?? detailsSheet.row.phone_norm },
                    { label: 'אימייל', value: detailsSheet.row.candidate_email },
                    { label: 'זמינות', value: detailsSheet.row.master_availability },
                    { label: 'Candidate 360', value: detailsSheet.row.candidate_link ? 'זמין' : 'חסר קישור' },
                  ]}
                />
              </SectionCard>


              <SectionCard title="סיכום משרה">
                <DetailsGrid
                  items={[
                    { label: 'קוד משרה', value: detailsSheet.row.job_code },
                    { label: 'תפקיד', value: detailsSheet.row.job_role },
                    { label: 'ארגון', value: detailsSheet.row.account_name },
                    { label: 'אזור', value: detailsSheet.row.job_region },
                    { label: 'סטטוס משרה', value: detailsSheet.row.job_status_view },
                  ]}
                />
              </SectionCard>


              <SectionCard title="פרטי הגשה">
                <div className="space-y-3">
                  <div>
                    <div className="mb-2 text-[13px] font-semibold text-slate-500">סטטוס הגשה</div>
                    {renderInlineStatusSelect(detailsSheet.row)}
                  </div>


                  <div>
                    <div className="mb-2 text-[13px] font-semibold text-slate-500">סטטוס בדיקה</div>
                    {renderInlineCheckSelect(detailsSheet.row)}
                  </div>


                  <DetailsGrid
                    items={[
                      { label: 'תאריך הגשה', value: formatDate(detailsSheet.row.submission_date) },
                      {
                        label: 'מקור',
                        value: detailsSheet.row.source
                          ? sourceNameById.get(Number(detailsSheet.row.source)) ?? '—'
                          : '—',
                      },
                      {
                        label: 'Campaign Shield',
                        value: detailsSheet.row.campaign_shielded
                          ? `כן • ${formatDate(detailsSheet.row.campaign_last_sent)}`
                          : 'לא',
                      },
                      {
                        label: 'עודכן לאחרונה',
                        value: detailsSheet.row.updated_timestamp
                          ? `${formatDate(detailsSheet.row.updated_timestamp)} • ${timeAgo(
                              detailsSheet.row.updated_timestamp,
                            )}`
                          : '—',
                      },
                    ]}
                  />
                </div>
              </SectionCard>


              <SectionCard title='קו"ח והערות'>
                <div className="space-y-3">
                  <QuickActionRow
                    label='קו"ח'
                    value={detailsSheet.row.cv_link ? 'קיים' : 'חסר'}
                    action={
                      detailsSheet.row.cv_link ? (
                        <a
                          href={detailsSheet.row.cv_link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                        >
                          פתח קו"ח
                        </a>
                      ) : null
                    }
                  />


                  <NotesPreview
                    title="הערות מועמד"
                    value={detailsSheet.row.candidate_notes ?? 'אין הערות מועמד'}
                  />
                  <NotesPreview
                    title="הערות פנימיות"
                    value={detailsSheet.row.internal_notes ?? 'אין הערות פנימיות'}
                  />
                </div>
              </SectionCard>


              <SectionCard title="פעולות מהירות">
                <div className="flex flex-wrap gap-2">
                  {detailsSheet.row.candidate_link ? (
                    <Link
                      to={`/candidates/${detailsSheet.row.candidate_link}`}
                      className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                      Candidate 360
                    </Link>
                  ) : null}


                  {detailsSheet.row.job_code ? (
                    <Link
                      to={`/jobs/${detailsSheet.row.job_code}`}
                      className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                      Job Details
                    </Link>
                  ) : null}


                  {normalizeDigits(
                    detailsSheet.row.phone_norm ?? detailsSheet.row.candidate_phone ?? '',
                  ) ? (
                    <a
                      href={`https://wa.me/${normalizeDigits(
                        detailsSheet.row.phone_norm ?? detailsSheet.row.candidate_phone ?? '',
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-10 items-center rounded-xl bg-[#008080] px-4 text-[13px] font-semibold text-white shadow-sm transition hover:opacity-95"
                    >
                      WhatsApp
                    </a>
                  ) : null}


                  <button
                    type="button"
                    onClick={() => {
                      openNotesEditor(detailsSheet.row as LocalApplicationRow)
                    }}
                    className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    עריכת הערות
                  </button>
                </div>
              </SectionCard>
            </div>
          </SideSheet>
        )}


        {notesEditor.open && (
          <Modal onClose={() => setNotesEditor({ open: false, rowId: null, internalNotes: '', candidateNotes: '' })}>
            <div className="space-y-4">
              <div>
                <h3 className="text-[22px] font-bold text-[#0F172A]">עריכת הערות</h3>
                <p className="mt-1 text-[13px] font-medium text-slate-500">שמירה מהירה לשדה מועמד ולהערות פנימיות</p>
              </div>


              <TextAreaField
                label="הערות מועמד"
                value={notesEditor.candidateNotes}
                onChange={(value) => setNotesEditor((prev) => ({ ...prev, candidateNotes: value }))}
                rows={4}
              />


              <TextAreaField
                label="הערות פנימיות"
                value={notesEditor.internalNotes}
                onChange={(value) => setNotesEditor((prev) => ({ ...prev, internalNotes: value }))}
                rows={5}
              />


              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setNotesEditor({ open: false, rowId: null, internalNotes: '', candidateNotes: '' })
                  }
                  className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  ביטול
                </button>


                <button
                  type="button"
                  onClick={saveNotesEditor}
                  className="inline-flex h-10 items-center rounded-xl bg-[#008080] px-4 text-[13px] font-semibold text-white shadow-sm transition hover:opacity-95"
                >
                  שמור
                </button>
              </div>
            </div>
          </Modal>
        )}


        {manualCreate.open && (
          <Modal onClose={() => setManualCreate((prev) => ({ ...prev, open: false }))}>
            <div className="space-y-4">
              <div>
                <h3 className="text-[22px] font-bold text-[#0F172A]">יצירת הגשה ידנית</h3>
                <p className="mt-1 text-[13px] font-medium text-slate-500">
                  חסימת כפילות לפי קוד משרה + טלפון מנורמל
                </p>
              </div>


              <FormRow>
                <FieldBlock label="מועמד">
                  <select
                    dir="rtl"
                    value={String(manualCreate.candidateId)}
                    onChange={(event) =>
                      setManualCreate((prev) => ({
                        ...prev,
                        candidateId: event.target.value ? Number(event.target.value) : '',
                      }))
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-medium text-[#0F172A] outline-none focus:border-[#008080] focus:ring-2 focus:ring-[#008080]/10"
                  >
                    <option value="">בחר מועמד</option>
                    {candidateOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </FieldBlock>


                <FieldBlock label="משרה">
                  <select
                    dir="rtl"
                    value={manualCreate.jobCode}
                    onChange={(event) =>
                      setManualCreate((prev) => ({
                        ...prev,
                        jobCode: event.target.value,
                      }))
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-medium text-[#0F172A] outline-none focus:border-[#008080] focus:ring-2 focus:ring-[#008080]/10"
                  >
                    <option value="">בחר משרה</option>
                    {jobOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </FieldBlock>
              </FormRow>


              <FormRow>
                <FieldBlock label="סטטוס הגשה">
                  <select
                    dir="rtl"
                    value={String(manualCreate.applicationStatus)}
                    onChange={(event) =>
                      setManualCreate((prev) => ({
                        ...prev,
                        applicationStatus: event.target.value ? Number(event.target.value) : '',
                      }))
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-medium text-[#0F172A] outline-none focus:border-[#008080] focus:ring-2 focus:ring-[#008080]/10"
                  >
                    <option value="">בחר סטטוס</option>
                    {applicationStatuses.map((item: { id: number; name: string }) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </FieldBlock>


                <FieldBlock label="סטטוס בדיקה">
                  <select
                    dir="rtl"
                    value={String(manualCreate.checkStatus)}
                    onChange={(event) =>
                      setManualCreate((prev) => ({
                        ...prev,
                        checkStatus: event.target.value ? Number(event.target.value) : '',
                      }))
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-medium text-[#0F172A] outline-none focus:border-[#008080] focus:ring-2 focus:ring-[#008080]/10"
                  >
                    <option value="">בחר סטטוס בדיקה</option>
                    {checkStatuses.map((item: { id: number; name: string }) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </FieldBlock>
              </FormRow>


              <FieldBlock label="מקור">
                <select
                  dir="rtl"
                  value={String(manualCreate.source)}
                  onChange={(event) =>
                    setManualCreate((prev) => ({
                      ...prev,
                      source: event.target.value ? Number(event.target.value) : '',
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-medium text-[#0F172A] outline-none focus:border-[#008080] focus:ring-2 focus:ring-[#008080]/10"
                >
                  <option value="">בחר מקור</option>
                  {sources.map((item: { id: number; name: string }) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </FieldBlock>


              <TextAreaField
                label="הערות"
                value={manualCreate.notes}
                onChange={(value) => setManualCreate((prev) => ({ ...prev, notes: value }))}
                rows={4}
              />


              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setManualCreate((prev) => ({ ...prev, open: false }))}
                  className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  ביטול
                </button>


                <button
                  type="button"
                  onClick={submitManualCreate}
                  className="inline-flex h-10 items-center rounded-xl bg-[#008080] px-4 text-[13px] font-semibold text-white shadow-sm transition hover:opacity-95"
                >
                  צור הגשה
                </button>
              </div>
            </div>
          </Modal>
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


function KpiCard({
  label,
  value,
  hint,
  tone,
  onClick,
}: {
  label: string
  value: number
  hint: string
  tone: 'default' | 'warning' | 'success' | 'danger' | 'accent' | 'muted'
  onClick?: () => void
}) {
  const toneClass =
    tone === 'warning'
      ? 'border-[#FDE68A] bg-[#FFFBEB]'
      : tone === 'success'
        ? 'border-[#BBF7D0] bg-[#F0FDF4]'
        : tone === 'danger'
          ? 'border-[#FECACA] bg-[#FEF2F2]'
          : tone === 'accent'
            ? 'border-[#FED7AA] bg-[#FFF7ED]'
            : tone === 'muted'
              ? 'border-slate-200 bg-white'
              : 'border-slate-200 bg-white'


  const valueClass =
    tone === 'warning'
      ? 'text-[#B45309]'
      : tone === 'success'
        ? 'text-[#15803D]'
        : tone === 'danger'
          ? 'text-[#B91C1C]'
          : tone === 'accent'
            ? 'text-[#D97706]'
            : 'text-[#008080]'


  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-right shadow-sm transition hover:shadow-md ${toneClass}`}
    >
      <div className="text-[12px] font-semibold text-slate-500">{label}</div>
      <div className={`mt-2 text-[24px] font-bold ${valueClass}`}>{value}</div>
      <div className="mt-1 text-[12px] font-medium text-slate-500">{hint}</div>
    </button>
  )
}


function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${
        active
          ? 'bg-[#FFF7ED] text-[#D97706]'
          : 'bg-[#F8FAFC] text-slate-600 hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  )
}


function InfoPill({
  label,
  tone = 'default',
}: {
  label: string
  tone?: 'default' | 'warning'
}) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-[12px] font-semibold ${
        tone === 'warning' ? 'bg-[#FFFBEB] text-[#D97706]' : 'bg-[#F8FAFC] text-slate-600'
      }`}
    >
      {label}
    </span>
  )
}


function DateField({
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
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-medium text-[#0F172A] outline-none focus:border-[#008080] focus:ring-2 focus:ring-[#008080]/10"
      />
    </label>
  )
}


function InlineSignal({
  children,
  tone,
}: {
  children: React.ReactNode
  tone: 'warning' | 'danger' | 'muted' | 'success'
}) {
  const style =
    tone === 'warning'
      ? 'bg-[#FFFBEB] text-[#D97706]'
      : tone === 'danger'
        ? 'bg-[#FEF2F2] text-[#DC2626]'
        : tone === 'success'
          ? 'bg-[#F0FDF4] text-[#16A34A]'
          : 'bg-[#F8FAFC] text-slate-500'


  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${style}`}>{children}</span>
}


function IconAction({
  title,
  onClick,
  icon,
  asLink,
  href,
  disabled = false,
}: {
  title: string
  onClick: () => void
  icon: React.ReactNode
  asLink?: string
  href?: string
  disabled?: boolean
}) {
  const className = `inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition ${
    disabled ? 'cursor-not-allowed opacity-40' : 'hover:bg-slate-50'
  }`


  if (asLink && !disabled) {
    return (
      <Link to={asLink} className={className} title={title} aria-label={title}>
        {icon}
      </Link>
    )
  }


  if (href && !disabled) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={className}
        title={title}
        aria-label={title}
      >
        {icon}
      </a>
    )
  }


  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      className={className}
      title={title}
      aria-label={title}
      disabled={disabled}
    >
      {icon}
    </button>
  )
}


function GridInfoRow({
  label,
  value,
  mono = false,
  valueTone,
}: {
  label: string
  value: string
  mono?: boolean
  valueTone?: 'warning' | 'success'
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12px] font-semibold text-slate-500">{label}</span>
      <span
        className={`text-[13px] font-semibold ${
          mono ? 'font-mono' : ''
        } ${valueTone === 'warning' ? 'text-[#D97706]' : valueTone === 'success' ? 'text-[#16A34A]' : 'text-[#0F172A]'}`}
      >
        {value}
      </span>
    </div>
  )
}


function SideSheet({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-[60] flex justify-start">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <aside className="relative z-10 h-full w-full max-w-[560px] overflow-y-auto border-l border-slate-200 bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur-sm">
          <div>
            <h3 className="text-[24px] font-bold text-[#0F172A]">{title}</h3>
            <p className="mt-1 text-[13px] font-medium text-slate-500">צפייה ופעולה בלי לצאת מהמסך</p>
          </div>


          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
            aria-label="סגור"
            title="סגור"
          >
            <X className="h-5 w-5" />
          </button>
        </div>


        <div className="p-5">{children}</div>
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
      <h4 className="mb-4 text-[16px] font-bold text-[#0F172A]">{title}</h4>
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
        <div key={`${item.label}-${index}`} className="rounded-xl bg-[#F8FAFC] p-3">
          <div className="text-[12px] font-semibold text-slate-500">{item.label}</div>
          <div className="mt-1 text-[13px] font-semibold text-[#0F172A]">{item.value ?? '—'}</div>
        </div>
      ))}
    </div>
  )
}


function QuickActionRow({
  label,
  value,
  action,
}: {
  label: string
  value: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#F8FAFC] p-3">
      <div>
        <div className="text-[12px] font-semibold text-slate-500">{label}</div>
        <div className="mt-1 text-[13px] font-semibold text-[#0F172A]">{value}</div>
      </div>
      {action}
    </div>
  )
}


function NotesPreview({
  title,
  value,
}: {
  title: string
  value: string
}) {
  return (
    <div className="rounded-xl bg-[#F8FAFC] p-3">
      <div className="text-[12px] font-semibold text-slate-500">{title}</div>
      <div className="mt-1 whitespace-pre-wrap text-[13px] font-medium text-[#0F172A]">{value}</div>
    </div>
  )
}


function Modal({
  onClose,
  children,
}: {
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[760px] rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute left-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
          aria-label="סגור"
          title="סגור"
        >
          <X className="h-5 w-5" />
        </button>
        {children}
      </div>
    </div>
  )
}


function FormRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
}


function FieldBlock({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <div className="mb-1 text-[12px] font-semibold text-slate-500">{label}</div>
      {children}
    </label>
  )
}


function TextAreaField({
  label,
  value,
  onChange,
  rows,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  rows: number
}) {
  return (
    <label className="block">
      <div className="mb-1 text-[12px] font-semibold text-slate-500">{label}</div>
      <textarea
        dir="rtl"
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-[13px] font-medium text-[#0F172A] outline-none focus:border-[#008080] focus:ring-2 focus:ring-[#008080]/10"
      />
    </label>
  )
}


function ErrorStateCard({
  title,
  description,
  onRetry,
}: {
  title: string
  description: string
  onRetry: () => void
}) {
  return (
    <div className="rounded-2xl border border-[#FECACA] bg-white p-8 shadow-sm">
      <div className="mx-auto max-w-[520px] text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FEF2F2] text-[#DC2626]">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-[22px] font-bold text-[#0F172A]">{title}</h3>
        <p className="mt-2 text-[14px] font-medium text-slate-500">{description}</p>
        <div className="mt-5">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-11 items-center rounded-xl bg-[#008080] px-4 text-[13px] font-semibold text-white shadow-sm transition hover:opacity-95"
          >
            נסה שוב
          </button>
        </div>
      </div>
    </div>
  )
}


function normalizeSearchText(value: string) {
  return String(value ?? '').trim().toLowerCase()
}


function normalizeDigits(value: string) {
  return String(value ?? '').replace(/\D/g, '')
}


function isDateOnOrAfter(value?: string | null, limit?: string) {
  if (!value || !limit) return false
  const left = new Date(value).getTime()
  const right = new Date(limit).getTime()
  if (Number.isNaN(left) || Number.isNaN(right)) return false
  return left >= right
}


function isDateOnOrBefore(value?: string | null, limit?: string) {
  if (!value || !limit) return false
  const left = new Date(value).getTime()
  const right = new Date(limit).getTime() + 24 * 60 * 60 * 1000 - 1
  if (Number.isNaN(left) || Number.isNaN(right)) return false
  return left <= right
}


function isOlderThanDays(value?: string | null, days = 7) {
  if (!value) return false
  const timestamp = new Date(value).getTime()
  if (Number.isNaN(timestamp)) return false
  return timestamp < Date.now() - days * 24 * 60 * 60 * 1000
}


function getApplicationStatusName(
  id: number | null | undefined,
  dict: Array<{ id: number; name: string }>,
) {
  return dict.find((item) => Number(item.id) === Number(id))?.name ?? '—'
}


function getCheckStatusName(
  id: number | null | undefined,
  dict: Array<{ id: number; name: string }>,
) {
  return dict.find((item) => Number(item.id) === Number(id))?.name ?? '—'
}


function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const raw = row[header] ?? ''
          const safe = String(raw).replace(/"/g, '""')
          return `"${safe}"`
        })
        .join(','),
    ),
  ]
  return lines.join('\n')
}


function formatPhoneLike(value: string) {
  if (!value || value === '—') return '—'
  return value
}



