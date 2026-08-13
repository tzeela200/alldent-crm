/**
 * שלב 6 של INC-3119: התאמה — שאילתה מקובצת אחת לכל האצווה, לכל טבלה.
 * נמדד חי (EXPLAIN ANALYZE, 31,383 שורות contact): מייל בודד = 1,444ms;
 * כל האצווה בשאילתה אחת (phone_norm/email/facebook_id/facebook_url ANY)
 * = 22.8ms. אסור להריץ שאילתה לכל שורה.
 *
 * הלוגיקה הטהורה (מי מתאים למי) נמצאת ב-matching.ts; כאן רק שליפת
 * המועמדים מ-Supabase.
 */

import { supabase } from '@/lib/supabase'
import type { ContactCandidate, AccountCandidate } from '@/lib/employment-intake/matching'
import { supabaseError } from '@/lib/employment-intake/errors'

const CONTACT_SELECT =
  'contact_id, display_name, phone_norm, second_phone, email, second_email, facebook_id, facebook_url, role, city_id'
const ACCOUNT_SELECT =
  'account_id, account_name, phone_norm, second_phone, email, second_email, facebook_id, facebook_url, city_id'

/** מסיר תווים שהיו שוברים את תחביר ה-.or()/.in() — אותה גישה כמו useFixPublications.ts. */
function sanitize(v: string): string {
  return v.replace(/[%,()"]/g, '')
}

function buildOrFilter(fields: { column: string; values: string[] }[]): string | null {
  const clauses = fields
    .map(({ column, values }) => {
      const clean = Array.from(new Set(values.map(sanitize).filter(Boolean)))
      return clean.length ? `${column}.in.(${clean.join(',')})` : null
    })
    .filter((c): c is string => !!c)
  return clauses.length ? clauses.join(',') : null
}

export interface MatchingPool {
  contacts: ContactCandidate[]
  accounts: AccountCandidate[]
}

export interface BatchIdentifiers {
  phoneNorms: string[]
  emails: string[]
  facebookIds: string[]
  facebookUrls: string[]
  /** שמות שחולצו רק מתווית Google המאושרת; שם רגיל אינו נשלח לכאן. */
  trustedContactNames?: string[]
}

/**
 * שאילתות מקובצות לכל האצווה. מזהים חזקים נשלפים ב-OR אחד לכל טבלה;
 * שמות Google המאושרים נשלפים ב-IN נפרד כדי לא להפוך "שם בלבד" למסלול התאמה.
 */
export async function fetchMatchingPool(ids: BatchIdentifiers): Promise<MatchingPool> {
  const orFilter = buildOrFilter([
    { column: 'phone_norm', values: ids.phoneNorms },
    { column: 'second_phone', values: ids.phoneNorms },
    { column: 'email', values: ids.emails },
    { column: 'second_email', values: ids.emails },
    { column: 'facebook_id', values: ids.facebookIds },
    { column: 'facebook_url', values: ids.facebookUrls },
  ])
  const trustedNames = Array.from(new Set((ids.trustedContactNames ?? []).map((v) => v.trim()).filter(Boolean)))

  const contactQueries: PromiseLike<{ data: unknown[] | null; error: unknown }>[] = []
  const accountQueries: PromiseLike<{ data: unknown[] | null; error: unknown }>[] = []

  if (orFilter) {
    contactQueries.push(supabase.from('contact').select(CONTACT_SELECT).or(orFilter) as never)
    accountQueries.push(supabase.from('accounts').select(ACCOUNT_SELECT).or(orFilter) as never)
  }
  if (trustedNames.length) {
    contactQueries.push(supabase.from('contact').select(CONTACT_SELECT).in('display_name', trustedNames) as never)
  }

  const [contactResults, accountResults] = await Promise.all([
    Promise.all(contactQueries),
    Promise.all(accountQueries),
  ])

  for (const result of contactResults) if (result.error) throw supabaseError('התאמת אנשי קשר נכשלה', result.error)
  for (const result of accountResults) if (result.error) throw supabaseError('התאמת ארגונים נכשלה', result.error)

  const contactMap = new Map<number, ContactCandidate>()
  for (const result of contactResults) {
    for (const row of result.data ?? []) {
      const c = row as ContactCandidate
      contactMap.set(c.contact_id, c)
    }
  }
  const accountMap = new Map<number, AccountCandidate>()
  for (const result of accountResults) {
    for (const row of result.data ?? []) {
      const a = row as AccountCandidate
      accountMap.set(a.account_id, a)
    }
  }

  return { contacts: Array.from(contactMap.values()), accounts: Array.from(accountMap.values()) }
}
