/**
 * פרסור דוח תוצאות קמפיין מ-Fix Digital.
 *
 * שתי צורות קובץ נתמכות, באותו מסלול קליטה:
 *
 * 1. דוח FIX מקורי — כותרות אנגלית:
 *      fullname, email, phone, process, status, sending_time, sending_status
 *    הקובץ עצמו הוא הקמפיין.
 *
 * 2. קובץ מאוחד — אותן עמודות (עברית או אנגלית) בתוספת עמודות בקרה:
 *      מס׳ רשומה, קובץ מקור, שורת מקור
 *    עמודת "קובץ מקור" מזהה מאיזה קמפיין הגיעה כל שורה, ולכן קובץ אחד
 *    שמכיל 12 דוחות ייקלט כ-12 קמפיינים נפרדים ולא כקמפיין ענק אחד.
 *
 * שים לב: `status` (סטטוס הרשומה ב-CRM של Fix) ו-`sending_status` (סטטוס
 * שליחת ההודעה) הם שני שדות שונים ואסור לערבב ביניהם.
 *
 * הקובץ הזה אינו נוגע ב-Supabase. ההתאמה לרשומות נעשית ב-useFixPublications.
 */

import * as XLSX from 'xlsx'
import { type RawRow } from '@/lib/inbox-v2-parser'
import { normalizeIlMobile } from '@/lib/normalizePhone'
import { mapDeliveryStatus, failureCategoryOf, type DeliveryStatusCode } from './deliveryStatus'

// ─────────────────────────── מיפוי כותרות ───────────────────────────

/** שדות הקובץ שהמערכת יודעת לקרוא */
export type CampaignField =
  | 'fullname' | 'email' | 'phone' | 'process' | 'status'
  | 'sending_time' | 'sending_status'
  | 'record_number' | 'source_file' | 'source_row'

/**
 * כל כותרת אפשרית לכל שדה — עברית ואנגלית באותה רשימה.
 * הכותרות מנורמלות לפני ההשוואה (ראו normalizeHeader), ולכן אין צורך
 * לרשום כאן וריאציות של גרש, מרכאות או רווחים כפולים.
 */
const FIELD_ALIASES: Record<CampaignField, string[]> = {
  fullname:       ['fullname', 'full name', 'full_name', 'name', 'שם', 'שם מלא'],
  email:          ['email', 'e-mail', 'e mail', 'mail', 'אימייל', 'מייל', 'דואל', 'דואר אלקטרוני'],
  phone:          ['phone', 'mobile', 'tel', 'telephone', 'טלפון', 'נייד', 'מספר טלפון', 'מספר נייד'],
  process:        ['process', 'תהליך'],
  status:         ['status', 'סטטוס', 'סטטוס לקוח'],
  sending_time:   ['sending_time', 'sending time', 'sendingtime', 'זמן שליחה', 'מועד שליחה', 'תאריך שליחה', 'שעת שליחה'],
  sending_status: ['sending_status', 'sending status', 'sendingstatus', 'סטטוס שליחה', 'סטטוס שליחת הודעה'],
  record_number:  ['record_number', 'record number', 'מס רשומה', 'מספר רשומה'],
  source_file:    ['source_file', 'source file', 'sourcefile', 'קובץ מקור'],
  source_row:     ['source_row', 'source row', 'sourcerow', 'שורת מקור', 'שורה במקור'],
}

/** עמודות הבקרה של הקובץ המאוחד — אינן חלק מדוח FIX המקורי */
const CONTROL_FIELDS: CampaignField[] = ['record_number', 'source_file', 'source_row']

/** בלי שתי אלה אי אפשר לקלוט: נייד להתאמה, וסטטוס שליחה לתוצאה */
export const CAMPAIGN_REQUIRED_FIELDS: CampaignField[] = ['phone', 'sending_status']

export const CAMPAIGN_FIELD_LABELS: Record<CampaignField, string> = {
  fullname: 'שם מלא', email: 'אימייל', phone: 'טלפון', process: 'תהליך',
  status: 'סטטוס לקוח ב-Fix', sending_time: 'מועד שליחה', sending_status: 'סטטוס שליחה',
  record_number: 'מס׳ רשומה', source_file: 'קובץ מקור', source_row: 'שורת מקור',
}

/**
 * נרמול כותרת לפני השוואה: הסרת BOM, גרש/מרכאות עבריות ואנגליות,
 * כיווץ רווחים ותווי רוחב-אפס, ואיחוד אותיות קטנות.
 * "מס׳ רשומה" ו-"מס' רשומה" ו-`Sending  Status` נופלים כולם למקום אחד.
 */
export function normalizeHeader(header: string): string {
  return String(header)
    .replace(/\uFEFF/g, '')
    .replace(/[\u200B-\u200F\u202A-\u202E]/g, '')
    .replace(/[\u05F3\u05F4\'"`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/** בונה מפה: שדה → שם העמודה בפועל בקובץ */
export function detectFieldMap(headers: string[]): Partial<Record<CampaignField, string>> {
  const byNormalized = new Map<string, string>()
  for (const h of headers) {
    const key = normalizeHeader(h)
    if (key && !byNormalized.has(key)) byNormalized.set(key, h)
  }

  const map: Partial<Record<CampaignField, string>> = {}
  for (const [field, aliases] of Object.entries(FIELD_ALIASES) as [CampaignField, string[]][]) {
    for (const alias of aliases) {
      const actual = byNormalized.get(alias)
      if (actual) { map[field] = actual; break }
    }
  }
  return map
}

// ─────────────────────────── קריאת הקובץ ───────────────────────────

/** גיליון אחד מתוך הקובץ שהועלה */
export interface SheetRows {
  /** שם הגיליון. בקובץ CSV או בחוברת בעלת גיליון יחיד — ריק */
  sheetName: string | null
  rows: RawRow[]
}

/**
 * קורא את כל הגיליונות, לא רק את הראשון. חוברת שבה כל דוח יושב בגיליון
 * נפרד נקלטת כמו קובץ מאוחד עם עמודת "קובץ מקור" — שם הגיליון משמש
 * כתווית הקמפיין.
 */
export async function readCampaignFile(file: File): Promise<SheetRows[]> {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext !== 'csv' && ext !== 'xlsx' && ext !== 'xls') {
    throw new Error('סוג קובץ לא נתמך. יש להעלות קובץ CSV או Excel.')
  }

  const wb = ext === 'csv'
    ? XLSX.read(await file.text(), { type: 'string' })
    : XLSX.read(await file.arrayBuffer(), { type: 'array' })

  const multiSheet = wb.SheetNames.length > 1
  const sheets: SheetRows[] = []
  for (const name of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<RawRow>(wb.Sheets[name], { defval: null })
    if (rows.length) sheets.push({ sheetName: multiSheet ? name : null, rows })
  }
  return sheets
}

/** מחשב SHA-256 של הקובץ — לתיעוד בלבד, לא כמפתח ייחודיות */
export async function computeFileHash(file: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

// ─────────────────────────── ערכי תאים ───────────────────────────

/**
 * מפענח HTML entities שמגיעים מ-Fix (למשל `מריה צ&#039;רקסקי`).
 * הערך המקורי נשמר תמיד ב-raw_payload — אין לאבד מידע לצורכי בקרה.
 */
export function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

function cellOf(row: RawRow, map: Partial<Record<CampaignField, string>>, field: CampaignField): string | null {
  const column = map[field]
  if (!column) return null
  const val = row[column]
  if (val == null) return null
  const str = decodeHtmlEntities(String(val).trim())
  return str ? str : null
}

/**
 * `sending_time` מגיע כ-"2026-07-16 20:42". מומר ל-ISO לפי אזור הזמן
 * המקומי כדי שלא יזלוג יום אחורה או קדימה בהמרה ל-UTC.
 * Excel מחזיר לפעמים Date אמיתי — גם הצורה הזו נתמכת.
 */
export function parseSendingTime(value: string | null): string | null {
  if (!value) return null
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/)
  if (m) {
    const [, y, mo, d, h, mi, s] = m
    const dt = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s ?? 0))
    return Number.isNaN(dt.getTime()) ? null : dt.toISOString()
  }
  // dd/mm/yyyy hh:mm — הצורה שמופיעה בקבצים שיוצאו דרך Excel בעברית
  const il = value.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})(?:[ T](\d{1,2}):(\d{2}))?/)
  if (il) {
    const [, d, mo, y, h, mi] = il
    const dt = new Date(Number(y), Number(mo) - 1, Number(d), Number(h ?? 0), Number(mi ?? 0))
    return Number.isNaN(dt.getTime()) ? null : dt.toISOString()
  }
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

// ─────────────────────────── שורה מנורמלת ───────────────────────────

/**
 * תוצאת ההתאמה של שורה לרשומה במאגר.
 * `ambiguous` = אותו נייד יושב ביותר מרשומה אחת — שגיאת נתונים שמוצגת
 * למשתמשת. המערכת לא מכריעה בשקט לאיזו רשומה לשייך.
 */
export type MatchResult =
  | 'matched_contact' | 'matched_account' | 'ambiguous_match'
  | 'not_found' | 'invalid_phone' | 'missing_phone'

export const MATCH_RESULT_LABELS: Record<MatchResult, string> = {
  matched_contact: 'איש קשר',
  matched_account: 'ארגון',
  ambiguous_match: 'כפילות נייד — לבדיקה',
  not_found:       'לא נמצא במאגר',
  invalid_phone:   'נייד לא תקין',
  missing_phone:   'חסר נייד',
}

export interface ParsedCampaignRow {
  /** מספר השורה בקובץ שהועלה, כולל שורת הכותרת */
  rowNumber: number
  /** התווית שקובעת לאיזה קמפיין השורה שייכת */
  campaignKey: string
  campaignLabel: string
  /** ערכי עמודות הבקרה של הקובץ המאוחד, אם היו */
  sourceFile: string | null
  sourceRow: string | null
  recordNumber: string | null

  fullNameRaw: string | null
  emailRaw: string | null
  phoneRaw: string | null
  phoneNorm: string | null
  fixProcessRaw: string | null
  fixStatusRaw: string | null
  sentAt: string | null
  deliveryStatusRaw: string | null
  deliveryStatus: DeliveryStatusCode
  failureCategory: string | null
  failureMessage: string | null

  /** מפתח דטרמיניסטי — קליטה חוזרת של אותה שורה לא תיצור רשומה נוספת */
  sourceUniqueKey: string

  matchResult: MatchResult
  contactId: number | null
  accountId: number | null
  /** האם השורה כבר קיימת ב-Supabase (נקבע מול המאגר, לא מהקובץ) */
  alreadyExists: boolean
  /** שורת המקור כפי שהתקבלה, ללא שינוי */
  rawPayload: RawRow
}

/** מנקה תווית קמפיין: הסרת סיומת קובץ, נתיב וכפל רווחים */
export function cleanCampaignLabel(raw: string): string {
  return raw
    .replace(/^.*[\\/]/, '')
    .replace(/\.(csv|xlsx?|txt)$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** מפתח יציב לקמפיין — נגזר מהתווית בלבד, כדי שקליטה חוזרת תמצא אותו */
export function campaignKeyOf(label: string): string {
  return `fix:${normalizeHeader(label)}`
}

/**
 * מפתח ייחודי לשורה. חייב להיות דטרמיניסטי: אותה שורה מאותו קובץ תיתן
 * תמיד את אותו מפתח, ולכן העלאה חוזרת לא תכפיל אותה.
 *
 * מבנה: fix|<קמפיין>|<שורה>|<נייד>
 * - הקמפיין נכנס למפתח כי source_unique_key הוא UNIQUE גלובלי, לא לכל קמפיין.
 * - מספר השורה נכנס כי אותו אדם יכול להופיע פעמיים באותו דוח, ושתי
 *   ההופעות הן אירועים נפרדים שאין לאחד.
 * - הנייד נכנס כדי שייצוא מחדש שבו הסדר השתנה לא ידרוס שורה של אדם אחר.
 */
export function buildSourceUniqueKey(
  campaignKey: string,
  rowToken: string,
  phoneNorm: string | null,
): string {
  return `${campaignKey}|${rowToken}|${phoneNorm ?? 'nophone'}`
}

/**
 * ממיר את הגיליונות לשורות מנורמלות. אינו נוגע ב-Supabase.
 * `fallbackLabel` הוא שם הקובץ שהועלה — משמש כתווית הקמפיין כשאין
 * עמודת "קובץ מקור" ואין שם גיליון.
 */
export function parseCampaignSheets(sheets: SheetRows[], fallbackLabel: string): ParsedCampaignRow[] {
  const out: ParsedCampaignRow[] = []
  const fallback = cleanCampaignLabel(fallbackLabel) || 'קמפיין ללא שם'

  for (const sheet of sheets) {
    const headers = Object.keys(sheet.rows[0] ?? {})
    const map = detectFieldMap(headers)

    sheet.rows.forEach((raw, idx) => {
      const sourceFile = cellOf(raw, map, 'source_file')
      const sourceRow = cellOf(raw, map, 'source_row')
      const recordNumber = cellOf(raw, map, 'record_number')

      const label = cleanCampaignLabel(sourceFile ?? sheet.sheetName ?? fallback) || fallback
      const campaignKey = campaignKeyOf(label)

      const phoneRaw = cellOf(raw, map, 'phone')
      const phoneNorm = normalizeIlMobile(phoneRaw)
      const deliveryStatusRaw = cellOf(raw, map, 'sending_status')
      const deliveryStatus = mapDeliveryStatus(deliveryStatusRaw)
      const failed = deliveryStatus.startsWith('failed_')

      // אסימון השורה: "שורת מקור" כשקיימת, אחרת מיקומה בגיליון.
      const rowToken = sourceRow
        ? `r${sourceRow}`
        : `${sheet.sheetName ? `s${normalizeHeader(sheet.sheetName)}` : ''}i${idx + 2}`

      out.push({
        rowNumber: idx + 2, // +2: שורת כותרת + אינדקס מאפס
        campaignKey,
        campaignLabel: label,
        sourceFile,
        sourceRow,
        recordNumber,
        fullNameRaw: cellOf(raw, map, 'fullname'),
        emailRaw: cellOf(raw, map, 'email'),
        phoneRaw,
        phoneNorm,
        fixProcessRaw: cellOf(raw, map, 'process'),
        fixStatusRaw: cellOf(raw, map, 'status'),
        sentAt: parseSendingTime(cellOf(raw, map, 'sending_time')),
        deliveryStatusRaw,
        deliveryStatus,
        failureCategory: failed ? failureCategoryOf(deliveryStatus) : null,
        failureMessage: failed ? deliveryStatusRaw : null,
        sourceUniqueKey: buildSourceUniqueKey(campaignKey, rowToken, phoneNorm),
        matchResult: !phoneRaw ? 'missing_phone' : phoneNorm ? 'not_found' : 'invalid_phone',
        contactId: null,
        accountId: null,
        alreadyExists: false,
        rawPayload: raw,
      })
    })
  }

  return out
}

// ─────────────────────────── קיבוץ לקמפיינים ───────────────────────────

export interface CampaignGroup {
  campaignKey: string
  label: string
  rows: ParsedCampaignRow[]
  /** מוקדם ומאוחר ביותר מבין מועדי השליחה בקבוצה */
  startedAt: string | null
  completedAt: string | null
  /** ה-process השכיח בקבוצה — נשמר בשדה process_name של הקמפיין */
  processName: string | null
}

/** מחזיר את הערך השכיח ברשימה, או null אם אין ערכים */
function mostCommon(values: (string | null)[]): string | null {
  const counts = new Map<string, number>()
  for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1)
  let best: string | null = null
  let bestCount = 0
  for (const [value, count] of counts) if (count > bestCount) { best = value; bestCount = count }
  return best
}

/**
 * מקבץ את השורות לקמפיינים לפי "קובץ מקור" / שם גיליון / שם הקובץ.
 * זו הנקודה שבה קובץ מאוחד אחד הופך ל-N קמפיינים.
 */
export function groupIntoCampaigns(rows: ParsedCampaignRow[]): CampaignGroup[] {
  const groups = new Map<string, CampaignGroup>()

  for (const row of rows) {
    let group = groups.get(row.campaignKey)
    if (!group) {
      group = {
        campaignKey: row.campaignKey, label: row.campaignLabel, rows: [],
        startedAt: null, completedAt: null, processName: null,
      }
      groups.set(row.campaignKey, group)
    }
    group.rows.push(row)
  }

  for (const group of groups.values()) {
    const stamps = group.rows.map((r) => r.sentAt).filter(Boolean).sort() as string[]
    group.startedAt = stamps[0] ?? null
    group.completedAt = stamps[stamps.length - 1] ?? null
    group.processName = mostCommon(group.rows.map((r) => r.fixProcessRaw))
  }

  return Array.from(groups.values()).sort((a, b) => (a.startedAt ?? '').localeCompare(b.startedAt ?? ''))
}

/**
 * מועד הפרסום של קבוצה — ה-sending_time השכיח. בדוחות שנבדקו הוא אחיד
 * בכל השורות, אבל הערך נשמר גם ברמת הנמען כך שקובץ עם שעות שונות נתמך.
 */
export function inferCampaignSentAt(rows: ParsedCampaignRow[]): string | null {
  return mostCommon(rows.map((r) => r.sentAt))
}

/** שם קמפיין מוצע: התווית מהקובץ, ואם אין — לפי מועד השליחה */
export function suggestCampaignName(label: string, sentAt: string | null): string {
  if (label && label !== 'קמפיין ללא שם') return label
  if (!sentAt) return label || 'קמפיין ללא שם'
  const d = new Date(sentAt)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `פרסום ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

// ─────────────────────────── ולידציית קובץ ───────────────────────────

export interface FileValidation {
  ok: boolean
  /** שדות חובה שלא נמצאו בקובץ */
  missingRequired: CampaignField[]
  /** שדות מוכרים שלא נמצאו — לידיעה בלבד, אינם חוסמים */
  missingOptional: CampaignField[]
  /** האם זוהו עמודות הבקרה של הקובץ המאוחד */
  isMergedFile: boolean
  /** כותרות שלא זוהו כשדה מוכר */
  unknownHeaders: string[]
}

export function validateCampaignFile(sheets: SheetRows[]): FileValidation {
  const headers = Array.from(new Set(sheets.flatMap((s) => Object.keys(s.rows[0] ?? {}))))
  const map = detectFieldMap(headers)
  const found = new Set(Object.keys(map) as CampaignField[])

  const allFields = Object.keys(FIELD_ALIASES) as CampaignField[]
  const missingRequired = CAMPAIGN_REQUIRED_FIELDS.filter((f) => !found.has(f))
  const mappedHeaders = new Set(Object.values(map))

  return {
    ok: missingRequired.length === 0,
    missingRequired,
    missingOptional: allFields.filter(
      (f) => !found.has(f) && !CAMPAIGN_REQUIRED_FIELDS.includes(f) && !CONTROL_FIELDS.includes(f),
    ),
    isMergedFile: CONTROL_FIELDS.some((f) => found.has(f)),
    unknownHeaders: headers.filter((h) => !mappedHeaders.has(h)),
  }
}
