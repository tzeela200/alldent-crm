/**
 * INC-3130 · HOME DENT — הגשת נכס מהטופס הציבורי.
 *
 * שני שלבים, בדיוק כמו ApplyModal עם candidate-cvs:
 *   1. התמונות עולות לדלי הפרטי תחת <submission_token>/…
 *      anon יכול להעלות ואינו יכול לקרוא, ולכן אין צורך בשורת טיוטה
 *      ואין upload-token RPC.
 *   2. קריאה אחת ל-RPC עם מטא-הדאטה של הקבצים.
 *
 * ה-RPC מאמת שכל נתיב יושב תחת ה-token שנשלח, אחרת אפשר היה לצרף
 * לבקשה קובץ שהועלה במקום אחר.
 *
 * ⚠️ terms_accepted_at אינו נשלח מכאן. השרת כותב now() בעצמו (החלטה 2).
 */
import { supabase } from '@/lib/supabase'
import type { HdOfferType } from '@/lib/homeDentOptions'

const BUCKET = 'dental-asset-submissions'
export const HD_MAX_IMAGES = 15
const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']

export interface HdOfferInput {
  offer_type: HdOfferType
  price_amount?: string | null
  available_from?: string | null
  availability_note?: string | null
  days?: number[]
  hours?: string | null
  included_note?: string | null
  extra_costs_note?: string | null
  terms_note?: string | null
  sale_include_ids?: number[]
  notes?: string | null
  sort_order?: number
}

export interface HdSubmissionInput {
  submissionToken: string
  /* שירות */
  packageDays: 60 | 90
  screening: boolean
  termsVersion: string
  /* נכס */
  clinicName: string | null
  cityId: number
  street: string | null
  streetNumber: string | null
  entrance: string | null
  floor: string | null
  areaSqm: number | null
  roomsCount: number | null
  unitsCount: number | null
  yearsActive: number | null
  assetType: string
  clinicType: string | null
  locationType: string | null
  clientNotes: string | null
  /* מילון */
  accessibilityIds: number[]
  premisesIds: number[]
  imagingIds: number[]
  equipmentIds: number[]
  serviceIds: number[]
  imagingNotes: string | null
  equipmentNotes: string | null
  servicesNotes: string | null
  /* עסקאות ותמונות */
  offers: HdOfferInput[]
  files: File[]
  /* לקוח */
  clientName: string
  clientBusinessName: string | null
  clientPhone: string
  clientWhatsapp: string | null
  clientEmail: string | null
  clientContactNotes: string | null
}

export interface HdSubmissionResult {
  status: string
  asset_code: string
  asset_id: string
}

export function validateHdImage(file: File): string | null {
  if (!ALLOWED.includes(file.type)) return `${file.name}: סוג הקובץ אינו נתמך. נדרש JPG, PNG או WEBP.`
  if (file.size > MAX_BYTES) return `${file.name}: הקובץ גדול מ-10MB.`
  return null
}

/** מזהה ההגשה. אינו סוד — הוא לא מעניק שום גישה, רק מקבץ קבצים. */
export function newSubmissionToken(): string {
  return crypto.randomUUID()
}

export async function submitDentalAsset(input: HdSubmissionInput): Promise<HdSubmissionResult> {
  if (input.files.length > HD_MAX_IMAGES) {
    throw new Error('too_many_images')
  }

  // 1. העלאת התמונות לדלי הפרטי
  const images: Array<Record<string, unknown>> = []
  for (const file of input.files) {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${input.submissionToken}/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false })
    if (error) throw error
    images.push({
      private_path: path,
      original_filename: file.name,
      mime_type: file.type,
      byte_size: file.size,
    })
  }

  // 2. קריאה אחת. הכל או כלום — ה-RPC כותב נכס, מסלולים ותמונות בטרנזקציה.
  const { data, error } = await supabase.rpc('submit_public_dental_asset', {
    p_submission_token: input.submissionToken,
    p_client_name: input.clientName,
    p_client_business_name: input.clientBusinessName,
    p_client_phone: input.clientPhone,
    p_client_whatsapp: input.clientWhatsapp,
    p_client_email: input.clientEmail,
    p_client_contact_notes: input.clientContactNotes,
    p_clinic_name: input.clinicName,
    p_city_id: input.cityId,
    p_street: input.street,
    p_street_number: input.streetNumber,
    p_entrance: input.entrance,
    p_floor: input.floor,
    p_area_sqm: input.areaSqm,
    p_rooms_count: input.roomsCount,
    p_units_count: input.unitsCount,
    p_years_active: input.yearsActive,
    p_asset_type: input.assetType,
    p_clinic_type: input.clinicType,
    p_location_type: input.locationType,
    p_client_notes: input.clientNotes,
    p_accessibility_ids: input.accessibilityIds,
    p_premises_feature_ids: input.premisesIds,
    p_imaging_equipment_ids: input.imagingIds,
    p_equipment_ids: input.equipmentIds,
    p_service_ids: input.serviceIds,
    p_imaging_notes: input.imagingNotes,
    p_equipment_notes: input.equipmentNotes,
    p_services_notes: input.servicesNotes,
    p_offers: input.offers,
    p_images: images,
    p_package_days: input.packageDays,
    p_screening: input.screening,
    p_terms_version: input.termsVersion,
    p_terms_accepted: true,
    p_source_page: window.location.pathname,
    p_source_url: window.location.href,
  })

  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  return row as HdSubmissionResult
}
