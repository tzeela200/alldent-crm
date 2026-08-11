/**
 * Parser עבור טקסט חופשי שהודבק ידנית (לא ייצוא/העתקה של WhatsApp, לא טבלה).
 *
 * אין להניח שכל שורה היא הודעה נפרדת — זו טעות נפוצה שגורמת לפיצול שגוי
 * ולאובדן הקשר. במקום זאת: פסקאות המופרדות בשורה ריקה נחשבות יחידות מקור
 * נפרדות; טקסט ללא שום שורה ריקה נשאר יחידה אחת.
 * חיבור/פיצול נוסף לפי כוונה עסקית הוא תפקיד מנוע ההקשר (שלב 3), לא כאן.
 */

import type { RawParsedMessage } from '@/types/employment-intake'

export function parsePlainText(pastedText: string): RawParsedMessage[] {
  const blocks = pastedText
    .split(/\n\s*\n+/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0)

  if (blocks.length === 0) return []

  return blocks.map((text, i) => ({
    seq: i + 1,
    text,
    senderName: null,
    senderPhone: null,
    sentAt: null,
    messageId: null,
  }))
}
