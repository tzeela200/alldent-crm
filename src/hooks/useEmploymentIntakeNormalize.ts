/**
 * שלב 5 של INC-3119: חילוץ, נרמול וייחוס טלפון — חלק ה-Supabase (RPC).
 * הלוגיקה הטהורה (זיהוי מועמד עיר, הכרעת ייחוס טלפון) נמצאת ב-
 * src/lib/employment-intake/normalize.ts; כאן רק קריאות RPC וטעינת
 * מדד הערים לזיהוי מועמדים.
 *
 * שמות הפרמטרים אומתו חי מול Supabase (pg_proc):
 *   detect_role_from_text(p_text text) · resolve_city(input_city text) ·
 *   normalize_il_mobile_phone(input_phone text)
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { CityIndexEntry } from '@/lib/employment-intake/normalize'

const PAGE = 1000

/**
 * dict_cities כולל aliases — לזיהוי מועמד עיר בטקסט חופשי (normalize.ts).
 * עוקף את תקרת ה-1000 שורות של PostgREST, כמו useApplicationDicts/cities.
 */
export function useCityIndex() {
  return useQuery({
    queryKey: ['employment-intake-city-index'],
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<CityIndexEntry[]> => {
      const all: CityIndexEntry[] = []
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from('dict_cities')
          .select('id, name, normalized_name, aliases, region_id')
          .range(from, from + PAGE - 1)
        if (error) throw new Error(`טעינת מדד ערים נכשלה: ${error.message}`)
        const batch = (data ?? []).map((r) => ({
          id: r.id as number,
          name: (r.name as string) ?? '',
          normalizedName: (r.normalized_name as string) ?? '',
          aliases: (r.aliases as string[] | null) ?? [],
          regionId: r.region_id as number | null,
        }))
        all.push(...batch)
        if (batch.length < PAGE) break
      }
      return all
    },
  })
}

export interface RoleDetection {
  roleId: number
  roleName: string
  matchedAlias: string
  confidence: string
}

/** detect_role_from_text — סורק את הטקסט המלא בעצמו (אומת חי). מחזיר null אם לא נמצא. */
export async function detectRole(text: string): Promise<RoleDetection | null> {
  const { data, error } = await supabase.rpc('detect_role_from_text', { p_text: text })
  if (error) throw new Error(`זיהוי תפקיד נכשל: ${error.message}`)
  const row = (data ?? [])[0]
  if (!row) return null
  return { roleId: row.role_id, roleName: row.role_name, matchedAlias: row.matched_alias, confidence: row.confidence }
}

export interface CityResolution {
  cityId: number
  cityName: string
  regionId: number | null
  regionName: string | null
}

/** resolve_city — דורש מועמד מבודד (לא משפט שלם). ראה normalize.ts. */
export async function resolveCityCandidate(candidate: string): Promise<CityResolution | null> {
  const { data, error } = await supabase.rpc('resolve_city', { input_city: candidate })
  if (error) throw new Error(`נרמול עיר נכשל: ${error.message}`)
  const row = (data ?? [])[0]
  if (!row) return null
  return { cityId: row.city_id, cityName: row.city_name, regionId: row.region_id ?? null, regionName: row.region_name ?? null }
}

/** normalize_il_mobile_phone — מחזיר 9725XXXXXXXX או null. */
export async function normalizePhoneRpc(raw: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('normalize_il_mobile_phone', { input_phone: raw })
  if (error) throw new Error(`נרמול טלפון נכשל: ${error.message}`)
  return (data as string | null) ?? null
}

/** מנרמל אצווה של טלפונים גולמיים ייחודיים בבת אחת (Promise.all, לא לולאה סדרתית). */
export async function normalizePhonesBatch(rawPhones: string[]): Promise<Map<string, string | null>> {
  const unique = Array.from(new Set(rawPhones))
  const results = await Promise.all(unique.map((raw) => normalizePhoneRpc(raw)))
  return new Map(unique.map((raw, i) => [raw, results[i]]))
}

/** מנרמל אצווה של מועמדי ערים ייחודיים בבת אחת. */
export async function resolveCitiesBatch(candidates: string[]): Promise<Map<string, CityResolution | null>> {
  const unique = Array.from(new Set(candidates))
  const results = await Promise.all(unique.map((c) => resolveCityCandidate(c)))
  return new Map(unique.map((c, i) => [c, results[i]]))
}
