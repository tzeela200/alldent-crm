/**
 * בידוד רצפי מספרים ולטינית בתוך טקסט עברי.
 *
 * ⚠️ הבעיה: אלגוריתם הבידי של יוניקוד מסדר מחדש תווים ניטרליים (מקף,
 * נקודה, סוגריים, לוכסן) לפי כיוון הפסקה. בפסקה עברית, "85–89" עלול
 * להיות מוצג "89–85", ו-"(B.A)" עלול להישבר. זו לא תקלת פונט אלא
 * התנהגות תקנית — הפתרון היחיד הוא בידוד מפורש של הרצף.
 *
 * `unicode-bidi: isolate` מבודד את הרצף מהסביבה, ו-`dir="ltr"` קובע את
 * הסדר בתוכו. הסוגריים נשארים מחוץ לבידוד בכוונה: הם ניטרליים ושייכים
 * למשפט העברי, ולכן נכון שיתמרו לפי כיוונו.
 *
 * דוגמאות שעוברות נכון:
 *   "ממוצע 85–89"              → המספרים בסדר
 *   "תואר ראשון (B.A) בניהול"  → הלטינית בסדר
 *   "4 יח״ל אנגלית"            → הספרה במקומה
 */
import type { ReactNode } from 'react'

/** רצף של ספרות/לטינית, כולל פיסוק פנימי בלבד (לא בקצוות). */
const LTR_RUN = /[A-Za-z0-9](?:[A-Za-z0-9.\-–—/:,']*[A-Za-z0-9])?/g

export function Ltr({ children }: { children: ReactNode }) {
  return (
    <span dir="ltr" style={{ unicodeBidi: 'isolate' }}>
      {children}
    </span>
  )
}

/**
 * מחזיר את הטקסט כשרצפי המספרים והלטינית שבו מבודדים.
 * טקסט עברי טהור חוזר כמחרוזת אחת ללא עטיפה מיותרת.
 */
export function bidiSafe(text: string): ReactNode {
  if (!text) return text
  const parts: ReactNode[] = []
  let last = 0
  let i = 0

  for (const m of text.matchAll(LTR_RUN)) {
    const start = m.index ?? 0
    if (start > last) parts.push(text.slice(last, start))
    parts.push(<Ltr key={`ltr-${i++}`}>{m[0]}</Ltr>)
    last = start + m[0].length
  }

  if (!parts.length) return text
  if (last < text.length) parts.push(text.slice(last))
  return parts
}
