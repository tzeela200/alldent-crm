/**
 * §12.1 + §12.4 — שכבת השגיאות של המסך.
 *
 * הכלל: **לעולם לא מוצגת למשתמשת הודעת שגיאה גולמית של Supabase, של
 * Postgres או של הדפדפן.** הודעות כאלה הן באנגלית וכוללות שמות עמודות
 * ואילוצים — טקסט שאינו קריא ואינו מסייע.
 *
 * כל שגיאה מתורגמת לעברית לפי ארבעת המרכיבים של §12.4:
 * מה לא הצליח · באיזו פעולה · מדוע (ככל שניתן לדעת) · מה לעשות עכשיו.
 * הפירוט הטכני נשמר ב-`technical` ונרשם ל-Console לצורכי בדיקה בלבד.
 */

/** שגיאה שכבר תורגמה לעברית ובטוחה להצגה. */
export class IntakeError extends Error {
  readonly hebrew: string
  readonly technical: string

  constructor(hebrew: string, technical: string) {
    super(hebrew)
    this.name = 'IntakeError'
    this.hebrew = hebrew
    this.technical = technical
  }
}

interface SupabaseLikeError {
  message?: string
  code?: string
  details?: string | null
  hint?: string | null
}

/** האם המחרוזת מכילה עברית — הודעות שכתבנו בעצמנו בטוחות להצגה. */
function hasHebrew(text: string): boolean {
  return /[֐-׿]/.test(text)
}

/**
 * מתרגם את *סיבת* הכשל לעברית לפי קוד השגיאה של Postgres.
 * מחזיר מחרוזת ריקה כשאין תרגום ידוע — ואז מוצגת הנחיה כללית בלבד,
 * ולעולם לא הטקסט האנגלי המקורי.
 */
function translateCause(error: SupabaseLikeError | null | undefined): string {
  if (!error) return ''
  const code = error.code ?? ''
  const raw = error.message ?? ''

  // טריגרים של הפרויקט זורקים חריגה מפורשת (P0001). כשההודעה בעברית —
  // היא נכתבה אצלנו ומסבירה בדיוק מה קרה, ולכן מוצגת כמו שהיא.
  if (hasHebrew(raw)) return raw

  switch (code) {
    case '23505':
      return 'הרשומה כבר קיימת במערכת'
    case '23502':
      return 'חסר ערך בשדה חובה'
    case '23503':
      return 'אחד הערכים שנבחרו אינו קיים במערכת'
    case '23514':
      return 'אחד הערכים אינו חוקי לפי כללי המערכת'
    case '22P02':
      return 'אחד הערכים אינו בפורמט הנכון'
    case '42501':
      return 'אין הרשאה לבצע את הפעולה'
    case 'PGRST116':
      return 'הרשומה לא נמצאה'
    case 'PGRST301':
      return 'ההתחברות פגה'
    default:
      break
  }

  // זיהוי לפי תוכן, כשאין קוד — הטריגר של הנייד הוא המקרה השכיח ביותר
  if (/phone/i.test(raw) && /(invalid|not.*mobile|exception)/i.test(raw)) {
    return 'מספר הטלפון אינו מספר נייד ישראלי תקין'
  }
  if (/duplicate key/i.test(raw)) return 'הרשומה כבר קיימת במערכת'
  if (/violates row-level security|permission denied/i.test(raw)) return 'אין הרשאה לבצע את הפעולה'
  if (/failed to fetch|networkerror|load failed/i.test(raw)) return 'אין חיבור לשרת'
  if (/jwt|token|unauthorized/i.test(raw)) return 'ההתחברות פגה'

  return ''
}

/** מה לעשות עכשיו — הרכיב הרביעי של §12.4, נגזר מהסיבה. */
function suggestion(cause: string): string {
  if (cause.includes('הרשאה')) return 'יש לפנות למנהל המערכת.'
  if (cause.includes('ההתחברות פגה')) return 'יש להתחבר מחדש ולנסות שוב.'
  if (cause.includes('אין חיבור לשרת')) return 'יש לבדוק את החיבור לאינטרנט ולנסות שוב.'
  if (cause.includes('כבר קיימת')) return 'יש לבדוק אם הרשומה כבר קיימת במאגר.'
  if (cause) return 'יש לתקן את הערך ולנסות שוב.'
  return 'יש לנסות שוב, ואם הבעיה חוזרת יש לפנות לתמיכה הטכנית.'
}

/**
 * בונה שגיאה בעברית מכשל של Supabase.
 * `context` הוא תיאור הפעולה בעברית, למשל "טעינת התוצאות נכשלה".
 */
export function supabaseError(context: string, error: SupabaseLikeError | null | undefined): IntakeError {
  const cause = translateCause(error)
  const hebrew = cause ? `${context}: ${cause}. ${suggestion(cause)}` : `${context}. ${suggestion('')}`
  const technical = [error?.code, error?.message, error?.details, error?.hint].filter(Boolean).join(' | ')
  // הפירוט הטכני נשאר ל-Console בלבד — לא מגיע למסך
  console.error(`[employment-intake] ${context}`, technical || error)
  return new IntakeError(hebrew, technical)
}

/**
 * מחזיר טקסט עברי בטוח להצגה מכל שגיאה שהיא — כולל שגיאות שלא עברו
 * דרך `supabaseError`. משמש בכל `toast.error` ובדוח הפעולה הגורפת.
 *
 * שגיאה באנגלית לעולם אינה מוחזרת: היא נרשמת ל-Console ובמקומה מוצגת
 * ההנחיה הכללית עם שם הפעולה.
 */
export function describeError(err: unknown, context: string): string {
  if (err instanceof IntakeError) return err.hebrew

  if (err instanceof Error) {
    // הודעות שכתבנו בעצמנו (פרסרים, ולידציות) הן בעברית ובטוחות
    if (hasHebrew(err.message)) return err.message
    const cause = translateCause({ message: err.message })
    console.error(`[employment-intake] ${context}`, err)
    return cause ? `${context}: ${cause}. ${suggestion(cause)}` : `${context}. ${suggestion('')}`
  }

  console.error(`[employment-intake] ${context}`, err)
  return `${context}. ${suggestion('')}`
}
