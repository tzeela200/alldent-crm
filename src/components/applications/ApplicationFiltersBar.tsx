import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { SearchBar, SelectFilter } from '@/components/layout/Shell'
import { CityRegionPicker } from '@/components/ui/CityRegionPicker'
import type { ApplicationFilters } from '@/types/applications'
import {
  APPLICATION_ROLE_GROUPS,
  roleGroupNames,
  sameRoleNames,
} from '@/lib/applicationRoleGroups'
import type { DictItem } from '@/types'

// `regions` ו-`cities` הוסרו: הם הועברו כ-props ולא היו בשימוש —
// CityRegionPicker טוען את המילונים שלו בעצמו (מעומד).
interface Props {
  filters: ApplicationFilters
  onChange: (f: ApplicationFilters) => void
  applicationStatuses: DictItem[]
  checkStatuses: DictItem[]
  sources: DictItem[]
  roles: DictItem[]
  jobStatuses: DictItem[]
  workStatuses: DictItem[]
  availabilities: DictItem[]
}

export function ApplicationFiltersBar({
  filters,
  onChange,
  applicationStatuses,
  checkStatuses,
  sources,
  roles,
  jobStatuses,
  workStatuses,
  availabilities,
}: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  // החיפוש נמצא ב-queryKey, ולכן כל הקשה הפעילה שאילתת count: 'exact' מלאה
  // + שתי שאילתות העשרה. מקלידים מקומית ומשדרים אחרי 350ms (INC-3116).
  const [searchDraft, setSearchDraft] = useState(filters.search ?? '')
  const lastPushedSearch = useRef(filters.search ?? '')
  useEffect(() => {
    // סנכרון כשהסינון התחלף מבחוץ (ניקוי סינון, לחיצה על כרטיס KPI).
    if ((filters.search ?? '') !== lastPushedSearch.current) {
      lastPushedSearch.current = filters.search ?? ''
      setSearchDraft(filters.search ?? '')
    }
  }, [filters.search])
  useEffect(() => {
    if (searchDraft === lastPushedSearch.current) return
    const t = setTimeout(() => {
      lastPushedSearch.current = searchDraft
      set({ search: searchDraft || undefined })
    }, 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft])
  // מפתח עם ערך undefined נשאר באובייקט ו-Object.keys() ממשיך לספור אותו,
  // ולכן הדף "נדבק" על מסונן אחרי כל לחיצת צ׳יפ. מנקים אותם כאן (INC-3116).
  const set = (patch: Partial<ApplicationFilters>) => {
    const next = { ...filters, ...patch } as Record<string, unknown>
    for (const key of Object.keys(next)) {
      const v = next[key]
      if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0))
        delete next[key]
    }
    onChange(next as ApplicationFilters)
  }

  const hasActive = !!(
    filters.search ||
    filters.application_status != null ||
    filters.application_status_in?.length ||
    filters.check_status != null ||
    filters.source != null ||
    filters.job_region_id != null ||
    filters.job_city_id != null ||
    filters.job_role_names?.length ||
    filters.job_status != null ||
    filters.contact_work_status != null ||
    filters.contact_availability != null ||
    filters.in_db ||
    filters.date_from ||
    filters.date_to ||
    filters.cv_state === 'with' ||
    filters.cv_state === 'without' ||
    filters.is_manual ||
    filters.is_new_candidate ||
    filters.has_follow_up ||
    filters.active_apps_only ||
    filters.closed_apps_only ||
    filters.overdue_follow_up ||
    filters.account_name_search
  )

  return (
    <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      {/* Role chips */}
      <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-3">
        <button
          onClick={() => set({ job_role_names: undefined })}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            !filters.job_role_names?.length
              ? 'bg-teal-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          הכל
        </button>
        {APPLICATION_ROLE_GROUPS.map((group) => {
          // אותו helper שמחשב את ספירות ה-KPI, כדי שכרטיס וצ׳יפ לא יסתרו.
          const names = roleGroupNames(group, roles)
          // קבוצה שתפקידיה חסרים מהמילון החי הייתה מסננת על רשימה ריקה
          // ומחזירה כלום — מסתירים אותה במקום.
          if (!names.length) return null
          const active = sameRoleNames(filters.job_role_names, names)
          return (
            <button
              key={group.key}
              onClick={() => set({ job_role_names: active ? undefined : names })}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                active
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {group.label}
            </button>
          )
        })}
      </div>

      {/* Row 1 */}
      <div className="flex flex-wrap items-end gap-3">
        <SearchBar
          value={searchDraft}
          onChange={setSearchDraft}
          placeholder="חיפוש שם, טלפון, אימייל, קוד משרה..."
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
        {/* City + Region combined picker */}
        <div className="flex min-w-[260px] items-end gap-2">
          <CityRegionPicker
            variant="filter"
            cityId={filters.job_city_id ?? null}
            regionId={filters.job_region_id ?? null}
            onCityChange={(id) => set({ job_city_id: id ?? undefined })}
            onRegionChange={(id) => set({ job_region_id: id ?? undefined })}
          />
        </div>
        {/* Employer search */}
        <input
          type="text"
          value={filters.account_name_search ?? ''}
          onChange={(e) => set({ account_name_search: e.target.value || undefined })}
          placeholder="שם ארגון..."
          className="h-11 rounded-[14px] border border-[#D9D9D9] bg-white px-3 text-sm outline-none transition-colors focus:border-[#008080]"
          dir="rtl"
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
            value={filters.job_status != null ? String(filters.job_status) : ''}
            onChange={(v) => set({ job_status: v ? Number(v) : undefined })}
            options={jobStatuses.map((s) => ({ value: String(s.id), label: s.name }))}
            placeholder="סטטוס משרה"
          />
          <SelectFilter
            value={filters.contact_work_status != null ? String(filters.contact_work_status) : ''}
            onChange={(v) => set({ contact_work_status: v ? Number(v) : undefined })}
            options={workStatuses.map((s) => ({ value: String(s.id), label: s.name }))}
            placeholder="סטטוס תעסוקה"
          />
          <SelectFilter
            value={filters.contact_availability != null ? String(filters.contact_availability) : ''}
            onChange={(v) => set({ contact_availability: v ? Number(v) : undefined })}
            options={availabilities.map((s) => ({ value: String(s.id), label: s.name }))}
            placeholder="זמינות"
          />
          <SelectFilter
            value={filters.in_db ?? ''}
            onChange={(v) => set({ in_db: (v as 'existing' | 'new') || undefined })}
            options={[
              { value: 'existing', label: 'קיים במאגר' },
              { value: 'new', label: 'חדש למאגר' },
            ]}
            placeholder="מצב במאגר"
          />
          <SelectFilter
            value={filters.cv_state ?? ''}
            onChange={(v) => set({ cv_state: (v as 'with' | 'without') || undefined })}
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
          <ToggleBtn
            active={!!filters.is_manual}
            onToggle={() => set({ is_manual: filters.is_manual ? undefined : true })}
            label="ידניות בלבד"
          />
          <ToggleBtn
            active={!!filters.is_new_candidate}
            onToggle={() => set({ is_new_candidate: filters.is_new_candidate ? undefined : true })}
            label="חדש למאגר"
          />
          <ToggleBtn
            active={!!filters.has_follow_up}
            onToggle={() => set({ has_follow_up: filters.has_follow_up ? undefined : true })}
            label="עם תאריך פעולה הבאה"
          />
          <ToggleBtn
            active={!!filters.overdue_follow_up}
            onToggle={() => set({ overdue_follow_up: filters.overdue_follow_up ? undefined : true })}
            label="פעולה הבאה באיחור"
          />
          <ToggleBtn
            active={!!filters.active_apps_only}
            onToggle={() => set({ active_apps_only: filters.active_apps_only ? undefined : true, closed_apps_only: undefined })}
            label="הגשות פעילות בלבד"
          />
          <ToggleBtn
            active={!!filters.closed_apps_only}
            onToggle={() => set({ closed_apps_only: filters.closed_apps_only ? undefined : true, active_apps_only: undefined })}
            label="הגשות סגורות בלבד"
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
