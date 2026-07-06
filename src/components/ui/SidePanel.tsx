import { type ReactNode, useEffect, useState } from 'react'

interface SidePanelProps {
  open: boolean
  onClose: () => void
  header: ReactNode
  /** אזור סיכום (עד 4-5 נתונים מרכזיים) — בין ה-Header לתוכן הגליל. שדה חדש; ברירת מחדל לא מוצג. */
  summary?: ReactNode
  footer?: ReactNode
  children: ReactNode
  width?: string
  /** יש שינויים שלא נשמרו — Escape/backdrop יציגו אזהרה עקבית לפני סגירה, במקום לסגור ישר. */
  isDirty?: boolean
  /** טקסט אזהרת הסגירה (ברירת מחדל: הודעה כללית) */
  confirmCloseMessage?: string
}

export default function SidePanel({
  open,
  onClose,
  header,
  summary,
  footer,
  children,
  width = 'max-w-[620px]',
  isDirty = false,
  confirmCloseMessage = 'יש שינויים שלא נשמרו. לסגור בכל זאת?',
}: SidePanelProps) {
  const [confirmingClose, setConfirmingClose] = useState(false)

  const requestClose = () => {
    if (isDirty) {
      setConfirmingClose(true)
      return
    }
    onClose()
  }

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') requestClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isDirty])

  useEffect(() => {
    if (!open) setConfirmingClose(false)
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-start" dir="rtl">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[1px]" onClick={requestClose} />
      <aside
        className={`relative z-10 flex h-full w-full ${width} flex-col overflow-hidden border-e border-[#D9D9D9] bg-white shadow-2xl`}
        style={{ animation: 'sidePanelIn 220ms cubic-bezier(0.22,1,0.36,1)' }}
      >
        <div className="shrink-0 border-b border-[#E5E7EB] bg-white">{header}</div>
        {summary && <div className="shrink-0 border-b border-[#F3F4F6] bg-[#FAFAFA] px-5 py-3">{summary}</div>}
        <div className="flex-1 overflow-y-auto bg-[#F8F9FA] p-5">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-[#E5E7EB] bg-white px-5 py-4">{footer}</div>
        )}

        {confirmingClose && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/40 p-6">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-center shadow-xl">
              <p className="mb-4 text-[14px] font-semibold text-[#2D2D2D]">{confirmCloseMessage}</p>
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmingClose(false)}
                  className="rounded-full border border-[#D9D9D9] px-4 py-2 text-[13px] font-semibold text-[#2D2D2D] transition hover:bg-[#F3F4F6]"
                >
                  להישאר
                </button>
                <button
                  type="button"
                  onClick={() => { setConfirmingClose(false); onClose() }}
                  className="rounded-full bg-[#DC2626] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#B91C1C]"
                >
                  לסגור בלי לשמור
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>
      <style>{`
        @keyframes sidePanelIn {
          from { transform: translateX(-32px); opacity: 0; }
          to   { transform: translateX(0);     opacity: 1; }
        }
      `}</style>
    </div>
  )
}
