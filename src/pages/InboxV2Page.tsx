import { useState, useMemo, useCallback } from 'react'
import { ChevronDown, ChevronUp, DatabaseZap, RefreshCw, Sparkles } from 'lucide-react'
import { Shell, KPICard, EmptyState, Pagination, ActionButton } from '@/components/layout/Shell'
import { useInboxV2Rows, useInboxV2Batches, PAGE_SIZE } from '@/hooks/useInboxV2'
import { useInboxV2Upload } from '@/hooks/useInboxV2Upload'
import { useInboxV2Matching } from '@/hooks/useInboxV2Matching'
import { UploadZone } from '@/components/inbox-v2/UploadZone'
import { InboxV2FiltersBar } from '@/components/inbox-v2/InboxV2Filters'
import { InboxV2Table } from '@/components/inbox-v2/InboxV2Table'
import { InboxV2QuickActions } from '@/components/inbox-v2/InboxV2QuickActions'
import { InboxV2RowDetail } from '@/components/inbox-v2/InboxV2RowDetail'
import { MergePanel } from '@/components/inbox-v2/MergePanel'
import { CreateFromLeadDialog } from '@/components/inbox-v2/CreateFromLeadDialog'
import { AIChatPanel } from '@/components/inbox-v2/AIChatPanel'
import type { InboxV2Filters } from '@/types/inbox-v2'

export default function InboxV2Page() {
  const [filters, setFilters] = useState<InboxV2Filters>({})
  const [page, setPage] = useState(0)
  const [showUpload, setShowUpload] = useState(true)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [detailLeadId, setDetailLeadId] = useState<number | null>(null)
  const [mergeLeadId, setMergeLeadId] = useState<number | null>(null)
  const [createLeadId, setCreateLeadId] = useState<number | null>(null)
  const [showAiChat, setShowAiChat] = useState(false)

  const { data, isLoading } = useInboxV2Rows(filters, page)
  const { data: batches } = useInboxV2Batches()
  const { matchBatch } = useInboxV2Matching()

  const handleBatchReady = useCallback(
    (batchId: number) => {
      matchBatch.mutate(batchId)
    },
    [matchBatch]
  )

  const { uploadFile, uploadPaste, isProcessing, progress, lastBatchId } =
    useInboxV2Upload(handleBatchReady)

  const rows = data?.rows ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const kpis = useMemo(() => {
    return {
      total,
      pending: rows.filter((r) => r.merge_status === 1 || r.merge_status === 2).length,
      matched: rows.filter((r) => r.merge_status === 3 || r.merge_status === 4).length,
      merged: rows.filter((r) => r.merge_status === 6).length,
    }
  }, [rows, total])

  return (
    <Shell
      title="מרכז טריאז' נתונים"
      subtitle="ייבוא, ניתוח והתאמת רשומות לפני מיזוג למאגר"
      icon={DatabaseZap}
      actions={
        <div className="flex items-center gap-2">
          <span title="בקרוב">
            <ActionButton
              variant="secondary"
              icon={Sparkles}
              onClick={() => setShowAiChat(true)}
              disabled
            >
              צ׳אט AI
            </ActionButton>
          </span>
          {lastBatchId && (
            <ActionButton
              variant="secondary"
              icon={RefreshCw}
              onClick={() => matchBatch.mutate(lastBatchId)}
              disabled={matchBatch.isPending}
            >
              {matchBatch.isPending ? 'מנתח...' : 'הרץ התאמה מחדש'}
            </ActionButton>
          )}
        </div>
      }
    >
      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KPICard label="סה״כ רשומות" value={kpis.total} />
        <KPICard label="ממתינות" value={kpis.pending} />
        <KPICard label="התאמות" value={kpis.matched} />
        <KPICard label="מוזגו" value={kpis.merged} />
      </div>

      {/* Upload Zone */}
      <div>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="mb-2 flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-teal-600"
        >
          {showUpload ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {showUpload ? 'הסתר אזור העלאה' : 'הצג אזור העלאה'}
        </button>
        {showUpload && (
          <UploadZone
            onFileSelected={uploadFile}
            onPasteSubmit={uploadPaste}
            isProcessing={isProcessing}
            progress={progress}
          />
        )}
      </div>

      {/* Filters */}
      <InboxV2FiltersBar
        filters={filters}
        onChange={(f) => {
          setFilters(f)
          setPage(0)
        }}
        batches={batches ?? []}
      />

      {/* Quick Actions */}
      {selectedIds.length > 0 && (
        <InboxV2QuickActions
          selectedIds={selectedIds}
          onClearSelection={() => setSelectedIds([])}
        />
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-teal-600" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={DatabaseZap}
          title="אין רשומות"
          description="העלו קובץ או הדביקו נתונים כדי להתחיל"
        />
      ) : (
        <>
          <InboxV2Table
            rows={rows}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onRowClick={setDetailLeadId}
          />
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={total}
          />
        </>
      )}

      {/* Slide-over panels */}
      {detailLeadId != null && (
        <InboxV2RowDetail
          leadId={detailLeadId}
          onClose={() => setDetailLeadId(null)}
          onOpenMerge={(id) => {
            setDetailLeadId(null)
            setMergeLeadId(id)
          }}
          onOpenCreate={(id) => {
            setDetailLeadId(null)
            setCreateLeadId(id)
          }}
        />
      )}

      {mergeLeadId != null && (
        <MergePanel leadId={mergeLeadId} onClose={() => setMergeLeadId(null)} />
      )}

      {createLeadId != null && (
        <CreateFromLeadDialog leadId={createLeadId} onClose={() => setCreateLeadId(null)} />
      )}

      {showAiChat && <AIChatPanel onClose={() => setShowAiChat(false)} />}
    </Shell>
  )
}
