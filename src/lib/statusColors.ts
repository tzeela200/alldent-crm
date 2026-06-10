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

// סטטוסי משרה (job_status)
export const jobStatusColors: Record<number, { bg: string; text: string; label: string }> = {
  1: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'טיוטה' },
  2: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'ממתינה לאישור' },
  3: { bg: 'bg-green-100', text: 'text-green-800', label: 'פעילה' },
  4: { bg: 'bg-cyan-100', text: 'text-cyan-800', label: 'הקפאה' },
  5: { bg: 'bg-red-100', text: 'text-red-800', label: 'סגורה' },
  6: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'אוישה' },
  7: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'פורסמה' },
  8: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'בוטלה' },
  9: { bg: 'bg-slate-100', text: 'text-slate-800', label: 'ארכיון' },
}

// סטטוסי ארגון (account_status)
export const accountStatusColors: Record<number, { bg: string; text: string; label: string }> = {
  1: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'פוטנציאלי' },
  2: { bg: 'bg-green-100', text: 'text-green-800', label: 'מגייס פעיל' },
  3: { bg: 'bg-cyan-100', text: 'text-cyan-800', label: 'הקפאה' },
  4: { bg: 'bg-red-100', text: 'text-red-800', label: 'עזב' },
  5: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'לטיפול' },
  6: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'לא רלוונטי' },
  7: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'פעיל' },
  8: { bg: 'bg-teal-100', text: 'text-teal-800', label: 'פעיל - VIP' },
}

// סטטוסי בדיקה (check_status)
export const checkStatusColors: Record<number, { bg: string; text: string; label: string }> = {
  1: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'ממתין לבדיקה' },
  2: { bg: 'bg-green-100', text: 'text-green-800', label: 'נבדק - תקין' },
  3: { bg: 'bg-red-100', text: 'text-red-800', label: 'נבדק - בעייתי' },
  4: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'לא רלוונטי' },
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
