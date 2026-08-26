import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BackLink } from '@/components/public/BackLink'
import {
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  HeartHandshake,
  ImagePlus,
  Mail,
  ShieldCheck,
  Sparkles,
  Target,
} from 'lucide-react'
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon'

const BRANDING_COLORS = {
  primary: '#AB134E',
  primaryLight: '#E889AE',
  primarySoft: '#FBEAF1',
  primaryBorder: 'rgba(171,19,78,0.18)',
  gold: '#D9A928',
}

const HERO_HIGHLIGHTS = [
  'עמוד משרה מעוצב',
  'חשיפה מלאה של המרפאה',
  'ללא עמלת הצלחה',
]

const FIT_ITEMS = [
  {
    title: 'מרפאות בצמיחה',
    body: 'למקומות שמגייסים באופן קבוע ורוצים להיראות מקצועיים ומדויקים יותר מול מועמדים.',
  },
  {
    title: 'מרפאות פרטיות',
    body: 'למרפאות שרוצות להציג את הייחוד, הצוות, האווירה וסביבת העבודה שלהן.',
  },
  {
    title: 'גיוסים מאתגרים',
    body: 'כאשר צריך ליצור חיבור ואמון חזקים יותר כבר מהחשיפה הראשונה למשרה.',
  },
  {
    title: 'בניית מוניטין',
    body: 'למעסיקים שרוצים לחזק את הנראות שלהם גם מעבר למשרה נקודתית אחת.',
  },
]

const VALUE_STEPS = [
  {
    id: '01',
    icon: ImagePlus,
    eyebrow: 'חומרים ויזואליים',
    title: 'נראות שיוצרת חיבור',
    body:
      'תמונות, סרטונים ולוגו מאפשרים למועמדים להבין לאן הם מגיעים, עם מי יעבדו ואיך נראית סביבת העבודה.',
    value:
      'יותר ביטחון, יותר אנושיות ופחות תחושת אי־ודאות לפני הפנייה הראשונה.',
  },
  {
    id: '02',
    icon: HeartHandshake,
    eyebrow: 'תרבות ארגונית',
    title: 'סיפור שנותן סיבה לבחור בכם',
    body:
      'הצגת החזון, הערכים, האווירה והדרך שבה הצוות עובד יחד עוזרת למועמדים להבין מה באמת מחכה להם אצלכם.',
    value:
      'משיכת אנשים שמתאימים לאופי המרפאה — ולא רק לדרישות התפקיד.',
  },
  {
    id: '03',
    icon: Sparkles,
    eyebrow: 'מקצועיות וטכנולוגיה',
    title: 'מקצועיות שמחזקת את המותג',
    body:
      'תחומי טיפול, ציוד, מערכות, טכנולוגיות והישגים מציגים את המרפאה כסביבת עבודה מקצועית ומתקדמת.',
    value:
      'משיכת מועמדים שמחפשים למידה, התפתחות וגאווה מקצועית.',
  },
  {
    id: '04',
    icon: BadgeCheck,
    eyebrow: 'מוניטין והוכחה חברתית',
    title: 'אמון עוד לפני השיחה',
    body:
      'המלצות, הישגים ומוניטין חיובי מקרינים גם על המרפאה כמעסיקה ומחזקים את תחושת היציבות והמקצועיות.',
    value:
      'חיזוק הביטחון של המועמד והפחתת חששות לפני יצירת הקשר.',
  },
  {
    id: '05',
    icon: Target,
    eyebrow: 'פרטי משרה',
    title: 'דיוק שמביא פניות רלוונטיות',
    body:
      'שעות, שכר, היקף משרה, מיקום, ניסיון ודרישות חובה משפיעים ישירות על סוג וכמות הפניות.',
    value:
      'פחות פניות לא מתאימות, פחות ראיונות מיותרים ופחות פערי ציפיות.',
  },
  {
    id: '06',
    icon: Building2,
    eyebrow: 'חיבור למסלול אחד',
    title: 'עמוד שמחבר בין המסר למועמד הנכון',
    body:
      'אנחנו מחברים את כל החומרים לעמוד שמציג לא רק את התפקיד — אלא גם את הסיבה לעבוד דווקא אצלכם.',
    value:
      'מסר ברור, מקצועי ומבדל שמלווה את המועמד מהחשיפה הראשונה ועד הפנייה.',
  },
]

const COMPARISON_ROWS = [
  {
    label: 'אופן הצגת המשרה',
    regular: 'מיקוד במשרה ובדרישות, ללא חשיפת המרפאה.',
    branding: 'הצגת המרפאה והמשרה יחד.',
  },
  {
    label: 'תוכן',
    regular: 'מידע מקצועי ממוקד על התפקיד.',
    branding: 'תוכן על הצוות, סביבת העבודה והתרבות.',
  },
  {
    label: 'מדיה וקישורים',
    regular: 'ללא מדיה ממותגת כחלק מהמסלול.',
    branding: 'תמונות, סרטון, אתר ורשתות חברתיות.',
  },
  {
    label: 'מטרת המסלול',
    regular: 'גיוס ממוקד ודיסקרטי.',
    branding: 'גיוס לצד חיזוק נראות המעסיק.',
  },
]

const EXPECTATION_ITEMS = [
  {
    icon: CheckCircle2,
    title: 'אין התחייבות למספר פניות',
    body:
      'המסלול משפר נראות, אמון ואטרקטיביות, אך אינו מבטיח מראש כמות מינימלית של פניות.',
  },
  {
    icon: BarChart3,
    title: 'התוצאה מושפעת מתנאי המשרה',
    body:
      'מיקום, שכר, היקף משרה, שעות עבודה, ניסיון והסמכות משפיעים על היקף הפניות.',
  },
  {
    icon: ShieldCheck,
    title: 'ניתן לבקש נתוני פרסום',
    body:
      'אם אין פניות, ניתן לקבל תמונת מצב על הפעילות הפרסומית שבוצעה.',
  },
]

const FAQ_ITEMS = [
  {
    id: '01',
    question: 'מהו מסלול מיתוג מעסיקים?',
    answer:
      'מסלול גיוס שמציג לא רק את המשרה, אלא גם את המרפאה, הצוות, סביבת העבודה, הערכים והייחוד שלכם כמעסיקים.',
  },
  {
    id: '02',
    question: 'מה כולל המסלול?',
    answer:
      'המסלול כולל דף משרה מעוצב, מידע על המרפאה והמשרה, תמונות, סרטונים, קישורים לאתר ולרשתות, כתובת, פרטי קשר ותוכן שמציג את סביבת העבודה.',
  },
  {
    id: '03',
    question: 'למה צריך לשלוח תמונות, סרטונים ותוכן?',
    answer:
      'החומרים מאפשרים למועמדים להכיר את המרפאה עוד לפני הפנייה. הם יוצרים אמון, חיבור וממחישים כיצד נראה מקום העבודה בפועל.',
  },
  {
    id: '04',
    question: 'איך נראה תהליך העבודה?',
    answer:
      'לאחר פתיחת הבקשה ממלאים את פרטי המשרה ושולחים חומרים. צוות AllDent בונה את העמוד, ואתם מאשרים אותו לפני הפרסום.',
  },
  {
    id: '05',
    question: 'כמה עולה המסלול?',
    answer:
      'המסלול עולה 2,000 ₪ + מע״מ בתשלום חד־פעמי עבור משרה אחת, דף מעוצב ופרסום למשך עד 60 יום.',
  },
  {
    id: '06',
    question: 'האם קיימת עמלת הצלחה?',
    answer:
      'לא. במסלול זה אין תשלום נוסף במקרה של גיוס.',
  },
  {
    id: '07',
    question: 'איפה המשרה מתפרסמת?',
    answer:
      'הפרסום מתבצע בערוצים הרלוונטיים של AllDent, ובהם אתר AllDent, רשתות חברתיות, Facebook, אתרי דרושים ודיוור WhatsApp אישי.',
  },
  {
    id: '08',
    question: 'האם יש התחייבות לכמות פניות?',
    answer:
      'לא. כמות הפניות מושפעת גם ממיקום, שכר, היקף משרה, שעות, ניסיון ודרישות התפקיד.',
  },
  {
    id: '09',
    question: 'מה קורה אם אין פניות?',
    answer:
      'ניתן לבקש נתוני פרסום ולקבל תמונת מצב על הפעילות שבוצעה. קיימת מחויבות למאמץ פרסומי, אך לא לתוצאה מובטחת.',
  },
  {
    id: '10',
    question: 'אפשר לבטל או לדחות את השירות?',
    answer:
      'בתוך 3 ימי עסקים ניתן לדחות את השירות עד 12 חודשים או לבטל אותו בכפוף לדמי ביטול של 200 ₪ ללא מע״מ.',
  },
  {
    id: '11',
    question: 'האם ניתן לעדכן את הדף לאחר הבנייה?',
    answer:
      'ניתן לבצע תיקונים במסגרת שלב האישור לפני הפרסום. שינויים לאחר העלייה לאוויר יתבצעו בהתאם להיקף העדכון.',
  },
  {
    id: '12',
    question: 'למי המסלול מתאים?',
    answer:
      'למרפאות שרוצות למשוך מועמדים דרך הצגה מקצועית, ברורה ואמינה של מקום העבודה, ולא רק דרך מודעת דרושים בסיסית.',
  },
]

const WHATSAPP_CLASS =
  'inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] bg-[#D97706] px-6 py-3 text-[14px] font-bold text-white shadow-[0_10px_24px_rgba(217,119,6,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#B45309]'

const PRIMARY_CTA_CLASS =
  'inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] bg-[#008080] px-6 py-3 text-[14px] font-bold text-white shadow-[0_10px_24px_rgba(0,128,128,0.20)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#006D6D]'

const BACK_CTA_CLASS =
  'inline-flex min-h-[44px] items-center gap-2 rounded-[18px] border border-white/12 bg-white/8 px-6 py-3 text-[14px] font-bold text-white shadow-sm backdrop-blur transition-all duration-200 hover:border-white/20 hover:bg-white/12'

function ValueTimeline() {
  const sectionRef = useRef<HTMLElement | null>(null)
  const stepRefs = useRef<Array<HTMLDivElement | null>>([])
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    const observers: IntersectionObserver[] = []

    stepRefs.current.forEach((element, index) => {
      if (!element) return

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveStep((current) => Math.max(current, index))
          }
        },
        {
          root: null,
          threshold: 0.48,
          rootMargin: '-12% 0px -28% 0px',
        },
      )

      observer.observe(element)
      observers.push(observer)
    })

    return () => observers.forEach((observer) => observer.disconnect())
  }, [])

  const progress =
    VALUE_STEPS.length <= 1
      ? 100
      : (activeStep / (VALUE_STEPS.length - 1)) * 100

  return (
    <section
      ref={sectionRef}
      id="strategy-value"
      className="relative overflow-hidden bg-[#2D2D2D] px-4 py-20 text-white md:px-8 md:py-28"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(171,19,78,0.12),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(217,169,40,0.05),transparent_26%)]" />

      <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto max-w-4xl text-center">
          <span
            className="inline-flex rounded-full border px-4 py-1.5 text-[13px] font-bold"
            style={{
              borderColor: 'rgba(232,137,174,0.28)',
              backgroundColor: 'rgba(171,19,78,0.14)',
              color: BRANDING_COLORS.primaryLight,
            }}
          >
            אסטרטגיית גיוס עם ערך
          </span>

          <h2 className="mt-5 text-3xl font-black tracking-tight md:text-5xl">
            מיתוג מעסיקים הוא מסר של שקיפות, זהות ובחירה
          </h2>

          <p className="mx-auto mt-5 max-w-3xl text-[16px] leading-[1.95] text-white/72 md:text-[18px]">
            המסלול מחבר בין משמעות לעיצוב: הוא מציג למועמדים מי אתם,
            איך נראית סביבת העבודה ומה הערך שהם יכולים למצוא אצלכם —
            בצורה ברורה, אמינה ומושכת.
          </p>
        </div>

        <div className="relative mt-16">
          <div className="pointer-events-none absolute bottom-0 end-1/2 top-0 hidden w-px translate-x-1/2 bg-white/10 md:block" />
          <div
            className="pointer-events-none absolute end-1/2 top-0 hidden w-px translate-x-1/2 bg-[#D9A928] transition-[height] duration-500 ease-out md:block"
            style={{ height: `${progress}%` }}
          />

          <div className="space-y-16 md:space-y-24">
            {VALUE_STEPS.map(
              ({ id, icon: Icon, eyebrow, title, body, value }, index) => {
                const cardOnRight = index % 2 === 0
                const isVisible = index <= activeStep
                const isActive = index === activeStep

                return (
                  <div
                    key={id}
                    ref={(element) => {
                      stepRefs.current[index] = element
                    }}
                    className="relative grid min-h-[280px] gap-5 md:grid-cols-[1fr_72px_1fr] md:items-center"
                  >
                    <div
                      className={`${cardOnRight ? 'md:col-start-3' : 'md:col-start-1'} ${
                        cardOnRight ? '' : 'md:row-start-1'
                      }`}
                    >
                      <article
                        className={`relative rounded-[24px] border p-6 text-start transition-all duration-700 ease-out md:p-7 ${
                          isVisible
                            ? 'translate-y-0 scale-100 opacity-100'
                            : 'translate-y-12 scale-[0.96] opacity-0'
                        } ${
                          isActive
                            ? 'border-white/20 shadow-[0_26px_62px_rgba(0,0,0,0.32)]'
                            : 'border-white/10 shadow-[0_18px_46px_rgba(0,0,0,0.22)]'
                        }`}
                        style={{
                          background: 'linear-gradient(145deg, #363636 0%, #303030 100%)',
                        }}
                      >
                        <div
                          className={`absolute top-1/2 hidden h-0 w-0 -translate-y-1/2 border-y-[10px] border-y-transparent md:block ${
                            cardOnRight
                              ? 'end-full border-e-[12px] border-e-[#3A3A3A]'
                              : 'start-full border-s-[12px] border-s-[#3A3A3A]'
                          }`}
                        />

                        <div className="flex items-start justify-between gap-5">
                          <div>
                            <p
                              className="text-[12px] font-black tracking-[0.08em]"
                              style={{ color: BRANDING_COLORS.primaryLight }}
                            >
                              {eyebrow}
                            </p>
                            <h3 className="mt-2 text-[22px] font-black leading-[1.35]">
                              {title}
                            </h3>
                          </div>

                          <div
                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                            style={{ backgroundColor: 'rgba(171,19,78,0.20)' }}
                          >
                            <Icon
                              className="h-5 w-5"
                              style={{ color: BRANDING_COLORS.primaryLight }}
                              aria-hidden="true"
                            />
                          </div>
                        </div>

                        <p className="mt-4 text-[15px] leading-[1.9] text-white/72">
                          {body}
                        </p>

                        <div className="mt-5 rounded-[16px] border border-[#D9A928]/20 bg-[#D9A928]/8 px-4 py-3">
                          <p className="text-[12px] font-black text-[#F3D87D]">
                            הערך לגיוס
                          </p>
                          <p className="mt-1 text-[14px] leading-[1.8] text-white/82">
                            {value}
                          </p>
                        </div>
                      </article>
                    </div>

                    <div className="hidden items-center justify-center md:col-start-2 md:row-start-1 md:flex">
                      <div
                        className={`relative z-10 flex h-11 w-11 items-center justify-center rounded-full border text-[12px] font-black transition-all duration-500 ${
                          isVisible
                            ? 'scale-100 border-[#D9A928] bg-[#2D2D2D] text-[#F3D87D] shadow-[0_0_22px_rgba(217,169,40,0.28)]'
                            : 'scale-90 border-white/15 bg-[#2D2D2D] text-white/35'
                        }`}
                      >
                        {id}
                      </div>
                    </div>

                    <div
                      className={`md:hidden ${
                        cardOnRight ? '' : ''
                      }`}
                    >
                      <div className="mb-4 flex items-center gap-3">
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-full border text-[12px] font-black transition-all ${
                            isVisible
                              ? 'border-[#D9A928] text-[#D9A928]'
                              : 'border-white/15 text-white/35'
                          }`}
                        >
                          {id}
                        </span>
                        <span className="h-px flex-1 bg-white/10" />
                      </div>
                    </div>
                  </div>
                )
              },
            )}
          </div>
        </div>

        <div className="mx-auto mt-16 max-w-3xl text-center">
          <p className="text-2xl font-black leading-[1.5] md:text-3xl">
            אתם מביאים את הסיפור של המרפאה.
            <span
              className="mt-1 block"
              style={{ color: BRANDING_COLORS.primaryLight }}
            >
              אנחנו הופכים אותו לאסטרטגיית גיוס.
            </span>
          </p>
        </div>
      </div>
    </section>
  )
}

function FAQAccordion({
  items,
}: {
  items: { id: string; question: string; answer: string }[]
}) {
  const [openId, setOpenId] = useState(items[0]?.id ?? '')

  return (
    <div className="space-y-3" dir="rtl">
      {items.map((item) => {
        const isOpen = openId === item.id
        const contentId = `branding-faq-${item.id}`

        return (
          <div
            key={item.id}
            className={`overflow-hidden rounded-[16px] border transition-all duration-300 ${
              isOpen
                ? 'bg-white shadow-[0_12px_30px_rgba(15,23,32,0.07)]'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
            style={{
              borderColor: isOpen
                ? BRANDING_COLORS.primaryBorder
                : undefined,
            }}
          >
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? '' : item.id)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start sm:px-6"
              aria-expanded={isOpen}
              aria-controls={contentId}
            >
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <span
                  className="w-8 shrink-0 text-[13px] font-black"
                  style={{
                    color: isOpen
                      ? BRANDING_COLORS.primary
                      : '#94A3B8',
                  }}
                >
                  {item.id}
                </span>
                <h3 className="min-w-0 flex-1 text-[15px] font-black leading-[1.55] text-[#273142] sm:text-[16px]">
                  {item.question}
                </h3>
              </div>

              <ChevronDown
                className={`h-4 w-4 shrink-0 transition-transform duration-300 ${
                  isOpen ? 'rotate-180' : ''
                }`}
                style={{
                  color: isOpen
                    ? BRANDING_COLORS.primary
                    : '#94A3B8',
                }}
                aria-hidden="true"
              />
            </button>

            <div
              id={contentId}
              className={`grid transition-all duration-300 ease-out ${
                isOpen
                  ? 'grid-rows-[1fr] opacity-100'
                  : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="overflow-hidden">
                <p className="border-t border-slate-100 px-5 py-5 ps-[4.25rem] text-[14px] leading-[1.9] text-[#667085] sm:px-6">
                  {item.answer}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function EmployersBrandingPage() {
  const navigate = useNavigate()
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [termsError, setTermsError] = useState(false)

  const handleContinue = () => {
    if (!termsAccepted) {
      setTermsError(true)
      return
    }

    navigate('/employers/recruitment-request?plan=branding', {
      state: { plan: 'branding', termsAccepted: true },
    })
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-[#0F1720]" dir="rtl">
      <section className="relative overflow-hidden bg-[#2D2D2D] px-4 pb-16 pt-6 text-white md:px-8 md:pb-20 md:pt-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(171,19,78,0.14),transparent_30%),linear-gradient(135deg,#232323_0%,#2D2D2D_52%,#202020_100%)]" />
        <div className="pointer-events-none absolute end-[-5rem] top-10 h-64 w-64 rounded-full bg-[#AB134E]/12 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <BackLink to="/employers">חזרה למסלולי הגיוס</BackLink>

          <div className="mt-8 grid gap-10 lg:grid-cols-[1.12fr_0.88fr] lg:items-center">
            <div className="text-start">
              <span
                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-bold backdrop-blur"
                style={{
                  borderColor: 'rgba(232,137,174,0.28)',
                  backgroundColor: 'rgba(171,19,78,0.12)',
                  color: BRANDING_COLORS.primaryLight,
                }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: BRANDING_COLORS.primaryLight }}
                />
                Employer Branding
              </span>

              <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[1.06] tracking-[-0.04em] md:text-6xl lg:text-[64px]">
                מיתוג מעסיקים
                <span
                  className="mt-2 block"
                  style={{ color: BRANDING_COLORS.primaryLight }}
                >
                  אסטרטגיית גיוס עם ערך
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-[17px] leading-[1.85] text-white/78 md:text-[19px]">
                מסלול גיוס שמציג את המרפאה, הצוות וסביבת העבודה שלכם —
                ומאפשר למועמדים להבין למה כדאי לעבוד דווקא אצלכם.
              </p>

              <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[14px] font-bold text-white/82">
                {HERO_HIGHLIGHTS.map((item) => (
                  <span key={item} className="inline-flex items-center gap-2">
                    <CheckCircle2
                      className="h-4 w-4"
                      style={{ color: BRANDING_COLORS.primaryLight }}
                      aria-hidden="true"
                    />
                    {item}
                  </span>
                ))}
              </div>

              <div className="mt-9">
                <a
                  href="https://wa.me/972533951003"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={WHATSAPP_CLASS}
                >
                  <WhatsAppIcon className="h-4 w-4" />
                  דברו איתנו ב-WhatsApp
                </a>
              </div>
            </div>

            <aside className="rounded-[28px] border border-[#D9A928]/25 bg-[#323232] p-6 text-start shadow-[0_24px_64px_rgba(0,0,0,0.34)] ring-1 ring-[#D9A928]/10 md:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[12px] font-bold text-[#E8CC72]">
                    מחיר המסלול
                  </p>
                  <p className="mt-2 text-4xl font-black text-white">
                    2,000 ₪
                  </p>
                  <p className="mt-1 text-[15px] font-bold text-white/68">
                    + מע״מ · תשלום חד־פעמי
                  </p>
                </div>

                <span className="rounded-full border border-[#D9A928]/25 bg-[#D9A928]/10 px-3 py-1.5 text-[12px] font-black text-[#E8CC72]">
                  ללא עמלת הצלחה
                </span>
              </div>

              <div className="mt-6 space-y-3 border-t border-white/10 pt-5">
                {[
                  'משרה אחת',
                  'פרסום למשך עד 60 יום',
                  'דף משרה מעוצב ומאושר לפני פרסום',
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 text-[14px] font-semibold text-white/78"
                  >
                    <CheckCircle2
                      className="h-4 w-4 shrink-0"
                      style={{ color: BRANDING_COLORS.primaryLight }}
                      aria-hidden="true"
                    />
                    {item}
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 md:px-8 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
          <div className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_18px_50px_rgba(15,23,32,0.06)] md:p-9 text-start">
            <span
              className="inline-flex rounded-full px-4 py-1.5 text-[13px] font-bold"
              style={{
                backgroundColor: BRANDING_COLORS.primarySoft,
                color: BRANDING_COLORS.primary,
              }}
            >
              למי המסלול מתאים
            </span>
            <h2 className="mt-5 text-3xl font-black tracking-tight md:text-4xl">
              לא רק לפרסם משרה — לבנות סיבה לבחור בכם
            </h2>
            <p className="mt-5 text-[16px] leading-[1.9] text-[#667085] md:text-[18px]">
              במקום להציג רק תפקיד ודרישות, המסלול מאפשר למועמדים להבין מי
              אתם, איך נראית סביבת העבודה ומה מייחד את המרפאה שלכם כמעסיקה.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {FIT_ITEMS.map((item, index) => (
              <div
                key={item.title}
                className={`rounded-[24px] border p-5 shadow-[0_12px_34px_rgba(15,23,32,0.045)] text-start ${
                  index === 2
                    ? 'border-[#D97706]/12 bg-[#FFFAF4]'
                    : 'bg-white'
                }`}
                style={
                  index === 2
                    ? undefined
                    : { borderColor: BRANDING_COLORS.primaryBorder }
                }
              >
                <h3 className="text-[20px] font-black">{item.title}</h3>
                <p className="mt-2 text-[14px] leading-[1.8] text-[#6B7280]">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ValueTimeline />

      <section className="px-4 py-16 md:px-8 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_1fr] lg:items-start">
          <div className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_18px_50px_rgba(15,23,32,0.06)] md:p-9 text-start">
            <span
              className="inline-flex rounded-full px-4 py-1.5 text-[13px] font-bold"
              style={{
                backgroundColor: BRANDING_COLORS.primarySoft,
                color: BRANDING_COLORS.primary,
              }}
            >
              השוואה מהירה
            </span>
            <h2 className="mt-5 text-3xl font-black tracking-tight md:text-4xl">
              למה לבחור במיתוג מעסיקים
            </h2>

            <div className="mt-8 overflow-hidden rounded-[22px] border border-slate-200">
              <div className="grid grid-cols-[0.8fr_1fr_1fr] bg-[#F8FAFC]">
                <div className="border-e border-slate-200 px-4 py-4 text-[12px] font-black text-[#64748B]">
                  נושא
                </div>
                <div className="border-e border-slate-200 px-4 py-4 text-[12px] font-black text-[#64748B]">
                  גיוס דיסקרטי
                </div>
                <div
                  className="px-4 py-4 text-[12px] font-black"
                  style={{ color: BRANDING_COLORS.primary }}
                >
                  מיתוג מעסיקים
                </div>
              </div>

              {COMPARISON_ROWS.map((row, index) => (
                <div
                  key={row.label}
                  className={`grid grid-cols-[0.8fr_1fr_1fr] ${
                    index !== COMPARISON_ROWS.length - 1
                      ? 'border-t border-slate-200'
                      : ''
                  }`}
                >
                  <div className="border-e border-slate-200 bg-[#F8FAFC] px-4 py-4 text-[13px] font-bold text-[#334155]">
                    {row.label}
                  </div>
                  <div className="border-e border-slate-200 px-4 py-4 text-[13px] leading-[1.75] text-[#64748B]">
                    {row.regular}
                  </div>
                  <div
                    className="px-4 py-4 text-[13px] font-semibold leading-[1.75]"
                    style={{ backgroundColor: '#FFF8FB' }}
                  >
                    {row.branding}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-[#D97706]/20 bg-[#2B2B2B] p-7 text-white shadow-[0_18px_50px_rgba(15,23,32,0.12)] md:p-9 text-start">
            <span className="inline-flex rounded-full border border-[#D97706]/22 bg-[#D97706]/12 px-4 py-1.5 text-[13px] font-bold text-[#FFD7A6]">
              מחיר ותנאים
            </span>
            <h2 className="mt-5 text-3xl font-black tracking-tight md:text-4xl">
              2,000 ₪ + מע״מ, חד־פעמי
            </h2>
            <p className="mt-5 text-[16px] leading-[1.9] text-white/76 md:text-[17px]">
              המחיר כולל משרה אחת, בניית דף מעוצב ופרסום למשך עד 60 יום.
              התשלום מבוצע מראש, בתוך עד 3 ימים ממועד הבקשה.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {[
                'ללא עמלת הצלחה נוספת.',
                'המחיר אינו תלוי בכמות הפניות.',
                'התוכן מאושר לפני הפרסום.',
                'אין פתיחת בקשה עבור צד שלישי.',
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[18px] border border-white/10 bg-white/6 p-4 text-[14px] leading-[1.75] text-white/76"
                >
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-7 space-y-4">
              {EXPECTATION_ITEMS.map(({ icon: Icon, title, body }) => (
                <div key={title} className="flex gap-4">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: 'rgba(171,19,78,0.20)' }}
                  >
                    <Icon
                      className="h-5 w-5"
                      style={{ color: BRANDING_COLORS.primaryLight }}
                      aria-hidden="true"
                    />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-black">{title}</h3>
                    <p className="mt-1 text-[13px] leading-[1.8] text-white/68">
                      {body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="faq-branding"
        className="px-4 py-16 md:px-8 md:py-24"
        style={{ backgroundColor: '#F7F7F8' }}
      >
        <div className="mx-auto max-w-6xl rounded-[32px] border border-slate-200 bg-[#EFF0F2] p-5 shadow-[0_20px_60px_rgba(15,23,32,0.06)] md:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
            <div className="relative overflow-hidden rounded-[26px] bg-transparent p-2 text-start md:p-5">
              <div
                className="pointer-events-none absolute -bottom-10 -start-5 select-none text-[118px] font-black leading-none opacity-[0.045] md:text-[160px]"
                aria-hidden="true"
              >
                FAQ
              </div>

              <span
                className="relative inline-flex rounded-full px-4 py-1.5 text-[13px] font-bold"
                style={{
                  backgroundColor: BRANDING_COLORS.primarySoft,
                  color: BRANDING_COLORS.primary,
                }}
              >
                שאלות ותשובות
              </span>
              <h2 className="relative mt-5 text-3xl font-black tracking-tight md:text-4xl">
                כל מה שחשוב לדעת
              </h2>
              <p className="relative mt-4 max-w-md text-[15px] leading-[1.9] text-[#667085]">
                מחיר, תהליך, חומרים, פרסום, ציפיות, ביטול ודחייה — במקום אחד.
              </p>

              <div className="relative mt-8 space-y-3">
                <a
                  href="https://wa.me/972533951003"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-[14px] font-bold text-[#334155] transition hover:opacity-75"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm">
                    <WhatsAppIcon className="h-4 w-4" />
                  </span>
                  יש לכם שאלה נוספת? דברו איתנו
                </a>

                <a
                  href="mailto:info@alldent.co.il"
                  className="flex items-center gap-3 text-[14px] font-bold text-[#334155] transition hover:opacity-75"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm">
                    <Mail
                      className="h-4 w-4"
                      style={{ color: BRANDING_COLORS.primary }}
                      aria-hidden="true"
                    />
                  </span>
                  info@alldent.co.il
                </a>
              </div>
            </div>

            <FAQAccordion items={FAQ_ITEMS} />
          </div>
        </div>
      </section>

      <section className="px-4 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[32px] border border-white/8 bg-[#2D2D2D] shadow-[0_24px_70px_rgba(0,0,0,0.18)]">
          <div className="relative grid gap-8 p-7 text-white md:p-10 lg:grid-cols-[1fr_0.95fr] lg:items-center">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(171,19,78,0.14),transparent_34%)]" />

            <div className="relative text-start">
              <span
                className="inline-flex rounded-full border px-4 py-1.5 text-[13px] font-bold"
                style={{
                  borderColor: 'rgba(232,137,174,0.25)',
                  backgroundColor: 'rgba(171,19,78,0.12)',
                  color: BRANDING_COLORS.primaryLight,
                }}
              >
                מתחילים מכאן
              </span>

              <h2 className="mt-5 text-3xl font-black leading-[1.15] tracking-tight md:text-4xl">
                מוכנים להפוך את הסיפור שלכם
                <span
                  className="mt-1 block"
                  style={{ color: BRANDING_COLORS.primaryLight }}
                >
                  לאסטרטגיית גיוס?
                </span>
              </h2>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  'דף משרה מעוצב',
                  'פרסום עד 60 יום',
                  'ללא עמלת הצלחה',
                  'אישור לפני פרסום',
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 text-[14px] font-bold text-white/80"
                  >
                    <CheckCircle2
                      className="h-4 w-4 shrink-0"
                      style={{ color: BRANDING_COLORS.primaryLight }}
                      aria-hidden="true"
                    />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative text-start">
              <div className="mb-4 flex items-center gap-3 text-[13px] font-black text-white/72">
                <ArrowDown className="h-5 w-5 animate-bounce text-[#E889AE]" aria-hidden="true" />
                לחצו כאן כדי לפתוח את בקשת הגיוס
              </div>

              <label
                className={`flex cursor-pointer items-start gap-2.5 rounded-[14px] border px-4 py-3 text-start transition-colors ${
                  termsError && !termsAccepted
                    ? 'border-red-300/60 bg-red-500/10'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(event) => {
                    setTermsAccepted(event.target.checked)
                    if (event.target.checked) setTermsError(false)
                  }}
                  className="mt-1 h-4 w-4 rounded border-white/30 accent-[#AB134E]"
                />
                <span className="text-[13px] leading-[1.75] text-white/72">
                  קראתי את תנאי המסלול, לרבות המחיר, משך הפרסום,
                  מדיניות הביטול ותהליך העבודה.
                </span>
              </label>

              {termsError && !termsAccepted && (
                <p className="mt-3 text-[13px] font-semibold text-red-300" role="alert">
                  יש לאשר את תנאי המסלול לפני המעבר לפתיחת המשרה.
                </p>
              )}

              <button
                type="button"
                onClick={handleContinue}
                className={`${PRIMARY_CTA_CLASS} mt-5 w-full sm:w-auto`}
              >
                <ClipboardList className="h-4 w-4" aria-hidden="true" />
                פתיחת בקשת גיוס
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
