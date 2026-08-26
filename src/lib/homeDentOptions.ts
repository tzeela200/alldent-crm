/**
 * INC-3130 · HOME DENT — ערכי בחירה יחידה ותרגומם לעברית.
 *
 * הערכים כאן תואמים בדיוק ל-CHECK constraints ב-Supabase. אלה אינם מילון:
 * הקוד מסתעף עליהם (למשל price_unit נגזר מ-offer_type), ולכן הם נעולים
 * בסכמה ולא ניתנים לעריכה מהאדמין.
 *
 * המילון החי — ציוד, שירותים, נגישות, מאפיינים — מגיע מ-dict_dental_options
 * דרך useDentalAssetOptions.
 */

export const HD_ASSET_TYPES = [
  { value: 'clinic_full', label: 'מרפאת שיניים מלאה' },
  { value: 'treatment_room', label: 'חדר / חדרי טיפול' },
  { value: 'lab', label: 'מעבדה דנטלית' },
  { value: 'imaging_center', label: 'מכון צילום והדמיה' },
  { value: 'business', label: 'פעילות עסקית של מרפאה' },
  { value: 'other', label: 'אחר' },
] as const

export const HD_CLINIC_TYPES = [
  { value: 'private', label: 'פרטית' },
  { value: 'corporate', label: 'תאגידית' },
  { value: 'other', label: 'אחר' },
] as const

export const HD_LOCATION_TYPES = [
  { value: 'residential', label: 'אזור מגורים' },
  { value: 'office_building', label: 'בניין משרדים' },
  { value: 'mall', label: 'מרכז מסחרי / קניון' },
  { value: 'medical_center', label: 'מרכז רפואי' },
  { value: 'other', label: 'אחר' },
] as const

export type HdOfferType = 'sale' | 'rent_monthly' | 'rent_daily' | 'rent_shift'

export const HD_OFFER_TYPES: ReadonlyArray<{
  value: HdOfferType
  label: string
  hint: string
  /** תווית יחידת המחיר בעברית. ה-DB גוזר את price_unit לבד מ-offer_type. */
  priceLabel: string
}> = [
  {
    value: 'sale',
    label: 'מכירה',
    hint: 'מכירת המרפאה, הפעילות או הנכס',
    priceLabel: 'מחיר מבוקש (₪)',
  },
  {
    value: 'rent_monthly',
    label: 'שכירות חודשית',
    hint: 'תקופה מתמשכת, מחיר לחודש',
    priceLabel: 'מחיר לחודש (₪)',
  },
  {
    value: 'rent_daily',
    label: 'השכרה יומית',
    hint: 'ימים בודדים בשבוע, מחיר ליום',
    priceLabel: 'מחיר ליום (₪)',
  },
  {
    value: 'rent_shift',
    label: 'לפי משמרת',
    hint: 'בוקר או אחר הצהריים, מחיר למשמרת',
    priceLabel: 'מחיר למשמרת (₪)',
  },
]

/** 0=ראשון … 6=שבת, תואם ל-CHECK על days ב-dental_asset_offers. */
export const HD_WEEKDAYS = [
  { value: 0, label: 'ראשון' },
  { value: 1, label: 'שני' },
  { value: 2, label: 'שלישי' },
  { value: 3, label: 'רביעי' },
  { value: 4, label: 'חמישי' },
  { value: 5, label: 'שישי' },
  { value: 6, label: 'שבת' },
] as const

export const HD_AVAILABILITY = ['מיידית', 'בתיאום', 'ממועד עתידי'] as const
export const HD_SHIFTS = ['בוקר', 'אחר הצהריים', 'בוקר ואחר הצהריים', 'גמיש'] as const

/** קבוצות המילון החי. group_key ב-dict_dental_options. */
export const HD_OPTION_GROUPS = {
  accessibility: 'נגישות וסביבה',
  premises: 'מה קיים בנכס',
  imaging: 'ציוד דימות',
  equipment: 'ציוד ומכשור',
  services: 'שירותים ותשתיות',
  sale_includes: 'מה כלול במכירה',
} as const

export type HdOptionGroup = keyof typeof HD_OPTION_GROUPS

/**
 * מיפוי קודי השגיאה של ה-RPC לעברית.
 *
 * ⚠️ הקודים בצד ה-DB תוכננו כך שאף אחד אינו תת-מחרוזת של אחר, כי הממפה
 * הזה עובד ב-includes() ולא בהתאמה מדויקת — בדיוק כמו ApplyModal.
 * הוספת קוד חדש חייבת לשמור על התכונה הזו.
 */
export const HD_RPC_ERRORS: Record<string, string> = {
  terms_were_not_accepted: 'יש לאשר את תנאי השירות לפני השליחה.',
  client_name_is_missing: 'נא למלא שם מלא.',
  client_phone_is_invalid: 'מספר הנייד אינו תקין. נדרש מספר נייד ישראלי.',
  package_days_invalid: 'תקופת הפרסום שנבחרה אינה תקינה. חזרו לעמוד המסלולים.',
  city_was_not_found: 'נא לבחור עיר מהרשימה.',
  asset_type_missing: 'נא לבחור סוג נכס.',
  duplicate_recent_request: 'כבר קיבלנו בקשה עבור הנכס הזה בשעות האחרונות. נחזור אליכם בהקדם.',
  unknown_dictionary_id: 'אחת הבחירות אינה זמינה יותר. רעננו את העמוד ונסו שוב.',
  offers_list_is_empty: 'נא לבחור לפחות סוג עסקה אחד.',
  offer_type_is_invalid: 'סוג עסקה שנבחר אינו תקין.',
  too_many_images: 'ניתן לצרף עד 15 תמונות.',
  image_path_outside_token: 'אירעה תקלה בהעלאת התמונות. רעננו את העמוד ונסו שוב.',
}

export function hdErrorToHebrew(raw: unknown): string {
  const message = raw instanceof Error ? raw.message : String(raw ?? '')
  for (const key of Object.keys(HD_RPC_ERRORS)) {
    if (message.includes(key)) return HD_RPC_ERRORS[key]
  }
  return 'אירעה שגיאה בשליחת הבקשה. אנא נסו שנית.'
}
