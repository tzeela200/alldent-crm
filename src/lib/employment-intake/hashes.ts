/**
 * נרמול טקסט ו-Hash — הבסיס ל-content_hash ול-source_hash שנוצרים ב-DB
 * כעמודות GENERATED (ראה מיגרציית INC-3119). הלוגיקה כאן חייבת לשקף בדיוק
 * את הכלל "lowercase · רווחים מכווצים · ללא תווי רוחב-אפס" — אחרת ה-Hash
 * שהלקוח מציג ב-Preview לא יתאים לזה שה-DB מחשב בפועל.
 *
 * normalized_text עצמו (לא ה-Hash) הוא מה שנשלח ל-DB; ה-DB מחשב את שני
 * ה-Hash ממנו. כאן רק מנרמלים את הטקסט לפני השמירה.
 */

/**
 * תווי רוחב-אפס וסימוני כיווניות שמגיעים מ-WhatsApp/Facebook/Excel:
 * ZWSP, ZWNJ, ZWJ, LRM, RLM (U+200B–U+200F), embedding/override
 * (U+202A–U+202E), isolate marks (U+2066–U+2069), BOM (U+FEFF).
 *
 * נבנה מקודי Unicode מספריים בלבד (לא תווים גולמיים בקובץ) כדי שלא
 * ייתכן שיבוש שקט של הקובץ עצמו על ידי אחד התווים שהוא אמור לסנן.
 */
const INVISIBLE_CODEPOINTS: [number, number][] = [
  [0x200b, 0x200f],
  [0x202a, 0x202e],
  [0x2066, 0x2069],
  [0xfeff, 0xfeff],
]

const INVISIBLE_CHARS = new RegExp(
  '[' + INVISIBLE_CODEPOINTS.map(([from, to]) => `\\u${from.toString(16).padStart(4, '0')}-\\u${to.toString(16).padStart(4, '0')}`).join('') + ']',
  'g',
)

export function normalizeForHash(text: string): string {
  return text
    .replace(INVISIBLE_CHARS, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/** מחשב SHA-256 של קובץ — לזיהוי "הקובץ כבר נקלט". דפוס זהה ל-campaignParser.ts. */
export { computeFileHash } from '@/lib/fixPublications/campaignParser'
