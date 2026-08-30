/** Search / Filters של שולחן העבודה. ערכים עסקיים בלבד. */

import { Toolbar, SearchBar, ActionButton } from '@/components/layout/Shell'
import { RoleSubRolePicker } from '@/components/ui/RoleSubRolePicker'
import { CityRegionPicker } from '@/components/ui/CityRegionPicker'
import { X } from 'lucide-react'
import type { ContentType } from '@/types/employment-intake'
import type { DatabaseState } from '@/lib/employment-intake/labels'
import { CONTENT_TYPE_LABEL, DATABASE_STATE_LABEL } from '@/lib/employment-intake/labels'
import { EMPTY_FILTERS, hasActiveFilters, type EmploymentIntakeFilters } from '@/hooks/useEmploymentIntakeRows'

const CONTENT_TYPE_OPTIONS: ContentType[] = ['job_seeker', 'recruiter', 'group_join', 'unclear', 'irrelevant', 'unclassified']
// google_sync_exception הוסר מהבחירה: מאז INC-3128 פורמט Google מסומן
// "קיים" ישירות, ולכן המצב הזה אינו מיוצר יותר ובחירה בו תמיד ריקה.
const DATABASE_STATE_OPTIONS: DatabaseState[] = ['existing', 'not_existing', 'needs_identification']

interface Props {
  filters: EmploymentIntakeFilters
  onChange: (next: EmploymentIntakeFilters) => void
}

export function IntakeFilters({ filters, onChange }: Props) {
  const toggleContentType = (ct: ContentType) => {
    const next = filters.contentTypes.includes(ct)
      ? filters.contentTypes.filter((c) => c !== ct)
      : [...filters.contentTypes, ct]
    onChange({ ...filters, contentTypes: next })
  }

  return (
    <Toolbar className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <SearchBar
          value={filters.search}
          onChange={(v) => onChange({ ...filters, search: v })}
          placeholder="חיפוש בהודעה, שולח, שם, נייד או מייל..."
        />

        <select
          value={filters.databaseState}
          onChange={(e) => onChange({ ...filters, databaseState: e.target.value as DatabaseState | '' })}
          className="h-11 rounded-[14px] border border-[#D9D9D9] bg-white px-3 text-sm outline-none focus:border-[#008080]"
        >
          <option value="">מצב במאגר — הכול</option>
          {DATABASE_STATE_OPTIONS.map((state) => (
            <option key={state} value={state}>{DATABASE_STATE_LABEL[state]}</option>
          ))}
        </select>

        <RoleSubRolePicker
          variant="filter"
          roleId={filters.roleId}
          subRoleIds={[]}
          onRoleChange={(id) => onChange({ ...filters, roleId: id })}
          onSubRoleChange={() => {}}
        />

        <CityRegionPicker
          variant="filter"
          cityId={filters.cityId}
          regionId={null}
          onCityChange={(id) => onChange({ ...filters, cityId: id })}
          onRegionChange={() => {}}
        />

        <label className="flex h-11 items-center gap-2 rounded-[14px] border border-[#D9D9D9] bg-white px-3 text-[13px] text-[#2D2D2D]">
          <input type="checkbox" checked={filters.needsReview} onChange={(e) => onChange({ ...filters, needsReview: e.target.checked })} className="h-4 w-4 accent-[#008080]" />
          דורש בדיקה
        </label>

        <label className="flex items-center gap-2 text-[12px] text-[#6B6B6B]">
          מתאריך
          <input type="date" value={filters.dateFrom} onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })} className="h-10 rounded-[10px] border border-[#D9D9D9] px-2" />
        </label>
        <label className="flex items-center gap-2 text-[12px] text-[#6B6B6B]">
          עד תאריך
          <input type="date" value={filters.dateTo} onChange={(e) => onChange({ ...filters, dateTo: e.target.value })} className="h-10 rounded-[10px] border border-[#D9D9D9] px-2" />
        </label>

        {hasActiveFilters(filters) && (
          <ActionButton variant="ghost" size="sm" icon={X} onClick={() => onChange(EMPTY_FILTERS)}>
            נקה מסננים
          </ActionButton>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {CONTENT_TYPE_OPTIONS.map((ct) => {
          const active = filters.contentTypes.includes(ct)
          return (
            <button
              key={ct}
              type="button"
              onClick={() => toggleContentType(ct)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                active ? 'border-[#008080] bg-[#E6F3F3] text-[#008080]' : 'border-[#D9D9D9] bg-white text-[#6B6B6B] hover:bg-[#F3F4F6]'
              }`}
            >
              {CONTENT_TYPE_LABEL[ct]}
            </button>
          )
        })}
        <label className="ms-auto flex items-center gap-2 text-[12px] text-[#6B6B6B]">
          <input
            type="checkbox"
            checked={!filters.hideSystemNoise}
            onChange={(e) => onChange({ ...filters, hideSystemNoise: !e.target.checked })}
            className="h-4 w-4 accent-[#008080]"
          />
          הצג גם הודעות מערכת לא רלוונטיות
        </label>
      </div>
    </Toolbar>
  )
}
