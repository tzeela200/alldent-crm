/**
 * Parser עבור קובץ ייצוא שיחת WhatsApp (.txt). ראה whatsappLines.ts ללב הפענוח.
 */

import type { RawParsedMessage } from '@/types/employment-intake'
import { parseWhatsappLines } from './whatsappLines'

export interface WhatsappExportResult {
  messages: RawParsedMessage[]
  fileName: string
}

export async function parseWhatsappExportFile(file: File): Promise<WhatsappExportResult> {
  const text = await file.text()
  const messages = parseWhatsappLines(text)
  if (!messages) {
    throw new Error('הקובץ אינו נראה כמו ייצוא שיחת WhatsApp תקין (לא נמצאה אף שורה עם חותמת זמן).')
  }
  return { messages, fileName: file.name }
}
