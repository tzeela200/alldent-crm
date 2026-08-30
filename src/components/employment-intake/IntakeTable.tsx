/** Table First — הטבלה העסקית של מסך "איתור מחפשי עבודה ומגייסים". */

import { Eye, EyeOff, Pencil } from 'lucide-react'
import { AdminTable, type AdminColumn } from '@/components/admin/AdminTable'
import { AdminTablePagination } from '@/components/admin/AdminTablePagination'
import { AdminActionsMenu } from '@/components/admin/AdminActionsMenu'
import { AdminBadge } from '@/components/admin/AdminBadge'
import { AdminCountPreview } from '@/components/admin/AdminCountPreview'
import { formatPhone } from '@/lib/normalizePhone'
import { useApplicationDicts, getDictLabel } from '@/hooks/useApplicationDicts'
import { useEmploymentIntakeDicts } from '@/hooks/useEmploymentIntake'
import { useUpdateEmploymentIntakeRow } from '@/hooks/useEmploymentIntakeRowEdit'
import { useDismissIntakeRows } from '@/hooks/useEmploymentIntakeActions'
import { resolveEffectiveFields } from '@/lib/employment-intake/effectiveFields'
import {
  CONTENT_TYPE_LABEL,
  CONTENT_TYPE_TONE,
  DATABASE_STATE_LABEL,
  DATABASE_STATE_TONE,
  computeDatabaseState,
} from '@/lib/employment-intake/labels'
import type { ContentType } from '@/types/employment-intake'
import type { EmploymentIntakeSortKey, RowWithAction } from '@/hooks/useEmploymentIntakeRows'

export const EMPLOYMENT_INTAKE_COLUMNS_STORAGE_KEY = 'alldent:employment-intake:visible-columns:v2'

const CONTENT_TYPE_OPTIONS: ContentType[] = ['job_seeker', 'recruiter', 'group_join', 'unclear', 'irrelevant', 'unclassified']

export const ALL_COLUMNS = [
  { key: 'source_published_at', label: 'זמן הפרסום המקורי' },
  { key: 'sender_name', label: 'שם השולח' },
  { key: 'identified_entity', label: 'האדם / הארגון שזוהה' },
  { key: 'phone', label: 'נייד' },
  { key: 'original_text', label: 'הודעה' },
  { key: 'content_type', label: 'קטגוריה' },
  { key: 'role_id', label: 'תפקיד' },
  { key: 'city_id', label: 'עיר' },
  { key: 'database_state', label: 'מצב במאגר' },
  { key: 'treatment_status', label: 'סטטוס טיפול' },
  { key: 'row_actions', label: 'פעולות' },
  { key: 'second_phone', label: 'נייד נוסף' },
  { key: 'email', label: 'מייל' },
  { key: 'second_email', label: 'מייל נוסף' },
  { key: 'org_name', label: 'ארגון' },
  { key: 'region_id', label: 'אזור' },
  { key: 'source_name', label: 'מקור הקלט' },
  { key: 'facebook_name', label: 'שם פייסבוק' },
  { key: 'facebook_id', label: 'Facebook ID' },
  { key: 'facebook_url', label: 'Facebook URL' },
  { key: 'ingested_at', label: 'זמן קליטה' },
  { key: 'occurrences', label: 'הופעות' },
] as const

export type IntakeColumnKey = (typeof ALL_COLUMNS)[number]['key']

export const DEFAULT_COLUMNS: IntakeColumnKey[] = [
  'source_published_at',
  'sender_name',
  'identified_entity',
  'phone',
  'original_text',
  'content_type',
  'role_id',
  'city_id',
  'database_state',
  'treatment_status',
  'row_actions',
]

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })
}

function ltrValue(value: string | null | undefined) {
  return value ? <span dir="ltr" className="inline-block unicode-bidi-isolate">{value}</span> : '—'
}

function selectClass() {
  return 'h-8 max-w-full rounded-[8px] border border-[#D9D9D9] bg-white px-2 text-[13px] outline-none focus:border-[#008080]'
}

interface Props {
  rows: RowWithAction[]
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  isLoading: boolean
  hasActiveFilter: boolean
  sortKey: EmploymentIntakeSortKey
  sortDir: 'asc' | 'desc'
  onSort: (key: string) => void
  visibleColumns: string[]
  selectedIds: string[]
  onSelectId: (id: string) => void
  onSelectAll: () => void
  onRowClick?: (row: RowWithAction) => void
  onOpenDetails: (row: RowWithAction) => void
  onEditRow: (row: RowWithAction) => void
  /** שינוי סטטוס טיפול על רשומה עם Contact מותאם הוא כתיבה לליבה — עובר דרך אישור מפורש בדיאלוג, לא נכתב ישירות מהטבלה. */
  onRequestStatusChange: (row: RowWithAction, statusId: number, statusLabel: string) => void
  bulkActions?: React.ReactNode
}

export function IntakeTable({
  rows,
  total,
  page,
  pageSize,
  onPageChange,
  isLoading,
  hasActiveFilter,
  sortKey,
  sortDir,
  onSort,
  visibleColumns,
  selectedIds,
  onSelectId,
  onSelectAll,
  onRowClick,
  onOpenDetails,
  onEditRow,
  onRequestStatusChange,
  bulkActions,
}: Props) {
  const { data: appDicts } = useApplicationDicts()
  const { data: intakeDicts } = useEmploymentIntakeDicts()
  const updateRow = useUpdateEmploymentIntakeRow()
  const dismissRows = useDismissIntakeRows()
  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.includes(String(r.id)))
  const someSelected = rows.some((r) => selectedIds.includes(String(r.id)))

  const socialStatuses = intakeDicts?.socialStatuses ?? []

  function handleCategoryChange(row: RowWithAction, next: ContentType) {
    if (next === row.content_type) return
    updateRow.mutate({ row, patch: { content_type: next } })
  }

  function handleStatusChange(row: RowWithAction, nextId: number | null) {
    if (nextId == null) return
    const label = socialStatuses.find((s) => s.id === nextId)?.name ?? String(nextId)
    if (row.match_contact != null) {
      // כתיבה לליבה (contact.social_status) — עוברת דרך דיאלוג אישור מפורש, לא כתיבה שקטה.
      onRequestStatusChange(row, nextId, label)
      return
    }
    // אין עדיין Contact מותאם — זו רק הצעת סטטוס על שורת ה-staging, לא כתיבה לליבה.
    if (nextId === row.proposed_social_status) return
    updateRow.mutate({ row, patch: { proposed_social_status: nextId } })
  }

  const columnsByKey: Record<IntakeColumnKey, AdminColumn<RowWithAction>> = {
    source_published_at: {
      key: 'source_published_at', label: 'זמן הפרסום המקורי', sortable: true, nowrap: true,
      render: (row) => formatDateTime(row.source_published_at),
    },
    sender_name: {
      key: 'sender_name', label: 'שם השולח', sortable: true, minWidth: '150px',
      render: (row) => row.sender_name ?? 'הודעת מערכת',
    },
    identified_entity: {
      key: 'identified_entity', label: 'האדם / הארגון שזוהה', minWidth: '170px',
      render: (row) => <span className="font-semibold">{resolveEffectiveFields(row).displayName ?? '—'}</span>,
    },
    phone: {
      key: 'phone', label: 'נייד', sortable: true, nowrap: true,
      render: (row) => {
        const phone = resolveEffectiveFields(row).phone
        return phone ? <span dir="ltr" className="inline-block unicode-bidi-isolate">{formatPhone(phone)}</span> : '—'
      },
    },
    original_text: {
      key: 'original_text', label: 'הודעה', minWidth: '240px',
      render: (row) => <span className="line-clamp-2 text-[13px]" dir="auto">{row.original_text}</span>,
    },
    content_type: {
      key: 'content_type', label: 'קטגוריה', sortable: true, minWidth: '150px',
      render: (row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <select
            className={selectClass()}
            value={row.content_type}
            onChange={(e) => handleCategoryChange(row, e.target.value as ContentType)}
            disabled={updateRow.isPending}
          >
            {CONTENT_TYPE_OPTIONS.map((ct) => (
              <option key={ct} value={ct}>{CONTENT_TYPE_LABEL[ct]}</option>
            ))}
          </select>
        </div>
      ),
    },
    role_id: {
      key: 'role_id', label: 'תפקיד', sortable: true,
      render: (row) => {
        const { roleId } = resolveEffectiveFields(row)
        return roleId != null ? getDictLabel(appDicts?.roles, roleId) : (row.role_raw ?? '—')
      },
    },
    city_id: {
      key: 'city_id', label: 'עיר', sortable: true,
      render: (row) => {
        const { cityId } = resolveEffectiveFields(row)
        return cityId != null ? getDictLabel(appDicts?.cities, cityId) : (row.city_raw ?? '—')
      },
    },
    database_state: {
      key: 'database_state', label: 'מצב במאגר', minWidth: '120px',
      render: (row) => {
        const state = computeDatabaseState(row)
        return <AdminBadge label={DATABASE_STATE_LABEL[state]} variant={DATABASE_STATE_TONE[state]} />
      },
    },
    treatment_status: {
      key: 'treatment_status', label: 'סטטוס טיפול', minWidth: '170px',
      render: (row) => {
        const statusId = row.matched_contact?.social_status ?? row.proposed_social_status
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <select
              className={selectClass()}
              value={statusId ?? ''}
              onChange={(e) => handleStatusChange(row, e.target.value ? Number(e.target.value) : null)}
              disabled={updateRow.isPending}
            >
              <option value="">— ללא —</option>
              {socialStatuses.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )
      },
    },
    row_actions: {
      key: 'row_actions', label: 'פעולות',
      render: (row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <AdminActionsMenu
            ariaLabel={`פעולות עבור רשומה ${row.id}`}
            items={[
              { key: 'details', icon: <Eye className="h-4 w-4" />, label: 'פרטי הרשומה ופעולות', onClick: () => onOpenDetails(row) },
              { key: 'edit', icon: <Pencil className="h-4 w-4" />, label: 'עריכת פרטים / זיהוי', onClick: () => onEditRow(row) },
              {
                key: 'dismiss',
                icon: <EyeOff className="h-4 w-4" />,
                label: 'הסרה משולחן העבודה',
                onClick: () => dismissRows.mutate({ rows: [row] }),
              },
            ]}
          />
        </div>
      ),
    },
    second_phone: {
      key: 'second_phone', label: 'נייד נוסף', nowrap: true,
      render: (row) => row.second_phone ? <span dir="ltr" className="inline-block unicode-bidi-isolate">{formatPhone(row.second_phone)}</span> : '—',
    },
    email: { key: 'email', label: 'מייל', render: (row) => ltrValue(resolveEffectiveFields(row).email) },
    second_email: { key: 'second_email', label: 'מייל נוסף', render: (row) => ltrValue(row.second_email) },
    org_name: { key: 'org_name', label: 'ארגון', render: (row) => resolveEffectiveFields(row).orgName ?? '—' },
    region_id: {
      key: 'region_id', label: 'אזור',
      render: (row) => {
        const { regionId } = resolveEffectiveFields(row)
        return regionId != null ? getDictLabel(appDicts?.regions, regionId) : '—'
      },
    },
    source_name: { key: 'source_name', label: 'מקור הקלט', sortable: true, render: (row) => row.source_name ?? row.file_name ?? '—' },
    facebook_name: { key: 'facebook_name', label: 'שם פייסבוק', render: (row) => row.facebook_name ?? '—' },
    facebook_id: { key: 'facebook_id', label: 'Facebook ID', render: (row) => ltrValue(row.facebook_id) },
    facebook_url: { key: 'facebook_url', label: 'Facebook URL', minWidth: '180px', render: (row) => ltrValue(row.facebook_url) },
    ingested_at: { key: 'ingested_at', label: 'זמן קליטה', sortable: true, nowrap: true, render: (row) => formatDateTime(row.ingested_at) },
    occurrences: {
      key: 'occurrences', label: 'הופעות',
      render: (row) => (
        <AdminCountPreview
          count={row.context_seqs?.length ? row.context_seqs.length + 1 : 1}
          renderPreview={() => <span>הודעות מקור: {row.context_seqs?.length ? row.context_seqs.length + 1 : 1}</span>}
        />
      ),
    },
  }

  const columns = visibleColumns
    .filter((key): key is IntakeColumnKey => key in columnsByKey)
    .map((key) => columnsByKey[key])

  return (
    <AdminTable<RowWithAction>
      columns={columns}
      data={rows}
      keyField="id"
      onRowClick={onRowClick}
      selectedIds={selectedIds}
      onSelectId={onSelectId}
      allSelected={allSelected}
      someSelected={someSelected}
      onSelectAll={onSelectAll}
      sortKey={sortKey}
      sortDir={sortDir}
      onSort={onSort}
      isLoading={isLoading}
      hasActiveFilter={hasActiveFilter}
      bulkActions={bulkActions}
      emptyMessage="עדיין אין תוצאות עבודה להצגה."
      noResultsMessage="אין רשומות התואמות למסננים שנבחרו."
      minWidth="1180px"
      stickyHeader
      pagination={<AdminTablePagination page={page} pageSize={pageSize} total={total} onPageChange={onPageChange} />}
    />
  )
}
