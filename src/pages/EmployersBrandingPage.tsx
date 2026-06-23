import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  Camera,
  CheckCircle2,
  ClipboardList,
  HeartHandshake,
  ImagePlus,
  MessageCircle,
  PlaySquare,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'

const HERO_HIGHLIGHTS = [
  'עמוד מעסיק ייעודי',
  'הצגת המרפאה והצוות',
  'חיזוק המותג המעסיק',
]

const INCLUDED_ITEMS = [
  {
    icon: Building2,
    title: 'עמוד מעסיק ייעודי',
    body: 'עמוד ייעודי המציג את המרפאה ואת סביבת העבודה.',
  },
  {
    icon: Users,
    title: 'הצגת הצוות',
    body: 'חשיפה של האנשים שמרכיבים את המרפאה.',
  },
  {
    icon: Camera,
    title: 'תמונות וסרטונים',
    body: 'המחשה אמיתית של סביבת העבודה.',
  },
  {
    icon: Sparkles,
    title: 'סיפור המעסיק',
    body: 'הצגת הערכים, התרבות הארגונית והחזון.',
  },
  {
    icon: HeartHandshake,
    title: 'יצירת אמון',
    body: 'מועמדים מקבלים תמונה ברורה יותר על מקום העבודה.',
  },
  {
    icon: BadgeCheck,
    title: 'חיזוק המותג',
    body: 'בנייה ארוכת טווח של תדמית המעסיק.',
  },
]

const FIT_ITEMS = [
  {
    title: 'מרפאות בצמיחה',
    body: 'המגייסות באופן קבוע.',
  },
  {
    title: 'מרפאות פרטיות',
    body: 'המעוניינות להציג את הייחוד שלהן.',
  },
  {
    title: 'גיוסים מאתגרים',
    body: 'כאשר קשה למצוא מועמדים איכותיים.',
  },
  {
    title: 'בניית מוניטין',
    body: 'למרפאות שרוצות לחזק את נראות המעסיק שלהן לאורך זמן.',
  },
]

const COMPARISON_ROWS = [
  {
    regular: 'התמקדות במשרה בלבד.',
    branding: 'הצגת המרפאה והמשרה יחד.',
  },
  {
    regular: 'מידע בסיסי.',
    branding: 'תוכן רחב יותר על מקום העבודה.',
  },
  {
    regular: 'גיוס נקודתי.',
    branding: 'חיזוק נראות המעסיק לאורך זמן.',
  },
]

const FAQ_ITEMS = [
  {
    question: 'מהו מיתוג מעסיקים?',
    answer:
      'תהליך שבו המרפאה מוצגת כמקום עבודה אטרקטיבי באמצעות תוכן, תמונות ומידע על סביבת העבודה.',
  },
  {
    question: 'מה כולל עמוד המעסיק?',
    answer:
      'הצגת המרפאה, הצוות, סביבת העבודה ומידע נוסף המסייע למועמדים להכיר אתכם.',
  },
  {
    question: 'האם ניתן להציג תמונות?',
    answer: 'כן. ניתן לשלב תמונות רלוונטיות של המרפאה וסביבת העבודה.',
  },
  {
    question: 'האם ניתן להציג סרטונים?',
    answer: 'כן. ניתן לשלב סרטונים בהתאם לתהליך ההקמה של העמוד.',
  },
  {
    question: 'למי מתאים המסלול?',
    answer:
      'למרפאות שמעוניינות ליצור חשיפה רחבה יותר ולחזק את המותג המעסיק שלהן.',
  },
]

const TERMS_ITEMS = [
  {
    icon: ImagePlus,
    title: 'חשיפה',
    body: 'יצירת עמוד מעסיק ייעודי.',
  },
  {
    icon: PlaySquare,
    title: 'תוכן',
    body: 'שילוב מידע, תמונות ותוכן על המרפאה.',
  },
  {
    icon: BriefcaseBusiness,
    title: 'תהליך עבודה',
    body: 'איסוף חומרים, הקמת עמוד ופרסום.',
  },
]

const WHATSAPP_CLASS =
  'inline-flex min-h-[44px] items-center gap-2 rounded-[18px] bg-[#D97706] px-6 py-3 text-[14px] font-bold text-white shadow-[0_10px_24px_rgba(217,119,6,0.24)] transition-all duration-200 hover:bg-[#B45309] hover:-translate-y-0.5'
const PRIMARY_CTA_CLASS =
  'inline-flex min-h-[44px] items-center gap-2 rounded-[18px] bg-[#008080] px-6 py-3 text-[14px] font-bold text-white shadow-[0_10px_24px_rgba(0,128,128,0.20)] transition-all duration-200 hover:bg-[#006D6D] hover:-translate-y-0.5'
const BACK_CTA_CLASS =
  'inline-flex min-h-[44px] items-center gap-2 rounded-[18px] border border-white/12 bg-white/8 px-6 py-3 text-[14px] font-bold text-white shadow-sm backdrop-blur transition-all duration-200 hover:border-white/20 hover:bg-white/12'

export default function EmployersBrandingPage() {
  return (
    <div className="min-h-screen bg-[#f3f4f6] text-[#0f1720]" dir="rtl">
      <section className="relative overflow-hidden bg-[#2b2b2b] px-4 pb-20 pt-8 text-white md:px-8 md:pt-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,128,128,0.20),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(217,119,6,0.12),transparent_20%)]" />
        <div className="pointer-events-none absolute -right-16 top-16 h-64 w-64 rounded-full bg-[#008080]/18 blur-3xl" />
        <div className="pointer-events-none absolute -left-8 bottom-4 h-56 w-56 rounded-full bg-[#D97706]/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <div className="mb-6">
            <Link to="/employers" className={BACK_CTA_CLASS}>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
              חזרה לפתרונות למעסיקים
            </Link>
          </div>

          <div className="grid gap-10 lg:grid-cols-[1.04fr_.96fr] lg:items-center">
            <div>
              <div className="flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-[13px] font-bold text-[#ddf8f7] backdrop-blur">
                  <span className="h-2 w-2 rounded-full bg-[#20d3c2]" />
                  Employer Branding
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#D97706]/25 bg-[#D97706]/10 px-4 py-2 text-[13px] font-bold text-[#ffd7a6] backdrop-blur">
                  <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  מסלול פרימיום
                </span>
              </div>

              <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[1] tracking-[-0.04em] md:text-6xl">
                מיתוג מעסיקים
                <span className="mt-2 block text-[#24c7bf]">בעולם הדנטל</span>
              </h1>

              <p className="mt-6 max-w-3xl text-base leading-8 text-white/75 md:text-lg">
                סביבת עבודה מקצועית, צוות איכותי, טכנולוגיות מתקדמות ותהליך קליטה מסודר לאנשי מקצוע דנטליים.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {HERO_HIGHLIGHTS.map((item, index) => (
                  <div
                    key={item}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-bold backdrop-blur ${
                      index === 2
                        ? 'border-[#D97706]/30 bg-[#D97706]/10 text-[#ffd7a6]'
                        : 'border-white/12 bg-white/8 text-white/88'
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        index === 2 ? 'bg-[#f59e0b]' : 'bg-[#20d3c2]'
                      }`}
                    />
                    <span>{item}</span>
                  </div>
                ))}
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

                <a href="#included" className={PRIMARY_CTA_CLASS}>
                  <ClipboardList className="h-4 w-4" aria-hidden="true" />
                  לראות מה כלול במסלול
                </a>
              </div>
            </div>

            <div className="relative">
              <div className="rounded-[32px] border border-white/10 bg-white/6 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.22)] backdrop-blur-md md:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[12px] font-bold uppercase tracking-[0.24em] text-[#8fe7e7]">
                      Brand Presence
                    </p>
                    <h3 className="mt-2 text-2xl font-black">עמוד שמציג אתכם נכון</h3>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#008080]/20">
                    <ShieldCheck className="h-6 w-6 text-[#7cecec]" aria-hidden="true" />
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[24px] border border-white/10 bg-white/6 p-5">
                    <p className="text-[12px] font-bold text-[#8fe7e7]">עמוד מעסיק</p>
                    <p className="mt-3 text-xl font-black text-white">יותר ממשרה</p>
                    <p className="mt-2 text-[14px] leading-7 text-white/72">
                      הצגת הערכים, האווירה והיתרונות של מקום העבודה.
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-[#D97706]/20 bg-[#D97706]/10 p-5">
                    <p className="text-[12px] font-bold text-[#ffd7a6]">מסר למועמדים</p>
                    <p className="mt-3 text-xl font-black text-white">אמון ומשיכה</p>
                    <p className="mt-2 text-[14px] leading-7 text-white/78">
                      חשיפה ברורה יותר של מי אתם ולמה כדאי לעבוד אצלכם.
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-[24px] border border-white/10 bg-[#323232] p-5">
                  <p className="text-[12px] font-bold text-[#8fe7e7]">למה זה עובד</p>
                  <p className="mt-3 text-[15px] leading-7 text-white/75">
                    מועמדים רואים יותר ממשרה, ומקבלים תמונה רחבה יותר של סביבת העבודה, הצוות והתרבות הארגונית עוד לפני הפנייה.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-20 md:px-8 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-[0_18px_50px_rgba(15,23,32,0.06)] md:p-10">
            <span className="inline-flex rounded-full bg-[#E6F3F3] px-4 py-1.5 text-[13px] font-bold text-[#008080]">
              למה זה חשוב
            </span>

            <h2 className="mt-5 text-3xl font-black tracking-tight text-[#0F1720] md:text-4xl">
              עובדים בוחרים כיום לא רק תפקיד — אלא גם מקום עבודה
            </h2>

            <div className="mt-6 space-y-4 text-base leading-8 text-[#4B5563] md:text-lg">
              <p>
                מיתוג מעסיקים מאפשר להציג את המרפאה שלכם בצורה מקצועית באמצעות תוכן, תמונות, מידע על סביבת העבודה והערכים שמובילים אתכם.
              </p>
              <p>
                המטרה היא ליצור חיבור ראשוני איכותי יותר עם מועמדים ולסייע להם להבין מי אתם עוד לפני יצירת הקשר.
              </p>
            </div>

            <div className="mt-8">
              <Link
                to="/jobs"
                className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl border border-slate-200 bg-[#FAFBFC] px-6 py-3 text-[14px] font-bold text-[#0F1720] transition-all duration-200 hover:bg-white"
              >
                צפייה במשרות פתוחות
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {FIT_ITEMS.map((item, index) => (
              <div
                key={item.title}
                className={`rounded-[26px] border p-6 shadow-[0_16px_40px_rgba(15,23,32,0.05)] ${
                  index === 0
                    ? 'border-[#008080]/10 bg-[#f8fbfb]'
                    : index === 1
                    ? 'border-slate-200 bg-white'
                    : index === 2
                    ? 'border-[#D97706]/10 bg-[#fffaf4]'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <p
                  className={`text-[13px] font-bold ${
                    index === 2 ? 'text-[#B45309]' : 'text-[#008080]'
                  }`}
                >
                  מתאים במיוחד
                </p>
                <h3 className="mt-3 text-[22px] font-black tracking-tight text-[#0F1720]">
                  {item.title}
                </h3>
                <p className="mt-3 text-[15px] leading-7 text-[#6B7280]">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="included"
        className="relative overflow-hidden bg-[#2b2b2b] px-4 py-20 text-white md:px-8 md:py-24"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,128,128,0.16),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(217,119,6,0.10),transparent_18%)]" />
        <div className="relative mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex rounded-full border border-white/10 bg-white/8 px-4 py-1.5 text-[13px] font-bold text-[#9ceceb]">
              מה כולל המסלול
            </span>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-white md:text-4xl">
              כל מה שצריך כדי לספר את סיפור המעסיק שלכם
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {INCLUDED_ITEMS.map(({ icon: Icon, title, body }, index) => (
              <div
                key={title}
                className="group relative overflow-hidden rounded-[28px] border border-white/8 bg-white/6 p-7 shadow-[0_16px_40px_rgba(0,0,0,0.18)] backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:bg-white/8"
              >
                <div
                  className={`pointer-events-none absolute -top-12 left-0 h-24 w-24 rounded-full blur-2xl ${
                    index % 2 === 0 ? 'bg-[#008080]/14' : 'bg-[#D97706]/12'
                  }`}
                />
                <div className="relative mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 transition-all duration-300 group-hover:scale-105">
                  <Icon className="h-6 w-6 text-[#7cecec]" aria-hidden="true" />
                </div>
                <h3 className="relative text-[20px] font-black tracking-tight text-white">{title}</h3>
                <p className="relative mt-3 text-[15px] leading-7 text-white/68">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 md:px-8 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.02fr_.98fr] lg:items-start">
          <div className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-[0_18px_50px_rgba(15,23,32,0.06)] md:p-10">
            <span className="inline-flex rounded-full bg-[#FFF1DE] px-4 py-1.5 text-[13px] font-bold text-[#B45309]">
              השוואה
            </span>

            <h2 className="mt-5 text-3xl font-black tracking-tight text-[#0F1720] md:text-4xl">
              מועמדים רואים יותר ממשרה
            </h2>

            <div className="mt-8 overflow-hidden rounded-[24px] border border-slate-200">
              <div className="grid grid-cols-2 bg-[#F8FAFC]">
                <div className="border-l border-slate-200 px-5 py-4 text-[13px] font-black text-[#64748B]">
                  משרה רגילה
                </div>
                <div className="px-5 py-4 text-[13px] font-black text-[#008080]">
                  מיתוג מעסיקים
                </div>
              </div>

              {COMPARISON_ROWS.map((row, index) => (
                <div
                  key={`${row.regular}-${row.branding}`}
                  className={`grid grid-cols-2 ${
                    index !== COMPARISON_ROWS.length - 1 ? 'border-t border-slate-200' : ''
                  }`}
                >
                  <div className="border-l border-slate-200 bg-white px-5 py-5 text-[14px] leading-7 text-[#64748B]">
                    {row.regular}
                  </div>
                  <div className="bg-[#F8FBFB] px-5 py-5 text-[14px] font-semibold leading-7 text-[#0F1720]">
                    {row.branding}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-[0_18px_50px_rgba(15,23,32,0.06)] md:p-10">
            <span className="inline-flex rounded-full bg-[#E6F3F3] px-4 py-1.5 text-[13px] font-bold text-[#008080]">
              תהליך העבודה
            </span>

            <div className="mt-6 space-y-4">
              {TERMS_ITEMS.map(({ icon: Icon, title, body }) => (
                <div
                  key={title}
                  className="flex gap-4 rounded-[22px] border border-slate-200 bg-[#FAFBFC] p-5"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#E6F3F3]">
                    <Icon className="h-5 w-5 text-[#008080]" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-[16px] font-black text-[#0F1720]">{title}</h3>
                    <p className="mt-2 text-[14px] leading-7 text-[#6B7280]">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#2b2b2b] px-4 py-20 text-white md:px-8 md:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,128,128,0.18),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(217,119,6,0.08),transparent_16%)]" />
        <div className="relative mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.98fr_1.02fr] lg:items-start">
          <div className="rounded-[30px] border border-white/10 bg-white/6 p-8 backdrop-blur-md md:p-10">
            <span className="inline-flex rounded-full border border-white/10 bg-white/8 px-4 py-1.5 text-[13px] font-bold text-[#9ceceb]">
              שאלות נפוצות
            </span>

            <div className="mt-6 space-y-4">
              {FAQ_ITEMS.map((item) => (
                <div
                  key={item.question}
                  className="rounded-[22px] border border-white/8 bg-white/6 p-5"
                >
                  <h3 className="text-[16px] font-black text-white">{item.question}</h3>
                  <p className="mt-2 text-[14px] leading-7 text-white/68">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-white/6 p-8 backdrop-blur-md md:p-10">
            <span className="inline-flex rounded-full border border-[#D97706]/20 bg-[#D97706]/10 px-4 py-1.5 text-[13px] font-bold text-[#ffd7a6]">
              התחלה
            </span>

            <h2 className="mt-5 text-3xl font-black tracking-tight text-white md:text-4xl">
              התחילו את תהליך מיתוג המעסיק
            </h2>

            <p className="mt-5 text-base leading-8 text-white/72 md:text-lg">
              התחילו את תהליך מיתוג המעסיק והציגו את סביבת העבודה שלכם למועמדים פוטנציאליים.
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

              <Link to="/employers/recruitment-request" className={PRIMARY_CTA_CLASS}>
                <ClipboardList className="h-4 w-4" aria-hidden="true" />
                פתחו בקשת גיוס
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}