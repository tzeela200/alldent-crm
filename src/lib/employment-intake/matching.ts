/**
 * מנוע ההתאמה (§9) — לוגיקה טהורה. מקבל את מועמדי ה-Contact/Account
 * שכבר נשלפו (שאילתה מקובצת אחת לכל האצווה — נמדד חי: ~23ms על 31,383
 * שורות, לעומת 1,444ms לשאילתה בודדת) ומכריע לכל שורה מהי ההתאמה הטובה
 * ביותר, לפי סדר העדיפות: Facebook ID → טלפון מנורמל → מייל → Facebook
 * URL → טלפון/מייל משני → שם+תפקיד+עיר (חלש) → שם ארגון (חלש) → שם בלבד
 * (חלש — לעולם לא מיזוג אוטומטי).
 */

import { normalizePhone } from '@/lib/normalizePhone'
import type { MatchCandidate, MatchStatus, MatchType } from '@/types/employment-intake'

export interface ContactCandidate {
  contact_id: number
  display_name: string | null
  phone_norm: string | null
  second_phone: string | null
  email: string | null
  second_email: string | null
  facebook_id: string | null
  facebook_url: string | null
  role: number | null
  city_id: number | null
}

export interface AccountCandidate {
  account_id: number
  account_name: string | null
  phone_norm: string | null
  second_phone: string | null
  email: string | null
  second_email: string | null
  facebook_id: string | null
  facebook_url: string | null
  city_id: number | null
}

export interface RowMatchInput {
  phoneNorm: string | null
  secondPhoneNorm: string | null
  email: string | null
  secondEmail: string | null
  facebookId: string | null
  facebookUrl: string | null
  contactNameRaw: string | null
  orgNameRaw: string | null
  roleId: number | null
  cityId: number | null
}

export interface MatchResult {
  matchContact: number | null
  matchAccount: number | null
  matchField: string | null
  matchType: MatchType
  matchCandidates: MatchCandidate[]
}

const norm = (v: string | null) => (v ? v.trim().toLowerCase() : null)
const normPhoneLoose = (v: string | null) => (v ? normalizePhone(v) || null : null)

function matchContactField(c: ContactCandidate, input: RowMatchInput): { field: string; strong: boolean } | null {
  if (input.facebookId && c.facebook_id && c.facebook_id === input.facebookId) return { field: 'facebook_id', strong: true }
  if (input.phoneNorm && c.phone_norm && c.phone_norm === input.phoneNorm) return { field: 'phone_norm', strong: true }
  if (input.email && norm(c.email) === norm(input.email)) return { field: 'email', strong: true }
  if (input.email && norm(c.second_email) === norm(input.email)) return { field: 'second_email', strong: true }
  if (input.facebookUrl && c.facebook_url && c.facebook_url === input.facebookUrl) return { field: 'facebook_url', strong: true }
  if (input.secondEmail && norm(c.email) === norm(input.secondEmail)) return { field: 'email', strong: true }
  if (input.phoneNorm && normPhoneLoose(c.second_phone) === input.phoneNorm) return { field: 'second_phone', strong: false }
  if (input.secondPhoneNorm && (c.phone_norm === input.secondPhoneNorm || normPhoneLoose(c.second_phone) === input.secondPhoneNorm)) {
    return { field: 'second_phone', strong: false }
  }
  return null
}

function matchAccountField(a: AccountCandidate, input: RowMatchInput): { field: string; strong: boolean } | null {
  if (input.facebookId && a.facebook_id && a.facebook_id === input.facebookId) return { field: 'facebook_id', strong: true }
  if (input.phoneNorm && a.phone_norm && a.phone_norm === input.phoneNorm) return { field: 'phone_norm', strong: true }
  if (input.email && norm(a.email) === norm(input.email)) return { field: 'email', strong: true }
  if (input.email && norm(a.second_email) === norm(input.email)) return { field: 'second_email', strong: true }
  if (input.facebookUrl && a.facebook_url && a.facebook_url === input.facebookUrl) return { field: 'facebook_url', strong: true }
  if (input.phoneNorm && normPhoneLoose(a.second_phone) === input.phoneNorm) return { field: 'second_phone', strong: false }
  return null
}

/** התאמה חלשה לפי שם — לעולם אינה 'exact', ולעולם לא ל-Bulk (§9). */
function weakNameMatchContacts(pool: ContactCandidate[], input: RowMatchInput): ContactCandidate[] {
  const name = norm(input.contactNameRaw)
  if (!name || name.length < 3) return []
  return pool.filter((c) => {
    if (norm(c.display_name) !== name) return false
    // שם בלבד חלש מדי; רק שם+תפקיד או שם+עיר תואמים נחשבים "אפשרי"
    const roleOk = input.roleId != null && c.role === input.roleId
    const cityOk = input.cityId != null && c.city_id === input.cityId
    return roleOk || cityOk
  })
}

function weakNameMatchAccounts(pool: AccountCandidate[], input: RowMatchInput): AccountCandidate[] {
  const name = norm(input.orgNameRaw)
  if (!name || name.length < 3) return []
  return pool.filter((a) => {
    if (norm(a.account_name) !== name) return false
    return input.cityId != null && a.city_id === input.cityId
  })
}

/**
 * מתאים שורה אחת מול מאגר המועמדים שכבר נשלף (query מקובץ לכל האצווה).
 * pool.contacts/pool.accounts הם רק הרשומות הרלוונטיות לאצווה כולה —
 * לא כל הטבלה.
 */
export function matchRow(
  input: RowMatchInput,
  pool: { contacts: ContactCandidate[]; accounts: AccountCandidate[] },
): MatchResult {
  const strongContacts: { c: ContactCandidate; field: string }[] = []
  const weakContacts: { c: ContactCandidate; field: string }[] = []
  for (const c of pool.contacts) {
    const m = matchContactField(c, input)
    if (m) (m.strong ? strongContacts : weakContacts).push({ c, field: m.field })
  }

  const strongAccounts: { a: AccountCandidate; field: string }[] = []
  const weakAccounts: { a: AccountCandidate; field: string }[] = []
  for (const a of pool.accounts) {
    const m = matchAccountField(a, input)
    if (m) (m.strong ? strongAccounts : weakAccounts).push({ a, field: m.field })
  }

  const nameContacts = strongContacts.length === 0 && weakContacts.length === 0 ? weakNameMatchContacts(pool.contacts, input) : []
  const nameAccounts = strongAccounts.length === 0 && weakAccounts.length === 0 ? weakNameMatchAccounts(pool.accounts, input) : []

  const candidates: MatchCandidate[] = [
    ...strongContacts.map(({ c, field }) => ({ type: 'contact' as const, id: c.contact_id, field, label: c.display_name ?? `#${c.contact_id}`, confidence: 'exact' as MatchType })),
    ...weakContacts.map(({ c, field }) => ({ type: 'contact' as const, id: c.contact_id, field, label: c.display_name ?? `#${c.contact_id}`, confidence: 'probable' as MatchType })),
    ...nameContacts.map((c) => ({ type: 'contact' as const, id: c.contact_id, field: 'display_name', label: c.display_name ?? `#${c.contact_id}`, confidence: 'probable' as MatchType })),
    ...strongAccounts.map(({ a, field }) => ({ type: 'account' as const, id: a.account_id, field, label: a.account_name ?? `#${a.account_id}`, confidence: 'exact' as MatchType })),
    ...weakAccounts.map(({ a, field }) => ({ type: 'account' as const, id: a.account_id, field, label: a.account_name ?? `#${a.account_id}`, confidence: 'probable' as MatchType })),
    ...nameAccounts.map((a) => ({ type: 'account' as const, id: a.account_id, field: 'account_name', label: a.account_name ?? `#${a.account_id}`, confidence: 'probable' as MatchType })),
  ]

  const uniqueContactIds = new Set(candidates.filter((c) => c.type === 'contact').map((c) => c.id))
  const uniqueAccountIds = new Set(candidates.filter((c) => c.type === 'account').map((c) => c.id))

  // כמה התאמות מתחרות (לאותה ישות) — לא בוחרים אוטומטית, מוצגות כולן
  if (uniqueContactIds.size > 1 || uniqueAccountIds.size > 1) {
    return { matchContact: null, matchAccount: null, matchField: null, matchType: 'ambiguous', matchCandidates: candidates }
  }

  const bestContact = strongContacts[0] ?? weakContacts[0] ?? (nameContacts[0] ? { c: nameContacts[0], field: 'display_name' } : null)
  const bestAccount = strongAccounts[0] ?? weakAccounts[0] ?? (nameAccounts[0] ? { a: nameAccounts[0], field: 'account_name' } : null)

  if (!bestContact && !bestAccount) {
    return { matchContact: null, matchAccount: null, matchField: null, matchType: 'none', matchCandidates: [] }
  }

  const isExact = candidates.some((c) => c.confidence === 'exact')
  return {
    matchContact: bestContact?.c.contact_id ?? null,
    matchAccount: bestAccount?.a.account_id ?? null,
    matchField: bestContact?.field ?? bestAccount?.field ?? null,
    matchType: isExact ? 'exact' : 'probable',
    matchCandidates: candidates,
  }
}

/** ציר #2 (§3.2) — "מצב ההתאמה למאגר". מחושב מהשורה, לא נשמר כעמודה נפרדת. */
export function computeMatchStatus(row: {
  match_contact: number | null
  match_account: number | null
  match_type: MatchType | null
  last_action_id: number | null
}): MatchStatus {
  if (row.last_action_id != null) return 'already_linked'
  if (row.match_type === 'ambiguous') return 'multiple'
  const hasContact = row.match_contact != null
  const hasAccount = row.match_account != null
  if (hasContact && hasAccount) return 'both_found'
  if (hasContact) return 'contact_found'
  if (hasAccount) return 'account_found'
  return 'none'
}
