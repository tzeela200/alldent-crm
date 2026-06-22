import { Link } from 'react-router-dom'
import {
  MessageCircle,
  ArrowRight,
  ClipboardList,
  ShieldCheck,
  Target,
  Clock,
  LockKeyhole,
  CheckCircle2,
  FileText,
  SlidersHorizontal,
  Megaphone,
  Filter,
  Users,
} from 'lucide-react'

const WHATSAPP_CLASS =
  'inline-flex min-h-[44px] items-center gap-2 rounded-[18px] bg-[#D97706] px-6 py-3 text-[14px] font-bold text-white shadow-[0_10px_24px_rgba(217,119,6,0.24)] transition-all duration-200 hover:bg-[#B45309] hover:-translate-y-0.5'
const PRIMARY_CTA_CLASS =
  'inline-flex min-h-[44px] items-center gap-2 rounded-[18px] bg-[#008080] px-6 py-3 text-[14px] font-bold text-white shadow-[0_10px_24px_rgba(0,128,128,0.20)] transition-all duration-200 hover:bg-[#006D6D] hover:-translate-y-0.5'
const BACK_CTA_CLASS =
  'inline-flex min-h-[44px] items-center gap-2 rounded-[18px] border border-white/12 bg-white/8 px-6 py-3 text-[14px] font-bold text-white shadow-sm backdrop-blur transition-all duration-200 hover:border-white/20 hover:bg-white/12'

const audienceCards = [
  {
    title: 'החלפת עובד קיים',
    body: 'כאשר נדרש גיוס מבלי ליצור חשיפה מיותרת.',
  },
  {
    title: 'גיוס רגיש',
    body: 'כאשר יש צורך בתהליך דיסקרטי.',
  },
  {
    title: 'שמירה על פרטיות',
    body: 'פרסום ללא חשיפת שם המרפאה.',
  },
  {
    title: 'גיוס ממוקד',
    body: 'קבלת מועמדים בהתאם לדרישות שהוגדרו.',
  },
]

const processSteps = [
  {
    step: 'שלב 1',
    title: 'פתיחת בקשת גיוס',
    body: 'מילוי פרטי המשרה והדרישות.',
    icon: FileText,
  },
  {
    step: 'שלב 2',
    title: 'הגדרת קריטריונים',
    body: 'בחירת דרישות ותנאי סף.',
    icon: SlidersHorizontal,
  },
  {
    step: 'שלב 3',
    title: 'פרסום דיסקרטי',
    body: 'המשרה מתפרסמת ללא חשיפת המרפאה.',
    icon: Megaphone,
  },
  {
    step: 'שלב 4',
    title: 'איסוף מועמדויות',
    body: 'קליטת מועמדים רלוונטיים.',
    icon: Filter,
  },
  {
    step: 'שלב 5',
    title: 'קבלת מועמדים',
    body: 'העברת מועמדים מתאימים להמשך התהליך.',
    icon: Users,
  },
]

const benefitCards = [
  {
    icon: LockKeyhole,
    title: 'דיסקרטיות',
    body: 'שמירה על פרטיות המעסיק לאורך תהליך הגיוס.',
  },
  {
    icon: Target,
    title: 'מיקוד',
    body: 'גיוס ממוקד לתפקידים דנטליים.',
  },
  {
    icon: Clock,
    title: 'חיסכון בזמן',
    body: 'תהליך מובנה וברור.',
  },
]

const faqItems = [
  {
    question: 'מהו גיוס דיסקרטי?',
    answer:
      'משרה המתפרסמת ללא חשיפת שם המרפאה או פרטי ההתקשרות בשלב הראשוני.',
  },
  {
    question: 'האם שם המרפאה מופיע בפרסום?',
    answer: 'לא. המשרה מוצגת ללא פרטים מזהים של המרפאה בשלב הראשון.',
  },
  {
    question: 'כמה זמן המשרה מתפרסמת?',
    answer:
      'המשרה מתפרסמת לתקופה מוגדרת במסגרת המסלול ובכפוף לתהליך הגיוס.',
  },
  {
    question: 'איך נשמרת הדיסקרטיות?',
    answer:
      'הפרסום מתבצע ללא חשיפת שם המרפאה ופרטי הקשר עד לשלבים המתקדמים בתהליך.',
  },
  {
    question: 'האם ניתן ליצור קשר לפני פתיחת משרה?',
    answer:
      'כן. ניתן ליצור קשר דרך WhatsApp ולקבל הסבר נוסף על המסלול.',
  },
]

const planCards = [
  {
    title: 'פרסום',
    body: 'משרה דיסקרטית ללא חשיפת המרפאה.',
  },
  {
    title: 'סינון',
    body: 'התאמה בהתאם לדרישות שהוגדרו.',
  },
  {
    title: 'תהליך',
    body: 'ניהול מסודר משלב פתיחת הבקשה ועד קבלת מועמדים.',
  },
]

export default function EmployersDiscreetPage() {
  return (
    <div className="min-h-screen bg-[#f3f4f6] text-[#0f1720]" dir="rtl">
      <section className="relative overflow-hidden bg-[#2b2b2b] px-4 pb-20 pt-8 text-white md:px-8 md:pt-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,128,128,0.18),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(217,119,6,0.10),transparent_18%)]" />
        <div className="pointer-events-none absolute -right-16 top-14 h-64 w-64 rounded-full bg-[#008080]/18 blur-3xl" />
        <div className="pointer-events-none absolute -left-8 bottom-0 h-52 w-52 rounded-full bg-[#D97706]/8 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <div className="mb-6">
            <Link
              to="/employers"
              className={BACK_CTA_CLASS}
            >
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
              חזרה לפתרונות למעסיקים
            </Link>
          </div>

          <div className="grid gap-10 lg:grid-cols-[1.08fr_.92fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-[13px] font-bold text-[#ddf8f7] backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-[#20d3c2]" />
                מסלול דיסקרטי
              </span>

              <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[1] tracking-[-0.04em] md:text-6xl">
                גיוס דיסקרטי
                <span className="mt-2 block text-white/72">למעסיקים בעולם הדנטל</span>
              </h1>

              <div className="mt-6 max-w-3xl space-y-4 text-base leading-8 text-white/75 md:text-lg">
                <p>
                  ישנם מצבים בהם חשוב למעסיק לנהל את תהליך הגיוס בצורה שקטה ומבוקרת.
                </p>
                <p>
                  במסלול זה המשרה מתפרסמת ללא חשיפת שם המרפאה וללא פרטי ההתקשרות בשלב הראשון.
                </p>
                <p>
                  המטרה היא לאפשר תהליך גיוס דיסקרטי לצד חשיפה למועמדים רלוונטיים מעולם הדנטל.
                </p>
              </div>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <a
                  href="https://wa.me/972533959003"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={WHATSAPP_CLASS}
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  דברו איתנו בוואטסאפ
                </a>

                <a href="#process" className={PRIMARY_CTA_CLASS}>
                  <ClipboardList className="h-4 w-4" aria-hidden="true" />
                  לראות את שלבי התהליך
                </a>
              </div>
            </div>

            <div className="relative">
              <div className="rounded-[32px] border border-white/10 bg-white/6 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.22)] backdrop-blur-md md:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[12px] font-bold uppercase tracking-[0.24em] text-[#8fe7e7]">
                      Private Recruit
                    </p>
                    <h3 className="mt-2 text-2xl font-black">תהליך שקט ומבוקר</h3>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#008080]/20">
                    <ShieldCheck className="h-6 w-6 text-[#7cecec]" aria-hidden="true" />
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {planCards.map((item, index) => (
                    <div
                      key={item.title}
                      className="flex items-start gap-3 rounded-2xl bg-white/6 px-4 py-4"
                    >
                      <span
                        className={`mt-1 h-2.5 w-2.5 rounded-full ${
                          index === 0
                            ? 'bg-[#20d3c2]'
                            : index === 1
                            ? 'bg-[#f59e0b]'
                            : 'bg-[#60a5fa]'
                        }`}
                      />
                      <div>
                        <p className="text-[14px] font-bold text-white">{item.title}</p>
                        <p className="mt-1 text-[13px] leading-6 text-white/70">
                          {item.body}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-[24px] border border-[#D97706]/20 bg-[#D97706]/10 p-5">
                  <p className="text-[12px] font-bold text-[#ffd7a6]">שמירה על פרטיות</p>
                  <p className="mt-3 text-2xl font-black text-white">ללא חשיפת המרפאה</p>
                  <p className="mt-2 text-[14px] leading-7 text-white/78">
                    המשרה מוצגת בצורה מכובדת ומקצועית, בלי לחשוף פרטים מזהים בשלב הראשוני.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-4">
            {audienceCards.map((item) => (
              <div
                key={item.title}
                className="rounded-[22px] border border-white/10 bg-white/8 px-5 py-5 text-white backdrop-blur"
              >
                <p className="text-[15px] font-bold">{item.title}</p>
                <p className="mt-2 text-[14px] leading-7 text-white/68">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 md:px-8 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex rounded-full bg-[#E6F3F3] px-4 py-1.5 text-[13px] font-bold text-[#008080]">
              למי זה מתאים
            </span>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-[#0F1720] md:text-4xl">
              כאשר צריך לגייס בצורה שקטה, מדויקת ומבוקרת
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {benefitCards.map(({ icon: Icon, title, body }, index) => (
              <div
                key={title}
                className={`rounded-[28px] border p-7 shadow-[0_16px_40px_rgba(15,23,32,0.05)] ${
                  index === 0
                    ? 'border-[#0F1720]/10 bg-[#ffffff]'
                    : index === 1
                    ? 'border-[#008080]/10 bg-[#f8fbfb]'
                    : 'border-[#D97706]/10 bg-[#fffaf4]'
                }`}
              >
                <div
                  className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${
                    index === 0
                      ? 'bg-[#EEF2F4]'
                      : index === 1
                      ? 'bg-[#E6F3F3]'
                      : 'bg-[#FFF1DE]'
                  }`}
                >
                  <Icon
                    className={`h-6 w-6 ${
                      index === 0
                        ? 'text-[#334155]'
                        : index === 1
                        ? 'text-[#008080]'
                        : 'text-[#D97706]'
                    }`}
                    aria-hidden="true"
                  />
                </div>
                <h3 className="text-[22px] font-black tracking-tight text-[#0F1720]">
                  {title}
                </h3>
                <p className="mt-3 text-[15px] leading-7 text-[#6B7280]">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="process"
        className="relative overflow-hidden bg-[#2b2b2b] px-4 py-20 text-white md:px-8 md:py-24"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,128,128,0.16),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(217,119,6,0.08),transparent_16%)]" />
        <div className="relative mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex rounded-full border border-white/10 bg-white/8 px-4 py-1.5 text-[13px] font-bold text-[#9ceceb]">
              שלבי התהליך
            </span>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-white md:text-4xl">
              כך מתנהל תהליך הגיוס הדיסקרטי
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-5">
            {processSteps.map(({ step, title, body, icon: Icon }) => (
              <div
                key={step}
                className="rounded-[28px] border border-white/8 bg-white/6 p-6 shadow-[0_16px_40px_rgba(0,0,0,0.18)] backdrop-blur-md"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[12px] font-bold text-white/75">
                    {step}
                  </span>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                    <Icon className="h-5 w-5 text-[#7cecec]" aria-hidden="true" />
                  </div>
                </div>

                <h3 className="mt-6 text-[20px] font-black tracking-tight text-white">
                  {title}
                </h3>
                <p className="mt-3 text-[14px] leading-7 text-white/68">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 md:px-8 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-[0_18px_50px_rgba(15,23,32,0.06)] md:p-10">
            <span className="inline-flex rounded-full bg-[#E6F3F3] px-4 py-1.5 text-[13px] font-bold text-[#008080]">
              שאלות נפוצות
            </span>

            <div className="mt-6 space-y-4">
              {faqItems.map((item) => (
                <div
                  key={item.question}
                  className="rounded-[22px] border border-slate-200 bg-[#FAFBFC] p-5"
                >
                  <h3 className="text-[16px] font-black text-[#0F1720]">
                    {item.question}
                  </h3>
                  <p className="mt-2 text-[14px] leading-7 text-[#6B7280]">
                    {item.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-[0_18px_50px_rgba(15,23,32,0.06)] md:p-10">
            <span className="inline-flex rounded-full bg-[#FFF1DE] px-4 py-1.5 text-[13px] font-bold text-[#B45309]">
              פתיחת בקשה
            </span>

            <h2 className="mt-5 text-3xl font-black tracking-tight text-[#0F1720] md:text-4xl">
              פתחו בקשת גיוס ונשמח לסייע לכם
            </h2>

            <p className="mt-5 text-base leading-8 text-[#6B7280] md:text-lg">
              פתחו בקשת גיוס ונשמח לסייע לכם לאתר את המועמדים המתאימים ביותר.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                href="https://wa.me/972533959003"
                target="_blank"
                rel="noopener noreferrer"
                className={WHATSAPP_CLASS}
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                דברו איתנו בוואטסאפ
              </a>

              <Link to="/employers" className={PRIMARY_CTA_CLASS}>
                <ClipboardList className="h-4 w-4" aria-hidden="true" />
                חזרה למסלולים
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}