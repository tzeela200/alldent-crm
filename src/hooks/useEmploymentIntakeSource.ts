import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { supabaseError } from '@/lib/employment-intake/errors'
import type { ContentType } from '@/types/employment-intake'

export interface IntakeSourceMessage {
  id: number
  import_id: string
  source_seq: number | null
  source_published_at: string | null
  sender_name: string | null
  sender_phone: string | null
  original_text: string
  content_type: ContentType
  tags: string[]
}

/**
 * משחזר את רצף ההודעות שנשמר לאותו import לצורך פאנל המקור.
 * אין כתיבה ואין Parsing חדש; original_text מוצג בדיוק כפי שנשמר.
 */
export function useEmploymentIntakeSource(importId: string | null) {
  return useQuery({
    queryKey: ['employment-intake-source', importId],
    enabled: !!importId,
    staleTime: 60_000,
    queryFn: async (): Promise<IntakeSourceMessage[]> => {
      const { data, error } = await supabase
        .from('employment_intake')
        .select('id, import_id, source_seq, source_published_at, sender_name, sender_phone, original_text, content_type, tags')
        .eq('import_id', importId!)
        .is('deleted_at', null)
        .order('source_seq', { ascending: true, nullsFirst: false })
        .order('id', { ascending: true })
      if (error) throw supabaseError('טעינת מקור השיחה נכשלה', error)
      return (data ?? []) as IntakeSourceMessage[]
    },
  })
}
