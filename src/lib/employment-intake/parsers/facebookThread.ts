/**
 * Parser עבור טקסט שהועתק מפוסט/שרשור תגובות בפייסבוק.
 *
 * אין פורמט ייצוא רשמי ואחיד לפייסבוק (בשונה מ-WhatsApp) — הטקסט המודבק
 * תלוי כלי ההעתקה. הבסיס זהה ל-plainText.ts (פיצול לפי פסקאות מופרדות
 * בשורה ריקה), עם ניסיון זהיר בלבד לזהות "שם\nתגובה" בתחילת כל פסקה:
 * שורה ראשונה קצרה וללא סימני פיסוק של סוף-משפט. כשיש ספק — אין ניחוש,
 * והפסקה כולה נשמרת כטקסט בלי שולח מיוחס (§8.4: "אין להמציא שולח").
 * מקור עתידי מדויק יותר (Adapter חדש) לא יצטרך לגעת במנוע הסיווג/ההתאמה.
 */

import type { RawParsedMessage } from '@/types/employment-intake'

const NAME_LINE_MAX_LENGTH = 40
const SENTENCE_END = /[.!?:]\s*$/

function looksLikeNameLine(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed || trimmed.length > NAME_LINE_MAX_LENGTH) return false
  if (SENTENCE_END.test(trimmed)) return false
  // שם לא כולל בדרך כלל יותר מ-4 מילים
  return trimmed.split(/\s+/).length <= 4
}

export function parseFacebookThreadText(pastedText: string): RawParsedMessage[] {
  const blocks = pastedText
    .split(/\n\s*\n+/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0)

  return blocks.map((block, i) => {
    const lines = block.split(/\r?\n/)
    let senderName: string | null = null
    let text = block

    if (lines.length >= 2 && looksLikeNameLine(lines[0])) {
      senderName = lines[0].trim()
      text = lines.slice(1).join('\n').trim()
    }

    return {
      seq: i + 1,
      text: text || block,
      senderName,
      senderPhone: null,
      sentAt: null,
      messageId: null,
    }
  })
}
