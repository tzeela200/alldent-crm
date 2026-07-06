import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { MoreHorizontal, Loader2 } from 'lucide-react'

// תפריט פעולות שורה אחיד — נפתח דרך Portal ל-document.body, אינו נחתך
// ב-overflow של הטבלה, ממוקם אוטומטית לפי מקום פנוי (flip כלפי מעלה/הצמדה
// לקצה), נסגר בלחיצה מחוץ לתפריט ובמקלדת (Escape). מחזור: RowActionsMenu
// שהיה משוכפל מקומית ב-AdminJobsPage.

export interface AdminActionMenuItem {
  key: string
  icon?: ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  /** מפריד מעל הפריט הזה */
  separatorBefore?: boolean
}

interface AdminActionsMenuProps {
  items: AdminActionMenuItem[]
  ariaLabel: string
  pending?: boolean
  width?: number
}

const MENU_HEIGHT_ESTIMATE = 320

export function AdminActionsMenu({ items, ariaLabel, pending, width = 192 }: AdminActionsMenuProps) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  const reposition = () => {
    const btn = buttonRef.current
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    // RTL: יישור לקצה השמאלי של הכפתור; הצמדה לקצה החלון אם חורג.
    let left = rect.left
    if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8
    if (left < 8) left = 8
    const openUp = rect.bottom + MENU_HEIGHT_ESTIMATE > window.innerHeight && rect.top > MENU_HEIGHT_ESTIMATE
    const top = openUp ? rect.top - 8 - Math.min(MENU_HEIGHT_ESTIMATE, rect.top - 8) : rect.bottom + 8
    setCoords({ top, left })
  }

  useLayoutEffect(() => {
    if (!open) return
    reposition()
    const onScroll = () => setOpen(false)
    const onResize = () => setOpen(false)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    window.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDocClick)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDocClick)
    }
  }, [open])

  const run = (fn: () => void) => { setOpen(false); fn() }

  return (
    <div className="flex justify-center">
      <button
        ref={buttonRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-[10px] border border-[#D9D9D9] bg-white text-[#6B6B6B] shadow-[3px_3px_6px_rgba(0,0,0,0.08)] transition-all hover:text-[#008080] hover:shadow-[1px_1px_3px_rgba(0,0,0,0.10)]"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-5 w-5" />}
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          dir="rtl"
          role="menu"
          style={{ position: 'fixed', top: coords.top, left: coords.left, width }}
          className="z-[9999] overflow-hidden rounded-[16px] border border-[#D9D9D9] bg-white p-1.5 text-right shadow-xl"
        >
          {items.map((item) => (
            <div key={item.key}>
              {item.separatorBefore && <div className="my-1 border-t border-[#F3F4F6]" />}
              <button
                type="button"
                role="menuitem"
                onClick={() => run(item.onClick)}
                disabled={item.disabled}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  item.danger ? 'text-[#991B1B] hover:bg-[#FEE2E2]' : 'text-[#2D2D2D] hover:bg-slate-100 hover:text-[#008080]'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </div>
  )
}
