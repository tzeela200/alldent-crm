import { Link } from 'react-router-dom'
import {
  ArrowDown,
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  HeartHandshake,
  Lightbulb,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Target,
  Users,
} from 'lucide-react'

function WhatsAppIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M19.11 17.38c-.26-.13-1.52-.75-1.76-.84-.24-.09-.41-.13-.59.13-.17.26-.67.84-.82 1.01-.15.17-.3.2-.56.07-.26-.13-1.08-.4-2.06-1.27-.76-.68-1.27-1.52-1.42-1.78-.15-.26-.02-.4.11-.53.12-.12.26-.3.39-.45.13-.15.17-.26.26-.43.09-.17.04-.32-.02-.45-.06-.13-.59-1.42-.8-1.94-.21-.51-.43-.44-.59-.45h-.5c-.17 0-.45.06-.69.32-.24.26-.91.89-.91 2.17s.93 2.52 1.06 2.69c.13.17 1.83 2.8 4.44 3.92.62.27 1.1.43 1.48.55.62.2 1.19.17 1.64.1.5-.07 1.52-.62 1.74-1.22.22-.6.22-1.11.15-1.22-.06-.11-.24-.17-.5-.3Z" />
      <path d="M26.68 5.34A14.87 14.87 0 0 0 16.08.95C7.85.95 1.15 7.65 1.15 15.88c0 2.63.69 5.2 2 7.46L1.02 31.1l7.95-2.08a14.9 14.9 0 0 0 7.11 1.81h.01c8.23 0 14.93-6.7 14.93-14.93a14.84 14.84 0 0 0-4.34-10.56Zm-10.6 22.98h-.01a12.4 12.4 0 0 1-6.32-1.73l-.45-.27-4.72 1.24 1.26-4.6-.3-.47a12.38 12.38 0 0 1-1.9-6.61c0-6.86 5.58-12.44 12.45-12.44 3.32 0 6.44 1.29 8.79 3.65a12.36 12.36 0 0 1 3.64 8.8c0 6.86-5.58 12.43-12.44 12.43Z" />
    </svg>
  )
}

const PROFESSIONS = [
  'רופאי שיניים',
  'רופאים מומחים',
  'שינניות',
  'סייעות',
  'מזכירות דנטליות',
  'מנהלי מרפאות',
  'טכנאי שיניים',
  'מכירות ותועמלנות',
]

const EMPLOYER_TIPS = [
  {
    title: 'הגדירו מה באמת חובה',
    body: 'הפרידו בין דרישות הכרחיות לבין ידע שאפשר לרכוש במהלך העבודה.',
  },
  {
    title: 'חשבו על התאמה לצוות',
    body: 'ניסיון חשוב, אך גם תקשורת בין־אישית, קבלת החלטות ויכולת להשתלב.',
  },
  {
    title: 'ספרו מה אתם מציעים',
    body: 'סביבת עבודה, יציבות, אפשרות להתפתח, גמישות ומשמעות הם חלק מהבחירה.',
  },
  {
    title: 'בחרו את הסיפור האמיתי',
    body: 'מה שלא יהיה — חשוב שזו תהיה האמת. מסר אמין מושך אנשים מתאימים יותר.',
  },
  {
    title: 'בחרו את מסלול הגיוס הנכון',
    body: 'דיסקרטיות ומיקוד, או שקיפות, נראות וחיזוק מותג המעסיק.',
  },
]

const TRACKS = [
  {
    to: '/employers/discreet',
    eyebrow: 'מסלול אישי',
    title: 'גיוס אישי ודיסקרטי',
    subtitle: 'שירות אישי, דיסקרטיות ומיקוד',
    body:
      'מסלול למעסיקים שרוצים לפרסם משרה, לסנן מועמדים ולנהל את התהליך בלי לחשוף את שם המרפאה בשלב הראשון.',
    price: '500 ₪ + מע״מ',
    priceNote: 'בנוסף למחירון הצלחת גיוס',
    benefits: [
      'פרסום ללא חשיפת שם המרפאה',
      'סינון מועמדים והתאמה אישית',
      'העברת פרטים בצורה מבוקרת ובהסכמה',
    ],
    accent: 'gold',
  },
  {
    to: '/employers/branding',
    eyebrow: 'מסלול מיתוג',
    title: 'מיתוג מעסיקים',
    subtitle: 'אסטרטגיית גיוס עם ערך',
    body:
      'מסלול שמציג את המרפאה, הצוות, סביבת העבודה והערכים כדי ליצור חיבור, לבנות אמון ולמשוך מועמדים מתאימים.',
    price: '2,000 ₪ + מע״מ',
    priceNote: 'תשלום חד־פעמי וללא עמלת הצלחה',
    benefits: [
      'דף משרה מעוצב וממותג',
      'הצגת המרפאה, הצוות וסביבת העבודה',
      'פרסום למשך עד 60 יום',
    ],
    accent: 'burgundy',
  },
] as const

const DECISION_ROWS = [
  ['לא לחשוף את שם המרפאה', 'גיוס אישי ודיסקרטי'],
  ['להחליף עובד בלי חשיפה מוקדמת', 'גיוס אישי ודיסקרטי'],
  ['לקבל סינון והתאמה אישית', 'גיוס אישי ודיסקרטי'],
  ['להציג את המרפאה והצוות', 'מיתוג מעסיקים'],
  ['לחזק את מותג המעסיק', 'מיתוג מעסיקים'],
  ['מחיר קבוע ללא עמלת הצלחה', 'מיתוג מעסיקים'],
]

export default function EmployersPage() {
  return (
    <div className="min-h-screen bg-[#F3F4F6] text-[#0F1720]" dir="rtl">
      <section className="relative overflow-hidden bg-[#2D2D2D] px-4 py-20 text-white md:px-8 md:py-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,128,128,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(171,19,78,0.10),transparent_25%),radial-gradient(circle_at_center_left,rgba(217,169,40,0.08),transparent_22%)]" />

        <div className="relative mx-auto max-w-7xl">
          <div className="max-w-4xl text-start">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/7 px-4 py-2 text-[13px] font-bold text-white/82">
              <span className="h-2 w-2 rounded-full bg-[#20D3C2]" />
              AllDent Employers
            </span>

            <h1 className="mt-6 text-4xl font-black leading-[1.05] tracking-[-0.04em] md:text-6xl lg:text-[68px]">
              גיוס עובדים
              <span className="mt-2 block text-[#7CECEC]">בעולם הדנטל</span>
            </h1>

            <p className="mt-6 max-w-3xl text-[17px] leading-[1.9] text-white/76 md:text-[20px]">
              מערכת HR ופלטפורמת גיוס ותעסוקה שנבנתה במיוחד לענף הדנטלי —
              עם היכרות מקצועית, התאמה רב־ממדית ושני מסלולי גיוס לבחירה.
            </p>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-[14px] font-bold text-white/82">
              {[
                'גיוס דנטלי ייעודי',
                'התאמה לצורכי המרפאה',
                'מסלול דיסקרטי או ממותג',
              ].map((item) => (
                <span key={item} className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#7CECEC]" aria-hidden="true" />
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                href="#recruitment-tracks"
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[18px] bg-[#008080] px-7 py-3 text-[15px] font-bold text-white shadow-[0_12px_28px_rgba(0,128,128,0.24)] transition-all hover:-translate-y-0.5 hover:bg-[#006D6D]"
              >
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
                בחירת מסלול גיוס
              </a>

              <a
                href="https://wa.me/972533951003"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[18px] bg-[#D97706] px-7 py-3 text-[15px] font-bold text-white shadow-[0_12px_28px_rgba(217,119,6,0.22)] transition-all hover:-translate-y-0.5 hover:bg-[#B45309]"
              >
                <WhatsAppIcon className="h-4 w-4" />
                דברו איתנו ב־WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 md:px-8 md:py-22">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
          <div className="rounded-[30px] border border-slate-200 bg-white p-7 text-start shadow-[0_18px_50px_rgba(15,23,32,0.06)] md:p-10">
            <span className="inline-flex rounded-full bg-[#E6F3F3] px-4 py-1.5 text-[13px] font-bold text-[#008080]">
              מהו גיוס דנטלי?
            </span>

            <h2 className="mt-5 text-3xl font-black tracking-tight md:text-4xl">
              גיוס דנטלי דורש היכרות אמיתית עם הענף
            </h2>

            <div className="mt-6 space-y-4 text-[16px] leading-[1.95] text-[#556171] md:text-[18px]">
              <p>
                AllDent היא מערכת HR ייעודית לענף הדנטלי ופלטפורמת גיוס
                ותעסוקה בעלת פונקציות ניתוח מקצועי והתאמה תעסוקתית רב־ממדית.
              </p>
              <p>
                תהליך הגיוס מתייחס לא רק לשם התפקיד ולתעודות, אלא גם לניסיון,
                להסמכות, לזמינות, לימי העבודה, לניידות, לסביבת המרפאה,
                לתקשורת הבין־אישית ולהתאמה לצוות הקיים.
              </p>
              <p className="font-bold text-[#273142]">
                כי לא מספיק למצוא אדם שיודע לבצע את התפקיד. חשוב למצוא אדם
                שמתאים לדרך שבה המרפאה עובדת ורוצה להתפתח.
              </p>
            </div>
          </div>

          <div className="rounded-[30px] bg-[#2D2D2D] p-7 text-white shadow-[0_20px_58px_rgba(15,23,32,0.16)] md:p-9">
            <div className="flex items-center gap-4">
              <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-[#008080]/20">
                <Stethoscope className="h-6 w-6 text-[#7CECEC]" aria-hidden="true" />
              </div>
              <div>
                <p className="text-[12px] font-bold text-[#7CECEC]">
                  מקצועות הדנטל
                </p>
                <h3 className="mt-1 text-2xl font-black">המערכת נבנתה עבור הענף</h3>
              </div>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              {PROFESSIONS.map((profession) => (
                <span
                  key={profession}
                  className="rounded-full border border-white/10 bg-white/7 px-4 py-2 text-[13px] font-bold text-white/82"
                >
                  {profession}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-16 md:px-8 md:py-22">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-4xl text-center">
            <span className="inline-flex rounded-full bg-[#FBEAF1] px-4 py-1.5 text-[13px] font-bold text-[#AB134E]">
              עולם העבודה השתנה
            </span>

            <h2 className="mt-5 text-3xl font-black tracking-tight md:text-4xl">
              עובדים כבר לא מחפשים רק “משרה”
            </h2>

            <p className="mx-auto mt-5 max-w-3xl text-[16px] leading-[1.95] text-[#667085] md:text-[18px]">
              עובדים רוצים להבין מי האנשים שאיתם יעבדו, איך נראית סביבת
              העבודה, האם יוכלו ללמוד ולהתפתח, האם יש מקום להשפעה ומה מצופה
              מהם בפועל.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['משמעות ושייכות', 'להרגיש חלק ממקום שיש בו ערך, קשר אנושי וסיבה להישאר.'],
              ['אפשרות להתפתח', 'ללמוד, לרכוש מיומנויות ולראות לאן התפקיד יכול להוביל.'],
              ['שקיפות ובהירות', 'להבין את התפקיד, התנאים, הציפיות וסביבת העבודה.'],
              ['התאמה אנושית', 'צוות, תקשורת, סגנון ניהול ותחושת התאמה אמיתית.'],
            ].map(([title, body]) => (
              <div
                key={title}
                className="rounded-[24px] border border-slate-200 bg-[#FAFBFC] p-6 text-start"
              >
                <h3 className="text-[19px] font-black">{title}</h3>
                <p className="mt-3 text-[14px] leading-[1.8] text-[#667085]">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="recruitment-tracks" className="px-4 py-20 md:px-8 md:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[13px] font-bold text-[#008080]">בחירת מסלול</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
              איך תרצו לגייס?
            </h2>
            <p className="mt-5 text-[16px] leading-[1.9] text-[#667085] md:text-[18px]">
              לכל משרה, ארגון ותקופה יש צורך אחר. בחרו את הדרך שמתאימה לרמת
              החשיפה, לאופי המשרה ולמטרת הגיוס.
            </p>
          </div>

          <div className="mt-12 grid gap-8 xl:grid-cols-2">
            {TRACKS.map((track) => {
              const isGold = track.accent === 'gold'

              return (
                <Link
                  key={track.to}
                  to={track.to}
                  className={`group relative flex min-h-[590px] flex-col overflow-hidden rounded-[34px] border bg-white p-8 shadow-[0_20px_58px_rgba(15,23,32,0.07)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_30px_74px_rgba(15,23,32,0.13)] md:p-10 ${
                    isGold ? 'border-[#D9A928]/28' : 'border-[#AB134E]/22'
                  }`}
                >
                  <div
                    className={`pointer-events-none absolute inset-x-0 top-0 h-1.5 ${
                      isGold ? 'bg-[#D9A928]' : 'bg-[#AB134E]'
                    }`}
                  />
                  <div
                    className={`pointer-events-none absolute -end-14 -top-14 h-44 w-44 rounded-full blur-3xl ${
                      isGold ? 'bg-[#D9A928]/12' : 'bg-[#AB134E]/10'
                    }`}
                  />

                  <div className="relative flex items-start justify-between gap-5">
                    <div
                      className={`flex h-16 w-16 items-center justify-center rounded-[22px] ${
                        isGold ? 'bg-[#FBF6E4]' : 'bg-[#FBEAF1]'
                      }`}
                    >
                      {isGold ? (
                        <ShieldCheck className="h-7 w-7 text-[#B88918]" aria-hidden="true" />
                      ) : (
                        <Sparkles className="h-7 w-7 text-[#AB134E]" aria-hidden="true" />
                      )}
                    </div>

                    <span
                      className={`rounded-full px-4 py-1.5 text-[12px] font-black ${
                        isGold
                          ? 'bg-[#FBF6E4] text-[#9A7214]'
                          : 'bg-[#FBEAF1] text-[#AB134E]'
                      }`}
                    >
                      {track.eyebrow}
                    </span>
                  </div>

                  <h3 className="relative mt-8 text-[30px] font-black tracking-tight md:text-[34px]">
                    {track.title}
                  </h3>

                  <p
                    className={`relative mt-2 text-[17px] font-black ${
                      isGold ? 'text-[#B88918]' : 'text-[#AB134E]'
                    }`}
                  >
                    {track.subtitle}
                  </p>

                  <p className="relative mt-5 text-[16px] leading-[1.9] text-[#5B6472] md:text-[17px]">
                    {track.body}
                  </p>

                  <div
                    className={`relative mt-7 rounded-[22px] border p-5 ${
                      isGold
                        ? 'border-[#D9A928]/20 bg-[#FFFBF0]'
                        : 'border-[#AB134E]/14 bg-[#FFF8FB]'
                    }`}
                  >
                    <p className="text-[12px] font-bold text-[#64748B]">מחיר המסלול</p>
                    <p
                      className={`mt-2 text-3xl font-black ${
                        isGold ? 'text-[#B88918]' : 'text-[#AB134E]'
                      }`}
                    >
                      {track.price}
                    </p>
                    <p className="mt-1 text-[13px] font-semibold text-[#667085]">
                      {track.priceNote}
                    </p>
                  </div>

                  <div className="relative mt-7">
                    <p
                      className={`text-[13px] font-black ${
                        isGold ? 'text-[#B88918]' : 'text-[#AB134E]'
                      }`}
                    >
                      מה כולל המסלול
                    </p>

                    <ul className="mt-4 space-y-3">
                      {track.benefits.map((benefit) => (
                        <li
                          key={benefit}
                          className="flex items-start gap-3 text-[15px] font-semibold text-[#273142]"
                        >
                          <CheckCircle2
                            className={`mt-0.5 h-5 w-5 shrink-0 ${
                              isGold ? 'text-[#D9A928]' : 'text-[#AB134E]'
                            }`}
                            aria-hidden="true"
                          />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="relative mt-auto pt-9">
                    <span
                      className={`inline-flex items-center gap-2 rounded-[16px] px-5 py-3 text-[14px] font-black transition-all ${
                        isGold
                          ? 'bg-[#FBF6E4] text-[#9A7214] group-hover:bg-[#D9A928] group-hover:text-[#2D2D2D]'
                          : 'bg-[#FBEAF1] text-[#AB134E] group-hover:bg-[#AB134E] group-hover:text-white'
                      }`}
                    >
                      {isGold
                        ? 'למסלול האישי והדיסקרטי'
                        : 'למסלול מיתוג המעסיקים'}
                      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#2D2D2D] px-4 py-16 text-white md:px-8 md:py-22">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex rounded-full border border-white/10 bg-white/7 px-4 py-1.5 text-[13px] font-bold text-white/78">
              בחירה מהירה
            </span>
            <h2 className="mt-5 text-3xl font-black md:text-4xl">
              איזה מסלול מתאים לצורך שלכם?
            </h2>
          </div>

          <div className="mx-auto mt-10 max-w-4xl overflow-hidden rounded-[26px] border border-white/10">
            {DECISION_ROWS.map(([need, track], index) => {
              const discreet = track.includes('דיסקרטי')

              return (
                <div
                  key={need}
                  className={`grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center md:px-7 ${
                    index !== DECISION_ROWS.length - 1 ? 'border-b border-white/10' : ''
                  } ${index % 2 === 0 ? 'bg-white/5' : 'bg-white/[0.025]'}`}
                >
                  <span className="text-[15px] font-semibold text-white/78">{need}</span>
                  <span
                    className={`w-fit rounded-full px-4 py-1.5 text-[12px] font-black ${
                      discreet
                        ? 'bg-[#D9A928]/14 text-[#E8CC72]'
                        : 'bg-[#AB134E]/18 text-[#F0A6C2]'
                    }`}
                  >
                    {track}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 md:px-8 md:py-22">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
            <div className="rounded-[28px] bg-white p-7 text-start shadow-[0_18px_50px_rgba(15,23,32,0.06)] md:p-9">
              <span className="inline-flex rounded-full bg-[#E6F3F3] px-4 py-1.5 text-[13px] font-bold text-[#008080]">
                טיפ למעסיקים
              </span>

              <h2 className="mt-5 text-3xl font-black tracking-tight md:text-4xl">
                לפני שאתם פותחים משרה
              </h2>

              <p className="mt-5 text-[16px] leading-[1.9] text-[#667085]">
                החלק החשוב בתחילת הדרך הוא להסגר על הסיפור שאתם מספרים.
                מה שלא יהיה — חשוב שזו תהיה האמת.
              </p>

              <div className="mt-7 rounded-[20px] border border-[#D9A928]/18 bg-[#FFFBF0] p-5">
                <p className="text-[17px] font-black leading-[1.7] text-[#6B5213]">
                  אי אפשר להתפשר על האנשים שבוחרים לקום ולעשות עבור העסק שלנו
                  בכל בוקר.
                </p>
              </div>
            </div>

            <div className="grid gap-4">
              {EMPLOYER_TIPS.map((tip, index) => (
                <div
                  key={tip.title}
                  className="flex gap-4 rounded-[22px] border border-slate-200 bg-white p-5 text-start"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#E6F3F3] text-[#008080]">
                    <span className="text-[13px] font-black">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-[17px] font-black">{tip.title}</h3>
                    <p className="mt-2 text-[14px] leading-[1.8] text-[#667085]">
                      {tip.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#008080] px-4 py-16 text-white md:px-8 md:py-20">
        <div className="mx-auto max-w-5xl text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/12">
            <HeartHandshake className="h-7 w-7" aria-hidden="true" />
          </div>

          <h2 className="mt-5 text-3xl font-black tracking-tight md:text-4xl">
            עדיין לא בטוחים איזה מסלול מתאים לכם?
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-[16px] leading-[1.9] text-white/78 md:text-[18px]">
            נשמח להבין את הצורך, סוג המשרה ורמת החשיפה הרצויה ולעזור לכם לבחור
            את הדרך הנכונה.
          </p>

          <a
            href="https://wa.me/972533951003"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex min-h-[50px] items-center justify-center gap-2 rounded-[18px] bg-white px-8 py-3 text-[15px] font-bold text-[#008080] shadow-[0_12px_26px_rgba(0,0,0,0.12)] transition-all hover:-translate-y-0.5 hover:bg-[#F7F7F7]"
          >
            <WhatsAppIcon className="h-4 w-4" />
            דברו איתנו ב־WhatsApp
          </a>
        </div>
      </section>
    </div>
  )
}
