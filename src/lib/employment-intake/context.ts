/**
 * מנוע ההקשר (§8.3) — מחבר הודעות רצופות ליחידת ניתוח אחת, רק כאשר
 * מתקיימים כל התנאים: אותו שולח, פרק זמן קרוב, התוכן משלים בבירור, ואין
 * סימן להודעה חדשה. בספק — לא מחברים.
 *
 * אפס אובדן: כל הודעה גולמית תמיד הופכת לשורה עצמאית משלה מאוחר יותר
 * (ב-buildRowsFromUnit) — החיבור כאן קובע רק אילו הודעות ינותחו יחד
 * (combinedText), לא מוחק אף אחת מהן.
 *
 * זהו חיבור "אותה הודעה שהתפצלה" ברמה עסקית (למשל שולח ששלח שלוש בועות
 * רצופות שמשלימות זו את זו) — לא איחוד פיזי של שורות בקובץ (זה כבר בוצע
 * ב-whatsappLines.ts).
 */

import type { ContextUnit, RawParsedMessage } from '@/types/employment-intake'

/** פרק הזמן המרבי בין שתי הודעות שעדיין נחשב "קרוב". */
const CLOSE_TIME_MS = 3 * 60 * 1000

/** אורך מרבי להודעת המשך "קטע" — הודעה ארוכה יותר נחשבת עצמאית. */
const FRAGMENT_MAX_LENGTH = 60

const CONNECTOR_STARTERS = ['ו', 'גם', 'וגם', 'פרטים', 'ל-', 'ב-', 'טל', 'נייד']
const BARE_PHONE_RE = /^[\d\-+()\s]{7,}$/

function normalizeSenderKey(senderName: string | null, senderPhone: string | null): string | null {
  if (senderPhone) return `p:${senderPhone}`
  if (senderName) return `n:${senderName.trim().toLowerCase()}`
  return null
}

/** אותו שולח מאומת — לא "לא ידוע משני הצדדים". */
function sameSender(a: RawParsedMessage, b: RawParsedMessage): boolean {
  const keyA = normalizeSenderKey(a.senderName, a.senderPhone)
  const keyB = normalizeSenderKey(b.senderName, b.senderPhone)
  return !!keyA && !!keyB && keyA === keyB
}

/** פרק זמן קרוב מאומת — שני הזמנים חייבים להיות ידועים. */
function closeInTime(a: RawParsedMessage, b: RawParsedMessage): boolean {
  if (!a.sentAt || !b.sentAt) return false
  const diff = Math.abs(new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
  return Number.isFinite(diff) && diff <= CLOSE_TIME_MS
}

/**
 * "התוכן משלים בבירור" — היוריסטיקה שמרנית בכוונה: הודעת ההמשך המועמדת
 * חייבת להיות קצרה ולהיראות כמו קטע (מספר טלפון בלבד, מילת חיבור, וכו').
 * זו אינה הבנה סמנטית — זו רק סינון למקרים החד-משמעיים; המקרה המעורפל
 * נשאר "בספק" ולכן לא מתחבר.
 */
function looksLikeFragmentContinuation(candidate: RawParsedMessage): boolean {
  const text = candidate.text.trim()
  if (!text || text.length > FRAGMENT_MAX_LENGTH) return false
  if (BARE_PHONE_RE.test(text)) return true
  const firstWord = text.split(/\s+/)[0] ?? ''
  return CONNECTOR_STARTERS.some((c) => firstWord.startsWith(c))
}

/** הודעה קודמת שמסתיימת בסימן סיום-משפט נחשבת שלמה. */
function priorLooksIncomplete(prior: RawParsedMessage): boolean {
  const text = prior.text.trim()
  if (!text) return false
  return !/[.!?׃][\s]*$/.test(text)
}

/**
 * "אין סימן להודעה חדשה" (§8.3) — וטו מפורש. הודעה שנפתחת בפנייה או
 * בגוף ראשון מתחילה נושא חדש, גם כשהיא מגיעה מאותו שולח שנייה אחרי
 * הקודמת. בלי הווטו הזה, מודעת גיוס והודעת חיפוש-עבודה של אותו שולח
 * היו מתמזגות ליחידת ניתוח אחת ומקבלות סיווג אחד שגוי לשתיהן.
 * הרשימה מכוונת לפתיחים בלבד — "באזור..." או "זמינה בימים..." הם
 * המשכים לגיטימיים ואינם נחסמים.
 */
const NEW_MESSAGE_OPENERS = ['אני', 'אנחנו', 'אנו', 'שלום', 'היי', 'הי', 'בוקר', 'ערב', 'דרוש', 'דרושה', 'דרושים', 'דרושות', 'מגייס', 'מגייסת', 'מגייסים']

function startsNewMessage(candidate: RawParsedMessage): boolean {
  const firstWord = candidate.text.trim().split(/[^א-ת0-9a-zA-Z']+/).filter(Boolean)[0] ?? ''
  return NEW_MESSAGE_OPENERS.includes(firstWord)
}

function shouldMerge(prior: RawParsedMessage, candidate: RawParsedMessage): boolean {
  if (!sameSender(prior, candidate)) return false
  if (!closeInTime(prior, candidate)) return false
  if (startsNewMessage(candidate)) return false
  if (!looksLikeFragmentContinuation(candidate) && !priorLooksIncomplete(prior)) return false
  return true
}

/**
 * מחבר רצף הודעות ליחידות ניתוח. סדר ה-seq נשמר; כל הודעה משתייכת בדיוק
 * ליחידה אחת (כראשית או כחבר), ואף אחת לא נעלמת.
 */
export function connectContext(messages: RawParsedMessage[]): ContextUnit[] {
  if (messages.length === 0) return []

  const sorted = [...messages].sort((a, b) => a.seq - b.seq)
  const units: ContextUnit[] = []
  let currentMembers: RawParsedMessage[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const candidate = sorted[i]
    const priorMessage = sorted[i - 1]

    if (shouldMerge(priorMessage, candidate)) {
      currentMembers.push(candidate)
    } else {
      units.push(buildUnit(currentMembers))
      currentMembers = [candidate]
    }
  }
  units.push(buildUnit(currentMembers))

  return units
}

function buildUnit(members: RawParsedMessage[]): ContextUnit {
  return {
    primarySeq: members[0].seq,
    members,
    combinedText: members.map((m) => m.text).join('\n'),
  }
}

// ─────────────────────────────────────────────────────
// הרכבת שורות — כל הודעה בתוך יחידה הופכת לשורה עצמאית
// ─────────────────────────────────────────────────────

export interface DraftRow {
  seq: number
  isPrimary: boolean
  parentSeq: number | null
  contextSeqs: number[]
  originalText: string
  contextText: string | null
  combinedTextForAnalysis: string
  senderName: string | null
  senderPhone: string | null
  sourceSeq: number | null
  sourcePublishedAt: string | null
  sourceMessageId: string | null
}

/**
 * הופך יחידת הקשר לשורות טיוטה — אחת לכל הודעה מקורית. רק הראשית נושאת
 * את context_seqs/context_text (התצוגה המאוחדת); החברות מצביעות אליה
 * דרך parent_seq. combinedTextForAnalysis זהה לכל חברות היחידה — זהו
 * הטקסט שעליו ירוץ מנוע הסיווג (שלב 4), לא original_text של כל שורה.
 */
export function buildDraftRows(unit: ContextUnit): DraftRow[] {
  return unit.members.map((m, i) => {
    const isPrimary = i === 0
    return {
      seq: m.seq,
      isPrimary,
      parentSeq: isPrimary ? null : unit.primarySeq,
      contextSeqs: isPrimary ? unit.members.slice(1).map((x) => x.seq) : [],
      originalText: m.text,
      contextText: isPrimary && unit.members.length > 1 ? unit.combinedText : null,
      combinedTextForAnalysis: unit.combinedText,
      senderName: m.senderName,
      senderPhone: m.senderPhone,
      sourceSeq: m.seq,
      sourcePublishedAt: m.sentAt,
      sourceMessageId: m.messageId,
    }
  })
}
