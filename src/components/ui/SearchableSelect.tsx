import React, { useEffect, useMemo, useRef, useState } from 'react'

export type SearchableOption = { value: string; label: string }

interface SearchableSelectProps {
  value: string
  onChange: (value: string) => void
  options: SearchableOption[]
  placeholder: string
  emptyText?: string
}

// רשימה נפתחת עם חיפוש בהקלדה. התאמות שמתחילות באותיות שהוקלדו מופיעות ראשונות.
export function SearchableSelect({ value, onChange, options, placeholder, emptyText = 'לא נמצאו תוצאות' }: SearchableSelectProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = value ? options.find((opt) => opt.value === value) : null

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    const starts: SearchableOption[] = []
    const contains: SearchableOption[] = []
    options.forEach((opt) => {
      const label = opt.label.toLowerCase()
      if (label.startsWith(q)) starts.push(opt)
      else if (label.includes(q)) contains.push(opt)
    })
    return [...starts, ...contains]
  }, [options, query])

  useEffect(() => { setHighlighted(0) }, [query])
  useEffect(() => { if (!open) setQuery('') }, [open])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const select = (opt: SearchableOption) => {
    onChange(opt.value)
    setOpen(false)
  }

  const clear = () => {
    onChange('')
    setQuery('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') { setOpen(true); e.preventDefault() }
      return
    }
    if (e.key === 'ArrowDown') { setHighlighted((h) => Math.min(h + 1, filtered.length - 1)); e.preventDefault() }
    else if (e.key === 'ArrowUp') { setHighlighted((h) => Math.max(h - 1, 0)); e.preventDefault() }
    else if (e.key === 'Enter') { if (filtered[highlighted]) select(filtered[highlighted]); e.preventDefault() }
    else if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative w-full" dir="rtl">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          className="h-11 w-full rounded-[14px] border border-[#D9D9D9] bg-white px-3 text-right text-sm outline-none transition-colors focus:border-[#008080]"
          placeholder={open ? 'הקלד לחיפוש...' : (selected?.label ?? placeholder)}
          value={open ? query : (selected?.label ?? '')}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onKeyDown={handleKeyDown}
          readOnly={!open}
          style={{ cursor: open ? 'text' : 'pointer' }}
        />
        {selected && !open ? (
          <button type="button" onClick={clear} tabIndex={-1} aria-label="נקה בחירה" className="absolute left-2 top-1/2 -translate-y-1/2 text-lg leading-none text-[#9CA3AF] hover:text-[#6B6B6B]">×</button>
        ) : (
          !selected && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#9CA3AF]">▼</span>
        )}
      </div>

      {open && (
        <ul className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-[#D9D9D9] bg-white shadow-lg">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-right text-sm text-[#9CA3AF]">{emptyText}</li>
          ) : (
            filtered.map((opt, i) => (
              <li
                key={opt.value}
                className={`cursor-pointer px-3 py-2 text-right text-sm transition-colors ${i === highlighted ? 'bg-[#E6F2F2] text-[#008080]' : 'hover:bg-[#F9FAFB]'} ${opt.value === value ? 'font-semibold text-[#008080]' : ''}`}
                onMouseDown={() => select(opt)}
                onMouseEnter={() => setHighlighted(i)}
              >
                {opt.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
