import React, { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { ChevronDown } from 'lucide-react'

type RoleItem = { id: number; name: string }
type SubRoleItem = { id: number; name: string; role_id: number | null }

function useRoles() {
  return useQuery<RoleItem[]>({
    queryKey: ['dict_roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_roles').select('id,name').order('id')
      if (error) throw error
      return (data ?? []) as RoleItem[]
    },
    staleTime: 600_000,
  })
}

function useSubRoles() {
  return useQuery<SubRoleItem[]>({
    queryKey: ['dict_sub_roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_sub_roles').select('id,name,role_id').order('id')
      if (error) throw error
      return (data ?? []) as SubRoleItem[]
    },
    staleTime: 600_000,
  })
}

// ── SubRoleMultiSelect ────────────────────────────────────────────────────────

interface SubRoleMultiSelectProps {
  subRoles: SubRoleItem[]
  values: number[]
  onChange: (ids: number[]) => void
  roleSelected: boolean
  variant: 'filter' | 'edit'
}

function SubRoleMultiSelect({ subRoles, values, onChange, roleSelected, variant }: SubRoleMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function toggle(id: number) {
    onChange(values.includes(id) ? values.filter((v) => v !== id) : [...values, id])
  }

  const selectedLabels = subRoles.filter((sr) => values.includes(sr.id)).map((sr) => sr.name)
  const placeholder = !roleSelected ? 'בחר תפקיד תחילה' : 'תת-תפקיד'

  if (variant === 'edit') {
    return (
      <div>
        {!roleSelected ? (
          <p className="text-[12px] text-[#9CA3AF] py-2">בחר תפקיד תחילה</p>
        ) : subRoles.length === 0 ? (
          <p className="text-[12px] text-[#9CA3AF] py-2">אין תתי-תפקיד לתפקיד זה</p>
        ) : (
          <div className="rounded-xl border border-[#D9D9D9] bg-white p-2 max-h-44 overflow-y-auto">
            {subRoles.map((sr) => {
              const checked = values.includes(sr.id)
              return (
                <label key={sr.id} className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-[13px] hover:bg-[#F3F4F6]" dir="rtl">
                  <span>{sr.name}</span>
                  <input type="checkbox" checked={checked} onChange={() => toggle(sr.id)} className="h-4 w-4 rounded border-[#D9D9D9] accent-[#008080]" />
                </label>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // variant === 'filter'
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => roleSelected && setOpen((o) => !o)}
        className={`flex h-11 w-full items-center justify-between rounded-[14px] border border-[#D9D9D9] bg-white px-3 text-sm outline-none transition-colors ${!roleSelected ? 'pointer-events-none opacity-50' : 'hover:bg-[#F9FAFB]'}`}
        dir="rtl"
      >
        <span className={selectedLabels.length ? 'truncate text-[#2D2D2D]' : 'truncate text-[#6B6B6B]'}>
          {selectedLabels.length ? selectedLabels.join(', ') : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-[#6B6B6B]" />
      </button>
      {open && roleSelected && (
        <div className="absolute right-0 top-full z-40 mt-1 max-h-64 w-full min-w-[220px] overflow-y-auto rounded-[18px] border border-[#D9D9D9] bg-white p-2 shadow-md">
          {subRoles.length === 0 ? (
            <div className="px-3 py-2 text-[13px] text-[#9CA3AF]">אין תתי-תפקיד</div>
          ) : (
            subRoles.map((sr) => (
              <label key={sr.id} className="flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-[13px] hover:bg-[#F3F4F6]" dir="rtl">
                <span>{sr.name}</span>
                <input type="checkbox" checked={values.includes(sr.id)} onChange={() => toggle(sr.id)} className="h-4 w-4 rounded border-[#D9D9D9] accent-[#008080]" />
              </label>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ── RoleSubRolePicker ─────────────────────────────────────────────────────────

export interface RoleSubRolePickerProps {
  roleId: number | null
  subRoleIds: number[]
  onRoleChange: (id: number | null) => void
  onSubRoleChange: (ids: number[]) => void
  variant?: 'filter' | 'edit'
  roles?: RoleItem[]
  subRoles?: SubRoleItem[]
}

export function RoleSubRolePicker({
  roleId,
  subRoleIds,
  onRoleChange,
  onSubRoleChange,
  variant = 'edit',
  roles: rolesProp,
  subRoles: subRolesProp,
}: RoleSubRolePickerProps) {
  const { data: rolesData = [] } = useRoles()
  const { data: subRolesData = [] } = useSubRoles()

  const roles = rolesProp ?? rolesData
  const allSubRoles = subRolesProp ?? subRolesData

  const filteredSubRoles = roleId
    ? allSubRoles.filter((sr) => Number(sr.role_id) === Number(roleId))
    : []

  function handleRoleChange(val: string) {
    const id = val ? Number(val) : null
    onRoleChange(id)
    onSubRoleChange([])
  }

  if (variant === 'filter') {
    return (
      <>
        <select
          value={roleId != null ? String(roleId) : ''}
          onChange={(e) => handleRoleChange(e.target.value)}
          className="h-11 rounded-[14px] border border-[#D9D9D9] bg-white px-3 text-sm outline-none transition-colors focus:border-[#008080]"
          dir="rtl"
        >
          <option value="">תפקיד</option>
          {roles.map((r) => (
            <option key={r.id} value={String(r.id)}>{r.name}</option>
          ))}
        </select>
        <SubRoleMultiSelect
          subRoles={filteredSubRoles}
          values={subRoleIds}
          onChange={onSubRoleChange}
          roleSelected={!!roleId}
          variant="filter"
        />
      </>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-[#6B6B6B]">תפקיד</span>
        <select
          dir="rtl"
          value={roleId != null ? String(roleId) : ''}
          onChange={(e) => handleRoleChange(e.target.value)}
          className="h-10 rounded-xl border border-[#D9D9D9] bg-white px-3 text-[13px] font-medium text-[#2D2D2D] outline-none focus:border-[#008080]"
        >
          <option value="">בחר</option>
          {roles.map((r) => (
            <option key={r.id} value={String(r.id)}>{r.name}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-[#6B6B6B]">תת-תפקיד</span>
        <SubRoleMultiSelect
          subRoles={filteredSubRoles}
          values={subRoleIds}
          onChange={onSubRoleChange}
          roleSelected={!!roleId}
          variant="edit"
        />
      </label>
    </div>
  )
}
