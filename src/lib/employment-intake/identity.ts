/**
 * זהות מאוחדת (§4, §7) — לוגיקה טהורה. ההתכנסות עצמה (יצירת/איחוד קבוצות,
 * שמירה בין אצוות וימים) מתבצעת ב-DB דרך resolve_employment_identity —
 * ראה useEmploymentIntakeIdentity.ts. הקובץ הזה רק גוזר את "מפתח הזהות"
 * לתצוגה/קיבוץ מתוך התוצאה שכבר נשמרה על השורה.
 */

import type { EmploymentIntakeRow, ResolvedIdentity } from '@/types/employment-intake'

/**
 * מפתח הזהות לקיבוץ (§4.5): contact_id כשידוע (הזהות הקנונית) אחרת
 * identity_group_id. שורה עם identity_conflict=true או בלי אף אחד מהשניים
 * אינה בעלת זהות — מוחזר null, ומוחרגת מכל פעולה גורפת.
 */
export function resolveRowIdentity(row: Pick<EmploymentIntakeRow, 'canonical_contact_id' | 'identity_group_id' | 'identity_conflict'>): ResolvedIdentity | null {
  if (row.identity_conflict) return null
  if (row.canonical_contact_id != null) {
    return { key: `c:${row.canonical_contact_id}`, contactId: row.canonical_contact_id, identityGroupId: row.identity_group_id }
  }
  if (row.identity_group_id) {
    return { key: `g:${row.identity_group_id}`, contactId: null, identityGroupId: row.identity_group_id }
  }
  return null
}

/** מקבץ שורות לפי זהות. שורות ללא זהות מוחזרות בנפרד (לא נכללות בקיבוץ). */
export function groupRowsByIdentity<T extends Pick<EmploymentIntakeRow, 'canonical_contact_id' | 'identity_group_id' | 'identity_conflict'>>(
  rows: T[],
): { groups: Map<string, { identity: ResolvedIdentity; rows: T[] }>; unidentified: T[] } {
  const groups = new Map<string, { identity: ResolvedIdentity; rows: T[] }>()
  const unidentified: T[] = []

  for (const row of rows) {
    const identity = resolveRowIdentity(row)
    if (!identity) {
      unidentified.push(row)
      continue
    }
    const existing = groups.get(identity.key)
    if (existing) existing.rows.push(row)
    else groups.set(identity.key, { identity, rows: [row] })
  }

  return { groups, unidentified }
}
