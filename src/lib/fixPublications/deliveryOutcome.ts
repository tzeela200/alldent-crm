/**
 * שכבת ההחלטה: "מה עושים עכשיו" מעל סטטוס השליחה הטכני.
 *
 * `delivery_status` מספר מה קרה להודעה (9 קודים). הוא לא אומר מה לעשות.
 * הקובץ הזה מתרגם את זה להחלטה אחת מתוך שש, וזה מה שמוצג למשתמשת.
 *
 * ⚠️ מקור אמת יחיד. אין להעתיק את המיפוי הזה לאף מסך — מסך שמחזיק עותק
 *    משלו יסתור את המסכים האחרים ברגע שהכללים ישתנו.
 *
 * ההחלטה של צאלה (31.08.2026): "קיבל" = נשלח + נמסר + נקרא. כל תוצאה
 * שאינה כשל היא חיובית — גם `submitted`, שאין עליו אישור מסירה.
 */

import {
  DELIVERY_STATUS_ORDER, isOptOutText, getDeliveryStatusMeta,
  type DeliveryStatusCode,
} from './deliveryStatus'

/** גוון התצוגה — תואם ישירות ל-`variant` של `StatusPill` המשותף */
export type OutcomeTone = 'success' | 'warning' | 'danger' | 'info' | 'default'

export type DeliveryOutcome =
  | 'reached'      // ההודעה יצאה ולא נכשלה
  | 'do_not_send'  // אל תשלחי שוב
  | 'retry'        // הכשל זמני או באשמתנו — שווה לנסות שוב
  | 'never_sent'   // יש נייד, מעולם לא היה בקמפיין
  | 'no_phone'     // אין נייד — אי אפשר לשלוח בכלל
  | 'unknown'      // נכלל בקמפיין אבל אין סטטוס

interface OutcomeMeta {
  code: DeliveryOutcome
  label: string
  /** מה זה אומר בפועל — מוצג כ-hint בכרטיס ובתיאור המסנן */
  description: string
  tone: OutcomeTone
  /** סדר התצוגה בכרטיסים ובמסנן */
  order: number
}

export const DELIVERY_OUTCOMES: Record<DeliveryOutcome, OutcomeMeta> = {
  reached: {
    code: 'reached', label: 'הגיע', order: 1, tone: 'success',
    description: 'ההודעה יצאה ולא נכשלה — נשלח, נמסר או נקרא',
  },
  do_not_send: {
    code: 'do_not_send', label: 'חסום', order: 2, tone: 'danger',
    description: 'אין לשלוח — הוסר מפרסום, ביקש הסרה, או שאין וואטסאפ על המספר',
  },
  retry: {
    code: 'retry', label: 'שווה לנסות שוב', order: 3, tone: 'warning',
    description: 'הכשל זמני או באשמתנו — הספק הגביל, חסם, או שהתמונה לא נטענה',
  },
  never_sent: {
    code: 'never_sent', label: 'מעולם לא נשלח', order: 4, tone: 'info',
    description: 'יש נייד במאגר, אבל האדם מעולם לא נכלל בקמפיין',
  },
  no_phone: {
    code: 'no_phone', label: 'אין נייד', order: 5, tone: 'default',
    description: 'אין נייד תקין ברשומה — אי אפשר לשלוח בכלל',
  },
  unknown: {
    code: 'unknown', label: 'ללא מידע', order: 6, tone: 'default',
    description: 'נכלל בקמפיין אך פיקס לא החזיר סטטוס שליחה',
  },
}

export const DELIVERY_OUTCOME_ORDER: DeliveryOutcome[] =
  (Object.keys(DELIVERY_OUTCOMES) as DeliveryOutcome[])
    .sort((a, b) => DELIVERY_OUTCOMES[a].order - DELIVERY_OUTCOMES[b].order)

export function getOutcomeMeta(code: string | null | undefined): OutcomeMeta {
  if (!code) return DELIVERY_OUTCOMES.unknown
  return DELIVERY_OUTCOMES[code as DeliveryOutcome] ?? DELIVERY_OUTCOMES.unknown
}

/**
 * אילו קודי `delivery_status` שייכים לכל החלטה.
 *
 * זה מה שמתרגם דלי → `.in(...)` בשאילתה, ולכן חייב להישאר צמוד לכללים כאן.
 * שלוש ההחלטות שאינן נגזרות מהסטטוס (`never_sent`/`no_phone`) מקבלות רשימה
 * ריקה — הן נקבעות מ-`whatsapp_campaign_last_sent` ו-`phone_norm`.
 */
export const OUTCOME_STATUS_CODES: Record<DeliveryOutcome, DeliveryStatusCode[]> = {
  reached:     ['read', 'delivered', 'submitted'],
  do_not_send: ['failed_device'],
  retry:       ['failed_rate_limit', 'failed_blocked', 'failed_provider', 'failed_other'],
  unknown:     ['no_status'],
  never_sent:  [],
  no_phone:    [],
}

/**
 * ההחלטה לשורת שליחה בודדת.
 *
 * `failed_other` מתפצל: בקשת הסרה היא `do_not_send` לצמיתות, וכל השאר `retry`.
 * לכן חייבים גם את הקטגוריה או את הטקסט הגולמי — הקוד לבדו לא מספיק.
 */
export function outcomeOf(
  status: DeliveryStatusCode | null | undefined,
  failureCategory?: string | null,
  rawStatus?: string | null,
): DeliveryOutcome {
  if (!status) return 'unknown'
  if (failureCategory === 'opt_out' || isOptOutText(rawStatus)) return 'do_not_send'

  for (const outcome of DELIVERY_OUTCOME_ORDER) {
    if (OUTCOME_STATUS_CODES[outcome].includes(status)) return outcome
  }
  return 'unknown'
}

/**
 * סטטוס הפנייה „הסרה" ב-`dict_social_statuses` (אומת חי: id 13 = "הסרה").
 *
 * הכרעת צאלה (14/09/2026): „הסרה" = **לא לשלוח הודעות**. זה הסימון הידני של
 * חסימה — גם מי שסימנה בעצמה, וגם מי שסומן בקליטה כי אין לו וואטסאפ או
 * שביקש הסרה. בניגוד ל"אין מכשיר" שנגזר מהסטטוס האחרון, הסימון הזה **קבוע**
 * עד שמבטלים אותו ידנית.
 */
export const REMOVED_SOCIAL_STATUS = 13

export function isRemovedFromPublishing(socialStatus: number | string | null | undefined): boolean {
  return Number(socialStatus) === REMOVED_SOCIAL_STATUS
}

/** למה הרשומה חסומה — מוצג לצד „חסום" כדי שיהיה ברור מה עשה אותה חסומה */
export type BlockReason = 'opt_out' | 'no_device' | 'removed'

export const BLOCK_REASON_LABELS: Record<BlockReason, string> = {
  opt_out:   'ביקש הסרה',
  no_device: 'אין וואטסאפ',
  removed:   'הוסר מפרסום',
}

/**
 * הסיבה הספציפית ביותר לחסימה. סדר העדיפות הוא מהמידע המדויק לכללי:
 * בקשת הסרה מפיקס → אין מכשיר → סימון ידני. מי שסומן „הסרה" וגם אין לו
 * וואטסאפ יוצג כ"אין וואטסאפ", כי זה מסביר יותר.
 */
export function blockReasonOf(args: {
  isOptedOut?: boolean
  lastStatus: string | null
  socialStatus?: number | null
}): BlockReason | null {
  if (args.isOptedOut) return 'opt_out'
  if (args.lastStatus === 'failed_device') return 'no_device'
  if (isRemovedFromPublishing(args.socialStatus)) return 'removed'
  return null
}

/**
 * ההחלטה לרשומה במאגר, על בסיס שדות הסיכום ב-`contact`/`accounts`.
 *
 * `isOptedOut` מגיע מבחוץ ואינו נגזר מהסיכום: הוא נקבע לפי קיום ולו שורת
 * נמען אחת עם `failure_category='opt_out'`, ולכן אינו נדרס ע"י קמפיין מאוחר.
 * זה ההבדל בין סימון קבוע לסימון הפיך.
 */
export function outcomeOfRecord(args: {
  phoneNorm: string | null
  lastSentAt: string | null
  lastStatus: string | null
  isOptedOut?: boolean
  /** סטטוס הפנייה של הרשומה — „הסרה" (13) חוסם שליחה */
  socialStatus?: number | null
}): DeliveryOutcome {
  if (args.isOptedOut || isRemovedFromPublishing(args.socialStatus)) return 'do_not_send'
  if (!args.phoneNorm) return 'no_phone'
  if (!args.lastSentAt && !args.lastStatus) return 'never_sent'
  return outcomeOf(args.lastStatus as DeliveryStatusCode | null)
}

/** בדיקת שפיות: כל קוד סטטוס חייב להשתייך לדלי אחד בדיוק. */
export function assertOutcomeCoverage(): string[] {
  const problems: string[] = []
  for (const code of DELIVERY_STATUS_ORDER) {
    const buckets = DELIVERY_OUTCOME_ORDER.filter((o) => OUTCOME_STATUS_CODES[o].includes(code))
    if (buckets.length !== 1) {
      problems.push(`${code}: משויך ל-${buckets.length} החלטות (${buckets.join(', ') || 'אף אחת'})`)
    }
  }
  return problems
}

/**
 * תווית אחת לתצוגה על רשומה — ההחלטה, ואחריה הסטטוס המדויק כשיש כזה.
 * לדוגמה: "הגיע · נקרא" או "אל תשלחי שוב · נכשל – מכשיר לא מתאים".
 *
 * ⚠️ אינה מכירה בקשות הסרה, כי אלה נקבעות מטבלת הנמענים ולא משדות הסיכום.
 *    התצוגה המלאה, כולל בקשות הסרה, נמצאת בפאנל היסטוריית הפרסומים.
 */
export function publicationOutcomeLabel(
  phoneNorm: string | null | undefined,
  lastSentAt: string | null | undefined,
  lastStatus: string | null | undefined,
  socialStatus?: number | null,
): string {
  const outcome = outcomeOfRecord({
    phoneNorm: phoneNorm ?? null,
    lastSentAt: lastSentAt ?? null,
    lastStatus: lastStatus ?? null,
    socialStatus,
  })
  const label = DELIVERY_OUTCOMES[outcome].label
  if (outcome === 'do_not_send') {
    const reason = blockReasonOf({ lastStatus: lastStatus ?? null, socialStatus })
    return reason ? `${label} · ${BLOCK_REASON_LABELS[reason]}` : label
  }
  if (outcome === 'never_sent' || outcome === 'no_phone') return label
  return lastStatus ? `${label} · ${getDeliveryStatusMeta(lastStatus).label}` : label
}
