import { useState } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { SearchBar, SelectFilter } from '@/components/layout/Shell'
import { INBOX_STATUSES } from '@/lib/inbox-v2-dicts'
import { useInboxV2SourceTypes } from '@/hooks/useInboxV2SourceTypes'
import type { InboxV2Filters } from '@/types/inbox-v2'
import type { InboxImportBatch } from '@/types/inbox-v2'

interface Props {
  filters: InboxV2Filters
  onChange: (f: InboxV2Filters) => void
  batches: InboxImportBatch[]
}

export function InboxV2FiltersBar({ filters, onChange, batches }: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const { data: sourceTypes } = useInboxV2SourceTypes()

  const set = (patch: Partial<InboxV2Filters>) => onChange({ ...filters, ...patch })

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

  // מצב העבודה (לטיפול / הכול) נשמר. עד כאן "נקה סינון" איפס גם אותו,
  // והמשתמשת מצאה את עצמה מול 82 רשומות שרובן כבר טופלו בלי להבין למה.
  const reset = () => onChange({ open_only: filters.open_only })

  return (
    <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      {/* Row 1: primary filters */}
      <div className="flex flex-wrap items-end gap-3">
        <SearchBar
          value={filters.search ?? ''}
          onChange={(v) => set({ search: v || undefined })}
          placeholder="חיפוש שם / טלפון / אימייל / פייסבוק..."
        />

        <SelectFilter
          value={filters.status?.length === 1 ? String(filters.status[0]) : ''}
          onChange={(v) => set({ status: v ? [Number(v)] : undefined })}
          options={INBOX_STATUSES.map((s) => ({ value: String(s.id), label: s.name }))}
          placeholder="סטטוס"
        />

        <SelectFilter
          value={filters.source_type?.length === 1 ? String(filters.source_type[0]) : ''}
          onChange={(v) => set({ source_type: v ? [Number(v)] : undefined })}
          options={(sourceTypes ?? []).map((s) => ({ value: String(s.id), label: s.name }))}
          placeholder="סוג מקור"
        />

        <SelectFilter
          value={filters.batch_id ? String(filters.batch_id) : ''}
          onChange={(v) => set({ batch_id: v ? Number(v) : undefined })}
          options={batches.map((b) => ({
            value: String(b.batch_id),
            label: `${b.file_name ?? 'אצווה'} (${b.total_rows})`,
          }))}
          placeholder="אצווה"
        />


        {hasActiveFilters && (
          <button
            onClick={reset}
            className="flex h-11 items-center gap-1 rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-500 hover:bg-slate-50"
          >
            <X className="h-3 w-3" />
            נקה סינון
          </button>
        )}

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex h-11 items-center gap-1 rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-500 hover:bg-slate-50"
        >
          {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          סינון מתקדם
        </button>
      </div>

      {/* Row 2: advanced filters */}
      {showAdvanced && (
        <div className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">ביטחון מינ׳</label>
            <input
              type="number"
              min={0}
              max={99}
              value={filters.confidence_min ?? ''}
              onChange={(e) =>
                set({ confidence_min: e.target.value ? Number(e.target.value) : undefined })
              }
              className="h-11 w-20 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500"
              placeholder="0"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">ביטחון מקס׳</label>
            <input
              type="number"
              min={0}
              max={99}
              value={filters.confidence_max ?? ''}
              onChange={(e) =>
                set({ confidence_max: e.target.value ? Number(e.target.value) : undefined })
              }
              className="h-11 w-20 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500"
              placeholder="99"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">מידע חדש בלבד</label>
            <button
              onClick={() => set({ has_new_info: filters.has_new_info ? undefined : true })}
              className={`h-11 rounded-xl border px-4 text-sm font-medium transition-colors ${
                filters.has_new_info
                  ? 'border-teal-500 bg-teal-50 text-teal-700'
                  : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
              }`}
            >
              {filters.has_new_info ? 'פעיל ✓' : 'כבוי'}
            </button>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">מתאריך</label>
            <input
              type="date"
              value={filters.date_from ?? ''}
              onChange={(e) => set({ date_from: e.target.value || undefined })}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">עד תאריך</label>
            <input
              type="date"
              value={filters.date_to ?? ''}
              onChange={(e) => set({ date_to: e.target.value || undefined })}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500"
            />
          </div>
        </div>
      )}
    </div>
  )
}
