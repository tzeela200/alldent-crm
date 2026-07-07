import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  Columns3,
  Database,
  Download,
  Edit2,
  Eye,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Tag,
  UserCheck,
  Users,
  WandSparkles,
  X,
} from 'lucide-react'

import {
  Shell,
  Toolbar,
  SearchBar,
  SelectFilter,
  ActionButton,
} from '@/components/layout/Shell'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { CityRegionPicker } from '@/components/ui/CityRegionPicker'
import { RoleSubRolePicker } from '@/components/ui/RoleSubRolePicker'
import { RegionBadge } from '@/components/admin/RegionBadge'
import { RoleBadge } from '@/components/admin/RoleBadge'
import SidePanel from '@/components/ui/SidePanel'
import { AdminTable, type AdminColumn } from '@/components/admin/AdminTable'
import { AdminTablePagination } from '@/components/admin/AdminTablePagination'
import { AdminActionsMenu, type AdminActionMenuItem } from '@/components/admin/AdminActionsMenu'
import { AdminPanelSection } from '@/components/admin/AdminPanelSection'
import { AdminPanelField } from '@/components/admin/AdminPanelField'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { formatPhone as libFormatPhone } from '@/lib/normalizePhone'
import {
  DICT_CHECK_STATUSES,
  DICT_EXPERIENCE,
  DICT_ROLES,
  DICT_SOCIAL_STATUSES,
  DICT_SUB_ROLES,
} from '@/lib/dicts'
import type { Contact } from '@/types'

type ContactRecord = Contact
type JobRecord = { job_code: string; job_status: number; job_role?: number; job_title?: string }
type DictItem = { id: number; name: string }

type ActiveTab = 'active' | 'seekers'

type ExtendedCandidateFilters = {
  search?: string
  role?: number
  sub_role_ids?: number[]
  experience?: number
  availability?: number
  work_status?: number
  preferred_scope?: number
  region_id?: number
  city_id?: number
  has_cv?: 'yes' | 'no'
  tag?: string
  social_status?: number
  check_status?: number
  salary_band?: 'low' | 'mid' | 'high'
  follow_up_due?: 'yes'
  recent_activity?: 'yes'
  active_search_only?: 'yes'
  passive_only?: 'yes'
  immediate_availability?: 'yes'
  has_applications?: 'yes'
}

type ToastTone = 'success' | 'error' | 'info'
type ToastState = { open: boolean; tone: ToastTone; message: string }
type QuickSheetState = { open: boolean; contactId: number | null }
type CreateApplicationState = { open: boolean; contactId: number | null; selectedJobCode: string }
type BulkTagAction = 'add' | 'remove' | ''

type TagRow = { id: number; contact_id: number; tag: string | null; tag_id: number | null }

type CandidateView = ContactRecord & {
  mergedTagNames: string[]
  mergedTagRows: TagRow[]
  derived: {
    hasPhone: boolean
    hasCv: boolean
    noCvSignal: boolean
    partialLocation: boolean
    highSalary: boolean
    followUpDue: boolean
    recentActivity: boolean
    activeSearch: boolean
    passiveSearch: boolean
    immediateAvailability: boolean
    hasApplications: boolean
    highPotential: boolean
    activeAppsCount: number
    totalAppsCount: number
  }
}

type KpiTone = 'default' | 'success' | 'warning' | 'accent'

const FINAL_APP_STATUSES = [5, 10, 13, 14, 15]

const PAGE_SIZE = 20

const ALL_COLUMNS = [
  { key: 'name', label: 'שם' },
  { key: 'phone', label: 'נייד' },
  { key: 'email', label: 'אימייל' },
  { key: 'role', label: 'תפקיד מועמד' },
  { key: 'sub_role', label: 'תת־תפקיד' },
  { key: 'experience', label: 'ניסיון' },
  { key: 'availability', label: 'זמינות' },
  { key: 'work_status', label: 'סטטוס תעסוקה' },
  { key: 'scope', label: 'היקף מועדף' },
  { key: 'languages', label: 'שפות' },
  { key: 'city', label: 'עיר מועמד' },
  { key: 'region', label: 'אזור מועמד' },
  { key: 'cv', label: 'קו"ח' },
  { key: 'tags', label: 'תגיות' },
  { key: 'salary', label: 'ציפיות שכר' },
  { key: 'active_apps', label: 'הגשות פעילות' },
  { key: 'prev_apps', label: 'הגשות קודמות' },
] as const

const DEFAULT_COLUMNS = [
  'name',
  'phone',
  'email',
  'role',
  'experience',
  'availability',
  'work_status',
  'city',
  'region',
  'cv',
  'tags',
  'active_apps',
  'prev_apps',
] as const

function normalizeDigits(value?: string | null) {
  return String(value ?? '').replace(/\D/g, '')
}

// Israeli phone display (handles the DB 972XXXXXXXXX format → 05X-XXXXXXX)
function formatPhone(value?: string | null) {
  const out = libFormatPhone(value)
  return out || '—'
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('he-IL', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

function formatSalary(hourly?: number | null, monthly?: number | null) {
  if (typeof hourly === 'number') return `${new Intl.NumberFormat('he-IL').format(hourly)} ₪ / שעה`
  if (typeof monthly === 'number') return `${new Intl.NumberFormat('he-IL').format(monthly)} ₪ / חודש`
  return '—'
}

function toCsv(rows: Record<string, string>[]) {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const escapeValue = (v: string) => {
    if (v.includes('"') || v.includes(',') || v.includes('\n')) return `"${v.replace(/"/g, '""')}"`
    return v
  }
  return [headers.join(','), ...rows.map((row) => headers.map((h) => escapeValue(String(row[h] ?? ''))).join(','))].join('\n')
}

function isDue(value?: string | null) {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  return date.getTime() <= Date.now()
}

function isRecent(value?: string | null, days = 14) {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  const diff = Date.now() - date.getTime()
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000
}

function dictLabel(items: DictItem[], id: number | null | undefined): string {
  if (id == null) return '—'
  return items.find((item) => item.id === id)?.name ?? '—'
}

function availabilityTone(id?: number | null) {
  if (id === 1 || id === 2) return 'success'
  if (id === 3 || id === 4) return 'warning'
  return 'muted'
}

function toneClass(tone: 'default' | 'success' | 'warning' | 'danger' | 'muted' | 'accent') {
  if (tone === 'success') return 'bg-green-50 text-green-700'
  if (tone === 'warning') return 'bg-amber-50 text-amber-700'
  if (tone === 'danger') return 'bg-red-50 text-red-700'
  if (tone === 'accent') return 'bg-orange-50 text-orange-700'
  if (tone === 'muted') return 'bg-slate-100 text-slate-600'
  return 'bg-teal-50 text-teal-700'
}

export default function AdminCandidatesPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<ActiveTab>('active')
  const [filters, setFilters] = useState<ExtendedCandidateFilters>({})
  const [page, setPage] = useState(0)
  const [selectedRows, setSelectedRows] = useState<number[]>([])
  const [toast, setToast] = useState<ToastState>({ open: false, tone: 'info', message: '' })
  const [sheet, setSheet] = useState<QuickSheetState>({ open: false, contactId: null })
  const [applicationState, setApplicationState] = useState<CreateApplicationState>({
    open: false,
    contactId: null,
    selectedJobCode: '',
  })
  const [isCreatingApp, setIsCreatingApp] = useState(false)
  const [addTagDialog, setAddTagDialog] = useState<{ contactId: number | null; tagId: string }>({ contactId: null, tagId: '' })
  const [bulkTagAction, setBulkTagAction] = useState<BulkTagAction>('')
  const [bulkTagValue, setBulkTagValue] = useState<string>('')
  const [visibleColumns, setVisibleColumns] = useState<string[]>([...DEFAULT_COLUMNS])
  const [sortBy, setSortBy] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const onSort = (key: string) => {
    if (sortBy === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(key)
      setSortDir('asc')
    }
    setPage(0)
  }

  // ── Tab A: active candidates from rel_contact_profiles ──────────────────
  const { data: candidateIds = [], isLoading: candidateIdsLoading, isError: candidateIdsError } = useQuery<number[]>({
    queryKey: ['candidate-ids'],
    queryFn: async () => {
      const { data, error } = await supabase.from('rel_contact_profiles').select('contact_id').eq('profile_type_id', 1)
      if (error) throw error
      return (data ?? []).map((r: { contact_id: number }) => r.contact_id)
    },
    staleTime: 60_000,
  })

  const { data: rawContacts = [], isLoading: rawContactsLoading, isError: rawContactsError } = useQuery<Contact[]>({
    queryKey: ['contacts', 'candidates', candidateIds],
    queryFn: async () => {
      if (candidateIds.length === 0) return []
      const { data, error } = await supabase.from('contact').select('*').in('contact_id', candidateIds).order('contact_id')
      if (error) throw error
      return (data ?? []) as Contact[]
    },
    enabled: candidateIds.length > 0,
    staleTime: 60_000,
  })

  // ── Tab B: job seekers by work_status ────────────────────────────────────
  const { data: seekerContacts = [], isLoading: seekerLoading, isError: seekerError } = useQuery<Contact[]>({
    queryKey: ['contacts', 'seekers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('contact').select('*').in('work_status', [1, 2, 6]).order('contact_id')
      if (error) throw error
      return (data ?? []) as Contact[]
    },
    enabled: activeTab === 'seekers',
    staleTime: 60_000,
  })

  // ── Dicts ─────────────────────────────────────────────────────────────────
  const { data: regionOptions = [] } = useQuery<DictItem[]>({
    queryKey: ['dict_regions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_regions').select('id,name').order('name')
      if (error) throw error
      return data ?? []
    },
    staleTime: 5 * 60_000,
  })

  const { data: languageOptions = [] } = useQuery<DictItem[]>({
    queryKey: ['dict_languages'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_languages').select('id,name').order('name')
      if (error) throw error
      return data ?? []
    },
    staleTime: 10 * 60_000,
  })

  const { data: cityOptions = [] } = useQuery<{ id: number; name: string; region_id: number | null }[]>({
    queryKey: ['dict_cities-all'],
    queryFn: async () => {
      const PAGE = 1000
      const all: { id: number; name: string; region_id: number | null }[] = []
      let from = 0
      while (true) {
        const { data, error } = await supabase.from('dict_cities').select('id,name,region_id').order('name').range(from, from + PAGE - 1)
        if (error) throw error
        const batch = (data ?? []) as { id: number; name: string; region_id: number | null }[]
        if (!batch.length) break
        all.push(...batch)
        if (batch.length < PAGE) break
        from += PAGE
      }
      return all
    },
    staleTime: 5 * 60_000,
  })

  const { data: workStatusOptions = [] } = useQuery<DictItem[]>({
    queryKey: ['dict_contact_work_statuses'],
    queryFn: async () => {
      const { data } = await supabase.from('dict_contact_work_statuses').select('id,name').order('id')
      return data ?? []
    },
    staleTime: Infinity,
  })

  const { data: availabilityOptions = [] } = useQuery<DictItem[]>({
    queryKey: ['dict_availability'],
    queryFn: async () => {
      const { data } = await supabase.from('dict_availability').select('id,name').order('id')
      return data ?? []
    },
    staleTime: Infinity,
  })

  const { data: candidateTagOptions = [] } = useQuery<DictItem[]>({
    queryKey: ['dict_candidate_tags'],
    queryFn: async () => {
      const { data } = await supabase.from('dict_candidate_tags').select('id,name').eq('is_active', true).order('sort_order')
      return data ?? []
    },
    staleTime: Infinity,
  })

  const { data: scopeOptions = [] } = useQuery<DictItem[]>({
    queryKey: ['dict_scopes'],
    queryFn: async () => {
      const { data } = await supabase.from('dict_scopes').select('id,name').order('id')
      return data ?? []
    },
    staleTime: Infinity,
  })

  // ── Tags ──────────────────────────────────────────────────────────────────
  const { data: allTagRows = [], isError: allTagRowsError } = useQuery<TagRow[]>({
    queryKey: ['contact_tags_all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('contact_tags').select('id,contact_id,tag,tag_id')
      if (error) throw error
      return (data ?? []) as TagRow[]
    },
    staleTime: 60_000,
  })

  // ── Active jobs (for create application dialog) ───────────────────────────
  const { data: activeJobs = [] } = useQuery<JobRecord[]>({
    queryKey: ['active_jobs_for_apply'],
    queryFn: async () => {
      const { data } = await supabase.from('job').select('job_code,job_status,job_role,job_title').eq('job_status', 3).order('job_code')
      return (data ?? []) as JobRecord[]
    },
    staleTime: 30_000,
  })

  // ── Resolve tag display name ──────────────────────────────────────────────
  const resolveTagName = (row: TagRow): string => {
    if (row.tag_id) {
      return candidateTagOptions.find((t) => t.id === row.tag_id)?.name ?? row.tag ?? ''
    }
    return row.tag ?? ''
  }

  // Tag maps keyed by contact_id
  const baseTagRowMap = useMemo<Record<number, TagRow[]>>(() => {
    return allTagRows.reduce<Record<number, TagRow[]>>((acc, row) => {
      if (!acc[row.contact_id]) acc[row.contact_id] = []
      acc[row.contact_id].push(row)
      return acc
    }, {})
  }, [allTagRows])

  const baseTagNameMap = useMemo<Record<number, string[]>>(() => {
    const map: Record<number, string[]> = {}
    for (const [cid, rows] of Object.entries(baseTagRowMap)) {
      map[Number(cid)] = rows.map(resolveTagName).filter(Boolean)
    }
    return map
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseTagRowMap, candidateTagOptions])

  // ── Determine current pool ─────────────────────────────────────────────────
  const currentPoolContacts = activeTab === 'active' ? rawContacts : seekerContacts
  const currentContactIds = useMemo(
    () => currentPoolContacts.map((c) => c.contact_id),
    [currentPoolContacts],
  )

  // ── Applications bulk fetch ────────────────────────────────────────────────
  const { data: allApplications = [], isError: allApplicationsError } = useQuery<{ application_id: number; candidate_link: number | null; application_status: number | null }[]>({
    queryKey: ['candidate_applications_bulk', currentContactIds],
    queryFn: async () => {
      if (currentContactIds.length === 0) return []
      const { data, error } = await supabase
        .from('applications')
        .select('application_id,candidate_link,application_status')
        .in('candidate_link', currentContactIds)
      if (error) throw error
      return data ?? []
    },
    enabled: currentContactIds.length > 0,
    staleTime: 30_000,
  })

  const applicationCountMap = useMemo(() => {
    const map: Record<number, { total: number; active: number }> = {}
    for (const app of allApplications) {
      const key = app.candidate_link
      if (!key) continue
      if (!map[key]) map[key] = { total: 0, active: 0 }
      map[key].total++
      if (!FINAL_APP_STATUSES.includes(app.application_status ?? -1)) map[key].active++
    }
    return map
  }, [allApplications])

  // ── Build candidate views ─────────────────────────────────────────────────
  const allCandidates = useMemo<CandidateView[]>(() => {
    return currentPoolContacts.map((candidate) => {
      const tagRows = baseTagRowMap[candidate.contact_id] ?? []
      const mergedTagNames = baseTagNameMap[candidate.contact_id] ?? []
      const appCounts = applicationCountMap[candidate.contact_id] ?? { total: 0, active: 0 }

      const hourlySalary = typeof candidate.salary_expectation_hourly === 'number' ? candidate.salary_expectation_hourly : null
      const monthlySalary = typeof candidate.salary_expectation_monthly === 'number' ? candidate.salary_expectation_monthly : null
      const hasPhone = Boolean(normalizeDigits((candidate as any).phone_norm ?? (candidate as any).phone))
      const hasCv = Boolean(candidate.has_cv && candidate.cv_link)
      const noCvSignal = !candidate.has_cv || !candidate.cv_link
      const partialLocation = !candidate.city_id || !candidate.region_id
      const highSalary = (hourlySalary !== null && hourlySalary >= 250) || (monthlySalary !== null && monthlySalary >= 13000)
      const followUpDue = isDue(candidate.next_follow_up)
      const recentActivity = isRecent(candidate.last_contact_date, 14) || isRecent(candidate.updated_timestamp, 14)
      const availIds = candidate.candidate_availability_ids ?? []
      const activeSearch = availIds.some((id) => [1, 2, 3].includes(id)) || mergedTagNames.includes('מחפש-אקטיבי')
      const passiveSearch = availIds.includes(4) || mergedTagNames.includes('מחפש-פסיבי')
      const immediateAvailability = availIds.includes(1) || mergedTagNames.includes('זמינות-מיידית')
      const totalAppsCount = appCounts.total || Number(candidate.prev_applications_count ?? 0)
      const hasApplications = totalAppsCount > 0
      const highPotential =
        mergedTagNames.includes('פוטנציאל-גבוה') ||
        (Number(candidate.check_status) === 3 && hasCv && (activeSearch || immediateAvailability))

      return {
        ...candidate,
        mergedTagNames,
        mergedTagRows: tagRows,
        derived: {
          hasPhone,
          hasCv,
          noCvSignal,
          partialLocation,
          highSalary,
          followUpDue,
          recentActivity,
          activeSearch,
          passiveSearch,
          immediateAvailability,
          hasApplications,
          highPotential,
          activeAppsCount: appCounts.active,
          totalAppsCount,
        },
      }
    })
  }, [currentPoolContacts, baseTagRowMap, baseTagNameMap, applicationCountMap])

  const subRoleOptions = useMemo(() => {
    if (!filters.role) return DICT_SUB_ROLES
    return DICT_SUB_ROLES.filter((sr) => sr.role_id === filters.role)
  }, [filters.role])

  const filteredCityOptions = useMemo(() => {
    if (!filters.region_id) return cityOptions
    return cityOptions.filter((city) => city.region_id === filters.region_id)
  }, [cityOptions, filters.region_id])

  const roleName = (id: number | null | undefined) => DICT_ROLES.find((r) => r.id === id)?.name ?? '—'
  const regionName = (id: number | null | undefined) => regionOptions.find((r) => r.id === id)?.name ?? '—'
  const cityName = (id: number | null | undefined) => cityOptions.find((r) => r.id === id)?.name ?? '—'
  const availabilityName = (id: number | null | undefined) => dictLabel(availabilityOptions, id)
  // candidate_availability_ids is multi-value (dict_availability); join to a readable list.
  const availabilityNames = (ids: number[] | null | undefined): string => {
    if (!Array.isArray(ids) || ids.length === 0) return '—'
    const names = ids.map((id) => dictLabel(availabilityOptions, id)).filter((n) => n !== '—')
    return names.length ? names.join(', ') : '—'
  }
  const experienceName = (id: number | null | undefined) => DICT_EXPERIENCE.find((r) => r.id === id)?.name ?? '—'
  // DB column is bigint[]; the shared Contact type still says string for legacy reasons — read defensively.
  const languagesName = (value: unknown): string => {
    if (!Array.isArray(value) || value.length === 0) return '—'
    return value.map((id) => languageOptions.find((l) => l.id === Number(id))?.name ?? String(id)).join(', ')
  }
  const socialStatusName = (id: number | null | undefined) => DICT_SOCIAL_STATUSES.find((r) => r.id === id)?.name ?? '—'
  const workStatusName = (id: number | null | undefined) => dictLabel(workStatusOptions, id)
  // DB columns sub_role / preferred_scope are int8[]; the shared Contact type still says
  // scalar/string for legacy reasons — read defensively (mirror languagesName).
  const toIdArray = (value: unknown): number[] =>
    Array.isArray(value) ? value.map(Number) : value != null && value !== '' ? [Number(value)] : []
  const subRoleNames = (value: unknown): string => {
    const ids = toIdArray(value)
    if (!ids.length) return '—'
    const names = ids.map((id) => DICT_SUB_ROLES.find((r) => r.id === id)?.name ?? '—').filter((n) => n !== '—')
    return names.length ? names.join(', ') : '—'
  }
  const scopeNames = (value: unknown): string => {
    const ids = toIdArray(value)
    if (!ids.length) return '—'
    const names = ids.map((id) => scopeOptions.find((s) => s.id === id)?.name ?? '—').filter((n) => n !== '—')
    return names.length ? names.join(', ') : '—'
  }

  const filteredCandidates = useMemo(() => {
    return allCandidates.filter((candidate) => {
      const search = String(filters.search ?? '').trim().toLowerCase()
      const searchPhone = normalizeDigits(filters.search)
      if (search) {
        const haystack = [
          candidate.full_name,
          candidate.display_name,
          candidate.email,
          (candidate as any).current_employer,
          (candidate as any).linked_org_name,
          (candidate as any).professional_title,
          candidate.languages,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        const phoneHit = searchPhone && normalizeDigits((candidate as any).phone_norm ?? (candidate as any).phone).includes(searchPhone)
        if (!haystack.includes(search) && !phoneHit) return false
      }

      if (filters.role && candidate.role !== filters.role) return false
      if (filters.sub_role_ids?.length) {
        const cSubs = Array.isArray(candidate.sub_role) ? candidate.sub_role : candidate.sub_role != null ? [candidate.sub_role] : []
        if (!filters.sub_role_ids.some((id) => cSubs.includes(id))) return false
      }
      if (filters.experience && candidate.experience !== filters.experience) return false
      if (filters.availability && !(candidate.candidate_availability_ids ?? []).includes(filters.availability)) return false
      if (filters.preferred_scope && !toIdArray(candidate.preferred_scope).includes(filters.preferred_scope)) return false
      if (filters.region_id && candidate.region_id !== filters.region_id) return false
      if (filters.city_id && candidate.city_id !== filters.city_id) return false
      if (filters.has_cv === 'yes' && !candidate.derived.hasCv) return false
      if (filters.has_cv === 'no' && candidate.derived.hasCv) return false
      if (filters.tag && !candidate.mergedTagNames.includes(filters.tag)) return false
      if (filters.social_status && candidate.social_status !== filters.social_status) return false
      if (filters.check_status && candidate.check_status !== filters.check_status) return false
      if (filters.salary_band === 'low' && ((candidate as any).salary_expectation_hourly || (candidate as any).salary_expectation_monthly)) return false
      if (filters.salary_band === 'mid' && !(!candidate.derived.highSalary && ((candidate as any).salary_expectation_hourly || (candidate as any).salary_expectation_monthly))) return false
      if (filters.salary_band === 'high' && !candidate.derived.highSalary) return false
      if (filters.follow_up_due === 'yes' && !candidate.derived.followUpDue) return false
      if (filters.recent_activity === 'yes' && !candidate.derived.recentActivity) return false
      if (filters.active_search_only === 'yes' && !candidate.derived.activeSearch) return false
      if (filters.passive_only === 'yes' && !candidate.derived.passiveSearch) return false
      if (filters.immediate_availability === 'yes' && !candidate.derived.immediateAvailability) return false
      if (filters.has_applications === 'yes' && !candidate.derived.hasApplications) return false

      // Tab B: default to work_status 1,2 unless filter set
      if (activeTab === 'seekers') {
        const ws = Number((candidate as any).work_status ?? 0)
        if (filters.work_status) {
          if (ws !== filters.work_status) return false
        } else {
          if (![1, 2].includes(ws)) return false
        }
      } else if (filters.work_status) {
        if (Number((candidate as any).work_status ?? 0) !== filters.work_status) return false
      }

      return true
    })
  }, [allCandidates, filters, activeTab])

  const sortedCandidates = useMemo(() => {
    if (!sortBy) return filteredCandidates
    const getVal = (c: (typeof filteredCandidates)[number]): string | number => {
      switch (sortBy) {
        case 'name': return c.full_name ?? c.display_name ?? ''
        case 'phone': return (c as any).phone_norm ?? (c as any).phone ?? ''
        case 'email': return c.email ?? ''
        case 'role': return roleName(c.role)
        case 'experience': return Number(c.experience ?? 0)
        case 'work_status': return workStatusName((c as any).work_status)
        case 'scope': return scopeNames(c.preferred_scope)
        case 'city': return cityName(c.city_id)
        case 'region': return regionName(c.region_id)
        case 'cv': return c.derived.hasCv ? 1 : 0
        case 'salary': return Number(c.salary_expectation_hourly ?? c.salary_expectation_monthly ?? 0)
        case 'active_apps': return c.derived.activeAppsCount
        case 'prev_apps': return c.derived.totalAppsCount
        default: return ''
      }
    }
    const dir = sortDir === 'asc' ? 1 : -1
    return [...filteredCandidates].sort((a, b) => {
      const va = getVal(a), vb = getVal(b)
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir
      return String(va).localeCompare(String(vb), 'he') * dir
    })
  }, [filteredCandidates, sortBy, sortDir])

  const pageData = sortedCandidates.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const selectedCandidate = useMemo(
    () => allCandidates.find((item) => item.contact_id === sheet.contactId) ?? null,
    [allCandidates, sheet.contactId],
  )

  const candidateForApplication = useMemo(
    () => allCandidates.find((item) => item.contact_id === applicationState.contactId) ?? null,
    [allCandidates, applicationState.contactId],
  )

  const filteredJobsForCandidate = useMemo<JobRecord[]>(() => {
    if (!candidateForApplication?.role) return activeJobs
    const sameRole = activeJobs.filter((job) => job.job_role === candidateForApplication.role)
    return sameRole.length ? sameRole : activeJobs
  }, [candidateForApplication, activeJobs])

  const kpis = useMemo(() => {
    const roleCount: Record<number, number> = {}
    const regionCount: Record<number, number> = {}
    let withCv = 0
    let seekers = 0
    let totalActive = 0

    for (const c of filteredCandidates) {
      if (c.role) roleCount[c.role] = (roleCount[c.role] ?? 0) + 1
      if (c.region_id) regionCount[c.region_id] = (regionCount[c.region_id] ?? 0) + 1
      if (c.derived.hasCv) withCv++
      if (c.derived.activeSearch) seekers++
      totalActive += c.derived.activeAppsCount
    }

    const topRoleId = Object.entries(roleCount).sort((a, b) => b[1] - a[1])[0]?.[0]
    const topRegionId = Object.entries(regionCount).sort((a, b) => b[1] - a[1])[0]?.[0]

    return {
      seekers,
      withCv,
      topRole: topRoleId ? { id: Number(topRoleId), count: roleCount[Number(topRoleId)] } : null,
      topRegion: topRegionId ? { id: Number(topRegionId), count: regionCount[Number(topRegionId)] } : null,
      totalActiveApps: totalActive,
    }
  }, [filteredCandidates])

  useEffect(() => { setPage(0) }, [filters, activeTab])

  useEffect(() => {
    if (!toast.open) return
    const timer = window.setTimeout(() => setToast((prev) => ({ ...prev, open: false })), 2500)
    return () => window.clearTimeout(timer)
  }, [toast.open])

  const showToast = (message: string, tone: ToastTone = 'info') => setToast({ open: true, tone, message })

  const clearFilters = () => {
    setFilters({})
    setSelectedRows([])
    setBulkTagAction('')
    setBulkTagValue('')
  }

  const toggleRow = (contactId: number) =>
    setSelectedRows((prev) => prev.includes(contactId) ? prev.filter((id) => id !== contactId) : [...prev, contactId])

  const togglePageRows = () => {
    const ids = pageData.map((item) => item.contact_id)
    const allSelected = ids.length > 0 && ids.every((id) => selectedRows.includes(id))
    if (allSelected) {
      setSelectedRows((prev) => prev.filter((id) => !ids.includes(id)))
      return
    }
    setSelectedRows((prev) => Array.from(new Set([...prev, ...ids])))
  }

  const toggleColumn = (key: string) =>
    setVisibleColumns((prev) => prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key])

  const addTagToCandidate = async (contactId: number, tagId: number) => {
    const tagName = candidateTagOptions.find((t) => t.id === tagId)?.name ?? ''
    if (!tagName) return
    const existing = baseTagRowMap[contactId] ?? []
    if (existing.some((r) => r.tag_id === tagId || r.tag === tagName)) {
      showToast('התגית כבר קיימת', 'info')
      return
    }
    // contact_tags.tag is NOT NULL (no default/trigger) — must send both tag_id and tag name.
    const { error } = await supabase.from('contact_tags').insert({ contact_id: contactId, tag_id: tagId, tag: tagName })
    if (error) {
      showToast('שגיאה בשמירת תגית', 'error')
      return
    }
    queryClient.invalidateQueries({ queryKey: ['contact_tags_all'] })
    showToast('התגית נוספה', 'success')
    setAddTagDialog({ contactId: null, tagId: '' })
  }

  const removeTagFromCandidate = async (contactId: number, tagRow: TagRow) => {
    const { error } = await supabase.from('contact_tags').delete().eq('id', tagRow.id)
    if (error) {
      showToast('שגיאה בהסרת תגית', 'error')
      return
    }
    queryClient.invalidateQueries({ queryKey: ['contact_tags_all'] })
    showToast('התגית הוסרה', 'success')
  }

  const applyBulkTagAction = async () => {
    if (!selectedRows.length) { showToast('יש לבחור לפחות מועמד אחד', 'error'); return }
    if (!bulkTagAction || !bulkTagValue) { showToast('יש לבחור פעולה ותגית', 'error'); return }
    const tagId = Number(bulkTagValue)
    const tagName = candidateTagOptions.find((t) => t.id === tagId)?.name ?? ''
    if (!tagName) return

    let failed = 0
    for (const contactId of selectedRows) {
      const existing = baseTagRowMap[contactId] ?? []
      if (bulkTagAction === 'add') {
        if (!existing.some((r) => r.tag_id === tagId || r.tag === tagName)) {
          // tag is NOT NULL in DB — send both tag_id and tag name.
          const { error } = await supabase.from('contact_tags').insert({ contact_id: contactId, tag_id: tagId, tag: tagName })
          if (error) failed++
        }
      } else {
        const row = existing.find((r) => r.tag_id === tagId || r.tag === tagName)
        if (row) {
          const { error } = await supabase.from('contact_tags').delete().eq('id', row.id)
          if (error) failed++
        }
      }
    }

    queryClient.invalidateQueries({ queryKey: ['contact_tags_all'] })
    if (failed > 0) {
      showToast(`הפעולה נכשלה עבור ${failed} רשומות`, 'error')
    } else {
      showToast(bulkTagAction === 'add' ? 'התגית נוספה לרשומות המסומנות' : 'התגית הוסרה מהרשומות המסומנות', 'success')
    }
    setBulkTagAction('')
    setBulkTagValue('')
  }

  const exportCsv = () => {
    const rows = filteredCandidates.map((candidate) => ({
      שם: candidate.full_name ?? '—',
      טלפון: (candidate as any).phone_norm ?? (candidate as any).phone ?? '',
      'תפקיד מועמד': roleName(candidate.role),
      'תת־תפקיד': subRoleNames(candidate.sub_role),
      ניסיון: experienceName(candidate.experience),
      זמינות: availabilityNames(candidate.candidate_availability_ids),
      'סטטוס תעסוקה': workStatusName((candidate as any).work_status),
      'היקף מועדף': scopeNames(candidate.preferred_scope),
      שפות: languagesName(candidate.languages),
      'עיר מועמד': cityName(candidate.city_id),
      'אזור מועמד': regionName(candidate.region_id),
      'יש קו"ח': candidate.derived.hasCv ? 'כן' : 'לא',
      תגיות: candidate.mergedTagNames.join(' | '),
      'ציפיות שכר': formatSalary((candidate as any).salary_expectation_hourly, (candidate as any).salary_expectation_monthly),
      'הגשות פעילות': String(candidate.derived.activeAppsCount),
      'הגשות קודמות': String(candidate.derived.totalAppsCount),
    }))
    const csv = toCsv(rows)
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'admin-candidates.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    showToast('הייצוא הושלם', 'success')
  }

  const openQuickSheet = (contactId: number) => setSheet({ open: true, contactId })
  const closeQuickSheet = () => { setSheet({ open: false, contactId: null }); setAddTagDialog({ contactId: null, tagId: '' }) }

  const openCreateApplication = (contactId: number) => {
    const candidate = allCandidates.find((item) => item.contact_id === contactId) ?? null
    const preferredJob =
      filteredJobsForCandidate.find((job) => job.job_role === candidate?.role)?.job_code ??
      filteredJobsForCandidate[0]?.job_code ??
      ''
    setApplicationState({ open: true, contactId, selectedJobCode: preferredJob })
  }

  const closeCreateApplication = () => setApplicationState({ open: false, contactId: null, selectedJobCode: '' })

  const createApplication = async () => {
    if (!candidateForApplication || !applicationState.selectedJobCode) {
      showToast('יש לבחור משרה', 'error')
      return
    }
    setIsCreatingApp(true)
    try {
      const pn = (candidateForApplication as any).phone_norm
      const orParts = [`candidate_link.eq.${candidateForApplication.contact_id}`]
      if (pn) orParts.push(`phone_norm.eq.${pn}`)

      const { data: existing } = await supabase
        .from('applications')
        .select('application_id')
        .eq('job_code', applicationState.selectedJobCode)
        .or(orParts.join(','))
        .limit(1)

      if (existing && existing.length > 0) {
        showToast('קיימת כבר הגשה לאותה משרה', 'error')
        return
      }

      const { error } = await supabase.from('applications').insert({
        job_code: applicationState.selectedJobCode,
        candidate_link: candidateForApplication.contact_id,
        phone_norm: pn ?? null,
        application_status: 1,
        submission_date: new Date().toISOString().slice(0, 10),
        is_manual: true,
      })

      if (error) {
        showToast('שגיאה ביצירת הגשה', 'error')
        return
      }

      queryClient.invalidateQueries({ queryKey: ['candidate_applications_bulk'] })
      showToast('ההגשה נוצרה בהצלחה', 'success')
      closeCreateApplication()
    } finally {
      setIsCreatingApp(false)
    }
  }

  // ── Legacy tag warning (dev) ───────────────────────────────────────────────
  useEffect(() => {
    if (!allTagRows.length) return
    const legacyRows = allTagRows.filter((r) => r.tag && !r.tag_id)
    if (legacyRows.length > 0) {
      const uniqueTexts = [...new Set(legacyRows.map((r) => r.tag).filter(Boolean))]
      console.warn(`[tags-migration] ${legacyRows.length} contact_tags rows have text tag but no tag_id:`, uniqueTexts)
    }
  }, [allTagRows])

  // ── Selection / loading / error adapters for AdminTable ────────────────────
  const selectedPageIds = pageData.map((c) => String(c.contact_id))
  const selectedIdStrings = selectedRows.map(String)
  const allPageRowsSelected = selectedPageIds.length > 0 && selectedPageIds.every((id) => selectedIdStrings.includes(id))
  const somePageRowsSelected = selectedPageIds.some((id) => selectedIdStrings.includes(id))
  const hasActiveFilters = Object.values(filters).some((v) => (Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && v !== ''))

  const isTableLoading = activeTab === 'active' ? candidateIdsLoading || rawContactsLoading : seekerLoading
  const tableError =
    (activeTab === 'active' ? candidateIdsError || rawContactsError : seekerError) || allApplicationsError || allTagRowsError
      ? 'אירעה שגיאה בטעינת המועמדים. נסה לרענן.'
      : undefined

  // ── Column definitions (fixed ALL_COLUMNS order, filtered by visibleColumns) ─
  const candidateColumns: AdminColumn<CandidateView>[] = []
  if (visibleColumns.includes('name')) {
    candidateColumns.push({
      key: 'name', label: 'שם', sortable: true, minWidth: '210px',
      render: (candidate) => (
        <div className="min-w-[200px] space-y-1 py-2">
          <div className="text-[14px] font-bold text-[#0F172A]">
            {candidate.full_name ?? candidate.display_name ?? '—'}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {candidate.derived.highPotential && <SignalChip tone="accent">פוטנציאל גבוה</SignalChip>}
            {candidate.derived.partialLocation && <SignalChip tone="muted">מיקום חלקי</SignalChip>}
          </div>
        </div>
      ),
    })
  }
  if (visibleColumns.includes('phone')) {
    candidateColumns.push({
      key: 'phone', label: 'נייד', sortable: true, nowrap: true, minWidth: '140px',
      render: (candidate) => {
        const pn = (candidate as any).phone_norm
        return <div className="font-semibold text-slate-700">{pn ? formatPhone(pn) : '—'}</div>
      },
    })
  }
  if (visibleColumns.includes('email')) {
    candidateColumns.push({
      key: 'email', label: 'אימייל', sortable: true, minWidth: '200px',
      render: (candidate) => <span dir="ltr" className="text-slate-600">{candidate.email || '—'}</span>,
    })
  }
  if (visibleColumns.includes('role')) {
    candidateColumns.push({
      key: 'role', label: 'תפקיד מועמד', sortable: true, minWidth: '150px',
      render: (candidate) => <RoleBadge label={roleName(candidate.role)} roleId={Number(candidate.role)} />,
    })
  }
  if (visibleColumns.includes('sub_role')) {
    candidateColumns.push({
      key: 'sub_role', label: 'תת־תפקיד', minWidth: '140px',
      render: (candidate) => subRoleNames(candidate.sub_role),
    })
  }
  if (visibleColumns.includes('experience')) {
    candidateColumns.push({
      key: 'experience', label: 'ניסיון', sortable: true, minWidth: '110px',
      render: (candidate) => experienceName(candidate.experience),
    })
  }
  if (visibleColumns.includes('availability')) {
    candidateColumns.push({
      key: 'availability', label: 'זמינות', minWidth: '180px',
      render: (candidate) => (candidate.candidate_availability_ids ?? []).length ? (
        <div className="flex flex-wrap gap-1 py-2">
          {(candidate.candidate_availability_ids ?? []).map((id) => (
            <CandidateAttributeBadge key={id} tone={availabilityTone(id)}>{availabilityName(id)}</CandidateAttributeBadge>
          ))}
        </div>
      ) : <span className="text-slate-400">—</span>,
    })
  }
  if (visibleColumns.includes('work_status')) {
    candidateColumns.push({
      key: 'work_status', label: 'סטטוס תעסוקה', sortable: true, minWidth: '140px',
      render: (candidate) => <LightChip>{workStatusName((candidate as any).work_status)}</LightChip>,
    })
  }
  if (visibleColumns.includes('scope')) {
    candidateColumns.push({
      key: 'scope', label: 'היקף מועדף', minWidth: '120px',
      render: (candidate) => scopeNames(candidate.preferred_scope),
    })
  }
  if (visibleColumns.includes('languages')) {
    candidateColumns.push({
      key: 'languages', label: 'שפות', minWidth: '160px',
      render: (candidate) => <div className="max-w-[180px] whitespace-normal">{languagesName(candidate.languages)}</div>,
    })
  }
  if (visibleColumns.includes('city')) {
    candidateColumns.push({
      key: 'city', label: 'עיר מועמד', sortable: true, minWidth: '130px',
      render: (candidate) => <LightChip>{cityName(candidate.city_id)}</LightChip>,
    })
  }
  if (visibleColumns.includes('region')) {
    candidateColumns.push({
      key: 'region', label: 'אזור מועמד', sortable: true, minWidth: '140px',
      render: (candidate) => <RegionBadge regionId={candidate.region_id} label={regionName(candidate.region_id)} />,
    })
  }
  if (visibleColumns.includes('cv')) {
    candidateColumns.push({
      key: 'cv', label: 'קו"ח', sortable: true, minWidth: '100px',
      render: (candidate) => (
        <CandidateAttributeBadge tone={candidate.derived.hasCv ? 'success' : 'muted'}>
          {candidate.derived.hasCv ? 'יש קו"ח' : 'ללא קו"ח'}
        </CandidateAttributeBadge>
      ),
    })
  }
  if (visibleColumns.includes('tags')) {
    candidateColumns.push({
      key: 'tags', label: 'תגיות', minWidth: '200px',
      render: (candidate) => (
        <div className="flex max-w-[220px] flex-wrap gap-1.5 py-2">
          {candidate.mergedTagNames.length ? (
            candidate.mergedTagNames.map((tagName, idx) => (
              <TagChip key={`${candidate.contact_id}-${idx}`}>{tagName}</TagChip>
            ))
          ) : (
            <span className="text-slate-400">ללא תגיות</span>
          )}
        </div>
      ),
    })
  }
  if (visibleColumns.includes('salary')) {
    candidateColumns.push({
      key: 'salary', label: 'ציפיות שכר', sortable: true, nowrap: true, minWidth: '140px',
      render: (candidate) => formatSalary((candidate as any).salary_expectation_hourly, (candidate as any).salary_expectation_monthly),
    })
  }
  if (visibleColumns.includes('active_apps')) {
    candidateColumns.push({
      key: 'active_apps', label: 'הגשות פעילות', sortable: true, minWidth: '120px',
      render: (candidate) => (
        <span className={`rounded-md px-2.5 py-1 text-[12px] font-bold ${
          candidate.derived.activeAppsCount > 0 ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-500'
        }`}>
          {candidate.derived.activeAppsCount}
        </span>
      ),
    })
  }
  if (visibleColumns.includes('prev_apps')) {
    candidateColumns.push({
      key: 'prev_apps', label: 'הגשות קודמות', sortable: true, minWidth: '120px',
      render: (candidate) => (
        <span className="rounded-md bg-slate-900 px-2.5 py-1 text-[12px] font-bold text-white">
          {candidate.derived.totalAppsCount}
        </span>
      ),
    })
  }
  candidateColumns.push({
    key: 'actions', label: 'פעולות', width: '72px', headerClassName: 'text-center', cellClassName: 'text-center',
    render: (candidate) => {
      const pn = (candidate as any).phone_norm
      const phone = (candidate as any).phone
      const items: AdminActionMenuItem[] = [
        {
          key: 'open-360', label: 'פתיחת 360', icon: <Eye className="h-4 w-4" />,
          onClick: () => navigate(`/admin/candidates/${candidate.contact_id}`),
        },
        {
          key: 'whatsapp', label: 'וואטסאפ', icon: <Phone className="h-4 w-4" />, disabled: !candidate.derived.hasPhone,
          onClick: () => { const n = normalizeDigits(pn ?? phone); if (n) window.open(`https://wa.me/${n}`, '_blank') },
        },
        {
          key: 'create-application', label: 'יצירת הגשה', icon: <Briefcase className="h-4 w-4" />,
          onClick: () => openCreateApplication(candidate.contact_id),
        },
        {
          key: 'smart-match', label: 'סמארט מאץ׳', icon: <WandSparkles className="h-4 w-4" />,
          onClick: () => showToast('פתיחת Smart Match', 'info'),
        },
      ]
      return (
        <div onClick={(e) => e.stopPropagation()}>
          <AdminActionsMenu items={items} ariaLabel={`פעולות עבור ${candidate.full_name ?? candidate.display_name ?? 'מועמד'}`} />
        </div>
      )
    },
  })

  return (
    <Shell
      title="מועמדים"
      subtitle="תצוגת גיוס ממוקדת מתוך מאגר אנשי הקשר"
      icon={UserCheck}
      actions={
        <div className="flex flex-wrap gap-2">
          <details className="relative">
            <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50">
              <Columns3 className="h-4 w-4" />
              בחירת עמודות
            </summary>
            <div className="absolute left-0 top-full z-30 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-md">
              <div className="mb-3 text-[13px] font-bold text-slate-900">בחירת עמודות</div>
              <div className="grid gap-2">
                {ALL_COLUMNS.map((column) => (
                  <label key={column.key} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-[13px]">
                    <span>{column.label}</span>
                    <input
                      type="checkbox"
                      checked={visibleColumns.includes(column.key)}
                      onChange={() => toggleColumn(column.key)}
                      className="h-4 w-4 rounded border-slate-300 text-[#008080] focus:ring-[#008080]"
                    />
                  </label>
                ))}
              </div>
            </div>
          </details>
          <ActionButton variant="ghost" icon={RefreshCw} onClick={() => { queryClient.invalidateQueries(); showToast('הרשימה רועננה', 'success') }}>
            רענון
          </ActionButton>
          <ActionButton variant="ghost" icon={Download} onClick={exportCsv}>
            ייצוא CSV
          </ActionButton>
          <ActionButton variant="primary" icon={Plus} onClick={() => showToast('פתיחת יצירת מועמד חדש', 'info')}>
            מועמד חדש
          </ActionButton>
        </div>
      }
    >
      <div dir="rtl" className="min-h-screen bg-[#F8FAFC] font-['Heebo'] text-[#0F172A]">
        <div className="space-y-6">

          {/* ── Tabs ──────────────────────────────────────────────────────── */}
          <div className="flex gap-2 border-b border-slate-200 bg-white px-4">
            <button
              type="button"
              onClick={() => { setActiveTab('active'); clearFilters() }}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-[14px] font-semibold transition ${
                activeTab === 'active' ? 'border-[#008080] text-[#008080]' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <UserCheck className="h-4 w-4" />
              מועמדים פעילים
              <span className="rounded-full bg-[#F0FDFC] px-2 py-0.5 text-[12px] font-bold text-[#008080]">
                {rawContacts.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('seekers'); clearFilters() }}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-[14px] font-semibold transition ${
                activeTab === 'seekers' ? 'border-[#008080] text-[#008080]' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Database className="h-4 w-4" />
              מאגר מחפשי עבודה
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[12px] font-bold text-slate-600">
                {seekerContacts.filter((c) => [1, 2].includes(Number((c as any).work_status ?? 0))).length}
              </span>
            </button>
          </div>

          {/* ── KPIs ─────────────────────────────────────────────────────── */}
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <KpiCard
              label="מחפשים אקטיביים"
              value={kpis.seekers}
              subtext="זמינות רלוונטית"
              tone="default"
              onClick={() => setFilters((prev) => ({ ...prev, active_search_only: 'yes' }))}
            />
            <KpiCard
              label={kpis.topRole ? roleName(kpis.topRole.id) : 'תפקיד מועמד'}
              value={kpis.topRole?.count ?? 0}
              subtext="תפקיד מוביל"
              tone="accent"
            />
            <KpiCard
              label={kpis.topRegion ? regionName(kpis.topRegion.id) : 'אזור מועמד'}
              value={kpis.topRegion?.count ?? 0}
              subtext="אזור מוביל"
              tone="default"
            />
            <KpiCard
              label='עם קו"ח'
              value={kpis.withCv}
              subtext="קובץ זמין"
              tone="success"
              onClick={() => setFilters((prev) => ({ ...prev, has_cv: 'yes' }))}
            />
            <KpiCard
              label="הגשות פעילות"
              value={kpis.totalActiveApps}
              subtext="לא בסטטוס סופי"
              tone="warning"
              onClick={() => setFilters((prev) => ({ ...prev, has_applications: 'yes' }))}
            />
          </section>

          {/* ── Filters ──────────────────────────────────────────────────── */}
          <Toolbar>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#F0FDFC] text-[#008080]">
                  <Search className="h-4 w-4" />
                </div>
                <h2 className="text-[15px] font-bold text-[#0F172A]">סרגל סינון גיוס</h2>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
                <SearchBar
                  value={filters.search ?? ''}
                  onChange={(value) => setFilters((prev) => ({ ...prev, search: value }))}
                  placeholder="חיפוש שם, טלפון, אימייל, מעסיק"
                />
                <RoleSubRolePicker
                  variant="filter"
                  roleId={filters.role ?? null}
                  subRoleIds={filters.sub_role_ids ?? []}
                  onRoleChange={(id) => setFilters((prev) => ({ ...prev, role: id ?? undefined, sub_role_ids: undefined }))}
                  onSubRoleChange={(ids) => setFilters((prev) => ({ ...prev, sub_role_ids: ids.length ? ids : undefined }))}
                />
                <SelectFilter
                  value={String(filters.experience ?? '')}
                  onChange={(value) => setFilters((prev) => ({ ...prev, experience: value ? Number(value) : undefined }))}
                  options={DICT_EXPERIENCE.map((item) => ({ value: String(item.id), label: item.name }))}
                  placeholder="ניסיון"
                />
                <SelectFilter
                  value={String(filters.availability ?? '')}
                  onChange={(value) => setFilters((prev) => ({ ...prev, availability: value ? Number(value) : undefined }))}
                  options={availabilityOptions.map((item) => ({ value: String(item.id), label: item.name }))}
                  placeholder="זמינות"
                />
                <SelectFilter
                  value={String(filters.work_status ?? '')}
                  onChange={(value) => setFilters((prev) => ({ ...prev, work_status: value ? Number(value) : undefined }))}
                  options={workStatusOptions.map((item) => ({ value: String(item.id), label: item.name }))}
                  placeholder="סטטוס תעסוקה"
                />
                <SelectFilter
                  value={String(filters.preferred_scope ?? '')}
                  onChange={(value) => setFilters((prev) => ({ ...prev, preferred_scope: value ? Number(value) : undefined }))}
                  options={scopeOptions.map((item) => ({ value: String(item.id), label: item.name }))}
                  placeholder="היקף מועדף"
                />
                <CityRegionPicker
                  variant="filter"
                  cityId={filters.city_id ?? null}
                  regionId={filters.region_id ?? null}
                  cities={cityOptions}
                  regions={regionOptions}
                  onCityChange={(id) => setFilters((prev) => ({ ...prev, city_id: id ?? undefined }))}
                  onRegionChange={(id) => setFilters((prev) => ({ ...prev, region_id: id ?? undefined, city_id: undefined }))}
                />
                <SelectFilter
                  value={String(filters.has_cv ?? '')}
                  onChange={(value) => setFilters((prev) => ({ ...prev, has_cv: value ? (value as 'yes' | 'no') : undefined }))}
                  options={[{ value: 'yes', label: 'יש קו"ח' }, { value: 'no', label: 'ללא קו"ח' }]}
                  placeholder='קו"ח'
                />
                <SelectFilter
                  value={String(filters.tag ?? '')}
                  onChange={(value) => setFilters((prev) => ({ ...prev, tag: value || undefined }))}
                  options={candidateTagOptions.map((item) => ({ value: item.name, label: item.name }))}
                  placeholder="תגית"
                />
                <SelectFilter
                  value={String(filters.check_status ?? '')}
                  onChange={(value) => setFilters((prev) => ({ ...prev, check_status: value ? Number(value) : undefined }))}
                  options={DICT_CHECK_STATUSES.map((item) => ({ value: String(item.id), label: item.name }))}
                  placeholder="סטטוס בדיקה"
                />
                <SelectFilter
                  value={String(filters.has_applications ?? '')}
                  onChange={(value) => setFilters((prev) => ({ ...prev, has_applications: value ? 'yes' : undefined }))}
                  options={[{ value: 'yes', label: 'עם הגשות' }]}
                  placeholder="הגשות"
                />
                <SelectFilter
                  value={String(filters.active_search_only ?? '')}
                  onChange={(value) => setFilters((prev) => ({ ...prev, active_search_only: value ? 'yes' : undefined }))}
                  options={[{ value: 'yes', label: 'מחפש אקטיבי בלבד' }]}
                  placeholder="מחפש אקטיבי"
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
                  <div className="text-[12px] font-semibold text-slate-500">סינון מחושב</div>
                  <div className="mt-1 text-[24px] font-bold text-[#0F172A]">{filteredCandidates.length}</div>
                  <div className="mt-1 text-[12px] font-medium text-slate-600">
                    {(filters.role ? roleName(filters.role) : 'כל התפקידים') + ' • ' + (filters.region_id ? regionName(filters.region_id) : 'כל האזורים')}
                  </div>
                </div>
                <ActionButton variant="ghost" onClick={clearFilters}>נקה פילטרים</ActionButton>
              </div>
            </div>
          </Toolbar>

          {/* ── Table ────────────────────────────────────────────────────── */}
          <Toolbar>
            <AdminTable<CandidateView>
              columns={candidateColumns}
              data={pageData}
              keyField="contact_id"
              onRowClick={(candidate) => openQuickSheet(candidate.contact_id)}
              selectedIds={selectedIdStrings}
              onSelectId={(id) => toggleRow(Number(id))}
              allSelected={allPageRowsSelected}
              someSelected={somePageRowsSelected}
              onSelectAll={togglePageRows}
              sortKey={sortBy ?? undefined}
              sortDir={sortDir}
              onSort={onSort}
              isLoading={isTableLoading}
              hasActiveFilter={hasActiveFilters}
              error={tableError}
              emptyMessage="אין מועמדים עדיין"
              noResultsMessage="לא נמצאו מועמדים"
              minWidth="1700px"
              bulkActions={
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5">
                    <select
                      value={bulkTagAction}
                      onChange={(e) => setBulkTagAction(e.target.value as BulkTagAction)}
                      className="bg-transparent text-[13px] outline-none"
                    >
                      <option value="">פעולת תגית</option>
                      <option value="add">הוספת תגית</option>
                      <option value="remove">הסרת תגית</option>
                    </select>
                    <select
                      value={bulkTagValue}
                      onChange={(e) => setBulkTagValue(e.target.value)}
                      className="bg-transparent text-[13px] outline-none"
                    >
                      <option value="">בחר תגית</option>
                      {candidateTagOptions.map((tag) => (
                        <option key={tag.id} value={String(tag.id)}>{tag.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={applyBulkTagAction}
                      className="rounded-lg bg-[#008080] px-3 py-1 text-[12px] font-bold text-white"
                    >
                      החל
                    </button>
                  </div>
                  <SmallActionButton onClick={exportCsv}>ייצוא</SmallActionButton>
                </div>
              }
              pagination={
                <AdminTablePagination
                  page={page + 1}
                  pageSize={PAGE_SIZE}
                  total={filteredCandidates.length}
                  onPageChange={(nextPage) => setPage(nextPage - 1)}
                />
              }
            />
          </Toolbar>
        </div>

        {/* ── Quick Sheet ───────────────────────────────────────────────── */}
        {sheet.open && selectedCandidate && (
          <SidePanel
            open
            onClose={closeQuickSheet}
            width="max-w-[600px]"
            header={
              <div className="flex items-start justify-between gap-3 px-5 py-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#F0FDFC] text-[22px] font-bold text-[#008080] shadow-sm">
                    {(selectedCandidate.full_name ?? selectedCandidate.display_name ?? '?').charAt(0)}
                  </div>
                  <div className="space-y-2">
                    <div>
                      <h2 className="text-[22px] font-bold text-[#0F172A]">
                        {selectedCandidate.full_name ?? selectedCandidate.display_name ?? '—'}
                      </h2>
                      <div className="mt-1 flex flex-wrap gap-2">
                        <RoleBadge label={roleName(selectedCandidate.role)} roleId={Number(selectedCandidate.role)} />
                        <LightChip>{availabilityNames(selectedCandidate.candidate_availability_ids)}</LightChip>
                        <LightChip>{workStatusName((selectedCandidate as any).work_status)}</LightChip>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <PrimaryLinkAction
                        to={`/admin/candidates/${selectedCandidate.contact_id}`}
                        icon={<Eye className="h-4 w-4" />}
                        label="פתח 360"
                      />
                      <QuickActionButton
                        icon={<Phone className="h-4 w-4" />}
                        label="וואטסאפ"
                        onClick={() => {
                          const n = normalizeDigits((selectedCandidate as any).phone_norm ?? (selectedCandidate as any).phone)
                          if (!n) { showToast('אין טלפון תקין', 'error'); return }
                          window.open(`https://wa.me/${n}`, '_blank')
                        }}
                      />
                      <QuickActionButton
                        icon={<Briefcase className="h-4 w-4" />}
                        label="יצירת הגשה"
                        onClick={() => openCreateApplication(selectedCandidate.contact_id)}
                      />
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeQuickSheet}
                  className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
                  aria-label="סגור"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            }
          >
            <AdminPanelSection title="מידע מהיר">
              <AdminPanelField label="תפקיד מועמד" mode="view" viewValue={roleName(selectedCandidate.role)} />
              <AdminPanelField label="זמינות" mode="view" viewValue={availabilityNames(selectedCandidate.candidate_availability_ids)} />
              <AdminPanelField label="סטטוס תעסוקה" mode="view" viewValue={workStatusName((selectedCandidate as any).work_status)} />
              <AdminPanelField label="ניסיון" mode="view" viewValue={experienceName(selectedCandidate.experience)} />
              <AdminPanelField label="שכר" mode="view" viewValue={formatSalary((selectedCandidate as any).salary_expectation_hourly, (selectedCandidate as any).salary_expectation_monthly)} />
              <AdminPanelField label="עיר מועמד" mode="view" viewValue={cityName(selectedCandidate.city_id)} />
              <AdminPanelField label="אזור מועמד" mode="view" viewValue={regionName(selectedCandidate.region_id)} />
              <AdminPanelField label='קו"ח' mode="view" viewValue={selectedCandidate.derived.hasCv ? 'יש קו"ח' : 'ללא קו"ח'} />
            </AdminPanelSection>

            <AdminPanelSection title="תגיות">
              <div className="sm:col-span-2">
                <div className="flex flex-wrap gap-2">
                  {selectedCandidate.mergedTagRows.length ? (
                    selectedCandidate.mergedTagRows.map((tagRow) => {
                      const displayName = resolveTagName(tagRow)
                      return (
                        <button
                          key={tagRow.id}
                          type="button"
                          onClick={() => removeTagFromCandidate(selectedCandidate.contact_id, tagRow)}
                          className="inline-flex items-center gap-1 rounded-[6px] border border-[#99F6E4] bg-[#F0FDFC] px-2.5 py-1 text-[12px] font-semibold text-[#008080]"
                          title="לחץ להסרה"
                        >
                          <Tag className="h-3 w-3" />
                          {displayName}
                          <X className="h-3 w-3 opacity-60" />
                        </button>
                      )
                    })
                  ) : (
                    <span className="text-[13px] text-slate-500">ללא תגיות</span>
                  )}
                </div>

                {/* Add tag inline */}
                {addTagDialog.contactId === selectedCandidate.contact_id ? (
                  <div className="mt-3 flex items-center gap-2">
                    <select
                      value={addTagDialog.tagId}
                      onChange={(e) => setAddTagDialog((prev) => ({ ...prev, tagId: e.target.value }))}
                      className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-[#008080]"
                    >
                      <option value="">בחר תגית</option>
                      {candidateTagOptions.map((t) => (
                        <option key={t.id} value={String(t.id)}>{t.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={!addTagDialog.tagId}
                      onClick={() => addTagDialog.tagId && addTagToCandidate(selectedCandidate.contact_id, Number(addTagDialog.tagId))}
                      className="rounded-xl bg-[#008080] px-3 py-2 text-[13px] font-bold text-white disabled:opacity-50"
                    >
                      הוסף
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddTagDialog({ contactId: null, tagId: '' })}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-[13px] text-slate-500"
                    >
                      ביטול
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddTagDialog({ contactId: selectedCandidate.contact_id, tagId: '' })}
                    className="mt-3 flex items-center gap-1 text-[13px] font-semibold text-[#008080]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    הוסף תגית
                  </button>
                )}
              </div>
            </AdminPanelSection>

            <AdminPanelSection title="היסטוריית הגשות">
              <div className="sm:col-span-2">
                <CandidateApplicationsSection
                  contactId={selectedCandidate.contact_id}
                  phoneNorm={(selectedCandidate as any).phone_norm ?? null}
                />
              </div>
            </AdminPanelSection>

            <AdminPanelSection title="CRM">
              <AdminPanelField label="קשר אחרון" mode="view" viewValue={formatDate(selectedCandidate.last_contact_date)} />
              <AdminPanelField label="פולואפ הבא" mode="view" viewValue={formatDate(selectedCandidate.next_follow_up)} />
              <AdminPanelField
                label="סטטוס בדיקה"
                mode="view"
                viewValue={<StatusBadge statusType="check" statusId={selectedCandidate.check_status} />}
              />
              <AdminPanelField label="סטטוס חברתי" mode="view" viewValue={socialStatusName(selectedCandidate.social_status)} />
            </AdminPanelSection>
          </SidePanel>
        )}

        {/* ── Create Application Dialog ─────────────────────────────────── */}
        {applicationState.open && candidateForApplication && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4">
            <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-md">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F0FDFC] text-[#008080]">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[18px] font-bold text-[#0F172A]">יצירת הגשה</div>
                  <div className="text-[13px] font-medium text-slate-500">
                    {candidateForApplication.full_name ?? '—'}
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <label className="block">
                  <div className="mb-2 text-[13px] font-semibold text-slate-600">בחר משרה</div>
                  {filteredJobsForCandidate.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 px-3 py-3 text-[13px] text-slate-500">
                      אין משרות פעילות כרגע
                    </div>
                  ) : (
                    <select
                      value={applicationState.selectedJobCode}
                      onChange={(e) => setApplicationState((prev) => ({ ...prev, selectedJobCode: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[14px] outline-none focus:border-[#008080]"
                    >
                      <option value="">בחר משרה</option>
                      {filteredJobsForCandidate.map((job) => (
                        <option key={job.job_code} value={job.job_code}>
                          {job.job_title ?? job.job_code}
                        </option>
                      ))}
                    </select>
                  )}
                </label>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <ActionButton variant="ghost" onClick={closeCreateApplication}>ביטול</ActionButton>
                <ActionButton
                  variant="primary"
                  onClick={createApplication}
                  disabled={isCreatingApp || !applicationState.selectedJobCode}
                >
                  {isCreatingApp ? 'יוצר...' : 'צור הגשה'}
                </ActionButton>
              </div>
            </div>
          </div>
        )}

        {/* ── Toast ────────────────────────────────────────────────────── */}
        {toast.open && (
          <div className="fixed bottom-5 left-5 z-[70]">
            <div
              className={`rounded-2xl border px-3 py-3 shadow-md ${
                toast.tone === 'success'
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : toast.tone === 'error'
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-sky-200 bg-sky-50 text-sky-700'
              }`}
            >
              <div className="flex items-center gap-2 text-[14px] font-bold">
                {toast.tone === 'success' ? <CheckCircle2 className="h-4 w-4" /> : toast.tone === 'error' ? <AlertTriangle className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {toast.message}
              </div>
            </div>
          </div>
        )}
      </div>
    </Shell>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CandidateApplicationsSection({ contactId, phoneNorm }: { contactId: number; phoneNorm: string | null }) {
  const orFilter = phoneNorm
    ? `candidate_link.eq.${contactId},phone_norm.eq.${phoneNorm}`
    : `candidate_link.eq.${contactId}`

  const { data: apps = [], isLoading } = useQuery<{ application_id: number; job_code: string | null; application_status: number | null; submission_date: string | null }[]>({
    queryKey: ['candidate_apps_panel', contactId],
    queryFn: async () => {
      const { data } = await supabase
        .from('applications')
        .select('application_id,job_code,application_status,submission_date')
        .or(orFilter)
        .order('submission_date', { ascending: false })
      return data ?? []
    },
    staleTime: 30_000,
  })

  if (isLoading) return <div className="text-[13px] text-slate-400">טוען...</div>
  if (!apps.length) return <div className="text-[13px] text-slate-500">אין הגשות רשומות</div>

  const activeCount = apps.filter((a) => !FINAL_APP_STATUSES.includes(a.application_status ?? -1)).length
  const total = apps.length

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <div className="rounded-xl bg-teal-50 px-3 py-2 text-center">
          <div className="text-[20px] font-bold text-teal-700">{activeCount}</div>
          <div className="text-[11px] font-semibold text-teal-600">פעילות</div>
        </div>
        <div className="rounded-xl bg-slate-100 px-3 py-2 text-center">
          <div className="text-[20px] font-bold text-slate-700">{total}</div>
          <div className="text-[11px] font-semibold text-slate-500">סה"כ</div>
        </div>
      </div>
      <div className="divide-y divide-slate-100">
        {apps.slice(0, 8).map((app) => {
          const isFinal = FINAL_APP_STATUSES.includes(app.application_status ?? -1)
          return (
            <div key={app.application_id} className="flex items-center justify-between py-2">
              <div className="text-[13px] font-semibold text-slate-700">{app.job_code ?? '—'}</div>
              <div className="flex items-center gap-2">
                <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${isFinal ? 'bg-slate-100 text-slate-500' : 'bg-teal-50 text-teal-700'}`}>
                  {isFinal ? 'סגורה' : 'פעילה'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {app.submission_date ? new Date(app.submission_date).toLocaleDateString('he-IL') : '—'}
                </span>
              </div>
            </div>
          )
        })}
        {apps.length > 8 && (
          <div className="py-2 text-[12px] text-slate-400">ועוד {apps.length - 8} הגשות נוספות</div>
        )}
      </div>
    </div>
  )
}

function KpiCard({ label, value, subtext, tone, onClick }: { label: string; value: number; subtext?: string; tone: KpiTone; onClick?: () => void }) {
  const borderMap: Record<KpiTone, string> = {
    default: 'border-r-teal-500',
    success: 'border-r-green-500',
    warning: 'border-r-amber-500',
    accent: 'border-r-orange-500',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border border-slate-200 border-r-4 bg-white p-4 text-right shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${borderMap[tone]}`}
    >
      <div className="text-[13px] font-semibold text-slate-500">{label}</div>
      <div className="mt-2 text-[26px] font-bold text-[#0F172A]">{value}</div>
      {subtext ? <div className="mt-1 text-[12px] font-medium text-slate-500">{subtext}</div> : null}
    </button>
  )
}

function CandidateAttributeBadge({ tone, children }: { tone: 'default' | 'success' | 'warning' | 'danger' | 'muted'; children: React.ReactNode }) {
  return <span className={`rounded-md px-2.5 py-1 text-[12px] font-semibold ${toneClass(tone)}`}>{children}</span>
}

function SignalChip({ tone, children }: { tone: 'warning' | 'danger' | 'muted' | 'accent'; children: React.ReactNode }) {
  return <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${toneClass(tone)}`}>{children}</span>
}

function TagChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-[6px] border border-[#99F6E4] bg-[#F0FDFC] px-2.5 py-1 text-[12px] font-semibold text-[#008080]">
      <Tag className="h-3 w-3" />
      {children}
    </span>
  )
}

function LightChip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-md bg-slate-100 px-2.5 py-1 text-[12px] font-semibold text-slate-700">{children}</span>
}

function QuickActionButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50"
    >
      {icon}
      {label}
    </button>
  )
}

function PrimaryLinkAction({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 rounded-xl bg-[#008080] px-3 py-2 text-[13px] font-bold text-white shadow-sm transition hover:opacity-95"
    >
      {icon}
      {label}
    </Link>
  )
}

function SmallActionButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50"
    >
      {children}
    </button>
  )
}
