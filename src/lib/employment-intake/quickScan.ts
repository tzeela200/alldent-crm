/**
 * סריקה קלה (regex בלבד, ללא RPC/DB) לצורך "Preview לפני עיבוד" (§3.1) —
 * ספירת מזהים גולמיים כדי לתת משוב מהיר לפני שמריצים את מנוע החילוץ/נרמול
 * האמיתי (extract.ts + normalize.ts, שלב 5, שקורא ל-Supabase RPC).
 * זו סריקה גסה בכוונה: אינה קובעת ייחוס טלפון, אינה מנרמלת, אינה כותבת
 * שום דבר. תפקידה היחיד הוא KPI מהיר בטרם עיבוד.
 */

import type { RawParsedMessage } from '@/types/employment-intake'

const PHONE_RE = /(?:\+?972[-\s]?|0)([23489]|5[0-9])[-\s]?\d{3}[-\s]?\d{4}/g
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const FB_URL_RE = /https?:\/\/(?:www\.)?(?:facebook|fb)\.com\/[^\s)]+/gi

export interface QuickScanResult {
  messageCount: number
  phoneMatches: number
  emailMatches: number
  facebookUrlMatches: number
}

export function quickScan(messages: RawParsedMessage[]): QuickScanResult {
  let phoneMatches = 0
  let emailMatches = 0
  let facebookUrlMatches = 0

  for (const m of messages) {
    phoneMatches += (m.text.match(PHONE_RE) ?? []).length
    emailMatches += (m.text.match(EMAIL_RE) ?? []).length
    facebookUrlMatches += (m.text.match(FB_URL_RE) ?? []).length
  }

  return {
    messageCount: messages.length,
    phoneMatches,
    emailMatches,
    facebookUrlMatches,
  }
}
