/**
 * INC-3130 · HOME DENT — ה-Allow-List: אילו נתונים מותר לפרסם.
 *
 * ⚠️ המפתחות כאן חייבים להיות זהים בדיוק למה שמופיע ב-
 * `hd_build_publication_payload` בצד ה-DB. מפתח שלא מוכר לפונקציה פשוט
 * לא ייכנס ל-payload — הסימון באדמין ייראה כאילו עבד, והשדה לא יתפרסם.
 * לכן הרשימה נגזרה מהפונקציה החיה (25 מפתחות) ולא נכתבה מהזיכרון.
 *
 * המשמעות: `published_fields` ריק ⇒ שום נתון מהנכס לא מגיע לציבור.
 * הכותרת, התקציר והתיאור אינם כאן בכוונה — הם מלל ש**את** כותבת ב-
 * `card_config`, ולכן הם מתפרסמים תמיד ואינם צריכים היתר.
 */

export interface HdPublishField {
  key: string
  label: string
  /** רמז למה השדה משפיע בפועל בדף הציבורי */
  hint?: string
}

export interface HdPublishGroup {
  key: string
  title: string
  note?: string
  fields: HdPublishField[]
}

export const HD_PUBLISH_GROUPS: HdPublishGroup[] = [
  {
    key: 'identity',
    title: 'זהות הנכס',
    fields: [
      { key: 'clinic_name', label: 'שם המרפאה', hint: 'חשיפת השם מבטלת פרסום דיסקרטי' },
      { key: 'asset_type', label: 'סוג הנכס' },
      { key: 'clinic_type', label: 'סוג המרפאה' },
    ],
  },
  {
    key: 'location',
    title: 'מיקום',
    note: 'ככל שמסמנים יותר — הכתובת מדויקת יותר. עיר בלבד שומרת על דיסקרטיות.',
    fields: [
      { key: 'city', label: 'עיר' },
      { key: 'region', label: 'אזור' },
      { key: 'street', label: 'רחוב' },
      { key: 'street_number', label: 'מספר בית' },
      { key: 'floor', label: 'קומה' },
      { key: 'entrance', label: 'כניסה' },
    ],
  },
  {
    key: 'facts',
    title: 'נתוני מפתח',
    note: 'מוצגים כשורת מספרים גדולה מתחת לתמונת השער.',
    fields: [
      { key: 'area_sqm', label: 'שטח' },
      { key: 'rooms_count', label: 'חדרי טיפול' },
      { key: 'units_count', label: 'יוניטים' },
      { key: 'years_active', label: 'ותק' },
    ],
  },
  {
    key: 'groups',
    title: 'ציוד ומאפיינים',
    note: 'כל קבוצה מתפרסמת בשלמותה, כולל הערת הטקסט שלה.',
    fields: [
      { key: 'accessibility', label: 'נגישות וסביבה' },
      { key: 'premises', label: 'מה קיים בנכס' },
      { key: 'imaging', label: 'ציוד דימות' },
      { key: 'equipment', label: 'ציוד ומכשור' },
      { key: 'services', label: 'שירותים ותשתיות' },
    ],
  },
  {
    key: 'offers',
    title: 'פרטי מסלולי העסקה',
    note: 'חל על כל המסלולים הפעילים יחד. מסלול עצמו מתפרסם תמיד — אלה הפרטים שבתוכו.',
    fields: [
      { key: 'price', label: 'מחיר', hint: 'בלי סימון יוצג רק מלל "הערת מחיר"' },
      { key: 'availability', label: 'זמינות ותאריך התחלה' },
      { key: 'days', label: 'ימים' },
      { key: 'hours', label: 'שעות' },
      { key: 'included', label: 'מה כלול' },
      { key: 'extra_costs', label: 'עלויות נוספות' },
      { key: 'terms', label: 'תנאים' },
    ],
  },
]

/** כל המפתחות התקפים, לוולידציה לפני שמירה. */
export const HD_ALL_PUBLISH_KEYS: readonly string[] = HD_PUBLISH_GROUPS.flatMap((g) =>
  g.fields.map((f) => f.key),
)

/**
 * הצעת ברירת מחדל לנכס חדש: מה שרוב הנכסים ירצו לפרסם, בלי הפרטים
 * שחושפים זהות או כתובת מדויקת. זו הצעה בלחיצת כפתור — לא ברירת מחדל
 * שקטה. `published_fields` נשאר ריק עד שמסמנים.
 */
export const HD_SUGGESTED_KEYS: readonly string[] = [
  'asset_type',
  'clinic_type',
  'city',
  'region',
  'area_sqm',
  'rooms_count',
  'units_count',
  'years_active',
  'accessibility',
  'premises',
  'imaging',
  'equipment',
  'services',
  'price',
  'availability',
  'days',
  'hours',
  'included',
]
