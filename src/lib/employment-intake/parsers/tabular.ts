/**
 * Parser עבור קובץ CSV/Excel — כל שורה בטבלה היא הודעה גולמית אחת.
 *
 * מימוש עצמאי (לא תלוי במודול Inbox V2) המשתמש ישירות בחבילת `xlsx`,
 * שכבר תלות קיימת בפרויקט. זיהוי עמודות לפי שם, לא לפי מיקום — סובלני
 * לכותרות בעברית/אנגלית ולסדר עמודות משתנה.
 */

import * as XLSX from 'xlsx'
import type { RawParsedMessage } from '@/types/employment-intake'

type RawRow = Record<string, unknown>

const TEXT_KEYS = ['message', 'text', 'content', 'body', 'תוכן', 'הודעה', 'טקסט']
const NAME_KEYS = ['name', 'sender', 'fullname', 'full_name', 'שם', 'שם השולח', 'שם מלא']
const PHONE_KEYS = ['phone', 'mobile', 'phone_number', 'נייד', 'טלפון', 'מספר']
const DATE_KEYS = ['date', 'time', 'timestamp', 'sending_time', 'sent_at', 'תאריך', 'שעה']
const ID_KEYS = ['id', 'message_id', 'row_id', 'מזהה']

function findKey(row: RawRow, candidates: string[]): string | null {
  const keys = Object.keys(row)
  for (const c of candidates) {
    const found = keys.find((k) => k.trim().toLowerCase() === c)
    if (found) return found
  }
  return null
}

function cellText(row: RawRow, candidates: string[]): string | null {
  const key = findKey(row, candidates)
  if (!key) return null
  const val = row[key]
  if (val == null) return null
  const s = String(val).trim()
  return s ? s : null
}

/** תא תאריך של Excel יכול להגיע כמספר סדרתי (ימים מאז 1899-12-30) או כטקסט. */
function cellDateIso(row: RawRow, candidates: string[]): string | null {
  const key = findKey(row, candidates)
  if (!key) return null
  const val = row[key]
  if (val == null || val === '') return null

  if (typeof val === 'number') {
    const ms = Math.round((val - 25569) * 86400 * 1000)
    const d = new Date(ms)
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
  }
  const d = new Date(String(val))
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function readRows(file: File): Promise<RawRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('קריאת הקובץ נכשלה.'))
    reader.onload = () => {
      try {
        const data = reader.result
        const wb = XLSX.read(data, { type: file.name.toLowerCase().endsWith('.csv') ? 'string' : 'array' })
        const sheet = wb.Sheets[wb.SheetNames[0]]
        resolve(XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: null }))
      } catch {
        reject(new Error('לא ניתן לקרוא את הקובץ. ודאי שזהו קובץ CSV או Excel תקין.'))
      }
    }
    if (file.name.toLowerCase().endsWith('.csv')) reader.readAsText(file)
    else reader.readAsArrayBuffer(file)
  })
}

export async function parseTabularFile(file: File): Promise<RawParsedMessage[]> {
  const rows = await readRows(file)
  if (rows.length === 0) {
    throw new Error('הקובץ ריק או שלא נמצאה בו טבלת נתונים.')
  }
  if (!findKey(rows[0], TEXT_KEYS)) {
    throw new Error('לא נמצאה עמודת טקסט/הודעה בקובץ. עמודות מזוהות: message, text, content, תוכן, הודעה.')
  }

  const messages: RawParsedMessage[] = []
  rows.forEach((row, i) => {
    const text = cellText(row, TEXT_KEYS)
    if (!text) return // שורה ללא טקסט כלל — אין מה לעבד; שאר השורות ממשיכות
    messages.push({
      seq: i + 1,
      text,
      senderName: cellText(row, NAME_KEYS),
      senderPhone: cellText(row, PHONE_KEYS),
      sentAt: cellDateIso(row, DATE_KEYS),
      messageId: cellText(row, ID_KEYS),
    })
  })
  return messages
}
