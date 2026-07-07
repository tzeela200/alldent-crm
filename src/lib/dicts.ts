import type { DictItem } from '@/types'

export type DictSubRoleItem = DictItem & { role_id: number }

/** SSOT: dict_roles (Supabase) */
export const DICT_ROLES: DictItem[] = [
  { id: 1, name: 'רופא שיניים' },
  { id: 2, name: 'מומחה אורתו' },
  { id: 3, name: 'מומחה פריו' },
  { id: 4, name: 'מומחה אנדו' },
  { id: 5, name: 'מומחה כירורג' },
  { id: 6, name: 'מומחה פדו' },
  { id: 7, name: 'מומחה רפואת הפה' },
  { id: 8, name: 'מומחה שיקום' },
  { id: 9, name: 'סייעת' },
  { id: 10, name: 'שיננית' },
  { id: 11, name: 'טכנאי/ית שיניים' },
  { id: 12, name: 'מנהל/ת דנטלי' },
  { id: 13, name: 'מזכירה' },
  { id: 14, name: 'עובד/ת דנטלי' },
  { id: 15, name: 'מכירות' },
  { id: 16, name: 'בעלים' },
  { id: 17, name: 'רכש דנטלי' },
  { id: 18, name: 'צילום דנטלי' },
]

/** SSOT: dict_sub_roles (canonical id, name, role_id) */
export const DICT_SUB_ROLES: DictSubRoleItem[] = [
  { id: 1, name: 'טיפולים קליניים במרפאות', role_id: 1 },
  { id: 2, name: 'הוראה אקדמית', role_id: 1 },
  { id: 3, name: 'תפקיד MSL', role_id: 1 },
  { id: 4, name: 'ניהול ברפואה', role_id: 1 },
  { id: 5, name: 'יועץ רפואי בחברות פארמה', role_id: 1 },
  { id: 6, name: 'מנהל ומטה עבודה ציבורית/ממשלתית', role_id: 1 },
  { id: 7, name: 'פיתוח מוצר ויזמות דנטלי', role_id: 1 },
  { id: 8, name: 'סטודנט לרפואת שיניים', role_id: 1 },

  { id: 9, name: 'טיפולים קליניים במרפאות', role_id: 2 },
  { id: 10, name: 'הוראה אקדמית', role_id: 2 },
  { id: 11, name: 'תפקיד MSL', role_id: 2 },
  { id: 12, name: 'ניהול ברפואה', role_id: 2 },
  { id: 13, name: 'יועץ רפואי בחברות פארמה', role_id: 2 },
  { id: 14, name: 'מנהל ומטה עבודה ציבורית/ממשלתית', role_id: 2 },
  { id: 15, name: 'פיתוח מוצר ויזמות דנטלי', role_id: 2 },
  { id: 16, name: 'סטודנט לרפואת שיניים', role_id: 2 },

  { id: 17, name: 'טיפולים קליניים במרפאות', role_id: 3 },
  { id: 18, name: 'הוראה אקדמית', role_id: 3 },
  { id: 19, name: 'תפקיד MSL', role_id: 3 },
  { id: 20, name: 'ניהול ברפואה', role_id: 3 },
  { id: 21, name: 'יועץ רפואי בחברות פארמה', role_id: 3 },
  { id: 22, name: 'מנהל ומטה עבודה ציבורית/ממשלתית', role_id: 3 },
  { id: 23, name: 'פיתוח מוצר ויזמות דנטלי', role_id: 3 },
  { id: 24, name: 'סטודנט לרפואת שיניים', role_id: 3 },

  { id: 25, name: 'טיפולים קליניים במרפאות', role_id: 4 },
  { id: 26, name: 'הוראה אקדמית', role_id: 4 },
  { id: 27, name: 'תפקיד MSL', role_id: 4 },
  { id: 28, name: 'ניהול ברפואה', role_id: 4 },
  { id: 29, name: 'יועץ רפואי בחברות פארמה', role_id: 4 },
  { id: 30, name: 'מנהל ומטה עבודה ציבורית/ממשלתית', role_id: 4 },
  { id: 31, name: 'פיתוח מוצר ויזמות דנטלי', role_id: 4 },
  { id: 32, name: 'סטודנט לרפואת שיניים', role_id: 4 },

  { id: 33, name: 'טיפולים קליניים במרפאות', role_id: 5 },
  { id: 34, name: 'הוראה אקדמית', role_id: 5 },
  { id: 35, name: 'תפקיד MSL', role_id: 5 },
  { id: 36, name: 'ניהול ברפואה', role_id: 5 },
  { id: 37, name: 'יועץ רפואי בחברות פארמה', role_id: 5 },
  { id: 38, name: 'מנהל ומטה עבודה ציבורית/ממשלתית', role_id: 5 },
  { id: 39, name: 'פיתוח מוצר ויזמות דנטלי', role_id: 5 },
  { id: 40, name: 'סטודנט לרפואת שיניים', role_id: 5 },

  { id: 41, name: 'טיפולים קליניים במרפאות', role_id: 6 },
  { id: 42, name: 'הוראה אקדמית', role_id: 6 },
  { id: 43, name: 'תפקיד MSL', role_id: 6 },
  { id: 44, name: 'ניהול ברפואה', role_id: 6 },
  { id: 45, name: 'יועץ רפואי בחברות פארמה', role_id: 6 },
  { id: 46, name: 'מנהל ומטה עבודה ציבורית/ממשלתית', role_id: 6 },
  { id: 47, name: 'פיתוח מוצר ויזמות דנטלי', role_id: 6 },
  { id: 48, name: 'סטודנט לרפואת שיניים', role_id: 6 },

  { id: 49, name: 'טיפולים קליניים במרפאות', role_id: 7 },
  { id: 50, name: 'הוראה אקדמית', role_id: 7 },
  { id: 51, name: 'תפקיד MSL', role_id: 7 },
  { id: 52, name: 'ניהול ברפואה', role_id: 7 },
  { id: 53, name: 'יועץ רפואי בחברות פארמה', role_id: 7 },
  { id: 54, name: 'מנהל ומטה עבודה ציבורית/ממשלתית', role_id: 7 },
  { id: 55, name: 'פיתוח מוצר ויזמות דנטלי', role_id: 7 },
  { id: 56, name: 'סטודנט לרפואת שיניים', role_id: 7 },

  { id: 57, name: 'טיפולים קליניים במרפאות', role_id: 8 },
  { id: 58, name: 'הוראה אקדמית', role_id: 8 },
  { id: 59, name: 'תפקיד MSL', role_id: 8 },
  { id: 60, name: 'ניהול ברפואה', role_id: 8 },
  { id: 61, name: 'יועץ רפואי בחברות פארמה', role_id: 8 },
  { id: 62, name: 'מנהל ומטה עבודה ציבורית/ממשלתית', role_id: 8 },
  { id: 63, name: 'פיתוח מוצר ויזמות דנטלי', role_id: 8 },
  { id: 64, name: 'סטודנט לרפואת שיניים', role_id: 8 },

  { id: 65, name: 'סייעת כירורגית', role_id: 9 },
  { id: 66, name: 'סייעת אורתודונטית', role_id: 9 },
  { id: 67, name: 'סייעת אחראית', role_id: 9 },
  { id: 68, name: 'סייעת בשילוב אדמיניסטרציה', role_id: 9 },
  { id: 69, name: 'סייעת בחדר טיפולים', role_id: 9 },
  { id: 84, name: 'סייע/ת רופא שיניים', role_id: 9 },

  { id: 70, name: 'שיננית בשילוב תפקיד סייעת', role_id: 10 },
  { id: 71, name: 'שיננית קלינית בחדר טיפולים', role_id: 10 },

  { id: 72, name: 'יועצת מכירות וסגירת תוכניות טיפול', role_id: 12 },
  { id: 73, name: 'מנהל/ת מרפאה', role_id: 12 },
  { id: 74, name: 'מנהל/ת רשת', role_id: 12 },

  { id: 75, name: 'מזכירה ראשית/אחראית קבלה', role_id: 13 },
  { id: 76, name: 'מזכירה רפואית/דנטלית', role_id: 13 },
  { id: 77, name: 'מזכירה בערב בלבד', role_id: 13 },

  { id: 78, name: 'מנהל/ת רכש', role_id: 14 },
  { id: 79, name: 'תועמלן/נית דנטלית', role_id: 14 },
  { id: 80, name: 'עובד/ת מעבדה', role_id: 14 },
  { id: 81, name: 'טכנאי/ת שירות/מכירות ציוד דנטלי', role_id: 14 },
  { id: 82, name: 'סטודנט/ית למקצועות הבריאות', role_id: 14 },
  { id: 83, name: 'עובד/ת כללי/ת', role_id: 14 },
]

/** SSOT: dict_availability */
export const DICT_AVAILABILITY: DictItem[] = [
  { id: 1, name: 'זמין מיידית-אקטיבי' },
  { id: 2, name: 'זמין תוך חודש- אקטיבי' },
  { id: 3, name: 'פתוח להצעות-פסיבי' },
  { id: 4, name: 'לא זמין כרגע (זמני)' },
  { id: 5, name: 'מסודר – נא לא לפנות' },
  { id: 6, name: 'הסרה מהמאגר' },
  { id: 7, name: 'מחפש חדש' },
]

/** SSOT: dict_check_statuses */
export const DICT_CHECK_STATUSES: DictItem[] = [
  { id: 1, name: 'ממתין לבדיקה' },
  { id: 2, name: 'ספאם' },
  { id: 3, name: 'מאושר למאגר' },
  { id: 4, name: 'בבדיקה מול המועמד' },
]

/** SSOT: dict_sources */
export const DICT_SOURCES: DictItem[] = [
  { id: 1, name: 'Google Contacts' },
  { id: 2, name: 'טופס קורות חיים' },
  { id: 3, name: 'טופס גיוס' },
  { id: 4, name: 'WhatsApp' },
  { id: 5, name: 'דרך פייסבוק' },
  { id: 6, name: 'טופס אתר' },
  { id: 7, name: 'אחר' },
]

/** SSOT: dict_social_statuses */
export const DICT_SOCIAL_STATUSES: DictItem[] = [
  { id: 1, name: 'ליד חדש - חיפוש עבודה' },
  { id: 2, name: 'ליד חדש - גיוס עובדים' },
  { id: 3, name: 'ליד חדש - הצטרפות למאגר' },
  { id: 4, name: 'נשלחו פרטים - תהליך גיוס' },
  { id: 5, name: 'נשלחו פרטים - חיפוש עבודה' },
  { id: 6, name: 'נשלחו פרטים - הצטרפות למאגר' },
  { id: 7, name: 'קיים במאגר' },
  { id: 8, name: "פנייה במסנג'ר - טרם עניתי" },
  { id: 9, name: 'פולואפ נדרש (Follow-up)' },
  { id: 10, name: 'יש נייד להעביר למאגר' },
  { id: 11, name: 'קיבל מענה כללי' },
  { id: 12, name: 'לא רלוונטי' },
  { id: 13, name: 'הסרה' },
  { id: 14, name: 'חבר בפייסבוק' },
]

/** SSOT: dict_profile_types */
export const DICT_PROFILE_TYPES: DictItem[] = [
  { id: 1, name: 'מועמד' },
  { id: 2, name: 'מעסיק' },
  { id: 3, name: 'מגייס' },
  { id: 4, name: 'אנשי קשר' },
  { id: 5, name: 'עובד ארגון' },
]

/** SSOT: dict_experience */
export const DICT_EXPERIENCE: DictItem[] = [
  { id: 1, name: '0' },
  { id: 2, name: '0–2' },
  { id: 3, name: '2–5' },
  { id: 4, name: '5–7' },
  { id: 5, name: '7+' },
]
