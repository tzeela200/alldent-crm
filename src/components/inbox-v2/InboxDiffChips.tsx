import { fieldLabel, isDecidableField } from '@/lib/inbox-v2-dicts'
import type { InboxV2Row } from '@/types/inbox-v2'

/**
 * תקציר הפערים של שורה, ישירות בתור (INC-3125).
 *
 * עד כאן התור אמר רק "מידע חדש: כן/לא". כדי לדעת *מה* שונה היה צריך
 * לפתוח כל שורה בנפרד — מה שהפך טריאז' של עשרות שורות לבלתי אפשרי.
 * כאן רואים את שמות השדות ואת סוג הפער לפני שנוגעים ברשומה.
 *
 * המקור הוא `suggested_updates` שנכתב ע"י `inbox_compute_diff` —
 * אותו מנוע שמזין את פאנל האישור, ולכן התור והפאנל לא יכולים לסתור.
 */

const STATUS_STYLE: Record<string, { cls: string; title: string }> = {
  complete: { cls: 'bg-[#E6F3F3] text-[#00696B]', title: 'השלמת מידע חסר' },
  diff: { cls: 'bg-[#FFFBEB] text-[#92400E]', title: 'פער — נדרשת בחירה' },
  unresolved: { cls: 'bg-[#FEF2F2] text-[#B42318]', title: 'מידע לא מזוהה' },
}

/** הסדר שבו הפערים מוצגים: קודם מה שחוסם, אחר כך מה שרק משלים. */
const ORDER: Record<string, number> = { diff: 0, unresolved: 1, complete: 2 }

interface Props {
  row: Pick<InboxV2Row, 'suggested_updates'>
  /** כמה להציג לפני "ועוד N" */
  max?: number
}

export function InboxDiffChips({ row, max = 3 }: Props) {
  const entries = Object.entries(row.suggested_updates ?? {})
    // מטא-דאטה של n8n (direction/reasons) אינה פער ואינה מוצגת
    .filter(([key]) => isDecidableField(key))
    .map(([key, v]) => ({
      key,
      status: String((v as { status?: unknown } | undefined)?.status ?? 'diff'),
    }))
    .sort((a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9))

  if (entries.length === 0) {
    return <span className="text-[12px] text-[#9CA3AF]">אין פערים</span>
  }

  const shown = entries.slice(0, max)
  const rest = entries.length - shown.length

  return (
    <div className="flex flex-wrap items-center gap-1">
      {shown.map(({ key, status }) => {
        const style = STATUS_STYLE[status] ?? STATUS_STYLE.diff
        return (
          <span
            key={key}
            title={style.title}
            className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${style.cls}`}
          >
            {fieldLabel(key)}
          </span>
        )
      })}
      {rest > 0 && <span className="text-[11px] text-[#9CA3AF]">ועוד {rest}</span>}
    </div>
  )
}
