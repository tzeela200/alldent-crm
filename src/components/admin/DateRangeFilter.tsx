/**
 * סינון לפי טווח תאריכים — עם קיצור ליום בודד.
 *
 * הבעיה שהוא פותר: כדי לראות מה קרה **בתאריך אחד** היה צריך להקליד את אותו
 * תאריך פעמיים, גם ב"מתאריך" וגם ב"עד תאריך". עכשיו בחירת תאריך אחד ממלאת
 * אוטומטית את השני, וכל עוד שניהם זהים מוצג "יום אחד" עם אפשרות לפתוח לטווח.
 *
 * רכיב משותף — אין לממש שדות תאריך מקומיים במסכים.
 */

import { CalendarRange, X } from 'lucide-react'

const INPUT_CLASS =
  'h-11 rounded-[14px] border border-[#D9D9D9] bg-white px-3 text-sm text-[#2D2D2D] outline-none transition-colors focus:border-[#008080]'

interface Props {
  /** yyyy-mm-dd */
  from: string
  to: string
  onChange: (next: { from: string; to: string }) => void
  fromLabel?: string
  toLabel?: string
}

export function DateRangeFilter({
  from, to, onChange, fromLabel = 'מתאריך', toLabel = 'עד תאריך',
}: Props) {
  const singleDay = !!from && from === to

  // בחירת צד אחד כשהשני ריק = יום בודד. זה המקרה השכיח, ולכן הוא ברירת המחדל.
  const setFrom = (value: string) => onChange({ from: value, to: to || value })
  const setTo = (value: string) => onChange({ from: from || value, to: value })

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-[#6B6B6B]">{singleDay ? 'תאריך' : fromLabel}</span>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={INPUT_CLASS} />
      </label>

      {!singleDay && (
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[#6B6B6B]">{toLabel}</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={INPUT_CLASS} />
        </label>
      )}

      {singleDay && (
        <button
          type="button"
          onClick={() => onChange({ from, to: '' })}
          title="פתיחת טווח תאריכים"
          className="inline-flex h-11 items-center gap-1.5 rounded-[14px] border border-[#D9D9D9] bg-white px-3 text-[13px] font-semibold text-[#008080] transition hover:bg-[#E6F3F3]"
        >
          <CalendarRange className="h-4 w-4" />
          יום אחד — למעבר לטווח
        </button>
      )}

      {(from || to) && (
        <button
          type="button"
          onClick={() => onChange({ from: '', to: '' })}
          title="ניקוי התאריכים"
          className="inline-flex h-11 items-center gap-1.5 rounded-[14px] border border-[#D9D9D9] bg-white px-3 text-[13px] text-[#6B6B6B] transition hover:bg-[#F3F4F6]"
        >
          <X className="h-4 w-4" />
          נקה תאריך
        </button>
      )}
    </div>
  )
}
