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
