/**
 * ליבת פענוח שורות ייצוא WhatsApp — משותפת ל-whatsappExport.ts (קובץ) ול-
 * whatsappCopy.ts (טקסט מודבק). שני התבניות הנפוצות:
 *
 *   iOS:     [DD/MM/YYYY, HH:MM:SS] שם: הודעה
 *   Android: DD/MM/YYYY, HH:MM - שם: הודעה
 *
 * שורה שאינה מתחילה בחותמת זמן מצטרפת להודעה הקודמת (WhatsApp שובר הודעה
 * ארוכה לכמה שורות פיזיות בקובץ) — זהו איחוד ברמת "אותה הודעה", לא איחוד
 * הקשר בין הודעות נפרדות (זה תפקידו של מנוע ההקשר בשלב 3).
 * הודעת מערכת (הצטרפות/עזיבה/הצפנה) מזוהה בכך שאין בה "שם: " בתחילתה.
 */

import { normalizePhone } from '@/lib/normalizePhone'
import type { RawParsedMessage } from '@/types/employment-intake'

const LINE_PREFIX =
  /^\[?(\d{1,2})[./\-](\d{1,2})[./\-](\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp][Mm])?\]?\s*[-–]?\s*/

function toIso(day: number, month: number, year: number, hour: number, minute: number, second: number, ampm: string | null): string | null {
  // WhatsApp הישראלי מייצא DD/MM. אם "החודש" גדול מ-12 — כנראה MM/DD (ייצוא בלוקאל אחר).
  if (month > 12 && day <= 12) [day, month] = [month, day]
  if (year < 100) year += 2000
  let h = hour
  if (ampm) {
    const isPm = ampm.toLowerCase() === 'pm'
    if (isPm && h < 12) h += 12
    if (!isPm && h === 12) h = 0
  }
  const d = new Date(year, month - 1, day, h, minute, second)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

/** true אם המחרוזת נראית כמו מספר טלפון (שם התצוגה כשהשולח לא בפנקס הכתובות). */
function looksLikePhone(value: string): boolean {
  const digits = value.replace(/[^\d]/g, '')
  return digits.length >= 7 && /^[\d+\-\s()]+$/.test(value.trim())
}

/**
 * מפרק טקסט ייצוא/העתקה של WhatsApp לרשימת הודעות גולמיות.
 * מחזיר null אם הטקסט לא נראה כמו ייצוא WhatsApp כלל (אין אפילו שורה אחת
 * עם חותמת זמן תואמת) — כדי שהקורא יוכל ליפול חזרה לפרסור טקסט חופשי.
 */
export function parseWhatsappLines(rawText: string): RawParsedMessage[] | null {
  const lines = rawText.split(/\r?\n/)
  const messages: RawParsedMessage[] = []
  let seq = 0
  let matchedAny = false

  for (const line of lines) {
    const m = line.match(LINE_PREFIX)
    if (m) {
      matchedAny = true
      const [, dayS, monthS, yearS, hourS, minS, secS, ampm] = m
      const rest = line.slice(m[0].length)
      const sentAt = toIso(Number(dayS), Number(monthS), Number(yearS), Number(hourS), Number(minS), Number(secS ?? '0'), ampm ?? null)

      const colonIdx = rest.indexOf(': ')
      let senderName: string | null = null
      let text = rest
      if (colonIdx > -1 && colonIdx < 60) {
        senderName = rest.slice(0, colonIdx).trim()
        text = rest.slice(colonIdx + 2)
      }

      const senderPhone = senderName && looksLikePhone(senderName) ? normalizePhone(senderName) || null : null

      seq += 1
      messages.push({
        seq,
        text,
        senderName,
        senderPhone,
        sentAt,
        messageId: null,
      })
    } else if (messages.length > 0 && line.trim() !== '') {
      // שורת המשך פיזית של ההודעה הקודמת (לא הודעה חדשה)
      messages[messages.length - 1].text += '\n' + line
    }
    // שורה ריקה שאינה שייכת לאף הודעה — מדלגים, אין בה תוכן לאבד
  }

  if (!matchedAny) return null
  return messages
}
