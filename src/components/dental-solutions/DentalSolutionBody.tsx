/**
 * INC-3151 · רכיב התצוגה של פרסום/קורס דנטלי.
 *
 * ⚠️ הרכיב לא שולף כלום — הוא מקבל אובייקט DentalSolution מוכן. זה
 * הדפוס של DentalAssetPageBody, והסיבה זהה: אם התוכן יעבור יום אחד
 * ל-Supabase, אותו רכיב ישמש גם Preview באדמין וגם את הדף החי, ולכן
 * אי אפשר שהתצוגה המקדימה תשקר.
 *
 * עיצוב: כהה כמו לוח הנכסים ומקטע השירותים שממנו מגיעים. כל הגדלים
 * מ-publicType.ts — אין גודל מקומי.
 *
 * ⚠️ RTL: מאפיינים לוגיים בלבד (ms/me/ps/pe/start/end, text-start).
 * כל מלל שעלול להכיל מספרים או לטינית עובר דרך bidiSafe.
 */
import { Link } from 'react-router-dom'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import type { DentalSolution } from '@/content/dentalSolutions'
import { bidiSafe } from '@/lib/bidiText'
import { BackLink } from '@/components/public/BackLink'
import {
  HERO_H1,
  SECTION_H2,
  SUB_H2,
  CARD_H3,
  LIST_H4,
  LEAD,
  BODY,
  EYEBROW,
} from '@/lib/publicType'

export function DentalSolutionBody({
  solution,
  preview = false,
}: {
  solution: DentalSolution
  /** ב-Preview הקישור החיצוני מנוטרל — זו תצוגה, לא דף חי. */
  preview?: boolean
}) {
  const cta = (
    <a
      href={preview ? undefined : solution.ctaUrl}
      target={preview ? undefined : '_blank'}
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2.5 rounded-xl bg-[#B45309] px-8 py-4 text-[15px] font-bold text-white transition-colors duration-300 hover:bg-[#92400E]"
    >
      {solution.ctaLabel}
      <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
    </a>
  )

  return (
    <div dir="rtl" className="bg-[#1E1E1E] text-white">
      {/* ═══ הירו מפוצל ═══
          התמונה כפאנל ולא כרקע: הבאנר כבר מכיל כותרת ולוגואים,
          וכיתוב מעליו היה יוצר כותרת על כותרת. */}
      <section className="mx-auto max-w-[1280px] px-[clamp(24px,5vw,72px)] pb-[clamp(40px,5vw,72px)] pt-[clamp(28px,4vw,56px)]">
        <BackLink to="/dental-solutions">חזרה לשירותים ופתרונות</BackLink>

        <div className="mt-7 grid items-center gap-[clamp(28px,4vw,56px)] lg:grid-cols-[1.4fr_auto]">
          <div>
            <span className={`${EYEBROW} text-[#F0A03C]`}>{solution.category}</span>

            {/* כותרת ארוכה ב-68px הופכת לקיר טקסט. החלק שלפני הנקודתיים
                הוא פתיח ולא הכותרת עצמה, ולכן הוא יורד לשורה מובילה. */}
            {solution.titleLead && (
              <p className={`mt-4 ${SUB_H2} text-white/70`}>
                {bidiSafe(solution.titleLead)}
              </p>
            )}
            <h1 className={`${solution.titleLead ? 'mt-2' : 'mt-4'} ${HERO_H1}`}>
              {bidiSafe(solution.title)}
            </h1>

            {!!solution.partners?.length && (
              <p className="mt-5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[14.5px] font-bold text-[#7CECEC]">
                {solution.partners.map((p, i) => (
                  <span key={p} className="inline-flex items-center gap-2.5">
                    {i > 0 && <span aria-hidden="true" className="text-white/25">·</span>}
                    {p}
                  </span>
                ))}
              </p>
            )}

            <p className={`mt-5 max-w-[46ch] ${LEAD} text-white/75`}>
              {bidiSafe(solution.cardExcerpt)}
            </p>

            <div className="mt-8">{cta}</div>
          </div>

          {/* פוסטר ולא הרצועה: מלבן 1.91:1 בחצי עמודה מרחף בתוך שטח
              ריק מול כותרת בת שלוש שורות. הפוסטר עומד מולה בגובה.
              ⚠️ מוגבל ל-460px — זו רזולוציית המקור, והגדלה מעבר לה
              תיראה רכה. */}
          <figure className="m-0 justify-self-center overflow-hidden rounded-[18px] ring-1 ring-white/10 lg:justify-self-end">
            <img
              src={solution.posterImage ?? solution.image}
              alt={solution.imageAlt}
              loading="eager"
              className="block h-auto w-full max-w-[460px]"
            />
          </figure>
        </div>
      </section>

      <div className="mx-auto max-w-[1280px] px-[clamp(24px,5vw,72px)]">
        {/* ═══ על התוכנית ═══ */}
        <section className="border-t border-white/10 py-[clamp(40px,5.5vw,80px)]">
          <h2 className={SECTION_H2}>על התוכנית</h2>
          <p className={`mt-6 max-w-[62ch] ${BODY} text-white/75`}>
            {bidiSafe(solution.intro)}
          </p>
        </section>

        {/* ═══ מקטעי תוכן ═══ */}
        {solution.sections.map((section) => (
          <section
            key={section.heading}
            className="border-t border-white/10 py-[clamp(40px,5.5vw,80px)]"
          >
            <h2 className={SECTION_H2}>{bidiSafe(section.heading)}</h2>

            {section.body && (
              <p className={`mt-6 max-w-[62ch] ${BODY} text-white/75`}>
                {bidiSafe(section.body)}
              </p>
            )}

            {!!section.items?.length && (
              <ul className="mt-7 grid list-none gap-3 p-0 md:grid-cols-2">
                {section.items.map((item, i, arr) => (
                  <li
                    key={item}
                    /* מספר אי-זוגי משאיר פריט בודד בשורה אחרונה.
                       האחרון נפרש על שתי העמודות כדי שלא ייראה כשבר. */
                    className={`flex gap-3.5 rounded-xl border border-white/10 bg-white/[0.03] p-5 ${
                      arr.length % 2 === 1 && i === arr.length - 1 ? 'md:col-span-2' : ''
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="mt-[7px] h-2 w-2 shrink-0 rounded-full bg-[#F0A03C]"
                    />
                    <span className={`${BODY} text-white/80`}>{bidiSafe(item)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}

        {/* ═══ תנאי קבלה — בלוק עובדות נפרד ═══
            בכוונה לא בתוך פסקה: זה המידע שמסנן מי יכול להגיש, והוא
            חייב להיות סרוק במבט ולא מוחבא בתוך טקסט רץ. */}
        {!!solution.facts?.length && (
          <section className="border-t border-white/10 py-[clamp(40px,5.5vw,80px)]">
            <h2 className={SECTION_H2}>{solution.factsHeading ?? 'פרטים'}</h2>
            <dl className="mt-7 grid gap-px overflow-hidden rounded-[18px] border border-white/10 bg-white/10 sm:grid-cols-2">
              {solution.facts.map((f, i, arr) => (
                <div
                  key={f.label}
                  /* 5 תנאים בשתי עמודות השאירו קופסה ריקה בפינה. */
                  className={`bg-[#1E1E1E] p-5 ${
                    arr.length % 2 === 1 && i === arr.length - 1 ? 'sm:col-span-2' : ''
                  }`}
                >
                  <dt className={`${EYEBROW} text-white/50`}>{f.label}</dt>
                  <dd className={`m-0 mt-2 ${LIST_H4} text-white`}>
                    {bidiSafe(f.value)}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {/* ═══ CTA תחתון ═══ */}
        <section className="border-t border-white/10 py-[clamp(44px,6vw,88px)]">
          <div className="relative overflow-hidden rounded-[22px] bg-[#242424] p-[clamp(28px,4vw,56px)]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(217,119,6,0.20),transparent_45%),radial-gradient(circle_at_10%_90%,rgba(0,128,128,0.14),transparent_38%)]"
            />
            <div className="relative">
              {solution.urgency && (
                <p className={`${EYEBROW} text-[#F0A03C]`}>{solution.urgency}</p>
              )}
              <h2 className={`mt-4 max-w-[20ch] ${SUB_H2} text-white`}>
                {bidiSafe(solution.cardTitle)}
              </h2>
              <div className="mt-7 flex flex-wrap items-center gap-4">
                {cta}
                <span className="text-[13.5px] text-white/50">
                  הקישור נפתח באתר של מכבידנט
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

/** כרטיס הפרסום — משמש גם ברשימה וגם ברצועה בדף הבית. */
export function SolutionCard({ solution }: { solution: DentalSolution }) {
  const to = `/dental-solutions/${solution.slug}`
  return (
    <article className="group grid items-center gap-7 overflow-hidden rounded-2xl bg-[#242424] md:grid-cols-[1.1fr_1fr]">
      <Link
        to={to}
        className="block w-full overflow-hidden"
        aria-label={solution.cardTitle}
        tabIndex={-1}
      >
        <img
          src={solution.image}
          alt={solution.imageAlt}
          width={1200}
          height={629}
          loading="lazy"
          className="block h-auto w-full transition-transform duration-700 group-hover:scale-[1.02]"
        />
      </Link>

      <div className="p-7 pt-0 md:pe-8 md:ps-0 md:pt-7">
        <span className={`${EYEBROW} text-[#F0A03C]`}>{solution.category}</span>
        <h3 className={`mt-3 ${CARD_H3} text-white`}>
          {bidiSafe(solution.cardTitle)}
        </h3>
        <p className={`mt-3 ${BODY} text-white/65`}>
          {bidiSafe(solution.cardExcerpt)}
        </p>

        <ul className="mt-5 grid list-none gap-2 p-0">
          {solution.cardHighlights.map((h) => (
            <li key={h} className="flex gap-2.5 text-[14px] text-white/80">
              <span
                aria-hidden="true"
                className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#7CECEC]"
              />
              {bidiSafe(h)}
            </li>
          ))}
        </ul>

        <Link
          to={to}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#008080] px-6 py-3 text-[14px] font-bold text-white transition hover:bg-[#006D6D]"
        >
          לפרטים על התוכנית
          <ArrowLeft className="h-4 w-4 shrink-0 rtl:scale-x-[-1]" aria-hidden="true" />
        </Link>
      </div>
    </article>
  )
}
