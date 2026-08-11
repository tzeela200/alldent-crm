/**
 * Parser עבור טקסט שהועתק ידנית מתוך שיחת WhatsApp (לא קובץ ייצוא).
 * אותה תבנית שורות בדיוק — ראה whatsappLines.ts.
 */

import type { RawParsedMessage } from '@/types/employment-intake'
import { parseWhatsappLines } from './whatsappLines'

export function parseWhatsappCopyText(pastedText: string): RawParsedMessage[] | null {
  return parseWhatsappLines(pastedText)
}
