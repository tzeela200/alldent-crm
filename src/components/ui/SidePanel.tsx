import { type ReactNode, useEffect } from 'react'

interface SidePanelProps {
  open: boolean
  onClose: () => void
  header: ReactNode
  footer?: ReactNode
  children: ReactNode
  width?: string
}

export default function SidePanel({
  open,
  onClose,
  header,
  footer,
  children,
  width = 'max-w-[620px]',
}: SidePanelProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-start" dir="rtl">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[1px]" onClick={onClose} />
      <aside
        className={`relative z-10 flex h-full w-full ${width} flex-col overflow-hidden border-e border-[#D9D9D9] bg-white shadow-2xl`}
        style={{ animation: 'sidePanelIn 220ms cubic-bezier(0.22,1,0.36,1)' }}
      >
        <div className="shrink-0 border-b border-[#E5E7EB] bg-white">{header}</div>
        <div className="flex-1 overflow-y-auto bg-[#F8F9FA] p-5">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-[#E5E7EB] bg-white px-5 py-4">{footer}</div>
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
