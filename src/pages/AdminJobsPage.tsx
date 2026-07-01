import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useJobMutations } from '@/hooks/useJobMutations'
import { Link, useNavigate } from 'react-router-dom'
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
  X,
  Building2,
  Clock3,
  CheckCircle2,
  AlertTriangle,
  MessageCircle,
  Image as ImageIcon,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
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
import { formatDate } from '@/lib/timeAgo'
import type { Job, DictItem } from '@/types'
import { RoleBadge, getRoleColorHex } from '@/components/admin/RoleBadge'
import { RegionBadge } from '@/components/admin/RegionBadge'
import { getRegionColor } from '@/lib/regionColors'
import { CityRegionPicker } from '@/components/ui/CityRegionPicker'
import { RoleSubRolePicker } from '@/components/ui/RoleSubRolePicker'
import { ContactPicker } from '@/components/ui/ContactPicker'
import SidePanel from '@/components/ui/SidePanel'

const PAGE_SIZE = 20

const JOB_STATUS_IDS = {
  new: 1,
  draft: 2,
  active: 3,
  hold: 4,
  filled: 5,
  closedSuccess: 6,
  closedOther: 7,
  cancelled: 8,
  archived: 9,
}

const PUBLIC_STATUS_IDS = {
  draft: 1,
  waitingApproval: 2,
  published: 3,
  hidden: 4,
  archived: 5,
}

const ALL_JOB_COLUMNS = [
  { key: 'job_code', label: 'קוד' },
  { key: 'job_role', label: 'תפקיד' },
  { key: 'job_status', label: 'סטטוס משרה' },
  { key: 'city_id', label: 'עיר' },
  { key: 'region_id', label: 'אזור' },
  { key: 'scope', label: 'היקף' },
  { key: 'job_title', label: 'כותרת' },
  { key: 'job_sub_role', label: 'תתי־תפקידים' },
  { key: 'account_name', label: 'ארגון' },
  { key: 'employer_name', label: 'מעסיק' },
  { key: 'recruiter_name', label: 'מגייס' },
  { key: 'public_status', label: 'סטטוס פרסום' },
  { key: 'total_applicants', label: 'מועמדים' },
  { key: 'last_publish_date', label: 'פרסום אחרון' },
  { key: 'updated_timestamp', label: 'עודכן' },
] as const

const DEFAULT_JOB_COLUMNS = [
  'job_code',
  'job_role',
  'job_status',
  'city_id',
  'region_id',
  'scope',
  'job_title',
  'job_sub_role',
  'account_name',
  'public_status',
  'total_applicants',
] as const

type FilterState = {
  search?: string
  job_status?: number
  public_status?: number
  job_role?: number
  job_sub_role?: number[]
  account_link?: number
  region_id?: number
  city_id?: number
  scope?: number[]
  required_experience?: number
  applicants_state?: 'with' | 'without'
}

type ToastTone = 'success' | 'error' | 'info'
type ToastState = { open: boolean; message: string; tone: ToastTone }
type PanelMode = 'view' | 'edit'
type PanelState = { open: boolean; mode: PanelMode; jobCode: string | null }

type JobDraft = {
  job_code: string
  job_title: string
  job_status: number | null
  public_status: number | null
  job_role: number | null
  job_sub_role: number[]
  account_link: number | null
  rel_employer_contact: number | null
  rel_recruiter_contact: number | null
  region_id: number | null
  city_id: number | null
  scope: number[]
  required_experience: number | null
  address: string
  salary_expectation_hourly: string
  salary_expectation_monthly: string
  show_salary_public: boolean
  salary_type_ids: number[]
  public_image_url: string
  job_url: string
  job_description: string
  job_requirements: string
  notes: string
}

const EMPTY_JOB_DRAFT: JobDraft = {
  job_code: '',
  job_title: '',
  job_status: null,
  public_status: null,
  job_role: null,
  job_sub_role: [],
  account_link: null,
  rel_employer_contact: null,
  rel_recruiter_contact: null,
  region_id: null,
  city_id: null,
  scope: [],
  required_experience: null,
  address: '',
  salary_expectation_hourly: '',
  salary_expectation_monthly: '',
  show_salary_public: false,
  salary_type_ids: [],
  public_image_url: '',
  job_url: '',
  job_description: '',
  job_requirements: '',
  notes: '',
}

const EMPTY_JOBS: Job[] = []

const ADMIN_JOBS_FILTERS_STORAGE_KEY = 'alldent.adminJobs.filters.v1'
const DEFAULT_FILTERS: FilterState = { job_status: JOB_STATUS_IDS.active }

function getInitialFilters(): FilterState {
  if (typeof window === 'undefined') return DEFAULT_FILTERS

  try {
    const saved = window.localStorage.getItem(ADMIN_JOBS_FILTERS_STORAGE_KEY)
    if (!saved) return DEFAULT_FILTERS

    const parsed = JSON.parse(saved) as FilterState
    if (!parsed || typeof parsed !== 'object' || !Object.keys(parsed).length) return DEFAULT_FILTERS

    return parsed
  } catch {
    return DEFAULT_FILTERS
  }
}

export default function AdminJobsPage() {
  const { updateJob, insertJob } = useJobMutations()
  const navigate = useNavigate()
  const [filters, setFilters] = useState<FilterState>(getInitialFilters)
  const [page, setPage] = useState(0)
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [visibleColumns, setVisibleColumns] = useState<string[]>([...DEFAULT_JOB_COLUMNS])
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [toast, setToast] = useState<ToastState>({ open: false, message: '', tone: 'info' })
  const [rowActionPending, setRowActionPending] = useState<string | null>(null)
  const [panel, setPanel] = useState<PanelState>({ open: false, mode: 'view', jobCode: null })
  const [jobDraft, setJobDraft] = useState<JobDraft>(EMPTY_JOB_DRAFT)
  const [savingEdit, setSavingEdit] = useState(false)
  const [localJobs, setLocalJobs] = useState<any[]>([])

  const fetchDict = async (table: string): Promise<DictItem[]> => {
    const { data, error } = await supabase.from(table).select('id,name').order('id')
    if (error) throw error
    return (data ?? []) as DictItem[]
  }

  const { data: allJobs = EMPTY_JOBS, refetch: refetchJobs } = useQuery<Job[]>({
    queryKey: ['jobs-admin-v4'],
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

  const { data: accountsList = [] } = useQuery<Array<{ account_id: number; account_name: string | null; phone: string | null; second_phone: string | null }>>({
    queryKey: ['accounts-for-admin-jobs-v4'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('account_id,account_name,phone,second_phone')
        .order('account_name')
      if (error) throw error
      return (data ?? []) as Array<{ account_id: number; account_name: string | null; phone: string | null; second_phone: string | null }>
    },
    staleTime: 300_000,
  })

  const contactIdsNeeded = useMemo(() => {
    const ids = new Set<number>()
    allJobs.forEach((job: any) => {
      if (job.rel_employer_contact) ids.add(Number(job.rel_employer_contact))
      if (job.rel_recruiter_contact) ids.add(Number(job.rel_recruiter_contact))
    })
    return [...ids]
  }, [allJobs])

  const { data: contactsList = [] } = useQuery<Array<{ contact_id: number; full_name: string | null; phone_norm: string | null }>>({
    queryKey: ['contacts-for-jobs-v2', contactIdsNeeded.join(',')],
    queryFn: async () => {
      if (!contactIdsNeeded.length) return []
      const { data, error } = await supabase
        .from('contact')
        .select('contact_id,full_name,phone_norm')
        .in('contact_id', contactIdsNeeded)
      if (error) throw error
      return (data ?? []) as Array<{ contact_id: number; full_name: string | null; phone_norm: string | null }>
    },
    enabled: contactIdsNeeded.length > 0,
    staleTime: 300_000,
  })

  const { data: jobStatuses = [] } = useQuery<DictItem[]>({ queryKey: ['dict_job_statuses'], queryFn: () => fetchDict('dict_job_statuses'), staleTime: 600_000 })
  const { data: publicStatuses = [] } = useQuery<DictItem[]>({ queryKey: ['dict_public_statuses'], queryFn: () => fetchDict('dict_public_statuses'), staleTime: 600_000 })
  const { data: roles = [] } = useQuery<DictItem[]>({ queryKey: ['dict_roles'], queryFn: () => fetchDict('dict_roles'), staleTime: 600_000 })
  const { data: subRoles = [] } = useQuery<Array<DictItem & { role_id: number | null }>>({
    queryKey: ['dict_sub_roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_sub_roles').select('id,name,role_id').order('id')
      if (error) throw error
      return (data ?? []) as Array<DictItem & { role_id: number | null }>
    },
    staleTime: 600_000,
  })
  const { data: scopes = [] } = useQuery<DictItem[]>({ queryKey: ['dict_scopes'], queryFn: () => fetchDict('dict_scopes'), staleTime: 600_000 })
  const { data: salaryTypes = [] } = useQuery<DictItem[]>({ queryKey: ['dict_salary_types'], queryFn: () => fetchDict('dict_salary_types'), staleTime: 600_000 })
  const { data: regions = [] } = useQuery<DictItem[]>({ queryKey: ['dict_regions'], queryFn: () => fetchDict('dict_regions'), staleTime: 600_000 })
  const { data: cities = [] } = useQuery<Array<DictItem & { region_id: number | null }>>({
    queryKey: ['dict_cities-all'],
    queryFn: async () => {
      const PAGE = 1000
      const all: Array<DictItem & { region_id: number | null }> = []
      let from = 0
      while (true) {
        const { data, error } = await supabase.from('dict_cities').select('id,name,region_id').order('name').range(from, from + PAGE - 1)
        if (error) throw error
        const batch = (data ?? []) as Array<DictItem & { region_id: number | null }>
        if (!batch.length) break
        all.push(...batch)
        if (batch.length < PAGE) break
        from += PAGE
      }
      return all
    },
    staleTime: 600_000,
  })
  const { data: experienceOptions = [] } = useQuery<DictItem[]>({ queryKey: ['dict_experience'], queryFn: () => fetchDict('dict_experience'), staleTime: 600_000 })

  const accountsMap = useMemo(() => {
    const map = new Map<number, { name: string; phone: string | null; second_phone: string | null }>()
    accountsList.forEach((account) => {
      map.set(Number(account.account_id), {
        name: String(account.account_name ?? ''),
        phone: account.phone ?? null,
        second_phone: account.second_phone ?? null,
      })
    })
    return map
  }, [accountsList])

  const contactsMap = useMemo(() => {
    const map = new Map<number, { name: string; phone: string | null }>()
    contactsList.forEach((contact) => {
      map.set(Number(contact.contact_id), {
        name: String(contact.full_name ?? ''),
        phone: contact.phone_norm ?? null,
      })
    })
    return map
  }, [contactsList])

  const allJobsWithLookups = useMemo(() => {
    return allJobs.map((job: any) => {
      const account = job.account_link ? accountsMap.get(Number(job.account_link)) : null
      const employerContact = job.rel_employer_contact ? contactsMap.get(Number(job.rel_employer_contact)) : null
      const recruiterContact = job.rel_recruiter_contact ? contactsMap.get(Number(job.rel_recruiter_contact)) : null
      return {
        ...job,
        account_name: account?.name ?? null,
        account_phone: account?.phone ?? account?.second_phone ?? null,
        employer_contact_name: employerContact?.name ?? null,
        employer_contact_phone: employerContact?.phone ?? null,
        recruiter_contact_name: recruiterContact?.name ?? null,
        recruiter_contact_phone: recruiterContact?.phone ?? null,
      }
    })
  }, [allJobs, accountsMap, contactsMap])

  useEffect(() => setLocalJobs(allJobsWithLookups), [allJobsWithLookups])
  useEffect(() => setPage(0), [filters])
  useEffect(() => {
    try {
      window.localStorage.setItem(ADMIN_JOBS_FILTERS_STORAGE_KEY, JSON.stringify(filters))
    } catch {
      // localStorage is optional; filtering should still work without persistence.
    }
  }, [filters])
  useEffect(() => {
    if (!toast.open) return
    const timer = window.setTimeout(() => setToast((prev) => ({ ...prev, open: false })), 2600)
    return () => window.clearTimeout(timer)
  }, [toast.open])

  const roleName = (id: number | null | undefined) => roles.find((item) => Number(item.id) === Number(id))?.name ?? '—'
  const statusName = (id: number | null | undefined) => jobStatuses.find((item) => Number(item.id) === Number(id))?.name ?? '—'
  const publicStatusName = (id: number | null | undefined) => publicStatuses.find((item) => Number(item.id) === Number(id))?.name ?? '—'
  const regionName = (id: number | null | undefined) => regions.find((item) => Number(item.id) === Number(id))?.name ?? '—'
  const cityName = (id: number | null | undefined) => cities.find((item) => Number(item.id) === Number(id))?.name ?? '—'
  const jobCityName = (job: { city_id?: number | null }) => cityName(job.city_id)
  const jobRegionName = (job: { region_id?: number | null }) => regionName(job.region_id)
  const experienceName = (id: number | null | undefined) => experienceOptions.find((item) => Number(item.id) === Number(id))?.name ?? '—'
  const scopeName = (id: number | null | undefined) => scopes.find((item) => Number(item.id) === Number(id))?.name ?? '—'
  const subRoleName = (id: number | null | undefined) => subRoles.find((item) => Number(item.id) === Number(id))?.name ?? '—'

  const normalizeIds = (value: unknown): number[] => {
    if (Array.isArray(value)) return value.map(Number).filter((id) => Number.isFinite(id) && id > 0)
    if (value === null || value === undefined || value === '') return []
    const numeric = Number(value)
    return Number.isFinite(numeric) && numeric > 0 ? [numeric] : []
  }

  // פרדיקט סינון יחיד לשימוש חוזר. options.ignoreAccount מדלג על תנאי הארגון
  // כדי שרשימת הארגונים (dropdown) תשקף את שאר הפילטרים הפעילים (cascade כמו עיר←אזור).
  const matchesFilters = (job: any, options?: { ignoreAccount?: boolean }): boolean => {
    const search = String(filters.search ?? '').trim().toLowerCase()
    if (search) {
      const haystack = [job.job_code, job.job_title, job.account_name, job.employer_contact_name, jobCityName(job), roleName(job.job_role)]
        .map((item) => String(item ?? '').toLowerCase())
        .join(' ')
      if (!haystack.includes(search)) return false
    }
    if (filters.job_status && Number(job.job_status) !== Number(filters.job_status)) return false
    if (filters.public_status && Number(job.public_status) !== Number(filters.public_status)) return false
    if (filters.job_role && Number(job.job_role) !== Number(filters.job_role)) return false
    if (filters.region_id && Number(job.region_id) !== Number(filters.region_id)) return false
    if (filters.city_id && Number(job.city_id) !== Number(filters.city_id)) return false
    if (!options?.ignoreAccount && filters.account_link && Number(job.account_link) !== Number(filters.account_link)) return false
    if (filters.required_experience && Number(job.required_experience) !== Number(filters.required_experience)) return false
    if (filters.scope?.length) {
      const jobScopeIds = normalizeIds(job.scope)
      if (!filters.scope.some((id) => jobScopeIds.includes(Number(id)))) return false
    }
    if (filters.job_sub_role?.length) {
      const jobSubRoleIds = normalizeIds(job.job_sub_role)
      if (!filters.job_sub_role.some((id) => jobSubRoleIds.includes(Number(id)))) return false
    }
    if (filters.applicants_state === 'with' && Number(job.total_applicants ?? 0) <= 0) return false
    if (filters.applicants_state === 'without' && Number(job.total_applicants ?? 0) > 0) return false
    return true
  }

  // ערך בר-מיון לכל עמודה — עמודות מילון ממוינות לפי השם המתורגם, לא לפי ה-ID.
  const sortValue = (field: string, job: any): string | number => {
    switch (field) {
      case 'job_role': return roleName(job.job_role)
      case 'job_status': return statusName(job.job_status)
      case 'public_status': return publicStatusName(job.public_status)
      case 'city_id': return jobCityName(job)
      case 'region_id': return jobRegionName(job)
      case 'scope': return normalizeIds(job.scope).map(scopeName).sort((a, b) => a.localeCompare(b, 'he'))[0] ?? ''
      case 'job_sub_role': return normalizeIds(job.job_sub_role).map(subRoleName).sort((a, b) => a.localeCompare(b, 'he'))[0] ?? ''
      case 'account_name': return String(job.account_name ?? '')
      case 'employer_name': return String(job.employer_contact_name ?? '')
      case 'recruiter_name': return String(job.recruiter_contact_name ?? '')
      case 'total_applicants': return Number(job.total_applicants ?? 0)
      case 'last_publish_date': return job.last_publish_date ? new Date(job.last_publish_date).getTime() : 0
      case 'updated_timestamp': return job.updated_timestamp ? new Date(job.updated_timestamp).getTime() : 0
      default: return String(job[field] ?? '')
    }
  }

  const accountOptions = useMemo(() => {
    const map = new Map<number, { label: string; count: number }>()
    localJobs.forEach((job) => {
      const accountId = Number(job.account_link)
      if (!accountId || !job.account_name) return
      if (!matchesFilters(job, { ignoreAccount: true })) return
      const current = map.get(accountId)
      map.set(accountId, { label: String(job.account_name), count: (current?.count ?? 0) + 1 })
    })
    return Array.from(map.entries())
      .sort((a, b) => a[1].label.localeCompare(b[1].label, 'he'))
      .map(([value, meta]) => ({ value: String(value), label: `${meta.label} (${meta.count})` }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localJobs, filters, cities, roles])

  // אם הארגון שנבחר יצא מרשימת האפשרויות אחרי שינוי פילטר אחר — לנקות את הבחירה.
  useEffect(() => {
    if (filters.account_link && !accountOptions.some((opt) => Number(opt.value) === Number(filters.account_link))) {
      setFilters((prev) => ({ ...prev, account_link: undefined }))
    }
  }, [accountOptions, filters.account_link])

  const subRoleOptions = useMemo(() => {
    if (!filters.job_role) return []
    return subRoles
      .filter((subRole) => Number(subRole.role_id) === Number(filters.job_role))
      .map((subRole) => ({ value: String(subRole.id), label: subRole.name }))
  }, [subRoles, filters.job_role])

  const editSubRoleOptions = useMemo(() => {
    if (!jobDraft.job_role) return []
    return subRoles
      .filter((subRole) => Number(subRole.role_id) === Number(jobDraft.job_role))
      .map((subRole) => ({ value: String(subRole.id), label: subRole.name }))
  }, [subRoles, jobDraft.job_role])

  const activeCityOptions = useMemo(() => {
    const list = filters.region_id ? cities.filter((city) => Number(city.region_id) === Number(filters.region_id)) : cities
    return list.map((city) => ({ value: String(city.id), label: city.name }))
  }, [cities, filters.region_id])

  const editCityOptions = useMemo(() => {
    const list = jobDraft.region_id ? cities.filter((city) => Number(city.region_id) === Number(jobDraft.region_id)) : cities
    return list.map((city) => ({ value: String(city.id), label: city.name }))
  }, [cities, jobDraft.region_id])

  const filteredJobs = useMemo(() => {
    const result = localJobs.filter((job) => matchesFilters(job))

    if (sortField) {
      result.sort((a, b) => {
        const av = sortValue(sortField, a)
        const bv = sortValue(sortField, b)
        let cmp: number
        if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv
        else cmp = String(av).localeCompare(String(bv), 'he')
        return sortDir === 'asc' ? cmp : -cmp
      })
    }
    return result
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localJobs, filters, sortField, sortDir, cities, roles, regions, jobStatuses, publicStatuses, scopes, subRoles])

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / PAGE_SIZE))
  const pageData = filteredJobs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const selectedJob = localJobs.find((job) => String(job.job_code) === String(panel.jobCode)) ?? null

  const kpis = useMemo(() => {
    const activeJobs = filteredJobs.filter((job) => Number(job.job_status) === JOB_STATUS_IDS.active)
    const publishedJobs = filteredJobs.filter((job) => Number(job.public_status) === PUBLIC_STATUS_IDS.published)
    const withoutApplicants = filteredJobs.filter((job) => Number(job.total_applicants ?? 0) === 0)

    const byRole = roles
      .map((role) => ({ id: role.id, name: role.name, count: activeJobs.filter((job) => Number(job.job_role) === Number(role.id)).length }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count)

    const byRegion = regions
      .map((region) => ({ id: region.id, name: region.name, count: activeJobs.filter((job) => Number(job.region_id) === Number(region.id)).length }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count)

    return {
      total: filteredJobs.length,
      active: activeJobs.length,
      published: publishedJobs.length,
      withoutApplicants: withoutApplicants.length,
      byRole,
      byRegion,
    }
  }, [filteredJobs, roles, regions])

  const showToast = (message: string, tone: ToastTone = 'info') => setToast({ open: true, message, tone })

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => (prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]))
  }

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS)
    setSelectedRows([])
  }

  const toggleRowSelection = (jobCode: string) => {
    setSelectedRows((prev) => (prev.includes(jobCode) ? prev.filter((item) => item !== jobCode) : [...prev, jobCode]))
  }

  const togglePageSelection = () => {
    const ids = pageData.map((job) => String(job.job_code))
    const allSelected = ids.length > 0 && ids.every((id) => selectedRows.includes(id))
    setSelectedRows((prev) => (allSelected ? prev.filter((id) => !ids.includes(id)) : Array.from(new Set([...prev, ...ids]))))
  }

  const openPanel = (job: any, mode: PanelMode) => {
    setPanel({ open: true, mode, jobCode: String(job.job_code) })
    setJobDraft({
      job_code: job.job_code ?? '',
      job_title: job.job_title ?? '',
      job_status: job.job_status ?? null,
      public_status: job.public_status ?? null,
      job_role: job.job_role ?? null,
      job_sub_role: normalizeIds(job.job_sub_role),
      account_link: job.account_link ?? null,
      rel_employer_contact: job.rel_employer_contact ?? null,
      rel_recruiter_contact: job.rel_recruiter_contact ?? null,
      region_id: job.region_id ?? null,
      city_id: job.city_id ?? null,
      scope: normalizeIds(job.scope),
      required_experience: job.required_experience ?? null,
      address: job.address ?? '',
      salary_expectation_hourly: job.salary_expectation_hourly != null ? String(job.salary_expectation_hourly) : '',
      salary_expectation_monthly: job.salary_expectation_monthly != null ? String(job.salary_expectation_monthly) : '',
      show_salary_public: Boolean(job.show_salary_public),
      salary_type_ids: normalizeIds(job.salary_type_ids),
      public_image_url: job.public_image_url ?? '',
      job_url: job.job_url ?? '',
      job_description: job.job_description ?? '',
      job_requirements: job.job_requirements ?? '',
      notes: job.notes ?? '',
    })
  }

  const replaceJob = (jobCode: string, updater: (job: any) => any) => {
    setLocalJobs((prev) => prev.map((job) => (String(job.job_code) === String(jobCode) ? updater(job) : job)))
  }

  const saveEdit = async () => {
    if (!panel.jobCode) return
    setSavingEdit(true)
    try {
      // אם סטטוס משרה לא פעיל — אפס סטטוס פרסום אוטומטית
      const INACTIVE_JOB_STATUSES = [
        JOB_STATUS_IDS.draft,
        JOB_STATUS_IDS.hold,
        JOB_STATUS_IDS.filled,
        JOB_STATUS_IDS.closedSuccess,
        JOB_STATUS_IDS.closedOther,
        JOB_STATUS_IDS.cancelled,
        JOB_STATUS_IDS.archived,
      ]
      const isInactive = jobDraft.job_status != null && INACTIVE_JOB_STATUSES.includes(jobDraft.job_status)
      const resolvedPublicStatus = isInactive ? PUBLIC_STATUS_IDS.hidden : jobDraft.public_status

      const patch = {
        job_title: cleanText(jobDraft.job_title),
        job_status: jobDraft.job_status,
        public_status: resolvedPublicStatus,
        job_role: jobDraft.job_role,
        job_sub_role: jobDraft.job_sub_role.length ? jobDraft.job_sub_role : null,
        account_link: jobDraft.account_link,
        rel_employer_contact: jobDraft.rel_employer_contact,
        rel_recruiter_contact: jobDraft.rel_recruiter_contact,
        region_id: jobDraft.region_id,
        city_id: jobDraft.city_id,
        scope: jobDraft.scope.length ? jobDraft.scope : null,
        required_experience: jobDraft.required_experience,
        address: cleanText(jobDraft.address),
        salary_expectation_hourly: toNullableNumber(jobDraft.salary_expectation_hourly),
        salary_expectation_monthly: toNullableNumber(jobDraft.salary_expectation_monthly),
        show_salary_public: jobDraft.show_salary_public,
        salary_type_ids: jobDraft.salary_type_ids.length ? jobDraft.salary_type_ids : null,
        public_image_url: cleanText(jobDraft.public_image_url),
        job_url: cleanText(jobDraft.job_url),
        job_description: cleanText(jobDraft.job_description),
        job_requirements: cleanText(jobDraft.job_requirements),
        notes: cleanText(jobDraft.notes),
        updated_timestamp: new Date().toISOString(),
      }
      // אם קוד משרה השתנה — עדכן גם אותו
      const newJobCode = cleanText(jobDraft.job_code)
      const { error } = await updateJob(panel.jobCode, { ...patch, ...(newJobCode && newJobCode !== panel.jobCode ? { job_code: newJobCode } : {}) })
      if (error) throw error
      replaceJob(panel.jobCode, (cur) => ({ ...cur, ...patch }))
      const savedMsg = isInactive ? 'המשרה נשמרה — סטטוס פרסום הוסתר אוטומטית' : 'המשרה נשמרה בהצלחה'
      showToast(savedMsg, 'success')
      setPanel((prev) => ({ ...prev, mode: 'view' }))
    } catch (err: any) {
      console.error(err)
      const msg = err?.message ?? ''
      if (msg.includes('job_salary_hourly_chk')) showToast('שכר שעתי חייב להיות בין 40 ל-1000 ₪', 'error')
      else if (msg.includes('job_salary_monthly_chk')) showToast('שכר חודשי חייב להיות לפחות 1,000 ₪', 'error')
      else if (msg.includes('job_url_chk') || msg.includes('job_public_image_url_chk')) showToast('כתובת URL חייבת להתחיל ב-https://', 'error')
      else showToast(`שגיאה בשמירה: ${msg || 'שגיאה לא ידועה'}`, 'error')
    } finally {
      setSavingEdit(false)
    }
  }

  const updateJobPatch = async (jobCode: string, patch: Record<string, unknown>, successMessage: string) => {
    setRowActionPending(jobCode)
    try {
      const finalPatch: Record<string, unknown> = { ...patch, updated_timestamp: new Date().toISOString() }

      // כלל עסקי: רק משרה פעילה יכולה להיות מפורסמת.
      // כל שינוי סטטוס פעילות לסטטוס שאינו פעילה מסתיר את הפרסום.
      if ('job_status' in patch && Number(patch.job_status) !== JOB_STATUS_IDS.active) {
        finalPatch.public_status = PUBLIC_STATUS_IDS.hidden
        finalPatch.unpublished_at = new Date().toISOString()
      }

      const { error } = await updateJob(jobCode, finalPatch)
      if (error) throw error
      replaceJob(jobCode, (cur) => ({ ...cur, ...finalPatch }))
      showToast(successMessage, 'success')
    } catch (error) {
      console.error(error)
      showToast('שגיאה בעדכון המשרה', 'error')
    } finally {
      setRowActionPending(null)
    }
  }

  const publishJob = (job: any) => {
    if (Number(job.job_status) !== JOB_STATUS_IDS.active) {
      showToast('לא ניתן לפרסם משרה שאינה בסטטוס פעילה', 'error')
      return
    }

    updateJobPatch(
      String(job.job_code),
      {
        public_status: PUBLIC_STATUS_IDS.published,
        last_publish_date: todayIsoDate(),
        date_website: job.date_website ?? todayIsoDate(),
        published_at: job.published_at ?? new Date().toISOString(),
        unpublished_at: null,
      },
      'סטטוס הפרסום עודכן למפורסמת',
    )
  }

  const duplicateJob = async (job: any) => {
    const jobCode = String(job.job_code)
    const nextCode = generateDuplicateCode(jobCode, localJobs.map((item) => String(item.job_code)))
    setRowActionPending(jobCode)
    try {
      const newJob = {
        ...job,
        job_code: nextCode,
        job_status: JOB_STATUS_IDS.draft,
        public_status: PUBLIC_STATUS_IDS.draft,
        total_applicants: 0,
        last_publish_date: null,
        date_facebook: null,
        date_website: null,
        date_whatsapp: null,
        published_at: null,
        unpublished_at: null,
        created_time: new Date().toISOString(),
        updated_timestamp: new Date().toISOString(),
      }
      const { account_name, account_phone, employer_contact_name, employer_contact_phone, recruiter_contact_name, recruiter_contact_phone, ...dbJob } = newJob
      const { error } = await insertJob(dbJob)
      if (error) throw error
      setLocalJobs((prev) => [newJob, ...prev])
      showToast(`המשרה שוכפלה: ${nextCode}`, 'success')
    } catch (error) {
      console.error(error)
      showToast('שגיאה בשכפול', 'error')
    } finally {
      setRowActionPending(null)
    }
  }

  const openWhatsApp = (job: any) => {
    const phone = normalizePhoneForWhatsapp(job.employer_contact_phone || job.account_phone)
    if (!phone) {
      showToast('אין נייד מגייס/ארגון לפתיחת וואטסאפ', 'error')
      return
    }
    const text = encodeURIComponent(`שלום, לגבי משרה ${job.job_code} - ${job.job_title ?? ''}`)
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank', 'noopener,noreferrer')
  }

  const exportCsv = () => {
    const rows = filteredJobs.map((job) => ({
      'קוד משרה': job.job_code ?? '',
      כותרת: job.job_title ?? '',
      תפקיד: roleName(job.job_role),
      'תתי־תפקידים': namesFromIds(normalizeIds(job.job_sub_role), subRoleName),
      ארגון: job.account_name ?? '',
      מעסיק: job.employer_contact_name ?? '',
      מגייס: job.recruiter_contact_name ?? '',
      אזור: jobRegionName(job),
      עיר: jobCityName(job),
      היקף: namesFromIds(normalizeIds(job.scope), scopeName),
      'סטטוס משרה': statusName(job.job_status),
      'סטטוס פרסום': publicStatusName(job.public_status),
      מועמדים: Number(job.total_applicants ?? 0),
      'פרסום אחרון': job.last_publish_date ?? '',
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
    showToast('הייצוא הושלם', 'success')
  }

  const selectedPageIds = pageData.map((job) => String(job.job_code))
  const pageFullySelected = selectedPageIds.length > 0 && selectedPageIds.every((id) => selectedRows.includes(id))

  return (
    <Shell
      title="משרות"
      subtitle={`ניהול כלל המשרות במערכת • ${filteredJobs.length} תוצאות`}
      icon={Briefcase}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <details className="relative">
            <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-[10px] border border-[#D9D9D9] bg-white px-3 py-2 text-[13px] font-semibold text-[#2D2D2D] transition hover:bg-[#F3F4F6]">
              <Columns3 className="h-4 w-4" />
              בחירת עמודות
            </summary>
            <div className="absolute left-0 top-full z-30 mt-2 w-64 rounded-[18px] border border-[#D9D9D9] bg-white p-3 shadow-md">
              <div className="mb-3 text-[13px] font-bold text-[#2D2D2D]">בחירת עמודות</div>
              <div className="grid gap-2">
                {ALL_JOB_COLUMNS.map((col) => (
                  <label key={col.key} className="flex items-center justify-between rounded-xl border border-[#D9D9D9] px-3 py-2 text-[13px]">
                    <span>{col.label}</span>
                    <input type="checkbox" checked={visibleColumns.includes(col.key)} onChange={() => toggleColumn(col.key)} className="h-4 w-4 rounded border-[#D9D9D9] accent-[#008080]" />
                  </label>
                ))}
              </div>
            </div>
          </details>

          <ActionButton variant="ghost" icon={RefreshCw} onClick={() => { refetchJobs(); showToast('הרשימה רועננה', 'success') }}>
            רענון
          </ActionButton>
          <ActionButton variant="ghost" icon={Download} onClick={exportCsv}>ייצוא</ActionButton>
          <Link to="/admin/jobs/new">
            <ActionButton variant="primary" icon={Plus}>משרה חדשה</ActionButton>
          </Link>
        </div>
      }
    >
      <div dir="rtl" className="min-h-screen bg-[#F3F4F6] font-['Heebo'] text-[#2D2D2D]">
        <div className="space-y-6">
          <section className="space-y-3">
            {/* שורה עליונה — מספרים גדולים */}
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <KpiCard label="סה״כ משרות" value={kpis.total} hint="לפי הסינון הנוכחי" />
              <KpiCard label="משרות פעילות" value={kpis.active} hint="פעילות כרגע" tone="success" onClick={() => setFilters((prev) => ({ ...prev, job_status: JOB_STATUS_IDS.active }))} />
              <KpiCard label="מפורסמות" value={kpis.published} hint="גלויות באתר הציבורי" onClick={() => setFilters((prev) => ({ ...prev, public_status: PUBLIC_STATUS_IDS.published }))} />
              <KpiCard label="ללא מועמדים" value={kpis.withoutApplicants} hint="דורש טיפול" tone="warning" onClick={() => setFilters((prev) => ({ ...prev, applicants_state: 'without' }))} />
            </div>
            {/* שורה תחתונה — חתכים רוחביים */}
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              <ListKpiCard title="משרות פעילות לפי תפקיד" items={kpis.byRole} empty="אין פעילות" colorFor={(id) => getRoleColorHex(id)} onItemClick={(id) => setFilters((prev) => ({ ...prev, job_role: Number(id), job_sub_role: undefined }))} />
              <ListKpiCard title="משרות פעילות לפי אזור" items={kpis.byRegion} empty="אין פעילות" colorFor={(id) => getRegionColor(id).hex} onItemClick={(id) => setFilters((prev) => ({ ...prev, region_id: Number(id), city_id: undefined }))} />
            </div>
          </section>

          <Toolbar>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E6F3F3] text-[#008080]"><Briefcase className="h-4 w-4" /></div>
                <h2 className="text-[15px] font-bold text-[#2D2D2D]">חיפוש וסינון</h2>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
                <SearchBar value={filters.search ?? ''} onChange={(value) => setFilters((prev) => ({ ...prev, search: value }))} placeholder="חיפוש לפי קוד, כותרת, ארגון או עיר" />
                <SelectFilter value={String(filters.job_status ?? '')} onChange={(value) => setFilters((prev) => ({ ...prev, job_status: value ? Number(value) : undefined }))} options={jobStatuses.map((item) => ({ value: String(item.id), label: item.name }))} placeholder="סטטוס משרה" />
                <SelectFilter value={String(filters.public_status ?? '')} onChange={(value) => setFilters((prev) => ({ ...prev, public_status: value ? Number(value) : undefined }))} options={publicStatuses.map((item) => ({ value: String(item.id), label: item.name }))} placeholder="סטטוס פרסום" />
                <RoleSubRolePicker
                  variant="filter"
                  roleId={filters.job_role ?? null}
                  subRoleIds={filters.job_sub_role ?? []}
                  onRoleChange={(id) => setFilters((prev) => ({ ...prev, job_role: id ?? undefined, job_sub_role: undefined }))}
                  onSubRoleChange={(ids) => setFilters((prev) => ({ ...prev, job_sub_role: ids.length ? ids : undefined }))}
                />
                <SelectFilter value={String(filters.account_link ?? '')} onChange={(value) => setFilters((prev) => ({ ...prev, account_link: value ? Number(value) : undefined }))} options={accountOptions} placeholder="ארגון" />
                <CityRegionPicker
                  variant="filter"
                  cityId={filters.city_id ?? null}
                  regionId={filters.region_id ?? null}
                  cities={cities}
                  regions={regions}
                  onCityChange={(id) => setFilters((prev) => ({ ...prev, city_id: id ?? undefined }))}
                  onRegionChange={(id) => setFilters((prev) => ({ ...prev, region_id: id ?? undefined, city_id: undefined }))}
                />
                <MultiSelectFilter values={filters.scope ?? []} onChange={(values) => setFilters((prev) => ({ ...prev, scope: values.length ? values : undefined }))} options={scopes.map((item) => ({ value: String(item.id), label: item.name }))} placeholder="היקף משרה" />
                <SelectFilter value={String(filters.required_experience ?? '')} onChange={(value) => setFilters((prev) => ({ ...prev, required_experience: value ? Number(value) : undefined }))} options={experienceOptions.map((item) => ({ value: String(item.id), label: item.name }))} placeholder="ניסיון נדרש" />
                <SelectFilter value={String(filters.applicants_state ?? '')} onChange={(value) => setFilters((prev) => ({ ...prev, applicants_state: (value as 'with' | 'without') || undefined }))} options={[{ value: 'with', label: 'עם מועמדים' }, { value: 'without', label: 'ללא מועמדים' }]} placeholder="מצב מועמדים" />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#D9D9D9] pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <InfoPill label={`סה״כ תוצאות: ${filteredJobs.length}`} />
                  <InfoPill label={`פעילות: ${kpis.active}`} tone="success" />
                  <InfoPill label={`מפורסמות: ${kpis.published}`} />
                  <InfoPill label={`ללא מועמדים: ${kpis.withoutApplicants}`} tone="warning" />
                </div>
                {Object.values(filters).some(Boolean) && <ActionButton variant="ghost" onClick={clearFilters}>נקה פילטרים</ActionButton>}
              </div>
            </div>
          </Toolbar>

          <Toolbar>
            {localJobs.length === 0 ? (
              <div className="rounded-[18px] border border-[#D9D9D9] bg-white p-8"><EmptyState icon={Briefcase} title="אין משרות במערכת" description="כאשר ייווצרו משרות הן יוצגו כאן." /></div>
            ) : pageData.length === 0 ? (
              <div className="rounded-[18px] border border-[#D9D9D9] bg-white p-8"><EmptyState icon={Briefcase} title="לא נמצאו תוצאות" description="שני את תנאי הסינון." /></div>
            ) : (
              <div className="overflow-hidden rounded-[18px] border border-[#D9D9D9] bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1280px] border-collapse text-right text-[13px]">
                    <thead className="bg-[#F9FAFB]">
                      <tr className="border-b border-[#D9D9D9] text-[13px] font-bold text-[#6B6B6B]">
                        <th className="w-10 px-3 py-3"><input type="checkbox" checked={pageFullySelected} onChange={togglePageSelection} className="h-4 w-4 rounded border-[#D9D9D9] accent-[#008080]" /></th>
                        {visibleColumns.includes('job_code') && <SortableTh label="קוד" sortKey="job_code" sortBy={sortField} sortDir={sortDir} onSort={toggleSort} />}
                        {visibleColumns.includes('job_role') && <SortableTh label="תפקיד" sortKey="job_role" sortBy={sortField} sortDir={sortDir} onSort={toggleSort} />}
                        {visibleColumns.includes('job_status') && <SortableTh label="סטטוס משרה" sortKey="job_status" sortBy={sortField} sortDir={sortDir} onSort={toggleSort} />}
                        {visibleColumns.includes('city_id') && <SortableTh label="עיר" sortKey="city_id" sortBy={sortField} sortDir={sortDir} onSort={toggleSort} />}
                        {visibleColumns.includes('region_id') && <SortableTh label="אזור" sortKey="region_id" sortBy={sortField} sortDir={sortDir} onSort={toggleSort} />}
                        {visibleColumns.includes('scope') && <SortableTh label="היקף" sortKey="scope" sortBy={sortField} sortDir={sortDir} onSort={toggleSort} />}
                        {visibleColumns.includes('job_title') && <SortableTh label="כותרת" sortKey="job_title" sortBy={sortField} sortDir={sortDir} onSort={toggleSort} />}
                        {visibleColumns.includes('job_sub_role') && <SortableTh label="תתי־תפקידים" sortKey="job_sub_role" sortBy={sortField} sortDir={sortDir} onSort={toggleSort} />}
                        {visibleColumns.includes('account_name') && <SortableTh label="ארגון" sortKey="account_name" sortBy={sortField} sortDir={sortDir} onSort={toggleSort} />}
                        {visibleColumns.includes('employer_name') && <SortableTh label="מעסיק" sortKey="employer_name" sortBy={sortField} sortDir={sortDir} onSort={toggleSort} />}
                        {visibleColumns.includes('recruiter_name') && <SortableTh label="מגייס" sortKey="recruiter_name" sortBy={sortField} sortDir={sortDir} onSort={toggleSort} />}
                        {visibleColumns.includes('public_status') && <SortableTh label="סטטוס פרסום" sortKey="public_status" sortBy={sortField} sortDir={sortDir} onSort={toggleSort} />}
                        {visibleColumns.includes('total_applicants') && <SortableTh label="מועמדים" sortKey="total_applicants" sortBy={sortField} sortDir={sortDir} onSort={toggleSort} />}
                        {visibleColumns.includes('last_publish_date') && <SortableTh label="פרסום אחרון" sortKey="last_publish_date" sortBy={sortField} sortDir={sortDir} onSort={toggleSort} />}
                        {visibleColumns.includes('updated_timestamp') && <SortableTh label="עודכן" sortKey="updated_timestamp" sortBy={sortField} sortDir={sortDir} onSort={toggleSort} />}
                        <th className="w-14 px-3 py-3 text-center">פעולות</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F3F4F6]">
                      {pageData.map((job) => {
                        const jobCode = String(job.job_code)
                        const selected = selectedRows.includes(jobCode)
                        return (
                          <tr key={jobCode} className={`transition ${selected ? 'bg-[#E6F3F3]' : 'hover:bg-[#FAFAF7]'}`}>
                            <td className="px-3 py-3"><input type="checkbox" checked={selected} onChange={() => toggleRowSelection(jobCode)} className="h-4 w-4 rounded border-[#D9D9D9] accent-[#008080]" /></td>
                            {visibleColumns.includes('job_code') && <td className="px-3 py-3"><button type="button" onClick={() => navigate(`/admin/jobs/${encodeURIComponent(jobCode)}`)} className="font-mono font-bold text-[#008080] hover:underline">{job.job_code}</button></td>}
                            {visibleColumns.includes('job_role') && <td className="px-3 py-3"><RoleBadge roleId={Number(job.job_role)} label={roleName(job.job_role)} /></td>}
                            {visibleColumns.includes('job_status') && (
                              <td className="px-3 py-3">
                                <select
                                  value={job.job_status ?? ''}
                                  onChange={(event) => {
                                    const value = Number(event.target.value)
                                    if (value) updateJobPatch(String(job.job_code), { job_status: value }, `סטטוס משרה עודכן ל־${statusName(value)}`)
                                  }}
                                  className={`h-8 cursor-pointer rounded-xl border px-2 text-[12px] font-bold outline-none transition focus:border-[#008080] ${jobStatusSelectClass(Number(job.job_status))}`}
                                >
                                  {jobStatuses.map((status) => <option key={status.id} value={status.id}>{status.name}</option>)}
                                </select>
                              </td>
                            )}
                            {visibleColumns.includes('city_id') && <td className="px-3 py-3">{jobCityName(job)}</td>}
                            {visibleColumns.includes('region_id') && <td className="px-3 py-3"><RegionBadge regionId={Number(job.region_id)} label={jobRegionName(job)} /></td>}
                            {visibleColumns.includes('scope') && <td className="px-3 py-3"><BadgeList ids={normalizeIds(job.scope)} labelById={scopeName} empty="—" /></td>}
                            {visibleColumns.includes('job_title') && <td className="max-w-[230px] px-3 py-3 font-semibold text-[#2D2D2D]">{job.job_title ?? '—'}</td>}
                            {visibleColumns.includes('job_sub_role') && <td className="px-3 py-3"><BadgeList ids={normalizeIds(job.job_sub_role)} labelById={subRoleName} empty="—" /></td>}
                            {visibleColumns.includes('account_name') && <td className="max-w-[220px] px-3 py-3"><span className="inline-flex items-center gap-1.5 rounded-[6px] bg-[#F3F4F6] px-2.5 py-1 text-[12px] font-semibold text-[#008080]"><Building2 className="h-3.5 w-3.5" />{job.account_name ?? '—'}</span></td>}
                            {visibleColumns.includes('employer_name') && <td className="px-3 py-3 text-[13px] text-[#2D2D2D]">{job.employer_contact_name ?? '—'}</td>}
                            {visibleColumns.includes('recruiter_name') && <td className="px-3 py-3 text-[13px] text-[#2D2D2D]">{job.recruiter_contact_name ?? '—'}</td>}
                            {visibleColumns.includes('public_status') && <td className="px-3 py-3"><StatusPill label={publicStatusName(job.public_status)} tone={publicStatusTone(Number(job.public_status))} /></td>}
                            {visibleColumns.includes('total_applicants') && <td className="px-3 py-3"><span className="rounded-[6px] bg-[#F3F4F6] px-2.5 py-1 text-[12px] font-bold">{Number(job.total_applicants ?? 0)}</span></td>}
                            {visibleColumns.includes('last_publish_date') && <td className="px-3 py-3 text-[#6B6B6B]">{job.last_publish_date ? formatDate(job.last_publish_date) : '—'}</td>}
                            {visibleColumns.includes('updated_timestamp') && <td className="px-3 py-3 text-[#6B6B6B]">{job.updated_timestamp ? formatDate(job.updated_timestamp) : '—'}</td>}
                            <td className="px-3 py-3">
                              <RowActionsMenu
                                jobCode={jobCode}
                                pending={rowActionPending === jobCode}
                                onView={() => openPanel(job, 'view')}
                                onEdit={() => navigate(`/admin/jobs/${encodeURIComponent(jobCode)}`)}
                                onDuplicate={() => duplicateJob(job)}
                                onPublish={() => publishJob(job)}
                                onSmartMatch={() => showToast('Smart Match לא מחובר למסך הזה עדיין', 'info')}
                                onWhatsApp={() => openWhatsApp(job)}
                                onArchive={() => updateJobPatch(jobCode, { job_status: JOB_STATUS_IDS.archived, public_status: PUBLIC_STATUS_IDS.hidden, unpublished_at: new Date().toISOString() }, 'המשרה הועברה לארכיון')}
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="border-t border-[#D9D9D9] bg-white px-4 py-3"><Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={filteredJobs.length} /></div>
              </div>
            )}
          </Toolbar>
        </div>

        {panel.open && selectedJob && (
          <UnifiedJobPanel
            mode={panel.mode}
            job={selectedJob}
            draft={jobDraft}
            setDraft={setJobDraft}
            onClose={() => setPanel({ open: false, mode: 'view', jobCode: null })}
            onEdit={() => setPanel((prev) => ({ ...prev, mode: 'edit' }))}
            onView={() => setPanel((prev) => ({ ...prev, mode: 'view' }))}
            onSave={saveEdit}
            saving={savingEdit}
            jobStatuses={jobStatuses}
            publicStatuses={publicStatuses}
            roles={roles}
            editSubRoleOptions={editSubRoleOptions}
            accountsList={accountsList}
            contactsList={contactsList}
            regions={regions}
            cities={cities}
            editCityOptions={editCityOptions}
            scopes={scopes}
            salaryTypes={salaryTypes}
            experienceOptions={experienceOptions}
            roleName={roleName}
            subRoleName={subRoleName}
            scopeName={scopeName}
            statusName={statusName}
            publicStatusName={publicStatusName}
            regionName={regionName}
            cityName={cityName}
            jobCityName={jobCityName}
            jobRegionName={jobRegionName}
            experienceName={experienceName}
            normalizeIds={normalizeIds}
          />
        )}

        {toast.open && (
          <div className="pointer-events-none fixed bottom-4 left-4 z-[60]">
            <div className={`rounded-[18px] border px-4 py-3 shadow-md ${toastClassName(toast.tone)}`}>
              <div className="flex items-center gap-2 text-[13px] font-semibold">
                {toast.tone === 'success' && <CheckCircle2 className="h-4 w-4" />}
                {toast.tone === 'error' && <AlertTriangle className="h-4 w-4" />}
                {toast.message}
              </div>
            </div>
          </div>
        )}
      </div>
    </Shell>
  )
}

function UnifiedJobPanel({
  mode,
  job,
  draft,
  setDraft,
  onClose,
  onEdit,
  onView,
  onSave,
  saving,
  jobStatuses,
  publicStatuses,
  accountsList,
  regions,
  cities,
  scopes,
  salaryTypes,
  experienceOptions,
  roleName,
  subRoleName,
  scopeName,
  statusName,
  publicStatusName,
  jobCityName,
  jobRegionName,
  experienceName,
  normalizeIds,
}: any) {
  const navigate = useNavigate()

  const header = (
    <div className="flex items-start justify-between gap-3 px-5 py-4">
      <div className="space-y-1.5 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-[6px] bg-[#E6F3F3] px-2.5 py-1 font-mono text-[12px] font-bold text-[#008080]">{job.job_code}</span>
          <StatusPill label={statusName(job.job_status)} tone={jobStatusTone(Number(job.job_status))} />
          <StatusPill label={publicStatusName(job.public_status)} tone={publicStatusTone(Number(job.public_status))} />
        </div>
        <h2 className="text-[20px] font-bold text-[#2D2D2D] leading-snug">{job.job_title ?? 'פרטי משרה'}</h2>
        {job.account_name && <p className="text-[13px] text-[#6B6B6B]">{job.account_name}</p>}
      </div>
      <button type="button" onClick={onClose} className="shrink-0 rounded-xl p-2 text-[#6B6B6B] hover:bg-[#F3F4F6]"><X className="h-5 w-5" /></button>
    </div>
  )

  const footer = (
    <div className="flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={onClose}
        className="rounded-[10px] border border-[#D9D9D9] px-4 py-2 text-[13px] font-semibold text-[#6B6B6B] hover:bg-[#F3F4F6]"
      >
        סגור
      </button>
      <div className="flex items-center gap-2">
        {mode === 'view' ? (
          <button
            type="button"
            onClick={onEdit}
            className="rounded-[10px] border border-[#D9D9D9] px-4 py-2 text-[13px] font-semibold text-[#6B6B6B] hover:bg-[#F3F4F6]"
          >
            עריכה מהירה
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onView}
              className="rounded-[10px] border border-[#D9D9D9] px-4 py-2 text-[13px] font-semibold text-[#6B6B6B] hover:bg-[#F3F4F6]"
            >
              ביטול
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="rounded-[10px] bg-[#008080] px-5 py-2 text-[13px] font-semibold text-white hover:bg-[#006D6D] disabled:opacity-60"
            >
              {saving ? 'שומר...' : 'שמור'}
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => navigate(`/admin/jobs/${job.job_code}`)}
          className="rounded-[10px] bg-[#D97706] px-5 py-2 text-[13px] font-semibold text-white hover:bg-[#B45309]"
        >
          עריכה מלאה ←
        </button>
      </div>
    </div>
  )

  return (
    <SidePanel open onClose={onClose} header={header} footer={footer}>
      {mode === 'view' ? (
        <div className="space-y-4">
          {job.public_image_url && (
            <img src={job.public_image_url} alt="תמונת משרה" className="h-40 w-full rounded-[14px] object-cover" />
          )}
          <PanelCard title="פרטי משרה">
            <LabelValue label="כותרת" value={job.job_title ?? '—'} />
            <LabelValue label="תפקיד" value={roleName(job.job_role)} />
            <LabelValue label="תתי־תפקידים" value={namesFromIds(normalizeIds(job.job_sub_role), subRoleName)} />
            <LabelValue label="ארגון" value={job.account_name ?? '—'} />
            <LabelValue label="מעסיק" value={job.employer_contact_name ?? '—'} />
            <LabelValue label="מגייס" value={job.recruiter_contact_name ?? '—'} />
          </PanelCard>
          <PanelCard title="מיקום והיקף">
            <LabelValue label="אזור" value={jobRegionName(job)} />
            <LabelValue label="עיר" value={jobCityName(job)} />
            <LabelValue label="היקף" value={namesFromIds(normalizeIds(job.scope), scopeName)} />
            <LabelValue label="ניסיון" value={experienceName(job.required_experience)} />
          </PanelCard>
          <p className="text-center text-[12px] text-[#9CA3AF]">לשכר, תיאור, הערות ותמונה — לחצי על עריכה מלאה</p>
        </div>
      ) : (
        <div className="space-y-4">
          <PanelCard title="פרטי משרה">
            <div className="rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] px-3 py-2 text-[12px] font-mono font-bold text-[#008080]">
              {draft.job_code}
            </div>
            <EditTextField label="כותרת משרה" value={draft.job_title} onChange={(value: string) => setDraft((prev: JobDraft) => ({ ...prev, job_title: value }))} />
            <EditSelectField label="סטטוס משרה" value={draft.job_status != null ? String(draft.job_status) : ''} onChange={(value: string) => setDraft((prev: JobDraft) => ({ ...prev, job_status: value ? Number(value) : null }))} options={jobStatuses.map((item: DictItem) => ({ value: String(item.id), label: item.name }))} />
            <EditSelectField label="סטטוס פרסום" value={draft.public_status != null ? String(draft.public_status) : ''} onChange={(value: string) => setDraft((prev: JobDraft) => ({ ...prev, public_status: value ? Number(value) : null }))} options={publicStatuses.map((item: DictItem) => ({ value: String(item.id), label: item.name }))} />
            <RoleSubRolePicker
              variant="edit"
              roleId={draft.job_role}
              subRoleIds={draft.job_sub_role}
              onRoleChange={(id) => setDraft((prev: JobDraft) => ({ ...prev, job_role: id, job_sub_role: [] }))}
              onSubRoleChange={(ids) => setDraft((prev: JobDraft) => ({ ...prev, job_sub_role: ids }))}
            />
            <EditSelectField label="ארגון" value={draft.account_link != null ? String(draft.account_link) : ''} onChange={(value: string) => setDraft((prev: JobDraft) => ({ ...prev, account_link: value ? Number(value) : null }))} options={accountsList.map((item: any) => ({ value: String(item.account_id), label: item.account_name ?? '' }))} />
            <ContactPicker label="מעסיק" value={draft.rel_employer_contact} onChange={(id) => setDraft((prev: JobDraft) => ({ ...prev, rel_employer_contact: id }))} />
            <ContactPicker label="מגייס (אופציונלי)" value={draft.rel_recruiter_contact} onChange={(id) => setDraft((prev: JobDraft) => ({ ...prev, rel_recruiter_contact: id }))} />
          </PanelCard>

          <PanelCard title="מיקום והיקף">
            <CityRegionPicker
              variant="edit"
              cityId={draft.city_id}
              regionId={draft.region_id}
              cities={cities}
              regions={regions}
              onCityChange={(id) => setDraft((prev: JobDraft) => ({ ...prev, city_id: id }))}
              onRegionChange={(id) => setDraft((prev: JobDraft) => ({ ...prev, region_id: id, city_id: null }))}
            />
            <EditMultiSelectField label="היקף משרה" values={draft.scope} onChange={(values: number[]) => setDraft((prev: JobDraft) => ({ ...prev, scope: values }))} options={scopes.map((item: DictItem) => ({ value: String(item.id), label: item.name }))} />
            <EditMultiSelectField label="סוג שכר" values={draft.salary_type_ids} onChange={(values: number[]) => setDraft((prev: JobDraft) => ({ ...prev, salary_type_ids: values }))} options={salaryTypes.map((item: DictItem) => ({ value: String(item.id), label: item.name }))} />
            <EditSelectField label="ניסיון נדרש" value={draft.required_experience != null ? String(draft.required_experience) : ''} onChange={(value: string) => setDraft((prev: JobDraft) => ({ ...prev, required_experience: value ? Number(value) : null }))} options={experienceOptions.map((item: DictItem) => ({ value: String(item.id), label: item.name }))} />
          </PanelCard>

          <p className="text-center text-[12px] text-[#9CA3AF]">לשכר, תיאור, הערות ותמונה — לחצי על עריכה מלאה</p>
        </div>
      )}
    </SidePanel>
  )
}

function KpiCard({ label, value, hint, tone = 'default', onClick }: { label: string; value: number; hint: string; tone?: 'default' | 'warning' | 'success'; onClick?: () => void }) {
  const cls = tone === 'success' ? 'border-[#BBF7D0] bg-[#F0FDF4] text-[#16A34A]' : tone === 'warning' ? 'border-[#FDE68A] bg-[#FFFBEB] text-[#D97706]' : 'border-[#D9D9D9] bg-white text-[#008080]'
  return (
    <button type="button" onClick={onClick} className={`rounded-[18px] border p-5 text-right shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${cls}`}>
      <div className="text-[13px] font-semibold text-[#6B6B6B]">{label}</div>
      <div className="mt-2 text-[28px] font-bold">{value}</div>
      <div className="mt-1 text-[12px] font-medium text-[#6B6B6B]">{hint}</div>
    </button>
  )
}

function ListKpiCard({ title, items, empty, onItemClick, colorFor }: { title: string; items: Array<{ id: number; name: string; count: number }>; empty: string; onItemClick: (id: number) => void; colorFor?: (id: number) => string }) {
  const max = items.reduce((acc, item) => Math.max(acc, item.count), 0) || 1
  return (
    <div className="rounded-[18px] border border-[#D9D9D9] bg-white p-4 shadow-sm">
      <div className="mb-3 text-[13px] font-bold text-[#2D2D2D]">{title}</div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {items.length ? items.map((item) => {
          const color = colorFor?.(item.id) ?? '#008080'
          const pct = Math.round((item.count / max) * 100)
          return (
            <button key={item.id} type="button" onClick={() => onItemClick(item.id)} className="group flex flex-col gap-1.5 rounded-xl border border-[#F3F4F6] px-3 py-2 text-right transition hover:bg-[#FAFAF7]">
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2 text-[12px] font-medium text-[#2D2D2D]">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                  <span className="truncate">{item.name}</span>
                </span>
                <span className="shrink-0 text-[13px] font-bold text-[#2D2D2D]">{item.count}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#F3F4F6]">
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(pct, 6)}%`, backgroundColor: color }} />
              </div>
            </button>
          )
        }) : <div className="col-span-full text-[12px] text-[#6B6B6B]">{empty}</div>}
      </div>
    </div>
  )
}

function InfoPill({ label, tone = 'default' }: { label: string; tone?: 'default' | 'warning' | 'success' }) {
  const cls = tone === 'success' ? 'bg-[#F0FDF4] text-[#16A34A]' : tone === 'warning' ? 'bg-[#FFFBEB] text-[#D97706]' : 'bg-[#F3F4F6] text-[#6B6B6B]'
  return <span className={`rounded-[6px] px-3 py-1 text-[12px] font-semibold ${cls}`}>{label}</span>
}

function SortableTh({ label, sortKey, sortBy, sortDir, onSort }: { label: string; sortKey: string; sortBy: string | null; sortDir: 'asc' | 'desc'; onSort: (key: string) => void }) {
  const active = sortBy === sortKey
  return (
    <th onClick={() => onSort(sortKey)} className="cursor-pointer select-none whitespace-nowrap px-3 py-3 hover:bg-slate-100">
      <span className="inline-flex items-center gap-1.5">
        {label}
        <span className={`flex flex-col ${active ? 'text-[#008080]' : 'text-slate-400'}`}>
          <ChevronUp className={`h-3 w-3 -mb-1 ${active && sortDir === 'asc' ? 'text-[#008080]' : 'text-slate-300'}`} />
          <ChevronDown className={`h-3 w-3 ${active && sortDir === 'desc' ? 'text-[#008080]' : 'text-slate-300'}`} />
        </span>
      </span>
    </th>
  )
}

function RowActionsMenu({
  jobCode,
  pending,
  onView,
  onEdit,
  onDuplicate,
  onPublish,
  onSmartMatch,
  onWhatsApp,
  onArchive,
}: {
  jobCode: string
  pending?: boolean
  onView: () => void
  onEdit: () => void
  onDuplicate: () => void
  onPublish: () => void
  onSmartMatch: () => void
  onWhatsApp: () => void
  onArchive: () => void
}) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  const MENU_WIDTH = 192 // w-48
  const MENU_HEIGHT = 320 // הערכה גסה לצורך flip

  const reposition = () => {
    const btn = buttonRef.current
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    // RTL: מיישרים לפי הקצה השמאלי של הכפתור; אם חורג משמאל — צמוד לקצה החלון.
    let left = rect.left
    if (left + MENU_WIDTH > window.innerWidth - 8) left = window.innerWidth - MENU_WIDTH - 8
    if (left < 8) left = 8
    // flip כלפי מעלה אם אין מקום מלמטה.
    const openUp = rect.bottom + MENU_HEIGHT > window.innerHeight && rect.top > MENU_HEIGHT
    const top = openUp ? rect.top - 8 - Math.min(MENU_HEIGHT, rect.top - 8) : rect.bottom + 8
    setCoords({ top, left })
  }

  useLayoutEffect(() => {
    if (!open) return
    reposition()
    const onScroll = () => setOpen(false)
    const onResize = () => setOpen(false)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    window.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDocClick)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDocClick)
    }
  }, [open])

  const run = (fn: () => void) => { setOpen(false); fn() }

  return (
    <div className="flex justify-center">
      <button
        ref={buttonRef}
        type="button"
        title={`פעולות למשרה ${jobCode}`}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-[10px] border border-[#D9D9D9] bg-white text-[#6B6B6B] shadow-[3px_3px_6px_rgba(0,0,0,0.08)] transition-all hover:text-[#008080] hover:shadow-[1px_1px_3px_rgba(0,0,0,0.10)]"
      >
        {pending ? <Clock3 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-5 w-5" />}
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          dir="rtl"
          style={{ position: 'fixed', top: coords.top, left: coords.left, width: MENU_WIDTH }}
          className="z-[9999] overflow-hidden rounded-[16px] border border-[#D9D9D9] bg-white p-1.5 text-right shadow-xl"
        >
          <RowActionItem icon={<Eye className="h-4 w-4" />} label="צפייה בפאנל" onClick={() => run(onView)} />
          <RowActionItem icon={<Edit2 className="h-4 w-4" />} label="עריכה מלאה" onClick={() => run(onEdit)} />
          <RowActionItem icon={<Copy className="h-4 w-4" />} label="שכפול" onClick={() => run(onDuplicate)} disabled={pending} />
          <RowActionItem icon={<Send className="h-4 w-4" />} label="פרסום" onClick={() => run(onPublish)} disabled={pending} />
          <RowActionItem icon={<Sparkles className="h-4 w-4" />} label="Smart Match" onClick={() => run(onSmartMatch)} />
          <RowActionItem icon={<MessageCircle className="h-4 w-4" />} label="וואטסאפ" onClick={() => run(onWhatsApp)} />
          <div className="my-1 border-t border-[#F3F4F6]" />
          <RowActionItem icon={<Archive className="h-4 w-4" />} label="ארכוב" onClick={() => run(onArchive)} disabled={pending} danger />
        </div>,
        document.body,
      )}
    </div>
  )
}

function RowActionItem({
  icon,
  label,
  onClick,
  disabled,
  danger,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-semibold transition ${
        danger
          ? 'text-[#991B1B] hover:bg-[#FEE2E2]'
          : 'text-[#2D2D2D] hover:bg-[#F3F4F6] hover:text-[#008080]'
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

// RoleBadge imported from shared component above

function StatusPill({ label, tone }: { label: string; tone: 'default' | 'success' | 'warning' | 'danger' | 'muted' }) {
  const cls = {
    default: 'bg-[#E6F3F3] text-[#006D6D]',
    success: 'bg-[#DCFCE7] text-[#166534]',
    warning: 'bg-[#FEF3C7] text-[#B45309]',
    danger: 'bg-[#FEE2E2] text-[#991B1B]',
    muted: 'bg-[#F3F4F6] text-[#6B6B6B]',
  }[tone]
  return <span className={`inline-flex rounded-[6px] px-2.5 py-1 text-[12px] font-bold ${cls}`}>{label}</span>
}

function BadgeList({ ids, labelById, empty }: { ids: number[]; labelById: (id: number) => string; empty: string }) {
  if (!ids.length) return <span className="text-slate-400">{empty}</span>
  return (
    <div className="flex max-w-[260px] flex-wrap gap-1">
      {ids.slice(0, 4).map((id) => <span key={id} className="rounded-[6px] bg-[#F3F4F6] px-2 py-0.5 text-[11px] font-semibold text-[#2D2D2D]">{labelById(id)}</span>)}
      {ids.length > 4 && <span className="rounded-[6px] bg-[#E6F3F3] px-2 py-0.5 text-[11px] font-bold text-[#008080]">+{ids.length - 4}</span>}
    </div>
  )
}

function MultiSelectFilter({ values, onChange, options, placeholder, disabled }: { values: number[]; onChange: (values: number[]) => void; options: { value: string; label: string }[]; placeholder: string; disabled?: boolean }) {
  const selectedLabels = options.filter((opt) => values.includes(Number(opt.value))).map((opt) => opt.label)
  const toggle = (rawValue: string) => {
    const value = Number(rawValue)
    onChange(values.includes(value) ? values.filter((id) => id !== value) : [...values, value])
  }
  return (
    <details className="relative">
      <summary className={`flex h-10 cursor-pointer list-none items-center justify-between rounded-xl border border-[#D9D9D9] bg-white px-3 text-[13px] font-medium outline-none ${disabled ? 'pointer-events-none opacity-50' : 'hover:bg-[#F9FAFB]'}`}>
        <span className={selectedLabels.length ? 'truncate text-[#2D2D2D]' : 'truncate text-[#6B6B6B]'}>{selectedLabels.length ? selectedLabels.join(', ') : placeholder}</span>
        <ChevronDown className="h-4 w-4 text-[#6B6B6B]" />
      </summary>
      {!disabled && (
        <div className="absolute right-0 top-full z-40 mt-2 max-h-72 w-full min-w-[240px] overflow-y-auto rounded-[18px] border border-[#D9D9D9] bg-white p-2 shadow-md">
          {options.length ? options.map((opt) => (
            <label key={opt.value} className="flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-[13px] hover:bg-[#F3F4F6]">
              <span>{opt.label}</span>
              <input type="checkbox" checked={values.includes(Number(opt.value))} onChange={() => toggle(opt.value)} className="h-4 w-4 rounded border-[#D9D9D9] accent-[#008080]" />
            </label>
          )) : <div className="px-3 py-2 text-[13px] text-[#6B6B6B]">אין אפשרויות</div>}
        </div>
      )}
    </details>
  )
}

function EditMultiSelectField({ label, values, onChange, options, disabled, placeholder = 'בחר' }: { label: string; values: number[]; onChange: (values: number[]) => void; options: { value: string; label: string }[]; disabled?: boolean; placeholder?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-[#6B6B6B]">{label}</span>
      <div className={`rounded-xl border border-[#D9D9D9] bg-white p-2 ${disabled ? 'opacity-50' : ''}`}>
        {disabled ? <div className="px-2 py-1 text-[13px] text-[#6B6B6B]">{placeholder}</div> : options.length ? (
          <div className="grid gap-1">
            {options.map((opt) => {
              const numericValue = Number(opt.value)
              const checked = values.includes(numericValue)
              return (
                <label key={opt.value} className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-[13px] hover:bg-[#F3F4F6]">
                  <span>{opt.label}</span>
                  <input type="checkbox" checked={checked} onChange={() => onChange(checked ? values.filter((id) => id !== numericValue) : [...values, numericValue])} className="h-4 w-4 rounded border-[#D9D9D9] accent-[#008080]" />
                </label>
              )
            })}
          </div>
        ) : <div className="px-2 py-1 text-[13px] text-[#6B6B6B]">אין אפשרויות</div>}
      </div>
    </label>
  )
}

function PanelCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-[18px] border border-[#D9D9D9] bg-white p-5 shadow-sm"><h3 className="mb-4 text-[15px] font-bold text-[#2D2D2D]">{title}</h3>{children}</section>
}

function ImageUploadField({ jobCode, value, onChange }: { jobCode: string; value: string; onChange: (url: string) => void }) {
  const [dragging, setDragging] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${jobCode}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('job-images').upload(path, file, { upsert: true })
      if (error) throw error
      const { data } = supabase.storage.from('job-images').getPublicUrl(path)
      onChange(data.publicUrl)
    } catch (err) {
      console.error('שגיאה בהעלאת תמונה:', err)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); const file = e.dataTransfer.files[0]; if (file) uploadFile(file) }}
      className={`mt-2 flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-[13px] transition ${dragging ? 'border-[#008080] bg-[#E6F3F3]' : 'border-[#D9D9D9] bg-white'}`}
    >
      {uploading ? (
        <span className="text-[#008080]">מעלה תמונה...</span>
      ) : (
        <>
          <ImageIcon className="mb-2 h-6 w-6 text-[#6B6B6B]" />
          <span className="text-[#6B6B6B]">גרור תמונה לכאן</span>
          <label className="mt-2 cursor-pointer text-[#008080] underline">
            או בחר קובץ
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadFile(file) }} />
          </label>
          {value && <img src={value} alt="תצוגה מקדימה" className="mt-3 h-24 w-full rounded-xl object-cover" />}
        </>
      )}
    </div>
  )
}

function LabelValue({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="mb-2 grid grid-cols-[120px_1fr] gap-3 text-[13px]"><span className="font-semibold text-[#6B6B6B]">{label}</span><span className="font-medium text-[#2D2D2D]">{value}</span></div>
}

function EditTextField({ label, value, onChange, type = 'text', readOnly }: { label: string; value: string; onChange: (value: string) => void; type?: string; readOnly?: boolean }) {
  return <label className="flex flex-col gap-1.5"><span className="text-[13px] font-semibold text-[#6B6B6B]">{label}</span><input dir="rtl" type={type} value={value} onChange={(event) => onChange(event.target.value)} readOnly={readOnly} className={`h-10 rounded-xl border border-[#D9D9D9] bg-white px-3 text-[13px] font-medium text-[#2D2D2D] outline-none focus:border-[#008080] ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`} /></label>
}

function EditSelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  return <label className="flex flex-col gap-1.5"><span className="text-[13px] font-semibold text-[#6B6B6B]">{label}</span><select dir="rtl" value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-xl border border-[#D9D9D9] bg-white px-3 text-[13px] font-medium text-[#2D2D2D] outline-none focus:border-[#008080]"><option value="">בחר</option>{options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></label>
}

function EditTextareaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="flex flex-col gap-1.5"><span className="text-[13px] font-semibold text-[#6B6B6B]">{label}</span><textarea dir="rtl" rows={4} value={value} onChange={(event) => onChange(event.target.value)} className="rounded-xl border border-[#D9D9D9] bg-white px-3 py-2 text-[13px] font-medium text-[#2D2D2D] outline-none focus:border-[#008080]" /></label>
}

function cleanText(value: string) {
  const trimmed = String(value ?? '').trim()
  return trimmed || null
}

function toNullableNumber(value: string) {
  if (String(value ?? '').trim() === '') return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function namesFromIds(ids: number[], labelById: (id: number) => string) {
  const names = ids.map(labelById).filter((name) => name && name !== '—')
  return names.length ? names.join(', ') : '—'
}

function jobStatusSelectClass(status: number) {
  if (status === JOB_STATUS_IDS.active) {
    return 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534] focus:ring-2 focus:ring-[#DCFCE7]'
  }
  if (
    status === JOB_STATUS_IDS.closedSuccess ||
    status === JOB_STATUS_IDS.closedOther ||
    status === JOB_STATUS_IDS.cancelled ||
    status === JOB_STATUS_IDS.archived
  ) {
    return 'border-[#FECACA] bg-[#FEE2E2] text-[#991B1B] focus:ring-2 focus:ring-[#FEE2E2]'
  }
  if (status === JOB_STATUS_IDS.hold || status === JOB_STATUS_IDS.draft || status === JOB_STATUS_IDS.new) {
    return 'border-[#FDE68A] bg-[#FFFBEB] text-[#B45309] focus:ring-2 focus:ring-[#FEF3C7]'
  }
  return 'border-[#D9D9D9] bg-white text-[#6B6B6B] focus:ring-2 focus:ring-[#E6F3F3]'
}

function jobStatusTone(status: number): 'default' | 'success' | 'warning' | 'danger' | 'muted' {
  if (status === JOB_STATUS_IDS.active) return 'success'
  if (status === JOB_STATUS_IDS.hold || status === JOB_STATUS_IDS.draft || status === JOB_STATUS_IDS.new) return 'warning'
  if (
    status === JOB_STATUS_IDS.closedSuccess ||
    status === JOB_STATUS_IDS.closedOther ||
    status === JOB_STATUS_IDS.cancelled ||
    status === JOB_STATUS_IDS.archived
  ) return 'danger'
  if (status === JOB_STATUS_IDS.filled) return 'default'
  return 'muted'
}

function publicStatusTone(status: number): 'default' | 'success' | 'warning' | 'danger' | 'muted' {
  if (status === PUBLIC_STATUS_IDS.published) return 'success'
  if (status === PUBLIC_STATUS_IDS.waitingApproval || status === PUBLIC_STATUS_IDS.draft) return 'warning'
  if (status === PUBLIC_STATUS_IDS.hidden) return 'muted'
  return 'muted'
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
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

function normalizePhoneForWhatsapp(value: string | null | undefined) {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('972')) return digits
  if (digits.startsWith('0')) return `972${digits.slice(1)}`
  if (digits.length === 9) return `972${digits}`
  return digits
}

function buildCsv(rows: Array<Record<string, string | number>>) {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  return [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => `"${String(row[header] ?? '').replace(/"/g, '""')}"`).join(',')),
  ].join('\n')
}

function toastClassName(tone: ToastTone) {
  if (tone === 'success') return 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]'
  if (tone === 'error') return 'border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]'
  return 'border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]'
}