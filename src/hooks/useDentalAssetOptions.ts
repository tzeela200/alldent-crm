/**
 * INC-3130 · HOME DENT — המילון החי מ-dict_dental_options.
 *
 * שאילתה אחת שמחזירה את כל שש הקבוצות, בדפוס useApplicationDicts:
 * שגיאה נחשפת ולא מוחלפת במערך ריק, כי מערך ריק היה מציג טופס בלי
 * אף אפשרות בחירה ונראה כמו באג בתוכן ולא כמו תקלת רשת.
 *
 * המילון קטן (72 שורות), ולכן אין כאן לולאת range כמו ב-dict_cities.
 */
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { HdOptionGroup } from '@/lib/homeDentOptions'

export interface HdOption {
  id: number
  group_key: HdOptionGroup
  name: string
  sort_order: number
}

export type HdOptionsByGroup = Record<HdOptionGroup, HdOption[]>

const EMPTY: HdOptionsByGroup = {
  accessibility: [],
  premises: [],
  imaging: [],
  equipment: [],
  services: [],
  sale_includes: [],
}

export function useDentalAssetOptions() {
  return useQuery<HdOptionsByGroup>({
    queryKey: ['dental-asset-options'],
    staleTime: 600_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dict_dental_options')
        .select('id,group_key,name,sort_order')
        .eq('is_active', true)
        .order('sort_order')
      if (error) throw error

      const grouped: HdOptionsByGroup = { ...EMPTY }
      for (const key of Object.keys(grouped) as HdOptionGroup[]) grouped[key] = []
      for (const row of (data ?? []) as HdOption[]) {
        if (grouped[row.group_key]) grouped[row.group_key].push(row)
      }
      return grouped
    },
  })
}
