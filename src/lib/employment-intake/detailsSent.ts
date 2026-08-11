/**
 * §6.3 / §10 — מיפוי סוג הפרטים שנשלחו ל-social_status שאחרי השליחה.
 * כל שלושת הערכים קיימים ב-dict_social_statuses; אין כאן ערך מומצא.
 * לוגיקה טהורה (ללא React/Supabase) כדי שתהיה ניתנת לבדיקה עצמאית.
 */

import type { DetailsSentType } from '@/types/employment-intake'

export const DETAILS_SENT_STATUS: Record<DetailsSentType, number> = {
  job_seeking: 5, // נשלחו פרטים – חיפוש עבודה
  recruiting: 4, // נשלחו פרטים – תהליך גיוס
  pool_join: 6, // נשלחו פרטים – הצטרפות למאגר
}

/** סטטוס הארגון במסלול גיוס — "פוטנציאלי – לטיפול". לעולם לא 7 (§10). */
export const ACCOUNT_STATUS_POTENTIAL = 1
