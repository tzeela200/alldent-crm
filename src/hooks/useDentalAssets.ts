/**
 * INC-3130 · HOME DENT — נתוני האדמין.
 *
 * קורא מ-v_dental_assets_admin: ה-view כבר עושה את ה-joins לעיר, לאזור
 * ולארגון, מרכיב את רשימת סוגי העסקה, סופר פניות ומחשב days_remaining.
 * days_remaining חייב להגיע מה-DB ולא מהדפדפן — now() בצד לקוח היה נותן
 * תשובה שונה לכל משתמש לפי אזור הזמן שלו.
 *
 * מפתחות ה-query הם מערכים בשלושה חלקים: invalidateQueries על
 * ['dental-assets'] תופס גם ['dental-assets','row',id] כי React Query
 * משווה prefix לפי איבר במערך ולא כמחרוזת (INC-3116).
 */
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface DentalAssetRow {
  id: string
  asset_code: string
  internal_title: string | null
  clinic_name: string | null
  asset_type: string | null
  workflow_status: string
  publication_state: string
  package_days: number | null
  screening_selected: boolean
  city_id: number | null
  city_name: string | null
  region_id: number | null
  region_name: string | null
  account_id: number | null
  account_name: string | null
  created_at: string
  first_published_at: string | null
  ends_at: string | null
  current_version: number
  offer_types: string | null
  new_inquiries: number
  total_inquiries: number
  days_remaining: number | null
}

export interface DentalAssetFilters {
  search: string
  workflow: string
  publication: string
  packageDays: string
  screening: string
}

export const HD_PAGE_SIZE = 25

export const HD_EMPTY_FILTERS: DentalAssetFilters = {
  search: '',
  workflow: '',
  publication: '',
  packageDays: '',
  screening: '',
}

export function useDentalAssets(
  filters: DentalAssetFilters,
  page: number,
  sortBy = 'created_at',
  sortDir: 'asc' | 'desc' = 'desc',
) {
  return useQuery({
    queryKey: ['dental-assets', 'list', { filters, page, sortBy, sortDir }],
    staleTime: 30_000,
    queryFn: async () => {
      let q = supabase
        .from('v_dental_assets_admin')
        .select('*', { count: 'exact' })
        .order(sortBy, { ascending: sortDir === 'asc' })
        .range((page - 1) * HD_PAGE_SIZE, page * HD_PAGE_SIZE - 1)

      if (filters.workflow) q = q.eq('workflow_status', filters.workflow)
      if (filters.publication) q = q.eq('publication_state', filters.publication)
      if (filters.packageDays) q = q.eq('package_days', Number(filters.packageDays))
      if (filters.screening) q = q.eq('screening_selected', filters.screening === 'yes')

      const term = filters.search.trim()
      if (term) {
        // הטבלה קטנה ואין כאן צורך ב-full-text. or() על שלושה שדות מספיק.
        q = q.or(
          `asset_code.ilike.%${term}%,internal_title.ilike.%${term}%,clinic_name.ilike.%${term}%,city_name.ilike.%${term}%`,
        )
      }

      const { data, count, error } = await q
      if (error) throw error
      return { rows: (data ?? []) as DentalAssetRow[], total: count ?? 0 }
    },
  })
}

export interface DentalAssetKpis {
  total: number
  inProgress: number
  published: number
  expiringSoon: number
  newInquiries: number
}

export function useDentalAssetKpis() {
  return useQuery<DentalAssetKpis>({
    queryKey: ['dental-assets', 'kpis'],
    staleTime: 30_000,
    queryFn: async () => {
      const head = { count: 'exact' as const, head: true }
      const soon = new Date(Date.now() + 30 * 864e5).toISOString()

      const [total, inProgress, published, expiring, leads] = await Promise.all([
        supabase.from('dental_assets').select('id', head),
        supabase.from('dental_assets').select('id', head)
          .in('workflow_status', ['new', 'in_progress', 'waiting_material']),
        supabase.from('dental_assets').select('id', head).eq('publication_state', 'published'),
        supabase.from('dental_assets').select('id', head)
          .eq('publication_state', 'published').lte('ends_at', soon),
        supabase.from('dental_asset_inquiries').select('id', head).eq('status', 'new'),
      ])

      const first = [total, inProgress, published, expiring, leads].find((r) => r.error)
      if (first?.error) throw first.error

      return {
        total: total.count ?? 0,
        inProgress: inProgress.count ?? 0,
        published: published.count ?? 0,
        expiringSoon: expiring.count ?? 0,
        newInquiries: leads.count ?? 0,
      }
    },
  })
}

export function useDentalAssetMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ['dental-assets'] })

  /**
   * כל כתיבה מחזירה את המזהה ובודקת שחזרה שורה.
   * RLS מחזיר "הצלחה" עם 0 שורות כשההרשאה חסרה, ובלי הבדיקה הזו
   * העדכון נראה כאילו עבר.
   */
  async function updateAsset(id: string, patch: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('dental_assets')
      .update(patch)
      .eq('id', id)
      .select('id')
    if (error) return { error }
    if (!data?.length) {
      return { error: new Error('העדכון לא נשמר — ייתכן שהרשומה לא קיימת או שאין הרשאה') }
    }
    await invalidate()
    return { error: null }
  }

  async function publish(id: string) {
    const { error } = await supabase.rpc('publish_dental_asset', { p_asset_id: id })
    if (!error) await invalidate()
    return { error }
  }

  async function publishUpdate(id: string) {
    const { error } = await supabase.rpc('publish_dental_asset_update', { p_asset_id: id })
    if (!error) await invalidate()
    return { error }
  }

  async function unpublish(id: string, reason?: string) {
    const { error } = await supabase.rpc('unpublish_dental_asset', {
      p_asset_id: id,
      p_reason: reason ?? null,
    })
    if (!error) await invalidate()
    return { error }
  }

  async function extend(id: string, newEndsAt: string, reason?: string) {
    const { error } = await supabase.rpc('extend_dental_asset', {
      p_asset_id: id,
      p_new_ends_at: newEndsAt,
      p_reason: reason ?? null,
    })
    if (!error) await invalidate()
    return { error }
  }

  return { updateAsset, publish, publishUpdate, unpublish, extend, invalidate }
}
