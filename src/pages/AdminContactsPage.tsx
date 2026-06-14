import React, { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Columns3,
  Download,
  Edit2,
  Eye,
  Facebook,
  FileText,
  Mail,
  Merge,
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
  Pagination,
  EmptyState,
} from '@/components/layout/Shell'
import { formatPhone } from '@/lib/normalizePhone'
import {
  DICT_AVAILABILITY,
  DICT_CHECK_STATUSES,
  DICT_EXPERIENCE,
  DICT_PROFILE_TYPES,
  DICT_ROLES,
  DICT_SOCIAL_STATUSES,
  DICT_SOURCES,
  DICT_SUB_ROLES,
} from '@/lib/dicts'
import { supabase } from '@/lib/supabase'
import { mockContactTags } from '@/mocks/data'
import type { Contact } from '@/types'
import { RoleBadge } from '@/components/admin/RoleBadge'

type ExtendedFilters = {
  search?: string
  role?: number
  region_id?: number
  city_id?: number
  availability?: number
  source?: number
  check_status?: number
  sub_role?: number
  profile_type?: number
  experience?: number
  has_cv?: 'yes' | 'no'
  social_status?: number
  link_state?: 'linked' | 'unlinked'
  tags?: string
  follow_up_due?: 'yes' | 'no'
  created_from?: string
  created_to?: string
  updated_from?: string
  updated_to?: string
}

type ToastState = {
  open: boolean
  message: string
  tone: 'success' | 'error' | 'info'
}

type KpiRoleTone =
  | 'doctor'
  | 'hygienist'
  | 'assistant'
  | 'secretary'
  | 'technician'
  | 'manager'

type KpiRoleCard = {
  key: string
  label: string
  value: number
  tone: KpiRoleTone
  roleIds: number[]
}

const AVAILABLE_TAGS = [
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
]

const KPI_ROLE_GROUPS: KpiRoleCard[] = [
  { key: 'assistant',  label: 'סייעות',      tone: 'assistant',  roleIds: [9], value: 0 },
  { key: 'hygienist',  label: 'שינניות',      tone: 'hygienist',  roleIds: [10], value: 0 },
  { key: 'doctor',     label: 'רופאים',       tone: 'doctor',     roleIds: [1, 2, 3, 4, 5, 6, 7, 8], value: 0 },
  { key: 'secretary',  label: 'מזכירות',      tone: 'secretary',  roleIds: [13], value: 0 },
  { key: 'technician', label: 'טכנאים',       tone: 'technician', roleIds: [11], value: 0 },
  { key: 'manager',    label: 'ניהול / גיוס', tone: 'manager',    roleIds: [12, 14, 15, 16, 17, 18], value: 0 },
]

const ALL_COLUMNS = [
  { key: 'full_name', label: 'שם מלא' },
  { key: 'phone', label: 'טלפון' },
  { key: 'email', label: 'אימייל' },
  { key: 'role', label: 'תפקיד' },
  { key: 'region', label: 'אזור' },
  { key: 'city', label: 'עיר' },
  { key: 'availability', label: 'זמינות' },
  { key: 'cv', label: 'קו"ח' },
  { key: 'profile_type', label: 'סוג פרופיל' },
  { key: 'linked_org', label: 'ארגון מקושר' },
  { key: 'whatsapp', label: 'תאריך שליחת וואטאפ' },
  { key: 'last_contact', label: 'קשר אחרון' },
] as const

const DEFAULT_COLUMNS = [
  'full_name',
  'phone',
  'email',
  'role',
  'region',
  'city',
  'availability',
  'cv',
  'profile_type',
  'linked_org',
  'whatsapp',
  'last_contact',
] as const

export default function AdminContactsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<ExtendedFilters>({})
  const [page, setPage] = useState(0)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedRows, setSelectedRows] = useState<number[]>([])
  const [toast, setToast] = useState<ToastState>({ open: false, message: '', tone: 'info' })
  const [rowActionPending, setRowActionPending] = useState<number | null>(null)
  const [exportPending, setExportPending] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<string[]>([...DEFAULT_COLUMNS])
  const [sortBy, setSortBy] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [colWidths, setColWidths] = useState<Record<string, number>>({})
  const [isEditing, setIsEditing] = useState(false)
  const [editDraft, setEditDraft] = useState<Partial<Contact>>({})
  const [savePending, setSavePending] = useState(false)
  const [panelTags, setPanelTags] = useState<string[]>([])
  const [showTagDropdown, setShowTagDropdown] = useState(false)

  // Bulk update
  const [bulkUpdateOpen, setBulkUpdateOpen] = useState(false)
  const [bulkField, setBulkField] = useState('')
  const [bulkValue, setBulkValue] = useState<string | number | null>(null)
  const [bulkPending, setBulkPending] = useState(false)

  // Merge
  const [mergeOpen, setMergeOpen] = useState(false)
  const [mergePrimaryId, setMergePrimaryId] = useState<number | null>(null)
  const [mergePending, setMergePending] = useState(false)

  const pageSize = 20

  const { data: rawContacts = [], isError: contactsError, error: contactsFetchError } = useQuery<Contact[]>({
    queryKey: ['contacts'],
    queryFn: async () => {
      // Supabase מחזיר max 1000 שורות per request — שואבים בדפים עד שמסיימים
      const PAGE = 1000
      const all: Contact[] = []
      let from = 0
      while (true) {
        const { data, error } = await supabase
          .from('contact')
          .select('*')
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

  const { data: accountsList = [] } = useQuery<{ account_id: number; account_name: string | null }[]>({
    queryKey: ['accounts_names'],
    queryFn: async () => {
      const { data, error } = await supabase.from('accounts').select('account_id,account_name')
      if (error) throw error
      return data ?? []
    },
    staleTime: 60_000,
  })

  const total = rawContacts.length

  const roleOptions = DICT_ROLES
  const availabilityOptions = DICT_AVAILABILITY
  const experienceOptions = DICT_EXPERIENCE
  const sourceOptions = DICT_SOURCES
  const checkStatusOptions = DICT_CHECK_STATUSES
  const socialStatusOptions = DICT_SOCIAL_STATUSES
  const profileTypeOptions = DICT_PROFILE_TYPES

  const { data: contactTagsData = [] } = useQuery<{ contact_id: number; tag: string }[]>({
    queryKey: ['contact_tags', selectedId],
    queryFn: async () => {
      if (!selectedId) return []
      const { data, error } = await supabase.from('contact_tags').select('contact_id,tag').eq('contact_id', selectedId)
      if (error) throw error
      return data ?? []
    },
    enabled: !!selectedId,
  })

  const selectedTags = useMemo(
    () => (contactTagsData.length ? contactTagsData : mockContactTags.filter((item) => item.contact_id === (selectedId ?? -1))),
    [contactTagsData, selectedId],
  )

  useEffect(() => {
    setPanelTags(selectedTags.map((t) => t.tag))
    setIsEditing(false)
    setEditDraft({})
  }, [selectedId])

  const roleName = (id: number | null | undefined) => roleOptions.find((r) => r.id === id)?.name ?? '—'
  const subRoleName = (id: number | null | undefined) => DICT_SUB_ROLES.find((r) => r.id === id)?.name ?? '—'
  const regionName = (id: number | null | undefined) => regionOptions.find((r) => r.id === id)?.name ?? '—'
  const cityName = (id: number | null | undefined) => cityOptions.find((r) => r.id === id)?.name ?? '—'
  const availabilityName = (id: number | null | undefined) => availabilityOptions.find((r) => r.id === id)?.name ?? '—'
  const experienceName = (id: number | null | undefined) => experienceOptions.find((r) => r.id === id)?.name ?? '—'
  const sourceName = (id: number | null | undefined) => sourceOptions.find((r) => r.id === id)?.name ?? '—'
  const checkStatusName = (id: number | null | undefined) => checkStatusOptions.find((r) => r.id === id)?.name ?? '—'
  const socialStatusName = (id: number | null | undefined) => socialStatusOptions.find((r) => r.id === id)?.name ?? '—'
  const profileTypeName = (id: number | null | undefined) => profileTypeOptions.find((r) => r.id === id)?.name ?? '—'

  const accountNameById = useMemo(() => {
    const map = new Map<number, string>()
    accountsList.forEach((account) => {
      map.set(account.account_id, account.account_name ?? '')
    })
    return map
  }, [accountsList])


  const phoneNormCounts = useMemo(() => {
    const map = new Map<string, number>()
    rawContacts.forEach((contact) => {
      const key = String(contact.phone_norm ?? '').trim()
      if (!key) return
      map.set(key, (map.get(key) ?? 0) + 1)
    })
    return map
  }, [rawContacts])

  const enrichedContacts = useMemo(() => {
    return rawContacts.map((contact) => {
      const localTags = mockContactTags
        .filter((tag) => tag.contact_id === contact.contact_id)
        .map((tag) => tag.tag)

      const hasBrokenCv = Boolean(contact.has_cv && (!contact.cv_link || !isValidUrl(contact.cv_link)))
      const hasNoPhoneButEmail = !contact.phone_norm && Boolean(contact.email)
      const isPartialProfile = !contact.role || !contact.city_id || !contact.region_id
      const isDuplicatePhone = Boolean(
        contact.phone_norm && (phoneNormCounts.get(String(contact.phone_norm)) ?? 0) > 1,
      )
      const isDuplicateEmail = Boolean(contact.dup_email_flag)
      const hasWarning =
        hasBrokenCv || hasNoPhoneButEmail || isPartialProfile || isDuplicatePhone || isDuplicateEmail
      const isFollowUpDue = isDateDue(contact.next_follow_up)
      const isLinked = Boolean(contact.account_link)
      const linkState: 'linked' | 'unlinked' = isLinked ? 'linked' : 'unlinked'

      return {
        ...contact,
        linked_org_name:
          contact.linked_org_name ??
          (contact.account_link ? accountNameById.get(contact.account_link) ?? null : null),
        localTags,
        hasBrokenCv,
        hasNoPhoneButEmail,
        isPartialProfile,
        isDuplicatePhone,
        isDuplicateEmail,
        hasWarning,
        isFollowUpDue,
        isLinked,
        linkState,
      }
    })
  }, [rawContacts, phoneNormCounts, accountNameById])

  const filteredContacts = useMemo(() => {
    return enrichedContacts.filter((contact) => {
      if (filters.search) {
        const q = filters.search.toLowerCase().trim()
        const haystack = [
          contact.full_name,
          contact.display_name,
          contact.phone,
          contact.phone_norm,
          contact.email,
          contact.second_email,
          contact.linked_org_name,
          roleName(contact.role),
          subRoleName(contact.sub_role),
          cityName(contact.city_id),
          regionName(contact.region_id),
        ]
          .filter(Boolean)
          .join(' | ')
          .toLowerCase()

        if (!haystack.includes(q)) return false
      }

      if (filters.role && contact.role !== filters.role) return false
      if (filters.sub_role && contact.sub_role !== filters.sub_role) return false
      if (filters.region_id && contact.region_id !== filters.region_id) return false
      if (filters.city_id && contact.city_id !== filters.city_id) return false
      if (filters.profile_type && contact.profile_type !== filters.profile_type) return false
      if (filters.availability && contact.availability !== filters.availability) return false
      if (filters.experience && contact.experience !== filters.experience) return false
      if (filters.source && contact.source !== filters.source) return false
      if (filters.has_cv === 'yes' && !contact.has_cv) return false
      if (filters.has_cv === 'no' && contact.has_cv) return false
      if (filters.social_status && contact.social_status !== filters.social_status) return false
      if (filters.link_state && contact.linkState !== filters.link_state) return false
      if (filters.tags && !contact.localTags.includes(filters.tags)) return false
      if (filters.follow_up_due === 'yes' && !contact.isFollowUpDue) return false
      if (filters.follow_up_due === 'no' && contact.isFollowUpDue) return false
      if (filters.created_from && !isDateOnOrAfter(contact.created_timestamp, filters.created_from)) return false
      if (filters.created_to && !isDateOnOrBefore(contact.created_timestamp, filters.created_to)) return false
      if (filters.updated_from && !isDateOnOrAfter(contact.updated_timestamp, filters.updated_from)) return false
      if (filters.updated_to && !isDateOnOrBefore(contact.updated_timestamp, filters.updated_to)) return false

      return true
    })
  }, [enrichedContacts, filters])

  const sortedContacts = useMemo(() => {
    if (!sortBy) return filteredContacts
    return [...filteredContacts].sort((a, b) => {
      let av: string | number = ''
      let bv: string | number = ''
      if (sortBy === 'full_name') { av = a.full_name ?? a.display_name ?? ''; bv = b.full_name ?? b.display_name ?? '' }
      else if (sortBy === 'phone') { av = a.phone ?? ''; bv = b.phone ?? '' }
      else if (sortBy === 'email') { av = a.email ?? ''; bv = b.email ?? '' }
      else if (sortBy === 'role') { av = roleName(a.role); bv = roleName(b.role) }
      else if (sortBy === 'region') { av = regionName(a.region_id); bv = regionName(b.region_id) }
      else if (sortBy === 'city') { av = cityName(a.city_id); bv = cityName(b.city_id) }
      else if (sortBy === 'availability') { av = a.availability ?? 99; bv = b.availability ?? 99 }
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av
      return sortDir === 'asc' ? String(av).localeCompare(String(bv), 'he') : String(bv).localeCompare(String(av), 'he')
    })
  }, [filteredContacts, sortBy, sortDir])

  const handleSort = (key: string) => {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortBy(key); setSortDir('asc') }
    setPage(0)
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

  const totalVisible = sortedContacts.length
  const totalPages = Math.max(1, Math.ceil(totalVisible / pageSize))
  const pageData = sortedContacts.slice(page * pageSize, (page + 1) * pageSize)
  const selectedContact = sortedContacts.find((contact) => Number(contact.contact_id) === Number(selectedId)) ?? null

  const roleKpis = useMemo<KpiRoleCard[]>(() => {
    return KPI_ROLE_GROUPS.map((group) => ({
      ...group,
      value: filteredContacts.filter((contact) => group.roleIds.includes(Number(contact.role))).length,
    }))
  }, [filteredContacts])

  const computedFilterCard = useMemo(() => {
    const roleLabel = filters.role ? roleName(filters.role) : 'כל התפקידים'
    const regionLabel = filters.region_id ? regionName(filters.region_id) : 'כל האזורים'
    return {
      count: totalVisible,
      subtitle: `${roleLabel} • ${regionLabel}`,
    }
  }, [filters.role, filters.region_id, totalVisible])

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

  const activeSubRoleOptions = useMemo(() => {
    if (!filters.role) return DICT_SUB_ROLES
    return DICT_SUB_ROLES.filter((sr) => sr.role_id === filters.role)
  }, [filters.role])

  const activeCityOptions = useMemo(() => {
    if (!filters.region_id) return cityOptions
    return cityOptions.filter((item) => Number(item.region_id) === Number(filters.region_id))
  }, [filters.region_id, cityOptions])

  const clearFilters = () => {
    setFilters({})
    setSelectedRows([])
  }

  const toggleRowSelection = (contactId: number) => {
    setSelectedRows((prev) =>
      prev.includes(contactId) ? prev.filter((id) => id !== contactId) : [...prev, contactId],
    )
  }

  const togglePageSelection = () => {
    const pageIds = pageData.map((contact) => Number(contact.contact_id)).filter(Boolean)
    const allSelected = pageIds.every((id) => selectedRows.includes(id))
    if (allSelected) {
      setSelectedRows((prev) => prev.filter((id) => !pageIds.includes(id)))
      return
    }
    setSelectedRows((prev) => Array.from(new Set([...prev, ...pageIds])))
  }

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
    )
  }

  const showToast = (message: string, tone: ToastState['tone'] = 'info') => {
    setToast({ open: true, message, tone })
  }

  const handleExport = () => {
    try {
      setExportPending(true)
      const rowsToExport = selectedRows.length
        ? filteredContacts.filter((contact) => selectedRows.includes(Number(contact.contact_id)))
        : filteredContacts

      const rows = rowsToExport.map((contact) => ({
        'שם מלא': contact.full_name ?? contact.display_name ?? '',
        טלפון: contact.phone_norm ?? contact.phone ?? '',
        אימייל: contact.email ?? '',
        תפקיד: roleName(contact.role),
        אזור: regionName(contact.region_id),
        עיר: cityName(contact.city_id),
        זמינות: availabilityName(contact.availability),
        'קו"ח': contact.has_cv ? 'יש' : 'אין',
        'סוג פרופיל': profileTypeName(contact.profile_type),
        'ארגון מקושר': contact.linked_org_name ?? '',
        'תאריך שליחת וואטאפ': formatDate(contact.whatsapp_campaign_last_sent),
        'קשר אחרון': formatDate(contact.last_contact_date),
        'מספר הגשות': contact.prev_applications_count ?? 0,
      }))

      const csv = buildCsv(rows)
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = selectedRows.length
        ? 'admin-contacts-selected-export.csv'
        : 'admin-contacts-export.csv'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      showToast('הייצוא הושלם בהצלחה', 'success')
    } catch {
      showToast('אירעה שגיאה בייצוא', 'error')
    } finally {
      setExportPending(false)
    }
  }

  const handleBulkUpdate = async () => {
    if (!selectedRows.length || !bulkField || bulkValue === null || bulkValue === '') return
    setBulkPending(true)
    try {
      const { error } = await supabase
        .from('contact')
        .update({ [bulkField]: bulkValue })
        .in('contact_id', selectedRows)
      if (error) throw error
      await queryClient.invalidateQueries({ queryKey: ['contacts'] })
      showToast(`${selectedRows.length} רשומות עודכנו בהצלחה`, 'success')
      setBulkUpdateOpen(false)
      setBulkField('')
      setBulkValue(null)
      setSelectedRows([])
    } catch {
      showToast('שגיאה בעדכון הרשומות', 'error')
    } finally {
      setBulkPending(false)
    }
  }

  const handleMerge = async () => {
    if (selectedRows.length !== 2 || !mergePrimaryId) return
    const secondaryId = selectedRows.find((id) => id !== mergePrimaryId)!
    const primary = enrichedContacts.find((c) => Number(c.contact_id) === mergePrimaryId)
    const secondary = enrichedContacts.find((c) => Number(c.contact_id) === secondaryId)
    if (!primary || !secondary) return
    setMergePending(true)
    try {
      // Fields to copy from secondary if primary is empty
      const mergeFields = [
        'phone', 'second_phone', 'email', 'second_email',
        'city_id', 'region_id', 'role', 'availability',
        'facebook_id', 'facebook_url', 'notes',
      ] as const
      const patch: Record<string, unknown> = {}
      for (const f of mergeFields) {
        if (!primary[f] && secondary[f]) patch[f] = secondary[f]
      }

      // Move tags from secondary to primary
      const { data: secTags } = await supabase.from('contact_tags').select('tag').eq('contact_id', secondaryId)
      if (secTags?.length) {
        const { data: primTags } = await supabase.from('contact_tags').select('tag').eq('contact_id', mergePrimaryId)
        const existingTags = new Set((primTags ?? []).map((t) => t.tag))
        const newTags = secTags.filter((t) => !existingTags.has(t.tag)).map((t) => ({ contact_id: mergePrimaryId, tag: t.tag }))
        if (newTags.length) await supabase.from('contact_tags').insert(newTags)
      }

      // Update primary with merged fields
      if (Object.keys(patch).length) {
        await supabase.from('contact').update(patch).eq('contact_id', mergePrimaryId)
      }
      // Delete secondary
      await supabase.from('contact').delete().eq('contact_id', secondaryId)

      await queryClient.invalidateQueries({ queryKey: ['contacts'] })
      showToast('הרשומות מוזגו בהצלחה', 'success')
      setMergeOpen(false)
      setMergePrimaryId(null)
      setSelectedRows([])
      if (selectedId === secondaryId) setSelectedId(null)
    } catch {
      showToast('שגיאה במיזוג הרשומות', 'error')
    } finally {
      setMergePending(false)
    }
  }

  const handleRowAction = async (contactId: number, message: string) => {
    try {
      setRowActionPending(contactId)
      showToast(message, 'success')
    } finally {
      setRowActionPending(null)
    }
  }

  const markAsCandidate = async (contactId: number) => {
    // עיקרון No Silent Auto-Merge: רק מוסיפים כובע מועמד, לא דורסים את contact.profile_type (הזהות הראשית)
    try {
      await supabase
        .from('rel_contact_profiles')
        .upsert({ contact_id: contactId, profile_type_id: 1 })
      await queryClient.invalidateQueries({ queryKey: ['candidate-ids'] })
      showToast('נוסף כובע מועמד — הזהות הראשית נשמרה', 'success')
    } catch {
      showToast('שגיאה בסימון כמועמד', 'error')
    }
  }

  const handleEditOpen = (contact: typeof selectedContact) => {
    if (!contact) return
    setEditDraft({
      full_name: contact.full_name ?? '',
      phone: contact.phone ?? '',
      email: contact.email ?? '',
      role: contact.role,
      city_id: contact.city_id,
      region_id: contact.region_id,
      availability: contact.availability,
      notes: contact.notes ?? '',
    })
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (!selectedContact) return
    setSavePending(true)
    try {
      const { error } = await supabase
        .from('contact')
        .update(editDraft)
        .eq('contact_id', selectedContact.contact_id)
      if (error) throw error
      await queryClient.invalidateQueries({ queryKey: ['contacts'] })
      showToast('נשמר בהצלחה', 'success')
      setIsEditing(false)
    } catch {
      showToast('שגיאה בשמירה', 'error')
    } finally {
      setSavePending(false)
    }
  }

  const handleAddTag = async (tag: string) => {
    if (!selectedId || panelTags.includes(tag)) return
    const { error } = await supabase.from('contact_tags').insert({ contact_id: selectedId, tag })
    if (!error) {
      setPanelTags((prev) => [...prev, tag])
      queryClient.invalidateQueries({ queryKey: ['contact_tags', selectedId] })
    }
    setShowTagDropdown(false)
  }

  const handleRemoveTag = async (tag: string) => {
    if (!selectedId) return
    const { error } = await supabase.from('contact_tags').delete().eq('contact_id', selectedId).eq('tag', tag)
    if (!error) {
      setPanelTags((prev) => prev.filter((t) => t !== tag))
      queryClient.invalidateQueries({ queryKey: ['contact_tags', selectedId] })
    }
  }

  const selectedCount = selectedRows.length

  return (
    <Shell
      title="אנשי קשר"
      subtitle={`מאגר האב של כל האנשים במערכת • ${totalVisible} תוצאות לאחר סינון`}
      icon={Users}
      actions={
        <div className="flex flex-wrap items-center gap-2">
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
            onClick={handleExport}
            disabled={exportPending}
          >
            {exportPending ? 'מייצא...' : selectedRows.length ? 'ייצוא נבחרים' : 'ייצוא'}
          </ActionButton>
          <ActionButton
            variant="primary"
            icon={Plus}
            onClick={() => navigate('/admin/contacts/new')}
          >
            איש קשר חדש
          </ActionButton>
        </div>
      }
    >
      <div dir="rtl" className="min-h-screen bg-[#F8FAFC] font-['Heebo'] text-[#0F172A]"><div className="space-y-6">
          <section className="grid grid-cols-2 gap-4 xl:grid-cols-6">
            {roleKpis.map((card) => (
              <KpiRoleCardComponent
                key={card.key}
                label={card.label}
                value={card.value}
                tone={card.tone}
                onClick={() => {
                  if (card.roleIds.length === 1) {
                    setFilters((prev) => ({ ...prev, role: card.roleIds[0], sub_role: undefined }))
                  } else {
                    showToast('הקבוצה כוללת כמה תתי-תפקידים מקצועיים', 'info')
                  }
                }}
              />
            ))}
          </section>

          <Toolbar>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <SearchFieldIcon />
                <h2 className="text-[15px] font-bold text-[#0F172A]">סינון וחיפוש</h2>
                <span className="rounded-full bg-[#F8FAFC] px-2.5 py-1 text-[12px] font-semibold text-slate-500">
                  צפוף אך קריא
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
                <SearchBar
                  value={filters.search ?? ''}
                  onChange={(value) => setFilters((prev) => ({ ...prev, search: value }))}
                  placeholder="חיפוש שם, טלפון, אימייל, מפתח עסקי..."
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
                  options={roleOptions.map((item) => ({ value: String(item.id), label: item.name }))}
                  placeholder="תפקיד"
                />
                <SelectFilter
                  value={String(filters.sub_role ?? '')}
                  onChange={(value) =>
                    setFilters((prev) => ({ ...prev, sub_role: value ? Number(value) : undefined }))
                  }
                  options={activeSubRoleOptions.map((item) => ({
                    value: String(item.id),
                    label: item.name,
                  }))}
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
                  options={regionOptions.map((item) => ({ value: String(item.id), label: item.name }))}
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
                  value={String(filters.profile_type ?? '')}
                  onChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      profile_type: value ? Number(value) : undefined,
                    }))
                  }
                  options={profileTypeOptions.map((item) => ({
                    value: String(item.id),
                    label: item.name,
                  }))}
                  placeholder="סוג פרופיל"
                />
                <SelectFilter
                  value={String(filters.availability ?? '')}
                  onChange={(value) =>
                    setFilters((prev) => ({ ...prev, availability: value ? Number(value) : undefined }))
                  }
                  options={availabilityOptions.map((item) => ({
                    value: String(item.id),
                    label: item.name,
                  }))}
                  placeholder="זמינות"
                />
                <SelectFilter
                  value={String(filters.experience ?? '')}
                  onChange={(value) =>
                    setFilters((prev) => ({ ...prev, experience: value ? Number(value) : undefined }))
                  }
                  options={experienceOptions.map((item) => ({
                    value: String(item.id),
                    label: item.name,
                  }))}
                  placeholder="ניסיון"
                />
                <SelectFilter
                  value={String(filters.has_cv ?? '')}
                  onChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      has_cv: value ? (value as 'yes' | 'no') : undefined,
                    }))
                  }
                  options={[
                    { value: 'yes', label: 'יש קו"ח' },
                    { value: 'no', label: 'ללא קו"ח' },
                  ]}
                  placeholder='קו"ח'
                />
                <SelectFilter
                  value={String(filters.source ?? '')}
                  onChange={(value) =>
                    setFilters((prev) => ({ ...prev, source: value ? Number(value) : undefined }))
                  }
                  options={sourceOptions.map((item) => ({ value: String(item.id), label: item.name }))}
                  placeholder="מקור"
                />
                <SelectFilter
                  value={String(filters.social_status ?? '')}
                  onChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      social_status: value ? Number(value) : undefined,
                    }))
                  }
                  options={socialStatusOptions.map((item) => ({
                    value: String(item.id),
                    label: item.name,
                  }))}
                  placeholder="סטטוס חברתי"
                />
                <SelectFilter
                  value={String(filters.link_state ?? '')}
                  onChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      link_state: value ? (value as 'linked' | 'unlinked') : undefined,
                    }))
                  }
                  options={[
                    { value: 'linked', label: 'מקושר לארגון' },
                    { value: 'unlinked', label: 'ללא שיוך ארגוני' },
                  ]}
                  placeholder="שיוך ארגוני"
                />
                <SelectFilter
                  value={String(filters.tags ?? '')}
                  onChange={(value) => setFilters((prev) => ({ ...prev, tags: value || undefined }))}
                  options={AVAILABLE_TAGS.map((item) => ({ value: item, label: item }))}
                  placeholder="תגיות"
                />
                <SelectFilter
                  value={String(filters.follow_up_due ?? '')}
                  onChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      follow_up_due: value ? (value as 'yes' | 'no') : undefined,
                    }))
                  }
                  options={[{ value: 'yes', label: 'פולו-אפ פתוח' }]}
                  placeholder="פולו-אפ"
                />

                <DateField
                  label="נוצר מתאריך"
                  value={filters.created_from ?? ''}
                  onChange={(value) => setFilters((prev) => ({ ...prev, created_from: value || undefined }))}
                />
                <DateField
                  label="נוצר עד תאריך"
                  value={filters.created_to ?? ''}
                  onChange={(value) => setFilters((prev) => ({ ...prev, created_to: value || undefined }))}
                />
                <DateField
                  label="עודכן מתאריך"
                  value={filters.updated_from ?? ''}
                  onChange={(value) => setFilters((prev) => ({ ...prev, updated_from: value || undefined }))}
                />
                <DateField
                  label="עודכן עד תאריך"
                  value={filters.updated_to ?? ''}
                  onChange={(value) => setFilters((prev) => ({ ...prev, updated_to: value || undefined }))}
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <ComputedFilterCard
                    label="סינון מחושב"
                    value={computedFilterCard.count}
                    subtitle={computedFilterCard.subtitle}
                  />
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
                    <span className="rounded-full bg-white px-3 py-1 text-[13px] font-bold text-[#D97706] shadow-sm">
                      נבחרו {selectedCount} רשומות
                    </span>
                    <span className="text-[13px] font-medium text-slate-600">
                      פעולות מרובות על הרשומות המסומנות
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <SmallActionButton onClick={() => { setBulkField(''); setBulkValue(null); setBulkUpdateOpen(true) }}>
                      ✏️ עדכון שדה
                    </SmallActionButton>
                    {selectedRows.length === 2 && (
                      <SmallActionButton onClick={() => { setMergePrimaryId(selectedRows[0]); setMergeOpen(true) }}>
                        🔀 מיזוג רשומות
                      </SmallActionButton>
                    )}
                    <SmallActionButton onClick={handleExport}>
                      ⬇️ ייצוא
                    </SmallActionButton>
                  </div>
                </div>
              </div>
            </Toolbar>
          )}

          <Toolbar>
            {contactsError && (
              <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-right">
                <p className="text-sm font-semibold text-red-700">שגיאה בטעינת אנשי קשר מ-Supabase</p>
                <p className="mt-0.5 text-xs text-red-500">{(contactsFetchError as Error)?.message ?? 'בעיית הרשאות RLS או חיבור'}</p>
              </div>
            )}
            {pageData.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <EmptyState
                  icon={Users}
                  title={total === 0 ? 'מסד הנתונים ריק' : 'לא נמצאו תוצאות לאחר הסינון'}
                  description={
                    total === 0
                      ? 'עדיין אין אנשי קשר במערכת.'
                      : 'שנו את הפילטרים או נקה את הסינון כדי לראות רשומות.'
                  }
                />
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="w-full overflow-x-auto">
                  <table className="min-w-[1800px] w-full border-collapse">
                    <thead className="bg-[#F3F4F6]">
                      <tr className="border-b border-slate-300 text-right text-[14px] font-bold text-black">
                        <th className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={
                              pageData.length > 0 &&
                              pageData.every((row) => selectedRows.includes(Number(row.contact_id)))
                            }
                            onChange={togglePageSelection}
                            className="h-4 w-4 rounded border-slate-300 text-[#008080] focus:ring-[#008080]"
                          />
                        </th>
                        {visibleColumns.includes('full_name') && <SortableTh label="שם מלא" sortKey="full_name" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} width={colWidths['full_name']} onResizeStart={handleResizeStart} />}
                        {visibleColumns.includes('phone') && <SortableTh label="טלפון" sortKey="phone" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} width={colWidths['phone']} onResizeStart={handleResizeStart} />}
                        {visibleColumns.includes('email') && <SortableTh label="אימייל" sortKey="email" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} width={colWidths['email']} onResizeStart={handleResizeStart} />}
                        {visibleColumns.includes('role') && <SortableTh label="תפקיד" sortKey="role" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} width={colWidths['role']} onResizeStart={handleResizeStart} />}
                        {visibleColumns.includes('region') && <SortableTh label="אזור" sortKey="region" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} width={colWidths['region']} onResizeStart={handleResizeStart} />}
                        {visibleColumns.includes('city') && <SortableTh label="עיר" sortKey="city" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} width={colWidths['city']} onResizeStart={handleResizeStart} />}
                        {visibleColumns.includes('availability') && <SortableTh label="זמינות" sortKey="availability" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} width={colWidths['availability']} onResizeStart={handleResizeStart} />}
                        {visibleColumns.includes('cv') && <PlainTh label='קו"ח' colKey="cv" width={colWidths['cv']} onResizeStart={handleResizeStart} />}
                        {visibleColumns.includes('profile_type') && <PlainTh label="סוג פרופיל" colKey="profile_type" width={colWidths['profile_type']} onResizeStart={handleResizeStart} />}
                        {visibleColumns.includes('linked_org') && <PlainTh label="ארגון מקושר" colKey="linked_org" width={colWidths['linked_org']} onResizeStart={handleResizeStart} />}
                        {visibleColumns.includes('whatsapp') && <PlainTh label="תאריך שליחת וואטאפ" colKey="whatsapp" width={colWidths['whatsapp']} onResizeStart={handleResizeStart} />}
                        {visibleColumns.includes('last_contact') && <PlainTh label="קשר אחרון" colKey="last_contact" width={colWidths['last_contact']} onResizeStart={handleResizeStart} />}
                        <th className="px-4 py-4 text-center">פעולות</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 bg-white">
                      {pageData.map((contact) => {
                        const warnings = buildWarnings(contact)
                        const selected = selectedRows.includes(Number(contact.contact_id))

                        return (
                          <tr
                            key={contact.contact_id}
                            className={`cursor-pointer text-[13px] font-medium text-[#0F172A] transition ${
                              selected ? 'bg-[#F0FDFC]' : 'hover:bg-slate-50'
                            }`}
                            onClick={() => setSelectedId(Number(contact.contact_id))}
                          >
                            <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleRowSelection(Number(contact.contact_id))}
                                className="h-4 w-4 rounded border-slate-300 text-[#008080] focus:ring-[#008080]"
                              />
                            </td>

                            {visibleColumns.includes('full_name') && (
                              <td className="px-4 py-3">
                                <div className="min-w-[220px]">
                                  <div className="flex items-start gap-3">
                                    <div className="space-y-1">
                                      <div className="text-[14px] font-bold text-[#0F172A]">
                                        {contact.full_name ?? contact.display_name ?? '—'}
                                      </div>
                                      <div className="flex flex-wrap gap-1.5">
                                        {contact.isLinked ? (
                                          <InlineSignal tone="success">מקושר</InlineSignal>
                                        ) : (
                                          <InlineSignal tone="muted">ללא שיוך</InlineSignal>
                                        )}
                                        {warnings.slice(0, 2).map((warning) => (
                                          <InlineSignal
                                            key={`${contact.contact_id}-${warning}`}
                                            tone={warning.includes('כפילות') ? 'danger' : 'warning'}
                                          >
                                            {warning}
                                          </InlineSignal>
                                        ))}
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
                                    {contact.phone_norm ? formatPhone(contact.phone_norm) : '—'}
                                  </div>
                                  {contact.second_phone && (
                                    <div className="text-[12px] text-slate-500">
                                      {formatPhone(contact.second_phone)}
                                    </div>
                                  )}
                                </div>
                              </td>
                            )}

                            {visibleColumns.includes('email') && (
                              <td className="px-4 py-3">
                                <div className="space-y-1">
                                  <div className="max-w-[220px] truncate">{contact.email ?? '—'}</div>
                                  {contact.second_email && (
                                    <div className="max-w-[220px] truncate text-[12px] text-slate-500">
                                      {contact.second_email}
                                    </div>
                                  )}
                                </div>
                              </td>
                            )}

                            {visibleColumns.includes('role') && (
                              <td className="px-4 py-3">
                                <RoleBadge label={roleName(contact.role)} roleId={Number(contact.role)} />
                              </td>
                            )}

                            {visibleColumns.includes('region') && (
                              <td className="px-4 py-3">
                                <LightTag tone="slate">{regionName(contact.region_id)}</LightTag>
                              </td>
                            )}

                            {visibleColumns.includes('city') && (
                              <td className="px-4 py-3">
                                <LightTag tone="slate">{cityName(contact.city_id)}</LightTag>
                              </td>
                            )}

                            {visibleColumns.includes('availability') && (
                              <td className="px-4 py-3">
                                <Badge tone={availabilityTone(contact.availability)}>
                                  {availabilityName(contact.availability)}
                                </Badge>
                              </td>
                            )}

                            {visibleColumns.includes('cv') && (
                              <td className="px-4 py-3">
                                <CvStateBadge hasCv={Boolean(contact.has_cv)} broken={contact.hasBrokenCv} />
                              </td>
                            )}

                            {visibleColumns.includes('profile_type') && (
                              <td className="px-4 py-3">{profileTypeName(contact.profile_type)}</td>
                            )}

                            {visibleColumns.includes('linked_org') && (
                              <td className="px-4 py-3">
                                {contact.linked_org_name ? (
                                  <button
                                    type="button"
                                    className="rounded-xl bg-slate-50 px-2.5 py-1 text-[12px] font-semibold text-slate-700 hover:bg-slate-100"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      showToast(`פתיחת הארגון: ${contact.linked_org_name}`, 'info')
                                    }}
                                  >
                                    {contact.linked_org_name}
                                  </button>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                            )}

                            {visibleColumns.includes('whatsapp') && (
                              <td className="px-4 py-3">{formatDate(contact.whatsapp_campaign_last_sent)}</td>
                            )}

                            {visibleColumns.includes('last_contact') && (
                              <td className="px-4 py-3">{formatDate(contact.last_contact_date)}</td>
                            )}


                            <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1">
                                <IconAction
                                  title="תצוגה מהירה"
                                  onClick={() => setSelectedId(Number(contact.contact_id))}
                                  icon={<Eye className="h-4 w-4" />}
                                />
                                <IconAction
                                  title="עריכה"
                                  onClick={() => handleRowAction(contact.contact_id, 'פתיחת עריכת איש קשר')}
                                  icon={<Edit2 className="h-4 w-4" />}
                                  pending={rowActionPending === contact.contact_id}
                                />
                                <IconAction
                                  title="פולו־אפ"
                                  onClick={() => handleRowAction(contact.contact_id, 'נקבע פולו־אפ לרשומה')}
                                  icon={<Phone className="h-4 w-4" />}
                                />
                                <IconAction
                                  title="סמן כמועמד"
                                  onClick={() => markAsCandidate(contact.contact_id)}
                                  icon={<UserCheck className="h-4 w-4" />}
                                />
                                {(contact.isDuplicatePhone || contact.isDuplicateEmail) && !selectedRows.includes(Number(contact.contact_id)) ? (
                                  <IconAction
                                    title="מיזוג — סמן 2 רשומות"
                                    onClick={() => toggleRowSelection(Number(contact.contact_id))}
                                    icon={<Merge className="h-4 w-4" />}
                                  />
                                ) : null}
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
            )}
          </Toolbar>
        </div>

        {selectedContact && (
          <div className="fixed inset-0 z-50 flex justify-start">
            <div className="absolute inset-0 bg-slate-900/30" onClick={() => setSelectedId(null)} />
            <aside className="relative z-10 h-full w-full max-w-[560px] overflow-y-auto border-l border-slate-200 bg-white shadow-xl">
              <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
                <div className="flex items-start justify-between gap-3 px-5 py-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#F0FDFC] text-[22px] font-bold text-[#008080] shadow-sm">
                      {(selectedContact.full_name ?? selectedContact.display_name ?? '?').charAt(0)}
                    </div>
                    <div className="space-y-2">
                      <div>
                        <h2 className="text-[24px] font-bold text-[#0F172A]">
                          {selectedContact.full_name ?? selectedContact.display_name ?? '—'}
                        </h2>
                        <div className="mt-1 flex flex-wrap gap-2">
                          <RoleBadge label={roleName(selectedContact.role)} roleId={Number(selectedContact.role)} />
                          <LightTag tone="slate">{cityName(selectedContact.city_id)}</LightTag>
                          <Badge tone={availabilityTone(selectedContact.availability)}>
                            {availabilityName(selectedContact.availability)}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <LinkAction
                          to={`/admin/contacts/${selectedContact.contact_id}`}
                          icon={<Eye className="h-4 w-4" />}
                          label="פתח כרטסת 360"
                        />
                        <QuickActionButton
                          icon={<Edit2 className="h-4 w-4" />}
                          label="עריכה"
                          onClick={() => handleEditOpen(selectedContact)}
                        />
                        <QuickLinkButton
                          href={
                            selectedContact.phone_norm
                              ? `https://wa.me/${normalizeDigits(selectedContact.phone_norm)}`
                              : undefined
                          }
                          icon={<Phone className="h-4 w-4" />}
                          label="וואטסאפ"
                          disabled={!selectedContact.phone_norm}
                        />
                        <QuickLinkButton
                          href={selectedContact.phone_norm ? `tel:${selectedContact.phone_norm}` : undefined}
                          icon={<Phone className="h-4 w-4" />}
                          label="טלפון"
                          disabled={!selectedContact.phone_norm}
                        />
                        <QuickLinkButton
                          href={selectedContact.email ? `mailto:${selectedContact.email}` : undefined}
                          icon={<Mail className="h-4 w-4" />}
                          label="אימייל"
                          disabled={!selectedContact.email}
                        />
                        <QuickLinkButton
                          href={selectedContact.facebook_url ?? undefined}
                          icon={<Facebook className="h-4 w-4" />}
                          label="פייסבוק"
                          disabled={!selectedContact.facebook_url}
                        />
                        <QuickLinkButton
                          href={selectedContact.cv_link ?? undefined}
                          icon={<FileText className="h-4 w-4" />}
                          label='פתח קו"ח'
                          disabled={!selectedContact.has_cv || !selectedContact.cv_link}
                        />
                        <QuickActionButton
                          icon={<Plus className="h-4 w-4" />}
                          label="צור הגשה"
                          onClick={() => showToast('פתיחת יצירת הגשה', 'info')}
                        />
                        <QuickActionButton
                          icon={<WandSparkles className="h-4 w-4" />}
                          label="סמארט מאץ׳"
                          onClick={() => showToast('פתיחת התאמה חכמה', 'info')}
                        />
                        <QuickActionButton
                          icon={<Tag className="h-4 w-4" />}
                          label="תגיות"
                          onClick={() => showToast('ניהול תגיות', 'info')}
                        />
                        <QuickActionButton
                          icon={<Phone className="h-4 w-4" />}
                          label="פולו־אפ"
                          onClick={() => showToast('הוגדר פולו־אפ', 'success')}
                        />
                        <QuickActionButton
                          icon={<Users className="h-4 w-4" />}
                          label="ארגון מקושר"
                          onClick={() =>
                            selectedContact.linked_org_name
                              ? showToast(`פתיחת הארגון: ${selectedContact.linked_org_name}`, 'info')
                              : showToast('אין ארגון מקושר לרשומה', 'error')
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
                    aria-label="סגור"
                    title="סגור"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-4 p-5">
                <SectionCard title="תגיות" compact>
                  <div className="flex flex-wrap gap-2">
                    {panelTags.map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-1.5 rounded-md bg-teal-50 px-2.5 py-1 text-[12px] font-semibold text-teal-700">
                        {tag}
                        <button type="button" onClick={() => handleRemoveTag(tag)} className="text-teal-400 hover:text-teal-700">×</button>
                      </span>
                    ))}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowTagDropdown((v) => !v)}
                        className="inline-flex items-center gap-1 rounded-md border border-dashed border-slate-300 px-2.5 py-1 text-[12px] font-semibold text-slate-500 hover:border-teal-400 hover:text-teal-600"
                      >
                        + תגית
                      </button>
                      {showTagDropdown && (
                        <div className="absolute right-0 top-full z-30 mt-1 max-h-48 w-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-md">
                          {AVAILABLE_TAGS.filter((t) => !panelTags.includes(t)).map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => handleAddTag(tag)}
                              className="w-full px-3 py-2 text-right text-[13px] text-slate-700 hover:bg-slate-50"
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </SectionCard>

                {isEditing && (
                  <SectionCard title="עריכת פרטים">
                    <div className="grid grid-cols-1 gap-3">
                      <label className="flex flex-col gap-1">
                        <span className="text-[12px] font-semibold text-slate-500">שם מלא</span>
                        <input className="rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-[#008080]" value={editDraft.full_name ?? ''} onChange={(e) => setEditDraft((d) => ({ ...d, full_name: e.target.value }))} />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-[12px] font-semibold text-slate-500">טלפון</span>
                        <input className="rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-[#008080]" value={editDraft.phone ?? ''} onChange={(e) => setEditDraft((d) => ({ ...d, phone: e.target.value }))} />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-[12px] font-semibold text-slate-500">אימייל</span>
                        <input className="rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-[#008080]" value={editDraft.email ?? ''} onChange={(e) => setEditDraft((d) => ({ ...d, email: e.target.value }))} />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-[12px] font-semibold text-slate-500">תפקיד</span>
                        <select className="rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-[#008080]" value={editDraft.role ?? ''} onChange={(e) => setEditDraft((d) => ({ ...d, role: e.target.value ? Number(e.target.value) : null }))}>
                          <option value="">— בחר —</option>
                          {roleOptions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-[12px] font-semibold text-slate-500">אזור</span>
                        <select className="rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-[#008080]" value={editDraft.region_id ?? ''} onChange={(e) => setEditDraft((d) => ({ ...d, region_id: e.target.value ? Number(e.target.value) : null }))}>
                          <option value="">— בחר —</option>
                          {regionOptions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-[12px] font-semibold text-slate-500">עיר</span>
                        <select className="rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-[#008080]" value={editDraft.city_id ?? ''} onChange={(e) => setEditDraft((d) => ({ ...d, city_id: e.target.value ? Number(e.target.value) : null }))}>
                          <option value="">— בחר —</option>
                          {cityOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-[12px] font-semibold text-slate-500">זמינות</span>
                        <select className="rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-[#008080]" value={editDraft.availability ?? ''} onChange={(e) => setEditDraft((d) => ({ ...d, availability: e.target.value ? Number(e.target.value) : null }))}>
                          <option value="">— בחר —</option>
                          {availabilityOptions.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-[12px] font-semibold text-slate-500">הערות</span>
                        <textarea rows={3} className="rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-[#008080]" value={editDraft.notes ?? ''} onChange={(e) => setEditDraft((d) => ({ ...d, notes: e.target.value }))} />
                      </label>
                      <div className="flex gap-2 pt-1">
                        <button type="button" onClick={handleSave} disabled={savePending} className="flex-1 rounded-xl bg-[#008080] px-4 py-2 text-[13px] font-bold text-white transition hover:opacity-90 disabled:opacity-50">
                          {savePending ? 'שומר...' : 'שמור'}
                        </button>
                        <button type="button" onClick={() => setIsEditing(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-50">
                          ביטול
                        </button>
                      </div>
                    </div>
                  </SectionCard>
                )}

                <SectionCard title="זהות ותקשורת">
                  <DetailsGrid
                    items={[
                      { label: 'שם מלא', value: selectedContact.full_name ?? selectedContact.display_name },
                      { label: 'שם תצוגה', value: selectedContact.display_name },
                      { label: 'שם פרטי', value: selectedContact.first_name },
                      { label: 'שם משפחה', value: selectedContact.last_name },
                      {
                        label: 'טלפון',
                        value: selectedContact.phone_norm ? formatPhone(selectedContact.phone_norm) : '—',
                      },
                      {
                        label: 'טלפון נוסף',
                        value: selectedContact.second_phone ? formatPhone(selectedContact.second_phone) : '—',
                      },
                      { label: 'אימייל', value: selectedContact.email },
                      { label: 'אימייל נוסף', value: selectedContact.second_email },
                      { label: 'פייסבוק', value: selectedContact.facebook_name ?? selectedContact.facebook_url ?? '—' },
                      { label: 'פייסבוק ID', value: selectedContact.facebook_id },
                      { label: 'סטטוס חברתי', value: socialStatusName(selectedContact.social_status) },
                      { label: 'מפתח עסקי', value: selectedContact.phone_norm },
                    ]}
                  />
                </SectionCard>

                <SectionCard title="מקצועי">
                  <DetailsGrid
                    items={[
                      { label: 'תפקיד', value: roleName(selectedContact.role) },
                      { label: 'תת־תפקיד', value: subRoleName(selectedContact.sub_role) },
                      { label: 'סוג פרופיל', value: profileTypeName(selectedContact.profile_type) },
                      { label: 'כותרת מקצועית', value: selectedContact.professional_title },
                      { label: 'ניסיון', value: experienceName(selectedContact.experience) },
                      { label: 'זמינות', value: availabilityName(selectedContact.availability) },
                      { label: 'היקף מועדף', value: selectedContact.preferred_scope },
                      { label: 'שפות', value: selectedContact.languages },
                      { label: 'מעסיק נוכחי', value: selectedContact.current_employer },
                      { label: 'ציפיית שכר שעתי', value: formatCurrency(selectedContact.salary_expectation_hourly) },
                      { label: 'ציפיית שכר חודשית', value: formatCurrency(selectedContact.salary_expectation_monthly) },
                      { label: 'סוג מס', value: selectedContact.tax_type },
                    ]}
                  />
                </SectionCard>

                <SectionCard title="מיקום והעדפות">
                  <DetailsGrid
                    items={[
                      { label: 'אזור', value: regionName(selectedContact.region_id) },
                      { label: 'עיר', value: cityName(selectedContact.city_id) },
                      {
                        label: 'אזורים מועדפים',
                        value: formatIdsToNames(selectedContact.preferred_regions, regionName),
                      },
                      {
                        label: 'ערים מועדפות',
                        value: formatIdsToNames(selectedContact.preferred_cities, cityName),
                      },
                      {
                        label: 'שנת לידה',
                        value: selectedContact.birth_year ? String(selectedContact.birth_year) : '—',
                      },
                      { label: 'מגדר', value: selectedContact.gender },
                      { label: 'מספר רישיון', value: selectedContact.license_no },
                    ]}
                  />
                </SectionCard>

                <SectionCard title='קבצים'>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-[#F8FAFC] px-4 py-3">
                      <div className="space-y-1">
                        <div className="text-[14px] font-bold text-[#0F172A]">סטטוס קו"ח</div>
                        <div className="text-[13px] text-slate-500">
                          {selectedContact.hasBrokenCv
                            ? 'קיים קו"ח אך הקישור שבור'
                            : selectedContact.has_cv
                              ? 'יש קו"ח במערכת'
                              : 'אין קו"ח במערכת'}
                        </div>
                      </div>
                      <CvStateBadge hasCv={Boolean(selectedContact.has_cv)} broken={selectedContact.hasBrokenCv} />
                    </div>

                    {selectedContact.cv_received_date && (
                      <MetaLine label='תאריך קבלת קו"ח' value={formatDate(selectedContact.cv_received_date)} />
                    )}

                    {selectedContact.cv_link && (
                      <a
                        href={selectedContact.cv_link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] font-semibold text-[#008080] transition hover:bg-[#F0FDFC]"
                      >
                        <FileText className="h-4 w-4" />
                        פתח קו"ח
                      </a>
                    )}
                  </div>
                </SectionCard>

                <SectionCard title="CRM">
                  <DetailsGrid
                    items={[
                      { label: 'מקור', value: sourceName(selectedContact.source) },
                      { label: 'סטטוס בדיקה', value: checkStatusName(selectedContact.check_status) },
                      { label: 'קשר אחרון', value: formatDate(selectedContact.last_contact_date) },
                      { label: 'פולו־אפ הבא', value: formatDate(selectedContact.next_follow_up) },
                      {
                        label: 'מספר הגשות קודמות',
                        value: String(selectedContact.prev_applications_count ?? 0),
                      },
                      {
                        label: 'תאריך סטטוס מועמד',
                        value: formatDate(selectedContact.candidate_status_date),
                      },
                      {
                        label: 'ווטסאפ קמפיין אחרון',
                        value: formatDate(selectedContact.whatsapp_campaign_last_sent),
                      },
                      { label: 'נוצר', value: formatDate(selectedContact.created_timestamp) },
                      { label: 'עודכן', value: formatDate(selectedContact.updated_timestamp) },
                    ]}
                  />
                  {selectedContact.notes && (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-[#F8FAFC] p-4">
                      <div className="mb-2 text-[13px] font-semibold text-slate-500">הערות</div>
                      <div className="whitespace-pre-wrap text-[14px] font-medium text-[#0F172A]">
                        {selectedContact.notes}
                      </div>
                    </div>
                  )}
                </SectionCard>

                <SectionCard title="שיוך ארגוני">
                  <DetailsGrid
                    items={[
                      {
                        label: 'חשבון מקושר',
                        value: selectedContact.account_link ? String(selectedContact.account_link) : '—',
                      },
                      { label: 'שם הארגון', value: selectedContact.linked_org_name ?? '—' },
                      {
                        label: 'מצב שיוך',
                        value: selectedContact.account_link ? 'מקושר' : 'ללא שיוך ארגוני',
                      },
                    ]}
                  />
                </SectionCard>

                <SectionCard title="הרחבות / AI">
                  <div className="space-y-3">
                    <DetailsGrid
                      items={[
                        {
                          label: 'סיכום AI',
                          value: selectedContact.ai_profile_summary ?? 'אין עדיין סיכום AI',
                        },
                        {
                          label: 'נתונים מורחבים',
                          value: selectedContact.extended_data
                            ? JSON.stringify(selectedContact.extended_data)
                            : 'אין נתונים מורחבים',
                        },
                        {
                          label: 'מצבי אזהרה',
                          value: buildWarnings(selectedContact).length
                            ? buildWarnings(selectedContact).join(' | ')
                            : 'ללא אזהרות',
                        },
                      ]}
                    />
                  </div>
                </SectionCard>
              </div>
            </aside>
          </div>
        )}

        {/* Bulk Update Dialog */}
        {bulkUpdateOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-md">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F0FDFC] text-[#008080]">
                  <Edit2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[18px] font-bold text-[#0F172A]">עדכון גורף</div>
                  <div className="text-[13px] font-medium text-slate-500">
                    עדכון {selectedRows.length} רשומות מסומנות
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-semibold text-slate-600">בחר שדה לעדכון</span>
                  <select
                    className="rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-[#008080]"
                    value={bulkField}
                    onChange={(e) => { setBulkField(e.target.value); setBulkValue(null) }}
                  >
                    <option value="">— בחר שדה —</option>
                    <option value="availability">זמינות</option>
                    <option value="role">תפקיד</option>
                    <option value="region_id">אזור</option>
                    <option value="city_id">עיר</option>
                  </select>
                </label>

                {bulkField === 'availability' && (
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[13px] font-semibold text-slate-600">ערך חדש</span>
                    <select
                      className="rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-[#008080]"
                      value={bulkValue ?? ''}
                      onChange={(e) => setBulkValue(e.target.value ? Number(e.target.value) : null)}
                    >
                      <option value="">— בחר —</option>
                      {availabilityOptions.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </label>
                )}
                {bulkField === 'role' && (
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[13px] font-semibold text-slate-600">ערך חדש</span>
                    <select
                      className="rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-[#008080]"
                      value={bulkValue ?? ''}
                      onChange={(e) => setBulkValue(e.target.value ? Number(e.target.value) : null)}
                    >
                      <option value="">— בחר —</option>
                      {roleOptions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </label>
                )}
                {bulkField === 'region_id' && (
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[13px] font-semibold text-slate-600">ערך חדש</span>
                    <select
                      className="rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-[#008080]"
                      value={bulkValue ?? ''}
                      onChange={(e) => setBulkValue(e.target.value ? Number(e.target.value) : null)}
                    >
                      <option value="">— בחר —</option>
                      {regionOptions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </label>
                )}
                {bulkField === 'city_id' && (
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[13px] font-semibold text-slate-600">ערך חדש</span>
                    <select
                      className="rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-[#008080]"
                      value={bulkValue ?? ''}
                      onChange={(e) => setBulkValue(e.target.value ? Number(e.target.value) : null)}
                    >
                      <option value="">— בחר —</option>
                      {cityOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </label>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <ActionButton variant="ghost" onClick={() => setBulkUpdateOpen(false)}>ביטול</ActionButton>
                <ActionButton
                  variant="primary"
                  onClick={handleBulkUpdate}
                  disabled={!bulkField || bulkValue === null || bulkValue === '' || bulkPending}
                >
                  {bulkPending ? 'מעדכן...' : `החל על ${selectedRows.length} רשומות`}
                </ActionButton>
              </div>
            </div>
          </div>
        )}

        {/* Merge Dialog */}
        {mergeOpen && selectedRows.length === 2 && (() => {
          const c1 = enrichedContacts.find((c) => Number(c.contact_id) === selectedRows[0])
          const c2 = enrichedContacts.find((c) => Number(c.contact_id) === selectedRows[1])
          if (!c1 || !c2) return null
          const primary = mergePrimaryId === selectedRows[0] ? c1 : c2
          const secondary = mergePrimaryId === selectedRows[0] ? c2 : c1
          return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4">
              <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-md">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FEF2F2] text-[#DC2626]">
                    <Merge className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[18px] font-bold text-[#0F172A]">מיזוג רשומות</div>
                    <div className="text-[13px] font-medium text-slate-500">
                      הרשומה הראשית תישמר • הרשומה המשנית תימחק לצמיתות
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-5">
                  {[c1, c2].map((c) => {
                    const isPrimary = Number(c.contact_id) === mergePrimaryId
                    return (
                      <button
                        key={c.contact_id}
                        type="button"
                        onClick={() => setMergePrimaryId(Number(c.contact_id))}
                        className={`rounded-2xl border-2 p-4 text-right transition ${isPrimary ? 'border-[#008080] bg-[#F0FDFC]' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                      >
                        <div className={`mb-2 text-[11px] font-bold uppercase tracking-wide ${isPrimary ? 'text-[#008080]' : 'text-slate-400'}`}>
                          {isPrimary ? '✅ ראשית — תישמר' : '🗑️ משנית — תימחק'}
                        </div>
                        <div className="text-[15px] font-bold text-[#0F172A]">{c.full_name ?? c.display_name ?? '—'}</div>
                        <div className="mt-1 space-y-0.5 text-[12px] text-slate-500">
                          <div>{c.phone_norm ? formatPhone(c.phone_norm) : '—'}</div>
                          <div>{c.email ?? '—'}</div>
                          <div>{roleName(c.role)}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-medium text-amber-800 mb-5">
                  שדות ריקים ברשומה הראשית יושלמו מהרשומה המשנית. תגיות הרשומה המשנית יועברו לראשית.
                </div>

                <div className="flex justify-end gap-2">
                  <ActionButton variant="ghost" onClick={() => { setMergeOpen(false); setMergePrimaryId(null) }}>ביטול</ActionButton>
                  <ActionButton
                    variant="primary"
                    onClick={handleMerge}
                    disabled={mergePending}
                  >
                    {mergePending ? 'ממזג...' : `מזג — שמור את "${primary.full_name ?? primary.display_name}"`}
                  </ActionButton>
                </div>
              </div>
            </div>
          )
        })()}

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

function SearchFieldIcon() {
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#F0F9FF] text-[#0F172A] shadow-sm">
      <Search className="h-4 w-4" />
    </div>
  )
}

function KpiRoleCardComponent({
  label,
  value,
  tone,
  onClick,
}: {
  label: string
  value: number
  tone: KpiRoleTone
  onClick?: () => void
}) {
  const borderMap: Record<KpiRoleTone, string> = {
    doctor: 'border-r-blue-500',
    hygienist: 'border-r-pink-500',
    assistant: 'border-r-violet-500',
    secretary: 'border-r-green-500',
    technician: 'border-r-amber-500',
    manager: 'border-r-slate-500',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border border-slate-200 border-r-4 bg-white p-4 text-right shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${borderMap[tone]}`}
    >
      <div className="text-[13px] font-semibold text-slate-500">{label}</div>
      <div className="mt-2 text-[26px] font-bold text-[#0F172A]">{value}</div>
    </button>
  )
}

function ComputedFilterCard({
  label,
  value,
  subtitle,
}: {
  label: string
  value: number
  subtitle: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-[12px] font-semibold text-slate-500">{label}</div>
      <div className="mt-1 text-[24px] font-bold text-[#0F172A]">{value}</div>
      <div className="mt-1 text-[12px] font-medium text-slate-600">{subtitle}</div>
    </div>
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

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode
  tone: 'default' | 'success' | 'warning' | 'danger' | 'muted'
}) {
  const classes =
    tone === 'success'
      ? 'bg-green-50 text-green-700'
      : tone === 'warning'
        ? 'bg-amber-50 text-amber-700'
        : tone === 'danger'
          ? 'bg-red-50 text-red-700'
          : tone === 'muted'
            ? 'bg-slate-100 text-slate-600'
            : 'bg-teal-50 text-teal-700'

  return (
    <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-[12px] font-semibold ${classes}`}>
      {children}
    </span>
  )
}

function CvStateBadge({ hasCv, broken }: { hasCv: boolean; broken: boolean }) {
  if (broken) return <Badge tone="danger">לינק שבור</Badge>
  if (hasCv) return <Badge tone="success">יש קו"ח</Badge>
  return <Badge tone="muted">ללא קו"ח</Badge>
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
      ? 'bg-amber-50 text-amber-700'
      : tone === 'danger'
        ? 'bg-red-50 text-red-700'
        : tone === 'success'
          ? 'bg-green-50 text-green-700'
          : 'bg-slate-100 text-slate-600'

  return <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${classes}`}>{children}</span>
}

function LightTag({
  children,
  tone = 'slate',
}: {
  children: React.ReactNode
  tone?: 'slate' | 'teal'
}) {
  const classes = tone === 'teal' ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-700'
  return <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-[12px] font-semibold ${classes}`}>{children}</span>
}

// RoleBadge imported from shared component above

function IconAction({
  title,
  icon,
  onClick,
  pending,
}: {
  title: string
  icon: React.ReactNode
  onClick: () => void
  pending?: boolean
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={pending}
      onClick={onClick}
      className="rounded-[10px] border border-slate-200 bg-white p-2 text-slate-500 shadow-[3px_3px_6px_rgba(0,0,0,0.08)] transition-all hover:shadow-[1px_1px_3px_rgba(0,0,0,0.10)] hover:text-[#008080] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {icon}
    </button>
  )
}

function SectionCard({
  title,
  children,
  compact = false,
}: {
  title: string
  children: React.ReactNode
  compact?: boolean
}) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${compact ? 'p-4' : 'p-4'}`}>
      <div className="mb-3 text-[16px] font-bold text-[#0F172A]">{title}</div>
      {children}
    </section>
  )
}

function DetailsGrid({
  items,
}: {
  items: Array<{ label: string; value?: string | null }>
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`} className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-3">
          <div className="text-[13px] font-semibold text-slate-500">{item.label}</div>
          <div className="mt-1 break-words text-[14px] font-bold text-[#0F172A]">
            {item.value && String(item.value).trim() ? item.value : '—'}
          </div>
        </div>
      ))}
    </div>
  )
}

function MetaLine({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between gap-4 text-[13px]">
      <span className="font-semibold text-slate-500">{label}</span>
      <span className="font-bold text-[#0F172A]">{value && value.trim() ? value : '—'}</span>
    </div>
  )
}

function LinkAction({
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

function QuickLinkButton({
  href,
  icon,
  label,
  disabled,
}: {
  href?: string
  icon: React.ReactNode
  label: string
  disabled?: boolean
}) {
  if (disabled || !href) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] font-semibold text-slate-400"
      >
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
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50"
    >
      {icon}
      {label}
    </a>
  )
}

function buildWarnings(contact: any) {
  const warnings: string[] = []
  if (contact.isDuplicatePhone) warnings.push('כפילות טלפון')
  if (contact.isDuplicateEmail) warnings.push('כפילות אימייל')
  if (contact.hasBrokenCv) warnings.push('קו"ח שבור')
  if (contact.hasNoPhoneButEmail) warnings.push('אין טלפון')
  if (contact.isPartialProfile) warnings.push('פרופיל חלקי')
  return warnings
}

function availabilityTone(availabilityId: number | null | undefined): 'success' | 'warning' | 'muted' {
  if (availabilityId === 1 || availabilityId === 2) return 'success'
  if (availabilityId === 3 || availabilityId === 4) return 'warning'
  return 'muted'
}

function isValidUrl(value?: string | null) {
  if (!value) return false
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

function isDateDue(value?: string | null) {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  const now = new Date()
  return date.getTime() <= now.getTime()
}

function isWithinLastDays(value?: string | null, days = 30) {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000
}

function isDateOnOrAfter(value?: string | null, filter?: string) {
  if (!value || !filter) return true
  const current = new Date(value)
  const threshold = new Date(filter)
  if (Number.isNaN(current.getTime()) || Number.isNaN(threshold.getTime())) return true
  return current.getTime() >= threshold.getTime()
}

function isDateOnOrBefore(value?: string | null, filter?: string) {
  if (!value || !filter) return true
  const current = new Date(value)
  const threshold = new Date(`${filter}T23:59:59`)
  if (Number.isNaN(current.getTime()) || Number.isNaN(threshold.getTime())) return true
  return current.getTime() <= threshold.getTime()
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

function formatCurrency(value?: number | null) {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(value)
}

function normalizeDigits(value?: string | null) {
  return String(value ?? '').replace(/\D/g, '')
}

function formatIdsToNames(
  ids: number[] | null | undefined,
  getLabel: (id: number | null | undefined) => string,
) {
  if (!ids?.length) return '—'
  return ids.map((id) => getLabel(id)).join(', ')
}

function SortableTh({
  label,
  sortKey,
  sortBy,
  sortDir,
  onSort,
  width,
  onResizeStart,
}: {
  label: string
  sortKey: string
  sortBy: string | null
  sortDir: 'asc' | 'desc'
  onSort: (key: string) => void
  width?: number
  onResizeStart?: (e: React.MouseEvent, key: string) => void
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

function PlainTh({
  label,
  colKey,
  width,
  onResizeStart,
}: {
  label: string
  colKey: string
  width?: number
  onResizeStart?: (e: React.MouseEvent, key: string) => void
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

function buildCsv(rows: Record<string, string | number>[]) {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])

  const escapeCell = (value: string | number) => {
    const stringValue = String(value ?? '')
    if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`
    }
    return stringValue
  }

  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => escapeCell(row[header] ?? '')).join(',')),
  ]

  return lines.join('\n')
}




