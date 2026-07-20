/**
 * פרסור דוח תוצאות קמפיין מ-Fix Digital.
 *
 * כותרות הדוח: fullname, email, phone, process, status, sending_time, sending_status
 * זיהוי הקובץ לפי הכותרות בפועל ולא לפי שם הקובץ.
 *
 * שים לב: `status` (סטטוס הרשומה ב-CRM של Fix) ו-`sending_status` (סטטוס שליחת
 * ההודעה) הם שני שדות שונים ואסור לערבב ביניהם.
 */

import { parseExcelFile, parseCsvFile, detectFileType, type RawRow } from '@/lib/inbox-v2-parser'
import { normalizePhone } from '@/lib/normalizePhone'
import { mapDeliveryStatus, type DeliveryStatusCode } from './deliveryStatus'

export const CAMPAIGN_REQUIRED_HEADERS = ['phone', 'sending_status'] as const
const CAMPAIGN_KNOWN_HEADERS = [
  'fullname', 'email', 'phone', 'process', 'status', 'sending_time', 'sending_status',
]

export type MatchResult = 'matched_contact' | 'not_found' | 'invalid_phone' | 'missing_phone'

export interface ParsedCampaignRow {
  rowNumber: number
  fullNameRaw: string | null
  emailRaw: string | null
  phoneRaw: string | null
  phoneNorm: string | null
  fixProcessRaw: string | null
  fixStatusRaw: string | null
  sentAt: string | null
  deliveryStatusRaw: string | null
  deliveryStatus: DeliveryStatusCode
  matchResult: MatchResult
  contactId: number | null
  rawPayload: RawRow
}

/**
 * מפענח HTML entities שמגיעים מ-Fix (למשל `מריה צ&#039;רקסקי`).
 * הערך המקורי נשמר תמיד ב-rawPayload — אין לאבד מידע לצורכי בקרה.
 */
export function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

function cell(row: RawRow, key: string): string | null {
  const found = Object.keys(row).find((k) => k.trim().toLowerCase() === key)
  if (!found) return null
  const val = row[found]
  if (val == null) return null
  const str = decodeHtmlEntities(String(val).trim())
  return str ? str : null
}

/** בודק שהקובץ הוא אכן דוח תוצאות קמפיין לפי הכותרות שלו */
export function isCampaignResultsFile(rows: RawRow[]): boolean {
  if (!rows.length) return false
  const headers = Object.keys(rows[0]).map((h) => h.trim().toLowerCase())
  return CAMPAIGN_REQUIRED_HEADERS.every((h) => headers.includes(h))
}

export function getMissingHeaders(rows: RawRow[]): string[] {
  if (!rows.length) return [...CAMPAIGN_REQUIRED_HEADERS]
  const headers = Object.keys(rows[0]).map((h) => h.trim().toLowerCase())
  return CAMPAIGN_KNOWN_HEADERS.filter((h) => !headers.includes(h))
}

/**
 * `sending_time` מגיע כ-"2026-07-16 20:42". מומר ל-ISO עם offset מקומי כדי
 * שלא יזלוג יום אחורה/קדימה בהמרה ל-UTC.
 */
export function parseSendingTime(value: string | null): string | null {
  if (!value) return null
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/)
  if (!m) {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
  }
  const [, y, mo, d, h, mi, s] = m
  const dt = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s ?? 0))
  return Number.isNaN(dt.getTime()) ? null : dt.toISOString()
}

export async function readCampaignFile(file: File): Promise<RawRow[]> {
  const type = detectFileType(file)
  if (type === 'excel') return parseExcelFile(file)
  if (type === 'csv') return parseCsvFile(file)
  throw new Error('סוג קובץ לא נתמך. יש להעלות קובץ CSV או Excel.')
}

/** מחשב SHA-256 של הקובץ — מונע קליטה חוזרת של אותו קובץ בדיוק */
export async function computeFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * ממיר שורות גולמיות לשורות קמפיין מנורמלות. אינו נוגע ב-Supabase —
 * ההתאמה ל-contact נעשית בשלב נפרד (matchRowsToContacts).
 */
export function parseCampaignRows(rows: RawRow[]): ParsedCampaignRow[] {
  return rows.map((raw, idx) => {
    const phoneRaw = cell(raw, 'phone')
    const phoneNorm = phoneRaw ? normalizePhone(phoneRaw) : ''
    const validPhone = phoneNorm.length === 12 && phoneNorm.startsWith('9725')
    const deliveryStatusRaw = cell(raw, 'sending_status')

    return {
      rowNumber: idx + 2, // +2: שורת כותרת + אינדקס מאפס
      fullNameRaw: cell(raw, 'fullname'),
      emailRaw: cell(raw, 'email'),
      phoneRaw,
      phoneNorm: validPhone ? phoneNorm : null,
      fixProcessRaw: cell(raw, 'process'),
      fixStatusRaw: cell(raw, 'status'),
      sentAt: parseSendingTime(cell(raw, 'sending_time')),
      deliveryStatusRaw,
      deliveryStatus: mapDeliveryStatus(deliveryStatusRaw),
      matchResult: !phoneRaw ? 'missing_phone' : validPhone ? 'not_found' : 'invalid_phone',
      contactId: null,
      rawPayload: raw,
    }
  })
}

/**
 * מועד הקמפיין = ה-sending_time השכיח ביותר בקובץ.
 * בדוחות שנבדקו הוא אחיד בכל השורות, אבל הערך נשמר גם ברמת הנמען כך
 * שקובץ עתידי עם שעות שונות עדיין ייתמך.
 */
export function inferCampaignSentAt(rows: ParsedCampaignRow[]): string | null {
  const counts = new Map<string, number>()
  for (const r of rows) {
    if (r.sentAt) counts.set(r.sentAt, (counts.get(r.sentAt) ?? 0) + 1)
  }
  let best: string | null = null
  let bestCount = 0
  for (const [value, count] of counts) {
    if (count > bestCount) { best = value; bestCount = count }
  }
  return best
}

/** שם קמפיין מוצע כברירת מחדל, לפי מועד השליחה */
export function suggestCampaignName(sentAt: string | null, fileName: string): string {
  if (!sentAt) return fileName.replace(/\.[^.]+$/, '')
  const d = new Date(sentAt)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `פרסום ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
