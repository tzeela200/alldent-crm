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

  /** כותרת הדף */
  title: string
  /** כותרת קצרה לכרטיס בדף הבית */
  cardTitle: string
  cardExcerpt: string
  cardHighlights: string[]

  /** הגופים השותפים, מוצגים כשורת שיוך מתחת לכותרת */
  partners?: string[]

  /** נתיב מ-public. יחס 1.91:1 — משמש גם כתמונת השיתוף. */
  image: string
  imageAlt: string

  intro: string
  sections: SolutionSection[]
  /** בלוק עובדות נפרד — תנאי קבלה, מועדים, עלויות */
  factsHeading?: string
  facts?: SolutionFact[]

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

    title: 'תוכנית אקדמית פורצת דרך: תואר ראשון והכשרה בשיננות – במימון מלא!',
    cardTitle: 'תואר ראשון + מקצוע מבוקש בשיננות במימון מלא',
    cardExcerpt:
      'תוכנית ראשונה מסוגה בשיתוף מכבידנט, מכבי ואוניברסיטת אריאל. המהפכה האקדמית של מכבידנט.',
    cardHighlights: [
      'תואר ראשון בניהול מערכות בריאות + הכשרה לרישיון שיננות',
      'מימון מלא של שכר הלימוד',
    ],

    partners: ['מכבי שירותי בריאות', 'מכבידנט', 'אוניברסיטת אריאל בשומרון'],

    image: '/images/solutions/maccabident-hygiene-program.jpg',
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
    facts: [
      { label: 'בגרות', value: 'זכאות לבגרות עם 4 יח״ל אנגלית לפחות' },
      { label: 'ממוצע בגרות', value: '90 ומעלה' },
      { label: 'קבלה על תנאי', value: 'ממוצע 85–89' },
      { label: 'מבחן אמירנט', value: '85 ומעלה' },
      { label: 'אמירנט — על תנאי', value: '70–84' },
    ],

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
