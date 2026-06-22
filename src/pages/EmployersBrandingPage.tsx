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
    answer: 'תהליך שבו המרפאה מוצגת כמקום עבודה אטרקטיבי באמצעות תוכן, תמונות ומידע על סביבת העבודה.',
  },
  {
    question: 'מה כולל עמוד המעסיק?',
    answer: 'הצגת המרפאה, הצוות, סביבת העבודה ומידע נוסף המסייע למועמדים להכיר אתכם.',
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
    answer: 'למרפאות שמעוניינות ליצור חשיפה רחבה יותר ולחזק את המותג המעסיק שלהן.',
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

export default function EmployersBrandingPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF7] text-[#0F0F10]" dir="rtl">
      <main>
        <section className="px-4 pt-6 md:px-8 md:pt-8">
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[32px] bg-[#0F0F10] px-5 py-14 text-center shadow-sm md:px-8 md:py-20">
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#008080]/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 left-0 h-80 w-80 rounded-full bg-[#D97706]/20 blur-3xl" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0)_45%)]" />

            <div className="relative z-10 mx-auto max-w-4xl">
              <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[13px] font-bold text-white">
                מסלול פרימיום
              </span>

              <h1 className="mx-auto mt-7 max-w-4xl text-4xl font-black leading-tight tracking-tight text-white md:text-6xl">
                מיתוג מעסיקים בעולם הדנטל
              </h1>

              <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-white/78 md:text-lg">
                הציגו את המרפאה, סביבת העבודה והצוות שלכם בצורה מקצועית ומדויקת – כדי לחזק את המותג המעסיק ולמשוך מועמדים איכותיים יותר.
              </p>

              <div className="mx-auto mt-8 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
                {HERO_HIGHLIGHTS.map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-[14px] font-semibold text-white/90">
                    {item}
                  </div>
                ))}
              </div>

              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <a
                  href="https://wa.me/972533959003"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full bg-[#D97706] px-6 py-3 text-[14px] font-bold text-white shadow-sm transition-all duration-200 hover:bg-[#B45309]"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  דברו איתנו בוואטסאפ
                </a>
                <Link
                  to="/employers/recruitment-request"
                  className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full bg-[#008080] px-6 py-3 text-[14px] font-bold text-white shadow-sm transition-all duration-200 hover:bg-[#006D6D]"
                >
                  <ClipboardList className="h-4 w-4" aria-hidden="true" />
                  הגישו בקשת גיוס
                </Link>
                <Link
                  to="/employers"
                  className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full border border-white/18 bg-white/10 px-6 py-3 text-[14px] font-bold text-white transition-all duration-200 hover:bg-white hover:text-[#0F0F10]"
                >
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  חזרה למעסיקים
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-24">
          <SectionHeader
            eyebrow="המחשה ויזואלית"
            title="כך עשוי להיראות עמוד המעסיק שלכם"
            subtitle="דוגמה ויזואלית להצגת מרפאה, סביבת עבודה וצוות כחלק ממסלול מיתוג מעסיקים."
          />

          <div className="mx-auto mt-12 max-w-6xl rounded-[32px] border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-[#FAFAF7]">
              <div className="relative bg-[#2D2D2D] px-6 py-10 text-white md:px-10 md:py-12">
                <div className="pointer-events-none absolute left-0 top-0 h-40 w-40 rounded-full bg-[#D97706]/25 blur-3xl" />
                <div className="pointer-events-none absolute -right-16 bottom-0 h-48 w-48 rounded-full bg-[#008080]/30 blur-3xl" />

                <div className="relative z-10 grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-end">
                  <div>
                    <span className="inline-flex rounded-full bg-[#E6F3F3] px-3 py-1 text-[12px] font-bold text-[#008080]">עמוד מעסיק</span>
                    <h3 className="mt-5 text-3xl font-black tracking-tight md:text-4xl">מרפאת דנטל פרימיום</h3>
                    <p className="mt-4 max-w-xl text-base leading-8 text-white/78">
                      סביבת עבודה מקצועית, צוות איכותי, טכנולוגיות מתקדמות ותהליך קליטה מסודר לאנשי מקצוע דנטליים.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="h-28 rounded-3xl bg-white/14 p-3">
                      <div className="h-full rounded-2xl bg-[#008080]/35" />
                    </div>
                    <div className="h-28 rounded-3xl bg-white/14 p-3">
                      <div className="h-full rounded-2xl bg-white/22" />
                    </div>
                    <div className="h-28 rounded-3xl bg-white/14 p-3">
                      <div className="h-full rounded-2xl bg-[#D97706]/35" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-5 p-5 md:grid-cols-[1fr_320px] md:p-8">
                <div className="grid gap-4 sm:grid-cols-3">
                  {['צוות מקצועי', 'סביבת עבודה מתקדמת', 'הכשרה וליווי'].map((item) => (
                    <div key={item} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <CheckCircle2 className="h-5 w-5 text-[#008080]" aria-hidden="true" />
                      <p className="mt-4 text-[15px] font-bold text-[#0F0F10]">{item}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-[13px] font-bold text-[#008080]">מועמדים רואים יותר ממשרה</p>
                  <p className="mt-3 text-[15px] leading-7 text-[#6B7280]">
                    עמוד מעסיק מאפשר למועמדים להבין את האווירה, הערכים והיתרונות של מקום העבודה עוד לפני הפנייה.
                  </p>
                  <span className="mt-5 inline-flex rounded-full bg-[#D97706] px-4 py-2 text-[13px] font-bold text-white">
                    צפייה במשרות פתוחות
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-24">
          <div className="mx-auto max-w-[760px] text-center">
            <span className="text-[13px] font-bold text-[#008080]">הסבר קצר</span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#0F0F10] md:text-4xl">מהו מיתוג מעסיקים?</h2>
            <div className="mt-6 space-y-4 text-base leading-8 text-[#4B5563] md:text-lg">
              <p>עובדים בוחרים כיום לא רק תפקיד – אלא גם מקום עבודה.</p>
              <p>
                מיתוג מעסיקים מאפשר להציג את המרפאה שלכם בצורה מקצועית באמצעות תוכן, תמונות, מידע על סביבת העבודה והערכים שמובילים אתכם.
              </p>
              <p>
                המטרה היא ליצור חיבור ראשוני איכותי יותר עם מועמדים ולסייע להם להבין מי אתם עוד לפני יצירת הקשר.
              </p>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-[#E6F3F3]/32">
          <div className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-24">
            <SectionHeader title="מה כולל מסלול מיתוג מעסיקים?" />
            <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {INCLUDED_ITEMS.map(({ icon: Icon, title, body }) => (
                <article key={title} className="group min-h-[210px] rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm transition-all hover:shadow-md">
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E6F3F3] text-[#008080] transition-colors group-hover:bg-[#008080] group-hover:text-white">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <h3 className="text-xl font-bold tracking-tight text-[#0F0F10]">{title}</h3>
                  <p className="mt-4 text-base leading-8 text-[#6B7280]">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-24">
          <SectionHeader title="למי מתאים מיתוג מעסיקים?" />
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            {FIT_ITEMS.map(({ title, body }, index) => (
              <article
                key={title}
                className={`rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md ${index % 2 ? 'xl:mt-8' : ''}`}
              >
                <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E6F3F3] text-[#008080]">
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="text-xl font-bold tracking-tight text-[#0F0F10]">{title}</h3>
                <p className="mt-4 text-base leading-8 text-[#6B7280]">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-24">
            <SectionHeader title="מה ההבדל ממודעת דרושים רגילה?" />

            <div className="mt-12 grid gap-6 lg:grid-cols-2">
              <ComparisonColumn
                title="מודעת דרושים"
                tone="neutral"
                rows={COMPARISON_ROWS.map((row) => row.regular)}
              />
              <ComparisonColumn
                title="מיתוג מעסיקים"
                tone="brand"
                rows={COMPARISON_ROWS.map((row) => row.branding)}
              />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-24">
          <SectionHeader title="שאלות נפוצות" />
          <div className="mx-auto mt-12 max-w-4xl space-y-4">
            {FAQ_ITEMS.map(({ question, answer }) => (
              <details key={question} className="group rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition-all open:shadow-md md:p-7">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-bold text-[#0F0F10] marker:hidden">
                  <span>{question}</span>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E6F3F3] text-lg font-bold text-[#008080] transition-all group-open:rotate-45 group-open:bg-[#008080] group-open:text-white">+</span>
                </summary>
                <p className="mt-5 text-base leading-8 text-[#6B7280] md:text-lg">{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="border-y border-slate-200 bg-[#E6F3F3]/32">
          <div className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-24">
            <SectionHeader title="עיקרי המסלול" />
            <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
              {TERMS_ITEMS.map(({ icon: Icon, title, body }) => (
                <article key={title} className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm transition-all hover:shadow-md">
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E6F3F3] text-[#008080]">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <h3 className="text-xl font-bold tracking-tight text-[#0F0F10]">{title}</h3>
                  <p className="mt-4 text-base leading-8 text-[#6B7280]">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-24">
          <label className="mx-auto flex max-w-5xl cursor-pointer items-start gap-4 rounded-3xl border border-slate-200 bg-white p-7 text-base font-semibold leading-8 text-[#2D2D2D] shadow-sm transition-all hover:shadow-md md:p-9 md:text-lg">
            <input type="checkbox" className="mt-2 h-5 w-5 shrink-0 accent-[#008080]" />
            <span>אני מאשר/ת שקראתי את תנאי המסלול ואני מסכים/ה להמשיך לפתיחת משרה.</span>
          </label>

          <div className="mt-10 overflow-hidden rounded-[32px] border border-slate-200 bg-[#2D2D2D] p-8 text-center shadow-sm md:p-12">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E6F3F3] text-[#008080]">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 className="mx-auto max-w-4xl text-3xl font-bold tracking-tight text-white md:text-4xl">
              מוכנים להציג את המרפאה שלכם בצורה מקצועית יותר?
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-white/75 md:text-lg">
              התחילו את תהליך מיתוג המעסיק והציגו את סביבת העבודה שלכם למועמדים פוטנציאליים.
            </p>
            <div className="mt-8 flex justify-center">
              <Link
                to="/employers/recruitment-request"
                className="inline-flex min-h-[50px] items-center gap-2 rounded-full bg-[#008080] px-8 py-3 text-[15px] font-bold text-white shadow-sm transition-all duration-200 hover:bg-[#006D6D]"
              >
                <ClipboardList className="h-4 w-4" aria-hidden="true" />
                הגישו בקשת גיוס
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

function SectionHeader({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      {eyebrow && <span className="text-[13px] font-bold text-[#008080]">{eyebrow}</span>}
      <h2 className={`${eyebrow ? 'mt-3' : ''} text-3xl font-bold tracking-tight text-[#0F0F10] md:text-4xl`}>{title}</h2>
      {subtitle && <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[#6B7280] md:text-lg">{subtitle}</p>}
    </div>
  )
}

function ComparisonColumn({ title, rows, tone }: { title: string; rows: string[]; tone: 'neutral' | 'brand' }) {
  const isBrand = tone === 'brand'

  return (
    <article
      className={`rounded-[30px] border p-7 shadow-sm md:p-9 ${
        isBrand
          ? 'border-[#008080]/35 bg-[#E6F3F3]/55'
          : 'border-slate-200 bg-[#FAFAF7]'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${isBrand ? 'bg-[#008080] text-white' : 'bg-white text-[#6B7280]'}`}>
          {isBrand ? <Sparkles className="h-5 w-5" aria-hidden="true" /> : <ClipboardList className="h-5 w-5" aria-hidden="true" />}
        </div>
        <h3 className="text-2xl font-bold tracking-tight text-[#0F0F10]">{title}</h3>
      </div>

      <div className="mt-7 space-y-4">
        {rows.map((row) => (
          <div key={row} className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base leading-8 text-[#2D2D2D]">
            {row}
          </div>
        ))}
      </div>
    </article>
  )
}
