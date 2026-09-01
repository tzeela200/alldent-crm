import { useEffect, useState } from 'react'
import { ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft } from 'lucide-react'

/**
 * פאג'ינציה אחידה לכל טבלאות האדמין.
 *
 * RTL: "הבא" מצביע שמאלה (עמוד גבוה יותר), "הקודם" ימינה — לפי כיוון קריאה טבעי.
 *
 * מעבר לחצים יש **קפיצה ישירה לעמוד**: כפתורי מספר לעמודים הסמוכים, קפיצה
 * לראשון/אחרון, ותיבת הקלדה לעמוד רחוק. בלי זה מעבר לעמוד 40 דרש 40 קליקים.
 */
interface AdminTablePaginationProps {
  /** 1-based */
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

const BTN =
  'inline-flex h-8 min-w-8 items-center justify-center rounded-[8px] border border-[#D9D9D9] px-2 text-[#6B6B6B] transition hover:bg-[#F3F4F6] disabled:cursor-not-allowed disabled:opacity-40'

/** עד 5 מספרי עמוד סביב העמוד הנוכחי, בלי לחרוג מהגבולות */
function pageWindow(page: number, totalPages: number): number[] {
  const span = 2
  let from = Math.max(1, page - span)
  let to = Math.min(totalPages, page + span)
  // שמירה על חלון קבוע גם בקצוות, כדי שהכפתורים לא "יקפצו"
  if (to - from < span * 2) {
    if (from === 1) to = Math.min(totalPages, from + span * 2)
    else if (to === totalPages) from = Math.max(1, to - span * 2)
  }
  const out: number[] = []
  for (let p = from; p <= to; p++) out.push(p)
  return out
}

export function AdminTablePagination({ page, pageSize, total, onPageChange }: AdminTablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  const [jump, setJump] = useState('')
  useEffect(() => { setJump('') }, [page])

  const go = (target: number) => {
    const clamped = Math.min(totalPages, Math.max(1, target))
    if (clamped !== page) onPageChange(clamped)
  }

  const submitJump = () => {
    const parsed = Number(jump)
    if (!jump.trim() || !Number.isFinite(parsed)) return
    go(Math.round(parsed))
    setJump('')
  }

  const windowPages = pageWindow(page, totalPages)

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 border-t border-[#D9D9D9] bg-white px-4 py-3 text-[13px] text-[#6B6B6B]"
      dir="rtl"
    >
      <span>
        מציג {from.toLocaleString('he-IL')}–{to.toLocaleString('he-IL')} מתוך {total.toLocaleString('he-IL')}
      </span>

      <div className="flex flex-wrap items-center gap-1">
        <button type="button" aria-label="לעמוד הראשון" title="לעמוד הראשון"
          disabled={page <= 1} onClick={() => go(1)} className={BTN}>
          <ChevronsRight className="h-4 w-4" />
        </button>
        <button type="button" aria-label="עמוד קודם" title="עמוד קודם"
          disabled={page <= 1} onClick={() => go(page - 1)} className={BTN}>
          <ChevronRight className="h-4 w-4" />
        </button>

        {windowPages[0] > 1 && <span className="px-1 text-[#9CA3AF]">…</span>}

        {windowPages.map((p) => (
          <button
            key={p} type="button" onClick={() => go(p)}
            aria-label={`עמוד ${p}`} aria-current={p === page ? 'page' : undefined}
            className={
              p === page
                ? 'inline-flex h-8 min-w-8 items-center justify-center rounded-[8px] border border-[#008080] bg-[#008080] px-2 font-semibold text-white'
                : BTN
            }
          >
            {p}
          </button>
        ))}

        {windowPages[windowPages.length - 1] < totalPages && <span className="px-1 text-[#9CA3AF]">…</span>}

        <button type="button" aria-label="עמוד הבא" title="עמוד הבא"
          disabled={page >= totalPages} onClick={() => go(page + 1)} className={BTN}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button type="button" aria-label="לעמוד האחרון" title="לעמוד האחרון"
          disabled={page >= totalPages} onClick={() => go(totalPages)} className={BTN}>
          <ChevronsLeft className="h-4 w-4" />
        </button>

        {/* קפיצה לעמוד רחוק — כשהחלון הסמוך לא מספיק */}
        {totalPages > windowPages.length && (
          <span className="mr-2 inline-flex items-center gap-1">
            <span className="text-[#6B6B6B]">מעבר לעמוד</span>
            <input
              type="number" min={1} max={totalPages} value={jump}
              onChange={(e) => setJump(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitJump() } }}
              placeholder={String(page)}
              aria-label="מספר עמוד"
              className="h-8 w-16 rounded-[8px] border border-[#D9D9D9] px-2 text-center text-[#2D2D2D] outline-none focus:border-[#008080]"
            />
            <button
              type="button" onClick={submitJump} disabled={!jump.trim()}
              className="inline-flex h-8 items-center rounded-[8px] border border-[#D9D9D9] px-2.5 font-semibold text-[#008080] transition hover:bg-[#E6F3F3] disabled:cursor-not-allowed disabled:opacity-40"
            >
              עבור
            </button>
          </span>
        )}

        <span className="mr-2 text-[#9CA3AF]">מתוך {totalPages.toLocaleString('he-IL')}</span>
      </div>
    </div>
  )
}
