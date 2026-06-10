/**
 * נרמול טלפון ישראלי
 * מקבל כל פורמט ומחזיר 05XXXXXXXX (10 ספרות)
 */
export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return ''

  // הסרת כל תו שאינו ספרה
  let digits = phone.replace(/\D/g, '')

  // טיפול בקידומת 972
  if (digits.startsWith('972')) {
    digits = '0' + digits.slice(3)
  }

  // טיפול בקידומת +972
  if (digits.startsWith('0972')) {
    digits = '0' + digits.slice(4)
  }

  // אם לא מתחיל ב-0, הוסף
  if (digits.length === 9 && !digits.startsWith('0')) {
    digits = '0' + digits
  }

  return digits
}

/**
 * פורמט טלפון לתצוגה
 * 05XXXXXXXX → 05X-XXXXXXX
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return ''
  const norm = normalizePhone(phone)
  if (norm.length !== 10) return phone
  return `${norm.slice(0, 3)}-${norm.slice(3)}`
}

/**
 * יצירת לינק WhatsApp
 */
export function whatsappLink(phone: string | null | undefined): string {
  if (!phone) return ''
  const norm = normalizePhone(phone)
  if (!norm) return ''
  return `https://wa.me/972${norm.slice(1)}`
}
