/**
 * חילוץ מידע גולמי (§6, §8.4) — regex טהור, ללא Supabase. מוציא מהטקסט
 * את כל המזהים הגולמיים (טלפונים, מיילים, Facebook) ומייחס טלפונים
 * לבעליהם האפשריים. אינו קובע role_id/city_id — זה תפקיד normalize.ts
 * (הבדל מכוון: resolve_city דורש שם עיר מבודד, לעומת detect_role_from_text
 * שסורק טקסט חופשי בעצמו — אומת חי מול Supabase).
 */

/**
 * טלפון ישראלי: קידומת (05x נייד או 2/3/4/8/9 קו נייח) ואחריה 7 ספרות,
 * עם מפרידים אופציונליים **בכל מקום** ביניהן.
 *
 * הגרסה הקודמת קיבעה את הפיצול ל-`\d{3}[-\s]?\d{4}` ולכן פספסה קיבוצים
 * חריגים שמופיעים בפועל בהודעות: `054-9920-559` (נייד תקין לחלוטין!)
 * נכשל כי אחרי `992` נותרו `0-559` ו-`\d{4}` דרש ארבע ספרות רצופות.
 * אומת חי — מודעות עם לקוחות אמיתיים נעלמו מהמסך בגלל זה.
 *
 * עכשיו: 7 ספרות אחרי הקידומת, כל אחת עם מפריד אופציונלי לפניה. הספירה
 * נשארת מדויקת (לא "כל רצף ספרות") ולכן זה אינו מרחיב לזבל — מספר בן 9
 * ספרות כמו `055668007` עדיין נדחה בצדק.
 */
const PHONE_RE = /(?:\+?972[-\s]?|0)([23489]|5[0-9])(?:[-\s]?\d){7}/g
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const FB_URL_RE = /https?:\/\/(?:www\.)?(?:facebook|fb)\.com\/[^\s)]+/gi
const FB_ID_ONLY_RE = /(?:facebook\.com\/profile\.php\?id=)(\d+)/i

export interface ExtractedPhone {
  raw: string
  /** מקור הייחוס: בתוך ההודעה (עדיפות ראשונה) או מהשולח (fallback בלבד). */
  source: 'message' | 'sender'
}

export interface ExtractedIdentifiers {
  phones: ExtractedPhone[]
  emails: string[]
  facebookUrls: string[]
  facebookId: string | null
}

/**
 * מחלץ את כל המזהים הגולמיים מהודעה. §8.4 סעיפים 1–4: מספר בתוך ההודעה
 * הוא המועמד הראשי; טלפון השולח הוא fallback רק כשאין מספר בתוכן כלל.
 */
export function extractIdentifiers(text: string, senderPhone: string | null): ExtractedIdentifiers {
  const inMessage = Array.from(new Set((text.match(PHONE_RE) ?? []).map((s) => s.trim())))
  const phones: ExtractedPhone[] = inMessage.map((raw) => ({ raw, source: 'message' as const }))

  // fallback רק כשאין שום מספר בתוך ההודעה עצמה (§8.4 סעיף 3)
  if (phones.length === 0 && senderPhone) {
    phones.push({ raw: senderPhone, source: 'sender' })
  }

  const emails = Array.from(new Set(text.match(EMAIL_RE) ?? []))
  const facebookUrls = Array.from(new Set(text.match(FB_URL_RE) ?? []))
  const facebookId = text.match(FB_ID_ONLY_RE)?.[1] ?? null

  return { phones, emails, facebookUrls, facebookId }
}
