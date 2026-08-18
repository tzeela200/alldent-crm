import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { DictItem } from '@/types'

/**
 * `dict_genders` — המילון החי של `contact.gender` (FK אמיתי).
 * ערכים: 1 = נקבה · 2 = זכר.
 *
 * queryKey משותף (`['dict_genders']`) כדי שכל מסך שיצטרך אותו יחלוק cache
 * ולא ישלוף את אותו מילון שוב.
 */
export function useGenders() {
  return useQuery<DictItem[]>({
    queryKey: ['dict_genders'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dict_genders').select('id, name').order('id')
      if (error) throw new Error(`טעינת מילון המגדר נכשלה: ${error.message}`)
      return (data ?? []) as DictItem[]
    },
    staleTime: 10 * 60_000,
  })
}
