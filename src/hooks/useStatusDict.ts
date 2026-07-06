import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { STATUS_DICT_TABLE, type StatusType } from '@/lib/statusColors'

// טוען מילון סטטוס חי (id→name) לפי סוג, עם cache. מקור ה-Label האמיתי —
// כך שאם שם סטטוס משתנה ב-Supabase, ה-UI מתעדכן לבד. לכל סוג query key נפרד.
export function useStatusDict(statusType: StatusType) {
  return useQuery({
    queryKey: ['status-dict', statusType],
    queryFn: async (): Promise<Map<number, string>> => {
      const { data, error } = await supabase
        .from(STATUS_DICT_TABLE[statusType])
        .select('id, name')
        .order('id')
      if (error) throw error
      const map = new Map<number, string>()
      ;(data ?? []).forEach((r: { id: number; name: string }) => map.set(Number(r.id), r.name))
      return map
    },
    staleTime: 10 * 60_000,
  })
}
