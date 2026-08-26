/**
 * INC-3130 · HOME DENT — קריאת הנכסים לצד הציבורי.
 *
 * קורא אך ורק מ-v_dental_asset_public. ה-view מחזיר snapshot שנבנה
 * ב-Publish, ולכן:
 *   1. עריכת טיוטה באדמין לא משנה את האתר עד Publish Update (§62).
 *   2. שדה שלא נבחר לפרסום פשוט לא קיים ב-payload ולא מגיע לדפדפן —
 *      גם באג בתצוגת React לא יכול לחשוף אותו (§73).
 *   3. פקיעה עובדת בלי cron: ה-WHERE של ה-view הוא מה שמייצר ציבוריות.
 *
 * ⚠️ אין כאן שאילתה ל-dental_assets. ל-anon אין עליה לא הרשאה ולא policy.
 */
import { supabase } from '@/lib/supabase'

const VIEW = 'v_dental_asset_public'

export interface PublicAssetImage {
  path: string
  alt?: string | null
  caption?: string | null
  focal_x?: number
  focal_y?: number
}

export interface PublicAssetOffer {
  id: string
  offer_type: 'sale' | 'rent_monthly' | 'rent_daily' | 'rent_shift'
  price_amount?: number | null
  price_unit?: string | null
  price_note?: string | null
  available_from?: string | null
  availability_note?: string | null
  days?: number[] | null
  hours?: string | null
  included_note?: string | null
  extra_costs_note?: string | null
  terms_note?: string | null
  sale_includes?: string[] | null
}

export interface PublicAssetCta {
  id?: string
  type: string
  label: string
  target?: string
  style?: 'primary' | 'secondary'
  visible?: boolean
  mobile?: boolean
  desktop?: boolean
}

export interface PublicAssetCard {
  asset_code: string
  title?: string
  location?: string
  type_label?: string
  excerpt?: string
  highlights?: string[]
  tags?: string[]
  image?: PublicAssetImage
  offer_types?: string[]
}

export interface PublicAssetPage {
  asset_code: string
  template: string
  title?: string
  subtitle?: string
  description?: string
  clinic_name?: string
  asset_type?: string
  clinic_type?: string
  location?: {
    city?: string
    region?: string
    street?: string
    street_number?: string
    floor?: string
    entrance?: string
    label?: string
  }
  facts?: Array<{ key: string; label: string; value: number | string; unit?: string }>
  groups?: Record<string, { label: string; items: string[]; note?: string }>
  offers?: PublicAssetOffer[]
  images?: PublicAssetImage[]
  contact?: Record<string, string>
  ctas?: PublicAssetCta[]
  seo?: { og_title?: string; og_description?: string; og_image?: string }
}

export interface PublicAssetRow {
  asset_code: string
  version_number: number
  public_card: PublicAssetCard
  public_page: PublicAssetPage
  published_at: string
  expires_at: string | null
}

/** הכרטיסים ללוח. הדף לא נשלף כאן — אין צורך בו לרשימה. */
export async function getPublicAssetCards(): Promise<PublicAssetCard[]> {
  const { data, error } = await supabase
    .from(VIEW)
    .select('asset_code,public_card,published_at')
    .order('published_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((r) => ({
    ...(r.public_card as PublicAssetCard),
    asset_code: r.asset_code as string,
  }))
}

/**
 * נכס בודד לפי קוד.
 * ⚠️ PostgREST משווה eq. בייט-בבייט ואין citext, ולכן חובה לנרמל את
 * הקוד מה-URL. בלי זה /dental-assets/hd0001 היה מחזיר "לא נמצא".
 */
export async function getPublicAssetByCode(code: string): Promise<PublicAssetRow | null> {
  const normalized = code.trim().toUpperCase()
  const { data, error } = await supabase
    .from(VIEW)
    .select('*')
    .eq('asset_code', normalized)
    .maybeSingle()
  if (error) throw error
  return (data as PublicAssetRow) ?? null
}

export async function submitAssetInquiry(input: {
  assetCode: string
  offerId?: string | null
  name: string
  phone: string
  email?: string | null
  message?: string | null
}) {
  const { data, error } = await supabase.rpc('submit_dental_asset_inquiry', {
    p_asset_code: input.assetCode,
    p_offer_id: input.offerId ?? null,
    p_name: input.name,
    p_phone: input.phone,
    p_email: input.email ?? null,
    p_message: input.message ?? null,
    p_source_url: window.location.href,
    p_consent: true,
  })
  if (error) throw error
  return Array.isArray(data) ? data[0] : data
}

/** URL ציבורי לתמונה מהדלי הציבורי. */
export function assetImageUrl(path: string | undefined): string | undefined {
  if (!path) return undefined
  return supabase.storage.from('dental-assets-public').getPublicUrl(path).data.publicUrl
}
