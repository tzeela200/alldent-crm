// =====================================================
// INC-3115 — לוגיקת ההשוואה והמיזוג של שער Inbox 2
//
// מודול טהור (ללא React) כדי שאפשר יהיה להריץ עליו בדיקות קבלה ישירות.
// מקור אמת יחיד ל:
//   - ניתוב הרשומה (אדם / ארגון / לא מסווג / סתירה)
//   - השוואת שדות אחרי נרמול
//   - הרכבת ה-patch לכתיבה, עם whitelist סגורה לכל ישות
//
// חוזה הנתונים הנכנס נכתב על ידי n8n (Workflow GOOGLE-01). המסך לא מנתח
// Google, לא מפצל שמות ולא מנחש תפקיד/עיר/סוג רשומה.
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
          ? 'n8n סיווגה כארגון אך נמצאה התאמה לאדם — בדקי לפני אישור'
          : null,
    }
  }

  if (hasAccount) {
    return {
      route: 'merge_account',
      classificationWarning:
        recordType === 'person'
          ? 'n8n סיווגה כאדם אך נמצאה התאמה לארגון — בדקי לפני אישור'
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

// ─────────────────────────────────────────────────────
// מפות השדות
// ─────────────────────────────────────────────────────

export type MergeEntity = 'contact' | 'account'
export type FieldKind = 'text' | 'phone' | 'email' | 'role' | 'city' | 'fbid' | 'url'

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

export type ComparisonStatus = 'none' | 'same' | 'complete' | 'diff' | 'unresolved'
export type ChoiceId = 'skip' | 'existing' | 'incoming' | 'secondary' | 'redirect'

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

/**
 * בונה את שורות ההשוואה לשער האישור.
 * `target` הוא רשומת contact או accounts כפי שנטענה מ-Supabase.
 */
export function buildComparisons(
  row: InboxV2Row,
  target: Record<string, unknown> | null,
  dicts: ComparisonDicts,
  entity: MergeEntity
): FieldComparison[] {
  const defs = fieldsFor(entity)
  const t = target ?? {}

  // כל מפתחות הטלפון והמייל הקיימים בישות — לדדופליקציה חוצת-שדות.
  const existingPhoneKeys = [phoneCompareKey(t.phone), phoneCompareKey(t.second_phone)].filter(Boolean)
  const existingEmailKeys = [normalizeEmail(t.email), normalizeEmail(t.second_email)].filter(Boolean)

  return defs.map((def) => buildOne(def, row, t, dicts, entity, existingPhoneKeys, existingEmailKeys))
}

function buildOne(
  def: MergeFieldDef,
  row: InboxV2Row,
  t: Record<string, unknown>,
  dicts: ComparisonDicts,
  entity: MergeEntity,
  existingPhoneKeys: string[],
  existingEmailKeys: string[]
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
    redirectTarget: null,
    target: def.to,
  }

  const incomingSource = row[def.from]

  switch (def.kind) {
    case 'phone':
      return buildPhone(def, base, incomingSource, t, entity, existingPhoneKeys)
    case 'email':
      return buildEmail(def, base, incomingSource, t, existingEmailKeys)
    case 'role':
      return buildDict(def, base, incomingSource, t, dicts.roles, row, [
        'role_text_raw',
        'temp_role_name',
        'role_text',
      ])
    case 'city':
      return buildDict(def, base, incomingSource, t, dicts.cities, row, [
        'city_text_raw',
        'temp_city_name',
        'city_text',
      ])
    case 'fbid':
      return buildFacebookId(def, base, incomingSource, t, entity)
    default:
      return buildPlainText(def, base, incomingSource, t)
  }
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
  existingPhoneKeys: string[]
): FieldComparison {
  const incoming = normalizeText(incomingSource)
  if (!incoming) return base

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
      label: 'קבל מ-Google',
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
  existingEmailKeys: string[]
): FieldComparison {
  const incomingKey = normalizeEmail(incomingSource)
  if (!incomingKey) return base

  base.incomingRaw = incomingKey // נשמר מנורמל — lowercase, בלי רווחים
  base.incomingLabel = incomingKey
  base.existingLabel = normalizeEmail(t[def.to]) || null

  if (existingEmailKeys.includes(incomingKey)) {
    base.status = 'same'
    return base
  }

  const extra: FieldOption[] = [
    { id: 'incoming', label: 'קבל מ-Google', requiresOverwriteConfirm: base.existingLabel != null },
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
  hintKeys: string[]
): FieldComparison {
  base.existingLabel = dictLabel(items, t[def.to])

  if (incomingSource == null) {
    // n8n לא הצליחה לפתור את הערך. אם יש טקסט גולמי — זו "מידע לא מזוהה"
    // שדורש תשומת לב; אם אין בכלל, פשוט אין מה למזג.
    const hint = rawHint(row, hintKeys)
    if (hint) {
      base.status = 'unresolved'
      base.incomingLabel = hint
      base.blockedReason =
        def.kind === 'role'
          ? 'התפקיד לא זוהה על ידי n8n — לא נכתב ערך'
          : 'העיר לא זוהתה על ידי n8n — לא נכתב ערך'
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

  base.status = base.existingLabel == null ? 'complete' : 'diff'
  base.options = overwriteOptions(base.existingLabel, [
    { id: 'incoming', label: 'קבל מ-Google', requiresOverwriteConfirm: base.existingLabel != null },
  ])
  return base
}

function buildFacebookId(
  def: MergeFieldDef,
  base: FieldComparison,
  incomingSource: unknown,
  t: Record<string, unknown>,
  _entity: MergeEntity
): FieldComparison {
  const kind = classifyFacebookValue(incomingSource)
  if (kind === 'empty') return base

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
    { id: 'incoming', label: 'קבל מ-Google', requiresOverwriteConfirm: base.existingLabel != null },
  ])
  return base
}

function buildPlainText(
  def: MergeFieldDef,
  base: FieldComparison,
  incomingSource: unknown,
  t: Record<string, unknown>
): FieldComparison {
  const incoming = normalizeText(incomingSource)
  if (!incoming) return base

  base.incomingRaw = incoming
  base.incomingLabel = incoming
  base.existingLabel = normalizeText(t[def.to]) || null

  if (base.existingLabel === incoming) {
    base.status = 'same'
    return base
  }

  base.status = base.existingLabel == null ? 'complete' : 'diff'
  base.options = overwriteOptions(base.existingLabel, [
    { id: 'incoming', label: 'קבל מ-Google', requiresOverwriteConfirm: base.existingLabel != null },
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
  target: Record<string, unknown> | null = null
): PatchResult {
  const allowed = writableKeys(entity)
  const patch: Record<string, unknown> = {}

  for (const cmp of comparisons) {
    const choice = choices[cmp.key] ?? 'skip'
    if (choice === 'skip' || choice === 'existing') continue

    // חסום = חסום. גם אם ה-UI איכשהו שלח בחירה.
    if (cmp.status === 'unresolved' && choice !== 'redirect') continue

    let column: string | null = null
    if (choice === 'incoming') column = cmp.target
    else if (choice === 'secondary') column = cmp.secondaryTarget
    else if (choice === 'redirect') column = cmp.redirectTarget

    if (!column || !allowed.has(column)) continue

    const value = cmp.incomingRaw
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

/** האם קיימת לפחות בחירה אחת שתגרום לכתיבה. */
export function hasPendingWrites(
  comparisons: FieldComparison[],
  choices: Record<string, ChoiceId>
): boolean {
  return comparisons.some((c) => {
    const choice = choices[c.key]
    return choice === 'incoming' || choice === 'secondary' || choice === 'redirect'
  })
}

/** ברירת מחדל: הכל "דלג". אין דריסה שקטה בלחיצה אחת. */
export function initialChoices(comparisons: FieldComparison[]): Record<string, ChoiceId> {
  const out: Record<string, ChoiceId> = {}
  for (const c of comparisons) out[c.key] = 'skip'
  return out
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
 * סיבת הכניסה לשער. קודם כל מה ש-n8n/ה-RPC כתבו — המסך לא ממציא סיבות עסקיות.
 * רק כשאין match_reason נגזרת תווית טכנית.
 */
export function deriveEntryReason(row: InboxV2Row, route: InboxRoute): string {
  const given = normalizeText(row.match_reason)
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
