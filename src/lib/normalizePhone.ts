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
 * יצירת לינק WhatsApp
 */
export function whatsappLink(phone: string | null | undefined): string {
  if (!phone) return ''
  const norm = normalizePhone(phone)
  if (!norm) return ''
  return `https://wa.me/${norm}`
}
