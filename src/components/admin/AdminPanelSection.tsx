import type { ReactNode } from 'react'

// בלוק אחיד לכל פאנל אדמין — כותרת, ריווח, border, radius וטיפוגרפיה קבועים.
// כל פאנל (צפייה/עריכה/יצירה, לכל ישות) משתמש באותו Section — לא לעצב מחדש לכל מסך.
interface AdminPanelSectionProps {
  title: string
  children: ReactNode
  /** פעולה קטנה בצד הכותרת (למשל "הוספה") */
  action?: ReactNode
  /** מצב ריק לבלוק (למשל "אין שפות מוגדרות") */
  isEmpty?: boolean
  emptyMessage?: string
}

export function AdminPanelSection({ title, children, action, isEmpty, emptyMessage = 'אין מידע' }: AdminPanelSectionProps) {
  return (
    <section className="mb-4 rounded-[16px] border border-[#E5E7EB] bg-white p-4 last:mb-0">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-[#2D2D2D]">{title}</h3>
        {action}
      </div>
      {isEmpty ? (
        <p className="py-2 text-[13px] text-[#9CA3AF]">{emptyMessage}</p>
      ) : (
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">{children}</div>
      )}
    </section>
  )
}
