import * as XLSX from 'xlsx'
import { normalizePhone } from '@/lib/normalizePhone'

export type RawRow = Record<string, unknown>

const COLUMN_MAP: Record<string, string> = {
  'שם': 'display_name',
  'שם מלא': 'display_name',
  'name': 'display_name',
  'full_name': 'display_name',
  'full name': 'display_name',
  'שם פרטי': 'first_name',
  'first_name': 'first_name',
  'first name': 'first_name',
  'שם משפחה': 'last_name',
  'last_name': 'last_name',
  'last name': 'last_name',
  'טלפון': 'phone',
  'נייד': 'phone',
  'phone': 'phone',
  'mobile': 'phone',
  'tel': 'phone',
  'telephone': 'phone',
  'מייל': 'email',
  'אימייל': 'email',
  'email': 'email',
  'e-mail': 'email',
  'תפקיד': 'temp_role_name',
  'role': 'temp_role_name',
  'עיר': 'temp_city_name',
  'city': 'temp_city_name',
  'פייסבוק': 'facebook_url',
  'facebook': 'facebook_url',
  'facebook_url': 'facebook_url',
  'facebook url': 'facebook_url',
  'facebook id': 'facebook_id',
  'facebook_id': 'facebook_id',
  'מזהה פייסבוק': 'facebook_id',
  'שם פייסבוק': 'facebook_name',
  'facebook_name': 'facebook_name',
  'facebook name': 'facebook_name',
  'לינקדאין': 'linkedin_url',
  'linkedin': 'linkedin_url',
  'linkedin_url': 'linkedin_url',
  'הערות': 'notes',
  'notes': 'notes',
  'קבוצת פייסבוק': 'facebook_group_name',
  'facebook group': 'facebook_group_name',
  'מזהה קבוצה': 'facebook_group_id',
}

/**
 * שדות היעד שניתן למפות אליהם בייבוא, עם תוויות בעברית (INC-3125).
 * זהו מקור האמת של מסך המיפוי — אין להציג למשתמשת שמות עמודות טכניים.
 */
export const IMPORT_TARGET_FIELDS: { key: string; label: string }[] = [
  { key: 'display_name', label: 'שם מלא' },
  { key: 'phone', label: 'נייד' },
  { key: 'email', label: 'אימייל' },
  { key: 'first_name', label: 'שם פרטי' },
  { key: 'last_name', label: 'שם משפחה' },
  { key: 'temp_role_name', label: 'תפקיד (טקסט)' },
  { key: 'temp_city_name', label: 'עיר (טקסט)' },
  { key: 'facebook_name', label: 'שם Facebook' },
  { key: 'facebook_id', label: 'מזהה Facebook' },
  { key: 'facebook_url', label: 'קישור Facebook' },
  { key: 'linkedin_url', label: 'LinkedIn' },
  { key: 'facebook_group_name', label: 'קבוצת Facebook' },
  { key: 'notes', label: 'הערות' },
]

/**
 * זיהוי אוטומטי של מיפוי לפי כותרות הקובץ.
 * המשתמשת יכולה לשנות כל שיוך — הזיהוי הוא הצעה, לא הכרעה.
 */
export function detectMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {}
  for (const header of headers) {
    const mapped = COLUMN_MAP[header.toLowerCase().trim()]
    if (mapped) mapping[header] = mapped
  }
  return mapping
}

/**
 * ממיר שורה גולמית לשדות היעד לפי מיפוי מפורש.
 * בניגוד ל-normalizeRawRow, כאן המיפוי מגיע מהמשתמשת ולא מטבלה קבועה —
 * וכך קובץ עם כותרות לא מוכרות עדיין ניתן לייבוא.
 */
export function applyMapping(raw: RawRow, mapping: Record<string, string>): Record<string, unknown> {
  const parsed: Record<string, unknown> = {}
  for (const [header, target] of Object.entries(mapping)) {
    if (!target) continue
    const val = raw[header]
    if (val == null || !String(val).trim()) continue
    parsed[target] = String(val).trim()
  }
  const phone = parsed.phone as string | undefined
  if (phone) parsed.phone_norm = normalizePhone(phone)
  // אין פיצול שם אוטומטי — ראו ההערה ב-normalizeRawRow.
  return parsed
}

export async function parseExcelFile(file: File): Promise<RawRow[]> {
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json<RawRow>(sheet)
}

export async function parseCsvFile(file: File): Promise<RawRow[]> {
  const text = await file.text()
  const wb = XLSX.read(text, { type: 'string' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json<RawRow>(sheet)
}

const PHONE_RE = /(?:\+972|972|0)\d{8,9}/g
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const FB_URL_RE = /https?:\/\/(?:www\.)?facebook\.com\/[^\s,]+/g

export function parsePastedText(text: string): RawRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (!lines.length) return []

  if (lines[0].includes('\t')) {
    const wb = XLSX.read(text, { type: 'string' })
    const sheet = wb.Sheets[wb.SheetNames[0]]
    return XLSX.utils.sheet_to_json<RawRow>(sheet)
  }

  const rows: RawRow[] = []
  for (const line of lines) {
    const phones = line.match(PHONE_RE)
    const emails = line.match(EMAIL_RE)
    const fbUrls = line.match(FB_URL_RE)

    if (phones || emails || fbUrls) {
      const cleanName = line
        .replace(PHONE_RE, '')
        .replace(EMAIL_RE, '')
        .replace(FB_URL_RE, '')
        .replace(/[,;|]/g, '')
        .trim()

      rows.push({
        original_line: line,
        phone: phones?.[0] ?? null,
        email: emails?.[0] ?? null,
        facebook_url: fbUrls?.[0] ?? null,
        display_name: cleanName || null,
      })
    } else {
      rows.push({ original_line: line, display_name: line })
    }
  }
  return rows
}

export function normalizeRawRow(raw: RawRow): Record<string, unknown> {
  const parsed: Record<string, unknown> = {}

  for (const [key, val] of Object.entries(raw)) {
    const mapped = COLUMN_MAP[key.toLowerCase().trim()]
    if (mapped && val != null && String(val).trim()) {
      parsed[mapped] = String(val).trim()
    }
  }

  const phone = parsed.phone as string | undefined
  if (phone) {
    parsed.phone_norm = normalizePhone(phone)
  }

  // INC-3124: אין פיצול שם חופשי ל-first_name/last_name.
  //
  // עד כאן הפרסר פיצל כל שם עם רווח: המילה הראשונה כשם פרטי, השאר כשם
  // משפחה. זה ייצר נתונים שגויים בביטחון מלא — "ד״ר יעל כהן" הפך ל-
  // first_name="ד״ר", ושמות מורכבים ("בן דוד", "אבו חצירא") נחתכו.
  // הערכים האלה נראים אחר כך כמידע אמין ומוצעים לכתיבה לליבה.
  //
  // first_name/last_name נכתבים אך ורק כשהמקור סיפק אותם בעמודות נפרדות
  // (COLUMN_MAP למעלה מזהה "שם פרטי"/"שם משפחה"). אחרת נשמר display_name
  // כפי שהגיע. אותו כלל נאכף ב-CreateFromLeadDialog.

  return parsed
}

export function detectFileType(file: File): 'excel' | 'csv' | 'unknown' {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'xlsx' || ext === 'xls') return 'excel'
  if (ext === 'csv') return 'csv'
  return 'unknown'
}
