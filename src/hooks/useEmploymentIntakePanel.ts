/**
 * שלב 10 של INC-3119: פאנל הפירוט (§3.6) — שליפת נתוני-עזר לשורה שנבחרה:
 * היסטוריית הפעולות של הזהות (מקטע ה') וכל ההופעות האחרות של אותה זהות
 * (מקטע ג' — "כל ההופעות של אותה זהות"). שתי שאילתות ממוקדות, לא סריקה.
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { fetchActionsForIdentities } from '@/hooks/useEmploymentIntakeIdentity'
import type { EmploymentIntakeRow } from '@/types/employment-intake'

export function useIntakeActionHistory(canonicalContactId: number | null, identityGroupId: string | null) {
  return useQuery({
    queryKey: ['employment-intake-action-history', canonicalContactId, identityGroupId],
    enabled: canonicalContactId != null || identityGroupId != null,
    queryFn: () =>
      fetchActionsForIdentities(canonicalContactId != null ? [canonicalContactId] : [], identityGroupId != null ? [identityGroupId] : []),
  })
}

/** כל ההופעות האחרות של אותה זהות (identity_group_id או canonical_contact_id) — §3.6 מקטע ג'. */
export function useIntakeIdentityOccurrences(rowId: number, canonicalContactId: number | null, identityGroupId: string | null) {
  return useQuery({
    queryKey: ['employment-intake-identity-occurrences', rowId, canonicalContactId, identityGroupId],
    enabled: canonicalContactId != null || identityGroupId != null,
    queryFn: async (): Promise<EmploymentIntakeRow[]> => {
      const clauses: string[] = []
      if (canonicalContactId != null) clauses.push(`canonical_contact_id.eq.${canonicalContactId}`)
      if (identityGroupId) clauses.push(`identity_group_id.eq.${identityGroupId}`)
      const { data, error } = await supabase
        .from('employment_intake')
        .select('*')
        .or(clauses.join(','))
        .neq('id', rowId)
        .is('deleted_at', null)
        .order('ingested_at', { ascending: false })
      if (error) throw new Error(`טעינת הופעות הזהות נכשלה: ${error.message}`)
      return (data ?? []) as EmploymentIntakeRow[]
    },
  })
}
