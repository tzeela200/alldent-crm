import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface CityOption {
  id: number
  name: string
  region_id: number | null
}

/**
 * dict_cities מלא, מעומד. PostgREST חוסם כל בקשה בודדת ב-1000 שורות ובטבלה ~1300 —
 * שליפה לא מעומדת חותכת ערים בשקט (זה היה שורש INC-3113).
 *
 * משתמש באותו queryKey של שאר מסכי האדמין (`['dict_cities-all']`) כדי לחלוק cache
 * ולא לשלוף את המילון פעם נוספת.
 */
export function useInboxV2Cities() {
  return useQuery<CityOption[]>({
    queryKey: ['dict_cities-all'],
    queryFn: async () => {
      const PAGE = 1000
      const all: CityOption[] = []
      let from = 0
      for (;;) {
        const { data, error } = await supabase
          .from('dict_cities')
          .select('id,name,region_id')
          .order('name')
          .range(from, from + PAGE - 1)
        if (error) throw error
        const batch = (data ?? []) as CityOption[]
        if (!batch.length) break
        all.push(...batch)
        if (batch.length < PAGE) break
        from += PAGE
      }
      return all
    },
    staleTime: 5 * 60_000,
  })
}
