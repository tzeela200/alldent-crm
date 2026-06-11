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

  const name = parsed.display_name as string | undefined
  if (name && !parsed.first_name) {
    const parts = name.split(/\s+/)
    if (parts.length >= 2) {
      parsed.first_name = parts[0]
      parsed.last_name = parts.slice(1).join(' ')
    }
  }

  return parsed
}

export function detectFileType(file: File): 'excel' | 'csv' | 'unknown' {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'xlsx' || ext === 'xls') return 'excel'
  if (ext === 'csv') return 'csv'
  return 'unknown'
}
