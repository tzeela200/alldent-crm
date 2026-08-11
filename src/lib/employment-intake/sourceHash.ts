/**
 * חתימת ההודעה במקור — שחזור בצד הלקוח של `source_hash` שהמסד מחשב
 * כעמודת GENERATED (INC-3119, נספח א׳.2).
 *
 * למה זה נדרש: ל-`source_hash` יש אילוץ UNIQUE. ייצוא WhatsApp מכיל
 * הודעות מערכת זהות שחוזרות עם אותה חותמת זמן ("הגדרות הקבוצה השתנו
 * על ידי…" עשר פעמים באותה דקה). בלי דילוג מראש, 57 שורות כפולות
 * הפילו קליטה של 1,187 הודעות — הכול או כלום.
 *
 * הכלל: הפונקציה כאן חייבת להיות **לא יותר אגרסיבית** מהמסד. אם היא
 * תזהה כפילות שהמסד היה מקבל — נאבד מידע. אם תפספס כפילות — המסד יחסום
 * אותה בשקט דרך ON CONFLICT DO NOTHING. לכן היא מחקה את שלושת הענפים
 * של ה-DDL בדיוק, ובמקרה של ספק מחזירה מפתח ייחודי.
 */

export interface SourceHashInput {
  sourceType: number | null
  sourceName: string | null
  sourceMessageId: string | null
  sourcePublishedAt: string | null
  sourceSeq: number | null
  senderPhoneNorm: string | null
  senderName: string | null
  normalizedText: string
}

/**
 * מחזיר את המפתח הלוגי שעליו המסד אוכף ייחודיות.
 * שלושת הענפים זהים ל-DDL: מזהה חיצוני · חותמת זמן · מספר סידורי.
 */
export function sourceHashKey(input: SourceHashInput): string {
  const type = input.sourceType != null ? String(input.sourceType) : ''
  const name = input.sourceName ?? ''
  const sender = input.senderPhoneNorm ?? input.senderName ?? ''

  // (א) יש מזהה הודעה חיצוני — הוא הזהות, יחד עם המקור
  if (input.sourceMessageId) {
    return `${type}|${name}|mid|${input.sourceMessageId}`
  }

  // (ב) אין מזהה, יש מועד — מקור + זמן + שולח + טקסט
  if (input.sourcePublishedAt) {
    const ms = new Date(input.sourcePublishedAt).getTime()
    if (Number.isFinite(ms)) {
      return `${type}|${name}|ts|${Math.floor(ms / 1000)}|${sender}|${input.normalizedText}`
    }
  }

  // (ג) אין מזהה ואין מועד — נדרש מספר סידורי כדי ששתי שורות זהות לא ייעלמו
  return `${type}|${name}|seq|${input.sourceSeq ?? ''}|${sender}|${input.normalizedText}`
}

export interface DedupeResult<T> {
  /** השורות שיישלחו לכתיבה — אחת לכל חתימה */
  unique: T[]
  /** כמה שורות נמצאו ככפולות בתוך אותה אצווה */
  duplicateCount: number
}

/**
 * מסיר כפילויות בתוך אותה אצווה, ומשאיר את המופע הראשון של כל חתימה.
 * שומר על הסדר המקורי.
 */
export function dedupeBySourceHash<T>(rows: T[], keyOf: (row: T) => string): DedupeResult<T> {
  const seen = new Set<string>()
  const unique: T[] = []
  let duplicateCount = 0

  for (const row of rows) {
    const key = keyOf(row)
    if (seen.has(key)) {
      duplicateCount++
      continue
    }
    seen.add(key)
    unique.push(row)
  }

  return { unique, duplicateCount }
}
