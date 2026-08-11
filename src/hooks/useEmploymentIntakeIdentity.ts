/**
 * שלב 7 של INC-3119: זהות מאוחדת נשמרת + מניעת חזרה — חלק ה-Supabase.
 * ההתכנסות עצמה רצה במסד (resolve_employment_identity, INC-3119) —
 * טרנזקציה אחת שבודקת את כל employment_intake ההיסטורי, לא רק את
 * האצווה הנוכחית, ושומרת identity_group_id שכבר קיים לשורה כדי שהרצה
 * חוזרת לא תיצור UUID חדש.
 */

import { supabase } from '@/lib/supabase'
import type { EmploymentIntakeAction, EmploymentIntakeRow } from '@/types/employment-intake'
import { supabaseError } from '@/lib/employment-intake/errors'

export interface ResolveIdentityStats {
  groups_created: number
  groups_merged: number
  conflicts: number
  no_identifier: number
  rows_resolved: number
}

/** קורא ל-resolve_employment_identity(p_import_id) — טרנזקציה אחת, ללא נגיעה בליבה. */
export async function resolveEmploymentIdentity(importId: string): Promise<ResolveIdentityStats> {
  const { data, error } = await supabase.rpc('resolve_employment_identity', { p_import_id: importId })
  if (error) throw supabaseError('התכנסות זהות נכשלה', error)
  return data as ResolveIdentityStats
}

/** שולף מחדש את שורות האצווה אחרי ההתכנסות, כדי לקבל identity_group_id/canonical_contact_id עדכניים. */
export async function fetchImportRows(importId: string): Promise<EmploymentIntakeRow[]> {
  const { data, error } = await supabase
    .from('employment_intake')
    .select('*')
    .eq('import_id', importId)
    .is('deleted_at', null)
    .order('id')
  if (error) throw supabaseError('טעינת שורות האצווה נכשלה', error)
  return (data ?? []) as EmploymentIntakeRow[]
}

/**
 * שולף פעולות רלוונטיות ל-repeatGuard, לפי רשימת contact_id ו/או
 * identity_group_id שנאספו מהשורות המוצגות. שאילתה מקובצת אחת —
 * לא לכל זהות בנפרד.
 */
export async function fetchActionsForIdentities(contactIds: number[], identityGroupIds: string[]): Promise<EmploymentIntakeAction[]> {
  if (contactIds.length === 0 && identityGroupIds.length === 0) return []

  const clauses: string[] = []
  if (contactIds.length) clauses.push(`contact_id.in.(${Array.from(new Set(contactIds)).join(',')})`)
  if (identityGroupIds.length) clauses.push(`identity_group_id.in.(${Array.from(new Set(identityGroupIds)).join(',')})`)

  const { data, error } = await supabase
    .from('employment_intake_action')
    .select('*')
    .or(clauses.join(','))
    .eq('result', 'done')
  if (error) throw supabaseError('טעינת היסטוריית פעולות נכשלה', error)
  return (data ?? []) as EmploymentIntakeAction[]
}
