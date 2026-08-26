/**
 * INC-3130 · HOME DENT — פניות. /admin/dental-assets/inquiries
 *
 * מיקום במערכת:
 *   /admin/dental-assets  →  פניות  →  /admin/dental-assets/HD0001
 * הפנייה תמיד מובילה חזרה לנכס שממנו הגיעה — אין כאן "עמוד מת".
 *
 * אותם רכיבים בדיוק כמו רשימת הנכסים: Shell, Toolbar, KPICard,
 * SearchBar, SelectFilter, AdminTable, AdminTablePagination, AdminBadge.
 * המסך נראה כמו אח של רשימת הנכסים כי הוא בנוי מאותם חלקים.
 */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import {
  ActionButton,
  KPICard,
  SearchBar,
  SelectFilter,
  Shell,
  Toolbar,
} from '@/components/layout/Shell'
import { AdminTable, type AdminColumn } from '@/components/admin/AdminTable'
import { AdminTablePagination } from '@/components/admin/AdminTablePagination'
import { AdminBadge } from '@/components/admin/AdminBadge'
import { ADMIN_INPUT } from '@/components/ui/AdminField'
import { formatDate } from '@/lib/timeAgo'
import { formatPhone, whatsappLink } from '@/lib/normalizePhone'
import { HD_INQUIRY, asFilterOptions } from '@/lib/homeDentStatuses'
import {
  HD_INQ_EMPTY_FILTERS,
  HD_INQ_PAGE_SIZE,
  useDentalInquiries,
  useDentalInquiryKpis,
  useDentalInquiryMutations,
  type DentalInquiryRow,
} from '@/hooks/useDentalInquiries'

const kpi = (n?: number) => (n === undefined ? '—' : String(n))

export default function AdminDentalInquiriesPage() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState(HD_INQ_EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const { data, isLoading, error, refetch } = useDentalInquiries(filters, page)
  const { data: kpis } = useDentalInquiryKpis()
  const { update } = useDentalInquiryMutations()

  const rows = data?.rows ?? []
  const hasFilter = !!(filters.search || filters.status)

  async function patch(id: string, p: { status?: string; internal_note?: string | null }) {
    const { error: e } = await update(id, p)
    if (e) toast.error(`העדכון נכשל: ${(e as Error).message}`)
    else toast.success('עודכן')
  }

  const columns: AdminColumn<DentalInquiryRow>[] = [
    {
      key: 'created_at',
      label: 'התקבלה',
      sortable: false,
      nowrap: true,
      render: (r) => formatDate(r.created_at),
    },
    {
      key: 'asset_code',
      label: 'נכס',
      nowrap: true,
      render: (r) => (
        <Link
          to={`/admin/dental-assets/${r.asset_code}`}
          className="font-mono text-[12px] font-semibold text-[#008080] hover:underline"
        >
          {r.asset_code}
        </Link>
      ),
    },
    { key: 'name', label: 'שם', render: (r) => r.name },
    {
      key: 'phone',
      label: 'טלפון',
      nowrap: true,
      render: (r) => (
        <a
          href={whatsappLink(r.phone)}
          target="_blank"
          rel="noopener noreferrer"
          dir="ltr"
          className="font-medium text-[#008080] hover:underline"
        >
          {formatPhone(r.phone)}
        </a>
      ),
    },
    {
      key: 'email',
      label: 'אימייל',
      render: (r) =>
        r.email ? (
          <a href={`mailto:${r.email}`} dir="ltr" className="text-[#008080] hover:underline">
            {r.email}
          </a>
        ) : (
          '—'
        ),
    },
    { key: 'offer_label', label: 'מסלול', render: (r) => r.offer_label ?? '—' },
    {
      key: 'message',
      label: 'הודעה',
      minWidth: '220px',
      render: (r) => <span className="line-clamp-2 text-[13px]">{r.message ?? '—'}</span>,
    },
    {
      key: 'status',
      label: 'סטטוס',
      nowrap: true,
      render: (r) => {
        const meta = HD_INQUIRY[r.status] ?? { label: r.status, variant: 'neutral' as const }
        return (
          <div className="flex items-center gap-2">
            <AdminBadge label={meta.label} variant={meta.variant} />
            <select
              value={r.status}
              onChange={(e) => void patch(r.id, { status: e.target.value })}
              aria-label={`שינוי סטטוס פנייה של ${r.name}`}
              className="h-8 rounded-lg border border-[#D9D9D9] bg-white px-2 text-[12.5px] outline-none transition focus:border-[#008080]"
            >
              {asFilterOptions(HD_INQUIRY).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )
      },
    },
    {
      key: 'internal_note',
      label: 'הערה פנימית',
      minWidth: '220px',
      render: (r) => (
        <input
          defaultValue={r.internal_note ?? ''}
          placeholder="הערה…"
          aria-label={`הערה פנימית לפנייה של ${r.name}`}
          // כתיבה ב-blur ולא בכל תו — אחרת כל הקלדה היא בקשת רשת.
          onBlur={(e) =>
            e.target.value !== (r.internal_note ?? '') &&
            void patch(r.id, { internal_note: e.target.value || null })
          }
          className={`${ADMIN_INPUT} h-8 text-[13px]`}
        />
      ),
    },
  ]

  return (
    <Shell
      title="פניות לנכסים"
      subtitle="פניות שהגיעו מטופס הנכס בדף הציבורי. לחיצה על וואטסאפ או טלפון בדף אינה יוצרת פנייה."
      icon={MessageSquare}
      actions={
        <>
          <ActionButton variant="secondary" onClick={() => refetch()}>
            רענון
          </ActionButton>
          <ActionButton variant="primary" onClick={() => navigate('/admin/dental-assets')}>
            לרשימת הנכסים
          </ActionButton>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KPICard
          label="סה״כ פניות"
          value={kpi(kpis?.total)}
          onClick={() => setFilters(HD_INQ_EMPTY_FILTERS)}
        />
        <KPICard
          label="חדשות"
          value={kpi(kpis?.fresh)}
          hint="ממתינות לטיפול"
          onClick={() => setFilters({ ...HD_INQ_EMPTY_FILTERS, status: 'new' })}
        />
        <KPICard label="בטיפול" value={kpi(kpis?.open)} hint="נפתחו ולא נסגרו" />
        <KPICard label="בשבוע האחרון" value={kpi(kpis?.lastWeek)} />
      </div>

      <Toolbar>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <SearchBar
            value={filters.search}
            onChange={(v) => {
              setFilters({ ...filters, search: v })
              setPage(1)
            }}
            placeholder="שם, טלפון, אימייל או קוד נכס"
          />
          <SelectFilter
            value={filters.status}
            onChange={(v) => {
              setFilters({ ...filters, status: v })
              setPage(1)
            }}
            options={asFilterOptions(HD_INQUIRY)}
            placeholder="כל הסטטוסים"
          />
          {hasFilter && (
            <ActionButton
              variant="secondary"
              onClick={() => {
                setFilters(HD_INQ_EMPTY_FILTERS)
                setPage(1)
              }}
            >
              ניקוי סינון
            </ActionButton>
          )}
        </div>
      </Toolbar>

      <AdminTable<DentalInquiryRow>
        columns={columns}
        data={rows}
        keyField="id"
        isLoading={isLoading}
        error={error ? 'טעינת הפניות נכשלה. נסו לרענן.' : undefined}
        hasActiveFilter={hasFilter}
        emptyMessage="עדיין לא התקבלו פניות"
        noResultsMessage="לא נמצאו פניות בסינון הזה"
        minWidth="1180px"
        pagination={
          <AdminTablePagination
            page={page}
            pageSize={HD_INQ_PAGE_SIZE}
            total={data?.total ?? 0}
            onPageChange={setPage}
          />
        }
      />
    </Shell>
  )
}
