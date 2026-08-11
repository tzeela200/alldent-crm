/**
 * §5.5 — contact.source נכתב רק כשיש ערך קיים ומתאים ב-dict_sources.
 * dict_sources (מילון קיים של contact.source) הוא מילון שונה לגמרי מ-
 * dict_source_types (המילון החדש של employment_intake.source_type) — אסור
 * לבלבל בין השניים. הקובץ הזה רק ממפה בין משפחת הפרסור (§8, parsers/index.ts)
 * לערך contact.source הקיים; אינו קורא ל-Supabase ואינו ממציא ID.
 */

import type { ParserFamily } from '@/lib/employment-intake/parsers'
import { resolveParserFamily } from '@/lib/employment-intake/parsers'

/** dict_sources: 4 = "WhatsApp" · 5 = "דרך פייסבוק" — אומתו חי (§1.3 בתוכנית). */
const CONTACT_SOURCE_BY_FAMILY: Partial<Record<ParserFamily, number>> = {
  whatsapp: 4,
  facebook: 5,
}

/**
 * מחזיר את ערך contact.source המתאים למקור הקליטה, לפי שם dict_source_types
 * שנטען חי (לא לפי ID קשיח). Email/Excel/CSV/הדבקה ⇒ null — אין ערך תואם.
 */
export function contactSourceForIntakeSourceType(sourceTypeName: string | null | undefined): number | null {
  const family = resolveParserFamily(sourceTypeName)
  return CONTACT_SOURCE_BY_FAMILY[family] ?? null
}
