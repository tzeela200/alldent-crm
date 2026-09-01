/**
 * מסך "מאגר לפי פרסום".
 *
 * המאגר שלך בעיניים של פרסום: **שורה אחת לכל אדם**, כולל מי שמעולם לא נכלל
 * באף קמפיין. זה ההבדל ממסך פרסומי WhatsApp, שבו שורה = שליחה בודדת ולכן
 * מי שלא נשלח אליו אף פעם פשוט לא מופיע בו.
 *
 * המסך אינו שולח הודעות ואינו כותב דבר. הוא קורא את שדות הסיכום שכבר יושבים
 * על `contact` ומתרגם אותם להחלטה אחת: למי לשלוח, למי לא, ומי עוד לא קיבל.
 */

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Send, Download, RotateCcw, Columns3, ShieldCheck, AlertTriangle, Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

import { Shell, Toolbar, SearchBar, SelectFilter, ActionButton, StatusPill, KPICard } from '@/components/layout/Shell'
import { AdminTable, type AdminColumn } from '@/components/admin/AdminTable'
import { AdminTablePagination } from '@/components/admin/AdminTablePagination'
import { DictionaryMultiSelect } from '@/components/ui/DictionaryMultiSelect'
import { RoleBadge } from '@/components/admin/RoleBadge'
import { RegionBadge } from '@/components/admin/RegionBadge'
import { PublicationDateCell, PUBLICATION_DATE_CELL_WIDTH } from '@/components/admin/PublicationDateCell'
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon'
import { formatPhone, whatsappLink } from '@/lib/normalizePhone'
import { getDeliveryStatusMeta } from '@/lib/fixPublications/deliveryStatus'
import {
  DELIVERY_OUTCOME_ORDER, DELIVERY_OUTCOMES, getOutcomeMeta,
  type DeliveryOutcome,
} from '@/lib/fixPublications/deliveryOutcome'
import { usePublicationDicts } from '@/hooks/useFixPublications'
import {
  usePublicationDatabase, usePublicationDbStats, useOptedOutContactIds,
  fetchAllPublicationRows,
  EMPTY_DB_FILTERS, hasActiveDbFilters, LOCALITY_FILTER_OPTIONS,
  type PublicationDbFilters, type PublicationDbRow,
} from '@/hooks/usePublicationDatabase'

const VISIBLE_COLUMNS_STORAGE_KEY = 'alldent.publicationDatabase.visibleColumns.v1'

const ALL_COLUMNS: { key: string; label: string }[] = [
  { key: 'name',          label: 'שם' },
  { key: 'role',          label: 'תפקיד' },
  { key: 'region',        label: 'אזור' },
  { key: 'city',          label: 'עיר' },
  { key: 'locality_type', label: 'סוג יישוב' },
  { key: 'phone',         label: 'נייד' },
  { key: 'outcome',       label: 'מצב' },
  { key: 'last_status',   label: 'סטטוס אחרון' },
  { key: 'last_sent',     label: 'פרסום אחרון' },
  { key: 'campaigns',     label: 'קמפיינים' },
  { key: 'read',          label: 'נקראו' },
  { key: 'last_campaign', label: 'קמפיין אחרון' },
  { key: 'social_status', label: 'סטטוס פנייה' },
]

const ALL_COLUMN_KEYS = new Set(ALL_COLUMNS.map((c) => c.key))

const DEFAULT_COLUMNS = [
  'name', 'role', 'region', 'city', 'locality_type', 'phone', 'outcome', 'last_sent',
  'campaigns', 'read',
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

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
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

/** הכרטיסים שמוצגים למעלה, בסדר שבו המשתמשת מקבלת החלטה */
const KPI_OUTCOMES: DeliveryOutcome[] = [
  'reached', 'never_sent', 'do_not_send', 'retry', 'no_phone',
]

export default function AdminPublicationDatabasePage() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<PublicationDbFilters>(EMPTY_DB_FILTERS)
  const [page, setPage] = useState(0)
  const [sortBy, setSortBy] = useState('last_sent')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [exporting, setExporting] = useState<'all' | 'clean' | null>(null)

  const dicts = usePublicationDicts()
  const optOut = useOptedOutContactIds()
  const board = usePublicationDatabase(filters, page, sortBy, sortDir)
  const stats = usePublicationDbStats(filters)

  const [visibleColumns, setVisibleColumns] = useState<string[]>(loadStoredVisibleColumns)
  useEffect(() => {
    window.localStorage.setItem(VISIBLE_COLUMNS_STORAGE_KEY, JSON.stringify(visibleColumns))
  }, [visibleColumns])
  const toggleColumn = (key: string) =>
    setVisibleColumns((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))

  const patch = (next: Partial<PublicationDbFilters>) => {
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

  const selectedOutcome = filters.outcomes[0] ?? ''

  const columns: AdminColumn<PublicationDbRow>[] = [
    {
      key: 'name', label: 'שם', sortable: true, minWidth: '180px',
      render: (row) => (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); navigate(`/admin/contacts/${row.contact_id}`) }}
          className="font-medium text-[#008080] hover:underline"
        >
          {row.full_name || row.display_name || '—'}
        </button>
      ),
    },
    {
      key: 'role', label: 'תפקיד', nowrap: true,
      render: (row) => {
        const label = row.role ? dicts.data?.roleById.get(Number(row.role)) : null
        return label ? <RoleBadge roleId={Number(row.role)} label={label} /> : '—'
      },
    },
    {
      key: 'region', label: 'אזור', nowrap: true,
      render: (row) => {
        const label = row.region_id ? dicts.data?.regionById.get(Number(row.region_id)) : null
        return label ? <RegionBadge regionId={Number(row.region_id)} label={label} /> : '—'
      },
    },
    {
      key: 'city', label: 'עיר',
      render: (row) => (row.city_id ? dicts.data?.cityById.get(Number(row.city_id)) ?? '—' : '—'),
    },
    {
      // נגזר מהעיר ע"י טריגר במסד — תצוגה בלבד, לא נערך כאן
      key: 'locality_type', label: 'סוג יישוב', nowrap: true,
      render: (row) => row.locality_type ?? <span className="text-[#6B6B6B]">—</span>,
    },
    {
      key: 'phone', label: 'נייד', sortable: true, nowrap: true,
      render: (row) => {
        const display = formatPhone(row.phone_norm ?? row.phone)
        if (!display) return <span className="text-[#6B6B6B]">אין נייד</span>
        return (
          <span className="inline-flex items-center gap-1.5">
            {display}
            <a
              href={whatsappLink(row.phone_norm ?? row.phone) || undefined}
              target="_blank" rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="פתיחת שיחה בוואטסאפ"
              className="text-[#25D366] hover:opacity-80"
            >
              <WhatsAppIcon className="h-4 w-4" />
            </a>
          </span>
        )
      },
    },
    {
      key: 'outcome', label: 'מצב', nowrap: true,
      render: (row) => {
        const meta = getOutcomeMeta(row.outcome)
        return <span title={meta.description}><StatusPill label={meta.label} variant={meta.tone} /></span>
      },
    },
    {
      key: 'last_status', label: 'סטטוס אחרון', sortable: true, nowrap: true,
      render: (row) => (row.whatsapp_last_delivery_status
        ? getDeliveryStatusMeta(row.whatsapp_last_delivery_status).label
        : '—'),
    },
    {
      // ניתן לעריכה — לרישום פרסום שנשלח אישית ולא דרך קמפיין.
      // רוחב קבוע בשני המצבים כדי שהטבלה לא תזוז בכניסה לעריכה.
      key: 'last_sent', label: 'פרסום אחרון', sortable: true, nowrap: true,
      width: PUBLICATION_DATE_CELL_WIDTH,
      render: (row) => (
        <PublicationDateCell
          contactId={row.contact_id}
          phoneNorm={row.phone_norm}
          lastSentAt={row.whatsapp_campaign_last_sent}
          lastStatus={row.whatsapp_last_delivery_status}
          hasManualRecord={row.hasManualRecord}
        />
      ),
    },
    {
      key: 'campaigns', label: 'קמפיינים', nowrap: true,
      render: (row) => (row.campaignCount ? row.campaignCount.toLocaleString('he-IL') : '—'),
    },
    {
      key: 'read', label: 'נקראו', nowrap: true,
      render: (row) => (row.readCount ? row.readCount.toLocaleString('he-IL') : '—'),
    },
    { key: 'last_campaign', label: 'קמפיין אחרון', render: (row) => row.lastCampaignName ?? '—' },
    {
      key: 'social_status', label: 'סטטוס פנייה',
      render: (row) => (row.social_status
        ? dicts.data?.socialStatusById.get(Number(row.social_status)) ?? '—'
        : '—'),
    },
  ]

  const orderedVisibleColumns = useMemo(() => {
    const byKey = new Map(columns.map((c) => [c.key, c]))
    return ALL_COLUMNS
      .filter((c) => visibleColumns.includes(c.key))
      .map((c) => byKey.get(c.key))
      .filter((c): c is AdminColumn<PublicationDbRow> => !!c)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleColumns, dicts.data])

  const total = board.data?.total ?? 0
  const pageSize = board.data?.pageSize ?? 25
  const filtered = hasActiveDbFilters(filters)

  const runExport = async (mode: 'all' | 'clean') => {
    setExporting(mode)
    try {
      const { rows, excluded } = await fetchAllPublicationRows(
        filters, optOut.data?.ids ?? [], mode === 'clean',
      )
      if (!rows.length) {
        toast.warning('אין שורות לייצוא לפי הסינון הנוכחי.')
        return
      }

      const csvRows = rows.map((row) => ({
        'שם': row.full_name || row.display_name || '',
        'תפקיד': (row.role ? dicts.data?.roleById.get(Number(row.role)) : '') ?? '',
        'אזור': (row.region_id ? dicts.data?.regionById.get(Number(row.region_id)) : '') ?? '',
        'עיר': (row.city_id ? dicts.data?.cityById.get(Number(row.city_id)) : '') ?? '',
        'סוג יישוב': row.locality_type ?? '',
        'נייד': formatPhone(row.phone_norm ?? row.phone) || '',
        'מצב': getOutcomeMeta(row.outcome).label,
        'סטטוס אחרון': row.whatsapp_last_delivery_status
          ? getDeliveryStatusMeta(row.whatsapp_last_delivery_status).label : '',
        'פרסום אחרון': formatDate(row.whatsapp_campaign_last_sent),
      }))

      downloadCsv(
        csvRows,
        mode === 'clean' ? 'רשימת-שליחה-נקייה.csv' : 'מאגר-לפי-פרסום.csv',
      )

      if (mode === 'clean') {
        const totalExcluded = excluded.noDevice + excluded.optOut + excluded.noPhone
        toast.success(
          `יוצאו ${rows.length.toLocaleString('he-IL')} שורות. ` +
          (totalExcluded
            ? `הוצאו ${totalExcluded}: ${excluded.noDevice} ללא וואטסאפ · ` +
              `${excluded.optOut} ביקשו הסרה · ${excluded.noPhone} ללא נייד.`
            : 'לא הוצאה אף שורה.'),
          { duration: 8000 },
        )
      } else {
        toast.success(`יוצאו ${rows.length.toLocaleString('he-IL')} שורות.`)
      }
    } catch (err) {
      toast.error(`הייצוא נכשל: ${(err as Error).message}`)
    } finally {
      setExporting(null)
    }
  }

  return (
    <Shell
      title="מאגר לפי פרסום"
      subtitle="מי קיבל וואטסאפ ומי לא — שורה אחת לכל אדם במאגר, כולל מי שמעולם לא נשלח אליו"
      icon={Send}
      actions={
        <div className="flex flex-wrap items-center gap-2">
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

          <ActionButton
            variant="secondary" icon={exporting === 'all' ? Loader2 : Download}
            onClick={() => runExport('all')} disabled={!!exporting}
          >
            ייצוא הרשימה
          </ActionButton>
          <ActionButton
            variant="primary" icon={exporting === 'clean' ? Loader2 : ShieldCheck}
            onClick={() => runExport('clean')} disabled={!!exporting}
          >
            ייצוא רשימת שליחה נקייה
          </ActionButton>
        </div>
      }
    >
      {optOut.data?.truncated && (
        <Toolbar className="border-r-4 !border-r-[#E8A85C]">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#E8A85C]" />
            <p className="text-sm text-[#2D2D2D]">
              יותר מ-1,000 אנשים ביקשו להפסיק לקבל פרסום. הרשימה נחתכה, וייתכן שחלקם
              אינם מסומנים כרגע. יש לפנות אליי כדי להרחיב את המנגנון לפני השליחה הבאה.
            </p>
          </div>
        </Toolbar>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <KPICard
          label="סה״כ במאגר"
          value={(stats.data?.total ?? 0).toLocaleString('he-IL')}
          hint={filtered ? 'לפי הסינון הפעיל' : 'כל אנשי הקשר'}
          onClick={() => patch({ outcomes: [] })}
        />
        {KPI_OUTCOMES.map((outcome) => {
          const meta = DELIVERY_OUTCOMES[outcome]
          return (
            <KPICard
              key={outcome}
              label={meta.label}
              value={(stats.data?.byOutcome[outcome] ?? 0).toLocaleString('he-IL')}
              hint={meta.description}
              onClick={() => patch({ outcomes: [outcome] })}
            />
          )
        })}
      </div>

      <Toolbar className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <SearchBar
            value={filters.search}
            onChange={(v) => patch({ search: v })}
            placeholder="חיפוש לפי שם או נייד..."
          />
          <DateField label="פורסם מתאריך" value={filters.sentFrom} onChange={(v) => patch({ sentFrom: v })} />
          <DateField label="עד תאריך" value={filters.sentTo} onChange={(v) => patch({ sentTo: v })} />
          {filtered && (
            <ActionButton
              variant="ghost" icon={RotateCcw}
              onClick={() => { setFilters(EMPTY_DB_FILTERS); setPage(0) }}
            >
              נקה מסננים
            </ActionButton>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
          <label className="flex flex-col gap-1">
            <span className="text-xs text-[#6B6B6B]">סוג יישוב</span>
            <SelectFilter
              value={filters.localityType}
              onChange={(value) => patch({ localityType: value })}
              options={LOCALITY_FILTER_OPTIONS}
              placeholder="כל סוגי היישוב"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-[#6B6B6B]">מצב שליחה</span>
            <SelectFilter
              value={selectedOutcome}
              onChange={(value) => patch({ outcomes: value ? [value as DeliveryOutcome] : [] })}
              options={DELIVERY_OUTCOME_ORDER.map((code) => ({
                value: code, label: DELIVERY_OUTCOMES[code].label,
              }))}
              placeholder="כל המצבים"
            />
          </label>
        </div>
      </Toolbar>

      <AdminTable<PublicationDbRow>
        columns={orderedVisibleColumns}
        data={board.data?.rows ?? []}
        keyField="contact_id"
        isLoading={board.isLoading}
        error={board.error ? `שגיאה בטעינת הנתונים: ${(board.error as Error).message}` : undefined}
        hasActiveFilter={filtered}
        emptyMessage="אין אנשי קשר להצגה."
        noResultsMessage="לא נמצאו רשומות התואמות את הסינון"
        sortKey={sortBy}
        sortDir={sortDir}
        onSort={onSort}
        minWidth="1250px"
        pagination={
          total > 0 ? (
            <AdminTablePagination
              page={page + 1} pageSize={pageSize} total={total}
              onPageChange={(p) => setPage(p - 1)}
            />
          ) : undefined
        }
      />
    </Shell>
  )
}

/** ייצוא CSV עם BOM — אותו דפוס שבו מסך אנשי הקשר מייצא */
function downloadCsv(rows: Record<string, string>[], fileName: string) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const escapeCell = (value: string) => {
    const s = String(value ?? '')
    return /["',\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escapeCell(row[h] ?? '')).join(',')),
  ].join('\n')

  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}
