import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2,
  Plus,
  Download,
  Eye,
  Edit2,
  Phone,
  Mail,
  Globe,
  MapPin,
  RefreshCw,
  CalendarClock,
  Briefcase,
  Search,
  AlertTriangle,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  X,
  Users,
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
import { accountStatusColors, getStatusBadge } from '@/lib/statusColors'
import { supabase } from '@/lib/supabase'
import { DICT_ROLES } from '@/lib/dicts'
import type { Account, Contact } from '@/types'

// ===== טיפוסי פילטרים מורחבים =====
// כל שדה ב-accounts שאפשר לסנן לפיו = פילטר זמין (זהה ל-AdminContactsPage)
type ExtendedEmployerFilters = {
  search?: string
  account_status?: number
  account_type?: number
  region_id?: number
  city_id?: number
  clinic_type?: string
  hiring_role?: string
  specialty?: string
  system_used?: number
  active_jobs_only?: 'yes'
  vip_only?: 'yes'
  overdue_follow_up?: 'yes'
  linked_contact_state?: 'linked' | 'unlinked'
  has_email?: 'yes' | 'no'
  has_phone?: 'yes' | 'no'
  has_website?: 'yes' | 'no'
  team_size_min?: number
  team_size_max?: number
  chairs_count_min?: number
  chairs_count_max?: number
  address?: string
  bus_id?: string
  created_from?: string
  created_to?: string
  updated_from?: string
  updated_to?: string
  last_contact_from?: string
  last_contact_to?: string
  next_follow_up_from?: string
  next_follow_up_to?: string
}


type ToastTone = 'success' | 'error' | 'info'


type ToastState = {
  open: boolean
  tone: ToastTone
  message: string
}


type BulkActionType = '' | 'status' | 'followup' | 'export' | 'mark_vip'


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
  clinic_type: string
  team_size: string
  chairs_count: string
  notes: string
  next_follow_up: string
  specialties: string[]
  hiring_roles: string[]
}


const ACTIVE_EMPLOYER_STATUSES = [1, 2, 3, 4, 7]


const CLINIC_TYPE_OPTIONS = [
  'פרטית',
  'רשת',
  'פרטית מומחית',
  'מרכז רפואי',
  'ציבורית',
  'קופת חולים',
  'מעבדה',
]


interface AdminEmployersPageProps {
  initialTab?: 'active' | 'all'
  pageTitle?: string
  pageSubtitle?: string
}

export default function AdminEmployersPage({ initialTab = 'all', pageTitle = 'מעסיקים', pageSubtitle }: AdminEmployersPageProps = {}) {
  const [filters, setFilters] = useState<ExtendedEmployerFilters>({})
  const [tab, setTab] = useState<'active' | 'all'>(initialTab)
  const [page, setPage] = useState(0)
  const [selectedRows, setSelectedRows] = useState<number[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [toast, setToast] = useState<ToastState>({ open: false, tone: 'info', message: '' })
  const [bulkAction, setBulkAction] = useState<BulkActionType>('')
  const [bulkValue, setBulkValue] = useState('')
  const [savingSheet, setSavingSheet] = useState(false)
  const [sortBy, setSortBy] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const handleSort = (key: string) => {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortBy(key); setSortDir('asc') }
    setPage(0)
  }

  const pageSize = 20


  const queryFilters = useMemo(
    () => ({
      search: filters.search,
      account_status: filters.account_status,
      account_type: filters.account_type,
      region_id: filters.region_id,
      city_id: filters.city_id,
    }),
    [filters],
  )


  const queryClient = useQueryClient()

  const { data: rawEmployers = [] } = useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: async () => {
      const PAGE = 1000
      const all: Account[] = []
      let from = 0
      while (true) {
        const { data, error } = await supabase
          .from('accounts')
          .select('*')
          .order('account_id')
          .range(from, from + PAGE - 1)
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
    queryKey: ['contacts'],
    queryFn: async () => {
      const PAGE = 1000
      const all: Contact[] = []
      let from = 0
      while (true) {
        const { data, error } = await supabase
          .from('contact')
          .select('contact_id,full_name,display_name,phone_norm,email,account_link,role')
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

  // === Dict tables מ-Supabase (SSOT — לא hardcoded) ===
  const { data: accountStatuses = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['dict_account_statuses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_account_statuses').select('id,name').order('id')
      if (error) throw error
      return data ?? []
    },
    staleTime: 5 * 60_000,
  })

  const { data: accountTypes = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['dict_account_types'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_account_types').select('id,name').order('id')
      if (error) throw error
      return data ?? []
    },
    staleTime: 5 * 60_000,
  })

  const { data: systemsOptions = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['dict_systems'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_systems').select('id,name').order('name')
      if (error) throw error
      return data ?? []
    },
    staleTime: 5 * 60_000,
  })

  const { data: proceduresOptions = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['dict_procedures'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_procedures').select('id,name').order('name')
      if (error) throw error
      return data ?? []
    },
    staleTime: 5 * 60_000,
  })

  const regions = regionOptions
  const cities = cityOptions
  const roles = DICT_ROLES


  const accountStatusName = (id: number | null | undefined) =>
    accountStatuses.find((item) => item.id === id)?.name ?? '—'


  const accountTypeName = (id: number | null | undefined) =>
    accountTypes.find((item) => item.id === id)?.name ?? '—'


  const regionName = (id: number | null | undefined) =>
    regions.find((item) => item.id === id)?.name ?? '—'


  const cityName = (id: number | null | undefined) =>
    cities.find((item) => item.id === id)?.name ?? '—'


  const enrichedEmployers = useMemo(() => {
    return rawEmployers.map((employer) => {
      const linkedContacts = contacts.filter((contact) => contact.account_link === employer.account_id)
      const relatedJobs: never[] = []
      const hasActiveJobs = Number(employer.active_job_count_auto ?? 0) > 0
      const overdueFollowUp = isDue(employer.next_follow_up)
      const isVip = Number(employer.account_status) === 8 || String(employer.notes ?? '').includes('VIP')
      const hiringRoles = employer.hiring_roles ?? []
      const linkedContactSummary = linkedContacts
        .slice(0, 3)
        .map((item) => item.full_name || item.display_name || item.email || item.phone_norm)
        .filter(Boolean)
        .join(' · ')
      const missingPhone = !normalizeDigits(employer.phone)
      const missingLocation = !employer.region_id || !employer.city_id
      const signals = [
        overdueFollowUp ? 'פולו־אפ פתוח' : null,
        !linkedContacts.length ? 'ללא איש קשר' : null,
        !hasActiveJobs ? 'ללא משרות פעילות' : null,
        missingPhone ? 'ללא טלפון' : null,
        missingLocation ? 'מיקום חסר' : null,
        isVip ? 'VIP' : null,
      ].filter(Boolean) as string[]


      return {
        ...employer,
        linkedContacts,
        relatedJobs,
        hiringRoles,
        linkedContactSummary,
        derived: {
          hasActiveJobs,
          overdueFollowUp,
          isVip,
          missingPhone,
          missingLocation,
          linkedContactsCount: linkedContacts.length,
          signals,
        },
      }
    })
  }, [contacts, rawEmployers])


  const hiringRoleOptions = useMemo(() => {
    const set = new Set<string>()
    roles.forEach((item) => set.add(item.name))
    enrichedEmployers.forEach((item) => {
      ;(item.hiring_roles ?? []).forEach((role) => {
        const value = String(role ?? '').trim()
        if (value) set.add(value)
      })
      const relRole = String(item.rel_role ?? '').trim()
      if (relRole) set.add(relRole)
    })
    return Array.from(set)
  }, [enrichedEmployers, roles])


  // Cascading region→city מבוסס על cities.region_id (לא hardcoded)
  const activeCityOptions = useMemo(() => {
    if (!filters.region_id) return cities
    return cities.filter((item) => item.region_id === Number(filters.region_id))
  }, [cities, filters.region_id])


  // עזרים לפילטרי טווח תאריכים
  const inDateRange = (value: string | null | undefined, from?: string, to?: string) => {
    if (!from && !to) return true
    if (!value) return false
    const ts = new Date(value).getTime()
    if (Number.isNaN(ts)) return false
    if (from && ts < new Date(from).getTime()) return false
    if (to && ts > new Date(to + 'T23:59:59').getTime()) return false
    return true
  }


  const filteredEmployers = useMemo(() => {
    const base =
      tab === 'active'
        ? enrichedEmployers.filter((item) => ACTIVE_EMPLOYER_STATUSES.includes(Number(item.account_status)))
        : enrichedEmployers


    const searchLower = (filters.search ?? '').trim().toLowerCase()
    const addressLower = (filters.address ?? '').trim().toLowerCase()
    const busIdLower = (filters.bus_id ?? '').trim().toLowerCase()


    return base.filter((employer) => {
      // === חיפוש טקסט חופשי על כל השדות הרלוונטיים ===
      if (searchLower) {
        const haystack = [
          employer.account_name,
          employer.bus_id,
          employer.phone,
          employer.second_phone,
          employer.email,
          employer.second_email,
          employer.billing_email,
          employer.address,
          employer.website_url,
          employer.facebook_url,
          employer.notes,
          accountTypeName(employer.account_type),
          accountStatusName(employer.account_status),
          regionName(employer.region_id),
          cityName(employer.city_id),
          employer.linkedContactSummary,
        ]
          .filter(Boolean)
          .map((v) => String(v).toLowerCase())
          .join(' | ')
        if (!haystack.includes(searchLower)) return false
      }


      // === dropdown filters בסיסיים ===
      if (filters.account_status && Number(employer.account_status) !== filters.account_status) return false
      if (filters.account_type && Number(employer.account_type) !== filters.account_type) return false
      if (filters.region_id && Number(employer.region_id) !== filters.region_id) return false
      if (filters.city_id && Number(employer.city_id) !== filters.city_id) return false
      if (filters.clinic_type && String(employer.clinic_type ?? '') !== filters.clinic_type) return false


      // === hiring_role: בודק גם hiring_roles[] וגם rel_role ===
      if (
        filters.hiring_role &&
        ![...(employer.hiring_roles ?? []), String(employer.rel_role ?? '')].filter(Boolean).includes(filters.hiring_role)
      ) {
        return false
      }


      // === specialties[] (multi-value field) ===
      if (filters.specialty && !(employer.specialties ?? []).includes(filters.specialty)) return false


      // === systems_used[] (multi-value field) ===
      if (filters.system_used && !(employer.systems_used ?? []).includes(filters.system_used)) return false


      // === toggles נגזרים ===
      if (filters.active_jobs_only === 'yes' && !employer.derived.hasActiveJobs) return false
      if (filters.vip_only === 'yes' && !employer.derived.isVip) return false
      if (filters.overdue_follow_up === 'yes' && !employer.derived.overdueFollowUp) return false
      if (filters.linked_contact_state === 'linked' && employer.derived.linkedContactsCount === 0) return false
      if (filters.linked_contact_state === 'unlinked' && employer.derived.linkedContactsCount > 0) return false


      // === has_email / has_phone / has_website ===
      if (filters.has_email === 'yes' && !employer.email) return false
      if (filters.has_email === 'no' && employer.email) return false
      if (filters.has_phone === 'yes' && !employer.phone) return false
      if (filters.has_phone === 'no' && employer.phone) return false
      if (filters.has_website === 'yes' && !employer.website_url) return false
      if (filters.has_website === 'no' && employer.website_url) return false


      // === טווחי מספרים ===
      const teamSize = Number(employer.team_size ?? 0)
      if (filters.team_size_min !== undefined && teamSize < filters.team_size_min) return false
      if (filters.team_size_max !== undefined && teamSize > filters.team_size_max) return false
      const chairs = Number(employer.chairs_count ?? 0)
      if (filters.chairs_count_min !== undefined && chairs < filters.chairs_count_min) return false
      if (filters.chairs_count_max !== undefined && chairs > filters.chairs_count_max) return false


      // === חיפוש טקסט בכתובת / bus_id ===
      if (addressLower && !String(employer.address ?? '').toLowerCase().includes(addressLower)) return false
      if (busIdLower && !String(employer.bus_id ?? '').toLowerCase().includes(busIdLower)) return false


      // === טווחי תאריכים ===
      if (!inDateRange(employer.created_timestamp, filters.created_from, filters.created_to)) return false
      if (!inDateRange(employer.updated_timestamp, filters.updated_from, filters.updated_to)) return false
      if (!inDateRange(employer.last_contact_date, filters.last_contact_from, filters.last_contact_to)) return false
      if (!inDateRange(employer.next_follow_up, filters.next_follow_up_from, filters.next_follow_up_to)) return false


      return true
    }).sort((a: any, b: any) => {
      if (!sortBy) return 0
      const av = String(a[sortBy] ?? ''), bv = String(b[sortBy] ?? '')
      return sortDir === 'asc' ? av.localeCompare(bv, 'he') : bv.localeCompare(av, 'he')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrichedEmployers, filters, tab, accountStatuses, accountTypes, regions, cities, sortBy, sortDir])


  const totalVisible = filteredEmployers.length
  const totalPages = Math.max(1, Math.ceil(totalVisible / pageSize))
  const pageData = filteredEmployers.slice(page * pageSize, (page + 1) * pageSize)
  const selectedEmployer = filteredEmployers.find((item) => item.account_id === selectedId) ?? null


  const kpis = useMemo(() => {
    const currentList = filteredEmployers
    return {
      totalEmployers: currentList.length,
      activeEmployers: currentList.filter((item) => ACTIVE_EMPLOYER_STATUSES.includes(Number(item.account_status))).length,
      vipEmployers: currentList.filter((item) => item.derived.isVip).length,
      withActiveJobs: currentList.filter((item) => item.derived.hasActiveJobs).length,
      overdueFollowUps: currentList.filter((item) => item.derived.overdueFollowUp).length,
    }
  }, [filteredEmployers])


  const initialDraft = useMemo<EmployerDraft>(() => {
    if (!selectedEmployer) {
      return {
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
        clinic_type: '',
        team_size: '',
        chairs_count: '',
        notes: '',
        next_follow_up: '',
        specialties: [],
        hiring_roles: [],
      }
    }


    return {
      account_name: selectedEmployer.account_name ?? '',
      account_status: selectedEmployer.account_status ?? null,
      account_type: selectedEmployer.account_type ?? null,
      bus_id: selectedEmployer.bus_id ?? '',
      phone: selectedEmployer.phone ?? '',
      second_phone: selectedEmployer.second_phone ?? '',
      email: selectedEmployer.email ?? '',
      billing_email: selectedEmployer.billing_email ?? '',
      address: selectedEmployer.address ?? '',
      website_url: selectedEmployer.website_url ?? '',
      region_id: selectedEmployer.region_id ?? null,
      city_id: selectedEmployer.city_id ?? null,
      clinic_type: selectedEmployer.clinic_type ?? '',
      team_size:
        selectedEmployer.team_size === null || selectedEmployer.team_size === undefined
          ? ''
          : String(selectedEmployer.team_size),
      chairs_count:
        selectedEmployer.chairs_count === null || selectedEmployer.chairs_count === undefined
          ? ''
          : String(selectedEmployer.chairs_count),
      notes: selectedEmployer.notes ?? '',
      next_follow_up: toDateInputValue(selectedEmployer.next_follow_up),
      specialties: selectedEmployer.specialties ?? [],
      hiring_roles: selectedEmployer.hiring_roles ?? [],
    }
  }, [selectedEmployer])


  const [draft, setDraft] = useState<EmployerDraft>(initialDraft)


  useEffect(() => {
    setPage(0)
  }, [filters, tab])


  useEffect(() => {
    setDraft(initialDraft)
  }, [initialDraft])


  useEffect(() => {
    if (!toast.open) return
    const timer = window.setTimeout(() => {
      setToast((prev) => ({ ...prev, open: false }))
    }, 2600)
    return () => window.clearTimeout(timer)
  }, [toast.open])


  const showToast = (message: string, tone: ToastTone = 'info') => {
    setToast({ open: true, tone, message })
  }


  const clearFilters = () => {
    setFilters({})
    setSelectedRows([])
  }


  const openSheet = (accountId: number) => {
    setSelectedId(accountId)
    setSheetOpen(true)
  }


  const closeSheet = () => setSheetOpen(false)

  const openNewSheet = () => {
    setSelectedId(null)
    setDraft({
      account_name: '', account_status: 1, account_type: null, bus_id: '', phone: '',
      second_phone: '', email: '', billing_email: '', address: '', website_url: '',
      region_id: null, city_id: null, clinic_type: '', team_size: '', chairs_count: '',
      notes: '', next_follow_up: '', specialties: [], hiring_roles: [],
    })
    setSheetOpen(true)
  }


  const toggleRowSelection = (accountId: number) => {
    setSelectedRows((prev) =>
      prev.includes(accountId) ? prev.filter((id) => id !== accountId) : [...prev, accountId],
    )
  }


  const togglePageSelection = () => {
    const ids = pageData.map((item) => item.account_id)
    const allSelected = ids.length > 0 && ids.every((id) => selectedRows.includes(id))
    if (allSelected) {
      setSelectedRows((prev) => prev.filter((id) => !ids.includes(id)))
      return
    }
    setSelectedRows((prev) => Array.from(new Set([...prev, ...ids])))
  }


  const exportCsv = () => {
    const rows = filteredEmployers.map((item) => ({
      'שם מעסיק': item.account_name ?? '',
      bus_id: item.bus_id ?? '',
      'סטטוס': accountStatusName(item.account_status),
      'סוג': accountTypeName(item.account_type),
      'אזור / עיר': `${regionName(item.region_id)} / ${cityName(item.city_id)}`,
      'משרות פעילות': String(item.active_job_count_auto ?? 0),
      'סה"כ משרות': String(item.total_jobs_count ?? 0),
      'גודל צוות': String(item.team_size ?? ''),
      'איש קשר': item.linkedContactSummary || item.contact_link || '',
      'פולו־אפ הבא': formatDate(item.next_follow_up),
      'סוג מרפאה': item.clinic_type ?? '',
      'תפקידי גיוס': (item.hiring_roles ?? []).join(' | '),
    }))


    const csv = toCsv(rows)
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'admin-employers-export.csv'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    window.URL.revokeObjectURL(url)
    showToast('הייצוא הושלם', 'success')
  }


  const handleBulkApply = () => {
    if (!selectedRows.length) {
      showToast('יש לבחור לפחות מעסיק אחד', 'error')
      return
    }
    if (!bulkAction) {
      showToast('יש לבחור פעולת bulk', 'error')
      return
    }
    if (bulkAction !== 'export' && !bulkValue && bulkAction !== 'mark_vip') {
      showToast('יש לבחור ערך לפעולה', 'error')
      return
    }


    switch (bulkAction) {
      case 'status':
        showToast(`עודכן account_status עבור ${selectedRows.length} רשומות`, 'success')
        break
      case 'followup':
        showToast(`נוצר follow-up עבור ${selectedRows.length} רשומות`, 'success')
        break
      case 'mark_vip':
        showToast('הרשומות סומנו כ־VIP', 'success')
        break
      case 'export':
        exportCsv()
        break
      default:
        showToast('הפעולה בוצעה', 'success')
        break
    }


    setBulkAction('')
    setBulkValue('')
  }


  const saveSheet = async () => {
    if (!draft.account_name.trim()) {
      showToast('שם מעסיק הוא שדה חובה', 'error')
      return
    }


    if (draft.email && !isValidEmail(draft.email)) {
      showToast('כתובת האימייל אינה תקינה', 'error')
      return
    }


    if (draft.billing_email && !isValidEmail(draft.billing_email)) {
      showToast('billing_email אינו תקין', 'error')
      return
    }


    if (draft.website_url && !isLikelyUrl(draft.website_url)) {
      showToast('כתובת האתר אינה תקינה', 'error')
      return
    }


    if (draft.region_id && !draft.city_id) {
      showToast('יש לבחור עיר לאחר בחירת אזור', 'error')
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
        clinic_type: draft.clinic_type || null,
        team_size: draft.team_size ? Number(draft.team_size) : null,
        chairs_count: draft.chairs_count ? Number(draft.chairs_count) : null,
        notes: draft.notes.trim() || null,
        next_follow_up: draft.next_follow_up || null,
        specialties: draft.specialties.length ? draft.specialties : null,
        hiring_roles: draft.hiring_roles.length ? draft.hiring_roles : null,
      }

      if (selectedId) {
        const { error } = await supabase.from('accounts').update(payload).eq('account_id', selectedId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('accounts').insert(payload)
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


  const selectedCount = selectedRows.length


  return (
    <Shell
      title={pageTitle}
      subtitle={pageSubtitle ?? `${pageTitle} • ${totalVisible} תוצאות לאחר סינון`}
      icon={Building2}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <ActionButton variant="ghost" icon={RefreshCw} onClick={() => showToast('הרשימה רועננה', 'success')}>
            רענון
          </ActionButton>
          <ActionButton variant="ghost" icon={Download} onClick={exportCsv}>
            ייצוא
          </ActionButton>
          <ActionButton variant="primary" icon={Plus} onClick={openNewSheet}>
            מעסיק חדש
          </ActionButton>
        </div>
      }
    >
      <div dir="rtl" className="min-h-screen bg-[#F8FAFC] font-['Heebo'] text-[#0F172A]">
        <div className="space-y-6">
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <KpiCard label="סה״כ מעסיקים" value={kpis.totalEmployers} hint="לאחר סינון" tone="default" onClick={clearFilters} />
            <KpiCard label="מעסיקים פעילים" value={kpis.activeEmployers} hint="active hiring pool" tone="default" onClick={() => setTab('active')} />
            <KpiCard label="VIP" value={kpis.vipEmployers} hint="VIP / high touch" tone="warning" onClick={() => setFilters((prev) => ({ ...prev, vip_only: 'yes' }))} />
            <KpiCard label="עם משרות פעילות" value={kpis.withActiveJobs} hint="active_job_count_auto > 0" tone="success" onClick={() => setFilters((prev) => ({ ...prev, active_jobs_only: 'yes' }))} />
            <KpiCard label="follow-up פתוח" value={kpis.overdueFollowUps} hint="דורש טיפול" tone="warning" onClick={() => setFilters((prev) => ({ ...prev, overdue_follow_up: 'yes' }))} />
          </section>


          <Toolbar>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-slate-100 pb-4">
                <button
                  type="button"
                  onClick={() => {
                    setTab('active')
                    setPage(0)
                  }}
                  className={`rounded-full px-4 py-2 text-[13px] font-semibold transition ${
                    tab === 'active'
                      ? 'bg-[#F0FDFC] text-[#008080]'
                      : 'bg-[#F8FAFC] text-slate-600 hover:text-slate-800'
                  }`}
                >
                  פעילים בלבד
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab('all')
                    setPage(0)
                  }}
                  className={`rounded-full px-4 py-2 text-[13px] font-semibold transition ${
                    tab === 'all'
                      ? 'bg-[#F0FDFC] text-[#008080]'
                      : 'bg-[#F8FAFC] text-slate-600 hover:text-slate-800'
                  }`}
                >
                  כל הארגונים
                </button>
              </div>


              <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#F0FDFC] text-[#008080] shadow-sm">
                  <Search className="h-4 w-4" />
                </div>
                <h2 className="text-[15px] font-bold text-[#0F172A]">חיפוש וסינון מעסיקים</h2>
                <span className="rounded-full bg-[#F8FAFC] px-2.5 py-1 text-[12px] font-semibold text-slate-500">
                  employer-admin
                </span>
              </div>


              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
                <SearchBar
                  value={filters.search ?? ''}
                  onChange={(value) => setFilters((prev) => ({ ...prev, search: value }))}
                  placeholder="חיפוש מעסיק, טלפון, bus_id..."
                />


                <SelectFilter
                  value={String(filters.account_status ?? '')}
                  onChange={(value) =>
                    setFilters((prev) => ({ ...prev, account_status: value ? Number(value) : undefined }))
                  }
                  options={accountStatuses.map((item) => ({ value: String(item.id), label: item.name }))}
                  placeholder="סטטוס"
                />


                <SelectFilter
                  value={String(filters.account_type ?? '')}
                  onChange={(value) =>
                    setFilters((prev) => ({ ...prev, account_type: value ? Number(value) : undefined }))
                  }
                  options={accountTypes.map((item) => ({ value: String(item.id), label: item.name }))}
                  placeholder="סוג"
                />


                <SelectFilter
                  value={String(filters.region_id ?? '')}
                  onChange={(value) =>
                    setFilters((prev) => ({ ...prev, region_id: value ? Number(value) : undefined, city_id: undefined }))
                  }
                  options={regions.map((item) => ({ value: String(item.id), label: item.name }))}
                  placeholder="אזור"
                />


                <SelectFilter
                  value={String(filters.city_id ?? '')}
                  onChange={(value) =>
                    setFilters((prev) => ({ ...prev, city_id: value ? Number(value) : undefined }))
                  }
                  options={activeCityOptions.map((item) => ({ value: String(item.id), label: item.name }))}
                  placeholder="עיר"
                />


                <SelectFilter
                  value={String(filters.clinic_type ?? '')}
                  onChange={(value) => setFilters((prev) => ({ ...prev, clinic_type: value || undefined }))}
                  options={CLINIC_TYPE_OPTIONS.map((item) => ({ value: item, label: item }))}
                  placeholder="סוג מרפאה"
                />


                <SelectFilter
                  value={String(filters.hiring_role ?? '')}
                  onChange={(value) => setFilters((prev) => ({ ...prev, hiring_role: value || undefined }))}
                  options={hiringRoleOptions.map((item) => ({ value: item, label: item }))}
                  placeholder="תפקיד גיוס"
                />


                <SelectFilter
                  value={String(filters.active_jobs_only ?? '')}
                  onChange={(value) => setFilters((prev) => ({ ...prev, active_jobs_only: value ? 'yes' : undefined }))}
                  options={[{ value: 'yes', label: 'עם משרות פעילות' }]}
                  placeholder="משרות פעילות"
                />


                <SelectFilter
                  value={String(filters.vip_only ?? '')}
                  onChange={(value) => setFilters((prev) => ({ ...prev, vip_only: value ? 'yes' : undefined }))}
                  options={[{ value: 'yes', label: 'VIP בלבד' }]}
                  placeholder="VIP"
                />


                <SelectFilter
                  value={String(filters.overdue_follow_up ?? '')}
                  onChange={(value) => setFilters((prev) => ({ ...prev, overdue_follow_up: value ? 'yes' : undefined }))}
                  options={[{ value: 'yes', label: 'follow-up פתוח' }]}
                  placeholder="follow-up"
                />


                <SelectFilter
                  value={String(filters.linked_contact_state ?? '')}
                  onChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      linked_contact_state: value ? (value as 'linked' | 'unlinked') : undefined,
                    }))
                  }
                  options={[
                    { value: 'linked', label: 'עם איש קשר מקושר' },
                    { value: 'unlinked', label: 'ללא איש קשר' },
                  ]}
                  placeholder="איש קשר"
                />


                {/* ===== פילטרים חדשים — כל שדה ב-accounts שאפשר לסנן לפיו ===== */}
                <SelectFilter
                  value={String(filters.specialty ?? '')}
                  onChange={(value) => setFilters((prev) => ({ ...prev, specialty: value || undefined }))}
                  options={proceduresOptions.map((item) => ({ value: item.name, label: item.name }))}
                  placeholder="התמחות"
                />


                <SelectFilter
                  value={String(filters.system_used ?? '')}
                  onChange={(value) =>
                    setFilters((prev) => ({ ...prev, system_used: value ? Number(value) : undefined }))
                  }
                  options={systemsOptions.map((item) => ({ value: String(item.id), label: item.name }))}
                  placeholder="מערכת בשימוש"
                />


                <SelectFilter
                  value={String(filters.has_phone ?? '')}
                  onChange={(value) =>
                    setFilters((prev) => ({ ...prev, has_phone: value ? (value as 'yes' | 'no') : undefined }))
                  }
                  options={[
                    { value: 'yes', label: 'עם טלפון' },
                    { value: 'no', label: 'ללא טלפון' },
                  ]}
                  placeholder="טלפון"
                />


                <SelectFilter
                  value={String(filters.has_email ?? '')}
                  onChange={(value) =>
                    setFilters((prev) => ({ ...prev, has_email: value ? (value as 'yes' | 'no') : undefined }))
                  }
                  options={[
                    { value: 'yes', label: 'עם מייל' },
                    { value: 'no', label: 'ללא מייל' },
                  ]}
                  placeholder="מייל"
                />


                <SelectFilter
                  value={String(filters.has_website ?? '')}
                  onChange={(value) =>
                    setFilters((prev) => ({ ...prev, has_website: value ? (value as 'yes' | 'no') : undefined }))
                  }
                  options={[
                    { value: 'yes', label: 'עם אתר' },
                    { value: 'no', label: 'ללא אתר' },
                  ]}
                  placeholder="אתר"
                />


                <input
                  type="text"
                  dir="rtl"
                  value={filters.address ?? ''}
                  onChange={(event) => setFilters((prev) => ({ ...prev, address: event.target.value || undefined }))}
                  placeholder="כתובת מכילה..."
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-medium text-[#0F172A] outline-none focus:border-[#008080] focus:ring-2 focus:ring-[#008080]/10"
                />


                <input
                  type="text"
                  dir="rtl"
                  value={filters.bus_id ?? ''}
                  onChange={(event) => setFilters((prev) => ({ ...prev, bus_id: event.target.value || undefined }))}
                  placeholder="ח.פ. / bus_id..."
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-medium text-[#0F172A] outline-none focus:border-[#008080] focus:ring-2 focus:ring-[#008080]/10"
                />


                {/* ===== טווחי מספרים ===== */}
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    dir="ltr"
                    value={filters.team_size_min ?? ''}
                    onChange={(event) =>
                      setFilters((prev) => ({
                        ...prev,
                        team_size_min: event.target.value ? Number(event.target.value) : undefined,
                      }))
                    }
                    placeholder="צוות מ-"
                    className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-medium text-[#0F172A] outline-none focus:border-[#008080] focus:ring-2 focus:ring-[#008080]/10"
                  />
                  <input
                    type="number"
                    dir="ltr"
                    value={filters.team_size_max ?? ''}
                    onChange={(event) =>
                      setFilters((prev) => ({
                        ...prev,
                        team_size_max: event.target.value ? Number(event.target.value) : undefined,
                      }))
                    }
                    placeholder="עד"
                    className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-medium text-[#0F172A] outline-none focus:border-[#008080] focus:ring-2 focus:ring-[#008080]/10"
                  />
                </div>


                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    dir="ltr"
                    value={filters.chairs_count_min ?? ''}
                    onChange={(event) =>
                      setFilters((prev) => ({
                        ...prev,
                        chairs_count_min: event.target.value ? Number(event.target.value) : undefined,
                      }))
                    }
                    placeholder="כסאות מ-"
                    className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-medium text-[#0F172A] outline-none focus:border-[#008080] focus:ring-2 focus:ring-[#008080]/10"
                  />
                  <input
                    type="number"
                    dir="ltr"
                    value={filters.chairs_count_max ?? ''}
                    onChange={(event) =>
                      setFilters((prev) => ({
                        ...prev,
                        chairs_count_max: event.target.value ? Number(event.target.value) : undefined,
                      }))
                    }
                    placeholder="עד"
                    className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-medium text-[#0F172A] outline-none focus:border-[#008080] focus:ring-2 focus:ring-[#008080]/10"
                  />
                </div>


                {/* ===== טווחי תאריכים ===== */}
                <div className="flex items-center gap-1">
                  <input
                    type="date"
                    dir="ltr"
                    value={filters.created_from ?? ''}
                    onChange={(event) =>
                      setFilters((prev) => ({ ...prev, created_from: event.target.value || undefined }))
                    }
                    title="נוצר מ-"
                    className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-2 text-[12px] font-medium text-[#0F172A] outline-none focus:border-[#008080] focus:ring-2 focus:ring-[#008080]/10"
                  />
                  <input
                    type="date"
                    dir="ltr"
                    value={filters.created_to ?? ''}
                    onChange={(event) =>
                      setFilters((prev) => ({ ...prev, created_to: event.target.value || undefined }))
                    }
                    title="נוצר עד"
                    className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-2 text-[12px] font-medium text-[#0F172A] outline-none focus:border-[#008080] focus:ring-2 focus:ring-[#008080]/10"
                  />
                </div>


                <div className="flex items-center gap-1">
                  <input
                    type="date"
                    dir="ltr"
                    value={filters.updated_from ?? ''}
                    onChange={(event) =>
                      setFilters((prev) => ({ ...prev, updated_from: event.target.value || undefined }))
                    }
                    title="עודכן מ-"
                    className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-2 text-[12px] font-medium text-[#0F172A] outline-none focus:border-[#008080] focus:ring-2 focus:ring-[#008080]/10"
                  />
                  <input
                    type="date"
                    dir="ltr"
                    value={filters.updated_to ?? ''}
                    onChange={(event) =>
                      setFilters((prev) => ({ ...prev, updated_to: event.target.value || undefined }))
                    }
                    title="עודכן עד"
                    className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-2 text-[12px] font-medium text-[#0F172A] outline-none focus:border-[#008080] focus:ring-2 focus:ring-[#008080]/10"
                  />
                </div>


                <div className="flex items-center gap-1">
                  <input
                    type="date"
                    dir="ltr"
                    value={filters.last_contact_from ?? ''}
                    onChange={(event) =>
                      setFilters((prev) => ({ ...prev, last_contact_from: event.target.value || undefined }))
                    }
                    title="קשר אחרון מ-"
                    className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-2 text-[12px] font-medium text-[#0F172A] outline-none focus:border-[#008080] focus:ring-2 focus:ring-[#008080]/10"
                  />
                  <input
                    type="date"
                    dir="ltr"
                    value={filters.last_contact_to ?? ''}
                    onChange={(event) =>
                      setFilters((prev) => ({ ...prev, last_contact_to: event.target.value || undefined }))
                    }
                    title="קשר אחרון עד"
                    className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-2 text-[12px] font-medium text-[#0F172A] outline-none focus:border-[#008080] focus:ring-2 focus:ring-[#008080]/10"
                  />
                </div>


                <div className="flex items-center gap-1">
                  <input
                    type="date"
                    dir="ltr"
                    value={filters.next_follow_up_from ?? ''}
                    onChange={(event) =>
                      setFilters((prev) => ({ ...prev, next_follow_up_from: event.target.value || undefined }))
                    }
                    title="פולו-אפ הבא מ-"
                    className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-2 text-[12px] font-medium text-[#0F172A] outline-none focus:border-[#008080] focus:ring-2 focus:ring-[#008080]/10"
                  />
                  <input
                    type="date"
                    dir="ltr"
                    value={filters.next_follow_up_to ?? ''}
                    onChange={(event) =>
                      setFilters((prev) => ({ ...prev, next_follow_up_to: event.target.value || undefined }))
                    }
                    title="פולו-אפ הבא עד"
                    className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-2 text-[12px] font-medium text-[#0F172A] outline-none focus:border-[#008080] focus:ring-2 focus:ring-[#008080]/10"
                  />
                </div>
              </div>


              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <InfoPill label={`תוצאות: ${totalVisible}`} />
                  <InfoPill label={`VIP: ${kpis.vipEmployers}`} tone="warning" />
                  <InfoPill label={`עם משרות פעילות: ${kpis.withActiveJobs}`} tone="success" />
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


          {selectedCount > 0 && (
            <Toolbar>
              <div className="rounded-2xl border border-[#008080]/20 bg-[#F0FDFC] p-4 shadow-sm">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white px-3 py-1 text-[13px] font-bold text-[#008080] shadow-sm">
                      נבחרו {selectedCount} רשומות
                    </span>
                    <span className="text-[13px] font-medium text-slate-600">bulk actions זמינות לאחר בחירה</span>
                  </div>


                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      dir="rtl"
                      value={bulkAction}
                      onChange={(event) => {
                        setBulkAction(event.target.value as BulkActionType)
                        setBulkValue('')
                      }}
                      className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-medium text-[#0F172A] outline-none focus:border-[#008080] focus:ring-2 focus:ring-[#008080]/10"
                    >
                      <option value="">בחר פעולת bulk</option>
                      <option value="status">שינוי סטטוס</option>
                      <option value="followup">יצירת follow-up</option>
                      <option value="mark_vip">סימון VIP</option>
                      <option value="export">ייצוא</option>
                    </select>


                    {bulkAction === 'status' && (
                      <select
                        dir="rtl"
                        value={bulkValue}
                        onChange={(event) => setBulkValue(event.target.value)}
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-medium text-[#0F172A] outline-none focus:border-[#008080] focus:ring-2 focus:ring-[#008080]/10"
                      >
                        <option value="">בחר סטטוס</option>
                        {accountStatuses.map((item) => (
                          <option key={item.id} value={String(item.id)}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    )}


                    {bulkAction === 'followup' && (
                      <input
                        type="date"
                        dir="rtl"
                        value={bulkValue}
                        onChange={(event) => setBulkValue(event.target.value)}
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-medium text-[#0F172A] outline-none focus:border-[#008080] focus:ring-2 focus:ring-[#008080]/10"
                      />
                    )}


                    <ActionButton variant="primary" onClick={handleBulkApply}>
                      אשר
                    </ActionButton>
                    <ActionButton variant="ghost" onClick={() => { setBulkAction(''); setBulkValue('') }}>
                      ביטול
                    </ActionButton>
                  </div>
                </div>
              </div>
            </Toolbar>
          )}


          <Toolbar>
            {pageData.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <EmptyState
                  icon={Building2}
                  title={rawEmployers.length === 0 ? 'אין מעסיקים במערכת' : 'לא נמצאו תוצאות'}
                  description={
                    rawEmployers.length === 0
                      ? 'עדיין לא קיימים מעסיקים במערכת.'
                      : 'שנו את תנאי הסינון כדי לקבל תוצאות.'
                  }
                />
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-[1680px] w-full text-right">
                    <thead className="bg-[#F8FAFC]">
                      <tr className="border-b border-slate-200 text-[13px] font-semibold text-slate-500">
                        <th className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={pageData.length > 0 && pageData.every((row) => selectedRows.includes(row.account_id))}
                            onChange={togglePageSelection}
                            className="h-4 w-4 rounded border-slate-300 text-[#008080] focus:ring-[#008080]"
                          />
                        </th>
                        <EmployerSortableTh label="שם מעסיק" sortKey="account_name" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                        <EmployerSortableTh label="סוג" sortKey="account_type" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                        <EmployerSortableTh label="סטטוס" sortKey="account_status" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                        <th className="px-4 py-3">טלפון</th>
                        <th className="px-4 py-3">מייל</th>
                        <EmployerSortableTh label="אזור / עיר" sortKey="region_id" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                        <th className="px-4 py-3">משרות פעילות</th>
                        <th className="px-4 py-3">סה"כ משרות</th>
                        <th className="px-4 py-3">גודל צוות</th>
                        <EmployerSortableTh label="follow-up" sortKey="next_follow_up" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                        <th className="px-4 py-3">פעולות</th>
                      </tr>
                    </thead>


                    <tbody className="divide-y divide-slate-100">
                      {pageData.map((employer) => {
                        const status = getStatusBadge(accountStatusColors, employer.account_status)
                        const selected = selectedRows.includes(employer.account_id)


                        return (
                          <tr
                            key={employer.account_id}
                            className={`text-[13px] font-medium text-[#0F172A] transition ${selected ? 'bg-[#F0FDFC]' : 'hover:bg-slate-50'}`}
                            onClick={() => openSheet(employer.account_id)}
                          >
                            <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleRowSelection(employer.account_id)}
                                className="h-4 w-4 rounded border-slate-300 text-[#008080] focus:ring-[#008080]"
                              />
                            </td>


                            <td className="px-4 py-3">
                              <div className="min-w-[250px]">
                                <div className="flex items-start gap-3">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F0FDFC] text-[15px] font-bold text-[#008080] shadow-sm">
                                    {(employer.account_name ?? '?').charAt(0)}
                                  </div>
                                  <div className="space-y-1">
                                    <Link
                                      to={`/admin/employers/${employer.account_id}`}
                                      onClick={(event) => event.stopPropagation()}
                                      className="text-[14px] font-bold text-[#0F172A] hover:text-[#008080]"
                                    >
                                      {employer.account_name ?? '—'}
                                    </Link>
                                    <div className="flex flex-wrap gap-1.5">
                                      {employer.derived.signals.slice(0, 2).map((signal) => (
                                        <InlineSignal
                                          key={`${employer.account_id}-${signal}`}
                                          tone={
                                            signal.includes('VIP')
                                              ? 'warning'
                                              : signal.includes('ללא') || signal.includes('חסר')
                                                ? 'danger'
                                                : signal.includes('פולו')
                                                  ? 'warning'
                                                  : 'muted'
                                          }
                                        >
                                          {signal}
                                        </InlineSignal>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>


                            <td className="px-4 py-3">{accountTypeName(employer.account_type)}</td>
                            <td className="px-4 py-3">
                              <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${status.bg} ${status.text}`}>
                                {status.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-[12px]" dir="ltr">{employer.phone ?? '—'}</td>
                            <td className="px-4 py-3 text-[12px]" dir="ltr">{employer.email ?? '—'}</td>
                            <td className="px-4 py-3">{`${regionName(employer.region_id)} / ${cityName(employer.city_id)}`}</td>
                            <td className="px-4 py-3">
                              <span className="rounded-full bg-[#F0FDF4] px-2.5 py-1 text-[12px] font-bold text-[#16A34A]">
                                {employer.active_job_count_auto ?? 0}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="rounded-full bg-[#F8FAFC] px-2.5 py-1 text-[12px] font-bold text-slate-700">
                                {employer.total_jobs_count ?? 0}
                              </span>
                            </td>
                            <td className="px-4 py-3">{employer.team_size ?? '—'}</td>
                            <td className="px-4 py-3">
                              <div className="space-y-1">
                                <div>{formatDate(employer.next_follow_up)}</div>
                                {employer.derived.overdueFollowUp && <InlineSignal tone="warning">פתוח</InlineSignal>}
                              </div>
                            </td>
                            <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1">
                                <IconAction title="Employer 360" asLink={`/admin/employers/${employer.account_id}`} icon={<Eye className="h-4 w-4" />} />
                                <IconAction title="Edit" onClick={() => openSheet(employer.account_id)} icon={<Edit2 className="h-4 w-4" />} />
                                <IconAction title="Create Job" asLink={`/jobs/new?account=${employer.account_id}`} icon={<Briefcase className="h-4 w-4" />} />
                                <IconAction
                                  title="טלפון"
                                  onClick={() => {
                                    if (!employer.phone) {
                                      showToast('אין טלפון זמין', 'error')
                                      return
                                    }
                                    window.location.href = `tel:${employer.phone}`
                                  }}
                                  icon={<Phone className="h-4 w-4" />}
                                  disabled={!employer.phone}
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
                  <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={totalVisible} />
                </div>
              </div>
            )}
          </Toolbar>
        </div>


        {sheetOpen && (selectedEmployer || selectedId === null) && (
          <div className="fixed inset-0 z-50 flex justify-start">
            <div className="absolute inset-0 bg-slate-900/30" onClick={closeSheet} />
            <aside className="relative z-10 h-full w-full max-w-[620px] overflow-y-auto border-l border-slate-200 bg-white shadow-xl">
              <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
                <div className="flex items-start justify-between gap-3 px-5 py-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#F0FDFC] text-[22px] font-bold text-[#008080] shadow-sm">
                      {selectedId === null ? '+' : (selectedEmployer?.account_name ?? '?').charAt(0)}
                    </div>
                    <div className="space-y-2">
                      <div>
                        <h2 className="text-[24px] font-bold text-[#0F172A]">{selectedId === null ? 'מעסיק חדש' : selectedEmployer?.account_name}</h2>
                        {selectedEmployer && (
                          <div className="mt-1 flex flex-wrap gap-2">
                            <Badge tone="default">{accountTypeName(selectedEmployer.account_type)}</Badge>
                            <Badge tone="muted">{accountStatusName(selectedEmployer.account_status)}</Badge>
                            <Badge tone="muted">{`${cityName(selectedEmployer.city_id)} / ${regionName(selectedEmployer.region_id)}`}</Badge>
                          </div>
                        )}
                      </div>


                      {selectedEmployer && (
                        <div className="flex flex-wrap gap-2">
                          <PrimaryLinkAction to={`/admin/employers/${selectedEmployer.account_id}`} icon={<Eye className="h-4 w-4" />} label="Employer 360" />
                          <QuickSheetButton icon={<Briefcase className="h-4 w-4" />} label="Create Job" onClick={() => window.open(`/jobs/new?account=${selectedEmployer.account_id}`, '_self')} />
                          <QuickLinkButton href={selectedEmployer.phone ? `tel:${selectedEmployer.phone}` : undefined} icon={<Phone className="h-4 w-4" />} label="טלפון" disabled={!selectedEmployer.phone} />
                          <QuickLinkButton href={selectedEmployer.email ? `mailto:${selectedEmployer.email}` : undefined} icon={<Mail className="h-4 w-4" />} label="אימייל" disabled={!selectedEmployer.email} />
                          <QuickLinkButton href={selectedEmployer.website_url ?? undefined} icon={<Globe className="h-4 w-4" />} label="אתר" disabled={!selectedEmployer.website_url} />
                        </div>
                      )}
                    </div>
                  </div>


                  <button
                    type="button"
                    onClick={closeSheet}
                    className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
                    aria-label="סגור"
                    title="סגור"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>


              <div className="space-y-4 p-5">
                <SectionCard title="פרטי מעסיק">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <TextField label="account_name" value={draft.account_name} onChange={(value) => setDraft((prev) => ({ ...prev, account_name: value }))} />
                    <SelectLikeField
                      label="account_status"
                      value={String(draft.account_status ?? '')}
                      onChange={(value) => setDraft((prev) => ({ ...prev, account_status: value ? Number(value) : null }))}
                      options={accountStatuses.map((item) => ({ value: String(item.id), label: item.name }))}
                    />
                    <SelectLikeField
                      label="account_type"
                      value={String(draft.account_type ?? '')}
                      onChange={(value) => setDraft((prev) => ({ ...prev, account_type: value ? Number(value) : null }))}
                      options={accountTypes.map((item) => ({ value: String(item.id), label: item.name }))}
                    />
                    <TextField label="bus_id" value={draft.bus_id} onChange={(value) => setDraft((prev) => ({ ...prev, bus_id: value }))} />
                  </div>
                </SectionCard>


                <SectionCard title="תקשורת">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <TextField label="phone" value={draft.phone} onChange={(value) => setDraft((prev) => ({ ...prev, phone: value }))} />
                    <TextField label="second_phone" value={draft.second_phone} onChange={(value) => setDraft((prev) => ({ ...prev, second_phone: value }))} />
                    <TextField label="email" value={draft.email} onChange={(value) => setDraft((prev) => ({ ...prev, email: value }))} />
                    <TextField label="billing_email" value={draft.billing_email} onChange={(value) => setDraft((prev) => ({ ...prev, billing_email: value }))} />
                    <TextField label="address" value={draft.address} onChange={(value) => setDraft((prev) => ({ ...prev, address: value }))} />
                    <TextField label="website_url" value={draft.website_url} onChange={(value) => setDraft((prev) => ({ ...prev, website_url: value }))} />
                  </div>
                </SectionCard>


                <SectionCard title="מיקום ותפעול">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <SelectLikeField
                      label="region_id"
                      value={String(draft.region_id ?? '')}
                      onChange={(value) => setDraft((prev) => ({ ...prev, region_id: value ? Number(value) : null, city_id: null }))}
                      options={regions.map((item) => ({ value: String(item.id), label: item.name }))}
                    />
                    <SelectLikeField
                      label="city_id"
                      value={String(draft.city_id ?? '')}
                      onChange={(value) => setDraft((prev) => ({ ...prev, city_id: value ? Number(value) : null }))}
                      options={(draft.region_id ? cities.filter((item) => item.region_id === draft.region_id) : cities).map((item) => ({ value: String(item.id), label: item.name }))}
                    />
                    <SelectLikeField
                      label="clinic_type"
                      value={draft.clinic_type}
                      onChange={(value) => setDraft((prev) => ({ ...prev, clinic_type: value }))}
                      options={CLINIC_TYPE_OPTIONS.map((item) => ({ value: item, label: item }))}
                    />
                    <TextField label="team_size" value={draft.team_size} onChange={(value) => setDraft((prev) => ({ ...prev, team_size: value }))} type="number" />
                    <TextField label="chairs_count" value={draft.chairs_count} onChange={(value) => setDraft((prev) => ({ ...prev, chairs_count: value }))} type="number" />
                    <DateField label="next_follow_up" value={draft.next_follow_up} onChange={(value) => setDraft((prev) => ({ ...prev, next_follow_up: value }))} />
                  </div>
                </SectionCard>


                <SectionCard title="DNA גיוסי">
                  <TagEditor label="specialties" values={draft.specialties} onChange={(values) => setDraft((prev) => ({ ...prev, specialties: values }))} placeholder="הוסף התמחות" />
                  <div className="mt-4" />
                  <TagEditor label="hiring_roles" values={draft.hiring_roles} onChange={(values) => setDraft((prev) => ({ ...prev, hiring_roles: values }))} options={hiringRoleOptions} placeholder="הוסף תפקיד גיוס" />
                </SectionCard>


                <SectionCard title="הערות וסיגנלים">
                  <TextareaField label="notes" value={draft.notes} onChange={(value) => setDraft((prev) => ({ ...prev, notes: value }))} />
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedEmployer?.derived.signals.length ? (
                      selectedEmployer.derived.signals.map((signal) => (
                        <InlineSignal key={`${selectedEmployer?.account_id}-${signal}`} tone={signal.includes('VIP') ? 'warning' : signal.includes('ללא') || signal.includes('חסר') ? 'danger' : 'muted'}>
                          {signal}
                        </InlineSignal>
                      ))
                    ) : (
                      <InlineSignal tone="success">ללא חריגות</InlineSignal>
                    )}
                  </div>
                </SectionCard>


                <div className="sticky bottom-0 bg-white/95 pt-2 backdrop-blur-sm">
                  <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
                    <ActionButton variant="ghost" onClick={closeSheet}>ביטול</ActionButton>
                    <ActionButton variant="primary" onClick={saveSheet} disabled={savingSheet}>
                      {savingSheet ? 'שומר...' : 'שמור שינויים'}
                    </ActionButton>
                  </div>
                </div>
              </div>
            </aside>
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


function KpiCard({
  label,
  value,
  hint,
  tone,
  onClick,
}: {
  label: string
  value: number
  hint?: string
  tone: 'default' | 'success' | 'warning'
  onClick?: () => void
}) {
  const toneClasses =
    tone === 'success'
      ? 'border-[#BBF7D0] bg-[#F0FDF4]'
      : tone === 'warning'
        ? 'border-[#FDE68A] bg-[#FFFBEB]'
        : 'border-slate-200 bg-white'


  const valueClasses =
    tone === 'success'
      ? 'text-[#16A34A]'
      : tone === 'warning'
        ? 'text-[#D97706]'
        : 'text-[#0F172A]'


  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-right shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${toneClasses}`}
    >
      <div className="text-[13px] font-semibold text-slate-500">{label}</div>
      <div className={`mt-2 text-[24px] font-bold ${valueClasses}`}>{value}</div>
      {hint ? <div className="mt-1 text-[12px] font-medium text-slate-500">{hint}</div> : null}
    </button>
  )
}


function InfoPill({
  label,
  tone = 'default',
}: {
  label: string
  tone?: 'default' | 'success' | 'warning'
}) {
  const classes =
    tone === 'success'
      ? 'bg-[#F0FDF4] text-[#16A34A]'
      : tone === 'warning'
        ? 'bg-[#FFFBEB] text-[#D97706]'
        : 'bg-[#F8FAFC] text-slate-600'


  return <span className={`rounded-full px-3 py-1 text-[12px] font-semibold ${classes}`}>{label}</span>
}


function InlineSignal({
  children,
  tone,
}: {
  children: React.ReactNode
  tone: 'warning' | 'danger' | 'success' | 'muted'
}) {
  const classes =
    tone === 'warning'
      ? 'bg-[#FFFBEB] text-[#D97706]'
      : tone === 'danger'
        ? 'bg-[#FEF2F2] text-[#DC2626]'
        : tone === 'success'
          ? 'bg-[#F0FDF4] text-[#16A34A]'
          : 'bg-[#F8FAFC] text-slate-500'


  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${classes}`}>{children}</span>
}


function Badge({
  children,
  tone,
}: {
  children: React.ReactNode
  tone: 'default' | 'muted'
}) {
  const classes =
    tone === 'muted'
      ? 'bg-[#F8FAFC] text-slate-600 border-slate-200'
      : 'bg-[#F0FDFC] text-[#008080] border-[#99F6E4]'


  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[12px] font-semibold ${classes}`}>{children}</span>
}


function IconAction({
  title,
  icon,
  onClick,
  asLink,
  disabled,
}: {
  title: string
  icon: React.ReactNode
  onClick?: () => void
  asLink?: string
  disabled?: boolean
}) {
  const className =
    'rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'


  if (asLink) {
    return (
      <Link to={asLink} title={title} aria-label={title} className={className}>
        {icon}
      </Link>
    )
  }


  return (
    <button type="button" title={title} aria-label={title} disabled={disabled} onClick={onClick} className={className}>
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
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-[16px] font-bold text-[#0F172A]">{title}</h3>
      {children}
    </section>
  )
}


function TextField({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-slate-500">{label}</span>
      <input
        dir="rtl"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-medium text-[#0F172A] outline-none transition focus:border-[#008080] focus:ring-2 focus:ring-[#008080]/10"
      />
    </label>
  )
}


function SelectLikeField({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-slate-500">{label}</span>
      <select
        dir="rtl"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-medium text-[#0F172A] outline-none transition focus:border-[#008080] focus:ring-2 focus:ring-[#008080]/10"
      >
        <option value="">בחר</option>
        {options.map((item) => (
          <option key={`${label}-${item.value}`} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
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
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-slate-500">{label}</span>
      <input
        type="date"
        dir="rtl"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-medium text-[#0F172A] outline-none transition focus:border-[#008080] focus:ring-2 focus:ring-[#008080]/10"
      />
    </label>
  )
}


function TextareaField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-slate-500">{label}</span>
      <textarea
        dir="rtl"
        rows={4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-[#0F172A] outline-none transition focus:border-[#008080] focus:ring-2 focus:ring-[#008080]/10"
      />
    </label>
  )
}


function EmployerSortableTh({ label, sortKey, sortBy, sortDir, onSort }: {
  label: string; sortKey: string; sortBy: string | null; sortDir: 'asc' | 'desc'; onSort: (k: string) => void
}) {
  const active = sortBy === sortKey
  return (
    <th className="relative cursor-pointer select-none px-4 py-4 hover:bg-slate-100" onClick={() => onSort(sortKey)}>
      <span className="flex items-center gap-1.5">
        {label}
        <span className={`flex flex-col ${active ? 'text-[#008080]' : 'text-slate-400'}`}>
          <ChevronUp className={`h-3 w-3 -mb-1 ${active && sortDir === 'asc' ? 'text-[#008080]' : 'text-slate-300'}`} />
          <ChevronDown className={`h-3 w-3 ${active && sortDir === 'desc' ? 'text-[#008080]' : 'text-slate-300'}`} />
        </span>
      </span>
    </th>
  )
}


function TagEditor({
  label,
  values,
  onChange,
  options = [],
  placeholder,
}: {
  label: string
  values: string[]
  onChange: (value: string[]) => void
  options?: string[]
  placeholder?: string
}) {
  const [input, setInput] = useState('')


  const addTag = (rawValue: string) => {
    const next = rawValue.trim()
    if (!next) return
    if (values.includes(next)) {
      setInput('')
      return
    }
    onChange([...values, next])
    setInput('')
  }


  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-slate-500">{label}</span>


      {options.length > 0 && (
        <select
          dir="rtl"
          value=""
          onChange={(event) => addTag(event.target.value)}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-medium text-[#0F172A] outline-none transition focus:border-[#008080] focus:ring-2 focus:ring-[#008080]/10"
        >
          <option value="">בחר ערך קיים</option>
          {options.filter((item) => !values.includes(item)).map((item) => (
            <option key={`${label}-${item}`} value={item}>{item}</option>
          ))}
        </select>
      )}


      <div className="flex gap-2">
        <input
          dir="rtl"
          value={input}
          placeholder={placeholder}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              addTag(input)
            }
          }}
          className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-medium text-[#0F172A] outline-none transition focus:border-[#008080] focus:ring-2 focus:ring-[#008080]/10"
        />
        <button
          type="button"
          onClick={() => addTag(input)}
          className="rounded-xl bg-[#008080] px-3 py-2 text-[13px] font-bold text-white shadow-sm transition hover:opacity-95"
        >
          הוסף
        </button>
      </div>


      <div className="flex flex-wrap gap-2">
        {values.length ? values.map((item) => (
          <button
            key={`${label}-${item}`}
            type="button"
            onClick={() => onChange(values.filter((value) => value !== item))}
            className="inline-flex items-center gap-1 rounded-full border border-[#99F6E4] bg-[#F0FDFC] px-3 py-1.5 text-[12px] font-semibold text-[#008080] transition hover:border-[#0EA5A4]"
          >
            {item}
            <X className="h-3 w-3" />
          </button>
        )) : <span className="text-[12px] text-slate-400">ללא ערכים</span>}
      </div>
    </div>
  )
}


function PrimaryLinkAction({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-2 rounded-xl bg-[#008080] px-3 py-2 text-[13px] font-bold text-white shadow-sm transition hover:opacity-95">
      {icon}
      {label}
    </Link>
  )
}


function QuickSheetButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
    >
      {icon}
      {label}
    </button>
  )
}


function QuickLinkButton({ href, icon, label, disabled }: { href?: string; icon: React.ReactNode; label: string; disabled?: boolean }) {
  if (disabled || !href) {
    return (
      <button type="button" disabled className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] font-semibold text-slate-400">
        {icon}
        {label}
      </button>
    )
  }


  return (
    <a
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noreferrer' : undefined}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
    >
      {icon}
      {label}
    </a>
  )
}


function normalizeDigits(value?: string | null) {
  return String(value ?? '').replace(/\D/g, '')
}


function isDue(value?: string | null) {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  return date.getTime() <= Date.now()
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
  return /^(https?:\/\/)/i.test(value)
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
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => escapeValue(String(row[header] ?? ''))).join(',')),
  ]
  return lines.join('\n')
}





