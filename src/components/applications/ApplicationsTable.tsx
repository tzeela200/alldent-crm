import { useMemo } from 'react'
import { Eye, UserPlus, Ban, Send, Archive, Link2 } from 'lucide-react'
import { AdminTable, type AdminColumn } from '@/components/admin/AdminTable'
import { AdminActionsMenu, type AdminActionMenuItem } from '@/components/admin/AdminActionsMenu'
import { AdminTablePagination } from '@/components/admin/AdminTablePagination'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { RegionBadge } from '@/components/admin/RegionBadge'
import { RoleBadge } from '@/components/admin/RoleBadge'
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon'
import { getDictLabel, type useApplicationDicts } from '@/hooks/useApplicationDicts'
import { formatDate } from '@/lib/timeAgo'
import { whatsappLink, formatPhone } from '@/lib/normalizePhone'
import { openApplicationCv, personHasCv } from '@/lib/cv'
import type { ApplicationRow } from '@/types/applications'
import type { ColumnKey } from './applicationColumns'

// טבלת הגשות — קנונית: AdminTable + AdminActionsMenu + StatusBadge/RegionBadge/RoleBadge.
// הוצאה מ-AdminApplicationsPage (שהיה 1,032 שורות) לקובץ נפרד כדי שההסבה
// לרכיבים המשותפים תהיה נקודתית ולא תיגע בכל הדף.

interface Props {
  rows: ApplicationRow[]
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  selectedIds: number[]
  onToggleRow: (id: number) => void
  onToggleAll: () => void
  allSelected: boolean
  someSelected: boolean
  onRowClick: (id: number) => void
  dicts: ReturnType<typeof useApplicationDicts>['data']
  visibleColumns: ColumnKey[]
  isLoading?: boolean
  error?: string
  hasActiveFilter?: boolean
  bulkActions?: React.ReactNode
  onCreateContact: (app: ApplicationRow) => void
  onMarkSpam: (app: ApplicationRow) => void
  onSendToLeads: (app: ApplicationRow) => void
  onArchive: (id: number) => void
  /** קישור הגשה לכרטיס קיים שזוהה לפי נייד (registry_match_contact_id). */
  onLinkToRegistry: (app: ApplicationRow) => void
  linkingId?: number | null
  sortBy: string
  sortDir: 'asc' | 'desc'
  onSort: (key: string) => void
}

export function ApplicationsTable({
  rows,
  total,
  page,
  pageSize,
  onPageChange,
  selectedIds,
  onToggleRow,
  onToggleAll,
  allSelected,
  someSelected,
  onRowClick,
  dicts,
  visibleColumns,
  isLoading,
  error,
  hasActiveFilter,
  bulkActions,
  onCreateContact,
  onMarkSpam,
  onSendToLeads,
  onArchive,
  onLinkToRegistry,
  linkingId,
  sortBy,
  sortDir,
  onSort,
}: Props) {
  const showCol = (key: ColumnKey) => visibleColumns.includes(key)

  const columns = useMemo<AdminColumn<ApplicationRow>[]>(() => {
    const all: Array<AdminColumn<ApplicationRow> & { colKey?: ColumnKey }> = [
      {
        key: 'candidate_name',
        label: 'שם מועמד',
        sortable: true,
        render: (row) => (
          <span className="font-semibold text-[#2D2D2D]">{row.candidate_name ?? '—'}</span>
        ),
      },
      {
        key: 'candidate_phone',
        label: 'נייד',
        sortable: true,
        nowrap: true,
        render: (row) =>
          row.candidate_phone ? (
            <span dir="ltr" className="text-[13px] text-[#6B6B6B]">
              {formatPhone(row.candidate_phone)}
            </span>
          ) : (
            '—'
          ),
      },
      {
        key: 'candidate_city',
        colKey: 'candidate_city',
        label: 'עיר מועמד',
        render: (row) => {
          // רק כשהמועמד קיים במאגר (לפי בקשת צאלה). העיר מגיעה מהכרטיס
          // המקושר, עם master_city כגיבוי לשורות ישנות.
          if (!row.candidate_link) return '—'
          const fromContact = getDictLabel(dicts?.cities, row.contact_city_id)
          if (fromContact && fromContact !== '—') return fromContact
          return row.master_city || '—'
        },
      },
      {
        key: 'candidate_locality_type',
        colKey: 'candidate_locality_type',
        label: 'סוג יישוב',
        render: (row) => {
          // נגזר בטריגר מהעיר שעל כרטיס המועמד — ולכן רק למי שקיים במאגר.
          // טקסט חופשי ב-DB (אין מילון); בפועל: "יישוב יהודי" / "יישוב ערבי".
          if (!row.candidate_link) return '—'
          return row.contact_locality_type || '—'
        },
      },
      {
        key: 'registry_status',
        colKey: 'registry_status',
        label: 'מצב במאגר',
        render: (row) => {
          if (row.candidate_link && !row.is_new_candidate)
            return (
              <span className="inline-flex rounded-[6px] bg-[#E6F3F3] px-2.5 py-0.5 text-[12px] font-semibold text-[#008080]">
                קיים במאגר
              </span>
            )
          // מצב שלישי: לאדם כבר יש כרטיס (אותו phone_norm), ההגשה פשוט מעולם
          // לא קושרה אליו. 39 מתוך 92 ה"חדש למאגר" הם כאלה (INC-3116).
          if (row.registry_match_contact_id)
            return (
              <div className="flex flex-col items-start gap-1">
                <span className="inline-flex rounded-[6px] bg-[#EFF6FF] px-2.5 py-0.5 text-[12px] font-semibold text-[#1D4ED8]">
                  קיים במאגר — לא מקושר
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onLinkToRegistry(row)
                  }}
                  disabled={linkingId === row.application_id}
                  className="text-[11px] font-semibold text-[#008080] hover:underline disabled:opacity-50"
                  title={row.registry_match_name ? `קישור אל ${row.registry_match_name}` : undefined}
                >
                  {linkingId === row.application_id ? 'מקשר…' : 'קשר לכרטיס ←'}
                </button>
              </div>
            )
          return (
            <span className="inline-flex rounded-[6px] bg-[#FDF3E7] px-2.5 py-0.5 text-[12px] font-semibold text-[#B45309]">
              חדש למאגר
            </span>
          )
        },
      },
      {
        key: 'work_status',
        colKey: 'work_status',
        label: 'סטטוס תעסוקה',
        render: (row) =>
          row.candidate_link ? getDictLabel(dicts?.workStatuses, row.contact_work_status) : '—',
      },
      {
        key: 'availability',
        colKey: 'availability',
        label: 'זמינות',
        render: (row) =>
          row.candidate_link ? getDictLabel(dicts?.availabilities, row.contact_availability) : '—',
      },
      {
        key: 'job_code',
        label: 'קוד משרה',
        sortable: true,
        nowrap: true,
        render: (row) => (
          <span className="font-semibold text-[#6B6B6B]">{row.job_code ?? '—'}</span>
        ),
      },
      {
        key: 'job_role',
        colKey: 'job_role',
        label: 'תפקיד משרה',
        sortable: true,
        render: (row) =>
          row.job_role ? <RoleBadge roleId={row.job_role_id} label={row.job_role} /> : '—',
      },
      {
        key: 'job_region',
        colKey: 'job_region',
        label: 'אזור משרה',
        sortable: true,
        render: (row) =>
          row.job_region ? <RegionBadge regionId={row.job_region_id} label={row.job_region} /> : '—',
      },
      {
        key: 'job_city',
        colKey: 'job_city',
        label: 'עיר משרה',
        sortable: true,
        render: (row) => row.job_city ?? '—',
      },
      {
        key: 'account_name',
        colKey: 'org_name',
        label: 'שם ארגון',
        sortable: true,
        render: (row) => row.account_name ?? '—',
      },
      {
        key: 'job_status',
        colKey: 'job_status',
        label: 'סטטוס משרה',
        render: (row) =>
          row.job_status != null ? <StatusBadge statusType="job" statusId={row.job_status} /> : '—',
      },
      {
        key: 'application_status',
        label: 'סטטוס הגשה',
        sortable: true,
        render: (row) => <StatusBadge statusType="application" statusId={row.application_status} />,
      },
      {
        key: 'check_status',
        colKey: 'check_status',
        label: 'סטטוס בדיקה',
        sortable: true,
        render: (row) =>
          row.check_status != null ? (
            <StatusBadge statusType="check" statusId={row.check_status} />
          ) : (
            '—'
          ),
      },
      {
        key: 'cv',
        colKey: 'cv',
        label: 'קו"ח',
        render: (row) =>
          personHasCv(row) ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                openApplicationCv(row)
              }}
              // מקור הקו"ח מסומן: של ההגשה עצמה, או מכרטיס המועמד במאגר.
              title={
                row.has_cv || row.cv_link || row.cv_storage_path
                  ? 'קו"ח שצורפו להגשה'
                  : 'קו"ח מכרטיס המועמד במאגר'
              }
              className="whitespace-nowrap text-[13px] font-semibold text-[#3B82F6] hover:underline"
            >
              {row.has_cv || row.cv_link || row.cv_storage_path ? 'צפייה ↗' : 'מהמאגר ↗'}
            </button>
          ) : (
            <span className="text-[#D1D5DB]">—</span>
          ),
      },
      {
        key: 'source',
        colKey: 'source',
        label: 'מקור',
        sortable: true,
        render: (row) => getDictLabel(dicts?.sources, row.source),
      },
      {
        key: 'submission_date',
        colKey: 'submission_date',
        label: 'תאריך הגשה',
        sortable: true,
        nowrap: true,
        render: (row) => formatDate(row.submission_date),
      },
      {
        key: 'follow_up_date',
        colKey: 'follow_up_date',
        label: 'פעולה הבאה',
        sortable: true,
        nowrap: true,
        render: (row) => (row.follow_up_date ? formatDate(row.follow_up_date) : '—'),
      },
      {
        key: 'candidate_notes',
        colKey: 'candidate_notes',
        label: 'הערות מועמד',
        cellClassName: 'max-w-[200px] truncate',
        render: (row) => row.candidate_notes ?? '—',
      },
      {
        key: 'notes',
        colKey: 'notes',
        label: 'הערות פנימיות',
        cellClassName: 'max-w-[160px] truncate',
        render: (row) => row.internal_notes ?? '—',
      },
      {
        key: '__actions',
        label: 'פעולות',
        width: '96px',
        render: (row) => {
          const isNewToRegistry = row.is_new_candidate || !row.candidate_link
          const items: AdminActionMenuItem[] = [
            {
              key: 'details',
              icon: <Eye className="h-4 w-4" />,
              label: 'פרטי הגשה',
              onClick: () => onRowClick(row.application_id),
            },
          ]
          if (row.candidate_phone) {
            items.push({
              key: 'whatsapp',
              icon: <WhatsAppIcon className="h-4 w-4" />,
              label: 'שליחת WhatsApp',
              onClick: () => window.open(whatsappLink(row.candidate_phone), '_blank', 'noopener'),
            })
          }
          if (isNewToRegistry) {
            // כשכבר קיים כרטיס עם אותו נייד — לקשר אליו, לא ליצור כרטיס שני.
            if (row.registry_match_contact_id) {
              items.push({
                key: 'link',
                icon: <Link2 className="h-4 w-4" />,
                label: row.registry_match_name
                  ? `קשר לכרטיס: ${row.registry_match_name}`
                  : 'קשר לכרטיס קיים',
                separatorBefore: true,
                disabled: linkingId === row.application_id,
                onClick: () => onLinkToRegistry(row),
              })
            }
            items.push({
              key: 'approve',
              icon: <UserPlus className="h-4 w-4" />,
              label: 'מאושר למאגר',
              separatorBefore: !row.registry_match_contact_id,
              onClick: () => onCreateContact(row),
            })
            items.push({
              key: 'leads',
              icon: <Send className="h-4 w-4" />,
              label: 'שלח ללידים',
              onClick: () => onSendToLeads(row),
            })
            items.push({
              key: 'spam',
              icon: <Ban className="h-4 w-4" />,
              label: 'סמן כספאם',
              danger: true,
              onClick: () => {
                if (confirm(`לסמן את ההגשה של ${row.candidate_name ?? 'מועמד זה'} כספאם? ההגשה תועבר לארכיון.`))
                  onMarkSpam(row)
              },
            })
          }
          // ארכוב זמין לכל שורה — לא רק ל"חדש למאגר" כפי שהיה קודם.
          items.push({
            key: 'archive',
            icon: <Archive className="h-4 w-4" />,
            label: 'העבר לארכיון',
            separatorBefore: !isNewToRegistry,
            danger: true,
            onClick: () => {
              if (confirm(`להעביר את ההגשה של ${row.candidate_name ?? 'מועמד זה'} לארכיון?`))
                onArchive(row.application_id)
            },
          })
          return <AdminActionsMenu items={items} ariaLabel={`פעולות להגשה ${row.application_id}`} />
        },
      },
    ]

    // עמודות שאינן ניתנות להסתרה נשארות תמיד; השאר לפי בחירת המשתמש.
    return all.filter((c) => !c.colKey || showCol(c.colKey))
  }, [dicts, visibleColumns, onRowClick, onCreateContact, onMarkSpam, onSendToLeads, onArchive, onLinkToRegistry, linkingId])

  return (
    <AdminTable<ApplicationRow>
      columns={columns}
      data={rows}
      keyField="application_id"
      onRowClick={(row) => onRowClick(row.application_id)}
      selectedIds={selectedIds.map(String)}
      onSelectId={(id) => onToggleRow(Number(id))}
      allSelected={allSelected}
      someSelected={someSelected}
      onSelectAll={onToggleAll}
      sortKey={sortBy}
      sortDir={sortDir}
      onSort={onSort}
      isLoading={isLoading}
      error={error}
      hasActiveFilter={hasActiveFilter}
      emptyMessage="אין עדיין הגשות"
      noResultsMessage="אין הגשות התואמות את הסינון"
      bulkActions={bulkActions}
      stickyHeader
      minWidth="1500px"
      // פס צבע התפקיד בצד השורה הוסר: הוא הגיע מ-getRoleBorderColor מקומי
      // שנתן גוון שונה מ-RoleBadge באותה שורה (מפת צבעים כפולה). עמודת
      // "תפקיד משרה" כבר מציגה את הצבע הקנוני מ-lib/roleColors.
      pagination={
        <AdminTablePagination
          page={page + 1}
          pageSize={pageSize}
          total={total}
          onPageChange={(next) => onPageChange(next - 1)}
        />
      }
    />
  )
}
