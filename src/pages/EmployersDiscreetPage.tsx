import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BackLink } from '@/components/public/BackLink'
import {
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FileCheck2,
  FileText,
  Filter,
  LockKeyhole,
  Megaphone,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  UserCheck,
  Users,
} from 'lucide-react'
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon'

const DISCREET_COLORS = {
  primary: '#D9A928',
  primaryDark: '#B88918',
  primaryLight: '#E8CC72',
  primarySoft: '#FBF6E4',
  primaryBorder: 'rgba(217,169,40,0.22)',
  teal: '#008080',
}

const HERO_HIGHLIGHTS = [
  'ללא חשיפת שם המרפאה',
  'סינון לפי דרישות המשרה',
  'תהליך אישי, שקט ומבוקר',
]

const FIT_ITEMS = [
  {
    title: 'החלפת עובד קיים',
    body: 'כאשר צריך לגייס מבלי ליצור חשיפה מיותרת בתוך המרפאה או מול הצוות.',
  },
  {
    title: 'משרה רגישה',
    body: 'כאשר זהות המעסיק ופרטי ההתקשרות צריכים להישאר חסויים בשלב הראשון.',
  },
  {
    title: 'גיוס ממוקד',
    body: 'כאשר חשוב לקבל מועמדים לפי תנאי סף וקריטריונים שהוגדרו מראש.',
  },
  {
    title: 'חיסכון בזמן',
    body: 'כאשר רוצים לנהל את הפניות בצורה מסודרת ולהתמקד במועמדים רלוונטיים.',
  },
]

const PROCESS_STEPS = [
  {
    id: '01',
    icon: FileText,
    eyebrow: 'הגדרת הצורך',
    title: 'פותחים בקשת גיוס',
    body:
      'ממלאים את פרטי המשרה, היקף העבודה, הדרישות, השעות, השכר וכל מידע שחשוב לתהליך.',
    value:
      'נקודת פתיחה מדויקת שמצמצמת פערים ומאפשרת לבנות פרסום נכון.',
  },
  {
    id: '02',
    icon: SlidersHorizontal,
    eyebrow: 'דיוק הקריטריונים',
    title: 'מגדירים תנאי סף',
    body:
      'מחדדים ניסיון, הסמכות, זמינות, אזור, שפות, ניידות ודרישות מקצועיות נוספות.',
    value:
      'יותר מיקוד ופחות פניות שאינן תואמות לצורך האמיתי של המרפאה.',
  },
  {
    id: '03',
    icon: Megaphone,
    eyebrow: 'פרסום אנונימי',
    title: 'המשרה עולה ללא פרטים מזהים',
    body:
      'שם המרפאה ופרטי ההתקשרות אינם מופיעים בפרסום בשלב הראשון.',
    value:
      'הגנה על פרטיות המעסיק לצד חשיפה מקצועית למועמדים רלוונטיים.',
  },
  {
    id: '04',
    icon: Filter,
    eyebrow: 'קליטת מועמדויות',
    title: 'המועמדים מגישים מועמדות',
    body:
      'המועמדים נחשפים לפרטי התפקיד, מגישים מועמדות ועונים על שאלות בהתאם למסלול.',
    value:
      'תהליך מסודר שמאפשר להבין מי עומד בדרישות לפני העברת הפרטים.',
  },
  {
    id: '05',
    icon: UserCheck,
    eyebrow: 'אישור והעברת פרטים',
    title: 'פרטי המועמד מועברים בהסכמה',
    body:
      'פרטי מועמד מועברים רק לאחר שהגיש מועמדות ואישר להעביר את פרטיו למעסיק.',
    value:
      'שקיפות מול המועמד ושמירה על פרטיות שני הצדדים.',
  },
  {
    id: '06',
    icon: Users,
    eyebrow: 'המשך תהליך',
    title: 'מקבלים מועמדים להמשך בחינה',
    body:
      'המועמדים המתאימים מועברים להמשך שיחה, ראיון וקבלת החלטה אצל המעסיק.',
    value:
      'המרפאה מתמקדת באנשים הרלוונטיים במקום לנהל עומס של פניות לא ממוקדות.',
  },
]

const PRIVACY_ROWS = [
  {
    label: 'שם המרפאה',
    firstStage: 'אינו מופיע בפרסום',
    laterStage: 'נמסר בהמשך התהליך בהתאם להתקדמות',
  },
  {
    label: 'פרטי התקשרות',
    firstStage: 'אינם מוצגים לציבור',
    laterStage: 'התקשורת מתבצעת בצורה מבוקרת',
  },
  {
    label: 'פרטי המועמד',
    firstStage: 'נשמרים במערכת',
    laterStage: 'מועברים רק לאחר אישור המועמד',
  },
  {
    label: 'דרישות המשרה',
    firstStage: 'מוצגות באופן מקצועי וברור',
    laterStage: 'משמשות לסינון ולהמשך הבחינה',
  },
]

const EXPECTATION_ITEMS = [
  {
    icon: CheckCircle2,
    title: 'פרסום עד 45 יום',
    body:
      'המשרה מתפרסמת עד 45 יום או עד לעדכון שהמשרה אינה רלוונטית — המוקדם מביניהם.',
  },
  {
    icon: BarChart3,
    title: 'סינון מועמדים והתאמה אישית',
    body:
      'המסלול מוגדר לעד 10 מועמדים פוטנציאליים המותאמים לדרישות המשרה.',
  },
  {
    icon: ShieldCheck,
    title: 'אפשרות להארכת הפרסום',
    body:
      'אם בתוך 30 יום נשלחו פחות מ־5 מועמדים, קיימת אפשרות להאריך את הפרסום ב־30 יום נוספים ללא תשלום.',
  },
]

const FAQ_ITEMS = [
  {
    id: '01',
    question: 'מהו מסלול גיוס אישי ודיסקרטי?',
    answer:
      'מסלול שבו המשרה מתפרסמת ללא חשיפת שם המרפאה וללא פרטי ההתקשרות בשלב הראשון, תוך ניהול מבוקר של המועמדויות.',
  },
  {
    id: '02',
    question: 'האם שם המרפאה מופיע בפרסום?',
    answer:
      'לא. שם המרפאה ופרטי ההתקשרות אינם מוצגים בפרסום הציבורי בשלב הראשון.',
  },
  {
    id: '03',
    question: 'תוך כמה זמן המשרה מתפרסמת?',
    answer:
      'הפרסום מתבצע בתוך עד 3 ימי עסקים ממועד פתיחת הבקשה, בכפוף לקבלת המידע הנדרש.',
  },
  {
    id: '04',
    question: 'לכמה זמן המשרה מתפרסמת?',
    answer:
      'המשרה מתפרסמת למשך עד 45 יום או עד לעדכון שהמשרה אינה רלוונטית — המוקדם מביניהם.',
  },
  {
    id: '05',
    question: 'כמה מועמדים ניתן לקבל במסגרת המסלול?',
    answer:
      'המסלול מוגדר לעד 10 מועמדים פוטנציאליים המותאמים לדרישות המשרה.',
  },
  {
    id: '06',
    question: 'איך נשמרת פרטיות המועמד?',
    answer:
      'פרטי מועמד מועברים רק לאחר שהגיש מועמדות ואישר להעביר את פרטיו למעסיק.',
  },
  {
    id: '07',
    question: 'כמה עולה פתיחת המסלול?',
    answer:
      'דמי פתיחת המסלול הם 500 ₪ + מע״מ. דמי הפתיחה נפרדים מעמלת האיוש ואינם מותנים בכמות הפניות.',
  },
  {
    id: '08',
    question: 'מהי עמלת האיוש?',
    answer:
      'עמלת האיוש נקבעת לפי סוג התפקיד: רופאי שיניים, מומחים, מנהלים ותועמלנות — 4,000 ₪; סייעות ומזכירות — 3,500 ₪; שינניות וטכנאי שיניים — 3,000 ₪. המחירים אינם כוללים מע״מ.',
  },
  {
    id: '09',
    question: 'מתי משלמים את עמלת האיוש?',
    answer:
      'עמלת האיוש מחולקת לשני תשלומים שווים: הראשון לאחר 30 יום מתחילת העבודה והשני לאחר 60 יום. ימי חפיפה נחשבים ימי עבודה.',
  },
  {
    id: '10',
    question: 'מה קורה אם ההעסקה מסתיימת?',
    answer:
      'סיום בחודש הראשון אינו מחויב בעמלת איוש. סיום במהלך החודש השני מזכה בהחזר של 25% מהתשלום הראשון. לאחר 60 יום אין החזר כספי. אם ההתקשרות מסתיימת עד 3 חודשים, המשרה מתפרסמת מחדש ללא עלות למשך 45 יום נוספים.',
  },
  {
    id: '11',
    question: 'אפשר לדחות את השירות לאחר פתיחת הבקשה?',
    answer:
      'דמי ההקמה אינם ניתנים לביטול, אך בתוך 3 ימי עסקים ניתן לדחות את השירות ולשמור את היתרה למשך עד 12 חודשים עבור משרה עתידית.',
  },
  {
    id: '12',
    question: 'אפשר לבקש דיסקרטיות מול אדם מסוים?',
    answer:
      'כן. ניתן למסור שם ומספר נייד של עובד מסוים כדי שנוכל לזהות אותו ולפעול בהתאם לבקשת הדיסקרטיות.',
  },
]

const WHATSAPP_CLASS =
  'inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] bg-[#D97706] px-6 py-3 text-[14px] font-bold text-white shadow-[0_10px_24px_rgba(217,119,6,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#B45309]'

const PRIMARY_CTA_CLASS =
  'inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] bg-[#008080] px-6 py-3 text-[14px] font-bold text-white shadow-[0_10px_24px_rgba(0,128,128,0.20)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#006D6D]'

function ProcessTimeline() {
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
    PROCESS_STEPS.length <= 1
      ? 100
      : (activeStep / (PROCESS_STEPS.length - 1)) * 100

  return (
    <section
      id="process"
      className="relative overflow-hidden bg-[#2D2D2D] px-4 py-20 text-white md:px-8 md:py-28"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(217,169,40,0.10),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(217,169,40,0.05),transparent_26%)]" />

      <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-flex rounded-full border border-[#E8CC72]/28 bg-[#D9A928]/10 px-4 py-1.5 text-[13px] font-bold text-[#E8CC72]">
            תהליך אישי, שקט ומבוקר
          </span>

          <h2 className="mt-5 text-3xl font-black tracking-tight text-[#E8CC72] md:text-5xl">
            כך מתנהל מסלול הגיוס הדיסקרטי
          </h2>

          <p className="mx-auto mt-5 max-w-3xl text-[16px] leading-[1.95] text-white/72 md:text-[18px]">
            בכל שלב נשמר איזון בין חשיפה מקצועית של המשרה, פרטיות המעסיק
            והעברת מועמדים בצורה מבוקרת ובהסכמה.
          </p>
        </div>

        <div className="relative mt-16">
          <div className="pointer-events-none absolute bottom-0 end-1/2 top-0 hidden w-px translate-x-1/2 bg-white/10 md:block" />
          <div
            className="pointer-events-none absolute end-1/2 top-0 hidden w-px translate-x-1/2 bg-[#D9A928] transition-[height] duration-500 ease-out md:block"
            style={{ height: `${progress}%` }}
          />

          <div className="space-y-16 md:space-y-24">
            {PROCESS_STEPS.map(
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
                            <p className="text-[12px] font-black tracking-[0.08em] text-[#E8CC72]">
                              {eyebrow}
                            </p>
                            <h3 className="mt-2 text-[22px] font-black leading-[1.35]">
                              {title}
                            </h3>
                          </div>

                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#D9A928]/16">
                            <Icon
                              className="h-5 w-5 text-[#E8CC72]"
                              aria-hidden="true"
                            />
                          </div>
                        </div>

                        <p className="mt-4 text-[15px] leading-[1.9] text-white/72">
                          {body}
                        </p>

                        <div className="mt-5 rounded-[16px] border border-[#D9A928]/20 bg-[#D9A928]/8 px-4 py-3">
                          <p className="text-[12px] font-black text-[#F3D87D]">
                            הערך בתהליך
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

                    <div className="md:hidden">
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
        const contentId = `discreet-faq-${item.id}`

        return (
          <div
            key={item.id}
            className={`overflow-hidden rounded-[16px] border transition-all duration-300 ${
              isOpen
                ? 'bg-[#FFFBF0] shadow-[0_12px_30px_rgba(15,23,32,0.07)]'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
            style={{
              borderColor: isOpen
                ? DISCREET_COLORS.primaryBorder
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
                      ? DISCREET_COLORS.primary
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
                    ? DISCREET_COLORS.primary
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

export default function EmployersDiscreetPage() {
  const navigate = useNavigate()
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [termsError, setTermsError] = useState(false)

  const handleContinue = () => {
    if (!termsAccepted) {
      setTermsError(true)
      return
    }

    navigate('/employers/recruitment-request?plan=discreet', {
      state: { plan: 'discreet', termsAccepted: true },
    })
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-[#0F1720]" dir="rtl">
      <section className="relative overflow-hidden bg-[#2D2D2D] px-4 pb-16 pt-6 text-white md:px-8 md:pb-20 md:pt-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(217,169,40,0.12),transparent_30%),linear-gradient(135deg,#232323_0%,#2D2D2D_52%,#202020_100%)]" />
        <div className="pointer-events-none absolute end-[-5rem] top-10 h-64 w-64 rounded-full bg-[#D9A928]/12 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <BackLink to="/employers">חזרה למסלולי הגיוס</BackLink>

          <div className="mt-8 grid gap-10 lg:grid-cols-[1.12fr_0.88fr] lg:items-center">
            <div className="text-start">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#E8CC72]/28 bg-[#D9A928]/10 px-4 py-2 text-[13px] font-bold text-[#E8CC72] backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-[#E8CC72]" />
                Personal Recruit
              </span>

              <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[1.06] tracking-[-0.04em] md:text-6xl lg:text-[64px]">
                גיוס אישי
                <span className="mt-2 block text-[#E8CC72]">
                  שירות סינון מועמדים, דיסקרטיות ומיקוד
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-[17px] leading-[1.85] text-white/78 md:text-[19px]">
                מסלול גיוס שמאפשר לפרסם משרה, לאתר מועמדים ולנהל את התהליך —
                בלי לחשוף את שם המרפאה או את פרטי ההתקשרות בשלב הראשון.
              </p>

              <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[14px] font-bold text-white/82">
                {HERO_HIGHLIGHTS.map((item) => (
                  <span key={item} className="inline-flex items-center gap-2">
                    <CheckCircle2
                      className="h-4 w-4 text-[#E8CC72]"
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
                    דמי פתיחת המסלול
                  </p>
                  <p className="mt-2 text-4xl font-black text-white">
                    500 ₪
                  </p>
                  <p className="mt-1 text-[15px] font-bold text-white/68">
                    + מע״מ · בנוסף למחירון הצלחת גיוס
                  </p>
                </div>

                <span className="rounded-full border border-[#D9A928]/30 bg-[#D9A928]/10 px-3 py-1.5 text-[12px] font-black text-[#E8CC72]">
                  פרסום עד 45 יום
                </span>
              </div>

              <div className="mt-6 space-y-3 border-t border-white/10 pt-5">
                {[
                  'סינון מועמדים והתאמה אישית',
                  'פרסום ללא חשיפת שם המרפאה',
                  'פרטי מועמד מועברים רק לאחר אישורו',
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 text-[14px] font-semibold text-white/78"
                  >
                    <CheckCircle2
                      className="h-4 w-4 shrink-0 text-[#E8CC72]"
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
            <span className="inline-flex rounded-full bg-[#FBF6E4] px-4 py-1.5 text-[13px] font-bold text-[#B88918]">
              למי המסלול מתאים
            </span>

            <h2 className="mt-5 text-3xl font-black tracking-tight md:text-4xl">
              גיוס מקצועי בלי לחשוף את המרפאה בשלב הראשון
            </h2>

            <p className="mt-5 text-[16px] leading-[1.9] text-[#667085] md:text-[18px]">
              המסלול נועד למצבים שבהם צריך לנהל את הגיוס בשקט, לשמור על פרטיות
              ולבחון מועמדים בצורה מסודרת לפני חשיפת זהות המעסיק.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {FIT_ITEMS.map((item, index) => (
              <div
                key={item.title}
                className={`rounded-[24px] border p-5 text-start shadow-[0_12px_34px_rgba(15,23,32,0.045)] ${
                  index === 2
                    ? 'border-[#D97706]/12 bg-[#FFFAF4]'
                    : 'border-[#D9A928]/18 bg-white'
                }`}
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

      <ProcessTimeline />

      <section className="px-4 py-16 md:px-8 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_1fr] lg:items-start">
          <div className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-[0_18px_50px_rgba(15,23,32,0.06)] md:p-9 text-start">
            <span className="inline-flex rounded-full bg-[#FBF6E4] px-4 py-1.5 text-[13px] font-bold text-[#B88918]">
              איך נשמרת הדיסקרטיות
            </span>

            <h2 className="mt-5 text-3xl font-black tracking-tight md:text-4xl">
              מה נחשף — ובאיזה שלב
            </h2>

            <div className="mt-8 overflow-hidden rounded-[22px] border border-slate-200">
              <div className="grid grid-cols-[0.8fr_1fr_1fr] bg-[#F8FAFC]">
                <div className="border-e border-slate-200 px-4 py-4 text-[12px] font-black text-[#64748B]">
                  נושא
                </div>
                <div className="border-e border-slate-200 px-4 py-4 text-[12px] font-black text-[#64748B]">
                  בשלב הפרסום
                </div>
                <div className="px-4 py-4 text-[12px] font-black text-[#B88918]">
                  בהמשך התהליך
                </div>
              </div>

              {PRIVACY_ROWS.map((row, index) => (
                <div
                  key={row.label}
                  className={`grid grid-cols-[0.8fr_1fr_1fr] ${
                    index !== PRIVACY_ROWS.length - 1
                      ? 'border-t border-slate-200'
                      : ''
                  }`}
                >
                  <div className="border-e border-slate-200 bg-[#F8FAFC] px-4 py-4 text-[13px] font-bold text-[#334155]">
                    {row.label}
                  </div>
                  <div className="border-e border-slate-200 px-4 py-4 text-[13px] leading-[1.75] text-[#64748B]">
                    {row.firstStage}
                  </div>
                  <div className="bg-[#FFFBF0] px-4 py-4 text-[13px] font-semibold leading-[1.75]">
                    {row.laterStage}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-[#D9A928]/20 bg-[#2D2D2D] p-7 text-white shadow-[0_18px_50px_rgba(15,23,32,0.12)] md:p-9 text-start">
            <span className="inline-flex rounded-full border border-[#D9A928]/22 bg-[#D9A928]/12 px-4 py-1.5 text-[13px] font-bold text-[#FFD7A6]">
              מחיר ותנאים
            </span>

            <h2 className="mt-5 text-3xl font-black tracking-tight md:text-4xl">
              500 ₪ + מע״מ לפתיחת המסלול
            </h2>

            <p className="mt-5 text-[16px] leading-[1.9] text-white/76 md:text-[17px]">
              דמי הפתיחה כוללים הקמת משרה ופרסום למשך עד 45 יום. במקרה של איוש
              משולמת עמלת הצלחה בהתאם לסוג התפקיד.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {[
                {
                  role: 'רופאים, מומחים, מנהלים ותועמלנות',
                  price: '4,000 ₪',
                },
                {
                  role: 'סייעות ומזכירות',
                  price: '3,500 ₪',
                },
                {
                  role: 'שינניות וטכנאי שיניים',
                  price: '3,000 ₪',
                },
              ].map((item) => (
                <div
                  key={item.role}
                  className="rounded-[18px] border border-white/10 bg-white/6 p-4 text-[14px] leading-[1.75]"
                >
                  <span className="text-white/76">{item.role}: </span>
                  <span className="font-black text-[#E8CC72]">
                    {item.price}
                  </span>
                </div>
              ))}

              <div className="rounded-[18px] border border-white/10 bg-white/6 p-4 text-[14px] leading-[1.75] text-white/76">
                המחירים אינם כוללים מע״מ
              </div>
            </div>

            <div className="mt-7 space-y-4">
              {EXPECTATION_ITEMS.map(({ icon: Icon, title, body }) => (
                <div key={title} className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#D9A928]/16">
                    <Icon
                      className="h-5 w-5 text-[#E8CC72]"
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
        id="faq-discreet"
        className="bg-[#F7F7F8] px-4 py-16 md:px-8 md:py-24"
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

              <span className="relative inline-flex rounded-full bg-[#FBF6E4] px-4 py-1.5 text-[13px] font-bold text-[#B88918]">
                שאלות ותשובות
              </span>

              <h2 className="relative mt-5 text-3xl font-black tracking-tight md:text-4xl">
                כל מה שחשוב לדעת
              </h2>

              <p className="relative mt-4 max-w-md text-[15px] leading-[1.9] text-[#667085]">
                פרטיות, מחיר, פרסום, מועמדים, תשלום, אחריות ודחיית השירות —
                במקום אחד.
              </p>

              <div className="relative mt-8 space-y-3">
                <a
                  href="https://wa.me/972533951003"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-[14px] font-bold text-[#334155] transition hover:opacity-75"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm">
                    <WhatsAppIcon className="h-4 w-4 text-[#B88918]" />
                  </span>
                  יש לכם שאלה נוספת? דברו איתנו
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
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(217,169,40,0.12),transparent_34%)]" />

            <div className="relative text-start">
              <span className="inline-flex rounded-full border border-[#E8CC72]/28 bg-[#D9A928]/10 px-4 py-1.5 text-[13px] font-bold text-[#E8CC72]">
                מתחילים מכאן
              </span>

              <h2 className="mt-5 text-3xl font-black leading-[1.15] tracking-tight md:text-4xl">
                צריכים לגייס בשקט
                <span className="mt-1 block text-[#E8CC72]">
                  ולקבל מועמדים בצורה מבוקרת?
                </span>
              </h2>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  'פרסום ללא שם המרפאה',
                  'עד 45 ימי פרסום',
                  'סינון לפי דרישות',
                  'העברת פרטים בהסכמה',
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 text-[14px] font-bold text-white/80"
                  >
                    <CheckCircle2
                      className="h-4 w-4 shrink-0 text-[#E8CC72]"
                      aria-hidden="true"
                    />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative text-start">
              <div className="mb-4 flex items-center gap-3 text-[13px] font-black text-white/72">
                <ArrowDown
                  className="h-5 w-5 animate-bounce text-[#E8CC72]"
                  aria-hidden="true"
                />
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
                  className="mt-1 h-4 w-4 rounded border-white/30 accent-[#D9A928]"
                />
                <span className="text-[13px] leading-[1.75] text-white/72">
                  קראתי את תנאי המסלול, לרבות דמי הפתיחה, עמלת האיוש,
                  משך הפרסום, מדיניות הביטול והאחריות.
                </span>
              </label>

              {termsError && !termsAccepted && (
                <p
                  className="mt-3 text-[13px] font-semibold text-red-300"
                  role="alert"
                >
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
