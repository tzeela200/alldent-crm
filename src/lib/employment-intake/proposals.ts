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
 */

import type { ActionType, ContentType } from '@/types/employment-intake'

export interface ProposalInput {
  contentType: ContentType
  isActiveRequest: boolean | null
  matchContact: number | null
}

export interface ProposalResult {
  proposedSocialStatus: number | null
  proposedAction: ActionType | null
}

const NONE: ProposalResult = { proposedSocialStatus: null, proposedAction: null }

export function proposeAction(input: ProposalInput): ProposalResult {
  const { contentType, isActiveRequest, matchContact } = input

  if (isActiveRequest === false) return NONE // צורך סגור — אין הצעה אוטומטית

  const hasContact = matchContact != null

  switch (contentType) {
    case 'job_seeker':
      return { proposedSocialStatus: 1, proposedAction: hasContact ? 'mark_lead_status' : 'create_contact' }
    case 'recruiter':
      return { proposedSocialStatus: 2, proposedAction: hasContact ? 'mark_lead_status' : 'create_contact' }
    case 'group_join':
      return { proposedSocialStatus: 3, proposedAction: hasContact ? 'mark_lead_status' : 'create_contact' }
    case 'irrelevant':
      return hasContact ? { proposedSocialStatus: 12, proposedAction: 'mark_irrelevant' } : NONE
    case 'unclear':
    case 'unclassified':
    default:
      return NONE
  }
}
