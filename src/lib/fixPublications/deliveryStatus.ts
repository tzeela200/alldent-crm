/**
 * מיפוי סטטוסי שליחת WhatsApp שמגיעים מדוחות Fix Digital.
 *
 * המיפוי מבוסס על הטקסטים שנצפו בפועל בדוחות (export 37/38), ולא על
 * התאמה מדויקת — Fix משנה את נוסח הודעות ה-Rejected בין דוחות. לכן ההתאמה
 * היא substring על טקסט מנורמל (lowercase, רווחים מכווצים).
 *
 * הערך המקורי מ-Fix נשמר תמיד ב-delivery_status_raw ואינו נמחק.
 */

export type DeliveryStatusCode =
  | 'read'
  | 'delivered'
  | 'submitted'
  | 'failed_device'
  | 'failed_rate_limit'
  | 'failed_blocked'
  | 'failed_provider'
  | 'failed_other'
  | 'no_status'

export type DeliveryTone = 'success' | 'warning' | 'danger' | 'default'

/**
 * קבוצת התצוגה — ארבע קבוצות מוסכמות:
 *   🟢 הצלחה          — נקרא / נמסר / נשלח
 *   🔴 נכשל בגלל מכשיר — Rejected (Not suitable device / Message Undeliverable)
 *   🟠 נכשל אחר        — Provider error / Auto-limiting / Message Blocked / כל Rejected אחר
 *   ⚪ ללא סטטוס       — ערך ריק
 */
export type DeliveryGroup = 'success' | 'device_failure' | 'other_failure' | 'unknown'

interface DeliveryGroupMeta {
  label: string
  tone: DeliveryTone
}

export const DELIVERY_GROUPS: Record<DeliveryGroup, DeliveryGroupMeta> = {
  success:        { label: 'הצלחה',           tone: 'success' },
  device_failure: { label: 'נכשל בגלל מכשיר', tone: 'danger'  },
  other_failure:  { label: 'נכשל אחר',        tone: 'warning' },
  unknown:        { label: 'ללא סטטוס',       tone: 'default' },
}

interface DeliveryStatusMeta {
  code: DeliveryStatusCode
  label: string
  group: DeliveryGroup
  tone: DeliveryTone
  /** דירוג קדימות — סטטוס גבוה יותר לעולם לא נדרס ע"י נמוך ממנו */
  rank: number
}

export const DELIVERY_STATUSES: Record<DeliveryStatusCode, DeliveryStatusMeta> = {
  read:              { code: 'read',              label: 'נקרא',                  group: 'success',        tone: 'success', rank: 5 },
  delivered:         { code: 'delivered',         label: 'נמסר',                  group: 'success',        tone: 'success', rank: 4 },
  submitted:         { code: 'submitted',         label: 'נשלח',                  group: 'success',        tone: 'success', rank: 3 },
  failed_device:     { code: 'failed_device',     label: 'נכשל – מכשיר לא מתאים', group: 'device_failure', tone: 'danger',  rank: 2 },
  failed_provider:   { code: 'failed_provider',   label: 'נכשל – שגיאת ספק',      group: 'other_failure',  tone: 'warning', rank: 2 },
  failed_rate_limit: { code: 'failed_rate_limit', label: 'נכשל – הגבלת ספק',      group: 'other_failure',  tone: 'warning', rank: 2 },
  failed_blocked:    { code: 'failed_blocked',    label: 'נכשל – נחסם',           group: 'other_failure',  tone: 'warning', rank: 2 },
  failed_other:      { code: 'failed_other',      label: 'נכשל – סיבה אחרת',      group: 'other_failure',  tone: 'warning', rank: 2 },
  no_status:         { code: 'no_status',         label: 'ללא סטטוס',             group: 'unknown',        tone: 'default', rank: 1 },
}

/** כל הקודים השייכים לקבוצת תצוגה — לשימוש בפילטר לפי קבוצה */
export function statusCodesInGroup(group: DeliveryGroup): DeliveryStatusCode[] {
  return DELIVERY_STATUS_ORDER.filter((code) => DELIVERY_STATUSES[code].group === group)
}

export const DELIVERY_STATUS_ORDER: DeliveryStatusCode[] = [
  'read', 'delivered', 'submitted',
  'failed_device', 'failed_rate_limit', 'failed_blocked', 'failed_provider', 'failed_other',
  'no_status',
]

export function getDeliveryStatusMeta(code: string | null | undefined): DeliveryStatusMeta {
  if (!code) return DELIVERY_STATUSES.no_status
  return DELIVERY_STATUSES[code as DeliveryStatusCode] ?? DELIVERY_STATUSES.no_status
}

/**
 * ממפה ערך sending_status גולמי מ-Fix לקוד פנימי.
 * ערך לא מוכר שאינו Rejected → no_status (ולא זריקת שגיאה) — הערך הגולמי נשמר.
 */
export function mapDeliveryStatus(raw: string | null | undefined): DeliveryStatusCode {
  const s = String(raw ?? '').trim().toLowerCase().replace(/\s+/g, ' ')

  if (!s || s === 'none' || s === 'null') return 'no_status'
  if (s === 'read') return 'read'
  if (s === 'delivered') return 'delivered'
  // Fix כותב "Submited" עם m אחת — תומכים בשתי הצורות
  if (s === 'submited' || s === 'submitted') return 'submitted'

  if (s.startsWith('rejected')) {
    if (s.includes('not suitable device') || s.includes('undeliverable')) return 'failed_device'
    if (s.includes('auto-limiting') || s.includes('auto limiting')) return 'failed_rate_limit'
    if (s.includes('blocked')) return 'failed_blocked'
    if (s.includes('provider error')) return 'failed_provider'
    return 'failed_other'
  }

  return 'no_status'
}

/**
 * בייבוא חוזר של אותו קמפיין — הסטטוס לא נסוג אחורה.
 * Read לא יוחלף ב-Delivered, ו-Delivered לא יוחלף ב-Submited.
 */
export function pickHigherStatus(
  current: DeliveryStatusCode | null | undefined,
  incoming: DeliveryStatusCode,
): DeliveryStatusCode {
  if (!current) return incoming
  return DELIVERY_STATUSES[incoming].rank > DELIVERY_STATUSES[current].rank ? incoming : current
}
