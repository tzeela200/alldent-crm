/**
 * מנוע הסיווג (§8.1–8.2) — כללים דטרמיניסטיים בלבד. שאלת ההכרעה: האם
 * התוכן מציע אדם לעבודה, או מבקש למצוא אדם שיעבוד?
 *
 * ההכרעה נגזרת מהאובייקט (מה מחפשים), לא מהנושא הדקדוקי (מי מדבר):
 * "אני מחפשת עבודה" ו-"אני מחפשת סייעת" חולקות את אותו נושא ("אני") אבל
 * מסתיימות בסיווגים הפוכים כי האובייקט שונה — עבודה מול תפקיד.
 *
 * שלושה שערים חוסמים ל"לא ברור" (§8.2) — כל אחד מספיק לבדו:
 *   1. שער ההקשר — תלוי בהודעה שאינה בקלט.
 *   2. שער הנושא-מושא — לא ניתן לקבוע מי מחפש ומה מחפשים. זהו השער העיקרי.
 *   3. שער הסתירה — ראיות לשני הכיוונים בלי מטרה ראשית.
 *
 * confidence_level הוא לתצוגה/דיאגנוסטיקה בלבד — אינו שער עסקי (§8.2).
 *
 * מימוש עם רשימות מילים מפורשות (לא regex עם צורות סופיות מקוצרות):
 * אותיות סופיות בעברית (ך/ם/ן/ף/ץ) משנות צורה בתוך מילה מורכבת ("מחליף"
 * לעומת "מחליפה" — ף מול פ) — מחלקות תווים גנריות היו מפספסות את זה.
 * וגם: \b של JS regex אינו מזהה גבול מילה נכון סביב אותיות עבריות
 * (הן אינן \w), ולכן הבדיקות כאן מבוססות פיצול למילים (tokenize) ולא \b.
 */

import type { ClassificationResult, ConfidenceLevel, ContentType } from '@/types/employment-intake'

// ── רשימות מילים מפורשות ────────────────────────────────────────────

const ROLE_WORDS = [
  'סייע', 'סייעת', 'סייעים', 'סייעות',
  'שיננית', 'שנן', 'שיננים', 'שיננות',
  'מזכיר', 'מזכירה', 'מזכירים', 'מזכירות',
  'מנהל', 'מנהלת', 'מנהלים', 'מנהלות',
  'עוזר', 'עוזרת', 'עוזרים', 'עוזרות',
  'מחליף', 'מחליפה', 'מחליפים', 'מחליפות',
  'עובד', 'עובדת', 'עובדים', 'עובדות',
  'נציג', 'נציגה', 'נציגים', 'נציגות',
  'פקיד', 'פקידה', 'פקידים', 'פקידות',
  'רופא', 'רופאה', 'רופאת', 'רופאים', 'רופאות',
  'טכנאי', 'טכנאית', 'טכנאים', 'טכנאיות',
  'רכש', 'רכשת', 'צלם', 'צלמת',
]

const JOB_WORDS = ['עבודה', 'עבודות', 'משרה', 'משרות', 'משמרת', 'משמרות', 'החלפה', 'החלפות', 'תפקיד', 'תפקידים']

const SEEK_WORDS = [
  'מחפש', 'מחפשת', 'מחפשים', 'מחפשות',
  'מעוניין', 'מעוניינת', 'מעוניינים', 'מעוניינות',
  'צריך', 'צריכה', 'צריכים', 'צריכות',
  'זקוק', 'זקוקה', 'זקוקים', 'זקוקות',
]

const FOUND_WORDS = ['מצאתי', 'מצאנו', 'מצאה', 'מצא', 'מצאו']

const RECRUITER_VERB_WORDS = ['מגייס', 'מגייסת', 'מגייסים', 'מגייסות', 'דרוש', 'דרושה', 'דרושים', 'דרושות']

// "פנוי/ה" ו-"זמין/ה" מתפקדים זהה (§8.1: "פנויה מחר" · "זמינה לעבודה") —
// שניהם מתארים *מי או מה* פנוי, וההכרעה נעשית לפי מה שמתואר כפנוי.
const AVAILABLE_WORDS = ['פנוי', 'פנויה', 'פנויים', 'פנויות', 'זמין', 'זמינה', 'זמינים', 'זמינות']

/** פעלי "נפתחה/יש/התפנתה" + מילת משרה = מודעת גיוס (§8.1: "יש משרה" · "נפתחה משרה"). */
const OPENING_WORDS = ['נפתחה', 'נפתח', 'נפתחו', 'התפנתה', 'התפנה', 'התפנו', 'יש', 'קיימת', 'קיים']

/** סימן למקום עבודה בטקסט — חלק מתבנית "תפקיד + מקום" של מודעת גיוס (§8.1). */
const WORKPLACE_RE = /(מרפא|קליניק|מעבד)/

const CLOSED_WORDS = ['הסתדרנו', 'אוישה']
const CLOSED_PHRASE_RE = /(כבר מצא(תי|נו|ה|ו)?|לא (מחפש[ת]?|צריכ[הים]?|פנוי[הת]?)\s*(כרגע|יותר)?)/

const IRRELEVANT_PHRASE_RE = /(מכיר[ת]? (ציוד|מרפאה)|למכיר[ה]|להשכר[ה]|קניית מרפאה|מרפאה ל(קניה|קנייה|השכרה))/

const GROUP_JOIN_RE = /(joined using this group|joined this group|הצטרפ[ה|ו]?\s*לקבוצה|added you|נוספ[הו]?\s*לקבוצה|created group|יצר[ה]?\s*את הקבוצה)/i

const NEEDS_CONTEXT_RE = /^(אשמח לפרטים|טלפון\??|לאיזה ימים\??|מישהו\??|פרטים\??)$/

const DAY_OR_TIME_RE = /(היום|מחר|מחרתיים|שבת|\d{1,2}:\d{2}|\d{1,2}\/\d{1,2})/

// ── כלי טוקניזציה והתאמה מטושטשת (עמידות לשגיאות כתיב, §8.1) ─────────

function tokenize(text: string): string[] {
  return text.split(/[^א-ת0-9a-zA-Z']+/).filter(Boolean)
}

/** מרחק לוינשטיין — לזיהוי שגיאות כתיב קרובות ("מחפס"→"מחפש", "מישרה"→"משרה"). */
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

/** התאמה מדויקת, ואם המילה ארוכה מספיק — גם במרחק עריכה 1 (שגיאת כתיב אחת). */
function wordMatches(token: string, word: string, fuzzy = true): boolean {
  if (token === word) return true
  if (!fuzzy) return false
  if (token.length < 4 || word.length < 4) return false
  return levenshtein(token, word) <= 1
}

/**
 * אינדקס הטוקן הראשון שמתאים לאחת המילים ברשימה, או -1.
 *
 * `fuzzy=false` נדרש לרשימות של פעלים קצרים ונפוצים: במרחק עריכה 1 על
 * מילים בנות ארבע אותיות מתקבלות התנגשויות אמיתיות בין מילים שאין
 * ביניהן קשר — "מלאה" (היקף משרה) רחוקה עריכה אחת מ-"מצאה" (פועל מציאה),
 * ומודעת גיוס תקינה הייתה מסווגת כ"לא ברור" בגלל ההתאמה השגויה.
 * מילות התוכן (תפקיד, משרה, חיפוש) נשארות מטושטשות — שם זו בדיוק הדרישה
 * מ-§8.1 ("מחפס מישרה כסעיית" ⇒ מחפש/ת עבודה).
 */
function findWordIndex(tokens: string[], words: string[], fuzzy = true): number {
  return tokens.findIndex((t) => words.some((w) => wordMatches(t, w, fuzzy)))
}

function containsAny(tokens: string[], words: string[], fuzzy = true): boolean {
  return findWordIndex(tokens, words, fuzzy) > -1
}

// ── שערי סיווג ────────────────────────────────────────────────────

/**
 * שער הנושא-מושא: קובע job_seeker/recruiter מתוך זוג פועל+אובייקט,
 * לא מספירת מילות מפתח. מחזיר null כשלא ניתן להכריע.
 */
function resolveSubjectObject(tokens: string[]): ContentType | null {
  // פעלי גיוס מפורשים גוברים תמיד — גם בתוך פסוקית "אם...אנחנו מגייסים" (§5).
  if (containsAny(tokens, RECRUITER_VERB_WORDS)) return 'recruiter'

  // "פנוי/ה" — תלוי במה שמתואר כפנוי: אדם (חיפוש) או משרה/מקום (גיוס),
  // או שאלה "מי פנוי/ה" (מחפשים אדם).
  const availIdx = findWordIndex(tokens, AVAILABLE_WORDS)
  if (availIdx > -1) {
    const before = tokens.slice(Math.max(0, availIdx - 3), availIdx)
    if (before.some((t) => wordMatches(t, 'משרה') || wordMatches(t, 'מקום') || wordMatches(t, 'תקן'))) {
      return 'recruiter'
    }
    if (tokens[0] === 'מי') return 'recruiter'
    return 'job_seeker'
  }

  // מודעת גיוס מקוצרת, בלי פועל חיפוש ובלי "דרוש/ה" (§8.1 קובע במפורש
  // שאין צורך במילה "דרוש/ה", ושתבנית "תפקיד + יום + מקום" היא גיוס).
  // התבנית: שם תפקיד + נסיבה — יום/שעה, מקום עבודה, או היקף משרה.
  // מחפש/ת עבודה ללא פועל היה משתמש/ת ב"פנויה/זמינה", שכבר נבדק למעלה.
  const roleIdx0 = findWordIndex(tokens, ROLE_WORDS)
  const hasSearchVerb = containsAny(tokens, SEEK_WORDS) || containsAny(tokens, FOUND_WORDS, false)
  if (!hasSearchVerb && roleIdx0 > -1) {
    const joined = tokens.join(' ')
    if (DAY_OR_TIME_RE.test(joined) || WORKPLACE_RE.test(joined) || containsAny(tokens, JOB_WORDS)) {
      return 'recruiter'
    }
  }

  // פועל חיפוש/עניין או פועל "מצא" (כולל צורך שהסתיים) — ההכרעה לפי האובייקט שאחריו.
  const actionIdx = Math.min(
    ...[findWordIndex(tokens, SEEK_WORDS), findWordIndex(tokens, FOUND_WORDS, false)].filter((i) => i > -1),
  )
  if (Number.isFinite(actionIdx)) {
    const after = tokens.slice(actionIdx + 1)
    const roleAfterIdx = findWordIndex(after, ROLE_WORDS)
    const jobAfterIdx = findWordIndex(after, JOB_WORDS)
    if (roleAfterIdx > -1 && (jobAfterIdx === -1 || roleAfterIdx < jobAfterIdx)) return 'recruiter'
    if (jobAfterIdx > -1 && (roleAfterIdx === -1 || jobAfterIdx < roleAfterIdx)) return 'job_seeker'
  }

  // מוצא אחרון: פועל פתיחה + מילת משרה ("נפתחה משרה", "יש משרה") — גיוס.
  // נבדק רק אחרי שכל השאר לא הכריע, כדי ש"יש" הנפוצה לא תשתלט על הסיווג.
  const openIdx = findWordIndex(tokens, OPENING_WORDS, false)
  if (openIdx > -1) {
    const nextTwo = tokens.slice(openIdx + 1, openIdx + 3)
    if (containsAny(nextTwo, JOB_WORDS)) return 'recruiter'
  }

  return null
}

function buildEvidence(tokens: string[], contentType: ContentType): string[] {
  const evidence: string[] = []
  const checks: [string[], string][] = [
    [RECRUITER_VERB_WORDS, 'פועל גיוס מפורש'],
    [AVAILABLE_WORDS, 'מילת "פנוי/ה"'],
    [SEEK_WORDS, 'פועל חיפוש/עניין'],
    [FOUND_WORDS, 'פועל "מצא"'],
    [ROLE_WORDS, 'שם תפקיד'],
    [JOB_WORDS, 'מילת "עבודה/משרה"'],
  ]
  for (const [words, label] of checks) {
    const idx = findWordIndex(tokens, words)
    if (idx > -1) evidence.push(`${label}: "${tokens[idx]}"`)
  }
  if (evidence.length === 0 && contentType !== 'unclear') evidence.push(tokens.slice(0, 6).join(' '))
  return evidence
}

function confidenceFor(contentType: ContentType, evidenceCount: number): ConfidenceLevel {
  if (contentType === 'unclear' || contentType === 'unclassified') return 'low'
  if (evidenceCount >= 2) return 'high'
  return 'medium'
}

/** מסווג טקסט יחיד (combinedTextForAnalysis של יחידת הקשר). דטרמיניסטי לחלוטין. */
export function classifyText(rawText: string): ClassificationResult {
  const text = rawText.replace(/\s+/g, ' ').trim()

  if (!text) {
    return {
      contentType: 'unclear',
      isActiveRequest: null,
      classifyReason: 'לא נמצא טקסט לניתוח',
      evidence: [],
      confidenceLevel: 'low',
      needsContext: true,
    }
  }

  // 1. הצטרפות לקבוצה — הודעת מערכת, לא מנותחת כתוכן
  if (GROUP_JOIN_RE.test(text)) {
    return {
      contentType: 'group_join',
      isActiveRequest: null,
      classifyReason: 'הודעת הצטרפות לקבוצה — אירוע מקור בלבד',
      evidence: [text.slice(0, 60)],
      confidenceLevel: 'high',
      needsContext: false,
    }
  }

  // 2. שער ההקשר — תגובה קצרה שתלויה בהודעה שאינה בקלט
  if (NEEDS_CONTEXT_RE.test(text) || text.length <= 2) {
    return {
      contentType: 'unclear',
      isActiveRequest: null,
      classifyReason: 'ההודעה תלויה בהקשר שאינו כלול בקלט',
      evidence: [text],
      confidenceLevel: 'low',
      needsContext: true,
    }
  }

  const tokens = tokenize(text)

  // 3. לא רלוונטי — רק כשאין שום סימן תפקיד תעסוקתי-דנטלי
  if (IRRELEVANT_PHRASE_RE.test(text) && !containsAny(tokens, ROLE_WORDS)) {
    return {
      contentType: 'irrelevant',
      isActiveRequest: null,
      classifyReason: 'תוכן שאינו צורך תעסוקתי דנטלי (מכירה/השכרה/קנייה)',
      evidence: [text.match(IRRELEVANT_PHRASE_RE)?.[0] ?? text.slice(0, 40)],
      confidenceLevel: 'medium',
      needsContext: false,
    }
  }

  // 4. צורך שהסתיים — נקבע בנפרד מסוג התוכן, לא כקטגוריה שלישית
  const closed = CLOSED_PHRASE_RE.test(text) || containsAny(tokens, CLOSED_WORDS, false)

  // 5. שער הנושא-מושא — ההכרעה המרכזית
  let verdict = resolveSubjectObject(tokens)

  // הצהרה על צורך שהסתיים, בלי פועל חיפוש ("המשרה אוישה", "הסתדרנו עם
  // סייעת") — זו הודעה של מגייס/ת שסוגר/ת את הצורך, לא הודעה לא ברורה.
  // "כבר מצאתי עבודה" אינו נופל לכאן: פועל "מצא" כבר הכריע job_seeker.
  if (!verdict && closed && (containsAny(tokens, JOB_WORDS) || containsAny(tokens, ROLE_WORDS))) {
    verdict = 'recruiter'
  }

  if (!verdict) {
    return {
      contentType: 'unclear',
      isActiveRequest: null,
      classifyReason: 'לא ניתן לקבוע מי מחפש ומה מחפשים מתוך הטקסט',
      evidence: [],
      confidenceLevel: 'low',
      needsContext: false,
    }
  }

  const evidence = buildEvidence(tokens, verdict)
  return {
    contentType: verdict,
    isActiveRequest: closed ? false : true,
    classifyReason:
      verdict === 'job_seeker'
        ? closed
          ? 'התוכן מזהה חיפוש עבודה, אך הצורך מסומן כסגור'
          : 'התוכן מציע אדם לעבודה'
        : closed
          ? 'התוכן מזהה צורך גיוס, אך הצורך מסומן כסגור'
          : 'התוכן מבקש למצוא אדם שיעבוד',
    evidence,
    confidenceLevel: confidenceFor(verdict, evidence.length),
    needsContext: false,
  }
}
