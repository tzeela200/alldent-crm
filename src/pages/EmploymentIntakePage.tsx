/**
 * מסך "קליטה ומיון תעסוקתי" (INC-3119) — מרכז אדמין לקליטה, מיון ואיתור תעסוקתי.
 *
 * קולט טקסט חופשי או קובץ ממקורות שונים (WhatsApp, פייסבוק, CSV/XLSX, הדבקה),
 * מפרק להודעות, מסווג לפי כוונה (מחפש/ת עבודה / מגייס/ת / הצטרפות לקבוצה /
 * לא רלוונטי / לא ברור), מתאים מול Supabase (contact/accounts), ומציע פעולות
 * לאישור מפורש. אין כתיבה לליבה ללא אישור. אין שליחת הודעות בפועל — מחוץ לסקופ.
 *
 * שלד בלבד (שלב 1 בתוכנית INC-3119) — שאר השלבים ממלאים את שתי הלשוניות בהדרגה.
 */

import { useState } from 'react'
import { ScanSearch, Upload, ListChecks } from 'lucide-react'

import { Shell } from '@/components/layout/Shell'
import { IntakeUploadZone } from '@/components/employment-intake/IntakeUploadZone'
import { IntakeSummary } from '@/components/employment-intake/IntakeSummary'
import { IntakeFilters } from '@/components/employment-intake/IntakeFilters'
import { IntakeTable } from '@/components/employment-intake/IntakeTable'
import { IntakeRowEditor } from '@/components/employment-intake/IntakeRowEditor'
import { IntakePanel } from '@/components/employment-intake/IntakePanel'
import { BulkActionBar } from '@/components/employment-intake/BulkActionBar'
import { BulkPreviewDialog } from '@/components/employment-intake/BulkPreviewDialog'
import { BulkResultReport } from '@/components/employment-intake/BulkResultReport'
import type { BulkFamily, BulkRunReport } from '@/hooks/useEmploymentIntakeBulk'
import { SCREEN_TITLE, SCREEN_SUBTITLE, TAB_LABEL } from '@/lib/employment-intake/labels'
import {
  useEmploymentIntakeRows,
  EMPTY_FILTERS,
  hasActiveFilters,
  type EmploymentIntakeFilters,
  type RowWithAction,
} from '@/hooks/useEmploymentIntakeRows'

type Tab = 'intake' | 'results'

function TabButton({ active, onClick, icon: Icon, children }: {
  active: boolean
  onClick: () => void
  icon: typeof Upload
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-[14px] px-4 py-2.5 text-sm font-semibold transition-colors ${
        active
          ? 'bg-[#008080] text-white shadow-sm'
          : 'text-[#6B6B6B] hover:bg-[#F3F4F6]'
      }`}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  )
}

export default function EmploymentIntakePage() {
  const [tab, setTab] = useState<Tab>('intake')
  const [filters, setFilters] = useState<EmploymentIntakeFilters>(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [editingRow, setEditingRow] = useState<RowWithAction | null>(null)
  const [detailRow, setDetailRow] = useState<RowWithAction | null>(null)
  const [bulkFamily, setBulkFamily] = useState<BulkFamily | null>(null)
  const [bulkReport, setBulkReport] = useState<BulkRunReport | null>(null)
  // פעולה על שורה אחת רצה דרך אותו מנוע גורף (שלב 13) — ההיקף מוגבל
  // לשורה שנבחרה, והמנוע עצמו מרחיב אותה לכל ההופעות של אותה זהות.
  const [singleRowScope, setSingleRowScope] = useState<number[] | null>(null)

  const { data, isLoading } = useEmploymentIntakeRows(filters, page, sortDir)
  const rows = data?.rows ?? []
  const total = data?.total ?? 0
  const pageSize = data?.pageSize ?? 25

  function handleFiltersChange(next: EmploymentIntakeFilters) {
    setFilters(next)
    setPage(1)
  }

  function toggleSelectId(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]))
  }

  function toggleSelectAll() {
    const pageIds = rows.map((r) => String(r.id))
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id))
    setSelectedIds((prev) => (allSelected ? prev.filter((id) => !pageIds.includes(id)) : [...new Set([...prev, ...pageIds])]))
  }

  return (
    <Shell title={SCREEN_TITLE} subtitle={SCREEN_SUBTITLE} icon={ScanSearch}>
      <div className="flex items-center gap-1 rounded-[18px] border border-[#D9D9D9] bg-white p-1.5">
        <TabButton active={tab === 'intake'} onClick={() => setTab('intake')} icon={Upload}>
          {TAB_LABEL.intake}
        </TabButton>
        <TabButton active={tab === 'results'} onClick={() => setTab('results')} icon={ListChecks}>
          {TAB_LABEL.results}
        </TabButton>
      </div>

      {tab === 'intake' ? (
        <IntakeUploadZone onPipelineComplete={() => setTab('results')} />
      ) : (
        <div className="space-y-4">
          <IntakeSummary />
          <IntakeFilters filters={filters} onChange={handleFiltersChange} />
          <IntakeTable
            rows={rows}
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            isLoading={isLoading}
            hasActiveFilter={hasActiveFilters(filters)}
            sortDir={sortDir}
            onSort={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
            selectedIds={selectedIds}
            onSelectId={toggleSelectId}
            onSelectAll={toggleSelectAll}
            onEditRow={setEditingRow}
            onRowClick={setDetailRow}
            bulkActions={<BulkActionBar onOpen={setBulkFamily} />}
          />
        </div>
      )}

      <IntakeRowEditor row={editingRow} onClose={() => setEditingRow(null)} />
      <IntakePanel
        row={detailRow}
        onClose={() => setDetailRow(null)}
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
    </Shell>
  )
}
