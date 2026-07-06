// מקור-אמת יחיד לצבעי תפקיד לפי role_id (מאומת מול dict_roles, 18 תפקידים).
// הגוון הקנוני = הגוון הציבורי (ROLE_ROOT_COLORS ב-publicRolePages.ts),
// לפי החלטת צאלה 2026-07-06. אותו תפקיד = אותו גוון בכל המערכת:
// טבלה, פאנל, כרטיס, 360, דשבורד, פילטר, ובאתר הציבורי.
//
// לכל תפקיד:
//   solid   — הגוון המלא (לתגית ציבורית מלאה, לברים/גרפיקה, ל-hex inline)
//   chipBg  — רקע בהיר לצ'יפ אדמין (פסטלי, מובחן מצ'יפ אזור המלא)
//   chipText— טקסט כהה קריא לצ'יפ אדמין
//
// עיצוב: צ'יפ תפקיד באדמין = פסטל (רקע בהיר + טקסט כהה) — במכוון שונה מצ'יפ
// אזור (bg-*-600 מלא + לבן) כדי למנוע בלבול תפקיד/אזור.

export interface RoleColor {
  solid: string
  chipBg: string
  chipText: string
}

const FALLBACK: RoleColor = { solid: '#64748b', chipBg: '#F1F5F9', chipText: '#475569' }

// role_id → צבע. גוונים ראשיים מהמסמך הציבורי; שאר התפקידים בגוון עקבי.
const ROLE_COLOR_MAP: Record<number, RoleColor> = {
  1:  { solid: '#0cc0df', chipBg: '#E6F9FC', chipText: '#0A7C90' }, // רופא שיניים — טורקיז
  2:  { solid: '#086df4', chipBg: '#E7F0FE', chipText: '#0852B8' }, // מומחה אורתו — כחול
  3:  { solid: '#086df4', chipBg: '#E7F0FE', chipText: '#0852B8' }, // מומחה פריו
  4:  { solid: '#086df4', chipBg: '#E7F0FE', chipText: '#0852B8' }, // מומחה אנדו
  5:  { solid: '#086df4', chipBg: '#E7F0FE', chipText: '#0852B8' }, // מומחה כירורג
  6:  { solid: '#086df4', chipBg: '#E7F0FE', chipText: '#0852B8' }, // מומחה פדו
  7:  { solid: '#086df4', chipBg: '#E7F0FE', chipText: '#0852B8' }, // מומחה רפואת הפה
  8:  { solid: '#086df4', chipBg: '#E7F0FE', chipText: '#0852B8' }, // מומחה שיקום
  9:  { solid: '#774196', chipBg: '#F1ECF7', chipText: '#5E3379' }, // סייעת — סגול (ציבורי)
  10: { solid: '#d10383', chipBg: '#FCE8F3', chipText: '#A80369' }, // שיננית — ורוד
  11: { solid: '#d4a800', chipBg: '#FBF4DB', chipText: '#8A6E00' }, // טכנאי — צהוב/זהב
  12: { solid: '#ff751f', chipBg: '#FFEEE2', chipText: '#C4530F' }, // מנהל דנטלי — כתום
  13: { solid: '#076911', chipBg: '#E4F3E6', chipText: '#075C0F' }, // מזכירה — ירוק (ציבורי)
  14: { solid: '#0d9488', chipBg: '#E3F5F3', chipText: '#0B7A70' }, // עובד דנטלי — טורקיז כהה
  15: { solid: '#ff751f', chipBg: '#FFEEE2', chipText: '#C4530F' }, // מכירות — כתום (משפחת ניהול/מכירות)
  16: { solid: '#e11d48', chipBg: '#FCE7EB', chipText: '#B01235' }, // בעלים — רוז
  17: { solid: '#0284c7', chipBg: '#E4F2FB', chipText: '#026AA1' }, // רכש דנטלי — תכלת
  18: { solid: '#0284c7', chipBg: '#E4F2FB', chipText: '#026AA1' }, // צילום דנטלי — תכלת
}

export function getRoleColor(roleId: number | null | undefined): RoleColor {
  if (roleId == null) return FALLBACK
  return ROLE_COLOR_MAP[Number(roleId)] ?? FALLBACK
}

// גוון hex מלא — לברים/גרפיקה/inline style (שם ישן נשמר לתאימות).
export function getRoleColorHex(roleId: number | null | undefined): string {
  return getRoleColor(roleId).solid
}
