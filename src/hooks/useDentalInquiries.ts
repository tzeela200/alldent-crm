/**
 * INC-3130 · HOME DENT — פניות חוצות-נכסים. /admin/dental-assets/inquiries
 *
 * טבלת לידים פשוטה בכוונה (§67–70): סטטוס והערה פנימית, זהו. אין כאן
 * חוזה, סכום, עמלה או העברה אוטומטית — אלה הוצאו מהסקופ במפורש (§77).
 *
 * המסך של נכס בודד קורא את אותן שורות דרך useDentalAssetInquiries;
 * שניהם מתחת ל-['dental-asset'] ולכן invalidate אחד מרענן את שניהם.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface DentalInquiryRow {
  id: string
  asset_id: string
  asset_code: string
  offer_label: string | null
  name: string
  phone: string
  email: string | null
  message: string | null
  status: string
  internal_note: string | null
  source_url: string | null
  created_at: string
}

export interface InquiryFilters {
  search: string
  status: string
}

export const HD_INQ_PAGE_SIZE = 25
export const HD_INQ_EMPTY_FILTERS: InquiryFilters = { search: '', status: '' }

export function useDentalInquiries(filters: InquiryFilters, page: number) {
  return useQuery({
    queryKey: ['dental-asset', 'inquiries-list', { filters, page }],
    staleTime: 30_000,
    queryFn: async () => {
      let q = supabase
        .from('dental_asset_inquiries')
        .select(
          'id,asset_id,asset_code,offer_label,name,phone,email,message,status,internal_note,source_url,created_at',
          { count: 'exact' },
        )
        .order('created_at', { ascending: false })
        .range((page - 1) * HD_INQ_PAGE_SIZE, page * HD_INQ_PAGE_SIZE - 1)

      if (filters.status) q = q.eq('status', filters.status)

      const term = filters.search.trim()
      if (term) {
        // ילקוט קטן — or() על ארבעה שדות מספיק, אין צורך ב-full-text.
        q = q.or(
          `name.ilike.%${term}%,phone.ilike.%${term}%,asset_code.ilike.%${term}%,email.ilike.%${term}%`,
        )
      }

      const { data, count, error } = await q
      if (error) throw error
      return { rows: (data ?? []) as DentalInquiryRow[], total: count ?? 0 }
    },
  })
}

export function useDentalInquiryKpis() {
  return useQuery({
    queryKey: ['dental-asset', 'inquiries-kpis'],
    staleTime: 30_000,
    queryFn: async () => {
      const head = { count: 'exact' as const, head: true }
      const week = new Date(Date.now() - 7 * 864e5).toISOString()
      const [total, fresh, open, lastWeek] = await Promise.all([
        supabase.from('dental_asset_inquiries').select('id', head),
        supabase.from('dental_asset_inquiries').select('id', head).eq('status', 'new'),
        supabase
          .from('dental_asset_inquiries')
          .select('id', head)
          .in('status', ['in_progress', 'forwarded', 'waiting']),
        supabase.from('dental_asset_inquiries').select('id', head).gte('created_at', week),
      ])
      const bad = [total, fresh, open, lastWeek].find((r) => r.error)
      if (bad?.error) throw bad.error
      return {
        total: total.count ?? 0,
        fresh: fresh.count ?? 0,
        open: open.count ?? 0,
        lastWeek: lastWeek.count ?? 0,
      }
    },
  })
}

export function useDentalInquiryMutations() {
  const qc = useQueryClient()
  async function update(id: string, patch: { status?: string; internal_note?: string | null }) {
    const { data, error } = await supabase
      .from('dental_asset_inquiries')
      .update(patch)
      .eq('id', id)
      .select('id')
    if (error) return { error }
    if (!data?.length) return { error: new Error('העדכון לא נשמר — ייתכן שאין הרשאה') }
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['dental-asset'] }),
      qc.invalidateQueries({ queryKey: ['dental-assets'] }),
    ])
    return { error: null }
  }
  return { update }
}
