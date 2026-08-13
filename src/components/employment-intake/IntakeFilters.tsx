/** לשונית "תוצאות" — סרגל מסננים (§3.4, §16.3 בטבלת הצירים). */

import { Toolbar, SearchBar, ActionButton } from '@/components/layout/Shell'
import { RoleSubRolePicker } from '@/components/ui/RoleSubRolePicker'
import { CityRegionPicker } from '@/components/ui/CityRegionPicker'
import { X } from 'lucide-react'
import type { ContentType } from '@/types/employment-intake'
import type { MatchStatus } from '@/types/employment-intake'
import { CONTENT_TYPE_LABEL, MATCH_STATUS_LABEL } from '@/lib/employment-intake/labels'
import { EMPTY_FILTERS, hasActiveFilters, type EmploymentIntakeFilters } from '@/hooks/useEmploymentIntakeRows'

const CONTENT_TYPE_OPTIONS: ContentType[] = ['job_seeker', 'recruiter', 'group_join', 'irrelevant', 'unclear', 'unclassified']
const MATCH_STATUS_OPTIONS: MatchStatus[] = ['contact_found', 'account_found', 'both_found', 'multiple', 'none', 'already_linked']

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
        <SearchBar value={filters.search} onChange={(v) => onChange({ ...filters, search: v })} placeholder="חיפוש בטקסט, שם, טלפון או מייל..." />

        <select
          value={filters.matchStatus}
          onChange={(e) => onChange({ ...filters, matchStatus: e.target.value as MatchStatus | '' })}
          className="h-11 rounded-[14px] border border-[#D9D9D9] bg-white px-3 text-sm outline-none focus:border-[#008080]"
        >
          <option value="">מצב התאמה — הכול</option>
          {MATCH_STATUS_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {MATCH_STATUS_LABEL[m]}
            </option>
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

        {hasActiveFilters(filters) && (
          <ActionButton variant="ghost" size="sm" icon={X} onClick={() => onChange(EMPTY_FILTERS)}>
            נקה מסננים
          </ActionButton>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
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
      </div>
    </Toolbar>
  )
}
