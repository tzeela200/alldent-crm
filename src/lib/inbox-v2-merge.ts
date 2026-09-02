// =====================================================
// INC-3115 — לוגיקת ההשוואה והמיזוג של שער Inbox 2
//
// מודול טהור (ללא React) כדי שאפשר יהיה להריץ עליו בדיקות קבלה ישירות.
// מקור אמת יחיד ל:
//   - ניתוב הרשומה (אדם / ארגון / לא מסווג / סתירה)
//   - השוואת שדות אחרי נרמול
//   - הרכבת ה-patch לכתיבה, עם whitelist סגורה לכל ישות
//
// המסך לא מנתח את המקור, לא מפצל שמות ולא מנחש תפקיד/עיר/סוג רשומה.
// עבור Google, חוזה הנתונים הנכנס נכתב על ידי n8n (Workflow GOOGLE-01);
// עבור Excel/CSV/הדבקה ידנית הוא נכתב על ידי inbox-v2-parser.ts.
//
// ⚠ מקור אמת כפול-מראה (INC-3124):
// CONTACT_MERGE_FIELDS / ACCOUNT_MERGE_FIELDS וכללי ההשוואה כאן הם עותק
// מדויק של הפונקציה `public.inbox_compute_diff` ב-Supabase, שבה משתמש
// `match_inbox_row`. הכפילות נחוצה מפני שה-matching רץ בשרת ללא דפדפן
// (ייבוא אצווה) והפאנל רץ בדפדפן על נתוני היעד הטריים — אך שתי הנקודות
// **חייבות** להגיע לאותה מסקנה, אחרת רשומה תיסגר כ"קיים במערכת" בזמן
// שהפאנל היה מציג פער אמיתי. כל שינוי כאן מחייב שינוי זהה שם, ולהפך.
// =====================================================

import { normalizePhone, phoneDigits } from '@/lib/normalizePhone'
import type { InboxV2Row } from '@/types/inbox-v2'

// ─────────────────────────────────────────────────────
// ניתוב
// ─────────────────────────────────────────────────────

export type InboxRoute =
  | 'match_conflict'
  | 'merge_contact'
  | 'merge_account'
  | 'create_account'
  | 'create_contact'
  | 'unclassified'

export type RecordType = 'organization' | 'person'

export type RouteResult = {
  route: InboxRoute
  /** אזהרה גלויה כשהסיווג של n8n סותר את ההתאמה שנמצאה. */
  classificationWarning: string | null
}

/**
 * סוג הרשומה כפי ש-n8n קבעה. רק שני ערכים תקינים.
 * כל דבר אחר (חסר, null, מחרוזת אחרת, טיפוס לא צפוי) מוחזר כ-null —
 * ואז הרשומה נופלת ל-`unclassified`. אין ברירת מחדל שקטה ל-'person'.
 */
export function getRecordType(row: Pick<InboxV2Row, 'parsed_payload'>): RecordType | null {
  const raw = (row.parsed_payload as Record<string, unknown> | null)?.record_type
  if (raw === 'organization' || raw === 'person') return raw
  return null
}

/**
 * נקודת האמת היחידה לניתוב. אין קריאה של merge_status בשום ענף —
 * ה-RPC כותב merge_status=3 גם להתאמת ארגון בלבד, ולכן הוא אינו ראיה לאדם.
 */
export function resolveInboxRoute(
  row: Pick<InboxV2Row, 'match_contact' | 'match_account' | 'parsed_payload'>
): RouteResult {
  const recordType = getRecordType(row)
  const hasContact = row.match_contact != null
  const hasAccount = row.match_account != null

  // 1. שתי התאמות = סתירה, לא היררכיה. אדם לא מנצח אוטומטית.
  if (hasContact && hasAccount) {
    return {
      route: 'match_conflict',
      classificationWarning: null,
    }
  }

  if (hasContact) {
    return {
      route: 'merge_contact',
      classificationWarning:
        recordType === 'organization'
          ? 'המקור סיווג כארגון אך נמצאה התאמה לאדם — בדקי לפני אישור'
          : null,
    }
  }

  if (hasAccount) {
    return {
      route: 'merge_account',
      classificationWarning:
        recordType === 'person'
          ? 'המקור סיווג כאדם אך נמצאה התאמה לארגון — בדקי לפני אישור'
          : null,
    }
  }

  if (recordType === 'organization') return { route: 'create_account', classificationWarning: null }
  if (recordType === 'person') return { route: 'create_contact', classificationWarning: null }

  // 6. אין התאמה ואין סיווג תקין — עצירה. המסך לא מנחש.
  return { route: 'unclassified', classificationWarning: null }
}

export const ROUTE_LABEL: Record<InboxRoute, string> = {
  match_conflict: 'סתירת התאמה',
  merge_contact: 'התאמה לאיש קשר',
  merge_account: 'התאמה לארגון',
  create_account: 'ארגון חדש',
  create_contact: 'איש קשר חדש',
  unclassified: 'סוג הרשומה לא נקבע',
}

// ─────────────────────────────────────────────────────
// נרמול והשוואה
// ─────────────────────────────────────────────────────

/** תווי רוחב-אפס וסימוני כיווניות שמגיעים מ-Google ומ-Excel. */
const INVISIBLE_CHARS = /[​-‏‪-‮﻿]/g

export function normalizeEmail(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.replace(INVISIBLE_CHARS, '').replace(/\s+/g, '').toLowerCase()
}

export function normalizeText(value: unknown): string {
  if (value == null) return ''
  return String(value).replace(INVISIBLE_CHARS, '').trim()
}

/** נייד ישראלי תקין לפי אותו כלל של normalize_il_mobile_phone ב-Supabase. */
export function isValidILMobile(value: unknown): boolean {
  return /^9725\d{8}$/.test(normalizePhone(typeof value === 'string' ? value : ''))
}

/**
 * מפתח השוואה לטלפון. נייד תקין מושווה בפורמט הקנוני 9725XXXXXXXX,
 * וכל שאר המספרים (קווי, 077, חו״ל) מושווים לפי ספרות בלבד —
 * כדי שגם הם לא ייחשבו "פער" כשהם למעשה אותו מספר.
 */
export function phoneCompareKey(value: unknown): string {
  const raw = typeof value === 'string' ? value : value == null ? '' : String(value)
  if (!raw.trim()) return ''
  return isValidILMobile(raw) ? normalizePhone(raw) : phoneDigits(raw)
}

export type FacebookValueKind = 'id' | 'url' | 'name' | 'empty'

/**
 * מזהה Facebook הוא מזהה — לא שם ולא קישור.
 * טיפוס העמודה (bigint ב-contact, text ב-accounts) אינו משנה את הכלל הזה.
 */
export function classifyFacebookValue(value: unknown): FacebookValueKind {
  const v = normalizeText(value)
  if (!v) return 'empty'
  if (/^\d+$/.test(v)) return 'id'
  if (/^https?:\/\//i.test(v) || /facebook\.com/i.test(v) || /fb\.(com|me)/i.test(v)) return 'url'
  return 'name'
}

export function isNumericId(value: unknown): boolean {
  return classifyFacebookValue(value) === 'id'
}

/**
 * `dict_roles.id = 14` — "עובד/ת דנטלי" (prefix EMP), התפקיד הכללי.
 * ה-Aliases "מועמדת" ו-"דנטל" ב-Google ממופים אליו דרך `detect_role_from_text`.
 */
export const GENERIC_ROLE_ID = 14

/**
 * `dict_cities.id = 1173` — "כללי". אומת חי: זו העיר הגנרית היחידה במילון.
 * עיר אמיתית גוברת עליה תמיד, לשני הכיוונים (INC-3125 §14).
 */
export const GENERIC_CITY_ID = 1173

/** האם הערך הנכנס/הקיים הוא הערך הגנרי של אותו מילון. */
function isGenericDictValue(kind: FieldKind, id: number | null): boolean {
  if (id == null) return false
  if (kind === 'role') return id === GENERIC_ROLE_ID
  if (kind === 'city') return id === GENERIC_CITY_ID
  return false
}

/**
 * `dict_genders` — 1 = נקבה · 2 = זכר. אומת חי.
 */
export const GENDER_FEMALE_ID = 1
export const GENDER_MALE_ID = 2

/**
 * תפקידים ששם התפקיד עצמו נקבי ואינו סובל צורת זכר (INC-3137).
 * 9 = "סייעת רופא שיניים" · 10 = "שיננית" · 13 = "מזכירה דנטלית".
 *
 * **מה שבמכוון אינו כאן**: 12 ("מנהל/ת דנטלי") ו-14 ("עובד/ת דנטלי").
 * שמם דו-מגדרי, ולכן ניהול אינו מעיד על מגדר — כך הוגדר במפורש.
 *
 * זו **ברירת מחדל בלבד**: סימון זכר מפורש בטקסט המקור גובר עליה,
 * והשדה נשאר פתוח לעריכה לפני היצירה.
 */
export const FEMININE_ROLE_IDS: ReadonlySet<number> = new Set([9, 10, 13])

/**
 * מגדר נגזר מכינוי התפקיד שהגיע מ-Google (INC-3125).
 *
 * ב-Google Contacts התפקיד נכתב בתוך שם המשפחה, למשל
 * `familyName: "מועמדת כללי"`. שני הכינויים האלה ממופים שניהם לתפקיד
 * הכללי 14 ("עובד/ת דנטלי") ולכן התפקיד עצמו אינו מבחין ביניהם —
 * אבל הכינוי כן: "מועמדת" הוא נקבה, "דנטל" הוא זכר.
 *
 * ההשוואה היא על **מילים שלמות** ולא על הכלה. `` אינו עובד על עברית,
 * ובלי פיצול לטוקנים השם "אולדנט" היה נספר כ"דנטל".
 */
export function deriveGenderFromSource(
  row: Pick<InboxV2Row, 'display_name' | 'parsed_payload' | 'raw_payload' | 'temp_role'>
): number | null {
  const parsed = (row.parsed_payload ?? {}) as Record<string, unknown>
  const raw = (row.raw_payload ?? {}) as Record<string, unknown>
  const names = Array.isArray(raw.names) ? (raw.names as Record<string, unknown>[]) : []

  const texts = [
    row.display_name,
    parsed.role_text_raw,
    parsed.temp_role_name,
    parsed.role_text,
    ...names.flatMap((n) => [n.familyName, n.displayName, n.unstructuredName]),
  ]

  const tokens = texts
    .map((t) => normalizeText(t))
    .filter(Boolean)
    .flatMap((t) => t.split(/[\s,.\-–—()[\]/|]+/))
    .filter(Boolean)

  // כינוי מפורש גובר תמיד על ברירת המחדל של התפקיד.
  if (tokens.some((t) => t === 'מועמדת')) return GENDER_FEMALE_ID
  if (tokens.some((t) => t === 'דנטל')) return GENDER_MALE_ID

  // אין כינוי — התפקיד עצמו מכריע, אך רק כשהוא נקבי באופן מובהק.
  if (row.temp_role != null && FEMININE_ROLE_IDS.has(Number(row.temp_role))) {
    return GENDER_FEMALE_ID
  }
  return null
}

// ─────────────────────────────────────────────────────
// מפות השדות
// ─────────────────────────────────────────────────────

export type MergeEntity = 'contact' | 'account'
// 'account_type' קיים כתשתית בלבד: Google אינו שולח סוג ארגון, ולכן שדה
// כזה לא מופיע היום ב-ACCOUNT_MERGE_FIELDS ולעולם לא ייווצר בו פער.
// הסוג קיים כדי ש"ערך אחר" יעבוד מיידית אם המקור יתחיל לספק אותו.
export type FieldKind = 'text' | 'phone' | 'email' | 'role' | 'city' | 'fbid' | 'url' | 'account_type'

export interface MergeFieldDef {
  key: string
  label: string
  kind: FieldKind
  /** עמודת המקור ב-inbox_v2 */
  from: keyof InboxV2Row
  /** עמודת היעד בישות */
  to: string
  /** יעד משני ("שמור כנייד נוסף" / "שמור כמייל נוסף") */
  secondaryTo?: string
}

/**
 * עשרת השדות המאושרים למסלול איש קשר.
 * אין first_name / last_name / full_name / region_id / license_no — לא בחוזה המסך.
 */
export const CONTACT_MERGE_FIELDS: MergeFieldDef[] = [
  { key: 'display_name', label: 'שם תצוגה', kind: 'text', from: 'display_name', to: 'display_name' },
  { key: 'phone', label: 'נייד ראשי', kind: 'phone', from: 'phone', to: 'phone', secondaryTo: 'second_phone' },
  { key: 'second_phone', label: 'נייד נוסף', kind: 'phone', from: 'second_phone', to: 'second_phone' },
  { key: 'email', label: 'מייל ראשי', kind: 'email', from: 'email', to: 'email', secondaryTo: 'second_email' },
  { key: 'second_email', label: 'מייל נוסף', kind: 'email', from: 'second_email', to: 'second_email' },
  { key: 'role', label: 'תפקיד', kind: 'role', from: 'temp_role', to: 'role' },
  { key: 'city_id', label: 'עיר', kind: 'city', from: 'temp_city_id', to: 'city_id' },
  { key: 'facebook_name', label: 'שם Facebook', kind: 'text', from: 'facebook_name', to: 'facebook_name' },
  { key: 'facebook_id', label: 'מזהה Facebook', kind: 'fbid', from: 'facebook_id', to: 'facebook_id' },
  { key: 'facebook_url', label: 'קישור Facebook', kind: 'url', from: 'facebook_url', to: 'facebook_url' },
]

/**
 * תשעת השדות המקבילים למסלול ארגון.
 * תפקיד יורד — ל-accounts אין עמודת role.
 * account_status לא נכתב (ברירת מחדל 10 = "ארגון חדש").
 */
export const ACCOUNT_MERGE_FIELDS: MergeFieldDef[] = [
  { key: 'account_name', label: 'שם ארגון', kind: 'text', from: 'display_name', to: 'account_name' },
  { key: 'phone', label: 'טלפון ראשי', kind: 'phone', from: 'phone', to: 'phone', secondaryTo: 'second_phone' },
  { key: 'second_phone', label: 'טלפון נוסף', kind: 'phone', from: 'second_phone', to: 'second_phone' },
  { key: 'email', label: 'מייל ראשי', kind: 'email', from: 'email', to: 'email', secondaryTo: 'second_email' },
  { key: 'second_email', label: 'מייל נוסף', kind: 'email', from: 'second_email', to: 'second_email' },
  { key: 'city_id', label: 'עיר', kind: 'city', from: 'temp_city_id', to: 'city_id' },
  { key: 'facebook_name', label: 'שם Facebook', kind: 'text', from: 'facebook_name', to: 'facebook_name' },
  { key: 'facebook_id', label: 'מזהה Facebook', kind: 'fbid', from: 'facebook_id', to: 'facebook_id' },
  { key: 'facebook_url', label: 'קישור Facebook', kind: 'url', from: 'facebook_url', to: 'facebook_url' },
]

export function fieldsFor(entity: MergeEntity): MergeFieldDef[] {
  return entity === 'account' ? ACCOUNT_MERGE_FIELDS : CONTACT_MERGE_FIELDS
}

/**
 * whitelist סגורה — הגנה אחרונה. גם אם רכיב UI ישלח משהו אחר,
 * buildPatch לא יעביר מפתח שאינו ברשימה.
 */
const CONTACT_WRITABLE = new Set([
  'display_name',
  'phone',
  'second_phone',
  'email',
  'second_email',
  'role',
  'city_id',
  'facebook_name',
  'facebook_id',
  'facebook_url',
])

const ACCOUNT_WRITABLE = new Set([
  'account_name',
  'phone',
  'second_phone',
  'email',
  'second_email',
  'city_id',
  'facebook_name',
  'facebook_id',
  'facebook_url',
])

export function writableKeys(entity: MergeEntity): Set<string> {
  return entity === 'account' ? ACCOUNT_WRITABLE : CONTACT_WRITABLE
}

// ─────────────────────────────────────────────────────
// השוואה
// ─────────────────────────────────────────────────────

/**
 * 'auto' = הוכרע אוטומטית לפי חוק עסקי, בלי לשאול את המשתמשת
 * (ערך ספציפי גובר על ערך כללי). אינו חוסם שמירה, אך כן מופיע
 * בתוצאה הסופית — המערכת חוסכת החלטה, לא מסתירה מה ייכתב (§17).
 */
export type ComparisonStatus =
  | 'none'
  | 'same'
  | 'complete'
  | 'diff'
  | 'unresolved'
  | 'auto'
  /**
   * 'removed' = יש לנו ערך, והמקור הגיע בלי ערך — כלומר הוא נמחק שם.
   * זו **החלטה של המשתמשת ולעולם לא פעולה אוטומטית**: ברירת המחדל היא
   * לשמור את הקיים, והמחיקה מתבצעת רק בבחירה מפורשת.
   * בלי הסטטוס הזה מחיקה במקור פשוט נעלמה — המסך אמר "אין שינוי".
   */
  | 'removed'
/** 'manual' = "ערך אחר" — ערך שהמשתמשת הזינה או בחרה ממילון (INC-3123). */
/**
 * 'existing_secondary' = "השתמש בערך המשני שכבר קיים אצלנו" (§10).
 * לדוגמה: הנייד הנוסף שכבר במאגר יהפוך לנייד הראשי. בלי זה, ערך שכבר
 * קיים ב-Supabase היה צריך להיות מוקלד מחדש ידנית.
 */
export type ChoiceId =
  | 'skip'
  | 'existing'
  | 'incoming'
  | 'secondary'
  | 'redirect'
  | 'manual'
  | 'existing_secondary'

export interface FieldOption {
  id: ChoiceId
  label: string
  /** דורש סימון "אני מאשרת דריסה" לפני שניתן לבחור */
  requiresOverwriteConfirm?: boolean
}

export interface FieldComparison {
  key: string
  label: string
  kind: FieldKind
  status: ComparisonStatus
  /** הערך הגולמי שיישלח ל-DB אם ייבחר "קבל" */
  incomingRaw: unknown
  /** הערך להצגה (שם עברי למילונים, פורמט מקומי לנייד) */
  incomingLabel: string | null
  existingRaw: unknown
  existingLabel: string | null
  options: FieldOption[]
  /** סיבת חסימה כשהסטטוס unresolved */
  blockedReason: string | null
  /** עמודת יעד ל"שמור כנוסף" */
  secondaryTarget: string | null
  /** הערך המשני שכבר קיים אצלנו, כשניתן לקדם אותו לראשי (§10) */
  existingSecondaryValue: unknown
  existingSecondaryLabel: string | null
  /** עמודת יעד להפניית ערך Facebook שמוקם בעמודה הלא נכונה */
  redirectTarget: string | null
  /** עמודת היעד הראשית */
  target: string
}

export interface DictLike {
  id: number
  name: string
}

export interface ComparisonDicts {
  roles?: DictLike[]
  cities?: DictLike[]
}

function dictLabel(items: DictLike[] | undefined, id: unknown): string | null {
  if (id == null) return null
  if (!items) return String(id)
  return items.find((d) => d.id === Number(id))?.name ?? String(id)
}

function rawHint(row: InboxV2Row, keys: string[]): string {
  const parsed = (row.parsed_payload ?? {}) as Record<string, unknown>
  const raw = (row.raw_payload ?? {}) as Record<string, unknown>
  for (const k of keys) {
    const v = normalizeText(parsed[k] ?? raw[k])
    if (v) return v
  }
  return ''
}

function formatPhoneLabel(value: unknown): string | null {
  const v = normalizeText(value)
  if (!v) return null
  return v
}

/** ברירת מחדל כשהמקור אינו ידוע — לעולם לא "Google" (INC-3124). */
export const DEFAULT_SOURCE_LABEL = 'המקור'

/**
 * בונה את שורות ההשוואה לשער האישור.
 * `target` הוא רשומת contact או accounts כפי שנטענה מ-Supabase.
 * `sourceLabel` הוא שם המקור בפועל ("Excel" / "Google Contacts" / ...),
 * ומופיע בתוויות הבחירה. אין להניח Google.
 */
export function buildComparisons(
  row: InboxV2Row,
  target: Record<string, unknown> | null,
  dicts: ComparisonDicts,
  entity: MergeEntity,
  sourceLabel: string = DEFAULT_SOURCE_LABEL
): FieldComparison[] {
  const defs = fieldsFor(entity)
  const t = target ?? {}

  // כל מפתחות הטלפון והמייל הקיימים בישות — לדדופליקציה חוצת-שדות.
  const existingPhoneKeys = [phoneCompareKey(t.phone), phoneCompareKey(t.second_phone)].filter(Boolean)
  const existingEmailKeys = [normalizeEmail(t.email), normalizeEmail(t.second_email)].filter(Boolean)

  return defs.map((def) =>
    buildOne(def, row, t, dicts, entity, existingPhoneKeys, existingEmailKeys, sourceLabel)
  )
}

function buildOne(
  def: MergeFieldDef,
  row: InboxV2Row,
  t: Record<string, unknown>,
  dicts: ComparisonDicts,
  entity: MergeEntity,
  existingPhoneKeys: string[],
  existingEmailKeys: string[],
  sourceLabel: string
): FieldComparison {
  const base: FieldComparison = {
    key: def.key,
    label: def.label,
    kind: def.kind,
    status: 'none',
    incomingRaw: null,
    incomingLabel: null,
    existingRaw: t[def.to] ?? null,
    existingLabel: null,
    options: [],
    blockedReason: null,
    secondaryTarget: null,
    existingSecondaryValue: null,
    existingSecondaryLabel: null,
    redirectTarget: null,
    target: def.to,
  }

  const incomingSource = row[def.from]

  switch (def.kind) {
    case 'phone':
      return buildPhone(def, base, incomingSource, t, entity, existingPhoneKeys, sourceLabel)
    case 'email':
      return buildEmail(def, base, incomingSource, t, existingEmailKeys, sourceLabel)
    case 'role':
      return buildDict(def, base, incomingSource, t, dicts.roles, row, [
        'role_text_raw',
        'temp_role_name',
        'role_text',
      ], sourceLabel)
    case 'city':
      return buildDict(def, base, incomingSource, t, dicts.cities, row, [
        'city_text_raw',
        'temp_city_name',
        'city_text',
      ], sourceLabel)
    case 'fbid':
      return buildFacebookId(def, base, incomingSource, t, entity, sourceLabel)
    default:
      return buildPlainText(def, base, incomingSource, t, sourceLabel)
  }
}

/** תווית "קבל" עם שם המקור בפועל. */
function acceptLabel(sourceLabel: string): string {
  return `קבל מ-${sourceLabel}`
}

/**
 * המקור הגיע בלי ערך בשדה שיש בו ערך אצלנו.
 * מוצג כשורת החלטה; ברירת המחדל נשארת "שמור קיים".
 */
function buildRemoved(base: FieldComparison, existingLabel: string | null): FieldComparison {
  base.status = 'removed'
  base.existingLabel = existingLabel
  base.incomingRaw = null
  base.incomingLabel = null
  base.options = [
    { id: 'existing', label: 'שמור קיים' },
    { id: 'incoming', label: 'מחק גם אצלנו' },
  ]
  return base
}

function overwriteOptions(existingLabel: string | null, extra: FieldOption[] = []): FieldOption[] {
  const opts: FieldOption[] = []
  if (existingLabel != null) opts.push({ id: 'existing', label: 'שמור קיים' })
  opts.push(...extra)
  opts.push({ id: 'skip', label: 'דלג' })
  return opts
}

function buildPhone(
  def: MergeFieldDef,
  base: FieldComparison,
  incomingSource: unknown,
  t: Record<string, unknown>,
  entity: MergeEntity,
  existingPhoneKeys: string[],
  sourceLabel: string
): FieldComparison {
  const incoming = normalizeText(incomingSource)
  if (!incoming) {
    const existingLabel = formatPhoneLabel(t[def.to])
    return existingLabel ? buildRemoved(base, existingLabel) : base
  }

  const incomingKey = phoneCompareKey(incoming)
  base.incomingRaw = incoming
  base.incomingLabel = formatPhoneLabel(incoming)
  base.existingLabel = formatPhoneLabel(t[def.to])

  // כבר קיים באחד משדות הטלפון — לא פער, לא כתיבה, לא שמירה כפולה.
  if (incomingKey && existingPhoneKeys.includes(incomingKey)) {
    base.status = 'same'
    return base
  }

  // contact: הטריגר set_contact_phone_norm זורק חריגה על מספר שאינו נייד ישראלי.
  // accounts: הטריגר מחזיר NULL בשקט, וקו נייח של מרפאה הוא ערך לגיטימי.
  if (entity === 'contact' && !isValidILMobile(incoming)) {
    base.status = 'unresolved'
    base.blockedReason = 'אינו נייד ישראלי תקין — נשמר ב-raw בלבד'
    base.options = overwriteOptions(base.existingLabel)
    return base
  }

  const extra: FieldOption[] = [
    {
      id: 'incoming',
      label: acceptLabel(sourceLabel),
      requiresOverwriteConfirm: base.existingLabel != null,
    },
  ]

  // "שמור כנייד נוסף" — רק כשהשדה המשני פנוי או מכיל מספר אחר.
  if (def.secondaryTo) {
    const secondaryKey = phoneCompareKey(t[def.secondaryTo])
    if (!secondaryKey || secondaryKey !== incomingKey) {
      base.secondaryTarget = def.secondaryTo
      extra.push({
        id: 'secondary',
        label: 'שמור כנייד נוסף',
        requiresOverwriteConfirm: !!secondaryKey,
      })
    }
    // §10 — הנייד הנוסף שכבר קיים אצלנו הוא בחירה לגיטימית לראשי,
    // ואין סיבה להקליד אותו מחדש.
    if (secondaryKey && secondaryKey !== phoneCompareKey(t[def.to])) {
      base.existingSecondaryValue = t[def.secondaryTo]
      base.existingSecondaryLabel = formatPhoneLabel(t[def.secondaryTo])
      extra.push({
        id: 'existing_secondary',
        label: 'קדם את הנייד הנוסף הקיים',
        requiresOverwriteConfirm: base.existingLabel != null,
      })
    }
  }

  base.status = base.existingLabel == null ? 'complete' : 'diff'
  base.options = overwriteOptions(base.existingLabel, extra)
  return base
}

function buildEmail(
  def: MergeFieldDef,
  base: FieldComparison,
  incomingSource: unknown,
  t: Record<string, unknown>,
  existingEmailKeys: string[],
  sourceLabel: string
): FieldComparison {
  const incomingKey = normalizeEmail(incomingSource)
  if (!incomingKey) {
    const existingLabel = normalizeEmail(t[def.to]) || null
    return existingLabel ? buildRemoved(base, existingLabel) : base
  }

  base.incomingRaw = incomingKey // נשמר מנורמל — lowercase, בלי רווחים
  base.incomingLabel = incomingKey
  base.existingLabel = normalizeEmail(t[def.to]) || null

  if (existingEmailKeys.includes(incomingKey)) {
    base.status = 'same'
    return base
  }

  const extra: FieldOption[] = [
    { id: 'incoming', label: acceptLabel(sourceLabel), requiresOverwriteConfirm: base.existingLabel != null },
  ]

  if (def.secondaryTo) {
    const secondaryKey = normalizeEmail(t[def.secondaryTo])
    if (!secondaryKey || secondaryKey !== incomingKey) {
      base.secondaryTarget = def.secondaryTo
      extra.push({
        id: 'secondary',
        label: 'שמור כמייל נוסף',
        requiresOverwriteConfirm: !!secondaryKey,
      })
    }
    // §10 — המייל הנוסף שכבר קיים אצלנו זמין לבחירה כראשי.
    if (secondaryKey && secondaryKey !== normalizeEmail(t[def.to])) {
      base.existingSecondaryValue = t[def.secondaryTo]
      base.existingSecondaryLabel = secondaryKey
      extra.push({
        id: 'existing_secondary',
        label: 'קדם את המייל הנוסף הקיים',
        requiresOverwriteConfirm: base.existingLabel != null,
      })
    }
  }

  base.status = base.existingLabel == null ? 'complete' : 'diff'
  base.options = overwriteOptions(base.existingLabel, extra)
  return base
}

function buildDict(
  def: MergeFieldDef,
  base: FieldComparison,
  incomingSource: unknown,
  t: Record<string, unknown>,
  items: DictLike[] | undefined,
  row: InboxV2Row,
  hintKeys: string[],
  sourceLabel: string
): FieldComparison {
  base.existingLabel = dictLabel(items, t[def.to])

  if (incomingSource == null) {
    // המקור לא הצליח לפתור את הערך. אם יש טקסט גולמי — זו "מידע לא מזוהה"
    // שדורש תשומת לב; אם אין בכלל, פשוט אין מה למזג.
    const hint = rawHint(row, hintKeys)
    if (hint) {
      base.status = 'unresolved'
      base.incomingLabel = hint
      base.blockedReason =
        def.kind === 'role'
          ? 'התפקיד לא זוהה מהמקור — לא נכתב ערך'
          : 'העיר לא זוהתה מהמקור — לא נכתב ערך'
      base.options = overwriteOptions(base.existingLabel)
    }
    return base
  }

  const incomingId = Number(incomingSource)
  base.incomingRaw = incomingId
  base.incomingLabel = dictLabel(items, incomingId)

  if (t[def.to] != null && Number(t[def.to]) === incomingId) {
    base.status = 'same'
    return base
  }

  // ── חוק: מידע ספציפי גובר על מידע כללי, לשני הכיוונים (§14–§15) ──
  //
  // "כללי" (עיר 1173) ו"עובד/ת דנטלי" (תפקיד 14, שאליו ממופים גם
  // "מועמדת" ו"דנטל") הם ערכי בררת-מחדל, לא מידע. הם לעולם לא גוברים על
  // ערך מקצועי/עירוני אמיתי, ואין סיבה לשאול את המשתמשת על כך.
  const existingId = t[def.to] != null ? Number(t[def.to]) : null
  const incomingGeneric = isGenericDictValue(def.kind, incomingId)
  const existingGeneric = isGenericDictValue(def.kind, existingId)

  // הקיים ספציפי, הנכנס כללי ⇒ אין הורדת איכות, אין פער.
  if (incomingGeneric && existingId != null && !existingGeneric) {
    base.status = 'same'
    base.blockedReason =
      def.kind === 'role'
        ? 'במאגר יש תפקיד מדויק יותר — אין הורדה לערך הכללי'
        : 'במאגר יש עיר מדויקת — אין הורדה ל"כללי"'
    return base
  }

  // הקיים כללי, הנכנס ספציפי ⇒ שדרוג ודאי. מוכרע אוטומטית.
  if (existingGeneric && !incomingGeneric) {
    base.status = 'auto'
    base.blockedReason =
      def.kind === 'role'
        ? 'תפקיד מקצועי גובר על הערך הכללי — הוכרע אוטומטית'
        : 'עיר אמיתית גוברת על "כללי" — הוכרע אוטומטית'
    return base
  }

  base.status = base.existingLabel == null ? 'complete' : 'diff'
  base.options = overwriteOptions(base.existingLabel, [
    { id: 'incoming', label: acceptLabel(sourceLabel), requiresOverwriteConfirm: base.existingLabel != null },
  ])
  return base
}

function buildFacebookId(
  def: MergeFieldDef,
  base: FieldComparison,
  incomingSource: unknown,
  t: Record<string, unknown>,
  _entity: MergeEntity,
  sourceLabel: string
): FieldComparison {
  const kind = classifyFacebookValue(incomingSource)
  if (kind === 'empty') {
    const existingLabel = t[def.to] != null ? String(t[def.to]) : null
    return existingLabel ? buildRemoved(base, existingLabel) : base
  }

  const incoming = normalizeText(incomingSource)
  base.incomingLabel = incoming
  base.existingLabel = t[def.to] != null ? String(t[def.to]) : null

  // ערך שאינו מזהה — לא נכתב ל-facebook_id בשום ישות.
  // contact: העמודה bigint. accounts: העמודה text, אבל מזהה הוא עדיין מזהה.
  if (kind !== 'id') {
    const redirectTarget = kind === 'url' ? 'facebook_url' : 'facebook_name'
    // הערך זמין לכתיבה רק דרך בחירת 'redirect' ליעד הנכון.
    // buildPatch חוסם 'incoming' על שורה unresolved, ולכן facebook_id עצמו מוגן.
    base.incomingRaw = incoming
    base.status = 'unresolved'
    base.blockedReason =
      kind === 'url'
        ? 'הערך נראה כמו קישור ולא כמו מזהה — לא נכתב ל-facebook_id'
        : 'הערך נראה כמו טקסט ולא כמו מזהה — לא נכתב ל-facebook_id'
    const extra: FieldOption[] = []
    // הפניה לשדה הנכון — רק אם הוא ריק, ורק בבחירה מפורשת.
    if (!normalizeText(t[redirectTarget])) {
      base.redirectTarget = redirectTarget
      extra.push({
        id: 'redirect',
        label: kind === 'url' ? 'קבל כקישור Facebook' : 'קבל כשם Facebook',
      })
    }
    base.options = overwriteOptions(base.existingLabel, extra)
    return base
  }

  // מחרוזת ספרות בלבד. אין Number() — מזהי Facebook חורגים מ-MAX_SAFE_INTEGER.
  base.incomingRaw = incoming

  if (base.existingLabel != null && base.existingLabel === incoming) {
    base.status = 'same'
    return base
  }

  base.status = base.existingLabel == null ? 'complete' : 'diff'
  base.options = overwriteOptions(base.existingLabel, [
    { id: 'incoming', label: acceptLabel(sourceLabel), requiresOverwriteConfirm: base.existingLabel != null },
  ])
  return base
}

function buildPlainText(
  def: MergeFieldDef,
  base: FieldComparison,
  incomingSource: unknown,
  t: Record<string, unknown>,
  sourceLabel: string
): FieldComparison {
  const incoming = normalizeText(incomingSource)
  if (!incoming) {
    const existingLabel = normalizeText(t[def.to]) || null
    return existingLabel ? buildRemoved(base, existingLabel) : base
  }

  base.incomingRaw = incoming
  base.incomingLabel = incoming
  base.existingLabel = normalizeText(t[def.to]) || null

  if (base.existingLabel === incoming) {
    base.status = 'same'
    return base
  }

  base.status = base.existingLabel == null ? 'complete' : 'diff'
  base.options = overwriteOptions(base.existingLabel, [
    { id: 'incoming', label: acceptLabel(sourceLabel), requiresOverwriteConfirm: base.existingLabel != null },
  ])
  return base
}

// ─────────────────────────────────────────────────────
// הרכבת ה-patch
// ─────────────────────────────────────────────────────

export interface PatchResult {
  /** מה שיישלח ל-Supabase — עדכון אחד מרוכז */
  patch: Record<string, unknown>
  /** מה שיתועד ב-inbox_merge_actions.updates_applied */
  applied: Record<string, unknown>
}

/**
 * מרכיב את ה-patch מהבחירות המפורשות בלבד.
 *
 * ערובות:
 *  - לעולם לא נכתב null / '' מעל ערך קיים.
 *  - לעולם לא נכתב מפתח שאינו ב-whitelist של הישות.
 *  - phone ו-second_phone לא יכילו את אותו מספר; email ו-second_email לא יכילו אותה כתובת.
 */
export function buildPatch(
  comparisons: FieldComparison[],
  choices: Record<string, ChoiceId>,
  entity: MergeEntity,
  target: Record<string, unknown> | null = null,
  /** ערכי "ערך אחר" לפי מפתח שדה (INC-3123) */
  manualValues: Record<string, unknown> = {}
): PatchResult {
  const allowed = writableKeys(entity)
  const patch: Record<string, unknown> = {}

  for (const cmp of comparisons) {
    // 'auto' הוכרע לפי חוק עסקי ואינו תלוי בבחירה — הוא תמיד נכתב (§14–§15).
    const choice = cmp.status === 'auto' ? 'incoming' : (choices[cmp.key] ?? 'skip')
    if (choice === 'skip' || choice === 'existing') continue

    // חסום = חסום. גם אם ה-UI איכשהו שלח בחירה.
    if (cmp.status === 'unresolved' && choice !== 'redirect') continue

    let column: string | null = null
    if (choice === 'incoming' || choice === 'manual' || choice === 'existing_secondary') column = cmp.target
    else if (choice === 'secondary') column = cmp.secondaryTarget
    else if (choice === 'redirect') column = cmp.redirectTarget

    if (!column || !allowed.has(column)) continue

    // מחיקה מפורשת: המקור הגיע בלי ערך, והמשתמשת בחרה למחוק גם אצלנו.
    // זו **הדרך היחידה** שבה נכתב null — כל שאר המסלולים חסומים.
    if (cmp.status === 'removed') {
      if (choice === 'incoming') patch[column] = null
      continue
    }

    const value =
      choice === 'manual'
        ? manualValues[cmp.key]
        : choice === 'existing_secondary'
          ? cmp.existingSecondaryValue
          : cmp.incomingRaw
    // אין כתיבת ריק מעל ערך קיים.
    if (value == null || value === '') continue

    patch[column] = value
  }

  dedupeSecondary(patch, target, 'phone', 'second_phone', phoneCompareKey)
  dedupeSecondary(patch, target, 'email', 'second_email', normalizeEmail)

  return { patch, applied: { ...patch } }
}

/**
 * שכבת בטיחות אחרונה: אם אחרי הרכבת ה-patch השדה הראשי והמשני מייצגים
 * את אותו ערך — השדה המשני מושמט. אותו נייד/מייל לא נשמר פעמיים.
 */
function dedupeSecondary(
  patch: Record<string, unknown>,
  target: Record<string, unknown> | null,
  primary: string,
  secondary: string,
  keyOf: (v: unknown) => string
) {
  if (!(secondary in patch)) return
  const primaryValue = primary in patch ? patch[primary] : target?.[primary]
  const primaryKey = keyOf(primaryValue)
  if (primaryKey && primaryKey === keyOf(patch[secondary])) {
    delete patch[secondary]
  }
}

// ─────────────────────────────────────────────────────
// "כך תיראה הרשומה אחרי השמירה" (§12)
// ─────────────────────────────────────────────────────

export interface FinalFieldView {
  key: string
  label: string
  /** הערך שיוצג אחרי השמירה, מתורגם למילון/פורמט מקומי */
  value: string
  /** האם השדה ישתנה בפעולה הזו */
  changed: boolean
}

/**
 * תמונת הרשומה כפי שתיראה אחרי הכתיבה.
 *
 * לא מספיק לבחור בין שני ערכים שדה-שדה: המשתמשת צריכה לראות את
 * **הרשומה עצמה** לפני שהיא מאשרת, כולל שדות שלא נגעו בהם וכולל
 * הכרעות אוטומטיות שהמערכת עשתה בשבילה (§17).
 *
 * מחושב מ-`patch` בפועל, כדי שלא תיווצר סתירה בין מה שמוצג לבין
 * מה שנכתב.
 */
export function buildFinalRecord(
  entity: MergeEntity,
  target: Record<string, unknown> | null,
  patch: Record<string, unknown>,
  dicts: ComparisonDicts
): FinalFieldView[] {
  const t = target ?? {}
  return fieldsFor(entity).map((def) => {
    const changed = Object.prototype.hasOwnProperty.call(patch, def.to)
    const raw = changed ? patch[def.to] : t[def.to]

    let value: string
    if (raw == null || raw === '') {
      value = '—'
    } else if (def.kind === 'role') {
      value = dictLabel(dicts.roles, raw) ?? String(raw)
    } else if (def.kind === 'city') {
      value = dictLabel(dicts.cities, raw) ?? String(raw)
    } else {
      value = normalizeText(raw)
    }

    return { key: def.key, label: def.label, value, changed }
  })
}

/** האם קיימת לפחות בחירה אחת שתגרום לכתיבה. */
export function hasPendingWrites(
  comparisons: FieldComparison[],
  choices: Record<string, ChoiceId>
): boolean {
  return comparisons.some((c) => {
    if (c.status === 'auto') return true
    if (c.status === 'removed') return choices[c.key] === 'incoming'
    const choice = choices[c.key]
    return (
      choice === 'incoming' ||
      choice === 'secondary' ||
      choice === 'redirect' ||
      choice === 'existing_secondary'
    )
  })
}

/** ברירת מחדל: הכל "דלג". אין דריסה שקטה בלחיצה אחת. */
export function initialChoices(comparisons: FieldComparison[]): Record<string, ChoiceId> {
  const out: Record<string, ChoiceId> = {}
  // 'auto' נקבע מראש: החוק העסקי כבר הכריע, ואין מה לדלג עליו.
  for (const c of comparisons) out[c.key] = c.status === 'auto' ? 'incoming' : 'skip'
  return out
}

// ─────────────────────────────────────────────────────
// "מה יישמר אחרי האישור" — תיאור בלבד
// ─────────────────────────────────────────────────────

export type MergeResultTone = 'unchanged' | 'new' | 'replaced' | 'elsewhere' | 'blocked'

export interface MergeResultDescription {
  /** הערך שיהיה בשדה אחרי האישור */
  value: string
  tone: MergeResultTone
  /** הסבר קצר כשהתוצאה אינה מובנת מאליה */
  note: string | null
}

const EMPTY_LABEL = '(ריק)'

/**
 * מתארת מה יישמר בשדה אחרי האישור, לפי הבחירה הנוכחית.
 *
 * תיאור בלבד — אינה כותבת דבר ואינה מחליטה דבר. היא משקפת את מה
 * ש-`buildPatch` יעשה בפועל, כדי שהמשתמשת תראה את התוצאה במקום לדמיין
 * אותה מתוך כפתורי הבחירה.
 *
 * חייבת להישאר מיושרת ל-`buildPatch`: דילוג ו"השאר קיים" אינם כותבים,
 * ערך נכנס ריק אינו נכתב, וסטטוס `unresolved` חסום לכל בחירה מלבד הפניה.
 */
export function describeMergeResult(
  cmp: FieldComparison,
  choice: ChoiceId,
  manualValue?: unknown,
): MergeResultDescription {
  const existing = cmp.existingLabel ?? EMPTY_LABEL
  const incoming = cmp.incomingLabel
  const unchanged: MergeResultDescription = { value: existing, tone: 'unchanged', note: null }

  if (cmp.status === 'removed') {
    return choice === 'incoming'
      ? { value: EMPTY_LABEL, tone: 'replaced', note: 'יימחק אצלנו' }
      : { value: existing, tone: 'unchanged', note: 'נמחק במקור — נשמר אצלנו' }
  }
  if (cmp.status === 'same') return { value: existing, tone: 'unchanged', note: 'זהה בשני המקורות' }
  if (cmp.status === 'auto') {
    return {
      value: incoming ?? existing,
      tone: 'replaced',
      note: cmp.blockedReason ?? 'הוכרע אוטומטית לפי חוק עסקי',
    }
  }
  if (choice === 'skip' || choice === 'existing') return unchanged

  if (choice === 'manual') {
    if (manualValue == null || manualValue === '') return { value: EMPTY_LABEL, tone: 'blocked', note: 'יש להזין ערך' }
    return { value: String(manualValue), tone: 'replaced', note: 'ערך שהוזן ידנית' }
  }

  // ערך נכנס ריק לא נכתב מעל ערך קיים (buildPatch)
  if (incoming == null || incoming === '') return unchanged

  // מידע לא מזוהה חסום לכל בחירה מלבד הפניה לשדה הנכון
  if (cmp.status === 'unresolved' && choice !== 'redirect') {
    return { value: existing, tone: 'blocked', note: cmp.blockedReason ?? 'חסום — נדרשת בדיקה ידנית' }
  }

  if (choice === 'incoming') {
    return cmp.existingLabel
      ? { value: incoming, tone: 'replaced', note: `יחליף את "${cmp.existingLabel}"` }
      : { value: incoming, tone: 'new', note: 'השלמת מידע חסר' }
  }

  // secondary/redirect — השדה עצמו אינו משתנה; הערך נשמר בשדה אחר
  const optionLabel = cmp.options.find((o) => o.id === choice)?.label ?? null
  return { value: existing, tone: 'elsewhere', note: optionLabel ?? 'יישמר בשדה אחר' }
}

/** סיכום קצר לראש הפאנל: כמה שדות יתעדכנו וכמה יישארו כמו שהם. */
export function summarizeMerge(
  comparisons: FieldComparison[],
  choices: Record<string, ChoiceId>,
  manualValues: Record<string, unknown> = {}
): { willChange: number; unchanged: number } {
  let willChange = 0
  for (const cmp of comparisons) {
    const tone = describeMergeResult(cmp, choices[cmp.key] ?? 'skip', manualValues[cmp.key]).tone
    if (tone === 'new' || tone === 'replaced' || tone === 'elsewhere') willChange++
  }
  return { willChange, unchanged: comparisons.length - willChange }
}

/**
 * שדות שדורשים הכרעה ולא נבחר בהם דבר — חוסמים שמירה (§11).
 * "השלמת מידע חסר" אינה קונפליקט ולכן אינה חוסמת; רק פער אמיתי.
 */
export function unresolvedConflicts(
  comparisons: FieldComparison[],
  choices: Record<string, ChoiceId>,
  manualValues: Record<string, unknown> = {}
): FieldComparison[] {
  return comparisons.filter((cmp) => {
    if (cmp.status !== 'diff') return false
    const choice = choices[cmp.key] ?? 'skip'
    if (choice === 'skip') return true
    if (choice === 'manual') {
      const v = manualValues[cmp.key]
      return v == null || v === ''
    }
    return false
  })
}

// ─────────────────────────────────────────────────────
// מקור Google — תצוגה בלבד
// ─────────────────────────────────────────────────────

export interface GoogleSourceInfo {
  accountKey: string | null
  resourceName: string | null
  payloadHash: string | null
  etag: string | null
}

/**
 * source_unique_key בתבנית `google:<account_key>:<resource_name>`.
 * resourceName עצמו מכיל '/' ולעיתים ':' — ולכן מפצלים רק פעמיים.
 */
export function parseGoogleSource(row: InboxV2Row): GoogleSourceInfo {
  const parsed = (row.parsed_payload ?? {}) as Record<string, unknown>
  const raw = (row.raw_payload ?? {}) as Record<string, unknown>

  let accountKey: string | null = null
  let resourceName: string | null = null

  const key = normalizeText(row.source_unique_key)
  if (key.startsWith('google:')) {
    const rest = key.slice('google:'.length)
    const idx = rest.indexOf(':')
    if (idx > -1) {
      accountKey = rest.slice(0, idx) || null
      resourceName = rest.slice(idx + 1) || null
    } else {
      accountKey = rest || null
    }
  }

  return {
    accountKey: accountKey || normalizeText(parsed.google_account_key) || null,
    resourceName:
      resourceName ||
      normalizeText(parsed.google_resource_name) ||
      normalizeText(raw.resourceName) ||
      null,
    payloadHash: normalizeText(parsed.google_payload_hash) || null,
    etag: normalizeText(parsed.etag) || normalizeText(raw.etag) || null,
  }
}

/**
 * קודי match_reason ש-n8n/ה-RPC כותבים, בעברית.
 *
 * הכלל: ערך טכני באנגלית לעולם אינו מוצג למשתמשת. הקוד הזה מופיע גם
 * בכותרת פאנל המיזוג וגם בשדה "סיבת הכניסה", ולכן קוד לא מתורגם הופיע
 * פעמיים באותו מסך.
 */
const ENTRY_REASON_LABEL: Record<string, string> = {
  existing_google_link: 'הרשומה כבר מקושרת לאיש קשר',
  new_person: 'אדם חדש',
  new_organization: 'ארגון חדש',
  new_contact: 'איש קשר חדש',
  new_account: 'ארגון חדש',
  new_information: 'מידע חדש ברשומה קיימת',
  unclassified: 'סוג הרשומה לא נקבע',
  match_conflict: 'התאמה גם לאדם וגם לארגון',
  phone_match: 'זוהתה התאמה לפי נייד',
  email_match: 'זוהתה התאמה לפי מייל',
  no_match: 'לא נמצאה התאמה במאגר',
}

/** האם המחרוזת מכילה עברית — כלומר נכתבה כהסבר ולא כקוד. */
function looksHebrew(text: string): boolean {
  return /[֐-׿]/.test(text)
}

/**
 * סיבת הכניסה לשער, תמיד בעברית.
 *
 * שלוש דרגות: (1) n8n כתב הסבר בעברית ⇒ מוצג כמו שהוא, כדי לא לאבד סיבה
 * עסקית אמיתית. (2) קוד מוכר ⇒ התווית העברית. (3) קוד לא מוכר ⇒ תווית
 * כללית + אזהרה ל-Console, ולעולם לא הטקסט האנגלי על המסך.
 */
export function entryReasonLabel(rawReason: unknown): string | null {
  const given = normalizeText(rawReason)
  if (!given) return null
  if (looksHebrew(given)) return given

  const known = ENTRY_REASON_LABEL[given.toLowerCase()]
  if (known) return known

  console.warn(`[inbox-v2] קוד match_reason לא מוכר: ${given}`)
  return 'נדרשת בדיקה ידנית'
}

/** שיטת ההתאמה (`matched_by`) — לפי איזה שדה נמצאה ההתאמה. */
const MATCHED_BY_LABEL: Record<string, string> = {
  phone: 'לפי נייד',
  phone_norm: 'לפי נייד',
  second_phone: 'לפי נייד נוסף',
  email: 'לפי מייל',
  second_email: 'לפי מייל נוסף',
  facebook_id: 'לפי מזהה Facebook',
  facebook_url: 'לפי קישור Facebook',
  name: 'לפי שם',
  display_name: 'לפי שם',
  google_link: 'לפי קישור Google קיים',
  manual: 'שיוך ידני',
}

export function matchedByLabel(rawValue: unknown): string | null {
  const given = normalizeText(rawValue)
  if (!given) return null
  if (looksHebrew(given)) return given

  const known = MATCHED_BY_LABEL[given.toLowerCase()]
  if (known) return known

  console.warn(`[inbox-v2] ערך matched_by לא מוכר: ${given}`)
  return 'שיטה לא מזוהה'
}

export function deriveEntryReason(row: InboxV2Row, route: InboxRoute): string {
  const given = entryReasonLabel(row.match_reason)
  if (given) return given

  if (route === 'unclassified') return 'סוג הרשומה לא נקבע'
  if (route === 'match_conflict') return 'התאמה גם לאדם וגם לארגון'
  if (route === 'create_contact' || route === 'create_account') return 'רשומה חדשה'
  if (row.temp_role == null && rawHint(row, ['role_text_raw', 'temp_role_name'])) return 'תפקיד לא מזוהה'
  if (row.temp_city_id == null && rawHint(row, ['city_text_raw', 'temp_city_name'])) return 'עיר לא מזוהה'
  if (!isValidILMobile(row.phone)) return 'אין נייד תקין'
  if ((row.match_confidence ?? 0) < 80) return 'התאמה חלקית'
  return 'פער בשדות'
}
