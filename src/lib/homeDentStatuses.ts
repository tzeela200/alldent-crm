/**
 * INC-3130 · HOME DENT — סטטוסים ותצוגתם.
 *
 * הסטטוסים כאן הם טקסט ולא מזהה ממילון, ולכן StatusBadge — שדורש
 * statusId מספרי מתוך dict_* חי — אינו מתאים. הרכיב הנכון לתוויות
 * טקסט הוא AdminBadge, שמקבל label + variant.
 *
 * לא הפכתי אותם למילון מספרי בכוונה: הקוד מסתעף עליהם (שער הפרסום,
 * ה-view הציבורי), ומילון שהאדמין יכול לערוך היה מאפשר להוסיף ערך
 * שהקוד לא מכיר ולשבור את הפרסום בשקט.
 */
import type { AdminBadgeVariant } from '@/components/admin/AdminBadge'

/** מצב טיפול — §38 */
export const HD_WORKFLOW: Record<string, { label: string; variant: AdminBadgeVariant }> = {
  new: { label: 'חדש', variant: 'info' },
  in_progress: { label: 'בטיפול', variant: 'warning' },
  waiting_material: { label: 'ממתין לחומר', variant: 'amber' },
  ready: { label: 'מוכן לפרסום', variant: 'success' },
  archived: { label: 'ארכיון', variant: 'neutral' },
}

/** מצב פרסום — §38 */
export const HD_PUBLICATION: Record<string, { label: string; variant: AdminBadgeVariant }> = {
  draft: { label: 'טיוטה', variant: 'neutral' },
  published: { label: 'פורסם', variant: 'teal' },
  removed: { label: 'הוסר', variant: 'error' },
  expired: { label: 'פג תוקף', variant: 'error' },
}

/** סטטוס פנייה — §70 */
export const HD_INQUIRY: Record<string, { label: string; variant: AdminBadgeVariant }> = {
  new: { label: 'חדש', variant: 'info' },
  in_progress: { label: 'בטיפול', variant: 'warning' },
  forwarded: { label: 'הועבר', variant: 'purple' },
  waiting: { label: 'ממתין', variant: 'amber' },
  closed: { label: 'נסגר', variant: 'success' },
  irrelevant: { label: 'לא רלוונטי', variant: 'neutral' },
}

export const HD_OFFER_LABELS: Record<string, string> = {
  sale: 'מכירה',
  rent_monthly: 'שכירות חודשית',
  rent_daily: 'השכרה יומית',
  rent_shift: 'לפי משמרת',
}

export const HD_ASSET_TYPE_LABELS: Record<string, string> = {
  clinic_full: 'מרפאה מלאה',
  treatment_room: 'חדר טיפול',
  lab: 'מעבדה',
  imaging_center: 'מכון הדמיה',
  business: 'פעילות עסקית',
  other: 'אחר',
}

export const HD_SOURCE_LABELS: Record<string, string> = {
  public_form: 'טופס ציבורי',
  manual: 'הוזן ידנית',
}

/** לרשימות סינון. הסדר הוא סדר מחזור החיים ולא אלפביתי. */
export const asFilterOptions = (map: Record<string, { label: string }>) =>
  Object.entries(map).map(([value, { label }]) => ({ value, label }))
