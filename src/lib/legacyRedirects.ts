// מקור-אמת יחיד להפניות כתובות האתר הישן (שכבת React / SPA fallback).
// מפתח = הנתיב הישן המפוענח ללא "/" מוביל. ערך = יעד פנימי חדש.
//
// חשוב: ב-production, Vercel מבצע 301 בקצה לחלק מהכתובות (ראו vercel.json)
// לפני שה-SPA נטען. המפה הזו מטפלת בכל השאר (כתובות עבריות, כתובות שלא
// רשומות ב-vercel) וב-dev המקומי היא מטפלת בהכול. עדכון vercel.json הוא
// שלב נפרד בהמתנה לאישור (ראו טבלת "שבורים" בתוכנית).
//
// כלל קוד-משרה (/{CODE} → /jobs/{UPPER}) מטופל ישירות ב-LegacyCatchAll,
// לא במפה הזו.

// הפניות עם יעד קבוע קיים
export const LEGACY_REDIRECTS: Record<string, string> = {
  // ── אזורים: שורש → עמוד האזור ──
  north: '/jobs/north',
  south: '/jobs/south',
  centeral: '/jobs/centeral',
  Jerusalem: '/jobs/Jerusalem',
  Sharon: '/jobs/Sharon',
  'סייעות-ומזכירות-אזור-שפלה-ומישור-החוף': '/jobs/סייעות-ומזכירות-אזור-שפלה-ומישור-החוף',

  // ── עמודי תפקיד ולוח ──
  dentjob: '/jobs',
  עבודות: '/jobs',
  'הצעות-עבודה--משרות': '/jobs',
  'job.dentists': '/jobs/dentists',
  'hygiene-job': '/jobs/hygienists',
  'dental-assistant-job': '/jobs/assistants',
  'Dental-secretary': '/jobs/secretaries',
  'Dental-techniques': '/jobs/technicians',
  'clinic-manager-job': '/jobs/management-sales',

  // ── מעסיקים / גיוס ──
  'Dental-job-Employers': '/employers',
  'גיוס-עובדים': '/employers',
  'מסלולי-גיוס': '/employers',
  'Employer-Branding': '/employers/branding',
  'מסלול-גיוס-דיסקרטי': '/employers/discreet',
  'גיוס-עובדים--שאלת-גיוס': '/employers/recruitment-request',
  'דף-ישיר-לפתיחת-משרות-גיוס-במערכת': '/employers/recruitment-request',

  // ── נכסים דנטליים ──
  'home-dent': '/dental-assets',
  'home-dent-point': '/dental-assets',
  'clinicsale-1': '/dental-assets',
  'clinicsale-2': '/dental-assets',
  'clinicsale-3': '/dental-assets',
  'clinicsale-4': '/dental-assets',
  'clinicsale-5': '/dental-assets',
  'clinicsale-6': '/dental-assets',

  // ── חנות דנטלית / מוצרים ──
  'e-commerce-dent': '/dental-shop',
  'copy-of-חנות-דנטלית': '/dental-shop',
  Disposable: '/dental-shop',
  'arc-ortho': '/dental-shop',
  'scanner.itero': '/dental-shop',
  'חלוק-ניילון-רפואי': '/dental-shop',
  'חלוק-סקוטש-לבן-אל-בד': '/dental-shop',
  'חלוק-רפואי-אל-בד': '/dental-shop',
  'כיסוי-ראש-מכווץ': '/dental-shop',
  'כיסוי-ראש-מנתח': '/dental-shop',
  'כיסוי-ראש-פיתה': '/dental-shop',
  ערדליים: '/dental-shop',
  'ערדליים-ניילוןff90a824': '/dental-shop',

  // ── כיתה דנטלית ──
  'כיתה-דנטלית--ערוץ-פתוח': '/class-dental',

  // ── יצירת קשר ──
  'צור-קשר': '/contact',
  'מספר-וואטאפ-חדש': '/contact',

  // ── בית ──
  home: '/',
  'home-old': '/',
  בית: '/',
}

// כתובות ללא יעד מאומת → עמוד "תוכן בהקמה" זמני (לא 404).
// רשומות במפורש כדי שנדע מה עדיין דורש עמוד אמיתי/החלטה.
export const LEGACY_CONSTRUCTION: string[] = [
  // דפי לקוח/מיתוג לא פעילים (דפי נחיתה ישנים שנבנו ללקוחות)
  'assistant-lam',
  'cobi',
  'dr-asaf',
  'dr-efi',
  'hanit-clinic',
  'lam',
  'omer',
  'Sharon-clinic',
  // ישנים/טכניים לא ברורים
  '5f07963faeb542ed8c04658727549778',
  'get-vibit',
  'דף-נחיתה--בסיס',
  // תוכן שעדיין אין לו עמוד חדש
  'dent-terms', // משפטי — לא להפנות ל-Contact
  'חדשות',
  'hr-dent',
  'פיתוח-קריירה-ומשאבי-אנוש',
  'בעלי-מקצוע--שירותיים',
  'שירותיים-עסקיים--שיווק-ומכירות',
  'שירותיים-עסקיים-1',
  'dent-marketing',
  'קוד-קופון',
]

export function resolveLegacyPath(decoded: string): string | 'construction' | undefined {
  if (Object.prototype.hasOwnProperty.call(LEGACY_REDIRECTS, decoded)) {
    return LEGACY_REDIRECTS[decoded]
  }
  if (LEGACY_CONSTRUCTION.includes(decoded)) return 'construction'
  return undefined
}
