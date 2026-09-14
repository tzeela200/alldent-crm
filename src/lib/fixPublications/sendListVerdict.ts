/**
 * פסק הדין לרשימת שליחה — **לוגיקה טהורה, בלי גישה למסד.**
 *
 * מופרד מ-`useSendListCheck` כדי שיהיה ניתן לבדיקה ב-Node בלי לקוח Supabase,
 * ומאותה סיבה שבגללה `deliveryOutcome.ts` מופרד: כלל עסקי שחי בקובץ אחד
 * ואינו משוכפל בין מסכים.
 */

import type { PhoneMatch } from '@/hooks/useInboxPhoneCheck'
import {
  outcomeOfRecord, type DeliveryOutcome,
} from '@/lib/fixPublications/deliveryOutcome'

export type SendVerdict =
  /** תקין לשליחה */
  | 'ok'
  /** אסור לשלוח — ביקש הסרה, או אין לו וואטסאפ */
  | 'blocked'
  /** לא נייד ישראלי תקין */
  | 'invalid'
  /** אותו מספר כבר הופיע ברשימה שהודבקה */
  | 'duplicate'

export const SEND_VERDICTS: Record<
  SendVerdict,
  { label: string; tone: 'success' | 'danger' | 'warning' | 'default' }
> = {
  ok:        { label: 'תקין לשליחה',  tone: 'success' },
  blocked:   { label: 'חסום',          tone: 'danger'  },
  invalid:   { label: 'נייד לא תקין', tone: 'warning' },
  duplicate: { label: 'כפול ברשימה',  tone: 'default' },
}

/** מצב השליחה של נייד אחד, כפי שהוא ידוע במערכת */
export interface SendStatus {
  /** ביקש הסרה — חסימה **קבועה** שאינה נדרסת ע"י קמפיין מאוחר יותר */
  optedOut: boolean
  lastStatus: string | null
  lastSentAt: string | null
  /** סומן „הסרה" (סטטוס פנייה 13) — חסימה ידנית, קבועה עד ביטול */
  removed?: boolean
  /** הנייד מוכר במערכת (רשומה או שליחה קודמת) */
  known: boolean
}

export type SendBlockKind = 'opt_out' | 'no_device' | 'removed'

export interface SendListRow {
  index: number
  /** מה שהודבק, כפי שהוא */
  raw: string
  normalized: string | null
  verdict: SendVerdict
  /** למה חסום או פסול — בעברית, מוכן לתצוגה */
  reason: string | null
  /** האם החסימה קבועה (בקשת הסרה / הוסר מפרסום) או הפיכה (אין מכשיר) */
  permanentBlock: boolean
  /** סוג החסימה, לפילוח בפסק הדין */
  blockKind?: SendBlockKind | null
  matches: PhoneMatch[]
  outcome: DeliveryOutcome | null
  lastSentAt: string | null
}

export interface SendListSummary {
  total: number
  ok: number
  blocked: number
  invalid: number
  duplicates: number
  /** פילוח החסומים — זה מה שמוצג בפסק הדין */
  optedOut: number
  noDevice: number
  removed: number
  /** כמה מהתקינים כבר נמצאים במאגר */
  knownInDatabase: number
}

export interface VerdictDecision {
  verdict: SendVerdict
  reason: string | null
  permanentBlock: boolean
  blockKind: SendBlockKind | null
  outcome: DeliveryOutcome | null
}

/**
 * מכריע מה לעשות עם נייד אחד.
 *
 * ההכרעה עוברת דרך `outcomeOfRecord` המשותף ואינה משוכפלת כאן — אחרת המסך
 * הזה היה יכול לסתור את „מאגר לפי פרסום" על אותו אדם.
 *
 * בקשת הסרה נבדקת **ראשונה**: היא גוברת על כל סטטוס, גם על שליחה מוצלחת
 * מאוחרת יותר, כי זו החלטה של הנמען ולא תקלה טכנית.
 */
export function verdictFor(status: SendStatus | undefined, phoneNorm: string): VerdictDecision {
  if (!status) {
    // נייד תקין שאינו מוכר בכלל — אין סיבה לחסום
    return { verdict: 'ok', reason: null, permanentBlock: false, blockKind: null, outcome: 'never_sent' }
  }

  if (status.optedOut) {
    return {
      verdict: 'blocked',
      reason: 'ביקש להפסיק לקבל פרסום — אין לשלוח אליו שוב',
      permanentBlock: true,
      blockKind: 'opt_out',
      outcome: 'do_not_send',
    }
  }

  // אין מכשיר מוצג לפני „הסרה" כי הוא מסביר יותר — אותו סדר של blockReasonOf
  if (status.lastStatus === 'failed_device') {
    return {
      verdict: 'blocked',
      reason: 'אין וואטסאפ על המספר — ההודעה לא תגיע',
      permanentBlock: !!status.removed,
      blockKind: 'no_device',
      outcome: 'do_not_send',
    }
  }

  if (status.removed) {
    return {
      verdict: 'blocked',
      reason: 'הוסר מפרסום — אין לשלוח אליו',
      permanentBlock: true,
      blockKind: 'removed',
      outcome: 'do_not_send',
    }
  }

  const outcome = outcomeOfRecord({
    phoneNorm,
    lastSentAt: status.lastSentAt,
    lastStatus: status.lastStatus,
  })

  return { verdict: 'ok', reason: null, permanentBlock: false, blockKind: null, outcome }
}

export function summarizeSendList(rows: SendListRow[]): SendListSummary {
  return {
    total: rows.length,
    ok: rows.filter((r) => r.verdict === 'ok').length,
    blocked: rows.filter((r) => r.verdict === 'blocked').length,
    invalid: rows.filter((r) => r.verdict === 'invalid').length,
    duplicates: rows.filter((r) => r.verdict === 'duplicate').length,
    optedOut: rows.filter((r) => r.verdict === 'blocked' && r.blockKind === 'opt_out').length,
    noDevice: rows.filter((r) => r.verdict === 'blocked' && r.blockKind === 'no_device').length,
    removed: rows.filter((r) => r.verdict === 'blocked' && r.blockKind === 'removed').length,
    knownInDatabase: rows.filter((r) => r.verdict === 'ok' && r.matches.length > 0).length,
  }
}
