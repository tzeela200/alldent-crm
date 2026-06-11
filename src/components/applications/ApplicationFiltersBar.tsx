import { useState } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { SearchBar, SelectFilter } from '@/components/layout/Shell'
import type { ApplicationFilters } from '@/types/applications'
import type { DictItem } from '@/types'

interface Props {
  filters: ApplicationFilters
  onChange: (f: ApplicationFilters) => void
  applicationStatuses: DictItem[]
  checkStatuses: DictItem[]
  sources: DictItem[]
  regions: DictItem[]
  roles: DictItem[]
}

export function ApplicationFiltersBar({
  filters,
  onChange,
  applicationStatuses,
  checkStatuses,
  sources,
  regions,
  roles,
}: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const set = (patch: Partial<ApplicationFilters>) => onChange({ ...filters, ...patch })

  const hasActive = !!(
    filters.search ||
    filters.application_status != null ||
    filters.check_status != null ||
    filters.source != null ||
    filters.job_region_id != null ||
    filters.job_role ||
    filters.date_from ||
    filters.date_to ||
    filters.cv_state === 'with' ||
    filters.cv_state === 'without' ||
    filters.is_manual ||
    filters.is_new_candidate ||
    filters.assigned_to ||
    filters.has_follow_up
  )

  return (
    <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      {/* Row 1 */}
      <div className="flex flex-wrap items-end gap-3">
        <SearchBar
          value={filters.search ?? ''}
          onChange={(v) => set({ search: v || undefined })}
          placeholder="חיפוש שם, טלפון, אימייל, קוד משרה, מעסיק..."
        />
        <SelectFilter
          value={filters.application_status != null ? String(filters.application_status) : ''}
          onChange={(v) => set({ application_status: v ? Number(v) : undefined })}
          options={applicationStatuses.map((s) => ({ value: String(s.id), label: s.name }))}
          placeholder="סטטוס הגשה"
        />
        <SelectFilter
          value={filters.check_status != null ? String(filters.check_status) : ''}
          onChange={(v) => set({ check_status: v ? Number(v) : undefined })}
          options={checkStatuses.map((s) => ({ value: String(s.id), label: s.name }))}
          placeholder="סטטוס בדיקה"
        />
        <SelectFilter
          value={filters.source != null ? String(filters.source) : ''}
          onChange={(v) => set({ source: v ? Number(v) : undefined })}
          options={sources.map((s) => ({ value: String(s.id), label: s.name }))}
          placeholder="מקור"
        />
        <SelectFilter
          value={filters.job_region_id != null ? String(filters.job_region_id) : ''}
          onChange={(v) => set({ job_region_id: v ? Number(v) : undefined })}
          options={regions.map((r) => ({ value: String(r.id), label: r.name }))}
          placeholder="אזור"
        />
        <SelectFilter
          value={filters.job_role ?? ''}
          onChange={(v) => set({ job_role: v || undefined })}
          options={roles.map((r) => ({ value: r.name, label: r.name }))}
          placeholder="תפקיד"
        />
        {hasActive && (
          <button
            onClick={() => onChange({})}
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

      {/* Row 2 — Advanced */}
      {showAdvanced && (
        <div className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-3">
          <SelectFilter
            value={filters.cv_state ?? ''}
            onChange={(v) =>
              set({ cv_state: (v as 'with' | 'without') || undefined })
            }
            options={[
              { value: 'with', label: 'עם קו"ח' },
              { value: 'without', label: 'ללא קו"ח' },
            ]}
            placeholder='מצב קו"ח'
          />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">מתאריך הגשה</label>
            <input
              type="date"
              value={filters.date_from ?? ''}
              onChange={(e) => set({ date_from: e.target.value || undefined })}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">עד תאריך הגשה</label>
            <input
              type="date"
              value={filters.date_to ?? ''}
              onChange={(e) => set({ date_to: e.target.value || undefined })}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">מוקצה ל</label>
            <input
              type="text"
              value={filters.assigned_to ?? ''}
              onChange={(e) => set({ assigned_to: e.target.value || undefined })}
              placeholder="שם / אימייל"
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500"
            />
          </div>
          <ToggleBtn
            active={!!filters.is_manual}
            onToggle={() => set({ is_manual: filters.is_manual ? undefined : true })}
            label="ידניות בלבד"
          />
          <ToggleBtn
            active={!!filters.is_new_candidate}
            onToggle={() => set({ is_new_candidate: filters.is_new_candidate ? undefined : true })}
            label="מועמדים חדשים"
          />
          <ToggleBtn
            active={!!filters.has_follow_up}
            onToggle={() => set({ has_follow_up: filters.has_follow_up ? undefined : true })}
            label="עם תאריך מעקב"
          />
        </div>
      )}
    </div>
  )
}

function ToggleBtn({
  active,
  onToggle,
  label,
}: {
  active: boolean
  onToggle: () => void
  label: string
}) {
  return (
    <button
      onClick={onToggle}
      className={`h-11 rounded-xl border px-4 text-sm font-medium transition-colors ${
        active
          ? 'border-teal-500 bg-teal-50 text-teal-700'
          : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
      }`}
    >
      {active ? `${label} ✓` : label}
    </button>
  )
}
