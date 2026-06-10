import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Briefcase,
  Plus,
  RefreshCw,
  Download,
  Columns3,
  Eye,
  Edit2,
  Copy,
  Archive,
  Sparkles,
  Send,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  X,
  MapPin,
  Building2,
  Users,
  CalendarDays,
  Clock3,
  CheckCircle2,
  AlertTriangle,
  MessageCircle,
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
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { jobStatusColors, getStatusBadge } from '@/lib/statusColors'
import { formatDate } from '@/lib/timeAgo'
import type { Job, JobFilters, DictItem } from '@/types'


const ALL_JOB_COLUMNS = [
  { key: 'job_code',           label: 'קוד משרה' },
  { key: 'job_title',          label: 'כותרת' },
  { key: 'job_role',           label: 'תפקיד' },
  { key: 'job_sub_role',       label: 'תת־תפקיד' },
  { key: 'account_name',       label: 'ארגון' },
  { key: 'region_id',          label: 'אזור' },
  { key: 'city_id',            label: 'עיר' },
  { key: 'scope',              label: 'היקף' },
  { key: 'job_status',         label: 'סטטוס' },
  { key: 'total_applicants',   label: 'מועמדים' },
  { key: 'last_publish_date',  label: 'פרסום אחרון' },
  { key: 'created_time',       label: 'נוצרה' },
  { key: 'days_live',          label: 'ימים באוויר' },
] as const

const DEFAULT_JOB_COLUMNS = [
  'job_code', 'job_title', 'job_role', 'account_name',
  'region_id', 'city_id', 'scope', 'job_status',
  'total_applicants', 'last_publish_date', 'created_time', 'days_live',
] as const


type ExtendedJobFilters = JobFilters & {
  account_link?: number
  city_id?: number
  scope?: string
  required_experience?: number
  applicants_state?: 'with' | 'without'
  publish_state?: 'published' | 'not_published'
  job_sub_role?: string
}


type ToastTone = 'success' | 'error' | 'info'


type ToastState = {
  open: boolean
  message: string
  tone: ToastTone
}


type QuickSheetState = {
  open: boolean
  jobCode: string | null
}


type JobDraft = {
  job_title: string
  job_status: number | null
  job_role: number | null
  job_sub_role: number | null
  scope: number | null
  required_experience: number | null
  region_id: number | null
  city_id: number | null
  address: string
  salary_range: string
  job_description: string
  job_requirements: string
  job_url: string
  notes: string
  account_link: number | null
}

const EMPTY_JOB_DRAFT: JobDraft = {
  job_title: '', job_status: null, job_role: null, job_sub_role: null,
  scope: null, required_experience: null, region_id: null, city_id: null,
  address: '', salary_range: '', job_description: '', job_requirements: '',
  job_url: '', notes: '', account_link: null,
}


const PAGE_SIZE = 20


const STATUS_IDS = {
  draft: 1,
  waitingApproval: 2,
  active: 3,
  hold: 4,
  closed: 5,
  filled: 6,
  published: 7,
  cancelled: 8,
  archived: 9,
}


const ACTIVE_STATUS_IDS = [STATUS_IDS.active, STATUS_IDS.published]
const CLOSED_OR_FILLED_STATUS_IDS = [STATUS_IDS.closed, STATUS_IDS.filled]
const STALE_DAYS_THRESHOLD = 45
const MANY_APPLICANTS_THRESHOLD = 10


export default function AdminJobsPage() {
  const [filters, setFilters] = useState<ExtendedJobFilters>({})
  const [page, setPage] = useState(0)
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [quickSheet, setQuickSheet] = useState<QuickSheetState>({ open: false, jobCode: null })
  const [toast, setToast] = useState<ToastState>({ open: false, message: '', tone: 'info' })
  const [rowActionPending, setRowActionPending] = useState<string | null>(null)
  const [bulkPending, setBulkPending] = useState(false)
  const [localJobs, setLocalJobs] = useState<any[]>([])
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [visibleColumns, setVisibleColumns] = useState<string[]>([...DEFAULT_JOB_COLUMNS])
  const [colWidths, setColWidths] = useState<Record<string, number>>({})
  const [editOpen, setEditOpen] = useState(false)
  const [editJobCode, setEditJobCode] = useState<string | null>(null)
  const [jobDraft, setJobDraft] = useState<JobDraft>(EMPTY_JOB_DRAFT)
  const [savingEdit, setSavingEdit] = useState(false)

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]
    )
  }

  const handleResizeStart = (e: React.MouseEvent, key: string) => {
    const startX = e.clientX
    const startWidth = colWidths[key] ?? (e.currentTarget.parentElement as HTMLElement)?.offsetWidth ?? 150
    const onMove = (me: MouseEvent) => {
      const newWidth = Math.max(80, startWidth + (me.clientX - startX))
      setColWidths((prev) => ({ ...prev, [key]: newWidth }))
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  // ── Supabase queries ────────────────────────────────────────────────
  const fetchDict = async (table: string): Promise<DictItem[]> => {
    const { data, error } = await supabase.from(table).select('id,name').order('id')
    if (error) throw error
    return (data ?? []) as DictItem[]
  }

  const { data: allJobs = [] } = useQuery<Job[]>({
    queryKey: ['jobs'],
    queryFn: async () => {
      const PAGE = 1000
      const all: Job[] = []
      let from = 0
      while (true) {
        const { data, error } = await supabase
          .from('job')
          .select('*')
          .order('job_code')
          .range(from, from + PAGE - 1)
        if (error) throw error
        const batch = (data ?? []) as Job[]
        if (!batch.length) break
        all.push(...batch)
        if (batch.length < PAGE) break
        from += PAGE
      }
      return all
    },
    staleTime: 60_000,
  })

  const { data: accountsMap = new Map<number, string>() } = useQuery<Map<number, string>>({
    queryKey: ['accounts-name-map'],
    queryFn: async () => {
      const { data } = await supabase.from('accounts').select('account_id,account_name')
      const map = new Map<number, string>()
      ;(data ?? []).forEach((a: any) => map.set(Number(a.account_id), String(a.account_name ?? '')))
      return map
    },
    staleTime: 300_000,
  })

  const { data: jobStatuses = [] } = useQuery<DictItem[]>({ queryKey: ['dict_job_statuses'], queryFn: () => fetchDict('dict_job_statuses'), staleTime: 600_000 })
  const { data: roles = [] } = useQuery<DictItem[]>({ queryKey: ['dict_roles'], queryFn: () => fetchDict('dict_roles'), staleTime: 600_000 })
  const { data: scopes = [] } = useQuery<DictItem[]>({ queryKey: ['dict_scopes'], queryFn: () => fetchDict('dict_scopes'), staleTime: 600_000 })
  const { data: subRoles = [] } = useQuery<DictItem[]>({ queryKey: ['dict_sub_roles'], queryFn: () => fetchDict('dict_sub_roles'), staleTime: 600_000 })
  const { data: regions = [] } = useQuery<DictItem[]>({ queryKey: ['dict_regions'], queryFn: () => fetchDict('dict_regions'), staleTime: 600_000 })
  const { data: cities = [] } = useQuery<Array<DictItem & { region_id: number | null }>>({
    queryKey: ['dict_cities'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_cities').select('id,name,region_id').order('id')
      if (error) throw error
      return (data ?? []) as Array<DictItem & { region_id: number | null }>
    },
    staleTime: 600_000,
  })
  const { data: experienceOptions = [] } = useQuery<DictItem[]>({ queryKey: ['dict_experience'], queryFn: () => fetchDict('dict_experience'), staleTime: 600_000 })
  const { data: accountsList = [] } = useQuery<Array<{ account_id: number; account_name: string | null }>>({
    queryKey: ['accounts-list-for-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('accounts').select('account_id,account_name').order('account_name')
      if (error) throw error
      return (data ?? []) as Array<{ account_id: number; account_name: string | null }>
    },
    staleTime: 300_000,
  })
  // ────────────────────────────────────────────────────────────────────

  // Join account_name from accounts map
  const allJobsWithAccount = useMemo(
    () => allJobs.map(j => ({
      ...j,
      account_name: j.account_link ? accountsMap.get(j.account_link) ?? null : null,
    })),
    [allJobs, accountsMap],
  )

  useEffect(() => {
    setLocalJobs(allJobsWithAccount)
  }, [allJobsWithAccount])


  useEffect(() => {
    setPage(0)
  }, [filters])


  useEffect(() => {
    if (!toast.open) return
    const timer = window.setTimeout(() => {
      setToast((prev) => ({ ...prev, open: false }))
    }, 2600)
    return () => window.clearTimeout(timer)
  }, [toast.open])


  const roleName = (id: number | null | undefined) => roles.find((item) => item.id === id)?.name ?? '—'
  const regionName = (id: number | null | undefined) => regions.find((item) => item.id === id)?.name ?? '—'
  const cityName = (id: number | null | undefined) => cities.find((item) => item.id === id)?.name ?? '—'
  const experienceName = (id: number | null | undefined) => experienceOptions.find((item) => item.id === id)?.name ?? '—'
  const statusName = (id: number | null | undefined) => jobStatuses.find((item) => item.id === id)?.name ?? '—'
  const scopeName = (id: number | null | undefined) => scopes.find((item) => item.id === id)?.name ?? '—'
  const subRoleName = (id: number | null | undefined) => subRoles.find((item) => item.id === id)?.name ?? '—'


  const accountOptions = useMemo(() => {
    const map = new Map<number, string>()
    localJobs.forEach((job) => {
      if (job.account_link && job.account_name) {
        map.set(Number(job.account_link), String(job.account_name))
      }
    })
    return Array.from(map.entries()).map(([value, label]) => ({ value: String(value), label }))
  }, [localJobs])


  const subRoleOptions = useMemo(
    () => subRoles.map((s) => ({ value: String(s.id), label: s.name })),
    [subRoles],
  )


  const activeCityOptions = useMemo(() => {
    if (!filters.region_id) return cities.map((city) => ({ value: String(city.id), label: city.name }))
    return cities
      .filter((city) => Number(city.region_id) === Number(filters.region_id))
      .map((city) => ({ value: String(city.id), label: city.name }))
  }, [cities, filters.region_id])


  const filteredJobs = useMemo(() => {
    const result = localJobs.filter((job) => {
      const search = String(filters.search ?? '').trim().toLowerCase()
      const jobCode = String(job.job_code ?? '').toLowerCase()
      const jobTitle = String(job.job_title ?? '').toLowerCase()
      const accountName = String(job.account_name ?? '').toLowerCase()


      if (search && !jobCode.includes(search) && !jobTitle.includes(search) && !accountName.includes(search)) {
        return false
      }


      if (filters.job_status && Number(job.job_status) !== Number(filters.job_status)) return false
      if (filters.job_role && Number(job.job_role) !== Number(filters.job_role)) return false
      if (filters.region_id && Number(job.region_id) !== Number(filters.region_id)) return false
      if (filters.account_link && Number(job.account_link) !== Number(filters.account_link)) return false
      if (filters.city_id && Number(job.city_id) !== Number(filters.city_id)) return false
      if (filters.scope && Number(job.scope ?? 0) !== Number(filters.scope)) return false
      if (filters.required_experience && Number(job.required_experience) !== Number(filters.required_experience)) return false
      if (filters.job_sub_role && Number(job.job_sub_role ?? 0) !== Number(filters.job_sub_role)) return false


      if (filters.applicants_state === 'with' && Number(job.total_applicants ?? 0) <= 0) return false
      if (filters.applicants_state === 'without' && Number(job.total_applicants ?? 0) > 0) return false


      const published = isPublished(job)
      if (filters.publish_state === 'published' && !published) return false
      if (filters.publish_state === 'not_published' && published) return false


      return true
    })
    if (sortField) {
      result.sort((a, b) => {
        const av = String(a[sortField] ?? '')
        const bv = String(b[sortField] ?? '')
        return sortDir === 'asc' ? av.localeCompare(bv, 'he') : bv.localeCompare(av, 'he')
      })
    }
    return result
  }, [filters, localJobs, sortField, sortDir])


  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / PAGE_SIZE))
  const pageData = filteredJobs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)


  const selectedJobs = filteredJobs.filter((job) => selectedRows.includes(String(job.job_code)))
  const selectedJob = localJobs.find((job) => String(job.job_code) === quickSheet.jobCode) ?? null


  const kpis = useMemo(() => {
    const active = filteredJobs.filter((job) => ACTIVE_STATUS_IDS.includes(Number(job.job_status))).length
    const recent = filteredJobs.filter((job) => isWithinLastDays(job.created_time, 30)).length
    const withoutApplicants = filteredJobs.filter((job) => Number(job.total_applicants ?? 0) === 0).length
    const closedOrFilled = filteredJobs.filter((job) => CLOSED_OR_FILLED_STATUS_IDS.includes(Number(job.job_status))).length
    const stale = filteredJobs.filter((job) => getDaysLive(job) >= STALE_DAYS_THRESHOLD).length
    const manyApplicants = filteredJobs.filter((job) => Number(job.total_applicants ?? 0) >= MANY_APPLICANTS_THRESHOLD).length
    const notPublished = filteredJobs.filter((job) => !isPublished(job)).length


    return {
      active,
      recent,
      withoutApplicants,
      closedOrFilled,
      stale,
      manyApplicants,
      notPublished,
    }
  }, [filteredJobs])


  const showToast = (message: string, tone: ToastTone = 'info') => {
    setToast({ open: true, message, tone })
  }


  const clearFilters = () => {
    setFilters({})
    setSelectedRows([])
  }


  const toggleRowSelection = (jobCode: string) => {
    setSelectedRows((prev) =>
      prev.includes(jobCode) ? prev.filter((item) => item !== jobCode) : [...prev, jobCode],
    )
  }


  const togglePageSelection = () => {
    const currentPageIds = pageData.map((job) => String(job.job_code))
    const allSelected = currentPageIds.length > 0 && currentPageIds.every((id) => selectedRows.includes(id))


    if (allSelected) {
      setSelectedRows((prev) => prev.filter((item) => !currentPageIds.includes(item)))
      return
    }


    setSelectedRows((prev) => Array.from(new Set([...prev, ...currentPageIds])))
  }


  const openEditSheet = (job: any) => {
    setEditJobCode(String(job.job_code))
    setJobDraft({
      job_title: job.job_title ?? '',
      job_status: job.job_status ?? null,
      job_role: job.job_role ?? null,
      job_sub_role: job.job_sub_role ?? null,
      scope: job.scope ?? null,
      required_experience: job.required_experience ?? null,
      region_id: job.region_id ?? null,
      city_id: job.city_id ?? null,
      address: job.address ?? '',
      salary_range: job.salary_range ?? '',
      job_description: job.job_description ?? '',
      job_requirements: job.job_requirements ?? '',
      job_url: job.job_url ?? '',
      notes: job.notes ?? '',
      account_link: job.account_link ?? null,
    })
    setEditOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editJobCode) return
    setSavingEdit(true)
    try {
      const patch = {
        job_title: jobDraft.job_title.trim() || null,
        job_status: jobDraft.job_status,
        job_role: jobDraft.job_role,
        job_sub_role: jobDraft.job_sub_role,
        scope: jobDraft.scope,
        required_experience: jobDraft.required_experience,
        region_id: jobDraft.region_id,
        city_id: jobDraft.city_id,
        address: jobDraft.address.trim() || null,
        salary_range: jobDraft.salary_range.trim() || null,
        job_description: jobDraft.job_description.trim() || null,
        job_requirements: jobDraft.job_requirements.trim() || null,
        job_url: jobDraft.job_url.trim() || null,
        notes: jobDraft.notes.trim() || null,
        account_link: jobDraft.account_link,
        updated_timestamp: new Date().toISOString(),
      }
      const { error } = await supabase.from('job').update(patch).eq('job_code', editJobCode)
      if (error) throw error
      replaceJob(editJobCode, (cur: any) => ({ ...cur, ...patch }))
      setEditOpen(false)
      showToast('המשרה עודכנה בהצלחה', 'success')
    } catch {
      showToast('שגיאה בשמירה', 'error')
    } finally {
      setSavingEdit(false)
    }
  }

  const replaceJob = (jobCode: string, updater: (job: any) => any) => {
    setLocalJobs((prev) =>
      prev.map((job) => (String(job.job_code) === String(jobCode) ? updater(job) : job)),
    )
  }


  const performRowAction = async (jobCode: string, callback: () => void) => {
    try {
      setRowActionPending(jobCode)
      callback()
    } finally {
      setRowActionPending(null)
    }
  }


  const handlePublish = async (jobCode: string) => {
    const job = localJobs.find((item) => String(item.job_code) === String(jobCode))
    if (!job) return
    if (!canPublish(job)) {
      showToast('לא ניתן לפרסם משרה ללא שדות החובה המינימליים', 'error')
      return
    }
    setRowActionPending(jobCode)
    try {
      const patch = {
        job_status: STATUS_IDS.published,
        last_publish_date: todayIsoDate(),
        date_website: job.date_website ?? todayIsoDate(),
        updated_timestamp: new Date().toISOString(),
      }
      const { error } = await supabase.from('job').update(patch).eq('job_code', jobCode)
      if (error) throw error
      replaceJob(jobCode, (cur) => ({ ...cur, ...patch }))
      showToast('המשרה פורסמה בהצלחה', 'success')
    } catch {
      showToast('שגיאה בשמירה', 'error')
    } finally {
      setRowActionPending(null)
    }
  }

  const handleClose = async (jobCode: string) => {
    setRowActionPending(jobCode)
    try {
      const patch = { job_status: STATUS_IDS.closed, updated_timestamp: new Date().toISOString() }
      const { error } = await supabase.from('job').update(patch).eq('job_code', jobCode)
      if (error) throw error
      replaceJob(jobCode, (cur) => ({ ...cur, ...patch }))
      showToast('המשרה נסגרה', 'success')
    } catch {
      showToast('שגיאה בשמירה', 'error')
    } finally {
      setRowActionPending(null)
    }
  }

  const handleFill = async (jobCode: string) => {
    setRowActionPending(jobCode)
    try {
      const patch = { job_status: STATUS_IDS.filled, updated_timestamp: new Date().toISOString() }
      const { error } = await supabase.from('job').update(patch).eq('job_code', jobCode)
      if (error) throw error
      replaceJob(jobCode, (cur) => ({ ...cur, ...patch }))
      showToast('המשרה סומנה כמאוישת', 'success')
    } catch {
      showToast('שגיאה בשמירה', 'error')
    } finally {
      setRowActionPending(null)
    }
  }

  const handleArchive = async (jobCode: string) => {
    setRowActionPending(jobCode)
    try {
      const patch = { job_status: STATUS_IDS.archived, updated_timestamp: new Date().toISOString() }
      const { error } = await supabase.from('job').update(patch).eq('job_code', jobCode)
      if (error) throw error
      replaceJob(jobCode, (cur) => ({ ...cur, ...patch }))
      showToast('המשרה הועברה לארכיון', 'success')
    } catch {
      showToast('שגיאה בשמירה', 'error')
    } finally {
      setRowActionPending(null)
    }
  }

  const handleDuplicate = async (jobCode: string) => {
    const sourceJob = localJobs.find((item) => String(item.job_code) === String(jobCode))
    if (!sourceJob) return
    const nextCode = generateDuplicateCode(sourceJob.job_code, localJobs.map((item) => String(item.job_code)))
    setRowActionPending(jobCode)
    try {
      const newJob = {
        ...sourceJob,
        job_code: nextCode,
        job_status: STATUS_IDS.draft,
        total_applicants: 0,
        last_publish_date: null,
        date_facebook: null,
        date_website: null,
        date_whatsapp: null,
        created_time: new Date().toISOString(),
        updated_timestamp: new Date().toISOString(),
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { account_name: _an, ...dbJob } = newJob
      const { error } = await supabase.from('job').insert(dbJob)
      if (error) throw error
      setLocalJobs((prev) => [newJob, ...prev])
      showToast('המשרה שוכפלה בהצלחה', 'success')
    } catch {
      showToast('שגיאה בשכפול', 'error')
    } finally {
      setRowActionPending(null)
    }
  }


  const handleQuickStatusChange = (jobCode: string, nextStatus: number) => {
    const current = localJobs.find((job) => String(job.job_code) === String(jobCode))
    if (!current) return


    const allowed = getAllowedStatusTransitions(current.job_status).includes(Number(nextStatus))
    if (!allowed) {
      showToast('המעבר בין הסטטוסים אינו חוקי', 'error')
      return
    }


    replaceJob(jobCode, (job) => ({
      ...job,
      job_status: nextStatus,
      updated_timestamp: new Date().toISOString(),
    }))


    showToast(`הסטטוס עודכן ל־${statusName(nextStatus)}`, 'success')
  }


  const handleBulkArchive = async () => {
    if (!selectedRows.length) {
      showToast('יש לבחור לפחות משרה אחת', 'error')
      return
    }


    try {
      setBulkPending(true)
      setLocalJobs((prev) =>
        prev.map((job) =>
          selectedRows.includes(String(job.job_code))
            ? { ...job, job_status: STATUS_IDS.archived, updated_timestamp: new Date().toISOString() }
            : job,
        ),
      )
      showToast(`הועברו לארכיון ${selectedRows.length} משרות`, 'success')
      setSelectedRows([])
    } finally {
      setBulkPending(false)
    }
  }


  const handleBulkPublish = async () => {
    if (!selectedRows.length) {
      showToast('יש לבחור לפחות משרה אחת', 'error')
      return
    }


    const publishable = selectedJobs.filter((job) => canPublish(job))
    if (!publishable.length) {
      showToast('לא נמצאו משרות תקינות לפרסום', 'error')
      return
    }


    try {
      setBulkPending(true)
      setLocalJobs((prev) =>
        prev.map((job) =>
          selectedRows.includes(String(job.job_code)) && canPublish(job)
            ? {
                ...job,
                job_status: STATUS_IDS.published,
                last_publish_date: todayIsoDate(),
                date_website: job.date_website ?? todayIsoDate(),
                updated_timestamp: new Date().toISOString(),
              }
            : job,
        ),
      )
      showToast(`פורסמו ${publishable.length} משרות`, 'success')
      setSelectedRows([])
    } finally {
      setBulkPending(false)
    }
  }


  const handleBulkStatusChange = async (nextStatus: number) => {
    if (!selectedRows.length) {
      showToast('יש לבחור לפחות משרה אחת', 'error')
      return
    }


    try {
      setBulkPending(true)
      setLocalJobs((prev) =>
        prev.map((job) =>
          selectedRows.includes(String(job.job_code)) &&
          getAllowedStatusTransitions(job.job_status).includes(Number(nextStatus))
            ? { ...job, job_status: Number(nextStatus), updated_timestamp: new Date().toISOString() }
            : job,
        ),
      )
      showToast(`עודכן סטטוס עבור משרות נבחרות`, 'success')
      setSelectedRows([])
    } finally {
      setBulkPending(false)
    }
  }


  const handleExportCsv = () => {
    const rows = filteredJobs.map((job) => ({
      'קוד משרה': job.job_code ?? '',
      כותרת: job.job_title ?? '',
      תפקיד: roleName(job.job_role),
      'תת־תפקיד': subRoleName(job.job_sub_role),
      ארגון: job.account_name ?? '',
      'אזור / עיר': `${regionName(job.region_id)} / ${cityName(job.city_id)}`,
      היקף: scopeName(job.scope),
      סטטוס: statusName(job.job_status),
      מועמדים: Number(job.total_applicants ?? 0),
      'פרסום אחרון': job.last_publish_date ?? '',
      'תאריך יצירה': job.created_time ? formatDate(job.created_time) : '',
      'ימים באוויר': getDaysLive(job),
      שכר: job.salary_range ?? '',
      'ניסיון נדרש': experienceName(job.required_experience),
    }))


    const csv = buildCsv(rows)
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'admin-jobs-export.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    showToast('הייצוא הושלם בהצלחה', 'success')
  }


  return (
    <Shell
      title="משרות"
      subtitle={`ניהול כלל המשרות והסטטוסים במערכת • ${filteredJobs.length} תוצאות`}
      icon={Briefcase}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <details className="relative">
            <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50">
              <Columns3 className="h-4 w-4" />
              בחירת עמודות
            </summary>
            <div className="absolute left-0 top-full z-30 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-md">
              <div className="mb-3 text-[13px] font-bold text-slate-900">בחירת עמודות</div>
              <div className="grid gap-2">
                {ALL_JOB_COLUMNS.map((col) => (
                  <label key={col.key} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-[13px]">
                    <span>{col.label}</span>
                    <input
                      type="checkbox"
                      checked={visibleColumns.includes(col.key)}
                      onChange={() => toggleColumn(col.key)}
                      className="h-4 w-4 rounded border-slate-300 text-[#008080] focus:ring-[#008080]"
                    />
                  </label>
                ))}
              </div>
            </div>
          </details>
          <ActionButton variant="ghost" icon={RefreshCw} onClick={() => showToast('הרשימה רועננה', 'success')}>
            רענון
          </ActionButton>
          <ActionButton variant="ghost" icon={Download} onClick={handleExportCsv}>
            ייצוא
          </ActionButton>
          <Link to="/admin/jobs/new">
            <ActionButton variant="primary" icon={Plus}>
              משרה חדשה
            </ActionButton>
          </Link>
        </div>
      }
    >
      <div dir="rtl" className="min-h-screen bg-[#F8FAFC] font-['Heebo'] text-[#0F172A]">
        <div className="space-y-6">
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
            <KpiCard
              label="משרות פעילות"
              value={kpis.active}
              hint="פעילה או פורסמה"
              onClick={() => setFilters((prev) => ({ ...prev, job_status: STATUS_IDS.active }))}
            />
            <KpiCard
              label="משרות חדשות"
              value={kpis.recent}
              hint="נפתחו ב־30 יום"
              onClick={() => showToast('המונה מחושב לפי 30 הימים האחרונים', 'info')}
            />
            <KpiCard
              label="ללא מועמדים"
              value={kpis.withoutApplicants}
              hint="דורש פעולה"
              tone="warning"
              onClick={() => setFilters((prev) => ({ ...prev, applicants_state: 'without' }))}
            />
            <KpiCard
              label="סגורות / מאוישות"
              value={kpis.closedOrFilled}
              hint="סטטוס סופי"
              tone="success"
              onClick={() => showToast('מונה משרות בסטטוס סגור או אויש', 'info')}
            />
            <KpiCard
              label="משרות ותיקות"
              value={kpis.stale}
              hint={`מעל ${STALE_DAYS_THRESHOLD} ימים`}
              tone="warning"
              onClick={() => showToast('משרות ותיקות מסומנות גם בטבלה', 'info')}
            />
            <KpiCard
              label="עם הרבה מועמדים"
              value={kpis.manyApplicants}
              hint={`מעל ${MANY_APPLICANTS_THRESHOLD} מועמדים`}
              tone="default"
              onClick={() => setFilters((prev) => ({ ...prev, applicants_state: 'with' }))}
            />
            <KpiCard
              label="לא מפורסמות"
              value={kpis.notPublished}
              hint="ללא תאריך הפצה"
              tone="warning"
              onClick={() => setFilters((prev) => ({ ...prev, publish_state: 'not_published' }))}
            />
          </section>


          <Toolbar>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#F0FDFC] text-[#008080]">
                  <Briefcase className="h-4 w-4" />
                </div>
                <h2 className="text-[15px] font-bold text-[#0F172A]">חיפוש וסינון</h2>
                <span className="rounded-full bg-[#F8FAFC] px-2.5 py-1 text-[12px] font-semibold text-slate-500">
                  מסך תפעולי צפוף אך קריא
                </span>
              </div>


              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
                <SearchBar
                  value={filters.search ?? ''}
                  onChange={(value) => setFilters((prev) => ({ ...prev, search: value }))}
                  placeholder="חיפוש לפי קוד משרה או כותרת"
                />


                <SelectFilter
                  value={String(filters.job_status ?? '')}
                  onChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      job_status: value ? Number(value) : undefined,
                    }))
                  }
                  options={jobStatuses.map((item) => ({ value: String(item.id), label: item.name }))}
                  placeholder="סטטוס"
                />


                <SelectFilter
                  value={String(filters.job_role ?? '')}
                  onChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      job_role: value ? Number(value) : undefined,
                    }))
                  }
                  options={roles.map((item) => ({ value: String(item.id), label: item.name }))}
                  placeholder="תפקיד"
                />


                <SelectFilter
                  value={String(filters.job_sub_role ?? '')}
                  onChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      job_sub_role: value || undefined,
                    }))
                  }
                  options={subRoleOptions}
                  placeholder="תת־תפקיד"
                />


                <SelectFilter
                  value={String(filters.region_id ?? '')}
                  onChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      region_id: value ? Number(value) : undefined,
                      city_id: undefined,
                    }))
                  }
                  options={regions.map((item) => ({ value: String(item.id), label: item.name }))}
                  placeholder="אזור"
                />


                <SelectFilter
                  value={String(filters.city_id ?? '')}
                  onChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      city_id: value ? Number(value) : undefined,
                    }))
                  }
                  options={activeCityOptions}
                  placeholder="עיר"
                />


                <SelectFilter
                  value={String(filters.account_link ?? '')}
                  onChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      account_link: value ? Number(value) : undefined,
                    }))
                  }
                  options={accountOptions}
                  placeholder="ארגון"
                />


                <SelectFilter
                  value={String(filters.scope ?? '')}
                  onChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      scope: value || undefined,
                    }))
                  }
                  options={scopes.map((item) => ({ value: item.name, label: item.name }))}
                  placeholder="היקף משרה"
                />


                <SelectFilter
                  value={String(filters.required_experience ?? '')}
                  onChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      required_experience: value ? Number(value) : undefined,
                    }))
                  }
                  options={experienceOptions.map((item) => ({ value: String(item.id), label: item.name }))}
                  placeholder="ניסיון נדרש"
                />


                <SelectFilter
                  value={String(filters.applicants_state ?? '')}
                  onChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      applicants_state: (value as 'with' | 'without') || undefined,
                    }))
                  }
                  options={[
                    { value: 'with', label: 'עם מועמדים' },
                    { value: 'without', label: 'ללא מועמדים' },
                  ]}
                  placeholder="מצב מועמדים"
                />


                <SelectFilter
                  value={String(filters.publish_state ?? '')}
                  onChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      publish_state: (value as 'published' | 'not_published') || undefined,
                    }))
                  }
                  options={[
                    { value: 'published', label: 'מפורסמות' },
                    { value: 'not_published', label: 'לא מפורסמות' },
                  ]}
                  placeholder="מצב פרסום"
                />
              </div>


              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <InfoPill label={`סה״כ תוצאות: ${filteredJobs.length}`} />
                  <InfoPill label={`ללא מועמדים: ${kpis.withoutApplicants}`} tone="warning" />
                  <InfoPill label={`לא מפורסמות: ${kpis.notPublished}`} tone="warning" />
                </div>


                <div className="flex flex-wrap gap-2">
                  {Object.values(filters).some(Boolean) && (
                    <ActionButton variant="ghost" onClick={clearFilters}>
                      נקה פילטרים
                    </ActionButton>
                  )}
                </div>
              </div>
            </div>
          </Toolbar>


          {selectedRows.length > 0 && (
            <Toolbar>
              <div className="rounded-2xl border border-[#D97706]/20 bg-[#FFFBEB] p-4 shadow-sm">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white px-3 py-1 text-[13px] font-bold text-[#D97706] shadow-sm">
                      נבחרו {selectedRows.length} משרות
                    </span>
                    <span className="text-[13px] font-medium text-slate-600">
                      פעולות מרובות על הרשומות המסומנות
                    </span>
                  </div>


                  <div className="flex flex-wrap gap-2">
                    <SmallActionButton onClick={handleBulkArchive} disabled={bulkPending}>
                      {bulkPending ? 'מעדכן...' : 'ארכוב'}
                    </SmallActionButton>


                    <SmallActionButton onClick={() => handleBulkPublish()} disabled={bulkPending}>
                      פרסום מרובה
                    </SmallActionButton>


                    <select
                      dir="rtl"
                      defaultValue=""
                      onChange={(event) => {
                        const nextStatus = Number(event.target.value)
                        if (!nextStatus) return
                        handleBulkStatusChange(nextStatus)
                        event.currentTarget.value = ''
                      }}
                      className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-medium text-[#0F172A] outline-none focus:border-[#008080] focus:ring-2 focus:ring-[#008080]/10"
                    >
                      <option value="">שינוי סטטוס מרובה</option>
                      {jobStatuses.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>


                    <SmallActionButton onClick={handleExportCsv}>ייצוא</SmallActionButton>
                  </div>
                </div>
              </div>
            </Toolbar>
          )}


          <Toolbar>
            {localJobs.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <EmptyState
                  icon={Briefcase}
                  title="אין משרות במערכת"
                  description="כאשר ייווצרו משרות הן יוצגו כאן במסך הניהול."
                />
              </div>
            ) : pageData.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <EmptyState
                  icon={Briefcase}
                  title="לא נמצאו תוצאות"
                  description="שנו את תנאי הסינון כדי לראות משרות רלוונטיות."
                />
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-[1900px] w-full border-collapse text-right">
                    <thead className="bg-[#F8FAFC]">
                      <tr className="border-b border-slate-200 text-[13px] font-semibold text-slate-500">
                        <th className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={pageData.length > 0 && pageData.every((job) => selectedRows.includes(String(job.job_code)))}
                            onChange={togglePageSelection}
                            className="h-4 w-4 rounded border-slate-300 text-[#008080] focus:ring-[#008080]"
                          />
                        </th>
                        {visibleColumns.includes('job_code') && <SortableTh label="קוד משרה" sortKey="job_code" sortBy={sortField} sortDir={sortDir} onSort={toggleSort} width={colWidths['job_code']} onResizeStart={handleResizeStart} />}
                        {visibleColumns.includes('job_title') && <SortableTh label="כותרת" sortKey="job_title" sortBy={sortField} sortDir={sortDir} onSort={toggleSort} width={colWidths['job_title']} onResizeStart={handleResizeStart} />}
                        {visibleColumns.includes('job_role') && <PlainJobTh label="תפקיד" colKey="job_role" width={colWidths['job_role']} onResizeStart={handleResizeStart} />}
                        {visibleColumns.includes('job_sub_role') && <PlainJobTh label="תת־תפקיד" colKey="job_sub_role" width={colWidths['job_sub_role']} onResizeStart={handleResizeStart} />}
                        {visibleColumns.includes('account_name') && <PlainJobTh label="ארגון" colKey="account_name" width={colWidths['account_name']} onResizeStart={handleResizeStart} />}
                        {visibleColumns.includes('region_id') && <SortableTh label="אזור" sortKey="region_id" sortBy={sortField} sortDir={sortDir} onSort={toggleSort} width={colWidths['region_id']} onResizeStart={handleResizeStart} />}
                        {visibleColumns.includes('city_id') && <PlainJobTh label="עיר" colKey="city_id" width={colWidths['city_id']} onResizeStart={handleResizeStart} />}
                        {visibleColumns.includes('scope') && <PlainJobTh label="היקף" colKey="scope" width={colWidths['scope']} onResizeStart={handleResizeStart} />}
                        {visibleColumns.includes('job_status') && <SortableTh label="סטטוס" sortKey="job_status" sortBy={sortField} sortDir={sortDir} onSort={toggleSort} width={colWidths['job_status']} onResizeStart={handleResizeStart} />}
                        {visibleColumns.includes('total_applicants') && <PlainJobTh label="מועמדים" colKey="total_applicants" width={colWidths['total_applicants']} onResizeStart={handleResizeStart} />}
                        {visibleColumns.includes('last_publish_date') && <PlainJobTh label="פרסום אחרון" colKey="last_publish_date" width={colWidths['last_publish_date']} onResizeStart={handleResizeStart} />}
                        {visibleColumns.includes('created_time') && <SortableTh label="נוצרה" sortKey="created_time" sortBy={sortField} sortDir={sortDir} onSort={toggleSort} width={colWidths['created_time']} onResizeStart={handleResizeStart} />}
                        {visibleColumns.includes('days_live') && <PlainJobTh label="ימים באוויר" colKey="days_live" width={colWidths['days_live']} onResizeStart={handleResizeStart} />}
                        <th className="px-4 py-3">פעולות</th>
                      </tr>
                    </thead>


                    <tbody className="divide-y divide-slate-100 bg-white">
                      {pageData.map((job) => {
                        const jobCode = String(job.job_code)
                        const status = getStatusBadge(jobStatusColors, job.job_status)
                        const selected = selectedRows.includes(jobCode)
                        const publishDisabled = !canPublish(job) || isPublished(job)
                        const fillDisabled = CLOSED_OR_FILLED_STATUS_IDS.includes(Number(job.job_status))
                        const stale = getDaysLive(job) >= STALE_DAYS_THRESHOLD
                        const noApplicants = Number(job.total_applicants ?? 0) === 0


                        return (
                          <tr
                            key={jobCode}
                            className={`text-[13px] font-medium text-[#0F172A] transition ${
                              selected ? 'bg-[#F0FDFC]' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleRowSelection(jobCode)}
                                className="h-4 w-4 rounded border-slate-300 text-[#008080] focus:ring-[#008080]"
                              />
                            </td>


                            {visibleColumns.includes('job_code') && (
                              <td className="px-4 py-3">
                                <div className="space-y-1">
                                  <Link
                                    to={`/jobs/${jobCode}`}
                                    className="font-mono text-[14px] font-bold text-[#008080] hover:underline"
                                  >
                                    {job.job_code}
                                  </Link>
                                  <div className="flex flex-wrap gap-1.5">
                                    {noApplicants && <MiniSignal tone="warning">ללא מועמדים</MiniSignal>}
                                    {stale && <MiniSignal tone="warning">משרה ותיקה</MiniSignal>}
                                    {!isPublished(job) && <MiniSignal tone="muted">לא פורסמה</MiniSignal>}
                                  </div>
                                </div>
                              </td>
                            )}
                            {visibleColumns.includes('job_title') && (
                              <td className="px-4 py-3">
                                <div className="max-w-[240px]">
                                  <div className="font-semibold text-[#0F172A]">{job.job_title ?? '—'}</div>
                                </div>
                              </td>
                            )}
                            {visibleColumns.includes('job_role') && <td className="px-4 py-3">{roleName(job.job_role)}</td>}
                            {visibleColumns.includes('job_sub_role') && (
                              <td className="px-4 py-3">
                                {job.job_sub_role ? (
                                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[12px] font-semibold text-slate-700">
                                    {subRoleName(job.job_sub_role)}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                            )}
                            {visibleColumns.includes('account_name') && (
                              <td className="px-4 py-3">
                                {job.account_link ? (
                                  <Link
                                    to={`/employers/${job.account_link}`}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 px-2.5 py-1 text-[12px] font-semibold text-[#008080] hover:bg-slate-100"
                                  >
                                    <Building2 className="h-3.5 w-3.5" />
                                    {job.account_name ?? '—'}
                                  </Link>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                            )}
                            {visibleColumns.includes('region_id') && <td className="px-4 py-3">{regionName(job.region_id)}</td>}
                            {visibleColumns.includes('city_id') && <td className="px-4 py-3">{cityName(job.city_id)}</td>}
                            {visibleColumns.includes('scope') && <td className="px-4 py-3">{scopeName(job.scope)}</td>}
                            {visibleColumns.includes('job_status') && (
                              <td className="px-4 py-3">
                                <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${status.bg} ${status.text}`}>
                                  {status.label}
                                </span>
                              </td>
                            )}
                            {visibleColumns.includes('total_applicants') && (
                              <td className="px-4 py-3">
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[12px] font-bold text-slate-700">
                                  {Number(job.total_applicants ?? 0)}
                                </span>
                              </td>
                            )}
                            {visibleColumns.includes('last_publish_date') && (
                              <td className="px-4 py-3">
                                {job.last_publish_date ? (
                                  <div className="space-y-1">
                                    <div>{formatDate(job.last_publish_date)}</div>
                                    <div className="text-[12px] text-slate-500">{distributionLabel(job)}</div>
                                  </div>
                                ) : (
                                  <span className="text-slate-400">לא פורסמה</span>
                                )}
                              </td>
                            )}
                            {visibleColumns.includes('created_time') && (
                              <td className="px-4 py-3">
                                {job.created_time ? formatDate(job.created_time) : '—'}
                              </td>
                            )}
                            {visibleColumns.includes('days_live') && (
                              <td className="px-4 py-3">
                                <div className="inline-flex items-center gap-1.5 rounded-full bg-[#F8FAFC] px-2.5 py-1 text-[12px] font-semibold text-slate-700">
                                  <Clock3 className="h-3.5 w-3.5" />
                                  {getDaysLive(job)}
                                </div>
                              </td>
                            )}


                            <td className="px-4 py-3">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <LinkIconButton to={`/jobs/${jobCode}`} title="פרטי משרה" icon={<Eye className="h-4 w-4" />} />
                                <IconButton title="עריכה" icon={<Edit2 className="h-4 w-4" />} onClick={() => openEditSheet(job)} />
                                <IconButton title="שכפול" icon={<Copy className="h-4 w-4" />} onClick={() => handleDuplicate(jobCode)} pending={rowActionPending === jobCode} />
                                <LinkIconButton to={`/smart-match?job=${jobCode}`} title="סמארט מאץ׳" icon={<Sparkles className="h-4 w-4" />} />
                                <LinkIconButton to={`/ats?job=${jobCode}`} title="ATS" icon={<Users className="h-4 w-4" />} />
                                <IconButton title="פרסום" icon={<Send className="h-4 w-4" />} onClick={() => handlePublish(jobCode)} disabled={publishDisabled} pending={rowActionPending === jobCode} />
                                <IconButton title="סגירה" icon={<X className="h-4 w-4" />} onClick={() => handleClose(jobCode)} pending={rowActionPending === jobCode} />
                                <IconButton title="אויש" icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => handleFill(jobCode)} disabled={fillDisabled} pending={rowActionPending === jobCode} />
                                <select
                                  dir="rtl"
                                  value=""
                                  onChange={(event) => {
                                    const nextStatus = Number(event.target.value)
                                    if (!nextStatus) return
                                    handleQuickStatusChange(jobCode, nextStatus)
                                  }}
                                  className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-[12px] font-medium text-[#0F172A] outline-none focus:border-[#008080] focus:ring-2 focus:ring-[#008080]/10"
                                >
                                  <option value="">סטטוס מהיר</option>
                                  {getAllowedStatusTransitions(job.job_status).map((statusId) => (
                                    <option key={statusId} value={statusId}>
                                      {statusName(statusId)}
                                    </option>
                                  ))}
                                </select>
                                <IconButton title="תצוגה מהירה" icon={<ChevronLeft className="h-4 w-4" />} onClick={() => setQuickSheet({ open: true, jobCode })} />
                                <IconButton
                                  title="וואטסאפ למעסיק"
                                  icon={<MessageCircle className="h-4 w-4" />}
                                  onClick={() => showToast(`פתיחת וואטסאפ עבור ${job.account_name ?? 'המעסיק'}`, 'info')}
                                  disabled={!job.account_link}
                                />
                                <IconButton title="ארכוב" icon={<Archive className="h-4 w-4" />} onClick={() => handleArchive(jobCode)} pending={rowActionPending === jobCode} />
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>


                <div className="border-t border-slate-200 bg-white px-4 py-3">
                  <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={filteredJobs.length} />
                </div>
              </div>
            )}
          </Toolbar>
        </div>


        {quickSheet.open && selectedJob && (
          <div className="fixed inset-0 z-50 flex justify-start">
            <div className="absolute inset-0 bg-slate-900/30" onClick={() => setQuickSheet({ open: false, jobCode: null })} />
            <aside className="relative z-10 h-full w-full max-w-[560px] overflow-y-auto border-l border-slate-200 bg-white shadow-xl">
              <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
                <div className="flex items-start justify-between gap-3 px-5 py-5">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#F0FDFC] px-2.5 py-1 text-[12px] font-bold text-[#008080]">
                        {selectedJob.job_code}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                          getStatusBadge(jobStatusColors, selectedJob.job_status).bg
                        } ${getStatusBadge(jobStatusColors, selectedJob.job_status).text}`}
                      >
                        {getStatusBadge(jobStatusColors, selectedJob.job_status).label}
                      </span>
                    </div>


                    <h2 className="text-[24px] font-bold text-[#0F172A]">{selectedJob.job_title ?? '—'}</h2>


                    <div className="flex flex-wrap gap-2">
                      <InfoBadge icon={<Briefcase className="h-3.5 w-3.5" />} label={roleName(selectedJob.job_role)} />
                      <InfoBadge icon={<MapPin className="h-3.5 w-3.5" />} label={`${cityName(selectedJob.city_id)} / ${regionName(selectedJob.region_id)}`} />
                      <InfoBadge icon={<Users className="h-3.5 w-3.5" />} label={`${Number(selectedJob.total_applicants ?? 0)} מועמדים`} />
                    </div>
                  </div>


                  <button
                    type="button"
                    onClick={() => setQuickSheet({ open: false, jobCode: null })}
                    className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>


              <div className="space-y-5 p-5">
                <SheetCard title="סיכום ארגון">
                  <LabelValue label="ארגון" value={selectedJob.account_name ?? '—'} />
                  <LabelValue label="קישור ארגון" value={selectedJob.account_link ? `#${selectedJob.account_link}` : '—'} />
                </SheetCard>


                <SheetCard title="פרטי תפקיד">
                  <LabelValue label="תפקיד" value={roleName(selectedJob.job_role)} />
                  <LabelValue label="תת־תפקיד" value={subRoleName(selectedJob.job_sub_role)} />
                  <LabelValue label="היקף" value={scopeName(selectedJob.scope)} />
                  <LabelValue label="ניסיון נדרש" value={experienceName(selectedJob.required_experience)} />
                  <LabelValue label="שכר" value={selectedJob.salary_range ?? '—'} />
                </SheetCard>


                <SheetCard title="מיקום">
                  <LabelValue label="אזור" value={regionName(selectedJob.region_id)} />
                  <LabelValue label="עיר" value={cityName(selectedJob.city_id)} />
                  <LabelValue label="כתובת" value={selectedJob.address ?? '—'} />
                </SheetCard>


                <SheetCard title="תקציר משרה">
                  <p className="text-[13px] leading-6 text-slate-700">
                    {buildTeaser(selectedJob.job_description || selectedJob.job_requirements || 'אין תקציר זמין')}
                  </p>
                </SheetCard>


                <SheetCard title="הפצה ותאריכים">
                  <LabelValue label="מועמדים" value={Number(selectedJob.total_applicants ?? 0)} />
                  <LabelValue label="פייסבוק" value={selectedJob.date_facebook ? formatDate(selectedJob.date_facebook) : '—'} />
                  <LabelValue label="אתר" value={selectedJob.date_website ? formatDate(selectedJob.date_website) : '—'} />
                  <LabelValue label="וואטסאפ" value={selectedJob.date_whatsapp ? formatDate(selectedJob.date_whatsapp) : '—'} />
                  <LabelValue label="פרסום אחרון" value={selectedJob.last_publish_date ? formatDate(selectedJob.last_publish_date) : '—'} />
                </SheetCard>


                <div className="grid grid-cols-2 gap-3">
                  <Link className="inline-flex items-center justify-center rounded-xl bg-[#008080] px-4 py-2.5 text-[13px] font-semibold text-white hover:opacity-95" to={`/jobs/${selectedJob.job_code}`}>
                    פרטי משרה
                  </Link>
                  <Link className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50" to={`/employers/${selectedJob.account_link}`}>
                    Employer 360
                  </Link>
                  <Link className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50" to={`/smart-match?job=${selectedJob.job_code}`}>
                    Smart Match
                  </Link>
                  <Link className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50" to={`/ats?job=${selectedJob.job_code}`}>
                    ATS
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        )}


        {toast.open && (
          <div className="pointer-events-none fixed bottom-4 left-4 z-[60]">
            <div className={`rounded-2xl border px-4 py-3 shadow-md ${toastClassName(toast.tone)}`}>
              <div className="flex items-center gap-2 text-[13px] font-semibold">
                {toast.tone === 'success' && <CheckCircle2 className="h-4 w-4" />}
                {toast.tone === 'error' && <AlertTriangle className="h-4 w-4" />}
                {toast.tone === 'info' && <CalendarDays className="h-4 w-4" />}
                {toast.message}
              </div>
            </div>
          </div>
        )}


        {/* ── Edit Job Sheet ──────────────────────────────────────────── */}
        {editOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-slate-900/30" onClick={() => setEditOpen(false)} />
            <aside className="relative z-10 flex h-full w-full max-w-[540px] flex-col border-l border-slate-200 bg-slate-50 shadow-xl">
              {/* Header */}
              <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
                <div>
                  <h2 className="text-[16px] font-bold text-[#0F172A]">עריכת משרה</h2>
                  <p className="text-[12px] text-slate-500">{editJobCode}</p>
                </div>
                <button type="button" onClick={() => setEditOpen(false)} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                <EditSectionCard title="פרטי משרה">
                  <div className="grid grid-cols-1 gap-3">
                    <EditTextField label="כותרת משרה" value={jobDraft.job_title} onChange={(v) => setJobDraft((p) => ({ ...p, job_title: v }))} />
                    <EditSelectField label="סטטוס" value={jobDraft.job_status != null ? String(jobDraft.job_status) : ''} onChange={(v) => setJobDraft((p) => ({ ...p, job_status: v ? Number(v) : null }))} options={jobStatuses.map((s) => ({ value: String(s.id), label: s.name }))} />
                    <EditSelectField label="תפקיד" value={jobDraft.job_role != null ? String(jobDraft.job_role) : ''} onChange={(v) => setJobDraft((p) => ({ ...p, job_role: v ? Number(v) : null, job_sub_role: null }))} options={roles.map((r) => ({ value: String(r.id), label: r.name }))} />
                    <EditSelectField label="תת-תפקיד" value={jobDraft.job_sub_role != null ? String(jobDraft.job_sub_role) : ''} onChange={(v) => setJobDraft((p) => ({ ...p, job_sub_role: v ? Number(v) : null }))} options={subRoles.map((r) => ({ value: String(r.id), label: r.name }))} />
                  </div>
                </EditSectionCard>

                <EditSectionCard title="מיקום">
                  <div className="grid grid-cols-1 gap-3">
                    <EditSelectField label="אזור" value={jobDraft.region_id != null ? String(jobDraft.region_id) : ''} onChange={(v) => setJobDraft((p) => ({ ...p, region_id: v ? Number(v) : null, city_id: null }))} options={regions.map((r) => ({ value: String(r.id), label: r.name }))} />
                    <EditSelectField label="עיר" value={jobDraft.city_id != null ? String(jobDraft.city_id) : ''} onChange={(v) => setJobDraft((p) => ({ ...p, city_id: v ? Number(v) : null }))} options={(jobDraft.region_id ? cities.filter((c) => Number(c.region_id) === jobDraft.region_id) : cities).map((c) => ({ value: String(c.id), label: c.name }))} />
                    <EditTextField label="כתובת" value={jobDraft.address} onChange={(v) => setJobDraft((p) => ({ ...p, address: v }))} />
                    <EditSelectField label="היקף משרה" value={jobDraft.scope != null ? String(jobDraft.scope) : ''} onChange={(v) => setJobDraft((p) => ({ ...p, scope: v ? Number(v) : null }))} options={scopes.map((s) => ({ value: String(s.id), label: s.name }))} />
                    <EditSelectField label="ניסיון נדרש" value={jobDraft.required_experience != null ? String(jobDraft.required_experience) : ''} onChange={(v) => setJobDraft((p) => ({ ...p, required_experience: v ? Number(v) : null }))} options={experienceOptions.map((e) => ({ value: String(e.id), label: e.name }))} />
                  </div>
                </EditSectionCard>

                <EditSectionCard title="תגמול ותיאור">
                  <div className="grid grid-cols-1 gap-3">
                    <EditTextField label="טווח שכר" value={jobDraft.salary_range} onChange={(v) => setJobDraft((p) => ({ ...p, salary_range: v }))} />
                    <EditTextareaField label="תיאור המשרה" value={jobDraft.job_description} onChange={(v) => setJobDraft((p) => ({ ...p, job_description: v }))} />
                    <EditTextareaField label="דרישות המשרה" value={jobDraft.job_requirements} onChange={(v) => setJobDraft((p) => ({ ...p, job_requirements: v }))} />
                  </div>
                </EditSectionCard>

                <EditSectionCard title="מידע נוסף">
                  <div className="grid grid-cols-1 gap-3">
                    <EditTextField label="קישור למשרה" value={jobDraft.job_url} onChange={(v) => setJobDraft((p) => ({ ...p, job_url: v }))} />
                    <EditSelectField label="ארגון" value={jobDraft.account_link != null ? String(jobDraft.account_link) : ''} onChange={(v) => setJobDraft((p) => ({ ...p, account_link: v ? Number(v) : null }))} options={accountsList.map((a: any) => ({ value: String(a.account_id), label: a.account_name ?? '' }))} />
                    <EditTextareaField label="הערות" value={jobDraft.notes} onChange={(v) => setJobDraft((p) => ({ ...p, notes: v }))} />
                  </div>
                </EditSectionCard>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 border-t border-slate-200 bg-white px-5 py-4">
                <button type="button" onClick={() => setEditOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-50">
                  ביטול
                </button>
                <button type="button" onClick={handleSaveEdit} disabled={savingEdit} className="rounded-xl bg-[#008080] px-5 py-2 text-[13px] font-semibold text-white hover:bg-[#006666] disabled:opacity-60">
                  {savingEdit ? 'שומר...' : 'שמור'}
                </button>
              </div>
            </aside>
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
  tone = 'default',
  onClick,
}: {
  label: string
  value: number
  hint: string
  tone?: 'default' | 'warning' | 'success'
  onClick?: () => void
}) {
  const toneClasses =
    tone === 'warning'
      ? 'border-[#FDE68A] bg-[#FFFBEB]'
      : tone === 'success'
        ? 'border-[#BBF7D0] bg-[#F0FDF4]'
        : 'border-slate-200 bg-white'


  const valueClasses =
    tone === 'warning'
      ? 'text-[#D97706]'
      : tone === 'success'
        ? 'text-[#16A34A]'
        : 'text-[#008080]'


  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-5 text-right shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${toneClasses}`}
    >
      <div className="text-[13px] font-semibold text-slate-500">{label}</div>
      <div className={`mt-2 text-[24px] font-bold ${valueClasses}`}>{value}</div>
      <div className="mt-1 text-[12px] font-medium text-slate-500">{hint}</div>
    </button>
  )
}


function InfoPill({ label, tone = 'default' }: { label: string; tone?: 'default' | 'warning' }) {
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


function SmallActionButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  )
}


function LinkIconButton({
  to,
  title,
  icon,
}: {
  to: string
  title: string
  icon: React.ReactNode
}) {
  return (
    <Link
      to={to}
      title={title}
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-[#008080]"
    >
      {icon}
    </Link>
  )
}


function IconButton({
  title,
  icon,
  onClick,
  disabled,
  pending,
}: {
  title: string
  icon: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  pending?: boolean
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled || pending}
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-[#008080] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {icon}
    </button>
  )
}


function MiniSignal({
  children,
  tone,
}: {
  children: React.ReactNode
  tone: 'warning' | 'muted'
}) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        tone === 'warning' ? 'bg-[#FFFBEB] text-[#D97706]' : 'bg-slate-100 text-slate-600'
      }`}
    >
      {children}
    </span>
  )
}


function SheetCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-[15px] font-bold text-[#0F172A]">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  )
}


function LabelValue({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-2 text-[13px] last:border-b-0 last:pb-0">
      <span className="font-medium text-slate-500">{label}</span>
      <span className="text-left font-semibold text-[#0F172A]">{value}</span>
    </div>
  )
}


function InfoBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F8FAFC] px-2.5 py-1 text-[12px] font-semibold text-slate-700">
      {icon}
      {label}
    </span>
  )
}


function canPublish(job: any) {
  const hasAccount = Boolean(job.account_link)
  const hasRole = Boolean(job.job_role)
  const hasTitle = Boolean(String(job.job_title ?? '').trim())
  const hasScope = Boolean(job.scope)
  const hasDescription = Boolean(String(job.job_description ?? '').trim())
  const hasRequirements = Boolean(String(job.job_requirements ?? '').trim())
  const regionOk = !job.region_id || Boolean(job.city_id)


  return hasAccount && hasRole && hasTitle && hasScope && hasDescription && hasRequirements && regionOk
}


function isPublished(job: any) {
  return Boolean(job.last_publish_date || job.date_facebook || job.date_website || job.date_whatsapp)
}


function getDaysLive(job: any) {
  const sourceDate = job.created_time || job.updated_timestamp || null
  if (!sourceDate) return 0
  const created = new Date(sourceDate).getTime()
  const now = Date.now()
  const diff = now - created
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}


function isWithinLastDays(dateValue: string | null | undefined, days: number) {
  if (!dateValue) return false
  const target = new Date(dateValue).getTime()
  const now = Date.now()
  return now - target <= days * 24 * 60 * 60 * 1000
}


function distributionLabel(job: any) {
  const channels: string[] = []
  if (job.date_facebook) channels.push('פייסבוק')
  if (job.date_website) channels.push('אתר')
  if (job.date_whatsapp) channels.push('וואטסאפ')
  return channels.length ? channels.join(' • ') : 'ללא ערוצים'
}


function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}


function buildTeaser(text: string) {
  const normalized = String(text ?? '').replace(/\s+/g, ' ').trim()
  if (!normalized) return 'אין תקציר זמין'
  return normalized.length > 180 ? `${normalized.slice(0, 180)}...` : normalized
}


function toastClassName(tone: ToastTone) {
  if (tone === 'success') return 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]'
  if (tone === 'error') return 'border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]'
  return 'border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]'
}


function getAllowedStatusTransitions(currentStatus: number | null | undefined) {
  const status = Number(currentStatus ?? 0)


  const map: Record<number, number[]> = {
    [STATUS_IDS.draft]: [STATUS_IDS.waitingApproval, STATUS_IDS.active, STATUS_IDS.published, STATUS_IDS.archived],
    [STATUS_IDS.waitingApproval]: [STATUS_IDS.active, STATUS_IDS.published, STATUS_IDS.hold, STATUS_IDS.archived],
    [STATUS_IDS.active]: [STATUS_IDS.published, STATUS_IDS.hold, STATUS_IDS.closed, STATUS_IDS.filled, STATUS_IDS.archived],
    [STATUS_IDS.published]: [STATUS_IDS.active, STATUS_IDS.hold, STATUS_IDS.closed, STATUS_IDS.filled, STATUS_IDS.archived],
    [STATUS_IDS.hold]: [STATUS_IDS.active, STATUS_IDS.published, STATUS_IDS.closed, STATUS_IDS.archived],
    [STATUS_IDS.closed]: [STATUS_IDS.archived],
    [STATUS_IDS.filled]: [STATUS_IDS.archived],
    [STATUS_IDS.cancelled]: [STATUS_IDS.archived],
    [STATUS_IDS.archived]: [],
  }


  return map[status] ?? []
}


function generateDuplicateCode(baseCode: string, existingCodes: string[]) {
  const safeBase = String(baseCode ?? 'JOB').trim() || 'JOB'
  let counter = 1
  let nextCode = `${safeBase}-C${counter}`


  while (existingCodes.includes(nextCode)) {
    counter += 1
    nextCode = `${safeBase}-C${counter}`
  }


  return nextCode
}


function buildCsv(rows: Array<Record<string, string | number>>) {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const cell = String(row[header] ?? '')
          const escaped = cell.replace(/"/g, '""')
          return `"${escaped}"`
        })
        .join(','),
    ),
  ]
  return lines.join('\n')
}


// ─── Edit sheet helpers ─────────────────────────────────────────────────────

function EditSectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-[16px] font-bold text-[#0F172A]">{title}</h3>
      {children}
    </section>
  )
}

function EditTextField({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-slate-500">{label}</span>
      <input dir="rtl" type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-medium text-[#0F172A] outline-none transition focus:border-[#008080] focus:ring-2 focus:ring-[#008080]/10" />
    </label>
  )
}

function EditSelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-slate-500">{label}</span>
      <select dir="rtl" value={value} onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-medium text-[#0F172A] outline-none transition focus:border-[#008080] focus:ring-2 focus:ring-[#008080]/10">
        <option value="">בחר</option>
        {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </label>
  )
}

function EditTextareaField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-slate-500">{label}</span>
      <textarea dir="rtl" rows={4} value={value} onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-[#0F172A] outline-none transition focus:border-[#008080] focus:ring-2 focus:ring-[#008080]/10" />
    </label>
  )
}

function SortableTh({ label, sortKey, sortBy, sortDir, onSort, width, onResizeStart }: {
  label: string; sortKey: string; sortBy: string | null; sortDir: 'asc' | 'desc'; onSort: (k: string) => void
  width?: number; onResizeStart?: (e: React.MouseEvent, key: string) => void
}) {
  const active = sortBy === sortKey
  return (
    <th
      className="relative cursor-pointer select-none px-4 py-4 hover:bg-slate-100"
      style={width ? { width, minWidth: 80 } : { minWidth: 80 }}
      onClick={() => onSort(sortKey)}
    >
      <span className="flex items-center gap-1.5">
        {label}
        <span className={`flex flex-col ${active ? 'text-[#008080]' : 'text-slate-400'}`}>
          <ChevronUp className={`h-3 w-3 -mb-1 ${active && sortDir === 'asc' ? 'text-[#008080]' : 'text-slate-300'}`} />
          <ChevronDown className={`h-3 w-3 ${active && sortDir === 'desc' ? 'text-[#008080]' : 'text-slate-300'}`} />
        </span>
      </span>
      {onResizeStart && (
        <div
          className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize bg-transparent hover:bg-[#008080]/40"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => { e.stopPropagation(); onResizeStart(e, sortKey) }}
        />
      )}
    </th>
  )
}


function PlainJobTh({ label, colKey, width, onResizeStart }: {
  label: string; colKey: string; width?: number; onResizeStart?: (e: React.MouseEvent, key: string) => void
}) {
  return (
    <th
      className="relative px-4 py-4"
      style={width ? { width, minWidth: 80 } : { minWidth: 80 }}
    >
      {label}
      {onResizeStart && (
        <div
          className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize bg-transparent hover:bg-[#008080]/40"
          onMouseDown={(e) => { e.stopPropagation(); onResizeStart(e, colKey) }}
        />
      )}
    </th>
  )
}



