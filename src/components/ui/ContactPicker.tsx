import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { normalizePhone } from '@/lib/normalizePhone'

export type ContactPickerResult = {
  contact_id: number
  full_name: string | null
  display_name: string | null
  phone: string | null
  phone_norm: string | null
}

interface ContactPickerProps {
  value: number | null
  onChange: (id: number | null, contact?: ContactPickerResult) => void
  label?: string
  placeholder?: string
}

function isPhoneInput(input: string) {
  return /^[\d\s\-+()]{2,}$/.test(input) && /\d{2,}/.test(input)
}

export function ContactPicker({ value, onChange, label, placeholder = 'חיפוש לפי שם או נייד...' }: ContactPickerProps) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<ContactPickerResult | null>(null)
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const { data: initialContact } = useQuery({
    queryKey: ['contact-by-id', value],
    queryFn: async () => {
      if (!value) return null
      const { data } = await supabase
        .from('contact')
        .select('contact_id, full_name, display_name, phone, phone_norm')
        .eq('contact_id', value)
        .maybeSingle()
      return data as ContactPickerResult | null
    },
    enabled: !!value && !selected,
    staleTime: 300_000,
  })

  useEffect(() => {
    if (initialContact && !selected) setSelected(initialContact)
  }, [initialContact])

  useEffect(() => {
    if (!value) setSelected(null)
  }, [value])

  const { data: results = [] } = useQuery({
    queryKey: ['contact-search', search],
    queryFn: async () => {
      if (search.length < 2) return []
      if (isPhoneInput(search)) {
        const normalized = normalizePhone(search)
        if (!normalized || normalized.length < 5) return []
        const { data } = await supabase
          .from('contact')
          .select('contact_id, full_name, display_name, phone, phone_norm')
          .eq('phone_norm', normalized)
          .limit(5)
        return (data ?? []) as ContactPickerResult[]
      }
      const { data } = await supabase
        .from('contact')
        .select('contact_id, full_name, display_name, phone, phone_norm')
        .ilike('full_name', `%${search}%`)
        .limit(10)
      return (data ?? []) as ContactPickerResult[]
    },
    enabled: search.length >= 2 && !selected,
    staleTime: 10_000,
  })

  const handleSelect = (contact: ContactPickerResult) => {
    setSelected(contact)
    setSearch('')
    setOpen(false)
    onChange(contact.contact_id, contact)
  }

  const handleClear = () => {
    setSelected(null)
    setSearch('')
    onChange(null)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const displayName = selected
    ? (selected.full_name || selected.display_name || `#${selected.contact_id}`)
    : null

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      {label && <span className="text-[13px] font-semibold text-[#6B6B6B]">{label}</span>}

      {selected ? (
        <div className="flex h-11 items-center gap-2 rounded-xl border border-[#008080] bg-[#E6F3F3] px-3">
          <span className="flex-1 truncate text-[14px] font-semibold text-[#008080]">{displayName}</span>
          {selected.phone && (
            <span className="shrink-0 text-[12px] text-[#6B6B6B]" dir="ltr">{selected.phone}</span>
          )}
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
            <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-[#D9D9D9] bg-white shadow-lg">
              {results.map(contact => (
                <button
                  key={contact.contact_id}
                  type="button"
                  onClick={() => handleSelect(contact)}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-right transition hover:bg-[#F3F4F6]"
                >
                  <span className="text-[14px] font-semibold text-[#2D2D2D]">
                    {contact.full_name || contact.display_name || `#${contact.contact_id}`}
                  </span>
                  {contact.phone && (
                    <span className="text-[12px] text-[#9CA3AF]" dir="ltr">{contact.phone}</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {open && search.length >= 2 && results.length === 0 && (
            <div className="absolute z-50 mt-1 w-full rounded-xl border border-[#D9D9D9] bg-white p-3 text-center text-[13px] text-[#9CA3AF] shadow-lg">
              לא נמצאו אנשי קשר
            </div>
          )}
        </div>
      )}
    </div>
  )
}
