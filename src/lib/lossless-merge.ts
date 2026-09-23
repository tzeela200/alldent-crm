/**
 * INC-3146 — מיזוג רשומות בלי איבוד נתונים.
 *
 * לוגיקה טהורה (אין React ואין Supabase) כדי שאפשר יהיה לבדוק אותה ב-Node:
 *   npx tsx scripts/lossless-merge-acceptance.ts
 *
 * ## העיקרון
 *
 * 1. מוצג כל שדה שיש בו תוכן באחת הרשומות.
 * 2. ברירת המחדל אף פעם לא מוחקת: ערך רשומת המאסטר, ואם הוא ריק — ערך מהכפולה.
 *    רשימות מאוחדות, הערות מחוברות.
 * 3. נייד ומייל: כל ערך מקבל תפקיד — ראשי / נוסף / להערות / לא לשמור.
 *    מה שלא נכנס לשני המקומות עובר כברירת מחדל להערות.
 * 4. לפני האישור מוצג בדיוק מה לא יישמר.
 *
 * ## מה נשלח ל-RPC `merge_contacts`
 *
 * `overrides[field]` הוא אחד מאלה:
 *   { from: <id> }   קח את הערך מהרשומה הזו (המסד מעתיק — בלי לעבור דרך JS,
 *                    כי יש facebook_id שגדול מ-2^53 ומתעוות בדפדפן)
 *   { union: true }  איחוד הרשימות מכל הרשומות
 *   { value: ... }   ערך מפורש (נייד/מייל שנבחרו, הערות מחוברות)
 */

export type MergeRecord = Record<string, unknown>

export type FieldKind = 'scalar' | 'array' | 'text'

export interface LosslessMergeField {
  key: string
  label: string
  group: string
  /** scalar = בוחרים רשומה · array = אפשר לאחד · text = אפשר לחבר */
  kind?: FieldKind
  format?: (value: unknown) => string
  /** שדה שהמסד גוזר בטריגר משדה אחר (אזור וסוג יישוב נגזרים מהעיר) */
  derivedFrom?: string
}

export interface ContactPointSlot {
  id: string
  /** 'נייד' / 'מייל' */
  label: string
  primaryKey: string
  secondaryKey: string
  /** מפתח זהות לזיהוי כפילות (נייד מנורמל, מייל באותיות קטנות) */
  identity: (raw: string) => string
  /** null = תקין לשמש כראשי; אחרת הודעת שגיאה בעברית */
  primaryError?: (raw: string) => string | null
  format?: (raw: string) => string
}

export type FieldChoice =
  | { type: 'from'; recordId: number }
  | { type: 'union' }
  | { type: 'concat' }

export type PointRole = 'primary' | 'secondary' | 'notes' | 'drop'

export interface PointValue {
  key: string
  raw: string
  sources: { recordId: number; field: string }[]
}

export const POINT_ROLE_LABELS: Record<PointRole, string> = {
  primary: 'ראשי',
  secondary: 'נוסף',
  notes: 'להערות',
  drop: 'לא לשמור',
}

export const TEXT_JOINER = '\n---\n'

// ─── ערכים ───────────────────────────────────────────────────────────────

export function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined || value === false) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value as object).length === 0
  return false
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return JSON.stringify(value.map((v) => stable(v)))
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    return JSON.stringify(Object.keys(obj).sort().map((k) => [k, stable(obj[k])]))
  }
  if (typeof value === 'string') return JSON.stringify(value.trim())
  return JSON.stringify(value ?? null)
}

/** השוואה: רשימות כקבוצה (סדר לא משנה), טקסט בלי רווחים בקצוות. */
export function sameValue(a: unknown, b: unknown, kind: FieldKind = 'scalar'): boolean {
  if (isEmptyValue(a) && isEmptyValue(b)) return true
  if (kind === 'array' && Array.isArray(a) && Array.isArray(b)) {
    const sa = new Set(a.map((v) => stable(v)))
    const sb = new Set(b.map((v) => stable(v)))
    return sa.size === sb.size && [...sa].every((v) => sb.has(v))
  }
  return stable(a) === stable(b)
}

const idOf = (record: MergeRecord, idKey: string) => Number(record[idKey])

/** המאסטר ראשון, אחריו שאר הרשומות בסדר המקורי. */
export function orderMasterFirst(records: MergeRecord[], idKey: string, masterId: number): MergeRecord[] {
  const master = records.filter((r) => idOf(r, idKey) === masterId)
  return [...master, ...records.filter((r) => idOf(r, idKey) !== masterId)]
}

export interface FieldAnalysis {
  /** ערכים לא ריקים, מאסטר ראשון, בלי כפילויות */
  distinct: { recordId: number; value: unknown }[]
  allEmpty: boolean
  /** כל הרשומות זהות (כולל ריקות) — אין מה לבחור */
  identical: boolean
}

export function analyzeField(
  records: MergeRecord[],
  idKey: string,
  masterId: number,
  field: LosslessMergeField,
): FieldAnalysis {
  const kind = field.kind ?? 'scalar'
  const ordered = orderMasterFirst(records, idKey, masterId)
  const distinct: FieldAnalysis['distinct'] = []
  for (const record of ordered) {
    const value = record[field.key]
    if (isEmptyValue(value)) continue
    if (distinct.some((d) => sameValue(d.value, value, kind))) continue
    distinct.push({ recordId: idOf(record, idKey), value })
  }
  const first = records[0]?.[field.key]
  const identical = records.every((r) => sameValue(r[field.key], first, kind))
  return { distinct, allEmpty: distinct.length === 0, identical }
}

export function defaultChoice(
  records: MergeRecord[],
  idKey: string,
  masterId: number,
  field: LosslessMergeField,
): FieldChoice | null {
  const analysis = analyzeField(records, idKey, masterId, field)
  if (analysis.allEmpty) return null
  const kind = field.kind ?? 'scalar'
  if (analysis.distinct.length > 1 && kind === 'array') return { type: 'union' }
  if (analysis.distinct.length > 1 && kind === 'text') return { type: 'concat' }
  // distinct[0] הוא ערך המאסטר אם הוא לא ריק, אחרת הערך הראשון מהכפולות
  return { type: 'from', recordId: analysis.distinct[0].recordId }
}

/** הערך הסופי שיישמר לשדה, לפי הבחירה (לתצוגה ולחישוב מה הולך לאיבוד). */
export function resolveFieldValue(
  records: MergeRecord[],
  idKey: string,
  masterId: number,
  field: LosslessMergeField,
  choice: FieldChoice | null,
): unknown {
  if (!choice) return null
  if (choice.type === 'from') {
    return records.find((r) => idOf(r, idKey) === choice.recordId)?.[field.key] ?? null
  }
  const analysis = analyzeField(records, idKey, masterId, field)
  if (choice.type === 'union') {
    const out: unknown[] = []
    for (const d of analysis.distinct) {
      for (const item of (Array.isArray(d.value) ? d.value : [d.value])) {
        if (!out.some((o) => stable(o) === stable(item))) out.push(item)
      }
    }
    return out
  }
  return analysis.distinct.map((d) => String(d.value).trim()).join(TEXT_JOINER)
}

// ─── נייד ומייל ──────────────────────────────────────────────────────────

export function collectPoints(
  records: MergeRecord[],
  idKey: string,
  masterId: number,
  slot: ContactPointSlot,
): PointValue[] {
  const points: PointValue[] = []
  for (const record of orderMasterFirst(records, idKey, masterId)) {
    for (const field of [slot.primaryKey, slot.secondaryKey]) {
      const raw = record[field]
      if (typeof raw !== 'string' || raw.trim() === '') continue
      const key = slot.identity(raw.trim()) || raw.trim()
      const existing = points.find((p) => p.key === key)
      const source = { recordId: idOf(record, idKey), field }
      if (existing) existing.sources.push(source)
      else points.push({ key, raw: raw.trim(), sources: [source] })
    }
  }
  return points
}

/**
 * ברירת מחדל: ראשי = הראשי של המאסטר (אם תקין), נוסף = הערך הבא,
 * כל השאר — להערות. אף ערך לא מסומן "לא לשמור" בלי שהמשתמשת בחרה בזה.
 */
export function defaultPointRoles(
  points: PointValue[],
  slot: ContactPointSlot,
  masterId: number,
): Record<string, PointRole> {
  const roles: Record<string, PointRole> = {}
  const validPrimary = (p: PointValue) => !slot.primaryError || slot.primaryError(p.raw) === null
  const masterPrimary = points.find((p) =>
    p.sources.some((s) => s.recordId === masterId && s.field === slot.primaryKey) && validPrimary(p))
  const primary = masterPrimary ?? points.find(validPrimary)
  if (primary) roles[primary.key] = 'primary'

  const masterSecondary = points.find((p) =>
    p !== primary && p.sources.some((s) => s.recordId === masterId && s.field === slot.secondaryKey))
  const secondary = masterSecondary ?? points.find((p) => p !== primary)
  if (secondary) roles[secondary.key] = 'secondary'

  for (const p of points) if (!roles[p.key]) roles[p.key] = 'notes'
  return roles
}

export function validatePointRoles(
  points: PointValue[],
  roles: Record<string, PointRole>,
  slot: ContactPointSlot,
): string[] {
  const errors: string[] = []
  const primaries = points.filter((p) => roles[p.key] === 'primary')
  const secondaries = points.filter((p) => roles[p.key] === 'secondary')
  if (primaries.length > 1) errors.push(`אפשר לבחור ${slot.label} ראשי אחד בלבד`)
  if (secondaries.length > 1) errors.push(`אפשר לבחור ${slot.label} נוסף אחד בלבד — את השאר אפשר להעביר להערות`)
  for (const p of primaries) {
    const err = slot.primaryError?.(p.raw)
    if (err) errors.push(err)
  }
  return errors
}

// ─── התוכנית המלאה ───────────────────────────────────────────────────────

export interface MergePlanInput {
  records: MergeRecord[]
  idKey: string
  masterId: number
  fields: LosslessMergeField[]
  slots: ContactPointSlot[]
  choices: Record<string, FieldChoice | null>
  pointRoles: Record<string, Record<string, PointRole>>
  /** השדה שאליו נכנסים ערכי נייד/מייל שסומנו "להערות" */
  overflowField: string
}

export interface LostValue {
  label: string
  value: string
}

export interface MergePlan {
  overrides: Record<string, unknown>
  /** שורות שיתווספו לשדה ההערות */
  notesAppended: string[]
  /** ערכים שהועברו ממקום ראשי למקום נוסף */
  movedToSecondary: LostValue[]
  /** ערכים שלא יישמרו ברשומה הסופית */
  lost: LostValue[]
  errors: string[]
}

function fmtValue(field: LosslessMergeField, value: unknown): string {
  if (isEmptyValue(value)) return '—'
  if (field.format) return field.format(value)
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function buildMergePlan(input: MergePlanInput): MergePlan {
  const { records, idKey, masterId, fields, slots, choices, pointRoles, overflowField } = input
  const overrides: Record<string, unknown> = {}
  const notesAppended: string[] = []
  const movedToSecondary: LostValue[] = []
  const lost: LostValue[] = []
  const errors: string[] = []

  // נייד / מייל
  for (const slot of slots) {
    const points = collectPoints(records, idKey, masterId, slot)
    const roles = pointRoles[slot.id] ?? {}
    errors.push(...validatePointRoles(points, roles, slot))
    const fmt = (raw: string) => (slot.format ? slot.format(raw) : raw)
    const primary = points.find((p) => roles[p.key] === 'primary')
    const secondary = points.find((p) => roles[p.key] === 'secondary')
    overrides[slot.primaryKey] = { value: primary?.raw ?? null }
    overrides[slot.secondaryKey] = { value: secondary?.raw ?? null }
    if (secondary && secondary.sources.some((s) => s.field === slot.primaryKey)) {
      movedToSecondary.push({ label: `${slot.label} נוסף`, value: fmt(secondary.raw) })
    }
    for (const p of points) {
      if (roles[p.key] === 'notes') notesAppended.push(`${slot.label} נוסף מהמיזוג: ${fmt(p.raw)}`)
      if (roles[p.key] === 'drop') lost.push({ label: slot.label, value: fmt(p.raw) })
    }
  }

  // שדות רגילים
  const finalOf = (key: string) => {
    const field = fields.find((f) => f.key === key)
    return field ? resolveFieldValue(records, idKey, masterId, field, choices[key] ?? null) : null
  }
  for (const field of fields) {
    const analysis = analyzeField(records, idKey, masterId, field)
    if (analysis.allEmpty) continue
    // אזור/סוג יישוב: כשיש עיר, המסד גוזר אותם ממנה — לא שולחים
    if (field.derivedFrom && !isEmptyValue(finalOf(field.derivedFrom))) continue
    const choice = choices[field.key] ?? defaultChoice(records, idKey, masterId, field)
    if (!choice) continue

    if (choice.type === 'union') overrides[field.key] = { union: true }
    else if (choice.type === 'concat') {
      overrides[field.key] = { value: resolveFieldValue(records, idKey, masterId, field, choice) }
    } else overrides[field.key] = { from: choice.recordId }

    if (choice.type === 'from') {
      const chosen = resolveFieldValue(records, idKey, masterId, field, choice)
      const kind = field.kind ?? 'scalar'
      for (const d of analysis.distinct) {
        if (kind === 'array' && Array.isArray(d.value)) {
          const chosenArr = Array.isArray(chosen) ? chosen : []
          const missing = d.value.filter((item) => !chosenArr.some((c) => stable(c) === stable(item)))
          if (missing.length) lost.push({ label: field.label, value: fmtValue(field, missing) })
        } else if (!sameValue(d.value, chosen, kind)) {
          lost.push({ label: field.label, value: fmtValue(field, d.value) })
        }
      }
    }
  }

  // ערכים שעוברים להערות
  if (notesAppended.length) {
    const current = overrides[overflowField] as { value?: unknown; from?: number } | undefined
    let base = ''
    if (current && 'value' in current) base = String(current.value ?? '')
    else if (current && 'from' in current) {
      base = String(records.find((r) => idOf(r, idKey) === current.from)?.[overflowField] ?? '')
    } else {
      base = String(records.find((r) => idOf(r, idKey) === masterId)?.[overflowField] ?? '')
    }
    const appended = notesAppended.join('\n')
    overrides[overflowField] = { value: base.trim() ? `${base.trim()}\n${appended}` : appended }
  }

  return { overrides, notesAppended, movedToSecondary, lost, errors: Array.from(new Set(errors)) }
}
