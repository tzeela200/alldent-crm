/**
 * נרמול טלפון ישראלי
 * מקבל כל פורמט ומחזיר 972XXXXXXXXX (12 ספרות) — תואם לפורמט ה-DB
 */
export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return ''

  let digits = phone.replace(/\D/g, '')

  // +972XXXXXXXXX or 0972XXXXXXXXX
  if (digits.startsWith('0972')) {
    digits = '972' + digits.slice(4)
  }

  // 05XXXXXXXXX → 972XXXXXXXXX
  if (digits.startsWith('05')) {
    digits = '972' + digits.slice(1)
  }

  // 5XXXXXXXX (9 ספרות ללא 0) → 9725XXXXXXXX
  if (digits.length === 9 && !digits.startsWith('972')) {
    digits = '972' + digits
  }

  return digits
}

/**
 * הודעת השגיאה האחידה לנייד לא תקין — זהה בכל טופס ציבורי.
 */
export const IL_MOBILE_ERROR =
  'מספר הנייד אינו תקין. יש להזין נייד ישראלי בן 10 ספרות (לדוגמה: 0501234567).'

/**
 * ולידציה + נרמול של נייד ישראלי — **פורט מדויק** של פונקציית ה-DB
 * `public.normalize_il_mobile_phone`. מחזיר `9725XXXXXXXX` או `null` אם פסול.
 *
 * בשונה מ-`normalizePhone` שלמעלה, שמנרמל "כמיטב יכולתו" ומחזיר מחרוזת גם
 * לקלט שבור — הפונקציה הזו **דוחה** קלט לא תקין. זו שצריך להשתמש בה כדי למנוע
 * שמירה של נייד פגום (INC-3116: הגשה נכנסה עם 11 ספרות ולא ניתן היה לאשר
 * אותה למאגר, כי `contact.phone_norm` הוא UNIQUE ומצפה ל-12 תווים).
 *
 * מקור-אמת יחיד: אין לשכפל את הלוגיקה הזו בקומפוננטה.
 */
export function normalizeIlMobile(raw: string | null | undefined): string | null {
  let digits = (raw ?? '').replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('9720')) digits = '972' + digits.slice(4)
  else if (digits.startsWith('972')) { /* כבר בפורמט בינלאומי */ }
  else if (digits.startsWith('05')) digits = '972' + digits.slice(1)
  else if (digits.startsWith('5')) digits = '972' + digits
  return /^9725\d{8}$/.test(digits) ? digits : null
}

/** נוחות: האם המחרוזת היא נייד ישראלי תקין. */
export function isValidIlMobile(raw: string | null | undefined): boolean {
  return normalizeIlMobile(raw) !== null
}

/**
 * פורמט טלפון לתצוגה
 * 972XXXXXXXXX → 05X-XXXXXXX
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return ''
  const norm = normalizePhone(phone)
  if (norm.length !== 12 || !norm.startsWith('972')) return phone
  const local = '0' + norm.slice(3) // 972XXXXXXXXX → 05XXXXXXXXX
  return `${local.slice(0, 3)}-${local.slice(3)}`
}

/**
 * ליבת-חיפוש לטלפון — מחזיר את רצף הספרות המשותף שמופיע ב-phone_norm (972XXXXXXXXX)
 * בכל פורמט קלט תקין, כך שחיפוש `phone_norm.ilike.%core%` יתפוס את כולם:
 *   0508951003 / 050-895-1003 / +972508951003 / 972508951003 / 508951003 → "508951003"
 * תומך גם בקלט חלקי (למשל "8951003"). מחזיר '' אם אין ספרות.
 * מקור-אמת יחיד — להשתמש בכל מסך שמחפש לפי טלפון (במקום normalizeDigits מקומי).
 */
export function phoneSearchTerm(input: string | null | undefined): string {
  if (!input) return ''
  let core = input.replace(/\D/g, '')
  if (!core) return ''
  if (core.startsWith('0972')) core = core.slice(4)
  else if (core.startsWith('972')) core = core.slice(3)
  else if (core.startsWith('0')) core = core.slice(1)
  return core
}

/**
 * מחזיר רק ספרות (לשימוש בהשוואות client-side: `phoneDigits(a).includes(phoneSearchTerm(q))`).
 */
export function phoneDigits(phone: string | null | undefined): string {
  return (phone ?? '').replace(/\D/g, '')
}

/**
 * יצירת לינק WhatsApp
 */
export function whatsappLink(phone: string | null | undefined): string {
  if (!phone) return ''
  const norm = normalizePhone(phone)
  if (!norm) return ''
  return `https://wa.me/${norm}`
}
