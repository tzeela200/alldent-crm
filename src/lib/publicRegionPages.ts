// מקור-אמת יחיד לעמודי האזור הציבוריים (סייעות + מזכירות לפי אזור).
// מאחד את 16 האזורים ב-dict_regions לשש קבוצות-על ציבוריות.
// כל מסך אזור ציבורי מייבא מכאן — לא לשכפל מיפוי/צבע.
//
// עקרונות שנקבעו:
// - שומרים את ה-slug ההיסטורי כמות שהוא: 'centeral' (שגיאת כתיב מקורית),
//   'Jerusalem'/'Sharon' (אות גדולה), וה-slug העברי לשפלה. לא לנרמל.
// - עמוד אזור מסנן תמיד לפי role IDs 9 (סייעת) + 13 (מזכירה).
// - region_id 16 (ארצי) אינו נכנס לאף עמוד אזור.
// - קבוצת מרכז (1,6,15) מקבלת תמיד #2563EB בעמוד הציבורי, גם אם id 15
//   מקבל צבע אחר בתצוגות אדמין (regionColors.ts). לא לגעת ב-regionColors הכללי.

export const AREA_ROLE_IDS = [9, 13] as const

export type RegionPageSlug =
  | 'north'
  | 'south'
  | 'centeral'
  | 'Sharon'
  | 'Jerusalem'
  | 'סייעות-ומזכירות-אזור-שפלה-ומישור-החוף'

export interface RegionPage {
  slug: RegionPageSlug
  /** שם ציבורי קצר של האזור (לניווט ולתגיות) */
  name: string
  /** כותרת ה-Hero המלאה */
  title: string
  /** תת-כותרת ה-Hero */
  subtitle: string
  /** קבוצת region_id מתוך dict_regions */
  regionIds: number[]
  /** צבע האזור (מהחלטת הלוח הציבורי) */
  color: string
  badge: string
}

export const REGION_PAGES: Record<RegionPageSlug, RegionPage> = {
  north: {
    slug: 'north',
    name: 'צפון',
    title: 'משרות סייעות ומזכירות באזור הצפון',
    subtitle: 'כל משרות הסייעות והמזכירות באזור הצפון, מעודכנות בזמן אמת. דיסקרטיות מלאה — שם המרפאה חסוי.',
    regionIds: [7, 8, 9, 10, 11, 12, 13],
    color: '#059669',
    badge: 'לוח משרות דנטלי',
  },
  south: {
    slug: 'south',
    name: 'דרום',
    title: 'משרות סייעות ומזכירות באזור הדרום',
    subtitle: 'כל משרות הסייעות והמזכירות באזור הדרום, מעודכנות בזמן אמת. דיסקרטיות מלאה — שם המרפאה חסוי.',
    regionIds: [2, 3],
    color: '#EA580C',
    badge: 'לוח משרות דנטלי',
  },
  centeral: {
    slug: 'centeral',
    name: 'מרכז',
    title: 'משרות סייעות ומזכירות באזור המרכז',
    subtitle: 'כל משרות הסייעות והמזכירות באזור המרכז, מעודכנות בזמן אמת. דיסקרטיות מלאה — שם המרפאה חסוי.',
    regionIds: [1, 6, 15],
    color: '#2563EB',
    badge: 'לוח משרות דנטלי',
  },
  Sharon: {
    slug: 'Sharon',
    name: 'השרון',
    title: 'משרות סייעות ומזכירות באזור השרון',
    subtitle: 'כל משרות הסייעות והמזכירות באזור השרון, מעודכנות בזמן אמת. דיסקרטיות מלאה — שם המרפאה חסוי.',
    regionIds: [4],
    color: '#0891B2',
    badge: 'לוח משרות דנטלי',
  },
  Jerusalem: {
    slug: 'Jerusalem',
    name: 'ירושלים',
    title: 'משרות סייעות ומזכירות בירושלים והסביבה',
    subtitle: 'כל משרות הסייעות והמזכירות בירושלים והסביבה, מעודכנות בזמן אמת. דיסקרטיות מלאה — שם המרפאה חסוי.',
    regionIds: [5],
    color: '#9333EA',
    badge: 'לוח משרות דנטלי',
  },
  'סייעות-ומזכירות-אזור-שפלה-ומישור-החוף': {
    slug: 'סייעות-ומזכירות-אזור-שפלה-ומישור-החוף',
    name: 'שפלה',
    title: 'משרות סייעות ומזכירות באזור השפלה ומישור החוף',
    subtitle: 'כל משרות הסייעות והמזכירות באזור השפלה ומישור החוף, מעודכנות בזמן אמת. דיסקרטיות מלאה — שם המרפאה חסוי.',
    regionIds: [14],
    color: '#F59E0B',
    badge: 'לוח משרות דנטלי',
  },
}

// סדר תצוגה לניווט האזורים (מצפון לדרום, שפלה בסוף)
export const ALL_REGION_SLUGS: RegionPageSlug[] = [
  'north',
  'Sharon',
  'centeral',
  'Jerusalem',
  'south',
  'סייעות-ומזכירות-אזור-שפלה-ומישור-החוף',
]

export function getRegionPage(slug: string): RegionPage | undefined {
  return REGION_PAGES[slug as RegionPageSlug]
}

export function isRegionSlug(slug: string): boolean {
  return Object.prototype.hasOwnProperty.call(REGION_PAGES, slug)
}
