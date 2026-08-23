/**
 * לוגיקה טהורה ל"סווג מחדש" — מי זכאי, מה מותר לכתוב על שורה קיימת בלי
 * לדרוס עריכה ידנית, ואיך מסכמים "מה בדיוק השתנה" לתצוגה המקדימה.
 *
 * קובץ זה **אינו** תלוי ב-Supabase (אין `import { supabase }`) בכוונה —
 * כדי שהוא יישאר ניתן לבדיקה ב-scripts/employment-intake-acceptance.ts
 * בלי סשן מחובר, כמו שאר src/lib/employment-intake. `useEmploymentIntakeReclassify.ts`
 * (ה-hook, לא הקובץ הזה) הוא שמדבר בפועל עם ה-DB.
 */

/** תגיות שהמנוע עצמו קובע (לא תגיות חופשיות שמישהו/משהו אחר הוסיף) —
 * "סיווג מחדש" מחליף רק אותן על שורה קיימת. מקור האמת היחיד: גם
 * `useEmploymentIntakePipeline.ts` (קליטה חדשה) מייבא מכאן, לא להפך.
 * `requires_identification` כלולה בכוונה גם שהמנוע כבר לא כותב אותה
 * (הוסרה בתיקון העסקי הקודם) — כדי ש"סיווג מחדש" ינקה אותה משורות ישנות
 * שעדיין נושאות אותה מלפני התיקון, לא רק ימנע כתיבה חדשה שלה. */
export const ENGINE_OWNED_TAGS = ['system_noise', 'google_contact_expected_existing', 'requires_identification'] as const

/**
 * כל השדות שהמנוע (Parser/סיווג/התאמה) אי-פעם כותב על שורת employment_intake.
 * רשימה סגורה בכוונה: `sub_role_ids` למשל מכוון מוחרג — המנוע לעולם לא
 * מציע לו ערך, רק בחירה ידנית, ולכן "סיווג מחדש" חייב שלא לגעת בו בשום
 * מצב (גם אם הוא לא מסומן ב-manual_override.fields, כי הוא פשוט לא שדה
 * שהמנוע בעלים עליו). כנ"ל `notes`/`manual_override` עצמו/עמודות המקור
 * (original_text וכו') — אינם ברשימה כי אסור לגעת בהם בשום מצב.
 */
export const PIPELINE_OWNED_FIELDS = [
  'content_type', 'is_active_request', 'classify_reason', 'evidence', 'confidence_level', 'needs_context',
  'role_raw', 'role_id', 'city_raw', 'city_id', 'region_id',
  'contact_name', 'phone', 'phone_norm', 'second_phone', 'second_phone_norm',
  'email', 'email_norm', 'second_email', 'second_email_norm',
  'facebook_id', 'facebook_url', 'facebook_url_norm', 'unassigned_phones',
  'match_contact', 'match_account', 'match_field', 'match_type', 'match_candidates',
  'proposed_social_status', 'proposed_action',
] as const

export type PipelineOwnedField = (typeof PIPELINE_OWNED_FIELDS)[number]

export interface EligibilityInput {
  deleted_at: string | null
  last_action_id: number | null
  rules_version: string | null
}

/** רשומה זכאית לסיווג מחדש: לא נמחקה, לא כבר קושרה בפועל לפעולה שהושלמה
 * (Contact/Account אמיתיים), וטרם עברה דרך גרסת הכללים הנוכחית. */
export function isEligibleForReclassify(row: EligibilityInput, currentRulesVersion: string): boolean {
  if (row.deleted_at != null) return false
  if (row.last_action_id != null) return false
  if (row.rules_version === currentRulesVersion) return false
  return true
}

export interface RowPatchResult {
  /** תמיד כולל את כל PIPELINE_OWNED_FIELDS + tags, לכל שורה — גם השדות
   * המדולגים (עם הערך הנוכחי, לא ערך חדש). זה מכוון: כתיבה גורפת
   * (upsert על אצווה) שולחת עמודות שונות לשורות שונות היא סיכון אמיתי
   * ב-PostgREST/supabase-js — עמודה שחסרה בשורה אחת אך קיימת באחרת
   * באותה בקשה עלולה להיכתב כ-NULL בטעות. כתיבת הערך הנוכחי בחזרה
   * (במקום השמטת המפתח) עוקפת את זה לגמרי. */
  patch: Record<string, unknown>
  touchedFields: string[]
  skippedFields: string[]
}

export interface ReclassifyRowInput {
  manual_override?: { fields?: Record<string, unknown> } | null
  tags?: string[] | null
  [key: string]: unknown
}

/**
 * בונה patch לרשומה קיימת: לכל שדה שהמנוע בעלים עליו — אם המשתמשת ערכה
 * אותו ידנית (מסומן ב-manual_override.fields), הערך הנוכחי נכתב בחזרה
 * (no-op אמיתי); אחרת נכתב הערך הטרי מהסיווג מחדש. tags מטופל בנפרד:
 * מיזוג, לא דריסה — תגית לא-מנועית (שהוספה ידנית/ממקור אחר) תמיד נשמרת.
 */
export function buildRowPatch(currentRow: ReclassifyRowInput, freshValues: Record<string, unknown>): RowPatchResult {
  const manualFields = currentRow.manual_override?.fields ?? {}
  const patch: Record<string, unknown> = {}
  const touchedFields: string[] = []
  const skippedFields: string[] = []

  for (const field of PIPELINE_OWNED_FIELDS) {
    if (field in manualFields) {
      patch[field] = currentRow[field] ?? null
      skippedFields.push(field)
    } else {
      patch[field] = freshValues[field] ?? null
      touchedFields.push(field)
    }
  }

  const currentTags = Array.isArray(currentRow.tags) ? currentRow.tags : []
  const freshEngineTags = Array.isArray(freshValues.tags) ? (freshValues.tags as string[]) : []
  const preservedNonEngineTags = currentTags.filter((t) => !(ENGINE_OWNED_TAGS as readonly string[]).includes(t))
  const newTags = Array.from(new Set([...preservedNonEngineTags, ...freshEngineTags]))
  patch.tags = newTags

  const tagsChanged = JSON.stringify([...currentTags].sort()) !== JSON.stringify([...newTags].sort())
  if (tagsChanged) touchedFields.push('tags')
  else skippedFields.push('tags')

  return { patch, touchedFields, skippedFields }
}

export type ReclassifyBucket =
  | 'now_matched'
  | 'now_hidden_system_noise'
  | 'group_join_status_fixed'
  | 'category_changed'
  | 'field_updated'
  | 'no_change'

export interface ReclassifyDiffState {
  match_contact: number | null
  match_account: number | null
  content_type: string
  proposed_social_status: number | null
  proposed_action: string | null
  tags: string[]
}

/** מסווג "מה סוג השינוי" לצורך קיבוץ בתצוגה המקדימה — סדר עדיפות קבוע,
 * לא כל הקטגוריות שמתאימות בו-זמנית (שורה יכולה להתאים ליותר מאחת). */
export function classifyRowDiff(before: ReclassifyDiffState, after: ReclassifyDiffState, touchedFields: string[]): ReclassifyBucket {
  const wasMatched = before.match_contact != null || before.match_account != null
  const isMatched = after.match_contact != null || after.match_account != null
  if (!wasMatched && isMatched) return 'now_matched'

  const hadSystemNoise = before.tags.includes('system_noise')
  const hasSystemNoise = after.tags.includes('system_noise')
  if (!hadSystemNoise && hasSystemNoise) return 'now_hidden_system_noise'

  if (after.content_type === 'group_join' && (before.proposed_social_status !== after.proposed_social_status || before.proposed_action !== after.proposed_action)) {
    return 'group_join_status_fixed'
  }

  if (before.content_type !== after.content_type) return 'category_changed'

  if (touchedFields.length > 0) return 'field_updated'

  return 'no_change'
}
