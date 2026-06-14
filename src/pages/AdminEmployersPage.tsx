import React, { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Columns3,
  Download,
  Edit2,
  Eye,
  Globe,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  RefreshCw,
  Search,
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

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Account, Contact } from '@/types'

type ViewMode = 'accounts' | 'employers'
type ToastTone = 'success' | 'error' | 'info'

type ToastState = {
  open: boolean
  tone: ToastTone
  message: string
}

type SheetState = {
  open: boolean
  accountId: number | null
  mode: 'view' | 'edit' | 'create'
}

type EmployerFilters = {
  search?: string
  account_status?: number
  account_type?: number
  region_id?: number
  city_id?: number
  has_jobs?: 'yes' | 'no'
  active_jobs_only?: 'yes'
  has_contact?: 'yes' | 'no'
  has_phone?: 'yes' | 'no'
  has_email?: 'yes' | 'no'
  has_website?: 'yes' | 'no'
}

type JobLite = {
  job_code: string
  account_link: number | null
  job_status: number | null
  public_status: number | null
  job_title: string | null
  total_applicants: number | null
  city_id: number | null
  region_id: number | null
}

type EmployerDraft = {
  account_name: string
  account_status: number | null
  account_type: number | null
  bus_id: string
  phone: string
  second_phone: string
  email: string
  billing_email: string
  address: string
  website_url: string
  region_id: number | null
  city_id: number | null
  team_size: string
  chairs_count: string
  notes: string
  next_follow_up: string
}

type EnrichedAccount = Account & {
  linkedContacts: Contact[]
  relatedJobs: JobLite[]
  activeJobsCount: number
  totalJobsCount: number
  linkedContactSummary: string
  primaryEmployerName: string
  displayCityId: number | null
  displayRegionId: number | null
  locationLabel: string
  derived: {
    hasJobs: boolean
    hasActiveJobs: boolean
    isActiveRecruiter: boolean
    isOldRecruiter: boolean
    missingPhone: boolean
    missingLocation: boolean
    linkedContactsCount: number
    signals: string[]
  }
}

interface AdminEmployersPageProps {
  viewMode?: ViewMode
  initialTab?: 'active' | 'all'
  pageTitle?: string
  pageSubtitle?: string
}

const PAGE_SIZE = 20
const ACTIVE_JOB_STATUS_ID = 3
const ACTIVE_RECRUITER_STATUS_ID = 7
const OLD_RECRUITER_STATUS_ID = 8
const EMPLOYER_STATUS_IDS = [ACTIVE_RECRUITER_STATUS_ID, OLD_RECRUITER_STATUS_ID]

function getEmployerStatusBadge(statusId: number | null | undefined, label: string) {
  if (Number(statusId) === ACTIVE_RECRUITER_STATUS_ID) {
    return { label, bg: 'bg-[#D1FAE5]', text: 'text-[#047857]', border: 'border-[#A7F3D0]' }
  }
  if (Number(statusId) === OLD_RECRUITER_STATUS_ID) {
    return { label, bg: 'bg-[#FEF3C7]', text: 'text-[#B45309]', border: 'border-[#FDE68A]' }
  }
  return { label, bg: 'bg-[#F3F4F6]', text: 'text-[#6B6B6B]', border: 'border-[#D9D9D9]' }
}

const ALL_COLUMNS = [
  { key: 'account_name', label: 'שם ארגון' },
  { key: 'primary_contact', label: 'שם מעסיק' },
  { key: 'account_type', label: 'סוג ארגון' },
  { key: 'account_status', label: 'סטטוס מעסיק' },
  { key: 'phone', label: 'נייד / טלפון' },
  { key: 'email', label: 'מייל' },
  { key: 'region', label: 'אזור' },
  { key: 'city', label: 'עיר' },
  { key: 'active_jobs', label: 'משרות פעילות' },
  { key: 'total_jobs', label: 'סה״כ משרות' },
  { key: 'contacts', label: 'אנשי קשר' },
  { key: 'follow_up', label: 'פולו־אפ' },
] as const

const DEFAULT_COLUMNS = [
  'account_name',
  'primary_contact',
  'account_type',
  'account_status',
  'phone',
  'email',
  'region',
  'city',
  'active_jobs',
  'total_jobs',
  'contacts',
  'follow_up',
] as const

const EMPTY_DRAFT: EmployerDraft = {
  account_name: '',
  account_status: null,
  account_type: null,
  bus_id: '',
  phone: '',
  second_phone: '',
  email: '',
  billing_email: '',
  address: '',
  website_url: '',
  region_id: null,
  city_id: null,
  team_size: '',
  chairs_count: '',
  notes: '',
  next_follow_up: '',
}

function normalizeDigits(value?: string | null) {
  return String(value ?? '').replace(/\D/g, '')
}

function formatPhone(value?: string | null) {
  const digits = normalizeDigits(value)
  if (!digits) return '—'
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  return digits
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('he-IL', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

function toDateInputValue(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function isLikelyUrl(value: string) {
  return /^https?:\/\//i.test(value)
}

function buildCsv(rows: Record<string, string>[]) {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const escapeValue = (value: string) => {
    if (value.includes('"') || value.includes(',') || value.includes('\n')) return `"${value.replace(/"/g, '""')}"`
    return value
  }
  return [headers.join(','), ...rows.map((row) => headers.map((header) => escapeValue(String(row[header] ?? ''))).join(','))].join('\n')
}

export default function AdminEmployersPage({
  viewMode = 'employers',
  initialTab = 'all',
  pageTitle,
  pageSubtitle,
}: AdminEmployersPageProps = {}) {
  const isEmployersBoard = viewMode === 'employers'
  const title = pageTitle ?? (isEmployersBoard ? 'מעסיקים' : 'ארגונים')
  const subtitle = pageSubtitle ?? (isEmployersBoard ? 'רק ארגונים עם משרות משויכות — מגייס פעיל או מגייס ישן' : 'כל הארגונים במערכת')

  const [filters, setFilters] = useState<EmployerFilters>({})
  const [tab, setTab] = useState<'active' | 'all'>(initialTab)
  const [page, setPage] = useState(0)
  const [selectedRows, setSelectedRows] = useState<number[]>([])
  const [sheet, setSheet] = useState<SheetState>({ open: false, accountId: null, mode: 'view' })
  const [toast, setToast] = useState<ToastState>({ open: false, tone: 'info', message: '' })
  const [draft, setDraft] = useState<EmployerDraft>(EMPTY_DRAFT)
  const [savingSheet, setSavingSheet] = useState(false)
  const [sortBy, setSortBy] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [visibleColumns, setVisibleColumns] = useState<string[]>([...DEFAULT_COLUMNS])
  const [bulkField, setBulkField] = useState<string>('')
  const [bulkValue, setBulkValue] = useState<string>('')
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    account_name: 260,
    primary_contact: 190,
    account_type: 160,
    account_status: 180,
    phone: 140,
    email: 220,
    region: 150,
    city: 150,
    active_jobs: 120,
    total_jobs: 120,
    contacts: 240,
    follow_up: 140,
  })

  const queryClient = useQueryClient()

  const { data: rawAccounts = [] } = useQuery<Account[]>({
    queryKey: ['accounts', 'admin-board'],
    queryFn: async () => {
      const PAGE = 1000
      const all: Account[] = []
      let from = 0
      while (true) {
        const { data, error } = await supabase.from('accounts').select('*').order('account_id').range(from, from + PAGE - 1)
        if (error) throw error
        const batch = (data ?? []) as Account[]
        if (!batch.length) break
        all.push(...batch)
        if (batch.length < PAGE) break
        from += PAGE
      }
      return all
    },
    staleTime: 60_000,
  })

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ['contacts', 'account-links'],
    queryFn: async () => {
      const PAGE = 1000
      const all: Contact[] = []
      let from = 0
      while (true) {
        const { data, error } = await supabase
          .from('contact')
          .select('contact_id,full_name,display_name,phone,phone_norm,email,account_link,role')
          .order('contact_id')
          .range(from, from + PAGE - 1)
        if (error) throw error
        const batch = (data ?? []) as Contact[]
        if (!batch.length) break
        all.push(...batch)
        if (batch.length < PAGE) break
        from += PAGE
      }
      return all
    },
    staleTime: 60_000,
  })

  const { data: jobs = [] } = useQuery<JobLite[]>({
    queryKey: ['jobs', 'account-counts'],
    queryFn: async () => {
      const PAGE = 1000
      const all: JobLite[] = []
      let from = 0
      while (true) {
        const { data, error } = await supabase
          .from('job')
          .select('job_code,account_link,job_status,public_status,job_title,total_applicants,city_id,region_id')
          .order('job_code')
          .range(from, from + PAGE - 1)
        if (error) throw error
        const batch = (data ?? []) as JobLite[]
        if (!batch.length) break
        all.push(...batch)
        if (batch.length < PAGE) break
        from += PAGE
      }
      return all
    },
    staleTime: 60_000,
  })

  const { data: regions = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['dict_regions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_regions').select('id,name').order('name')
      if (error) throw error
      return data ?? []
    },
    staleTime: 300_000,
  })

  const { data: cities = [] } = useQuery<{ id: number; name: string; region_id: number | null }[]>({
    queryKey: ['dict_cities'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_cities').select('id,name,region_id').order('name')
      if (error) throw error
      return data ?? []
    },
    staleTime: 300_000,
  })

  const { data: accountStatuses = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['dict_account_statuses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_account_statuses').select('id,name').order('id')
      if (error) throw error
      return data ?? []
    },
    staleTime: 300_000,
  })

  const { data: accountTypes = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['dict_account_types'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_account_types').select('id,name').order('id')
      if (error) throw error
      return data ?? []
    },
    staleTime: 300_000,
  })

  const accountStatusName = (id: number | null | undefined) => accountStatuses.find((item) => item.id === id)?.name ?? '—'
  const accountTypeName = (id: number | null | undefined) => accountTypes.find((item) => item.id === id)?.name ?? '—'
  const regionName = (id: number | null | undefined) => regions.find((item) => item.id === id)?.name ?? '—'
  const cityName = (id: number | null | undefined) => cities.find((item) => item.id === id)?.name ?? '—'

  const jobsByAccount = useMemo(() => {
    const map = new Map<number, JobLite[]>()
    jobs.forEach((job) => {
      if (!job.account_link) return
      const accountId = Number(job.account_link)
      const current = map.get(accountId) ?? []
      current.push(job)
      map.set(accountId, current)
    })
    return map
  }, [jobs])

  const contactsByAccount = useMemo(() => {
    const map = new Map<number, Contact[]>()
    contacts.forEach((contact) => {
      if (!contact.account_link) return
      const accountId = Number(contact.account_link)
      const current = map.get(accountId) ?? []
      current.push(contact)
      map.set(accountId, current)
    })
    return map
  }, [contacts])

  const enrichedAccounts = useMemo<EnrichedAccount[]>(() => {
    return rawAccounts.map((account: any) => {
      const relatedJobs = jobsByAccount.get(Number(account.account_id)) ?? []
      const linkedContacts = contactsByAccount.get(Number(account.account_id)) ?? []
      const totalJobsCount = relatedJobs.length
      const activeJobsCount = relatedJobs.filter((job) => Number(job.job_status) === ACTIVE_JOB_STATUS_ID).length
      const linkedContactSummary = linkedContacts
        .slice(0, 3)
        .map((item) => item.full_name || item.display_name || item.email || item.phone_norm || item.phone)
        .filter(Boolean)
        .join(' · ')
      const primaryEmployerName = linkedContacts[0]?.full_name || linkedContacts[0]?.display_name || '—'
      const jobCityIds = Array.from(new Set(relatedJobs.map((job) => Number(job.city_id || 0)).filter(Boolean)))
      const jobRegionIds = Array.from(new Set(relatedJobs.map((job) => Number(job.region_id || 0)).filter(Boolean)))
      const displayCityId = account.city_id ?? (jobCityIds.length === 1 ? jobCityIds[0] : null)
      const displayRegionId = account.region_id ?? (jobRegionIds.length === 1 ? jobRegionIds[0] : null)
      const locationLabel = jobCityIds.length > 1 ? 'כמה סניפים' : ''
      const missingPhone = !normalizeDigits(account.phone)
      const missingLocation = !displayRegionId || !displayCityId
      const isActiveRecruiter = Number(account.account_status) === ACTIVE_RECRUITER_STATUS_ID
      const isOldRecruiter = Number(account.account_status) === OLD_RECRUITER_STATUS_ID
      const hasJobs = totalJobsCount > 0
      const hasActiveJobs = activeJobsCount > 0
      const signals = [
        !linkedContacts.length ? 'ללא איש קשר' : null,
        hasJobs ? null : 'ללא משרות',
        hasJobs && !hasActiveJobs ? 'מעסיק ישן' : null,
        missingPhone ? 'ללא טלפון' : null,
        missingLocation ? 'מיקום חסר' : null,
      ].filter(Boolean) as string[]

      return {
        ...account,
        linkedContacts,
        relatedJobs,
        totalJobsCount,
        activeJobsCount,
        linkedContactSummary,
        primaryEmployerName,
        displayCityId,
        displayRegionId,
        locationLabel,
        derived: {
          hasJobs,
          hasActiveJobs,
          isActiveRecruiter,
          isOldRecruiter,
          missingPhone,
          missingLocation,
          linkedContactsCount: linkedContacts.length,
          signals,
        },
      }
    })
  }, [contactsByAccount, jobsByAccount, rawAccounts])

  const baseRows = useMemo(() => {
    if (!isEmployersBoard) return enrichedAccounts
    return enrichedAccounts.filter((item) => item.derived.hasJobs && EMPLOYER_STATUS_IDS.includes(Number(item.account_status)))
  }, [enrichedAccounts, isEmployersBoard])

  const activeCityOptions = useMemo(() => {
    if (!filters.region_id) return cities
    return cities.filter((item) => Number(item.region_id) === Number(filters.region_id))
  }, [cities, filters.region_id])

  const filteredRows = useMemo(() => {
    const search = String(filters.search ?? '').trim().toLowerCase()
    const searchDigits = normalizeDigits(filters.search)

    const rows = baseRows.filter((item: any) => {
      if (tab === 'active' && isEmployersBoard && Number(item.account_status) !== ACTIVE_RECRUITER_STATUS_ID) return false

      if (search) {
        const haystack = [
          item.account_name,
          item.bus_id,
          item.phone,
          item.second_phone,
          item.email,
          item.second_email,
          item.billing_email,
          item.address,
          item.website_url,
          item.notes,
          accountTypeName(item.account_type),
          accountStatusName(item.account_status),
          regionName(item.displayRegionId),
          cityName(item.displayCityId),
          item.linkedContactSummary,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        const phoneHit = searchDigits && [item.phone, item.second_phone].some((value) => normalizeDigits(value).includes(searchDigits))
        if (!haystack.includes(search) && !phoneHit) return false
      }

      if (filters.account_status && Number(item.account_status) !== Number(filters.account_status)) return false
      if (filters.account_type && Number(item.account_type) !== Number(filters.account_type)) return false
      if (filters.region_id && Number(item.displayRegionId) !== Number(filters.region_id)) return false
      if (filters.city_id && Number(item.displayCityId) !== Number(filters.city_id)) return false
      if (filters.has_jobs === 'yes' && !item.derived.hasJobs) return false
      if (filters.has_jobs === 'no' && item.derived.hasJobs) return false
      if (filters.active_jobs_only === 'yes' && !item.derived.hasActiveJobs) return false
      if (filters.has_contact === 'yes' && item.derived.linkedContactsCount === 0) return false
      if (filters.has_contact === 'no' && item.derived.linkedContactsCount > 0) return false
      if (filters.has_phone === 'yes' && !item.phone) return false
      if (filters.has_phone === 'no' && item.phone) return false
      if (filters.has_email === 'yes' && !item.email) return false
      if (filters.has_email === 'no' && item.email) return false
      if (filters.has_website === 'yes' && !item.website_url) return false
      if (filters.has_website === 'no' && item.website_url) return false
      return true
    })

    if (!sortBy) return rows
    return [...rows].sort((a: any, b: any) => {
      const av = sortBy === 'activeJobsCount' || sortBy === 'totalJobsCount' ? Number(a[sortBy] ?? 0) : String(a[sortBy] ?? '')
      const bv = sortBy === 'activeJobsCount' || sortBy === 'totalJobsCount' ? Number(b[sortBy] ?? 0) : String(b[sortBy] ?? '')
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av
      return sortDir === 'asc' ? String(av).localeCompare(String(bv), 'he') : String(bv).localeCompare(String(av), 'he')
    })
  }, [accountStatuses, accountTypes, baseRows, cities, filters, isEmployersBoard, regions, sortBy, sortDir, tab])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const pageData = filteredRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const selectedAccount = enrichedAccounts.find((item) => Number(item.account_id) === Number(sheet.accountId)) ?? null

  const kpis = useMemo(() => {
    const rows = filteredRows
    const activeEmployers = rows.filter((item) => item.derived.isActiveRecruiter).length
    const oldEmployers = rows.filter((item) => item.derived.isOldRecruiter).length
    const totalJobs = rows.reduce((sum, item) => sum + item.totalJobsCount, 0)
    const activeJobs = rows.reduce((sum, item) => sum + item.activeJobsCount, 0)
    const withContacts = rows.filter((item) => item.derived.linkedContactsCount > 0).length
    return { total: rows.length, activeEmployers, oldEmployers, totalJobs, activeJobs, withContacts }
  }, [filteredRows])

  useEffect(() => setPage(0), [filters, tab, viewMode])

  useEffect(() => {
    if (!toast.open) return
    const timer = window.setTimeout(() => setToast((prev) => ({ ...prev, open: false })), 2600)
    return () => window.clearTimeout(timer)
  }, [toast.open])

  useEffect(() => {
    if (sheet.mode === 'create') {
      setDraft({ ...EMPTY_DRAFT, account_status: isEmployersBoard ? ACTIVE_RECRUITER_STATUS_ID : null })
      return
    }
    if (!selectedAccount) return
    setDraft({
      account_name: selectedAccount.account_name ?? '',
      account_status: selectedAccount.account_status ?? null,
      account_type: selectedAccount.account_type ?? null,
      bus_id: (selectedAccount as any).bus_id ?? '',
      phone: selectedAccount.phone ?? '',
      second_phone: (selectedAccount as any).second_phone ?? '',
      email: selectedAccount.email ?? '',
      billing_email: (selectedAccount as any).billing_email ?? '',
      address: selectedAccount.address ?? '',
      website_url: (selectedAccount as any).website_url ?? '',
      region_id: selectedAccount.region_id ?? null,
      city_id: selectedAccount.city_id ?? null,
      team_size: (selectedAccount as any).team_size == null ? '' : String((selectedAccount as any).team_size),
      chairs_count: (selectedAccount as any).chairs_count == null ? '' : String((selectedAccount as any).chairs_count),
      notes: selectedAccount.notes ?? '',
      next_follow_up: toDateInputValue((selectedAccount as any).next_follow_up),
    })
  }, [isEmployersBoard, selectedAccount, sheet.mode])

  const showToast = (message: string, tone: ToastTone = 'info') => setToast({ open: true, tone, message })

  const clearFilters = () => {
    setFilters({})
    setSelectedRows([])
  }

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => (prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]))
  }

  const handleSort = (key: string) => {
    if (sortBy === key) setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'))
    else {
      setSortBy(key)
      setSortDir('asc')
    }
  }

  const openSheet = (accountId: number, mode: 'view' | 'edit' = 'view') => {
    setSheet({ open: true, accountId, mode })
  }

  const openCreateSheet = () => setSheet({ open: true, accountId: null, mode: 'create' })
  const closeSheet = () => setSheet({ open: false, accountId: null, mode: 'view' })

  const toggleRowSelection = (accountId: number) => {
    setSelectedRows((prev) => (prev.includes(accountId) ? prev.filter((id) => id !== accountId) : [...prev, accountId]))
  }

  const togglePageSelection = () => {
    const ids = pageData.map((item) => Number(item.account_id))
    const allSelected = ids.length > 0 && ids.every((id) => selectedRows.includes(id))
    if (allSelected) setSelectedRows((prev) => prev.filter((id) => !ids.includes(id)))
    else setSelectedRows((prev) => Array.from(new Set([...prev, ...ids])))
  }

  const exportCsv = () => {
    const rows = filteredRows.map((item) => ({
      'שם ארגון': item.account_name ?? '',
      'שם מעסיק': item.primaryEmployerName ?? '',
      'סוג ארגון': accountTypeName(item.account_type),
      'סטטוס מעסיק': accountStatusName(item.account_status),
      טלפון: item.phone ?? '',
      מייל: item.email ?? '',
      עיר: item.locationLabel || cityName(item.displayCityId),
      אזור: regionName(item.displayRegionId),
      'משרות פעילות': String(item.activeJobsCount),
      'סה״כ משרות': String(item.totalJobsCount),
      'אנשי קשר': item.linkedContactSummary,
    }))
    const csv = buildCsv(rows)
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = isEmployersBoard ? 'admin-employers.csv' : 'admin-accounts.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    showToast('הייצוא הושלם', 'success')
  }

  const saveSheet = async () => {
    if (!draft.account_name.trim()) {
      showToast('שם ארגון הוא שדה חובה', 'error')
      return
    }
    if (draft.email && !isValidEmail(draft.email)) {
      showToast('כתובת המייל אינה תקינה', 'error')
      return
    }
    if (draft.billing_email && !isValidEmail(draft.billing_email)) {
      showToast('כתובת מייל לחשבונית אינה תקינה', 'error')
      return
    }
    if (draft.website_url && !isLikelyUrl(draft.website_url)) {
      showToast('קישור אתר חייב להתחיל ב־http או https', 'error')
      return
    }

    setSavingSheet(true)
    try {
      const payload = {
        account_name: draft.account_name.trim(),
        account_status: draft.account_status,
        account_type: draft.account_type,
        bus_id: draft.bus_id.trim() || null,
        phone: draft.phone.trim() || null,
        second_phone: draft.second_phone.trim() || null,
        email: draft.email.trim() || null,
        billing_email: draft.billing_email.trim() || null,
        address: draft.address.trim() || null,
        website_url: draft.website_url.trim() || null,
        region_id: draft.region_id,
        city_id: draft.city_id,
        team_size: draft.team_size ? Number(draft.team_size) : null,
        chairs_count: draft.chairs_count ? Number(draft.chairs_count) : null,
        notes: draft.notes.trim() || null,
        next_follow_up: draft.next_follow_up || null,
        updated_timestamp: new Date().toISOString(),
      }

      if (sheet.mode === 'create') {
        const { error } = await supabase.from('accounts').insert(payload)
        if (error) throw error
      } else if (sheet.accountId) {
        const { error } = await supabase.from('accounts').update(payload).eq('account_id', sheet.accountId)
        if (error) throw error
      }
      await queryClient.invalidateQueries({ queryKey: ['accounts'] })
      showToast('השינויים נשמרו בהצלחה', 'success')
      closeSheet()
    } catch {
      showToast('שגיאה בשמירה', 'error')
    } finally {
      setSavingSheet(false)
    }
  }

  const openWhatsapp = (account: EnrichedAccount) => {
    const phone = normalizeDigits(account.phone || account.linkedContacts[0]?.phone_norm || account.linkedContacts[0]?.phone)
    if (!phone) {
      showToast('אין נייד זמין לפתיחת וואטסאפ', 'error')
      return
    }
    window.open(`https://wa.me/972${phone.replace(/^0/, '')}`, '_blank', 'noopener,noreferrer')
  }

  const resizeColumn = (key: string, delta: number) => {
    setColumnWidths((prev) => ({ ...prev, [key]: Math.max(90, Math.min(520, (prev[key] ?? 150) + delta)) }))
  }

  const updateAccountStatusInline = async (accountId: number, nextStatus: number) => {
    try {
      const { error } = await supabase
        .from('accounts')
        .update({ account_status: nextStatus, updated_timestamp: new Date().toISOString() })
        .eq('account_id', accountId)
      if (error) throw error
      await queryClient.invalidateQueries({ queryKey: ['accounts'] })
      showToast('סטטוס המעסיק עודכן', 'success')
    } catch {
      showToast('שגיאה בעדכון סטטוס', 'error')
    }
  }

  const applyBulkUpdate = async () => {
    if (!selectedRows.length) {
      showToast('יש לבחור רשומות לעדכון גורף', 'error')
      return
    }
    if (!bulkField || !bulkValue) {
      showToast('יש לבחור שדה וערך לעדכון', 'error')
      return
    }

    const numericFields = ['account_status', 'account_type', 'region_id', 'city_id']
    const payload: Record<string, unknown> = {
      [bulkField]: numericFields.includes(bulkField) ? Number(bulkValue) : bulkValue,
      updated_timestamp: new Date().toISOString(),
    }

    try {
      const { error } = await supabase.from('accounts').update(payload).in('account_id', selectedRows)
      if (error) throw error
      await queryClient.invalidateQueries({ queryKey: ['accounts'] })
      setBulkField('')
      setBulkValue('')
      setSelectedRows([])
      showToast(`עודכנו ${selectedRows.length} רשומות`, 'success')
    } catch {
      showToast('שגיאה בעדכון הגורף', 'error')
    }
  }

  const bulkValueOptions = useMemo(() => {
    if (bulkField === 'account_status') return accountStatuses.map((item) => ({ value: String(item.id), label: item.name }))
    if (bulkField === 'account_type') return accountTypes.map((item) => ({ value: String(item.id), label: item.name }))
    if (bulkField === 'region_id') return regions.map((item) => ({ value: String(item.id), label: item.name }))
    if (bulkField === 'city_id') return cities.map((item) => ({ value: String(item.id), label: item.name }))
    return []
  }, [accountStatuses, accountTypes, bulkField, cities, regions])

  return (
    <Shell
      title={title}
      subtitle={`${subtitle} • ${filteredRows.length} תוצאות`}
      icon={Building2}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <details className="relative">
            <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-full border border-[#D9D9D9] bg-white px-3 py-2 text-[13px] font-semibold text-[#2D2D2D] transition hover:bg-[#F3F4F6]">
              <Columns3 className="h-4 w-4" />
              בחירת עמודות
            </summary>
            <div className="absolute left-0 top-full z-30 mt-2 w-72 rounded-[18px] border border-[#D9D9D9] bg-white p-3 shadow-md">
              <div className="mb-3 text-[13px] font-bold text-[#2D2D2D]">בחירת עמודות</div>
              <div className="grid gap-2">
                {ALL_COLUMNS.map((column) => (
                  <label key={column.key} className="flex items-center justify-between rounded-xl border border-[#D9D9D9] px-3 py-2 text-[13px]">
                    <span>{column.label}</span>
                    <input type="checkbox" checked={visibleColumns.includes(column.key)} onChange={() => toggleColumn(column.key)} className="h-4 w-4 rounded border-[#D9D9D9] accent-[#008080]" />
                  </label>
                ))}
              </div>
            </div>
          </details>
          <ActionButton variant="ghost" icon={RefreshCw} onClick={() => queryClient.invalidateQueries()}>
            רענון
          </ActionButton>
          <ActionButton variant="ghost" icon={Download} onClick={exportCsv}>
            ייצוא
          </ActionButton>
          <ActionButton variant="primary" icon={Plus} onClick={openCreateSheet}>
            {isEmployersBoard ? 'מעסיק חדש' : 'ארגון חדש'}
          </ActionButton>
        </div>
      }
    >
      <div dir="rtl" className="min-h-screen bg-[#F3F4F6] font-['Heebo'] text-[#2D2D2D]">
        <div className="space-y-6">
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <KpiCard label={isEmployersBoard ? 'סה״כ מעסיקים' : 'סה״כ ארגונים'} value={kpis.total} hint="לאחר סינון" onClick={clearFilters} />
            <KpiCard label="מגייסים פעילים" value={kpis.activeEmployers} hint="account_status = 7" tone="success" onClick={() => setFilters((prev) => ({ ...prev, account_status: ACTIVE_RECRUITER_STATUS_ID }))} />
            <KpiCard label="מגייסים ישנים" value={kpis.oldEmployers} hint="account_status = 8" tone="warning" onClick={() => setFilters((prev) => ({ ...prev, account_status: OLD_RECRUITER_STATUS_ID }))} />
            <KpiCard label="משרות פעילות" value={kpis.activeJobs} hint="job_status = פעילה" tone="success" onClick={() => setFilters((prev) => ({ ...prev, active_jobs_only: 'yes' }))} />
            <KpiCard label="סה״כ משרות" value={kpis.totalJobs} hint="לפי job.account_link" />
          </section>

          <Toolbar>
            <div className="rounded-[18px] border border-[#D9D9D9] bg-white p-4 shadow-sm">
              {isEmployersBoard && (
                <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-[#D9D9D9] pb-4">
                  <button type="button" onClick={() => setTab('all')} className={`rounded-full px-4 py-2 text-[13px] font-semibold ${tab === 'all' ? 'bg-[#E6F3F3] text-[#008080]' : 'bg-[#F3F4F6] text-[#6B6B6B]'}`}>כל המעסיקים</button>
                  <button type="button" onClick={() => setTab('active')} className={`rounded-full px-4 py-2 text-[13px] font-semibold ${tab === 'active' ? 'bg-[#E6F3F3] text-[#008080]' : 'bg-[#F3F4F6] text-[#6B6B6B]'}`}>מגייסים פעילים בלבד</button>
                </div>
              )}

              <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E6F3F3] text-[#008080]"><Search className="h-4 w-4" /></div>
                <h2 className="text-[15px] font-bold text-[#2D2D2D]">חיפוש וסינון</h2>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
                <SearchBar value={filters.search ?? ''} onChange={(value) => setFilters((prev) => ({ ...prev, search: value }))} placeholder="חיפוש שם, טלפון, מייל, עיר..." />
                <SelectFilter value={String(filters.account_status ?? '')} onChange={(value) => setFilters((prev) => ({ ...prev, account_status: value ? Number(value) : undefined }))} options={(isEmployersBoard ? accountStatuses.filter((item) => EMPLOYER_STATUS_IDS.includes(item.id)) : accountStatuses).map((item) => ({ value: String(item.id), label: item.name }))} placeholder="סטטוס מעסיק" />
                <SelectFilter value={String(filters.account_type ?? '')} onChange={(value) => setFilters((prev) => ({ ...prev, account_type: value ? Number(value) : undefined }))} options={accountTypes.map((item) => ({ value: String(item.id), label: item.name }))} placeholder="סוג ארגון" />
                <SelectFilter value={String(filters.region_id ?? '')} onChange={(value) => setFilters((prev) => ({ ...prev, region_id: value ? Number(value) : undefined, city_id: undefined }))} options={regions.map((item) => ({ value: String(item.id), label: item.name }))} placeholder="אזור" />
                <SelectFilter value={String(filters.city_id ?? '')} onChange={(value) => setFilters((prev) => ({ ...prev, city_id: value ? Number(value) : undefined }))} options={activeCityOptions.map((item) => ({ value: String(item.id), label: item.name }))} placeholder="עיר" />
                {!isEmployersBoard && <SelectFilter value={String(filters.has_jobs ?? '')} onChange={(value) => setFilters((prev) => ({ ...prev, has_jobs: value ? (value as 'yes' | 'no') : undefined }))} options={[{ value: 'yes', label: 'עם משרות' }, { value: 'no', label: 'ללא משרות' }]} placeholder="שיוך משרות" />}
                <SelectFilter value={String(filters.active_jobs_only ?? '')} onChange={(value) => setFilters((prev) => ({ ...prev, active_jobs_only: value ? 'yes' : undefined }))} options={[{ value: 'yes', label: 'עם משרה פעילה' }]} placeholder="משרות פעילות" />
                <SelectFilter value={String(filters.has_contact ?? '')} onChange={(value) => setFilters((prev) => ({ ...prev, has_contact: value ? (value as 'yes' | 'no') : undefined }))} options={[{ value: 'yes', label: 'עם איש קשר' }, { value: 'no', label: 'ללא איש קשר' }]} placeholder="אנשי קשר" />
                <SelectFilter value={String(filters.has_phone ?? '')} onChange={(value) => setFilters((prev) => ({ ...prev, has_phone: value ? (value as 'yes' | 'no') : undefined }))} options={[{ value: 'yes', label: 'עם טלפון' }, { value: 'no', label: 'ללא טלפון' }]} placeholder="טלפון" />
                <SelectFilter value={String(filters.has_email ?? '')} onChange={(value) => setFilters((prev) => ({ ...prev, has_email: value ? (value as 'yes' | 'no') : undefined }))} options={[{ value: 'yes', label: 'עם מייל' }, { value: 'no', label: 'ללא מייל' }]} placeholder="מייל" />
                <SelectFilter value={String(filters.has_website ?? '')} onChange={(value) => setFilters((prev) => ({ ...prev, has_website: value ? (value as 'yes' | 'no') : undefined }))} options={[{ value: 'yes', label: 'עם אתר' }, { value: 'no', label: 'ללא אתר' }]} placeholder="אתר" />
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#D9D9D9] pt-4">
                <div className="flex flex-wrap gap-2">
                  <InfoPill label={`סה״כ: ${filteredRows.length}`} />
                  <InfoPill label={`משרות פעילות: ${kpis.activeJobs}`} tone="success" />
                  <InfoPill label={`סה״כ משרות: ${kpis.totalJobs}`} />
                </div>
                {Object.values(filters).some(Boolean) && <ActionButton variant="ghost" onClick={clearFilters}>נקה פילטרים</ActionButton>}
              </div>
            </div>
          </Toolbar>

          {selectedRows.length > 0 && (
            <Toolbar>
              <div className="rounded-[18px] border border-[#D97706]/20 bg-[#FFFBEB] p-4 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <span className="rounded-full bg-white px-3 py-1 text-[13px] font-bold text-[#D97706] shadow-sm">נבחרו {selectedRows.length} רשומות</span>
                  <ActionButton variant="ghost" onClick={() => setSelectedRows([])}>נקה בחירה</ActionButton>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <SelectLikeField
                    label="שדה לעדכון גורף"
                    value={bulkField}
                    onChange={(value) => { setBulkField(value); setBulkValue('') }}
                    options={[
                      { value: 'account_status', label: 'סטטוס מעסיק' },
                      { value: 'account_type', label: 'סוג ארגון' },
                      { value: 'region_id', label: 'אזור' },
                      { value: 'city_id', label: 'עיר' },
                    ]}
                  />
                  <SelectLikeField label="ערך חדש" value={bulkValue} onChange={setBulkValue} options={bulkValueOptions} />
                  <div className="flex items-end gap-2">
                    <ActionButton variant="primary" onClick={applyBulkUpdate}>בצע שינוי גורף</ActionButton>
                  </div>
                  <div className="flex items-end text-[12px] font-semibold text-[#6B6B6B]">העדכון נשמר ישירות ב־Supabase רק לרשומות המסומנות.</div>
                </div>
              </div>
            </Toolbar>
          )}

          <Toolbar>
            {pageData.length === 0 ? (
              <div className="rounded-[18px] border border-[#D9D9D9] bg-white p-8 shadow-sm">
                <EmptyState icon={Building2} title="לא נמצאו תוצאות" description="שנו את תנאי הסינון או בדקו שהדאטה משויך נכון ב־Supabase." />
              </div>
            ) : (
              <div className="overflow-hidden rounded-[18px] border border-[#D9D9D9] bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-[1600px] w-full border-collapse text-right text-[14px]">
                    <thead className="bg-[#F3F4F6]">
                      <tr className="border-b border-[#D9D9D9] text-[12px] font-bold text-[#6B6B6B]">
                        <th className="px-4 py-3"><input type="checkbox" checked={pageData.length > 0 && pageData.every((row) => selectedRows.includes(Number(row.account_id)))} onChange={togglePageSelection} className="h-4 w-4 rounded border-[#D9D9D9] accent-[#008080]" /></th>
                        {visibleColumns.includes('account_name') && <SortableTh label="שם ארגון" sortKey="account_name" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />}
                        {visibleColumns.includes('primary_contact') && <th className="px-4 py-3">שם מעסיק</th>}
                        {visibleColumns.includes('account_type') && <SortableTh label="סוג" sortKey="account_type" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />}
                        {visibleColumns.includes('account_status') && <SortableTh label="סטטוס" sortKey="account_status" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />}
                        {visibleColumns.includes('phone') && <th className="px-4 py-3">טלפון</th>}
                        {visibleColumns.includes('email') && <th className="px-4 py-3">מייל</th>}
                        {visibleColumns.includes('region') && <th className="px-4 py-3">אזור</th>}
                        {visibleColumns.includes('city') && <th className="px-4 py-3">עיר</th>}
                        {visibleColumns.includes('active_jobs') && <SortableTh label="משרות פעילות" sortKey="activeJobsCount" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />}
                        {visibleColumns.includes('total_jobs') && <SortableTh label="סה״כ משרות" sortKey="totalJobsCount" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />}
                        {visibleColumns.includes('contacts') && <th className="px-4 py-3">אנשי קשר</th>}
                        {visibleColumns.includes('follow_up') && <th className="px-4 py-3">פולו־אפ</th>}
                        <th className="px-4 py-3">פעולות</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F3F4F6] bg-white">
                      {pageData.map((account) => {
                        const selected = selectedRows.includes(Number(account.account_id))
                        const status = getEmployerStatusBadge(account.account_status, accountStatusName(account.account_status))
                        return (
                          <tr key={account.account_id} onClick={() => openSheet(Number(account.account_id), 'view')} className={`text-[14px] font-medium transition ${selected ? 'bg-[#E6F3F3]' : 'hover:bg-[#F9FAFB]'}`}>
                            <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}><input type="checkbox" checked={selected} onChange={() => toggleRowSelection(Number(account.account_id))} className="h-4 w-4 rounded border-[#D9D9D9] accent-[#008080]" /></td>
                            {visibleColumns.includes('account_name') && <td style={{ width: columnWidths.account_name }} className="px-4 py-3"><div className="flex items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#E6F3F3] text-[15px] font-bold text-[#008080]">{(account.account_name ?? '?').charAt(0)}</div><div><div className="font-bold text-[#2D2D2D]">{account.account_name ?? '—'}</div></div></div></td>}
                            {visibleColumns.includes('primary_contact') && <td style={{ width: columnWidths.primary_contact }} className="px-4 py-3 font-bold text-[#2D2D2D]">{account.primaryEmployerName}</td>}
                            {visibleColumns.includes('account_type') && <td style={{ width: columnWidths.account_type }} className="px-4 py-3">{accountTypeName(account.account_type)}</td>}
                            {visibleColumns.includes('account_status') && <td style={{ width: columnWidths.account_status }} className="px-4 py-3"><select dir="rtl" value={String(account.account_status ?? '')} onChange={(event) => updateAccountStatusInline(Number(account.account_id), Number(event.target.value))} className={`h-9 rounded-full border px-2.5 text-[12px] font-bold outline-none ${status.bg} ${status.text} ${status.border}`}>{(isEmployersBoard ? accountStatuses.filter((item) => EMPLOYER_STATUS_IDS.includes(item.id)) : accountStatuses).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></td>}
                            {visibleColumns.includes('phone') && <td style={{ width: columnWidths.phone }} dir="ltr" className="px-4 py-3 font-mono text-[12px]">{formatPhone(account.phone)}</td>}
                            {visibleColumns.includes('email') && <td style={{ width: columnWidths.email }} dir="ltr" className="px-4 py-3 text-[12px]">{account.email ?? '—'}</td>}
                            {visibleColumns.includes('region') && <td style={{ width: columnWidths.region }} className="px-4 py-3">{regionName(account.displayRegionId)}</td>}
                            {visibleColumns.includes('city') && <td style={{ width: columnWidths.city }} className="px-4 py-3">{account.locationLabel || cityName(account.displayCityId)}</td>}
                            {visibleColumns.includes('active_jobs') && <td style={{ width: columnWidths.active_jobs }} className="px-4 py-3"><span className="rounded-full bg-[#F0FDF4] px-2.5 py-1 text-[12px] font-bold text-[#16A34A]">{account.activeJobsCount}</span></td>}
                            {visibleColumns.includes('total_jobs') && <td style={{ width: columnWidths.total_jobs }} className="px-4 py-3"><span className="rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[12px] font-bold text-[#2D2D2D]">{account.totalJobsCount}</span></td>}
                            {visibleColumns.includes('contacts') && <td style={{ width: columnWidths.contacts }} className="px-4 py-3"><div className="truncate">{account.linkedContactSummary || '—'}</div></td>}
                            {visibleColumns.includes('follow_up') && <td style={{ width: columnWidths.follow_up }} className="px-4 py-3">{formatDate((account as any).next_follow_up)}</td>}
                            <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1.5">
                                <IconAction title="צפייה" onClick={() => openSheet(Number(account.account_id), 'view')} icon={<Eye className="h-4 w-4" />} />
                                <IconAction title="עריכה" onClick={() => openSheet(Number(account.account_id), 'edit')} icon={<Edit2 className="h-4 w-4" />} />
                                <IconAction title="משרות" onClick={() => openSheet(Number(account.account_id), 'view')} icon={<Briefcase className="h-4 w-4" />} disabled={account.totalJobsCount === 0} />
                                <IconAction title="וואטסאפ" onClick={() => openWhatsapp(account)} icon={<MessageCircle className="h-4 w-4" />} disabled={!account.phone && !account.linkedContacts[0]?.phone_norm} />
                                <IconAction title="טלפון" onClick={() => account.phone ? (window.location.href = `tel:${account.phone}`) : showToast('אין טלפון זמין', 'error')} icon={<Phone className="h-4 w-4" />} disabled={!account.phone} />
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="border-t border-[#D9D9D9] bg-white px-4 py-3"><Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={filteredRows.length} /></div>
              </div>
            )}
          </Toolbar>
        </div>

        {sheet.open && (selectedAccount || sheet.mode === 'create') && (
          <div className="fixed inset-0 z-50 flex justify-start">
            <div className="absolute inset-0 bg-slate-900/30" onClick={closeSheet} />
            <aside className="relative z-10 h-full w-full max-w-[620px] overflow-y-auto border-l border-[#D9D9D9] bg-white shadow-xl">
              <div className="sticky top-0 z-20 border-b border-[#D9D9D9] bg-white/95 backdrop-blur-sm">
                <div className="flex items-start justify-between gap-3 px-5 py-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#E6F3F3] px-2.5 py-1 text-[12px] font-bold text-[#008080]">{sheet.mode === 'create' ? 'חדש' : `#${selectedAccount?.account_id}`}</span>
                      {selectedAccount && <span className="rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[12px] font-bold text-[#2D2D2D]">{accountStatusName(selectedAccount.account_status)}</span>}
                    </div>
                    <h2 className="mt-2 text-[24px] font-bold text-[#2D2D2D]">{sheet.mode === 'create' ? (isEmployersBoard ? 'מעסיק חדש' : 'ארגון חדש') : selectedAccount?.account_name}</h2>
                    {selectedAccount && <div className="mt-2 text-[13px] text-[#6B6B6B]">{selectedAccount.activeJobsCount} משרות פעילות · {selectedAccount.totalJobsCount} משרות סה״כ</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    {sheet.mode === 'view' && <ActionButton variant="ghost" icon={Edit2} onClick={() => setSheet((prev) => ({ ...prev, mode: 'edit' }))}>עריכה</ActionButton>}
                    <button type="button" onClick={closeSheet} className="rounded-xl border border-[#D9D9D9] p-2 text-[#6B6B6B] hover:bg-[#F3F4F6]"><X className="h-5 w-5" /></button>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-5">
                {sheet.mode === 'view' && selectedAccount ? (
                  <>
                    <SectionCard title="פרטי ארגון">
                      <LabelValue label="שם" value={selectedAccount.account_name ?? '—'} />
                      <LabelValue label="סוג" value={accountTypeName(selectedAccount.account_type)} />
                      <LabelValue label="סטטוס מעסיק" value={accountStatusName(selectedAccount.account_status)} />
                      <LabelValue label="אזור" value={regionName(selectedAccount.region_id)} />
                      <LabelValue label="עיר" value={cityName(selectedAccount.city_id)} />
                    </SectionCard>
                    <SectionCard title="משרות">
                      <LabelValue label="משרות פעילות" value={String(selectedAccount.activeJobsCount)} />
                      <LabelValue label="סה״כ משרות" value={String(selectedAccount.totalJobsCount)} />
                      <div className="mt-3 flex flex-wrap gap-2">{selectedAccount.relatedJobs.slice(0, 12).map((job) => <span key={job.job_code} className="rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[12px] font-semibold">{job.job_code}</span>)}</div>
                    </SectionCard>
                    <SectionCard title="תקשורת ואנשי קשר">
                      <LabelValue label="טלפון" value={formatPhone(selectedAccount.phone)} />
                      <LabelValue label="מייל" value={selectedAccount.email ?? '—'} />
                      <LabelValue label="אתר" value={(selectedAccount as any).website_url ?? '—'} />
                      <LabelValue label="אנשי קשר" value={selectedAccount.linkedContactSummary || '—'} />
                    </SectionCard>
                  </>
                ) : (
                  <>
                    <SectionCard title="פרטי בסיס">
                      <TextField label="שם ארגון" value={draft.account_name} onChange={(value) => setDraft((prev) => ({ ...prev, account_name: value }))} />
                      <SelectLikeField label="סטטוס מעסיק" value={String(draft.account_status ?? '')} onChange={(value) => setDraft((prev) => ({ ...prev, account_status: value ? Number(value) : null }))} options={accountStatuses.map((item) => ({ value: String(item.id), label: item.name }))} />
                      <SelectLikeField label="סוג ארגון" value={String(draft.account_type ?? '')} onChange={(value) => setDraft((prev) => ({ ...prev, account_type: value ? Number(value) : null }))} options={accountTypes.map((item) => ({ value: String(item.id), label: item.name }))} />
                      <TextField label="ח.פ / מזהה" value={draft.bus_id} onChange={(value) => setDraft((prev) => ({ ...prev, bus_id: value }))} />
                    </SectionCard>
                    <SectionCard title="תקשורת">
                      <TextField label="טלפון" value={draft.phone} onChange={(value) => setDraft((prev) => ({ ...prev, phone: value }))} />
                      <TextField label="טלפון נוסף" value={draft.second_phone} onChange={(value) => setDraft((prev) => ({ ...prev, second_phone: value }))} />
                      <TextField label="מייל" value={draft.email} onChange={(value) => setDraft((prev) => ({ ...prev, email: value }))} />
                      <TextField label="מייל לחשבונית" value={draft.billing_email} onChange={(value) => setDraft((prev) => ({ ...prev, billing_email: value }))} />
                      <TextField label="אתר" value={draft.website_url} onChange={(value) => setDraft((prev) => ({ ...prev, website_url: value }))} />
                    </SectionCard>
                    <SectionCard title="מיקום ותפעול">
                      <SelectLikeField label="אזור" value={String(draft.region_id ?? '')} onChange={(value) => setDraft((prev) => ({ ...prev, region_id: value ? Number(value) : null, city_id: null }))} options={regions.map((item) => ({ value: String(item.id), label: item.name }))} />
                      <SelectLikeField label="עיר" value={String(draft.city_id ?? '')} onChange={(value) => setDraft((prev) => ({ ...prev, city_id: value ? Number(value) : null }))} options={(draft.region_id ? cities.filter((item) => Number(item.region_id) === Number(draft.region_id)) : cities).map((item) => ({ value: String(item.id), label: item.name }))} />
                      <TextField label="כתובת" value={draft.address} onChange={(value) => setDraft((prev) => ({ ...prev, address: value }))} />
                      <TextField label="גודל צוות" value={draft.team_size} onChange={(value) => setDraft((prev) => ({ ...prev, team_size: value }))} type="number" />
                      <TextField label="מספר כיסאות" value={draft.chairs_count} onChange={(value) => setDraft((prev) => ({ ...prev, chairs_count: value }))} type="number" />
                      <DateField label="פולו־אפ הבא" value={draft.next_follow_up} onChange={(value) => setDraft((prev) => ({ ...prev, next_follow_up: value }))} />
                    </SectionCard>
                    <SectionCard title="הערות">
                      <TextareaField label="הערות" value={draft.notes} onChange={(value) => setDraft((prev) => ({ ...prev, notes: value }))} />
                    </SectionCard>
                    <div className="sticky bottom-0 bg-white/95 pt-2 backdrop-blur-sm">
                      <div className="flex justify-end gap-2 border-t border-[#D9D9D9] pt-4">
                        <ActionButton variant="ghost" onClick={closeSheet}>ביטול</ActionButton>
                        <ActionButton variant="primary" onClick={saveSheet} disabled={savingSheet}>{savingSheet ? 'שומר...' : 'שמור שינויים'}</ActionButton>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </aside>
          </div>
        )}

        {toast.open && (
          <div className="fixed bottom-5 left-5 z-[70]">
            <div className={`rounded-[18px] border px-4 py-3 shadow-md ${toast.tone === 'success' ? 'border-green-200 bg-green-50 text-green-700' : toast.tone === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-sky-200 bg-sky-50 text-sky-700'}`}>
              <div className="flex items-center gap-2 text-[14px] font-bold">{toast.tone === 'success' ? <CheckCircle2 className="h-4 w-4" /> : toast.tone === 'error' ? <AlertTriangle className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}{toast.message}</div>
            </div>
          </div>
        )}
      </div>
    </Shell>
  )
}

function KpiCard({ label, value, hint, tone = 'default', onClick }: { label: string; value: number; hint?: string; tone?: 'default' | 'success' | 'warning'; onClick?: () => void }) {
  const toneClasses = tone === 'success' ? 'border-[#BBF7D0] bg-[#F0FDF4]' : tone === 'warning' ? 'border-[#FDE68A] bg-[#FFFBEB]' : 'border-[#D9D9D9] bg-white'
  const valueClasses = tone === 'success' ? 'text-[#16A34A]' : tone === 'warning' ? 'text-[#D97706]' : 'text-[#008080]'
  return <button type="button" onClick={onClick} className={`rounded-[18px] border p-5 text-right shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${toneClasses}`}><div className="text-[13px] font-semibold text-[#6B6B6B]">{label}</div><div className={`mt-2 text-[24px] font-bold ${valueClasses}`}>{value}</div>{hint && <div className="mt-1 text-[12px] font-medium text-[#6B6B6B]">{hint}</div>}</button>
}

function InfoPill({ label, tone = 'default' }: { label: string; tone?: 'default' | 'success' }) {
  return <span className={`rounded-full px-3 py-1 text-[12px] font-semibold ${tone === 'success' ? 'bg-[#F0FDF4] text-[#16A34A]' : 'bg-[#F3F4F6] text-[#6B6B6B]'}`}>{label}</span>
}

function MiniSignal({ children, tone = 'muted' }: { children: React.ReactNode; tone?: 'muted' | 'warning' }) {
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${tone === 'warning' ? 'bg-[#FFFBEB] text-[#D97706]' : 'bg-[#F3F4F6] text-[#6B6B6B]'}`}>{children}</span>
}

function SortableTh({ label, sortKey, sortBy, sortDir, onSort, width, onResize }: { label: string; sortKey: string; sortBy: string | null; sortDir: 'asc' | 'desc'; onSort: (key: string) => void; width?: number; onResize?: (delta: number) => void }) {
  const active = sortBy === sortKey
  return (
    <th style={{ width, minWidth: width }} className="px-4 py-3 text-[14px] font-extrabold text-[#2D2D2D]">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => onSort(sortKey)} className="inline-flex items-center gap-1 hover:text-[#008080]">
          <span>{label}</span>
          <span className="flex flex-col leading-none">
            <ChevronUp className={`h-3 w-3 ${active && sortDir === 'asc' ? 'text-[#008080]' : 'text-[#9CA3AF]'}`} />
            <ChevronDown className={`h-3 w-3 -mt-1 ${active && sortDir === 'desc' ? 'text-[#008080]' : 'text-[#9CA3AF]'}`} />
          </span>
        </button>
        {onResize && (
          <span className="inline-flex overflow-hidden rounded-lg border border-[#D9D9D9] bg-white">
            <button type="button" onClick={(event) => { event.stopPropagation(); onResize(-30) }} className="px-1.5 text-[12px] font-bold text-[#6B6B6B] hover:bg-[#F3F4F6]">−</button>
            <button type="button" onClick={(event) => { event.stopPropagation(); onResize(30) }} className="px-1.5 text-[12px] font-bold text-[#6B6B6B] hover:bg-[#F3F4F6]">+</button>
          </span>
        )}
      </div>
    </th>
  )
}

function IconAction({ title, icon, onClick, disabled }: { title: string; icon: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return <button type="button" title={title} onClick={onClick} disabled={disabled} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#D9D9D9] bg-white text-[#6B6B6B] transition hover:bg-[#F3F4F6] hover:text-[#008080] disabled:cursor-not-allowed disabled:opacity-40">{icon}</button>
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-[18px] border border-[#D9D9D9] bg-white p-4 shadow-sm"><h3 className="mb-3 text-[14px] font-bold text-[#2D2D2D]">{title}</h3><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div></section>
}

function LabelValue({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-xl bg-[#F3F4F6] p-3"><div className="text-[12px] font-semibold text-[#6B6B6B]">{label}</div><div className="mt-1 text-[14px] font-bold text-[#2D2D2D]">{value}</div></div>
}

function TextField({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="grid gap-1 text-[13px] font-semibold text-[#2D2D2D]"><span>{label}</span><input dir="rtl" type={type} value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-xl border border-[#D9D9D9] bg-white px-3 text-[13px] outline-none focus:border-[#008080]" /></label>
}

function TextareaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="grid gap-1 text-[13px] font-semibold text-[#2D2D2D] sm:col-span-2"><span>{label}</span><textarea dir="rtl" value={value} onChange={(event) => onChange(event.target.value)} rows={4} className="rounded-xl border border-[#D9D9D9] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#008080]" /></label>
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="grid gap-1 text-[13px] font-semibold text-[#2D2D2D]"><span>{label}</span><input type="date" value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-xl border border-[#D9D9D9] bg-white px-3 text-[13px] outline-none focus:border-[#008080]" /></label>
}

function SelectLikeField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  return <label className="grid gap-1 text-[13px] font-semibold text-[#2D2D2D]"><span>{label}</span><select dir="rtl" value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-xl border border-[#D9D9D9] bg-white px-3 text-[13px] outline-none focus:border-[#008080]"><option value="">בחרו...</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
}
