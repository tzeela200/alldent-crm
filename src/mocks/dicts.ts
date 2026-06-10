// =====================================================
// AllDent CRM — Dictionary Mock Data
// Based on actual Supabase seed values
// =====================================================

import type { DictItem } from '@/types'

export const mockRoles: DictItem[] = [
  { id: 1, name: 'רופא/ת שיניים' },
  { id: 2, name: 'שיננית' },
  { id: 3, name: 'סייעת' },
  { id: 4, name: 'מנהל/ת קליניקה' },
  { id: 5, name: 'מזכירה רפואית' },
  { id: 6, name: 'טכנאי שיניים' },
  { id: 7, name: 'אורתודנט' },
  { id: 8, name: 'פריודונט' },
  { id: 9, name: 'אנדודונט' },
  { id: 10, name: 'כירורג פה ולסת' },
  { id: 11, name: 'רופא שיניים לילדים' },
  { id: 12, name: 'פרותזיסט' },
  { id: 13, name: 'רדיולוג' },
  { id: 14, name: 'מומחה שיקום הפה' },
  { id: 15, name: 'מרדים' },
  { id: 16, name: 'מנהל/ת מעבדה' },
  { id: 17, name: 'רכז/ת גיוס' },
  { id: 18, name: 'אחר' },
]

export const mockSubRoles: DictItem[] = [
  { id: 1, name: 'שתלים' },
  { id: 2, name: 'אסתטיקה' },
  { id: 3, name: 'כתרים וגשרים' },
  { id: 4, name: 'טיפולי שורש' },
  { id: 5, name: 'ניתוחי חניכיים' },
  { id: 6, name: 'יישור שיניים' },
  { id: 7, name: 'הלבנה' },
  { id: 8, name: 'שיקום פה מלא' },
  { id: 9, name: 'רפואת שיניים לילדים' },
  { id: 10, name: 'חירום דנטלי' },
  { id: 11, name: 'צילומי רנטגן' },
  { id: 12, name: 'ניהול צוות' },
  { id: 13, name: 'קבלת מטופלים' },
  { id: 14, name: 'עיקורים' },
]

export const mockRegions: DictItem[] = [
  { id: 1, name: 'צפון' },
  { id: 2, name: 'חיפה והקריות' },
  { id: 3, name: 'שרון' },
  { id: 4, name: 'מרכז' },
  { id: 5, name: 'תל אביב' },
  { id: 6, name: 'ירושלים' },
  { id: 7, name: 'שפלה' },
  { id: 8, name: 'דרום' },
  { id: 9, name: 'נגב' },
  { id: 10, name: 'יהודה ושומרון' },
  { id: 11, name: 'עמק יזרעאל' },
  { id: 12, name: 'גליל' },
  { id: 13, name: 'עמקים' },
  { id: 14, name: 'גולן' },
  { id: 15, name: 'תל אביב-יפו' },
  { id: 16, name: 'השפלה הדרומית' },
]

export const mockCities: DictItem[] = [
  { id: 1, name: 'תל אביב' },
  { id: 2, name: 'ירושלים' },
  { id: 3, name: 'חיפה' },
  { id: 4, name: 'ראשון לציון' },
  { id: 5, name: 'פתח תקווה' },
  { id: 6, name: 'אשדוד' },
  { id: 7, name: 'נתניה' },
  { id: 8, name: 'באר שבע' },
  { id: 9, name: 'הרצליה' },
  { id: 10, name: 'רעננה' },
  { id: 11, name: 'כפר סבא' },
  { id: 12, name: 'רמת גן' },
  { id: 13, name: 'בני ברק' },
  { id: 14, name: 'חולון' },
  { id: 15, name: 'בת ים' },
  { id: 16, name: 'מודיעין' },
  { id: 17, name: 'אשקלון' },
  { id: 18, name: 'עפולה' },
  { id: 19, name: 'נהריה' },
  { id: 20, name: 'רחובות' },
]

export const mockAvailability: DictItem[] = [
  { id: 1, name: 'זמין מיידית - אקטיבי' },
  { id: 2, name: 'זמין תוך שבועיים - אקטיבי' },
  { id: 3, name: 'זמין תוך חודש - אקטיבי' },
  { id: 4, name: 'פתוח להצעות - פסיבי' },
  { id: 5, name: 'לא מחפש כרגע' },
  { id: 6, name: 'מועסק - לא זמין' },
  { id: 7, name: 'לא רלוונטי' },
]

export const mockExperience: DictItem[] = [
  { id: 1, name: 'ללא ניסיון' },
  { id: 2, name: '0-1 שנים' },
  { id: 3, name: '1-3 שנים' },
  { id: 4, name: '3-5 שנים' },
  { id: 5, name: '5+ שנים' },
]

export const mockApplicationStatuses: DictItem[] = [
  { id: 1, name: 'חדש' },
  { id: 2, name: 'בבדיקה' },
  { id: 3, name: 'רלוונטי' },
  { id: 4, name: 'נשלח למעסיק' },
  { id: 5, name: 'ראיון תואם' },
  { id: 6, name: 'בתהליך' },
  { id: 7, name: 'ממתין לתגובה' },
  { id: 8, name: 'התקבל' },
  { id: 9, name: 'נדחה' },
  { id: 10, name: 'ביטל' },
  { id: 11, name: 'לא רלוונטי' },
  { id: 12, name: 'לא ענה' },
  { id: 13, name: 'ארכיון' },
  { id: 14, name: 'מועמד במאגר' },
  { id: 15, name: 'הושמה' },
]

export const mockJobStatuses: DictItem[] = [
  { id: 1, name: 'טיוטה' },
  { id: 2, name: 'ממתינה לאישור' },
  { id: 3, name: 'פעילה' },
  { id: 4, name: 'הקפאה' },
  { id: 5, name: 'סגורה' },
  { id: 6, name: 'אוישה' },
  { id: 7, name: 'פורסמה' },
  { id: 8, name: 'בוטלה' },
  { id: 9, name: 'ארכיון' },
]

export const mockAccountStatuses: DictItem[] = [
  { id: 1, name: 'פוטנציאלי' },
  { id: 2, name: 'מגייס פעיל' },
  { id: 3, name: 'הקפאה' },
  { id: 4, name: 'עזב' },
  { id: 5, name: 'לטיפול' },
  { id: 6, name: 'לא רלוונטי' },
  { id: 7, name: 'פעיל' },
  { id: 8, name: 'פעיל - VIP' },
]

export const mockAccountTypes: DictItem[] = [
  { id: 1, name: 'מרפאה פרטית' },
  { id: 2, name: 'רשת מרפאות' },
  { id: 3, name: 'קופת חולים' },
  { id: 4, name: 'מרפאת שיניים' },
  { id: 5, name: 'מעבדת שיניים' },
  { id: 6, name: 'בית חולים' },
  { id: 7, name: 'מכון' },
  { id: 8, name: 'עצמאי' },
  { id: 9, name: 'ספק' },
  { id: 10, name: 'אחר' },
]

export const mockCheckStatuses: DictItem[] = [
  { id: 1, name: 'ממתין לבדיקה' },
  { id: 2, name: 'נבדק - תקין' },
  { id: 3, name: 'נבדק - בעייתי' },
  { id: 4, name: 'לא רלוונטי' },
]

export const mockSocialStatuses: DictItem[] = [
  { id: 1, name: 'נשוי/אה' },
  { id: 2, name: 'רווק/ה' },
  { id: 3, name: 'גרוש/ה' },
  { id: 4, name: 'אלמן/ה' },
  { id: 5, name: 'ידוע/ה בציבור' },
  { id: 6, name: 'לא צוין' },
]

export const mockSources: DictItem[] = [
  { id: 1, name: 'פייסבוק' },
  { id: 2, name: 'אתר' },
  { id: 3, name: 'וואטסאפ' },
  { id: 4, name: 'הפניה' },
  { id: 5, name: 'לינקדאין' },
  { id: 6, name: 'טלפון' },
  { id: 7, name: 'הגשה ישירה' },
  { id: 8, name: 'ייבוא CSV' },
  { id: 9, name: 'אחר' },
]

export const mockProfileTypes: DictItem[] = [
  { id: 1, name: 'מועמד' },
  { id: 2, name: 'מגייס' },
  { id: 3, name: 'איש גיוס' },
  { id: 4, name: 'אנשי קשר' },
  { id: 5, name: 'עובד ארגון' },
]

export const mockScopes: DictItem[] = [
  { id: 1, name: 'משרה מלאה' },
  { id: 2, name: 'משרה חלקית' },
  { id: 3, name: 'ימים בודדים' },
  { id: 4, name: 'משמרות' },
  { id: 5, name: 'פרילנס' },
]

export const mockGenders: DictItem[] = [
  { id: 1, name: 'נקבה' },
  { id: 2, name: 'זכר' },
]

// Dict map by table name
export const dictMap: Record<string, DictItem[]> = {
  dict_roles: mockRoles,
  dict_sub_roles: mockSubRoles,
  dict_regions: mockRegions,
  dict_cities: mockCities,
  dict_availability: mockAvailability,
  dict_experience: mockExperience,
  dict_application_statuses: mockApplicationStatuses,
  dict_job_statuses: mockJobStatuses,
  dict_account_statuses: mockAccountStatuses,
  dict_account_types: mockAccountTypes,
  dict_check_statuses: mockCheckStatuses,
  dict_social_statuses: mockSocialStatuses,
  dict_sources: mockSources,
  dict_profile_types: mockProfileTypes,
  dict_scopes: mockScopes,
}
