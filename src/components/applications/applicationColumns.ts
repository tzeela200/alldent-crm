// הגדרות עמודות מסך ההגשות — משותפות לדף, לבורר העמודות ולטבלה,
// כדי שלא יהיו שתי רשימות שמתפצלות.
// הסדר כאן הוא סדר התצוגה בבורר העמודות; סדר העמודות בטבלה עצמה
// נקבע ב-ApplicationsTable.

export const ALL_COLUMNS = [
  { key: 'candidate_city', label: 'עיר מועמד' },
  { key: 'candidate_locality_type', label: 'סוג יישוב' },
  { key: 'registry_status', label: 'מצב במאגר' },
  { key: 'work_status', label: 'סטטוס תעסוקה' },
  { key: 'availability', label: 'זמינות' },
  { key: 'job_role', label: 'תפקיד משרה' },
  { key: 'job_region', label: 'אזור משרה' },
  { key: 'job_city', label: 'עיר משרה' },
  { key: 'org_name', label: 'שם ארגון' },
  { key: 'job_status', label: 'סטטוס משרה' },
  { key: 'check_status', label: 'סטטוס בדיקה' },
  { key: 'cv', label: 'קו"ח' },
  { key: 'source', label: 'מקור' },
  { key: 'submission_date', label: 'תאריך הגשה' },
  { key: 'follow_up_date', label: 'תאריך פעולה הבאה' },
  { key: 'candidate_notes', label: 'הערות מועמד' },
  { key: 'notes', label: 'הערות פנימיות' },
] as const

export type ColumnKey = (typeof ALL_COLUMNS)[number]['key']

/**
 * ברירת המחדל. "הערות פנימיות", "מקור" ו"סטטוס בדיקה" הוסרו לבקשת צאלה —
 * הם נשארו זמינים בבורר העמודות, פשוט לא קבועים.
 * עיר מועמד וסוג יישוב נמשכים מכרטיס המועמד ומוצגים רק למי שקיים במאגר.
 */
export const DEFAULT_VISIBLE: ColumnKey[] = [
  'candidate_city',
  'candidate_locality_type',
  'registry_status',
  'job_role',
  'job_region',
  'job_city',
  'org_name',
  'cv',
  'submission_date',
]
