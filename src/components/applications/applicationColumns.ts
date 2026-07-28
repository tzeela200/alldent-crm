// הגדרות עמודות מסך ההגשות — משותפות לדף, לבורר העמודות ולטבלה,
// כדי שלא יהיו שתי רשימות שמתפצלות.

export const ALL_COLUMNS = [
  { key: 'registry_status', label: 'מצב במאגר' },
  { key: 'work_status', label: 'סטטוס תעסוקה' },
  { key: 'availability', label: 'זמינות' },
  { key: 'job_role', label: 'תפקיד משרה' },
  { key: 'job_city', label: 'עיר משרה' },
  { key: 'job_region', label: 'אזור משרה' },
  { key: 'org_name', label: 'שם ארגון' },
  { key: 'job_status', label: 'סטטוס משרה' },
  { key: 'check_status', label: 'סטטוס בדיקה' },
  { key: 'cv', label: 'קו"ח' },
  { key: 'source', label: 'מקור' },
  { key: 'submission_date', label: 'תאריך הגשה' },
  { key: 'follow_up_date', label: 'תאריך פעולה הבאה' },
  { key: 'notes', label: 'הערות' },
] as const

export type ColumnKey = (typeof ALL_COLUMNS)[number]['key']

export const DEFAULT_VISIBLE: ColumnKey[] = [
  'registry_status',
  'job_role',
  'job_region',
  'org_name',
  'check_status',
  'cv',
  'source',
  'submission_date',
  'notes',
]
