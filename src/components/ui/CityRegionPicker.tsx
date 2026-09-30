import React, { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

type CityItem = { id: number; name: string; region_id?: number | null }
type RegionItem = { id: number; name: string }

function useCitiesAll() {
  return useQuery<CityItem[]>({
    queryKey: ['dict_cities-all'],
    queryFn: async () => {
      const PAGE = 1000
      const all: CityItem[] = []
      let from = 0
      while (true) {
        const { data, error } = await supabase
          .from('dict_cities')
          .select('id,name,region_id')
          .order('name')
          .range(from, from + PAGE - 1)
        if (error) throw error
        const batch = (data ?? []) as CityItem[]
        if (!batch.length) break
        all.push(...batch)
        if (batch.length < PAGE) break
        from += PAGE
      }
      return all
    },
    staleTime: 600_000,
  })
}

function useRegions() {
  return useQuery<RegionItem[]>({
    queryKey: ['dict_regions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_regions').select('id,name').order('name')
      if (error) throw error
      return (data ?? []) as RegionItem[]
    },
    staleTime: 600_000,
  })
}

// ── CityCombobox ──────────────────────────────────────────────────────────────
interface CityComboboxProps {
  cities: CityItem[]
  value: number | null
  onChange: (cityId: number | null, regionId: number | null) => void
  variant?: 'filter' | 'edit'
  label?: string
  placeholder?: string
}

export function CityCombobox({
  cities,
  value,
  onChange,
  variant = 'edit',
  label = 'עיר',
  placeholder = 'חיפוש עיר...',
}: CityComboboxProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const [highlighted, setHighlighted] = useState(0)

  const selected = value ? cities.find((c) => c.id === value) : null

  const filtered = query
    ? cities.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : cities

  useEffect(() => {
    setHighlighted(0)
  }, [query])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') { setOpen(true); e.preventDefault() }
      return
    }
    if (e.key === 'ArrowDown') {
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1))
      e.preventDefault()
    } else if (e.key === 'ArrowUp') {
      setHighlighted((h) => Math.max(h - 1, 0))
      e.preventDefault()
    } else if (e.key === 'Enter') {
      if (filtered[highlighted]) select(filtered[highlighted])
      e.preventDefault()
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  function select(city: CityItem) {
    onChange(city.id, city.region_id ?? null)
    setOpen(false)
    setQuery('')
  }

  function clear() {
    onChange(null, null)
    setQuery('')
    inputRef.current?.focus()
  }

  const inputClass =
    variant === 'filter'
      ? 'h-11 w-full rounded-[14px] border border-[#D9D9D9] bg-white px-3 text-sm outline-none transition-colors focus:border-[#008080] text-right pr-3'
      : 'h-10 w-full rounded-xl border border-[#D9D9D9] bg-white px-3 text-[13px] font-medium text-[#2D2D2D] outline-none focus:border-[#008080] text-right'

  const combobox = (
    <div ref={containerRef} className="relative w-full" dir="rtl">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          className={inputClass}
          placeholder={open ? placeholder : (selected?.name ?? placeholder)}
          value={open ? query : (selected?.name ?? '')}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onKeyDown={handleKeyDown}
          readOnly={!open}
          style={{ cursor: open ? 'text' : 'pointer' }}
        />
        {selected && !open && (
          <button
            type="button"
            onClick={clear}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B6B6B] text-lg leading-none"
            tabIndex={-1}
          >
            ×
          </button>
        )}
        {!selected && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] text-xs">▼</span>
        )}
      </div>

      {open && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-[#D9D9D9] bg-white shadow-lg"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-[#9CA3AF] text-right">לא נמצאה עיר</li>
          ) : (
            filtered.map((city, i) => (
              <li
                key={city.id}
                className={`cursor-pointer px-3 py-2 text-sm text-right transition-colors ${
                  i === highlighted ? 'bg-[#E6F2F2] text-[#008080]' : 'hover:bg-[#F9FAFB]'
                } ${city.id === value ? 'font-semibold text-[#008080]' : ''}`}
                onMouseDown={() => select(city)}
                onMouseEnter={() => setHighlighted(i)}
              >
                {city.name}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )

  if (variant === 'filter') return combobox

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-[#6B6B6B]">{label}</span>
      {combobox}
    </label>
  )
}

// ── CityRegionPicker ──────────────────────────────────────────────────────────
interface CityRegionPickerProps {
  cityId: number | null
  regionId: number | null
  onCityChange: (cityId: number | null) => void
  onRegionChange: (regionId: number | null) => void
  variant?: 'filter' | 'edit'
  cities?: CityItem[]
  regions?: RegionItem[]
  // אופציונלי, רק ל-variant="filter": קבוצות אזורים (למשל "כל הצפון") כאפשרות בתוך רשימת האזור.
  regionGroups?: { id: string; label: string; ids: number[] }[]
  regionGroupId?: string | null
  onRegionGroupChange?: (groupId: string | null) => void
}

export function CityRegionPicker({
  cityId,
  regionId,
  onCityChange,
  onRegionChange,
  variant = 'edit',
  cities: citiesProp,
  regions: regionsProp,
  regionGroups = [],
  regionGroupId = null,
  onRegionGroupChange,
}: CityRegionPickerProps) {
  const { data: citiesData = [] } = useCitiesAll()
  const { data: regionsData = [] } = useRegions()

  const cities = citiesProp ?? citiesData
  const regions = regionsProp ?? regionsData

  const activeGroup = regionGroupId ? regionGroups.find((g) => g.id === regionGroupId) ?? null : null

  const filteredCities = activeGroup
    ? cities.filter((c) => activeGroup.ids.includes(Number(c.region_id)))
    : regionId
      ? cities.filter((c) => Number(c.region_id) === Number(regionId))
      : cities

  function handleSelectChange(val: string) {
    if (val.startsWith('group:')) {
      const group = regionGroups.find((g) => g.id === val.slice(6))
      if (!group) return
      onRegionChange(null)
      onRegionGroupChange?.(group.id)
      if (cityId != null) {
        const current = cities.find((c) => c.id === cityId)
        if (!(current != null && group.ids.includes(Number(current.region_id)))) onCityChange(null)
      }
      return
    }
    onRegionGroupChange?.(null)
    handleRegionChange(val)
  }

  function handleRegionChange(val: string) {
    const id = val ? Number(val) : null
    onRegionChange(id)
    // Only clear the city if it no longer belongs to the newly chosen region —
    // a still-valid selection shouldn't be wiped just because the admin
    // re-picked (or corrected) the region.
    if (cityId != null) {
      const current = cities.find((c) => c.id === cityId)
      const stillValid = current != null && (id == null || Number(current.region_id) === id)
      if (!stillValid) onCityChange(null)
    }
  }

  function handleCityChange(newCityId: number | null, newRegionId: number | null) {
    onCityChange(newCityId)
    if (newRegionId && !regionId && !activeGroup) onRegionChange(newRegionId)
  }

  if (variant === 'filter') {
    return (
      <>
        <select
          value={activeGroup ? `group:${activeGroup.id}` : regionId != null ? String(regionId) : ''}
          onChange={(e) => handleSelectChange(e.target.value)}
          className="h-11 rounded-[14px] border border-[#D9D9D9] bg-white px-3 text-sm outline-none transition-colors focus:border-[#008080]"
          dir="rtl"
        >
          <option value="">אזור</option>
          {regionGroups.map((g) => (
            <option key={g.id} value={`group:${g.id}`}>{g.label}</option>
          ))}
          {regions.map((r) => (
            <option key={r.id} value={String(r.id)}>{r.name}</option>
          ))}
        </select>
        <CityCombobox
          cities={filteredCities}
          value={cityId}
          onChange={handleCityChange}
          variant="filter"
          placeholder="עיר"
        />
      </>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-[#6B6B6B]">אזור</span>
        <select
          dir="rtl"
          value={regionId != null ? String(regionId) : ''}
          onChange={(e) => handleRegionChange(e.target.value)}
          className="h-10 rounded-xl border border-[#D9D9D9] bg-white px-3 text-[13px] font-medium text-[#2D2D2D] outline-none focus:border-[#008080]"
        >
          <option value="">בחר</option>
          {regions.map((r) => (
            <option key={r.id} value={String(r.id)}>{r.name}</option>
          ))}
        </select>
      </label>
      <CityCombobox
        cities={filteredCities}
        value={cityId}
        onChange={handleCityChange}
        variant="edit"
        label="עיר"
        placeholder="הקלד עיר..."
      />
    </div>
  )
}
