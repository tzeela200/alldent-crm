/**
 * מסך "פרסומי WhatsApp" — מעקב אחרי מי קיבל פרסום ומתי.
 *
 * המסך אינו שולח הודעות ואינו מסנכרן מול Fix Digital. הוא קולט את דוח
 * תוצאות הקמפיין שמיוצא מ-Fix, מתאים אותו ל-Supabase לפי נייד מנורמל,
 * ומציג תמונת מצב. Supabase נשאר מקור האמת — נתוני Fix לעולם אינם דורסים
 * שם, אימייל, תפקיד, עיר, אזור, סטטוס תעסוקתי או פרופיל.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Send, Upload, FileSpreadsheet, X, AlertTriangle, CheckCircle2, Loader2,
  RotateCcw, Columns3, Building2, Layers,
} from 'lucide-react'
import { toast } from 'sonner'

import { Shell, Toolbar, SearchBar, ActionButton, StatusPill, KPICard } from '@/components/layout/Shell'
import { AdminTable, type AdminColumn } from '@/components/admin/AdminTable'
import { AdminTablePagination } from '@/components/admin/AdminTablePagination'
import { DictionaryMultiSelect } from '@/components/ui/DictionaryMultiSelect'
import { formatPhone } from '@/lib/normalizePhone'
import {
  DELIVERY_STATUS_ORDER, getDeliveryStatusMeta, type DeliveryTone,
} from '@/lib/fixPublications/deliveryStatus'
import { MATCH_RESULT_LABELS, CAMPAIGN_FIELD_LABELS } from '@/lib/fixPublications/campaignParser'
import {
  usePublicationsOverview, usePublicationDicts, usePublicationStats, useCampaigns,
  useCampaignPreview, useCommitCampaign, auditOf,
  EMPTY_FILTERS, hasActiveFilters,
  type PublicationFilters, type PublicationRow, type CampaignPreview, type CampaignPlan,
} from '@/hooks/useFixPublications'

type Tab = 'overview' | 'import'

// בורר עמודות — אותו דפוס כמו במסך אנשי קשר (localStorage + איפוס לברירת מחדל)
const VISIBLE_COLUMNS_STORAGE_KEY = 'alldent.fixPublications.visibleColumns.v2'

const ALL_COLUMNS: { key: string; label: string }[] = [
  { key: 'entity_name',          label: 'שם' },
  { key: 'entity_type',          label: 'סוג רשומה' },
  { key: 'phone',                label: 'נייד' },
  { key: 'role_name',            label: 'תפקיד' },
  { key: 'region_name',          label: 'אזור' },
  { key: 'city_name',            label: 'עיר' },
  { key: 'last_delivery_status', label: 'סטטוס שליחה' },
  { key: 'last_sent_at',         label: 'תאריך פרסום' },
  { key: 'campaign_name',        label: 'קמפיין' },
  { key: 'social_status_name',   label: 'סטטוס פנייה' },
  { key: 'fix_name',             label: 'שם בפיקס' },
  { key: 'email',                label: 'אימייל' },
  { key: 'fix_status_raw',       label: 'סטטוס ליד בפיקס' },
  { key: 'fix_process_raw',      label: 'תהליך בפיקס' },
  { key: 'delivery_status_raw',  label: 'סטטוס שליחה מקורי' },
  { key: 'failure_message',      label: 'סיבת הכשל' },
  { key: 'source_file',          label: 'קובץ מקור' },
  { key: 'source_row',           label: 'שורת מקור' },
  { key: 'record_number',        label: 'מס׳ רשומה' },
  { key: 'fix_digital_id',       label: 'מזהה Fix' },
]

const ALL_COLUMN_KEYS = new Set(ALL_COLUMNS.map((c) => c.key))

const DEFAULT_COLUMNS = [
  'entity_name', 'entity_type', 'phone', 'role_name', 'region_name', 'city_name',
  'last_delivery_status', 'last_sent_at', 'campaign_name', 'social_status_name',
]

function loadStoredVisibleColumns(): string[] {
  if (typeof window === 'undefined') return [...DEFAULT_COLUMNS]
  try {
    const parsed = JSON.parse(window.localStorage.getItem(VISIBLE_COLUMNS_STORAGE_KEY) ?? 'null')
    if (!Array.isArray(parsed)) return [...DEFAULT_COLUMNS]
    const valid = parsed.filter((k): k is string => typeof k === 'string' && ALL_COLUMN_KEYS.has(k))
    return valid.length ? valid : [...DEFAULT_COLUMNS]
  } catch {
    return [...DEFAULT_COLUMNS]
  }
}

const TONE_TO_PILL: Record<DeliveryTone, 'success' | 'warning' | 'danger' | 'default'> = {
  success: 'success', warning: 'warning', danger: 'danger', default: 'default',
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatDate(value: string | null | undefined): string {
  const full = formatDateTime(value)
  return full === '—' ? full : full.split(' ')[0]
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-[#6B6B6B]">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 rounded-[14px] border border-[#D9D9D9] bg-white px-3 text-sm outline-none transition-colors focus:border-[#008080]"
      />
    </label>
  )
}

export default function AdminFixPublicationsPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('overview')
  const [filters, setFilters] = useState<PublicationFilters>(EMPTY_FILTERS)
  const [page, setPage] = useState(0)
  const [sortBy, setSortBy] = useState('last_sent_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const dicts = usePublicationDicts()
  const campaigns = useCampaigns()
  const stats = usePublicationStats()
  const overview = usePublicationsOverview(filters, page, sortBy, sortDir)

  const [visibleColumns, setVisibleColumns] = useState<string[]>(loadStoredVisibleColumns)
  useEffect(() => {
    window.localStorage.setItem(VISIBLE_COLUMNS_STORAGE_KEY, JSON.stringify(visibleColumns))
  }, [visibleColumns])
  const toggleColumn = (key: string) =>
    setVisibleColumns((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))

  const patch = (next: Partial<PublicationFilters>) => {
    setFilters((prev) => ({ ...prev, ...next }))
    setPage(0)
  }

  const onSort = (key: string) => {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortBy(key); setSortDir('desc') }
    setPage(0)
  }

  // בחירת אזור מצמצמת את רשימת הערים — עקבי עם CityRegionPicker
  const cityOptions = useMemo(() => {
    const all = dicts.data?.cities ?? []
    if (!filters.regionIds.length) return all
    return all.filter((c) => c.region_id != null && filters.regionIds.includes(Number(c.region_id)))
  }, [dicts.data?.cities, filters.regionIds])

  const statusOptions = useMemo(
    () => DELIVERY_STATUS_ORDER.map((code, i) => ({ id: i + 1, name: getDeliveryStatusMeta(code).label, code })),
    [],
  )

  const columns: AdminColumn<PublicationRow>[] = [
    {
      key: 'entity_name', label: 'שם', sortable: true, minWidth: '180px',
      render: (row) => {
        const audit = auditOf(row)
        if (row.contact_id) {
          return (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); navigate(`/admin/contacts/${row.contact_id}`) }}
              className="font-medium text-[#008080] hover:underline"
            >
              {row.contact?.full_name || row.contact?.display_name || audit.full_name || '—'}
            </button>
          )
        }
        if (row.account_id) {
          return (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); navigate(`/admin/accounts/${row.account_id}`) }}
              className="inline-flex items-center gap-1.5 font-medium text-[#008080] hover:underline"
            >
              <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
              {row.account?.account_name || audit.full_name || '—'}
            </button>
          )
        }
        const reason = audit.match === 'ambiguous_match'
          ? 'הנייד מופיע ביותר מרשומה אחת — לבדיקה ידנית'
          : 'לא נמצא במאגר'
        return (
          <span className="flex items-center gap-1.5 text-[#6B6B6B]">
            {audit.full_name || '—'}
            <span title={reason} className="text-[#E8A85C]"><AlertTriangle className="h-3.5 w-3.5" /></span>
          </span>
        )
      },
    },
    {
      key: 'entity_type', label: 'סוג רשומה', nowrap: true,
      render: (row) =>
        row.contact_id ? 'איש קשר' : row.account_id ? 'ארגון' : <span className="text-[#6B6B6B]">—</span>,
    },
    {
      key: 'phone', label: 'נייד', sortable: true, nowrap: true,
      render: (row) => formatPhone(row.contact?.phone || row.account?.phone || row.phone_norm) || '—',
    },
    {
      key: 'role_name', label: 'תפקיד',
      // לארגון אין תפקיד מקצועי — מוצג סוג הארגון במקום, ולא ניחוש
      render: (row) => {
        if (row.contact?.role) return dicts.data?.roleById.get(Number(row.contact.role)) ?? '—'
        if (row.account?.account_type) {
          const name = dicts.data?.accountTypeById.get(Number(row.account.account_type))
          return name ? <span className="text-[#6B6B6B]">{name}</span> : '—'
        }
        return '—'
      },
    },
    {
      key: 'region_name', label: 'אזור',
      render: (row) => {
        const id = row.contact?.region_id ?? row.account?.region_id
        return id ? dicts.data?.regionById.get(Number(id)) ?? '—' : '—'
      },
    },
    {
      key: 'city_name', label: 'עיר',
      render: (row) => {
        const id = row.contact?.city_id ?? row.account?.city_id
        return id ? dicts.data?.cityById.get(Number(id)) ?? '—' : '—'
      },
    },
    {
      key: 'last_delivery_status', label: 'סטטוס שליחה', sortable: true, nowrap: true,
      render: (row) => {
        const meta = getDeliveryStatusMeta(row.delivery_status)
        return (
          <span title={row.delivery_status_raw ?? ''}>
            <StatusPill label={meta.label} variant={TONE_TO_PILL[meta.tone]} />
          </span>
        )
      },
    },
    { key: 'last_sent_at', label: 'תאריך פרסום', sortable: true, nowrap: true, render: (row) => formatDateTime(row.sent_at) },
    { key: 'campaign_name', label: 'קמפיין', render: (row) => row.campaign?.campaign_name ?? '—' },
    {
      key: 'social_status_name', label: 'סטטוס פנייה',
      render: (row) => (row.contact?.social_status ? dicts.data?.socialStatusById.get(Number(row.contact.social_status)) ?? '—' : '—'),
    },
    // ─── עמודות פיקס, מוסתרות כברירת מחדל. כולן נקראות מתוך raw_payload. ───
    { key: 'fix_name',            label: 'שם בפיקס',          render: (row) => auditOf(row).full_name ?? '—' },
    { key: 'email',               label: 'אימייל',            render: (row) => auditOf(row).email ?? '—' },
    { key: 'fix_status_raw',      label: 'סטטוס ליד בפיקס',   render: (row) => auditOf(row).fix_status ?? '—' },
    { key: 'fix_process_raw',     label: 'תהליך בפיקס',       render: (row) => auditOf(row).fix_process ?? '—' },
    { key: 'delivery_status_raw', label: 'סטטוס שליחה מקורי', render: (row) => row.delivery_status_raw ?? '—' },
    { key: 'failure_message',     label: 'סיבת הכשל',         render: (row) => row.failure_message ?? '—' },
    { key: 'source_file',         label: 'קובץ מקור',         render: (row) => auditOf(row).source_file ?? row.campaign?.source_file_name ?? '—' },
    { key: 'source_row',          label: 'שורת מקור', nowrap: true, render: (row) => auditOf(row).source_row ?? '—' },
    { key: 'record_number',       label: 'מס׳ רשומה', nowrap: true, render: (row) => auditOf(row).record_number ?? '—' },
    { key: 'fix_digital_id',      label: 'מזהה Fix', nowrap: true, render: (row) => row.fixdigital_id ?? '—' },
  ]

  // סדר התצוגה נקבע ע"י ALL_COLUMNS, לא ע"י סדר הסימון בבורר
  const orderedVisibleColumns = useMemo(() => {
    const byKey = new Map(columns.map((c) => [c.key, c]))
    return ALL_COLUMNS
      .filter((c) => visibleColumns.includes(c.key))
      .map((c) => byKey.get(c.key))
      .filter((c): c is AdminColumn<PublicationRow> => !!c)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleColumns, dicts.data])

  const total = overview.data?.total ?? 0
  const pageSize = overview.data?.pageSize ?? 25
  const filtered = hasActiveFilters(filters)

  return (
    <Shell
      title="פרסומי WhatsApp"
      subtitle="מעקב אחרי מי קיבל פרסום ומתי — נקלט מדוחות Fix Digital"
      icon={Send}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {tab === 'overview' && (
            <details className="relative">
              <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50">
                <Columns3 className="h-4 w-4" />
                בחירת עמודות
              </summary>
              <div className="absolute left-0 top-full z-30 mt-2 max-h-[70vh] w-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-md">
                <div className="mb-3 text-[13px] font-bold text-slate-900">בחירת עמודות</div>
                <button
                  type="button"
                  onClick={() => setVisibleColumns([...DEFAULT_COLUMNS])}
                  className="mb-3 text-[12px] font-semibold text-[#008080] hover:underline"
                >
                  איפוס לברירת המחדל
                </button>
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
          )}
          <ActionButton
            variant={tab === 'import' ? 'secondary' : 'primary'}
            icon={Upload}
            onClick={() => setTab(tab === 'import' ? 'overview' : 'import')}
          >
            {tab === 'import' ? 'חזרה למצב פרסומים' : 'קליטת דוח קמפיין'}
          </ActionButton>
        </div>
      }
    >
      {tab === 'overview' ? (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KPICard
              label="סה״כ שליחות"
              value={(stats.data?.totalRecipients ?? 0).toLocaleString('he-IL')}
              hint={filtered ? `${total.toLocaleString('he-IL')} תואמות לסינון` : undefined}
            />
            <KPICard label="קמפיינים" value={(stats.data?.totalCampaigns ?? 0).toLocaleString('he-IL')} />
            <KPICard label="פרסום אחרון" value={formatDate(stats.data?.lastSentAt)} />
            <KPICard
              label="לא נמצאו במאגר"
              value={(stats.data?.unmatched ?? 0).toLocaleString('he-IL')}
            />
          </div>

          <Toolbar className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <SearchBar
                value={filters.search}
                onChange={(v) => patch({ search: v })}
                placeholder="חיפוש לפי שם או נייד..."
              />
              <DateField label="מתאריך" value={filters.sentFrom} onChange={(v) => patch({ sentFrom: v })} />
              <DateField label="עד תאריך" value={filters.sentTo} onChange={(v) => patch({ sentTo: v })} />
              {filtered && (
                <ActionButton variant="ghost" icon={RotateCcw} onClick={() => { setFilters(EMPTY_FILTERS); setPage(0) }}>
                  נקה מסננים
                </ActionButton>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <DictionaryMultiSelect
                label="תפקיד" options={dicts.data?.roles ?? []} value={filters.roleIds}
                onChange={(v) => patch({ roleIds: v })} maxHeightClassName="max-h-36"
              />
              <DictionaryMultiSelect
                label="אזור" options={dicts.data?.regions ?? []} value={filters.regionIds}
                onChange={(v) => patch({ regionIds: v, cityIds: [] })} maxHeightClassName="max-h-36"
              />
              <DictionaryMultiSelect
                label={filters.regionIds.length ? 'עיר (מסונן לפי אזור)' : 'עיר'}
                options={cityOptions} value={filters.cityIds}
                onChange={(v) => patch({ cityIds: v })} maxHeightClassName="max-h-36"
              />
              <DictionaryMultiSelect
                label="סטטוס שליחה" searchable={false} maxHeightClassName="max-h-36"
                options={statusOptions}
                value={statusOptions.filter((o) => filters.deliveryStatuses.includes(o.code)).map((o) => o.id)}
                onChange={(ids) =>
                  patch({ deliveryStatuses: statusOptions.filter((o) => ids.includes(o.id)).map((o) => o.code) })
                }
              />
            </div>

            {(campaigns.data?.length ?? 0) > 0 && (
              <DictionaryMultiSelect
                label="קמפיין" maxHeightClassName="max-h-32"
                options={(campaigns.data ?? []).map((c) => ({
                  id: Number(c.campaign_id),
                  name: c.campaign_name || c.source_file_name || `קמפיין ${c.campaign_id}`,
                }))}
                value={filters.campaignIds}
                onChange={(v) => patch({ campaignIds: v })}
              />
            )}
          </Toolbar>

          <AdminTable<PublicationRow>
            columns={orderedVisibleColumns}
            data={overview.data?.rows ?? []}
            keyField="recipient_id"
            isLoading={overview.isLoading}
            error={overview.error ? `שגיאה בטעינת הנתונים: ${(overview.error as Error).message}` : undefined}
            hasActiveFilter={filtered}
            emptyMessage="עדיין לא נקלטו פרסומים. השתמשי ב״קליטת דוח קמפיין״ כדי להעלות דוח מ-Fix."
            noResultsMessage="לא נמצאו פרסומים התואמים את הסינון"
            sortKey={sortBy}
            sortDir={sortDir}
            onSort={onSort}
            minWidth="1150px"
            pagination={
              total > 0 ? (
                <AdminTablePagination
                  page={page + 1} pageSize={pageSize} total={total}
                  onPageChange={(p) => setPage(p - 1)}
                />
              ) : undefined
            }
          />
        </>
      ) : (
        <ImportPanel onDone={() => { setTab('overview'); setPage(0) }} />
      )}
    </Shell>
  )
}

// ──────────────────────────── קליטת דוח קמפיין ────────────────────────────

function ImportPanel({ onDone }: { onDone: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState<CampaignPreview | null>(null)

  const previewMutation = useCampaignPreview()
  const commitMutation = useCommitCampaign()

  const handleFile = (file: File) => {
    setPreview(null)
    previewMutation.mutate(file, {
      onSuccess: setPreview,
      onError: (err) => toast.error((err as Error).message),
    })
  }

  const reset = () => {
    setPreview(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const commit = () => {
    if (!preview) return
    commitMutation.mutate({ preview }, {
      onSuccess: (res) => {
        if (res.errors.length) {
          toast.warning(
            `נקלטו ${res.inserted} שליחות, אך ${res.errors.length} מנות נכשלו. הפירוט מוצג במסך.`,
          )
        } else {
          toast.success(
            `נקלטו ${res.inserted} שליחות ב-${res.campaignsCreated + res.campaignsUpdated} קמפיינים · ` +
            `${res.contactsUpdated} אנשי קשר ו-${res.accountsUpdated} ארגונים עודכנו` +
            (res.skippedNoPhone ? ` · ${res.skippedNoPhone} שורות דולגו (אין נייד תקין)` : ''),
          )
          reset()
          onDone()
        }
      },
      onError: (err) => toast.error(`הקליטה נכשלה: ${(err as Error).message}`),
    })
  }

  const nothingToInsert = !!preview && preview.counts.willInsert === 0 && preview.counts.statusUpdates === 0

  return (
    <div className="space-y-4">
      <Toolbar>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault(); setDragging(false)
            const file = e.dataTransfer.files?.[0]
            if (file) handleFile(file)
          }}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-[18px] border-2 border-dashed px-6 py-12 text-center transition-colors ${
            dragging ? 'border-[#008080] bg-[#E6F3F3]' : 'border-[#D9D9D9] bg-[#F9FAFB] hover:border-[#008080]'
          }`}
        >
          <input
            ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
          {previewMutation.isPending ? (
            <>
              <Loader2 className="mb-3 h-8 w-8 animate-spin text-[#008080]" />
              <p className="text-sm text-[#6B6B6B]">מנתח את הקובץ ומתאים מול המאגר...</p>
            </>
          ) : (
            <>
              <FileSpreadsheet className="mb-3 h-8 w-8 text-[#6B6B6B]" />
              <p className="text-[15px] font-semibold text-[#2D2D2D]">
                גררי לכאן דוח תוצאות קמפיין מ-Fix, או קובץ מאוחד של כמה דוחות
              </p>
              <p className="mt-1 text-sm text-[#6B6B6B]">
                CSV או Excel · כותרות בעברית או באנגלית · העלאה אינה שומרת דבר עד לאישור
              </p>
            </>
          )}
        </div>
      </Toolbar>

      {commitMutation.data?.errors.length ? (
        <Toolbar className="border-r-4 !border-r-[#D96C6C]">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#D96C6C]" />
            <div className="space-y-1">
              <p className="font-semibold text-[#2D2D2D]">
                חלק מהקליטה נכשל · נשמרו {commitMutation.data.inserted} שליחות
              </p>
              <ul className="list-inside list-disc text-sm text-[#6B6B6B]">
                {commitMutation.data.errors.map((message, i) => <li key={i}>{message}</li>)}
              </ul>
            </div>
          </div>
        </Toolbar>
      ) : null}

      {preview && (
        <>
          {preview.validation.missingOptional.length > 0 && (
            <Toolbar className="border-r-4 !border-r-[#E8A85C]">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#E8A85C]" />
                <div className="space-y-1">
                  <p className="font-semibold text-[#2D2D2D]">עמודות שלא נמצאו בקובץ</p>
                  <p className="text-sm text-[#6B6B6B]">
                    {preview.validation.missingOptional.map((f) => CAMPAIGN_FIELD_LABELS[f]).join(', ')} —
                    השורות ייקלטו בלעדיהן.
                  </p>
                </div>
              </div>
            </Toolbar>
          )}

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
            <KPICard label="שורות בקובץ" value={preview.counts.total} />
            <KPICard label="קמפיינים בקובץ" value={preview.counts.campaigns} icon={Layers} />
            <KPICard
              label="נמצאו במאגר"
              value={preview.counts.matchedContacts + preview.counts.matchedAccounts}
              hint={`${preview.counts.matchedContacts} אנשי קשר · ${preview.counts.matchedAccounts} ארגונים`}
            />
            <KPICard label="לא נמצאו" value={preview.counts.notFound} />
            <KPICard
              label="כבר קיימות"
              value={preview.counts.alreadyExists}
              hint={preview.counts.statusUpdates ? `${preview.counts.statusUpdates} סטטוסים התקדמו` : undefined}
            />
            <KPICard
              label="לא ייקלטו"
              value={preview.counts.invalidPhone + preview.counts.missingPhone}
              hint={
                preview.counts.ambiguous
                  ? `נייד פסול או חסר · ועוד ${preview.counts.ambiguous} בכפילות נייד`
                  : 'נייד פסול או חסר — אין מזהה לשמירה'
              }
            />
          </div>

          <CampaignPlanTable plans={preview.campaigns} />

          <Toolbar className="space-y-4">
            <div>
              <div className="mb-2 text-xs text-[#6B6B6B]">התפלגות סטטוסי שליחה</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(preview.counts.byStatus)
                  .sort(([, a], [, b]) => b - a)
                  .map(([code, count]) => {
                    const meta = getDeliveryStatusMeta(code)
                    return (
                      <span key={code} className="inline-flex items-center gap-1.5">
                        <StatusPill label={`${meta.label} · ${count}`} variant={TONE_TO_PILL[meta.tone]} />
                      </span>
                    )
                  })}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-[#D9D9D9] pt-4">
              <ActionButton
                variant="success" icon={CheckCircle2} onClick={commit}
                disabled={commitMutation.isPending || nothingToInsert}
              >
                {commitMutation.isPending
                  ? 'שומר...'
                  : `אשרי וקלטי ${preview.counts.willInsert.toLocaleString('he-IL')} שליחות`}
              </ActionButton>
              <ActionButton variant="ghost" icon={X} onClick={reset} disabled={commitMutation.isPending}>
                ביטול
              </ActionButton>
              {nothingToInsert && (
                <span className="text-sm text-[#6B6B6B]">
                  כל השורות בקובץ כבר נקלטו בעבר — אין מה להוסיף.
                </span>
              )}
            </div>
          </Toolbar>

          <PreviewTable preview={preview} />
        </>
      )}
    </div>
  )
}

/**
 * מה ייווצר ומה יעודכן — לכל קמפיין שזוהה בקובץ בנפרד.
 * זו הנקודה שבה רואים שקובץ מאוחד של 12 דוחות אינו הופך לקמפיין אחד ענק.
 */
function CampaignPlanTable({ plans }: { plans: CampaignPlan[] }) {
  const columns: AdminColumn<CampaignPlan>[] = [
    { key: 'label', label: 'קמפיין', minWidth: '220px', render: (p) => p.label },
    {
      key: 'state', label: 'מצב', nowrap: true,
      render: (p) => (
        <StatusPill
          label={p.existingCampaignId ? 'קיים — יעודכן' : 'חדש — ייווצר'}
          variant={p.existingCampaignId ? 'warning' : 'success'}
        />
      ),
    },
    { key: 'startedAt', label: 'מועד פרסום', nowrap: true, render: (p) => formatDateTime(p.startedAt) },
    { key: 'processName', label: 'תהליך', render: (p) => p.processName ?? '—' },
    { key: 'rowCount', label: 'שורות', nowrap: true, render: (p) => p.rowCount.toLocaleString('he-IL') },
    { key: 'newRows', label: 'ייקלטו', nowrap: true, render: (p) => p.newRows.toLocaleString('he-IL') },
    {
      key: 'existingRows', label: 'כבר קיימות', nowrap: true,
      render: (p) => (p.existingRows ? p.existingRows.toLocaleString('he-IL') : '—'),
    },
    {
      key: 'noPhone', label: 'לא ייקלטו', nowrap: true,
      render: (p) => (p.noPhone
        ? <span className="text-[#E8A85C]" title="אין נייד תקין — לא ניתן לשמור">{p.noPhone.toLocaleString('he-IL')}</span>
        : '—'),
    },
    { key: 'matched', label: 'נמצאו במאגר', nowrap: true, render: (p) => p.matched.toLocaleString('he-IL') },
    { key: 'notFound', label: 'לא נמצאו', nowrap: true, render: (p) => p.notFound.toLocaleString('he-IL') },
  ]

  return (
    <div className="space-y-3">
      <h2 className="text-[15px] font-semibold text-[#2D2D2D]">
        קמפיינים שזוהו בקובץ ({plans.length})
      </h2>
      <AdminTable
        columns={columns}
        data={plans}
        keyField="campaignKey"
        emptyMessage="לא זוהה אף קמפיין בקובץ"
        minWidth="1000px"
      />
    </div>
  )
}

function PreviewTable({ preview }: { preview: CampaignPreview }) {
  const [showOnlyIssues, setShowOnlyIssues] = useState(false)
  const isIssue = (m: string) => m !== 'matched_contact' && m !== 'matched_account'

  const rows = useMemo(
    () => (showOnlyIssues ? preview.rows.filter((r) => isIssue(r.matchResult)) : preview.rows).slice(0, 200),
    [preview.rows, showOnlyIssues],
  )

  const columns: AdminColumn<(typeof preview.rows)[number]>[] = [
    { key: 'campaignLabel', label: 'קמפיין', render: (r) => r.campaignLabel },
    { key: 'rowNumber', label: 'שורה', nowrap: true, width: '70px', render: (r) => r.sourceRow ?? r.rowNumber },
    { key: 'fullNameRaw', label: 'שם בפיקס', render: (r) => r.fullNameRaw ?? '—' },
    { key: 'phoneRaw', label: 'נייד', nowrap: true, render: (r) => formatPhone(r.phoneRaw) || r.phoneRaw || '—' },
    {
      key: 'deliveryStatus', label: 'סטטוס שליחה', nowrap: true,
      render: (r) => {
        const meta = getDeliveryStatusMeta(r.deliveryStatus)
        return (
          <span title={r.deliveryStatusRaw ?? ''}>
            <StatusPill label={meta.label} variant={TONE_TO_PILL[meta.tone]} />
          </span>
        )
      },
    },
    {
      key: 'matchResult', label: 'התאמה', nowrap: true,
      render: (r) => (
        <StatusPill
          label={MATCH_RESULT_LABELS[r.matchResult] ?? r.matchResult}
          variant={isIssue(r.matchResult) ? 'warning' : 'success'}
        />
      ),
    },
    {
      key: 'alreadyExists', label: 'קיים כבר', nowrap: true,
      render: (r) => (r.alreadyExists ? <StatusPill label="כן" variant="default" /> : '—'),
    },
    { key: 'fixStatusRaw', label: 'סטטוס ב-Fix', render: (r) => r.fixStatusRaw ?? '—' },
  ]

  const issueCount = preview.rows.filter((r) => isIssue(r.matchResult)).length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-[#2D2D2D]">
          תצוגה מקדימה {rows.length < preview.rows.length && `(${rows.length} ראשונות מתוך ${preview.rows.length})`}
        </h2>
        {issueCount > 0 && (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[#2D2D2D]">
            <input
              type="checkbox" className="h-4 w-4 accent-[#008080]"
              checked={showOnlyIssues}
              onChange={(e) => setShowOnlyIssues(e.target.checked)}
            />
            הצג רק חריגות ({issueCount})
          </label>
        )}
      </div>
      <AdminTable
        columns={columns}
        data={rows}
        keyField="sourceUniqueKey"
        emptyMessage="אין שורות להצגה"
        minWidth="1000px"
      />
    </div>
  )
}
