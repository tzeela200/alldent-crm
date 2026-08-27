/**
 * סולם הטיפוגרפיה של האתר הציבורי.
 *
 * ⚠️ למה זה קיים: לפני הקובץ הזה היו באתר שלוש שיטות מידה במקביל —
 * ערך קבוע (`text-[68px]`), סולם Tailwind (`text-3xl md:text-5xl`)
 * ו-clamp — ולכן אותה כותרת נראתה 62px בלוח המשרות, 68 במעסיקים,
 * 78 בדף הבית ו-88 בתנאים. אותו תפקיד, ארבעה גדלים.
 *
 * כל עמוד ציבורי לוקח את המידה מכאן. אין לכתוב גודל כותרת מקומית.
 *
 * הסולם (בדסקטופ רחב, אחרי clamp):
 *   HERO_H1     68 · SECTION_H2  44 · SUB_H2   32
 *   CARD_H3     22 · LIST_H4     16 · LEAD     19 · BODY 15.5 · SMALL 14
 *
 * הערכים נגזרו מהמידות שכבר שלטו באתר (68 בארבעה עמודים, 44 בדף הבית),
 * לא הומצאו.
 */

/** כותרת ההירו. אחת בעמוד. */
export const HERO_H1 =
  'text-[clamp(32px,5.6vw,68px)] font-black leading-[1.04] tracking-[-0.03em] text-balance'

/** כותרת מקטע ראשית. */
export const SECTION_H2 =
  'text-[clamp(25px,3.6vw,44px)] font-black leading-[1.08] tracking-[-0.025em] text-balance'

/** כותרת מקטע משנית — בתוך כרטיס גדול או מקטע פנימי. */
export const SUB_H2 =
  'text-[clamp(21px,2.6vw,32px)] font-black leading-[1.12] tracking-[-0.02em] text-balance'

/** כותרת כרטיס, שלב או שאלה. */
export const CARD_H3 =
  'text-[clamp(17px,1.75vw,22px)] font-black leading-[1.3] tracking-[-0.015em]'

/** כותרת פריט ברשימה צפופה — צ'קליסט, שורות יתרונות. */
export const LIST_H4 = 'text-[16px] font-black leading-[1.5] tracking-[-0.01em]'

/** פסקת פתיחה מתחת לכותרת. */
export const LEAD = 'text-[clamp(16px,1.5vw,19px)] leading-[1.85] text-pretty'

/** טקסט גוף רגיל. */
export const BODY = 'text-[15.5px] leading-[1.8] text-pretty'

/** טקסט משני — הערות, כיתובים. */
export const SMALL = 'text-[14px] leading-[1.7]'

/**
 * תווית מקטע מעל הכותרת.
 *
 * ⚠️ שני מרווחי אותיות בכוונה: מרווח רחב הורס קריאוּת בעברית, שאין בה
 * אותיות גדולות והאותיות צרות יותר. לטינית דווקא מרוויחה ממנו.
 */
export const EYEBROW = 'text-[12px] font-extrabold tracking-[0.08em]'
export const EYEBROW_LATIN = 'text-[12px] font-extrabold tracking-[0.24em]'
