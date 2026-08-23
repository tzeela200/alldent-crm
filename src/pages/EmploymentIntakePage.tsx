/**
 * מסך "איתור מחפשי עבודה ומגייסים" — Table First.
 * Supabase הוא SSOT; המסך מציג שדות עסקיים בלבד ומסתיר פרטי Parser/DB.
 */

import { useState } from 'react'
import { ChevronDown, ChevronUp, Columns3, MessageSquareText, RefreshCw, ScanSearch, Upload, X } from 'lucide-react'

import { Shell, ActionButton } from '@/components/layout/Shell'
import SidePanel from '@/components/ui/SidePanel'
import { IntakeUploadZone } from '@/components/employment-intake/IntakeUploadZone'
import { IntakeSummary } from '@/components/employment-intake/IntakeSummary'
import { IntakeFilters } from '@/components/employment-intake/IntakeFilters'
import {
  IntakeTable,
  ALL_COLUMNS,
  DEFAULT_COLUMNS,
  EMPLOYMENT_INTAKE_COLUMNS_STORAGE_KEY,
} from '@/components/employment-intake/IntakeTable'
import { IntakeSourceContext } from '@/components/employment-intake/IntakeSourceContext'
import { IntakeRowEditor } from '@/components/employment-intake/IntakeRowEditor'
import { IntakePanel } from '@/components/employment-intake/IntakePanel'
import { IntakeConfirmActionDialog } from '@/components/employment-intake/IntakeConfirmActionDialog'
import { BulkActionBar } from '@/components/employment-intake/BulkActionBar'
import { BulkPreviewDialog } from '@/components/employment-intake/BulkPreviewDialog'
import { BulkResultReport } from '@/components/employment-intake/BulkResultReport'
import { ReclassifyPreviewDialog } from '@/components/employment-intake/ReclassifyPreviewDialog'
import { ReclassifyResultReport } from '@/components/employment-intake/ReclassifyResultReport'
import type { BulkFamily, BulkRunReport } from '@/hooks/useEmploymentIntakeBulk'
import { useReclassifyEligibleCount, type ReclassifyScope, type ReclassifyRunReport } from '@/hooks/useEmploymentIntakeReclassify'
import { SCREEN_TITLE, SCREEN_SUBTITLE } from '@/lib/employment-intake/labels'
import {
  useEmploymentIntakeRows,
  EMPTY_FILTERS,
  hasActiveFilters,
  type EmploymentIntakeFilters,
  type EmploymentIntakeSortKey,
  type RowWithAction,
} from '@/hooks/useEmploymentIntakeRows'

const ALL_COLUMN_KEYS = new Set(ALL_COLUMNS.map((c) => c.key))

function loadStoredVisibleColumns(): string[] {
  try {
    const raw = localStorage.getItem(EMPLOYMENT_INTAKE_COLUMNS_STORAGE_KEY)
    if (!raw) return [...DEFAULT_COLUMNS]
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return [...DEFAULT_COLUMNS]
    const valid = parsed.filter((k) => typeof k === 'string' && ALL_COLUMN_KEYS.has(k as never))
    return valid.length ? valid : [...DEFAULT_COLUMNS]
  } catch {
    return [...DEFAULT_COLUMNS]
  }
}

export default function EmploymentIntakePage() {
  const [showUpload, setShowUpload] = useState(false)
  const [filters, setFilters] = useState<EmploymentIntakeFilters>(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<EmploymentIntakeSortKey>('source_published_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [visibleColumns, setVisibleColumns] = useState<string[]>(loadStoredVisibleColumns)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [sourceRow, setSourceRow] = useState<RowWithAction | null>(null)
  const [mobileSourceOpen, setMobileSourceOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<RowWithAction | null>(null)
  const [detailRow, setDetailRow] = useState<RowWithAction | null>(null)
  const [bulkFamily, setBulkFamily] = useState<BulkFamily | null>(null)
  const [bulkReport, setBulkReport] = useState<BulkRunReport | null>(null)
  const [singleRowScope, setSingleRowScope] = useState<number[] | null>(null)
  const [statusChangeRequest, setStatusChangeRequest] = useState<{ row: RowWithAction; statusId: number } | null>(null)
  const [reclassifyScope, setReclassifyScope] = useState<ReclassifyScope | null>(null)
  const [reclassifyReport, setReclassifyReport] = useState<ReclassifyRunReport | null>(null)

  const { data: reclassifyEligibleCount } = useReclassifyEligibleCount()
  const { data, isLoading, isError } = useEmploymentIntakeRows(filters, page, sortKey, sortDir)
  const rows = data?.rows ?? []
  const total = data?.total ?? 0
  const pageSize = data?.pageSize ?? 25

  function handleFiltersChange(next: EmploymentIntakeFilters) {
    setFilters(next)
    setPage(1)
  }

  function handleSort(key: string) {
    const nextKey = key as EmploymentIntakeSortKey
    if (nextKey === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(nextKey)
      setSortDir('asc')
    }
    setPage(1)
  }

  function persistColumns(next: string[]) {
    setVisibleColumns(next)
    try {
      localStorage.setItem(EMPLOYMENT_INTAKE_COLUMNS_STORAGE_KEY, JSON.stringify(next))
    } catch {
      // localStorage יכול להיות חסום במצב פרטיות; התצוגה עדיין עובדת לסשן הנוכחי.
    }
  }

  function toggleColumn(key: string) {
    const next = visibleColumns.includes(key)
      ? visibleColumns.filter((k) => k !== key)
      : [...visibleColumns, key]
    // תמיד משאירים לפחות עמודה אחת.
    if (next.length) persistColumns(next)
  }

  function toggleSelectId(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]))
  }

  function toggleSelectAll() {
    const pageIds = rows.map((r) => String(r.id))
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id))
    setSelectedIds((prev) => allSelected ? prev.filter((id) => !pageIds.includes(id)) : [...new Set([...prev, ...pageIds])])
  }

  return (
    <Shell
      title={SCREEN_TITLE}
      subtitle={SCREEN_SUBTITLE}
      icon={ScanSearch}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <details className="relative">
            <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-[12px] border border-[#D9D9D9] bg-white px-3 py-2 text-[13px] font-semibold text-[#2D2D2D] transition hover:bg-[#F9FAFB]">
              <Columns3 className="h-4 w-4 text-[#008080]" />
              בחירת עמודות
            </summary>
            <div className="absolute left-0 top-full z-40 mt-2 max-h-[70vh] w-80 overflow-y-auto rounded-[16px] border border-[#D9D9D9] bg-white p-3 shadow-lg">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[13px] font-bold">בחירת עמודות</span>
                <button type="button" onClick={() => persistColumns([...DEFAULT_COLUMNS])} className="text-[12px] font-semibold text-[#008080] hover:underline">
                  איפוס
                </button>
              </div>
              <div className="grid gap-1.5">
                {ALL_COLUMNS.map((column) => (
                  <label key={column.key} className="flex items-center justify-between rounded-[10px] border border-[#F3F4F6] px-3 py-2 text-[13px]">
                    <span>{column.label}</span>
                    <input
                      type="checkbox"
                      checked={visibleColumns.includes(column.key)}
                      onChange={() => toggleColumn(column.key)}
                      className="h-4 w-4 rounded border-[#D9D9D9] accent-[#008080]"
                    />
                  </label>
                ))}
              </div>
            </div>
          </details>

          <ActionButton variant="primary" icon={Upload} onClick={() => setShowUpload((v) => !v)}>
            {showUpload ? 'סגירת העלאה' : 'העלאת מקור חדש'}
          </ActionButton>
        </div>
      }
    >
      {showUpload && (
        <div className="space-y-2">
          <button type="button" onClick={() => setShowUpload(false)} className="flex items-center gap-1 text-[12px] font-semibold text-[#6B6B6B] hover:text-[#008080]">
            <ChevronUp className="h-4 w-4" /> הסתר אזור העלאה
          </button>
          <IntakeUploadZone onPipelineComplete={() => setShowUpload(false)} />
        </div>
      )}

      {!showUpload && (
        <button type="button" onClick={() => setShowUpload(true)} className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#6B6B6B] hover:text-[#008080]">
          <ChevronDown className="h-4 w-4" /> הצג אזור העלאה
        </button>
      )}

      {!!reclassifyEligibleCount && reclassifyEligibleCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[#F6D5A8] bg-[#FDF3E7] px-4 py-3">
          <span className="text-[13px] font-semibold text-[#8A5A1F]">
            {reclassifyEligibleCount} רשומות עדיין מסווגות לפי גרסה ישנה של הכללים.
          </span>
          <ActionButton size="sm" icon={RefreshCw} onClick={() => setReclassifyScope({ mode: 'all_eligible' })}>
            סווג מחדש את כולן
          </ActionButton>
        </div>
      )}

      <IntakeSummary />
      <IntakeFilters filters={filters} onChange={handleFiltersChange} />

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0">
          <IntakeTable
            rows={rows}
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            isLoading={isLoading}
            hasActiveFilter={hasActiveFilters(filters)}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            visibleColumns={visibleColumns}
            selectedIds={selectedIds}
            onSelectId={toggleSelectId}
            onSelectAll={toggleSelectAll}
            onRowClick={(row) => { setSourceRow(row); setMobileSourceOpen(true); setDetailRow(row) }}
            onOpenDetails={setDetailRow}
            onEditRow={setEditingRow}
            onRequestStatusChange={(row, statusId) => setStatusChangeRequest({ row, statusId })}
            bulkActions={
              <BulkActionBar
                onOpen={setBulkFamily}
                onReclassify={selectedIds.length > 0 ? () => setReclassifyScope({ mode: 'selected', ids: selectedIds.map(Number) }) : undefined}
              />
            }
          />
          {isError && <div className="mt-2 text-[12px] text-[#DC2626]">אירעה שגיאה בטעינת הנתונים. נסי לרענן את המסך.</div>}
        </div>
        <div className="hidden lg:block"><IntakeSourceContext selectedRow={sourceRow} /></div>
      </div>


      <div className="lg:hidden">
        <SidePanel
          open={mobileSourceOpen && sourceRow != null}
          onClose={() => setMobileSourceOpen(false)}
          width="max-w-[520px]"
          header={
            <div className="flex items-start justify-between gap-3 px-5 py-4">
              <div>
                <div className="flex items-center gap-2 text-[15px] font-bold text-[#2D2D2D]">
                  <MessageSquareText className="h-4 w-4 text-[#008080]" />
                  המקור והקשר השיחה
                </div>
                <p className="mt-1 text-[12px] text-[#6B6B6B]">ההודעה שבחרת מסומנת בצהוב בתוך הרצף המקורי.</p>
              </div>
              <button type="button" aria-label="סגירת מקור השיחה" onClick={() => setMobileSourceOpen(false)} className="rounded-full p-2 text-[#6B6B6B] hover:bg-[#F3F4F6]">
                <X className="h-4 w-4" />
              </button>
            </div>
          }
        >
          <IntakeSourceContext selectedRow={sourceRow} embedded />
        </SidePanel>
      </div>

      <IntakeConfirmActionDialog
        row={statusChangeRequest?.row ?? null}
        kind={statusChangeRequest ? 'lead_status' : null}
        overrideStatusId={statusChangeRequest?.statusId}
        onClose={() => setStatusChangeRequest(null)}
      />
      <IntakeRowEditor row={editingRow} onClose={() => setEditingRow(null)} />
      <IntakePanel
        row={detailRow}
        onClose={() => setDetailRow(null)}
        onEdit={(row) => {
          setDetailRow(null)
          setEditingRow(row)
        }}
        onMarkDetailsSent={(row) => {
          setSingleRowScope([row.id])
          setBulkFamily('details_sent')
        }}
      />
      <BulkPreviewDialog
        family={bulkFamily}
        selectedIds={singleRowScope ?? selectedIds.map(Number)}
        onClose={() => {
          setBulkFamily(null)
          setSingleRowScope(null)
        }}
        onDone={(report) => {
          setBulkReport(report)
          if (!singleRowScope) setSelectedIds([])
        }}
      />
      <BulkResultReport report={bulkReport} onClose={() => setBulkReport(null)} />
      <ReclassifyPreviewDialog
        scope={reclassifyScope}
        onClose={() => setReclassifyScope(null)}
        onDone={(report) => {
          setReclassifyReport(report)
          if (reclassifyScope?.mode === 'selected') setSelectedIds([])
        }}
      />
      <ReclassifyResultReport report={reclassifyReport} onClose={() => setReclassifyReport(null)} />
    </Shell>
  )
}
