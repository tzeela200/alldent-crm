/**
 * INC-3129 — תצוגה ברמת **אדם**, לא ברמת הודעה.
 *
 * המסך הציג שורה לכל הודעה: 1,963 שורות שמאחוריהן ~468 אנשים בלבד
 * (שרה דהרי לבדה = 197 שורות). `identity_group_id` כבר התכנס נכון במסד
 * דרך resolve_employment_identity — והתצוגה התעלמה ממנו לחלוטין.
 *
 * הקובץ טהור לחלוטין (אפס Supabase) ולכן נבדק ב-
 * scripts/employment-intake-acceptance.ts, כמו שאר src/lib/employment-intake.
 * הקיבוץ עצמו נשען על resolveRowIdentity/identity.ts הקיים — לא מנגנון מקביל.
 */

import { resolveRowIdentity } from './identity'
import type { EmploymentIntakeRow } from '@/types/employment-intake'

/** חמש רשימות העבודה מהמפרט של המשתמשת (whatsapp-dental-recruitment). */
export type IntakeTab = 'job_seekers' | 'recruiters' | 'new_joiners' | 'numbers_pool' | 'unprocessed'

export const INTAKE_TAB_ORDER: IntakeTab[] = ['job_seekers', 'recruiters', 'new_joiners', 'numbers_pool', 'unprocessed']

export const INTAKE_TAB_LABEL: Record<IntakeTab, string> = {
  job_seekers: 'מחפשי עבודה',
  recruiters: 'מגייסים',
  new_joiners: 'מצטרפים חדשים',
  numbers_pool: 'מאגר מספרים',
  unprocessed: 'לא סווג',
}

/** שדות המינימום שהקיבוץ נשען עליהם — כל שורת intake מקיימת אותם. */
export type GroupableRow = Pick<
  EmploymentIntakeRow,
  | 'id' | 'canonical_contact_id' | 'identity_group_id' | 'identity_conflict'
  | 'sender_name' | 'content_type' | 'tags' | 'source_published_at' | 'ingested_at'
  | 'phone_norm' | 'email_norm'
>

function normalizeSender(name: string): string {
  return name.replace(/^~\s*/, '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('he-IL')
}

/**
 * מפתח הקיבוץ — לפי מי ההודעה **עליו**, לא מי שלח אותה.
 *
 *   יש מזהה משלו (נייד/מייל/פייסבוק/התאמה) → הזהות שהתכנסה במסד
 *   אין מזהה, אך ההודעה מפנה לשולח        → השולח הוא הנושא
 *   אין כלום                               → null ⇒ "לא סווג"
 *
 * זה מה ששומר את 132 המודעות שהעבירה מנהלת קבוצה אחת כ-100 מרפאות
 * **נפרדות** (לכל מודעה נייד אחר), ובו-זמנית מכווץ 7 הודעות בלי נייד
 * מאותה מחפשת עבודה לאדם אחד.
 *
 * `no_contact_info` (המנוע מסמן: מודעת גיוס מועברת בלי שום דרך ליצור
 * קשר) מוציא את השורה מהקיבוץ — אין אדם לקבץ אליו.
 */
export function personGroupKey(row: GroupableRow): string | null {
  const identity = resolveRowIdentity(row)
  if (identity) return identity.key
  if ((row.tags ?? []).includes('no_contact_info')) return null
  const sender = row.sender_name ? normalizeSender(row.sender_name) : ''
  return sender ? `s:${sender}` : null
}

export interface PersonRow<T extends GroupableRow> {
  key: string
  /** כל ההודעות של אותו אדם, מהחדשה לישנה. */
  rows: T[]
  /** השורה שמייצגת את האדם בטבלה — האחרונה שהתקבלה. */
  primary: T
  messageCount: number
  contentTypes: string[]
  latestAt: string | null
}

function rowTime(row: GroupableRow): number {
  const iso = row.source_published_at ?? row.ingested_at
  const ms = iso ? new Date(iso).getTime() : NaN
  return Number.isFinite(ms) ? ms : 0
}

/**
 * מקבץ שורות לאנשים. שורות בלי מפתח קיבוץ מוחזרות ב-`unprocessed` —
 * הן נשמרות במלואן (כלל המשתמשת "לא למחוק"), רק אינן ברשימות העבודה.
 */
export function buildPersonRows<T extends GroupableRow>(rows: T[]): { people: PersonRow<T>[]; unprocessed: T[] } {
  const byKey = new Map<string, T[]>()
  const unprocessed: T[] = []

  for (const row of rows) {
    const key = personGroupKey(row)
    if (!key) {
      unprocessed.push(row)
      continue
    }
    const list = byKey.get(key)
    if (list) list.push(row)
    else byKey.set(key, [row])
  }

  const people: PersonRow<T>[] = []
  for (const [key, group] of byKey) {
    const sorted = [...group].sort((a, b) => rowTime(b) - rowTime(a))
    people.push({
      key,
      rows: sorted,
      primary: sorted[0],
      messageCount: sorted.length,
      contentTypes: Array.from(new Set(sorted.map((r) => r.content_type))),
      latestAt: sorted[0].source_published_at ?? sorted[0].ingested_at ?? null,
    })
  }

  people.sort((a, b) => rowTime(b.primary) - rowTime(a.primary))
  return { people, unprocessed }
}

/**
 * הלשוניות הן **מסננים, לא חלוקה**: אדם ששלח גם מודעת גיוס וגם פנייה
 * לחיפוש עבודה מופיע בשתיהן, וזו התמונה הנכונה. רק "לא סווג" בלעדית.
 */
export function personBelongsToTab(person: PersonRow<GroupableRow>, tab: IntakeTab): boolean {
  switch (tab) {
    case 'job_seekers':
      return person.contentTypes.includes('job_seeker')
    case 'recruiters':
      return person.contentTypes.includes('recruiter')
    case 'new_joiners':
      return person.contentTypes.includes('group_join')
    default:
      return false
  }
}

export interface PoolEntry {
  /** הנייד או המייל — הערך עצמו הוא המפתח הייחודי. */
  value: string
  kind: 'phone' | 'email'
  firstSeen: string | null
  lastSeen: string | null
  occurrences: number
  rowIds: number[]
}

/**
 * "מאגר מספרים" — דרישה מפורשת במפרט: **כל מספר נייד וכתובת מייל רק פעם
 * אחת**. נבנה מהערכים המנורמלים בלבד (phone_norm/email_norm), כך ששני
 * כתיבים של אותו מספר אינם מייצרים שתי שורות.
 */
export function buildNumbersPool(rows: GroupableRow[]): PoolEntry[] {
  const byValue = new Map<string, PoolEntry>()

  const add = (value: string | null, kind: 'phone' | 'email', row: GroupableRow) => {
    if (!value) return
    const mapKey = `${kind}:${value}`
    const at = row.source_published_at ?? row.ingested_at ?? null
    const existing = byValue.get(mapKey)
    if (!existing) {
      byValue.set(mapKey, { value, kind, firstSeen: at, lastSeen: at, occurrences: 1, rowIds: [row.id] })
      return
    }
    existing.occurrences++
    existing.rowIds.push(row.id)
    if (at && (!existing.firstSeen || at < existing.firstSeen)) existing.firstSeen = at
    if (at && (!existing.lastSeen || at > existing.lastSeen)) existing.lastSeen = at
  }

  for (const row of rows) {
    add(row.phone_norm, 'phone', row)
    add(row.email_norm, 'email', row)
  }

  return Array.from(byValue.values()).sort((a, b) => (b.lastSeen ?? '').localeCompare(a.lastSeen ?? ''))
}
