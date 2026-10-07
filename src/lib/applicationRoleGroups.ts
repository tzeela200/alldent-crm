import type { DictItem } from '@/types'

/**
 * קיבוץ תפקידים לתצוגה במסך ההגשות — מקור-אמת יחיד לכרטיסי ה-KPI
 * ולצ׳יפי הסינון, כדי שמספר על כרטיס ותוצאת לחיצה לא יוכלו לסתור.
 *
 * ה-roleIds תואמים ל-KPI_ROLE_BLUEPRINTS ב-AdminContactsPage (אותם 7 קיבוצים,
 * מכסים את כל 18 התפקידים ב-dict_roles).
 *
 * שים לב: `applications.job_role` הוא **טקסט**, לא מזהה — אין עמודת job_role_id
 * בטבלה. אומת מול Supabase שכל ערך לא-null שווה בדיוק ל-`dict_roles.name`,
 * ולכן הסינון הוא `.in()` על שמות שנפתרים מהמילון החי בזמן ריצה.
 */
export const APPLICATION_ROLE_GROUPS = [
  { key: 'doctor', label: 'רופאי שיניים', roleIds: [1] },
  { key: 'experts', label: 'מומחים', roleIds: [2, 3, 4, 5, 6, 7, 8] },
  { key: 'assistant', label: 'סייעות', roleIds: [9] },
  { key: 'hygienist', label: 'שינניות', roleIds: [10] },
  { key: 'technician', label: 'טכנאים', roleIds: [11] },
  { key: 'secretary', label: 'מזכירות', roleIds: [13] },
  { key: 'manager', label: 'ניהול / גיוס', roleIds: [12, 14, 15, 16, 17, 18] },
] as const

export type ApplicationRoleGroupKey = (typeof APPLICATION_ROLE_GROUPS)[number]['key']

/** שמות ה-job_role של קבוצה, לפי המילון החי. ריק = הקבוצה לא ניתנת לסינון. */
export function roleGroupNames(
  group: { roleIds: readonly number[] },
  roles: DictItem[] | undefined,
): string[] {
  if (!roles?.length) return []
  return group.roleIds
    .map((id) => roles.find((r) => Number(r.id) === id)?.name)
    .filter((n): n is string => !!n)
}

/** השוואת קבוצות שמות ללא תלות בסדר — לסימון הצ׳יפ/הכרטיס הפעיל. */
export function sameRoleNames(a: string[] | undefined, b: string[]): boolean {
  if (!a || a.length !== b.length) return false
  const set = new Set(a)
  return b.every((name) => set.has(name))
}
