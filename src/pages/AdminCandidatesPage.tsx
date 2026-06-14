import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Columns3,
  Download,
  Edit2,
  Eye,
  FileText,
  MessageCircle,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Tag,
  UserCheck,
  WandSparkles,
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

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  DICT_AVAILABILITY,
  DICT_CHECK_STATUSES,
  DICT_EXPERIENCE,
  DICT_PROFILE_TYPES,
  DICT_ROLES,
  DICT_SOCIAL_STATUSES,
  DICT_SUB_ROLES,
} from '@/lib/dicts'
import type { Contact } from '@/types'

type ContactRecord = Contact
type JobRecord = { job_code: string; job_status: number; job_role?: number; title?: string; job_title?: string }

type ExtendedCandidateFilters = {
  search?: string
  role?: number
  sub_role?: number
  experience?: number
  availability?: number
  preferred_scope?: string
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

type ToastState = {
  open: boolean
  tone: ToastTone
  message: string
}

type QuickSheetState = {
  open: boolean
  contactId: number | null
}

type CreateApplicationState = {
  open: boolean
  contactId: number | null
  selectedJobCode: string
}

type BulkTagAction = 'add' | 'remove' | ''

type CandidateView = ContactRecord & {
  mergedTags: string[]
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
  }
}

type LocalApplicationRecord = {
  candidate_link: number
  job_code: string
}

type KpiTone = 'default' | 'success' | 'warning' | 'accent'

const IMPORTANT_TAGS = [
  'VIP',
  'זמינות-מיידית',
  'מחפש-אקטיבי',
  'מחפש-פסיבי',
  'אין-קו"ח',
  'ציפיות-שכר-גבוהות',
  'פוטנציאל-גבוה',
  'ללא-ניסיון',
  'מגורים-קרובים',
  'דגל-אדום-מבריז',
  'בוגר-הדסה',
] as const

const PAGE_SIZE = 20

const ALL_COLUMNS = [
  { key: 'name', label: 'שם' },
  { key: 'phone', label: 'טלפון' },
  { key: 'role', label: 'תפקיד' },
  { key: 'sub_role', label: 'תת־תפקיד' },
  { key: 'experience', label: 'ניסיון' },
  { key: 'availability', label: 'זמינות' },
  { key: 'scope', label: 'היקף מועדף' },
  { key: 'languages', label: 'שפות' },
  { key: 'city', label: 'עיר' },
  { key: 'region', label: 'אזור' },
  { key: 'cv', label: 'קו"ח' },
  { key: 'tags', label: 'תגיות' },
  { key: 'salary', label: 'ציפיות שכר' },
  { key: 'applications', label: 'הגשות קודמות' },
] as const

const DEFAULT_COLUMNS = [
  'name',
  'phone',
  'role',
  'sub_role',
  'experience',
  'availability',
  'scope',
  'languages',
  'city',
  'region',
  'cv',
  'tags',
  'salary',
  'applications',
] as const

function normalizeDigits(value?: string | null) {
  return String(value ?? '').replace(/\D/g, '')
}

function formatPhone(value?: string | null) {
  const digits = normalizeDigits(value)
  if (!digits) return '—'
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  if (digits.length === 9) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`
  return digits
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('he-IL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function formatSalary(hourly?: number | null, monthly?: number | null) {
  if (typeof hourly === 'number') {
    return `${new Intl.NumberFormat('he-IL').format(hourly)} ₪ / שעה`
  }
  if (typeof monthly === 'number') {
    return `${new Intl.NumberFormat('he-IL').format(monthly)} ₪ / חודש`
  }
  return '—'
}

function toCsv(rows: Record<string, string>[]) {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const escapeValue = (value: string) => {
    if (value.includes('"') || value.includes(',') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }

  return [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => escapeValue(String(row[header] ?? ''))).join(',')),
  ].join('\n')
}

function isDue(value?: string | null) {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  return date.getTime() <= Date.now()
}

function dictName(items: Array<{ id: number; name: string }>, id: number | null | undefined) {
  if (id == null) return '—'
  return items.find((item) => item.id === id)?.name ?? '—'
}

function isRecent(value?: string | null, days = 14) {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  const diff = Date.now() - date.getTime()
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000
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

function buildRecruitingView(contacts: ContactRecord[], tagMap: Record<number, string[]>) {
  // contacts already filtered to rel_contact_profiles candidates — just enrich with derived fields
  return contacts
}

export default function AdminCandidatesPage() {
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
  const [tagOverrides, setTagOverrides] = useState<Record<number, string[]>>({})
  const [localApplications, setLocalApplications] = useState<LocalApplicationRecord[]>([])
  const [bulkTagAction, setBulkTagAction] = useState<BulkTagAction>('')
  const [bulkTagValue, setBulkTagValue] = useState<string>('')
  const [visibleColumns, setVisibleColumns] = useState<string[]>([...DEFAULT_COLUMNS])

  // ===== Supabase data =====

  // SSOT: fetch candidate IDs from rel_contact_profiles (profile_type_id=1)
  const { data: candidateIds = [] } = useQuery<number[]>({
    queryKey: ['candidate-ids'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rel_contact_profiles')
        .select('contact_id')
        .eq('profile_type_id', 1)
      if (error) throw error
      return (data ?? []).map((r: { contact_id: number }) => r.contact_id)
    },
    staleTime: 60_000,
  })

  const { data: rawContacts = [] } = useQuery<Contact[]>({
    queryKey: ['contacts', 'candidates', candidateIds],
    queryFn: async () => {
      if (candidateIds.length === 0) return []
      const { data, error } = await supabase
        .from('contact')
        .select('*')
        .in('contact_id', candidateIds)
        .order('contact_id')
      if (error) throw error
      return (data ?? []) as Contact[]
    },
    staleTime: 60_000,
  })

  const { data: regionOptions = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['dict_regions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_regions').select('id,name').order('name')
      if (error) throw error
      return data ?? []
    },
    staleTime: 5 * 60_000,
  })

  const { data: cityOptions = [] } = useQuery<{ id: number; name: string; region_id: number | null }[]>({
    queryKey: ['dict_cities'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_cities').select('id,name,region_id').order('name')
      if (error) throw error
      return data ?? []
    },
    staleTime: 5 * 60_000,
  })

  const { data: allTagsData = [] } = useQuery<{ contact_id: number; tag: string }[]>({
    queryKey: ['contact_tags_all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('contact_tags').select('contact_id,tag')
      if (error) throw error
      return data ?? []
    },
    staleTime: 60_000,
  })

  const baseTagMap = useMemo<Record<number, string[]>>(() => {
    return allTagsData.reduce<Record<number, string[]>>((acc, item) => {
      if (!acc[item.contact_id]) acc[item.contact_id] = []
      acc[item.contact_id].push(item.tag)
      return acc
    }, {})
  }, [allTagsData])

  const allCandidates = useMemo<CandidateView[]>(() => {
    const recruitingView = buildRecruitingView(rawContacts, {
      ...baseTagMap,
      ...tagOverrides,
    })

    return recruitingView.map((candidate) => {
      const mergedTags = tagOverrides[candidate.contact_id] ?? baseTagMap[candidate.contact_id] ?? []
      const hourlySalary = typeof candidate.salary_expectation_hourly === 'number' ? candidate.salary_expectation_hourly : null
      const monthlySalary = typeof candidate.salary_expectation_monthly === 'number' ? candidate.salary_expectation_monthly : null
      const hasPhone = Boolean(normalizeDigits(candidate.phone_norm ?? candidate.phone))
      const hasCv = Boolean(candidate.has_cv && candidate.cv_link)
      const noCvSignal = !candidate.has_cv || !candidate.cv_link
      const partialLocation = !candidate.city_id || !candidate.region_id
      const highSalary = (hourlySalary !== null && hourlySalary >= 250) || (monthlySalary !== null && monthlySalary >= 13000)
      const followUpDue = isDue(candidate.next_follow_up)
      const recentActivity = isRecent(candidate.last_contact_date, 14) || isRecent(candidate.updated_timestamp, 14)
      const activeSearch = [1, 2, 3].includes(Number(candidate.availability ?? 0)) || mergedTags.includes('מחפש-אקטיבי')
      const passiveSearch = Number(candidate.availability) === 4 || mergedTags.includes('מחפש-פסיבי')
      const immediateAvailability = Number(candidate.availability) === 1 || mergedTags.includes('זמינות-מיידית')
      const hasApplications = Number(candidate.prev_applications_count ?? 0) > 0 || localApplications.some((item) => item.candidate_link === candidate.contact_id)
      const highPotential =
        mergedTags.includes('פוטנציאל-גבוה') ||
        (Number(candidate.check_status) === 2 && hasCv && (activeSearch || immediateAvailability))

      return {
        ...candidate,
        mergedTags,
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
        },
      }
    })
  }, [baseTagMap, localApplications, tagOverrides])

  const subRoleOptions = useMemo(() => {
    if (!filters.role) return DICT_SUB_ROLES
    return DICT_SUB_ROLES.filter((sr) => sr.role_id === filters.role)
  }, [filters.role])

  const languageOptions = useMemo(() => {
    const set = new Set<string>()
    allCandidates.forEach((candidate) => {
      String(candidate.languages ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .forEach((item) => set.add(item))
    })
    return Array.from(set)
  }, [allCandidates])

  const scopeOptions = useMemo(() => {
    const set = new Set<string>()
    allCandidates.forEach((candidate) => {
      const scope = String(candidate.preferred_scope ?? '').trim()
      if (scope) set.add(scope)
    })
    return Array.from(set)
  }, [allCandidates])

  const filteredCityOptions = useMemo(() => {
    if (!filters.region_id) return cityOptions
    return cityOptions.filter((city) => city.region_id === filters.region_id)
  }, [cityOptions, filters.region_id])

  const roleName = (id: number | null | undefined) => DICT_ROLES.find((r) => r.id === id)?.name ?? '—'
  const subRoleName = (id: number | null | undefined) => DICT_SUB_ROLES.find((r) => r.id === id)?.name ?? '—'
  const regionName = (id: number | null | undefined) => regionOptions.find((r) => r.id === id)?.name ?? '—'
  const cityName = (id: number | null | undefined) => cityOptions.find((r) => r.id === id)?.name ?? '—'
  const availabilityName = (id: number | null | undefined) => DICT_AVAILABILITY.find((r) => r.id === id)?.name ?? '—'
  const experienceName = (id: number | null | undefined) => DICT_EXPERIENCE.find((r) => r.id === id)?.name ?? '—'
  const socialStatusName = (id: number | null | undefined) => DICT_SOCIAL_STATUSES.find((r) => r.id === id)?.name ?? '—'

  const filteredCandidates = useMemo(() => {
    return allCandidates.filter((candidate) => {
      const search = String(filters.search ?? '').trim().toLowerCase()
      const searchPhone = normalizeDigits(filters.search)
      if (search) {
        const haystack = [
          candidate.full_name,
          candidate.display_name,
          candidate.email,
          candidate.current_employer,
          candidate.linked_org_name,
          candidate.professional_title,
          candidate.languages,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        const phoneHit = searchPhone && normalizeDigits(candidate.phone_norm ?? candidate.phone).includes(searchPhone)
        if (!haystack.includes(search) && !phoneHit) return false
      }

      if (filters.role && candidate.role !== filters.role) return false
      if (filters.sub_role && candidate.sub_role !== filters.sub_role) return false
      if (filters.experience && candidate.experience !== filters.experience) return false
      if (filters.availability && candidate.availability !== filters.availability) return false
      if (filters.preferred_scope && String(candidate.preferred_scope ?? '') !== filters.preferred_scope) return false
      if (filters.region_id && candidate.region_id !== filters.region_id) return false
      if (filters.city_id && candidate.city_id !== filters.city_id) return false
      if (filters.has_cv === 'yes' && !candidate.derived.hasCv) return false
      if (filters.has_cv === 'no' && candidate.derived.hasCv) return false
      if (filters.tag && !candidate.mergedTags.includes(filters.tag)) return false
      if (filters.social_status && candidate.social_status !== filters.social_status) return false
      if (filters.check_status && candidate.check_status !== filters.check_status) return false
      if (filters.salary_band === 'low' && (candidate.salary_expectation_hourly || candidate.salary_expectation_monthly)) return false
      if (filters.salary_band === 'mid' && !(!candidate.derived.highSalary && (candidate.salary_expectation_hourly || candidate.salary_expectation_monthly))) return false
      if (filters.salary_band === 'high' && !candidate.derived.highSalary) return false
      if (filters.follow_up_due === 'yes' && !candidate.derived.followUpDue) return false
      if (filters.recent_activity === 'yes' && !candidate.derived.recentActivity) return false
      if (filters.active_search_only === 'yes' && !candidate.derived.activeSearch) return false
      if (filters.passive_only === 'yes' && !candidate.derived.passiveSearch) return false
      if (filters.immediate_availability === 'yes' && !candidate.derived.immediateAvailability) return false
      if (filters.has_applications === 'yes' && !candidate.derived.hasApplications) return false
      return true
    })
  }, [allCandidates, filters])

  const totalPages = Math.max(1, Math.ceil(filteredCandidates.length / PAGE_SIZE))
  const pageData = filteredCandidates.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const selectedCandidate = useMemo(
    () => allCandidates.find((item) => item.contact_id === sheet.contactId) ?? null,
    [allCandidates, sheet.contactId],
  )

  const candidateForApplication = useMemo(
    () => allCandidates.find((item) => item.contact_id === applicationState.contactId) ?? null,
    [allCandidates, applicationState.contactId],
  )

  const filteredJobsForCandidate = useMemo<JobRecord[]>(() => {
    if (!candidateForApplication?.role) return []
    const activeJobs: JobRecord[] = []
    const sameRole = activeJobs.filter((job) => job.job_role === candidateForApplication.role)
    return sameRole.length ? sameRole : activeJobs
  }, [candidateForApplication])

  const createApplicationBlocked = useMemo(() => {
    if (!candidateForApplication || !applicationState.selectedJobCode) return false
    return localApplications.some(
      (item) =>
        item.candidate_link === candidateForApplication.contact_id &&
        item.job_code.toLowerCase() === applicationState.selectedJobCode.toLowerCase(),
    )
  }, [applicationState.selectedJobCode, candidateForApplication, localApplications])

  const kpis = useMemo(() => {
    return {
      activeSeekers: filteredCandidates.filter((item) => item.derived.activeSearch).length,
      immediateAvailabilityCount: filteredCandidates.filter((item) => item.derived.immediateAvailability).length,
      noCvCount: filteredCandidates.filter((item) => item.derived.noCvSignal).length,
      highPotentialCount: filteredCandidates.filter((item) => item.derived.highPotential).length,
    }
  }, [filteredCandidates])

  useEffect(() => {
    setPage(0)
  }, [filters])

  useEffect(() => {
    if (!toast.open) return
    const timer = window.setTimeout(() => setToast((prev) => ({ ...prev, open: false })), 2500)
    return () => window.clearTimeout(timer)
  }, [toast.open])

  const showToast = (message: string, tone: ToastTone = 'info') => {
    setToast({ open: true, tone, message })
  }

  const clearFilters = () => {
    setFilters({})
    setSelectedRows([])
    setBulkTagAction('')
    setBulkTagValue('')
  }

  const toggleRow = (contactId: number) => {
    setSelectedRows((prev) =>
      prev.includes(contactId) ? prev.filter((id) => id !== contactId) : [...prev, contactId],
    )
  }

  const togglePageRows = () => {
    const ids = pageData.map((item) => item.contact_id)
    const allSelected = ids.length > 0 && ids.every((id) => selectedRows.includes(id))
    if (allSelected) {
      setSelectedRows((prev) => prev.filter((id) => !ids.includes(id)))
      return
    }
    setSelectedRows((prev) => Array.from(new Set([...prev, ...ids])))
  }

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
    )
  }

  const updateTagsForCandidate = (contactId: number, nextTags: string[]) => {
    setTagOverrides((prev) => ({ ...prev, [contactId]: nextTags }))
  }

  const addTagToCandidate = (contactId: number, tagValue: string) => {
    const current = tagOverrides[contactId] ?? baseTagMap[contactId] ?? []
    if (current.includes(tagValue)) {
      showToast('התגית כבר קיימת', 'info')
      return
    }
    updateTagsForCandidate(contactId, [...current, tagValue])
    showToast('התגית נוספה בהצלחה', 'success')
  }

  const removeTagFromCandidate = (contactId: number, tagValue: string) => {
    const current = tagOverrides[contactId] ?? baseTagMap[contactId] ?? []
    updateTagsForCandidate(
      contactId,
      current.filter((item) => item !== tagValue),
    )
    showToast('התגית הוסרה', 'success')
  }

  const applyBulkTagAction = () => {
    if (!selectedRows.length) {
      showToast('יש לבחור לפחות מועמד אחד', 'error')
      return
    }
    if (!bulkTagAction || !bulkTagValue) {
      showToast('יש לבחור פעולה ותגית', 'error')
      return
    }
    selectedRows.forEach((contactId) => {
      const current = tagOverrides[contactId] ?? baseTagMap[contactId] ?? []
      if (bulkTagAction === 'add') {
        if (!current.includes(bulkTagValue)) updateTagsForCandidate(contactId, [...current, bulkTagValue])
      } else {
        updateTagsForCandidate(contactId, current.filter((item) => item !== bulkTagValue))
      }
    })
    showToast(bulkTagAction === 'add' ? 'התגית נוספה לרשומות המסומנות' : 'התגית הוסרה מהרשומות המסומנות', 'success')
    setBulkTagAction('')
    setBulkTagValue('')
  }

  const exportCsv = () => {
    const rows = filteredCandidates.map((candidate) => ({
      שם: candidate.full_name ?? '—',
      טלפון: candidate.phone_norm ?? candidate.phone ?? '',
      תפקיד: roleName(candidate.role),
      'תת־תפקיד': subRoleName(candidate.sub_role),
      ניסיון: experienceName(candidate.experience),
      זמינות: availabilityName(candidate.availability),
      'היקף מועדף': candidate.preferred_scope ?? '—',
      שפות: candidate.languages ?? '—',
      עיר: cityName(candidate.city_id),
      אזור: regionName(candidate.region_id),
      'יש קו"ח': candidate.derived.hasCv ? 'כן' : 'לא',
      תגיות: candidate.mergedTags.join(' | '),
      'ציפיות שכר': formatSalary(candidate.salary_expectation_hourly, candidate.salary_expectation_monthly),
      'הגשות קודמות': String(candidate.prev_applications_count ?? 0),
    }))

    const csv = toCsv(rows)
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
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

  const openQuickSheet = (contactId: number) => {
    setSheet({ open: true, contactId })
  }

  const closeQuickSheet = () => {
    setSheet({ open: false, contactId: null })
  }

  const openCreateApplication = (contactId: number) => {
    const candidate = allCandidates.find((item) => item.contact_id === contactId) ?? null
    const preferredJob =
      filteredJobsForCandidate.find((job) => job.job_role === candidate?.role)?.job_code ??
      filteredJobsForCandidate[0]?.job_code ??
      ''

    setApplicationState({
      open: true,
      contactId,
      selectedJobCode: preferredJob,
    })
  }

  const closeCreateApplication = () => {
    setApplicationState({ open: false, contactId: null, selectedJobCode: '' })
  }

  const createApplication = () => {
    if (!candidateForApplication || !applicationState.selectedJobCode) {
      showToast('יש לבחור משרה', 'error')
      return
    }
    if (createApplicationBlocked) {
      showToast('קיימת כבר הגשה לאותה משרה. הפעולה נחסמה.', 'error')
      return
    }
    setLocalApplications((prev) => [
      ...prev,
      { candidate_link: candidateForApplication.contact_id, job_code: applicationState.selectedJobCode },
    ])
    showToast('ההגשה נוצרה בהצלחה', 'success')
    closeCreateApplication()
  }

  const selectedCount = selectedRows.length

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
                  <label
                    key={column.key}
                    className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-[13px]"
                  >
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

          <ActionButton variant="ghost" icon={RefreshCw} onClick={() => showToast('הרשימה רועננה', 'success')}>
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
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="מחפשים אקטיביים"
              value={kpis.activeSeekers}
              subtext="זמינות רלוונטית או תגית אקטיבית"
              tone="default"
              onClick={() => setFilters((prev) => ({ ...prev, active_search_only: 'yes' }))}
            />
            <KpiCard
              label="זמינות מיידית"
              value={kpis.immediateAvailabilityCount}
              subtext="מוכן לפעולה מהירה"
              tone="success"
              onClick={() => setFilters((prev) => ({ ...prev, immediate_availability: 'yes' }))}
            />
            <KpiCard
              label='ללא קו"ח'
              value={kpis.noCvCount}
              subtext="חסר מסמך או קישור"
              tone="warning"
              onClick={() => setFilters((prev) => ({ ...prev, has_cv: 'no' }))}
            />
            <KpiCard
              label="פוטנציאל גבוה"
              value={kpis.highPotentialCount}
              subtext="סיגנל גיוסי מחוזק"
              tone="accent"
              onClick={() => {
                clearFilters()
                showToast('סיגנל פוטנציאל גבוה מוצג בטבלה ובשיט המהיר', 'info')
              }}
            />
          </section>

          <Toolbar>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#F0FDFC] text-[#008080]">
                  <Search className="h-4 w-4" />
                </div>
                <h2 className="text-[15px] font-bold text-[#0F172A]">סרגל סינון גיוס</h2>
                <span className="rounded-[6px] bg-[#F8FAFC] px-2.5 py-1 text-[12px] font-semibold text-slate-500">
                  recruiter-first
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
                <SearchBar
                  value={filters.search ?? ''}
                  onChange={(value) => setFilters((prev) => ({ ...prev, search: value }))}
                  placeholder="חיפוש שם, טלפון, אימייל, מעסיק או שפה"
                />

                <SelectFilter
                  value={String(filters.role ?? '')}
                  onChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      role: value ? Number(value) : undefined,
                      sub_role: undefined,
                    }))
                  }
                  options={DICT_ROLES.map((item) => ({ value: String(item.id), label: item.name }))}
                  placeholder="תפקיד"
                />

                <SelectFilter
                  value={String(filters.sub_role ?? '')}
                  onChange={(value) =>
                    setFilters((prev) => ({ ...prev, sub_role: value ? Number(value) : undefined }))
                  }
                  options={subRoleOptions.map((item) => ({ value: String(item.id), label: item.name }))}
                  placeholder="תת־תפקיד"
                />

                <SelectFilter
                  value={String(filters.experience ?? '')}
                  onChange={(value) =>
                    setFilters((prev) => ({ ...prev, experience: value ? Number(value) : undefined }))
                  }
                  options={DICT_EXPERIENCE.map((item) => ({ value: String(item.id), label: item.name }))}
                  placeholder="ניסיון"
                />

                <SelectFilter
                  value={String(filters.availability ?? '')}
                  onChange={(value) =>
                    setFilters((prev) => ({ ...prev, availability: value ? Number(value) : undefined }))
                  }
                  options={DICT_AVAILABILITY.map((item) => ({ value: String(item.id), label: item.name }))}
                  placeholder="זמינות"
                />

                <SelectFilter
                  value={String(filters.preferred_scope ?? '')}
                  onChange={(value) =>
                    setFilters((prev) => ({ ...prev, preferred_scope: value || undefined }))
                  }
                  options={scopeOptions.map((item) => ({ value: item, label: item }))}
                  placeholder="היקף מועדף"
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
                  options={regionOptions.map((item) => ({ value: String(item.id), label: item.name }))}
                  placeholder="אזור"
                />

                <SelectFilter
                  value={String(filters.city_id ?? '')}
                  onChange={(value) =>
                    setFilters((prev) => ({ ...prev, city_id: value ? Number(value) : undefined }))
                  }
                  options={filteredCityOptions.map((item) => ({ value: String(item.id), label: item.name }))}
                  placeholder="עיר"
                />

                <SelectFilter
                  value={String(filters.has_cv ?? '')}
                  onChange={(value) =>
                    setFilters((prev) => ({ ...prev, has_cv: value ? (value as 'yes' | 'no') : undefined }))
                  }
                  options={[
                    { value: 'yes', label: 'יש קו"ח' },
                    { value: 'no', label: 'ללא קו"ח' },
                  ]}
                  placeholder='קו"ח'
                />

                <SelectFilter
                  value={String(filters.tag ?? '')}
                  onChange={(value) =>
                    setFilters((prev) => ({ ...prev, tag: value || undefined }))
                  }
                  options={IMPORTANT_TAGS.map((item) => ({ value: item, label: item }))}
                  placeholder="תגית"
                />

                <SelectFilter
                  value={String(filters.social_status ?? '')}
                  onChange={(value) =>
                    setFilters((prev) => ({ ...prev, social_status: value ? Number(value) : undefined }))
                  }
                  options={DICT_SOCIAL_STATUSES.map((item) => ({ value: String(item.id), label: item.name }))}
                  placeholder="סטטוס חברתי"
                />

                <SelectFilter
                  value={String(filters.check_status ?? '')}
                  onChange={(value) =>
                    setFilters((prev) => ({ ...prev, check_status: value ? Number(value) : undefined }))
                  }
                  options={DICT_CHECK_STATUSES.map((item) => ({ value: String(item.id), label: item.name }))}
                  placeholder="סטטוס בדיקה"
                />

                <SelectFilter
                  value={String(filters.salary_band ?? '')}
                  onChange={(value) =>
                    setFilters((prev) => ({ ...prev, salary_band: value ? (value as 'low' | 'mid' | 'high') : undefined }))
                  }
                  options={[
                    { value: 'low', label: 'ללא ציפיות שכר' },
                    { value: 'mid', label: 'שכר בינוני' },
                    { value: 'high', label: 'שכר גבוה' },
                  ]}
                  placeholder="טווח שכר"
                />

                <SelectFilter
                  value={String(filters.follow_up_due ?? '')}
                  onChange={(value) =>
                    setFilters((prev) => ({ ...prev, follow_up_due: value ? 'yes' : undefined }))
                  }
                  options={[{ value: 'yes', label: 'פולואפ פתוח' }]}
                  placeholder="פולואפ"
                />

                <SelectFilter
                  value={String(filters.recent_activity ?? '')}
                  onChange={(value) =>
                    setFilters((prev) => ({ ...prev, recent_activity: value ? 'yes' : undefined }))
                  }
                  options={[{ value: 'yes', label: 'פעילות אחרונה' }]}
                  placeholder="פעילות"
                />

                <SelectFilter
                  value={String(filters.active_search_only ?? '')}
                  onChange={(value) =>
                    setFilters((prev) => ({ ...prev, active_search_only: value ? 'yes' : undefined }))
                  }
                  options={[{ value: 'yes', label: 'מחפש אקטיבי בלבד' }]}
                  placeholder="מחפש אקטיבי"
                />

                <SelectFilter
                  value={String(filters.passive_only ?? '')}
                  onChange={(value) =>
                    setFilters((prev) => ({ ...prev, passive_only: value ? 'yes' : undefined }))
                  }
                  options={[{ value: 'yes', label: 'מחפש פסיבי בלבד' }]}
                  placeholder="מחפש פסיבי"
                />

                <SelectFilter
                  value={String(filters.immediate_availability ?? '')}
                  onChange={(value) =>
                    setFilters((prev) => ({ ...prev, immediate_availability: value ? 'yes' : undefined }))
                  }
                  options={[{ value: 'yes', label: 'זמינות מיידית בלבד' }]}
                  placeholder="זמינות מיידית"
                />

                <SelectFilter
                  value={String(filters.has_applications ?? '')}
                  onChange={(value) =>
                    setFilters((prev) => ({ ...prev, has_applications: value ? 'yes' : undefined }))
                  }
                  options={[{ value: 'yes', label: 'עם הגשות' }]}
                  placeholder="עם הגשות"
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <div className="text-[12px] font-semibold text-slate-500">סינון מחושב</div>
                  <div className="mt-1 text-[24px] font-bold text-[#0F172A]">{filteredCandidates.length}</div>
                  <div className="mt-1 text-[12px] font-medium text-slate-600">
                    {(filters.role ? roleName(filters.role) : 'כל התפקידים') +
                      ' • ' +
                      (filters.region_id ? regionName(filters.region_id) : 'כל האזורים')}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <ActionButton variant="ghost" onClick={clearFilters}>
                    נקה פילטרים
                  </ActionButton>
                </div>
              </div>
            </div>
          </Toolbar>

          {selectedCount > 0 && (
            <Toolbar>
              <div className="rounded-2xl border border-[#D97706]/20 bg-[#FFFBEB] p-4 shadow-sm">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded-[8px] bg-white px-3 py-1 text-[13px] font-bold text-[#D97706] shadow-sm">
                      נבחרו {selectedCount} מועמדים
                    </span>
                    <span className="text-[13px] font-medium text-slate-600">פעולות מרובות</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
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
                        {IMPORTANT_TAGS.map((tag) => (
                          <option key={tag} value={tag}>
                            {tag}
                          </option>
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
                </div>
              </div>
            </Toolbar>
          )}

          <Toolbar>
            {pageData.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <EmptyState
                  icon={UserCheck}
                  title={candidateIds.length === 0 ? 'אין מועמדים עדיין' : (filteredCandidates.length === 0 ? 'לא נמצאו מועמדים' : 'אין נתונים')}
                  description={candidateIds.length === 0 ? 'מועמד הוא מי שהגיש מועמדות או סומן ידנית. ניתן לסמן מאגר אנשי קשר.' : 'שני את הפילטרים או אפסי את הסינון'}
                />
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-[1700px] w-full border-collapse">
                    <thead className="bg-[#F3F4F6]">
                      <tr className="border-b border-slate-300 text-right text-[14px] font-bold text-black">
                        <th className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={pageData.length > 0 && pageData.every((row) => selectedRows.includes(row.contact_id))}
                            onChange={togglePageRows}
                            className="h-4 w-4 rounded border-slate-300 text-[#008080] focus:ring-[#008080]"
                          />
                        </th>

                        {visibleColumns.includes('name') && <th className="px-4 py-4">שם</th>}
                        {visibleColumns.includes('phone') && <th className="px-4 py-4">טלפון</th>}
                        {visibleColumns.includes('role') && <th className="px-4 py-4">תפקיד</th>}
                        {visibleColumns.includes('sub_role') && <th className="px-4 py-4">תת־תפקיד</th>}
                        {visibleColumns.includes('experience') && <th className="px-4 py-4">ניסיון</th>}
                        {visibleColumns.includes('availability') && <th className="px-4 py-4">זמינות</th>}
                        {visibleColumns.includes('scope') && <th className="px-4 py-4">היקף מועדף</th>}
                        {visibleColumns.includes('languages') && <th className="px-4 py-4">שפות</th>}
                        {visibleColumns.includes('city') && <th className="px-4 py-4">עיר</th>}
                        {visibleColumns.includes('region') && <th className="px-4 py-4">אזור</th>}
                        {visibleColumns.includes('cv') && <th className="px-4 py-4">קו"ח</th>}
                        {visibleColumns.includes('tags') && <th className="px-4 py-4">תגיות</th>}
                        {visibleColumns.includes('salary') && <th className="px-4 py-4">ציפיות שכר</th>}
                        {visibleColumns.includes('applications') && <th className="px-4 py-4">הגשות קודמות</th>}
                        <th className="px-4 py-4 text-center">פעולות</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 bg-white">
                      {pageData.map((candidate) => {
                        const selected = selectedRows.includes(candidate.contact_id)

                        return (
                          <tr
                            key={candidate.contact_id}
                            className={`cursor-pointer text-[13px] font-medium text-[#0F172A] transition ${
                              selected ? 'bg-[#F0FDFC]' : 'hover:bg-slate-50'
                            }`}
                            onClick={() => openQuickSheet(candidate.contact_id)}
                          >
                            <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleRow(candidate.contact_id)}
                                className="h-4 w-4 rounded border-slate-300 text-[#008080] focus:ring-[#008080]"
                              />
                            </td>

                            {visibleColumns.includes('name') && (
                              <td className="px-4 py-3">
                                <div className="min-w-[220px]">
                                  <div className="flex items-start gap-3">
                                    <div className="space-y-1">
                                      <div className="text-[14px] font-bold text-[#0F172A]">
                                        {candidate.full_name ?? candidate.display_name ?? '—'}
                                      </div>
                                      <div className="flex flex-wrap gap-1.5">
                                        {candidate.derived.highPotential && (
                                          <SignalChip tone="accent">פוטנציאל גבוה</SignalChip>
                                        )}
                                        {candidate.derived.noCvSignal && (
                                          <SignalChip tone="warning">ללא קו"ח</SignalChip>
                                        )}
                                        {candidate.derived.partialLocation && (
                                          <SignalChip tone="muted">מיקום חלקי</SignalChip>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            )}

                            {visibleColumns.includes('phone') && (
                              <td className="px-4 py-3">
                                <div className="space-y-1">
                                  <div className="font-semibold text-slate-700">
                                    {candidate.phone_norm ? formatPhone(candidate.phone_norm) : '—'}
                                  </div>
                                  {!candidate.derived.hasPhone && (
                                    <div className="text-[12px] text-slate-400">ללא טלפון תקין</div>
                                  )}
                                </div>
                              </td>
                            )}

                            {visibleColumns.includes('role') && (
                              <td className="px-4 py-3">
                                <RoleBadge label={roleName(candidate.role)} roleId={Number(candidate.role)} />
                              </td>
                            )}

                            {visibleColumns.includes('sub_role') && (
                              <td className="px-4 py-3">{subRoleName(candidate.sub_role)}</td>
                            )}

                            {visibleColumns.includes('experience') && (
                              <td className="px-4 py-3">{experienceName(candidate.experience)}</td>
                            )}

                            {visibleColumns.includes('availability') && (
                              <td className="px-4 py-3">
                                <StatusBadge tone={availabilityTone(candidate.availability)}>
                                  {availabilityName(candidate.availability)}
                                </StatusBadge>
                              </td>
                            )}

                            {visibleColumns.includes('scope') && (
                              <td className="px-4 py-3">{candidate.preferred_scope ?? '—'}</td>
                            )}

                            {visibleColumns.includes('languages') && (
                              <td className="px-4 py-3">
                                <div className="max-w-[180px] whitespace-normal">{candidate.languages ?? '—'}</div>
                              </td>
                            )}

                            {visibleColumns.includes('city') && (
                              <td className="px-4 py-3">
                                <LightChip>{cityName(candidate.city_id)}</LightChip>
                              </td>
                            )}

                            {visibleColumns.includes('region') && (
                              <td className="px-4 py-3">
                                <LightChip>{regionName(candidate.region_id)}</LightChip>
                              </td>
                            )}

                            {visibleColumns.includes('cv') && (
                              <td className="px-4 py-3">
                                <StatusBadge tone={candidate.derived.hasCv ? 'success' : 'muted'}>
                                  {candidate.derived.hasCv ? 'יש קו"ח' : 'ללא קו"ח'}
                                </StatusBadge>
                              </td>
                            )}

                            {visibleColumns.includes('tags') && (
                              <td className="px-4 py-3">
                                <div className="flex max-w-[220px] flex-wrap gap-1.5">
                                  {candidate.mergedTags.length ? (
                                    candidate.mergedTags.map((tag) => (
                                      <TagChip key={`${candidate.contact_id}-${tag}`}>{tag}</TagChip>
                                    ))
                                  ) : (
                                    <span className="text-slate-400">ללא תגיות</span>
                                  )}
                                </div>
                              </td>
                            )}

                            {visibleColumns.includes('salary') && (
                              <td className="px-4 py-3">
                                {formatSalary(candidate.salary_expectation_hourly, candidate.salary_expectation_monthly)}
                              </td>
                            )}

                            {visibleColumns.includes('applications') && (
                              <td className="px-4 py-3">
                                <span className="rounded-md bg-slate-900 px-2.5 py-1 text-[12px] font-bold text-white">
                                  {candidate.prev_applications_count ?? 0}
                                </span>
                              </td>
                            )}

                            <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1">
                                <IconAction
                                  title="פתיחת 360"
                                  icon={<Eye className="h-4 w-4" />}
                                  asLink={`/admin/candidates/${candidate.contact_id}`}
                                />
                                <IconAction
                                  title="עריכה"
                                  icon={<Edit2 className="h-4 w-4" />}
                                  onClick={() => showToast('עריכה מהירה', 'info')}
                                />
                                <IconAction
                                  title="וואטסאפ"
                                  icon={<Phone className="h-4 w-4" />}
                                  disabled={!candidate.derived.hasPhone}
                                  onClick={() => {
                                    const normalized = normalizeDigits(candidate.phone_norm ?? candidate.phone)
                                    if (!normalized) return
                                    window.open(`https://wa.me/${normalized}`, '_blank')
                                  }}
                                />
                                <IconAction
                                  title="יצירת הגשה"
                                  icon={<Briefcase className="h-4 w-4" />}
                                  onClick={() => openCreateApplication(candidate.contact_id)}
                                />
                                <IconAction
                                  title="סמארט מאץ׳"
                                  icon={<WandSparkles className="h-4 w-4" />}
                                  onClick={() => showToast('פתיחת Smart Match', 'info')}
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
                  <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={filteredCandidates.length} />
                </div>
              </div>
            )}
          </Toolbar>
        </div>

        {sheet.open && selectedCandidate && (
          <div className="fixed inset-0 z-50 flex justify-start">
            <div className="absolute inset-0 bg-slate-900/30" onClick={closeQuickSheet} />
            <aside className="relative z-10 h-full w-full max-w-[560px] overflow-y-auto border-l border-slate-200 bg-white shadow-xl">
              <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
                <div className="flex items-start justify-between gap-3 px-5 py-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#F0FDFC] text-[22px] font-bold text-[#008080] shadow-sm">
                      {(selectedCandidate.full_name ?? selectedCandidate.display_name ?? '?').charAt(0)}
                    </div>
                    <div className="space-y-2">
                      <div>
                        <h2 className="text-[24px] font-bold text-[#0F172A]">
                          {selectedCandidate.full_name ?? selectedCandidate.display_name ?? '—'}
                        </h2>
                        <div className="mt-1 flex flex-wrap gap-2">
                          <RoleBadge label={roleName(selectedCandidate.role)} roleId={Number(selectedCandidate.role)} />
                          <LightChip>{availabilityName(selectedCandidate.availability)}</LightChip>
                          <LightChip>{experienceName(selectedCandidate.experience)}</LightChip>
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
                            const normalized = normalizeDigits(selectedCandidate.phone_norm ?? selectedCandidate.phone)
                            if (!normalized) {
                              showToast('אין טלפון תקין', 'error')
                              return
                            }
                            window.open(`https://wa.me/${normalized}`, '_blank')
                          }}
                        />
                        <QuickActionButton
                          icon={<Briefcase className="h-4 w-4" />}
                          label="יצירת הגשה"
                          onClick={() => openCreateApplication(selectedCandidate.contact_id)}
                        />
                        <QuickActionButton
                          icon={<Tag className="h-4 w-4" />}
                          label="הוסף תגית"
                          onClick={() => addTagToCandidate(selectedCandidate.contact_id, IMPORTANT_TAGS[0])}
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={closeQuickSheet}
                    className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
                    aria-label="סגור"
                    title="סגור"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-4 p-5">
                <SectionCard title="מידע מהיר">
                  <QuickGrid
                    items={[
                      { label: 'שם מלא', value: selectedCandidate.full_name ?? '—' },
                      { label: 'תפקיד', value: roleName(selectedCandidate.role) },
                      { label: 'תת־תפקיד', value: subRoleName(selectedCandidate.sub_role) },
                      { label: 'זמינות', value: availabilityName(selectedCandidate.availability) },
                      { label: 'ניסיון', value: experienceName(selectedCandidate.experience) },
                      { label: 'שכר', value: formatSalary(selectedCandidate.salary_expectation_hourly, selectedCandidate.salary_expectation_monthly) },
                      { label: 'עיר', value: cityName(selectedCandidate.city_id) },
                      { label: 'אזור', value: regionName(selectedCandidate.region_id) },
                    ]}
                  />
                </SectionCard>

                <SectionCard title="תגיות">
                  <div className="flex flex-wrap gap-2">
                    {selectedCandidate.mergedTags.length ? (
                      selectedCandidate.mergedTags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => removeTagFromCandidate(selectedCandidate.contact_id, tag)}
                          className="inline-flex items-center gap-1 rounded-[6px] border border-[#99F6E4] bg-[#F0FDFC] px-2.5 py-1 text-[12px] font-semibold text-[#008080]"
                        >
                          <Tag className="h-3 w-3" />
                          {tag}
                        </button>
                      ))
                    ) : (
                      <span className="text-[13px] text-slate-500">ללא תגיות</span>
                    )}
                  </div>
                </SectionCard>

                <SectionCard title="CRM">
                  <QuickLine label="קשר אחרון" value={formatDate(selectedCandidate.last_contact_date)} />
                  <QuickLine label="פולואפ הבא" value={formatDate(selectedCandidate.next_follow_up)} />
                  <QuickLine label="סטטוס בדיקה" value={dictName(DICT_CHECK_STATUSES, selectedCandidate.check_status)} />
                  <QuickLine label="סטטוס חברתי" value={socialStatusName(selectedCandidate.social_status)} />
                </SectionCard>

                <SectionCard title="קבצים">
                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-[#F8FAFC] px-4 py-3">
                    <div>
                      <div className="text-[14px] font-bold text-[#0F172A]">קו"ח</div>
                      <div className="text-[13px] text-slate-500">
                        {selectedCandidate.derived.hasCv ? 'יש קובץ זמין' : 'ללא קובץ זמין'}
                      </div>
                    </div>
                    <StatusBadge tone={selectedCandidate.derived.hasCv ? 'success' : 'muted'}>
                      {selectedCandidate.derived.hasCv ? 'יש קו"ח' : 'ללא קו"ח'}
                    </StatusBadge>
                  </div>
                </SectionCard>
              </div>
            </aside>
          </div>
        )}

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
                  <select
                    value={applicationState.selectedJobCode}
                    onChange={(e) =>
                      setApplicationState((prev) => ({ ...prev, selectedJobCode: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[14px] outline-none focus:border-[#008080]"
                  >
                    {filteredJobsForCandidate.map((job) => (
                      <option key={job.job_code} value={job.job_code}>
                        {job.job_title}
                      </option>
                    ))}
                  </select>
                </label>

                {createApplicationBlocked && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-700">
                    קיימת כבר הגשה לאותה משרה. הפעולה חסומה.
                  </div>
                )}
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <ActionButton variant="ghost" onClick={closeCreateApplication}>
                  ביטול
                </ActionButton>
                <ActionButton
                  variant="primary"
                  onClick={createApplication}
                  disabled={createApplicationBlocked}
                >
                  צור הגשה
                </ActionButton>
              </div>
            </div>
          </div>
        )}

        {toast.open && (
          <div className="fixed bottom-5 left-5 z-[70]">
            <div
              className={`rounded-2xl border px-4 py-3 shadow-md ${
                toast.tone === 'success'
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : toast.tone === 'error'
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-sky-200 bg-sky-50 text-sky-700'
              }`}
            >
              <div className="flex items-center gap-2 text-[14px] font-bold">
                {toast.tone === 'success' ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : toast.tone === 'error' ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
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
  subtext,
  tone,
  onClick,
}: {
  label: string
  value: number
  subtext?: string
  tone: KpiTone
  onClick?: () => void
}) {
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

function StatusBadge({
  tone,
  children,
}: {
  tone: 'default' | 'success' | 'warning' | 'danger' | 'muted'
  children: React.ReactNode
}) {
  return <span className={`rounded-md px-2.5 py-1 text-[12px] font-semibold ${toneClass(tone)}`}>{children}</span>
}

function SignalChip({
  tone,
  children,
}: {
  tone: 'warning' | 'danger' | 'muted' | 'accent'
  children: React.ReactNode
}) {
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

function RoleBadge({ label, roleId }: { label: string; roleId: number }) {
  let classes = 'bg-slate-100 text-slate-700'
  if ([1, 7, 8, 9, 10, 11].includes(roleId)) classes = 'bg-blue-50 text-blue-700'
  if (roleId === 2) classes = 'bg-pink-50 text-pink-700'
  if (roleId === 3) classes = 'bg-violet-50 text-violet-700'
  if (roleId === 5) classes = 'bg-green-50 text-green-700'
  if (roleId === 6) classes = 'bg-amber-50 text-amber-700'

  return <span className={`rounded-md px-2.5 py-1 text-[12px] font-semibold ${classes}`}>{label}</span>
}

function IconAction({
  title,
  icon,
  onClick,
  disabled,
  asLink,
}: {
  title: string
  icon: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  asLink?: string
}) {
  const className =
    'inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'

  if (asLink) {
    return (
      <Link to={asLink} className={className} title={title} aria-label={title}>
        {icon}
      </Link>
    )
  }

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {icon}
    </button>
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
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 text-[16px] font-bold text-[#0F172A]">{title}</div>
      {children}
    </section>
  )
}

function QuickGrid({
  items,
}: {
  items: Array<{ label: string; value: string }>
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-3">
          <div className="text-[13px] font-semibold text-slate-500">{item.label}</div>
          <div className="mt-1 text-[14px] font-bold text-[#0F172A]">{item.value || '—'}</div>
        </div>
      ))}
    </div>
  )
}

function QuickLine({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1 text-[13px]">
      <span className="font-semibold text-slate-500">{label}</span>
      <span className="font-bold text-[#0F172A]">{value || '—'}</span>
    </div>
  )
}

function QuickActionButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
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

function PrimaryLinkAction({
  to,
  icon,
  label,
}: {
  to: string
  icon: React.ReactNode
  label: string
}) {
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

function SmallActionButton({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick: () => void
}) {
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
