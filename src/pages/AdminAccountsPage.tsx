import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Eye, Pencil } from 'lucide-react'
import { supabase } from '@/lib/supabase'

import { AdminTable, type AdminColumn } from '@/components/admin/AdminTable'
import { AdminActionsMenu } from '@/components/admin/AdminActionsMenu'
import { AdminCountPreview } from '@/components/admin/AdminCountPreview'
import { AdminTablePagination } from '@/components/admin/AdminTablePagination'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { RegionBadge } from '@/components/admin/RegionBadge'
import { formatPhone, phoneSearchTerm, phoneDigits } from '@/lib/normalizePhone'
import { useAccountMutations } from '@/hooks/useAccountMutations'
import { AccountPanel } from '@/components/admin/AccountPanel'
import { MergeRecordsModal } from '@/components/MergeRecordsModal'

// ── Types ─────────────────────────────────────────────────────────────────────
interface AccountRow {
  account_id: number
  account_name: string | null
  bus_id: string | null
  account_status: number | null
  account_type: number | null
  phone: string | null
  second_phone: string | null
  phone_norm: string | null
  email: string | null
  second_email: string | null
  billing_email: string | null
  website_url: string | null
  facebook_url: string | null
  linkedin_url: string | null
  region_id: number | null
  city_id: number | null
  address: string | null
  notes: string | null
  created_timestamp: string | null
  updated_timestamp: string | null
}
interface ContactLite {
  contact_id: number
  full_name: string | null
  phone: string | null
  phone_norm: string | null
  email: string | null
  account_link: number | null
  role: number | null
  profile_type: number | null
}
interface JobLite {
  job_code: string
  account_link: number | null
  job_status: number | null
  public_status: number | null
  job_title: string | null
  job_role: number | null
}
type DictItem = { id: number; name: string }

const PAGE_SIZE = 25
const NEW_DAYS = 30
const ACTIVE_JOB_STATUS_ID = 3
const MERGED_STATUS_ID = 11
const EMPLOYER_PROFILE_TYPE = 2

type PanelMode = 'view' | 'edit' | 'create'
type SortDir = 'asc' | 'desc'

function dictName(map: Map<number, string>, id: number | null | undefined): string {
  if (id == null) return '—'
  return map.get(Number(id)) ?? '—'
}
function fmtDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('he-IL')
}
function loadAll<T>(table: string, columns: string, orderCol: string) {
  return async (): Promise<T[]> => {
    const PAGE = 1000
    const all: T[] = []
    let from = 0
    while (true) {
      const { data, error } = await supabase.from(table).select(columns).order(orderCol).range(from, from + PAGE - 1)
      if (error) throw error
      const batch = (data ?? []) as T[]
      if (!batch.length) break
      all.push(...batch)
      if (batch.length < PAGE) break
      from += PAGE
    }
    return all
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminAccountsPage() {
  const navigate = useNavigate()
  const { updateAccount, insertAccount, bulkUpdateAccounts, mergeAccountsRpc } = useAccountMutations()

  // ─ Data (shared query keys → invalidated by useAccountMutations/useContactMutations) ─
  const { data: accounts = [], isLoading, error } = useQuery<AccountRow[]>({
    queryKey: ['accounts', 'admin-board'],
    queryFn: loadAll<AccountRow>(
      'accounts',
      'account_id,account_name,bus_id,account_status,account_type,phone,second_phone,phone_norm,email,second_email,billing_email,website_url,facebook_url,linkedin_url,region_id,city_id,address,notes,created_timestamp,updated_timestamp',
      'account_id'
    ),
    staleTime: 60_000,
  })
  const { data: contacts = [] } = useQuery<ContactLite[]>({
    queryKey: ['contacts', 'account-links'],
    queryFn: loadAll<ContactLite>('contact', 'contact_id,full_name,phone,phone_norm,email,account_link,role,profile_type', 'contact_id'),
    staleTime: 60_000,
  })
  const { data: jobs = [] } = useQuery<JobLite[]>({
    queryKey: ['jobs', 'account-counts'],
    queryFn: loadAll<JobLite>('job', 'job_code,account_link,job_status,public_status,job_title,job_role', 'job_code'),
    staleTime: 60_000,
  })
  const { data: cities = [] } = useQuery<(DictItem & { region_id: number | null })[]>({
    queryKey: ['dict_cities-all'],
    queryFn: loadAll<DictItem & { region_id: number | null }>('dict_cities', 'id,name,region_id', 'name'),
    staleTime: 600_000,
  })
  const { data: regions = [] } = useQuery<DictItem[]>({
    queryKey: ['dict_regions'],
    queryFn: async () => (await supabase.from('dict_regions').select('id,name').order('id')).data as DictItem[] ?? [],
    staleTime: 600_000,
  })
  const { data: accountTypes = [] } = useQuery<DictItem[]>({
    queryKey: ['dict_account_types'],
    queryFn: async () => (await supabase.from('dict_account_types').select('id,name').order('id')).data as DictItem[] ?? [],
    staleTime: 600_000,
  })
  const { data: accountStatuses = [] } = useQuery<DictItem[]>({
    queryKey: ['dict_account_statuses'],
    queryFn: async () => (await supabase.from('dict_account_statuses').select('id,name').order('id')).data as DictItem[] ?? [],
    staleTime: 600_000,
  })
  const { data: roles = [] } = useQuery<DictItem[]>({
    queryKey: ['dict_roles'],
    queryFn: async () => (await supabase.from('dict_roles').select('id,name').order('id')).data as DictItem[] ?? [],
    staleTime: 600_000,
  })
  const { data: profileTypes = [] } = useQuery<DictItem[]>({
    queryKey: ['dict_profile_types'],
    queryFn: async () => (await supabase.from('dict_profile_types').select('id,name').order('id')).data as DictItem[] ?? [],
    staleTime: 600_000,
  })

  const citiesMap = useMemo(() => new Map(cities.map((c) => [Number(c.id), c.name])), [cities])
  const regionsMap = useMemo(() => new Map(regions.map((r) => [Number(r.id), r.name])), [regions])
  const typesMap = useMemo(() => new Map(accountTypes.map((t) => [Number(t.id), t.name])), [accountTypes])
  const rolesMap = useMemo(() => new Map(roles.map((r) => [Number(r.id), r.name])), [roles])
  const profileTypesMap = useMemo(() => new Map(profileTypes.map((p) => [Number(p.id), p.name])), [profileTypes])

  // ─ Enrichment (client-side for now; server-side pagination = separate round) ─
  const contactsByAccount = useMemo(() => {
    const m = new Map<number, ContactLite[]>()
    contacts.forEach((c) => {
      if (c.account_link == null) return
      const id = Number(c.account_link)
      if (!m.has(id)) m.set(id, [])
      m.get(id)!.push(c)
    })
    return m
  }, [contacts])
  const jobsByAccount = useMemo(() => {
    const m = new Map<number, JobLite[]>()
    jobs.forEach((j) => {
      if (j.account_link == null) return
      const id = Number(j.account_link)
      if (!m.has(id)) m.set(id, [])
      m.get(id)!.push(j)
    })
    return m
  }, [jobs])

  const enriched = useMemo(() => {
    return accounts.map((a) => {
      const linkedContacts = contactsByAccount.get(Number(a.account_id)) ?? []
      const relatedJobs = jobsByAccount.get(Number(a.account_id)) ?? []
      const employerContact = linkedContacts.find((c) => Number(c.profile_type) === EMPLOYER_PROFILE_TYPE) ?? null
      return {
        ...a,
        cityName: dictName(citiesMap, a.city_id),
        regionName: dictName(regionsMap, a.region_id),
        typeName: dictName(typesMap, a.account_type),
        linkedContacts,
        relatedJobs,
        employerContact,
        linkedContactsCount: linkedContacts.length,
        activeJobsCount: relatedJobs.filter((j) => Number(j.job_status) === ACTIVE_JOB_STATUS_ID).length,
        totalJobsCount: relatedJobs.length,
      }
    })
  }, [accounts, contactsByAccount, jobsByAccount, citiesMap, regionsMap, typesMap])
  type EnrichedAccount = (typeof enriched)[number]

  // ─ KPIs (org-only) ─
  const kpis = useMemo(() => {
    const visible = enriched.filter((a) => Number(a.account_status) !== MERGED_STATUS_ID)
    const total = visible.length
    const cutoff = Date.now() - NEW_DAYS * 24 * 60 * 60 * 1000
    const newCount = visible.filter((a) => a.created_timestamp && new Date(a.created_timestamp).getTime() >= cutoff).length
    const byStatus = new Map<number, number>()
    visible.forEach((a) => {
      const s = Number(a.account_status)
      if (s) byStatus.set(s, (byStatus.get(s) ?? 0) + 1)
    })
    return { total, newCount, byStatus }
  }, [enriched])

  // ─ Filters (org-only) ─
  const [filters, setFilters] = useState({
    search: '',
    account_type: '' as string,
    account_status: '' as string,
    region_id: '' as string,
    city_id: '' as string,
    linked_person: '',
    created_from: '',
    created_to: '',
    updated_from: '',
    updated_to: '',
  })
  const setF = (k: keyof typeof filters, v: string) => { setFilters((p) => ({ ...p, [k]: v })); setPage(1) }
  const hasActiveFilter = useMemo(
    () => Object.values(filters).some((v) => String(v).trim() !== ''),
    [filters]
  )

  const cityOptions = useMemo(
    () => (filters.region_id ? cities.filter((c) => Number(c.region_id) === Number(filters.region_id)) : cities),
    [cities, filters.region_id]
  )

  const filteredRows = useMemo(() => {
    const q = filters.search.trim().toLowerCase()
    const qPhone = phoneSearchTerm(filters.search)
    const person = filters.linked_person.trim().toLowerCase()
    return enriched.filter((a) => {
      if (Number(a.account_status) === MERGED_STATUS_ID && Number(filters.account_status) !== MERGED_STATUS_ID) return false
      if (filters.account_type && Number(a.account_type) !== Number(filters.account_type)) return false
      if (filters.account_status && Number(a.account_status) !== Number(filters.account_status)) return false
      if (filters.region_id && Number(a.region_id) !== Number(filters.region_id)) return false
      if (filters.city_id && Number(a.city_id) !== Number(filters.city_id)) return false
      if (filters.created_from && (!a.created_timestamp || a.created_timestamp < filters.created_from)) return false
      if (filters.created_to && (!a.created_timestamp || a.created_timestamp > filters.created_to + 'T23:59:59')) return false
      if (filters.updated_from && (!a.updated_timestamp || a.updated_timestamp < filters.updated_from)) return false
      if (filters.updated_to && (!a.updated_timestamp || a.updated_timestamp > filters.updated_to + 'T23:59:59')) return false
      if (person) {
        const hit = a.linkedContacts.some((c) => (c.full_name ?? '').toLowerCase().includes(person))
        if (!hit) return false
      }
      if (q) {
        const inText = [a.account_name, a.email, a.website_url, a.bus_id, a.employerContact?.full_name]
          .some((v) => (v ?? '').toString().toLowerCase().includes(q))
        const inPhone = qPhone.length >= 3 && (
          phoneDigits(a.phone_norm ?? a.phone).includes(qPhone) ||
          a.linkedContacts.some((c) => phoneDigits(c.phone_norm ?? c.phone).includes(qPhone))
        )
        if (!inText && !inPhone) return false
      }
      return true
    })
  }, [enriched, filters])

  // ─ Sort + pagination ─
  const [sortBy, setSortBy] = useState<string>('account_name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [page, setPage] = useState(1)
  const toggleSort = (key: string) => {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortBy(key); setSortDir('asc') }
  }
  const sortedRows = useMemo(() => {
    const rows = [...filteredRows]
    const dir = sortDir === 'asc' ? 1 : -1
    rows.sort((a, b) => {
      const get = (r: EnrichedAccount): string | number => {
        switch (sortBy) {
          case 'account_name': return (r.account_name ?? '').toString()
          case 'typeName': return r.typeName
          case 'account_status': return Number(r.account_status ?? 0)
          case 'cityName': return r.cityName
          case 'regionName': return r.regionName
          case 'created_timestamp': return r.created_timestamp ?? ''
          case 'updated_timestamp': return r.updated_timestamp ?? ''
          default: return (r.account_name ?? '').toString()
        }
      }
      const av = get(a), bv = get(b)
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
      return String(av).localeCompare(String(bv), 'he') * dir
    })
    return rows
  }, [filteredRows, sortBy, sortDir])

  const total = sortedRows.length
  const pageData = sortedRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // ─ Panel ─
  const [sheet, setSheet] = useState<{ open: boolean; accountId: number | null; mode: PanelMode }>({
    open: false, accountId: null, mode: 'view',
  })
  const selected = useMemo(
    () => enriched.find((a) => Number(a.account_id) === Number(sheet.accountId)) ?? null,
    [enriched, sheet.accountId]
  )
  const openView = (a: EnrichedAccount) => setSheet({ open: true, accountId: a.account_id, mode: 'view' })
  const closePanel = () => setSheet({ open: false, accountId: null, mode: 'view' })

  // ─ בחירת שורות + פעולות גורפות + מיזוג (שוחזר) ─
  const [toast, setToast] = useState<{ text: string; tone: 'success' | 'error' } | null>(null)
  const showToast = (text: string, tone: 'success' | 'error' = 'success') => { setToast({ text, tone }); window.setTimeout(() => setToast(null), 2800) }

  const [selectedRows, setSelectedRows] = useState<number[]>([])
  const [bulkField, setBulkField] = useState('')
  const [bulkValue, setBulkValue] = useState('')
  const [mergeOpen, setMergeOpen] = useState(false)
  const [mergePending, setMergePending] = useState(false)

  const nameFrom = (list: DictItem[], id: number | null | undefined) => list.find((x) => Number(x.id) === Number(id))?.name ?? '—'
  const pageIds = pageData.map((r) => Number(r.account_id))
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedRows.includes(id))
  const someSelected = pageIds.some((id) => selectedRows.includes(id))
  const toggleRow = (id: number) => setSelectedRows((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  const toggleSelectAll = () => setSelectedRows((prev) => allSelected ? prev.filter((id) => !pageIds.includes(id)) : Array.from(new Set([...prev, ...pageIds])))

  const bulkValueOptions: DictItem[] = bulkField === 'account_status' ? accountStatuses
    : bulkField === 'account_type' ? accountTypes
    : bulkField === 'region_id' ? regions
    : bulkField === 'city_id' ? cities
    : []

  const applyBulkUpdate = async () => {
    if (!selectedRows.length) { showToast('לא נבחרו רשומות', 'error'); return }
    if (!bulkField || !bulkValue) { showToast('בחרי שדה וערך', 'error'); return }
    const patch = { [bulkField]: Number(bulkValue) }
    try {
      const { error: err } = await bulkUpdateAccounts(selectedRows, patch)
      if (err) throw err
      setBulkField(''); setBulkValue(''); setSelectedRows([])
      showToast(`עודכנו ${selectedRows.length} רשומות`)
    } catch { showToast('שגיאה בעדכון הגורף', 'error') }
  }

  const handleMergeAccounts = async (masterId: number, overrides: Record<string, unknown>) => {
    const dupIds = selectedRows.filter((id) => id !== masterId)
    setMergePending(true)
    try {
      const { error: err } = await mergeAccountsRpc({ master_id: masterId, dup_ids: dupIds, overrides })
      if (err) throw err
      showToast('הארגונים מוזגו בהצלחה')
      setMergeOpen(false); setSelectedRows([])
    } catch { showToast('שגיאה במיזוג הארגונים', 'error') } finally { setMergePending(false) }
  }

  // ─ Columns ─
  const columns: AdminColumn<EnrichedAccount>[] = [
    { key: 'account_name', label: 'שם ארגון', sortable: true, render: (r) => (
      <button onClick={() => openView(r)} className="text-right font-semibold text-[#008080] hover:underline">
        {r.account_name || '—'}
      </button>
    ) },
    { key: 'typeName', label: 'סוג ארגון', sortable: true, render: (r) => r.typeName },
    { key: 'account_status', label: 'סטטוס ארגון', sortable: true, render: (r) => (
      <StatusBadge statusType="account" statusId={r.account_status} />
    ) },
    { key: 'phone', label: 'טלפון', nowrap: true, render: (r) => formatPhone(r.phone) || '—' },
    { key: 'email', label: 'מייל ארגון', render: (r) => r.email || '—' },
    { key: 'regionName', label: 'אזור', sortable: true, render: (r) => <RegionBadge regionId={r.region_id} label={r.regionName} /> },
    { key: 'cityName', label: 'עיר', sortable: true, render: (r) => r.cityName },
    { key: 'employer', label: 'שם מעסיק', render: (r) => r.employerContact?.full_name || '—' },
    { key: 'linkedContactsCount', label: 'אנשים מקושרים', render: (r) => (
      <AdminCountPreview
        count={r.linkedContactsCount}
        renderPreview={() => <LinkedPreview contacts={r.linkedContacts} profileTypesMap={profileTypesMap} rolesMap={rolesMap} />}
      />
    ) },
    { key: 'created_timestamp', label: 'נוצר', sortable: true, nowrap: true, render: (r) => fmtDate(r.created_timestamp) },
    { key: 'updated_timestamp', label: 'עודכן', sortable: true, nowrap: true, render: (r) => fmtDate(r.updated_timestamp) },
    { key: 'actions', label: '', render: (r) => (
      <AdminActionsMenu
        ariaLabel={`פעולות לארגון ${r.account_name ?? r.account_id}`}
        items={[
          { key: 'view', icon: <Eye className="h-4 w-4" />, label: 'צפייה בפאנל', onClick: () => openView(r) },
          { key: 'edit', icon: <Pencil className="h-4 w-4" />, label: 'עריכה', onClick: () => setSheet({ open: true, accountId: r.account_id, mode: 'edit' }) },
          { key: '360', icon: <Eye className="h-4 w-4" />, label: 'מסך 360', onClick: () => navigate(`/admin/accounts/${r.account_id}`) },
        ]}
      />
    ) },
  ]

  return (
    <div dir="rtl" className="min-h-screen bg-[#FAFAF7] p-6" style={{ fontFamily: 'Heebo, Assistant, sans-serif' }}>
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#0F0F10]">ארגונים</h1>
          <p className="text-[14px] text-[#6B6B6B]">כל הארגונים במערכת — כולל ארגונים בלי משרות</p>
        </div>
        <button
          onClick={() => setSheet({ open: true, accountId: null, mode: 'create' })}
          className="inline-flex items-center gap-2 rounded-full bg-[#008080] px-5 py-2.5 text-[14px] font-bold text-white transition hover:bg-[#006D6D]"
        >
          <Plus className="h-4 w-4" /> ארגון חדש
        </button>
      </div>

      {/* KPIs (org-only) */}
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="סך כל הארגונים" value={kpis.total} />
        <KpiCard label="ארגונים חדשים (30 יום)" value={kpis.newCount} />
        <div className="col-span-2 rounded-[16px] border border-[#E5E7EB] bg-white p-4">
          <div className="mb-2 text-[12px] font-semibold text-[#6B6B6B]">פילוח לפי סטטוס ארגון</div>
          <div className="flex flex-wrap gap-2">
            {accountStatuses.filter((s) => s.id !== MERGED_STATUS_ID).map((s) => (
              <span key={s.id} className="inline-flex items-center gap-1.5 rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[12px]">
                <span className="text-[#2D2D2D]">{s.name}</span>
                <span className="font-bold text-[#008080]">{kpis.byStatus.get(s.id) ?? 0}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Filters (org-only) */}
      <div className="mb-4 rounded-[16px] border border-[#E5E7EB] bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-4">
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              value={filters.search}
              onChange={(e) => setF('search', e.target.value)}
              placeholder="חיפוש: שם, טלפון, מייל, אתר, ח.פ., אדם מקושר"
              className="w-full rounded-xl border border-[#D9D9D9] bg-white py-2.5 pr-9 pl-3 text-[14px] outline-none focus:border-[#008080]"
            />
          </div>
          <FilterSelect value={filters.account_type} onChange={(v) => setF('account_type', v)} placeholder="סוג ארגון" options={accountTypes} />
          <FilterSelect value={filters.account_status} onChange={(v) => setF('account_status', v)} placeholder="סטטוס ארגון" options={accountStatuses} />
          <FilterSelect value={filters.region_id} onChange={(v) => { setF('region_id', v); setF('city_id', '') }} placeholder="אזור" options={regions} />
          <FilterSelect value={filters.city_id} onChange={(v) => setF('city_id', v)} placeholder="עיר" options={cityOptions} />
          <input value={filters.linked_person} onChange={(e) => setF('linked_person', e.target.value)} placeholder="אדם מקושר" className="rounded-xl border border-[#D9D9D9] py-2.5 px-3 text-[14px] outline-none focus:border-[#008080]" />
          <DateField label="נוצר מ־" value={filters.created_from} onChange={(v) => setF('created_from', v)} />
          <DateField label="נוצר עד" value={filters.created_to} onChange={(v) => setF('created_to', v)} />
          <DateField label="עודכן מ־" value={filters.updated_from} onChange={(v) => setF('updated_from', v)} />
          <DateField label="עודכן עד" value={filters.updated_to} onChange={(v) => setF('updated_to', v)} />
        </div>
        {hasActiveFilter && (
          <button onClick={() => { setFilters({ search: '', account_type: '', account_status: '', region_id: '', city_id: '', linked_person: '', created_from: '', created_to: '', updated_from: '', updated_to: '' }); setPage(1) }} className="mt-3 text-[13px] font-semibold text-[#008080] hover:underline">
            ניקוי סינונים
          </button>
        )}
      </div>

      {/* Table */}
      <AdminTable<EnrichedAccount>
        columns={columns}
        data={pageData}
        keyField="account_id"
        isLoading={isLoading}
        error={error ? 'שגיאה בטעינת הארגונים' : undefined}
        hasActiveFilter={hasActiveFilter}
        sortKey={sortBy}
        sortDir={sortDir}
        onSort={toggleSort}
        minWidth="1000px"
        selectedIds={selectedRows.map(String)}
        onSelectId={(id) => toggleRow(Number(id))}
        allSelected={allSelected}
        someSelected={someSelected}
        onSelectAll={toggleSelectAll}
        bulkActions={
          <div className="flex flex-wrap items-center gap-2">
            <select value={bulkField} onChange={(e) => { setBulkField(e.target.value); setBulkValue('') }} className="rounded-lg border border-[#D9D9D9] bg-white px-2 py-1 text-[13px]">
              <option value="">שדה לעדכון גורף</option>
              <option value="account_status">סטטוס ארגון</option>
              <option value="account_type">סוג ארגון</option>
              <option value="region_id">אזור</option>
              <option value="city_id">עיר</option>
            </select>
            <select value={bulkValue} onChange={(e) => setBulkValue(e.target.value)} disabled={!bulkField} className="rounded-lg border border-[#D9D9D9] bg-white px-2 py-1 text-[13px] disabled:opacity-50">
              <option value="">ערך חדש</option>
              {bulkValueOptions.map((o) => <option key={o.id} value={String(o.id)}>{o.name}</option>)}
            </select>
            <button onClick={applyBulkUpdate} className="rounded-lg bg-[#008080] px-3 py-1 text-[13px] font-bold text-white hover:bg-[#006D6D]">בצע שינוי גורף</button>
            {selectedRows.length >= 2 && (
              <button onClick={() => setMergeOpen(true)} className="rounded-lg border border-[#B45309] px-3 py-1 text-[13px] font-bold text-[#B45309] hover:bg-[#FFFBEB]">🔀 מיזוג רשומות</button>
            )}
            <button onClick={() => setSelectedRows([])} className="rounded-lg border border-[#D9D9D9] px-3 py-1 text-[13px] font-semibold text-[#6B6B6B] hover:bg-[#F3F4F6]">נקה בחירה</button>
          </div>
        }
        pagination={<AdminTablePagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />}
      />

      {/* Panel */}
      {sheet.open && (selected || sheet.mode === 'create') && (
        <AccountPanel
          account={selected}
          mode={sheet.mode}
          onModeChange={(m) => setSheet((p) => ({ ...p, mode: m }))}
          onClose={closePanel}
          navigate={navigate}
          dicts={{ accountTypes, accountStatuses, profileTypesMap, rolesMap }}
          save={async (patch, id) => (id ? updateAccount(id, patch) : insertAccount(patch))}
        />
      )}

      {/* מיזוג ארגונים */}
      {mergeOpen && selectedRows.length >= 2 && (() => {
        const selectedAccounts = selectedRows
          .map((id) => pageData.find((a) => Number(a.account_id) === id))
          .filter(Boolean) as EnrichedAccount[]
        if (selectedAccounts.length < 2) return null
        return (
          <MergeRecordsModal
            records={selectedAccounts as unknown as Record<string, unknown>[]}
            idField="account_id"
            nameField="account_name"
            displayFields={[
              { key: 'account_name' as never, label: 'שם ארגון' },
              { key: 'phone' as never, label: 'טלפון' },
              { key: 'email' as never, label: 'מייל' },
              { key: 'address' as never, label: 'כתובת' },
              { key: 'account_status' as never, label: 'סטטוס', format: (v) => nameFrom(accountStatuses, v as number) },
              { key: 'account_type' as never, label: 'סוג', format: (v) => nameFrom(accountTypes, v as number) },
              { key: 'region_id' as never, label: 'אזור', format: (v) => nameFrom(regions, v as number) },
              { key: 'city_id' as never, label: 'עיר', format: (v) => nameFrom(cities, v as number) },
              { key: 'notes' as never, label: 'הערות' },
            ]}
            onConfirm={handleMergeAccounts}
            onClose={() => setMergeOpen(false)}
            pending={mergePending}
            title="מיזוג ארגונים"
          />
        )
      })()}

      {toast && (
        <div className={`fixed bottom-4 left-4 z-[60] rounded-2xl border px-4 py-3 text-[13px] font-semibold shadow-md ${toast.tone === 'success' ? 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]' : 'border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]'}`}>
          {toast.text}
        </div>
      )}
    </div>
  )
}

// ── Small building blocks ─────────────────────────────────────────────────────
function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[16px] border border-[#E5E7EB] bg-white p-4">
      <div className="text-[12px] font-semibold text-[#6B6B6B]">{label}</div>
      <div className="mt-1 text-2xl font-black text-[#0F0F10]">{value}</div>
    </div>
  )
}
function FilterSelect({ value, onChange, placeholder, options }: { value: string; onChange: (v: string) => void; placeholder: string; options: DictItem[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-xl border border-[#D9D9D9] bg-white py-2.5 px-3 text-[14px] outline-none focus:border-[#008080]" style={{ color: value ? '#0F0F10' : '#9CA3AF' }}>
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o.id} value={o.id} style={{ color: '#0F0F10' }}>{o.name}</option>)}
    </select>
  )
}
function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-[#D9D9D9] bg-white px-3 text-[13px] text-[#6B6B6B]">
      <span className="shrink-0">{label}</span>
      <input type="date" value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-transparent py-2.5 outline-none" />
    </label>
  )
}
function LinkedPreview({ contacts, profileTypesMap, rolesMap }: { contacts: ContactLite[]; profileTypesMap: Map<number, string>; rolesMap: Map<number, string> }) {
  if (!contacts.length) return <span className="text-[#9CA3AF]">אין אנשים מקושרים</span>
  return (
    <div className="space-y-2">
      {contacts.slice(0, 8).map((c) => (
        <div key={c.contact_id} className="border-b border-[#F3F4F6] pb-1.5 last:border-0">
          <div className="font-semibold text-[#2D2D2D]">{c.full_name || '—'}</div>
          <div className="text-[12px] text-[#6B6B6B]">
            {dictName(profileTypesMap, c.profile_type)}
            {c.role ? ` · ${dictName(rolesMap, c.role)}` : ''}
          </div>
          <div className="text-[12px] text-[#6B6B6B]" dir="ltr">
            {formatPhone(c.phone) || ''}{c.email ? ` · ${c.email}` : ''}
          </div>
        </div>
      ))}
      {contacts.length > 8 && <div className="text-[12px] text-[#9CA3AF]">ועוד {contacts.length - 8}…</div>}
    </div>
  )
}
