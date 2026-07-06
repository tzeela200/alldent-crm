import { useState, useRef, useLayoutEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

// תא "מספר רשומות מקושרות" אחיד — מציג מספר בלבד; Hover/לחיצה פותחים
// Preview קטן מעל הטבלה (Portal, לא נחתך). לא להכניס רשימת שמות ארוכה לתוך התא.
interface AdminCountPreviewProps {
  count: number
  /** תוכן ה-Preview (למשל רשימת שמות קצרה) — נטען lazily רק כשפתוח, אם צריך */
  renderPreview: () => ReactNode
  emptyLabel?: string
}

export function AdminCountPreview({ count, renderPreview, emptyLabel = '—' }: AdminCountPreviewProps) {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLButtonElement>(null)
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    setCoords({ top: rect.top - 8, left: rect.left })
  }, [open])

  if (count <= 0) return <span className="text-[#9CA3AF]">{emptyLabel}</span>

  return (
    <button
      ref={anchorRef}
      type="button"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      className="inline-flex items-center justify-center rounded-full bg-[#E6F3F3] px-2.5 py-0.5 text-[12px] font-bold text-[#008080] transition hover:bg-[#CCE9E9]"
    >
      {count}
      {open && createPortal(
        <div
          style={{ position: 'fixed', top: coords.top, left: coords.left, transform: 'translateY(-100%)' }}
          className="z-[9999] max-w-xs rounded-[12px] border border-[#D9D9D9] bg-white p-3 text-right text-[13px] text-[#2D2D2D] shadow-xl"
          dir="rtl"
        >
          {renderPreview()}
        </div>,
        document.body,
      )}
    </button>
  )
}
