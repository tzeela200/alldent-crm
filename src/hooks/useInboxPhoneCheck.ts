import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { normalizeIlMobile, IL_MOBILE_ERROR } from '@/lib/normalizePhone'
import { isValidEmail, normalizeEmail } from '@/lib/inbox-v2-merge'

/**
 * בדיקת נייד ומייל — **קריאה בלבד** (INC-3125, הורחב ל-מייל ב-INC-3139).
 *
 * ⚠ הכלל המחייב: אין כאן שום כתיבה. לא ל-inbox_v2, לא ל-inbox_import_batches
 * ולא ל-inbox_merge_actions. זו הנקודה שמבדילה את הכלי הזה מתיבת ההדבקה
 * של הייבוא, שכותבת מיד. מי שמוסיף כאן INSERT שובר את הדרישה.
 *
 * המטרה אינה רק "מי קיים" אלא **מי לא קיים** — כדי לדעת את מי אפשר להוסיף
 * למאגר. לכן הפלט מפריד במפורש לשלוש קבוצות: קיים · לא קיים · לא תקין.
 *
 * הבדיקה נעשית set-based (שאילתה אחת לכל טבלה לכל מנה) ולא ערך-ערך,
 * כדי שרשימה של מאות שורות לא תייצר מאות בקשות.
 *
 * ═══ זיהוי לפי השורה, בלי מתג ═══
 *
 * שורה שיש בה `@` נבדקת כמייל, כל השאר כנייד. כך אפשר להדביק רשימה
 * מעורבת כפי שהיא מגיעה מגוגל, בלי למיין אותה מראש.
 */

export type PhoneCheckStatus = 'found' | 'new' | 'invalid'

/** לפי מה נבדקה השורה. קובע גם את הניסוח בתצוגה ("נייד נוסף" מול "מייל נוסף"). */
export type CheckKind = 'phone' | 'email'

export interface PhoneMatch {
  kind: 'contact' | 'account'
  id: number
  name: string
  /** באיזה שדה נמצא — ראשי או נוסף */
  field: 'primary' | 'secondary'
}

export interface PhoneCheckResult {
  index: number
  raw: string
  kind: CheckKind
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
  phones: number
  emails: number
}

const CHUNK = 100

const EMAIL_ERROR = 'כתובת המייל אינה תקינה'

function chunked<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

/** 9725XXXXXXXX → 05XXXXXXXX, לאיתור התאמות בשדה משני שנשמר בפורמט מקומי. */
function toLocal(norm: string): string {
  return '0' + norm.slice(3)
}

/** מפצל טקסט מודבק לערכים: שורה, פסיק, נקודה-פסיק או טאב. */
export function splitPhoneInput(text: string): string[] {
  return text
    .split(/[\n\r,;\t]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/** שורה שיש בה `@` היא כתובת מייל; כל השאר נבדק כנייד. */
export function detectKind(raw: string): CheckKind {
  return raw.includes('@') ? 'email' : 'phone'
}

const contactName = (c: Record<string, unknown>) =>
  (c.display_name as string) || (c.full_name as string) || `איש קשר #${c.contact_id}`

const accountName = (a: Record<string, unknown>) =>
  (a.account_name as string) || `ארגון #${a.account_id}`

/**
 * חיפוש set-based של מספרים מנורמלים מול contact ו-accounts — **קריאה בלבד**.
 *
 * מיוצא כדי שאשף הייבוא, יצירת איש קשר וההקמה הגורפת ישתמשו באותה לוגיקה
 * בדיוק: אם ה-Preview של הייבוא היה מחשב "קיים/חדש" אחרת מבדיקת המספרים,
 * אותו מספר היה מקבל שתי תשובות שונות בשני מסכים.
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

    for (const c of (contactPrimary.data ?? []) as Record<string, unknown>[]) {
      add(c.phone_norm as string, { kind: 'contact', id: c.contact_id as number, name: contactName(c), field: 'primary' })
    }
    for (const c of (contactSecondary.data ?? []) as Record<string, unknown>[]) {
      const norm = normalizeIlMobile(c.second_phone as string)
      if (norm) add(norm, { kind: 'contact', id: c.contact_id as number, name: contactName(c), field: 'secondary' })
    }
    for (const a of (accountPrimary.data ?? []) as Record<string, unknown>[]) {
      add(a.phone_norm as string, { kind: 'account', id: a.account_id as number, name: accountName(a), field: 'primary' })
    }
    for (const a of (accountSecondary.data ?? []) as Record<string, unknown>[]) {
      const norm = normalizeIlMobile(a.second_phone as string)
      if (norm) add(norm, { kind: 'account', id: a.account_id as number, name: accountName(a), field: 'secondary' })
    }
  }

  return byNorm
}

/**
 * חיפוש set-based של כתובות מייל מול contact ו-accounts — **קריאה בלבד** (INC-3139).
 *
 * המפתח במפה החוזרת הוא תמיד המייל **המנורמל**, גם כשבמסד הוא שמור אחרת:
 * כל ערך שחוזר מהמסד עובר `normalizeEmail` לפני ההכנסה למפה. כך הקורא
 * מחפש לפי הצורה המנורמלת שלו בלבד.
 *
 * ⚠ `in()` הוא השוואה תלוית-רישיות. לכן שולחים גם את הצורה המנורמלת וגם
 * את הצורה שהודבקה כפי שהיא — אומת חי: מתוך 14,225 מיילים ב-contact
 * בדיוק **אחד** שמור עם אותיות גדולות. חיפוש חסין-רישיות מלא היה דורש
 * RPC, כלומר שינוי Supabase, ולא הוצדק בהיקף הזה.
 */
export async function lookupEmails(values: string[]): Promise<Map<string, PhoneMatch[]>> {
  const byEmail = new Map<string, PhoneMatch[]>()
  const unique = [...new Set(values.filter(Boolean))]
  if (!unique.length) return byEmail

  const add = (stored: unknown, m: PhoneMatch) => {
    const key = normalizeEmail(stored)
    if (!key) return
    const list = byEmail.get(key) ?? []
    if (!list.some((x) => x.kind === m.kind && x.id === m.id && x.field === m.field)) list.push(m)
    byEmail.set(key, list)
  }

  for (const chunk of chunked(unique, CHUNK)) {
    const [contactPrimary, contactSecondary, accountPrimary, accountSecondary] = await Promise.all([
      supabase.from('contact').select('contact_id, display_name, full_name, email')
        .in('email', chunk),
      supabase.from('contact').select('contact_id, display_name, full_name, second_email')
        .in('second_email', chunk),
      supabase.from('accounts').select('account_id, account_name, email')
        .in('email', chunk),
      supabase.from('accounts').select('account_id, account_name, second_email')
        .in('second_email', chunk),
    ])

    const firstErr =
      contactPrimary.error ?? contactSecondary.error ?? accountPrimary.error ?? accountSecondary.error
    if (firstErr) throw new Error(firstErr.message)

    for (const c of (contactPrimary.data ?? []) as Record<string, unknown>[]) {
      add(c.email, { kind: 'contact', id: c.contact_id as number, name: contactName(c), field: 'primary' })
    }
    for (const c of (contactSecondary.data ?? []) as Record<string, unknown>[]) {
      add(c.second_email, { kind: 'contact', id: c.contact_id as number, name: contactName(c), field: 'secondary' })
    }
    for (const a of (accountPrimary.data ?? []) as Record<string, unknown>[]) {
      add(a.email, { kind: 'account', id: a.account_id as number, name: accountName(a), field: 'primary' })
    }
    for (const a of (accountSecondary.data ?? []) as Record<string, unknown>[]) {
      add(a.second_email, { kind: 'account', id: a.account_id as number, name: accountName(a), field: 'secondary' })
    }
  }

  return byEmail
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
      setError('לא הוזנו ניידים או מיילים לבדיקה')
      return
    }

    setIsChecking(true)
    setError(null)
    try {
      // 1. נרמול וולידציה — client-side. לניידים אותו כלל בדיוק של
      //    normalize_il_mobile_phone ב-Supabase; למיילים normalizeEmail המשותף.
      const rows: PhoneCheckResult[] = raws.map((raw, index) => {
        if (detectKind(raw) === 'email') {
          const normalized = normalizeEmail(raw)
          const valid = isValidEmail(normalized)
          return {
            index,
            raw,
            kind: 'email' as const,
            normalized: valid ? normalized : null,
            status: valid ? ('new' as const) : ('invalid' as const),
            invalidReason: valid ? null : EMAIL_ERROR,
            matches: [],
          }
        }
        const normalized = normalizeIlMobile(raw)
        return {
          index,
          raw,
          kind: 'phone' as const,
          normalized,
          status: normalized ? ('new' as const) : ('invalid' as const),
          invalidReason: normalized ? null : IL_MOBILE_ERROR,
          matches: [],
        }
      })

      // 2. שתי בדיקות set-based במקביל. למיילים נשלחת גם הצורה המנורמלת
      //    וגם מה שהודבק בפועל — ראו ההערה ב-lookupEmails.
      const [byNorm, byEmail] = await Promise.all([
        lookupPhonesByNorm(
          rows.filter((r) => r.kind === 'phone' && r.normalized).map((r) => r.normalized!)
        ),
        lookupEmails(
          rows
            .filter((r) => r.kind === 'email' && r.normalized)
            .flatMap((r) => [r.normalized!, r.raw.trim()])
        ),
      ])

      for (const row of rows) {
        if (!row.normalized) continue
        row.matches = (row.kind === 'email' ? byEmail : byNorm).get(row.normalized) ?? []
        row.status = row.matches.length ? 'found' : 'new'
      }

      setResults(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בבדיקה מול המאגר')
      setResults(null)
    } finally {
      setIsChecking(false)
    }
  }, [])

  return { results, isChecking, error, check, reset }
}

export function summarize(results: PhoneCheckResult[]): PhoneCheckSummary {
  // כפילות נספרת בתוך אותו סוג בלבד — נייד ומייל לעולם אינם אותו ערך.
  const seen = new Set<string>()
  let duplicatesInInput = 0
  for (const r of results) {
    if (!r.normalized) continue
    const key = `${r.kind}:${r.normalized}`
    if (seen.has(key)) duplicatesInInput++
    else seen.add(key)
  }
  return {
    total: results.length,
    found: results.filter((r) => r.status === 'found').length,
    isNew: results.filter((r) => r.status === 'new').length,
    invalid: results.filter((r) => r.status === 'invalid').length,
    duplicatesInInput,
    phones: results.filter((r) => r.kind === 'phone').length,
    emails: results.filter((r) => r.kind === 'email').length,
  }
}
