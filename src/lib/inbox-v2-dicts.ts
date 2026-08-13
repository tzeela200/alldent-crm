import type { DictItem } from '@/types'
import type { AdminBadgeVariant } from '@/components/admin/AdminBadge'
import type { InboxV2Row } from '@/types/inbox-v2'

export const INBOX_STATUSES: DictItem[] = [
  { id: 1, name: 'חדש', slug: 'new', color: '#3B82F6' },
  { id: 2, name: 'נותח', slug: 'analyzed', color: '#8B5CF6' },
  { id: 3, name: 'התאמה חזקה', slug: 'strong-match', color: '#10B981' },
  { id: 4, name: 'התאמה חלקית', slug: 'partial-match', color: '#F59E0B' },
  { id: 5, name: 'ממתין לאישור', slug: 'pending', color: '#EAB308' },
  { id: 6, name: 'מוזג', slug: 'merged', color: '#008080' },
  { id: 7, name: 'נדחה', slug: 'rejected', color: '#EF4444' },
  { id: 8, name: 'התעלמות', slug: 'ignored', color: '#6B7280' },
  { id: 9, name: 'לא דנטלי', slug: 'non-dental', color: '#94A3B8' },
  { id: 10, name: 'שגיאה', slug: 'error', color: '#F43F5E' },
  { id: 11, name: 'קיים במערכת', slug: 'exists', color: '#06B6D4' },
]

// מילון המקורות אינו מוגדר כאן. הוא נטען חי מ-`dict_source_types` דרך
// useInboxV2SourceTypes() — ראו את ההסבר שם. רשימה מוקשחת כאן הייתה
// "נכונה במקרה" ולא הייתה מתעדכנת בעקבות שינוי במסד (INC-3124).

export const ACTION_TYPES: DictItem[] = [
  { id: 1, name: 'מיזוג' },
  { id: 2, name: 'יצירת איש קשר' },
  { id: 3, name: 'יצירת ארגון' },
  { id: 4, name: 'דילוג' },
  { id: 5, name: 'דחייה' },
  { id: 6, name: 'התעלמות' },
  { id: 7, name: 'סימון לבדיקה' },
  { id: 8, name: 'עדכון רשומה קיימת' },
]

export const inboxStatusVariant: Record<number, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'teal'> = {
  1: 'info',
  2: 'default',
  3: 'success',
  4: 'warning',
  5: 'warning',
  6: 'teal',
  7: 'danger',
  8: 'default',
  9: 'default',
  10: 'danger',
  11: 'info',
}

/** מיפוי סטטוס טיפול ל-AdminBadge (הרכיב המשותף). */
export const inboxStatusAdminVariant: Record<number, AdminBadgeVariant> = {
  1: 'info',
  2: 'neutral',
  3: 'success',
  4: 'warning',
  5: 'amber',
  6: 'teal',
  7: 'error',
  8: 'neutral',
  9: 'neutral',
  10: 'error',
  11: 'info',
}

export function getDictName(items: DictItem[], id: number | null | undefined): string {
  if (id == null) return '—'
  return items.find((i) => i.id === id)?.name ?? String(id)
}

/**
 * שם המקור של הרשומה, לתצוגה (INC-3124).
 *
 * עד INC-3124 המסך הניח שכל רשומה הגיעה מ-Google וכתב "הגיע מגוגל" קבוע.
 * זה היה נכון במקרה — 100% מהנתונים היו Google — אבל ברגע שנכנס Excel
 * או הדבקה ידנית, המסך שיקר למשתמשת לגבי מקור המידע.
 *
 * `short` הוא סוג המקור מהמילון ("Excel", "Google Contacts") ומשמש בתוויות
 * הכפתורים; `full` מוסיף את שם המקור החופשי אם הוזן, ומשמש בכותרות.
 */
export function sourceLabel(
  row: Pick<InboxV2Row, 'source_type' | 'source_name'>,
  sourceTypes: DictItem[] | undefined
): { short: string; full: string } {
  const dictName =
    row.source_type != null ? getDictName(sourceTypes ?? [], row.source_type) : null
  const short = dictName && dictName !== '—' ? dictName : (row.source_name ?? 'מקור לא ידוע')
  const full = row.source_name && row.source_name !== short ? `${short} · ${row.source_name}` : short
  return { short, full }
}

/**
 * שמות עבריים לשדות שמופיעים ב-suggested_updates.
 * המפתחות מגיעים מ-inbox_compute_diff ומשקפים שמות עמודות — ערך טכני
 * באנגלית לעולם אינו מוצג למשתמשת.
 */
const FIELD_LABEL: Record<string, string> = {
  display_name: 'שם תצוגה',
  account_name: 'שם ארגון',
  phone: 'נייד ראשי',
  second_phone: 'נייד נוסף',
  email: 'מייל ראשי',
  second_email: 'מייל נוסף',
  role: 'תפקיד',
  city_id: 'עיר',
  facebook_name: 'שם Facebook',
  facebook_id: 'מזהה Facebook',
  facebook_url: 'קישור Facebook',
  role_conflict: 'סתירת תפקיד',
}

export function fieldLabel(key: string): string {
  return FIELD_LABEL[key] ?? key
}

/** תיאור עברי לסטטוס ההשוואה שנשמר ב-suggested_updates. */
const DIFF_STATUS_LABEL: Record<string, string> = {
  complete: 'השלמת מידע חסר',
  diff: 'פער — נדרשת בחירה',
  unresolved: 'מידע לא מזוהה',
}

export function diffStatusLabel(status: unknown): string | null {
  return typeof status === 'string' ? (DIFF_STATUS_LABEL[status] ?? null) : null
}

// =====================================================
// הפרדת שלושת צירי הסטטוס (INC-3108 — SSOT)
// מקור אמת: dict_inbox_statuses / dict_inbox_action_types / dict_check_statuses
// ב-DB יש רק עמודה אחת (merge_status). הצירים נגזרים בקוד.
// =====================================================

/**
 * סטטוס טיפול הניתן לבחירה ידנית.
 * 3/4/11 ("התאמה חזקה/חלקית/קיים במערכת") נכתבים ע"י ה-RPC כתוצאת התאמה —
 * לא ערך שאדמין קובע ידנית — ולכן מוסתרים מבחירה. נשארים ב-INBOX_STATUSES לתצוגה.
 */
export const MANUAL_INBOX_STATUS_IDS = [1, 2, 5, 6, 7, 8, 9, 10]
export const MANUAL_INBOX_STATUSES = INBOX_STATUSES.filter((s) =>
  MANUAL_INBOX_STATUS_IDS.includes(s.id)
)

/** רשומות "פתוחות בשער" (עדיין דורשות החלטה) מול "סגורות" (טופלו). — מסגור שומר הסף */
// INC-3124: 11 ("קיים במערכת") עבר מ"פתוח" ל"סגור".
// רשומה שהותאמה בוודאות ואין בה שום מידע חדש או שונה אינה דורשת החלטה,
// ולכן אין לה מה לעשות בתור הטיפול. קודם היא נחשבה "פתוחה" — וזו בדיוק
// הסיבה שהתור התמלא ברשומות שאין בהן מה לאשר.
export const OPEN_STATUS_IDS = [1, 2, 3, 4, 5]
export const CLOSED_STATUS_IDS = [6, 7, 8, 9, 10, 11]

/** קבועי סוג פעולה — מקור אמת dict_inbox_action_types. לא להשתמש בליטרלים חשופים. */
export const INBOX_ACTION = {
  MERGE: 1,
  CREATE_CONTACT: 2,
  CREATE_ACCOUNT: 3,
  SKIP: 4,
  REJECT: 5,
  IGNORE: 6,
  FLAG_REVIEW: 7,
  UPDATE_EXISTING: 8,
} as const

/** האם לרשומה יש סתירה מסומנת (למשל תפקיד שונה) שאין לדרוס אוטומטית. */
export function hasConflict(row: Pick<InboxV2Row, 'suggested_updates'>): boolean {
  const su = row.suggested_updates
  if (!su) return false
  return Object.values(su).some((v) => v?.conflict === true)
}

export type MatchResult = { label: string; variant: AdminBadgeVariant }

/**
 * תוצאת התאמה — ציר נפרד מ"סטטוס טיפול".
 * נגזרת מ-match_contact / match_account / match_confidence, לא מ-merge_status.
 * מפרידה במפורש בין "התאמת איש קשר" ל"זוהה ארגון בלבד" (באג ה-RPC: ארגון→85→merge_status=3).
 */
export function deriveMatchResult(
  row: Pick<
    InboxV2Row,
    'match_contact' | 'match_account' | 'match_confidence' | 'merge_status' | 'suggested_updates'
  >
): MatchResult {
  if (row.merge_status === 10) return { label: 'שגיאה', variant: 'error' }

  if (row.match_contact != null) {
    if (hasConflict(row)) return { label: 'נמצאה סתירה', variant: 'amber' }
    const c = row.match_confidence ?? 0
    if (c >= 80) return { label: 'התאמה חזקה', variant: 'success' }
    if (c >= 40) return { label: 'התאמה חלקית', variant: 'warning' }
    return { label: 'לא ודאי', variant: 'neutral' }
  }

  if (row.match_account != null) {
    return { label: 'זוהה ארגון — אין איש קשר תואם', variant: 'info' }
  }

  if (row.merge_status === 1) return { label: 'טרם נבדק', variant: 'neutral' }
  return { label: 'לא קיים במערכת', variant: 'neutral' }
}
