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

type AdminContactRow = Omit<
  Contact,
  'sub_role' | 'preferred_scope' | 'languages' | 'gender' | 'tax_type' | 'facebook_id'
> & {
  sub_role: number[] | null
  preferred_scope: number[]
  languages: number[]
  gender: number | null
  tax_type_id: number | null
  facebook_id: number | null
  additional_skills_notes?: string | null
  academic_education?: string | null
  professional_courses?: string | null
  portfolio_url?: string | null
  recommendations_url?: string | null
  personal_summary?: string | null
  preferred_all_country?: boolean
  locality_type?: string | null
  work_schedule_text?: string | null
  work_status?: number | null
  candidate_salary_type_ids?: number[]
  photo_url?: string | null
  linkedin_url?: string | null
  candidate_notes?: string | null
  cv_storage_path?: string | null
}

type ContactRow = AdminContactRow & {
  linked_org_name: string | null
  localTags: string[]
  hasBrokenCv: boolean
  hasNoPhoneButEmail: boolean
  isPartialProfile: boolean
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
  { key: 'display_name', label: 'שם תצוגה' },
  { key: 'first_name', label: 'שם פרטי' },
  { key: 'last_name', label: 'שם משפחה' },
  { key: 'phone', label: 'נייד' },
  { key: 'second_phone', label: 'נייד נוסף' },
  { key: 'email', label: 'אימייל' },
  { key: 'second_email', label: 'אימייל נוסף' },
  { key: 'role', label: 'תפקיד' },
  { key: 'sub_role', label: 'תתי־תפקידים' },
  { key: 'professional_title', label: 'כותרת מקצועית' },
  { key: 'experience', label: 'ניסיון' },
  { key: 'academic_education', label: 'השכלה אקדמית' },
  { key: 'professional_courses', label: 'קורסים מקצועיים' },
  { key: 'additional_skills', label: 'מיומנויות נוספות' },
  { key: 'personal_summary', label: 'סיכום אישי' },
  { key: 'candidate_notes', label: 'הערות מועמד' },
  { key: 'notes', label: 'הערות CRM' },
  { key: 'ai_profile_summary', label: 'סיכום AI' },
  { key: 'region', label: 'אזור' },
  { key: 'city', label: 'עיר' },
  { key: 'preferred_regions', label: 'אזורים מועדפים' },
  { key: 'preferred_cities', label: 'ערים מועדפות' },
  { key: 'preferred_all_country', label: 'כל הארץ' },
  { key: 'locality_type', label: 'סוג יישוב' },
  { key: 'availability', label: 'זמינות' },
  { key: 'preferred_scope', label: 'היקף מועדף' },
  { key: 'languages', label: 'שפות' },
  { key: 'mobility', label: 'ניידות' },
  { key: 'work_status', label: 'סטטוס תעסוקתי' },
  { key: 'work_schedule', label: 'ימי ושעות עבודה' },
  { key: 'systems', label: 'מערכות' },
  { key: 'procedures', label: 'תחומי ניסיון' },
  { key: 'salary_types', label: 'סוגי שכר' },
  { key: 'salary_hourly', label: 'ציפיית שכר שעתי' },
  { key: 'salary_monthly', label: 'ציפיית שכר חודשית' },
  { key: 'gender', label: 'מגדר' },
  { key: 'birth_year', label: 'שנת לידה' },
  { key: 'tax_type', label: 'סוג מס' },
  { key: 'license_no', label: 'מספר רישיון' },
  { key: 'current_employer', label: 'מעסיק נוכחי' },
  { key: 'previous_employers', label: 'מעסיקים קודמים' },
  { key: 'profile_type', label: 'סוג פרופיל' },
  { key: 'source', label: 'מקור' },
  { key: 'check_status', label: 'סטטוס בדיקה' },
  { key: 'social_status', label: 'סטטוס חברתי' },
  { key: 'linked_org', label: 'ארגון מקושר' },
  { key: 'cv', label: 'קו"ח' },
  { key: 'cv_received', label: 'תאריך קבלת קו"ח' },
  { key: 'photo', label: 'תמונת פרופיל' },
  { key: 'facebook', label: 'פייסבוק' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'portfolio', label: 'תיק עבודות' },
  { key: 'recommendations', label: 'המלצות' },
  { key: 'next_follow_up', label: 'פולו־אפ הבא' },
  { key: 'whatsapp', label: 'תאריך שליחת WhatsApp' },
  { key: 'last_contact', label: 'קשר אחרון' },
  { key: 'applications_count', label: 'מספר הגשות' },
  { key: 'created', label: 'נוצר' },
  { key: 'updated', label: 'עודכן' },
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
  const [editDraft, setEditDraft] = useState<Partial<AdminContactRow>>({})
  const [savePending, setSavePending] = useState(false)
  const [refreshPending, setRefreshPending] = useState(false)
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
  const [mergeLoadPending, setMergeLoadPending] = useState(false)
  const [mergeRecords, setMergeRecords] = useState<AdminContactRow[]>([])

  const pageSize = 20

  type ContactsResult = { contacts: AdminContactRow[]; total: number }
  const {
    data: contactsResult,
    isLoading: contactsLoading,
    isFetching: contactsFetching,
    isError: contactsIsError,
    refetch: refetchContacts,
  } = useQuery<ContactsResult>({
    queryKey: ['contacts-v2', filters, page, sortBy, sortDir],
    queryFn: () => runContactsQuery(filters, page, pageSize, sortBy, sortDir),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
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

  const { data: regionOptions = [], isError: regionsIsError } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['dict_regions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_regions').select('id,name').order('name')
      if (error) throw error
      return data ?? []
    },
    staleTime: 5 * 60_000,
  })

  const { data: cityOptions = [], isError: citiesIsError } = useQuery<{ id: number; name: string; region_id: number | null }[]>({
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

  const { data: accountsList = [], isError: accountsIsError } = useQuery<{ account_id: number; account_name: string | null }[]>({
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

  const { data: languageDict = [], isError: languagesIsError } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['dict_languages'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_languages').select('id,name').order('name')
      if (error) throw error
      return data ?? []
    },
    staleTime: 600_000,
  })


  const { data: scopeDict = [], isError: scopesIsError } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['dict_scopes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_scopes').select('id,name').order('id')
      if (error) throw error
      return data ?? []
    },
    staleTime: 600_000,
  })

  const { data: genderDict = [], isError: gendersIsError } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['dict_genders'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_genders').select('id,name').order('id')
      if (error) throw error
      return data ?? []
    },
    staleTime: 600_000,
  })

  const { data: taxTypeDict = [], isError: taxTypesIsError } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['dict_tax_types'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_tax_types').select('id,name').order('id')
      if (error) throw error
      return data ?? []
    },
    staleTime: 600_000,
  })


  const { data: mobilityDict = [], isError: mobilityIsError } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['dict_mobility'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_mobility').select('id,name').order('id')
      if (error) throw error
      return data ?? []
    },
    staleTime: 600_000,
  })

  const { data: systemsDict = [], isError: systemsIsError } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['dict_systems'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_systems').select('id,name').order('name')
      if (error) throw error
      return data ?? []
    },
    staleTime: 600_000,
  })

  const { data: proceduresDict = [], isError: proceduresIsError } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['dict_procedures'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_procedures').select('id,name').order('name')
      if (error) throw error
      return data ?? []
    },
    staleTime: 600_000,
  })

  const { data: salaryTypeDict = [], isError: salaryTypesIsError } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['dict_salary_types'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_salary_types').select('id,name').order('id')
      if (error) throw error
      return data ?? []
    },
    staleTime: 600_000,
  })

  const { data: workStatusDict = [], isError: workStatusesIsError } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['dict_contact_work_statuses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_contact_work_statuses').select('id,name').order('id')
      if (error) throw error
      return data ?? []
    },
    staleTime: 600_000,
  })

  // Canonical tag dictionary (id-based) — same model as AdminCandidatesPage.
  const { data: candidateTagOptions = [], isError: tagsDictIsError } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['dict_candidate_tags'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_candidate_tags').select('id,name').eq('is_active', true).order('sort_order')
      if (error) throw error
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
  const namesFromIds = (ids: number[] | null | undefined, options: { id: number; name: string }[]): string => {
    if (!Array.isArray(ids) || ids.length === 0) return '—'
    const labels = ids.map((id) => options.find((option) => Number(option.id) === Number(id))?.name ?? 'לא זוהה')
    return labels.join(', ')
  }
  const subRoleNames = (ids: number[] | null | undefined) => namesFromIds(ids, DICT_SUB_ROLES)
  const languagesName = (ids: number[] | null | undefined) => namesFromIds(ids, languageDict)
  const scopeNames = (ids: number[] | null | undefined) => namesFromIds(ids, scopeDict)
  const genderName = (id: number | null | undefined) => genderDict.find((item) => item.id === Number(id))?.name ?? '—'
  const taxTypeName = (id: number | null | undefined) => taxTypeDict.find((item) => item.id === Number(id))?.name ?? '—'
  const mobilityName = (id: number | null | undefined) => mobilityDict.find((item) => item.id === Number(id))?.name ?? '—'
  const systemsNames = (ids: number[] | null | undefined) => namesFromIds(ids, systemsDict)
  const proceduresNames = (ids: number[] | null | undefined) => namesFromIds(ids, proceduresDict)
  const salaryTypeNames = (ids: number[] | null | undefined) => namesFromIds(ids, salaryTypeDict)
  const workStatusName = (id: number | null | undefined) => workStatusDict.find((item) => item.id === Number(id))?.name ?? '—'
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
    const rawPage = contactsResult?.contacts ?? []
    return rawPage.map((contact) => {
      const isDuplicateEmail = Boolean(contact.dup_email_flag)
      const hasBrokenCv = Boolean(contact.has_cv && (!contact.cv_link || !isValidUrl(contact.cv_link)))
      const hasNoPhoneButEmail = !contact.phone_norm && Boolean(contact.email)
      const isPartialProfile = !contact.role || !contact.city_id || !contact.region_id
      const hasWarning = hasBrokenCv || hasNoPhoneButEmail || isPartialProfile || isDuplicateEmail
      const isFollowUpDue = isDateDue(contact.next_follow_up)
      const isLinked = Boolean(contact.account_link)
      const linkState: 'linked' | 'unlinked' = isLinked ? 'linked' : 'unlinked'
      return {
        ...contact,
        linked_org_name: contact.account_link
          ? (accountNameById.get(Number(contact.account_link)) || contact.linked_org_name || null)
          : (contact.linked_org_name ?? null),
        localTags: [] as string[],
        hasBrokenCv,
        hasNoPhoneButEmail,
        isPartialProfile,
        isDuplicateEmail,
        hasWarning,
        isFollowUpDue,
        isLinked,
        linkState,
      }
    })
  }, [contactsResult, accountNameById])

  const handleSort = (key: string) => {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortBy(key); setSortDir('asc') }
    setPage(0)
  }


  const totalVisible = contactsResult?.total ?? 0
  const total = totalVisible
  const pageData = enrichedContacts
  const selectedContact = enrichedContacts.find((contact) => Number(contact.contact_id) === Number(selectedId)) ?? null

  const hasDictionaryError = regionsIsError || citiesIsError || accountsIsError || languagesIsError
    || scopesIsError || gendersIsError || taxTypesIsError || mobilityIsError || systemsIsError
    || proceduresIsError || salaryTypesIsError || workStatusesIsError || tagsDictIsError
  const tableError = contactsIsError
    ? 'שגיאה בטעינת אנשי הקשר. נסי לרענן את הרשימה.'
    : undefined

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
    setSelectedRows([])
  }, [filters])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(totalVisible / pageSize))
    if (page > totalPages - 1) setPage(totalPages - 1)
  }, [page, pageSize, totalVisible])

  useEffect(() => {
    if (!toast.open) return
    const timer = window.setTimeout(() => {
      setToast((prev) => ({ ...prev, open: false }))
    }, 2600)
    return () => window.clearTimeout(timer)
  }, [toast.open])

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

  const handleRefresh = async () => {
    setRefreshPending(true)
    try {
      const result = await refetchContacts()
      if (result.error) throw result.error
      showToast('הרשימה רועננה', 'success')
    } catch {
      showToast('שגיאה ברענון אנשי הקשר', 'error')
    } finally {
      setRefreshPending(false)
    }
  }

  const handleExport = async () => {
    try {
      setExportPending(true)
      const rowsToExport = selectedRows.length
        ? await fetchContactsByIds(selectedRows)
        : await fetchAllContacts(filters, sortBy, sortDir)

      const rows = rowsToExport.map((contact) => ({
        'שם מלא': contact.full_name ?? contact.display_name ?? '',
        טלפון: contact.phone_norm ?? contact.phone ?? '',
        אימייל: contact.email ?? '',
        תפקיד: roleName(contact.role),
        'תתי־תפקידים': subRoleNames(contact.sub_role),
        אזור: regionName(contact.region_id),
        עיר: cityName(contact.city_id),
        זמינות: availabilityNames(contact.candidate_availability_ids),
        'היקף מועדף': scopeNames(contact.preferred_scope),
        שפות: languagesName(contact.languages),
        מגדר: genderName(contact.gender),
        'סוג מס': taxTypeName(contact.tax_type_id),
        'קו"ח': contact.has_cv ? 'יש' : 'אין',
        'סוג פרופיל': profileTypeName(contact.profile_type),
        'ארגון מקושר': contact.account_link
          ? (accountNameById.get(Number(contact.account_link)) || contact.linked_org_name || '')
          : (contact.linked_org_name ?? ''),
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
      showToast(`הייצוא הושלם בהצלחה (${rowsToExport.length} רשומות)`, 'success')
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
      let patch: Record<string, unknown>
      if (bulkField === 'availability') {
        patch = { candidate_availability_ids: [Number(bulkValue)] }
      } else if (bulkField === 'role') {
        patch = { role: Number(bulkValue), sub_role: [] }
      } else if (bulkField === 'city_id') {
        const selectedCity = cityOptions.find((city) => Number(city.id) === Number(bulkValue))
        if (!selectedCity) throw new Error('העיר שנבחרה אינה קיימת במילון')
        patch = { city_id: selectedCity.id, region_id: selectedCity.region_id }
      } else if (bulkField === 'region_id') {
        patch = { region_id: Number(bulkValue), city_id: null }
      } else {
        patch = { [bulkField]: bulkValue }
      }

      const { error } = await bulkUpdateContacts(selectedRows, patch)
      if (error) throw error
      showToast(`${selectedRows.length} רשומות עודכנו בהצלחה`, 'success')
      setBulkUpdateOpen(false)
      setBulkField('')
      setBulkValue(null)
      setSelectedRows([])
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'שגיאה בעדכון הרשומות', 'error')
    } finally {
      setBulkPending(false)
    }
  }

  const openMergeDialog = async () => {
    if (selectedRows.length < 2) return
    setMergeLoadPending(true)
    try {
      const records = await fetchContactsByIds(selectedRows)
      if (records.length !== selectedRows.length) {
        throw new Error('לא ניתן לטעון את כל הרשומות שנבחרו למיזוג')
      }
      setMergeRecords(records)
      setMergeOpen(true)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'שגיאה בטעינת הרשומות למיזוג', 'error')
    } finally {
      setMergeLoadPending(false)
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
      setMergeRecords([])
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
      const { error } = await supabase
        .from('rel_contact_profiles')
        .upsert({ contact_id: contactId, profile_type_id: 1 })
      if (error) throw error
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
      sub_role: contact.sub_role ?? [],
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

  // Add a tag by its dictionary id. The legacy text column is NOT NULL, so both values are written.
  const handleAddTag = async (tagId: number) => {
    if (!selectedId || panelTags.some((tag) => tag.tag_id === tagId)) return
    const selectedTag = candidateTagOptions.find((tag) => tag.id === tagId)
    if (!selectedTag) {
      showToast('התגית שנבחרה אינה קיימת במילון', 'error')
      return
    }
    const { error } = await supabase.from('contact_tags').insert({
      contact_id: selectedId,
      tag_id: selectedTag.id,
      tag: selectedTag.name,
    })
    if (error) {
      showToast('שגיאה בהוספת התגית', 'error')
      return
    }
    await queryClient.invalidateQueries({ queryKey: ['contact_tags', selectedId] })
    setShowTagDropdown(false)
    showToast('התגית נוספה בהצלחה', 'success')
  }

  // Remove a tag by its contact_tags row id (works for id-based and legacy rows).
  const handleRemoveTag = async (rowId: number) => {
    const { error } = await supabase.from('contact_tags').delete().eq('id', rowId)
    if (error) {
      showToast('שגיאה בהסרת התגית', 'error')
      return
    }
    if (selectedId) await queryClient.invalidateQueries({ queryKey: ['contact_tags', selectedId] })
    showToast('התגית הוסרה', 'success')
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

  if (visibleColumns.includes('display_name')) {
    contactColumns.push({ key: 'display_name', label: 'שם תצוגה', minWidth: '180px', render: (contact) => <TruncatedCell value={contact.display_name} /> })
  }
  if (visibleColumns.includes('first_name')) {
    contactColumns.push({ key: 'first_name', label: 'שם פרטי', minWidth: '130px', render: (contact) => contact.first_name ?? '—' })
  }
  if (visibleColumns.includes('last_name')) {
    contactColumns.push({ key: 'last_name', label: 'שם משפחה', minWidth: '130px', render: (contact) => contact.last_name ?? '—' })
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

  if (visibleColumns.includes('second_phone')) {
    contactColumns.push({ key: 'second_phone', label: 'נייד נוסף', minWidth: '140px', nowrap: true, render: (contact) => contact.second_phone ? formatPhone(contact.second_phone) : '—' })
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

  if (visibleColumns.includes('second_email')) {
    contactColumns.push({ key: 'second_email', label: 'אימייל נוסף', minWidth: '220px', render: (contact) => <TruncatedCell value={contact.second_email} /> })
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

  if (visibleColumns.includes('sub_role')) {
    contactColumns.push({ key: 'sub_role', label: 'תתי־תפקידים', minWidth: '220px', render: (contact) => <TruncatedCell value={subRoleNames(contact.sub_role)} /> })
  }
  if (visibleColumns.includes('professional_title')) {
    contactColumns.push({ key: 'professional_title', label: 'כותרת מקצועית', minWidth: '180px', render: (contact) => <TruncatedCell value={contact.professional_title} /> })
  }
  if (visibleColumns.includes('experience')) {
    contactColumns.push({ key: 'experience', label: 'ניסיון', minWidth: '130px', render: (contact) => experienceName(contact.experience) })
  }
  if (visibleColumns.includes('academic_education')) {
    contactColumns.push({ key: 'academic_education', label: 'השכלה אקדמית', minWidth: '240px', render: (contact) => <TruncatedCell value={contact.academic_education} /> })
  }
  if (visibleColumns.includes('professional_courses')) {
    contactColumns.push({ key: 'professional_courses', label: 'קורסים מקצועיים', minWidth: '240px', render: (contact) => <TruncatedCell value={contact.professional_courses} /> })
  }
  if (visibleColumns.includes('additional_skills')) {
    contactColumns.push({ key: 'additional_skills', label: 'מיומנויות נוספות', minWidth: '240px', render: (contact) => <TruncatedCell value={contact.additional_skills_notes} /> })
  }
  if (visibleColumns.includes('personal_summary')) {
    contactColumns.push({ key: 'personal_summary', label: 'סיכום אישי', minWidth: '260px', render: (contact) => <TruncatedCell value={contact.personal_summary} /> })
  }
  if (visibleColumns.includes('candidate_notes')) {
    contactColumns.push({ key: 'candidate_notes', label: 'הערות מועמד', minWidth: '260px', render: (contact) => <TruncatedCell value={contact.candidate_notes} /> })
  }
  if (visibleColumns.includes('notes')) {
    contactColumns.push({ key: 'notes', label: 'הערות CRM', minWidth: '260px', render: (contact) => <TruncatedCell value={contact.notes} /> })
  }
  if (visibleColumns.includes('ai_profile_summary')) {
    contactColumns.push({ key: 'ai_profile_summary', label: 'סיכום AI', minWidth: '280px', render: (contact) => <TruncatedCell value={contact.ai_profile_summary} /> })
  }
  if (visibleColumns.includes('preferred_regions')) {
    contactColumns.push({ key: 'preferred_regions', label: 'אזורים מועדפים', minWidth: '220px', render: (contact) => <TruncatedCell value={formatIdsToNames(contact.preferred_regions, regionName)} /> })
  }
  if (visibleColumns.includes('preferred_cities')) {
    contactColumns.push({ key: 'preferred_cities', label: 'ערים מועדפות', minWidth: '240px', render: (contact) => <TruncatedCell value={formatIdsToNames(contact.preferred_cities, cityName)} /> })
  }
  if (visibleColumns.includes('preferred_all_country')) {
    contactColumns.push({ key: 'preferred_all_country', label: 'כל הארץ', minWidth: '100px', render: (contact) => contact.preferred_all_country ? 'כן' : 'לא' })
  }
  if (visibleColumns.includes('locality_type')) {
    contactColumns.push({ key: 'locality_type', label: 'סוג יישוב', minWidth: '130px', render: (contact) => contact.locality_type ?? '—' })
  }
  if (visibleColumns.includes('preferred_scope')) {
    contactColumns.push({ key: 'preferred_scope', label: 'היקף מועדף', minWidth: '180px', render: (contact) => <TruncatedCell value={scopeNames(contact.preferred_scope)} /> })
  }
  if (visibleColumns.includes('languages')) {
    contactColumns.push({ key: 'languages', label: 'שפות', minWidth: '200px', render: (contact) => <TruncatedCell value={languagesName(contact.languages)} /> })
  }
  if (visibleColumns.includes('mobility')) {
    contactColumns.push({ key: 'mobility', label: 'ניידות', minWidth: '130px', render: (contact) => mobilityName(contact.mobility_id) })
  }
  if (visibleColumns.includes('work_status')) {
    contactColumns.push({ key: 'work_status', label: 'סטטוס תעסוקתי', minWidth: '160px', render: (contact) => workStatusName(contact.work_status) })
  }
  if (visibleColumns.includes('work_schedule')) {
    contactColumns.push({ key: 'work_schedule', label: 'ימי ושעות עבודה', minWidth: '240px', render: (contact) => <TruncatedCell value={contact.work_schedule_text} /> })
  }
  if (visibleColumns.includes('systems')) {
    contactColumns.push({ key: 'systems', label: 'מערכות', minWidth: '220px', render: (contact) => <TruncatedCell value={systemsNames(contact.systems_used)} /> })
  }
  if (visibleColumns.includes('procedures')) {
    contactColumns.push({ key: 'procedures', label: 'תחומי ניסיון', minWidth: '240px', render: (contact) => <TruncatedCell value={proceduresNames(contact.procedures_experience)} /> })
  }
  if (visibleColumns.includes('salary_types')) {
    contactColumns.push({ key: 'salary_types', label: 'סוגי שכר', minWidth: '180px', render: (contact) => <TruncatedCell value={salaryTypeNames(contact.candidate_salary_type_ids)} /> })
  }
  if (visibleColumns.includes('salary_hourly')) {
    contactColumns.push({ key: 'salary_hourly', label: 'ציפיית שכר שעתי', minWidth: '150px', render: (contact) => formatCurrency(contact.salary_expectation_hourly) })
  }
  if (visibleColumns.includes('salary_monthly')) {
    contactColumns.push({ key: 'salary_monthly', label: 'ציפיית שכר חודשית', minWidth: '170px', render: (contact) => formatCurrency(contact.salary_expectation_monthly) })
  }
  if (visibleColumns.includes('gender')) {
    contactColumns.push({ key: 'gender', label: 'מגדר', minWidth: '100px', render: (contact) => genderName(contact.gender) })
  }
  if (visibleColumns.includes('birth_year')) {
    contactColumns.push({ key: 'birth_year', label: 'שנת לידה', minWidth: '110px', render: (contact) => contact.birth_year ?? '—' })
  }
  if (visibleColumns.includes('tax_type')) {
    contactColumns.push({ key: 'tax_type', label: 'סוג מס', minWidth: '150px', render: (contact) => taxTypeName(contact.tax_type_id) })
  }
  if (visibleColumns.includes('license_no')) {
    contactColumns.push({ key: 'license_no', label: 'מספר רישיון', minWidth: '140px', render: (contact) => contact.license_no ?? '—' })
  }
  if (visibleColumns.includes('current_employer')) {
    contactColumns.push({ key: 'current_employer', label: 'מעסיק נוכחי', minWidth: '180px', render: (contact) => <TruncatedCell value={contact.current_employer} /> })
  }
  if (visibleColumns.includes('previous_employers')) {
    contactColumns.push({ key: 'previous_employers', label: 'מעסיקים קודמים', minWidth: '260px', render: (contact) => <TruncatedCell value={formatJsonValue(contact.previous_employers)} /> })
  }
  if (visibleColumns.includes('source')) {
    contactColumns.push({ key: 'source', label: 'מקור', minWidth: '150px', render: (contact) => sourceName(contact.source) })
  }
  if (visibleColumns.includes('check_status')) {
    contactColumns.push({ key: 'check_status', label: 'סטטוס בדיקה', minWidth: '160px', render: (contact) => <CheckStatusBadge statusId={contact.check_status} label={checkStatusName(contact.check_status)} /> })
  }
  if (visibleColumns.includes('social_status')) {
    contactColumns.push({ key: 'social_status', label: 'סטטוס חברתי', minWidth: '190px', render: (contact) => <TruncatedCell value={socialStatusName(contact.social_status)} /> })
  }
  if (visibleColumns.includes('cv_received')) {
    contactColumns.push({ key: 'cv_received', label: 'תאריך קבלת קו"ח', minWidth: '150px', render: (contact) => formatDate(contact.cv_received_date) })
  }
  if (visibleColumns.includes('photo')) {
    contactColumns.push({ key: 'photo', label: 'תמונת פרופיל', minWidth: '130px', render: (contact) => <ExternalLinkCell href={contact.photo_url} label="פתיחת תמונה" /> })
  }
  if (visibleColumns.includes('facebook')) {
    contactColumns.push({ key: 'facebook', label: 'פייסבוק', minWidth: '200px', render: (contact) => <ExternalLinkCell href={contact.facebook_url} label={contact.facebook_name ?? (contact.facebook_id ? String(contact.facebook_id) : null)} /> })
  }
  if (visibleColumns.includes('linkedin')) {
    contactColumns.push({ key: 'linkedin', label: 'LinkedIn', minWidth: '160px', render: (contact) => <ExternalLinkCell href={contact.linkedin_url} label="פתיחת פרופיל" /> })
  }
  if (visibleColumns.includes('portfolio')) {
    contactColumns.push({ key: 'portfolio', label: 'תיק עבודות', minWidth: '150px', render: (contact) => <ExternalLinkCell href={contact.portfolio_url} label="פתיחת קישור" /> })
  }
  if (visibleColumns.includes('recommendations')) {
    contactColumns.push({ key: 'recommendations', label: 'המלצות', minWidth: '150px', render: (contact) => <ExternalLinkCell href={contact.recommendations_url} label="פתיחת קישור" /> })
  }
  if (visibleColumns.includes('next_follow_up')) {
    contactColumns.push({ key: 'next_follow_up', label: 'פולו־אפ הבא', minWidth: '130px', render: (contact) => formatDate(contact.next_follow_up) })
  }
  if (visibleColumns.includes('applications_count')) {
    contactColumns.push({ key: 'applications_count', label: 'מספר הגשות', minWidth: '120px', render: (contact) => String(contact.prev_applications_count ?? 0) })
  }
  if (visibleColumns.includes('created')) {
    contactColumns.push({ key: 'created', label: 'נוצר', minWidth: '130px', render: (contact) => formatDate(contact.created_timestamp) })
  }
  if (visibleColumns.includes('updated')) {
    contactColumns.push({ key: 'updated', label: 'עודכן', minWidth: '130px', render: (contact) => formatDate(contact.updated_timestamp) })
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
      if (contact.isDuplicateEmail) {
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
      subtitle={`מאגר האב של כל האנשים במערכת • ${contactsIsError ? 'שגיאה בטעינה' : contactsFetching ? 'טוען...' : `${totalVisible} תוצאות`}`}
      icon={Users}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <details className="relative">
            <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50">
              <Columns3 className="h-4 w-4" />
              בחירת עמודות
            </summary>
            <div className="absolute left-0 top-full z-30 mt-2 max-h-[70vh] w-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-md">
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
            onClick={handleRefresh}
            disabled={refreshPending}
          >
            {refreshPending ? 'מרענן...' : 'רענון'}
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
            {hasDictionaryError && (
              <div className="mb-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] font-semibold text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                חלק מנתוני המילונים לא נטענו. אנשי הקשר מוצגים, אך ייתכן שחלק מהשמות יוצגו כחסרים.
              </div>
            )}
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
              isLoading={contactsLoading || (contactsFetching && pageData.length === 0)}
              error={tableError}
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
                    <SmallActionButton onClick={openMergeDialog} disabled={mergeLoadPending}>
                      {mergeLoadPending ? 'טוען רשומות...' : 'מיזוג רשומות'}
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
                          label="סמארט מאץ׳ — לא מחובר"
                          onClick={() => undefined}
                          disabled
                        />
                        <QuickActionButton
                          icon={<Tag className="h-4 w-4" />}
                          label="תגיות"
                          onClick={() => {
                            setShowTagDropdown(true)
                            window.requestAnimationFrame(() => {
                              document.getElementById('contact-tags-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            })
                          }}
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
                <div id="contact-tags-section"><AdminPanelSection title="תגיות">
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
                </AdminPanelSection></div>

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
                  <AdminPanelField label="פייסבוק" mode={isEditing ? 'edit' : 'view'} viewValue={<ExternalLinkCell href={selectedContact.facebook_url} label={selectedContact.facebook_name ?? (selectedContact.facebook_id ? String(selectedContact.facebook_id) : null)} />} />
                  <AdminPanelField label="LinkedIn" mode={isEditing ? 'edit' : 'view'} viewValue={<ExternalLinkCell href={selectedContact.linkedin_url} label="פתיחת פרופיל" />} />
                  <AdminPanelField label="תיק עבודות" mode={isEditing ? 'edit' : 'view'} viewValue={<ExternalLinkCell href={selectedContact.portfolio_url} label="פתיחת קישור" />} />
                  <AdminPanelField label="המלצות" mode={isEditing ? 'edit' : 'view'} viewValue={<ExternalLinkCell href={selectedContact.recommendations_url} label="פתיחת קישור" />} />
                  <AdminPanelField label="סטטוס חברתי" mode={isEditing ? 'edit' : 'view'} viewValue={socialStatusName(selectedContact.social_status)} />
                  <AdminPanelField label="מפתח עסקי" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.phone_norm} />
                </AdminPanelSection>

                <AdminPanelSection title="פרטים מקצועיים">
                  {isEditing ? (
                    <div className="sm:col-span-2">
                      <RoleSubRolePicker
                        variant="edit"
                        roleId={editDraft.role ?? null}
                        subRoleIds={editDraft.sub_role ?? []}
                        roles={roleOptions}
                        subRoles={DICT_SUB_ROLES}
                        onRoleChange={(roleId) => setEditDraft((draft) => ({ ...draft, role: roleId, sub_role: [] }))}
                        onSubRoleChange={(subRoleIds) => setEditDraft((draft) => ({ ...draft, sub_role: subRoleIds }))}
                      />
                    </div>
                  ) : (
                    <>
                      <AdminPanelField
                        label="תפקיד"
                        mode="view"
                        viewValue={<RoleBadge label={roleName(selectedContact.role)} roleId={Number(selectedContact.role)} />}
                      />
                      <AdminPanelField label="תת־תפקיד" mode="view" viewValue={subRoleNames(selectedContact.sub_role)} />
                    </>
                  )}
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
                  <AdminPanelField label="היקף מועדף" mode={isEditing ? 'edit' : 'view'} viewValue={scopeNames(selectedContact.preferred_scope)} />
                  <AdminPanelField label="שפות" mode={isEditing ? 'edit' : 'view'} viewValue={languagesName(selectedContact.languages)} />
                  <AdminPanelField label="מעסיק נוכחי" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.current_employer} />
                  <AdminPanelField label="ציפיית שכר שעתי" mode={isEditing ? 'edit' : 'view'} viewValue={formatCurrency(selectedContact.salary_expectation_hourly)} />
                  <AdminPanelField label="ציפיית שכר חודשית" mode={isEditing ? 'edit' : 'view'} viewValue={formatCurrency(selectedContact.salary_expectation_monthly)} />
                  <AdminPanelField label="סוג מס" mode={isEditing ? 'edit' : 'view'} viewValue={taxTypeName(selectedContact.tax_type_id)} />
                </AdminPanelSection>

                <AdminPanelSection title="מידע מקצועי נוסף">
                  <AdminPanelField label="השכלה אקדמית" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.academic_education} fullWidth />
                  <AdminPanelField label="קורסים מקצועיים" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.professional_courses} fullWidth />
                  <AdminPanelField label="מיומנויות נוספות" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.additional_skills_notes} fullWidth />
                  <AdminPanelField label="מערכות" mode={isEditing ? 'edit' : 'view'} viewValue={systemsNames(selectedContact.systems_used)} />
                  <AdminPanelField label="תחומי ניסיון" mode={isEditing ? 'edit' : 'view'} viewValue={proceduresNames(selectedContact.procedures_experience)} />
                  <AdminPanelField label="ניידות" mode={isEditing ? 'edit' : 'view'} viewValue={mobilityName(selectedContact.mobility_id)} />
                  <AdminPanelField label="סטטוס תעסוקתי" mode={isEditing ? 'edit' : 'view'} viewValue={workStatusName(selectedContact.work_status)} />
                  <AdminPanelField label="סוגי שכר" mode={isEditing ? 'edit' : 'view'} viewValue={salaryTypeNames(selectedContact.candidate_salary_type_ids)} />
                  <AdminPanelField label="ימי ושעות עבודה" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.work_schedule_text} fullWidth />
                  <AdminPanelField label="סיכום אישי" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.personal_summary} fullWidth />
                  <AdminPanelField label="הערות מועמד" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.candidate_notes} fullWidth />
                  <AdminPanelField label="מעסיקים קודמים" mode={isEditing ? 'edit' : 'view'} viewValue={formatJsonValue(selectedContact.previous_employers)} fullWidth />
                </AdminPanelSection>

                <AdminPanelSection title="מיקום והעדפות">
                  {isEditing ? (
                    <div className="sm:col-span-2">
                      <CityRegionPicker
                        variant="edit"
                        cityId={editDraft.city_id ?? null}
                        regionId={editDraft.region_id ?? null}
                        cities={cityOptions}
                        regions={regionOptions}
                        onRegionChange={(regionId) => setEditDraft((draft) => ({
                          ...draft,
                          region_id: regionId,
                          city_id: regionId === draft.region_id ? draft.city_id : null,
                        }))}
                        onCityChange={(cityId) => {
                          const city = cityOptions.find((option) => Number(option.id) === Number(cityId))
                          setEditDraft((draft) => ({
                            ...draft,
                            city_id: cityId,
                            region_id: city?.region_id ?? draft.region_id ?? null,
                          }))
                        }}
                      />
                    </div>
                  ) : (
                    <>
                      <AdminPanelField
                        label="אזור"
                        mode="view"
                        viewValue={<RegionBadge regionId={selectedContact.region_id} label={regionName(selectedContact.region_id)} />}
                      />
                      <AdminPanelField label="עיר" mode="view" viewValue={cityName(selectedContact.city_id)} />
                    </>
                  )}
                  <AdminPanelField label="אזורים מועדפים" mode={isEditing ? 'edit' : 'view'} viewValue={formatIdsToNames(selectedContact.preferred_regions, regionName)} />
                  <AdminPanelField label="ערים מועדפות" mode={isEditing ? 'edit' : 'view'} viewValue={formatIdsToNames(selectedContact.preferred_cities, cityName)} />
                  <AdminPanelField label="מועדף כל הארץ" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.preferred_all_country ? 'כן' : 'לא'} />
                  <AdminPanelField label="סוג יישוב" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.locality_type} />
                  <AdminPanelField label="שנת לידה" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.birth_year ? String(selectedContact.birth_year) : null} />
                  <AdminPanelField label="מגדר" mode={isEditing ? 'edit' : 'view'} viewValue={genderName(selectedContact.gender)} />
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
                    {selectedContact.cv_storage_path && (
                      <MetaLine label={'נתיב אחסון קו"ח'} value={selectedContact.cv_storage_path} />
                    )}
                    {selectedContact.photo_url && (
                      <MetaLine label="תמונת פרופיל" value={selectedContact.photo_url} />
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
                    viewValue={<CheckStatusBadge statusId={selectedContact.check_status} label={checkStatusName(selectedContact.check_status)} />}
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
        {mergeOpen && mergeRecords.length >= 2 && (
          <MergeRecordsModal
            records={mergeRecords as unknown as Record<string, unknown>[]}
            idField="contact_id"
            nameField="full_name"
            displayFields={[
              { key: 'full_name' as never, label: 'שם מלא' },
              { key: 'phone' as never, label: 'נייד', format: (value) => value ? formatPhone(String(value)) : '—' },
              { key: 'email' as never, label: 'מייל' },
              { key: 'role' as never, label: 'תפקיד', format: (value) => roleName(value as number) },
              { key: 'candidate_availability_ids' as never, label: 'זמינות', format: (value) => availabilityNames(value as number[]) },
              { key: 'region_id' as never, label: 'אזור', format: (value) => regionName(value as number) },
              { key: 'city_id' as never, label: 'עיר', format: (value) => cityName(value as number) },
              { key: 'notes' as never, label: 'הערות' },
            ]}
            onConfirm={handleMerge}
            onClose={() => { setMergeOpen(false); setMergePrimaryId(null); setMergeRecords([]) }}
            pending={mergePending}
            title="מיזוג אנשי קשר"
          />
        )}


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
  disabled,
}: {
  children: React.ReactNode
  onClick: () => void
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

function CheckStatusBadge({ statusId, label }: { statusId: number | null | undefined; label: string }) {
  const classes = Number(statusId) === 2
    ? 'bg-red-50 text-red-700'
    : Number(statusId) === 3
      ? 'bg-green-50 text-green-700'
      : Number(statusId) === 4
        ? 'bg-sky-50 text-sky-700'
        : 'bg-amber-50 text-amber-700'

  return <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-[12px] font-semibold ${classes}`}>{label}</span>
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

function TruncatedCell({ value }: { value?: string | number | null }) {
  const text = value == null || value === '' ? '—' : String(value)
  return <span className="block max-w-[260px] truncate" title={text === '—' ? undefined : text}>{text}</span>
}

function ExternalLinkCell({ href, label }: { href?: string | null; label?: string | null }) {
  if (!href) return <span className="text-slate-400">—</span>
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={(event) => event.stopPropagation()}
      className="font-semibold text-[#008080] hover:underline"
    >
      {label || 'פתיחת קישור'}
    </a>
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
  disabled,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
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

function formatJsonValue(value: Record<string, unknown> | null | undefined): string {
  if (!value || Object.keys(value).length === 0) return '—'
  try {
    return JSON.stringify(value)
  } catch {
    return '—'
  }
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
    if (!tagContactIds.length) return { contacts: [] as AdminContactRow[], total: 0 }
  }

  let query = sb.from('contact').select('*', { count: 'exact' })

  if (filters.search?.trim()) {
    const rawSearch = filters.search.trim()
    const q = sanitizePostgrestSearch(rawSearch)
    const phoneCore = phoneSearchTerm(rawSearch)
    const { data: matchingAccounts, error: matchingAccountsError } = await sb
      .from('accounts')
      .select('account_id')
      .ilike('account_name', `%${rawSearch}%`)
      .limit(200)
    if (matchingAccountsError) throw matchingAccountsError

    const accountIds = (matchingAccounts ?? [])
      .map((account: { account_id: number }) => Number(account.account_id))
      .filter(Number.isFinite)

    const conditions = [
      `full_name.ilike.%${q}%`,
      `display_name.ilike.%${q}%`,
      `email.ilike.%${q}%`,
      `linked_org_name.ilike.%${q}%`,
      `phone.ilike.%${q}%`,
    ]
    if (phoneCore) conditions.push(`phone_norm.ilike.%${phoneCore}%`)
    if (accountIds.length) conditions.push(`account_link.in.(${accountIds.join(',')})`)
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

  query = query.range(page * pageSize, (page + 1) * pageSize - 1)

  const { data, count, error } = await query
  if (error) throw error
  return { contacts: (data ?? []) as AdminContactRow[], total: count ?? 0 }
}

async function fetchAllContacts(
  filters: ExtendedFilters,
  sortBy: string | null,
  sortDir: 'asc' | 'desc',
): Promise<AdminContactRow[]> {
  const batchSize = 1000
  const rows: AdminContactRow[] = []
  let page = 0

  while (true) {
    const result = await runContactsQuery(filters, page, batchSize, sortBy, sortDir)
    rows.push(...result.contacts)
    if (result.contacts.length < batchSize || rows.length >= result.total) break
    page += 1
  }

  return rows
}

async function fetchContactsByIds(ids: number[]): Promise<AdminContactRow[]> {
  if (!ids.length) return []
  const uniqueIds = Array.from(new Set(ids.map(Number).filter(Number.isFinite)))
  const rows: AdminContactRow[] = []
  const batchSize = 500

  for (let index = 0; index < uniqueIds.length; index += batchSize) {
    const batch = uniqueIds.slice(index, index + batchSize)
    const { data, error } = await supabase.from('contact').select('*').in('contact_id', batch)
    if (error) throw error
    rows.push(...((data ?? []) as AdminContactRow[]))
  }

  const byId = new Map(rows.map((row) => [Number(row.contact_id), row]))
  return uniqueIds.map((id) => byId.get(id)).filter((row): row is AdminContactRow => Boolean(row))
}

function sanitizePostgrestSearch(value: string): string {
  return value.replace(/[,%(){}\[\]"'\\:]/g, ' ').replace(/\s+/g, ' ').trim()
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


