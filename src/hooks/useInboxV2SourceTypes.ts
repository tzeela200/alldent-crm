import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { DictItem } from '@/types'

/**
 * מילון מקורות הקליטה של Inbox 2 (INC-3124).
 *
 * ⚠ הטבלה הנכונה היא `dict_source_types` ולא `dict_sources`.
 * `inbox_v2.source_type` ו-`inbox_import_batches.source_type` הם FK ל-
 * `dict_source_types` (אומת חי: inbox_v2_source_type_fkey).
 * `dict_sources` הוא מילון אחר לגמרי, של `contact.source` — שימוש בו כאן
 * ייתן שמות שגויים לחלוטין. אותה מלכודת מתועדת גם ב-
 * src/lib/employment-intake/contactSource.ts.
 *
 * עד INC-3124 הרשימה הייתה מוקשחת ב-inbox-v2-dicts.ts. היא במקרה תאמה
 * למסד, אבל כל הוספת מקור ב-DB לא הייתה מופיעה במסך עד build חדש.
 *
 * חולק queryKey עם מסך הקליטה התעסוקתית כדי לא לשלוף את אותו מילון פעמיים.
 */
export function useInboxV2SourceTypes() {
  return useQuery<DictItem[]>({
    queryKey: ['dict_source_types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dict_source_types')
        .select('id, name')
        .order('id')
      if (error) throw new Error(`טעינת מילון המקורות נכשלה: ${error.message}`)
      return (data ?? []) as DictItem[]
    },
    staleTime: 10 * 60_000,
  })
}
