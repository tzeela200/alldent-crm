import { type ReactNode, useMemo, useState } from 'react'
import { AdminTable, type AdminColumn } from '@/components/admin/AdminTable'
import { AdminBadge } from '@/components/admin/AdminBadge'
import { formatPhone } from '@/lib/normalizePhone'
import {
  INBOX_STATUSES,
  getDictName,
  inboxStatusAdminVariant,
  deriveMatchResult,
  sourceLabel,
} from '@/lib/inbox-v2-dicts'
import { useInboxV2SourceTypes } from '@/hooks/useInboxV2SourceTypes'
import { entryReasonLabel, matchedByLabel } from '@/lib/inbox-v2-merge'
import type { InboxV2Row } from '@/types/inbox-v2'

// עמודות זמינות — מקור אמת לבחירת העמודות (בדומה ל-AdminContactsPage).
export const ALL_COLUMNS: { key: string; label: string }[] = [
  { key: 'merge_status', label: 'סטטוס טיפול' },
  { key: 'match_result', label: 'תוצאת התאמה' },
  { key: 'phone', label: 'נייד' },
  { key: 'display_name', label: 'שם' },
  { key: 'email', label: 'אימייל' },
  { key: 'match_existing', label: 'התאמה לרשומה קיימת' },
  { key: 'match_reason', label: 'סיבת התאמה' },
  { key: 'match_confidence', label: 'רמת ביטחון' },
  { key: 'has_new_information', label: 'מידע חדש' },
  { key: 'source', label: 'מקור' },
  { key: 'tags', label: 'תגיות' },
  { key: 'created_at', label: 'תאריך קליטה' },
  // אופציונליות
  { key: 'phone_norm', label: 'נייד מנורמל' },
  { key: 'first_name', label: 'שם פרטי' },
  { key: 'last_name', label: 'שם משפחה' },
  { key: 'facebook_name', label: 'שם פייסבוק' },
  { key: 'facebook_id', label: 'Facebook ID' },
  { key: 'facebook_url', label: 'Facebook URL' },
  { key: 'linkedin_url', label: 'LinkedIn' },
  { key: 'facebook_group_name', label: 'קבוצת פייסבוק' },
  { key: 'match_contact', label: 'match_contact' },
  { key: 'match_account', label: 'match_account' },
  { key: 'matched_by', label: 'שיטת התאמה' },
  { key: 'seen_count', label: 'הופעות' },
  { key: 'updated_at', label: 'עודכן' },
]

export const DEFAULT_COLUMNS = [
  'merge_status',
  'match_result',
  'phone',
  'display_name',
  'email',
  'match_reason',
  'match_confidence',
  'has_new_information',
  'source',
  'tags',
  'created_at',
]

export const INBOX_V2_COLUMNS_STORAGE_KEY = 'alldent.inboxV2.visibleColumns.v1'

const SORTABLE = new Set(['merge_status', 'display_name', 'match_confidence', 'created_at'])

interface Props {
  rows: InboxV2Row[]
  visibleColumns: string[]
  isLoading?: boolean
  hasActiveFilter?: boolean
  selectedIds: number[]
  onSelectionChange: (ids: number[]) => void
  onRowClick: (leadId: number) => void
  bulkActions?: ReactNode
  pagination?: ReactNode
}

function dash(value: ReactNode) {
  return value == null || value === '' ? <span className="text-[#9CA3AF]">—</span> : value
}

export function InboxV2Table({
  rows,
  visibleColumns,
  isLoading,
  hasActiveFilter,
  selectedIds,
  onSelectionChange,
  onRowClick,
  bulkActions,
  pagination,
}: Props) {
  const [sortKey, setSortKey] = useState<string>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const { data: sourceTypes } = useInboxV2SourceTypes()

  const onSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  // מיון client-side על שורות העמוד הנוכחי (כמו קודם).
  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      switch (sortKey) {
        case 'display_name':
          return dir * (a.display_name ?? '').localeCompare(b.display_name ?? '', 'he')
        case 'match_confidence':
          return dir * ((a.match_confidence ?? 0) - (b.match_confidence ?? 0))
        case 'merge_status':
          return dir * ((a.merge_status ?? 0) - (b.merge_status ?? 0))
        default:
          return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      }
    })
  }, [rows, sortKey, sortDir])

  const columnDefs = useMemo<Record<string, AdminColumn<InboxV2Row>>>(
    () => ({
      merge_status: {
        key: 'merge_status',
        label: 'סטטוס טיפול',
        sortable: true,
        render: (r) => (
          <AdminBadge
            label={getDictName(INBOX_STATUSES, r.merge_status)}
            variant={inboxStatusAdminVariant[r.merge_status ?? 1] ?? 'neutral'}
          />
        ),
      },
      match_result: {
        key: 'match_result',
        label: 'תוצאת התאמה',
        render: (r) => {
          const m = deriveMatchResult(r)
          return <AdminBadge label={m.label} variant={m.variant} />
        },
      },
      phone: {
        key: 'phone',
        label: 'נייד',
        nowrap: true,
        render: (r) => (
          <span dir="ltr" className="font-mono text-[13px] text-[#6B6B6B]">
            {r.phone ? formatPhone(r.phone) : dash(null)}
          </span>
        ),
      },
      display_name: {
        key: 'display_name',
        label: 'שם',
        sortable: true,
        render: (r) => (
          <span className="font-semibold text-[#2D2D2D]">
            {dash(r.display_name)}
            {r.seen_count > 1 && (
              <span
                title="מספר הופעות"
                className="ms-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#F3F4F6] px-1 text-[10px] font-semibold text-[#6B6B6B]"
              >
                {r.seen_count}
              </span>
            )}
          </span>
        ),
      },
      email: {
        key: 'email',
        label: 'אימייל',
        render: (r) => (
          <span dir="ltr" className="text-[13px] text-[#6B6B6B]">
            {dash(r.email)}
          </span>
        ),
      },
      match_existing: {
        key: 'match_existing',
        label: 'התאמה לרשומה קיימת',
        render: (r) =>
          r.match_contact
            ? `איש קשר #${r.match_contact}`
            : r.match_account
              ? `ארגון #${r.match_account}`
              : dash(null),
      },
      match_reason: {
        key: 'match_reason',
        label: 'סיבת התאמה',
        render: (r) => <span className="text-[13px] text-[#6B6B6B]">{dash(entryReasonLabel(r.match_reason))}</span>,
      },
      match_confidence: {
        key: 'match_confidence',
        label: 'רמת ביטחון',
        sortable: true,
        render: (r) =>
          r.match_confidence != null ? (
            <span
              className={`text-[13px] font-semibold ${
                r.match_confidence >= 80
                  ? 'text-[#008080]'
                  : r.match_confidence >= 40
                    ? 'text-[#D97706]'
                    : 'text-[#9CA3AF]'
              }`}
            >
              {r.match_confidence}%
            </span>
          ) : (
            dash(null)
          ),
      },
      has_new_information: {
        key: 'has_new_information',
        label: 'מידע חדש',
        render: (r) =>
          r.has_new_information ? (
            <AdminBadge label="חדש" variant="teal" />
          ) : (
            <span className="text-[#9CA3AF]">—</span>
          ),
      },
      source: {
        key: 'source',
        label: 'מקור',
        render: (r) => (
          <span className="text-[13px] text-[#6B6B6B]">{sourceLabel(r, sourceTypes).full}</span>
        ),
      },
      tags: {
        key: 'tags',
        label: 'תגיות',
        render: (r) => (
          <div className="flex flex-wrap gap-1">
            {r.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-[#F3F4F6] px-1.5 py-0.5 text-[11px] text-[#6B6B6B]"
              >
                {tag}
              </span>
            ))}
            {r.tags.length > 2 && (
              <span className="text-[11px] text-[#9CA3AF]">+{r.tags.length - 2}</span>
            )}
            {r.tags.length === 0 && <span className="text-[#9CA3AF]">—</span>}
          </div>
        ),
      },
      created_at: {
        key: 'created_at',
        label: 'תאריך קליטה',
        sortable: true,
        nowrap: true,
        render: (r) => (
          <span className="text-[13px] text-[#9CA3AF]">
            {new Date(r.created_at).toLocaleDateString('he-IL')}
          </span>
        ),
      },
      phone_norm: {
        key: 'phone_norm',
        label: 'נייד מנורמל',
        render: (r) => (
          <span dir="ltr" className="font-mono text-[12px] text-[#9CA3AF]">
            {dash(r.phone_norm)}
          </span>
        ),
      },
      first_name: { key: 'first_name', label: 'שם פרטי', render: (r) => dash(r.first_name) },
      last_name: { key: 'last_name', label: 'שם משפחה', render: (r) => dash(r.last_name) },
      facebook_name: {
        key: 'facebook_name',
        label: 'שם פייסבוק',
        render: (r) => dash(r.facebook_name),
      },
      facebook_id: {
        key: 'facebook_id',
        label: 'Facebook ID',
        render: (r) => <span dir="ltr">{dash(r.facebook_id)}</span>,
      },
      facebook_url: {
        key: 'facebook_url',
        label: 'Facebook URL',
        render: (r) => <span dir="ltr">{dash(r.facebook_url)}</span>,
      },
      linkedin_url: {
        key: 'linkedin_url',
        label: 'LinkedIn',
        render: (r) => <span dir="ltr">{dash(r.linkedin_url)}</span>,
      },
      facebook_group_name: {
        key: 'facebook_group_name',
        label: 'קבוצת פייסבוק',
        render: (r) => dash(r.facebook_group_name),
      },
      match_contact: {
        key: 'match_contact',
        label: 'match_contact',
        render: (r) => dash(r.match_contact),
      },
      match_account: {
        key: 'match_account',
        label: 'match_account',
        render: (r) => dash(r.match_account),
      },
      matched_by: { key: 'matched_by', label: 'שיטת התאמה', render: (r) => dash(matchedByLabel(r.matched_by)) },
      seen_count: { key: 'seen_count', label: 'הופעות', render: (r) => r.seen_count },
      updated_at: {
        key: 'updated_at',
        label: 'עודכן',
        nowrap: true,
        render: (r) => (
          <span className="text-[13px] text-[#9CA3AF]">
            {new Date(r.updated_at).toLocaleDateString('he-IL')}
          </span>
        ),
      },
    }),
    [sourceTypes]
  )

  const columns = useMemo(
    () =>
      ALL_COLUMNS.filter((c) => visibleColumns.includes(c.key))
        .map((c) => columnDefs[c.key])
        .filter(Boolean),
    [visibleColumns, columnDefs]
  )

  const selectedStr = selectedIds.map(String)
  const pageIds = rows.map((r) => r.lead_id)
  const allSelected = rows.length > 0 && pageIds.every((id) => selectedIds.includes(id))
  const someSelected = pageIds.some((id) => selectedIds.includes(id))

  const toggleId = (id: string) => {
    const n = Number(id)
    onSelectionChange(
      selectedIds.includes(n) ? selectedIds.filter((x) => x !== n) : [...selectedIds, n]
    )
  }

  const toggleAll = () => {
    if (allSelected) onSelectionChange(selectedIds.filter((id) => !pageIds.includes(id)))
    else onSelectionChange([...new Set([...selectedIds, ...pageIds])])
  }

  return (
    <AdminTable<InboxV2Row>
      columns={columns}
      data={sorted}
      keyField="lead_id"
      onRowClick={(r) => onRowClick(r.lead_id)}
      selectedIds={selectedStr}
      onSelectId={toggleId}
      allSelected={allSelected}
      someSelected={someSelected}
      onSelectAll={toggleAll}
      sortKey={SORTABLE.has(sortKey) ? sortKey : undefined}
      sortDir={sortDir}
      onSort={onSort}
      isLoading={isLoading}
      hasActiveFilter={hasActiveFilter}
      emptyMessage="אין רשומות — העלו קובץ או הדביקו נתונים כדי להתחיל"
      noResultsMessage="לא נמצאו רשומות התואמות את הסינון"
      bulkActions={bulkActions}
      pagination={pagination}
      minWidth="1100px"
    />
  )
}
