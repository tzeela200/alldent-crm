// =====================================================
// AllDent CRM — Employment Intake: מיפוי תוויות עברית (INC-3119, §12)
//
// כלל מחייב: אין להציג למשתמשת ערך טכני באנגלית — לא social_status,
// לא match_type, לא action_type, לא הודעת שגיאה גולמית של Supabase.
// כל תצוגה עוברת דרך הקובץ הזה.
// =====================================================

import type {
  ContentType,
  ConfidenceLevel,
  MatchType,
  MatchStatus,
  ActionType,
  DetailsSentType,
  ActionResult,
} from '@/types/employment-intake'

// ── סוג התוכן (§3.2 ציר 1) ──────────────────────────────────────────
export const CONTENT_TYPE_LABEL: Record<ContentType, string> = {
  job_seeker: 'מחפש/ת עבודה',
  recruiter: 'מגייס/ת עובדים',
  group_join: 'הצטרפות לקבוצה',
  irrelevant: 'לא רלוונטי',
  unclear: 'לא ברור',
  unclassified: 'טרם סווג',
}

/** גוון badge לפי סוג תוכן — לשימוש עם AdminBadge. */
export const CONTENT_TYPE_TONE: Record<ContentType, 'success' | 'warning' | 'neutral' | 'error' | 'info'> = {
  job_seeker: 'info',
  recruiter: 'success',
  group_join: 'neutral',
  irrelevant: 'neutral',
  unclear: 'warning',
  unclassified: 'neutral',
}

// ── מצב הבקשה (is_active_request) ──────────────────────────────────
export function activeRequestLabel(value: boolean | null): string {
  if (value === true) return 'בקשה פעילה'
  if (value === false) return 'הצורך הסתיים'
  return 'לא ידוע'
}

// ── מצב ההתאמה למאגר (§3.2 ציר 2 — מחושב) ──────────────────────────
export const MATCH_STATUS_LABEL: Record<MatchStatus, string> = {
  contact_found: 'נמצא איש קשר',
  account_found: 'נמצא ארגון',
  both_found: 'נמצאו איש קשר וארגון',
  multiple: 'נמצאו מספר התאמות',
  none: 'לא קיים',
  already_linked: 'קיים במאגר',
}

/** אוצר מילים זהה ל-MATCH_LABEL הקיים ב-RecruitmentRequestPanel.tsx. */
export const MATCH_TYPE_LABEL: Record<MatchType, string> = {
  exact: 'התאמה ודאית',
  probable: 'התאמה חלשה (יש לבדוק)',
  ambiguous: 'נמצאו מספר התאמות אפשריות',
  none: 'לא נמצאה התאמה',
}

// ── רמת ודאות — תצוגה בלבד, לא שער עסקי (§8.2) ──────────────────────
export const CONFIDENCE_LABEL: Record<ConfidenceLevel, string> = {
  high: 'ודאות גבוהה',
  medium: 'ודאות בינונית',
  low: 'ודאות נמוכה',
}

// ── פעולה מוצעת / שבוצעה (action_type) ──────────────────────────────
export const ACTION_TYPE_LABEL: Record<ActionType, string> = {
  mark_lead_status: 'סימון סטטוס ליד',
  mark_details_sent: 'סימון שנשלחו פרטים',
  create_contact: 'יצירת איש קשר',
  create_account: 'יצירת ארגון',
  merge_contact: 'מיזוג מידע לאיש קשר',
  merge_account: 'מיזוג מידע לארגון',
  link_contact_account: 'קישור איש קשר לארגון',
  update_field: 'עדכון שדה',
  mark_irrelevant: 'סימון לא רלוונטי',
  merge_identity_group: 'איחוד זהויות',
  manual_override: 'תיקון ידני',
}

// ── סוג הפרטים שנשלחו (details_sent_type) ───────────────────────────
export const DETAILS_SENT_TYPE_LABEL: Record<DetailsSentType, string> = {
  job_seeking: 'חיפוש עבודה',
  recruiting: 'תהליך גיוס',
  pool_join: 'הצטרפות למאגר',
}

// ── תוצאת הפעולה (§3.2 ציר 5) ───────────────────────────────────────
export const ACTION_RESULT_LABEL: Record<ActionResult, string> = {
  pending: 'טרם בוצעה',
  done: 'בוצעה',
  not_needed: 'לא נדרשת פעולה',
  not_performed: 'לא בוצעה',
  error: 'שגיאה בביצוע',
}

export const ACTION_RESULT_TONE: Record<ActionResult, 'success' | 'warning' | 'neutral' | 'error' | 'info'> = {
  pending: 'neutral',
  done: 'success',
  not_needed: 'neutral',
  not_performed: 'warning',
  error: 'error',
}

// ── שמות שדות טכניים → עברית (§12.2, §12.1) ─────────────────────────
export const FIELD_LABEL: Record<string, string> = {
  source_published_at: 'זמן הפרסום המקורי',
  ingested_at: 'זמן הקליטה למערכת',
  performed_at: 'מועד שליחת הפרטים',
  details_sent_type: 'סוג הפרטים שנשלחו',
  performed_by: 'נשלח על ידי',
  last_contact_date: 'מועד יצירת הקשר האחרון',
  display_name: 'שם',
  google_contact_label: 'שם שמור באנשי הקשר',
  contact_name: 'שם איש קשר',
  org_name: 'שם ארגון',
  account_name: 'שם ארגון',
  phone: 'נייד',
  // ערכי match_field — מוצגים בעמודה "ההתאמה שנמצאה" ובפאנל הפירוט
  phone_norm: 'נייד',
  second_phone_norm: 'נייד נוסף',
  manual: 'שיוך ידני',
  created: 'נוצר מהמסך הזה',
  second_phone: 'נייד נוסף',
  email: 'מייל',
  second_email: 'מייל נוסף',
  facebook_id: 'מזהה Facebook',
  facebook_url: 'קישור Facebook',
  facebook_name: 'שם Facebook',
  role: 'תפקיד',
  role_id: 'תפקיד',
  city_id: 'עיר',
  region_id: 'אזור',
  source: 'מקור',
  account_link: 'ארגון מקושר',
  social_status: 'סטטוס ליד',
  work_status: 'סטטוס עבודה',
  account_status: 'סטטוס ארגון',
}

export function fieldLabel(key: string): string {
  return FIELD_LABEL[key] ?? key
}

// ── מקטעי המסך ────────────────────────────────────────────────────
export const SCREEN_TITLE = 'איתור מחפשי עבודה ומגייסים'
export const SCREEN_SUBTITLE = 'איתור מחפשי עבודה, מגייסים ומצטרפים מתוך WhatsApp ומקורות נוספים, בדיקה מול המאגר וטיפול ברשומות.'

export const TAB_LABEL = {
  intake: 'העלאת מקור',
  results: 'תוצאות',
} as const

// ── מצב עסקי במאגר — זהו ה-label שמוצג למשתמשת, לא match_type הטכני ──
export type DatabaseState = 'existing' | 'not_existing' | 'needs_identification' | 'google_sync_exception'

export const DATABASE_STATE_LABEL: Record<DatabaseState, string> = {
  existing: 'קיים',
  not_existing: 'לא קיים',
  needs_identification: 'נדרש זיהוי',
  google_sync_exception: 'חריג — איש קשר שמור אך לא נמצא ב-Supabase',
}

export const DATABASE_STATE_TONE: Record<DatabaseState, 'success' | 'warning' | 'neutral' | 'error' | 'info'> = {
  existing: 'success',
  not_existing: 'info',
  needs_identification: 'warning',
  google_sync_exception: 'error',
}

export function computeDatabaseState(row: {
  match_contact: number | null
  match_account: number | null
  match_type: MatchType | null
  needs_context?: boolean
  tags?: string[]
}): DatabaseState {
  const tags = row.tags ?? []
  const found = row.match_contact != null || row.match_account != null
  if (found) return 'existing'
  if (tags.includes('google_contact_expected_existing')) return 'google_sync_exception'
  if (row.match_type === 'ambiguous' || row.match_type === 'probable' || row.needs_context || tags.includes('requires_identification')) return 'needs_identification'
  return 'not_existing'
}

// ── מצבי טעינה וריק (§12.5) ─────────────────────────────────────────
export const LOADING_LABEL = {
  loadingData: 'טוען נתונים…',
  processingFile: 'מעבד את הקובץ…',
  matching: 'מבצע התאמה מול המאגר…',
} as const

export const EMPTY_LABEL = {
  noRows: 'לא נמצאו רשומות.',
  noRowsForFilters: 'אין רשומות התואמות למסננים שנבחרו.',
  noContentYet: 'עדיין לא הועלה טקסט או קובץ.',
  noNewRecords: 'לא נמצאו רשומות חדשות להקמה.',
} as const

// ── הודעות הצלחה (§12.3) ─────────────────────────────────────────────
export function successContactCreated(): string {
  return 'איש הקשר נוצר בהצלחה.'
}
export function successAccountCreated(): string {
  return 'הארגון נוצר בהצלחה.'
}
export function successStatusUpdated(newStatusLabel: string): string {
  return `הסטטוס עודכן ל׳${newStatusLabel}׳.`
}
export function successDetailsSent(): string {
  return 'הפרטים סומנו כנשלחו ומועד יצירת הקשר האחרון עודכן.'
}
export function successMergeNoOverwrite(): string {
  return 'המידע נוסף לאיש הקשר ללא דריסת ערכים קיימים.'
}
export function successBulkPartial(succeeded: number, total: number): string {
  return `הפעולה בוצעה עבור ${succeeded} מתוך ${total} אנשי קשר.`
}

// ── הודעות שגיאה (§12.4) — תמיד ארבעה מרכיבים: מה / איפה / למה / מה עכשיו ──
export function errorInvalidPhone(): string {
  return 'לא ניתן ליצור את איש הקשר: מספר הטלפון אינו מספר נייד ישראלי תקין.'
}
export function errorAmbiguousMatch(): string {
  return 'לא ניתן לבצע את הפעולה: נמצאו כמה התאמות אפשריות. יש לבחור רשומה ידנית.'
}
export function errorStaleRow(): string {
  return 'הרשומה לא עודכנה משום שהיא השתנתה מאז טעינת המסך. יש לרענן ולנסות שוב.'
}
export function errorNoAccountSelected(): string {
  return 'לא ניתן לקשר את האדם לארגון ללא בחירת ארגון.'
}
export function errorDuplicateFile(): string {
  return 'הקובץ כבר נקלט בעבר ולכן לא עובד פעם נוספת.'
}
export function errorNoIdentifier(): string {
  return 'לא ניתן לעבד את השורה משום שלא נמצא בה מזהה תקין (טלפון, מייל או Facebook).'
}
export function errorAlreadyHandled(dateLabel: string, byLabel: string): string {
  return `כבר טופלה — הפרטים נשלחו ב-${dateLabel} על ידי ${byLabel}.`
}
export function errorPartial(succeeded: number, skipped: number, failed: number): string {
  const parts = [`${succeeded} הצליחו`]
  if (skipped > 0) parts.push(`${skipped} דולגו`)
  if (failed > 0) parts.push(`רשומה אחת נכשלה`.replace('אחת', String(failed)))
  return `הפעולה בוצעה באופן חלקי: ${parts.join(', ')}.`
}
export function errorGeneric(context: string): string {
  return `לא ניתן להשלים את הפעולה (${context}). נסי שוב, ואם הבעיה חוזרת פני לתמיכה הטכנית.`
}

// ── אזהרות ────────────────────────────────────────────────────────
export function warningOrgEmployeeProfile(): string {
  return 'הקישור יסמן את האדם גם כ"עובד ארגון" באופן אוטומטי.'
}
export function warningNoOriginalText(): string {
  return 'לא ניתן לאשר פעולה כאשר ההודעה המקורית אינה מוצגת.'
}

// ── דוח פעולה גורפת (§12.6) ──────────────────────────────────────────
export interface BulkReportCounts {
  occurrences: number
  identities: number
  toUpdate: number
  alreadyHandled: number
  skipped: number
  blocked: number
  succeeded: number
  failed: number
}

export function bulkPreviewSummary(c: Pick<BulkReportCounts, 'occurrences' | 'identities' | 'toUpdate' | 'alreadyHandled' | 'blocked'>): string[] {
  return [
    `${c.occurrences} הופעות נבחרו`,
    `${c.identities} זהויות ייחודיות`,
    `${c.toUpdate} פעולות יבוצעו בפועל`,
    `${c.alreadyHandled} זהויות כבר קיבלו את הפעולה`,
    `${c.blocked} חסומות (התאמה לא ודאית או ללא זהות)`,
  ]
}

export function bulkResultSummary(c: Pick<BulkReportCounts, 'succeeded' | 'skipped' | 'failed'>): string {
  return `${c.succeeded} הצליחו · ${c.skipped} דולגו · ${c.failed} נכשלו`
}
