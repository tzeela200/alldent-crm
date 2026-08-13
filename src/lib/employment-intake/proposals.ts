/**
 * מנוע ההצעות (§10) — קובע proposed_social_status + proposed_action מתוך
 * סוג התוכן, מצב הבקשה (פעיל/סגור) ותוצאת ההתאמה. לוגיקה טהורה בלבד.
 *
 * כללים:
 *  - צורך סגור (is_active_request=false) אינו מקבל הצעה — ייבוא היסטורי
 *    אינו משנה סטטוס נוכחי אוטומטית.
 *  - "לא ברור" ו-"טרם סווג" אינם מקבלים social_status כלל (§5.3).
 *  - "לא רלוונטי" ללא רשומה קיימת — אפס הצעה, אין ליצור Contact רק כדי
 *    לסמן לא רלוונטי (§5.1).
 *  - אין Contact תואם ⇒ הפעולה המוצעת היא יצירה, לא עדכון — עם אותו
 *    social_status מיועד ליישום מיד לאחר היצירה.
 *  - מצטרף (group_join) קיים ⇒ social_status 7 "קיים במאגר", לא 3 — 3
 *    ("ליד חדש - הצטרפות למאגר") שמור לרשומה חדשה בלבד. מצטרף חדש בלי
 *    נייד כלל ⇒ אין הצעת פעולה (אי אפשר להקים איש קשר בלי נייד); הזיהוי/
 *    השלמת הנייד נשארים לטיפול ידני בפאנל.
 */

import type { ActionType, ContentType } from '@/types/employment-intake'

export interface ProposalInput {
  contentType: ContentType
  isActiveRequest: boolean | null
  matchContact: number | null
  /** יש נייד תקף לשורה (מהטקסט או מהשולח) — קובע אם ניתן להציע הקמת איש קשר. ברירת מחדל true. */
  hasPhone?: boolean
}

export interface ProposalResult {
  proposedSocialStatus: number | null
  proposedAction: ActionType | null
}

const NONE: ProposalResult = { proposedSocialStatus: null, proposedAction: null }

export function proposeAction(input: ProposalInput): ProposalResult {
  const { contentType, isActiveRequest, matchContact, hasPhone = true } = input

  if (isActiveRequest === false) return NONE // צורך סגור — אין הצעה אוטומטית

  const hasContact = matchContact != null

  switch (contentType) {
    case 'job_seeker':
      return { proposedSocialStatus: 1, proposedAction: hasContact ? 'mark_lead_status' : 'create_contact' }
    case 'recruiter':
      return { proposedSocialStatus: 2, proposedAction: hasContact ? 'mark_lead_status' : 'create_contact' }
    case 'group_join':
      if (hasContact) return { proposedSocialStatus: 7, proposedAction: 'mark_lead_status' }
      return { proposedSocialStatus: 3, proposedAction: hasPhone ? 'create_contact' : null }
    case 'irrelevant':
      return hasContact ? { proposedSocialStatus: 12, proposedAction: 'mark_irrelevant' } : NONE
    case 'unclear':
    case 'unclassified':
    default:
      return NONE
  }
}
