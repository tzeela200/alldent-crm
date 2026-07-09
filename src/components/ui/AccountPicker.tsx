import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export type AccountPickerResult = {
  account_id: number
  account_name: string | null
  bus_id: string | null
  phone: string | null
  region_id: number | null
  city_id: number | null
  address: string | null
}

const ACCOUNT_FIELDS = 'account_id, account_name, bus_id, phone, region_id, city_id, address'

interface AccountPickerProps {
  value: string | null
  onChange: (id: string | null, account?: AccountPickerResult) => void
  label?: string
  placeholder?: string
}

function isNumericInput(input: string) {
  return /^[\d\s\-+()]{2,}$/.test(input) && /\d{2,}/.test(input)
}

export function AccountPicker({ value, onChange, label, placeholder = 'חיפוש לפי שם ארגון, ח.פ או טלפון...' }: AccountPickerProps) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<AccountPickerResult | null>(null)
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // טעינת הארגון הנבחר לפי id (למשל כשמגיעים עם account_id ב-URL)
  const { data: initialAccount } = useQuery({
    queryKey: ['account-by-id', value],
    queryFn: async () => {
      if (!value) return null
      const { data } = await supabase.from('accounts').select(ACCOUNT_FIELDS).eq('account_id', value).maybeSingle()
      return data as AccountPickerResult | null
    },
    enabled: !!value && !selected,
    staleTime: 300_000,
  })

  useEffect(() => {
    if (initialAccount && !selected) {
      setSelected(initialAccount)
      onChange(String(initialAccount.account_id), initialAccount)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAccount])

  useEffect(() => {
    if (!value) setSelected(null)
  }, [value])

  const { data: results = [] } = useQuery({
    queryKey: ['account-search', search],
    queryFn: async () => {
      if (search.length < 2) return []
      const term = search.trim()
      const query = supabase.from('accounts').select(ACCOUNT_FIELDS)
      if (isNumericInput(term)) {
        const digits = term.replace(/\D/g, '')
        const { data } = await query.or(`bus_id.ilike.%${digits}%,phone.ilike.%${digits}%`).order('account_name').limit(10)
        return (data ?? []) as AccountPickerResult[]
      }
      const { data } = await query.ilike('account_name', `%${term}%`).order('account_name').limit(10)
      return (data ?? []) as AccountPickerResult[]
    },
    enabled: search.length >= 2 && !selected,
    staleTime: 10_000,
  })

  const handleSelect = (account: AccountPickerResult) => {
    setSelected(account)
    setSearch('')
    setOpen(false)
    onChange(String(account.account_id), account)
  }

  const handleClear = () => {
    setSelected(null)
    setSearch('')
    onChange(null)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const displayName = selected ? (selected.account_name || `#${selected.account_id}`) : null

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      {label && <span className="text-[13px] font-semibold text-[#6B6B6B]">{label}</span>}

      {selected ? (
        <div className="flex h-11 items-center gap-2 rounded-xl border border-[#008080] bg-[#E6F3F3] px-3">
          <span className="flex-1 truncate text-[14px] font-semibold text-[#008080]">{displayName}</span>
          {selected.bus_id && <span className="shrink-0 text-[12px] text-[#6B6B6B]" dir="ltr">{selected.bus_id}</span>}
          <button
            type="button"
            onClick={handleClear}
            className="shrink-0 rounded-full p-0.5 text-[#008080] transition hover:bg-[#008080] hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              ref={inputRef}
              type="text"
              dir="rtl"
              value={search}
              placeholder={placeholder}
              onChange={e => { setSearch(e.target.value); setOpen(true) }}
              onFocus={() => search.length >= 2 && setOpen(true)}
              className="h-11 w-full rounded-xl border border-[#D9D9D9] bg-white pr-9 pl-3 text-[14px] font-medium text-[#2D2D2D] outline-none transition focus:border-[#008080] focus:ring-2 focus:ring-[#E6F3F3]"
            />
          </div>

          {open && results.length > 0 && (
            <div className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-[#D9D9D9] bg-white shadow-lg">
              {results.map(account => (
                <button
                  key={account.account_id}
                  type="button"
                  onClick={() => handleSelect(account)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-right transition hover:bg-[#F3F4F6]"
                >
                  <span className="truncate text-[14px] font-semibold text-[#2D2D2D]">
                    {account.account_name || `#${account.account_id}`}
                  </span>
                  {account.bus_id && <span className="shrink-0 text-[12px] text-[#9CA3AF]" dir="ltr">{account.bus_id}</span>}
                </button>
              ))}
            </div>
          )}

          {open && search.length >= 2 && results.length === 0 && (
            <div className="absolute z-50 mt-1 w-full rounded-xl border border-[#D9D9D9] bg-white p-3 text-center text-[13px] text-[#9CA3AF] shadow-lg">
              לא נמצאו ארגונים
            </div>
          )}
        </div>
      )}
    </div>
  )
}
