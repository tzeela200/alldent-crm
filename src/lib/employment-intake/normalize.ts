/**
 * נרמול (§8.5) — לוגיקה טהורה, ללא Supabase. שני חלקים:
 *
 * 1. זיהוי מועמד לשם עיר בתוך טקסט חופשי. נדרש כאן ולא ב-DB כי אומת חי:
 *    resolve_city דורש שם עיר מבודד ("פתח תקווה") ומחזיר 0 שורות כשמעבירים
 *    לו משפט שלם ("אני מחפשת עבודה כסייעת בפתח תקווה") — בניגוד
 *    ל-detect_role_from_text שסורק טקסט חופשי בעצמו. לכן תפקיד/עיר אינם
 *    סימטריים: תפקיד מקבל את הטקסט המלא (RPC, שלב הבא), עיר מחייבת חילוץ
 *    מועמד קודם (כאן), ורק אז אישור מול resolve_city.
 *
 * 2. הכרעת ייחוס טלפון סופית מתוך המועמדים שחולצו (extract.ts) + תוצאות
 *    הנרמול (normalize_il_mobile_phone) — §8.4.
 */

import type { ExtractedPhone } from './extract'

export interface CityIndexEntry {
  id: number
  name: string
  normalizedName: string
  aliases: string[]
  regionId: number | null
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp: number[] = Array(n + 1)
  for (let j = 0; j <= n; j++) dp[j] = j
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j]
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1])
      prev = tmp
    }
  }
  return dp[n]
}

function normalizeForCompare(s: string): string {
  return s.replace(/[־\-]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()
}

/**
 * מסירה עד שתי אותיות יחס/חיבור עבריות מובילות (ב/ל/מ/כ/ו/ה, כולל צירוף
 * כמו "וב-", "כש-"). קריטי: שמות ערים בעברית כמעט תמיד מגיעים עם קידומת
 * ("בחולון", "לרמת גן") — אומת חי ש-resolve_city מחזיר אפס שורות על קלט
 * עם קידומת ("בפתח תקווה") ומחזיר תוצאה תקינה רק על הצורה החשופה
 * ("פתח תקווה"). בלי ההסרה הזו, כל מועמד עיר עם קידומת היה נכשל בשקט.
 */
const PREFIX_LETTERS = new Set(['ב', 'ל', 'מ', 'כ', 'ו', 'ה', 'ש'])
function stripHebrewPrefixes(word: string): string[] {
  const variants = new Set<string>([word])
  let current = word
  for (let i = 0; i < 2 && current.length > 2; i++) {
    if (!PREFIX_LETTERS.has(current[0])) break
    current = current.slice(1)
    variants.add(current)
  }
  return Array.from(variants)
}

/** כל הצורות של n-gram שכדאי לבדוק: המקורית + עם קידומות מוסרות ממילה ראשונה/כל המילים. */
function ngramVariants(gram: string): string[] {
  const words = gram.split(' ')
  const firstWordVariants = stripHebrewPrefixes(words[0])
  return firstWordVariants.map((w) => [w, ...words.slice(1)].join(' '))
}

/** כל שמות/aliases אפשריים של רשומת עיר אחת, מנורמלים להשוואה. */
function entryKeys(entry: CityIndexEntry): string[] {
  return [entry.name, entry.normalizedName, ...entry.aliases].filter(Boolean).map(normalizeForCompare)
}

/** כל רצפי ה-N-gram (1–3 מילים) האפשריים מתוך משפט — מועמדים לשם עיר. */
function generateNgrams(text: string): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const grams: string[] = []
  for (let size = 1; size <= 3; size++) {
    for (let i = 0; i + size <= words.length; i++) {
      grams.push(words.slice(i, i + size).join(' '))
    }
  }
  return grams
}

/**
 * מחזיר מועמדי עיר (המחרוזת הגולמית מהטקסט, לא השם הרשמי) — לשליחה בהמשך
 * ל-resolve_city לאישור. התאמה מדויקת קודם; רק אם אין אף התאמה מדויקת
 * בכל ההודעה, מתבצע מעבר מטושטש אחד (§8.1: שגיאות כתיב נתמכות ב"שכבת
 * ההבנה" כי ה-DB אינו מספק זאת).
 */
export function findCityCandidates(text: string, index: CityIndexEntry[]): string[] {
  if (index.length === 0) return []

  const ngrams = generateNgrams(text)
  // כל n-gram נבדק גם בצורתו המקורית וגם עם קידומות עבריות מוסרות —
  // המועמד שמוחזר הוא תמיד הצורה החשופה (בלי קידומת), כי זו הצורה
  // ש-resolve_city יודע להתאים.
  const allVariants = ngrams.flatMap(ngramVariants)

  const indexKeySet = new Set<string>()
  for (const entry of index) for (const key of entryKeys(entry)) indexKeySet.add(key)

  const seen = new Set<string>()
  const candidates: string[] = []
  for (const variant of allVariants) {
    const norm = normalizeForCompare(variant)
    if (indexKeySet.has(norm) && !seen.has(norm)) {
      seen.add(norm)
      candidates.push(variant)
    }
  }
  if (candidates.length > 0) return candidates

  // מעבר מטושטש — רק n-gram-ים (אחרי הסרת קידומת) בני 4+ תווים, מרחק עריכה 1
  const fuzzyCandidates: string[] = []
  const fuzzySeen = new Set<string>()
  for (const variant of allVariants) {
    const norm = normalizeForCompare(variant)
    if (norm.length < 4 || fuzzySeen.has(norm)) continue
    for (const key of indexKeySet) {
      if (Math.abs(key.length - norm.length) > 1) continue
      if (levenshtein(norm, key) <= 1) {
        fuzzySeen.add(norm)
        fuzzyCandidates.push(variant)
        break
      }
    }
  }
  return fuzzyCandidates
}

// ── ייחוס טלפון סופי (§8.4) ──────────────────────────────────────────

export interface AttributedPhones {
  phone: string | null
  phoneNorm: string | null
  secondPhone: string | null
  secondPhoneNorm: string | null
  unassignedPhones: string[]
}

/** קו נייח ישראלי: קידומת אזור (2/3/4/8/9) ואחריה 7 ספרות. */
const LANDLINE_RE = /^(?:\+?972[-\s]?|0)([23489])(?:[-\s]?\d){7}$/

/**
 * בוחר קו נייח מתוך הטלפונים שלא קיבלו ייחוס. `normalize_il_mobile_phone`
 * מחזיר NULL לכל מספר שאינו נייד, ולכן קווים נייחים של מרפאות נופלים
 * ל-`unassigned_phones` ואינם מוצגים בשום מקום — למרות שהמשתמשת קבעה
 * מפורשות: "להציג אותו — זה לקוח לכל דבר".
 *
 * מסונן לדפוס קו נייח בלבד, כדי שמספרים פגומים באמת (למשל `055668007`
 * בן 9 ספרות) לא יוצגו כאילו היו פרט קשר תקין.
 */
export function pickLandline(unassignedPhones: string[] | null | undefined): string | null {
  if (!unassignedPhones?.length) return null
  return unassignedPhones.find((raw) => LANDLINE_RE.test(raw.trim())) ?? null
}

/**
 * מכריע איזה מהטלפונים שחולצו הופך ל-phone/second_phone, ואילו נשארים
 * unassigned. קלט: הטלפונים הגולמיים + תוצאת normalize_il_mobile_phone
 * לכל אחד (Map מהגולמי למנורמל-או-null).
 */
export function attributePhones(extracted: ExtractedPhone[], normalized: Map<string, string | null>): AttributedPhones {
  const valid = extracted.filter((p) => normalized.get(p.raw))
  const fromMessage = valid.filter((p) => p.source === 'message')
  const fromSender = valid.filter((p) => p.source === 'sender')

  // §8.4 סעיף 1+3: מספר בתוך ההודעה קודם; טלפון שולח רק כשאין אף מספר בתוכן
  const ordered = fromMessage.length > 0 ? fromMessage : fromSender

  const primary = ordered[0] ?? null
  const secondary = ordered[1] ?? null
  const rest = ordered.slice(2)

  const invalidRaw = extracted.filter((p) => !normalized.get(p.raw)).map((p) => p.raw)

  return {
    phone: primary?.raw ?? null,
    phoneNorm: primary ? (normalized.get(primary.raw) ?? null) : null,
    secondPhone: secondary?.raw ?? null,
    secondPhoneNorm: secondary ? (normalized.get(secondary.raw) ?? null) : null,
    // §8.4 סעיף 5: כמה מספרים בלי ייחוס ודאי — נשארים לבדיקה, לא נמחקים
    unassignedPhones: [...rest.map((p) => p.raw), ...invalidRaw],
  }
}
