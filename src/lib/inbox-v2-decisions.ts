/**
 * זיכרון החלטות שדה (INC-3123) — לוגיקה טהורה.
 *
 * הבעיה שזה פותר: אותו קונפליקט חזר שוב ושוב. אם ב-Supabase כתוב "חיפה"
 * וב-Google "תל אביב", ובחרת "חיפה" — הבחירה הזו לא מייצרת patch כלל,
 * ולכן `inbox_merge_actions.updates_applied` נשאר ריק ולא נשארה שום עקבה.
 * בסנכרון הבא אותו קונפליקט הוצג מחדש.
 *
 * הפתרון: כל החלטה נשמרת עם **שני הערכים שהושוו**, מנורמלים. בפעם הבאה
 * מחפשים את אותו צירוף. נמצא — הקונפליקט לא מוצג. אחד הערכים השתנה —
 * זו החלטה חדשה, והיא כן מוצגת.
 *
 * הנרמול כאן חייב להיות זהה לזה שנשמר במסד, אחרת החיפוש לא ימצא את
 * ההחלטה והיא לא תדוכא. לכן הוא עובר דרך אותן פונקציות נרמול של
 * inbox-v2-merge.ts (טלפון, מייל) ולא דרך מימוש מקומי.
 */

import { normalizeEmail, normalizeText, phoneCompareKey } from '@/lib/inbox-v2-merge'
import type { FieldComparison, MergeEntity } from '@/lib/inbox-v2-merge'

export type DecisionSource = 'supabase' | 'google' | 'manual'

/** שורה בטבלת inbox_field_decisions. */
export interface InboxFieldDecision {
  decision_id: number
  target_type: MergeEntity
  target_id: number
  google_account_key: string
  google_resource_name: string
  field_name: string
  supabase_value_norm: string
  google_value_norm: string
  selected_source: DecisionSource
  selected_value: unknown
  approved_by: string | null
  approved_at: string
  last_used_at: string | null
  reuse_count: number
}

/** מה שנשלח ל-RPC בעת אישור. */
export interface DecisionPayload {
  field_name: string
  supabase_value_norm: string
  google_value_norm: string
  selected_source: DecisionSource
  selected_value: unknown
}

/**
 * מנרמל ערך להשוואה, לפי סוג השדה.
 *
 * ריק מוחזר כמחרוזת ריקה ולא כ-NULL: ערך ריק הוא מצב לגיטימי שצריך
 * לזכור ("ב-Supabase לא היה מייל"), ובמסד העמודות הן NOT NULL DEFAULT ''.
 */
export function normalizeForDecision(value: unknown, kind: string): string {
  if (value == null || value === '') return ''

  switch (kind) {
    case 'phone':
      return phoneCompareKey(value)
    case 'email':
      return normalizeEmail(value)
    case 'role':
    case 'city':
    case 'account_type':
      // שדות מילוניים מושווים לפי המזהה, לא לפי התווית המוצגת —
      // שינוי שם עיר במילון אינו החלטה חדשה.
      return String(value)
    default:
      return normalizeText(value).toLowerCase()
  }
}

/** המפתח הלוגי שעליו המסד אוכף ייחודיות. שינוי כאן דורש שינוי ב-DDL. */
export function decisionKey(parts: {
  targetType: string
  targetId: number
  googleAccountKey: string
  googleResourceName: string
  fieldName: string
  supabaseValueNorm: string
  googleValueNorm: string
}): string {
  return [
    parts.targetType,
    parts.targetId,
    parts.googleAccountKey,
    parts.googleResourceName,
    parts.fieldName,
    parts.supabaseValueNorm,
    parts.googleValueNorm,
  ].join('|')
}

/** מפתח מתוך שורת החלטה שנשלפה מהמסד. */
export function keyOfDecision(d: InboxFieldDecision): string {
  return decisionKey({
    targetType: d.target_type,
    targetId: d.target_id,
    googleAccountKey: d.google_account_key,
    googleResourceName: d.google_resource_name,
    fieldName: d.field_name,
    supabaseValueNorm: d.supabase_value_norm,
    googleValueNorm: d.google_value_norm,
  })
}

export interface DecisionContext {
  targetType: MergeEntity
  targetId: number
  googleAccountKey: string | null
  googleResourceName: string | null
}

/** מפתח מתוך השוואת שדה נוכחית. null כשאין מזהי Google — אז אין מה לזכור. */
export function keyOfComparison(cmp: FieldComparison, ctx: DecisionContext): string | null {
  if (!ctx.googleAccountKey || !ctx.googleResourceName) return null
  return decisionKey({
    targetType: ctx.targetType,
    targetId: ctx.targetId,
    googleAccountKey: ctx.googleAccountKey,
    googleResourceName: ctx.googleResourceName,
    fieldName: cmp.key,
    supabaseValueNorm: normalizeForDecision(cmp.existingRaw, cmp.kind),
    googleValueNorm: normalizeForDecision(cmp.incomingRaw, cmp.kind),
  })
}

export interface SuppressionResult {
  /** השוואות שיוצגו למשתמשת */
  visible: FieldComparison[]
  /** השוואות שדוכאו כי אותה החלטה בדיוק כבר אושרה */
  suppressed: { comparison: FieldComparison; decision: InboxFieldDecision }[]
}

/**
 * מסנן קונפליקטים שכבר הוכרעו בדיוק באותם שני ערכים.
 *
 * שדה שהערכים בו זהים ("same") אינו קונפליקט ואינו מדוכא — הוא פשוט
 * אינו דורש החלטה. "השלמת מידע חסר" כן עוברת דיכוי: אם כבר בחרת לא
 * להשלים מייל מסוים, אין סיבה שיישאל שוב על אותו מייל.
 */
export function suppressDecided(
  comparisons: FieldComparison[],
  decisions: InboxFieldDecision[],
  ctx: DecisionContext,
): SuppressionResult {
  const byKey = new Map(decisions.map((d) => [keyOfDecision(d), d]))
  const visible: FieldComparison[] = []
  const suppressed: { comparison: FieldComparison; decision: InboxFieldDecision }[] = []

  for (const cmp of comparisons) {
    if (cmp.status === 'none' || cmp.status === 'same') {
      visible.push(cmp)
      continue
    }
    const key = keyOfComparison(cmp, ctx)
    const decided = key ? byKey.get(key) : undefined
    if (decided) suppressed.push({ comparison: cmp, decision: decided })
    else visible.push(cmp)
  }

  return { visible, suppressed }
}

/**
 * בונה את רשומות ההחלטה לשליחה ל-RPC.
 *
 * נרשמת החלטה לכל שדה שהמשתמשת הכריעה בו — **כולל "השאר את הקיים"**,
 * שאינו מייצר patch. זה בדיוק המקרה שלא נשמר עד היום וגרם לקונפליקט
 * לחזור. שדות זהים אינם החלטה ואינם נרשמים.
 */
export function buildDecisionPayload(
  comparisons: FieldComparison[],
  choices: Record<string, string>,
  manualValues: Record<string, unknown>,
): DecisionPayload[] {
  const out: DecisionPayload[] = []

  for (const cmp of comparisons) {
    if (cmp.status === 'none' || cmp.status === 'same') continue

    const choice = choices[cmp.key] ?? 'skip'
    const hasManual = Object.prototype.hasOwnProperty.call(manualValues, cmp.key)

    let source: DecisionSource
    let value: unknown
    if (hasManual && choice === 'manual') {
      source = 'manual'
      value = manualValues[cmp.key]
    } else if (choice === 'incoming' || choice === 'secondary' || choice === 'redirect') {
      source = 'google'
      value = cmp.incomingRaw
    } else if (choice === 'existing') {
      source = 'supabase'
      value = cmp.existingRaw
    } else {
      // 'skip' — לא הוכרע, אין מה לזכור. יוצג שוב בפעם הבאה, וזה נכון.
      continue
    }

    out.push({
      field_name: cmp.key,
      supabase_value_norm: normalizeForDecision(cmp.existingRaw, cmp.kind),
      google_value_norm: normalizeForDecision(cmp.incomingRaw, cmp.kind),
      selected_source: source,
      selected_value: value ?? null,
    })
  }

  return out
}

// ─────────────────────────────────────────────────────
// תרגום שמות חשבונות Google
// ─────────────────────────────────────────────────────

/**
 * שם חשבון Google הוא מזהה טכני ולא סוג רשומה. שלושת החשבונות הקיימים
 * מתורגמים; חשבון חדש שייפתח יוצג בעברית כללית ולא באנגלית.
 */
const GOOGLE_ACCOUNT_LABEL: Record<string, string> = {
  google_doctors: 'רופאים',
  google_workers: 'עובדים',
  google_dental_managers_orgs: 'מנהלים וארגונים',
}

export function googleAccountLabel(accountKey: unknown): string | null {
  const key = normalizeText(accountKey)
  if (!key) return null
  return GOOGLE_ACCOUNT_LABEL[key.toLowerCase()] ?? 'חשבון Google'
}
