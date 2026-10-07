// הגדרות עמודות מסך ההגשות — משותפות לדף, לבורר העמודות ולטבלה,
// כדי שלא יהיו שתי רשימות שמתפצלות.

export const ALL_COLUMNS = [
  { key: 'registry_status', label: 'מצב במאגר' },
  { key: 'work_status', label: 'סטטוס תעסוקה' },
  { key: 'availability', label: 'זמינות' },
  { key: 'job_role', label: 'תפקיד משרה' },
  { key: 'candidate_city', label: 'עיר מועמד' },
  { key: 'job_city', label: 'עיר משרה' },
  { key: 'job_region', label: 'אזור משרה' },
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
 * ברירת המחדל (INC-3116): "מקור" ו"הערות פנימיות" הוסרו — מקור זהה כמעט בכל
 * השורות, והערות פנימיות מלאות ב-15% בלבד. במקומן נכנסו שתי הערים, לפי בקשת
 * צאלה. "הערות מועמד" (מלא ב-41%) זמין בבורר העמודות.
 */
export const DEFAULT_VISIBLE: ColumnKey[] = [
  'registry_status',
  'job_role',
  'candidate_city',
  'job_city',
  'job_region',
  'org_name',
  'check_status',
  'cv',
  'submission_date',
]
