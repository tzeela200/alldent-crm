/**
 * מניעת פעולה חוזרת (§5.4) — לוגיקה טהורה. בודקת, מתוך פעולות שכבר נשלפו
 * מ-employment_intake_action, האם לזהות הנתונה כבר קיימת פעולה שהושלמה
 * מאותו סוג. נבדקים שני העוגנים יחד (contact_id וגם identity_group_id) —
 * כך שפעולה שנרשמה לפני שהיה Contact נמצאת גם אחרי שהוא נוצר.
 *
 * שכבה נפרדת מ-idempotency_key (§7.2): repeatGuard מונע *הצעה* עסקית
 * חוזרת (Bulk/UI); ה-UNIQUE במסד מונע *רישום* טכני כפול (double-click/retry).
 */

import type { ActionResult, ActionType, DetailsSentType, EmploymentIntakeAction, ResolvedIdentity } from '@/types/employment-intake'

export interface RepeatCheckResult {
  alreadyDone: boolean
  lastAction: EmploymentIntakeAction | null
}

/**
 * מוצא את הפעולה האחרונה שהושלמה (result='done') מאותו סוג עבור הזהות
 * הנתונה, מתוך רשימת פעולות שכבר נטענה עבור הזהות/הזהויות הרלוונטיות.
 */
export function checkRepeat(
  actions: EmploymentIntakeAction[],
  identity: ResolvedIdentity,
  actionType: ActionType,
  detailsSentType: DetailsSentType | null = null,
): RepeatCheckResult {
  const matching = actions
    .filter((a) => a.result === ('done' as ActionResult))
    .filter((a) => a.action_type === actionType)
    .filter((a) => (a.details_sent_type ?? null) === (detailsSentType ?? null))
    .filter((a) => (identity.contactId != null && a.contact_id === identity.contactId) || (identity.identityGroupId != null && a.identity_group_id === identity.identityGroupId))
    .sort((a, b) => new Date(b.performed_at).getTime() - new Date(a.performed_at).getTime())

  return { alreadyDone: matching.length > 0, lastAction: matching[0] ?? null }
}

/** עוגן הכתיבה (anchor_key) לפעולה חדשה — עדיפות ל-Contact הקנוני. */
export function buildAnchorKey(identity: ResolvedIdentity): string {
  if (identity.contactId != null) return `c:${identity.contactId}`
  if (identity.identityGroupId) return `g:${identity.identityGroupId}`
  throw new Error('לא ניתן לבנות עוגן זהות ללא contact_id או identity_group_id')
}
