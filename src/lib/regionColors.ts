// מקור-אמת קבוע וכלל-מערכתי לצבעי אזור.
// כל מסך שמציג אזור צריך לייבא מכאן (במקביל ל-getRoleColor ב-@/components/admin/RoleBadge)
// כדי שלא ייווצרו מפות צבע משוכפלות ולא-מסונכרנות.
//
// עיצוב: צ׳יפ אזור = גוון עמוק מלא עם טקסט לבן (bg-*-600), במכוון שונה
// מצ׳יפי התפקיד הפסטליים הבהירים (bg-*-100 text-*-800) כדי למנוע בלבול.
// הצבעים מקובצים לפי אשכול גיאוגרפי, כך שקל לזהות "איפה בארץ" במבט.

export interface RegionColor {
  /** מחלקות Tailwind לרקע+טקסט של הצ׳יפ */
  chip: string
  /** מחלקת Tailwind לרקע מלא בלבד (לברים/פסים) */
  bar: string
  /** צבע hex גולמי (לשימוש ב-style inline / ברים יחסיים) */
  hex: string
  /** שם אשכול-העל */
  cluster: string
}

// id של האזור ← אשכול/צבע. מבוסס על dict_regions (16 אזורים).
const REGION_COLOR_MAP: Record<number, RegionColor> = {
  // מרכז — כחול
  1: { chip: 'bg-blue-600 text-white', bar: 'bg-blue-600', hex: '#2563eb', cluster: 'מרכז' }, // גוש-דן
  6: { chip: 'bg-blue-600 text-white', bar: 'bg-blue-600', hex: '#2563eb', cluster: 'מרכז' }, // מרכז
  // תל-אביב — אינדיגו
  15: { chip: 'bg-indigo-600 text-white', bar: 'bg-indigo-600', hex: '#4f46e5', cluster: 'ת"א' }, // תל-אביב
  // שרון — ציאן
  4: { chip: 'bg-cyan-600 text-white', bar: 'bg-cyan-600', hex: '#0891b2', cluster: 'שרון' }, // השרון
  // שפלה — ענבר
  14: { chip: 'bg-amber-500 text-white', bar: 'bg-amber-500', hex: '#f59e0b', cluster: 'שפלה' }, // שפלה
  // דרום — כתום
  2: { chip: 'bg-orange-600 text-white', bar: 'bg-orange-600', hex: '#ea580c', cluster: 'דרום' }, // דרום - מישור החוף
  3: { chip: 'bg-orange-600 text-white', bar: 'bg-orange-600', hex: '#ea580c', cluster: 'דרום' }, // דרום נגב
  // ירושלים — סגול
  5: { chip: 'bg-purple-600 text-white', bar: 'bg-purple-600', hex: '#9333ea', cluster: 'ירושלים' }, // ירושלים והסביבה
  // צפון — ירוק (emerald)
  7: { chip: 'bg-emerald-600 text-white', bar: 'bg-emerald-600', hex: '#059669', cluster: 'צפון' }, // חדרה
  8: { chip: 'bg-emerald-600 text-white', bar: 'bg-emerald-600', hex: '#059669', cluster: 'צפון' }, // כרמיאל
  9: { chip: 'bg-emerald-600 text-white', bar: 'bg-emerald-600', hex: '#059669', cluster: 'צפון' }, // עכו
  10: { chip: 'bg-emerald-600 text-white', bar: 'bg-emerald-600', hex: '#059669', cluster: 'צפון' }, // רמת הגולן
  11: { chip: 'bg-emerald-600 text-white', bar: 'bg-emerald-600', hex: '#059669', cluster: 'צפון' }, // גליל והעמקים
  12: { chip: 'bg-emerald-600 text-white', bar: 'bg-emerald-600', hex: '#059669', cluster: 'צפון' }, // גליל עליון
  13: { chip: 'bg-emerald-600 text-white', bar: 'bg-emerald-600', hex: '#059669', cluster: 'צפון' }, // חיפה וקריות
  // ארצי — אפור נייטרלי
  16: { chip: 'bg-slate-500 text-white', bar: 'bg-slate-500', hex: '#64748b', cluster: 'ארצי' }, // ארצי
}

const FALLBACK: RegionColor = { chip: 'bg-slate-400 text-white', bar: 'bg-slate-400', hex: '#94a3b8', cluster: '' }

export function getRegionColor(regionId: number | null | undefined): RegionColor {
  if (regionId == null) return FALLBACK
  return REGION_COLOR_MAP[Number(regionId)] ?? FALLBACK
}
