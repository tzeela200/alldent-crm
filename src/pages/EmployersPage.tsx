import { Link } from 'react-router-dom'
import {
  ArrowDown,
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Clock,
  HeartHandshake,
  MessageCircle,
  Sparkles,
  Target,
  Users,
} from 'lucide-react'

const BENEFITS = [
  {
    icon: Target,
    title: 'דיוק מקצועי',
    body: 'חשיפה לקהל המעורב בעולם הדנטלי בלבד.',
  },
  {
    icon: Sparkles,
    title: 'פתרונות גיוס מותאמים',
    body: 'אפשרות לבחור במסלול המתאים לצרכים ולאופי הגיוס.',
  },
  {
    icon: Clock,
    title: 'חיסכון בזמן',
    body: 'תהליך מובנה ומסודר משלב פתיחת הבקשה ועד קבלת מועמדים.',
  },
  {
    icon: HeartHandshake,
    title: 'היכרות עם הענף',
    body: 'פלטפורמה ייעודית למרפאות, מעבדות ועסקים דנטליים.',
  },
]

const HERO_HIGHLIGHTS = [
  'גיוס דנטלי ייעודי',
  'מסלולים מותאמים',
  'תהליך מסודר וברור',
]

const TRUST_ITEMS = [
  'פלטפורמת HR ייעודית לדנטל',
  'התאמה ממוקדת לצורכי המרפאה',
  'ליווי ברור משלב פתיחת הבקשה',
]

const CARDS = [
  {
    to: '/employers/discreet',
    icon: Briefcase,
    title: 'גיוס דיסקרטי',
    body: 'מסלול גיוס שקט וממוקד למרפאות המעוניינות לאתר מועמדים מתאימים מבלי לחשוף את שם המרפאה בשלב הראשוני.',
    benefits: ['שמירה על דיסקרטיות', 'פרסום ללא חשיפת המרפאה', 'תהליך גיוס ממוקד'],
    cta: 'קראו עוד',
  },
  {
    to: '/employers/branding',
    icon: Users,
    title: 'מיתוג מעסיקים',
    body: 'מסלול המאפשר להציג את המרפאה, סביבת העבודה, הערכים והצוות במטרה לחזק את מותג המעסיק ולמשוך מועמדים איכותיים יותר.',
    benefits: ['עמוד מעסיק ייעודי', 'הצגת המרפאה והצוות', 'חיזוק המותג המעסיק'],
    badge: 'פרימיום',
    cta: 'קראו עוד',
  },
]

export default function EmployersPage() {
  return (
    <div className="min-h-screen bg-[#f3f4f6] text-[#0f1720]" dir="rtl">
      <section className="relative overflow-hidden bg-[#2b2b2b] px-4 pb-20 pt-8 text-white md:px-8 md:pt-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,128,128,0.22),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(217,119,6,0.14),transparent_18%)]" />
        <div className="pointer-events-none absolute -right-20 top-14 h-64 w-64 rounded-full bg-[#008080]/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 bottom-4 h-56 w-56 rounded-full bg-[#D97706]/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[1.08fr_.92fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-[13px] font-bold text-[#ddf8f7] backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-[#20d3c2]" />
                AllDent Employers
              </span>

              <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[1] tracking-[-0.04em] md:text-6xl">
                גיוס עובדים
                <span className="mt-2 block text-[#24c7bf]">בעולם הדנטל</span>
              </h1>

              <p className="mt-6 max-w-3xl text-base leading-8 text-white/75 md:text-lg">
                פתרונות גיוס ייעודיים למרפאות שיניים, רשתות, מעבדות וחברות דנטליות — ממשרה נקודתית ועד בחירת מסלול גיוס מותאם, מדויק ומקצועי.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {HERO_HIGHLIGHTS.map((item, index) => (
                  <div
                    key={item}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-bold backdrop-blur ${
                      index === 1
                        ? 'border-[#D97706]/35 bg-[#D97706]/12 text-[#ffd7a6]'
                        : 'border-white/12 bg-white/8 text-white/88'
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        index === 1 ? 'bg-[#f59e0b]' : 'bg-[#20d3c2]'
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
                  className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-2xl bg-[#D97706] px-7 py-3 text-[15px] font-bold text-white shadow-[0_12px_30px_rgba(217,119,6,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#B45309]"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  דברו איתנו בוואטסאפ
                </a>

                <a
                  href="#recruitment-tracks"
                  className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/8 px-7 py-3 text-[15px] font-bold text-white transition-all duration-200 hover:bg-white/12"
                >
                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                  בחירת מסלול גיוס
                </a>
              </div>
            </div>

            <div className="relative">
              <div className="rounded-[32px] border border-white/10 bg-white/6 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.22)] backdrop-blur-md md:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[12px] font-bold uppercase tracking-[0.24em] text-[#8fe7e7]">
                      Recruit Flow
                    </p>
                    <h3 className="mt-2 text-2xl font-black">פתיחת מסלול גיוס</h3>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#008080]/20">
                    <Target className="h-6 w-6 text-[#7cecec]" aria-hidden="true" />
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-3 rounded-2xl bg-white/6 px-4 py-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#20d3c2]" />
                    <span className="text-[14px] font-medium text-white/88">
                      הגדרת צורך ותפקיד
                    </span>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl bg-white/6 px-4 py-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]" />
                    <span className="text-[14px] font-medium text-white/88">
                      בחירת מסלול חשיפה
                    </span>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl bg-white/6 px-4 py-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#60a5fa]" />
                    <span className="text-[14px] font-medium text-white/88">
                      קבלת מועמדים מתאימים
                    </span>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[24px] border border-white/10 bg-[#323232] p-5">
                    <p className="text-[12px] font-bold text-[#8fe7e7]">מותאם למרפאות</p>
                    <p className="mt-3 text-2xl font-black text-white">דיסקרטי או ממותג</p>
                    <p className="mt-2 text-[14px] leading-7 text-white/70">
                      בחירה בין מסלולים שונים לפי אופי הגיוס, רמת החשיפה והמסר שרוצים להעביר.
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-[#D97706]/20 bg-[#D97706]/10 p-5">
                    <p className="text-[12px] font-bold text-[#ffd7a6]">
                      מעסיקים חכמים עובדים לפי התאמה
                    </p>
                    <p className="mt-3 text-2xl font-black text-white">תהליך ברור</p>
                    <p className="mt-2 text-[14px] leading-7 text-white/78">
                      מסלול מסודר שנותן יותר שליטה, יותר מיקוד ויותר התאמה לעולם הדנטלי.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {TRUST_ITEMS.map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-[22px] border border-white/10 bg-white/8 px-4 py-4 text-[14px] font-semibold text-white/90 backdrop-blur"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#008080]/18">
                  <CheckCircle2 className="h-5 w-5 text-[#7cecec]" aria-hidden="true" />
                </div>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 md:px-8 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
          <div className="rounded-[30px] border border-slate-200 bg-white p-8 shadow-[0_18px_50px_rgba(15,23,32,0.06)] md:p-10">
            <div className="inline-flex rounded-full bg-[#E6F3F3] px-4 py-1.5 text-[13px] font-bold text-[#008080]">
              הסבר קצר
            </div>

            <h2 className="mt-5 text-3xl font-black tracking-tight text-[#0F1720] md:text-4xl">
              גיוס עובדים בענף הדנטלי דורש הבנה אמיתית של התחום
            </h2>

            <div className="mt-6 space-y-4 text-base leading-8 text-[#4B5563] md:text-lg">
              <p>
                גיוס עובדים בענף הדנטלי דורש היכרות עם מקצועות הענף, סביבת העבודה במרפאות וצרכי הגיוס הייחודיים של תחום הבריאות.
              </p>
              <p>
                AllDent היא פלטפורמה ייעודית לעולם הדנטל המחברת בין מעסיקים לאנשי מקצוע מכל תחומי הענף, במטרה לייצר תהליך גיוס ממוקד, יעיל ומותאם לצרכים האמיתיים של השוק.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[26px] border border-white/10 bg-[#2b2b2b] p-6 text-white shadow-[0_18px_50px_rgba(15,23,32,0.16)] sm:col-span-3">
              <p className="text-[12px] font-bold uppercase tracking-[0.22em] text-[#7cecec]">
                AllDent for Employers
              </p>
              <p className="mt-3 text-2xl font-black md:text-3xl">
                פלטפורמת גיוס ממוקדת לעולם הדנטלי
              </p>
              <p className="mt-3 max-w-2xl text-[15px] leading-7 text-white/72">
                מרפאות, מעבדות, רשתות ועסקים דנטליים צריכים תהליך שנבנה עבור המקצועות, הדינמיקה והציפיות של הענף.
              </p>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-6">
              <p className="text-[13px] font-bold text-[#008080]">מיקוד</p>
              <p className="mt-2 text-lg font-black text-[#0F1720]">לא קהל כללי</p>
              <p className="mt-2 text-[14px] leading-7 text-[#6B7280]">
                חשיפה רלוונטית יותר למקצועות הדנטל.
              </p>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-6">
              <p className="text-[13px] font-bold text-[#008080]">גמישות</p>
              <p className="mt-2 text-lg font-black text-[#0F1720]">בחירה במסלול</p>
              <p className="mt-2 text-[14px] leading-7 text-[#6B7280]">
                דיסקרטי או מיתוגי לפי צורך.
              </p>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-6">
              <p className="text-[13px] font-bold text-[#008080]">בהירות</p>
              <p className="mt-2 text-lg font-black text-[#0F1720]">תהליך מסודר</p>
              <p className="mt-2 text-[14px] leading-7 text-[#6B7280]">
                מפת גיוס ברורה משלב הבקשה ועד ההמשך.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#2b2b2b] px-4 py-20 text-white md:px-8 md:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,128,128,0.16),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(217,119,6,0.10),transparent_20%)]" />
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex rounded-full border border-white/10 bg-white/8 px-4 py-1.5 text-[13px] font-bold text-[#9ceceb]">
              למה לבחור ב-AllDent
            </span>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-white md:text-4xl">
              פתרונות גיוס שנבנו במיוחד לעולם הדנטל
            </h2>
            <p className="mt-4 text-base leading-8 text-white/68 md:text-lg">
              שילוב בין היכרות עם התחום, דיוק מקצועי ומבנה תהליך ברור יותר למעסיקים.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {BENEFITS.map(({ icon: Icon, title, body }, index) => (
              <div
                key={title}
                className="group relative overflow-hidden rounded-[28px] border border-white/8 bg-white/6 p-7 shadow-[0_16px_40px_rgba(0,0,0,0.18)] backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:bg-white/8 md:p-8"
              >
                <div
                  className={`pointer-events-none absolute -top-12 left-0 h-24 w-24 rounded-full blur-2xl ${
                    index % 2 === 0 ? 'bg-[#008080]/16' : 'bg-[#D97706]/14'
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

      <section id="recruitment-tracks" className="px-4 py-20 md:px-8 md:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[13px] font-bold text-[#008080]">בחירת מסלול</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#0F1720] md:text-4xl">
              בחרו את מסלול הגיוס המתאים לכם
            </h2>
            <p className="mt-5 text-base leading-8 text-[#6B7280] md:text-lg">
              לכל ארגון יש צרכים שונים. בחרו את דרך הגיוס שמתאימה לרמת החשיפה, לאופי המשרה ולמטרות שלכם.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 xl:grid-cols-2">
            {CARDS.map(({ to, icon: Icon, title, body, benefits, badge, cta }, index) => (
              <Link
                key={to}
                to={to}
                className={`group relative flex min-h-[500px] flex-col overflow-hidden rounded-[34px] border p-8 shadow-[0_20px_55px_rgba(15,23,32,0.06)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_70px_rgba(15,23,32,0.12)] md:p-10 ${
                  index === 0
                    ? 'border-[#0F1720]/10 bg-[linear-gradient(180deg,#FFFFFF_0%,#F8FBFB_100%)]'
                    : 'border-[#D97706]/20 bg-[linear-gradient(180deg,#FFFFFF_0%,#FFF8F0_100%)]'
                }`}
              >
                <div
                  className={`pointer-events-none absolute inset-x-0 top-0 h-1 ${
                    index === 0
                      ? 'bg-gradient-to-l from-transparent via-[#008080]/50 to-transparent'
                      : 'bg-gradient-to-l from-transparent via-[#D97706]/55 to-transparent'
                  }`}
                />
                <div
                  className={`pointer-events-none absolute -left-16 -top-16 h-40 w-40 rounded-full blur-3xl ${
                    index === 0 ? 'bg-[#008080]/10' : 'bg-[#D97706]/12'
                  }`}
                />
                <div
                  className={`pointer-events-none absolute -bottom-14 right-10 h-36 w-36 rounded-full blur-3xl ${
                    index === 0 ? 'bg-[#0EA5A4]/8' : 'bg-[#F59E0B]/10'
                  }`}
                />

                <div className="relative flex items-start justify-between gap-4">
                  <div
                    className={`flex h-16 w-16 items-center justify-center rounded-[22px] transition-all duration-300 ${
                      index === 0
                        ? 'bg-[#E6F3F3] group-hover:bg-[#008080]'
                        : 'bg-[#FFF1DE] group-hover:bg-[#D97706]'
                    }`}
                  >
                    <Icon
                      className={`h-7 w-7 transition-colors duration-300 ${
                        index === 0
                          ? 'text-[#008080] group-hover:text-white'
                          : 'text-[#D97706] group-hover:text-white'
                      }`}
                      aria-hidden="true"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    {badge && (
                      <span className="rounded-full border border-[#D97706]/25 bg-[#D97706]/10 px-3 py-1 text-[12px] font-bold text-[#B45309]">
                        {badge}
                      </span>
                    )}
                    <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[12px] font-bold text-[#64748B]">
                      {index === 0 ? 'Discreet Track' : 'Employer Brand'}
                    </span>
                  </div>
                </div>

                <h3
                  className={`relative mt-8 text-[30px] font-black tracking-tight transition-colors duration-300 ${
                    index === 0
                      ? 'text-[#0F1720] group-hover:text-[#008080]'
                      : 'text-[#0F1720] group-hover:text-[#B45309]'
                  }`}
                >
                  {title}
                </h3>

                <p className="relative mt-4 max-w-xl text-base leading-8 text-[#5B6472] md:text-lg">
                  {body}
                </p>

                <div className="relative mt-8 rounded-[24px] border border-slate-200/80 bg-white/70 p-5 backdrop-blur">
                  <p className={`text-[13px] font-bold ${index === 0 ? 'text-[#008080]' : 'text-[#B45309]'}`}>
                    מה כולל המסלול
                  </p>
                  <ul className="mt-4 space-y-3 text-[15px] font-semibold text-[#1F2937]">
                    {benefits.map((benefit) => (
                      <li key={benefit} className="flex items-start gap-3">
                        <CheckCircle2
                          className={`mt-0.5 h-5 w-5 shrink-0 ${index === 0 ? 'text-[#008080]' : 'text-[#D97706]'}`}
                          aria-hidden="true"
                        />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="relative mt-auto pt-10">
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[14px] font-bold transition-all duration-300 ${
                      index === 0
                        ? 'bg-[#E6F3F3] text-[#008080] group-hover:bg-[#008080] group-hover:text-white'
                        : 'bg-[#FFF1DE] text-[#B45309] group-hover:bg-[#D97706] group-hover:text-white'
                    }`}
                  >
                    {cta}
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#008080] px-4 py-16 text-white md:px-8 md:py-18">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-[13px] font-bold text-white/70">ייעוץ קצר לפני בחירה</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
            לא בטוחים איזה מסלול מתאים לכם?
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-white/78 md:text-lg">
            נשמח לעזור לכם להבין מהו המסלול המתאים ביותר עבור סוג המשרה, רמת החשיפה הרצויה ומטרות הגיוס שלכם.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="https://wa.me/972533959003"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-2xl bg-white px-8 py-3 text-[15px] font-bold text-[#008080] shadow-[0_10px_24px_rgba(0,0,0,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#f5f5f5]"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              דברו איתנו בוואטסאפ
            </a>

            <a
              href="#recruitment-tracks"
              className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-8 py-3 text-[15px] font-bold text-white transition-all duration-200 hover:bg-white/15"
            >
              <ArrowDown className="h-4 w-4" aria-hidden="true" />
              מעבר למסלולים
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}