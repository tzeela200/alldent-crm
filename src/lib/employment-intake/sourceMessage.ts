/**
 * חוקי מקור WhatsApp למסך "איתור מחפשי עבודה ומגייסים".
 * הקובץ טהור ואינו נוגע ב-Supabase: הוא מפריד הודעות מערכת, Actor/Target,
 * ומפרק תווית איש-קשר שמורה של Google בפורמט שם + תפקיד + עיר.
 */

export type SourceEventKind = 'join' | 'add' | 'system_noise' | 'regular'

export interface SourceEvent {
  kind: SourceEventKind
  actorLabel: string | null
  targetLabel: string | null
  targetPhone: string | null
  reason: string | null
}

const INVISIBLE_RE = /[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g
const PHONE_RE = /(?:\+?972[-\s]?(?:5\d)|05\d)(?:[-\s]?\d){7}/

export function cleanWhatsappLabel(value: string | null | undefined): string {
  return (value ?? '')
    .replace(INVISIBLE_RE, '')
    .replace(/^~\s*/, '')
    .replace(/[\u00A0\u202F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function trimPunctuation(value: string): string {
  return value.replace(/^[\s:;,–—-]+|[\s:;,–—.]+$/g, '').trim()
}

/** מזהה הודעות מערכת שאינן שורת עבודה אך חייבות להישאר במקור לצורך הקשר. */
export function detectSourceEvent(text: string): SourceEvent {
  const clean = cleanWhatsappLabel(text)

  if (/^(?:ההודעה (?:הזו|זאת) נמחקה|<\s*(?:המדיה לא נכללה|Media omitted)\s*>|image omitted|video omitted|sticker omitted)$/i.test(clean)) {
    return { kind: 'system_noise', actorLabel: null, targetLabel: null, targetPhone: null, reason: 'הודעת מערכת ללא מידע עסקי' }
  }

  // "X הסיר/ה את Y" או "X יצא/ה" — נשמרים במקור, לא נכנסים לשולחן העבודה.
  // הערה: \b של JS regex אינו מזהה גבול מילה נכון סביב אותיות עבריות (הן
  // אינן \w), ולכן העיגון כאן הוא לתחילת/סוף המחרוזת ולא ל-\b, כמו ב-add/join למטה.
  if (/^.+?\s+(?:הסיר\/?ה|הסיר|הסירה)\s+את\s+.+$/.test(clean) || /^.+?\s+(?:יצא\/?ה|יצא|יצאה)\s*$/.test(clean)) {
    return { kind: 'system_noise', actorLabel: null, targetLabel: null, targetPhone: null, reason: 'עזיבה/הסרה מקבוצה' }
  }

  // X צירף/ה את Y — ה-Target הוא Y, לא X.
  const add = clean.match(/^(.*?)\s+(?:צירף\/?ה|צירף|צירפה)\s+את\s+(.+?)\s*$/)
  if (add) {
    const actor = trimPunctuation(cleanWhatsappLabel(add[1])) || null
    const target = trimPunctuation(cleanWhatsappLabel(add[2])) || null
    const phone = target?.match(PHONE_RE)?.[0] ?? null
    return { kind: 'add', actorLabel: actor, targetLabel: target, targetPhone: phone, reason: 'אדם צורף לקבוצה' }
  }

  // WhatsApp: "+972... הצטרף/ה לקבוצה באמצעות קישור" וגם שם במקום מספר.
  const join = clean.match(/^(.*?)\s+(?:הצטרף\/?ה|הצטרף|הצטרפה|נוסף\/?ה|נוסף|נוספה)\s+(?:לקבוצה|באמצעות קישור|לקבוצה באמצעות קישור).*$/)
  if (join) {
    const target = trimPunctuation(cleanWhatsappLabel(join[1])) || null
    const phone = target?.match(PHONE_RE)?.[0] ?? null
    return { kind: 'join', actorLabel: null, targetLabel: target, targetPhone: phone, reason: 'אדם הצטרף לקבוצה' }
  }

  return { kind: 'regular', actorLabel: null, targetLabel: null, targetPhone: null, reason: null }
}

export interface StructuredGoogleContactInput {
  label: string | null
  matchedRoleAlias: string | null
  roleId: number | null
  cityCandidate: string | null
}

export interface StructuredGoogleContactResult {
  isStructured: boolean
  contactName: string | null
  rawLabel: string | null
}

function removeOnceInsensitive(text: string, token: string): string {
  if (!token.trim()) return text
  const idx = text.toLocaleLowerCase('he-IL').indexOf(token.trim().toLocaleLowerCase('he-IL'))
  if (idx < 0) return text
  return `${text.slice(0, idx)} ${text.slice(idx + token.trim().length)}`.replace(/\s+/g, ' ').trim()
}

/**
 * פורמט Google התפעולי של AllDent: שם + תפקיד + עיר.
 * רופאים הם החריג: "דר ... + עיר" מספיק כי "דר" עצמו הוא סימן התפקיד.
 * הפלט מחלץ רק את שם האדם; עצם הזיהוי מסומן כ-signal קיים לצורך matching.
 */
export function parseStructuredGoogleContact(input: StructuredGoogleContactInput): StructuredGoogleContactResult {
  const label = cleanWhatsappLabel(input.label)
  if (!label) return { isStructured: false, contactName: null, rawLabel: null }

  const isDoctor = /^(?:דר(?:[.\s]|$)|ד['״]?ר(?:[.\s]|$))/u.test(label)
  const hasCity = !!input.cityCandidate
  const hasRole = input.roleId != null && (!!input.matchedRoleAlias || isDoctor)
  if (!hasCity || !hasRole) return { isStructured: false, contactName: null, rawLabel: label }

  let name = label
  if (input.cityCandidate) name = removeOnceInsensitive(name, input.cityCandidate)
  // ברופא שומרים "דר" בשם. לעובדים מסירים את alias התפקיד (מזכירה/מנהלת/דנטל...).
  if (!isDoctor && input.matchedRoleAlias) name = removeOnceInsensitive(name, input.matchedRoleAlias)
  name = name.replace(/\s*[|•·]\s*/g, ' ').replace(/\s+/g, ' ').trim()
  name = trimPunctuation(name)

  return { isStructured: name.length >= 2, contactName: name || null, rawLabel: label }
}

/** שם בלבד מאירוע הצטרפות/צירוף: נשמר לזיהוי ידני אך אינו signal להתאמה אוטומטית. */
export function targetNameOnly(event: SourceEvent): string | null {
  if ((event.kind !== 'join' && event.kind !== 'add') || !event.targetLabel || event.targetPhone) return null
  const clean = cleanWhatsappLabel(event.targetLabel)
  return clean || null
}
