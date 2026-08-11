/**
 * שער כניסה למנועי הפרסור. מתאם בין "סוג מקור" שנבחר (או זוהה אוטומטית)
 * לבין ה-Parser המתאים. סוג המקור עצמו (source_type FK) תמיד מגיע מ-
 * dict_source_types החי — הקובץ הזה רק ממפה *שם* דיקט למשפחת פרסור,
 * ולעולם לא ממציא ID.
 */

import type { RawParsedMessage } from '@/types/employment-intake'
import { parseWhatsappExportFile } from './whatsappExport'
import { parseWhatsappCopyText } from './whatsappCopy'
import { parsePlainText } from './plainText'
import { parseTabularFile } from './tabular'
import { parseFacebookThreadText } from './facebookThread'

export type ParserFamily = 'whatsapp' | 'facebook' | 'tabular' | 'plain'

/**
 * ממפה שם שורת dict_source_types (כפי שנטען חי מ-Supabase) למשפחת פרסור.
 * לא תלוי ב-ID — רק בטקסט השם, כדי לא להמציא מספרים קשיחים בקוד.
 */
export function resolveParserFamily(sourceTypeName: string | null | undefined): ParserFamily {
  const n = (sourceTypeName ?? '').trim().toLowerCase()
  if (n.includes('whatsapp')) return 'whatsapp'
  if (n.startsWith('facebook') || n.startsWith('fb')) return 'facebook'
  if (n === 'excel' || n === 'csv') return 'tabular'
  return 'plain'
}

/** זיהוי אוטומטי ממה שהודבק, כשלא נבחר סוג מקור מפורש. */
export function autoDetectFamily(pastedText: string): ParserFamily {
  return parseWhatsappCopyText(pastedText) ? 'whatsapp' : 'plain'
}

/**
 * זיהוי אוטומטי לקובץ, כשלא נבחר סוג מקור מפורש. לקובצי טקסט בודקים את
 * התוכן בפועל (לא רק את הסיומת) — קובץ .txt יכול להיות ייצוא WhatsApp
 * או טקסט חופשי שנשמר כקובץ.
 */
export async function autoDetectFamilyForFile(file: File): Promise<ParserFamily> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.csv') || name.endsWith('.xlsx') || name.endsWith('.xls')) return 'tabular'
  const text = await file.text()
  return autoDetectFamily(text)
}

export interface ParseTextInput {
  kind: 'text'
  text: string
  family: ParserFamily
}
export interface ParseFileInput {
  kind: 'file'
  file: File
  family: ParserFamily
}
export type ParseInput = ParseTextInput | ParseFileInput

export async function runParser(input: ParseInput): Promise<RawParsedMessage[]> {
  if (input.kind === 'file') {
    if (input.family === 'whatsapp') return (await parseWhatsappExportFile(input.file)).messages
    if (input.family === 'tabular') return parseTabularFile(input.file)
    // קובץ טקסט חופשי/פייסבוק — קוראים כטקסט ומפרסרים כמו הדבקה
    const text = await input.file.text()
    if (input.family === 'facebook') return parseFacebookThreadText(text)
    return parsePlainText(text)
  }

  // הדבקה
  if (input.family === 'whatsapp') {
    const parsed = parseWhatsappCopyText(input.text)
    if (!parsed) {
      throw new Error('הטקסט שהודבק אינו נראה כמו שיחת WhatsApp (לא נמצאה אף שורה עם חותמת זמן).')
    }
    return parsed
  }
  if (input.family === 'facebook') return parseFacebookThreadText(input.text)
  return parsePlainText(input.text)
}
