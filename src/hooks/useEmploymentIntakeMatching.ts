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
}

/** שאילתה מקובצת אחת ל-contact ואחת ל-accounts, לכל האצווה בבת אחת. */
export async function fetchMatchingPool(ids: BatchIdentifiers): Promise<MatchingPool> {
  const orFilter = buildOrFilter([
    { column: 'phone_norm', values: ids.phoneNorms },
    { column: 'second_phone', values: ids.phoneNorms }, // תופס מקרה שהטלפון שלנו כבר רשום כמשני אצלם
    { column: 'email', values: ids.emails },
    { column: 'second_email', values: ids.emails },
    { column: 'facebook_id', values: ids.facebookIds },
    { column: 'facebook_url', values: ids.facebookUrls },
  ])

  if (!orFilter) return { contacts: [], accounts: [] }

  const [contactsRes, accountsRes] = await Promise.all([
    supabase.from('contact').select(CONTACT_SELECT).or(orFilter),
    supabase.from('accounts').select(ACCOUNT_SELECT).or(orFilter),
  ])

  if (contactsRes.error) throw new Error(`התאמת אנשי קשר נכשלה: ${contactsRes.error.message}`)
  if (accountsRes.error) throw new Error(`התאמת ארגונים נכשלה: ${accountsRes.error.message}`)

  return {
    contacts: (contactsRes.data ?? []) as ContactCandidate[],
    accounts: (accountsRes.data ?? []) as AccountCandidate[],
  }
}
