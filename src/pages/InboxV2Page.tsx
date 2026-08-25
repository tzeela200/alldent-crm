import { useState } from 'react'
import { Columns3, DatabaseZap, RefreshCw, Sparkles } from 'lucide-react'
import { Shell, KPICard, ActionButton } from '@/components/layout/Shell'
import { useInboxV2Rows, useInboxV2Batches, useInboxV2Stats, PAGE_SIZE } from '@/hooks/useInboxV2'
import { useInboxV2Matching } from '@/hooks/useInboxV2Matching'
import { PhoneCheckPanel } from '@/components/inbox-v2/PhoneCheckPanel'
import { GoogleSyncStatusCard } from '@/components/inbox-v2/GoogleSyncStatusCard'
import { ImportWizard } from '@/components/inbox-v2/ImportWizard'
import { InboxV2FiltersBar } from '@/components/inbox-v2/InboxV2Filters'
import {
  InboxV2Table,
  ALL_COLUMNS,
  DEFAULT_COLUMNS,
  INBOX_V2_COLUMNS_STORAGE_KEY,
} from '@/components/inbox-v2/InboxV2Table'
import { AdminTablePagination } from '@/components/admin/AdminTablePagination'
import { InboxV2QuickActions } from '@/components/inbox-v2/InboxV2QuickActions'
import { InboxV2RowDetail } from '@/components/inbox-v2/InboxV2RowDetail'
import { MergePanel } from '@/components/inbox-v2/MergePanel'
import { CreateFromLeadDialog } from '@/components/inbox-v2/CreateFromLeadDialog'
import { CreateAccountFromLeadDialog } from '@/components/inbox-v2/CreateAccountFromLeadDialog'
import { AIChatPanel } from '@/components/inbox-v2/AIChatPanel'
import type { MergeEntity } from '@/lib/inbox-v2-merge'
import type { InboxV2Filters } from '@/types/inbox-v2'

const ALL_COLUMN_KEYS = new Set(ALL_COLUMNS.map((c) => c.key))

/**
 * שלושת מצבי העבודה של המסך (INC-3125).
 * הופרדו כי הם עונים על שאלות שונות: מה הגיע ודורש הכרעה · מי כבר קיים
 * אצלנו · קליטת קובץ חדש. קודם הכול היה ערום זה על גבי זה במסך אחד.
 */
type InboxTab = 'queue' | 'phones' | 'import'

const TABS: { id: InboxTab; label: string }[] = [
  { id: 'queue', label: 'שינויים שהגיעו' },
  { id: 'phones', label: 'בדיקת מספרים' },
  { id: 'import', label: 'ייבוא קובץ' },
]

function loadStoredVisibleColumns(): string[] {
  try {
    const raw = localStorage.getItem(INBOX_V2_COLUMNS_STORAGE_KEY)
    if (!raw) return [...DEFAULT_COLUMNS]
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return [...DEFAULT_COLUMNS]
    const valid = parsed.filter((k) => typeof k === 'string' && ALL_COLUMN_KEYS.has(k))
    return valid.length ? valid : [...DEFAULT_COLUMNS]
  } catch {
    return [...DEFAULT_COLUMNS]
  }
}

export default function InboxV2Page() {
  // המסך נפתח כתור עבודה: רק מה שעדיין דורש הכרעה.
  // "קיים במערכת" (11) אינו ב-OPEN_STATUS_IDS ולכן מוסתר כברירת מחדל,
  // בדיוק כפי שהוגדר — ונשאר נגיש בכיבוי הסינון (INC-3125).
  const [filters, setFilters] = useState<InboxV2Filters>({ open_only: true })
  const [page, setPage] = useState(0)
  const [tab, setTab] = useState<InboxTab>('queue')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [detailLeadId, setDetailLeadId] = useState<number | null>(null)
  const [mergeLeadId, setMergeLeadId] = useState<number | null>(null)
  /** נשלח רק כשהאדמינית הכריעה במסלול match_conflict. */
  const [mergeEntity, setMergeEntity] = useState<MergeEntity | undefined>(undefined)
  const [createLeadId, setCreateLeadId] = useState<number | null>(null)
  const [createAccountLeadId, setCreateAccountLeadId] = useState<number | null>(null)
  const [showAiChat, setShowAiChat] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<string[]>(loadStoredVisibleColumns)

  const { data, isLoading, error } = useInboxV2Rows(filters, page)
  const { data: batches } = useInboxV2Batches()
  const { data: stats } = useInboxV2Stats()
  const { matchBatch, rematchOpenQueue } = useInboxV2Matching()

  // הייבוא עבר ל-ImportWizard, שמריץ את ההתאמה בעצמו אחרי האישור.
  // useInboxV2Upload (כתיבה מיידית ללא שער) אינו בשימוש יותר מהמסך הזה.
  const rows = data?.rows ?? []
  const total = data?.total ?? 0

  // `open_only` הוא ברירת המחדל של המסך ולא סינון שהמשתמשת בחרה — אילו נחשב
  // כאן, תור ריק באמת היה מציג "לא נמצאו תוצאות התואמות את הסינון" במקום
  // "אין רשומות", כלומר הודעה שגויה על מצב תקין (INC-3125).
  const hasActiveFilters = !!(
    filters.search ||
    filters.status?.length ||
    filters.source_type?.length ||
    filters.batch_id ||
    filters.role ||
    filters.confidence_min != null ||
    filters.has_new_info ||
    filters.date_from ||
    filters.date_to
  )

  const rematchBatchId = filters.batch_id ?? null

  const persistColumns = (next: string[]) => {
    setVisibleColumns(next)
    try {
      localStorage.setItem(INBOX_V2_COLUMNS_STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* ignore quota / privacy-mode */
    }
  }

  const toggleColumn = (key: string) =>
    persistColumns(
      visibleColumns.includes(key)
        ? visibleColumns.filter((k) => k !== key)
        : [...visibleColumns, key]
    )

  return (
    <Shell
      title="שינוי ויבוא רשומות"
      subtitle="קליטת מידע חדש והשלמת רשומות קיימות — אין עדכון ליבה ללא אישור"
      icon={DatabaseZap}
      actions={
        <div className="flex items-center gap-2">
          <GoogleSyncStatusCard />

          {/* n8n כותבת שורות עם סיווג משלה בלי להריץ את מנוע ההשוואה.
              הכפתור מסווג מחדש את התור לפי המנוע האמיתי (INC-3125). */}
          <ActionButton
            variant="secondary"
            icon={RefreshCw}
            onClick={() => rematchOpenQueue.mutate()}
            disabled={rematchOpenQueue.isPending}
          >
            {rematchOpenQueue.isPending ? 'מנתח...' : 'נתח מחדש את התור'}
          </ActionButton>

          <details className="relative">
            <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50">
              <Columns3 className="h-4 w-4" />
              בחירת עמודות
            </summary>
            <div className="absolute left-0 top-full z-30 mt-2 max-h-[70vh] w-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-md">
              <div className="mb-3 text-[13px] font-bold text-slate-900">בחירת עמודות</div>
              <button
                type="button"
                onClick={() => persistColumns([...DEFAULT_COLUMNS])}
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

          <span title="בקרוב">
            <ActionButton variant="secondary" icon={Sparkles} onClick={() => setShowAiChat(true)} disabled>
              צ׳אט AI
            </ActionButton>
          </span>
          {rematchBatchId && (
            <ActionButton
              variant="secondary"
              icon={RefreshCw}
              onClick={() => matchBatch.mutate(rematchBatchId)}
              disabled={matchBatch.isPending}
            >
              {matchBatch.isPending ? 'מנתח...' : 'הרץ התאמה מחדש'}
            </ActionButton>
          )}
        </div>
      }
    >
      {/* KPI Row — ספירה גלובלית אמיתית */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KPICard label="סה״כ רשומות" value={stats?.total ?? '—'} />
        <KPICard label="ממתינות להכרעה" value={stats?.open ?? '—'} />
        <KPICard label="קיימות במערכת" value={stats?.exists ?? '—'} />
        <KPICard label="עודכנו למאגר" value={stats?.merged ?? '—'} />
      </div>

      {/* מצבי עבודה */}
      <div className="flex flex-wrap items-center gap-1 rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-slate-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-xl px-4 py-2 text-[13px] font-semibold transition-colors ${
              tab === t.id
                ? 'bg-teal-600 text-white'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {t.label}
            {t.id === 'queue' && stats?.open ? (
              <span
                className={`ms-2 rounded-full px-1.5 py-0.5 text-[11px] ${
                  tab === t.id ? 'bg-white/20' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {stats.open}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === 'queue' && (
        <>
          {/* מצב עבודה מפורש. הרוב המוחלט של הרשומות כאן כבר טופלו
              (מוזג / קיים במערכת / התעלמות) ואין בהן שום פעולה נדרשת —
              ולכן ברירת המחדל היא "לטיפול", והמעבר להיסטוריה הוא בחירה
              מודעת ולא תוצאה של סינון שנוקה בטעות. */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-xl bg-slate-100 p-1">
              <button
                onClick={() => {
                  setFilters({ ...filters, open_only: true })
                  setPage(0)
                }}
                className={`rounded-lg px-4 py-1.5 text-[13px] font-semibold transition-colors ${
                  filters.open_only ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                לטיפול{stats?.open ? ` (${stats.open})` : ''}
              </button>
              <button
                onClick={() => {
                  setFilters({ ...filters, open_only: undefined })
                  setPage(0)
                }}
                className={`rounded-lg px-4 py-1.5 text-[13px] font-semibold transition-colors ${
                  !filters.open_only ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                הכול{stats?.total ? ` (${stats.total})` : ''}
              </button>
            </div>

            {!filters.open_only && (
              <span className="text-[12px] text-[#9CA3AF]">
                מוצגות גם רשומות שכבר טופלו — מוזגו, קיימות במערכת או שהוסתרו. אין בהן פעולה נדרשת.
              </span>
            )}
          </div>

          <InboxV2FiltersBar
            filters={filters}
            onChange={(f) => {
              setFilters(f)
              setPage(0)
            }}
            batches={batches ?? []}
          />

          {/* הטבלה מטפלת בעצמה במצבי טעינה/ריק/סינון + bulk + pagination */}
          <InboxV2Table
            rows={rows}
            visibleColumns={visibleColumns}
            isLoading={isLoading}
            error={error ? `טעינת הרשומות נכשלה: ${error.message}` : undefined}
            hasActiveFilter={hasActiveFilters}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            // §31 — לחיצה על השורה היא הפעולה הראשית ומובילה ישר למסך
            // ההחלטה. רשומה שהותאמה נפתחת בהשוואה; רשומה שלא נמצאה
            // נפתחת בפאנל הפרטים, שם נמצאים מסלולי היצירה.
            onRowClick={(id) => {
              const row = rows.find((r) => r.lead_id === id)
              if (row && (row.match_contact != null || row.match_account != null)) {
                setMergeEntity(undefined)
                setMergeLeadId(id)
              } else {
                setDetailLeadId(id)
              }
            }}
            onOpenDetail={setDetailLeadId}
            bulkActions={
              <InboxV2QuickActions
                selectedIds={selectedIds}
                onClearSelection={() => setSelectedIds([])}
              />
            }
            pagination={
              <AdminTablePagination
                page={page + 1}
                pageSize={PAGE_SIZE}
                total={total}
                onPageChange={(n) => setPage(n - 1)}
              />
            }
          />
        </>
      )}

      {tab === 'phones' && <PhoneCheckPanel />}

      {tab === 'import' && <ImportWizard />}

      {/* Slide-over / modals */}
      {detailLeadId != null && (
        <InboxV2RowDetail
          leadId={detailLeadId}
          onClose={() => setDetailLeadId(null)}
          onOpenMerge={(id, entity) => {
            setDetailLeadId(null)
            setMergeEntity(entity)
            setMergeLeadId(id)
          }}
          onOpenCreate={(id) => {
            setDetailLeadId(null)
            setCreateLeadId(id)
          }}
          onOpenCreateAccount={(id) => {
            setDetailLeadId(null)
            setCreateAccountLeadId(id)
          }}
        />
      )}

      {mergeLeadId != null && (
        <MergePanel
          leadId={mergeLeadId}
          forcedEntity={mergeEntity}
          onClose={() => {
            setMergeLeadId(null)
            setMergeEntity(undefined)
          }}
        />
      )}

      {createLeadId != null && (
        <CreateFromLeadDialog leadId={createLeadId} onClose={() => setCreateLeadId(null)} />
      )}

      {createAccountLeadId != null && (
        <CreateAccountFromLeadDialog
          leadId={createAccountLeadId}
          onClose={() => setCreateAccountLeadId(null)}
        />
      )}

      {showAiChat && <AIChatPanel onClose={() => setShowAiChat(false)} />}
    </Shell>
  )
}
