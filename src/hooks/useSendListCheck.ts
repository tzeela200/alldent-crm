/**
 * בדיקת רשימת ניידים **לפני** שליחה בפיקס.
 *
 * המשתמשת מדביקה רשימה ומקבלת תשובה אחת: אפשר לשלוח, או שיש מספרים שאסור.
 *
 * ## מה מתמחזר ומה חדש
 *
 * הנרמול, הוולידציה והחיפוש במאגר כבר קיימים ומשמשים את אשף הייבוא ואת
 * "בדיקת נייד ומייל" ב-Inbox — `splitPhoneInput`, `normalizeIlMobile`,
 * `lookupPhonesByNorm`. הם מיובאים כמו שהם, כדי שאותו מספר יקבל את אותה
 * תשובה בכל המסכים.
 *
 * החלק היחיד שנוסף כאן: **מצב השליחה** של כל מספר.
 *
 * ## למה לפי נייד ולא לפי contact_id
 *
 * `useOptedOutContactIds` מחזיר מזהי אנשי קשר, ולכן מתאים רק לסינון מהמאגר.
 * כאן הרשימה **חיצונית**: מספר שביקש הסרה בעבר אך אינו רשום כאיש קשר היה
 * חומק מהבדיקה ומקבל פרסום. לכן החיפוש הוא על `phone_norm` ישירות.
 *
 * קריאה בלבד. שום דבר לא נשמר.
 */

import { useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { normalizeIlMobile, IL_MOBILE_ERROR } from '@/lib/normalizePhone'
import { splitPhoneInput, lookupPhonesByNorm } from '@/hooks/useInboxPhoneCheck'
import { getDeliveryStatusMeta } from '@/lib/fixPublications/deliveryStatus'
import { isRemovedFromPublishing } from '@/lib/fixPublications/deliveryOutcome'
import {
  verdictFor, type SendListRow, type SendStatus,
} from '@/lib/fixPublications/sendListVerdict'

// מיוצא מחדש כדי שצרכנים קיימים לא יצטרכו לדעת על הפיצול
export {
  SEND_VERDICTS, summarizeSendList,
  type SendVerdict, type SendListRow, type SendListSummary,
} from '@/lib/fixPublications/sendListVerdict'

/** כמה ניידים נכנסים ל-in(...) אחד לפני שה-URL של PostgREST נחתך */
const IN_CHUNK = 250

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

/**
 * מצב השליחה לכל נייד ברשימה — שלוש שאילתות קריאה.
 *
 * 1. בקשות הסרה — `failure_category='opt_out'`. **חסימה קבועה** שאינה
 *    נדרסת ע"י קמפיין מאוחר יותר, ולכן נשלפת בנפרד ולא נגזרת מהסיכום.
 * 2. `contact` — שדות הסיכום (מועד וסטטוס אחרונים).
 * 3. `accounts` — אותו דבר לארגונים.
 */
export async function lookupSendStatusByPhone(norms: string[]): Promise<Map<string, SendStatus>> {
  const out = new Map<string, SendStatus>()
  const unique = [...new Set(norms.filter(Boolean))]
  if (!unique.length) return out

  const touch = (phone: string): SendStatus => {
    const existing = out.get(phone)
    if (existing) return existing
    const fresh: SendStatus = { optedOut: false, lastStatus: null, lastSentAt: null, known: false }
    out.set(phone, fresh)
    return fresh
  }

  for (const batch of chunk(unique, IN_CHUNK)) {
    const [optOut, contacts, accounts] = await Promise.all([
      supabase
        .from('whatsapp_campaign_recipients')
        .select('phone_norm')
        .eq('failure_category', 'opt_out')
        .in('phone_norm', batch),
      supabase
        .from('contact')
        .select('phone_norm, social_status, whatsapp_last_delivery_status, whatsapp_campaign_last_sent')
        .in('phone_norm', batch),
      supabase
        .from('accounts')
        .select('phone_norm, whatsapp_last_delivery_status, whatsapp_last_sent')
        .in('phone_norm', batch),
    ])
    if (optOut.error) throw optOut.error
    if (contacts.error) throw contacts.error
    if (accounts.error) throw accounts.error

    for (const row of optOut.data ?? []) {
      const entry = touch(String(row.phone_norm))
      entry.optedOut = true
      entry.known = true
    }
    for (const row of contacts.data ?? []) {
      const entry = touch(String(row.phone_norm))
      entry.known = true
      if (isRemovedFromPublishing(row.social_status as number | null)) entry.removed = true
      entry.lastStatus = (row.whatsapp_last_delivery_status as string | null) ?? entry.lastStatus
      entry.lastSentAt = (row.whatsapp_campaign_last_sent as string | null) ?? entry.lastSentAt
    }
    for (const row of accounts.data ?? []) {
      const entry = touch(String(row.phone_norm))
      entry.known = true
      entry.lastStatus = (row.whatsapp_last_delivery_status as string | null) ?? entry.lastStatus
      entry.lastSentAt = (row.whatsapp_last_sent as string | null) ?? entry.lastSentAt
    }
  }

  return out
}

/** תווית עברית למצב השליחה האחרון של הרשומה */
export function lastDeliveryLabel(lastStatus: string | null): string {
  return lastStatus ? getDeliveryStatusMeta(lastStatus).label : '—'
}

export function useSendListCheck() {
  const [rows, setRows] = useState<SendListRow[] | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = useCallback(() => {
    setRows(null)
    setError(null)
  }, [])

  const check = useCallback(async (input: string) => {
    const raws = splitPhoneInput(input)
    if (!raws.length) {
      setError('לא הודבקו מספרי נייד לבדיקה.')
      setRows(null)
      return
    }

    setIsChecking(true)
    setError(null)
    try {
      // 1. נרמול וולידציה — אותו כלל בדיוק של normalize_il_mobile_phone ב-DB
      const seen = new Set<string>()
      const base: SendListRow[] = raws.map((raw, index) => {
        const normalized = normalizeIlMobile(raw)
        if (!normalized) {
          return {
            index, raw, normalized: null, verdict: 'invalid' as const,
            reason: IL_MOBILE_ERROR, permanentBlock: false,
            matches: [], outcome: null, lastSentAt: null,
          }
        }
        // כפילות מסומנת אבל לא נחסמת — ההופעה הראשונה נשארת תקינה
        const duplicate = seen.has(normalized)
        seen.add(normalized)
        return {
          index, raw, normalized,
          verdict: duplicate ? ('duplicate' as const) : ('ok' as const),
          reason: duplicate ? 'המספר כבר מופיע ברשימה' : null,
          permanentBlock: false, matches: [], outcome: null, lastSentAt: null,
        }
      })

      const norms = base.filter((r) => r.normalized).map((r) => r.normalized as string)

      // 2. שתי בדיקות set-based במקביל: מי במאגר, ומה מצב השליחה שלו
      const [byNorm, byStatus] = await Promise.all([
        lookupPhonesByNorm(norms),
        lookupSendStatusByPhone(norms),
      ])

      for (const row of base) {
        if (!row.normalized) continue
        row.matches = byNorm.get(row.normalized) ?? []

        const status = byStatus.get(row.normalized)
        const decision = verdictFor(status, row.normalized)
        row.outcome = decision.outcome
        row.lastSentAt = status?.lastSentAt ?? null

        // כפילות אינה מבטלת חסימה — מספר חסום שחוזר פעמיים עדיין חסום
        if (decision.verdict === 'blocked') {
          row.verdict = 'blocked'
          row.reason = decision.reason
          row.permanentBlock = decision.permanentBlock
          row.blockKind = decision.blockKind
        }
      }

      setRows(base)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הבדיקה מול המאגר נכשלה.')
      setRows(null)
    } finally {
      setIsChecking(false)
    }
  }, [])

  return { rows, isChecking, error, check, reset }
}
