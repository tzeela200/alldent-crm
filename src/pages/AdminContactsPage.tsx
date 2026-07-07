import React, { useEffect, useMemo, useState } from 'react'
import { useContactMutations } from '@/hooks/useContactMutations'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
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
} from '@/components/layout/Shell'
import { formatPhone, phoneSearchTerm, whatsappLink } from '@/lib/normalizePhone'
import { CityRegionPicker } from '@/components/ui/CityRegionPicker'
import SidePanel from '@/components/ui/SidePanel'
import { RoleSubRolePicker } from '@/components/ui/RoleSubRolePicker'
import { DictionaryMultiSelect } from '@/components/ui/DictionaryMultiSelect'
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
import type { Contact } from '@/types'
import { RoleBadge } from '@/components/admin/RoleBadge'
import { RegionBadge } from '@/components/admin/RegionBadge'
import { MergeRecordsModal } from '@/components/MergeRecordsModal'
import { AdminTable, type AdminColumn } from '@/components/admin/AdminTable'
import { AdminTablePagination } from '@/components/admin/AdminTablePagination'
import { AdminActionsMenu, type AdminActionMenuItem } from '@/components/admin/AdminActionsMenu'
import { AdminPanelSection } from '@/components/admin/AdminPanelSection'
import { AdminPanelField } from '@/components/admin/AdminPanelField'
import { AdminPanelActions } from '@/components/admin/AdminPanelActions'
import { StatusBadge } from '@/components/admin/StatusBadge'

type ExtendedFilters = {
  search?: string
  role?: number
  region_id?: number
  city_id?: number
  availability?: number
  source?: number
  check_status?: number
  sub_role_ids?: number[]
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

const TAG_COLOR_MAP: Record<string, string> = {
  'VIP':                    'bg-purple-50 text-purple-700',
  'זמינות-מיידית':          'bg-green-50 text-green-700',
  'מחפש-אקטיבי':            'bg-teal-50 text-teal-700',
  'מחפש-פסיבי':             'bg-sky-50 text-sky-700',
  'אין-קו"ח':               'bg-red-50 text-red-600',
  'ציפיות-שכר-גבוהות':      'bg-orange-50 text-orange-700',
  'פוטנציאל-גבוה':           'bg-emerald-50 text-emerald-700',
  'ללא-ניסיון':              'bg-slate-100 text-slate-600',
  'מגורים-קרובים':           'bg-blue-50 text-blue-700',
  'דגל-אדום-מבריז':          'bg-red-100 text-red-700',
  'בוגר-הדסה':              'bg-violet-50 text-violet-700',
}
function tagClass(tag: string) {
  return TAG_COLOR_MAP[tag] ?? 'bg-teal-50 text-teal-700'
}

// A tag applied to a contact — carries the row id (for delete) and resolved name.
type PanelTag = { id: number; tag_id: number | null; name: string }

type ContactRow = Contact & {
  linked_org_name: string | null
  localTags: string[]
  hasBrokenCv: boolean
  hasNoPhoneButEmail: boolean
  isPartialProfile: boolean
  isDuplicatePhone: boolean
  isDuplicateEmail: boolean
  hasWarning: boolean
  isFollowUpDue: boolean
  isLinked: boolean
  linkState: 'linked' | 'unlinked'
}

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
  { key: 'phone', label: 'נייד' },
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


const panelInputClass =
  'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-medium text-[#0F172A] outline-none transition focus:border-[#008080] focus:ring-2 focus:ring-[#008080]/10'

export default function AdminContactsPage() {
  const { updateContact, bulkUpdateContacts } = useContactMutations()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<ExtendedFilters>({})
  const [page, setPage] = useState(0)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedRows, setSelectedRows] = useState<number[]>([])
  const [toast, setToast] = useState<ToastState>({ open: false, message: '', tone: 'info' })
  const [exportPending, setExportPending] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<string[]>([...DEFAULT_COLUMNS])
  const [sortBy, setSortBy] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [isEditing, setIsEditing] = useState(false)
  const [editDraft, setEditDraft] = useState<Partial<Contact>>({})
  const [savePending, setSavePending] = useState(false)
  const [panelTags, setPanelTags] = useState<PanelTag[]>([])
  const [showTagDropdown, setShowTagDropdown] = useState(false)

  // Bulk update
  const [bulkUpdateOpen, setBulkUpdateOpen] = useState(false)
  const [bulkField, setBulkField] = useState('')
  const [bulkValue, setBulkValue] = useState<string | number | null>(null)
  const [bulkPending, setBulkPending] = useState(false)

  // Follow-up scheduler
  const [followUpTarget, setFollowUpTarget] = useState<number | null>(null)
  const [followUpDate, setFollowUpDate] = useState('')
  const [followUpPending, setFollowUpPending] = useState(false)

  // Merge
  const [mergeOpen, setMergeOpen] = useState(false)
  const [mergePrimaryId, setMergePrimaryId] = useState<number | null>(null)
  const [mergePending, setMergePending] = useState(false)

  const pageSize = 20

  type ContactsResult = { contacts: import('@/types').Contact[]; total: number }
  const { data: contactsResult, isFetching: contactsFetching } = useQuery<ContactsResult>({
    queryKey: ['contacts-v2', filters, page, sortBy, sortDir],
    queryFn: () => runContactsQuery(filters, page, pageSize, sortBy, sortDir),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  })

  const { data: phoneNormCountsMap = new Map<string, number>() } = useQuery({
    queryKey: ['contacts-phone-norms'],
    queryFn: async () => {
      const { data } = await supabase.from('contact').select('phone_norm').not('phone_norm', 'is', null)
      const map = new Map<string, number>()
      ;(data ?? []).forEach((r: { phone_norm: string }) => { map.set(r.phone_norm, (map.get(r.phone_norm) ?? 0) + 1) })
      return map
    },
    staleTime: 120_000,
  })

  const { data: roleCounts = {} as Record<number, number> } = useQuery<Record<number, number>>({
    queryKey: ['contacts-role-counts'],
    queryFn: async () => {
      const { data } = await supabase.from('contact').select('role').not('role', 'is', null)
      const rec: Record<number, number> = {}
      ;(data ?? []).forEach((r: { role: number }) => { const id = Number(r.role); rec[id] = (rec[id] ?? 0) + 1 })
      return rec
    },
    staleTime: 120_000,
  })

  const { data: regionCounts = {} as Record<number, number> } = useQuery<Record<number, number>>({
    queryKey: ['contacts-region-counts'],
    queryFn: async () => {
      const { data } = await supabase.from('contact').select('region_id').not('region_id', 'is', null)
      const rec: Record<number, number> = {}
      ;(data ?? []).forEach((r: { region_id: number }) => { const id = Number(r.region_id); rec[id] = (rec[id] ?? 0) + 1 })
      return rec
    },
    staleTime: 120_000,
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

  const { data: accountsList = [] } = useQuery<{ account_id: number; account_name: string | null }[]>({
    queryKey: ['accounts_names'],
    queryFn: async () => {
      const { data, error } = await supabase.from('accounts').select('account_id,account_name')
      if (error) throw error
      return data ?? []
    },
    staleTime: 60_000,
  })

  const roleOptions = DICT_ROLES
  const availabilityOptions = DICT_AVAILABILITY
  const experienceOptions = DICT_EXPERIENCE
  const sourceOptions = DICT_SOURCES
  const checkStatusOptions = DICT_CHECK_STATUSES
  const socialStatusOptions = DICT_SOCIAL_STATUSES
  const profileTypeOptions = DICT_PROFILE_TYPES

  const { data: languageDict = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['dict_languages'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_languages').select('id,name').order('name')
      if (error) throw error
      return data ?? []
    },
    staleTime: 600_000,
  })

  // Canonical tag dictionary (id-based) — same model as AdminCandidatesPage.
  const { data: candidateTagOptions = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['dict_candidate_tags'],
    queryFn: async () => {
      const { data } = await supabase.from('dict_candidate_tags').select('id,name').eq('is_active', true).order('sort_order')
      return data ?? []
    },
    staleTime: 600_000,
  })

  const { data: contactTagsData = [] } = useQuery<{ id: number; contact_id: number; tag: string | null; tag_id: number | null }[]>({
    queryKey: ['contact_tags', selectedId],
    queryFn: async () => {
      if (!selectedId) return []
      const { data, error } = await supabase.from('contact_tags').select('id,contact_id,tag,tag_id').eq('contact_id', selectedId)
      if (error) throw error
      return data ?? []
    },
    enabled: !!selectedId,
  })

  // Resolve display name from tag_id (dict), falling back to legacy text `tag`.
  const selectedTags = useMemo<PanelTag[]>(
    () => contactTagsData.map((r) => ({
      id: r.id,
      tag_id: r.tag_id,
      name: r.tag_id ? (candidateTagOptions.find((o) => o.id === r.tag_id)?.name ?? r.tag ?? '') : (r.tag ?? ''),
    })),
    [contactTagsData, candidateTagOptions],
  )

  useEffect(() => {
    setPanelTags(selectedTags)
    setIsEditing(false)
    setEditDraft({})
  }, [selectedId])

  const roleName = (id: number | null | undefined) => roleOptions.find((r) => r.id === id)?.name ?? '—'
  const subRoleName = (id: number | null | undefined) => DICT_SUB_ROLES.find((r) => r.id === id)?.name ?? '—'
  // DB column is bigint[]; the shared Contact type still says string for legacy reasons — read defensively.
  const languagesName = (value: unknown): string => {
    if (!Array.isArray(value) || value.length === 0) return '—'
    return value.map((id) => languageDict.find((l) => l.id === Number(id))?.name ?? String(id)).join(', ')
  }
  const regionName = (id: number | null | undefined) => regionOptions.find((r) => r.id === id)?.name ?? '—'
  const cityName = (id: number | null | undefined) => cityOptions.find((r) => r.id === id)?.name ?? '—'
  const availabilityName = (id: number | null | undefined) => availabilityOptions.find((r) => r.id === id)?.name ?? '—'
  // candidate_availability_ids is multi-value; join to a readable list of names.
  const availabilityNames = (ids: number[] | null | undefined): string => {
    if (!Array.isArray(ids) || ids.length === 0) return '—'
    const names = ids.map((id) => availabilityName(id)).filter((n) => n !== '—')
    return names.length ? names.join(', ') : '—'
  }
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


  const enrichedContacts = useMemo<ContactRow[]>(() => {
    const rawPage = (contactsResult?.contacts ?? []) as Contact[]
    return rawPage.map((contact) => {
      const isDuplicatePhone = Boolean(contact.phone_norm && (phoneNormCountsMap.get(String(contact.phone_norm)) ?? 0) > 1)
      const isDuplicateEmail = Boolean(contact.dup_email_flag)
      const hasBrokenCv = Boolean(contact.has_cv && (!contact.cv_link || !isValidUrl(contact.cv_link)))
      const hasNoPhoneButEmail = !contact.phone_norm && Boolean(contact.email)
      const isPartialProfile = !contact.role || !contact.city_id || !contact.region_id
      const hasWarning = hasBrokenCv || hasNoPhoneButEmail || isPartialProfile || isDuplicatePhone || isDuplicateEmail
      const isFollowUpDue = isDateDue(contact.next_follow_up)
      const isLinked = Boolean(contact.account_link)
      const linkState: 'linked' | 'unlinked' = isLinked ? 'linked' : 'unlinked'
      return {
        ...contact,
        linked_org_name: contact.linked_org_name ?? (contact.account_link ? accountNameById.get(contact.account_link) ?? null : null),
        localTags: [] as string[],
        hasBrokenCv, hasNoPhoneButEmail, isPartialProfile, isDuplicatePhone, isDuplicateEmail, hasWarning, isFollowUpDue, isLinked, linkState,
      }
    })
  }, [contactsResult, phoneNormCountsMap, accountNameById])

  const handleSort = (key: string) => {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortBy(key); setSortDir('asc') }
    setPage(0)
  }


  const totalVisible = contactsResult?.total ?? 0
  const total = totalVisible
  const pageData = enrichedContacts
  const selectedContact = enrichedContacts.find((contact) => Number(contact.contact_id) === Number(selectedId)) ?? null

  const roleKpis = useMemo<KpiRoleCard[]>(() => {
    return KPI_ROLE_GROUPS.map((group) => ({
      ...group,
      value: group.roleIds.reduce((sum, id) => sum + (roleCounts[id] ?? 0), 0),
    }))
  }, [roleCounts])

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

  const editCityOptions = useMemo(() => {
    if (!editDraft.region_id) return cityOptions
    return cityOptions.filter((item) => Number(item.region_id) === Number(editDraft.region_id))
  }, [editDraft.region_id, cityOptions])

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

  const handleExport = async () => {
    try {
      setExportPending(true)
      let rowsToExport: Contact[]
      if (selectedRows.length) {
        rowsToExport = enrichedContacts.filter((contact) => selectedRows.includes(Number(contact.contact_id)))
      } else {
        const result = await runContactsQuery(filters, 0, 99999, sortBy, sortDir)
        rowsToExport = result.contacts
      }

      const rows = rowsToExport.map((contact) => ({
        'שם מלא': contact.full_name ?? contact.display_name ?? '',
        טלפון: contact.phone_norm ?? contact.phone ?? '',
        אימייל: contact.email ?? '',
        תפקיד: roleName(contact.role),
        אזור: regionName(contact.region_id),
        עיר: cityName(contact.city_id),
        זמינות: availabilityNames(contact.candidate_availability_ids),
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
      // availability is now a multi-value array column — wrap the chosen id.
      const patch = bulkField === 'availability'
        ? { candidate_availability_ids: [Number(bulkValue)] }
        : { [bulkField]: bulkValue }
      const { error } = await bulkUpdateContacts(selectedRows, patch)
      if (error) throw error
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

  const handleMerge = async (masterId: number, overrides: Record<string, unknown>) => {
    const dupIds = selectedRows.filter((id) => id !== masterId)
    setMergePending(true)
    try {
      const { error } = await supabase.rpc('merge_contacts', {
        master_id: masterId,
        dup_ids: dupIds,
        overrides,
      })
      if (error) throw error
      queryClient.invalidateQueries({ queryKey: ['contacts-v2'] })
      showToast('הרשומות מוזגו בהצלחה', 'success')
      setMergeOpen(false)
      setMergePrimaryId(null)
      setSelectedRows([])
      if (selectedId && dupIds.includes(selectedId)) setSelectedId(null)
    } catch {
      showToast('שגיאה במיזוג הרשומות', 'error')
    } finally {
      setMergePending(false)
    }
  }

  // Open the linked organization's 360 card (account_link → account id).
  const openOrg = (accountLink: number | null | undefined) => {
    if (!accountLink) { showToast('אין ארגון מקושר לרשומה', 'error'); return }
    navigate(`/admin/accounts/${accountLink}`)
  }

  // Follow-up: pick a date → write contact.next_follow_up.
  const openFollowUp = (contactId: number, current: string | null | undefined) => {
    setFollowUpTarget(contactId)
    setFollowUpDate(current ? String(current).slice(0, 10) : '')
  }
  const saveFollowUp = async () => {
    if (!followUpTarget) return
    setFollowUpPending(true)
    try {
      const { error } = await updateContact(followUpTarget, { next_follow_up: followUpDate || null })
      if (error) throw error
      showToast('פולו־אפ נקבע', 'success')
      setFollowUpTarget(null)
    } catch {
      showToast('שגיאה בקביעת פולו־אפ', 'error')
    } finally {
      setFollowUpPending(false)
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
      phone: contact.phone ?? contact.phone_norm ?? '',
      email: contact.email ?? '',
      role: contact.role,
      city_id: contact.city_id,
      region_id: contact.region_id,
      candidate_availability_ids: contact.candidate_availability_ids ?? [],
      notes: contact.notes ?? '',
    })
    setIsEditing(true)
  }

  const closeContactPanel = () => {
    setIsEditing(false)
    setEditDraft({})
    setSelectedId(null)
  }

  const cancelContactEdit = () => {
    setIsEditing(false)
    setEditDraft({})
  }

  const handleSave = async () => {
    if (!selectedContact) return
    setSavePending(true)
    try {
      const { error } = await updateContact(selectedContact.contact_id, editDraft)
      if (error) throw error
      showToast('נשמר בהצלחה', 'success')
      setIsEditing(false)
    } catch {
      showToast('שגיאה בשמירה', 'error')
    } finally {
      setSavePending(false)
    }
  }

  // Add a tag by its dictionary id (canonical id-based model).
  const handleAddTag = async (tagId: number) => {
    if (!selectedId || panelTags.some((t) => t.tag_id === tagId)) return
    const { error } = await supabase.from('contact_tags').insert({ contact_id: selectedId, tag_id: tagId })
    if (!error) queryClient.invalidateQueries({ queryKey: ['contact_tags', selectedId] })
    setShowTagDropdown(false)
  }

  // Remove a tag by its contact_tags row id (works for id-based and legacy rows).
  const handleRemoveTag = async (rowId: number) => {
    const { error } = await supabase.from('contact_tags').delete().eq('id', rowId)
    if (!error && selectedId) queryClient.invalidateQueries({ queryKey: ['contact_tags', selectedId] })
  }

  const selectedPageIds = pageData.map((contact) => String(contact.contact_id))
  const selectedIdStrings = selectedRows.map(String)
  const allPageRowsSelected = selectedPageIds.length > 0 && selectedPageIds.every((id) => selectedIdStrings.includes(id))
  const somePageRowsSelected = selectedPageIds.some((id) => selectedIdStrings.includes(id))
  const hasActiveFilters = Object.values(filters).some((value) =>
    Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null && value !== '',
  )

  const contactColumns: AdminColumn<ContactRow>[] = []

  if (visibleColumns.includes('full_name')) {
    contactColumns.push({
      key: 'full_name',
      label: 'שם מלא',
      sortable: true,
      minWidth: '220px',
      render: (contact) => {
        const warnings = buildWarnings(contact)
        return (
          <div className="min-w-[210px] py-2">
            <div className="text-[14px] font-bold text-[#0F172A]">
              {contact.full_name ?? contact.display_name ?? '—'}
            </div>
            <div className="mt-1 flex flex-wrap gap-1.5">
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
        )
      },
    })
  }

  if (visibleColumns.includes('phone')) {
    contactColumns.push({
      key: 'phone',
      label: 'נייד',
      sortable: true,
      nowrap: true,
      minWidth: '140px',
      render: (contact) => (
        <div className="space-y-1 py-2" dir="ltr">
          <div className="whitespace-nowrap text-left font-semibold text-slate-700">
            {contact.phone_norm ? formatPhone(contact.phone_norm) : '—'}
          </div>
          {contact.second_phone && (
            <div className="whitespace-nowrap text-left text-[12px] text-slate-500">
              {formatPhone(contact.second_phone)}
            </div>
          )}
        </div>
      ),
    })
  }

  if (visibleColumns.includes('email')) {
    contactColumns.push({
      key: 'email',
      label: 'מייל',
      sortable: true,
      minWidth: '220px',
      render: (contact) => (
        <div className="max-w-[230px] space-y-1 py-2">
          <div className="truncate" title={contact.email ?? undefined}>{contact.email ?? '—'}</div>
          {contact.second_email && (
            <div className="truncate text-[12px] text-slate-500" title={contact.second_email}>
              {contact.second_email}
            </div>
          )}
        </div>
      ),
    })
  }

  if (visibleColumns.includes('role')) {
    contactColumns.push({
      key: 'role',
      label: 'תפקיד',
      sortable: true,
      minWidth: '150px',
      render: (contact) => <RoleBadge label={roleName(contact.role)} roleId={Number(contact.role)} />,
    })
  }

  if (visibleColumns.includes('region')) {
    contactColumns.push({
      key: 'region',
      label: 'אזור',
      sortable: true,
      minWidth: '140px',
      render: (contact) => <RegionBadge regionId={contact.region_id} label={regionName(contact.region_id)} />,
    })
  }

  if (visibleColumns.includes('city')) {
    contactColumns.push({
      key: 'city',
      label: 'עיר',
      sortable: true,
      minWidth: '130px',
      render: (contact) => <span className="whitespace-nowrap">{cityName(contact.city_id)}</span>,
    })
  }

  if (visibleColumns.includes('availability')) {
    contactColumns.push({
      key: 'availability',
      label: 'זמינות',
      minWidth: '180px',
      render: (contact) => (contact.candidate_availability_ids ?? []).length ? (
        <div className="flex flex-wrap gap-1 py-2">
          {(contact.candidate_availability_ids ?? []).map((id) => (
            <Badge key={id} tone={availabilityTone(id)}>{availabilityName(id)}</Badge>
          ))}
        </div>
      ) : <span className="text-slate-400">—</span>,
    })
  }

  if (visibleColumns.includes('cv')) {
    contactColumns.push({
      key: 'cv',
      label: 'קו"ח',
      minWidth: '100px',
      render: (contact) => <CvStateBadge hasCv={Boolean(contact.has_cv)} broken={contact.hasBrokenCv} />,
    })
  }

  if (visibleColumns.includes('profile_type')) {
    contactColumns.push({
      key: 'profile_type',
      label: 'סוג פרופיל',
      minWidth: '130px',
      render: (contact) => profileTypeName(contact.profile_type),
    })
  }

  if (visibleColumns.includes('linked_org')) {
    contactColumns.push({
      key: 'linked_org',
      label: 'ארגון מקושר',
      minWidth: '180px',
      render: (contact) => contact.linked_org_name ? (
        <button
          type="button"
          className="max-w-[220px] truncate rounded-xl bg-slate-50 px-2.5 py-1 text-[12px] font-semibold text-slate-700 hover:bg-slate-100"
          title={contact.linked_org_name}
          onClick={(event) => {
            event.stopPropagation()
            openOrg(contact.account_link)
          }}
        >
          {contact.linked_org_name}
        </button>
      ) : <span className="text-slate-400">—</span>,
    })
  }

  if (visibleColumns.includes('whatsapp')) {
    contactColumns.push({
      key: 'whatsapp',
      label: 'תאריך שליחת WhatsApp',
      minWidth: '155px',
      nowrap: true,
      render: (contact) => formatDate(contact.whatsapp_campaign_last_sent),
    })
  }

  if (visibleColumns.includes('last_contact')) {
    contactColumns.push({
      key: 'last_contact',
      label: 'קשר אחרון',
      minWidth: '125px',
      nowrap: true,
      render: (contact) => formatDate(contact.last_contact_date),
    })
  }

  contactColumns.push({
    key: 'actions',
    label: 'פעולות',
    width: '72px',
    headerClassName: 'text-center',
    cellClassName: 'text-center',
    render: (contact) => {
      const items: AdminActionMenuItem[] = [
        {
          key: 'view',
          label: 'תצוגה מהירה',
          icon: <Eye className="h-4 w-4" />,
          onClick: () => setSelectedId(Number(contact.contact_id)),
        },
        {
          key: 'edit',
          label: 'עריכה',
          icon: <Edit2 className="h-4 w-4" />,
          onClick: () => {
            setSelectedId(Number(contact.contact_id))
            handleEditOpen(contact)
          },
        },
        {
          key: 'follow-up',
          label: 'קביעת פולו־אפ',
          icon: <Phone className="h-4 w-4" />,
          onClick: () => openFollowUp(Number(contact.contact_id), contact.next_follow_up),
        },
        {
          key: 'candidate',
          label: 'סמן כמועמד',
          icon: <UserCheck className="h-4 w-4" />,
          onClick: () => markAsCandidate(contact.contact_id),
        },
      ]
      if (contact.isDuplicatePhone || contact.isDuplicateEmail) {
        items.push({
          key: 'merge',
          label: 'סמן למיזוג',
          icon: <Merge className="h-4 w-4" />,
          separatorBefore: true,
          onClick: () => toggleRowSelection(Number(contact.contact_id)),
        })
      }
      return (
        <div onClick={(event) => event.stopPropagation()}>
          <AdminActionsMenu items={items} ariaLabel={`פעולות עבור ${contact.full_name ?? contact.display_name ?? 'איש קשר'}`} />
        </div>
      )
    },
  })

  return (
    <Shell
      title="אנשי קשר"
      subtitle={`מאגר האב של כל האנשים במערכת • ${contactsFetching ? 'טוען...' : `${totalVisible} תוצאות`}`}
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
            onClick={() => { queryClient.invalidateQueries({ queryKey: ['contacts-v2'] }); showToast('הרשימה רועננה', 'success') }}
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
                    setFilters((prev) => ({ ...prev, role: card.roleIds[0], sub_role_ids: undefined }))
                  } else {
                    showToast('הקבוצה כוללת כמה תתי-תפקידים מקצועיים', 'info')
                  }
                }}
              />
            ))}
          </section>

          {regionOptions.length > 0 && (
            <section className="flex flex-wrap gap-2">
              {regionOptions
                .filter((r) => (regionCounts[r.id] ?? 0) > 0)
                .sort((a, b) => (regionCounts[b.id] ?? 0) - (regionCounts[a.id] ?? 0))
                .map((region) => {
                  const isActive = filters.region_id === region.id
                  return (
                    <button
                      key={region.id}
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          region_id: isActive ? undefined : region.id,
                        }))
                      }
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-semibold transition-colors ${
                        isActive
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      <span>{region.name}</span>
                      <span className={`rounded-full px-1.5 py-0.5 text-[11px] ${isActive ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        {regionCounts[region.id] ?? 0}
                      </span>
                    </button>
                  )
                })}
            </section>
          )}

          <Toolbar>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <SearchFieldIcon />
                <h2 className="text-[15px] font-bold text-[#0F172A]">סינון וחיפוש</h2>
                <span className="rounded-[6px] bg-[#F8FAFC] px-2.5 py-1 text-[12px] font-semibold text-slate-500">
                  צפוף אך קריא
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
                <SearchBar
                  value={filters.search ?? ''}
                  onChange={(value) => setFilters((prev) => ({ ...prev, search: value }))}
                  placeholder="חיפוש שם, טלפון, אימייל, מפתח עסקי..."
                />
                <RoleSubRolePicker
                  variant="filter"
                  roleId={filters.role ?? null}
                  subRoleIds={filters.sub_role_ids ?? []}
                  onRoleChange={(id) => setFilters((prev) => ({ ...prev, role: id ?? undefined, sub_role_ids: undefined }))}
                  onSubRoleChange={(ids) => setFilters((prev) => ({ ...prev, sub_role_ids: ids.length ? ids : undefined }))}
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
                  options={candidateTagOptions.map((o) => ({ value: String(o.id), label: o.name }))}
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

          <Toolbar>
            <AdminTable<ContactRow>
              columns={contactColumns}
              data={pageData}
              keyField="contact_id"
              onRowClick={(contact) => setSelectedId(Number(contact.contact_id))}
              selectedIds={selectedIdStrings}
              onSelectId={(id) => toggleRowSelection(Number(id))}
              allSelected={allPageRowsSelected}
              someSelected={somePageRowsSelected}
              onSelectAll={togglePageSelection}
              sortKey={sortBy ?? undefined}
              sortDir={sortDir}
              onSort={handleSort}
              isLoading={contactsFetching && pageData.length === 0}
              hasActiveFilter={hasActiveFilters}
              emptyMessage="עדיין אין אנשי קשר במערכת"
              noResultsMessage="לא נמצאו אנשי קשר התואמים לסינון"
              minWidth="1800px"
              bulkActions={
                <div className="flex flex-wrap items-center gap-2">
                  <SmallActionButton onClick={() => { setBulkField(''); setBulkValue(null); setBulkUpdateOpen(true) }}>
                    עדכון שדה
                  </SmallActionButton>
                  {selectedRows.length >= 2 && (
                    <SmallActionButton onClick={() => setMergeOpen(true)}>
                      מיזוג רשומות
                    </SmallActionButton>
                  )}
                  <SmallActionButton onClick={handleExport}>ייצוא</SmallActionButton>
                </div>
              }
              pagination={
                <AdminTablePagination
                  page={page + 1}
                  pageSize={pageSize}
                  total={totalVisible}
                  onPageChange={(nextPage) => setPage(nextPage - 1)}
                />
              }
            />
          </Toolbar>
        </div>

        {selectedContact && (
          <SidePanel
            open
            onClose={closeContactPanel}
            header={
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
                          {(selectedContact.candidate_availability_ids ?? []).map((id) => (
                            <Badge key={id} tone={availabilityTone(id)}>{availabilityName(id)}</Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <LinkAction
                          to={`/admin/contacts/${selectedContact.contact_id}`}
                          icon={<Eye className="h-4 w-4" />}
                          label="פתח כרטסת 360"
                        />
                        {!isEditing && (
                          <QuickActionButton
                            icon={<Edit2 className="h-4 w-4" />}
                            label="עריכה"
                            onClick={() => handleEditOpen(selectedContact)}
                          />
                        )}
                        <QuickLinkButton
                          href={whatsappLink(selectedContact.phone_norm) || undefined}
                          icon={<Phone className="h-4 w-4" />}
                          label="וואטסאפ"
                          disabled={!selectedContact.phone_norm}
                        />
                        <QuickLinkButton
                          href={selectedContact.phone_norm ? `tel:${selectedContact.phone_norm}` : undefined}
                          icon={<Phone className="h-4 w-4" />}
                          label="נייד"
                          disabled={!selectedContact.phone_norm}
                        />
                        <QuickLinkButton
                          href={selectedContact.email ? `mailto:${selectedContact.email}` : undefined}
                          icon={<Mail className="h-4 w-4" />}
                          label="אימייל"
                          disabled={!selectedContact.email}
                        />
                        <QuickLinkButton
                          href={selectedContact.facebook_url ?? (selectedContact.facebook_id ? `https://www.facebook.com/profile.php?id=${selectedContact.facebook_id}` : undefined)}
                          icon={<Facebook className="h-4 w-4" />}
                          label="פייסבוק"
                          disabled={!selectedContact.facebook_url && !selectedContact.facebook_id}
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
                          onClick={() => navigate(`/admin/contacts/${selectedContact.contact_id}`)}
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
                          onClick={() => openFollowUp(Number(selectedContact.contact_id), selectedContact.next_follow_up)}
                        />
                        <QuickActionButton
                          icon={<Users className="h-4 w-4" />}
                          label="ארגון מקושר"
                          onClick={() => openOrg(selectedContact.account_link)}
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={closeContactPanel}
                    className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
                    aria-label="סגור"
                    title="סגור"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
            }
            footer={
              <AdminPanelActions
                mode={isEditing ? 'edit' : 'view'}
                onClose={closeContactPanel}
                onEdit={() => handleEditOpen(selectedContact)}
                onCancelEdit={cancelContactEdit}
                onSave={handleSave}
                saving={savePending}
                primaryAction={{
                  label: 'כרטסת 360',
                  onClick: () => navigate(`/admin/contacts/${selectedContact.contact_id}`),
                }}
              />
            }
          >
              <div className="space-y-4">
                <AdminPanelSection title="תגיות">
                  <div className="sm:col-span-2">
                    <div className="flex flex-wrap gap-2">
                      {panelTags.map((tag) => (
                        <span key={tag.id} className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-semibold ${tagClass(tag.name)}`}>
                          {tag.name}
                          <button
                            type="button"
                            aria-label={`הסרת התגית ${tag.name}`}
                            onClick={() => handleRemoveTag(tag.id)}
                            className="opacity-60 hover:opacity-100"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowTagDropdown((value) => !value)}
                          className="inline-flex items-center gap-1 rounded-md border border-dashed border-slate-300 px-2.5 py-1 text-[12px] font-semibold text-slate-500 hover:border-teal-400 hover:text-teal-600"
                        >
                          + תגית
                        </button>
                        {showTagDropdown && (
                          <div className="absolute right-0 top-full z-30 mt-1 max-h-48 w-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-md">
                            {candidateTagOptions
                              .filter((option) => !panelTags.some((tag) => tag.tag_id === option.id))
                              .map((option) => (
                                <button
                                  key={option.id}
                                  type="button"
                                  onClick={() => handleAddTag(option.id)}
                                  className="w-full px-3 py-2 text-right text-[13px] text-slate-700 hover:bg-slate-50"
                                >
                                  {option.name}
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </AdminPanelSection>

                <AdminPanelSection title="זהות ופרטי קשר">
                  <AdminPanelField
                    label="שם מלא"
                    mode={isEditing ? 'edit' : 'view'}
                    viewValue={selectedContact.full_name ?? selectedContact.display_name}
                    editValue={
                      <input
                        id="contact-full-name"
                        value={editDraft.full_name ?? ''}
                        onChange={(event) => setEditDraft((draft) => ({ ...draft, full_name: event.target.value }))}
                        className={panelInputClass}
                      />
                    }
                    htmlFor="contact-full-name"
                  />
                  <AdminPanelField label="שם תצוגה" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.display_name} />
                  <AdminPanelField label="שם פרטי" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.first_name} />
                  <AdminPanelField label="שם משפחה" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.last_name} />
                  <AdminPanelField
                    label="נייד"
                    mode={isEditing ? 'edit' : 'view'}
                    viewValue={selectedContact.phone_norm ? formatPhone(selectedContact.phone_norm) : null}
                    editValue={
                      <input
                        id="contact-phone"
                        dir="ltr"
                        value={editDraft.phone ?? ''}
                        onChange={(event) => setEditDraft((draft) => ({ ...draft, phone: event.target.value }))}
                        className={`${panelInputClass} text-left`}
                      />
                    }
                    htmlFor="contact-phone"
                  />
                  <AdminPanelField
                    label="נייד נוסף"
                    mode={isEditing ? 'edit' : 'view'}
                    viewValue={selectedContact.second_phone ? formatPhone(selectedContact.second_phone) : null}
                  />
                  <AdminPanelField
                    label="מייל"
                    mode={isEditing ? 'edit' : 'view'}
                    viewValue={selectedContact.email}
                    editValue={
                      <input
                        id="contact-email"
                        type="email"
                        dir="ltr"
                        value={editDraft.email ?? ''}
                        onChange={(event) => setEditDraft((draft) => ({ ...draft, email: event.target.value }))}
                        className={`${panelInputClass} text-left`}
                      />
                    }
                    htmlFor="contact-email"
                  />
                  <AdminPanelField label="מייל נוסף" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.second_email} />
                  <AdminPanelField label="פייסבוק" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.facebook_name ?? selectedContact.facebook_url} />
                  <AdminPanelField label="סטטוס חברתי" mode={isEditing ? 'edit' : 'view'} viewValue={socialStatusName(selectedContact.social_status)} />
                  <AdminPanelField label="מפתח עסקי" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.phone_norm} />
                </AdminPanelSection>

                <AdminPanelSection title="פרטים מקצועיים">
                  <AdminPanelField
                    label="תפקיד"
                    mode={isEditing ? 'edit' : 'view'}
                    viewValue={<RoleBadge label={roleName(selectedContact.role)} roleId={Number(selectedContact.role)} />}
                    editValue={
                      <select
                        id="contact-role"
                        value={editDraft.role ?? ''}
                        onChange={(event) => setEditDraft((draft) => ({ ...draft, role: event.target.value ? Number(event.target.value) : null }))}
                        className={panelInputClass}
                      >
                        <option value="">— בחר תפקיד —</option>
                        {roleOptions.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
                      </select>
                    }
                    htmlFor="contact-role"
                  />
                  <AdminPanelField label="תת־תפקיד" mode={isEditing ? 'edit' : 'view'} viewValue={subRoleName(selectedContact.sub_role)} />
                  <AdminPanelField label="סוג פרופיל" mode={isEditing ? 'edit' : 'view'} viewValue={profileTypeName(selectedContact.profile_type)} />
                  <AdminPanelField label="כותרת מקצועית" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.professional_title} />
                  <AdminPanelField label="ניסיון" mode={isEditing ? 'edit' : 'view'} viewValue={experienceName(selectedContact.experience)} />
                  <AdminPanelField
                    label="זמינות"
                    mode={isEditing ? 'edit' : 'view'}
                    viewValue={availabilityNames(selectedContact.candidate_availability_ids)}
                    editValue={
                      <DictionaryMultiSelect
                        options={availabilityOptions}
                        value={editDraft.candidate_availability_ids ?? []}
                        onChange={(ids) => setEditDraft((draft) => ({ ...draft, candidate_availability_ids: ids }))}
                        placeholder="בחירת זמינויות..."
                      />
                    }
                  />
                  <AdminPanelField label="היקף מועדף" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.preferred_scope} />
                  <AdminPanelField label="שפות" mode={isEditing ? 'edit' : 'view'} viewValue={languagesName(selectedContact.languages)} />
                  <AdminPanelField label="מעסיק נוכחי" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.current_employer} />
                  <AdminPanelField label="ציפיית שכר שעתי" mode={isEditing ? 'edit' : 'view'} viewValue={formatCurrency(selectedContact.salary_expectation_hourly)} />
                  <AdminPanelField label="ציפיית שכר חודשית" mode={isEditing ? 'edit' : 'view'} viewValue={formatCurrency(selectedContact.salary_expectation_monthly)} />
                  <AdminPanelField label="סוג מס" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.tax_type} />
                </AdminPanelSection>

                <AdminPanelSection title="מיקום והעדפות">
                  <AdminPanelField
                    label="אזור"
                    mode={isEditing ? 'edit' : 'view'}
                    viewValue={<RegionBadge regionId={selectedContact.region_id} label={regionName(selectedContact.region_id)} />}
                    editValue={
                      <select
                        id="contact-region"
                        value={editDraft.region_id ?? ''}
                        onChange={(event) => setEditDraft((draft) => ({
                          ...draft,
                          region_id: event.target.value ? Number(event.target.value) : null,
                          city_id: null,
                        }))}
                        className={panelInputClass}
                      >
                        <option value="">— בחר אזור —</option>
                        {regionOptions.map((region) => <option key={region.id} value={region.id}>{region.name}</option>)}
                      </select>
                    }
                    htmlFor="contact-region"
                  />
                  <AdminPanelField
                    label="עיר"
                    mode={isEditing ? 'edit' : 'view'}
                    viewValue={cityName(selectedContact.city_id)}
                    editValue={
                      <select
                        id="contact-city"
                        value={editDraft.city_id ?? ''}
                        onChange={(event) => {
                          const cityId = event.target.value ? Number(event.target.value) : null
                          const city = cityOptions.find((option) => Number(option.id) === Number(cityId))
                          setEditDraft((draft) => ({
                            ...draft,
                            city_id: cityId,
                            region_id: city?.region_id ?? draft.region_id ?? null,
                          }))
                        }}
                        className={panelInputClass}
                      >
                        <option value="">— בחר עיר —</option>
                        {editCityOptions.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
                      </select>
                    }
                    htmlFor="contact-city"
                  />
                  <AdminPanelField label="אזורים מועדפים" mode={isEditing ? 'edit' : 'view'} viewValue={formatIdsToNames(selectedContact.preferred_regions, regionName)} />
                  <AdminPanelField label="ערים מועדפות" mode={isEditing ? 'edit' : 'view'} viewValue={formatIdsToNames(selectedContact.preferred_cities, cityName)} />
                  <AdminPanelField label="שנת לידה" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.birth_year ? String(selectedContact.birth_year) : null} />
                  <AdminPanelField label="מגדר" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.gender} />
                  <AdminPanelField label="מספר רישיון" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.license_no} />
                </AdminPanelSection>

                <AdminPanelSection title="קבצים">
                  <div className="space-y-3 sm:col-span-2">
                    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-[#F8FAFC] px-3 py-3">
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
                      <MetaLine label={'תאריך קבלת קו"ח'} value={formatDate(selectedContact.cv_received_date)} />
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
                </AdminPanelSection>

                <AdminPanelSection title="CRM">
                  <AdminPanelField label="מקור" mode={isEditing ? 'edit' : 'view'} viewValue={sourceName(selectedContact.source)} />
                  <AdminPanelField
                    label="סטטוס בדיקה"
                    mode={isEditing ? 'edit' : 'view'}
                    viewValue={<StatusBadge statusType="check" statusId={selectedContact.check_status} label={checkStatusName(selectedContact.check_status)} />}
                  />
                  <AdminPanelField label="קשר אחרון" mode={isEditing ? 'edit' : 'view'} viewValue={formatDate(selectedContact.last_contact_date)} />
                  <AdminPanelField label="פולו־אפ הבא" mode={isEditing ? 'edit' : 'view'} viewValue={formatDate(selectedContact.next_follow_up)} />
                  <AdminPanelField label="מספר הגשות קודמות" mode={isEditing ? 'edit' : 'view'} viewValue={String(selectedContact.prev_applications_count ?? 0)} />
                  <AdminPanelField label="תאריך סטטוס מועמד" mode={isEditing ? 'edit' : 'view'} viewValue={formatDate(selectedContact.candidate_status_date)} />
                  <AdminPanelField label="WhatsApp קמפיין אחרון" mode={isEditing ? 'edit' : 'view'} viewValue={formatDate(selectedContact.whatsapp_campaign_last_sent)} />
                  <AdminPanelField label="נוצר" mode={isEditing ? 'edit' : 'view'} viewValue={formatDate(selectedContact.created_timestamp)} />
                  <AdminPanelField label="עודכן" mode={isEditing ? 'edit' : 'view'} viewValue={formatDate(selectedContact.updated_timestamp)} />
                  <AdminPanelField
                    label="הערות"
                    mode={isEditing ? 'edit' : 'view'}
                    viewValue={selectedContact.notes}
                    editValue={
                      <textarea
                        id="contact-notes"
                        rows={4}
                        value={editDraft.notes ?? ''}
                        onChange={(event) => setEditDraft((draft) => ({ ...draft, notes: event.target.value }))}
                        className={`${panelInputClass} min-h-[96px] resize-y`}
                      />
                    }
                    htmlFor="contact-notes"
                    fullWidth
                  />
                </AdminPanelSection>

                <AdminPanelSection title="שיוך ארגוני">
                  <AdminPanelField label="מזהה ארגון" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.account_link ? String(selectedContact.account_link) : null} />
                  <AdminPanelField label="שם הארגון" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.linked_org_name} />
                  <AdminPanelField label="מצב שיוך" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.account_link ? 'מקושר' : 'ללא שיוך ארגוני'} />
                </AdminPanelSection>

                <AdminPanelSection title="הרחבות ו־AI">
                  <AdminPanelField label="סיכום AI" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.ai_profile_summary ?? 'אין עדיין סיכום AI'} fullWidth />
                  <AdminPanelField
                    label="נתונים מורחבים"
                    mode={isEditing ? 'edit' : 'view'}
                    viewValue={selectedContact.extended_data ? JSON.stringify(selectedContact.extended_data) : 'אין נתונים מורחבים'}
                    fullWidth
                  />
                  <AdminPanelField
                    label="מצבי אזהרה"
                    mode={isEditing ? 'edit' : 'view'}
                    viewValue={buildWarnings(selectedContact).length ? buildWarnings(selectedContact).join(' | ') : 'ללא אזהרות'}
                    fullWidth
                  />
                </AdminPanelSection>
              </div>
          </SidePanel>
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

        {/* Follow-up scheduler */}
        {followUpTarget !== null && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4">
            <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-md">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F0FDFC] text-[#008080]">
                  <Phone className="h-5 w-5" />
                </div>
                <div className="text-[18px] font-bold text-[#0F172A]">קביעת פולו־אפ</div>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] font-semibold text-slate-600">תאריך מעקב</span>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-[#008080]"
                />
              </label>
              <div className="mt-6 flex justify-end gap-2">
                <ActionButton variant="ghost" onClick={() => setFollowUpTarget(null)}>ביטול</ActionButton>
                <ActionButton variant="primary" onClick={saveFollowUp} disabled={followUpPending}>
                  {followUpPending ? 'שומר...' : 'שמירה'}
                </ActionButton>
              </div>
            </div>
          </div>
        )}

        {/* Merge Dialog */}
        {mergeOpen && selectedRows.length >= 2 && (() => {
          const selectedContacts = selectedRows
            .map((id) => enrichedContacts.find((c) => Number(c.contact_id) === id))
            .filter(Boolean) as typeof enrichedContacts
          if (selectedContacts.length < 2) return null
          return (
            <MergeRecordsModal
              records={selectedContacts as unknown as Record<string, unknown>[]}
              idField="contact_id"
              nameField="full_name"
              displayFields={[
                { key: 'full_name' as never, label: 'שם מלא' },
                { key: 'phone' as never, label: 'נייד', format: (v) => v ? formatPhone(String(v)) : '—' },
                { key: 'email' as never, label: 'מייל' },
                { key: 'role' as never, label: 'תפקיד', format: (v) => roleName(v as number) },
                { key: 'candidate_availability_ids' as never, label: 'זמינות', format: (v) => availabilityNames(v as number[]) },
                { key: 'region_id' as never, label: 'אזור', format: (v) => regionName(v as number) },
                { key: 'city_id' as never, label: 'עיר', format: (v) => cityName(v as number) },
                { key: 'notes' as never, label: 'הערות' },
              ]}
              onConfirm={handleMerge}
              onClose={() => { setMergeOpen(false); setMergePrimaryId(null) }}
              pending={mergePending}
              title="מיזוג אנשי קשר"
            />
          )
        })()}

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
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
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

function formatIdsToNames(
  ids: number[] | null | undefined,
  getLabel: (id: number | null | undefined) => string,
) {
  if (!ids?.length) return '—'
  return ids.map((id) => getLabel(id)).join(', ')
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

async function runContactsQuery(
  filters: {
    search?: string; role?: number; sub_role_ids?: number[]; region_id?: number; city_id?: number
    availability?: number; experience?: number; source?: number; profile_type?: number
    check_status?: number; social_status?: number; has_cv?: 'yes' | 'no'
    link_state?: 'linked' | 'unlinked'; follow_up_due?: 'yes' | 'no'; tags?: string
    created_from?: string; created_to?: string; updated_from?: string; updated_to?: string
  },
  page: number,
  pageSize: number,
  sortBy: string | null,
  sortDir: 'asc' | 'desc',
) {
  const { supabase: sb } = await import('@/lib/supabase')

  let tagContactIds: number[] | null = null
  if (filters.tags) {
    const { data: tagRows } = await sb.from('contact_tags').select('contact_id').eq('tag_id', Number(filters.tags))
    tagContactIds = (tagRows ?? []).map((r: { contact_id: number }) => r.contact_id)
    if (!tagContactIds.length) return { contacts: [] as import('@/types').Contact[], total: 0 }
  }

  let query = sb.from('contact').select('*', { count: 'exact' })

  if (filters.search?.trim()) {
    const q = filters.search.trim().replace(/[,%()]/g, ' ')
    const phoneCore = phoneSearchTerm(q)
    const conditions = [
      `full_name.ilike.%${q}%`,
      `email.ilike.%${q}%`,
      `linked_org_name.ilike.%${q}%`,
      `phone.ilike.%${q}%`,
    ]
    if (phoneCore) conditions.push(`phone_norm.ilike.%${phoneCore}%`)
    query = query.or(conditions.join(','))
  }
  if (filters.role) query = query.eq('role', filters.role)
  if (filters.sub_role_ids?.length) query = (query as any).filter('sub_role', 'ov', `{${filters.sub_role_ids.join(',')}}`)
  if (filters.region_id) query = query.eq('region_id', filters.region_id)
  if (filters.city_id) query = query.eq('city_id', filters.city_id)
  if (filters.availability) query = query.contains('candidate_availability_ids', [filters.availability])
  if (filters.experience) query = query.eq('experience', filters.experience)
  if (filters.source) query = query.eq('source', filters.source)
  if (filters.profile_type) query = query.eq('profile_type', filters.profile_type)
  if (filters.check_status) query = query.eq('check_status', filters.check_status)
  if (filters.social_status) query = query.eq('social_status', filters.social_status)
  if (filters.has_cv === 'yes') query = query.eq('has_cv', true)
  if (filters.has_cv === 'no') query = query.eq('has_cv', false)
  if (filters.link_state === 'linked') query = query.not('account_link', 'is', null)
  if (filters.link_state === 'unlinked') query = query.is('account_link', null)
  if (filters.follow_up_due === 'yes') query = (query as any).lte('next_follow_up', todayIso()).not('next_follow_up', 'is', null)
  if (filters.follow_up_due === 'no') query = query.or(`next_follow_up.is.null,next_follow_up.gt.${todayIso()}`)
  if (filters.created_from) query = query.gte('created_timestamp', filters.created_from)
  if (filters.created_to) query = query.lte('created_timestamp', filters.created_to + 'T23:59:59')
  if (filters.updated_from) query = query.gte('updated_timestamp', filters.updated_from)
  if (filters.updated_to) query = query.lte('updated_timestamp', filters.updated_to + 'T23:59:59')
  if (tagContactIds !== null) query = query.in('contact_id', tagContactIds)

  const sortColMap: Record<string, string> = {
    full_name: 'full_name', phone: 'phone', email: 'email',
    availability: 'availability', last_contact: 'last_contact_date',
    whatsapp: 'whatsapp_campaign_last_sent', role: 'role', region: 'region_id', city: 'city_id',
  }
  const dbCol = sortBy ? (sortColMap[sortBy] ?? 'contact_id') : 'contact_id'
  query = query.order(dbCol, { ascending: sortBy ? sortDir === 'asc' : false, nullsFirst: false })

  if (pageSize < 99999) query = query.range(page * pageSize, (page + 1) * pageSize - 1)

  const { data, count, error } = await query
  if (error) throw error
  return { contacts: (data ?? []) as import('@/types').Contact[], total: count ?? 0 }
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


