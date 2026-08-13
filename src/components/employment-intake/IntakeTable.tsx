/** לשונית "תוצאות" — טבלת ההודעות שנקלטו (§3.4). */

import { Pencil } from 'lucide-react'
import { AdminTable, type AdminColumn } from '@/components/admin/AdminTable'
import { AdminTablePagination } from '@/components/admin/AdminTablePagination'
import { AdminActionsMenu } from '@/components/admin/AdminActionsMenu'
import { AdminBadge } from '@/components/admin/AdminBadge'
import { AdminCountPreview } from '@/components/admin/AdminCountPreview'
import { formatPhone } from '@/lib/normalizePhone'
import { computeMatchStatus } from '@/lib/employment-intake/matching'
import {
  CONTENT_TYPE_LABEL,
  CONTENT_TYPE_TONE,
  MATCH_STATUS_LABEL,
  ACTION_TYPE_LABEL,
  ACTION_RESULT_LABEL,
  ACTION_RESULT_TONE,
  fieldLabel,
} from '@/lib/employment-intake/labels'
import type { RowWithAction } from '@/hooks/useEmploymentIntakeRows'

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })
}

interface Props {
  rows: RowWithAction[]
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  isLoading: boolean
  hasActiveFilter: boolean
  sortDir: 'asc' | 'desc'
  onSort: (key: string) => void
  selectedIds: string[]
  onSelectId: (id: string) => void
  onSelectAll: () => void
  onRowClick?: (row: RowWithAction) => void
  onEditRow: (row: RowWithAction) => void
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
  sortDir,
  onSort,
  selectedIds,
  onSelectId,
  onSelectAll,
  onRowClick,
  onEditRow,
  bulkActions,
}: Props) {
  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.includes(String(r.id)))
  const someSelected = rows.some((r) => selectedIds.includes(String(r.id)))

  const columns: AdminColumn<RowWithAction>[] = [
    {
      key: 'content_type',
      label: 'סוג התוכן',
      render: (row) => <AdminBadge label={CONTENT_TYPE_LABEL[row.content_type]} variant={CONTENT_TYPE_TONE[row.content_type]} />,
    },
    {
      key: 'original_text',
      label: 'הטקסט המקוצר',
      minWidth: '220px',
      render: (row) => <span className="line-clamp-2 text-[13px]">{row.original_text}</span>,
    },
    { key: 'contact_name', label: 'שם האדם', render: (row) => row.contact_name ?? '—' },
    { key: 'phone', label: 'טלפון', nowrap: true, render: (row) => (row.phone ? formatPhone(row.phone) : '—') },
    { key: 'email', label: 'מייל', render: (row) => row.email ?? '—' },
    { key: 'facebook_name', label: 'Facebook', render: (row) => row.facebook_name ?? '—' },
    { key: 'role_raw', label: 'תפקיד', render: (row) => row.role_raw ?? '—' },
    { key: 'city_raw', label: 'עיר', render: (row) => row.city_raw ?? '—' },
    { key: 'org_name', label: 'ארגון', render: (row) => row.org_name ?? '—' },
    { key: 'source_name', label: 'מקור', render: (row) => row.source_name ?? '—' },
    {
      key: 'source_published_at',
      label: 'זמן הפרסום המקורי',
      nowrap: true,
      render: (row) => formatDateTime(row.source_published_at),
    },
    {
      key: 'ingested_at',
      label: 'זמן הקליטה',
      sortable: true,
      nowrap: true,
      render: (row) => formatDateTime(row.ingested_at),
    },
    {
      key: 'match_status',
      label: 'מצב במאגר',
      render: (row) => <AdminBadge label={MATCH_STATUS_LABEL[computeMatchStatus(row)]} variant="info" />,
    },
    {
      key: 'match_field',
      label: 'ההתאמה שנמצאה',
      render: (row) => (row.match_field ? fieldLabel(row.match_field) : '—'),
    },
    {
      key: 'details_sent',
      label: 'מועד שליחת הפרטים',
      nowrap: true,
      render: (row) => (row.last_action?.performed_at ? formatDateTime(row.last_action.performed_at) : '—'),
    },
    {
      key: 'occurrences',
      label: 'הופעות',
      render: (row) => (
        <AdminCountPreview
          count={row.context_seqs?.length ? row.context_seqs.length + 1 : 1}
          renderPreview={() => <span>הודעות מקור: {row.context_seqs?.length ? row.context_seqs.length + 1 : 1}</span>}
        />
      ),
    },
    {
      key: 'proposed_action',
      label: 'הפעולה המוצעת',
      render: (row) => (row.proposed_action ? ACTION_TYPE_LABEL[row.proposed_action] : '—'),
    },
    {
      key: 'action_result',
      label: 'תוצאת הפעולה',
      render: (row) => {
        const result = row.last_action?.result as keyof typeof ACTION_RESULT_LABEL | undefined
        const value = result ?? 'pending'
        return <AdminBadge label={ACTION_RESULT_LABEL[value]} variant={ACTION_RESULT_TONE[value]} />
      },
    },
    {
      key: 'row_actions',
      label: 'פעולות',
      render: (row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <AdminActionsMenu
            ariaLabel={`פעולות עבור שורה ${row.id}`}
            items={[
              {
                key: 'edit',
                icon: <Pencil className="h-4 w-4" />,
                label: 'עריכת פרטים',
                onClick: () => onEditRow(row),
              },
            ]}
          />
        </div>
      ),
    },
  ]

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
      sortKey="ingested_at"
      sortDir={sortDir}
      onSort={onSort}
      isLoading={isLoading}
      hasActiveFilter={hasActiveFilter}
      bulkActions={bulkActions}
      emptyMessage="לא נמצאו רשומות."
      noResultsMessage="אין רשומות התואמות למסננים שנבחרו."
      minWidth="1600px"
      stickyHeader
      pagination={<AdminTablePagination page={page} pageSize={pageSize} total={total} onPageChange={onPageChange} />}
    />
  )
}
