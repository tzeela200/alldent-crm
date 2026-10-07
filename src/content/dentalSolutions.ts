/**
 * INC-3151 · פרסומים, קורסים ותוכניות בעולם הדנטל.
 *
 * זהו מקור האמת לכל הפרסומים שמוצגים ב-/dental-solutions ובדף הבית.
 * הוספת פרסום חדש = אובייקט חדש במערך. אין צורך ברכיב או בנתיב חדש —
 * אותה תבנית מרנדרת את כולם.
 *
 * ⚠️ המלל כאן הוא מלל שיווקי של הלקוח ונכנס מילה במילה. אין לנסח מחדש
 * תנאי קבלה, מחירים או הבטחות — הם מחייבים את המפרסם.
 *
 * אם בעתיד התוכן יעבור ל-Supabase, הטיפוס הזה הוא החוזה: הרכיב
 * DentalSolutionBody מקבל אובייקט כזה ולא יודע מאיפה הגיע.
 */

export type SolutionKind = 'course' | 'program' | 'service' | 'event'

export interface SolutionSection {
  heading: string
  body?: string
  items?: string[]
}

export interface SolutionFact {
  label: string
  /** ⚠️ ערכים עם מספרים/לטינית נעטפים ב-dir="ltr" בתצוגה (בידי). */
  value: string
}

export interface DentalSolution {
  slug: string
  kind: SolutionKind
  /** תגית התחום — מוצגת בכרטיס ובהירו */
  category: string

  /** שורה מובילה קטנה מעל הכותרת. הכותרת המלאה נשמרת ב-seo.title. */
  titleLead?: string
  /** כותרת הדף — קצרה ככל האפשר, היא מוצגת ב-68px */
  title: string
  /** כותרת קצרה לכרטיס בדף הבית */
  cardTitle: string
  cardExcerpt: string
  cardHighlights: string[]

  /** הגופים השותפים, מוצגים כשורת שיוך מתחת לכותרת */
  partners?: string[]

  /**
   * יחס 1.91:1 — הכרטיס ברשימה ובדף הבית, וגם תמונת השיתוף.
   * זהו היחס שפייסבוק דורש, ולכן הוא נעול.
   */
  image: string
  /**
   * פוסטר מרובע/לאורך להירו. רצועה מלבנית בחצי עמודה מרחפת בתוך
   * שטח ריק; פוסטר ממלא את הגובה ועומד מול הכותרת.
   * אם חסר — ההירו נופל ל-image.
   */
  posterImage?: string
  imageAlt: string

  intro: string
  sections: SolutionSection[]
  /** בלוק עובדות נפרד — תנאי קבלה, מועדים, עלויות */
  factsHeading?: string
  facts?: SolutionFact[]
  /** הערת שוליים מתחת לבלוק העובדות (סייגים, חריגים) */
  factsNote?: string

  /** שורת דחיפות מעל ה-CTA התחתון */
  urgency?: string
  ctaLabel: string
  /** קישור חיצוני לאתר הלקוח */
  ctaUrl: string

  seo: { title: string; description: string }

  /** false = לא מוצג בציבור ולא ברשימה */
  published: boolean
}

export const DENTAL_SOLUTIONS: DentalSolution[] = [
  {
    slug: 'maccabident-hygiene-program',
    kind: 'program',
    category: 'לימודים והכשרות',

    titleLead: 'תוכנית אקדמית פורצת דרך',
    title: 'תואר ראשון והכשרה בשיננות – במימון מלא!',
    cardTitle: 'תואר ראשון + מקצוע מבוקש בשיננות במימון מלא',
    cardExcerpt:
      'תוכנית ראשונה מסוגה בשיתוף מכבידנט, מכבי ואוניברסיטת אריאל. המהפכה האקדמית של מכבידנט.',
    cardHighlights: [
      'תואר ראשון בניהול מערכות בריאות + הכשרה לרישיון שיננות',
      'מימון מלא של שכר הלימוד',
    ],

    partners: ['מכבי שירותי בריאות', 'מכבידנט', 'אוניברסיטת אריאל בשומרון'],

    image: '/images/solutions/maccabident-hygiene-program.jpg',
    posterImage: '/images/solutions/maccabident-hygiene-program-poster.jpg',
    imageAlt:
      'הקריירה שלכם/ן מתחילה כאן — לימודי תעודה בשיננות במסלול משולב עם תואר ראשון בניהול מערכות בריאות, במימון מלא. מכבי, מכבידנט ואוניברסיטת אריאל בשומרון.',

    intro:
      'שיתוף פעולה אקדמי-קליני ייחודי בין מכבי שירותי בריאות, מכבידנט ואוניברסיטת אריאל בשומרון. מדובר בתוכנית ראשונה מסוגה בישראל, המעניקה הכשרה משולבת ברמה הגבוהה ביותר בעולם הבריאות.',

    sections: [
      {
        heading: 'מה כוללת התוכנית',
        items: [
          'שילוב של לימודים לתואר ראשון (B.A) בניהול מערכות בריאות יחד עם הכשרה מקצועית ומעשית בשיננות וקידום בריאות דנטלית.',
          'זכאות לגשת למבחני הרישוי של משרד הבריאות לקבלת רישיון שיננות רשמי.',
          'לימודים במימון מלא למתקבלים/ות!',
        ],
      },
    ],

    factsHeading: 'תנאי קבלה עיקריים',
    /**
     * ⚠️ עודכן 07.10.2026 לבקשת הלקוח: הממוצע הנדרש ירד מ-90 ל-85.
     * כתוצאה מכך הוסרה השורה "קבלה על תנאי: ממוצע 85–89" — היא הפכה
     * לסותרת (אותו טווח גם עומד בתנאי וגם על תנאי). ועדת החריגים
     * שנוספה בהערת השוליים ממלאת את אותו תפקיד.
     */
    facts: [
      { label: 'בגרות', value: 'זכאות לבגרות עם 4 יח״ל אנגלית לפחות' },
      { label: 'ממוצע בגרות', value: '85 ומעלה' },
      { label: 'מבחן אמירנט', value: '85 ומעלה' },
      { label: 'אמירנט — על תנאי', value: '70–84' },
    ],
    factsNote: '* מקרים שחורגים מהתנאים ידונו בוועדת חריגים.',

    urgency: 'מספר המקומות מוגבל',
    ctaLabel: 'לפרטים נוספים והגשת מועמדות',
    ctaUrl: 'https://tinyurl.com/42sc567a',

    seo: {
      title: 'תואר ראשון והכשרה בשיננות במימון מלא | מכבידנט × אוניברסיטת אריאל',
      description:
        'תוכנית ראשונה מסוגה בישראל: תואר ראשון בניהול מערכות בריאות יחד עם הכשרה לרישיון שיננות של משרד הבריאות — במימון מלא. בשיתוף מכבי, מכבידנט ואוניברסיטת אריאל.',
    },

    published: true,
  },
]

/** הפרסומים שמוצגים לציבור, לפי סדר ההופעה במערך. */
export const PUBLISHED_SOLUTIONS = DENTAL_SOLUTIONS.filter((s) => s.published)

export function getSolution(slug: string | undefined): DentalSolution | undefined {
  if (!slug) return undefined
  return PUBLISHED_SOLUTIONS.find((s) => s.slug === slug)
}

/** הפרסום שמוצג כרצועה בדף הבית — הראשון שפורסם. */
export const FEATURED_SOLUTION: DentalSolution | undefined = PUBLISHED_SOLUTIONS[0]
