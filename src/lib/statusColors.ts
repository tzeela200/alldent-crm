// סטטוסי הגשה (application_status)
export const applicationStatusColors: Record<number, { bg: string; text: string; label: string }> = {
  1: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'חדש' },
  2: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'בבדיקה' },
  3: { bg: 'bg-teal-100', text: 'text-teal-800', label: 'רלוונטי' },
  4: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'נשלח למעסיק' },
  5: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'ראיון תואם' },
  6: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'בתהליך' },
  7: { bg: 'bg-cyan-100', text: 'text-cyan-800', label: 'ממתין לתגובה' },
  8: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'התקבל' },
  9: { bg: 'bg-red-100', text: 'text-red-800', label: 'נדחה' },
  10: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'ביטל' },
  11: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'לא רלוונטי' },
  12: { bg: 'bg-rose-100', text: 'text-rose-800', label: 'לא ענה' },
  13: { bg: 'bg-slate-100', text: 'text-slate-800', label: 'ארכיון' },
  14: { bg: 'bg-lime-100', text: 'text-lime-800', label: 'מועמד במאגר' },
  15: { bg: 'bg-sky-100', text: 'text-sky-800', label: 'הושמה' },
}

// סטטוסי משרה (job_status) — SSOT יחיד לכל המסכים.
// תוויות מיושרות למילון החי dict_job_statuses (7 = "סגורה־אחר", לא "פורסמה").
// פלטה בהירה/עדינה שאושרה (2026-07-12): פעילה=ירוק בהיר, מאוישת+סגורה־הצלחה=סגול בהיר,
// חדש=צהוב, טיוטה=אפור, מושהה+סגורה־אחר+בוטלה+ארכיון=אדום. שינוי צבע כאן = משתנה בכל המערכת.
export const jobStatusColors: Record<number, { bg: string; text: string; label: string }> = {
  1: { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'חדש' },
  2: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'טיוטה' },
  3: { bg: 'bg-green-50', text: 'text-green-700', label: 'פעילה' },
  4: { bg: 'bg-red-50', text: 'text-red-700', label: 'מושהה' },
  5: { bg: 'bg-purple-50', text: 'text-purple-700', label: 'מאוישת' },
  6: { bg: 'bg-purple-50', text: 'text-purple-700', label: 'סגורה־הצלחה' },
  7: { bg: 'bg-red-50', text: 'text-red-700', label: 'סגורה־אחר' },
  8: { bg: 'bg-red-50', text: 'text-red-700', label: 'בוטלה' },
  9: { bg: 'bg-red-50', text: 'text-red-700', label: 'ארכיון' },
}

// מחלקות ל-<select> עריכת סטטוס משרה (border+focus) — נגזרות מאותה פלטה בהירה,
// כדי שה-select הנערך (AdminJobsPage) יהיה זהה בצבע ל-badge. SSOT יחיד.
const jobStatusSelectClasses: Record<number, string> = {
  1: 'border-yellow-200 bg-yellow-50 text-yellow-700 focus:ring-2 focus:ring-yellow-100',
  2: 'border-gray-200 bg-gray-100 text-gray-600 focus:ring-2 focus:ring-gray-100',
  3: 'border-green-200 bg-green-50 text-green-700 focus:ring-2 focus:ring-green-100',
  4: 'border-red-200 bg-red-50 text-red-700 focus:ring-2 focus:ring-red-100',
  5: 'border-purple-200 bg-purple-50 text-purple-700 focus:ring-2 focus:ring-purple-100',
  6: 'border-purple-200 bg-purple-50 text-purple-700 focus:ring-2 focus:ring-purple-100',
  7: 'border-red-200 bg-red-50 text-red-700 focus:ring-2 focus:ring-red-100',
  8: 'border-red-200 bg-red-50 text-red-700 focus:ring-2 focus:ring-red-100',
  9: 'border-red-200 bg-red-50 text-red-700 focus:ring-2 focus:ring-red-100',
}

export function getJobStatusSelectClass(statusId: number | null | undefined): string {
  const id = statusId != null ? Number(statusId) : NaN
  return jobStatusSelectClasses[id] ?? 'border-gray-200 bg-white text-gray-600 focus:ring-2 focus:ring-gray-100'
}

// סטטוסי ארגון (account_status) — צבעים בלבד; ה-Label מגיע מהמילון החי
// (dict_account_statuses) דרך StatusBadge. הצבעים והתוויות מיושרים ל-DB החי
// (11 סטטוסים, אומת 2026-07-06) — לא הערכים הישנים השגויים.
export const accountStatusColors: Record<number, { bg: string; text: string; label: string }> = {
  1:  { bg: 'bg-gray-100', text: 'text-gray-800', label: 'פוטנציאלי – לטיפול' },
  2:  { bg: 'bg-blue-100', text: 'text-blue-800', label: 'נשלח קישור לתהליך גיוס' },
  3:  { bg: 'bg-cyan-100', text: 'text-cyan-800', label: 'בטיפול – לחזור במועד' },
  4:  { bg: 'bg-amber-100', text: 'text-amber-800', label: 'נשלח נדנוד / תזכורת' },
  5:  { bg: 'bg-orange-100', text: 'text-orange-800', label: 'לא ענה / סינון' },
  6:  { bg: 'bg-red-100', text: 'text-red-800', label: 'לא רלוונטי / סירב' },
  7:  { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'מגייס פעיל (לקוח)' },
  8:  { bg: 'bg-slate-100', text: 'text-slate-800', label: 'מגייס סגור (לקוח ישן)' },
  9:  { bg: 'bg-teal-100', text: 'text-teal-800', label: 'ארגון דנטלי' },
  10: { bg: 'bg-green-100', text: 'text-green-800', label: 'ארגון חדש' },
  11: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'מוזג / כפילות' },
}

// סטטוסי בדיקה (check_status)
export const checkStatusColors: Record<number, { bg: string; text: string; label: string }> = {
  1: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'ממתין לבדיקה' },
  2: { bg: 'bg-green-100', text: 'text-green-800', label: 'נבדק - תקין' },
  3: { bg: 'bg-red-100', text: 'text-red-800', label: 'נבדק - בעייתי' },
  4: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'לא רלוונטי' },
}

// סטטוסי פרסום (public_status)
export const publicStatusColors: Record<number, { bg: string; text: string; label: string }> = {
  1: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'לא פורסם' },
  2: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'ממתין לפרסום' },
  3: { bg: 'bg-green-100', text: 'text-green-800', label: 'מפורסם' },
  4: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'הוסר מפרסום' },
}

// סוגי הסטטוס במערכת — כדי שמזהה זהה במילונים שונים לא יקבל צבע/תווית שגויים.
export type StatusType = 'job' | 'application' | 'account' | 'check' | 'public'

// סוג סטטוס → טבלת מילון חי (מקור ה-Label)
export const STATUS_DICT_TABLE: Record<StatusType, string> = {
  job: 'dict_job_statuses',
  application: 'dict_application_statuses',
  account: 'dict_account_statuses',
  check: 'dict_check_statuses',
  public: 'dict_public_statuses',
}

const STATUS_COLOR_MAPS: Record<StatusType, Record<number, { bg: string; text: string; label: string }>> = {
  job: jobStatusColors,
  application: applicationStatusColors,
  account: accountStatusColors,
  check: checkStatusColors,
  public: publicStatusColors,
}

// צבע לפי סוג+id ממקור מרכזי. Label יגיע מהמילון החי (ראו StatusBadge).
export function getStatusColorClasses(
  statusType: StatusType,
  statusId: number | null | undefined
): { bg: string; text: string; fallbackLabel: string } {
  const entry = statusId != null ? STATUS_COLOR_MAPS[statusType]?.[Number(statusId)] : undefined
  if (!entry) return { bg: 'bg-gray-100', text: 'text-gray-500', fallbackLabel: 'לא הוגדר' }
  return { bg: entry.bg, text: entry.text, fallbackLabel: entry.label }
}

// פונקציית עזר כללית
export function getStatusBadge(
  statusMap: Record<number, { bg: string; text: string; label: string }>,
  statusId: number | null | undefined
): { bg: string; text: string; label: string } {
  if (!statusId || !statusMap[statusId]) {
    return { bg: 'bg-gray-100', text: 'text-gray-500', label: 'לא הוגדר' }
  }
  return statusMap[statusId]
}

import type { AdminBadgeVariant } from '@/components/admin/AdminBadge'

export function getAdminBadgeVariant(
  statusMap: Record<number, { bg: string; text: string; label: string }>,
  statusId: number | null | undefined
): { label: string; variant: AdminBadgeVariant } {
  const entry = statusId ? statusMap[statusId] : null
  if (!entry) return { label: 'לא הוגדר', variant: 'neutral' }

  const bg = entry.bg
  let variant: AdminBadgeVariant = 'neutral'
  if (bg.includes('green') || bg.includes('emerald')) variant = 'success'
  else if (bg.includes('teal') || bg.includes('lime')) variant = 'teal'
  else if (bg.includes('yellow') || bg.includes('amber') || bg.includes('orange')) variant = 'warning'
  else if (bg.includes('red') || bg.includes('rose')) variant = 'error'
  else if (bg.includes('blue') || bg.includes('sky') || bg.includes('cyan') || bg.includes('indigo')) variant = 'info'
  else if (bg.includes('purple') || bg.includes('violet')) variant = 'purple'

  return { label: entry.label, variant }
}
