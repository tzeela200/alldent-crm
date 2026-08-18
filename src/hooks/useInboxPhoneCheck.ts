import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { normalizeIlMobile, IL_MOBILE_ERROR } from '@/lib/normalizePhone'

/**
 * בדיקת מספרים — **קריאה בלבד** (INC-3125).
 *
 * ⚠ הכלל המחייב: אין כאן שום כתיבה. לא ל-inbox_v2, לא ל-inbox_import_batches
 * ולא ל-inbox_merge_actions. זו הנקודה שמבדילה את הכלי הזה מתיבת ההדבקה
 * של הייבוא, שכותבת מיד. מי שמוסיף כאן INSERT שובר את הדרישה.
 *
 * המטרה אינה רק "מי קיים" אלא **מי לא קיים** — כדי לדעת את מי אפשר להוסיף
 * למאגר. לכן הפלט מפריד במפורש לשלוש קבוצות: קיים · לא קיים · לא תקין.
 *
 * הבדיקה נעשית set-based (שאילתה אחת לכל טבלה לכל מנה) ולא מספר-מספר,
 * כדי שרשימה של מאות מספרים לא תייצר מאות בקשות.
 */

export type PhoneCheckStatus = 'found' | 'new' | 'invalid'

export interface PhoneMatch {
  kind: 'contact' | 'account'
  id: number
  name: string
  /** באיזה שדה נמצא — נייד ראשי או נוסף */
  field: 'primary' | 'secondary'
}

export interface PhoneCheckResult {
  index: number
  raw: string
  normalized: string | null
  status: PhoneCheckStatus
  /** סיבת פסילה, בעברית */
  invalidReason: string | null
  matches: PhoneMatch[]
}

export interface PhoneCheckSummary {
  total: number
  found: number
  isNew: number
  invalid: number
  duplicatesInInput: number
}

const CHUNK = 100

function chunked<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

/** 9725XXXXXXXX → 05XXXXXXXX, לאיתור התאמות בשדה משני שנשמר בפורמט מקומי. */
function toLocal(norm: string): string {
  return '0' + norm.slice(3)
}

/** מפצל טקסט מודבק למספרים: שורה, פסיק, נקודה-פסיק, טאב או רווח כפול. */
export function splitPhoneInput(text: string): string[] {
  return text
    .split(/[\n\r,;\t]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * חיפוש set-based של מספרים מנורמלים מול contact ו-accounts — **קריאה בלבד**.
 *
 * מיוצא כדי שאשף הייבוא ישתמש באותה לוגיקה בדיוק: אם ה-Preview של הייבוא
 * היה מחשב "קיים/חדש" אחרת מבדיקת המספרים, אותו מספר היה מקבל שתי
 * תשובות שונות בשני מסכים.
 */
export async function lookupPhonesByNorm(norms: string[]): Promise<Map<string, PhoneMatch[]>> {
  const byNorm = new Map<string, PhoneMatch[]>()
  const unique = [...new Set(norms.filter(Boolean))]
  if (!unique.length) return byNorm

  const add = (norm: string, m: PhoneMatch) => {
    const list = byNorm.get(norm) ?? []
    if (!list.some((x) => x.kind === m.kind && x.id === m.id)) list.push(m)
    byNorm.set(norm, list)
  }

  for (const chunk of chunked(unique, CHUNK)) {
    const locals = chunk.map(toLocal)

    const [contactPrimary, contactSecondary, accountPrimary, accountSecondary] = await Promise.all([
      supabase.from('contact').select('contact_id, display_name, full_name, phone_norm')
        .in('phone_norm', chunk),
      supabase.from('contact').select('contact_id, display_name, full_name, second_phone')
        .in('second_phone', [...chunk, ...locals]),
      supabase.from('accounts').select('account_id, account_name, phone_norm')
        .in('phone_norm', chunk),
      supabase.from('accounts').select('account_id, account_name, second_phone')
        .in('second_phone', [...chunk, ...locals]),
    ])

    const firstErr =
      contactPrimary.error ?? contactSecondary.error ?? accountPrimary.error ?? accountSecondary.error
    if (firstErr) throw new Error(firstErr.message)

    const contactName = (c: Record<string, unknown>) =>
      (c.display_name as string) || (c.full_name as string) || `איש קשר #${c.contact_id}`

    for (const c of (contactPrimary.data ?? []) as Record<string, unknown>[]) {
      add(c.phone_norm as string, { kind: 'contact', id: c.contact_id as number, name: contactName(c), field: 'primary' })
    }
    for (const c of (contactSecondary.data ?? []) as Record<string, unknown>[]) {
      const norm = normalizeIlMobile(c.second_phone as string)
      if (norm) add(norm, { kind: 'contact', id: c.contact_id as number, name: contactName(c), field: 'secondary' })
    }
    for (const a of (accountPrimary.data ?? []) as Record<string, unknown>[]) {
      add(a.phone_norm as string, {
        kind: 'account', id: a.account_id as number,
        name: (a.account_name as string) || `ארגון #${a.account_id}`, field: 'primary',
      })
    }
    for (const a of (accountSecondary.data ?? []) as Record<string, unknown>[]) {
      const norm = normalizeIlMobile(a.second_phone as string)
      if (norm) add(norm, {
        kind: 'account', id: a.account_id as number,
        name: (a.account_name as string) || `ארגון #${a.account_id}`, field: 'secondary',
      })
    }
  }

  return byNorm
}

export function useInboxPhoneCheck() {
  const [results, setResults] = useState<PhoneCheckResult[] | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = useCallback(() => {
    setResults(null)
    setError(null)
  }, [])

  const check = useCallback(async (rawInput: string) => {
    const raws = splitPhoneInput(rawInput)
    if (!raws.length) {
      setError('לא הוזנו מספרים לבדיקה')
      return
    }

    setIsChecking(true)
    setError(null)
    try {
      // 1. נרמול וולידציה — client-side, אותו כלל בדיוק של normalize_il_mobile_phone
      const rows: PhoneCheckResult[] = raws.map((raw, index) => {
        const normalized = normalizeIlMobile(raw)
        return {
          index,
          raw,
          normalized,
          status: normalized ? 'new' : 'invalid',
          invalidReason: normalized ? null : IL_MOBILE_ERROR,
          matches: [],
        }
      })

      const byNorm = await lookupPhonesByNorm(
        rows.filter((r) => r.normalized).map((r) => r.normalized!)
      )

      for (const row of rows) {
        if (!row.normalized) continue
        row.matches = byNorm.get(row.normalized) ?? []
        row.status = row.matches.length ? 'found' : 'new'
      }

      setResults(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בבדיקת המספרים')
      setResults(null)
    } finally {
      setIsChecking(false)
    }
  }, [])

  return { results, isChecking, error, check, reset }
}

export function summarize(results: PhoneCheckResult[]): PhoneCheckSummary {
  const seen = new Set<string>()
  let duplicatesInInput = 0
  for (const r of results) {
    if (!r.normalized) continue
    if (seen.has(r.normalized)) duplicatesInInput++
    else seen.add(r.normalized)
  }
  return {
    total: results.length,
    found: results.filter((r) => r.status === 'found').length,
    isNew: results.filter((r) => r.status === 'new').length,
    invalid: results.filter((r) => r.status === 'invalid').length,
    duplicatesInInput,
  }
}
