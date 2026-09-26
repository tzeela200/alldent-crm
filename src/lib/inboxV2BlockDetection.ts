/**
 * זיהוי קידומת חסימה בשם הנכנס מ-Google Contacts (INC-3148).
 *
 * הראיות (33 רשומות אמיתיות, 26/09/2026): צאלה מוסיפה קידומת קבועה לשם עצמו
 * בגוגל אנשי קשר — "הסרה- עודאי", "לא רלוונטי- דר לובה" — ולא מסתמכת רק על
 * שינוי הסטטוס במערכת. ההכרעה שלה: **קידומת קבועה בתחילת השם בלבד**, לא סריקת
 * מילה בכל מקום בטקסט (זה היה מייצר false positives, למשל שם משפחה "חסום").
 *
 * "לא רלוונטי" ממופה ל-12 (הקוד הקיים שלה ב-dict_social_statuses). שאר חמש
 * המילים אין להן קוד ייעודי משלהן — כולן ממופות ל-13 ("הסרה"), אלא אם צאלה
 * תבקש מיפוי אחר.
 */

export interface BlockPrefixMatch {
  /** הקידומת שזוהתה, כפי שהיא מוצגת לצאלה */
  word: string
  /** dict_social_statuses.id שיש לכתוב על איש הקשר */
  socialStatus: number
}

const BLOCK_PREFIXES: BlockPrefixMatch[] = [
  { word: 'לא רלוונטי', socialStatus: 12 },
  { word: 'הסרה', socialStatus: 13 },
  { word: 'חסום', socialStatus: 13 },
  { word: 'לא קשור', socialStatus: 13 },
  { word: 'לא לשלוח', socialStatus: 13 },
  { word: 'פנסיה', socialStatus: 13 },
]

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** "הסרה- עודאי" / "הסרה - עודאי" / "הסרה-עודאי" — קידומת, לא טקסט חופשי בכל מקום. */
export function detectBlockPrefix(displayName: string | null | undefined): BlockPrefixMatch | null {
  if (!displayName) return null
  const trimmed = displayName.trim()
  for (const entry of BLOCK_PREFIXES) {
    const re = new RegExp(`^${escapeRegExp(entry.word)}\\s*-\\s*`)
    if (re.test(trimmed)) return entry
  }
  return null
}
