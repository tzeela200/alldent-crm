/**
 * §3.5 פעולה 10 ("מיזוג מידע חדש לרשומה קיימת") ו-§3.6 מקטע ד'
 * ("הערך הקיים ← החדש"). לוגיקה טהורה: משווה בין מה שחולץ בהודעה לבין
 * הערכים החיים ברשומת Contact/Account שכבר קיימת, ומחזירה רק שדות
 * שבהם יש ערך חדש שונה מהקיים — לבחירה פר-שדה בממשק, לעולם לא דריסה
 * אוטומטית (§3.5: "בחירה פר-שדה, ללא דריסת ערכים קיימים").
 */

import { fieldLabel } from '@/lib/employment-intake/labels'
import type { EmploymentIntakeRow } from '@/types/employment-intake'

type MergeSourceRow = Pick<
  EmploymentIntakeRow,
  'contact_name' | 'phone' | 'second_phone' | 'email' | 'second_email' | 'facebook_id' | 'facebook_url' | 'facebook_name' | 'role_id' | 'city_id' | 'org_name'
>

export interface MergeFieldDiff {
  /** שם העמודה ביעד (contact/accounts) */
  key: string
  label: string
  current: unknown
  incoming: unknown
  /** הערך הקיים ריק — ברירת המחדל הבטוחה היא לכלול (§5.2 כלל 3) */
  fillsEmpty: boolean
}

function isEmpty(v: unknown): boolean {
  return v == null || v === '' || (Array.isArray(v) && v.length === 0)
}

function pushDiff(list: MergeFieldDiff[], key: string, current: unknown, incoming: unknown) {
  if (isEmpty(incoming)) return
  if (current === incoming) return
  list.push({ key, label: fieldLabel(key), current, incoming, fillsEmpty: isEmpty(current) })
}

export interface ContactCompareData {
  display_name: string | null
  phone: string | null
  second_phone: string | null
  email: string | null
  second_email: string | null
  facebook_id: string | null
  facebook_url: string | null
  facebook_name: string | null
  role: number | null
  city_id: number | null
}

export function computeContactMergeDiff(row: MergeSourceRow, contact: ContactCompareData): MergeFieldDiff[] {
  const diffs: MergeFieldDiff[] = []
  pushDiff(diffs, 'display_name', contact.display_name, row.contact_name)
  pushDiff(diffs, 'phone', contact.phone, row.phone)
  pushDiff(diffs, 'second_phone', contact.second_phone, row.second_phone)
  pushDiff(diffs, 'email', contact.email, row.email)
  pushDiff(diffs, 'second_email', contact.second_email, row.second_email)
  pushDiff(diffs, 'facebook_id', contact.facebook_id, row.facebook_id)
  pushDiff(diffs, 'facebook_url', contact.facebook_url, row.facebook_url)
  pushDiff(diffs, 'facebook_name', contact.facebook_name, row.facebook_name)
  pushDiff(diffs, 'role', contact.role, row.role_id)
  pushDiff(diffs, 'city_id', contact.city_id, row.city_id)
  return diffs
}

export interface AccountCompareData {
  account_name: string | null
  phone: string | null
  email: string | null
  facebook_url: string | null
  city_id: number | null
}

export function computeAccountMergeDiff(row: MergeSourceRow, account: AccountCompareData): MergeFieldDiff[] {
  const diffs: MergeFieldDiff[] = []
  pushDiff(diffs, 'account_name', account.account_name, row.org_name)
  pushDiff(diffs, 'phone', account.phone, row.phone)
  pushDiff(diffs, 'email', account.email, row.email)
  pushDiff(diffs, 'facebook_url', account.facebook_url, row.facebook_url)
  pushDiff(diffs, 'city_id', account.city_id, row.city_id)
  return diffs
}
