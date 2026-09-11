import React, { useEffect, useMemo, useRef, useState } from 'react'
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
  StatusPill,
} from '@/components/layout/Shell'
import {
  DELIVERY_OUTCOME_ORDER, DELIVERY_OUTCOMES, OUTCOME_STATUS_CODES,
  getOutcomeMeta, outcomeOfRecord, type DeliveryOutcome,
} from '@/lib/fixPublications/deliveryOutcome'
import { formatPhone, normalizePhone, phoneSearchTerm, whatsappLink } from '@/lib/normalizePhone'
import { openApplicationCv } from '@/lib/cv'
import { CityRegionPicker } from '@/components/ui/CityRegionPicker'
import SidePanel from '@/components/ui/SidePanel'
import { RoleSubRolePicker } from '@/components/ui/RoleSubRolePicker'
import { DictionaryMultiSelect } from '@/components/ui/DictionaryMultiSelect'
import { getRoleColor } from '@/lib/roleColors'
import { getRegionColor } from '@/lib/regionColors'
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
  role_ids?: number[]
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
  gender?: number
  language_ids?: number[]
  preferred_scope_ids?: number[]
  mobility_id?: number
  tax_type_id?: number
  work_status?: number
  preferred_region_ids?: number[]
  preferred_city_ids?: number[]
  partial_profile?: 'yes'
  link_state?: 'linked' | 'unlinked'
  tags?: string
  follow_up_due?: 'yes' | 'no'
  /** מצב שליחת WhatsApp — הדלי מ-deliveryOutcome, לא קוד סטטוס גולמי */
  whatsapp_outcome?: DeliveryOutcome
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

type DictItem = { id: number; name: string }
type SubRoleItem = DictItem & { role_id: number | null }
type RoleAliasItem = {
  role_id: number
  alias: string
  normalized_alias: string | null
  match_mode: string | null
  priority: number | null
}

type KpiRoleDefinition = {
  key: string
  label: string
  roleIds: number[]
  colorRoleId: number
}

type KpiRoleCard = KpiRoleDefinition & {
  value: number
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
  | 'sub_role'
  | 'preferred_scope'
  | 'languages'
  | 'gender'
  | 'tax_type'
  | 'facebook_id'
  | 'candidate_availability_ids'
  | 'systems_used'
  | 'procedures_experience'
  | 'preferred_regions'
  | 'preferred_cities'
> & {
  sub_role: number[] | null
  preferred_scope: number[] | null
  languages: number[] | null
  gender: number | null
  tax_type_id: number | null
  facebook_id: number | null
  candidate_availability_ids: number[] | null
  systems_used: number[] | null
  procedures_experience: number[] | null
  preferred_regions: number[] | null
  preferred_cities: number[] | null
  additional_skills_notes?: string | null
  academic_education?: string | null
  professional_courses?: string | null
  portfolio_url?: string | null
  recommendations_url?: string | null
  personal_summary?: string | null
  preferred_all_country: boolean | null
  locality_type?: string | null
  work_schedule_text?: string | null
  work_status?: number | null
  candidate_salary_type_ids: number[] | null
  photo_url?: string | null
  linkedin_url?: string | null
  candidate_notes?: string | null
  cv_storage_path?: string | null
  profile_token?: string | null
}

type ContactRow = AdminContactRow & {
  linked_org_name: string | null
  localTags: string[]
  profileTypeIds: number[]
  hasCvRecord: boolean
  hasCvFile: boolean
  hasBrokenCv: boolean
  hasNoPhoneButEmail: boolean
  partialProfileMissing: string[]
  isPartialProfile: boolean
  isDuplicateEmail: boolean
  hasWarning: boolean
  isFollowUpDue: boolean
  isLinked: boolean
  linkState: 'linked' | 'unlinked'
}

type PageTagRow = { contact_id: number; tag: string | null; tag_id: number | null }
type PageProfileRow = { contact_id: number; profile_type_id: number }
type BulkArrayMode = 'replace' | 'add'

const KPI_ROLE_BLUEPRINTS: Array<KpiRoleDefinition & { preferredNames: string[] }> = [
  { key: 'doctor', label: 'רופאי שיניים', roleIds: [1], colorRoleId: 1, preferredNames: ['רופא שיניים', 'רופא/ה שיניים'] },
  { key: 'experts', label: 'מומחים', roleIds: [2, 3, 4, 5, 6, 7, 8], colorRoleId: 2, preferredNames: ['מומחה'] },
  { key: 'assistant', label: 'סייעות', roleIds: [9], colorRoleId: 9, preferredNames: ['סייעת רופא שיניים', 'סייעת שיניים', 'סייעת'] },
  { key: 'hygienist', label: 'שינניות', roleIds: [10], colorRoleId: 10, preferredNames: ['שיננית', 'שינניות'] },
  { key: 'technician', label: 'טכנאים', roleIds: [11], colorRoleId: 11, preferredNames: ['טכנאי/ית שיניים', 'טכנאי שיניים', 'טכנאית שיניים', 'טכנאים'] },
  { key: 'secretary', label: 'מזכירות', roleIds: [13], colorRoleId: 13, preferredNames: ['מזכירה דנטלית', 'מזכירות', 'מזכירה'] },
  { key: 'manager', label: 'ניהול / גיוס', roleIds: [12, 14, 15, 16, 17, 18], colorRoleId: 12, preferredNames: ['מנהל/ת דנטלי', 'ניהול מרפאה', 'מכירות', 'רכש דנטלי', 'צילום דנטלי'] },
]

// סדר גיאוגרפי קבוע מצפון לדרום. אזור ארצי מוצג בסוף.
const REGION_DISPLAY_ORDER = [12, 10, 11, 8, 9, 13, 7, 4, 15, 1, 6, 14, 5, 2, 3, 16] as const
const REGION_DISPLAY_INDEX = new Map<number, number>(
  REGION_DISPLAY_ORDER.map((regionId, index) => [regionId, index]),
)

const contact360Path = (contactId: number | string) => `/admin/contacts/${contactId}`
const createContactPath = '/admin/contacts/new'
const account360Path = (accountId: number | string) => `/admin/accounts/${accountId}`

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
  { key: 'whatsapp_status', label: 'מצב שליחת WhatsApp' },
  { key: 'last_contact', label: 'קשר אחרון' },
  { key: 'applications_count', label: 'מספר הגשות' },
  { key: 'created', label: 'נוצר' },
  { key: 'updated', label: 'עודכן' },
  { key: 'tags', label: 'תגיות' },
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

const VISIBLE_COLUMNS_STORAGE_KEY = 'alldent.adminContacts.visibleColumns.v1'
const VIEW_STATE_STORAGE_KEY = 'alldent.adminContacts.viewState.v1'
const ALL_COLUMN_KEYS = new Set<string>(ALL_COLUMNS.map((column) => column.key))

const CONTACT_ARRAY_FIELDS = new Set([
  'sub_role',
  'preferred_scope',
  'languages',
  'candidate_availability_ids',
  'candidate_salary_type_ids',
  'systems_used',
  'procedures_experience',
  'preferred_regions',
  'preferred_cities',
])

const CONTACT_NUMBER_FIELDS = new Set([
  'gender',
  'birth_year',
  'role',
  'experience',
  'mobility_id',
  'tax_type_id',
  'work_status',
  'source',
  'check_status',
  'social_status',
  'account_link',
  'salary_expectation_hourly',
  'salary_expectation_monthly',
  'city_id',
  'region_id',
])

const CONTACT_BOOLEAN_FIELDS = new Set(['preferred_all_country'])

// INC-3144 — כל שדה שנערך בפאנל חייב להופיע כאן, אחרת buildChangedContactPatch
// משמיט אותו בשקט והמסך מודיע "נשמר" בלי שדבר הגיע ל-Supabase.
const EDITABLE_CONTACT_FIELDS = [
  'display_name', 'first_name', 'last_name', 'full_name', 'phone', 'second_phone', 'email', 'second_email',
  'gender', 'birth_year', 'role', 'sub_role', 'professional_title', 'experience', 'license_no',
  'academic_education', 'professional_courses', 'systems_used', 'procedures_experience', 'additional_skills_notes',
  'preferred_scope', 'candidate_availability_ids', 'candidate_salary_type_ids', 'salary_expectation_hourly',
  'salary_expectation_monthly', 'mobility_id', 'preferred_regions', 'preferred_cities', 'preferred_all_country',
  'locality_type', 'work_schedule_text', 'work_status', 'languages', 'account_link', 'linkedin_url',
  'facebook_url', 'facebook_name', 'portfolio_url', 'recommendations_url', 'photo_url', 'personal_summary',
  'candidate_notes', 'notes', 'current_employer', 'source', 'check_status', 'social_status', 'next_follow_up',
  'cv_link', 'cv_received_date', 'city_id', 'region_id', 'tax_type_id',
] as const

type EditableContactField = (typeof EDITABLE_CONTACT_FIELDS)[number]

type StoredContactsViewState = {
  filters?: ExtendedFilters
  sortBy?: string | null
  sortDir?: 'asc' | 'desc'
}

function loadStoredVisibleColumns(): string[] {
  if (typeof window === 'undefined') return [...DEFAULT_COLUMNS]
  try {
    const parsed = JSON.parse(window.localStorage.getItem(VISIBLE_COLUMNS_STORAGE_KEY) ?? 'null')
    if (!Array.isArray(parsed)) return [...DEFAULT_COLUMNS]
    const valid = parsed.filter((key): key is string => typeof key === 'string' && ALL_COLUMN_KEYS.has(key))
    return valid.length ? valid : [...DEFAULT_COLUMNS]
  } catch {
    return [...DEFAULT_COLUMNS]
  }
}

function loadStoredViewState(): StoredContactsViewState {
  if (typeof window === 'undefined') return {}
  try {
    const parsed = JSON.parse(window.localStorage.getItem(VIEW_STATE_STORAGE_KEY) ?? '{}')
    return parsed && typeof parsed === 'object' ? parsed as StoredContactsViewState : {}
  } catch {
    return {}
  }
}

const panelInputClass =
  'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-medium text-[#0F172A] outline-none transition focus:border-[#008080] focus:ring-2 focus:ring-[#008080]/10'

export default function AdminContactsPage() {
  const { updateContact, bulkUpdateContacts } = useContactMutations()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<ExtendedFilters>(() => loadStoredViewState().filters ?? {})
  const [page, setPage] = useState(0)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedRows, setSelectedRows] = useState<number[]>([])
  const [toast, setToast] = useState<ToastState>({ open: false, message: '', tone: 'info' })
  const [exportPending, setExportPending] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<string[]>(loadStoredVisibleColumns)
  const [sortBy, setSortBy] = useState<string | null>(() => loadStoredViewState().sortBy ?? null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(() => loadStoredViewState().sortDir ?? 'asc')
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editDraft, setEditDraft] = useState<Partial<AdminContactRow>>({})
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})
  const [savePending, setSavePending] = useState(false)
  const [refreshPending, setRefreshPending] = useState(false)
  const [panelTags, setPanelTags] = useState<PanelTag[]>([])
  const [showTagDropdown, setShowTagDropdown] = useState(false)
  const [candidatePendingIds, setCandidatePendingIds] = useState<number[]>([])
  const pendingCompatibleSubRolesRef = useRef<number[] | null>(null)

  // Bulk update
  const [bulkUpdateOpen, setBulkUpdateOpen] = useState(false)
  const [bulkField, setBulkField] = useState('')
  const [bulkValue, setBulkValue] = useState<string | number | null>(null)
  const [bulkArrayValues, setBulkArrayValues] = useState<number[]>([])
  const [bulkArrayMode, setBulkArrayMode] = useState<BulkArrayMode>('replace')
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

  const { data: roleOptions = [], isLoading: rolesLoading, isError: rolesIsError } = useQuery<DictItem[]>({
    queryKey: ['dict_roles'],
    queryFn: () => fetchDictionary('dict_roles', 'id'),
    staleTime: 600_000,
  })

  const { data: subRoleOptions = [], isLoading: subRolesLoading, isError: subRolesIsError } = useQuery<SubRoleItem[]>({
    queryKey: ['dict_sub_roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_sub_roles').select('id,name,role_id').order('id')
      if (error) throw error
      return (data ?? []) as SubRoleItem[]
    },
    staleTime: 600_000,
  })

  const { data: roleAliases = [], isLoading: roleAliasesLoading, isError: roleAliasesIsError } = useQuery<RoleAliasItem[]>({
    queryKey: ['dict_role_aliases-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dict_role_aliases')
        .select('role_id,alias,normalized_alias,match_mode,priority')
        .eq('is_active', true)
        .order('priority', { ascending: false })
      if (error) throw error
      return (data ?? []) as RoleAliasItem[]
    },
    staleTime: 600_000,
  })

  const { data: availabilityOptions = [], isLoading: availabilityLoading, isError: availabilityIsError } = useQuery<DictItem[]>({
    queryKey: ['dict_availability'],
    queryFn: () => fetchDictionary('dict_availability', 'id'),
    staleTime: 600_000,
  })

  const { data: experienceOptions = [], isLoading: experienceLoading, isError: experienceIsError } = useQuery<DictItem[]>({
    queryKey: ['dict_experience'],
    queryFn: () => fetchDictionary('dict_experience', 'id'),
    staleTime: 600_000,
  })

  const { data: sourceOptions = [], isLoading: sourcesLoading, isError: sourcesIsError } = useQuery<DictItem[]>({
    queryKey: ['dict_sources'],
    queryFn: () => fetchDictionary('dict_sources', 'id'),
    staleTime: 600_000,
  })

  const { data: checkStatusOptions = [], isLoading: checkStatusesLoading, isError: checkStatusesIsError } = useQuery<DictItem[]>({
    queryKey: ['dict_check_statuses'],
    queryFn: () => fetchDictionary('dict_check_statuses', 'id'),
    staleTime: 600_000,
  })

  const { data: socialStatusOptions = [], isLoading: socialStatusesLoading, isError: socialStatusesIsError } = useQuery<DictItem[]>({
    queryKey: ['dict_social_statuses'],
    queryFn: () => fetchDictionary('dict_social_statuses', 'id'),
    staleTime: 600_000,
  })

  const { data: profileTypeOptions = [], isLoading: profileTypesLoading, isError: profileTypesIsError } = useQuery<DictItem[]>({
    queryKey: ['dict_profile_types'],
    queryFn: () => fetchDictionary('dict_profile_types', 'id'),
    staleTime: 600_000,
  })

  const roleGroups = useMemo(
    () => buildKpiRoleGroups(roleOptions, roleAliases),
    [roleOptions, roleAliases],
  )

  const {
    data: roleGroupCounts,
    isLoading: roleCountsLoading,
    isError: roleCountsIsError,
  } = useQuery<Record<string, number>>({
    queryKey: ['contacts-role-group-counts', roleGroups.map((group) => [group.key, group.roleIds])],
    queryFn: () => fetchRoleGroupCounts(roleGroups),
    enabled: roleGroups.length > 0,
    staleTime: 120_000,
  })

  const selectedRoleIdsForRegions = useMemo(() => {
    if (filters.role_ids?.length) return normalizeNumberArray(filters.role_ids)
    if (filters.role) return [Number(filters.role)]
    return []
  }, [filters.role, filters.role_ids])

  const {
    data: regionCounts,
    isLoading: regionCountsLoading,
    isError: regionCountsIsError,
  } = useQuery<Record<number, number>>({
    queryKey: ['contacts-region-counts-by-role', selectedRoleIdsForRegions],
    queryFn: () => fetchRegionCountsForRoles(selectedRoleIdsForRegions),
    enabled: selectedRoleIdsForRegions.length > 0,
    staleTime: 120_000,
  })

  const { data: regionOptions = [], isLoading: regionsLoading, isError: regionsIsError } = useQuery<DictItem[]>({
    queryKey: ['dict_regions'],
    queryFn: () => fetchDictionary('dict_regions', 'name'),
    staleTime: 5 * 60_000,
  })

  const { data: cityOptions = [], isLoading: citiesLoading, isError: citiesIsError } = useQuery<{ id: number; name: string; region_id: number | null }[]>({
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

  const { data: accountsList = [], isLoading: accountsLoading, isError: accountsIsError } = useQuery<{ account_id: number; account_name: string | null }[]>({
    queryKey: ['accounts_names'],
    queryFn: async () => {
      const rows: { account_id: number; account_name: string | null }[] = []
      const batchSize = 1000
      let from = 0
      while (true) {
        const { data, error } = await supabase
          .from('accounts')
          .select('account_id,account_name')
          .order('account_name')
          .range(from, from + batchSize - 1)
        if (error) throw error
        const batch = (data ?? []) as { account_id: number; account_name: string | null }[]
        rows.push(...batch)
        if (batch.length < batchSize) break
        from += batchSize
      }
      return rows
    },
    staleTime: 60_000,
  })

  const { data: languageDict = [], isLoading: languagesLoading, isError: languagesIsError } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['dict_languages'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_languages').select('id,name').order('name')
      if (error) throw error
      return data ?? []
    },
    staleTime: 600_000,
  })


  const { data: scopeDict = [], isLoading: scopesLoading, isError: scopesIsError } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['dict_scopes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_scopes').select('id,name').order('id')
      if (error) throw error
      return data ?? []
    },
    staleTime: 600_000,
  })

  const { data: genderDict = [], isLoading: gendersLoading, isError: gendersIsError } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['dict_genders'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_genders').select('id,name').order('id')
      if (error) throw error
      return data ?? []
    },
    staleTime: 600_000,
  })

  const { data: taxTypeDict = [], isLoading: taxTypesLoading, isError: taxTypesIsError } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['dict_tax_types'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_tax_types').select('id,name').order('id')
      if (error) throw error
      return data ?? []
    },
    staleTime: 600_000,
  })


  const { data: mobilityDict = [], isLoading: mobilityLoading, isError: mobilityIsError } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['dict_mobility'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_mobility').select('id,name').order('id')
      if (error) throw error
      return data ?? []
    },
    staleTime: 600_000,
  })

  const { data: systemsDict = [], isLoading: systemsLoading, isError: systemsIsError } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['dict_systems'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_systems').select('id,name').order('name')
      if (error) throw error
      return data ?? []
    },
    staleTime: 600_000,
  })

  const { data: proceduresDict = [], isLoading: proceduresLoading, isError: proceduresIsError } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['dict_procedures'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_procedures').select('id,name').order('name')
      if (error) throw error
      return data ?? []
    },
    staleTime: 600_000,
  })

  const { data: salaryTypeDict = [], isLoading: salaryTypesLoading, isError: salaryTypesIsError } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['dict_salary_types'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_salary_types').select('id,name').order('id')
      if (error) throw error
      return data ?? []
    },
    staleTime: 600_000,
  })

  const { data: workStatusDict = [], isLoading: workStatusesLoading, isError: workStatusesIsError } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['dict_contact_work_statuses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_contact_work_statuses').select('id,name').order('id')
      if (error) throw error
      return data ?? []
    },
    staleTime: 600_000,
  })

  // Canonical tag dictionary (id-based) — same model as AdminCandidatesPage.
  const { data: candidateTagOptions = [], isLoading: tagsDictLoading, isError: tagsDictIsError } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['dict_candidate_tags'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_candidate_tags').select('id,name').eq('is_active', true).order('sort_order')
      if (error) throw error
      return data ?? []
    },
    staleTime: 600_000,
  })

  const {
    data: contactTagsData = [],
    isLoading: contactTagsLoading,
    isError: contactTagsIsError,
  } = useQuery<{ id: number; contact_id: number; tag: string | null; tag_id: number | null }[]>({
    queryKey: ['contact_tags', selectedId],
    queryFn: async () => {
      if (!selectedId) return []
      const { data, error } = await supabase.from('contact_tags').select('id,contact_id,tag,tag_id').eq('contact_id', selectedId)
      if (error) throw error
      return data ?? []
    },
    enabled: !!selectedId,
  })

  const pageContactIds = useMemo(
    () => (contactsResult?.contacts ?? []).map((contact) => Number(contact.contact_id)).filter(Number.isFinite),
    [contactsResult],
  )

  const {
    data: pageTagRows = [],
    isLoading: pageTagsLoading,
    isError: pageTagsIsError,
  } = useQuery<PageTagRow[]>({
    queryKey: ['contact-tags-page', pageContactIds],
    queryFn: async () => {
      if (!pageContactIds.length) return []
      const { data, error } = await supabase
        .from('contact_tags')
        .select('contact_id,tag,tag_id')
        .in('contact_id', pageContactIds)
      if (error) throw error
      return (data ?? []) as PageTagRow[]
    },
    enabled: pageContactIds.length > 0,
  })

  const {
    data: pageProfileRows = [],
    isLoading: pageProfilesLoading,
    isError: pageProfilesIsError,
  } = useQuery<PageProfileRow[]>({
    queryKey: ['contact-profile-hats-page', pageContactIds],
    queryFn: async () => {
      if (!pageContactIds.length) return []
      const { data, error } = await supabase
        .from('rel_contact_profiles')
        .select('contact_id,profile_type_id')
        .in('contact_id', pageContactIds)
      if (error) throw error
      return (data ?? []) as PageProfileRow[]
    },
    enabled: pageContactIds.length > 0,
  })

  const tagNameById = useMemo(
    () => new Map(candidateTagOptions.map((tag) => [Number(tag.id), tag.name])),
    [candidateTagOptions],
  )

  const pageTagsByContact = useMemo(() => {
    const map = new Map<number, string[]>()
    pageTagRows.forEach((row) => {
      const contactId = Number(row.contact_id)
      const name = row.tag_id ? (tagNameById.get(Number(row.tag_id)) ?? row.tag ?? '') : (row.tag ?? '')
      if (!name) return
      map.set(contactId, [...(map.get(contactId) ?? []), name])
    })
    return map
  }, [pageTagRows, tagNameById])

  const pageProfilesByContact = useMemo(() => {
    const map = new Map<number, number[]>()
    pageProfileRows.forEach((row) => {
      const contactId = Number(row.contact_id)
      const profileTypeId = Number(row.profile_type_id)
      if (!Number.isFinite(profileTypeId)) return
      map.set(contactId, Array.from(new Set([...(map.get(contactId) ?? []), profileTypeId])))
    })
    return map
  }, [pageProfileRows])

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
  }, [selectedTags])

  useEffect(() => {
    setIsEditing(false)
    setEditDraft({})
    setEditErrors({})
    setShowTagDropdown(false)
  }, [selectedId])

  const roleName = (id: number | null | undefined) => roleOptions.find((r) => Number(r.id) === Number(id))?.name ?? '—'
  const namesFromIds = (ids: number[] | null | undefined, options: { id: number; name: string }[]): string => {
    if (!Array.isArray(ids) || ids.length === 0) return '—'
    const labels = ids.map((id) => options.find((option) => Number(option.id) === Number(id))?.name ?? 'לא זוהה')
    return labels.join(', ')
  }
  const subRoleNames = (ids: number[] | null | undefined) => namesFromIds(ids, subRoleOptions)
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
      const contactId = Number(contact.contact_id)
      const isDuplicateEmail = Boolean(contact.dup_email_flag)
      const hasStoredCv = Boolean(contact.cv_storage_path)
      const hasValidLegacyCv = Boolean(contact.cv_link && isValidUrl(contact.cv_link))
      const hasCvRecord = Boolean(contact.has_cv || contact.cv_link || contact.cv_storage_path)
      const hasCvFile = hasStoredCv || hasValidLegacyCv
      const hasBrokenCv = hasCvRecord && !hasCvFile
      const hasNoPhoneButEmail = !contact.phone_norm && !contact.phone && Boolean(contact.email)
      const partialProfileMissing = [
        !contact.role ? 'תפקיד' : null,
        !contact.city_id ? 'עיר' : null,
        !contact.region_id ? 'אזור' : null,
      ].filter((value): value is string => Boolean(value))
      const isPartialProfile = partialProfileMissing.length > 0
      const hasWarning = hasBrokenCv || hasNoPhoneButEmail || isPartialProfile || isDuplicateEmail
      const isFollowUpDue = isDateDue(contact.next_follow_up)
      const isLinked = Boolean(contact.account_link)
      const profileTypeIds = Array.from(new Set([
        ...(contact.profile_type ? [Number(contact.profile_type)] : []),
        ...(pageProfilesByContact.get(contactId) ?? []),
      ]))
      return {
        ...contact,
        linked_org_name: contact.account_link
          ? (accountNameById.get(Number(contact.account_link)) || contact.linked_org_name || null)
          : (contact.linked_org_name ?? null),
        localTags: pageTagsByContact.get(contactId) ?? [],
        profileTypeIds,
        hasCvRecord,
        hasCvFile,
        hasBrokenCv,
        hasNoPhoneButEmail,
        partialProfileMissing,
        isPartialProfile,
        isDuplicateEmail,
        hasWarning,
        isFollowUpDue,
        isLinked,
        linkState: isLinked ? 'linked' : 'unlinked',
      }
    })
  }, [contactsResult, accountNameById, pageProfilesByContact, pageTagsByContact])

  const handleSort = (key: string) => {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortBy(key); setSortDir('asc') }
    setPage(0)
  }


  const totalVisible = contactsResult?.total ?? 0
  const total = totalVisible
  const pageData = enrichedContacts
  const selectedContact = enrichedContacts.find((contact) => Number(contact.contact_id) === Number(selectedId)) ?? null

  const hasDictionaryError = rolesIsError || subRolesIsError || roleAliasesIsError || availabilityIsError
    || experienceIsError || sourcesIsError || checkStatusesIsError || socialStatusesIsError || profileTypesIsError
    || regionsIsError || citiesIsError || accountsIsError || languagesIsError || scopesIsError || gendersIsError
    || taxTypesIsError || mobilityIsError || systemsIsError || proceduresIsError || salaryTypesIsError
    || workStatusesIsError || tagsDictIsError || pageTagsIsError || pageProfilesIsError
  const pageAuxLoading = pageContactIds.length > 0 && (pageTagsLoading || pageProfilesLoading)
  const isPageLoading = contactsLoading || rolesLoading || subRolesLoading || roleAliasesLoading || availabilityLoading
    || experienceLoading || sourcesLoading || checkStatusesLoading || socialStatusesLoading || profileTypesLoading
    || regionsLoading || citiesLoading || accountsLoading || languagesLoading || scopesLoading || gendersLoading
    || taxTypesLoading || mobilityLoading || systemsLoading || proceduresLoading || salaryTypesLoading
    || workStatusesLoading || tagsDictLoading || pageAuxLoading
  const tableError = contactsIsError
    ? 'שגיאה בטעינת אנשי הקשר. נסי לרענן את הרשימה.'
    : hasDictionaryError
      ? 'שגיאה בטעינת נתוני העזר של אנשי הקשר. נסי לרענן את הרשימה.'
      : undefined

  const roleKpis = useMemo<KpiRoleCard[]>(() => {
    return roleGroups.map((group) => ({
      ...group,
      value: roleGroupCounts?.[group.key] ?? 0,
    }))
  }, [roleGroups, roleGroupCounts])

  const computedFilterCard = useMemo(() => {
    const activeGroup = roleGroups.find((group) => sameNumberSet(group.roleIds, selectedRoleIdsForRegions))
    const roleLabel = activeGroup?.label ?? (filters.role ? roleName(filters.role) : filters.role_ids?.length ? 'קבוצת תפקידים' : 'כל התפקידים')
    const regionLabel = filters.region_id ? regionName(filters.region_id) : 'כל האזורים'
    return {
      count: totalVisible,
      subtitle: `${roleLabel} • ${regionLabel}`,
    }
  }, [filters.role, filters.role_ids, filters.region_id, totalVisible, roleGroups, selectedRoleIdsForRegions])

  useEffect(() => {
    setPage(0)
    setSelectedRows([])
  }, [filters])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(totalVisible / pageSize))
    if (page > totalPages - 1) setPage(totalPages - 1)
  }, [page, pageSize, totalVisible])

  useEffect(() => {
    window.localStorage.setItem(VISIBLE_COLUMNS_STORAGE_KEY, JSON.stringify(visibleColumns))
  }, [visibleColumns])

  useEffect(() => {
    const viewState: StoredContactsViewState = { filters, sortBy, sortDir }
    window.localStorage.setItem(VIEW_STATE_STORAGE_KEY, JSON.stringify(viewState))
  }, [filters, sortBy, sortDir])

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

  const setDraftField = (field: string, value: unknown) => {
    setEditDraft((draft) => ({ ...draft, [field]: value }))
    setEditErrors((errors) => {
      if (!errors[field]) return errors
      const next = { ...errors }
      delete next[field]
      return next
    })
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
        'קו"ח': contact.has_cv || contact.cv_link || contact.cv_storage_path
          ? (contact.cv_storage_path || (contact.cv_link && isValidUrl(contact.cv_link)) ? 'יש' : 'דורש תיקון')
          : 'אין',
        'סוג פרופיל': profileTypeName(contact.profile_type),
        'ארגון מקושר': contact.account_link
          ? (accountNameById.get(Number(contact.account_link)) || contact.linked_org_name || '')
          : (contact.linked_org_name ?? ''),
        'תאריך שליחת וואטאפ': formatDate(contact.whatsapp_campaign_last_sent),
        'מצב שליחת וואטאפ': getOutcomeMeta(outcomeOfRecord({
          phoneNorm: contact.phone_norm,
          lastSentAt: contact.whatsapp_campaign_last_sent,
          lastStatus: contact.whatsapp_last_delivery_status,
        })).label,
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
    const isArrayField = bulkField === 'availability'
    if (!selectedRows.length || !bulkField) return
    if (isArrayField ? bulkArrayValues.length === 0 : bulkValue === null || bulkValue === '') return
    setBulkPending(true)
    try {
      if (bulkField === 'availability' && bulkArrayMode === 'add') {
        const records = await fetchContactsByIds(selectedRows)
        const groups = new Map<string, number[]>()
        records.forEach((record) => {
          const next = Array.from(new Set([...(record.candidate_availability_ids ?? []), ...bulkArrayValues])).sort((a, b) => a - b)
          const key = JSON.stringify(next)
          groups.set(key, [...(groups.get(key) ?? []), Number(record.contact_id)])
        })
        for (const [serialized, ids] of groups) {
          const { error } = await bulkUpdateContacts(ids, { candidate_availability_ids: JSON.parse(serialized) })
          if (error) throw error
        }
      } else {
        let patch: Record<string, unknown>
        if (bulkField === 'availability') {
          patch = { candidate_availability_ids: bulkArrayValues }
        } else if (bulkField === 'role') {
          const nextRoleId = Number(bulkValue)
          const records = await fetchContactsByIds(selectedRows)
          const grouped = new Map<string, { ids: number[]; patch: Record<string, unknown> }>()
          records.forEach((record) => {
            const nextSubRoles = filterSubRolesForRole(record.sub_role ?? [], nextRoleId, subRoleOptions)
            const nextPatch = { role: nextRoleId, sub_role: nextSubRoles }
            const key = JSON.stringify(nextPatch)
            const current: { ids: number[]; patch: Record<string, unknown> } = grouped.get(key) ?? { ids: [], patch: nextPatch }
            current.ids.push(Number(record.contact_id))
            grouped.set(key, current)
          })
          for (const group of grouped.values()) {
            const { error } = await bulkUpdateContacts(group.ids, group.patch)
            if (error) throw error
          }
          patch = {}
        } else if (bulkField === 'city_id') {
          const selectedCity = cityOptions.find((city) => Number(city.id) === Number(bulkValue))
          if (!selectedCity) throw new Error('העיר שנבחרה אינה קיימת במילון')
          patch = { city_id: selectedCity.id, region_id: selectedCity.region_id }
        } else if (bulkField === 'region_id') {
          patch = { region_id: Number(bulkValue), city_id: null }
        } else {
          patch = { [bulkField]: bulkValue }
        }
        if (Object.keys(patch).length) {
          const { error } = await bulkUpdateContacts(selectedRows, patch)
          if (error) throw error
        }
      }
      showToast(`${selectedRows.length} רשומות עודכנו בהצלחה`, 'success')
      setBulkUpdateOpen(false)
      setBulkField('')
      setBulkValue(null)
      setBulkArrayValues([])
      setBulkArrayMode('replace')
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
    } catch (err) {
      showToast(err instanceof Error ? `שגיאה במיזוג הרשומות: ${err.message}` : 'שגיאה במיזוג הרשומות', 'error')
    } finally {
      setMergePending(false)
    }
  }

  const openContact360 = (contactId: number | null | undefined) => {
    if (!contactId) {
      showToast('לא נמצא מזהה איש קשר', 'error')
      return
    }
    navigate(contact360Path(contactId))
  }

  const openCreateContactForm = () => {
    navigate(createContactPath)
  }

  // Open the linked organization's 360 card (account_link → account id).
  const openOrg = (accountLink: number | null | undefined) => {
    if (!accountLink) {
      showToast('אין ארגון מקושר לרשומה', 'error')
      return
    }
    navigate(account360Path(accountLink))
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
    const current = enrichedContacts.find((contact) => Number(contact.contact_id) === Number(contactId))
    if (current?.profileTypeIds.includes(1)) return
    setCandidatePendingIds((prev) => Array.from(new Set([...prev, contactId])))
    try {
      const { error } = await supabase
        .from('rel_contact_profiles')
        .upsert({ contact_id: contactId, profile_type_id: 1 }, { onConflict: 'contact_id,profile_type_id' })
      if (error) throw error
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['candidate-ids'] }),
        queryClient.invalidateQueries({ queryKey: ['contact-profile-hats-page'] }),
        queryClient.invalidateQueries({ queryKey: ['contact360', contactId] }),
      ])
      showToast('נוסף כובע מועמד — הזהות הראשית נשמרה', 'success')
    } catch {
      showToast('שגיאה בהוספת כובע מועמד', 'error')
    } finally {
      setCandidatePendingIds((prev) => prev.filter((id) => id !== contactId))
    }
  }

  const removeHat = async (contactId: number, profileTypeId: number) => {
    if (!window.confirm('להסיר את הכובע הזה מאיש הקשר?')) return
    setCandidatePendingIds((prev) => Array.from(new Set([...prev, contactId])))
    try {
      const { error } = await supabase
        .from('rel_contact_profiles')
        .delete()
        .eq('contact_id', contactId)
        .eq('profile_type_id', profileTypeId)
      if (error) throw error
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['candidate-ids'] }),
        queryClient.invalidateQueries({ queryKey: ['contact-profile-hats-page'] }),
        queryClient.invalidateQueries({ queryKey: ['contact360', contactId] }),
      ])
      showToast('הכובע הוסר', 'success')
    } catch {
      showToast('שגיאה בהסרת הכובע', 'error')
    } finally {
      setCandidatePendingIds((prev) => prev.filter((id) => id !== contactId))
    }
  }

  const handleEditOpen = (contact: typeof selectedContact) => {
    if (!contact) return
    setEditDraft(createContactEditDraft(contact))
    setEditErrors({})
    setIsEditing(true)
  }

  const closeContactPanel = () => {
    setIsEditing(false)
    setEditDraft({})
    setEditErrors({})
    setSelectedId(null)
  }

  const cancelContactEdit = () => {
    setIsEditing(false)
    setEditDraft({})
    setEditErrors({})
  }

  const handleSave = async () => {
    if (!selectedContact) return
    const { patch, errors } = buildChangedContactPatch(selectedContact, editDraft)
    setEditErrors(errors)
    if (Object.keys(errors).length) {
      showToast('יש לתקן את השדות המסומנים לפני השמירה', 'error')
      return
    }
    if (!Object.keys(patch).length) {
      showToast('לא בוצעו שינויים', 'info')
      setIsEditing(false)
      return
    }
    setSavePending(true)
    try {
      const { error } = await updateContact(Number(selectedContact.contact_id), patch)
      if (error) throw error
      showToast('נשמר בהצלחה', 'success')
      setIsEditing(false)
      setEditDraft({})
      setEditErrors({})
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'שגיאה בשמירה', 'error')
    } finally {
      setSavePending(false)
    }
  }

  // Add a tag by its dictionary id. The legacy text column is NOT NULL, so both values are written.
  const handleAddTag = async (tagId: number) => {
    if (!selectedId) return
    const selectedTag = candidateTagOptions.find((tag) => tag.id === tagId)
    if (!selectedTag) {
      showToast('התגית שנבחרה אינה קיימת במילון', 'error')
      return
    }
    const normalizedName = selectedTag.name.trim().toLocaleLowerCase('he')
    if (panelTags.some((tag) => tag.tag_id === tagId || tag.name.trim().toLocaleLowerCase('he') === normalizedName)) {
      showToast('התגית כבר קיימת אצל איש הקשר', 'info')
      setShowTagDropdown(false)
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
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['contact_tags', selectedId] }),
      queryClient.invalidateQueries({ queryKey: ['contact-tags-page'] }),
    ])
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
    if (selectedId) await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['contact_tags', selectedId] }),
      queryClient.invalidateQueries({ queryKey: ['contact-tags-page'] }),
    ])
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
      render: (contact) => {
        const warnings = buildWarnings(contact)
        return (
          <div className="max-w-[180px] py-2">
            <div className="text-[14px] font-bold text-[#0F172A]">
              {contact.full_name ?? contact.display_name ?? '—'}
            </div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {contact.isLinked && <InlineSignal tone="success">מקושר</InlineSignal>}
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
      render: (contact) => (
        <div className="max-w-[160px] space-y-1 py-2">
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
      render: (contact) => <RoleBadge label={roleName(contact.role)} roleId={Number(contact.role)} />,
    })
  }

  if (visibleColumns.includes('region')) {
    contactColumns.push({
      key: 'region',
      label: 'אזור',
      sortable: true,
      render: (contact) => <RegionBadge regionId={contact.region_id} label={regionName(contact.region_id)} />,
    })
  }

  if (visibleColumns.includes('city')) {
    contactColumns.push({
      key: 'city',
      label: 'עיר',
      sortable: true,
      render: (contact) => <span className="whitespace-nowrap">{cityName(contact.city_id)}</span>,
    })
  }

  if (visibleColumns.includes('availability')) {
    contactColumns.push({
      key: 'availability',
      label: 'זמינות',
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
      render: (contact) => <CvStateBadge hasCv={contact.hasCvRecord} broken={contact.hasBrokenCv} />,
    })
  }

  if (visibleColumns.includes('profile_type')) {
    contactColumns.push({
      key: 'profile_type',
      label: 'סוג פרופיל',
      render: (contact) => contact.profileTypeIds.length ? (
        <div className="flex max-w-[150px] flex-wrap gap-1">
          {contact.profileTypeIds.map((id) => <LightTag key={id} tone={id === 1 ? 'teal' : 'slate'}>{profileTypeName(id)}</LightTag>)}
        </div>
      ) : '—',
    })
  }

  if (visibleColumns.includes('linked_org')) {
    contactColumns.push({
      key: 'linked_org',
      label: 'ארגון מקושר',
      render: (contact) => contact.account_link && contact.linked_org_name ? (
        <button
          type="button"
          className="max-w-[140px] truncate rounded-xl bg-slate-50 px-2.5 py-1 text-[12px] font-semibold text-slate-700 hover:bg-slate-100"
          title={contact.linked_org_name}
          onClick={(event) => {
            event.stopPropagation()
            openOrg(contact.account_link)
          }}
        >
          {contact.linked_org_name}
        </button>
      ) : contact.linked_org_name ? (
        <span className="block max-w-[140px] truncate text-[12px] text-slate-600" title={`${contact.linked_org_name} (Legacy ללא קשר פעיל)`}>
          {contact.linked_org_name}
        </span>
      ) : <span className="text-slate-400">—</span>,
    })
  }

  if (visibleColumns.includes('whatsapp')) {
    contactColumns.push({
      key: 'whatsapp',
      label: 'תאריך שליחת WhatsApp',
      nowrap: true,
      // sortColMap כבר הכיל את המיפוי לעמודה הזו, אבל בלי sortable הוא היה בלתי נגיש
      sortable: true,
      render: (contact) => formatDate(contact.whatsapp_campaign_last_sent),
    })
  }

  if (visibleColumns.includes('whatsapp_status')) {
    contactColumns.push({
      key: 'whatsapp_status',
      label: 'מצב שליחת WhatsApp',
      nowrap: true,
      render: (contact) => {
        const meta = getOutcomeMeta(outcomeOfRecord({
          phoneNorm: contact.phone_norm,
          lastSentAt: contact.whatsapp_campaign_last_sent,
          lastStatus: contact.whatsapp_last_delivery_status,
        }))
        return <span title={meta.description}><StatusPill label={meta.label} variant={meta.tone} /></span>
      },
    })
  }

  if (visibleColumns.includes('last_contact')) {
    contactColumns.push({
      key: 'last_contact',
      label: 'קשר אחרון',
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

  if (visibleColumns.includes('tags')) {
    contactColumns.push({
      key: 'tags',
      label: 'תגיות',
      minWidth: '180px',
      render: (contact) => contact.localTags.length ? (
        <div className="flex max-w-[240px] flex-wrap gap-1 py-1">
          {contact.localTags.slice(0, 3).map((tag) => <span key={tag} className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${tagClass(tag)}`}>{tag}</span>)}
          {contact.localTags.length > 3 && <span className="text-[11px] font-semibold text-slate-500">+{contact.localTags.length - 3}</span>}
        </div>
      ) : <span className="text-slate-400">—</span>,
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
        { key: 'view', label: 'תצוגה מהירה', icon: <Eye className="h-4 w-4" />, onClick: () => setSelectedId(Number(contact.contact_id)) },
        { key: '360', label: 'פתיחת כרטסת 360', icon: <Eye className="h-4 w-4" />, onClick: () => openContact360(Number(contact.contact_id)) },
        { key: 'edit', label: 'עריכה', icon: <Edit2 className="h-4 w-4" />, onClick: () => { setSelectedId(Number(contact.contact_id)); handleEditOpen(contact) } },
        { key: 'whatsapp', label: 'WhatsApp', icon: <Phone className="h-4 w-4" />, disabled: !contact.phone_norm && !contact.phone, onClick: () => window.open(whatsappLink(contact.phone_norm ?? contact.phone), '_blank', 'noopener,noreferrer') },
        { key: 'phone', label: 'חיוג', icon: <Phone className="h-4 w-4" />, disabled: !contact.phone_norm && !contact.phone, onClick: () => { window.location.href = `tel:${contact.phone_norm ?? contact.phone}` } },
        { key: 'email', label: 'שליחת אימייל', icon: <Mail className="h-4 w-4" />, disabled: !contact.email, onClick: () => { window.location.href = `mailto:${contact.email}` } },
        { key: 'cv', label: 'פתיחת קורות חיים', icon: <FileText className="h-4 w-4" />, disabled: !contact.hasCvFile, onClick: () => { void openContactCv(contact) } },
        { key: 'organization', label: 'פתיחת ארגון', icon: <Users className="h-4 w-4" />, disabled: !contact.account_link, onClick: () => openOrg(contact.account_link) },
        { key: 'follow-up', label: 'קביעת פולו־אפ', icon: <Phone className="h-4 w-4" />, onClick: () => openFollowUp(Number(contact.contact_id), contact.next_follow_up) },
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
              <button type="button" onClick={() => setVisibleColumns([...DEFAULT_COLUMNS])} className="mb-3 text-[12px] font-semibold text-[#008080] hover:underline">איפוס לברירת המחדל</button>
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
            onClick={openCreateContactForm}
          >
            איש קשר חדש
          </ActionButton>
        </div>
      }
    >
      <div dir="rtl" className="min-h-screen bg-[#F8FAFC] font-['Heebo'] text-[#0F172A]"><div className="space-y-6">
          <section className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-7">
            {roleKpis.map((card) => {
              const isActive = sameNumberSet(selectedRoleIdsForRegions, card.roleIds)
              return (
                <KpiRoleCardComponent
                  key={card.key}
                  label={card.label}
                  value={roleCountsIsError ? 'שגיאה' : roleCountsLoading ? '…' : card.value}
                  colorRoleId={card.colorRoleId}
                  active={isActive}
                  onClick={() => {
                    setFilters((prev) => {
                      if (isActive) {
                        return { ...prev, role: undefined, role_ids: undefined, sub_role_ids: undefined, region_id: undefined, city_id: undefined }
                      }
                      return {
                        ...prev,
                        role: card.roleIds.length === 1 ? card.roleIds[0] : undefined,
                        role_ids: card.roleIds.length > 1 ? card.roleIds : undefined,
                        sub_role_ids: undefined,
                        region_id: undefined,
                        city_id: undefined,
                      }
                    })
                  }}
                />
              )
            })}
          </section>

          {selectedRoleIdsForRegions.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="mb-2 text-[13px] font-bold text-slate-700">חלוקה לפי אזור לתפקיד שנבחר</div>
              {regionCountsLoading ? (
                <div className="text-[13px] text-slate-500">מחשב חלוקה לפי אזורים...</div>
              ) : regionCountsIsError ? (
                <div className="text-[13px] font-semibold text-red-600">שגיאה בחישוב האזורים</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {regionOptions
                    .filter((region) => (regionCounts?.[Number(region.id)] ?? 0) > 0)
                    .sort((a, b) => {
                      const aId = Number(a.id)
                      const bId = Number(b.id)
                      const aIndex = REGION_DISPLAY_INDEX.get(aId) ?? Number.MAX_SAFE_INTEGER
                      const bIndex = REGION_DISPLAY_INDEX.get(bId) ?? Number.MAX_SAFE_INTEGER
                      if (aIndex !== bIndex) return aIndex - bIndex
                      return a.name.localeCompare(b.name, 'he')
                    })
                    .map((region) => {
                      const regionId = Number(region.id)
                      const isActive = Number(filters.region_id) === regionId
                      const color = getRegionColor(regionId)
                      return (
                        <button
                          key={regionId}
                          type="button"
                          onClick={() => setFilters((prev) => ({
                            ...prev,
                            region_id: isActive ? undefined : regionId,
                            city_id: undefined,
                          }))}
                          className="flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-[13px] font-semibold shadow-sm transition hover:border-slate-400 hover:bg-slate-100"
                          style={{
                            borderColor: isActive ? color.hex : '#CBD5E1',
                            backgroundColor: isActive ? color.hex : '#F8FAFC',
                            color: isActive ? '#FFFFFF' : '#475569',
                          }}
                        >
                          <span className="whitespace-nowrap">{region.name}</span>
                          <span
                            className="rounded-md px-1.5 py-0.5 text-[11px] font-bold"
                            style={{
                              backgroundColor: isActive ? 'rgba(255,255,255,0.20)' : '#E2E8F0',
                              color: isActive ? '#FFFFFF' : '#475569',
                            }}
                          >
                            {regionCounts?.[regionId] ?? 0}
                          </span>
                        </button>
                      )
                    })}
                  {!regionOptions.some((region) => (regionCounts?.[Number(region.id)] ?? 0) > 0) && (
                    <span className="text-[13px] text-slate-500">אין נתוני אזור לתפקיד שנבחר</span>
                  )}
                </div>
              )}
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

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <SearchBar
                  value={filters.search ?? ''}
                  onChange={(value) => setFilters((prev) => ({ ...prev, search: value }))}
                  placeholder="חיפוש שם, טלפון, אימייל, רישיון או ארגון..."
                />
                <RoleSubRolePicker
                  variant="filter"
                  roles={roleOptions}
                  subRoles={subRoleOptions}
                  roleId={filters.role ?? null}
                  subRoleIds={filters.sub_role_ids ?? []}
                  onRoleChange={(id) => setFilters((prev) => ({ ...prev, role: id ?? undefined, role_ids: undefined, sub_role_ids: undefined }))}
                  onSubRoleChange={(ids) => setFilters((prev) => ({ ...prev, sub_role_ids: ids.length ? ids : undefined }))}
                />
                <CityRegionPicker
                  variant="filter"
                  cityId={filters.city_id ?? null}
                  regionId={filters.region_id ?? null}
                  cities={cityOptions}
                  regions={regionOptions}
                  onCityChange={(id) => {
                    const city = cityOptions.find((item) => Number(item.id) === Number(id))
                    setFilters((prev) => ({ ...prev, city_id: id ?? undefined, region_id: city?.region_id ?? prev.region_id }))
                  }}
                  onRegionChange={(id) => setFilters((prev) => ({ ...prev, region_id: id ?? undefined, city_id: undefined }))}
                />
                <SelectFilter
                  value={String(filters.profile_type ?? '')}
                  onChange={(value) => setFilters((prev) => ({ ...prev, profile_type: value ? Number(value) : undefined }))}
                  options={profileTypeOptions.map((item) => ({ value: String(item.id), label: item.name }))}
                  placeholder="סוג פרופיל"
                />
              </div>

              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setAdvancedFiltersOpen((open) => !open)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <ChevronDown className={`h-4 w-4 transition ${advancedFiltersOpen ? 'rotate-180' : ''}`} />
                  סינון מתקדם
                </button>
              </div>

              {advancedFiltersOpen && (
                <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <SelectFilter value={String(filters.availability ?? '')} onChange={(value) => setFilters((prev) => ({ ...prev, availability: value ? Number(value) : undefined }))} options={availabilityOptions.map((item) => ({ value: String(item.id), label: item.name }))} placeholder="זמינות" />
                    <SelectFilter value={String(filters.experience ?? '')} onChange={(value) => setFilters((prev) => ({ ...prev, experience: value ? Number(value) : undefined }))} options={experienceOptions.map((item) => ({ value: String(item.id), label: item.name }))} placeholder="ניסיון" />
                    <SelectFilter value={String(filters.check_status ?? '')} onChange={(value) => setFilters((prev) => ({ ...prev, check_status: value ? Number(value) : undefined }))} options={checkStatusOptions.map((item) => ({ value: String(item.id), label: item.name }))} placeholder="סטטוס בדיקה" />
                    <SelectFilter value={String(filters.gender ?? '')} onChange={(value) => setFilters((prev) => ({ ...prev, gender: value ? Number(value) : undefined }))} options={genderDict.map((item) => ({ value: String(item.id), label: item.name }))} placeholder="מגדר" />
                    <SelectFilter value={String(filters.mobility_id ?? '')} onChange={(value) => setFilters((prev) => ({ ...prev, mobility_id: value ? Number(value) : undefined }))} options={mobilityDict.map((item) => ({ value: String(item.id), label: item.name }))} placeholder="ניידות" />
                    <SelectFilter value={String(filters.tax_type_id ?? '')} onChange={(value) => setFilters((prev) => ({ ...prev, tax_type_id: value ? Number(value) : undefined }))} options={taxTypeDict.map((item) => ({ value: String(item.id), label: item.name }))} placeholder="סוג מס" />
                    <SelectFilter value={String(filters.work_status ?? '')} onChange={(value) => setFilters((prev) => ({ ...prev, work_status: value ? Number(value) : undefined }))} options={workStatusDict.map((item) => ({ value: String(item.id), label: item.name }))} placeholder="סטטוס תעסוקתי" />
                    <SelectFilter value={String(filters.has_cv ?? '')} onChange={(value) => setFilters((prev) => ({ ...prev, has_cv: value ? value as 'yes' | 'no' : undefined }))} options={[{ value: 'yes', label: 'קיים קובץ קורות חיים' }, { value: 'no', label: 'חסר קובץ קורות חיים' }]} placeholder='קורות חיים' />
                    <SelectFilter value={String(filters.partial_profile ?? '')} onChange={(value) => setFilters((prev) => ({ ...prev, partial_profile: value ? 'yes' : undefined }))} options={[{ value: 'yes', label: 'פרופיל חלקי' }]} placeholder="שלמות פרופיל" />
                    <SelectFilter value={String(filters.source ?? '')} onChange={(value) => setFilters((prev) => ({ ...prev, source: value ? Number(value) : undefined }))} options={sourceOptions.map((item) => ({ value: String(item.id), label: item.name }))} placeholder="מקור" />
                    <SelectFilter value={String(filters.social_status ?? '')} onChange={(value) => setFilters((prev) => ({ ...prev, social_status: value ? Number(value) : undefined }))} options={socialStatusOptions.map((item) => ({ value: String(item.id), label: item.name }))} placeholder="סטטוס חברתי" />
                    <SelectFilter value={String(filters.link_state ?? '')} onChange={(value) => setFilters((prev) => ({ ...prev, link_state: value ? value as 'linked' | 'unlinked' : undefined }))} options={[{ value: 'linked', label: 'מקושר לארגון' }, { value: 'unlinked', label: 'ללא שיוך ארגוני' }]} placeholder="שיוך ארגוני" />
                    <SelectFilter value={String(filters.tags ?? '')} onChange={(value) => setFilters((prev) => ({ ...prev, tags: value || undefined }))} options={candidateTagOptions.map((item) => ({ value: String(item.id), label: item.name }))} placeholder="תגית" />
                    <SelectFilter value={String(filters.follow_up_due ?? '')} onChange={(value) => setFilters((prev) => ({ ...prev, follow_up_due: value ? value as 'yes' | 'no' : undefined }))} options={[{ value: 'yes', label: 'פולו־אפ שהגיע מועדו' }, { value: 'no', label: 'ללא פולו־אפ פתוח' }]} placeholder="פולו־אפ" />
                    <SelectFilter value={String(filters.whatsapp_outcome ?? '')} onChange={(value) => setFilters((prev) => ({ ...prev, whatsapp_outcome: value ? value as DeliveryOutcome : undefined }))} options={DELIVERY_OUTCOME_ORDER.map((code) => ({ value: code, label: DELIVERY_OUTCOMES[code].label }))} placeholder="מצב שליחת WhatsApp" />
                    <DateField label="נוצר מתאריך" value={filters.created_from ?? ''} onChange={(value) => setFilters((prev) => ({ ...prev, created_from: value || undefined }))} />
                    <DateField label="נוצר עד תאריך" value={filters.created_to ?? ''} onChange={(value) => setFilters((prev) => ({ ...prev, created_to: value || undefined }))} />
                    <DateField label="עודכן מתאריך" value={filters.updated_from ?? ''} onChange={(value) => setFilters((prev) => ({ ...prev, updated_from: value || undefined }))} />
                    <DateField label="עודכן עד תאריך" value={filters.updated_to ?? ''} onChange={(value) => setFilters((prev) => ({ ...prev, updated_to: value || undefined }))} />
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <DictionaryMultiSelect label="שפות" options={languageDict} value={filters.language_ids ?? []} onChange={(ids) => setFilters((prev) => ({ ...prev, language_ids: ids.length ? ids : undefined }))} />
                    <DictionaryMultiSelect label="היקפים מועדפים" options={scopeDict} value={filters.preferred_scope_ids ?? []} onChange={(ids) => setFilters((prev) => ({ ...prev, preferred_scope_ids: ids.length ? ids : undefined }))} />
                    <DictionaryMultiSelect label="אזורים מועדפים" options={regionOptions} value={filters.preferred_region_ids ?? []} onChange={(ids) => setFilters((prev) => ({ ...prev, preferred_region_ids: ids.length ? ids : undefined }))} />
                    <DictionaryMultiSelect label="ערים מועדפות" options={cityOptions} value={filters.preferred_city_ids ?? []} onChange={(ids) => setFilters((prev) => ({ ...prev, preferred_city_ids: ids.length ? ids : undefined }))} />
                  </div>
                </div>
              )}

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
              isLoading={isPageLoading || (contactsFetching && pageData.length === 0)}
              error={tableError}
              hasActiveFilter={hasActiveFilters}
              emptyMessage="עדיין אין אנשי קשר במערכת"
              noResultsMessage="לא נמצאו אנשי קשר התואמים לסינון"
              minWidth={visibleColumns.length > DEFAULT_COLUMNS.length ? `${Math.max(1200, visibleColumns.length * 135)}px` : undefined}
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
                    {selectedContact.photo_url ? (
                      <img src={selectedContact.photo_url} alt="" className="h-14 w-14 shrink-0 rounded-2xl object-cover shadow-sm" />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#F0FDFC] text-[22px] font-bold text-[#008080] shadow-sm">
                        {(selectedContact.full_name ?? selectedContact.display_name ?? '?').charAt(0)}
                      </div>
                    )}
                    <div className="space-y-2">
                      <div>
                        <h2 className="text-[24px] font-bold text-[#0F172A]">
                          {selectedContact.full_name ?? selectedContact.display_name ?? '—'}
                        </h2>
                        <div className="mt-1 flex flex-wrap gap-2">
                          <RoleBadge label={roleName(selectedContact.role)} roleId={Number(selectedContact.role)} />
                          <LightTag tone="slate">{cityName(selectedContact.city_id)}</LightTag>
                          {selectedContact.region_id != null && (
                            <RegionBadge regionId={selectedContact.region_id} label={regionName(selectedContact.region_id)} />
                          )}
                          {(selectedContact.candidate_availability_ids ?? []).map((id) => (
                            <Badge key={id} tone={availabilityTone(id)}>{availabilityName(id)}</Badge>
                          ))}
                          {selectedContact.profileTypeIds.map((id) => (
                            <LightTag key={`profile-${id}`} tone={id === 1 ? 'teal' : 'slate'}>{profileTypeName(id)}</LightTag>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <LinkAction
                          to={contact360Path(selectedContact.contact_id)}
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
                        <QuickActionButton
                          icon={<FileText className="h-4 w-4" />}
                          label='פתח קו"ח'
                          onClick={() => { void openContactCv(selectedContact) }}
                          disabled={!selectedContact.hasCvFile}
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
                          disabled={!selectedContact.account_link}
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
                  onClick: () => openContact360(Number(selectedContact.contact_id)),
                }}
              />
            }
          >
              <div className="space-y-4">
                <div id="contact-tags-section">
                  <AdminPanelSection title="סטטוסים, כובעי פרופיל ותגיות">
                    <AdminPanelField
                      label="כובעי פרופיל"
                      mode="view"
                      fullWidth
                      viewValue={selectedContact.profileTypeIds.length ? (
                        <div className="flex flex-wrap gap-2">
                          {selectedContact.profileTypeIds.map((id) => (
                            <LightTag key={id} tone={id === 1 ? 'teal' : 'slate'}>
                              <span className="inline-flex items-center gap-1.5">
                                {profileTypeName(id)}
                                {isEditing && (
                                  <button
                                    type="button"
                                    aria-label={`הסרת הכובע ${profileTypeName(id)}`}
                                    onClick={() => removeHat(Number(selectedContact.contact_id), id)}
                                    disabled={candidatePendingIds.includes(Number(selectedContact.contact_id))}
                                    className="opacity-60 hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-30"
                                  >
                                    ×
                                  </button>
                                )}
                              </span>
                            </LightTag>
                          ))}
                        </div>
                      ) : 'לא הוגדרו כובעים'}
                    />
                    {isEditing && !selectedContact.profileTypeIds.includes(1) && (
                      <div className="sm:col-span-2">
                        <button
                          type="button"
                          onClick={() => markAsCandidate(Number(selectedContact.contact_id))}
                          disabled={candidatePendingIds.includes(Number(selectedContact.contact_id))}
                          className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-[13px] font-semibold text-teal-700 transition hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <UserCheck className="h-4 w-4" />
                          {candidatePendingIds.includes(Number(selectedContact.contact_id)) ? 'מוסיף כובע...' : 'הוספת כובע מועמד'}
                        </button>
                      </div>
                    )}
                    <div className="sm:col-span-2">
                      <div className="mb-1 text-[12px] font-semibold text-[#6B6B6B]">תגיות</div>
                      {contactTagsLoading ? (
                        <div className="text-[13px] text-slate-500">טוען תגיות...</div>
                      ) : contactTagsIsError ? (
                        <div className="text-[13px] font-semibold text-red-600">שגיאה בטעינת התגיות</div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {panelTags.map((tag) => (
                            <span key={tag.id} className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-semibold ${tagClass(tag.name)}`}>
                              {tag.name}
                              <button type="button" aria-label={`הסרת התגית ${tag.name}`} onClick={() => handleRemoveTag(tag.id)} className="opacity-60 hover:opacity-100">×</button>
                            </span>
                          ))}
                          {!panelTags.length && <span className="text-[13px] text-slate-400">אין תגיות</span>}
                          <div className="relative">
                            <button type="button" onClick={() => setShowTagDropdown((value) => !value)} className="inline-flex items-center gap-1 rounded-md border border-dashed border-slate-300 px-2.5 py-1 text-[12px] font-semibold text-slate-500 hover:border-teal-400 hover:text-teal-600">+ תגית</button>
                            {showTagDropdown && (
                              <div className="absolute right-0 top-full z-30 mt-1 max-h-52 w-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-md">
                                {candidateTagOptions.filter((option) => !panelTags.some((tag) => tag.tag_id === option.id || tag.name === option.name)).map((option) => (
                                  <button key={option.id} type="button" onClick={() => handleAddTag(option.id)} className="w-full px-3 py-2 text-right text-[13px] text-slate-700 hover:bg-slate-50">{option.name}</button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <AdminPanelField label="סטטוס בדיקה" mode={isEditing ? 'edit' : 'view'} viewValue={<CheckStatusBadge statusId={selectedContact.check_status} label={checkStatusName(selectedContact.check_status)} />} editValue={<PanelSelectInput id="contact-check-status" value={editDraft.check_status} options={checkStatusOptions} onChange={(value) => setDraftField('check_status', value)} />} error={editErrors.check_status} />
                    <AdminPanelField label="מקור" mode={isEditing ? 'edit' : 'view'} viewValue={sourceName(selectedContact.source)} editValue={<PanelSelectInput id="contact-source" value={editDraft.source} options={sourceOptions} onChange={(value) => setDraftField('source', value)} />} />
                    <AdminPanelField label="סטטוס חברתי" mode={isEditing ? 'edit' : 'view'} viewValue={socialStatusName(selectedContact.social_status)} editValue={<PanelSelectInput id="contact-social-status" value={editDraft.social_status} options={socialStatusOptions} onChange={(value) => setDraftField('social_status', value)} />} />
                    <AdminPanelField label="פולו־אפ הבא" mode={isEditing ? 'edit' : 'view'} viewValue={formatDate(selectedContact.next_follow_up)} editValue={<PanelTextInput id="contact-next-follow-up" type="datetime-local" value={editDraft.next_follow_up} onChange={(value) => setDraftField('next_follow_up', value)} />} error={editErrors.next_follow_up} />
                  </AdminPanelSection>
                </div>

                <AdminPanelSection title="פרטים אישיים">
                  {/* INC-3144 — עיר ואזור בראש הפאנל: זה מה שנבדק ראשון,
                      ואין סיבה לגלול בשבילו עד סעיף המיקום. */}
                  <div className="sm:col-span-2">{isEditing ? <CityRegionPicker cityId={editDraft.city_id ?? null} regionId={editDraft.region_id ?? null} cities={cityOptions} regions={regionOptions} onCityChange={(cityId) => { const city = cityOptions.find((item) => Number(item.id) === Number(cityId)); setEditDraft((draft) => ({ ...draft, city_id: cityId, region_id: city?.region_id ?? draft.region_id })) }} onRegionChange={(regionId) => setEditDraft((draft) => ({ ...draft, region_id: regionId, city_id: draft.city_id && cityOptions.find((city) => city.id === draft.city_id)?.region_id !== regionId ? null : draft.city_id }))} /> : <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><AdminPanelField label="אזור" mode="view" viewValue={<RegionBadge regionId={selectedContact.region_id} label={regionName(selectedContact.region_id)} />} /><AdminPanelField label="עיר" mode="view" viewValue={cityName(selectedContact.city_id)} /></div>}</div>
                  <AdminPanelField label="שם תצוגה" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.display_name} editValue={<PanelTextInput id="contact-display-name" value={editDraft.display_name} onChange={(value) => setDraftField('display_name', value)} />} />
                  <AdminPanelField label="שם מלא" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.full_name} editValue={<PanelTextInput id="contact-full-name" value={editDraft.full_name} onChange={(value) => setDraftField('full_name', value)} />} />
                  <AdminPanelField label="שם פרטי" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.first_name} editValue={<PanelTextInput id="contact-first-name" value={editDraft.first_name} onChange={(value) => setDraftField('first_name', value)} />} />
                  <AdminPanelField label="שם משפחה" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.last_name} editValue={<PanelTextInput id="contact-last-name" value={editDraft.last_name} onChange={(value) => setDraftField('last_name', value)} />} />
                  <AdminPanelField label="נייד" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.phone ? formatPhone(selectedContact.phone) : formatPhone(selectedContact.phone_norm)} editValue={<PanelTextInput id="contact-phone" dir="ltr" value={editDraft.phone} onChange={(value) => setDraftField('phone', value)} />} error={editErrors.phone} />
                  <AdminPanelField label="נייד נוסף" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.second_phone ? formatPhone(selectedContact.second_phone) : null} editValue={<PanelTextInput id="contact-second-phone" dir="ltr" value={editDraft.second_phone} onChange={(value) => setDraftField('second_phone', value)} />} error={editErrors.second_phone} />
                  <AdminPanelField label="אימייל" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.email} editValue={<PanelTextInput id="contact-email" type="email" dir="ltr" value={editDraft.email} onChange={(value) => setDraftField('email', value)} />} error={editErrors.email} />
                  <AdminPanelField label="אימייל נוסף" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.second_email} editValue={<PanelTextInput id="contact-second-email" type="email" dir="ltr" value={editDraft.second_email} onChange={(value) => setDraftField('second_email', value)} />} error={editErrors.second_email} />
                  <AdminPanelField label="מגדר" mode={isEditing ? 'edit' : 'view'} viewValue={genderName(selectedContact.gender)} editValue={<PanelSelectInput id="contact-gender" value={editDraft.gender} options={genderDict} onChange={(value) => setDraftField('gender', value)} />} />
                  <AdminPanelField label="שנת לידה" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.birth_year} editValue={<PanelTextInput id="contact-birth-year" type="number" value={editDraft.birth_year} onChange={(value) => setDraftField('birth_year', value)} />} error={editErrors.birth_year} />
                </AdminPanelSection>

                <AdminPanelSection title="פרטים מקצועיים">
                  <div className="sm:col-span-2">
                    {isEditing ? (
                      <RoleSubRolePicker
                        roles={roleOptions}
                        subRoles={subRoleOptions}
                        roleId={editDraft.role ?? null}
                        subRoleIds={normalizeNumberArray(editDraft.sub_role)}
                        onRoleChange={(roleId) => {
                          const compatible = filterSubRolesForRole(normalizeNumberArray(editDraft.sub_role), roleId, subRoleOptions)
                          pendingCompatibleSubRolesRef.current = compatible
                          setEditDraft((draft) => ({ ...draft, role: roleId, sub_role: compatible }))
                        }}
                        onSubRoleChange={(ids) => {
                          if (pendingCompatibleSubRolesRef.current !== null) {
                            const compatible = pendingCompatibleSubRolesRef.current
                            pendingCompatibleSubRolesRef.current = null
                            setDraftField('sub_role', compatible)
                            return
                          }
                          setDraftField('sub_role', ids)
                        }}
                      />
                    ) : (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><AdminPanelField label="תפקיד" mode="view" viewValue={<RoleBadge label={roleName(selectedContact.role)} roleId={Number(selectedContact.role)} />} /><AdminPanelField label="תתי־תפקידים" mode="view" viewValue={subRoleNames(selectedContact.sub_role)} /></div>
                    )}
                  </div>
                  <AdminPanelField label="כותרת מקצועית" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.professional_title} editValue={<PanelTextInput id="contact-professional-title" value={editDraft.professional_title} onChange={(value) => setDraftField('professional_title', value)} />} />
                  <AdminPanelField label="ניסיון" mode={isEditing ? 'edit' : 'view'} viewValue={experienceName(selectedContact.experience)} editValue={<PanelSelectInput id="contact-experience" value={editDraft.experience} options={experienceOptions} onChange={(value) => setDraftField('experience', value)} />} />
                  <AdminPanelField label="מספר רישיון" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.license_no} editValue={<PanelTextInput id="contact-license" value={editDraft.license_no} onChange={(value) => setDraftField('license_no', value)} />} />
                  <AdminPanelField label="השכלה אקדמית" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.academic_education} editValue={<PanelTextArea id="contact-education" value={editDraft.academic_education} onChange={(value) => setDraftField('academic_education', value)} />} fullWidth />
                  <AdminPanelField label="קורסים מקצועיים" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.professional_courses} editValue={<PanelTextArea id="contact-courses" value={editDraft.professional_courses} onChange={(value) => setDraftField('professional_courses', value)} />} fullWidth />
                  <AdminPanelField label="מיומנויות נוספות" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.additional_skills_notes} editValue={<PanelTextArea id="contact-skills" value={editDraft.additional_skills_notes} onChange={(value) => setDraftField('additional_skills_notes', value)} />} fullWidth />
                  <div className="sm:col-span-2">{isEditing ? <DictionaryMultiSelect label="תחומי ניסיון" options={proceduresDict} value={editDraft.procedures_experience ?? []} onChange={(ids) => setDraftField('procedures_experience', ids)} /> : <AdminPanelField label="תחומי ניסיון" mode="view" viewValue={proceduresNames(selectedContact.procedures_experience)} />}</div>
                </AdminPanelSection>

                <AdminPanelSection title="העדפות עבודה">
                  <div className="sm:col-span-2">{isEditing ? <DictionaryMultiSelect label="היקף מועדף" options={scopeDict} value={editDraft.preferred_scope ?? []} onChange={(ids) => setDraftField('preferred_scope', ids)} /> : <AdminPanelField label="היקף מועדף" mode="view" viewValue={scopeNames(selectedContact.preferred_scope)} />}</div>
                  <div className="sm:col-span-2">{isEditing ? <DictionaryMultiSelect label="זמינות" options={availabilityOptions} value={editDraft.candidate_availability_ids ?? []} onChange={(ids) => setDraftField('candidate_availability_ids', ids)} /> : <AdminPanelField label="זמינות" mode="view" viewValue={availabilityNames(selectedContact.candidate_availability_ids)} />}</div>
                  <div className="sm:col-span-2">{isEditing ? <DictionaryMultiSelect label="סוגי שכר" options={salaryTypeDict} value={editDraft.candidate_salary_type_ids ?? []} onChange={(ids) => setDraftField('candidate_salary_type_ids', ids)} /> : <AdminPanelField label="סוגי שכר" mode="view" viewValue={salaryTypeNames(selectedContact.candidate_salary_type_ids)} />}</div>
                  <AdminPanelField label="ציפיית שכר שעתי" mode={isEditing ? 'edit' : 'view'} viewValue={formatCurrency(selectedContact.salary_expectation_hourly)} editValue={<PanelTextInput id="contact-hourly" type="number" value={editDraft.salary_expectation_hourly} onChange={(value) => setDraftField('salary_expectation_hourly', value)} />} />
                  <AdminPanelField label="ציפיית שכר חודשית" mode={isEditing ? 'edit' : 'view'} viewValue={formatCurrency(selectedContact.salary_expectation_monthly)} editValue={<PanelTextInput id="contact-monthly" type="number" value={editDraft.salary_expectation_monthly} onChange={(value) => setDraftField('salary_expectation_monthly', value)} />} />
                  <AdminPanelField label="סטטוס תעסוקתי" mode={isEditing ? 'edit' : 'view'} viewValue={workStatusName(selectedContact.work_status)} editValue={<PanelSelectInput id="contact-work-status" value={editDraft.work_status} options={workStatusDict} onChange={(value) => setDraftField('work_status', value)} />} />
                  <AdminPanelField label="ימי ושעות עבודה" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.work_schedule_text} editValue={<PanelTextArea id="contact-schedule" value={editDraft.work_schedule_text} onChange={(value) => setDraftField('work_schedule_text', value)} />} fullWidth />
                </AdminPanelSection>

                <AdminPanelSection title="מיקום וניידות">
                  <AdminPanelField label="ניידות" mode={isEditing ? 'edit' : 'view'} viewValue={mobilityName(selectedContact.mobility_id)} editValue={<PanelSelectInput id="contact-mobility" value={editDraft.mobility_id} options={mobilityDict} onChange={(value) => setDraftField('mobility_id', value)} />} />
                  {/* INC-3144 — כשיש עיר, טריגר במסד (trg_contact_fill_region_locality_from_city)
                      גוזר את סוג היישוב מ-dict_cities ודורס כל ערך ידני. עריכה כאן הייתה אשליה,
                      ולכן היא נפתחת רק כשאין עיר. */}
                  <AdminPanelField
                    label="סוג יישוב"
                    mode={isEditing && !editDraft.city_id ? 'edit' : 'view'}
                    viewValue={selectedContact.locality_type}
                    editValue={<PanelTextInput id="contact-locality" value={editDraft.locality_type} onChange={(value) => setDraftField('locality_type', value)} />}
                    helperText={isEditing && editDraft.city_id ? 'נגזר אוטומטית מהעיר ואינו ניתן לעריכה ידנית.' : undefined}
                  />
                  <div className="sm:col-span-2">{isEditing ? <DictionaryMultiSelect label="אזורים מועדפים" options={regionOptions} value={editDraft.preferred_regions ?? []} onChange={(ids) => setDraftField('preferred_regions', ids)} /> : <AdminPanelField label="אזורים מועדפים" mode="view" viewValue={formatIdsToNames(selectedContact.preferred_regions, regionName)} />}</div>
                  <div className="sm:col-span-2">{isEditing ? <DictionaryMultiSelect label="ערים מועדפות" options={cityOptions} value={editDraft.preferred_cities ?? []} onChange={(ids) => setDraftField('preferred_cities', ids)} /> : <AdminPanelField label="ערים מועדפות" mode="view" viewValue={formatIdsToNames(selectedContact.preferred_cities, cityName)} />}</div>
                  <AdminPanelField label="כל הארץ" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.preferred_all_country ? 'כן' : 'לא'} editValue={<label className="inline-flex items-center gap-2 text-[13px]"><input type="checkbox" checked={Boolean(editDraft.preferred_all_country)} onChange={(event) => setDraftField('preferred_all_country', event.target.checked)} /> מחפש/ת בכל הארץ</label>} />
                </AdminPanelSection>

                <AdminPanelSection title="שפות ומערכות">
                  <div className="sm:col-span-2">{isEditing ? <DictionaryMultiSelect label="שפות" options={languageDict} value={editDraft.languages ?? []} onChange={(ids) => setDraftField('languages', ids)} /> : <AdminPanelField label="שפות" mode="view" viewValue={languagesName(selectedContact.languages)} />}</div>
                  <div className="sm:col-span-2">{isEditing ? <DictionaryMultiSelect label="מערכות" options={systemsDict} value={editDraft.systems_used ?? []} onChange={(ids) => setDraftField('systems_used', ids)} /> : <AdminPanelField label="מערכות" mode="view" viewValue={systemsNames(selectedContact.systems_used)} />}</div>
                  <AdminPanelField label="סוג מס" mode={isEditing ? 'edit' : 'view'} viewValue={taxTypeName(selectedContact.tax_type_id)} editValue={<PanelSelectInput id="contact-tax" value={editDraft.tax_type_id} options={taxTypeDict} onChange={(value) => setDraftField('tax_type_id', value)} />} />
                </AdminPanelSection>

                <AdminPanelSection title="ארגון ותעסוקה">
                  <AdminPanelField label="ארגון מקושר" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.account_link ? <button type="button" className="font-semibold text-[#008080] hover:underline" onClick={() => openOrg(selectedContact.account_link)}>{selectedContact.linked_org_name}</button> : selectedContact.linked_org_name ? `${selectedContact.linked_org_name} (Legacy)` : null} editValue={<PanelSelectInput id="contact-account" value={editDraft.account_link} options={accountsList.map((account) => ({ id: account.account_id, name: account.account_name ?? `ארגון ${account.account_id}` }))} onChange={(value) => setDraftField('account_link', value)} />} />
                  <AdminPanelField label="מעסיק נוכחי" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.current_employer} editValue={<PanelTextInput id="contact-current-employer" value={editDraft.current_employer} onChange={(value) => setDraftField('current_employer', value)} />} />
                  <AdminPanelField label="מעסיקים קודמים" mode="view" viewValue={formatStructuredValue(selectedContact.previous_employers)} fullWidth helperText="מידע זה מוצג לקריאה בלבד; אין רכיב עריכה ייעודי למבנה הנתונים." />
                </AdminPanelSection>

                <AdminPanelSection title="קישורים ומדיה">
                  <AdminPanelField label="LinkedIn" mode={isEditing ? 'edit' : 'view'} viewValue={<ExternalLinkCell href={selectedContact.linkedin_url} label="פתיחת פרופיל" />} editValue={<PanelTextInput id="contact-linkedin" dir="ltr" value={editDraft.linkedin_url} onChange={(value) => setDraftField('linkedin_url', value)} />} error={editErrors.linkedin_url} />
                  <AdminPanelField label="Facebook URL" mode={isEditing ? 'edit' : 'view'} viewValue={<ExternalLinkCell href={selectedContact.facebook_url} label={selectedContact.facebook_name ?? 'פתיחת פרופיל'} />} editValue={<PanelTextInput id="contact-facebook-url" dir="ltr" value={editDraft.facebook_url} onChange={(value) => setDraftField('facebook_url', value)} />} error={editErrors.facebook_url} />
                  <AdminPanelField label="שם Facebook" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.facebook_name} editValue={<PanelTextInput id="contact-facebook-name" value={editDraft.facebook_name} onChange={(value) => setDraftField('facebook_name', value)} />} />
                  <AdminPanelField label="תיק עבודות" mode={isEditing ? 'edit' : 'view'} viewValue={<ExternalLinkCell href={selectedContact.portfolio_url} label="פתיחת תיק עבודות" />} editValue={<PanelTextInput id="contact-portfolio" dir="ltr" value={editDraft.portfolio_url} onChange={(value) => setDraftField('portfolio_url', value)} />} error={editErrors.portfolio_url} />
                  <AdminPanelField label="המלצות" mode={isEditing ? 'edit' : 'view'} viewValue={<ExternalLinkCell href={selectedContact.recommendations_url} label="פתיחת המלצות" />} editValue={<PanelTextInput id="contact-recommendations" dir="ltr" value={editDraft.recommendations_url} onChange={(value) => setDraftField('recommendations_url', value)} />} error={editErrors.recommendations_url} />
                </AdminPanelSection>

                <AdminPanelSection title="קורות חיים ותמונה">
                  <AdminPanelField label='סטטוס קו"ח' mode="view" viewValue={<CvStateBadge hasCv={selectedContact.hasCvRecord} broken={selectedContact.hasBrokenCv} />} />
                  <AdminPanelField label='תאריך קבלת קו"ח' mode={isEditing ? 'edit' : 'view'} viewValue={formatDate(selectedContact.cv_received_date)} editValue={<PanelTextInput id="contact-cv-date" type="date" value={editDraft.cv_received_date} onChange={(value) => setDraftField('cv_received_date', value)} />} />
                  <AdminPanelField label='קישור קו"ח Legacy' mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.hasCvFile ? <button type="button" onClick={() => { void openContactCv(selectedContact) }} className="font-semibold text-[#008080] hover:underline">פתיחת קורות החיים</button> : null} editValue={<PanelTextInput id="contact-cv-link" dir="ltr" value={editDraft.cv_link} onChange={(value) => setDraftField('cv_link', value)} />} error={editErrors.cv_link} helperText={selectedContact.cv_storage_path ? 'קיים גם קובץ פרטי ב־Storage; הנתיב אינו מוצג.' : undefined} />
                  <AdminPanelField label="תמונת פרופיל" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.photo_url ? <img src={selectedContact.photo_url} alt="תמונת פרופיל" className="h-24 w-24 rounded-xl object-cover" /> : null} editValue={<PanelTextInput id="contact-photo-url" dir="ltr" value={editDraft.photo_url} onChange={(value) => setDraftField('photo_url', value)} />} error={editErrors.photo_url} helperText="העלאה ישירה אינה מחוברת במסך זה; ניתן לעדכן URL קיים." />
                </AdminPanelSection>

                <AdminPanelSection title="הערות וסיכומים">
                  <AdminPanelField label="סיכום אישי" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.personal_summary} editValue={<PanelTextArea id="contact-personal-summary" value={editDraft.personal_summary} onChange={(value) => setDraftField('personal_summary', value)} />} fullWidth />
                  <AdminPanelField label="הערות מועמד" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.candidate_notes} editValue={<PanelTextArea id="contact-candidate-notes" value={editDraft.candidate_notes} onChange={(value) => setDraftField('candidate_notes', value)} />} fullWidth />
                  <AdminPanelField label="הערות CRM" mode={isEditing ? 'edit' : 'view'} viewValue={selectedContact.notes} editValue={<PanelTextArea id="contact-notes" value={editDraft.notes} onChange={(value) => setDraftField('notes', value)} />} fullWidth />
                </AdminPanelSection>

                <AdminPanelSection title="מידע מערכת לקריאה בלבד">
                  <AdminPanelField label="מזהה איש קשר" mode="view" viewValue={String(selectedContact.contact_id)} />
                  <AdminPanelField label="טלפון מנורמל" mode="view" viewValue={selectedContact.phone_norm} />
                  <AdminPanelField label="סוג פרופיל ראשי" mode="view" viewValue={profileTypeName(selectedContact.profile_type)} />
                  <AdminPanelField label="מספר הגשות קודמות" mode="view" viewValue={String(selectedContact.prev_applications_count ?? 0)} />
                  <AdminPanelField label="קשר אחרון" mode="view" viewValue={formatDate(selectedContact.last_contact_date)} />
                  <AdminPanelField label="WhatsApp קמפיין אחרון" mode="view" viewValue={formatDate(selectedContact.whatsapp_campaign_last_sent)} />
                  <AdminPanelField label="מצב שליחת WhatsApp" mode="view" viewValue={(() => {
                    const meta = getOutcomeMeta(outcomeOfRecord({
                      phoneNorm: selectedContact.phone_norm,
                      lastSentAt: selectedContact.whatsapp_campaign_last_sent,
                      lastStatus: selectedContact.whatsapp_last_delivery_status,
                    }))
                    return <span title={meta.description}><StatusPill label={meta.label} variant={meta.tone} /></span>
                  })()} />
                  <AdminPanelField label="נוצר" mode="view" viewValue={formatDate(selectedContact.created_timestamp)} />
                  <AdminPanelField label="עודכן" mode="view" viewValue={formatDate(selectedContact.updated_timestamp)} />
                  <AdminPanelField label="סיכום AI" mode="view" viewValue={selectedContact.ai_profile_summary ?? 'אין עדיין סיכום AI'} fullWidth />
                  <AdminPanelField label="נתונים מורחבים" mode="view" viewValue={formatStructuredValue(selectedContact.extended_data)} fullWidth />
                  <AdminPanelField label="מצבי אזהרה" mode="view" viewValue={buildWarnings(selectedContact).length ? buildWarnings(selectedContact).join(' | ') : 'ללא אזהרות'} fullWidth />
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
                    onChange={(e) => { setBulkField(e.target.value); setBulkValue(null); setBulkArrayValues([]); setBulkArrayMode('replace') }}
                  >
                    <option value="">— בחר שדה —</option>
                    <option value="availability">זמינות</option>
                    <option value="role">תפקיד</option>
                    <option value="region_id">אזור</option>
                    <option value="city_id">עיר</option>
                  </select>
                </label>

                {bulkField === 'availability' && (
                  <div className="space-y-3">
                    <DictionaryMultiSelect
                      label="זמינות"
                      options={availabilityOptions}
                      value={bulkArrayValues}
                      onChange={setBulkArrayValues}
                      searchable={false}
                    />
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-2 text-[12px] font-semibold text-slate-600">אופן העדכון</div>
                      <label className="mr-3 inline-flex items-center gap-2 text-[13px]"><input type="radio" checked={bulkArrayMode === 'replace'} onChange={() => setBulkArrayMode('replace')} /> החלפת כל הערכים הקיימים</label>
                      <label className="mr-3 inline-flex items-center gap-2 text-[13px]"><input type="radio" checked={bulkArrayMode === 'add'} onChange={() => setBulkArrayMode('add')} /> הוספה לערכים הקיימים</label>
                    </div>
                  </div>
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
                  disabled={!bulkField || (bulkField === 'availability' ? bulkArrayValues.length === 0 : bulkValue === null || bulkValue === '') || bulkPending}
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

function PanelTextInput({
  id,
  value,
  onChange,
  type = 'text',
  dir,
}: {
  id: string
  value: unknown
  onChange: (value: string) => void
  type?: React.HTMLInputTypeAttribute
  dir?: 'ltr' | 'rtl'
}) {
  return (
    <input
      id={id}
      type={type}
      dir={dir}
      value={value == null ? '' : String(value)}
      onChange={(event) => onChange(event.target.value)}
      className={panelInputClass}
    />
  )
}

function PanelTextArea({ id, value, onChange }: { id: string; value: unknown; onChange: (value: string) => void }) {
  return (
    <textarea
      id={id}
      rows={4}
      value={value == null ? '' : String(value)}
      onChange={(event) => onChange(event.target.value)}
      className={`${panelInputClass} min-h-[96px] resize-y`}
    />
  )
}

function PanelSelectInput({
  id,
  value,
  options,
  onChange,
}: {
  id: string
  value: unknown
  options: { id: number; name: string }[]
  onChange: (value: number | null) => void
}) {
  return (
    <select
      id={id}
      value={value == null ? '' : String(value)}
      onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
      className={panelInputClass}
    >
      <option value="">ללא בחירה</option>
      {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
    </select>
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
  colorRoleId,
  active,
  onClick,
}: {
  label: string
  value: React.ReactNode
  colorRoleId: number
  active?: boolean
  onClick?: () => void
}) {
  const color = getRoleColor(colorRoleId)

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-r-4 p-4 text-right shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      style={{
        borderColor: active ? color.solid : '#E2E8F0',
        borderRightColor: color.solid,
        backgroundColor: active ? color.chipBg : '#FFFFFF',
      }}
    >
      <div className="text-[13px] font-semibold" style={{ color: active ? color.chipText : '#64748B' }}>{label}</div>
      <div className="mt-2 text-[26px] font-bold" style={{ color: active ? color.chipText : '#0F172A' }}>{value}</div>
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

function buildWarnings(contact: ContactRow) {
  const warnings: string[] = []
  if (contact.isDuplicateEmail) warnings.push('כפילות אימייל')
  if (contact.hasBrokenCv) warnings.push('קו"ח שבור')
  if (contact.hasNoPhoneButEmail) warnings.push('אין טלפון')
  if (contact.isPartialProfile) warnings.push(`פרופיל חלקי: חסרים ${contact.partialProfileMissing.join(' ו')}`)
  return warnings
}

function availabilityTone(availabilityId: number | null | undefined): 'success' | 'warning' | 'muted' {
  if (availabilityId === 1 || availabilityId === 2) return 'success'
  if (availabilityId === 3 || availabilityId === 4) return 'warning'
  return 'muted'
}

async function openContactCv(contact: { cv_link?: string | null; cv_storage_path?: string | null; has_cv?: boolean | null }) {
  if (contact.cv_link) {
    window.open(contact.cv_link, '_blank', 'noopener,noreferrer')
    return
  }
  await openApplicationCv(contact)
}

function createContactEditDraft(contact: ContactRow): Partial<AdminContactRow> {
  return {
    display_name: contact.display_name ?? '',
    first_name: contact.first_name ?? '',
    last_name: contact.last_name ?? '',
    full_name: contact.full_name ?? '',
    phone: contact.phone ?? '',
    second_phone: contact.second_phone ?? '',
    email: contact.email ?? '',
    second_email: contact.second_email ?? '',
    gender: contact.gender ?? null,
    birth_year: contact.birth_year ?? null,
    role: contact.role ?? null,
    sub_role: normalizeNumberArray(contact.sub_role),
    professional_title: contact.professional_title ?? '',
    experience: contact.experience ?? null,
    license_no: contact.license_no ?? '',
    academic_education: contact.academic_education ?? '',
    professional_courses: contact.professional_courses ?? '',
    systems_used: normalizeNumberArray(contact.systems_used),
    procedures_experience: normalizeNumberArray(contact.procedures_experience),
    additional_skills_notes: contact.additional_skills_notes ?? '',
    preferred_scope: normalizeNumberArray(contact.preferred_scope),
    candidate_availability_ids: normalizeNumberArray(contact.candidate_availability_ids),
    candidate_salary_type_ids: normalizeNumberArray(contact.candidate_salary_type_ids),
    salary_expectation_hourly: contact.salary_expectation_hourly ?? null,
    salary_expectation_monthly: contact.salary_expectation_monthly ?? null,
    mobility_id: contact.mobility_id ?? null,
    preferred_regions: normalizeNumberArray(contact.preferred_regions),
    preferred_cities: normalizeNumberArray(contact.preferred_cities),
    preferred_all_country: Boolean(contact.preferred_all_country),
    locality_type: contact.locality_type ?? '',
    work_schedule_text: contact.work_schedule_text ?? '',
    work_status: contact.work_status ?? null,
    languages: normalizeNumberArray(contact.languages),
    account_link: contact.account_link ?? null,
    linkedin_url: contact.linkedin_url ?? '',
    facebook_url: contact.facebook_url ?? '',
    facebook_name: contact.facebook_name ?? '',
    portfolio_url: contact.portfolio_url ?? '',
    recommendations_url: contact.recommendations_url ?? '',
    photo_url: contact.photo_url ?? '',
    personal_summary: contact.personal_summary ?? '',
    candidate_notes: contact.candidate_notes ?? '',
    notes: contact.notes ?? '',
    current_employer: contact.current_employer ?? '',
    source: contact.source ?? null,
    check_status: contact.check_status ?? null,
    social_status: contact.social_status ?? null,
    next_follow_up: toDateTimeLocalValue(contact.next_follow_up),
    cv_link: contact.cv_link ?? '',
    cv_received_date: contact.cv_received_date ?? null,
    city_id: contact.city_id ?? null,
    region_id: contact.region_id ?? null,
    tax_type_id: contact.tax_type_id ?? null,
  }
}

function buildChangedContactPatch(
  original: ContactRow,
  draft: Partial<AdminContactRow>,
): { patch: Record<string, unknown>; errors: Record<string, string> } {
  const patch: Record<string, unknown> = {}
  const errors: Record<string, string> = {}
  const originalRecord = original as unknown as Record<string, unknown>
  const draftRecord = draft as unknown as Record<string, unknown>

  for (const field of EDITABLE_CONTACT_FIELDS) {
    if (!(field in draftRecord)) continue
    const normalized = normalizeEditableValue(field, draftRecord[field])
    const originalNormalized = normalizeEditableValue(field, originalRecord[field])
    if (!valuesEqual(normalized, originalNormalized)) patch[field] = normalized
  }

  for (const field of ['email', 'second_email'] as const) {
    if (!(field in patch)) continue
    const value = patch[field]
    if (value && !isValidEmail(String(value))) errors[field] = 'כתובת האימייל אינה תקינה'
  }

  for (const field of ['linkedin_url', 'facebook_url', 'portfolio_url', 'recommendations_url', 'photo_url', 'cv_link'] as const) {
    if (!(field in patch)) continue
    const value = patch[field]
    if (value && !isValidUrl(String(value))) errors[field] = 'יש להזין כתובת URL מלאה ותקינה'
  }

  for (const field of ['phone', 'second_phone'] as const) {
    if (!(field in patch)) continue
    const value = patch[field]
    if (value && normalizePhone(String(value)).length !== 12) errors[field] = 'מספר הטלפון אינו תקין'
  }

  if ('birth_year' in patch && patch.birth_year != null) {
    const year = Number(patch.birth_year)
    const currentYear = new Date().getFullYear()
    if (!Number.isInteger(year) || year < 1900 || year > currentYear) errors.birth_year = 'שנת הלידה אינה תקינה'
  }

  if ('next_follow_up' in patch && patch.next_follow_up && Number.isNaN(new Date(String(patch.next_follow_up)).getTime())) {
    errors.next_follow_up = 'מועד הפולו־אפ אינו תקין'
  }

  if ('cv_link' in patch) patch.has_cv = Boolean(patch.cv_link || original.cv_storage_path)
  return { patch, errors }
}

function normalizeEditableValue(field: EditableContactField, value: unknown): unknown {
  if (CONTACT_ARRAY_FIELDS.has(field)) return normalizeNumberArray(value)
  if (CONTACT_NUMBER_FIELDS.has(field)) {
    if (value === '' || value === null || value === undefined) return null
    const numberValue = Number(value)
    return Number.isFinite(numberValue) ? numberValue : null
  }
  if (CONTACT_BOOLEAN_FIELDS.has(field)) return Boolean(value)
  if (field === 'phone' || field === 'second_phone') return value ? toLocalPhone(String(value)) : null
  if (field === 'next_follow_up') {
    if (!value) return null
    const date = new Date(String(value))
    return Number.isNaN(date.getTime()) ? String(value) : date.toISOString()
  }
  if (field === 'cv_received_date') return value ? String(value).slice(0, 10) : null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed || null
  }
  return value ?? null
}

function normalizeNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return Array.from(new Set(value.map(Number).filter(Number.isFinite)))
}

function valuesEqual(left: unknown, right: unknown): boolean {
  if (Array.isArray(left) || Array.isArray(right)) {
    return JSON.stringify(normalizeNumberArray(left).sort((a, b) => a - b)) === JSON.stringify(normalizeNumberArray(right).sort((a, b) => a - b))
  }
  return (left ?? null) === (right ?? null)
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function toLocalPhone(value: string): string {
  const normalized = normalizePhone(value)
  return normalized.startsWith('972') && normalized.length === 12 ? `0${normalized.slice(3)}` : value.replace(/\D/g, '')
}

function toDateTimeLocalValue(value?: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
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

function formatStructuredValue(value: unknown): string {
  if (value == null || value === '') return '—'
  if (Array.isArray(value)) {
    if (!value.length) return '—'
    return value.map((item) => formatStructuredItem(item)).filter(Boolean).join(' | ') || '—'
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (!entries.length) return '—'
    return entries.map(([key, item]) => `${key}: ${formatStructuredItem(item)}`).join(' • ')
  }
  return String(value)
}

function formatStructuredItem(value: unknown): string {
  if (value == null || value === '') return '—'
  if (Array.isArray(value)) return value.map(formatStructuredItem).join(', ')
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => `${key}: ${formatStructuredItem(item)}`)
      .join(', ')
  }
  return String(value)
}

function formatJsonValue(value: Record<string, unknown> | null | undefined): string {
  return formatStructuredValue(value)
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

async function fetchDictionary(table: string, orderBy: 'id' | 'name' = 'id'): Promise<DictItem[]> {
  const { data, error } = await supabase.from(table).select('id,name').order(orderBy)
  if (error) throw error
  return (data ?? []) as DictItem[]
}

function normalizeRoleText(value: string): string {
  return value
    .toLocaleLowerCase('he')
    .replace(/[\/._-]+/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildKpiRoleGroups(roles: DictItem[], aliases: RoleAliasItem[]): KpiRoleDefinition[] {
  const existingRoleIds = new Set(roles.map((role) => Number(role.id)))
  const roleNameById = new Map(roles.map((role) => [Number(role.id), normalizeRoleText(role.name)]))
  const aliasesByRole = new Map<number, Set<string>>()

  aliases.forEach((item) => {
    const roleId = Number(item.role_id)
    const values = aliasesByRole.get(roleId) ?? new Set<string>()
    values.add(normalizeRoleText(item.normalized_alias || item.alias))
    aliasesByRole.set(roleId, values)
  })

  return KPI_ROLE_BLUEPRINTS.map((blueprint) => {
    const preferred = blueprint.preferredNames.map(normalizeRoleText)
    const resolved = roles
      .filter((role) => {
        const roleId = Number(role.id)
        const canonical = roleNameById.get(roleId) ?? ''
        const roleAliases = aliasesByRole.get(roleId) ?? new Set<string>()
        if (blueprint.key === 'experts' && canonical.startsWith('מומחה')) return true
        return preferred.some((name) => canonical === name || roleAliases.has(name))
      })
      .map((role) => Number(role.id))

    const fallback = blueprint.roleIds.filter((roleId) => existingRoleIds.has(roleId))
    const roleIds = Array.from(new Set([...fallback, ...resolved])).sort((a, b) => a - b)
    return {
      key: blueprint.key,
      label: blueprint.label,
      roleIds,
      colorRoleId: roleIds[0] ?? blueprint.colorRoleId,
    }
  }).filter((group) => group.roleIds.length > 0)
}

async function fetchRoleGroupCounts(groups: KpiRoleDefinition[]): Promise<Record<string, number>> {
  const entries = await Promise.all(groups.map(async (group) => {
    const query = supabase
      .from('contact')
      .select('contact_id', { count: 'exact', head: true })
      .in('role', group.roleIds)
    const { count, error } = await query
    if (error) throw error
    return [group.key, count ?? 0] as const
  }))
  return Object.fromEntries(entries)
}

async function fetchRegionCountsForRoles(roleIds: number[]): Promise<Record<number, number>> {
  const normalizedRoleIds = normalizeNumberArray(roleIds)
  if (!normalizedRoleIds.length) return {}

  const pageSize = 1000
  const counts: Record<number, number> = {}
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('contact')
      .select('region_id')
      .in('role', normalizedRoleIds)
      .not('region_id', 'is', null)
      .order('contact_id')
      .range(from, from + pageSize - 1)
    if (error) throw error

    const rows = (data ?? []) as Array<{ region_id: number | null }>
    rows.forEach((row) => {
      const regionId = Number(row.region_id)
      if (Number.isFinite(regionId)) counts[regionId] = (counts[regionId] ?? 0) + 1
    })
    if (rows.length < pageSize) break
    from += pageSize
  }

  return counts
}

function sameNumberSet(left: number[], right: number[]): boolean {
  const a = normalizeNumberArray(left).sort((x, y) => x - y)
  const b = normalizeNumberArray(right).sort((x, y) => x - y)
  return a.length === b.length && a.every((value, index) => value === b[index])
}

function filterSubRolesForRole(subRoleIds: number[], roleId: number | null, subRoles: SubRoleItem[]): number[] {
  if (!roleId) return []
  const allowed = new Set(
    subRoles
      .filter((subRole) => Number(subRole.role_id) === Number(roleId))
      .map((subRole) => Number(subRole.id)),
  )
  return normalizeNumberArray(subRoleIds).filter((subRoleId) => allowed.has(subRoleId))
}


async function fetchContactIdsForTag(tagId: number | null, tagName: string): Promise<number[]> {
  const pageSize = 1000
  const ids = new Set<number>()
  let from = 0

  while (true) {
    const tagIdCondition = tagId == null ? -1 : tagId
    const { data, error } = await supabase
      .from('contact_tags')
      .select('contact_id')
      .or(`tag_id.eq.${tagIdCondition},tag.eq.${escapePostgrestValue(tagName)}`)
      .range(from, from + pageSize - 1)
    if (error) throw error

    const rows = (data ?? []) as { contact_id: number }[]
    rows.forEach((row) => {
      const id = Number(row.contact_id)
      if (Number.isFinite(id)) ids.add(id)
    })
    if (rows.length < pageSize) break
    from += pageSize
  }

  return Array.from(ids)
}

async function runContactsQuery(
  filters: ExtendedFilters,
  page: number,
  pageSize: number,
  sortBy: string | null,
  sortDir: 'asc' | 'desc',
) {
  const sb = supabase

  let tagContactIds: number[] | null = null
  if (filters.tags) {
    const selectedTagId = Number(filters.tags)
    const selectedTag = Number.isFinite(selectedTagId)
      ? await sb.from('dict_candidate_tags').select('id,name').eq('id', selectedTagId).maybeSingle()
      : { data: null, error: null }
    if (selectedTag.error) throw selectedTag.error
    const tagName = selectedTag.data?.name ?? filters.tags
    tagContactIds = await fetchContactIdsForTag(
      Number.isFinite(selectedTagId) ? selectedTagId : null,
      tagName,
    )
    if (!tagContactIds.length) return { contacts: [] as AdminContactRow[], total: 0 }
  }

  let query = sb.from('contact').select('*', { count: 'exact' })

  if (filters.search?.trim()) {
    const q = sanitizePostgrestSearch(filters.search.trim())
    const phoneCore = phoneSearchTerm(filters.search)
    const [matchingAccountsResult, matchingRolesResult, matchingAliasesResult] = await Promise.all([
      sb.from('accounts').select('account_id').ilike('account_name', `%${q}%`).limit(500),
      sb.from('dict_roles').select('id').ilike('name', `%${q}%`).limit(100),
      sb.from('dict_role_aliases').select('role_id').eq('is_active', true).or(`alias.ilike.%${q}%,normalized_alias.ilike.%${q}%`).limit(200),
    ])
    if (matchingAccountsResult.error) throw matchingAccountsResult.error
    if (matchingRolesResult.error) throw matchingRolesResult.error
    if (matchingAliasesResult.error) throw matchingAliasesResult.error

    const accountIds = (matchingAccountsResult.data ?? [])
      .map((account: { account_id: number }) => Number(account.account_id))
      .filter(Number.isFinite)
    const matchingRoleIds = Array.from(new Set([
      ...(matchingRolesResult.data ?? []).map((role: { id: number }) => Number(role.id)),
      ...(matchingAliasesResult.data ?? []).map((alias: { role_id: number }) => Number(alias.role_id)),
    ].filter(Number.isFinite)))

    const textFields = [
      'full_name', 'display_name', 'first_name', 'last_name', 'phone', 'second_phone',
      'email', 'second_email', 'license_no', 'professional_title', 'current_employer', 'linked_org_name',
    ]
    const conditions = textFields.map((field) => `${field}.ilike.%${q}%`)
    if (phoneCore) conditions.push(`phone_norm.ilike.%${phoneCore}%`)
    if (accountIds.length) conditions.push(`account_link.in.(${accountIds.join(',')})`)
    if (matchingRoleIds.length) conditions.push(`role.in.(${matchingRoleIds.join(',')})`)
    query = query.or(conditions.join(','))
  }

  if (filters.role_ids?.length) query = query.in('role', filters.role_ids)
  else if (filters.role) query = query.eq('role', filters.role)
  if (filters.sub_role_ids?.length) query = query.overlaps('sub_role', filters.sub_role_ids)
  if (filters.region_id) query = query.eq('region_id', filters.region_id)
  if (filters.city_id) query = query.eq('city_id', filters.city_id)
  if (filters.availability) query = query.contains('candidate_availability_ids', [filters.availability])
  if (filters.experience) query = query.eq('experience', filters.experience)
  if (filters.source) query = query.eq('source', filters.source)
  if (filters.profile_type) query = query.eq('profile_type', filters.profile_type)
  if (filters.check_status) query = query.eq('check_status', filters.check_status)
  if (filters.social_status) query = query.eq('social_status', filters.social_status)
  if (filters.gender) query = query.eq('gender', filters.gender)
  if (filters.mobility_id) query = query.eq('mobility_id', filters.mobility_id)
  if (filters.tax_type_id) query = query.eq('tax_type_id', filters.tax_type_id)
  if (filters.work_status) query = query.eq('work_status', filters.work_status)
  if (filters.language_ids?.length) query = query.overlaps('languages', filters.language_ids)
  if (filters.preferred_scope_ids?.length) query = query.overlaps('preferred_scope', filters.preferred_scope_ids)
  if (filters.preferred_region_ids?.length) query = query.overlaps('preferred_regions', filters.preferred_region_ids)
  if (filters.preferred_city_ids?.length) query = query.overlaps('preferred_cities', filters.preferred_city_ids)
  if (filters.has_cv === 'yes') query = query.or('has_cv.eq.true,cv_link.not.is.null,cv_storage_path.not.is.null')
  if (filters.has_cv === 'no') query = query
    .or('has_cv.eq.false,has_cv.is.null')
    .is('cv_link', null)
    .is('cv_storage_path', null)
  if (filters.partial_profile === 'yes') query = query.or('role.is.null,city_id.is.null,region_id.is.null')
  if (filters.link_state === 'linked') query = query.not('account_link', 'is', null)
  if (filters.link_state === 'unlinked') query = query.is('account_link', null)
  if (filters.follow_up_due === 'yes') query = query.lte('next_follow_up', new Date().toISOString()).not('next_follow_up', 'is', null)
  if (filters.follow_up_due === 'no') query = query.or(`next_follow_up.is.null,next_follow_up.gt.${new Date().toISOString()}`)
  if (filters.whatsapp_outcome) {
    // מקור אמת יחיד לתרגום דלי → קודי סטטוס (lib/fixPublications/deliveryOutcome).
    // "מעולם לא נשלח" ו"אין נייד" אינם נגזרים מהסטטוס אלא משדות אחרים.
    const outcome = filters.whatsapp_outcome
    if (outcome === 'no_phone') query = query.is('phone_norm', null)
    else if (outcome === 'never_sent') query = query.not('phone_norm', 'is', null).is('whatsapp_campaign_last_sent', null)
    else query = query.in('whatsapp_last_delivery_status', OUTCOME_STATUS_CODES[outcome])
  }
  if (filters.created_from) query = query.gte('created_timestamp', filters.created_from)
  if (filters.created_to) query = query.lte('created_timestamp', filters.created_to + 'T23:59:59')
  if (filters.updated_from) query = query.gte('updated_timestamp', filters.updated_from)
  if (filters.updated_to) query = query.lte('updated_timestamp', filters.updated_to + 'T23:59:59')
  if (tagContactIds !== null) query = query.in('contact_id', tagContactIds)

  const sortColMap: Record<string, string> = {
    full_name: 'full_name', display_name: 'display_name', first_name: 'first_name', last_name: 'last_name',
    phone: 'phone', email: 'email', role: 'role', experience: 'experience', region: 'region_id', city: 'city_id',
    check_status: 'check_status', source: 'source', next_follow_up: 'next_follow_up',
    last_contact: 'last_contact_date', whatsapp: 'whatsapp_campaign_last_sent', created: 'created_timestamp', updated: 'updated_timestamp',
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

function escapePostgrestValue(value: string): string {
  return value.replace(/[,.(){}[\]\"'\\:]/g, ' ').replace(/\s+/g, ' ').trim()
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


