/**
 * Hooks לקריאת נתונים עבור מסך "קליטה ומיון תעסוקתי" (INC-3119).
 * דפוס זהה לשאר האדמין: React Query, staleTime לפי יציבות הדיקט,
 * אין supabase.from() בתוך רכיבי UI — הכול דרך הקובץ הזה.
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { supabaseError } from '@/lib/employment-intake/errors'

export const EMPLOYMENT_INTAKE_KEYS = {
  dicts: ['employment-intake-dicts'] as const,
  duplicateFile: (hash: string) => ['employment-intake-duplicate-file', hash] as const,
}

export interface DictRow {
  id: number
  name: string
}

/** dict_source_types (מקור הקלט) + dict_social_statuses (סטטוס ליד) — שני מילונים ייעודיים למסך הזה. */
export function useEmploymentIntakeDicts() {
  return useQuery({
    queryKey: EMPLOYMENT_INTAKE_KEYS.dicts,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const [sourceTypes, socialStatuses] = await Promise.all([
        supabase.from('dict_source_types').select('id, name').order('id'),
        supabase.from('dict_social_statuses').select('id, name').order('id'),
      ])
      if (sourceTypes.error) throw supabaseError('טעינת מילון מקורות נכשלה', sourceTypes.error)
      if (socialStatuses.error) throw supabaseError('טעינת מילון סטטוס ליד נכשלה', socialStatuses.error)
      return {
        sourceTypes: (sourceTypes.data ?? []) as DictRow[],
        socialStatuses: (socialStatuses.data ?? []) as DictRow[],
      }
    },
  })
}

/** בדיקה — האם קובץ בעל אותו Hash כבר נקלט בעבר (§3.1: "אזהרת הקובץ כבר נקלט"). */
export function useDuplicateFileCheck(fileHash: string | null) {
  return useQuery({
    queryKey: EMPLOYMENT_INTAKE_KEYS.duplicateFile(fileHash ?? ''),
    enabled: !!fileHash,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employment_intake')
        .select('id, import_id, ingested_at')
        .eq('file_hash', fileHash!)
        .is('deleted_at', null)
        .limit(1)
        .maybeSingle()
      if (error) throw supabaseError('בדיקת קובץ כפול נכשלה', error)
      return data
    },
  })
}
