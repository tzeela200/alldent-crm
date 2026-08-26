/**
 * INC-3130 · HOME DENT — רשימת הנכסים באדמין. /admin/dental-assets
 *
 * בנוי על הרכיבים המשותפים: Shell, Toolbar, KPICard, SearchBar,
 * SelectFilter, ActionButton, AdminTable, AdminTablePagination,
 * AdminActionsMenu, AdminBadge. אין כאן טבלה ידנית ואין עיצוב מקביל.
 *
 * שני סטטוסים נפרדים בכל שורה — מצב טיפול ומצב פרסום (§38). הם טקסט
 * ולא מזהה ממילון, ולכן AdminBadge ולא StatusBadge (ראו homeDentStatuses).
 */
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2 } from 'lucide-react'
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
import { AdminActionsMenu, type AdminActionMenuItem } from '@/components/admin/AdminActionsMenu'
import { AdminBadge } from '@/components/admin/AdminBadge'
import { formatDate } from '@/lib/timeAgo'
import {
  HD_ASSET_TYPE_LABELS,
  HD_OFFER_LABELS,
  HD_PUBLICATION,
  HD_WORKFLOW,
  asFilterOptions,
} from '@/lib/homeDentStatuses'
import {
  HD_EMPTY_FILTERS,
  HD_PAGE_SIZE,
  useDentalAssetKpis,
  useDentalAssetMutations,
  useDentalAssets,
  type DentalAssetFilters,
  type DentalAssetRow,
} from '@/hooks/useDentalAssets'

const FILTERS_KEY = 'alldent.homeDent.filters.v1'

function loadFilters(): DentalAssetFilters {
  try {
    const raw = localStorage.getItem(FILTERS_KEY)
    if (raw) return { ...HD_EMPTY_FILTERS, ...JSON.parse(raw) }
  } catch {
    /* localStorage חסום או פגום — נופלים לברירת המחדל, לא מפילים את המסך */
  }
  return HD_EMPTY_FILTERS
}

export default function AdminDentalAssetsPage() {
  const [filters, setFiltersState] = useState<DentalAssetFilters>(loadFilters)
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const setFilters = (next: DentalAssetFilters) => {
    setFiltersState(next)
    setPage(1)
    try {
      localStorage.setItem(FILTERS_KEY, JSON.stringify(next))
    } catch {
      /* אין טעם להפיל את המסך בגלל שמירת העדפה */
    }
  }

  const { data, isLoading, error, refetch } = useDentalAssets(filters, page, sortBy, sortDir)
  const { data: kpis } = useDentalAssetKpis()
  const navigate = useNavigate()
  const { publish, publishUpdate, unpublish } = useDentalAssetMutations()

  const rows = data?.rows ?? []
  const total = data?.total ?? 0
  const hasFilter = useMemo(
    () => Object.values(filters).some((v) => v !== ''),
    [filters],
  )

  function handleSort(key: string) {
    if (key === sortBy) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else {
      setSortBy(key)
      setSortDir('desc')
    }
    setPage(1)
  }

  async function run(label: string, fn: () => Promise<{ error: unknown }>) {
    const { error: e } = await fn()
    if (e) toast.error(`${label} נכשל: ${(e as Error).message}`)
    else toast.success(`${label} בוצע`)
  }

  function rowActions(row: DentalAssetRow): AdminActionMenuItem[] {
    const isPublished = row.publication_state === 'published'
    return [
      { key: 'open', label: 'פתיחת הנכס', onClick: () => navigate(`/admin/dental-assets/${row.asset_code}`) },
      {
        key: 'publish',
        label: isPublished ? 'פרסום עדכון' : 'פרסום',
        onClick: () =>
          run(isPublished ? 'פרסום עדכון' : 'פרסום', () =>
            isPublished ? publishUpdate(row.id) : publish(row.id),
          ),
        separatorBefore: true,
      },
      {
        key: 'unpublish',
        label: 'הסרה מהאתר',
        disabled: !isPublished,
        danger: true,
        onClick: () => run('הסרה', () => unpublish(row.id)),
      },
    ]
  }

  const columns: AdminColumn<DentalAssetRow>[] = [
    {
      key: 'asset_code',
      label: 'קוד',
      sortable: true,
      nowrap: true,
      render: (r) => <span className="font-mono text-[12px] font-semibold text-[#008080]">{r.asset_code}</span>,
    },
    {
      key: 'internal_title',
      label: 'כותרת עבודה',
      minWidth: '180px',
      render: (r) => r.internal_title || r.clinic_name || '—',
    },
    {
      key: 'asset_type',
      label: 'סוג נכס',
      nowrap: true,
      render: (r) => (r.asset_type ? HD_ASSET_TYPE_LABELS[r.asset_type] ?? r.asset_type : '—'),
    },
    { key: 'city_name', label: 'עיר', nowrap: true, render: (r) => r.city_name || '—' },
    {
      key: 'offer_types',
      label: 'סוגי עסקה',
      minWidth: '150px',
      render: (r) =>
        r.offer_types
          ? r.offer_types.split(',').map((t) => HD_OFFER_LABELS[t] ?? t).join(' · ')
          : '—',
    },
    {
      key: 'package_days',
      label: 'תקופה',
      nowrap: true,
      render: (r) => (r.package_days ? `${r.package_days} יום` : '—'),
    },
    {
      key: 'screening_selected',
      label: 'מיון',
      nowrap: true,
      render: (r) => (r.screening_selected ? 'כן' : 'לא'),
    },
    {
      key: 'created_at',
      label: 'הוגש',
      sortable: true,
      nowrap: true,
      render: (r) => formatDate(r.created_at),
    },
    {
      key: 'workflow_status',
      label: 'מצב טיפול',
      nowrap: true,
      render: (r) => {
        const s = HD_WORKFLOW[r.workflow_status]
        return <AdminBadge label={s?.label ?? r.workflow_status} variant={s?.variant} />
      },
    },
    {
      key: 'publication_state',
      label: 'מצב פרסום',
      nowrap: true,
      render: (r) => {
        const s = HD_PUBLICATION[r.publication_state]
        return <AdminBadge label={s?.label ?? r.publication_state} variant={s?.variant} />
      },
    },
    {
      key: 'first_published_at',
      label: 'פורסם',
      sortable: true,
      nowrap: true,
      render: (r) => (r.first_published_at ? formatDate(r.first_published_at) : '—'),
    },
    {
      key: 'ends_at',
      label: 'מסתיים',
      sortable: true,
      nowrap: true,
      render: (r) => (r.ends_at ? formatDate(r.ends_at) : '—'),
    },
    {
      key: 'days_remaining',
      label: 'נותרו',
      nowrap: true,
      render: (r) =>
        r.days_remaining == null ? (
          '—'
        ) : (
          <span
            className={`font-mono text-[12px] font-semibold ${
              r.days_remaining <= 30 ? 'text-[#B45309]' : 'text-[#2D2D2D]'
            }`}
          >
            {r.days_remaining}
          </span>
        ),
    },
    {
      key: 'total_inquiries',
      label: 'פניות',
      nowrap: true,
      render: (r) =>
        r.total_inquiries === 0 ? (
          '—'
        ) : (
          <span>
            {r.total_inquiries}
            {r.new_inquiries > 0 && (
              <span className="ms-1.5 text-[11px] font-bold text-[#B45309]">
                {r.new_inquiries} חדשות
              </span>
            )}
          </span>
        ),
    },
    {
      key: '_actions',
      label: '',
      width: '48px',
      render: (r) => <AdminActionsMenu items={rowActions(r)} ariaLabel={`פעולות ${r.asset_code}`} />,
    },
  ]

  const kpi = (v: number | undefined) => (error ? '—' : v == null ? '…' : v)

  return (
    <Shell
      title="נכסים דנטליים"
      subtitle="HOME DENT · ניהול פרסום נכסים"
      icon={Building2}
      actions={
        <>
          <ActionButton
            variant="secondary"
            onClick={() => navigate('/admin/dental-assets/inquiries')}
          >
            פניות
          </ActionButton>
          <ActionButton variant="secondary" onClick={() => refetch()}>
            רענון
          </ActionButton>
          <ActionButton
            variant="primary"
            onClick={() => toast.info('יצירת נכס ידנית — בחבילה הבאה')}
          >
            + נכס חדש
          </ActionButton>
        </>
      }
    >
      {/* KPI — לחיצה מסננת */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <KPICard label="סה״כ נכסים" value={kpi(kpis?.total)} onClick={() => setFilters(HD_EMPTY_FILTERS)} />
        <KPICard
          label="בטיפול"
          value={kpi(kpis?.inProgress)}
          hint="טרם פורסמו"
          onClick={() => setFilters({ ...HD_EMPTY_FILTERS, publication: 'draft' })}
        />
        <KPICard
          label="מפורסמים"
          value={kpi(kpis?.published)}
          hint="חיים באתר"
          onClick={() => setFilters({ ...HD_EMPTY_FILTERS, publication: 'published' })}
        />
        <KPICard label="פג בקרוב" value={kpi(kpis?.expiringSoon)} hint="פחות מ-30 יום" />
        <KPICard
          label="פניות חדשות"
          value={kpi(kpis?.newInquiries)}
          hint="ממתינות לטיפול"
          onClick={() => navigate('/admin/dental-assets/inquiries')}
        />
      </div>

      {/* פילטרים — נשמרים ל-localStorage */}
      <Toolbar>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <SearchBar
            value={filters.search}
            onChange={(v) => setFilters({ ...filters, search: v })}
            placeholder="קוד, כותרת, מרפאה או עיר"
          />
          <SelectFilter
            value={filters.workflow}
            onChange={(v) => setFilters({ ...filters, workflow: v })}
            options={asFilterOptions(HD_WORKFLOW)}
            placeholder="כל מצבי הטיפול"
          />
          <SelectFilter
            value={filters.publication}
            onChange={(v) => setFilters({ ...filters, publication: v })}
            options={asFilterOptions(HD_PUBLICATION)}
            placeholder="כל מצבי הפרסום"
          />
          <SelectFilter
            value={filters.packageDays}
            onChange={(v) => setFilters({ ...filters, packageDays: v })}
            options={[
              { value: '60', label: '60 יום' },
              { value: '90', label: '90 יום' },
            ]}
            placeholder="כל המסלולים"
          />
          <SelectFilter
            value={filters.screening}
            onChange={(v) => setFilters({ ...filters, screening: v })}
            options={[
              { value: 'yes', label: 'עם מיון' },
              { value: 'no', label: 'בלי מיון' },
            ]}
            placeholder="מיון וסינון"
          />
        </div>
        {hasFilter && (
          <button
            type="button"
            onClick={() => setFilters(HD_EMPTY_FILTERS)}
            className="mt-3 text-[13px] font-semibold text-[#008080] hover:underline"
          >
            ניקוי פילטרים
          </button>
        )}
      </Toolbar>

      <AdminTable<DentalAssetRow>
        columns={columns}
        data={rows}
        keyField="id"
        onRowClick={(row) => navigate(`/admin/dental-assets/${row.asset_code}`)}
        isLoading={isLoading}
        error={error ? 'טעינת הנכסים נכשלה. נסו לרענן.' : undefined}
        hasActiveFilter={hasFilter}
        emptyMessage="עדיין לא התקבלו נכסים"
        sortKey={sortBy}
        sortDir={sortDir}
        onSort={handleSort}
        minWidth="1280px"
        pagination={
          <AdminTablePagination
            page={page}
            pageSize={HD_PAGE_SIZE}
            total={total}
            onPageChange={setPage}
          />
        }
      />
    </Shell>
  )
}
