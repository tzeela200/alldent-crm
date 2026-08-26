/**
 * INC-3130 · HOME DENT — נכס בודד: קריאה וכתיבה.
 *
 * שלוש שאילתות נפרדות (נכס / מסלולים / תמונות) ולא JOIN אחד, כי כל אחת
 * משתנה בקצב אחר: עריכת מסלול לא צריכה לרענן את התמונות ולהיפך.
 *
 * מפתחות: ['dental-asset', <חלק>, id]. invalidate על ['dental-asset']
 * תופס את שלושתם — React Query משווה prefix לפי איבר במערך (INC-3116).
 * ה-invalidate מרענן גם את ['dental-assets'] של הרשימה, אחרת חוזרים
 * לרשימה ורואים סטטוס ישן.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/* ────────────────────────────── טיפוסים ────────────────────────────── */

export interface HdCta {
  id: string
  type: 'whatsapp' | 'phone' | 'email' | 'waze' | 'link' | 'lead_form'
  label: string
  target?: string
  style?: 'primary' | 'secondary'
  visible?: boolean
  mobile?: boolean
  desktop?: boolean
}

export interface HdPublicContact {
  mode?: 'owner' | 'alldent' | 'custom'
  contact_name?: string
  phone?: string
  whatsapp?: string
  email?: string
  waze?: string
  note?: string
}

export interface HdCardConfig {
  /** כותרת הכרטיס בלוח. חובה — שער הפרסום חוסם בלעדיה. */
  title?: string
  location?: string
  type_label?: string
  excerpt?: string
  highlights?: string[]
  tags?: string[]
  /** כותרות הדף עצמו. אם ריקות — הדף נופל לכותרת הכרטיס. */
  public_title?: string
  public_subtitle?: string
  public_description?: string
  og_title?: string
  og_description?: string
  og_image?: string
}

export interface DentalAsset {
  id: string
  asset_code: string
  source: string
  submission_snapshot: Record<string, unknown> | null
  workflow_status: string
  publication_state: string
  package_days: number | null
  screening_selected: boolean
  terms_version: string | null
  terms_accepted_at: string | null
  internal_title: string | null
  clinic_name: string | null
  account_id: number | null
  city_id: number | null
  region_id: number | null
  street: string | null
  street_number: string | null
  entrance: string | null
  floor: string | null
  area_sqm: number | null
  rooms_count: number | null
  units_count: number | null
  years_active: number | null
  asset_type: string | null
  clinic_type: string | null
  location_type: string | null
  client_notes: string | null
  accessibility_ids: number[]
  premises_feature_ids: number[]
  imaging_equipment_ids: number[]
  equipment_ids: number[]
  service_ids: number[]
  imaging_notes: string | null
  equipment_notes: string | null
  services_notes: string | null
  client_name: string | null
  client_business_name: string | null
  client_phone: string | null
  client_whatsapp: string | null
  client_email: string | null
  client_contact_notes: string | null
  published_fields: string[]
  card_config: HdCardConfig
  public_contact: HdPublicContact
  cta_buttons: HdCta[]
  first_published_at: string | null
  ends_at: string | null
  last_published_at: string | null
  current_version: number
  period_history: Array<Record<string, unknown>>
  admin_notes: string | null
  created_at: string
}

export interface DentalAssetOffer {
  id: string
  asset_id: string
  offer_type: 'sale' | 'rent_monthly' | 'rent_daily' | 'rent_shift'
  price_amount: number | null
  price_unit: string | null
  price_note: string | null
  available_from: string | null
  availability_note: string | null
  days: number[]
  hours: string | null
  included_note: string | null
  extra_costs_note: string | null
  terms_note: string | null
  sale_include_ids: number[]
  notes: string | null
  sort_order: number
  is_active: boolean
}

export interface DentalAssetImage {
  id: string
  asset_id: string
  private_path: string
  public_path: string | null
  original_filename: string | null
  mime_type: string | null
  byte_size: number | null
  sort_order: number
  is_published: boolean
  alt_text: string | null
  caption: string | null
  focal_x: number
  focal_y: number
}

/* ───────────────────── עמודות שמותר לכתוב אליהן ───────────────────── */

/**
 * ⚠️ whitelist ולא blacklist. שדה שאינו כאן פשוט לא נשלח.
 * `submission_snapshot` מוגן גם בטריגר (42501), אבל עדיף להיכשל כאן
 * בשקט מאשר לקבל שגיאת DB על ניסיון שלא היה צריך לקרות.
 * `asset_code`, `first_published_at`, `ends_at`, `current_version`
 * ו-`terms_accepted_at` נקבעים בשרת בלבד — לא ניתנים לעריכה מהמסך.
 */
const WRITABLE_COLUMNS = new Set([
  'workflow_status',
  'internal_title',
  'clinic_name',
  'account_id',
  'city_id',
  'street',
  'street_number',
  'entrance',
  'floor',
  'area_sqm',
  'rooms_count',
  'units_count',
  'years_active',
  'asset_type',
  'clinic_type',
  'location_type',
  'client_notes',
  'accessibility_ids',
  'premises_feature_ids',
  'imaging_equipment_ids',
  'equipment_ids',
  'service_ids',
  'imaging_notes',
  'equipment_notes',
  'services_notes',
  'client_name',
  'client_business_name',
  'client_phone',
  'client_whatsapp',
  'client_email',
  'client_contact_notes',
  'published_fields',
  'card_config',
  'public_contact',
  'cta_buttons',
  'admin_notes',
  'package_days',
  'screening_selected',
])

export function buildAssetPatch(input: Record<string, unknown>) {
  const patch: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input)) {
    if (WRITABLE_COLUMNS.has(key)) patch[key] = value
  }
  return patch
}

/* ────────────────────────────── שאילתות ────────────────────────────── */

export function useDentalAsset(assetCode: string | undefined) {
  return useQuery<DentalAsset | null>({
    queryKey: ['dental-asset', 'row', assetCode?.toUpperCase()],
    enabled: !!assetCode,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dental_assets')
        .select('*')
        .eq('asset_code', assetCode!.trim().toUpperCase())
        .maybeSingle()
      if (error) throw error
      if (!data) return null
      // העמודות jsonb יכולות לחזור null בשורות ישנות; הרכיבים מניחים אובייקט.
      return {
        ...(data as DentalAsset),
        card_config: (data.card_config ?? {}) as HdCardConfig,
        public_contact: (data.public_contact ?? {}) as HdPublicContact,
        cta_buttons: (data.cta_buttons ?? []) as HdCta[],
        published_fields: (data.published_fields ?? []) as string[],
        period_history: (data.period_history ?? []) as Array<Record<string, unknown>>,
      }
    },
  })
}

export function useDentalAssetOffers(assetId: string | undefined) {
  return useQuery<DentalAssetOffer[]>({
    queryKey: ['dental-asset', 'offers', assetId],
    enabled: !!assetId,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dental_asset_offers')
        .select('*')
        .eq('asset_id', assetId!)
        .order('sort_order')
      if (error) throw error
      return (data ?? []) as DentalAssetOffer[]
    },
  })
}

export function useDentalAssetImages(assetId: string | undefined) {
  return useQuery<DentalAssetImage[]>({
    queryKey: ['dental-asset', 'images', assetId],
    enabled: !!assetId,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dental_asset_images')
        .select('*')
        .eq('asset_id', assetId!)
        .order('sort_order')
      if (error) throw error
      return (data ?? []) as DentalAssetImage[]
    },
  })
}

export interface HdInquiry {
  id: string
  asset_code: string
  offer_label: string | null
  name: string
  phone: string
  email: string | null
  message: string | null
  status: string
  internal_note: string | null
  created_at: string
}

export function useDentalAssetInquiries(assetId: string | undefined) {
  return useQuery<HdInquiry[]>({
    queryKey: ['dental-asset', 'inquiries', assetId],
    enabled: !!assetId,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dental_asset_inquiries')
        .select('id,asset_code,offer_label,name,phone,email,message,status,internal_note,created_at')
        .eq('asset_id', assetId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as HdInquiry[]
    },
  })
}

/* ────────────────────────────── כתיבה ────────────────────────────── */

const PUBLIC_BUCKET = 'dental-assets-public'
const PRIVATE_BUCKET = 'dental-asset-submissions'

export function useDentalAssetDetailMutations(assetId: string | undefined) {
  const qc = useQueryClient()

  async function invalidate() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['dental-asset'] }),
      qc.invalidateQueries({ queryKey: ['dental-assets'] }),
    ])
  }

  /** RLS מחזיר הצלחה עם 0 שורות כשההרשאה חסרה — לכן select+בדיקת אורך. */
  async function saveAsset(patch: Record<string, unknown>) {
    if (!assetId) return { error: new Error('אין מזהה נכס') }
    const clean = buildAssetPatch(patch)
    if (!Object.keys(clean).length) return { error: null }
    const { data, error } = await supabase
      .from('dental_assets')
      .update(clean)
      .eq('id', assetId)
      .select('id')
    if (error) return { error }
    if (!data?.length) return { error: new Error('העדכון לא נשמר — ייתכן שאין הרשאה') }
    await invalidate()
    return { error: null }
  }

  async function saveOffer(offer: Partial<DentalAssetOffer> & { id?: string }) {
    if (!assetId) return { error: new Error('אין מזהה נכס') }
    const { id, ...rest } = offer
    const body = { ...rest, asset_id: assetId }
    const q = id
      ? supabase.from('dental_asset_offers').update(body).eq('id', id).select('id')
      : supabase.from('dental_asset_offers').insert(body).select('id')
    const { data, error } = await q
    if (error) return { error }
    if (!data?.length) return { error: new Error('המסלול לא נשמר') }
    await invalidate()
    return { error: null }
  }

  async function deleteOffer(id: string) {
    const { error } = await supabase.from('dental_asset_offers').delete().eq('id', id)
    if (!error) await invalidate()
    return { error }
  }

  /**
   * העלאת תמונה מהאדמין. נכנסת לדלי הפרטי כמו הגשת לקוח, כדי שכל
   * התמונות יעברו דרך אותה החלטה מפורשת של "לפרסם".
   */
  async function uploadImage(file: File, assetCode: string, nextSortOrder: number) {
    if (!assetId) return { error: new Error('אין מזהה נכס') }
    if (!file.type.startsWith('image/')) return { error: new Error('ניתן להעלות קובץ תמונה בלבד') }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `admin/${assetCode}/${crypto.randomUUID()}.${ext}`
    const up = await supabase.storage
      .from(PRIVATE_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false })
    if (up.error) return { error: up.error }

    const { data, error } = await supabase
      .from('dental_asset_images')
      .insert({
        asset_id: assetId,
        private_path: path,
        original_filename: file.name,
        mime_type: file.type,
        byte_size: file.size,
        sort_order: nextSortOrder,
      })
      .select('id')
    if (error) {
      // הרשומה נכשלה — לא משאירים קובץ יתום בדלי
      await supabase.storage.from(PRIVATE_BUCKET).remove([path])
      return { error }
    }
    if (!data?.length) return { error: new Error('התמונה לא נשמרה') }
    await invalidate()
    return { error: null }
  }

  async function updateImage(id: string, patch: Partial<DentalAssetImage>) {
    const { data, error } = await supabase
      .from('dental_asset_images')
      .update(patch)
      .eq('id', id)
      .select('id')
    if (error) return { error }
    if (!data?.length) return { error: new Error('העדכון לא נשמר') }
    await invalidate()
    return { error: null }
  }

  /**
   * סימון לפרסום. חייב להעתיק פיזית מהדלי הפרטי לדלי הציבורי לפני
   * העדכון — אילוץ hd_img_pubpath_ck דוחה is_published בלי public_path,
   * וזו בדיוק ההגנה מפני דף עם תמונות שבורות.
   *
   * ⚠️ אין העתקה חוצת-דליים ב-Storage API. לכן הורדה והעלאה מחדש.
   */
  async function publishImage(image: DentalAssetImage, assetCode: string) {
    if (image.public_path) {
      return updateImage(image.id, { is_published: true })
    }
    const dl = await supabase.storage.from(PRIVATE_BUCKET).download(image.private_path)
    if (dl.error) return { error: dl.error }

    const ext = image.private_path.split('.').pop()?.toLowerCase() || 'jpg'
    const target = `${assetCode}/${image.id}.${ext}`
    const up = await supabase.storage.from(PUBLIC_BUCKET).upload(target, dl.data, {
      contentType: image.mime_type ?? 'image/jpeg',
      upsert: true,
    })
    if (up.error) return { error: up.error }

    return updateImage(image.id, { public_path: target, is_published: true })
  }

  /** הסרה מפרסום. הקובץ הציבורי נמחק כדי שלא יישאר נגיש דרך URL ישיר. */
  async function unpublishImage(image: DentalAssetImage) {
    const res = await updateImage(image.id, { is_published: false, public_path: null })
    if (res.error) return res
    if (image.public_path) {
      await supabase.storage.from(PUBLIC_BUCKET).remove([image.public_path])
    }
    return { error: null }
  }

  async function deleteImage(image: DentalAssetImage) {
    const { error } = await supabase.from('dental_asset_images').delete().eq('id', image.id)
    if (error) return { error }
    await supabase.storage.from(PRIVATE_BUCKET).remove([image.private_path])
    if (image.public_path) {
      await supabase.storage.from(PUBLIC_BUCKET).remove([image.public_path])
    }
    await invalidate()
    return { error: null }
  }

  /**
   * שינוי סדר. `unique (asset_id, sort_order)` אינו DEFERRABLE, ולכן
   * כתיבה ישירה של הסדר החדש מתנגשת באמצע. שני שלבים: קודם דוחפים
   * הכול ל-+1000 (ה-CHECK מרשה כל מספר חיובי), ואז לערכים הסופיים.
   */
  async function reorderImages(ordered: DentalAssetImage[]) {
    for (const [i, img] of ordered.entries()) {
      const { error } = await supabase
        .from('dental_asset_images')
        .update({ sort_order: 1000 + i + 1 })
        .eq('id', img.id)
      if (error) return { error }
    }
    for (const [i, img] of ordered.entries()) {
      const { error } = await supabase
        .from('dental_asset_images')
        .update({ sort_order: i + 1 })
        .eq('id', img.id)
      if (error) return { error }
    }
    await invalidate()
    return { error: null }
  }

  async function preview() {
    if (!assetId) return { data: null, error: new Error('אין מזהה נכס') }
    const { data, error } = await supabase.rpc('preview_dental_asset', { p_asset_id: assetId })
    return { data, error }
  }

  async function saveInquiry(id: string, patch: { status?: string; internal_note?: string }) {
    const { data, error } = await supabase
      .from('dental_asset_inquiries')
      .update(patch)
      .eq('id', id)
      .select('id')
    if (error) return { error }
    if (!data?.length) return { error: new Error('העדכון לא נשמר') }
    await invalidate()
    return { error: null }
  }

  return {
    saveAsset,
    saveOffer,
    deleteOffer,
    uploadImage,
    updateImage,
    publishImage,
    unpublishImage,
    deleteImage,
    reorderImages,
    preview,
    saveInquiry,
    invalidate,
  }
}

/** URL חתום לצפייה בתמונה שעדיין בדלי הפרטי (שעה). */
export async function privateImageUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from(PRIVATE_BUCKET).createSignedUrl(path, 3600)
  return data?.signedUrl ?? null
}

export function publicImageUrl(path: string | null | undefined): string | null {
  if (!path) return null
  return supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(path).data.publicUrl
}
