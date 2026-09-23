/**
 * INC-3146 — השדות של `contact` שמוצגים במיזוג אנשי קשר.
 *
 * כל עמודה בטבלה שמכילה מידע על האדם חייבת להופיע כאן, אחרת ערך הכפולה
 * לא יוצג לבחירה (המסד עדיין משלים שדה ריק מהכפולה, אבל לא יראו אותו).
 *
 * לא מופיעים בכוונה — המסד מטפל בהם לבד:
 *   contact_id, phone_norm (נגזר מהנייד), profile_token (הקישור האישי של
 *   הרשומה שנשארת), created_timestamp (המוקדם), last_contact_date /
 *   whatsapp_campaign_last_sent (המאוחר), updated_timestamp, dup_email_flag,
 *   prev_applications_count.
 */
import { formatPhone, normalizeIlMobile, IL_MOBILE_ERROR } from '@/lib/normalizePhone'
import type { ContactPointSlot, LosslessMergeField } from '@/lib/lossless-merge'

type Fmt = (value: unknown) => string

export interface ContactMergeFormatters {
  role: Fmt
  subRoles: Fmt
  experience: Fmt
  gender: Fmt
  languages: Fmt
  scopes: Fmt
  systems: Fmt
  procedures: Fmt
  salaryTypes: Fmt
  availability: Fmt
  taxType: Fmt
  mobility: Fmt
  workStatus: Fmt
  region: Fmt
  regions: Fmt
  city: Fmt
  cities: Fmt
  source: Fmt
  checkStatus: Fmt
  socialStatus: Fmt
  profileType: Fmt
  account: Fmt
}

const date: Fmt = (v) => {
  const d = new Date(String(v))
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('he-IL')
}
const yesNo: Fmt = (v) => (v ? 'כן' : 'לא')
const money: Fmt = (v) => `₪${Number(v).toLocaleString('he-IL')}`
const employers: Fmt = (v) => {
  if (!Array.isArray(v)) return JSON.stringify(v)
  return v
    .map((e) => (e && typeof e === 'object'
      ? Object.values(e as Record<string, unknown>).filter((x) => typeof x === 'string' && x.trim()).join(' · ')
      : String(e)))
    .filter(Boolean)
    .join('\n')
}

export function buildContactMergeFields(f: ContactMergeFormatters): LosslessMergeField[] {
  const G = {
    identity: 'זהות',
    social: 'פייסבוק ורשתות',
    pro: 'מקצועי',
    prefs: 'העדפות והעסקה',
    location: 'מיקום',
    cv: 'קורות חיים וקישורים',
    status: 'ארגון, מקור וסטטוס',
    notes: 'הערות',
  }
  return [
    { key: 'full_name', label: 'שם מלא', group: G.identity },
    { key: 'first_name', label: 'שם פרטי', group: G.identity },
    { key: 'last_name', label: 'שם משפחה', group: G.identity },
    { key: 'display_name', label: 'שם תצוגה', group: G.identity },
    { key: 'gender', label: 'מגדר', group: G.identity, format: f.gender },
    { key: 'birth_year', label: 'שנת לידה', group: G.identity },
    { key: 'photo_url', label: 'תמונה', group: G.identity },

    { key: 'facebook_name', label: 'שם בפייסבוק', group: G.social },
    { key: 'facebook_id', label: 'מזהה פייסבוק', group: G.social },
    { key: 'facebook_url', label: 'קישור פייסבוק', group: G.social },
    { key: 'linkedin_url', label: 'לינקדאין', group: G.social },

    { key: 'role', label: 'תפקיד', group: G.pro, format: f.role },
    { key: 'sub_role', label: 'תת-תפקיד', group: G.pro, kind: 'array', format: f.subRoles },
    { key: 'professional_title', label: 'כותרת מקצועית', group: G.pro },
    { key: 'experience', label: 'ניסיון', group: G.pro, format: f.experience },
    { key: 'license_no', label: 'מספר רישיון', group: G.pro },
    { key: 'current_employer', label: 'מעסיק נוכחי', group: G.pro },
    { key: 'previous_employers', label: 'ניסיון תעסוקתי', group: G.pro, format: employers },
    { key: 'systems_used', label: 'מערכות', group: G.pro, kind: 'array', format: f.systems },
    { key: 'procedures_experience', label: 'פרוצדורות', group: G.pro, kind: 'array', format: f.procedures },
    { key: 'languages', label: 'שפות', group: G.pro, kind: 'array', format: f.languages },
    { key: 'academic_education', label: 'השכלה', group: G.pro },
    { key: 'professional_courses', label: 'קורסים', group: G.pro },
    { key: 'additional_skills_notes', label: 'כישורים נוספים', group: G.pro },
    { key: 'personal_summary', label: 'פרופיל מקצועי', group: G.pro },
    { key: 'ai_profile_summary', label: 'סיכום AI', group: G.pro },

    { key: 'work_status', label: 'סטטוס תעסוקתי', group: G.prefs, format: f.workStatus },
    { key: 'candidate_availability_ids', label: 'זמינות', group: G.prefs, kind: 'array', format: f.availability },
    { key: 'preferred_scope', label: 'היקף משרה', group: G.prefs, kind: 'array', format: f.scopes },
    { key: 'work_schedule_text', label: 'הערות משמרות', group: G.prefs },
    { key: 'preferred_regions', label: 'אזורים מועדפים', group: G.prefs, kind: 'array', format: f.regions },
    { key: 'preferred_cities', label: 'ערים מועדפות', group: G.prefs, kind: 'array', format: f.cities },
    { key: 'preferred_all_country', label: 'כל הארץ', group: G.prefs, format: yesNo },
    { key: 'candidate_salary_type_ids', label: 'סוג שכר', group: G.prefs, kind: 'array', format: f.salaryTypes },
    { key: 'salary_expectation_hourly', label: 'שכר שעתי', group: G.prefs, format: money },
    { key: 'salary_expectation_monthly', label: 'שכר חודשי', group: G.prefs, format: money },
    { key: 'tax_type_id', label: 'סוג מס', group: G.prefs, format: f.taxType },
    { key: 'mobility_id', label: 'ניידות', group: G.prefs, format: f.mobility },

    { key: 'city_id', label: 'עיר', group: G.location, format: f.city },
    { key: 'region_id', label: 'אזור', group: G.location, format: f.region, derivedFrom: 'city_id' },
    { key: 'locality_type', label: 'סוג יישוב', group: G.location, derivedFrom: 'city_id' },

    { key: 'cv_storage_path', label: 'קובץ קו״ח', group: G.cv },
    { key: 'cv_link', label: 'קישור קו״ח', group: G.cv },
    { key: 'has_cv', label: 'יש קו״ח', group: G.cv, format: yesNo },
    { key: 'cv_received_date', label: 'תאריך קבלת קו״ח', group: G.cv, format: date },
    { key: 'portfolio_url', label: 'תיק עבודות', group: G.cv },
    { key: 'recommendations_url', label: 'המלצות', group: G.cv },

    { key: 'account_link', label: 'ארגון מקושר', group: G.status, format: f.account },
    { key: 'linked_org_name', label: 'שם ארגון (טקסט)', group: G.status },
    { key: 'profile_type', label: 'סוג פרופיל', group: G.status, format: f.profileType },
    { key: 'source', label: 'מקור', group: G.status, format: f.source },
    { key: 'check_status', label: 'סטטוס בדיקה', group: G.status, format: f.checkStatus },
    { key: 'social_status', label: 'סטטוס פנייה', group: G.status, format: f.socialStatus },
    { key: 'candidate_status_date', label: 'תאריך סטטוס', group: G.status, format: date },
    { key: 'next_follow_up', label: 'פולואפ הבא', group: G.status, format: date },
    { key: 'whatsapp_last_delivery_status', label: 'סטטוס שליחה אחרון', group: G.status },
    { key: 'extended_data', label: 'נתונים נוספים', group: G.status },

    { key: 'notes', label: 'הערות', group: G.notes, kind: 'text' },
    { key: 'candidate_notes', label: 'הערות מועמד', group: G.notes, kind: 'text' },
  ]
}

export const CONTACT_MERGE_SLOTS: ContactPointSlot[] = [
  {
    id: 'phone',
    label: 'נייד',
    primaryKey: 'phone',
    secondaryKey: 'second_phone',
    identity: (raw) => normalizeIlMobile(raw) ?? raw.replace(/\D/g, ''),
    // הטריגר set_contact_phone_norm דוחה נייד ראשי שאינו נייד ישראלי תקין
    primaryError: (raw) => (normalizeIlMobile(raw) ? null : `${formatPhone(raw) || raw} — ${IL_MOBILE_ERROR} אפשר לשמור אותו כנייד נוסף.`),
    format: (raw) => formatPhone(raw) || raw,
  },
  {
    id: 'email',
    label: 'מייל',
    primaryKey: 'email',
    secondaryKey: 'second_email',
    identity: (raw) => raw.trim().toLowerCase(),
  },
]

/** תרגום שגיאות המסד בזמן מיזוג לעברית. */
export function contactMergeErrorMessage(error: { message?: string; code?: string } | null | undefined): string {
  const msg = error?.message ?? ''
  if (error?.code === '23505' && msg.includes('phone_norm')) {
    return 'הנייד הראשי שנבחר כבר שייך לאיש קשר אחר שלא נכלל במיזוג. בחרי נייד ראשי אחר או הוסיפי גם את הרשומה ההיא למיזוג.'
  }
  if (msg.includes('sub_role values must belong')) {
    return 'תתי-התפקידים שנבחרו לא שייכים לתפקיד שנבחר. בחרי תת-תפקיד מרשומה אחת במקום איחוד, או תפקיד מתאים.'
  }
  if (msg.includes('Invalid Israeli mobile phone')) {
    return 'הנייד הראשי שנבחר אינו נייד ישראלי תקין. אפשר לשמור אותו כנייד נוסף.'
  }
  if (msg.includes('must have a phone, email')) {
    return 'לרשומה שנשארת חייב להיות נייד, מייל או פרטי פייסבוק.'
  }
  return msg ? `שגיאה במיזוג הרשומות: ${msg}` : 'שגיאה במיזוג הרשומות'
}
